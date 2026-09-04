"""
/api/stats — Estadísticas avanzadas calculadas desde datos reales.

Reemplaza los datos mock hardcodeados en estadisticas.tsx y reportes.tsx
con métricas reales calculadas desde la tabla presupuestos.
"""

from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request
from models import db, Presupuesto, Cliente, Maquina, Usuario, ConfigGlobal
from middleware.auth import login_required, admin_required
from sqlalchemy import func, text, extract, case

stats_bp = Blueprint('stats', __name__, url_prefix='/api/stats')


@stats_bp.get('/advanced')
@login_required
def get_advanced_stats():
    """Estadísticas avanzadas para el panel admin — reemplaza datos mock."""
    try:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=now.weekday())
        month_start = today_start.replace(day=1)

        # -- Base query: active orders (not deleted) --
        base = Presupuesto.query.filter(Presupuesto.deleted_at.is_(None))
        all_orders = base.all()

        total_orders = len(all_orders)

        # -- Orders by status --
        status_counts = {}
        for o in all_orders:
            s = (o.estado or 'borrador').lower()
            status_counts[s] = status_counts.get(s, 0) + 1

        # -- Orders today --
        orders_today = sum(1 for o in all_orders
                          if o.created_at and o.created_at >= today_start)

        # -- Orders this week --
        orders_week = sum(1 for o in all_orders
                         if o.created_at and o.created_at >= week_start)

        # -- Orders this month --
        orders_month = sum(1 for o in all_orders
                          if o.created_at and o.created_at >= month_start)

        # -- Completed orders (entregado, finalizado, completo) --
        completed_statuses = {'entregado', 'finalizado', 'completo', 'ENTREGADO', 'FINALIZADO'}
        completed = sum(1 for o in all_orders if (o.estado or '') in completed_statuses)

        # -- Conversion rate: completed / total --
        conversion_rate = round((completed / total_orders * 100), 1) if total_orders > 0 else 0

        # -- Average response time (created_at → first status change beyond borrador) --
        response_times = []
        for o in all_orders:
            if o.created_at and o.updated_at and o.estado not in ('borrador', 'RECIBIDO', None):
                delta = (o.updated_at - o.created_at).total_seconds() / 3600  # hours
                if 0 < delta < 720:  # filter outliers (> 30 days)
                    response_times.append(delta)
        avg_response_h = round(sum(response_times) / len(response_times), 1) if response_times else 0

        # -- Active clients (clients with orders this month) --
        active_client_ids = set()
        for o in all_orders:
            if o.created_at and o.created_at >= month_start and o.cliente_id:
                active_client_ids.add(o.cliente_id)
        total_clients = Cliente.query.filter_by(habilitado=True).count()

        # -- Client retention: returning clients / total active --
        all_client_ids = set(o.cliente_id for o in all_orders if o.cliente_id)
        returning = sum(1 for cid in active_client_ids
                       if sum(1 for o in all_orders if o.cliente_id == cid) > 1)
        retention_rate = round((returning / len(active_client_ids) * 100), 1) if active_client_ids else 0

        # -- Activity by hour (last 7 days) --
        week_orders = [o for o in all_orders if o.created_at and o.created_at >= week_start]
        hourly_activity = [0] * 24
        for o in week_orders:
            if o.created_at:
                h = o.created_at.hour
                hourly_activity[h] += 1
        # Normalize to percentages
        max_activity = max(hourly_activity) if hourly_activity else 1
        hourly_pct = [round(v / max(max_activity, 1) * 100) for v in hourly_activity]

        # -- Machines online --
        machines = Maquina.query.all()
        machines_data = []
        for m in machines:
            machines_data.append({
                'id': m.id,
                'name': m.nombre or f'Máquina {m.id}',
                'type': m.tipo or 'impresora',
                'online': True  # All registered machines are "online"
            })

        # -- Revenue this month (from total field) --
        revenue_month = 0
        for o in all_orders:
            if o.created_at and o.created_at >= month_start:
                esp = o.especificaciones or {}
                total = esp.get('total') or esp.get('subtotal') or 0
                try:
                    revenue_month += float(total)
                except (ValueError, TypeError):
                    pass

        return jsonify({
            'totalOrders': total_orders,
            'ordersToday': orders_today,
            'ordersWeek': orders_week,
            'ordersMonth': orders_month,
            'completed': completed,
            'conversionRate': conversion_rate,
            'avgResponseHours': avg_response_h,
            'retentionRate': retention_rate,
            'activeClients': len(active_client_ids),
            'totalClients': total_clients,
            'statusCounts': status_counts,
            'hourlyActivity': hourly_pct,
            'machines': machines_data,
            'revenueMonth': round(revenue_month, 2),
            'timestamp': now.isoformat()
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@stats_bp.get('/reportes')
@login_required
def get_reportes_stats():
    """Estadísticas para el Centro de Reportes — reemplaza datos mock."""
    try:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today_start.replace(day=1)
        prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

        all_orders = Presupuesto.query.filter(Presupuesto.deleted_at.is_(None)).all()

        # -- Revenue by material category --
        category_revenue = {}
        for o in all_orders:
            esp = o.especificaciones or {}
            carteles = esp.get('carteles', [])
            total = 0
            try:
                total = float(esp.get('total') or esp.get('subtotal') or 0)
            except (ValueError, TypeError):
                pass

            # Determine material category
            material_type = 'Otros'
            for c in carteles:
                tipo = (c.get('tipo') or '').lower()
                if 'lona' in tipo:
                    material_type = 'Lonas'
                elif 'vinilo' in tipo or 'vinyl' in tipo:
                    material_type = 'Vinilos / Calcos'
                elif 'papel' in tipo or 'foto' in tipo:
                    material_type = 'Papel / Fotográfico'
                elif 'banner' in tipo or 'roll' in tipo:
                    material_type = 'Banners / Roll-ups'
                break  # Use first cartel's material

            # Fallback: check description
            if material_type == 'Otros' and o.descripcion:
                desc = o.descripcion.lower()
                if 'lona' in desc:
                    material_type = 'Lonas'
                elif 'vinilo' in desc or 'calco' in desc:
                    material_type = 'Vinilos / Calcos'
                elif 'corporeo' in desc or 'corpóreo' in desc:
                    material_type = 'Corpóreos'

            if material_type not in category_revenue:
                category_revenue[material_type] = {'total': 0, 'count': 0, 'thisMonth': 0}
            category_revenue[material_type]['total'] += total
            category_revenue[material_type]['count'] += 1
            if o.created_at and o.created_at >= month_start:
                category_revenue[material_type]['thisMonth'] += total

        # Sort by total revenue descending
        categories = []
        max_rev = max((v['total'] for v in category_revenue.values()), default=1) or 1
        colors = ['bg-indigo-500', 'bg-blue-500', 'bg-purple-500', 'bg-emerald-500',
                  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']
        for i, (name, data) in enumerate(sorted(category_revenue.items(),
                                                 key=lambda x: x[1]['total'], reverse=True)):
            categories.append({
                'name': name,
                'value': round(data['total'] / max_rev * 100),
                'color': colors[i % len(colors)],
                'amount': f"${data['total']:,.0f}",
                'count': data['count'],
                'thisMonth': round(data['thisMonth'], 2)
            })

        # -- Monthly totals (last 6 months) --
        monthly_data = []
        for months_ago in range(5, -1, -1):
            m_start = (now - timedelta(days=30 * months_ago)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0)
            if months_ago > 0:
                m_end = (m_start + timedelta(days=32)).replace(day=1)
            else:
                m_end = now

            m_revenue = 0
            m_count = 0
            for o in all_orders:
                if o.created_at and m_start <= o.created_at < m_end:
                    esp = o.especificaciones or {}
                    try:
                        m_revenue += float(esp.get('total') or esp.get('subtotal') or 0)
                    except (ValueError, TypeError):
                        pass
                    m_count += 1

            monthly_data.append({
                'month': m_start.strftime('%b %Y'),
                'revenue': round(m_revenue, 2),
                'orders': m_count
            })

        # -- Top clients by revenue --
        client_revenue = {}
        for o in all_orders:
            cid = o.cliente_id
            if not cid:
                continue
            esp = o.especificaciones or {}
            try:
                total = float(esp.get('total') or esp.get('subtotal') or 0)
            except (ValueError, TypeError):
                total = 0
            if cid not in client_revenue:
                nombre = ''
                if o.cliente:
                    nombre = o.cliente.nombre or ''
                client_revenue[cid] = {'name': nombre, 'total': 0, 'count': 0}
            client_revenue[cid]['total'] += total
            client_revenue[cid]['count'] += 1

        top_clients = sorted(client_revenue.values(),
                            key=lambda x: x['total'], reverse=True)[:10]

        return jsonify({
            'categories': categories,
            'monthly': monthly_data,
            'topClients': top_clients,
            'timestamp': now.isoformat()
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ================================================================
# CONFIG EMPRESA — Datos del negocio para PDFs y documentos
# ================================================================

CONFIG_EMPRESA_KEY = 'config_empresa'

DEFAULT_EMPRESA = {
    'nombre': 'Mi Empresa',
    'razonSocial': '',
    'direccion': '',
    'telefono': '',
    'email': '',
    'web': '',
    'cuit': '',
    'bancoNombre': '',
    'bancoCBU': '',
    'bancoAlias': '',
    'bancoTitular': '',
    'logoBase64': '',
    'footerText': '',
}


@stats_bp.get('/config/empresa')
@login_required
def get_config_empresa():
    """Get company configuration for PDFs and documents."""
    row = ConfigGlobal.query.filter_by(clave=CONFIG_EMPRESA_KEY).first()
    if row and row.valor:
        return jsonify({**DEFAULT_EMPRESA, **row.valor})
    return jsonify(DEFAULT_EMPRESA)


@stats_bp.put('/config/empresa')
@admin_required
def update_config_empresa():
    """Update company configuration (admin only)."""
    data = request.get_json(force=True) or {}

    # Only allow known keys
    allowed = set(DEFAULT_EMPRESA.keys())
    filtered = {k: v for k, v in data.items() if k in allowed}

    row = ConfigGlobal.query.filter_by(clave=CONFIG_EMPRESA_KEY).first()
    if row:
        current = row.valor or {}
        current.update(filtered)
        row.valor = current
    else:
        row = ConfigGlobal(clave=CONFIG_EMPRESA_KEY, valor={**DEFAULT_EMPRESA, **filtered})
        db.session.add(row)

    db.session.commit()
    return jsonify({**DEFAULT_EMPRESA, **(row.valor or {})}), 200


# ================================================================
# BANCOS — Cuentas bancarias (sincronizadas)
# ================================================================

CONFIG_BANCOS_KEY = 'config_bancos'


@stats_bp.get('/bancos')
@login_required
def get_bancos():
    """Get bank accounts list."""
    row = ConfigGlobal.query.filter_by(clave=CONFIG_BANCOS_KEY).first()
    if row and row.valor:
        return jsonify(row.valor if isinstance(row.valor, list) else [])
    return jsonify([])


@stats_bp.put('/bancos')
@admin_required
def save_bancos():
    """Save/replace entire bank accounts list (admin only)."""
    data = request.get_json(force=True)
    if not isinstance(data, list):
        return jsonify({'error': 'Expected a JSON array of bank accounts'}), 400

    row = ConfigGlobal.query.filter_by(clave=CONFIG_BANCOS_KEY).first()
    if row:
        row.valor = data
    else:
        row = ConfigGlobal(clave=CONFIG_BANCOS_KEY, valor=data)
        db.session.add(row)

    db.session.commit()
    return jsonify(data), 200


# ================================================================
# RECALCULATE BOBINAS — One-time migration to minimize-waste policy
# ================================================================

def _round2(val):
    import math
    return round(val + 1e-10, 2)


@stats_bp.post('/recalculate-bobinas')
@admin_required
def recalculate_bobinas():
    """
    Recalculate bobinaAsignada for ALL active orders using minimize-waste policy.
    For each order with tipoCobro='ml' material, find the smallest bobina where
    the piece fits (considering rotation), update especificaciones in DB.
    """
    from models import Presupuesto
    from sqlalchemy.orm.attributes import flag_modified

    # Load all materials for bobina lookup
    from models import db as _db

    # We need to load materials from config or from a separate source
    # Materials are stored in the frontend's sync, but we can reconstruct
    # the bobina logic from the presupuesto's own especificaciones

    all_orders = Presupuesto.query.filter(Presupuesto.deleted_at.is_(None)).all()

    changes = []
    unchanged = []
    errors = []

    for p in all_orders:
        try:
            esp = p.especificaciones or {}
            ot = f"OT-{str(p.id)[:8].upper()}"

            # Get dimensions
            ancho = float(esp.get('ancho') or 0)
            alto = float(esp.get('alto') or 0)
            copias = int(esp.get('copias') or 1)

            if ancho <= 0 or alto <= 0:
                continue

            # Get current bobina
            old_bobina = esp.get('bobinaAsignada')
            old_consumo = esp.get('consumoEstimado')
            precio_detalle = esp.get('precioDetalle') or {}

            # Skip if no bobina info at all (m2 pricing)
            if not old_bobina and not precio_detalle.get('bobinaAncho'):
                continue

            # We need the material's bobinas list
            # Try to get from precioDetalle or reconstruct from known roll widths
            material_code = esp.get('material', '')

            # Get bobinas from the material definition
            # Since we're server-side, query the config or use standard widths
            # The bobina widths that matter are stored in precioDetalle
            bobina_ancho = old_bobina or precio_detalle.get('bobinaAncho') or precio_detalle.get('bobinaUsada')

            if not bobina_ancho:
                continue

            bobina_ancho = float(bobina_ancho)

            # Standard vinyl/lona bobina widths
            standard_bobinas = [1.07, 1.22, 1.37, 1.52, 1.60]

            # Determine available bobinas for this material type
            # Use the known standard set
            safety_margin = 0.01

            # Collect all valid combos
            candidates = []
            for bw in standard_bobinas:
                useful = _round2(bw - safety_margin)
                if useful <= 0:
                    continue

                # Normal: ancho fits
                if ancho <= useful:
                    ml = _round2(alto * copias)
                    candidates.append({'bobina': bw, 'rotated': False, 'ml': ml})

                # Rotated: alto fits
                if alto <= useful:
                    ml = _round2(ancho * copias)
                    candidates.append({'bobina': bw, 'rotated': True, 'ml': ml})

            if not candidates:
                continue

            # Sort by smallest bobina, then fewest ML
            candidates.sort(key=lambda x: (x['bobina'], x['ml']))
            best = candidates[0]

            new_bobina = best['bobina']
            new_consumo = best['ml']
            new_rotated = best['rotated']

            # Check if changed
            if _round2(new_bobina) == _round2(bobina_ancho):
                unchanged.append({
                    'ot': ot,
                    'bobina': new_bobina,
                    'ancho': ancho,
                    'alto': alto
                })
                continue

            # Update especificaciones
            esp['bobinaAsignada'] = new_bobina
            esp['consumoEstimado'] = new_consumo

            if 'precioDetalle' in esp and esp['precioDetalle']:
                esp['precioDetalle']['bobinaAncho'] = new_bobina
                esp['precioDetalle']['bobinaUsada'] = new_bobina
                esp['precioDetalle']['rotated'] = new_rotated
                esp['precioDetalle']['consumoML'] = new_consumo

            p.especificaciones = esp
            flag_modified(p, 'especificaciones')

            changes.append({
                'ot': ot,
                'ancho': ancho,
                'alto': alto,
                'oldBobina': bobina_ancho,
                'newBobina': new_bobina,
                'oldConsumo': old_consumo,
                'newConsumo': new_consumo,
                'rotated': new_rotated
            })

        except Exception as e:
            errors.append({'ot': f"OT-{str(p.id)[:8].upper()}", 'error': str(e)})

    if changes:
        db.session.commit()

    return jsonify({
        'updated': len(changes),
        'unchanged': len(unchanged),
        'errors': len(errors),
        'changes': changes,
        'errorDetails': errors
    })
