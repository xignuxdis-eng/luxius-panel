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

def router_node(state: XanaState) -> XanaState:
    """Clasifica la intención del usuario y los datos adjuntos."""
    msg = state.get('message', '').lower()
    logs = state.get('client_logs', [])

    if logs or 'error' in msg or 'consola' in msg or 'falló' in msg or 'diagnost' in msg or 'bug' in msg:
        state['intent'] = 'diagnostics'
    elif 'salud' in msg or 'base de datos' in msg or 'db' in msg or 'neon' in msg or 'tabla' in msg:
        state['intent'] = 'db_health'
    elif 'orden' in msg or 'pedido' in msg or 'presupuesto' in msg or 'ot' in msg:
        state['intent'] = 'orders'
    elif 'precio' in msg or 'cotiz' in msg or 'lona' in msg or 'vinilo' in msg or 'cuanto cuesta' in msg:
        state['intent'] = 'pricing'
    else:
        state['intent'] = 'general_chat'

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
    """Nodo conversacional inteligente usando Google Gemini."""
    msg = state.get('message', '')
    username = state.get('username', 'Usuario')
    role = state.get('user_role', 'cliente')
    
    gemini_key = os.environ.get('GEMINI_API_KEY')
    
    if gemini_key:
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=gemini_key,
                temperature=0.3
            )
            
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
            print(f"[Xana LangGraph] Gemini error: {e}", file=sys.stderr)
            # Si falla Gemini, caemos a la lógica local inteligente
            pass

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
# CONSTRUCCIÓN DEL GRAFO LANGGRAPH
# ================================================================

def create_xana_workflow():
    workflow = StateGraph(XanaState)

    # Añadir Nodos
    workflow.add_node("router", router_node)
    workflow.add_node("diagnostics", diagnostics_node)
    workflow.add_node("db_health", db_health_node)
    workflow.add_node("orders", orders_node)
    workflow.add_node("general_chat", general_chat_node)

    # Punto de Entrada
    workflow.set_entry_point("router")

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
        'reply': ''
    }

    result = xana_app.invoke(initial_state)
    return {
        'reply': result.get('reply', ''),
        'intent': result.get('intent', ''),
        'diagnostics': result.get('diagnostics_data', {})
    }
