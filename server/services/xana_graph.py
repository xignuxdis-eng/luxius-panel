"""
Xana AI — LangGraph Stateful Agent & Diagnostics Engine
Módulo central de inteligencia, diagnóstico de errores y gestión para LuXius.
"""

from typing import TypedDict, List, Dict, Any, Optional
import os
import sys
import json
import re
from datetime import datetime, timezone
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from models import db, Presupuesto, Cliente, Vendedor, Maquina, SyncLog, ConfigGlobal
from services.xana_tools import XANA_TOOLS, execute_xana_tool
from services.xana_knowledge import format_knowledge_tool_result, sync_materials_to_kb
from services.xana_analytics import format_analytics_tool_result


def _build_llm(temperature: float = 0.3):
    """Construye el LLM según el proveedor configurado (XANA_LLM_PROVIDER: 'gemini' o 'deepseek')."""
    provider = (os.environ.get('XANA_LLM_PROVIDER') or 'gemini').lower()

    if provider == 'deepseek':
        api_key = os.environ.get('DEEPSEEK_API_KEY')
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY no configurada")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=os.environ.get('DEEPSEEK_MODEL', 'deepseek-chat'),
            api_key=api_key,
            base_url='https://api.deepseek.com',
            temperature=temperature
        )

    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY no configurada")
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=api_key,
        temperature=temperature,
        max_retries=0,
        timeout=10.0
    )


# ================================================================
# ESTADO COMPARTIDO (LangGraph State)
# ================================================================
class XanaState(TypedDict):
    message: str
    user_role: str
    user_id: int
    username: str
    client_logs: List[Dict[str, Any]]
    current_url: str
    intent: str
    diagnostics_data: Dict[str, Any]
    reply: str
    tool_called: bool
    tool_name: str


# ================================================================
# TOOLS & DIAGNÓSTICO
# ================================================================

def tool_inspect_db_health() -> Dict[str, Any]:
    """Audita el estado de la base de datos Neon PostgreSQL y cuenta registros."""
    try:
        from sqlalchemy import text
        start_t = datetime.now()
        db.session.execute(text("SELECT 1")).close()
        latency_ms = round((datetime.now() - start_t).total_seconds() * 1000, 1)

        total_orders = Presupuesto.query.filter(Presupuesto.deleted_at.is_(None)).count()
        total_clientes = Cliente.query.count()
        total_vendedores = Vendedor.query.count()
        total_maquinas = Maquina.query.count()

        # Órdenes por estado
        activos = Presupuesto.query.filter(
            Presupuesto.deleted_at.is_(None)
        ).all()
        
        estados_count = {}
        for p in activos:
            st = p.estado or 'borrador'
            estados_count[st] = estados_count.get(st, 0) + 1

        return {
            'status': 'OK',
            'database': 'Neon PostgreSQL (Cloud)',
            'latency_ms': latency_ms,
            'tables': {
                'presupuestos_activos': total_orders,
                'clientes': total_clientes,
                'vendedores': total_vendedores,
                'maquinas': total_maquinas
            },
            'estados_ordenes': estados_count
        }
    except Exception as e:
        return {
            'status': 'ERROR',
            'error': str(e)
        }


def tool_analyze_frontend_logs(logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analiza los logs de consola del navegador y categoriza problemas con soluciones."""
    if not logs:
        return {
            'has_errors': False,
            'summary': 'No se registraron errores en la consola del navegador.'
        }

    detected_issues = []
    
    for l in logs:
        msg = str(l.get('message', ''))
        l_type = l.get('type', 'error')

        if '413' in msg or 'Payload Too Large' in msg or 'demasiado grande' in msg:
            detected_issues.append({
                'category': 'Tamaño de Archivo Excedido (HTTP 413)',
                'cause': 'El archivo subido supera el límite máximo permitido por el servidor (100 MB).',
                'solution': 'Comprimir el archivo, reducir la resolución a 150 DPI o exportarlo en formato JPG/PDF optimizado.',
                'raw': msg[:150]
            })
        elif '401' in msg or 'Unauthorized' in msg or 'token' in msg.lower():
            detected_issues.append({
                'category': 'Sesión Expirada (HTTP 401)',
                'cause': 'El token de autenticación del usuario venció o no es válido.',
                'solution': 'Cerrar sesión y volver a iniciar para renovar las credenciales.',
                'raw': msg[:150]
            })
        elif '404' in msg or 'Not Found' in msg:
            detected_issues.append({
                'category': 'Recurso No Encontrado (HTTP 404)',
                'cause': 'El endpoint o archivo solicitado no existe en el servidor.',
                'solution': 'Verificar la URL solicitada o si el archivo fue eliminado previamente.',
                'raw': msg[:150]
            })
        elif 'Failed to fetch' in msg or 'NetworkError' in msg or 'ConnectionRefused' in msg or '10061' in msg:
            detected_issues.append({
                'category': 'Fallo de Conexión de Red',
                'cause': 'El navegador no pudo comunicarse con el backend local (puerto 5000) o la base Neon.',
                'solution': 'Asegurarse de que el script `run_project.bat` esté ejecutándose en la computadora.',
                'raw': msg[:150]
            })
        elif 'QuotaExceededError' in msg:
            detected_issues.append({
                'category': 'Límite de Almacenamiento Local (LocalStorage)',
                'cause': 'El navegador se quedó sin espacio para almacenar miniaturas o DataURLs pesados.',
                'solution': 'El sistema ya aplica sanitización automática, pero se recomienda limpiar la caché del navegador.',
                'raw': msg[:150]
            })
        else:
            detected_issues.append({
                'category': 'Aviso / Error General',
                'cause': msg[:120],
                'solution': 'Inspeccionar el componente o recargar la página.',
                'raw': msg[:150]
            })

    return {
        'has_errors': True,
        'count': len(logs),
        'issues': detected_issues
    }


def tool_get_orders_for_user(user_role: str, user_id: int) -> List[Dict[str, Any]]:
    """Obtiene órdenes filtradas estrictamente según el rol."""
    query = Presupuesto.query.filter(Presupuesto.deleted_at.is_(None))

    if user_role == 'cliente':
        # Clientes solo ven sus presupuestos
        query = query.filter(Presupuesto.cliente_id == user_id)
    elif user_role == 'vendedor':
        # Vendedores ven sus órdenes o todas las de su sucursal
        pass

    orders = query.order_by(Presupuesto.created_at.desc()).limit(10).all()
    
    result = []
    for o in orders:
        c_name = o.cliente.nombre if o.cliente else (o.descripcion or 'Cliente General')
        result.append({
            'ot': f"OT-{str(o.id)[:8].upper()}",
            'estado': o.estado or 'borrador',
            'cliente': c_name,
            'total': float(o.total or 0),
            'fecha': o.created_at.strftime('%d/%m/%Y') if o.created_at else ''
        })
    return result


# ================================================================
# NODO DE CONOCIMIENTO (FASE 2) — KB Estructurada + RAG
# ================================================================

def knowledge_node(state: XanaState) -> XanaState:
    """Nodo para consultas de conocimiento técnico (fichas, bobinas, precios, manuales, procedimientos, tolerancias)."""
    msg = state.get('message', '')
    username = state.get('username', 'Usuario')
    role = state.get('user_role', 'cliente')
    user_id = state.get('user_id', 0)
    
    # Sincronizar materiales a KB si es primera vez o datos desactualizados
    try:
        sync_materials_to_kb()
    except Exception:
        pass
    
    # Intentar function calling primero (ya se hizo en function_calling_node)
    # Si llegamos aquí es porque no hubo tool_called, usar fallback regex-based
    
    # Usar consulta difusa sobre KB estructurada
    from services.xana_knowledge import query_structured_kb, rag_index, RAG_TOP_K
    
    results = query_structured_kb(msg, top_k=3)
    
    # Si no hay resultados estructurados, intentar RAG
    rag_results = []
    if not results:
        rag_results = rag_index.search(msg, top_k=RAG_TOP_K)
    
    if not results and not rag_results:
        state['reply'] = (
            f"No encontré información técnica específica para tu consulta. "
            f"Podés preguntarme sobre:\n"
            f"• Fichas técnicas de materiales (ej: 'ficha VV', 'especificaciones vinilo vehicular')\n"
            f"• Bobinas disponibles (ej: 'bobinas 1.37', 'anchos disponibles')\n"
            f"• Precios por m² (ej: 'precio lona frontlight', 'cuanto cuesta microperforado')\n"
            f"• Manuales y guías (ej: 'cómo calibrar tinta', 'procedimiento cambio bobina')\n"
            f"• Tolerancias del sistema (ej: 'margen seguridad', 'DPI mínimo')"
        )
        return state
    
    lines = [f"🔍 **Consulta de Conocimiento Técnico**"]
    
    if results:
        lines.append(f"\n📋 **Base de Conocimiento Estructurada ({len(results)} resultado(s)):**")
        for r in results:
            if r['tipo'] == 'material':
                ficha = r['data']
                lines.append(f"• **{ficha['codigo']}** — {ficha['descripcion']} ({ficha['tipo']})")
                if ficha.get('anchos_disponibles'):
                    lines.append(f"  Anchos: {', '.join(f'{a}m' for a in ficha['anchos_disponibles'])}")
                if ficha.get('precio_m2'):
                    lines.append(f"  Precio: ${ficha['precio_m2']:,.2f}/m²")
                lines.append(f"  📎 `{r['citacion']}`")
            elif r['tipo'] == 'bobina':
                info = r['data']
                mats = ', '.join(info.get('materiales_compatibles', [])[:3])
                lines.append(f"• Bobina **{r['ancho']}m** — Compatibles: {mats}")
                lines.append(f"  📎 `{r['citacion']}`")
            elif r['tipo'] == 'procedimiento':
                lines.append(f"• Procedimiento: **{r['nombre']}**")
                lines.append(f"  📎 `{r['citacion']}`")
    
    if rag_results:
        lines.append(f"\n📚 **Manuales y Guías (RAG) ({len(rag_results)} pasaje(s)):**")
        for i, r in enumerate(rag_results, 1):
            snippet = r['content'][:180].replace('\n', ' ') + ('...' if len(r['content']) > 180 else '')
            lines.append(f"{i}. **{r['source_name']}** (score: {r['score']:.2f})")
            lines.append(f"   {snippet}")
            lines.append(f"   📎 `{r['citacion']}`")
    
    state['reply'] = '\n'.join(lines)
    state['intent'] = 'knowledge'
    return state


# ================================================================
# NODO ANALÍTICO (FASE 3) — Métricas y Análisis Seguro
# ================================================================

def analytics_node(state: XanaState) -> XanaState:
    """Nodo para consultas analíticas (ventas, consumo, rendimiento, financiero)."""
    msg = state.get('message', '')
    username = state.get('username', 'Usuario')
    role = state.get('user_role', 'cliente')
    user_id = state.get('user_id', 0)
    
    # Solo admins/principales/impresores pueden ver analíticas
    if role not in ('admin', 'principal', 'impresion'):
        state['reply'] = "🔒 Las consultas analíticas están restringidas a roles Administrador, Principal e Impresión."
        return state
    
    # Intentar function calling primero (ya se hizo en function_calling_node)
    # Si llegamos aquí es porque no hubo tool_called, usar fallback regex-based
    # Para analytics, el function calling es obligatorio por seguridad (vistas parametrizadas)
    # Si no se invocó tool, guiamos al usuario
    
    state['reply'] = (
        f"📊 **Consultas Analíticas Disponibles** (requieren permisos de {role}):\n\n"
        f"• **Ventas por cliente**: \"ventas cliente 123 mes\", \"facturación cliente X trimestre\"\n"
        f"• **Consumo materiales**: \"consumo materiales mes\", \"m2 vinilo vehicular trimestre\"\n"
        f"• **Rendimiento máquinas**: \"rendimiento máquinas mes\", \"horas impresora semana\"\n"
        f"• **Resumen financiero**: \"resumen financiero mes\", \"facturación total anio\"\n"
        f"• **Top clientes**: \"top 10 clientes mes\", \"mejores clientes trimestre\"\n\n"
        f"💡 Usa lenguaje natural y Xana invocará las tools analíticas seguras (vistas parametrizadas, "
        f"timeout {3}s, máx 100 filas)."
    )
    state['intent'] = 'analytics'
    return state


def _classify_regex_intent(message: str, logs: List[Dict[str, Any]]) -> str:
    """Clasificación determinista por regex (router legacy) — fallback y shadow mode (A2)."""
    msg = (message or '').lower()
    if logs or 'error' in msg or 'consola' in msg or 'falló' in msg or 'diagnost' in msg or 'bug' in msg:
        return 'diagnostics'
    if 'salud' in msg or 'base de datos' in msg or 'db' in msg or 'neon' in msg or 'tabla' in msg:
        return 'db_health'
    if 'orden' in msg or 'pedido' in msg or 'presupuesto' in msg or 'ot' in msg:
        return 'orders'
    if 'precio' in msg or 'cotiz' in msg or 'lona' in msg or 'vinilo' in msg or 'cuanto cuesta' in msg:
        return 'pricing'
    if 'ficha' in msg or 'técnica' in msg or 'especificac' in msg or 'bobina' in msg or 'ancho' in msg or 'manual' in msg or 'guía' in msg or 'procedimiento' in msg or 'tolerancia' in msg:
        return 'knowledge'
    if 'venta' in msg or 'factur' in msg or 'consumo' in msg or 'material' in msg or 'máquina' in msg or 'maquina' in msg or 'rendimiento' in msg or 'financiero' in msg or 'resumen' in msg or 'top client' in msg or 'métrica' in msg or 'metrica' in msg:
        return 'analytics'
    return 'general_chat'


def router_node(state: XanaState) -> XanaState:
    """Clasifica la intención del usuario y los datos adjuntos (regex)."""
    state['intent'] = _classify_regex_intent(state.get('message', ''), state.get('client_logs', []))
    return state


def diagnostics_node(state: XanaState) -> XanaState:
    """Ejecuta el análisis de logs de consola y salud del sistema."""
    role = state.get('user_role', 'cliente')
    logs = state.get('client_logs', [])
    diag = tool_analyze_frontend_logs(logs)

    # Si es admin, también añade diagnóstico de backend
    if role == 'admin':
        db_health = tool_inspect_db_health()
        diag['db_health'] = db_health

    state['diagnostics_data'] = diag

    if not diag.get('has_errors'):
        reply = "🩺 **Diagnóstico de Pantalla**: ¡Todo limpio! No se detectaron errores en la consola del navegador ni en las peticiones de red."
        if role == 'admin' and 'db_health' in diag:
            dbh = diag['db_health']
            reply += f"\n\n⚙️ **Salud de Base de Datos**: Conectada a Neon PostgreSQL ({dbh.get('latency_ms', 0)} ms de latencia). Hay **{dbh.get('tables', {}).get('presupuestos_activos', 0)} órdenes** registradas."
    else:
        issues = diag.get('issues', [])
        reply = f"🚨 **Xana Diagnóstico**: Detecté **{len(issues)} advertencia(s) / error(es)** en la consola:\n\n"
        for i, iss in enumerate(issues[:4], 1):
            reply += f"**{i}. {iss['category']}**\n"
            reply += f"• *Causa*: {iss['cause']}\n"
            reply += f"• *Solución sugerida*: {iss['solution']}\n\n"

    state['reply'] = reply.strip()
    return state


def db_health_node(state: XanaState) -> XanaState:
    """Nodo para auditar la base de datos (solo admins)."""
    role = state.get('user_role', 'cliente')
    if role != 'admin':
        state['reply'] = "🔒 Esta función de auditoría técnica está reservada exclusivamente para Administradores de LuXius."
        return state

    health = tool_inspect_db_health()
    if health.get('status') == 'OK':
        tables = health.get('tables', {})
        estados = health.get('estados_ordenes', {})
        
        estados_str = ", ".join([f"**{k}**: {v}" for k, v in estados.items()]) or "Sin órdenes"

        state['reply'] = (
            f"🟢 **Auditoría de Base de Datos Neon**\n\n"
            f"• **Estado**: Operativo y Permanente\n"
            f"• **Latencia**: {health.get('latency_ms')} ms\n"
            f"• **Órdenes activas**: {tables.get('presupuestos_activos', 0)}\n"
            f"• **Clientes registrados**: {tables.get('clientes', 0)}\n"
            f"• **Vendedores**: {tables.get('vendedores', 0)}\n"
            f"• **Máquinas de impresión**: {tables.get('maquinas', 0)}\n\n"
            f"📊 **Distribución por Estado**:\n{estados_str}"
        )
    else:
        state['reply'] = f"🔴 **Alerta en Base de Datos**: Hubo un error de conexión: {health.get('error')}"

    return state


def orders_node(state: XanaState) -> XanaState:
    """Nodo para listar o consultar órdenes del usuario."""
    role = state.get('user_role', 'cliente')
    uid = state.get('user_id', 0)
    orders = tool_get_orders_for_user(role, uid)

    if not orders:
        state['reply'] = "📦 No tienes órdenes activas registradas en este momento."
        return state

    state['reply'] = f"📦 **Órdenes de Trabajo Recientes ({len(orders)})**:\n\n"
    for o in orders[:5]:
        state['reply'] += f"• **{o['ot']}** | {o['cliente']} — Estado: *{o['estado']}* (${o['total']:,.2f})\n"

    state['reply'] += "\n¿Querés que inspeccionemos el detalle de alguna orden en particular?"
    return state


def general_chat_node(state: XanaState) -> XanaState:
    """Nodo conversacional inteligente (proveedor configurable: Gemini o DeepSeek)."""
    msg = state.get('message', '')
    username = state.get('username', 'Usuario')
    role = state.get('user_role', 'cliente')

    try:
        llm = _build_llm(temperature=0.3)
        system_prompt = f"""Eres Xana AI, la asistente inteligente e ingeniera de operaciones exclusiva de LuXius, el sistema de gestión de la imprenta gráfica argentina 'XignuX Gráfica'.
Estás hablando con '{username}', que tiene el rol de '{role}'. 
Actúa con profesionalismo, sé amable, ejecutiva y concisa.

CONOCIMIENTO VITAL DE LA ARQUITECTURA LUXIUS:
1. Borrador Inteligente de Pedidos (Smart Order): Si te pasan un enlace de Google Drive o suben archivos gráficos, el backend los analiza de forma asíncrona (job_id), extrayendo DPI, modo de color, dimensiones reales y miniaturas en Cloudflare R2 sin saturar la memoria RAM.
2. Motor Anti-Escala 3D: Detectas heurísticamente archivos diseñados en escala 1:10 o 1:20 (DPI >= 250 en dimensiones menores a 2m para gigantografía) y sugieres la escala correcta con intervención humana (Human-in-the-Loop).
3. Motor de Metraje y Precios Unificado: El cálculo evalúa las bobinas disponibles (1.00m, 1.05m, 1.27m, 1.37m, 1.52m, 1.60m, 1.80m, 2.20m, 3.20m), aplica un margen de seguridad de 1 cm (0.01m) y compara la orientación normal vs rotada a 90° para seleccionar la que minimice el descarte y el costo.
4. Almacenamiento Dual & Bóveda Histórica: Cloudflare R2 es la Autoridad Máster (capa caliente con zero-egress para streaming y visor Canvas), y Google Drive Shared Drive es la Bóveda Fría de respaldo histórico. La integridad se audita mediante el motor de reconciliación clasificada (SYNCED_MATCH, MISSING_NEW, HASH_MISMATCH, LIFECYCLE_PURGED).
5. Daemon de Taller RIP: Automatización de descarga atómica en staging NTFS (.tmp -> replace) hacia las Hot Folders del RIP (PhotoPrint / VersaWorks) con manejo de lotes multi-archivo y timeout de 10 min.

REGLA ESTRICTA: Tu propósito es asistir en tareas relacionadas a LuXius, XignuX Gráfica, producción gráfica, órdenes, cotizaciones y flujos de taller.
Si el usuario te hace preguntas no relacionadas, indícale amablemente tu función en la imprenta.
No te presentes diciendo 'Hola, soy Xana' en cada mensaje; ve directo al grano."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=msg)
        ]

        response = llm.invoke(messages)
        state['reply'] = response.content
        return state
    except Exception as e:
        print(f"[Xana LangGraph] LLM error: {e}", file=sys.stderr)

    # Respuesta local inteligente contextual (Fallback)
    msg_lower = msg.lower()
    if 'hola' in msg_lower or 'buen dia' in msg_lower or 'buenas' in msg_lower:
        state['reply'] = f"¡Hola {username}! 😊 Soy Xana AI. ¿En qué te puedo dar una mano hoy? Podés consultarme sobre órdenes, stock, precios o pedirme un diagnóstico del sistema."
    elif 'vinilo' in msg_lower:
        state['reply'] = "Trabajamos con vinilo monomérico (promocional/corta duración), polimérico (alta durabilidad exterior), microperforado (vidrieras/vehículos) y esmerilado. ¿Para qué aplicación lo necesitas?"
    elif 'lona' in msg_lower:
        state['reply'] = "Manejamos Lona Frontlight 13oz (cartelería tradicional), Backlight 15oz (para cajas con luz interior) y Blackout (doble faz). Todas se imprimen en calidad estándar o alta definición."
    elif 'precio' in msg_lower or 'cotiz' in msg_lower:
        state['reply'] = "Los precios se calculan automáticamente en base a los metros cuadrados ($m^2$), el tipo de sustrato y los acabados (ojalillos, dobladillo, laminado). Podés ver la lista completa en la pestaña **Precios** o pedirme que cotice un trabajo."
    else:
        state['reply'] = f"Entendido, {username}. Estoy a tu disposición para ayudarte con cualquier gestión de producción, control de órdenes o diagnóstico de fallos técnicos en LuXius."

    return state


# ================================================================
# FUNCTION CALLING (FASE 1 + 2) — Tools tipadas con fallback al router regex
# ================================================================

def _format_tool_result(name: str, result: Dict[str, Any]) -> str:
    """Formatea el resultado de una tool en un mensaje legible para el usuario."""
    if not result.get('ok'):
        return f"⚠️ {result.get('error', 'La herramienta no pudo completar la operación.')}"

    # Knowledge tools (Fase 2)
    if name in ('consultar_ficha_tecnica', 'consultar_bobinas_disponibles', 'consultar_precio_material',
                'buscar_en_manuales', 'consultar_procedimiento', 'consultar_tolerancias'):
        return format_knowledge_tool_result(name, result)

    # Analytics tools (Fase 3)
    if name in ('obtener_ventas_cliente', 'obtener_consumo_materiales', 'obtener_rendimiento_maquinas',
                'obtener_resumen_financiero', 'obtener_top_clientes'):
        return format_analytics_tool_result(name, result)

    if name == 'obtener_estado_ot':
        return (
            f"📦 **{result['ot']}** — Estado: *{result['estado']}*\n"
            f"• Cliente: {result['cliente']}\n"
            f"• Descripción: {result.get('descripcion') or '—'}\n"
            f"• Total: ${result.get('total', 0):,.2f}\n"
            f"• Saldo pendiente: ${result.get('saldo_pendiente', 0):,.2f}"
        )

    if name == 'consultar_stock_materiales':
        mats = result.get('materiales', [])
        if not mats:
            return f"📦 {result.get('nota', 'Sin resultados.')}"
        lines = [f"📦 **Stock de materiales** ({len(mats)} resultado(s)):"]
        for m in mats[:8]:
            unidad = m.get('unidad') or '—'
            bobinas = m.get('bobinas') or []
            extra = ''
            if bobinas:
                extra = ' · Bobinas: ' + ', '.join(
                    f"{b.get('ancho')}m ({b.get('stockActual', 0)})"
                    for b in bobinas if b.get('stockActual')
                )
            bot = ''
            if m.get('botellasCerradas') or m.get('botellasMl'):
                bot = f" · 🍾 {m.get('botellasCerradas', 0)} botellas ({m.get('botellasMl', 0)} ml)"
            lines.append(f"• **{m.get('codigo')}** — {m.get('descripcion')}: {m.get('stockActual', 0)} {unidad}{extra}{bot}")
        return '\n'.join(lines)

    if name == 'obtener_metricas_ventas_cliente':
        return (
            f"📊 **Métricas de ventas** — {result.get('cliente') or 'Cliente'} ({result.get('periodo')})\n"
            f"• Órdenes: {result.get('cantidad_ordenes', 0)}\n"
            f"• Facturado: ${result.get('total_facturado', 0):,.2f}"
        )

    if name == 'crear_orden_trabajo':
        return f"✅ {result.get('mensaje', 'Orden creada.')}\n• N° {result.get('ot')} — Estado: {result.get('estado')}"

    if name == 'cotizar_trabajo':
        if not result.get('ok', True):
            return f"⚠️ {result.get('error', 'Error al calcular la cotización.')}"
        return (
            f"💰 **Cotización de Trabajo ({result.get('material', '')})**\n"
            f"• Medidas: {result.get('ancho_m', 0):.2f}m x {result.get('alto_m', 0):.2f}m ({result.get('copias', 1)} copias)\n"
            f"• Área útil: {result.get('area_m2_util', 0):.2f} m² | Facturada: {result.get('area_m2_facturada', 0):.2f} m²\n"
            f"• Bobina óptima: {result.get('bobina_optima_m', 0):.2f} m (desperdicio: {result.get('desperdicio_pct', 0):.1f}%)\n"
            f"• Precio base: ${result.get('subtotal_impresion', 0):,.2f}\n"
            f"• Total final: **${result.get('precio_total', 0):,.2f}**"
        )

    if name == 'consultar_especificacion_tecnica':
        if not result.get('ok', True):
            return f"ℹ️ {result.get('error', 'Especificación técnica no encontrada.')}"
        return (
            f"📐 **Especificación Técnica — {result.get('parametro', '')}**\n"
            f"• Valor verificado: **{result.get('valor_oficial', '')}**\n"
            f"• Contexto de taller: {result.get('descripcion', '')}\n"
            f"• Tolerancia: {result.get('tolerancia', 'Sin tolerancia')}"
        )


    return "✅ Operación completada."


def function_calling_node(state: XanaState) -> XanaState:
    """Intenta resolver con function calling; si no hay tool, cae al router regex (shadow mode)."""
    state['tool_called'] = False
    state['tool_name'] = ''
    msg = state.get('message', '')

    if not msg.strip():
        return state

    try:
        llm = _build_llm(temperature=0)
        llm_with_tools = llm.bind_tools(XANA_TOOLS)
        response = llm_with_tools.invoke([HumanMessage(content=msg)])

        tool_calls = getattr(response, 'tool_calls', None) or []
        if tool_calls:
            tc = tool_calls[0]
            name = tc.get('name', '')
            args = tc.get('args', {}) or {}
            result = execute_xana_tool(name, args)
            state['reply'] = _format_tool_result(name, result)
            state['intent'] = 'tool_executed'
            state['tool_called'] = True
            state['tool_name'] = name
            return state
    except Exception as e:
        print(f"[Xana Function Calling] {e}", file=sys.stderr)

    state['intent'] = ''
    return state


# ================================================================
# CONSTRUCCIÓN DEL GRAFO LANGGRAPH
# ================================================================

def create_xana_workflow():
    workflow = StateGraph(XanaState)

    # Añadir Nodos
    workflow.add_node("function_calling", function_calling_node)
    workflow.add_node("router", router_node)
    workflow.add_node("diagnostics", diagnostics_node)
    workflow.add_node("db_health", db_health_node)
    workflow.add_node("orders", orders_node)
    workflow.add_node("general_chat", general_chat_node)
    workflow.add_node("knowledge", knowledge_node)
    workflow.add_node("analytics", analytics_node)

    # Punto de Entrada
    workflow.set_entry_point("function_calling")

    # Si se ejecutó una tool -> END; si no -> router regex
    def route_after_tool(state: XanaState) -> str:
        if state.get('tool_called'):
            return 'end'
        return 'router'

    workflow.add_conditional_edges(
        "function_calling",
        route_after_tool,
        {"end": END, "router": "router"}
    )

    # Aristas Condicionales basadas en la intención
    def route_decision(state: XanaState) -> str:
        intent = state.get('intent', 'general_chat')
        if intent == 'diagnostics':
            return 'diagnostics'
        elif intent == 'db_health':
            return 'db_health'
        elif intent == 'orders':
            return 'orders'
        elif intent == 'knowledge':
            return 'knowledge'
        elif intent == 'analytics':
            return 'analytics'
        else:
            return 'general_chat'

    workflow.add_conditional_edges(
        "router",
        route_decision,
        {
            "diagnostics": "diagnostics",
            "db_health": "db_health",
            "orders": "orders",
            "knowledge": "knowledge",
            "analytics": "analytics",
            "general_chat": "general_chat"
        }
    )

    workflow.add_edge("diagnostics", END)
    workflow.add_edge("db_health", END)
    workflow.add_edge("orders", END)
    workflow.add_edge("knowledge", END)
    workflow.add_edge("analytics", END)
    workflow.add_edge("general_chat", END)

    return workflow.compile()


# Instancia compilada del grafo
xana_app = create_xana_workflow()


def _log_shadow_decision(message: str, user_role: str, regex_intent: str, final_intent: str, tool_name: str) -> None:
    """Registra la decisión para el Shadow Mode (A2): compara router LLM vs router regex."""
    try:
        clave = 'collection_xana_shadow'
        row = ConfigGlobal.query.filter_by(clave=clave).first()
        logs = (row.valor if row and isinstance(row.valor, list) else [])
        logs.append({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'message': (message or '')[:200],
            'user_role': user_role,
            'regex_intent': regex_intent,
            'final_intent': final_intent,
            'tool_name': tool_name
        })
        if len(logs) > 500:
            logs = logs[-500:]
        if row:
            row.valor = logs
        else:
            db.session.add(ConfigGlobal(clave=clave, valor=logs))
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[Xana Shadow] {e}", file=sys.stderr)


def run_xana_chat(
    message: str,
    user_role: str = 'cliente',
    username: str = 'Usuario',
    user_id: int = 0,
    client_logs: Optional[List[Dict[str, Any]]] = None,
    current_url: str = '/'
) -> Dict[str, Any]:
    """Ejecuta el grafo de LangGraph con el estado inicial del usuario."""
    initial_state: XanaState = {
        'message': message,
        'user_role': user_role,
        'username': username,
        'user_id': user_id,
        'client_logs': client_logs or [],
        'current_url': current_url,
        'intent': '',
        'diagnostics_data': {},
        'reply': '',
        'tool_called': False,
        'tool_name': ''
    }

    result = xana_app.invoke(initial_state)

    # Shadow mode logging (A2): comparar LLM vs regex
    _log_shadow_decision(
        message=message,
        user_role=user_role,
        regex_intent=_classify_regex_intent(message, client_logs or []),
        final_intent=result.get('intent', ''),
        tool_name=result.get('tool_name', '')
    )

    return {
        'reply': result.get('reply', ''),
        'intent': result.get('intent', ''),
        'diagnostics': result.get('diagnostics_data', {})
    }
