"""
Rutas API para el Escalador Inteligente de Imágenes (Real-ESRGAN / Super-Resolución)
POST /api/upscaler/process — Procesa una imagen con Real-ESRGAN (o fallback Lanczos-3)
GET  /api/upscaler/status  — Estado y disponibilidad del motor Vulkan GPU y modelos
"""

import os
import sys
import io
import time
import base64
import urllib.request
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from middleware.auth import login_required, operator_required
from models import db, Presupuesto
from services.upscaler_service import upscale_image, get_engine_status, calculate_dpi

upscaler_bp = Blueprint('upscaler', __name__, url_prefix='/api/upscaler')


@upscaler_bp.get('/status')
def upscaler_status():
    """Retorna la disponibilidad del motor Vulkan GPU y los modelos neuronales soportados."""
    try:
        status = get_engine_status()
        return jsonify({
            'success': True,
            'status': status
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def _fetch_image_bytes(image_url):
    """Obtiene la imagen: si es de nuestro /uploads se lee local/R2; si es externa,
    se descarga con validación anti-SSRF en cada redirección."""
    from urllib.parse import unquote, urljoin
    if '/uploads/' in image_url or image_url.startswith('uploads/'):
        name = unquote(image_url.split('/uploads/')[-1] if '/uploads/' in image_url else image_url[len('uploads/'):]).split('?')[0]
        if not name or '..' in name or name.startswith('/') or '\\' in name:
            raise ValueError('Nombre de archivo inválido')
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
        local_path = os.path.join(uploads_dir, name)
        if os.path.isfile(local_path):
            with open(local_path, 'rb') as fh:
                return fh.read()
        from services.r2_storage import r2_storage
        for key in (f"uploads/{name}", f"thumbnails/{name}", name):
            try:
                obj = r2_storage.client.get_object(Bucket=r2_storage.bucket_name, Key=key)
                return obj['Body'].read()
            except Exception:
                continue
        raise FileNotFoundError('Archivo no encontrado en uploads/R2')

    import requests as _rq
    from services.security_utils import is_safe_url
    current = image_url
    for _ in range(6):
        if not is_safe_url(current):
            raise ValueError('URL no permitida')
        resp = _rq.get(current, timeout=30, allow_redirects=False,
                       headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        if resp.status_code in (301, 302, 303, 307, 308) and resp.headers.get('Location'):
            current = urljoin(current, resp.headers['Location'])
            continue
        resp.raise_for_status()
        if len(resp.content) > 80 * 1024 * 1024:
            raise ValueError('Imagen demasiado grande')
        return resp.content
    raise ValueError('Demasiadas redirecciones')


@upscaler_bp.post('/process')
@operator_required
def process_upscale():
    """
    Escala una imagen mediante IA (Real-ESRGAN x4plus o x4plus-anime).
    Acepta subida multipart (campo 'file' o 'image') o JSON ({ 'imageUrl', 'orderId', 'scale', 'model' }).
    """
    scale = 4
    model_name = 'realesrgan-x4plus'
    order_id = None
    replace_in_order = False
    save_as_secondary = False
    image_bytes = None
    original_filename = "imagen.png"

    # 1. Extraer entrada (Multipart o JSON)
    if request.content_type and 'multipart/form-data' in request.content_type:
        uploaded_file = request.files.get('file') or request.files.get('image')
        if not uploaded_file:
            return jsonify({'success': False, 'error': 'No se adjuntó ningún archivo'}), 400
        
        image_bytes = uploaded_file.read()
        original_filename = uploaded_file.filename or "imagen.png"
        scale = int(request.form.get('scale', 4))
        model_name = request.form.get('model', 'realesrgan-x4plus')
        order_id = request.form.get('orderId')
        replace_in_order = request.form.get('replaceInOrder', 'false').lower() in ('true', '1')
        save_as_secondary = request.form.get('saveAsSecondary', 'false').lower() in ('true', '1')
    else:
        data = request.get_json(force=True, silent=True) or {}
        image_url = data.get('imageUrl')
        scale = int(data.get('scale', 4))
        model_name = data.get('model', 'realesrgan-x4plus')
        order_id = data.get('orderId')
        replace_in_order = bool(data.get('replaceInOrder', False))
        save_as_secondary = bool(data.get('saveAsSecondary', False))

        if not image_url:
            return jsonify({'success': False, 'error': 'imageUrl o archivo requerido'}), 400

        # Si viene en Base64 directamente
        if image_url.startswith('data:image'):
            try:
                header, encoded = image_url.split(',', 1)
                image_bytes = base64.b64decode(encoded)
            except Exception as e:
                return jsonify({'success': False, 'error': f'Error decodificando Base64: {e}'}), 400
        else:
            # Descargar de nuestro /uploads (local/R2) o de URL externa validada
            try:
                image_bytes = _fetch_image_bytes(image_url)
                original_filename = os.path.basename(image_url.split('?')[0])
            except Exception as e:
                return jsonify({'success': False, 'error': f'No se pudo descargar la imagen original: {e}'}), 400

    if not image_bytes:
        return jsonify({'success': False, 'error': 'Imagen vacía o ilegible'}), 400

    # 2. Ejecutar Super-Resolución
    result = upscale_image(
        image_bytes=image_bytes,
        scale=scale,
        model_name=model_name
    )

    if not result.get('ok'):
        return jsonify({'success': False, 'error': result.get('error', 'Fallo al procesar la imagen')}), 500

    upscaled_bytes = result['image_bytes']
    b64_data = base64.b64encode(upscaled_bytes).decode('utf-8')
    data_url = f"data:image/png;base64,{b64_data}"
    
    file_url = None
    r2_uploaded = False

    # 3. Subir a Cloudflare R2 si está configurado o si se asocia a una orden
    base_name, _ = os.path.splitext(original_filename)
    timestamp_ms = int(time.time() * 1000)
    target_key = f"uploads/{timestamp_ms}_{base_name}_upscaled_{scale}x.png"

    try:
        from services.r2_storage import CloudflareR2Storage
        r2 = CloudflareR2Storage()
        upload_res = r2.upload_file(
            file_path_or_stream=io.BytesIO(upscaled_bytes),
            object_name=target_key,
            content_type='image/png'
        )
        if upload_res.get('success'):
            file_url = upload_res.get('url')
            r2_uploaded = True
    except Exception as r2_err:
        print(f"[Upscaler R2 Upload Exception]: {r2_err}", file=sys.stderr)

    # Si R2 no está disponible en entorno local, fallback a URL relativa o dataUrl
    if not file_url:
        file_url = data_url

    # 4. Vincular a la Orden de Trabajo si corresponde
    order_updated = False
    if order_id and (replace_in_order or save_as_secondary):
        try:
            # Buscar orden en PostgreSQL
            order_row = Presupuesto.query.filter_by(id=order_id).first()
            if order_row:
                specs = dict(order_row.especificaciones or {})
                archivos = list(specs.get('archivos') or [])
                
                if replace_in_order:
                    # Guardar anterior en archivos_previos
                    if archivos:
                        previos = list(specs.get('archivos_previos') or [])
                        previos.append(archivos[0])
                        specs['archivos_previos'] = previos
                        archivos[0] = file_url
                    else:
                        archivos.append(file_url)
                elif save_as_secondary:
                    archivos.append(file_url)

                specs['archivos'] = archivos
                
                # Asentar nota en historial
                historial = list(specs.get('historial') or [])
                historial.append({
                    'fecha': datetime.now(timezone.utc).isoformat(),
                    'accion': 'ESCALADO_IA',
                    'detalle': f"Super-Resolución Real-ESRGAN {scale}x ({model_name}) aplicada. Nueva resolución: {result['upscaled_dims']['width']}x{result['upscaled_dims']['height']} px."
                })
                specs['historial'] = historial

                order_row.especificaciones = specs
                db.session.commit()
                order_updated = True
        except Exception as db_err:
            db.session.rollback()
            print(f"[Upscaler Order Update Error]: {db_err}", file=sys.stderr)

    return jsonify({
        'success': True,
        'engine': result.get('engine'),
        'scale': scale,
        'model': model_name,
        'originalDims': result.get('original_dims'),
        'upscaledDims': result.get('upscaled_dims'),
        'elapsedMs': result.get('elapsed_ms'),
        'dataUrl': data_url,
        'fileUrl': file_url,
        'r2Uploaded': r2_uploaded,
        'orderUpdated': order_updated
    }), 200
