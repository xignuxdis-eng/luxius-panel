import os
import sys
import shutil
import time
import re
import uuid
import requests
import zipfile
import urllib.parse
import gdown
from flask import request, jsonify
from routes import import_bp
from middleware.auth import login_required

def _extract_drive_id(url: str):
    # Match standard drive link format /d/<id>
    match = re.search(r'/d/([a-zA-Z0-9_-]+)', url)
    if match:
        return match.group(1)
    
    # Match id= format
    match = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', url)
    if match:
        return match.group(1)

    # Match /file/d/<id> or /folders/<id>
    match = re.search(r'/folders/([a-zA-Z0-9_-]+)', url)
    if match:
        return match.group(1)
        
    return None

@import_bp.route('/file', methods=['GET', 'OPTIONS'])
def stream_cloud_file():
    """Stream an individual Google Drive file on-demand with chunking to avoid memory spikes."""
    if request.method == 'OPTIONS':
        from flask import Response
        res = Response()
        res.headers['Access-Control-Allow-Origin'] = '*'
        res.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        res.headers['Access-Control-Allow-Headers'] = '*'
        return res

    drive_id = request.args.get('id', '').strip()
    file_name = request.args.get('name', 'archivo').strip()
    
    if not drive_id:
        return jsonify({"error": "Falta el identificador del archivo"}), 400

    safe_name = os.path.basename(file_name) or "archivo"

    # Attempt 1: Direct stream from Google Drive uc export
    try:
        session = requests.Session()
        direct_url = f"https://drive.google.com/uc?export=download&id={drive_id}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': '*/*'
        }
        r = session.get(direct_url, stream=True, headers=headers, timeout=35)
        
        # Check for virus warning confirm token
        confirm_token = None
        for k, v in r.cookies.items():
            if k.startswith('download_warning'):
                confirm_token = v
                break
        
        if not confirm_token and 'text/html' in r.headers.get('Content-Type', ''):
            m = re.search(r'confirm=([0-9A-Za-z_-]+)', r.text)
            if m:
                confirm_token = m.group(1)
                
        if confirm_token:
            direct_url = f"https://drive.google.com/uc?export=download&confirm={confirm_token}&id={drive_id}"
            r = session.get(direct_url, stream=True, headers=headers, timeout=35)
            
        if r.status_code == 200 and 'text/html' not in r.headers.get('Content-Type', ''):
            cd = r.headers.get('Content-Disposition', '')
            if 'filename=' in cd:
                extracted = cd.split('filename=')[-1].strip('"\'; ')
                if extracted:
                    safe_name = extracted
            
            content_type = r.headers.get('Content-Type', 'application/octet-stream')
            content_length = r.headers.get('Content-Length')

            def generate():
                for chunk in r.iter_content(chunk_size=65536):
                    if chunk:
                        yield chunk

            from flask import Response, stream_with_context
            res = Response(stream_with_context(generate()), status=200, content_type=content_type)
            res.headers['Content-Disposition'] = f'inline; filename="{urllib.parse.quote(safe_name)}"'
            res.headers['Access-Control-Allow-Origin'] = '*'
            res.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
            res.headers['Access-Control-Allow-Headers'] = '*'
            if content_length:
                res.headers['Content-Length'] = content_length
            return res
    except Exception as stream_err:
        print(f"[CloudImport] Direct stream failed for {drive_id}, fallback to gdown: {stream_err}")

    # Attempt 2: Fallback to gdown download
    try:
        from app import UPLOADS_DIR
        temp_dir = os.path.join(UPLOADS_DIR, 'temp_cloud')
        os.makedirs(temp_dir, exist_ok=True)
        temp_target = os.path.join(temp_dir, f"gd_{drive_id}_{safe_name}")
        if not os.path.exists(temp_target):
            gdown.download(id=drive_id, output=temp_target, quiet=True)
            
        if os.path.exists(temp_target):
            from flask import send_file
            res = send_file(temp_target, as_attachment=False, download_name=safe_name)
            res.headers['Access-Control-Allow-Origin'] = '*'
            return res
    except Exception as gd_err:
        print(f"[CloudImport] gdown fallback error for {drive_id}: {gd_err}")

    return jsonify({"error": "No se pudo descargar el archivo desde Google Drive."}), 500


@import_bp.route('', methods=['POST'])
@login_required
def import_from_cloud():
    data = request.get_json(force=True, silent=True) or {}
    url = data.get('url', '').strip()
    
    if not url:
        return jsonify({"error": "No se proporcionó ningún enlace URL"}), 400
        
    try:
        from app import UPLOADS_DIR
        temp_dir = os.path.join(UPLOADS_DIR, 'temp_cloud')
        os.makedirs(temp_dir, exist_ok=True)
        
        file_id = str(uuid.uuid4())[:8]
        
        # Detect Google Drive
        if 'drive.google.com' in url or 'docs.google.com' in url:
            is_folder = '/folders/' in url
            
            if is_folder:
                # Fast folder discovery without synchronous mass-downloading (<1s)
                try:
                    folder_items = gdown.download_folder(url=url, skip_download=True, quiet=True)
                except Exception as fd_err:
                    print(f"[Drive Import] gdown folder discovery error: {fd_err}")
                    folder_items = []
                
                if not folder_items:
                    return jsonify({"error": "No se pudo leer la carpeta de Google Drive. Verifique que tenga permisos públicos de lectura ('Cualquier persona con el enlace')."}), 403
                
                processed_files = []
                for item in folder_items:
                    if getattr(item, 'id', None) is None:
                        continue
                        
                    raw_filename = os.path.basename(getattr(item, 'path', ''))
                    if not raw_filename or raw_filename.startswith('.') or raw_filename.lower() == 'desktop.ini':
                        continue
                    
                    encoded_name = urllib.parse.quote(raw_filename)
                    processed_files.append({
                        "fileName": raw_filename,
                        "originalName": raw_filename,
                        "fileSize": 0,
                        "tempUrl": f"/api/import-cloud/file?id={item.id}&name={encoded_name}",
                        "driveId": item.id
                    })
                
                if not processed_files:
                    return jsonify({"error": "No se encontraron archivos válidos en la carpeta de Google Drive."}), 400
                
                return jsonify({
                    "status": "success",
                    "files": processed_files
                }), 200
                
            else:
                # Single Google Drive file (<0.5s discovery)
                drive_id = _extract_drive_id(url)
                if not drive_id:
                    return jsonify({"error": "Enlace de Google Drive inválido. Copie el enlace completo que contenga /d/ID o id=ID."}), 400
                
                safe_name = "archivo_drive"
                file_size = 0
                try:
                    session = requests.Session()
                    r_head = session.get(f"https://drive.google.com/uc?export=download&id={drive_id}", stream=True, timeout=15)
                    cd = r_head.headers.get('Content-Disposition', '')
                    if 'filename=' in cd:
                        safe_name = cd.split('filename=')[-1].strip('"\'; ')
                    file_size = int(r_head.headers.get('Content-Length') or 0)
                    r_head.close()
                except Exception as e:
                    print(f"[Drive Import] Single file metadata warning: {e}")
                
                encoded_name = urllib.parse.quote(safe_name)
                return jsonify({
                    "status": "success",
                    "files": [{
                        "fileName": safe_name,
                        "originalName": safe_name,
                        "fileSize": file_size,
                        "tempUrl": f"/api/import-cloud/file?id={drive_id}&name={encoded_name}",
                        "driveId": drive_id
                    }]
                }), 200
            
        elif 'we.tl' in url or 'wetransfer.com' in url:
            import zipfile
            import requests
            from urllib.parse import unquote, urlparse

            wt_dir = os.path.join(temp_dir, f"wt_{file_id}")
            os.makedirs(wt_dir, exist_ok=True)
            
            # Helper to resolve WeTransfer direct download link
            def resolve_wetransfer(raw_url):
                clean_url = raw_url.strip()
                if not clean_url.startswith('http'):
                    clean_url = 'https://' + clean_url
                    
                s = requests.Session()
                s.headers.update({
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                })
                
                # 1. Follow shortlink redirects
                try:
                    resp = s.get(clean_url, allow_redirects=True, timeout=25)
                    final_url = resp.url
                except Exception as req_e:
                    print(f"[WeTransfer] Initial request failed: {req_e}")
                    return None

                # 2. Extract CSRF token
                csrf_token = None
                m_csrf = re.search(r'name="csrf-token"\s+content="([^"]+)"', resp.text)
                if m_csrf:
                    csrf_token = m_csrf.group(1)
                else:
                    m2 = re.search(r'"csrfToken":\s*"([^"]+)"', resp.text)
                    if m2:
                        csrf_token = m2.group(1)
                    else:
                        try:
                            r_main = s.get("https://wetransfer.com/", timeout=10)
                            m3 = re.search(r'name="csrf-token"\s+content="([^"]+)"', r_main.text)
                            if m3: csrf_token = m3.group(1)
                        except Exception:
                            pass

                # 3. Extract transfer_id and security_hash from path or HTML
                parsed = urlparse(final_url)
                path_parts = [p for p in parsed.path.split('/') if p]
                
                transfer_id = None
                security_hash = None
                recipient_id = None
                
                if 'downloads' in path_parts:
                    idx = path_parts.index('downloads')
                    remaining = path_parts[idx+1:]
                    if len(remaining) >= 2:
                        transfer_id = remaining[0]
                        if len(remaining) == 2:
                            security_hash = remaining[1]
                        elif len(remaining) >= 3:
                            recipient_id = remaining[1]
                            security_hash = remaining[2]

                if not transfer_id or not security_hash:
                    m_trans = re.search(r'"transfer_id":\s*"([^"]+)"', resp.text)
                    m_hash = re.search(r'"security_hash":\s*"([^"]+)"', resp.text)
                    if m_trans: transfer_id = m_trans.group(1)
                    if m_hash: security_hash = m_hash.group(1)

                # Fallback to transferwee library if available
                if not transfer_id or not security_hash:
                    try:
                        from transferwee import transferwee as tw
                        return tw.download_url(clean_url)
                    except Exception as tw_e:
                        print(f"[WeTransfer] transferwee fallback failed: {tw_e}")
                        return None

                # 4. Request direct download link from WeTransfer API
                download_api_url = f"https://wetransfer.com/api/v4/transfers/{transfer_id}/download"
                api_headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    'Referer': final_url,
                    'Origin': 'https://wetransfer.com',
                    'x-requested-with': 'XMLHttpRequest'
                }
                if csrf_token:
                    api_headers['x-csrf-token'] = csrf_token

                payload = {
                    "intent": "entire_transfer",
                    "security_hash": security_hash
                }
                if recipient_id:
                    payload["recipient_id"] = recipient_id

                try:
                    api_resp = s.post(download_api_url, json=payload, headers=api_headers, timeout=20)
                    if api_resp.ok:
                        data = api_resp.json()
                        return data.get('direct_link')
                except Exception as api_e:
                    print(f"[WeTransfer] API post error: {api_e}")

                return None

            direct_link = resolve_wetransfer(url)
            if not direct_link:
                return jsonify({"error": "No se pudo obtener el enlace de descarga de WeTransfer. Verifique que la transferencia no haya expirado y que el enlace sea válido."}), 400

            # 2. Download file with stream
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
            r = requests.get(direct_link, stream=True, headers=headers, timeout=180)
            if not r.ok:
                return jsonify({"error": f"Error descargando archivo de WeTransfer (HTTP {r.status_code})"}), 400

            # Determine filename from Content-Disposition header or URL path
            cd = r.headers.get('content-disposition', '')
            filename_match = re.search(r'filename\*?=(?:UTF-8\'\')?["\']?([^"\';]+)["\']?', cd, re.I)
            if filename_match:
                wt_filename = unquote(filename_match.group(1).strip())
            else:
                wt_filename = unquote(urlparse(direct_link).path.split('/')[-1]) or f"wetransfer_{file_id}"

            downloaded_zip_or_file = os.path.join(wt_dir, wt_filename)
            with open(downloaded_zip_or_file, 'wb') as f:
                for chunk in r.iter_content(chunk_size=64 * 1024):
                    if chunk:
                        f.write(chunk)

            downloaded_paths = []
            # Check if it is a zip archive
            if zipfile.is_zipfile(downloaded_zip_or_file):
                with zipfile.ZipFile(downloaded_zip_or_file, 'r') as zf:
                    for member in zf.infolist():
                        if member.is_dir() or member.filename.startswith('__MACOSX') or member.filename.startswith('.'):
                            continue
                        extracted_path = zf.extract(member, wt_dir)
                        downloaded_paths.append(extracted_path)
            else:
                downloaded_paths.append(downloaded_zip_or_file)

            processed_files = []
            for path in downloaded_paths:
                if not os.path.isfile(path):
                    continue
                original_filename = os.path.basename(path)
                _, ext = os.path.splitext(original_filename)
                if not ext:
                    ext = ".pdf"
                    
                unique_filename = f"cloud_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}{ext}"
                final_path = os.path.join(UPLOADS_DIR, unique_filename)
                
                os.replace(path, final_path)
                file_size = os.path.getsize(final_path)
                
                processed_files.append({
                    "fileName": unique_filename,
                    "originalName": original_filename,
                    "fileSize": file_size,
                    "tempUrl": f"/uploads/{unique_filename}"
                })

            if not processed_files:
                return jsonify({"error": "No se encontraron archivos válidos en la transferencia de WeTransfer."}), 400

            return jsonify({
                "status": "success",
                "files": processed_files
            }), 200
            
        else:
            return jsonify({"error": "El enlace proporcionado no es compatible. Ingrese un enlace válido de Google Drive o WeTransfer."}), 400
            
    except Exception as e:
        print(f"[Cloud Import Error] {str(e)}", file=sys.stderr)
        return jsonify({"error": f"Error procesando la importación: {str(e)}"}), 500
        
    finally:
        # Cleanup temporary scratch files
        if os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception as ce:
                print(f"[Cloud Import Cleanup Error] {ce}", file=sys.stderr)
