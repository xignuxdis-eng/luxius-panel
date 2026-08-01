"""
/api/orders — Puente entre presupuestos (BD/Móvil) y órdenes (Frontend Luxius).

El frontend React de Luxius espera objetos con la interfaz `Order`
(ver src/types/orden.ts). Este módulo traduce la tabla `presupuestos`
al formato que el frontend consume, y viceversa.
"""

from datetime import datetime, timezone
from flask import jsonify, request
from models import db, Presupuesto, Cliente
from routes import orders_bp

# ================================================================
# MAPEO DE ESTADOS  BD → Frontend y viceversa
# ================================================================

ESTADO_TO_STATUS = {
    'borrador':               'diseno',
    'diseno':                 'diseno',
    'DISENO':                 'diseno',
    'RECIBIDO':               'relevamiento',
    'recibido':               'relevamiento',
    'PENDIENTE_RELEVAMIENTO': 'relevamiento',
    'relevamiento':           'relevamiento',
    'en_progreso':            'diseno',
    'EN_PROGRESO':            'diseno',
    'ORDEN_DE_TRABAJO':       'orden',
    'orden':                  'orden',
    'ORDEN':                  'orden',
    'enviado':                'diseno',
    'senado':                 'diseno',
    'impreso':                'impreso',
    'IMPRESO':                'impreso',
    'aprobado':               'impreso',
    'post':                   'post',
    'POST':                   'post',
    'en_taller':              'post',
    'completo':               'completo',
    'COMPLETO':               'completo',
    'entregado':              'entregado',
    'ENTREGADO':              'entregado',
    'finalizado':             'finalizado',
    'FINALIZADO':             'finalizado',
    'cancelado':              'anulado',
    'anulado':                'anulado',
    'ANULADO':                'anulado',
    'rebotado':               'rebotado',
    'REBOTADO':               'rebotado',
    'standby':                'standby',
    'STANDBY':                'standby',
}

STATUS_TO_ESTADO = {
    'relevamiento': 'RECIBIDO',
    'diseno':       'borrador',
    'preorden':     'borrador',
    'orden':        'ORDEN_DE_TRABAJO',
    'impreso':      'impreso',
    'post':         'post',
    'completo':     'completo',
    'entregado':    'entregado',
    'finalizado':   'entregado',
    'standby':      'standby',
    'anulado':      'cancelado',
    'rebotado':     'rebotado',
    'eliminado':    'cancelado',
}


def _uuid_to_int(u):
    if not u:
        return 10001
    s = str(u).replace('-', '')
    try:
        return (int(s[:8], 16) % 89999) + 10000
    except Exception:
        return 10001


def _find_presupuesto(target_id):
    if not target_id:
        return None
    t_str = str(target_id).strip()
    all_p = Presupuesto.query.all()
    for p in all_p:
        if str(p.id).strip() == t_str:
            return p
        if str(_uuid_to_int(p.id)) == t_str:
            return p
        ot_code = f"OT-{str(p.id)[:8].upper()}"
        if ot_code.upper() == t_str.upper() or ot_code.replace('OT-', '').upper() == t_str.replace('OT-', '').upper():
            return p
    return None


def _presupuesto_to_order(p):
    """Convierte un Presupuesto ORM → dict Order (frontend Luxius)."""
    esp = p.especificaciones or {}
    carteles = esp.get('carteles', [])

    primer_cartel = carteles[0] if carteles else {}
    medidas = primer_cartel.get('medidas', {})
    tipo_material = primer_cartel.get('tipo', '')

    MATERIAL_LABELS = {
        'lona_front_light_13oz': 'Lona Front Light 13oz',
        'lona_back_light_15oz': 'Lona Back Light 15oz',
        'vinilo_adhesivo_brillo': 'Vinilo Adhesivo Brillo',
        'vinilo_microperforado': 'Vinilo Microperforado',
    }

    status = 'eliminado' if p.deleted_at is not None else ESTADO_TO_STATUS.get(p.estado, p.estado or 'diseno')
    cliente_nombre = ''
    if p.cliente:
        cliente_nombre = p.cliente.nombre or ''

    archivos = []
    archivos_originales = []

    for idx, c in enumerate(carteles):
        fotos = c.get('fotos', [])
        for f_idx, foto in enumerate(fotos):
            if foto:
                archivos.append(foto)
                archivos_originales.append(f"Foto_Cartel_{idx+1}_{f_idx+1}.jpg")

        videos = c.get('videos', [])
        for v_idx, video in enumerate(videos):
            if video:
                archivos.append(video)
                archivos_originales.append(f"Video_Relevamiento_{idx+1}_{v_idx+1}.webm")
        
        objects = c.get('objects', [])
        for o_idx, obj in enumerate(objects):
            smart_audio = (obj.get('smartData') or {}).get('audio')
            if smart_audio:
                archivos.append(smart_audio)
                archivos_originales.append(f"Audio_Nota_{idx+1}_{o_idx+1}.webm")

    # PDFs de Presupuestos/Cotizaciones generados
    presupuestos_pdf = esp.get('documentos', {}).get('presupuestos', [])
    for pdf_idx, pdf_item in enumerate(presupuestos_pdf):
        pdf_url = pdf_item.get('dataUrl') or pdf_item.get('path')
        if pdf_url:
            archivos.append(pdf_url)
            archivos_originales.append(pdf_item.get('nombre') or f"Presupuesto_Cotizacion_v{pdf_item.get('version', pdf_idx+1)}.pdf")

    adjuntos = getattr(p, 'archivos_adjuntos', None) or esp.get('documentos', {}).get('adjuntos', [])
    for a in adjuntos:
        if isinstance(a, dict):
            archivos.append(a.get('path') or a.get('dataUrl', ''))
            archivos_originales.append(a.get('name', ''))
        elif isinstance(a, str):
            archivos.append(a)
            archivos_originales.append(a.split('/')[-1])

    return {
        'id': _uuid_to_int(p.id),
        'uuid': str(p.id),
        'ot': f'OT-{str(p.id)[:8].upper()}',
        'status': status,
        'clientId': p.cliente_id or 0,
        'clienteNombre': cliente_nombre,
        'clientName': cliente_nombre,
        'vendedorId': p.vendedor_id,  # Exponer el vendedorId
        'createdAt': p.created_at.isoformat() if p.created_at else None,
        'updatedAt': p.updated_at.isoformat() if p.updated_at else None,

        # Material specs
        'material': MATERIAL_LABELS.get(tipo_material, tipo_material.replace('_', ' ').title() if tipo_material else ''),
        'calidad': 'Estándar',
        'alto': float(medidas.get('alto', 0)),
        'ancho': float(medidas.get('ancho', 0)),
        'copias': len(carteles) or 1,

        # Financials
        'subtotal': float(p.subtotal or 0),
        'total': float(p.total or 0),
        'demasias': 0,

        # Extras
        'accesorios': [],
        'laminado': False,
        'bordado': False,
        'panelizado': False,
        'portabanners': 0,

        # Logistics
        'envio': '',
        'emergencia': False,

        # Dates
        'fechaCreacion': p.created_at.strftime('%d/%m/%Y') if p.created_at else '',
        'fechaEntrega': p.fecha_entrega_estimada.strftime('%d/%m/%Y')
                        if p.fecha_entrega_estimada else '',

        # Notes
        'observaciones': p.descripcion or '',
        'observaciones2': esp.get('instruccionesTaller', ''),
        'comments': p.notas or '',

        # Files
        'archivos': archivos,
        'archivosOriginales': archivos_originales,

        # Production
        'maquinaId': None,
        'artistaId': None,

        # Title / Task Name
        'nombreTarea': p.descripcion or f"Proyecto OT-{str(p.id)[:8].upper()}",
        'titulo': p.descripcion or f"Proyecto OT-{str(p.id)[:8].upper()}",

        # Category
        'category': 'impresion' if status in ('orden', 'impreso', 'post') else 'diseno',

        # Origen (mobile vs web)
        'origen': p.origen or 'web',
        'vendedorNombre': p.vendedor.nombre if p.vendedor else (esp.get('operarioNombre') or esp.get('vendedorNombre') or ''),
        'operarioNombre': p.vendedor.nombre if p.vendedor else (esp.get('operarioNombre') or esp.get('vendedorNombre') or ''),
    }


def _apply_order_to_presupuesto(p, data):
    """Aplica campos de un Order dict → Presupuesto ORM."""
    if 'status' in data:
        st = data['status']
        if st == 'eliminado':
            p.deleted_at = datetime.now(timezone.utc)
        else:
            p.estado = STATUS_TO_ESTADO.get(st, st)
            if p.deleted_at is not None:
                p.deleted_at = None

    if 'observaciones' in data:
        p.descripcion = data['observaciones']

    if 'comments' in data:
        p.notas = data['comments']

    if 'total' in data:
        p.total = data['total']

    if 'subtotal' in data:
        p.subtotal = data['subtotal']

    if 'clientId' in data and data['clientId']:
        p.cliente_id = data['clientId']

    if 'vendedorId' in data:
        p.vendedor_id = data['vendedorId']

    if 'fechaEntrega' in data and data['fechaEntrega']:
        try:
            p.fecha_entrega_estimada = datetime.strptime(
                data['fechaEntrega'], '%d/%m/%Y'
            ).date()
        except (ValueError, TypeError):
            pass

    p.updated_at = datetime.now(timezone.utc)


# ================================================================
# GET /api/orders — Listar todas las órdenes
# ================================================================

@orders_bp.get('')
def get_orders():
    presupuestos = Presupuesto.query.filter(
        Presupuesto.deleted_at.is_(None)
    ).order_by(Presupuesto.created_at.desc()).all()

    return jsonify([_presupuesto_to_order(p) for p in presupuestos])


# ================================================================
# GET /api/orders/<id> — Obtener una orden por ID
# ================================================================

@orders_bp.get('/<int:order_id>')
def get_order(order_id):
    # Buscar por el hash-ID o iterar
    presupuestos = Presupuesto.query.filter(
        Presupuesto.deleted_at.is_(None)
    ).all()

    for p in presupuestos:
        order = _presupuesto_to_order(p)
        if order['id'] == order_id:
            return jsonify(order)

    return jsonify({'error': 'Orden no encontrada'}), 404


# ================================================================
# POST /api/orders — Crear una nueva orden
# ================================================================

@orders_bp.post('')
def create_order():
    data = request.get_json(force=True)
    if not data:
        return jsonify({'error': 'Cuerpo requerido'}), 400

    order_id = data.get('id')
    ot_val = data.get('ot')
    p = _find_presupuesto(order_id) or _find_presupuesto(ot_val)

    if p:
        _apply_order_to_presupuesto(p, data)
        db.session.commit()
        return jsonify(_presupuesto_to_order(p)), 200

    p = Presupuesto(
        vendedor_id=data.get('vendedorId', 1),  # Soporta vendedorId enviado del FE, fallback a 1
        cliente_id=data.get('clientId'),
        estado=STATUS_TO_ESTADO.get(data.get('status', 'preorden'), 'borrador'),
        descripcion=data.get('observaciones', ''),
        notas=data.get('comments', ''),
        subtotal=data.get('subtotal', 0),
        total=data.get('total', 0),
        origen='web',
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    if data.get('material') or data.get('alto') or data.get('ancho'):
        p.especificaciones = {
            'carteles': [{
                'tipo': data.get('material', ''),
                'medidas': {
                    'ancho': data.get('ancho', 0),
                    'alto': data.get('alto', 0),
                },
            }],
        }

    db.session.add(p)
    db.session.commit()

    return jsonify(_presupuesto_to_order(p)), 201


# ================================================================
# PUT /api/orders/<id> — Actualizar una orden existente
# ================================================================

@orders_bp.put('/<order_id>')
def update_order(order_id):
    data = request.get_json(force=True)
    target = _find_presupuesto(order_id)

    if not target:
        return jsonify({'error': 'Orden no encontrada'}), 404

    _apply_order_to_presupuesto(target, data)
    db.session.commit()

    return jsonify(_presupuesto_to_order(target))


# ================================================================
# DELETE /api/orders/<id> — Borrado suave
# ================================================================

@orders_bp.delete('/<order_id>')
def delete_order(order_id):
    target = _find_presupuesto(order_id)

    if not target:
        return jsonify({'error': 'Orden no encontrada'}), 404

    target.deleted_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({'success': True})


# ================================================================
# POST /api/orders/batch — Operaciones en lote
# ================================================================

@orders_bp.post('/batch')
def batch_orders():
    data = request.get_json(force=True)
    action = data.get('action')
    ids = data.get('ids', [])
    update_data = data.get('updateData') or data.get('data') or {}

    if not action or not ids:
        return jsonify({'error': 'action e ids requeridos'}), 400

    targets = []
    for item_id in ids:
        found = _find_presupuesto(item_id)
        if found and found not in targets:
            targets.append(found)

    count = 0
    for p in targets:
        if action == 'delete':
            db.session.delete(p)
            count += 1
        elif action == 'restore':
            p.deleted_at = None
            count += 1
        elif action == 'update':
            _apply_order_to_presupuesto(p, update_data)
            count += 1

    db.session.commit()
    return jsonify({'success': True, 'count': count})


@orders_bp.get('/<order_id>/messages')
def get_order_messages(order_id):
    target = _find_presupuesto(order_id)
    if not target:
        return jsonify({'error': 'Orden no encontrada'}), 404
    especs = target.especificaciones or {}
    return jsonify({'success': True, 'messages': especs.get('mensajes', [])})


@orders_bp.post('/<order_id>/messages')
def add_order_message(order_id):
    from sqlalchemy.orm.attributes import flag_modified
    target = _find_presupuesto(order_id)
    if not target:
        return jsonify({'error': 'Orden no encontrada'}), 404

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

    especs = dict(target.especificaciones or {})
    mensajes = list(especs.get('mensajes', []))
    mensajes.append(msg_obj)
    especs['mensajes'] = mensajes
    target.especificaciones = especs
    flag_modified(target, 'especificaciones')
    db.session.commit()

    return jsonify({'success': True, 'message': msg_obj, 'messages': mensajes})
