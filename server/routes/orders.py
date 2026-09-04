"""
/api/orders — Puente entre presupuestos (BD/Móvil) y órdenes (Frontend Luxius).

El frontend React de Luxius espera objetos con la interfaz `Order`
(ver src/types/orden.ts). Este módulo traduce la tabla `presupuestos`
al formato que el frontend consume, y viceversa.
"""

from datetime import datetime, timezone, timedelta
from flask import jsonify, request
from models import db, Presupuesto, Cliente, Vendedor
from routes import orders_bp
from middleware.auth import login_required

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
    'relevamiento':     'RECIBIDO',
    'RECIBIDO':         'RECIBIDO',
    'recibido':         'RECIBIDO',
    'diseno':           'borrador',
    'borrador':         'borrador',
    'preorden':         'borrador',
    'orden':            'ORDEN_DE_TRABAJO',
    'ORDEN_DE_TRABAJO': 'ORDEN_DE_TRABAJO',
    'impreso':          'impreso',
    'post':             'post',
    'completo':         'completo',
    'entregado':        'entregado',
    'finalizado':       'entregado',
    'standby':          'standby',
    'anulado':          'cancelado',
    'rebotado':         'rebotado',
    'eliminado':        'cancelado',
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
    t_clean = t_str.upper().replace('OT-', '').replace('-', '')

    all_p = Presupuesto.query.all()

    # 1. Exact UUID match (highest priority, unique primary key)
    for p in all_p:
        p_uuid_str = str(p.id).strip()
        p_uuid_clean = p_uuid_str.upper().replace('-', '')
        if p_uuid_str.lower() == t_str.lower() or p_uuid_clean == t_clean:
            return p

    # 2. Exact OT code match (e.g. OT-65BDB696)
    for p in all_p:
        p_uuid_str = str(p.id).strip()
        ot_code = f"OT-{p_uuid_str[:8].upper()}"
        if ot_code.upper() == t_str.upper() or ot_code.replace('OT-', '').upper() == t_clean:
            return p

    # 3. Exact Virtual Int ID match
    for p in all_p:
        if str(_uuid_to_int(p.id)) == t_str:
            return p

    # 4. Hex Prefix match (at least 6 hex chars) - with collision guard
    if len(t_clean) >= 6:
        prefix_matches = []
        for p in all_p:
            p_uuid_clean = str(p.id).strip().upper().replace('-', '')
            if p_uuid_clean.startswith(t_clean) or (len(t_clean) >= 8 and t_clean.startswith(p_uuid_clean[:8])):
                prefix_matches.append(p)
        if len(prefix_matches) == 1:
            return prefix_matches[0]
        elif len(prefix_matches) > 1:
            print(f"[Warning] Ambiguous order ID prefix '{target_id}': matches {len(prefix_matches)} orders. Rejecting match to prevent accidental overwrite.")
            return None

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
    else:
        cliente_nombre = esp.get('clienteNombre') or p.descripcion or 'Cliente General'

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

    # Direct files from especificaciones['archivos'] and especificaciones['archivosOriginales']
    esp_archivos = esp.get('archivos') or []
    esp_archivos_orig = esp.get('archivosOriginales') or []
    for idx_f, f in enumerate(esp_archivos):
        if f and f not in archivos:
            archivos.append(f)
            orig = esp_archivos_orig[idx_f] if idx_f < len(esp_archivos_orig) else (f.split('/')[-1] if isinstance(f, str) else 'archivo')
            archivos_originales.append(orig)

    mat_code = esp.get('material') or primer_cartel.get('tipo', '')
    mat_display = MATERIAL_LABELS.get(mat_code, mat_code)

    ancho_val = float(esp.get('ancho') or medidas.get('ancho', 0))
    alto_val = float(esp.get('alto') or medidas.get('alto', 0))
    copias_val = int(esp.get('copias') or primer_cartel.get('copias') or len(carteles) or 1)

    # Convert timestamps to Argentina timezone (UTC-3)
    AR_TZ = timezone(timedelta(hours=-3))
    
    created_at_dt = p.created_at
    if created_at_dt:
        if created_at_dt.tzinfo is None:
            created_at_dt = created_at_dt.replace(tzinfo=timezone.utc)
        created_at_ar = created_at_dt.astimezone(AR_TZ)
        created_at_iso = created_at_ar.isoformat()
        fecha_creacion_str = created_at_ar.strftime('%d/%m/%Y %H:%M')
    else:
        created_at_iso = None
        fecha_creacion_str = ''

    updated_at_dt = p.updated_at
    if updated_at_dt:
        if updated_at_dt.tzinfo is None:
            updated_at_dt = updated_at_dt.replace(tzinfo=timezone.utc)
        updated_at_ar = updated_at_dt.astimezone(AR_TZ)
        updated_at_iso = updated_at_ar.isoformat()
    else:
        updated_at_iso = None

    return {
        'id': _uuid_to_int(p.id),
        'uuid': str(p.id),
        'ot': f'OT-{str(p.id)[:8].upper()}',
        'status': status,
        'clientId': p.cliente_id or 0,
        'clienteNombre': cliente_nombre,
        'clientName': cliente_nombre,
        'vendedorId': p.vendedor_id,  # Exponer el vendedorId
        'createdAt': created_at_iso,
        'updatedAt': updated_at_iso,

        # Material specs
        'material': mat_display,
        'calidad': esp.get('calidad', 'Estándar'),
        'alto': alto_val,
        'ancho': ancho_val,
        'copias': copias_val,

        # Financials & Seña
        'subtotal': float(p.subtotal or p.total or 0),
        'total': float(p.total or p.subtotal or 0),
        'sena': float(p.sena_monto or 0),
        'senaMonto': float(p.sena_monto or 0),
        'senaPorcentaje': float(p.sena_porcentaje or 0),
        'senaMetodo': p.sena_metodo or 'pendiente',
        'montoPagado': float(p.monto_pagado or p.sena_monto or 0),
        'saldoPendiente': float(p.saldo_pendiente if p.saldo_pendiente is not None else max(0.0, float(p.total or p.subtotal or 0) - float(p.sena_monto or 0))),
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
        'fechaCreacion': fecha_creacion_str,
        'fechaEntrega': p.fecha_entrega_estimada.strftime('%d/%m/%Y')
                        if p.fecha_entrega_estimada else '',

        # Notes
        'observaciones': p.descripcion or '',
        'observaciones2': esp.get('instruccionesTaller', ''),
        'comments': p.notas or '',

        # Files
        'archivos': archivos,
        'archivosOriginales': archivos_originales,
        'imgMetadata': esp.get('imgMetadata'),
        'servicios': esp.get('servicios', {}),
        'demasiasConfig': esp.get('demasiasConfig', {}),

        # Production
        'maquinaId': None,
        'artistaId': None,

        # Title / Task Name & Batch grouping
        'nombreTarea': esp.get('nombreTarea') or p.descripcion or f"Proyecto OT-{str(p.id)[:8].upper()}",
        'titulo': esp.get('nombreTarea') or p.descripcion or f"Proyecto OT-{str(p.id)[:8].upper()}",
        'batchId': esp.get('batchId') or esp.get('loteId') or (f"lote_{p.cliente_id}_{p.descripcion.split(' - ')[0].strip().lower()}" if (p.descripcion and ' - ' in p.descripcion and len(p.descripcion.split(' - ')[0].strip()) > 2 and not p.descripcion.startswith('Proyecto OT-')) else None),
        'loteNombre': esp.get('loteNombre') or esp.get('batchName') or (p.descripcion.split(' - ')[0].strip() if (p.descripcion and ' - ' in p.descripcion and len(p.descripcion.split(' - ')[0].strip()) > 2 and not p.descripcion.startswith('Proyecto OT-')) else None),
        'descripcionItem': esp.get('descripcionItem') or (p.descripcion.split(' - ', 1)[1].strip() if (p.descripcion and ' - ' in p.descripcion and len(p.descripcion.split(' - ')[0].strip()) > 2 and not p.descripcion.startswith('Proyecto OT-')) else None),

        # Linear roll and pricing info
        'bobinaAsignada': esp.get('bobinaAsignada') or (esp.get('precioDetalle') or {}).get('bobinaAncho'),
        'consumoEstimado': esp.get('consumoEstimado') or (esp.get('precioDetalle') or {}).get('consumoML'),
        'precioMl': esp.get('precioMl') or (esp.get('precioDetalle') or {}).get('precioML'),
        'precioDetalle': esp.get('precioDetalle'),

        # Logistics
        'envio': esp.get('envio', ''),

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

    if 'descripcion' in data and data['descripcion']:
        p.descripcion = data['descripcion']
    elif 'nombreTarea' in data and data['nombreTarea']:
        p.descripcion = data['nombreTarea']

    if 'comments' in data:
        p.notas = data['comments']

    # Semántica PATCH: solo actualizar si la clave fue enviada explícitamente en el payload
    if 'total' in data and data['total'] is not None:
        try:
            p.total = float(data['total'])
        except (ValueError, TypeError):
            pass

    if 'subtotal' in data and data['subtotal'] is not None:
        try:
            p.subtotal = float(data['subtotal'])
        except (ValueError, TypeError):
            pass

    # Synchronize total and subtotal if one is 0 and the other > 0
    if float(p.total or 0) == 0 and float(p.subtotal or 0) > 0:
        p.total = float(p.subtotal)
    elif float(p.subtotal or 0) == 0 and float(p.total or 0) > 0:
        p.subtotal = float(p.total)

    # Seña / Depósito
    if 'sena' in data or 'senaMonto' in data or 'sena_monto' in data:
        try:
            raw_sena = data.get('sena') if data.get('sena') is not None else (data.get('senaMonto') if data.get('senaMonto') is not None else data.get('sena_monto', 0))
            s_val = max(0.0, float(raw_sena or 0))
            p.sena_monto = s_val
            p.monto_pagado = s_val
            tot_ref = float(p.total or p.subtotal or 0)
            p.saldo_pendiente = max(0.0, tot_ref - s_val)
            if tot_ref > 0:
                p.sena_porcentaje = round((s_val / tot_ref) * 100, 2)
        except (ValueError, TypeError):
            pass

    if 'senaMetodo' in data or 'sena_metodo' in data:
        p.sena_metodo = str(data.get('senaMetodo') or data.get('sena_metodo') or 'pendiente')

    if 'senaPorcentaje' in data and data['senaPorcentaje'] is not None:
        try:
            p.sena_porcentaje = float(data['senaPorcentaje'])
        except (ValueError, TypeError):
            pass

    if 'saldoPendiente' in data and data['saldoPendiente'] is not None:
        try:
            p.saldo_pendiente = max(0.0, float(data['saldoPendiente']))
        except (ValueError, TypeError):
            pass

    cid = data.get('clientId') or data.get('clienteId')
    if cid:
        try:
            cid_int = int(cid)
            if cid_int > 0 and db.session.get(Cliente, cid_int):
                p.cliente_id = cid_int
        except (ValueError, TypeError):
            pass

    vid = data.get('vendedorId') or data.get('vendedor_id')
    if vid:
        try:
            vid_int = int(vid)
            if vid_int > 0 and db.session.get(Vendedor, vid_int):
                p.vendedor_id = vid_int
        except (ValueError, TypeError):
            pass

    if 'fechaEntrega' in data and data['fechaEntrega']:
        for fmt in ('%d/%m/%Y', '%Y-%m-%d'):
            try:
                p.fecha_entrega_estimada = datetime.strptime(data['fechaEntrega'], fmt).date()
                break
            except (ValueError, TypeError):
                pass

    from sqlalchemy.orm.attributes import flag_modified
    current_especs = dict(p.especificaciones or {})
    for k in ('carteles', 'archivos', 'archivosOriginales', 'imgMetadata', 'servicios', 'demasiasConfig', 'material', 'calidad', 'alto', 'ancho', 'copias', 'batchId', 'loteId', 'loteNombre', 'descripcionItem', 'nombreTarea', 'bobinaAsignada', 'consumoEstimado', 'precioMl', 'precioDetalle', 'envio', 'sena', 'senaMonto', 'senaMetodo', 'senaPorcentaje', 'saldoPendiente'):
        if k in data:
            current_especs[k] = data[k]

    p.especificaciones = current_especs
    flag_modified(p, 'especificaciones')

    p.updated_at = datetime.now(timezone.utc)


# ================================================================
# GET /api/orders — Listar todas las órdenes
# ================================================================

@orders_bp.get('')
@login_required
def get_orders():
    presupuestos = Presupuesto.query.filter(
        Presupuesto.deleted_at.is_(None)
    ).order_by(Presupuesto.created_at.desc()).all()

    return jsonify([_presupuesto_to_order(p) for p in presupuestos])


# ================================================================
# GET /api/orders/<id> — Obtener una orden por ID
# ================================================================

@orders_bp.get('/<int:order_id>')
@login_required
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
@login_required
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

    # Validar vendedor_id
    vendedor_id = data.get('vendedorId') or data.get('vendedor_id')
    if vendedor_id:
        try:
            vendedor_id = int(vendedor_id)
            if not db.session.get(Vendedor, vendedor_id):
                v = Vendedor.query.first()
                vendedor_id = v.id if v else 1
        except (ValueError, TypeError):
            v = Vendedor.query.first()
            vendedor_id = v.id if v else 1
    else:
        v = Vendedor.query.first()
        vendedor_id = v.id if v else 1

    # Validar cliente_id
    cliente_id = data.get('clientId') or data.get('clienteId')
    if cliente_id:
        try:
            cliente_id = int(cliente_id)
            if cliente_id <= 0 or not db.session.get(Cliente, cliente_id):
                cliente_id = None
        except (ValueError, TypeError):
            cliente_id = None
    else:
        cliente_id = None

    desc = data.get('observaciones') or data.get('nombreTarea') or data.get('titulo') or ''

    tot_val = float(data.get('total') or data.get('subtotal') or 0)
    sub_val = float(data.get('subtotal') or data.get('total') or 0)
    if tot_val == 0 and sub_val > 0:
        tot_val = sub_val
    elif sub_val == 0 and tot_val > 0:
        sub_val = tot_val

    sena_raw = data.get('sena') if data.get('sena') is not None else (data.get('senaMonto') if data.get('senaMonto') is not None else data.get('sena_monto', 0))
    sena_val = max(0.0, float(sena_raw or 0))
    sena_metodo = str(data.get('senaMetodo') or data.get('sena_metodo') or 'pendiente')
    saldo_val = max(0.0, tot_val - sena_val)
    sena_pct = round((sena_val / tot_val * 100), 2) if tot_val > 0 else 0.0

    p = Presupuesto(
        vendedor_id=vendedor_id,
        cliente_id=cliente_id,
        estado=STATUS_TO_ESTADO.get(data.get('status', 'preorden'), 'borrador'),
        descripcion=desc,
        notas=data.get('comments', ''),
        subtotal=sub_val,
        total=tot_val,
        sena_monto=sena_val,
        sena_metodo=sena_metodo,
        sena_porcentaje=sena_pct,
        monto_pagado=sena_val,
        saldo_pendiente=saldo_val,
        origen=data.get('origen', 'web'),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    especs = data.get('especificaciones') or {}
    if data.get('material') or data.get('alto') or data.get('ancho'):
        carteles = especs.get('carteles') or [{
            'tipo': data.get('material', ''),
            'medidas': {
                'ancho': data.get('ancho', 0),
                'alto': data.get('alto', 0),
            },
            'copias': data.get('copias', 1),
            'servicios': data.get('servicios', {}),
            'demasiasConfig': data.get('demasiasConfig', {})
        }]
        especs['carteles'] = carteles

    for k in ('archivos', 'archivosOriginales', 'imgMetadata', 'servicios', 'demasiasConfig', 'material', 'calidad', 'alto', 'ancho', 'copias', 'batchId', 'loteId', 'loteNombre', 'descripcionItem', 'nombreTarea', 'bobinaAsignada', 'consumoEstimado', 'precioMl', 'precioDetalle', 'envio', 'sena', 'senaMonto', 'senaMetodo', 'senaPorcentaje', 'saldoPendiente'):
        if k in data:
            especs[k] = data[k]

    p.especificaciones = especs

    db.session.add(p)
    db.session.commit()

    return jsonify(_presupuesto_to_order(p)), 201


# ================================================================
# PUT /api/orders/<id> — Actualizar una orden existente
# ================================================================

@orders_bp.put('/<order_id>')
@login_required
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
@login_required
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
@login_required
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
@login_required
def get_order_messages(order_id):
    target = _find_presupuesto(order_id)
    if not target:
        return jsonify({'error': 'Orden no encontrada'}), 404
    especs = target.especificaciones or {}
    return jsonify({'success': True, 'messages': especs.get('mensajes', [])})


@orders_bp.post('/<order_id>/messages')
@login_required
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
