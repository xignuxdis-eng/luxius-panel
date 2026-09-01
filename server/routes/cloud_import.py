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
from middleware.auth import optional_login
from routes.google_drive import get_valid_access_token

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

@import_bp.route('', methods=['POST'])
@optional_login
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
            downloaded_paths = []
            oauth_token = get_valid_access_token()
            drive_id = _extract_drive_id(url)

            if is_folder:
                batch_dir = os.path.join(temp_dir, file_id)
                os.makedirs(batch_dir, exist_ok=True)
                
                # 1. Try Authenticated Google Drive API for corporate account
                if oauth_token and drive_id:
                    try:
                        q_url = f"https://www.googleapis.com/drive/v3/files?q='{drive_id}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size)"
                        f_res = requests.get(q_url, headers={'Authorization': f'Bearer {oauth_token}'}, timeout=20)
                        if f_res.status_code == 200:
                            items = f_res.json().get('files', [])
                            for it in items:
                                it_id = it.get('id')
                                it_name = it.get('name', f"item_{it_id}")
                                it_mime = it.get('mimeType', '')
                                
                                if it_mime == 'application/vnd.google-apps.folder':
                                    continue
                                
                                target_path = os.path.join(batch_dir, it_name)
                                if it_mime.startswith('application/vnd.google-apps.'):
                                    # Export Google Docs/Sheets as PDF
                                    target_path = os.path.join(batch_dir, f"{os.path.splitext(it_name)[0]}.pdf")
                                    dl_url = f"https://www.googleapis.com/drive/v3/files/{it_id}/export?mimeType=application/pdf"
                                else:
                                    dl_url = f"https://www.googleapis.com/drive/v3/files/{it_id}?alt=media"
                                
                                r_dl = requests.get(dl_url, headers={'Authorization': f'Bearer {oauth_token}'}, stream=True, timeout=45)
                                if r_dl.status_code == 200:
                                    with open(target_path, 'wb') as f_out:
                                        for chunk in r_dl.iter_content(chunk_size=65536):
                                            if chunk:
                                                f_out.write(chunk)
                                    if os.path.exists(target_path) and os.path.getsize(target_path) > 0:
                                        downloaded_paths.append(target_path)
                    except Exception as e_f:
                        print(f"[Drive Import] OAuth folder download notice: {e_f}")

                # 2. Fallback to gdown folder download
                if not downloaded_paths:
                    downloaded_paths = gdown.download_folder(url=url, output=batch_dir, quiet=True)
                
                if not downloaded_paths:
                    return jsonify({"error": "No se pudo descargar la carpeta de Drive. Verifique que la cuenta de la empresa tenga permisos de lectura o que el enlace sea público."}), 403
            else:
                if not drive_id:
                    return jsonify({"error": "Enlace de Google Drive inválido. Copie el enlace completo que contenga /d/ID o id=ID."}), 400
                
                single_dir = os.path.join(temp_dir, file_id)
                os.makedirs(single_dir, exist_ok=True)
                downloaded_file = None

                # 1. Try Authenticated Google Drive API with corporate account
                if oauth_token:
                    try:
                        m_url = f"https://www.googleapis.com/drive/v3/files/{drive_id}?fields=id,name,mimeType,size"
                        meta_res = requests.get(m_url, headers={'Authorization': f'Bearer {oauth_token}'}, timeout=15)
                        if meta_res.status_code == 200:
                            f_info = meta_res.json()
                            f_name = f_info.get('name', 'archivo_drive')
                            f_mime = f_info.get('mimeType', '')
                            
                            target_p = os.path.join(single_dir, f_name)
                            if f_mime.startswith('application/vnd.google-apps.'):
                                target_p = os.path.join(single_dir, f"{os.path.splitext(f_name)[0]}.pdf")
                                dl_url = f"https://www.googleapis.com/drive/v3/files/{drive_id}/export?mimeType=application/pdf"
                            else:
                                dl_url = f"https://www.googleapis.com/drive/v3/files/{drive_id}?alt=media"

                            dl_res = requests.get(dl_url, headers={'Authorization': f'Bearer {oauth_token}'}, stream=True, timeout=60)
                            if dl_res.status_code == 200:
                                with open(target_p, 'wb') as f_out:
                                    for chunk in dl_res.iter_content(chunk_size=65536):
                                        if chunk:
                                            f_out.write(chunk)
                                if os.path.exists(target_p) and os.path.getsize(target_p) > 0:
                                    downloaded_file = target_p
                    except Exception as e_oa:
                        print(f"[Drive Import] OAuth single file download notice: {e_oa}")

                # 2. Fallback to gdown (for public links or non-auth files)
                output_target = single_dir + os.sep
                if not downloaded_file or not os.path.exists(str(downloaded_file)):
                    try:
                        downloaded_file = gdown.download(id=drive_id, output=output_target, quiet=True, fuzzy=True)
                    except Exception as gd_err:
                        print(f"[Drive Import] gdown id download notice: {gd_err}")
                        downloaded_file = None
                
                # 3. Fallback to direct uc?id= URL
                if not downloaded_file or not os.path.exists(str(downloaded_file)):
                    try:
                        download_url = f'https://drive.google.com/uc?id={drive_id}'
                        downloaded_file = gdown.download(url=download_url, output=output_target, quiet=True, fuzzy=True)
                    except Exception as gd_err2:
                        print(f"[Drive Import] gdown url download notice: {gd_err2}")
                        downloaded_file = None
                
                # 4. Fallback to direct requests stream
                if not downloaded_file or not os.path.exists(str(downloaded_file)):
                    try:
                        session = requests.Session()
                        direct_url = f"https://drive.google.com/uc?export=download&id={drive_id}"
                        r = session.get(direct_url, stream=True, timeout=25)
                        confirm_token = None
                        for k, v in r.cookies.items():
                            if k.startswith('download_warning'):
                                confirm_token = v
                        if confirm_token:
                            direct_url = f"https://drive.google.com/uc?export=download&confirm={confirm_token}&id={drive_id}"
                            r = session.get(direct_url, stream=True, timeout=25)
                        
                        if r.status_code == 200 and 'text/html' not in r.headers.get('Content-Type', ''):
                            out_name = "archivo_drive"
                            cd = r.headers.get('content-disposition', '')
                            if 'filename=' in cd:
                                out_name = cd.split('filename=')[-1].strip('"\'; ')
                            out_p = os.path.join(single_dir, out_name)
                            with open(out_p, 'wb') as f:
                                for chunk in r.iter_content(chunk_size=32768):
                                    if chunk:
                                        f.write(chunk)
                            if os.path.exists(out_p) and os.path.getsize(out_p) > 0:
                                downloaded_file = out_p
                    except Exception as req_e:
                        print(f"[Drive Import] requests stream fallback error: {req_e}")

                # Check if single_dir has any file
                if not downloaded_file or not os.path.exists(str(downloaded_file)):
                    files_in_dir = [os.path.join(single_dir, f) for f in os.listdir(single_dir) if os.path.isfile(os.path.join(single_dir, f))]
                    if files_in_dir:
                        downloaded_file = files_in_dir[0]

                if not downloaded_file or not os.path.exists(str(downloaded_file)):
                    return jsonify({"error": "No se pudo descargar desde Google Drive. Asegúrese de que el archivo esté compartido con la cuenta de la empresa o que el enlace sea público ('Cualquier persona con el enlace')."}), 403
                
                downloaded_paths = [str(downloaded_file)]


                
            processed_files = []
            
            for path in downloaded_paths:
                if not os.path.isfile(path):
                    continue
                original_filename = os.path.basename(path)
                # If gdown created temporary download name, keep a clean filename
                if original_filename.startswith(f"{file_id}_download"):
                    original_filename = "archivo_drive"
                
                _, ext = os.path.splitext(original_filename)
                if not ext:
                    ext = ".pdf"  # Fallback standard extension
                    
                unique_filename = f"cloud_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}{ext}"
                final_path = os.path.join(UPLOADS_DIR, unique_filename)
                
                os.replace(path, final_path)
                file_size = os.path.getsize(final_path)
                
                processed_files.append({
                    "fileName": unique_filename,
                    "originalName": original_filename if original_filename != "archivo_drive" else f"archivo_drive{ext}",
                    "fileSize": file_size,
                    "tempUrl": f"/uploads/{unique_filename}"
                })
                
            if not processed_files:
                return jsonify({"error": "No se encontraron archivos válidos en la descarga de Google Drive."}), 400
                
            return jsonify({
                "status": "success",
                "files": processed_files
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
