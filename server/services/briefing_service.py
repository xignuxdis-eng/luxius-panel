"""
Servicio de Briefing Matutino y Reporte Diario de Producción — LuXius & Xana
Genera el informe ejecutivo diario de taller analizando la base de datos Neon PostgreSQL:
- Total de órdenes activas PENDIENTES de impresión (excluye ya impresas)
- Desglose de demanda normalizada por material y ancho de bobina (sin 'Estándar' ambiguo)
- Entregas programadas para el día de hoy
- OTs urgentes y prioritarias (VIP)
- Alertas de insumos críticos
- Recomendación de secuencia óptima de producción de Xana
"""

import os
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from models import db, Presupuesto, Cliente, ConfigGlobal

AR_TZ = timezone(timedelta(hours=-3))

# Mapeo canónico de siglas y nombres crudos a nombres formales de taller
MATERIAL_DISPLAY_NAMES = {
    'vv': 'Vinilo Vehicular',
    'vinilo vehicular': 'Vinilo Vehicular',
    'vinilo orajet 3651': 'Vinilo Vehicular',
    'fl': 'Lona Frontlight',
    'lona front': 'Lona Frontlight',
    'lona front light 13oz': 'Lona Frontlight',
    'lona_front_light_13oz': 'Lona Frontlight',
    'vbb': 'Vinilo Base Blanca',
    'vinilo base blanca': 'Vinilo Base Blanca',
    'vinilo base blanca brillante': 'Vinilo Base Blanca',
    'bl': 'Lona Backlight',
    'lona backlight': 'Lona Backlight',
    'lona back light 15oz': 'Lona Backlight',
    'lona_back_light_15oz': 'Lona Backlight',
    'vm': 'Microperforado',
    'vinilo microperforado': 'Microperforado',
    'vinilo_microperforado': 'Microperforado',
    'vbt': 'Vinilo Transparente',
    'vinilo transparente': 'Vinilo Transparente'
}


def resolve_material_name(raw_mat: str) -> str:
    """Devuelve el nombre normalizado del material."""
    if not raw_mat:
        return 'Sustrato General'
    clean = str(raw_mat).strip().lower()
    return MATERIAL_DISPLAY_NAMES.get(clean, str(raw_mat).strip())


def resolve_bobina_ancho(esp: dict, mat_code: str) -> str:
    """Determina con precisión el ancho de bobina asignado o necesario (1.37m, 1.52m, etc)."""
    # 1. Asignada explícita en especificaciones
    bob = esp.get('bobinaAsignada')
    if bob and str(bob).strip().lower() not in ('none', 'null', '', 'estándar', 'estandar'):
        try:
            val = float(str(bob).replace('m', '').strip())
            return f"{val:.2f}m"
        except Exception:
            return str(bob).strip()

    # 2. Consultar precioDetalle
    det = esp.get('precioDetalle')
    if isinstance(det, dict) and det.get('bobinaAncho'):
        try:
            return f"{float(det['bobinaAncho']):.2f}m"
        except Exception:
            pass

    # 3. Deducción técnica por dimensiones del trabajo
    w = float(esp.get('ancho') or 0.0)
    h = float(esp.get('alto') or 0.0)
    min_dim = min(w, h) if (w > 0 and h > 0) else max(w, h)

    clean_mat = str(mat_code).strip().lower()
    if clean_mat in ('vv', 'vinilo vehicular', 'vinilo orajet 3651'):
        if min_dim > 1.35:
            return "1.52m"
        return "1.37m"
    elif 'front' in clean_mat or clean_mat in ('fl', 'lona front'):
        if min_dim > 1.50:
            return "3.20m"
        return "1.60m"

    if min_dim > 0:
        return f"{min_dim:.2f}m"
    return "1.37m"


def generate_daily_briefing(format_type: str = 'markdown') -> Dict[str, Any]:
    """Genera el informe matutino analizando estrictamente las órdenes pendientes de impresión."""
    now_ar = datetime.now(AR_TZ)
    today_date = now_ar.date()
    fecha_str = now_ar.strftime("%d/%m/%Y")
    hora_str = now_ar.strftime("%H:%M")

    # 1. Órdenes vivas PENDIENTES de impresión en taller (excluye ya impresas)
    pendientes = Presupuesto.query.filter(
        Presupuesto.deleted_at.is_(None),
        Presupuesto.estado.in_(['orden', 'ORDEN_DE_TRABAJO'])
    ).order_by(Presupuesto.created_at.asc()).all()

    # Total histórico/reciente de impresas para dar visibilidad
    total_impresas = Presupuesto.query.filter(
        Presupuesto.deleted_at.is_(None),
        Presupuesto.estado.in_(['impreso', 'IMPRESO'])
    ).count()

    total_orders = len(pendientes)
    total_ml = 0.0
    material_demands = {}
    urgentes = []
    entregas_hoy = []

    for p in pendientes:
        esp = p.especificaciones or {}
        tags = [str(t).lower() for t in (esp.get('tags') or [])]
        is_urg = any('urgente' in t or 'vip' in t for t in tags)

        # Consumo en metros lineales
        ml = float(esp.get('consumoEstimado') or 0.0)
        if ml <= 0:
            alto = float(esp.get('alto') or 0.0)
            copias = int(esp.get('copias') or 1)
            ml = alto * copias
        total_ml += ml

        raw_mat = esp.get('material')
        mat_name = resolve_material_name(raw_mat)
        bob_ancho = resolve_bobina_ancho(esp, raw_mat)
        mat_key = f"{mat_name} ({bob_ancho})"

        if mat_key not in material_demands:
            material_demands[mat_key] = {'ml': 0.0, 'count': 0, 'material': mat_name, 'bobina': bob_ancho}
        material_demands[mat_key]['ml'] += ml
        material_demands[mat_key]['count'] += 1

        ot_code = f"OT-{str(p.id)[:8].upper()}"
        cname = p.cliente.nombre if p.cliente else 'Cliente'

        order_summary = {
            'id': p.id,
            'ot': ot_code,
            'cliente': cname,
            'material': mat_key,
            'ml': round(ml, 2),
            'estado': p.estado
        }

        if is_urg:
            urgentes.append(order_summary)

        if p.fecha_entrega_estimada and p.fecha_entrega_estimada == today_date:
            entregas_hoy.append(order_summary)

    # 2. Materiales en stock crítico
    stock_alertas = []
    try:
        row_mat = ConfigGlobal.query.filter_by(clave='collection_materiales').first()
        materiales = row_mat.valor if (row_mat and isinstance(row_mat.valor, list)) else []
        for m in materiales:
            stock = float(m.get('stockActual') or 0)
            minimo = float(m.get('stockMinimo') or 10)
            if stock <= minimo:
                stock_alertas.append({
                    'codigo': m.get('codigo', 'S/C'),
                    'desc': m.get('descripcion', m.get('nombre', 'Material')),
                    'stock': stock,
                    'minimo': minimo,
                    'unidad': m.get('unidad', 'm')
                })
    except Exception as e:
        print(f"[Briefing] Error consultando stock: {e}")

    # 3. Recomendación táctica estructurada de Xana
    top_demands = sorted(material_demands.items(), key=lambda x: x[1]['ml'], reverse=True)
    if top_demands:
        lider_mat = top_demands[0][0]
        lider_ml = top_demands[0][1]['ml']
        lider_count = top_demands[0][1]['count']

        recs = [
            f"1. Montar bobina *{lider_mat}* para procesar una tanda consolidada de {lider_ml:.1f} ml ({lider_count} OTs)."
        ]
        if len(top_demands) > 1:
            segundo_mat = top_demands[1][0]
            segundo_ml = top_demands[1][1]['ml']
            segundo_count = top_demands[1][1]['count']
            recs.append(
                f"2. Luego cambiar a *{segundo_mat}* para completar las {segundo_count} OTs restantes ({segundo_ml:.1f} ml)."
            )

        if urgentes:
            urg_ots = ", ".join([u['ot'] for u in urgentes[:3]])
            recomendacion = f"⚠️ *ATENCIÓN:* Despachar primero {len(urgentes)} OT(s) de urgencia ({urg_ots}) antes de la tanda.\n" + "\n".join(recs)
        else:
            recomendacion = "\n".join(recs)
    else:
        recomendacion = "✨ Taller al día: no hay órdenes pendientes de impresión en cola."

    # 4. Formateo a Markdown para Telegram
    md_lines = [
        f"☀️ *BRIEFING MATUTINO DE PRODUCCIÓN — {fecha_str}*",
        f"_Generado a las {hora_str} ART por Xana Intelligence_\n",
        "📊 *Panorama General de Taller:*",
        f"• *Órdenes Pendientes:* {total_orders} OTs para imprimir",
        f"• *Metraje en Cola:* {total_ml:.2f} metros lineales",
        f"• *🚨 OTs Urgentes / VIP:* {len(urgentes)} trabajo(s)",
        f"• *🚚 Entregas para Hoy:* {len(entregas_hoy)} orden(es)",
        f"• *✅ Ya Impresas:* {total_impresas} OTs terminadas en taller\n"
    ]

    if urgentes:
        md_lines.append("🔥 *URGENCIAS PRIORITARIAS:*")
        for u in urgentes[:4]:
            md_lines.append(f"• 🚨 *{u['ot']}* | {u['cliente']} — {u['material']} ({u['ml']} ml)")
        md_lines.append("")

    if entregas_hoy:
        md_lines.append("📅 *COMPROMISOS DE ENTREGA PARA HOY:*")
        for e in entregas_hoy[:4]:
            md_lines.append(f"• 📦 *{e['ot']}* — {e['cliente']} ({e['material']})")
        md_lines.append("")

    if top_demands:
        md_lines.append("🧵 *Demanda por Bobina / Material:*")
        for k, v in top_demands:
            md_lines.append(f"• *{k}*: {v['ml']:.1f} ml ({v['count']} OTs)")
        md_lines.append("")

    if stock_alertas:
        md_lines.append(f"⚠️ *Atención Insumos ({len(stock_alertas)} bajo mínimo):*")
        for a in stock_alertas[:3]:
            md_lines.append(f"• 🔴 *{a['codigo']}*: {a['stock']} {a['unidad']} (Mín: {a['minimo']})")
        md_lines.append("")

    md_lines.append(f"💡 *Plan de Secuencia Óptima de Xana:*\n{recomendacion}")

    full_markdown = "\n".join(md_lines)

    return {
        'ok': True,
        'date': fecha_str,
        'time': hora_str,
        'total_orders': total_orders,
        'total_ml': round(total_ml, 2),
        'urgent_count': len(urgentes),
        'deliveries_today_count': len(entregas_hoy),
        'already_printed_count': total_impresas,
        'urgentes': urgentes,
        'entregas_hoy': entregas_hoy,
        'material_demands': [
            {'label': k, 'ml': round(v['ml'], 2), 'count': v['count']}
            for k, v in top_demands
        ],
        'stock_alerts': stock_alertas,
        'recommendation': recomendacion,
        'markdown': full_markdown
    }
