import os
import time
import re
import uuid
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
            downloaded_paths = []
            
            if is_folder:
                batch_dir = os.path.join(temp_dir, file_id)
                os.makedirs(batch_dir, exist_ok=True)
                downloaded_paths = gdown.download_folder(url=url, output=batch_dir, quiet=True)
                if not downloaded_paths:
                    return jsonify({"error": "No se pudo descargar la carpeta. Verifique que tenga permisos públicos de lectura ('Cualquiera con el enlace')."}), 403
            else:
                drive_id = _extract_drive_id(url)
                if not drive_id:
                    return jsonify({"error": "Enlace de Google Drive inválido. Copie el enlace completo que contenga /d/ID o id=ID."}), 400
                
                single_dir = os.path.join(temp_dir, file_id)
                os.makedirs(single_dir, exist_ok=True)
                output_target = single_dir + os.sep

                # Download using drive id with gdown
                downloaded_file = gdown.download(id=drive_id, output=output_target, quiet=True)
                
                # Fallback to direct uc?id= URL if needed
                if not downloaded_file or not os.path.exists(str(downloaded_file)):
                    download_url = f'https://drive.google.com/uc?id={drive_id}'
                    downloaded_file = gdown.download(url=download_url, output=output_target, quiet=True)
                
                # If downloaded_file is still not found, check if anything was written to single_dir
                if not downloaded_file or not os.path.exists(str(downloaded_file)):
                    files_in_dir = [os.path.join(single_dir, f) for f in os.listdir(single_dir) if os.path.isfile(os.path.join(single_dir, f))]
                    if files_in_dir:
                        downloaded_file = files_in_dir[0]

                if not downloaded_file or not os.path.exists(str(downloaded_file)):
                    return jsonify({"error": "No se pudo descargar desde Google Drive. Asegúrese de que el archivo esté configurado como 'Cualquier persona con el enlace puede ver'."}), 403
                
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
            return jsonify({"error": "La importación directa de WeTransfer está en desarrollo. Por favor descargue el archivo o use Google Drive."}), 400
            
        else:
            return jsonify({"error": "Proveedor no soportado. Actualmente se soportan enlaces públicos de Google Drive."}), 400
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error procesando la descarga: {str(e)}"}), 500
