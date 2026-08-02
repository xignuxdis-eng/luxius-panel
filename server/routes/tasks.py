from datetime import datetime, timezone
from flask import jsonify, request, g
from models import db, Presupuesto, Vendedor, Cliente
from middleware.auth import operator_required
from routes import tasks_bp


ESTADOS_EXCLUIDOS = [
    'cancelado',
    'anulado',
    'eliminado',
    'CANCELADO',
    'ANULADO',
]


def _presupuesto_to_dict(p):
    especs = p.especificaciones or {}
    dir_sugerida = p.cliente.direccion if p.cliente and p.cliente.direccion else especs.get('clienteDireccion') or especs.get('direccion') or ''
    cliente_nombre = p.cliente.nombre if p.cliente else especs.get('clienteNombre') or p.descripcion or 'Cliente General'
    return {
        'id': str(p.id),
        'titulo': p.descripcion or 'Relevamiento en sitio',
        'descripcion': p.descripcion or 'Relevamiento en sitio',
        'estado': p.estado,
        'clienteId': p.cliente_id,
        'clienteNombre': cliente_nombre,
        'clienteDireccion': dir_sugerida,
        'coordenadas': especs.get('coordenadas'),
        'vendedorId': p.vendedor_id,
        'especificaciones': especs,
        'subtotal': float(p.subtotal or 0),
        'descuento': float(p.descuento or 0),
        'total': float(p.total or 0),
        'senaPorcentaje': float(p.sena_porcentaje or 50),
        'senaMonto': float(p.sena_monto or 0),
        'montoPagado': float(p.monto_pagado or 0),
        'saldoPendiente': float(p.saldo_pendiente or 0),
        'fechaEntregaEstimada': p.fecha_entrega_estimada.isoformat()
                                if p.fecha_entrega_estimada else None,
        'notas': p.notas,
        'origen': p.origen,
        'createdAt': p.created_at.isoformat() if p.created_at else None,
        'updatedAt': p.updated_at.isoformat() if p.updated_at else None,
    }


def _deep_merge(base, override):
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            _deep_merge(base[key], value)
        else:
            base[key] = value

def _resolver_vendedor_id(user_id, rol):
    if rol in ('administrador', 'principal', 'jefe_produccion', 'operario', 'tecnico'):
        return None
    vendedor = Vendedor.query.filter_by(usuario_id=user_id).first()
    if not vendedor:
        return None
    return vendedor.id


@tasks_bp.get('')
@operator_required
def list_tasks():
    query = Presupuesto.query.filter(Presupuesto.deleted_at.is_(None))
    query = query.filter(Presupuesto.estado.notin_(ESTADOS_EXCLUIDOS))
    presupuestos = query.order_by(Presupuesto.updated_at.desc()).all()

    return jsonify([_presupuesto_to_dict(p) for p in presupuestos])


@tasks_bp.get('/<presupuesto_id>')
@operator_required
def get_task(presupuesto_id):
    from routes.orders import _find_presupuesto
    presupuesto = _find_presupuesto(presupuesto_id)
    if not presupuesto or presupuesto.deleted_at:
        return jsonify({'error': 'Presupuesto no encontrado'}), 404

    return jsonify(_presupuesto_to_dict(presupuesto))


@tasks_bp.post('')
@operator_required
def create_task():
    data = request.get_json(force=True)
    if not data:
        return jsonify({'error': 'Cuerpo requerido'}), 400

    vendedor_id = _resolver_vendedor_id(g.user_id, g.user_rol)
    if not vendedor_id:
        v = Vendedor.query.first()
        vendedor_id = v.id if v else 1

    especs = data.get('especificaciones', {})
    if 'clienteDireccion' in data and not especs.get('clienteDireccion'):
        especs['clienteDireccion'] = data['clienteDireccion']
    if 'clienteNombre' in data and not especs.get('clienteNombre'):
        especs['clienteNombre'] = data['clienteNombre']
    if 'coordenadas' in data and not especs.get('coordenadas'):
        especs['coordenadas'] = data['coordenadas']

    titulo = data.get('titulo') or data.get('descripcion') or data.get('clienteNombre') or 'Relevamiento en sitio'

    presupuesto = Presupuesto(
        vendedor_id=vendedor_id,
        cliente_id=data.get('clienteId'),
        estado='RECIBIDO',
        descripcion=titulo,
        especificaciones=especs,
        notas=data.get('notas', ''),
        origen=data.get('origen', 'mobile'),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.session.add(presupuesto)
    db.session.commit()

    return jsonify(_presupuesto_to_dict(presupuesto)), 201


@tasks_bp.patch('/<presupuesto_id>')
@operator_required
def update_task(presupuesto_id):
    from routes.orders import _find_presupuesto
    presupuesto = _find_presupuesto(presupuesto_id)
    if not presupuesto or presupuesto.deleted_at:
        return jsonify({'error': 'Presupuesto no encontrado'}), 404

    data = request.get_json(force=True)

    if 'estado' in data:
        presupuesto.estado = data['estado']

    if 'especificaciones' in data:
        from sqlalchemy.orm.attributes import flag_modified
        current = presupuesto.especificaciones or {}
        _deep_merge(current, data['especificaciones'])
        presupuesto.especificaciones = current
        flag_modified(presupuesto, 'especificaciones')

    if 'clienteDireccion' in data:
        from sqlalchemy.orm.attributes import flag_modified
        current = presupuesto.especificaciones or {}
        current['clienteDireccion'] = data['clienteDireccion']
        presupuesto.especificaciones = current
        flag_modified(presupuesto, 'especificaciones')

    if 'clienteNombre' in data:
        from sqlalchemy.orm.attributes import flag_modified
        current = presupuesto.especificaciones or {}
        current['clienteNombre'] = data['clienteNombre']
        presupuesto.especificaciones = current
        flag_modified(presupuesto, 'especificaciones')

    if 'descripcion' in data:
        presupuesto.descripcion = data['descripcion']
    elif 'titulo' in data:
        presupuesto.descripcion = data['titulo']

    if 'notas' in data:
        presupuesto.notas = data['notas']

    if 'subtotal' in data:
        presupuesto.subtotal = data['subtotal']

    if 'total' in data:
        presupuesto.total = data['total']

    if 'senaPorcentaje' in data:
        presupuesto.sena_porcentaje = data['senaPorcentaje']
        presupuesto.sena_monto = float(presupuesto.total or 0) * (float(data['senaPorcentaje']) / 100)

    if 'clienteId' in data:
        presupuesto.cliente_id = data['clienteId']

    presupuesto.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify(_presupuesto_to_dict(presupuesto))


@tasks_bp.delete('/<presupuesto_id>')
@operator_required
def delete_task(presupuesto_id):
    from routes.orders import _find_presupuesto
    presupuesto = _find_presupuesto(presupuesto_id)
    if not presupuesto:
        return jsonify({'error': 'Presupuesto no encontrado'}), 404

    presupuesto.deleted_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({'message': 'Tarea eliminada correctamente', 'id': str(presupuesto_id)})


@tasks_bp.get('/<presupuesto_id>/messages')
def get_task_messages(presupuesto_id):
    from routes.orders import _find_presupuesto
    presupuesto = _find_presupuesto(presupuesto_id)
    if not presupuesto:
        return jsonify({'error': 'Presupuesto no encontrado'}), 404

    especs = presupuesto.especificaciones or {}
    mensajes = especs.get('mensajes', [])
    return jsonify({'success': True, 'messages': mensajes})


@tasks_bp.post('/<presupuesto_id>/messages')
def add_task_message(presupuesto_id):
    from routes.orders import _find_presupuesto
    from sqlalchemy.orm.attributes import flag_modified
    presupuesto = _find_presupuesto(presupuesto_id)
    if not presupuesto:
        return jsonify({'error': 'Presupuesto no encontrado'}), 404

    data = request.get_json(force=True) or {}
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'Mensaje vacío'}), 400

    now_utc = datetime.now(timezone.utc)
    msg_obj = {
        'id': str(int(now_utc.timestamp() * 1000)),
        'sender': data.get('sender', 'web'),
        'senderName': data.get('senderName', 'Admin Luxius'),
        'text': text,
        'timestamp': now_utc.strftime('%H:%M - %d/%m')
    }

    especs = dict(presupuesto.especificaciones or {})
    mensajes = list(especs.get('mensajes', []))
    mensajes.append(msg_obj)
    especs['mensajes'] = mensajes
    presupuesto.especificaciones = especs
    flag_modified(presupuesto, 'especificaciones')
    db.session.commit()

    return jsonify({'success': True, 'message': msg_obj, 'messages': mensajes})
