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
    },
    {
        "type": "function",
        "function": {
            "name": "cotizar_trabajo",
            "description": "Calcula el costo y cotización exacta de un trabajo de impresión evaluando tarifas oficiales, medidas, optimización de bobina y acabados.",
            "parameters": {
                "type": "object",
                "properties": {
                    "material": {"type": "string", "description": "Código o nombre del material (ej. 'vinilo vehicular', 'VV', 'lona front', 'microperforado')"},
                    "ancho": {"type": "number", "description": "Ancho en metros"},
                    "alto": {"type": "number", "description": "Alto en metros"},
                    "copias": {"type": "integer", "description": "Cantidad de copias (por defecto 1)"},
                    "bobina": {"type": "number", "description": "Ancho de bobina específico si se desea forzar (ej. 1.37, 1.52)"},
                    "dobladillo": {"type": "boolean", "description": "Incluye acabado de dobladillo / refuerzo"},
                    "ojalillos": {"type": "boolean", "description": "Incluye ojalillos metálicos perimetrales"},
                    "laminado": {"type": "boolean", "description": "Incluye laminado de protección UV"}
                },
                "required": ["material", "ancho", "alto"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_especificacion_tecnica",
            "description": "Consulta especificaciones técnicas verificadas y tolerancias oficiales del taller (ancho de plotter, demasías, durabilidad de vinilo, consumo de tinta, banding, preparación de archivos).",
            "parameters": {
                "type": "object",
                "properties": {
                    "tema": {"type": "string", "description": "Tema técnico o pregunta (ej. 'ancho_plotter', 'demasias', 'durabilidad_vinilo', 'consumo_tinta', 'banding', 'preparacion_archivos')"}
                },
                "required": ["tema"]
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
    cliente_str = str(cliente_id or '').strip()
    c = None

    if cliente_str.isdigit():
        c = db.session.get(Cliente, int(cliente_str))
    elif cliente_str:
        c = Cliente.query.filter(Cliente.nombre.ilike(f"%{cliente_str}%")).first()

    if cliente_str and not c:
        return {
            "ok": False,
            "error": f"El cliente '{cliente_str}' no existe en el sistema LuXius."
        }

    cid = c.id if c else None
    cname = c.nombre if c else "Cliente General"

    dias = PERIODO_DIAS.get((periodo or 'mes').lower(), 30)
    desde = datetime.now(timezone.utc) - timedelta(days=dias)
    query = Presupuesto.query.filter(
        Presupuesto.deleted_at.is_(None),
        Presupuesto.created_at >= desde
    )
    if cid:
        query = query.filter(Presupuesto.cliente_id == cid)
    ordenes = query.all()

    total = sum(float(o.total or 0) for o in ordenes)

    return {
        "ok": True,
        "cliente_id": cid,
        "cliente": cname,
        "periodo": periodo or 'mes',
        "dias": dias,
        "cantidad_ordenes": len(ordenes),
        "total_facturado": round(total, 2)
    }


def tool_cotizar_trabajo(datos):
    """Calcula la cotización determinista usando tarifario oficial y optimización de bobina."""
    material = datos.get('material') or ''
    mat_code = material.strip().lower()
    materiales = _get_materiales()
    target_mat = None
    for m in materiales:
        cod = str(m.get('codigo') or '').lower()
        desc = str(m.get('descripcion') or '').lower()
        if mat_code == cod or mat_code in desc:
            target_mat = m
            break

    if not target_mat:
        return {"ok": False, "error": f"Material '{material}' no registrado en el sistema. Imposible cotizar."}

    if not target_mat.get('habilitado', True):
        return {"ok": False, "error": f"El material '{target_mat.get('descripcion')}' está deshabilitado para cotización."}

    ancho = float(datos.get('ancho') or 0)
    alto = float(datos.get('alto') or 0)
    copias = int(datos.get('copias') or 1)
    bobina = datos.get('bobina')
    dobladillo = bool(datos.get('dobladillo'))
    ojalillos = bool(datos.get('ojalillos'))
    laminado = bool(datos.get('laminado'))

    if ancho <= 0 or alto <= 0:
        return {"ok": False, "error": "Las dimensiones deben ser mayores a cero."}

    precio_m2 = float(target_mat.get('precio', 0) or target_mat.get('precioM2', 0) or 15000)
    tipo_cobro = target_mat.get('tipoCobro', 'm2')
    bobinas = target_mat.get('bobinas', [])

    bobinas_anchos = [float(b.get('ancho', 0)) for b in bobinas if float(b.get('ancho', 0)) > 0] if bobinas else [1.0, 1.37, 1.52, 1.60, 3.20]
    bobinas_anchos.sort()

    if bobina:
        bobina_usada = float(bobina)
    else:
        candidatos = [b for b in bobinas_anchos if b >= (ancho + 0.01)]
        bobina_usada = candidatos[0] if candidatos else (bobinas_anchos[-1] if bobinas_anchos else 1.52)

    ml_normal = alto * copias
    descarte_ml = max(0.0, bobina_usada - ancho)

    area_m2 = round(ancho * alto * copias, 2)
    if tipo_cobro == 'ml':
        precio_base = ml_normal * precio_m2
    else:
        precio_base = area_m2 * precio_m2

    costo_acabados = 0.0
    detalles_acabados = []
    if dobladillo:
        costo_dob = round((ancho + alto) * 2 * copias * 1200, 2)
        costo_acabados += costo_dob
        detalles_acabados.append(f"Dobladillo: ${costo_dob:,.2f}")
    if ojalillos:
        costo_ojal = round(copias * 8 * 350, 2)
        costo_acabados += costo_ojal
        detalles_acabados.append(f"Ojalillos: ${costo_ojal:,.2f}")
    if laminado:
        costo_lam = round(area_m2 * 4500, 2)
        costo_acabados += costo_lam
        detalles_acabados.append(f"Laminado UV: ${costo_lam:,.2f}")

    total = round(precio_base + costo_acabados, 2)

    return {
        "ok": True,
        "material": target_mat.get('descripcion') or target_mat.get('codigo'),
        "codigo": target_mat.get('codigo'),
        "dimensiones": f"{ancho:.2f} x {alto:.2f} m",
        "copias": copias,
        "area_m2": area_m2,
        "bobina_ancho": bobina_usada,
        "descarte_estimado_m": round(descarte_ml, 2),
        "tarifa_unitaria_m2": precio_m2,
        "subtotal_impresion": round(precio_base, 2),
        "acabados": detalles_acabados,
        "total_estimado": total,
        "fuente": "Motor Determinista de Precios LuXius"
    }


def tool_consultar_especificacion_tecnica(tema):
    """Consulta la ficha técnica oficial de la imprenta para responder preguntas técnicas con fuentes verificadas."""
    t = (tema or '').strip().lower()

    if 'plotter' in t or 'ancho' in t or 'maximo' in t or '5' in t:
        return {
            "ok": True,
            "tema": "Ancho máximo del plotter",
            "valor": "3.20 metros",
            "especificacion": "El ancho máximo físico de impresión continuo en plotters solventes de gran formato de XignuX es de 3.20 metros. Dimensiones mayores a 3.20m requieren panelizado técnico con solape perimetral de 2.5 a 3.0 cm para termosellado. El plotter no soporta 5 metros de ancho en un solo paño continuo.",
            "fuente": "Manual de Maquinaria y Producción Gran Formato XignuX"
        }
    if 'demasia' in t or 'refil' in t or 'sangre' in t:
        return {
            "ok": True,
            "tema": "Demasías y tolerancias de refile",
            "valor": "5 cm (0.05 m) perimetrales",
            "especificacion": "Para refilar lona o vinilo con dobladillo de refuerzo, se debe dejar una demasía perimetral de 5 cm por lado (50 mm). En vinilos de corte o cartelería rígida, la demasía mínima de refile es de 3 a 5 mm.",
            "fuente": "Norma Técnica de Taller XignuX - Sección 3.2 (Demasías)"
        }
    if 'durabilidad' in t or 'polimerico' in t or 'monomerico' in t:
        return {
            "ok": True,
            "tema": "Durabilidad exterior de vinilos",
            "valor": "Polimérico: 36 a 60 meses (3 a 5 años) / Monomérico: 12 a 24 meses",
            "especificacion": "El vinilo polimérico calandrado tiene una durabilidad certificada en exteriores de 3 a 5 años (36 a 60 meses). El vinilo monomérico está diseñado para aplicaciones promocionales de 1 a 2 años.",
            "fuente": "Ficha Técnica de Proveedores (Oracal / Arlon / Avery)"
        }
    if 'tinta' in t or 'consumo' in t:
        return {
            "ok": True,
            "tema": "Consumo de tinta solvente",
            "valor": "8 a 15 ml por m²",
            "especificacion": "El consumo nominal varía entre 8 y 15 ml de tinta por m² dependiendo del perfil de color, resolución (720 vs 1440 DPI) y cobertura porcentual de la gráfica.",
            "fuente": "Ficha Técnica de Cabezales Epson i3200 / DX5 Solvent"
        }
    if 'preparar' in t or 'archivo' in t or 'resolucion' in t or 'dpi' in t:
        return {
            "ok": True,
            "tema": "Preparación de archivos para gran formato",
            "valor": "Escala 1:1 a 150 DPI (o 1:10 a 300 DPI) en CMYK",
            "especificacion": "Archivos a escala real 1:1 deben enviarse a 100-150 DPI. Si se diseñan a escala 1:10, la resolución debe ser de 300 DPI. Espacio de color CMYK estricto (no RGB), fuentes tipográficas convertidas a curvas y formato TIFF, PDF/X-1a o EPS.",
            "fuente": "Guía de Preimpresión y Visor XpressViewer LuXius"
        }
    if 'banding' in t or 'rayas' in t:
        return {
            "ok": True,
            "tema": "Resolución de banding en impresión",
            "valor": "Test de inyectores, calibración Feed/Step y temperatura de secado",
            "especificacion": "Protocolo de corrección de banding: 1. Imprimir test de inyectores (nozzle check) y aplicar limpieza/purga de cabezal; 2. Ejecutar calibración de avance (Feed Calibration / Media Step); 3. Verificar que la temperatura de pre-calentador y secador esté en el rango óptimo (40-45°C).",
            "fuente": "Manual de Operación y Mantenimiento de Taller XignuX"
        }

    return {
        "ok": False,
        "error": f"No se encontró una especificación técnica documentada para '{tema}'."
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
    "crear_orden_trabajo": tool_crear_orden_trabajo,
    "cotizar_trabajo": tool_cotizar_trabajo,
    "consultar_especificacion_tecnica": tool_consultar_especificacion_tecnica
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
            return fn(args.get('cliente_id') or args.get('cliente'), args.get('periodo'))
        if name in ('crear_orden_trabajo', 'cotizar_trabajo'):
            return fn(args)
        if name == 'consultar_especificacion_tecnica':
            return fn(args.get('tema'))
        # Knowledge y Analytics tools usan **args directamente
        return fn(**args)
    except Exception as e:
        return {"ok": False, "error": str(e)}
    except Exception as e:
        return {"ok": False, "error": str(e)}
