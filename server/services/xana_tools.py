"""
Herramientas deterministas de Xana (Function Calling) — Fase 1
Capa de tools tipadas sobre datos reales del backend (Presupuesto, Cliente, Vendedor, collection_materiales).
"""

from datetime import datetime, timezone, timedelta
from models import db, Presupuesto, Cliente, Vendedor, ConfigGlobal


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
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_resumen_taller_y_cola",
            "description": "Consulta el estado en vivo de la cola de impresión del taller, metros lineales a imprimir, desglose por ancho de bobina (1.37 vs 1.52), urgencias activas y órdenes ya impresas.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_metricas_facturacion",
            "description": "Consulta el monto total facturado, saldo cobrado, saldo pendiente, cantidad de órdenes completadas y ticket promedio en un período ('semana', 'mes', 'trimestre', 'anio', 'historico').",
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo": {
                        "type": "string",
                        "description": "Período temporal: 'semana', 'mes', 'trimestre', 'anio' o 'historico'"
                    }
                },
                "required": ["periodo"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_ranking_clientes",
            "description": "Obtiene el ranking de los clientes con mayor facturación o volumen de órdenes de trabajo en el sistema.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limite": {
                        "type": "integer",
                        "description": "Cantidad de clientes a mostrar en el top (por defecto 5)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_ordenes_avanzado",
            "description": "Búsqueda avanzada de órdenes de trabajo por cliente, código de orden, material o urgencia.",
            "parameters": {
                "type": "object",
                "properties": {
                    "criterio": {
                        "type": "string",
                        "description": "Texto a buscar: nombre de cliente, código de OT o material (ej. 'axis', '104', 'vinilo vehicular')"
                    },
                    "solo_urgentes": {
                        "type": "boolean",
                        "description": "Filtrar exclusivamente órdenes marcadas como urgentes o VIP"
                    }
                },
                "required": ["criterio"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_alertas_stock_critico",
            "description": "Consulta en tiempo real todos los materiales, sustratos y tintas que se encuentran en o por debajo del stock mínimo de seguridad.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_asesoramiento_grafico",
            "description": "Proporciona asesoramiento técnico profesional de la industria gráfica: resolución DPI según distancia de visualización (1:1 vs 1:10), modos de color CMYK vs RGB, negro enriquecido (Rich Black), sustratos recomendados (monomérico, polimérico, microperforado, lona frontlight/backlight/blackout/mesh), acabados (demasías de 5cm, bolsillos, ojalillos), panelizado y escalado por IA.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tema": {
                        "type": "string",
                        "description": "Tema gráfico: 'resolucion_dpi', 'color_cmyk_rgb', 'negro_enriquecido', 'vinilos', 'lonas', 'demasias_acabados', 'escalado_ia', 'distancia_visualizacion'"
                    }
                },
                "required": ["tema"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_tarifario_oficial",
            "description": "Consulta la lista oficial de precios unitarios por m² o metro lineal de todos los materiales e insumos habilitados en XignuX Gráfica.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
]

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


def tool_consultar_resumen_taller_y_cola():
    """Retorna el estado de la cola de producción en taller, metros lineales y urgencias."""
    try:
        from services.briefing_service import resolve_material_name, resolve_bobina_ancho
        ordenes = Presupuesto.query.filter(
            Presupuesto.deleted_at.is_(None),
            Presupuesto.estado.in_(['orden', 'ORDEN_DE_TRABAJO'])
        ).order_by(Presupuesto.created_at.asc()).all()

        total_impresas = Presupuesto.query.filter(
            Presupuesto.deleted_at.is_(None),
            Presupuesto.estado == 'impreso'
        ).count()

        total_ml = 0.0
        urgentes = []
        bobinas_ml = {}

        for o in ordenes:
            esp = o.especificaciones or {}
            ancho = esp.get('ancho') or esp.get('anchoReal') or 0
            alto = esp.get('alto') or esp.get('altoReal') or 0
            copias = esp.get('copias') or 1
            tags = esp.get('tags') or []

            try:
                ml = float(alto) * int(copias)
            except Exception:
                ml = 1.0

            total_ml += ml
            mat_raw = esp.get('material') or 'Material Estándar'
            mat_name = resolve_material_name(mat_raw)
            bobina_ancho = resolve_bobina_ancho(esp, float(ancho) if str(ancho).replace('.','',1).isdigit() else 1.0)
            mat_display = f"{mat_name} ({bobina_ancho})"

            bobinas_ml[mat_display] = round(bobinas_ml.get(mat_display, 0.0) + ml, 2)

            is_urg = any('URGENTE' in str(t).upper() or 'VIP' in str(t).upper() for t in tags)
            if is_urg:
                cl_name = o.cliente.nombre if o.cliente else 'Sin Cliente'
                urgentes.append({
                    'ot': f"OT-{str(o.id)[:8].upper()}",
                    'cliente': cl_name,
                    'material': mat_display,
                    'ml': round(ml, 2)
                })

        return {
            "ok": True,
            "pendientes_ots": len(ordenes),
            "metros_lineales_total": round(total_ml, 2),
            "urgencias_count": len(urgentes),
            "urgencias": urgentes[:5],
            "bobinas_ml": bobinas_ml,
            "ya_impresas_count": total_impresas
        }
    except Exception as e:
        return {"ok": False, "error": f"Error consultando cola de taller: {e}"}


def tool_consultar_metricas_facturacion(periodo='mes'):
    """Retorna totales facturados, órdenes completadas y ticket promedio."""
    try:
        p_clean = (periodo or 'mes').lower()
        dias = PERIODO_DIAS.get(p_clean, 30) if p_clean != 'historico' else None
        
        query = Presupuesto.query.filter(Presupuesto.deleted_at.is_(None))
        if dias:
            desde = datetime.now(timezone.utc) - timedelta(days=dias)
            query = query.filter(Presupuesto.created_at >= desde)

        ordenes = query.all()
        total = sum(float(o.total or 0) for o in ordenes)
        saldo_pendiente = sum(float(o.saldo_pendiente or 0) for o in ordenes)
        saldo_cobrado = total - saldo_pendiente
        ticket = (total / len(ordenes)) if ordenes else 0.0

        return {
            "ok": True,
            "periodo": p_clean,
            "dias": dias or "Todo el historial",
            "cantidad_ordenes": len(ordenes),
            "total_facturado": round(total, 2),
            "saldo_cobrado": round(saldo_cobrado, 2),
            "saldo_pendiente": round(saldo_pendiente, 2),
            "ticket_promedio": round(ticket, 2)
        }
    except Exception as e:
        return {"ok": False, "error": f"Error calculando métricas de facturación: {e}"}


def tool_consultar_ranking_clientes(limite=5):
    """Retorna el ranking de clientes por monto total facturado."""
    try:
        from sqlalchemy import func
        limit_val = max(1, min(int(limite or 5), 20))
        top_c = db.session.query(
            Cliente.id,
            Cliente.nombre,
            func.count(Presupuesto.id).label('cant'),
            func.sum(Presupuesto.total).label('total')
        ).join(Presupuesto, Presupuesto.cliente_id == Cliente.id)\
         .filter(Presupuesto.deleted_at.is_(None))\
         .group_by(Cliente.id, Cliente.nombre)\
         .order_by(func.sum(Presupuesto.total).desc())\
         .limit(limit_val).all()

        ranking = []
        for pos, (cid, cname, cant, tot) in enumerate(top_c, 1):
            ranking.append({
                "posicion": pos,
                "cliente_id": cid,
                "cliente": cname,
                "cantidad_ordenes": cant,
                "total_facturado": round(float(tot or 0), 2)
            })

        return {"ok": True, "ranking": ranking}
    except Exception as e:
        return {"ok": False, "error": f"Error obteniendo ranking de clientes: {e}"}


def tool_buscar_ordenes_avanzado(criterio, solo_urgentes=False):
    """Busca órdenes por texto parcial en cliente, OT o material."""
    try:
        q = (criterio or '').strip().lower()
        query = Presupuesto.query.filter(Presupuesto.deleted_at.is_(None))

        ordenes = query.order_by(Presupuesto.created_at.desc()).limit(80).all()
        resultados = []

        for o in ordenes:
            cname = o.cliente.nombre if o.cliente else 'Sin Cliente'
            ot_id = f"OT-{str(o.id)[:8].upper()}"
            esp = o.especificaciones or {}
            mat = str(esp.get('material') or '')
            tags = esp.get('tags') or []
            is_urg = any('URGENTE' in str(t).upper() or 'VIP' in str(t).upper() for t in tags)

            if solo_urgentes and not is_urg:
                continue

            match = False
            if not q:
                match = True
            elif q in ot_id.lower() or q in cname.lower() or q in mat.lower() or q in (o.descripcion or '').lower():
                match = True

            if match:
                resultados.append({
                    "ot": ot_id,
                    "cliente": cname,
                    "estado": o.estado or 'borrador',
                    "material": mat,
                    "total": float(o.total or 0),
                    "urgente": is_urg,
                    "fecha": o.created_at.strftime('%d/%m/%Y') if o.created_at else ''
                })
                if len(resultados) >= 8:
                    break

        return {"ok": True, "criterio": criterio, "resultados": resultados}
    except Exception as e:
        return {"ok": False, "error": f"Error buscando órdenes: {e}"}


def tool_consultar_alertas_stock_critico():
    """Consulta los materiales con stock actual menor o igual al mínimo."""
    try:
        materiales = _get_materiales()
        alertas = []
        for m in materiales:
            stock = float(m.get('stockActual') or 0)
            minimo = float(m.get('stockMinimo') or 10)
            if stock <= minimo:
                alertas.append({
                    "codigo": m.get('codigo', 'S/C'),
                    "descripcion": m.get('descripcion', 'Material'),
                    "tipo": m.get('tipo', 'Sustrato'),
                    "stockActual": stock,
                    "stockMinimo": minimo,
                    "unidad": m.get('unidad', 'm')
                })
        return {
            "ok": True,
            "total_alertas": len(alertas),
            "materiales": alertas
        }
    except Exception as e:
        return {"ok": False, "error": f"Error consultando alertas de stock: {e}"}


def tool_consultar_asesoramiento_grafico(tema):
    """Guía experta de preimpresión, resolución DPI, color CMYK, sustratos y acabados."""
    t = (tema or '').strip().lower()

    if any(k in t for k in ('resolucion', 'dpi', 'distancia', 'escala', 'pixel', 'medida')):
        return {
            "ok": True,
            "tema": "Resolución DPI y Distancia de Visualización en Gran Formato",
            "resumen": "La resolución óptima depende de la distancia del observador respecto al impreso.",
            "tabla_dpi": [
                {"distancia": "Distancia > 5 metros (vallas, cartelería de ruta)", "dpi_1_1": "35 a 72 DPI reales", "regla": "El ojo humano no percibe más de 50 DPI a esta distancia. 300 DPI aquí es innecesario y ralentiza el RIP."},
                {"distancia": "Distancia 2 a 5 metros (marquesinas, fondos de prensa, banners)", "dpi_1_1": "100 a 150 DPI reales", "regla": "Equilibrio ideal entre nitidez visual y fluidez de procesamiento."},
                {"distancia": "Distancia < 1 metro (gráfica vehicular, vidrieras, cuadros, POP)", "dpi_1_1": "150 a 300 DPI reales", "regla": "Exige alta definición porque los detalles se leen de cerca."},
                {"distancia": "Gráfica pequeña, etiquetas, calcos, folletería", "dpi_1_1": "300 DPI mínimo", "regla": "Estándar de imprenta digital."}
            ],
            "regla_escala_1_10": "Para carteles grandes (ej. 5x2m) diseñados a escala 1:10 (50x20cm), usar mínimo 300 DPI en el archivo para que al estirarse al 100% conserve 30 DPI reales.",
            "escalador_ia": "Para imágenes de clientes pixeladas (< 100 DPI), usar el 'Escalador IA' (Real-ESRGAN Vulkan) de LuXius en Xpress Studio para aumento 4x sin artefactos."
        }

    if any(k in t for k in ('color', 'cmyk', 'rgb', 'perfil', 'gamut', 'tinta', 'negro')):
        return {
            "ok": True,
            "tema": "Gestión de Color para Impresión Gran Formato",
            "resumen": "Impresión solvente y UV opera en cuatricromía CMYK.",
            "reglas_clave": [
                "Modo de Color: Enviar siempre en CMYK (FOGRA39 / US Web Coated SWOP). En RGB, los colores pantalla saturados (verdes flúor, cianes eléctricos) sufrirán apagado visual inevitable.",
                "Negro Enriquecido (Rich Black): Para fondos y plenos grandes usar C:40 M:30 Y:30 K:100 o C:50 M:40 Y:40 K:100. NUNCA usar K:100 solo en fondos porque saldrá grisáceo o lavado.",
                "Negro Puro (K:100 solo): Para textos pequeños menores a 24pt y líneas de corte usar K:100 puro sin CMY para evitar errores de registro en cabezal.",
                "Prevención Azul vs Violeta: Si el Magenta supera el 70% del Cyan (ej. C:100 M:90), en plotter saldrá violeta. Para un azul intenso real: C:100, M:60-70, Y:0, K:5-10."
            ]
        }

    if any(k in t for k in ('vinilo', 'lona', 'sustrato', 'material', 'polimerico', 'monomerico', 'frontlight', 'backlight', 'mesh')):
        return {
            "ok": True,
            "tema": "Guía de Sustratos, Vinilos y Lonas Gran Formato",
            "vinilos": [
                "Vinilo Monomérico (Corta Duración): Superficies planas y campañas de 6 a 12 meses. No apto para curvas prolongadas (se retrae con calor).",
                "Vinilo Polimérico (Larga Duración Exterior): 3 a 5 años de durabilidad exterior. Mayor estabilidad dimensional y resistencia UV.",
                "Vinilo Fundido (Cast / Car Wrapping): Deformable térmicamente para rotulación completa de vehículos con remaches y molduras profundas.",
                "Microperforado (One-Way Vision): Lunetas de vehículos y vidrieras comerciales (60/40 paso de luz).",
                "Esmerilado (Frosted): Privacidad en oficinas con paso de luz difusa."
            ],
            "lonas": [
                "Frontlight 13oz: Estándar para bastidores con iluminación frontal exterior.",
                "Backlight 15oz (Translúcida): Cajas de luz iluminadas desde atrás. Requiere doble golpe de tinta o perfil de alta densidad para no lavarse con luz LED.",
                "Blackout (Doble Faz): Lámina intermedia negra opaca para que no transparenten impresiones de ambos lados o banderas colgantes.",
                "Mesh (Microperforada con liner): Zonas de alto viento (fachadas, recitales); alivia la resistencia mecánica al viento."
            ]
        }

    if any(k in t for k in ('acabado', 'confeccion', 'demasia', 'bolsillo', 'ojal', 'panelizado')):
        return {
            "ok": True,
            "tema": "Acabados, Confección y Tolerancias de Taller",
            "detalles": [
                "Demasías Oficiales: 5 cm (50 mm) perimetrales por lado para doblado en bastidores de hierro con grapas o remaches.",
                "Ojalillos: Distribución óptima cada 30 cm a 50 cm en el perímetro tensado con precintos o cuerdas elásticas.",
                "Bolsillos / Vainas: Para caño superior o contrapeso inferior: Ancho de bolsillo = (Diámetro del caño x 3.14 / 2) + 2 cm de margen.",
                "Laminado UV: Altamente recomendado en vinilos vehiculares (protege contra sol, rayones y derrames de nafta) y pisos (antideslizante).",
                "Panelizado de Lonas: Superposición de 2.5 a 3.0 cm con soldadura por alta frecuencia o termosellado continuo."
            ]
        }

    return {
        "ok": True,
        "tema": "Recomendaciones Generales de Preimpresión Gran Formato",
        "resumen": "Envíe archivos a tamaño final 1:1 en 100-150 DPI o escala 1:10 en 300 DPI, en modo CMYK, tipografías convertidas a curvas y con 5cm de demasía perimetral para bastidores."
    }


def tool_consultar_tarifario_oficial():
    """Retorna la lista de precios oficiales por m² o ml de todos los materiales habilitados."""
    try:
        materiales = _get_materiales()
        tarifas = []
        for m in materiales:
            if not m.get('habilitado', True):
                continue
            precio = float(m.get('precio', 0) or m.get('precioM2', 0) or 0)
            tipo_cobro = m.get('tipoCobro', 'm2')
            bobinas = [b.get('ancho') for b in (m.get('bobinas') or []) if b.get('ancho')]
            tarifas.append({
                "codigo": m.get('codigo', 'S/C'),
                "descripcion": m.get('descripcion', 'Material'),
                "precioUnitario": precio,
                "tipoCobro": tipo_cobro,
                "bobinasDisponibles": bobinas
            })
        return {
            "ok": True,
            "total_materiales": len(tarifas),
            "tarifas": tarifas,
            "acabados_referencia": {
                "dobladillo_perimetral_ml": 1200.0,
                "ojalillos_unitario": 350.0,
                "laminado_uv_m2": 4500.0
            }
        }
    except Exception as e:
        return {"ok": False, "error": f"Error consultando tarifario: {e}"}


TOOL_EXECUTORS = {
    "obtener_estado_ot": tool_obtener_estado_ot,
    "consultar_stock_materiales": tool_consultar_stock_materiales,
    "obtener_metricas_ventas_cliente": tool_obtener_metricas_ventas_cliente,
    "crear_orden_trabajo": tool_crear_orden_trabajo,
    "cotizar_trabajo": tool_cotizar_trabajo,
    "consultar_especificacion_tecnica": tool_consultar_especificacion_tecnica,
    "consultar_resumen_taller_y_cola": tool_consultar_resumen_taller_y_cola,
    "consultar_metricas_facturacion": tool_consultar_metricas_facturacion,
    "consultar_ranking_clientes": tool_consultar_ranking_clientes,
    "buscar_ordenes_avanzado": tool_buscar_ordenes_avanzado,
    "consultar_alertas_stock_critico": tool_consultar_alertas_stock_critico,
    "consultar_asesoramiento_grafico": tool_consultar_asesoramiento_grafico,
    "consultar_tarifario_oficial": tool_consultar_tarifario_oficial
}


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
        if name in ('consultar_especificacion_tecnica', 'consultar_asesoramiento_grafico'):
            return fn(args.get('tema'))
        if name == 'consultar_metricas_facturacion':
            return fn(args.get('periodo') or 'mes')
        if name == 'consultar_ranking_clientes':
            return fn(args.get('limite') or 5)
        if name == 'buscar_ordenes_avanzado':
            return fn(args.get('criterio') or '', args.get('solo_urgentes') or False)
        if name in ('consultar_resumen_taller_y_cola', 'consultar_alertas_stock_critico', 'consultar_tarifario_oficial'):
            return fn()
    except Exception as e:
        return {"ok": False, "error": str(e)}
