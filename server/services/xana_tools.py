"""
Herramientas deterministas de Xana (Function Calling) — Fase 1 + Fase 2 + Fase 3
Capa de tools tipadas sobre datos reales del backend (Presupuesto, Cliente, Vendedor, collection_materiales).
Incluye Knowledge Tools para KB estructurada y RAG, y Analytics Tools para métricas seguras.
"""

from datetime import datetime, timezone, timedelta
from models import db, Presupuesto, Cliente, Vendedor, ConfigGlobal
from services.xana_knowledge import (
    KNOWLEDGE_TOOLS,
    KNOWLEDGE_TOOL_EXECUTORS,
    format_knowledge_tool_result,
    sync_materials_to_kb
)
from services.xana_analytics import (
    ANALYTICS_TOOLS,
    ANALYTICS_TOOL_EXECUTORS,
    format_analytics_tool_result
)


# ================================================================
# ESQUEMAS DE TOOLS (para function calling del LLM)
# ================================================================

XANA_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "obtener_estado_ot",
            "description": "Consulta el estado actual y el detalle de una orden de trabajo por su número de OT o id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ot_id": {"type": "string", "description": "Número de OT (ej. OT-ABC12345) o id de la orden"}
                },
                "required": ["ot_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_stock_materiales",
            "description": "Consulta el stock disponible de materiales por tipo, código o descripción.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tipo": {"type": "string", "description": "Tipo de material ('Sustrato', 'tinta', 'solvente', 'plancha') o código (ej. VV, LONA) o descripción parcial"}
                },
                "required": ["tipo"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_metricas_ventas_cliente",
            "description": "Obtiene el monto facturado y la cantidad de órdenes de un cliente en un período.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cliente_id": {"type": "integer", "description": "ID del cliente"},
                    "periodo": {"type": "string", "description": "Período: 'semana', 'mes', 'trimestre', 'anio'"}
                },
                "required": ["cliente_id", "periodo"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "crear_orden_trabajo",
            "description": "Crea un borrador de orden de trabajo con los datos proporcionados.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cliente": {"type": "string", "description": "Nombre del cliente"},
                    "material": {"type": "string", "description": "Código del material (ej. VV, LONA, MICRO)"},
                    "ancho": {"type": "number", "description": "Ancho en metros"},
                    "alto": {"type": "number", "description": "Alto en metros"},
                    "copias": {"type": "integer", "description": "Cantidad de copias"},
                    "observaciones": {"type": "string", "description": "Observaciones adicionales"}
                },
                "required": ["cliente", "material", "ancho", "alto"]
            }
        }
    }
] + KNOWLEDGE_TOOLS + ANALYTICS_TOOLS

PERIODO_DIAS = {
    'semana': 7,
    'mes': 30,
    'trimestre': 90,
    'anio': 365
}


# ================================================================
# HELPERS
# ================================================================

def _get_materiales():
    try:
        row = ConfigGlobal.query.filter_by(clave='collection_materiales').first()
        if row and isinstance(row.valor, list):
            return row.valor
    except Exception as e:
        print(f"[Xana Tools] Error leyendo materiales: {e}")
    return []


def _match_ot(ot_id):
    raw = (ot_id or '').strip()
    if not raw:
        return None
    exact = Presupuesto.query.filter_by(id=raw).first()
    if exact:
        return exact
    prefijo = raw.upper().replace('OT-', '').replace('OT', '').strip()
    if not prefijo:
        return None
    return Presupuesto.query.filter(
        Presupuesto.id.ilike(f"{prefijo}%"),
        Presupuesto.deleted_at.is_(None)
    ).first()


# ================================================================
# EJECUTORES DETERMINISTAS
# ================================================================

def tool_obtener_estado_ot(ot_id):
    p = _match_ot(ot_id)
    if not p:
        return {"ok": False, "error": f"No se encontró la orden {ot_id}."}
    cname = p.cliente.nombre if p.cliente else 'Cliente General'
    return {
        "ok": True,
        "ot": f"OT-{str(p.id)[:8].upper()}",
        "estado": p.estado or 'borrador',
        "cliente": cname,
        "descripcion": p.descripcion or '',
        "total": float(p.total or 0),
        "saldo_pendiente": float(p.saldo_pendiente or 0),
        "created_at": p.created_at.isoformat() if p.created_at else None
    }


def tool_consultar_stock_materiales(tipo):
    q = (tipo or '').strip().lower()
    materiales = _get_materiales()
    if not materiales:
        return {"ok": True, "materiales": [], "nota": "No hay materiales registrados."}

    def coincide(m):
        codigo = str(m.get('codigo') or '').lower()
        desc = str(m.get('descripcion') or '').lower()
        t = str(m.get('tipo') or '').lower()
        return q in codigo or q in desc or q in t

    matches = [m for m in materiales if coincide(m)]
    if not matches:
        return {"ok": True, "materiales": [], "nota": f"No se encontraron materiales que coincidan con '{tipo}'."}

    resumen = []
    for m in matches:
        resumen.append({
            "codigo": m.get('codigo'),
            "descripcion": m.get('descripcion'),
            "tipo": m.get('tipo'),
            "tipoCobro": m.get('tipoCobro'),
            "stockActual": m.get('stockActual', 0),
            "stockMinimo": m.get('stockMinimo', 10),
            "unidad": m.get('unidad'),
            "botellasCerradas": m.get('botellasCerradas', 0),
            "botellasMl": m.get('botellasMl', 0),
            "bobinas": m.get('bobinas', [])
        })
    return {"ok": True, "materiales": resumen}


def tool_obtener_metricas_ventas_cliente(cliente_id, periodo):
    dias = PERIODO_DIAS.get((periodo or 'mes').lower(), 30)
    desde = datetime.now(timezone.utc) - timedelta(days=dias)
    query = Presupuesto.query.filter(
        Presupuesto.deleted_at.is_(None),
        Presupuesto.created_at >= desde
    )
    if cliente_id:
        query = query.filter(Presupuesto.cliente_id == cliente_id)
    ordenes = query.all()

    total = sum(float(o.total or 0) for o in ordenes)
    cliente_nombre = None
    if cliente_id:
        c = db.session.get(Cliente, int(cliente_id))
        cliente_nombre = c.nombre if c else None

    return {
        "ok": True,
        "cliente_id": cliente_id,
        "cliente": cliente_nombre,
        "periodo": periodo or 'mes',
        "dias": dias,
        "cantidad_ordenes": len(ordenes),
        "total_facturado": round(total, 2)
    }


def tool_crear_orden_trabajo(datos):
    cliente_nombre = (datos.get('cliente') or '').strip()
    material = (datos.get('material') or 'VV').upper()
    ancho = float(datos.get('ancho') or 0)
    alto = float(datos.get('alto') or 0)
    copias = int(datos.get('copias') or 1)
    observaciones = datos.get('observaciones') or ''

    if ancho <= 0 or alto <= 0:
        return {"ok": False, "error": "Las dimensiones deben ser mayores a cero."}

    cliente = None
    if cliente_nombre:
        cliente = Cliente.query.filter(Cliente.nombre.ilike(f"%{cliente_nombre}%")).first()
    if not cliente:
        return {"ok": False, "error": f"No se encontró el cliente '{cliente_nombre}'. Indique un cliente existente."}

    vendedor = Vendedor.query.first()
    if not vendedor:
        return {"ok": False, "error": "No hay vendedores configurados en el sistema."}

    nueva = Presupuesto(
        vendedor_id=vendedor.id,
        cliente_id=cliente.id,
        descripcion=f"Orden {cliente.nombre} - {material} {ancho}x{alto}m",
        estado='borrador',
        notas=observaciones,
        especificaciones={
            "material": material,
            "copias": copias,
            "ancho": ancho,
            "alto": alto
        }
    )
    db.session.add(nueva)
    db.session.commit()

    return {
        "ok": True,
        "id": str(nueva.id),
        "ot": f"OT-{str(nueva.id)[:8].upper()}",
        "estado": nueva.estado,
        "mensaje": f"Borrador de orden creado para {cliente.nombre}."
    }


TOOL_EXECUTORS = {
    "obtener_estado_ot": tool_obtener_estado_ot,
    "consultar_stock_materiales": tool_consultar_stock_materiales,
    "obtener_metricas_ventas_cliente": tool_obtener_metricas_ventas_cliente,
    "crear_orden_trabajo": tool_crear_orden_trabajo
} | KNOWLEDGE_TOOL_EXECUTORS | ANALYTICS_TOOL_EXECUTORS


def execute_xana_tool(name, args):
    """Despacha una llamada de tool y devuelve el resultado como dict."""
    fn = TOOL_EXECUTORS.get(name)
    if not fn:
        return {"ok": False, "error": f"Herramienta desconocida: {name}"}
    try:
        if name == 'obtener_estado_ot':
            return fn(args.get('ot_id'))
        if name == 'consultar_stock_materiales':
            return fn(args.get('tipo'))
        if name == 'obtener_metricas_ventas_cliente':
            return fn(args.get('cliente_id'), args.get('periodo'))
        if name == 'crear_orden_trabajo':
            return fn(args)
        # Knowledge y Analytics tools usan **args directamente
        return fn(**args)
    except Exception as e:
        return {"ok": False, "error": str(e)}
