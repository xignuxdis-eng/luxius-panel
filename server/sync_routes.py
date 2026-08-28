"""
LUXIUS FIELD — Endpoints de Sincronizacion
/api/sync/push  — Mobile -> Server
/api/sync/pull  — Server -> Mobile
/api/sync/sugerir-sena
/api/sync/desbloquear/<id>
"""

from datetime import datetime, timezone, date as date_type
from flask import Blueprint, request, jsonify, g
from sqlalchemy import and_

from models import db, Presupuesto, SyncLog, Vendedor
from middleware.auth import login_required, admin_required, ADMIN_ROLES

sync_bp = Blueprint('sync', __name__, url_prefix='/api/sync')


# ================================================================
# PUSH — Mobile envia cambios locales al servidor
# ================================================================

@sync_bp.post('/push')
@login_required
def push():
    data = request.get_json(force=True)
    cambios = data.get('cambios', [])
    vendedor_id = data.get('vendedor_id')
    es_admin = data.get('es_admin', False)

    if not cambios or not vendedor_id:
        return jsonify({'error': 'Faltan cambios o vendedor_id'}), 400

    aceptados = []
    rechazados = []

    for item in cambios:
        pid = item.get('id')
        if not pid:
            continue

        existing = Presupuesto.query.get(pid)
        parsed_ts = _parse_iso(item.get('updated_at'))

        if existing is None:
            _apply_presupuesto(item)
            aceptados.append(pid)

        elif _is_rejected(existing, vendedor_id, es_admin):
            motivos = _rejection_reason(existing, vendedor_id, es_admin)
            rechazados.append({'id': pid, 'motivo': motivos})

        elif parsed_ts and existing.updated_at and parsed_ts > existing.updated_at:
            _apply_presupuesto(item, existing)
            aceptados.append(pid)

        elif parsed_ts and existing.updated_at and parsed_ts <= existing.updated_at:
            rechazados.append({
                'id': pid,
                'motivo': 'Server tiene version mas reciente',
                'server_data': existing.to_dict(),
            })

        else:
            _apply_presupuesto(item, existing)
            aceptados.append(pid)

    db.session.commit()
    return jsonify({'accepted': aceptados, 'rejected': rechazados})


# ================================================================
# PULL — Mobile descarga cambios recientes del servidor
# ================================================================

@sync_bp.get('/pull')
@login_required
def pull():
    since_str = request.args.get('since')
    vendedor_id = request.args.get('vendedor_id', type=int)
    es_admin = request.args.get('es_admin', 'false').lower() == 'true'

    if not since_str or not vendedor_id:
        return jsonify({'error': 'Parametros since y vendedor_id requeridos'}), 400

    since = _parse_iso(since_str)
    if not since:
        return jsonify({'error': 'Formato de since invalido'}), 400

    filters = [SyncLog.changed_at > since]
    if not es_admin:
        filters.append(SyncLog.vendedor_id == vendedor_id)

    logs = SyncLog.query.filter(and_(*filters)) \
                       .order_by(SyncLog.changed_at.asc()).all()

    cambios = []
    for log in logs:
        if log.entity_type != 'presupuestos':
            continue

        p = Presupuesto.query.get(log.entity_id)

        if p and p.deleted_at is None:
            if not es_admin and p.vendedor_id != vendedor_id:
                continue
            cambios.append({
                'id': str(p.id),
                'operation': log.operation,
                'data': p.to_dict(),
                'changed_at': log.changed_at.isoformat(),
            })
        elif log.operation == 'DELETE' or (p is None):
            cambios.append({
                'id': str(log.entity_id),
                'operation': 'DELETE',
                'data': None,
                'changed_at': log.changed_at.isoformat(),
            })

    server_time = datetime.now(timezone.utc).isoformat()
    return jsonify({'server_time': server_time, 'cambios': cambios})


# ================================================================
# SUGERIR SENA — Calculo automatico del 50%
# ================================================================

@sync_bp.post('/sugerir-sena')
def sugerir_sena():
    data = request.get_json(force=True)
    total = float(data.get('total', 0))
    porcentaje = float(data.get('porcentaje', 50))
    sena = round(total * porcentaje / 100, 2)
    return jsonify({
        'sena_monto': sena,
        'sena_porcentaje': porcentaje,
        'saldo_pendiente': round(total - sena, 2),
    })


# ================================================================
# DESBLOQUEAR — Solo admin desde escritorio
# ================================================================

@sync_bp.post('/desbloquear/<presupuesto_id>')
@admin_required
def desbloquear(presupuesto_id):
    p = Presupuesto.query.get(presupuesto_id)
    if not p:
        return jsonify({'error': 'Presupuesto no encontrado'}), 404

    p.estado = 'borrador'
    db.session.commit()
    return jsonify(p.to_dict())


# ================================================================
# HELPERS INTERNOS
# ================================================================

PRESUPUESTO_FIELDS = [
    'vendedor_id', 'cliente_id', 'estado', 'descripcion', 'especificaciones',
    'subtotal', 'descuento', 'total',
    'sena_porcentaje', 'sena_monto', 'sena_metodo', 'alias_cbu',
    'monto_pagado', 'saldo_pendiente',
    'notas', 'origen', 'deleted_at',
]


def _apply_presupuesto(data: dict, existing: Presupuesto = None):
    target = existing

    if target is None:
        target = Presupuesto(id=data.get('id'))
        if data.get('created_at'):
            target.created_at = _parse_iso(data['created_at'])
        db.session.add(target)

    for field in PRESUPUESTO_FIELDS:
        if field in data and data[field] is not None:
            setattr(target, field, data[field])

    if 'fecha_entrega_estimada' in data and data['fecha_entrega_estimada']:
        target.fecha_entrega_estimada = date_type.fromisoformat(
            data['fecha_entrega_estimada']
        )

    target.updated_at = datetime.now(timezone.utc)


def _is_rejected(p: Presupuesto, vendedor_id: int, es_admin: bool) -> bool:
    return bool(_rejection_reason(p, vendedor_id, es_admin))


def _rejection_reason(p: Presupuesto, vendedor_id: int, es_admin: bool):
    if not es_admin and p.vendedor_id != vendedor_id:
        return 'No es tu presupuesto'
    if not es_admin and p.estado in Presupuesto.ESTADOS_BLOQUEADOS:
        return f'Presupuesto bloqueado (estado: {p.estado})'
    return None


def _parse_iso(ts):
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return None
