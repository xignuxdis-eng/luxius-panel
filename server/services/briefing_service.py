"""
Servicio de Briefing Matutino y Reporte Diario de Producción — LuXius & Xana
Genera el informe ejecutivo diario de taller analizando la base de datos Neon PostgreSQL:
- Total de órdenes activas y metros lineales en cola
- Desglose de demanda por material y bobina asignada
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


def generate_daily_briefing(format_type: str = 'markdown') -> Dict[str, Any]:
    """Genera el informe matutino analizando el estado actual del taller."""
    now_ar = datetime.now(AR_TZ)
    today_date = now_ar.date()
    fecha_str = now_ar.strftime("%d/%m/%Y")
    hora_str = now_ar.strftime("%H:%M")

    # 1. Órdenes vivas en taller
    activas = Presupuesto.query.filter(
        Presupuesto.deleted_at.is_(None),
        Presupuesto.estado.in_(['orden', 'ORDEN_DE_TRABAJO', 'impreso', 'post', 'borrador'])
    ).order_by(Presupuesto.created_at.asc()).all()

    total_orders = len(activas)
    total_ml = 0.0
    material_demands = {}
    urgentes = []
    entregas_hoy = []

    for p in activas:
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

        mat = esp.get('material') or 'Sustrato'
        bob = esp.get('bobinaAsignada') or 'Estándar'
        mat_key = f"{mat} ({bob})"

        if mat_key not in material_demands:
            material_demands[mat_key] = {'ml': 0.0, 'count': 0, 'material': mat, 'bobina': bob}
        material_demands[mat_key]['ml'] += ml
        material_demands[mat_key]['count'] += 1

        ot_code = f"OT-{str(p.id)[:8].upper()}"
        cname = p.cliente.nombre if p.cliente else 'Cliente'

        order_summary = {
            'id': p.id,
            'ot': ot_code,
            'cliente': cname,
            'material': mat,
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
                    'desc': m.get('descripcion', 'Material'),
                    'stock': stock,
                    'minimo': minimo,
                    'unidad': m.get('unidad', 'm')
                })
    except Exception as e:
        print(f"[Briefing] Error consultando stock: {e}")

    # 3. Recomendación táctica de Xana
    top_demands = sorted(material_demands.items(), key=lambda x: x[1]['ml'], reverse=True)
    if top_demands:
        lider_mat = top_demands[0][0]
        lider_ml = top_demands[0][1]['ml']
        recomendacion = (
            f"Montar primero la bobina de *{lider_mat}* para procesar una tanda consolidada "
            f"de {lider_ml:.1f} ml continuos y minimizar los cambios de rollo en máquina."
        )
        if urgentes:
            recomendacion = f"Priorizar inmediatamente las {len(urgentes)} OT(s) de urgencia antes de la tanda continua. " + recomendacion
    else:
        recomendacion = "No hay carga de trabajo pendiente en taller para el día de hoy."

    # 4. Formateo a Markdown
    md_lines = [
        f"☀️ *BRIEFING MATUTINO DE PRODUCCIÓN — {fecha_str}*",
        f"_Generado a las {hora_str} ART por Xana Intelligence_\n",
        "📊 *Panorama General de Taller:*",
        f"• *Órdenes en Cola:* {total_orders} OTs activas",
        f"• *Metraje Estimado:* {total_ml:.2f} metros lineales",
        f"• *🚨 OTs Urgentes / VIP:* {len(urgentes)} trabajo(s)",
        f"• *🚚 Entregas para Hoy:* {len(entregas_hoy)} orden(es)\n"
    ]

    if urgentes:
        md_lines.append("🔥 *URGENCIAS PRIORITARIAS:*")
        for u in urgentes[:4]:
            md_lines.append(f"• 🚨 *{u['ot']}* | {u['cliente']} ({u['material']}) — {u['ml']} ml")
        md_lines.append("")

    if entregas_hoy:
        md_lines.append("📅 *COMPROMISOS DE ENTREGA PARA HOY:*")
        for e in entregas_hoy[:4]:
            md_lines.append(f"• 📦 *{e['ot']}* — {e['cliente']} ({e['material']})")
        md_lines.append("")

    if top_demands:
        md_lines.append("🧵 *Demanda por Bobina / Material:*")
        for k, v in top_demands[:5]:
            md_lines.append(f"• *{k}*: {v['ml']:.1f} ml ({v['count']} trabajo(s))")
        md_lines.append("")

    if stock_alertas:
        md_lines.append(f"⚠️ *Atención Insumos ({len(stock_alertas)} bajo mínimo):*")
        for a in stock_alertas[:3]:
            md_lines.append(f"• 🔴 *{a['codigo']}*: {a['stock']} {a['unidad']} (Mín: {a['minimo']})")
        md_lines.append("")

    md_lines.append(f"💡 *Recomendación Operativa de Xana:*\n_{recomendacion}_")

    full_markdown = "\n".join(md_lines)

    return {
        'ok': True,
        'date': fecha_str,
        'time': hora_str,
        'total_orders': total_orders,
        'total_ml': round(total_ml, 2),
        'urgent_count': len(urgentes),
        'deliveries_today_count': len(entregas_hoy),
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
