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
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from models import db, Presupuesto, Cliente, Vendedor, Maquina, SyncLog, ConfigGlobal
from services.xana_tools import XANA_TOOLS, execute_xana_tool


MODELS_CASCADE = [
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.6-flash',
    'gemini-3.5-flash'
]


def _build_llm(temperature: float = 0.25, model_name: Optional[str] = None):
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

    chosen = model_name or "gemini-3.5-flash-lite"
    return ChatGoogleGenerativeAI(
        model=chosen,
        google_api_key=api_key,
        temperature=temperature,
        max_retries=1,
        timeout=18.0
    )


def _extract_text(content: Any) -> str:
    """Extrae texto plano limpiamente tanto si content es str como si es una lista de bloques de LangChain."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for p in content:
            if isinstance(p, dict):
                parts.append(p.get('text', ''))
            elif hasattr(p, 'text'):
                parts.append(getattr(p, 'text', ''))
            else:
                parts.append(str(p))
        return "".join(parts)
    return str(content or '')


def _get_live_operational_context() -> str:
    """Obtiene el contexto operativo en vivo del taller (órdenes vivas, urgencias, stock) para situar a Xana."""
    try:
        from datetime import timedelta
        ar_tz = timezone(timedelta(hours=-3))
        ar_now = datetime.now(ar_tz)
        now_str = ar_now.strftime("%A %d/%m/%Y, %H:%M hs (Hora Argentina)")

        ordenes = Presupuesto.query.filter(
            Presupuesto.deleted_at.is_(None),
            Presupuesto.estado.in_(['orden', 'ORDEN_DE_TRABAJO'])
        ).all()

        total_impresas = Presupuesto.query.filter(
            Presupuesto.deleted_at.is_(None),
            Presupuesto.estado == 'impreso'
        ).count()

        total_ml = 0.0
        urgentes = []
        for o in ordenes:
            esp = o.especificaciones or {}
            c = int(esp.get('copias') or 1)
            a = float(esp.get('alto') or esp.get('altoReal') or 1.0)
            ml = a * c
            total_ml += ml
            tags = esp.get('tags') or []
            if any('URGENTE' in str(t).upper() or 'VIP' in str(t).upper() for t in tags):
                cl = o.cliente.nombre if o.cliente else 'Sin Cliente'
                urgentes.append(f"OT-{str(o.id)[:8].upper()} ({cl})")

        stock_row = ConfigGlobal.query.filter_by(clave='collection_materiales').first()
        mats = stock_row.valor if (stock_row and isinstance(stock_row.valor, list)) else []
        criticos = [m.get('codigo') for m in mats if float(m.get('stockActual') or 0) <= float(m.get('stockMinimo') or 10)]

        lines = [
            f"SITUACIÓN OPERATIVA EN VIVO DE XIGNUX GRÁFICA:",
            f"• Fecha y hora actual: {now_str}",
            f"• Cola de Impresión en Taller: {len(ordenes)} OTs pendientes ({total_ml:.2f} metros lineales en cola)",
            f"• Trabajos ya impresos: {total_impresas} OTs finalizadas"
        ]
        if urgentes:
            lines.append(f"• 🚨 Urgencias activas en taller: {', '.join(urgentes[:5])}")
        if criticos:
            lines.append(f"• ⚠️ Insumos en alerta de stock crítico: {', '.join(criticos[:6])}")

        return "\n".join(lines)
    except Exception as e:
        return f"SITUACIÓN OPERATIVA: Sistema LuXius conectado (Nota de contexto vivo: {e})"


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
    history: Optional[List[Dict[str, str]]]


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
# NODOS DEL GRAFO (LangGraph Nodes)
# ================================================================

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
    """Nodo conversacional inteligente con especialización en artes gráficas, preimpresión y contexto vivo."""
    msg = state.get('message', '')
    username = state.get('username', 'Usuario')
    role = state.get('user_role', 'cliente')
    history = state.get('history') or []

    live_context = _get_live_operational_context()

    system_prompt = f"""Eres Xana AI, la asistente inteligente, consultora técnica y jefa de operaciones de LuXius, el sistema de gestión y producción de 'XignuX Gráfica' (Córdoba, Argentina).
Estás conversando con '{username}' (rol: '{role}').
Actúa con cordialidad, profesionalismo técnico y tono ejecutivo. Usá modismos y terminología gráfica argentina (demasías, refiles, bobinas, ojalillos, lonas, bajadas de archivo, panelizado, trazado a curvas, sangrías, cuatricromía).

{live_context}

CONOCIMIENTO VITAL DE LA ARQUITECTURA LUXIUS:
1. Borrador Inteligente de Pedidos (Smart Order): Si te pasan un enlace de Google Drive o suben archivos gráficos, el backend los analiza de forma asíncrona (job_id), extrayendo DPI, modo de color, dimensiones reales y miniaturas en Cloudflare R2 sin saturar la memoria RAM.
2. Motor Anti-Escala 3D: Detectas heurísticamente archivos diseñados en escala 1:10 o 1:20 (DPI >= 250 en dimensiones menores a 2m para gigantografía) y sugieres la escala correcta con intervención humana (Human-in-the-Loop).
3. Motor de Metraje y Precios Unificado: El cálculo evalúa las bobinas disponibles (1.00m, 1.05m, 1.27m, 1.37m, 1.52m, 1.60m, 1.80m, 2.20m, 3.20m), aplica un margen de seguridad de 1 cm (0.01m) y compara la orientación normal vs rotada a 90° para seleccionar la que minimice el descarte y el costo.
4. Almacenamiento Dual & Bóveda Histórica: Cloudflare R2 es la Autoridad Máster (capa caliente con zero-egress para streaming y visor Canvas), y Google Drive Shared Drive es la Bóveda Fría de respaldo histórico. La integridad se audita mediante el motor de reconciliación clasificada (SYNCED_MATCH, MISSING_NEW, HASH_MISMATCH, LIFECYCLE_PURGED).
5. Daemon de Taller RIP: Automatización de descarga atómica en staging NTFS (.tmp -> replace) hacia las Hot Folders del RIP (PhotoPrint / VersaWorks) con manejo de lotes multi-archivo y timeout de 10 min.

ASESORAMIENTO TÉCNICO MAESTRO DE LA INDUSTRIA GRÁFICA & CONSEJOS DE IMÁGENES:
1. Resolución DPI según Distancia de Visualización (Ley del Ojo Humano):
   • Distancia > 5 metros (vallas de ruta, gigantografías en altura, cartelería de vía pública): 35 a 72 DPI reales a escala 1:1. Pedir 300 DPI a 10 metros es un error común: el ojo no distingue más de 50 DPI a esa distancia y colapsa el software RIP inútilmente.
   • Distancia 2 a 5 metros (marquesinas de locales, fondos de prensa, banners comerciales): 100 a 150 DPI reales a escala 1:1.
   • Distancia < 1 metro (gráfica vehicular de cerca, vidrieras, cuadros Canvas decorativos, cartelería POP): 150 a 300 DPI reales a escala 1:1.
   • Folletería y calcos pequeños (etiquetas, stickers): 300 DPI reales mínimo.
   • Regla de Escala 1:10: Si un cartel enorme (ej. 6x3 metros) se diseña a escala 1:10 (60x30 cm), el archivo debe tener mínimo 300 a 600 DPI para que al ampliarse al 100% en el RIP mantenga entre 30 y 60 DPI reales sin pixelarse.

2. Modo de Color y Tintas (CMYK vs RGB):
   • Impresión Gran Formato siempre en CMYK (perfiles Fogra39 o U.S. Web Coated SWOP).
   • Peligro RGB: En RGB los colores pantalla tienen luz y un gamut más amplio. Tonos fosforescentes (verdes flúor, cianes eléctricos, magentas chillones) se apagan o cambian drásticamente al pasar a tintas físicas CMYK. Avisar siempre al cliente.
   • Negro Enriquecido (Rich Black) en fondos y plenos: Nunca usar K:100 solo en fondos oscuros porque sale grisáceo o lavado. Usar C:40 M:30 Y:30 K:100 o C:50 M:40 Y:40 K:100 para un negro profundo y uniforme.
   • Negro Puro (K:100) en textos chicos: En textos menores a 24pt usar K:100 puro sin CMY para evitar descalce o halos borrosos por registro de cabezales.
   • Prevención de Azul a Violeta: En mezclas de azul, mantener el Magenta al menos 30% por debajo del Cyan (ej. C:100 M:60). Si Magenta se acerca al Cyan (ej. C:100 M:90), en plotter saldrá violeta oscuro en vez de azul marino.

3. Sustratos, Vinilos y Lonas:
   • Vinilo Monomérico: Campañas cortas (1-2 años), superficies planas, vidrieras promocionales. Tiende a encogerse con el calor.
   • Vinilo Polimérico: Exterior de 3 a 5 años, señalética y vehículos con curvaturas moderadas. Alta estabilidad dimensional.
   • Vinilo Fundido (Cast / Wrap): Para rotulación vehicular integral (car wrapping), termosellable sobre remaches y molduras profundas sin memoria de forma.
   • Microperforado: Para lunetas traseras de autos y vidrieras comerciales (60% vinilo / 40% perforación, permite ver de adentro hacia afuera).
   • Lona Frontlight (13oz): Cartelería estándar con iluminación frontal exterior.
   • Lona Backlight (15oz translúcida): Para cajas de luz / marquesinas retroiluminadas; requiere perfil con mayor carga de tinta o doble pasada para que los colores no se laven con la luz LED interna.
   • Lona Blackout (Doble Faz): Lámina intermedia negra opaca para evitar transparencias en carteles o banners colgantes de dos caras.
   • Lona Mesh (Microperforada): Para zonas ventosas y fachadas de edificios; alivia la resistencia del viento evitando roturas mecánicas.

4. Consejos de Imágenes y Escalado con IA:
   • Si una imagen de cliente viene en baja resolución (ej. sacada de WhatsApp, redes o Google con compresión JPG agresiva), recomendar vectorizar logos o usar el 'Escalador IA' (Real-ESRGAN Vulkan) de LuXius en Xpress Studio para aumentar 4x la resolución reconstruyendo detalles sin pixelado.
   • Tipografías: Siempre convertidas a curvas/trazos en PDFs vectoriales o Illustrator antes de mandar a taller para evitar fuentes sustituidas.

5. Acabados y Confección de Taller:
   • Demasías oficiales: 5 cm (0.05m) perimetrales por lado para tensar en bastidores con grampas o remaches.
   • Ojalillos: Cada 30 a 50 cm en el perímetro.
   • Bolsillos / Vainas: Ancho de bolsillo = (Diámetro del caño x 3.14 / 2) + 2 cm de margen técnico.
   • Panelizado: El ancho máximo continuo de máquina es 3.20m. Paños mayores requieren panelizado con solape de 2.5 a 3.0 cm para termosellado.
   • Laminado UV: Indispensable en vinilos vehiculares o pisos antideslizantes para proteger contra intemperie, naftas y rayones.

REGLAS ANTI-ALUCINACIÓN (GATE A4):
- CERO INVENCIÓN: Nunca inventes precios, cotizaciones, clientes, órdenes ni tolerancias.
- Toda cotización o precio debe basarse en el tarifario oficial (tool 'cotizar_trabajo'). Si te piden inventar un precio, rechaza explícitamente.
- Si consultan por clientes inexistentes (ej. 'Empresa Fantasma') u OTs inexistentes (ej. 'OT-999999'), declara categóricamente que no existen.
- Si preguntan por materiales no registrados (ej. 'vinilo diamante'), declara que no está registrado.
- Si afirman un precio falso, desmiéntelo y aclara la tarifa oficial.
No te presentes diciendo 'Hola, soy Xana' en cada mensaje; sé directa, ejecutiva y resolutiva."""

    messages = [SystemMessage(content=system_prompt)]

    for h in history[-6:]:
        r = h.get('role', '')
        c = h.get('content', '')
        if r == 'user' and c:
            messages.append(HumanMessage(content=c))
        elif r in ('assistant', 'model', 'bot') and c:
            messages.append(AIMessage(content=c))

    messages.append(HumanMessage(content=msg))

    for model_name in MODELS_CASCADE:
        try:
            llm = _build_llm(temperature=0.3, model_name=model_name)
            response = llm.invoke(messages)
            text_reply = _extract_text(response.content).strip()
            if text_reply:
                state['reply'] = text_reply
                return state
        except Exception as e:
            print(f"[Xana LangGraph - {model_name}] LLM error: {e}", file=sys.stderr)
            continue

    # Fallback inteligente enriquecido con conocimiento gráfico
    msg_lower = msg.lower()
    if 'hola' in msg_lower or 'buen dia' in msg_lower or 'buenas' in msg_lower:
        state['reply'] = f"¡Hola {username}! 😊 Soy Xana AI, jefa de operaciones de XignuX Gráfica. ¿En qué puedo ayudarte hoy? Podés consultarme sobre la cola de taller, métricas de facturación, estado de órdenes, insumos o pedirme asesoramiento técnico sobre resoluciones, materiales y preparación de archivos."
    elif any(k in msg_lower for k in ('dpi', 'resolucion', 'resolución', 'pixel', 'distancia')):
        state['reply'] = "📐 **Consejo de Resolución DPI según Distancia**:\n• Para cartelería en altura / vía pública (>5m): 35 a 72 DPI reales a escala 1:1.\n• Para marquesinas y banners comerciales (2 a 5m): 100 a 150 DPI reales a 1:1.\n• Para gráfica vehicular de cerca, vidrieras o cuadros (<1m): 150 a 300 DPI reales.\n• Si diseñás a escala 1:10, usá al menos 300 DPI en el archivo para que al estirar conserve nitidez. Para fotos pixeladas podés usar el **Escalador IA (Real-ESRGAN)** de LuXius."
    elif any(k in msg_lower for k in ('cmyk', 'rgb', 'color', 'negro')):
        state['reply'] = "🎨 **Consejo de Color y Tintas**:\n• Enviá siempre en **CMYK** (Fogra39). En RGB los tonos fosforescentes se apagan en el plotter.\n• Para fondos negros grandes usá **Negro Enriquecido**: C:40 M:30 Y:30 K:100. K:100 solo queda gris lavado.\n• En textos chicos usá K:100 puro sin CMY para evitar desfasaje de registro en cabezal."
    elif 'vinilo' in msg_lower:
        state['reply'] = "🎞️ **Guía de Vinilos**:\n• **Monomérico**: Cartelería plana y promociones (1 a 2 años).\n• **Polimérico**: Carteles exteriores duraderos (3 a 5 años) y vehículos sin curvas extremas.\n• **Cast / Fundido**: Rotulación completa vehicular (car wrap), remaches y molduras profundas.\n• **Microperforado**: Lunetas y vidrieras (visibilidad 60/40)."
    elif 'lona' in msg_lower:
        state['reply'] = "🎪 **Guía de Lonas**:\n• **Frontlight 13oz**: Cartelería estándar con luz exterior.\n• **Backlight 15oz**: Cajas con iluminación trasera (requiere mayor densidad de tinta).\n• **Blackout**: Doble faz opaca sin transparencias.\n• **Mesh**: Fachadas y zonas con viento fuerte."
    elif any(k in msg_lower for k in ('taller', 'cola', 'imprimir', 'metros')):
        state['reply'] = "🖨️ Podés ver el estado exacto de la cola del taller pidiéndome `/taller` o consultando la cola de producción en vivo en el sistema."
    else:
        state['reply'] = f"Entendido, {username}. Estoy a tu disposición para ayudarte con cualquier gestión de producción, control de órdenes, asesoramiento gráfico o diagnóstico en LuXius."

    return state


# ================================================================
# FUNCTION CALLING (FASE 1) — Tools tipadas con fallback al router regex
# ================================================================

def _format_tool_result(name: str, result: Dict[str, Any]) -> str:
    """Formatea el resultado de una tool en un mensaje legible para el usuario."""
    if not result.get('ok'):
        return f"⚠️ {result.get('error', 'La herramienta no pudo completar la operación.')}"

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
        acabados_str = f" · Acabados: {', '.join(result.get('acabados', []))}" if result.get('acabados') else ""
        return (
            f"💰 **Cotización Oficial — {result.get('material')}**\n"
            f"• Dimensiones: {result.get('dimensiones')} ({result.get('copias')} copia(s)) · {result.get('area_m2')} m²\n"
            f"• Bobina: {result.get('bobina_ancho')}m (Descarte: {result.get('descarte_estimado_m')}m)\n"
            f"• Tarifa: ${result.get('tarifa_unitaria_m2', 0):,.2f}/m²{acabados_str}\n"
            f"• **Total Estimado: ${result.get('total_estimado', 0):,.2f}**\n"
            f"*(Fuente: {result.get('fuente')})*"
        )

    if name == 'consultar_especificacion_tecnica':
        return (
            f"📐 **Ficha Técnica: {result.get('tema')}**\n"
            f"• **Valor oficial**: {result.get('valor')}\n"
            f"• {result.get('especificacion')}\n"
            f"*(Fuente: {result.get('fuente')})*"
        )

    if name == 'consultar_resumen_taller_y_cola':
        urgentes_str = ""
        if result.get('urgencias'):
            urg_list = [f"• 🚨 **{u['ot']}** — {u['cliente']} ({u['material']}, {u['ml']} ml)" for u in result['urgencias']]
            urgentes_str = "\n" + "\n".join(urg_list)
        bobinas_lines = []
        for mat_bob, ml in result.get('bobinas_ml', {}).items():
            bobinas_lines.append(f"• {mat_bob}: **{ml} ml**")
        bobinas_str = "\n".join(bobinas_lines) if bobinas_lines else "• Sin cortes pendientes"
        return (
            f"🏭 **Estado de Taller y Cola de Impresión**\n"
            f"• OTs en Cola: **{result.get('pendientes_ots', 0)}** ({result.get('metros_lineales_total', 0)} metros lineales)\n"
            f"• OTs ya impresas: **{result.get('ya_impresas_count', 0)}**\n"
            f"• Urgencias activas: **{result.get('urgencias_count', 0)}**{urgentes_str}\n\n"
            f"📋 **Desglose por Bobinas y Materiales**:\n{bobinas_str}"
        )

    if name == 'consultar_metricas_facturacion':
        return (
            f"📈 **Métricas de Facturación ({result.get('periodo', 'mes').upper()})**\n"
            f"• Total Facturado: **${result.get('total_facturado', 0):,.2f}**\n"
            f"• Saldo Cobrado: **${result.get('saldo_cobrado', 0):,.2f}**\n"
            f"• Saldo Pendiente: **${result.get('saldo_pendiente', 0):,.2f}**\n"
            f"• Cantidad de Órdenes: **{result.get('cantidad_ordenes', 0)}**\n"
            f"• Ticket Promedio: **${result.get('ticket_promedio', 0):,.2f}**\n"
            f"*(Alcance: {result.get('dias')} días)*"
        )

    if name == 'consultar_ranking_clientes':
        ranking = result.get('ranking', [])
        if not ranking:
            return "👥 No se registraron clientes con facturación en este período."
        lines = [f"🏆 **Top Clientes por Facturación** ({len(ranking)} clientes):"]
        for r in ranking:
            lines.append(f"#{r['posicion']} **{r['cliente']}** — ${r['total_facturado']:,.2f} ({r['cantidad_ordenes']} órdenes)")
        return "\n".join(lines)

    if name == 'buscar_ordenes_avanzado':
        resultados = result.get('resultados', [])
        if not resultados:
            return f"🔍 No se encontraron órdenes coincidentes con '{result.get('criterio')}'."
        lines = [f"🔍 **Órdenes encontradas para '{result.get('criterio')}'** ({len(resultados)}):"]
        for o in resultados:
            urg_badge = "🚨 URGENTE " if o.get('urgente') else ""
            lines.append(f"• **{o['ot']}** | {urg_badge}{o['cliente']} — *{o['estado']}* | {o['material']} (${o['total']:,.2f}) [{o['fecha']}]")
        return "\n".join(lines)

    if name == 'consultar_alertas_stock_critico':
        materiales = result.get('materiales', [])
        if not materiales:
            return "✅ **Stock en regla**: Ningún material ni insumo está por debajo del stock mínimo de seguridad."
        lines = [f"⚠️ **Alertas de Stock Crítico ({len(materiales)} insumos en riesgo)**:"]
        for m in materiales:
            lines.append(f"• 🔴 **{m['codigo']}** ({m['descripcion']}): Stock actual **{m['stockActual']} {m['unidad']}** (Mínimo: {m['stockMinimo']} {m['unidad']})")
        lines.append("\nSe recomienda reposición urgente con proveedores habituales.")
        return "\n".join(lines)

    if name == 'consultar_asesoramiento_grafico':
        lines = [f"🎨 **Asesoramiento Gráfico Profesional: {result.get('tema', 'Preimpresión')}**"]
        if result.get('resumen'):
            lines.append(f"*{result['resumen']}*\n")
        if result.get('tabla_dpi'):
            lines.append("📏 **Resolución según distancia de visión**:")
            for item in result['tabla_dpi']:
                lines.append(f"• **{item['distancia']}**: {item['dpi_1_1']}\n  _{item['regla']}_")
        if result.get('reglas_clave'):
            lines.append("🎨 **Reglas de Color y Tintas**:")
            for r in result['reglas_clave']:
                lines.append(f"• {r}")
        if result.get('vinilos'):
            lines.append("🎞️ **Guía de Vinilos**:")
            for v in result['vinilos']:
                lines.append(f"• {v}")
        if result.get('lonas'):
            lines.append("🎪 **Guía de Lonas**:")
            for l in result['lonas']:
                lines.append(f"• {l}")
        if result.get('detalles'):
            lines.append("📐 **Acabados y Confección**:")
            for d in result['detalles']:
                lines.append(f"• {d}")
        if result.get('regla_escala_1_10'):
            lines.append(f"\n💡 *Escala 1:10*: {result['regla_escala_1_10']}")
        if result.get('escalador_ia'):
            lines.append(f"🚀 *Potenciador IA*: {result['escalador_ia']}")
        return "\n".join(lines)

    if name == 'consultar_tarifario_oficial':
        tarifas = result.get('tarifas', [])
        lines = [f"💲 **Tarifario Oficial XignuX Gráfica ({len(tarifas)} materiales)**:"]
        for t in tarifas[:12]:
            bob_str = f" · Bobinas: {', '.join([str(b)+'m' for b in t['bobinasDisponibles']])}" if t['bobinasDisponibles'] else ""
            lines.append(f"• **{t['codigo']}** ({t['descripcion']}): **${t['precioUnitario']:,.2f}** /{t['tipoCobro']}{bob_str}")
        lines.append("\n🛠️ **Acabados de Confección**:")
        lines.append("• Dobladillo/Refuerzo: $1,200.00 /ml")
        lines.append("• Ojalillos metálicos: $350.00 c/u")
        lines.append("• Laminado UV: $4,500.00 /m²")
        return "\n".join(lines)

    return "✅ Operación completada."


def function_calling_node(state: XanaState) -> XanaState:
    """Intenta resolver con function calling en cascada de modelos; si no hay tool o falla, cae al router regex."""
    state['tool_called'] = False
    state['tool_name'] = ''
    msg = state.get('message', '')

    if not msg.strip():
        return state

    for model_name in MODELS_CASCADE:
        try:
            llm = _build_llm(temperature=0, model_name=model_name)
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
            break
        except Exception as e:
            print(f"[Xana Function Calling - {model_name}] {e}", file=sys.stderr)
            continue

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
        else:
            return 'general_chat'

    workflow.add_conditional_edges(
        "router",
        route_decision,
        {
            "diagnostics": "diagnostics",
            "db_health": "db_health",
            "orders": "orders",
            "general_chat": "general_chat"
        }
    )

    workflow.add_edge("diagnostics", END)
    workflow.add_edge("db_health", END)
    workflow.add_edge("orders", END)
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
    current_url: str = '/',
    history: Optional[List[Dict[str, str]]] = None
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
        'tool_name': '',
        'history': history or []
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
