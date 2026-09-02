"""
Modulo de Creacion Inteligente de Pedidos con Xana AI (Smart Orders)
Procesa enlaces WeTransfer/Drive o archivos, extrae metadata, aplica heuristica 3D de escalas y cotiza.
"""

import os
import sys
import uuid
import time
import zipfile
import shutil
import socket
import urllib.parse
from urllib.parse import urlparse
import requests
import gdown

from flask import Blueprint, request, jsonify, g
from middleware.auth import login_required, optional_login
from services.dimension_analyzer import analyze_file_dimensions, compute_sha256
from models import db, Cliente, Presupuesto
from concurrent.futures import ThreadPoolExecutor

_R2_EXECUTOR = ThreadPoolExecutor(max_workers=4)

def _bg_r2_upload(local_path, r2_key, ctype):
    try:
        from services.r2_storage import r2_storage
        r2_storage.upload_file(local_path, r2_key, content_type=ctype)
    except Exception as err:
        print(f"[R2 Async Upload Error] {err}", file=sys.stderr)

smart_order_bp = Blueprint('xana_smart_order', __name__, url_prefix='/api/xana/smart-order')


PRIVATE_IP_PREFIXES = ('127.', '10.', '172.16.', '172.17.', '172.18.', '172.19.',
                       '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
                       '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
                       '172.30.', '172.31.', '192.168.', '169.254.', '0.0.0.0')

def is_safe_url(url: str) -> bool:
    """Verifica que la URL no apunte a esquemas inseguros ni a redes internas (Anti-SSRF)."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        if hostname.lower() in ('localhost', '127.0.0.1', 'metadata.google.internal', 'instance-data'):
            return False
        ip = socket.gethostbyname(hostname)
        if any(ip.startswith(prefix) for prefix in PRIVATE_IP_PREFIXES):
            return False
        return True
    except Exception:
        return False

def _extract_drive_id(url: str):
    import re
    m = re.search(r'/d/([a-zA-Z0-9_-]+)', url)
    if m: return m.group(1)
    m = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', url)
    if m: return m.group(1)
    m = re.search(r'/folders/([a-zA-Z0-9_-]+)', url)
    if m: return m.group(1)
    return None

@smart_order_bp.route('', methods=['POST'])
@optional_login
def create_smart_order_draft():
    """
    Ingesta enlaces WeTransfer / Google Drive o archivos, analiza dimensiones y cotiza orden.
    """
    data = request.get_json(force=True, silent=True) or {}
    url = data.get('url', '').strip()
    cliente_input = data.get('cliente', '') or data.get('cliente_nombre', '') or data.get('cliente_id', '')
    material_code = data.get('material', 'VV').upper()
    calidad_code = data.get('calidad', 'ECO').upper()
    copias_default = int(data.get('copias', 1))
    observaciones = data.get('observaciones', '')
    uploaded_files = data.get('files', [])

    from app import UPLOADS_DIR
    temp_dir = os.path.join(UPLOADS_DIR, 'temp_smart_order', str(uuid.uuid4())[:8])
    os.makedirs(temp_dir, exist_ok=True)

    downloaded_files = []

    try:
        # 1. Ingesta de enlaces Cloud
        if url:
            if not is_safe_url(url):
                return jsonify({"error": "La URL proporcionada no es segura o apunta a una dirección IP no permitida (SSRF protection)."}), 403

            # A. GOOGLE DRIVE
            if 'drive.google.com' in url or 'docs.google.com' in url:
                if '/folders/' in url:
                    try:
                        gdown.download_folder(url=url, output=temp_dir, quiet=True)
                    except Exception as gd_f_err:
                        print(f"[Drive Folder Import] gdown folder error: {gd_f_err}")
                else:
                    drive_id = _extract_drive_id(url)
                    if not drive_id:
                        return jsonify({"error": "Enlace de Google Drive inválido. No se pudo extraer el ID del archivo."}), 400
                    
                    dl_file = None
                    try:
                        dl_file = gdown.download(id=drive_id, output=temp_dir + os.sep, quiet=True)
                    except Exception:
                        pass

                    if not dl_file or not os.path.exists(str(dl_file)):
                        try:
                            dl_url = f'https://drive.google.com/uc?id={drive_id}'
                            dl_file = gdown.download(url=dl_url, output=temp_dir + os.sep, quiet=True)
                        except Exception:
                            pass

                    # Fallback directo con requests
                    if not dl_file or not os.path.exists(str(dl_file)):
                        try:
                            s = requests.Session()
                            durl = f"https://drive.google.com/uc?export=download&id={drive_id}"
                            r = s.get(durl, stream=True, timeout=45)
                            cd = r.headers.get('content-disposition', '')
                            out_name = f"drive_{drive_id}.jpg"
                            if 'filename=' in cd:
                                out_name = cd.split('filename=')[-1].strip('"\'; ')
                            out_p = os.path.join(temp_dir, out_name)
                            with open(out_p, 'wb') as f:
                                for chunk in r.iter_content(chunk_size=65536):
                                    if chunk: f.write(chunk)
                        except Exception as req_e:
                            print(f"[Drive Stream Fallback] Error: {req_e}")


            # B. WETRANSFER
            elif 'wetransfer.com' in url or 'we.tl' in url:
                from routes.cloud_import import resolve_wetransfer
                direct_link = resolve_wetransfer(url)
                if not direct_link:
                    return jsonify({"error": "No se pudo resolver el enlace de WeTransfer. Verifique que no haya expirado."}), 400
                
                r = requests.get(direct_link, stream=True, timeout=180)
                if not r.ok:
                    return jsonify({"error": f"Error al descargar de WeTransfer (HTTP {r.status_code})"}), 400

                wt_zip = os.path.join(temp_dir, f"wt_{int(time.time())}.zip")
                with open(wt_zip, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=65536):
                        if chunk: f.write(chunk)

                if zipfile.is_zipfile(wt_zip):
                    with zipfile.ZipFile(wt_zip, 'r') as zf:
                        for m in zf.infolist():
                            if not m.is_dir() and not m.filename.startswith(('__MACOSX', '.')):
                                zf.extract(m, temp_dir)
                    try: os.remove(wt_zip)
                    except Exception: pass

            # Recolectar todos los archivos descargados y descomprimir ZIPs anidados
            for root, _, fnames in os.walk(temp_dir):
                for fn in fnames:
                    fp = os.path.join(root, fn)
                    if zipfile.is_zipfile(fp) and not fn.startswith('.'):
                        try:
                            with zipfile.ZipFile(fp, 'r') as inner_zf:
                                inner_zf.extractall(root)
                            os.remove(fp)
                        except Exception: pass

            for root, _, fnames in os.walk(temp_dir):
                for fn in fnames:
                    fp = os.path.join(root, fn)
                    if os.path.isfile(fp) and not fn.startswith(('.', '__MACOSX')):
                        downloaded_files.append(fp)

        # C. ARCHIVOS YA SUBIDOS PREVIAMENTE
        elif uploaded_files:
            for uf in uploaded_files:
                fname = (uf.get('fileName') or uf.get('filename')) if isinstance(uf, dict) else str(uf)
                if fname:
                    clean_fname = os.path.basename(fname)
                    local_p = os.path.join(UPLOADS_DIR, clean_fname)
                    if os.path.isfile(local_p):
                        downloaded_files.append(local_p)


        if not downloaded_files:
            return jsonify({"error": "No se encontraron archivos válidos para procesar."}), 400

        # 2. Analisis Tecnico de cada archivo y subida a R2
        parsed_items = []
        archivos_finales = []
        archivos_originales = []
        notas_adjuntas = []

        total_consumo_ml = 0.0
        total_m2 = 0.0

        GRAPHIC_EXTS = {'.jpg', '.jpeg', '.png', '.tif', '.tiff', '.pdf', '.bmp', '.psd', '.eps', '.ai', '.cdr', '.webp'}
        TEXT_EXTS = {'.txt', '.nfo', '.md', '.log'}

        for fpath in downloaded_files:
            orig_name = os.path.basename(fpath)
            ext = os.path.splitext(orig_name)[1].lower() or '.jpg'
            
            # Si es archivo de texto (ej: metros.txt o instrucciones), extraer texto
            if ext in TEXT_EXTS:
                try:
                    with open(fpath, 'r', encoding='utf-8', errors='ignore') as tf:
                        content = tf.read().strip()
                        if content:
                            notas_adjuntas.append(f"[{orig_name}]: {content}")
                except Exception:
                    pass
                continue

            # Omitir archivos no graficos
            if ext not in GRAPHIC_EXTS and ext not in ('.jpg', '.png', '.pdf'):
                continue

            # Ancla de Verdad: Checksum SHA-256 en Punto de Entrada
            sha256_anchor = compute_sha256(fpath)
            
            # Mover a UPLOADS_DIR con nombre unico
            unique_name = f"{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}_{orig_name}"
            final_dest = os.path.join(UPLOADS_DIR, unique_name)
            shutil.copy2(fpath, final_dest)
            
            # Subir a Cloudflare R2 en segundo plano (Non-blocking)
            try:
                import mimetypes
                ctype = mimetypes.guess_type(final_dest)[0] or 'application/octet-stream'
                _R2_EXECUTOR.submit(_bg_r2_upload, final_dest, f"uploads/{unique_name}", ctype)
            except Exception as r2_err:
                print(f"[R2 Smart Order Upload] {r2_err}", file=sys.stderr)


            # Analizar dimensiones y heuristica 3D
            meta = analyze_file_dimensions(final_dest, material_code=material_code, custom_filename=orig_name)
            meta['sha256'] = sha256_anchor


            ancho_m = meta['final_width_cm'] / 100.0
            alto_m = meta['final_height_cm'] / 100.0
            item_copias = copias_default

            # Calculo de consumo lineal
            item_ml = max(ancho_m, alto_m) * item_copias
            item_m2 = ancho_m * alto_m * item_copias

            total_consumo_ml += item_ml
            total_m2 += item_m2

            cartel_dict = {
                "tipo": material_code,
                "copias": item_copias,
                "medidas": {
                    "ancho": meta['final_width_cm'] / 100.0,
                    "alto": meta['final_height_cm'] / 100.0
                },
                "raw_medidas": {
                    "ancho": meta['raw_width_cm'] / 100.0,
                    "alto": meta['raw_height_cm'] / 100.0
                },
                "bobinaAsignada": meta['assignedBobina'],
                "demasiasConfig": {"top": False, "left": False, "right": False, "bottom": False},
                "servicios": {},
                "consumoEstimado": round(item_ml, 2),
                "m2Estimado": round(item_m2, 2),
                "originalName": orig_name,
                "fileName": unique_name,
                "fileUrl": f"/uploads/{unique_name}",
                "thumbnailUrl": meta.get('thumbnailUrl') or f"/uploads/{unique_name}",
                "dpi": meta['dpi'],
                "colorMode": meta['colorMode'],
                "format": meta['format'],
                "scaleFactor": meta['scaleFactor'],
                "scaleAlert": meta['scaleAlert'],
                "scaleReason": meta['scaleReason'],
                "sha256": sha256_anchor
            }

            parsed_items.append(cartel_dict)
            archivos_finales.append(unique_name)
            archivos_originales.append(orig_name)
            
            # Liberar memoria de imagen de forma inmediata (Zero OOM)
            import gc
            gc.collect()


        if not parsed_items:
            return jsonify({"error": "No se encontraron piezas gráficas válidas (PDF, JPG, PNG, TIF) en el enlace."}), 400

        # Unificar notas
        if notas_adjuntas:
            nota_str = "\n".join(notas_adjuntas)
            observaciones = f"{observaciones}\n{nota_str}".strip() if observaciones else nota_str

        # 3. Resolucion Inteligente de Cliente y Tarifas
        cliente_id = None
        cliente_nombre = "CLIENTE GENERAL"
        precio_ml_base = 22000.0  # Tarifa base general

        if cliente_input:
            if isinstance(cliente_input, int) or (isinstance(cliente_input, str) and cliente_input.isdigit()):
                c = db.session.get(Cliente, int(cliente_input))
                if c:
                    cliente_id = c.id
                    cliente_nombre = c.nombre
            else:
                c = Cliente.query.filter(Cliente.nombre.ilike(f"%{str(cliente_input).strip()}%")).first()
                if c:
                    cliente_id = c.id
                    cliente_nombre = c.nombre

        # Si aún no se encontró cliente, intentar deducirlo de los nombres de archivo (ej: "mader hilux")
        if not cliente_id and archivos_originales:
            first_word = archivos_originales[0].replace('_', ' ').replace('-', ' ').split()[0]
            if len(first_word) >= 3:
                c_match = Cliente.query.filter(Cliente.nombre.ilike(f"%{first_word}%")).first()
                if c_match:
                    cliente_id = c_match.id
                    cliente_nombre = c_match.nombre


        # Ajuste de precio segun material
        material_prices = {
            'VV': 22000.0,
            'VBB': 24000.0,
            'LONA': 19500.0,
            'MICRO': 25000.0,
            'LF-13': 22000.0
        }
        precio_ml = material_prices.get(material_code, precio_ml_base)
        costo_base = round(total_consumo_ml * precio_ml, 2)

        draft_order = {
            "cliente_id": cliente_id,
            "cliente_nombre": cliente_nombre,
            "descripcion": f"Orden {cliente_nombre} - {len(parsed_items)} Piezas ({material_code} {calidad_code})",
            "material": material_code,
            "calidad": calidad_code,
            "copias": copias_default,
            "ancho": parsed_items[0]['medidas']['ancho'] if parsed_items else 1.0,
            "alto": parsed_items[0]['medidas']['alto'] if parsed_items else 1.0,
            "archivos": archivos_finales,
            "archivosOriginales": archivos_originales,
            "carteles": parsed_items,
            "bobinaAsignada": parsed_items[0]['bobinaAsignada'] if parsed_items else 1.37,
            "consumoEstimado": round(total_consumo_ml, 2),
            "totalM2": round(total_m2, 2),
            "precioMl": precio_ml,
            "total": costo_base,
            "observaciones": observaciones,
            "imgMetadata": {
                "dpi": parsed_items[0]['dpi'] if parsed_items else 72,
                "colorMode": parsed_items[0]['colorMode'] if parsed_items else 'RGB',
                "format": parsed_items[0]['format'] if parsed_items else 'JPG',
                "thumbnailUrl": parsed_items[0]['thumbnailUrl'] if parsed_items else None
            }
        }

        return jsonify({
            "status": "success",
            "draft_order": draft_order
        }), 200

    except Exception as e:
        print(f"[Smart Order Error] {e}", file=sys.stderr)
        return jsonify({"error": f"Error al generar el borrador inteligente: {str(e)}"}), 500
    finally:
        if os.path.exists(temp_dir):
            try: shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception: pass

@smart_order_bp.route('/confirm', methods=['POST'])
@login_required
def confirm_smart_order():
    """
    Guarda de forma definitiva la orden creada por Xana en la base de datos PostgreSQL.
    """
    data = request.get_json(force=True, silent=True) or {}
    
    try:
        nueva_orden = Presupuesto(
            id=str(uuid.uuid4()),
            cliente_id=data.get('cliente_id'),
            descripcion=data.get('descripcion', 'Nueva Orden Xana Smart'),
            estado='orden',
            total=data.get('total', 0.0),
            observaciones=data.get('observaciones', ''),
            especificaciones={
                "material": data.get('material', 'VV'),
                "calidad": data.get('calidad', 'ECO'),
                "copias": data.get('copias', 1),
                "ancho": data.get('ancho', 1.0),
                "alto": data.get('alto', 1.0),
                "archivos": data.get('archivos', []),
                "archivosOriginales": data.get('archivosOriginales', []),
                "carteles": data.get('carteles', []),
                "bobinaAsignada": data.get('bobinaAsignada', 1.37),
                "consumoEstimado": data.get('consumoEstimado', 0.0),
                "precioMl": data.get('precioMl', 22000.0),
                "imgMetadata": data.get('imgMetadata', {})
            }
        )

        db.session.add(nueva_orden)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Orden creada exitosamente y enviada a Producción.",
            "order": nueva_orden.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"[Confirm Smart Order Error] {e}", file=sys.stderr)
        return jsonify({"error": f"Error guardando la orden: {str(e)}"}), 500
