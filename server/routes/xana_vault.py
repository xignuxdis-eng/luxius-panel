"""
Drive Vault — Sincronización Nocturna de Órdenes y Remitos a Google Drive
----------------------------------------------------------------------
* Ejecuta en background (cron nocturno) o bajo demanda
* Sube PDFs de presupuestos/remitos a carpeta estructurada en Google Drive
* Metadatos en JSON para búsqueda semántica futura
* Estructura: /XignuX Vault/{AÑO}/{MES}/{TIPO}/
"""

import os
import sys
import json
import time
import uuid
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from middleware.auth import login_required, admin_required
from models import db, Presupuesto, Cliente
from concurrent.futures import ThreadPoolExecutor

# Google Drive API
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2 import service_account

_VAULT_EXECUTOR = ThreadPoolExecutor(max_workers=2)

vault_bp = Blueprint('xana_vault', __name__, url_prefix='/api/xana/vault')

# Estado de jobs
_VAULT_JOBS = {}  # { job_id: { "status": "processing"|"success"|"error", "progress": str, "stats": dict, "error": str, "created_at": float } }

VAULT_ROOT_FOLDER_NAME = "XignuX Vault"
MAX_FILES_PER_SYNC = 500  # Límite de seguridad por corrida


def _get_drive_service():
    """Inicializa y retorna el servicio de la API v3 de Google Drive usando Service Account."""
    scopes = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
    
    # Leer credenciales de variables de entorno (Render) o archivo
    service_account_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    service_account_file = os.environ.get('GOOGLE_SERVICE_ACCOUNT_FILE', 'google_service_account.json')
    
    if service_account_json:
        info = json.loads(service_account_json)
        creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
    elif os.path.exists(service_account_file):
        creds = service_account.Credentials.from_service_account_file(service_account_file, scopes=scopes)
    else:
        raise FileNotFoundError(
            f"No se encontró credencial de Google Drive (Revisar {service_account_file} o GOOGLE_SERVICE_ACCOUNT_JSON)"
        )
    
    return build('drive', 'v3', credentials=creds)


def _get_or_create_folder(drive_service, folder_name, parent_id=None):
    """Busca una carpeta por nombre en un padre dado; si no existe, la crea. Retorna folder_id."""
    # Escape single quotes for query
    safe_name = folder_name.replace("'", "\\'")
    query = f"name='{safe_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_id:
        query += f" and '{parent_id}' in parents"
    
    results = drive_service.files().list(
        q=query,
        fields="files(id,name)",
        spaces='drive'
    ).execute()
    
    folders = results.get('files', [])
    if folders:
        return folders[0]['id']
    
    # Crear carpeta
    file_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    if parent_id:
        file_metadata['parents'] = [parent_id]
    
    created = drive_service.files().create(
        body=file_metadata,
        fields='id'
    ).execute()
    
    return created.get('id')


def _cleanup_old_jobs():
    now = time.time()
    for jid in list(_VAULT_JOBS.keys()):
        if now - _VAULT_JOBS[jid].get('created_at', now) > 7200:  # 2 horas TTL
            _VAULT_JOBS.pop(jid, None)


def _execute_vault_sync(job_id: str, since_days: int = 1, only_type: str = None, dry_run: bool = False):
    """
    Ejecuta la sincronización a Google Drive.
    since_days: sincronizar órdenes de los últimos N días (1=día anterior, 7=semana, etc.)
    only_type: 'orden' | 'remito' | None (ambos)
    dry_run: solo simular, no subir
    """
    try:
        _VAULT_JOBS[job_id] = {
            "status": "processing",
            "progress": "Iniciando sincronización Drive Vault...",
            "stats": {"processed": 0, "uploaded": 0, "skipped": 0, "errors": 0},
            "created_at": time.time()
        }

        # 1. Conectar a Google Drive
        _VAULT_JOBS[job_id]["progress"] = "Conectando a Google Drive..."
        drive_service = _get_drive_service()

        # 2. Obtener/crear carpeta raíz del Vault
        _VAULT_JOBS[job_id]["progress"] = "Preparando estructura de carpetas en Drive..."
        vault_root_id = _get_or_create_folder(drive_service, VAULT_ROOT_FOLDER_NAME)

        # 3. Consultar órdenes a sincronizar
        cutoff_date = datetime.now() - timedelta(days=since_days)
        
        query = Presupuesto.query.filter(Presupuesto.fecha_creacion >= cutoff_date)
        
        if only_type:
            query = query.filter(Presupuesto.estado == only_type)
        else:
            # Solo órdenes y remitos (excluir borradores, etc.)
            query = query.filter(Presupuesto.estado.in_(['orden', 'remito', 'facturado', 'entregado']))

        ordenes = query.order_by(Presupuesto.fecha_creacion.desc()).limit(MAX_FILES_PER_SYNC).all()
        
        _VAULT_JOBS[job_id]["progress"] = f"Encontradas {len(ordenes)} órdenes para sincronizar..."
        _VAULT_JOBS[job_id]["stats"]["total_found"] = len(ordenes)

        if not ordenes:
            _VAULT_JOBS[job_id] = {
                "status": "success",
                "progress": "No hay órdenes nuevas para sincronizar.",
                "stats": _VAULT_JOBS[job_id]["stats"],
                "created_at": _VAULT_JOBS[job_id]["created_at"]
            }
            return

        # 4. Procesar cada orden
        import tempfile
        from utils.generatePdfBudget import generatePdfBudget
        
        # Importar dentro de la función para evitar circular imports
        from flask import current_app
        with current_app.app_context():
            for idx, orden in enumerate(ordenes):
                if _VAULT_JOBS[job_id].get("status") == "cancelled":
                    break

                try:
                    _VAULT_JOBS[job_id]["progress"] = f"Procesando {idx+1}/{len(ordenes)}: {orden.numero_presupuesto or orden.id[:8]}"
                    
                    # Determinar tipo y carpeta destino
                    tipo = orden.estado if orden.estado in ('orden', 'remito') else 'documento'
                    year_folder = datetime.now().strftime('%Y')
                    month_folder = datetime.now().strftime('%m')
                    
                    # Crear estructura: /XignuX Vault/2026/09/orden/
                    year_id = _get_or_create_folder(drive_service, year_folder, parent_id=vault_root_id)
                    month_id = _get_or_create_folder(drive_service, month_folder, parent_id=year_id)
                    tipo_id = _get_or_create_folder(drive_service, tipo, parent_id=month_id)
                    
                    # Cliente folder opcional
                    cliente_folder_id = tipo_id
                    if orden.cliente:
                        safe_cliente = "".join(c for c in orden.cliente.nombre if c.isalnum() or c in (' ', '-', '_')).strip()[:50]
                        if safe_cliente:
                            cliente_folder_id = _get_or_create_folder(drive_service, safe_cliente, parent_id=tipo_id)

                    # Generar PDF
                    _VAULT_JOBS[job_id]["progress"] = f"Generando PDF para {orden.numero_presupuesto or orden.id[:8]}..."
                    
                    # Preparar datos para el generador de PDF
                    orden_data = orden.to_dict()
                    # Asegurar campos necesarios
                    if 'carteles' not in orden_data:
                        orden_data['carteles'] = orden_data.get('especificaciones', {}).get('carteles', [])
                    
                    # Generar PDF (usar modo simplificado para vault)
                    pdf_bytes = generatePdfBudget(orden_data, mode='simplificado')
                    
                    if not pdf_bytes:
                        _VAULT_JOBS[job_id]["stats"]["errors"] += 1
                        continue

                    # Nombre de archivo
                    timestamp = orden.fecha_creacion.strftime('%Y%m%d_%H%M') if orden.fecha_creacion else datetime.now().strftime('%Y%m%d_%H%M')
                    cliente_nombre = orden.cliente.nombre if orden.cliente else 'SIN_CLIENTE'
                    safe_cliente = "".join(c for c in cliente_nombre if c.isalnum() or c in (' ', '-', '_')).strip()[:30]
                    filename = f"{tipo}_{timestamp}_{safe_cliente}_{orden.numero_presupuesto or orden.id[:8]}.pdf"

                    if not dry_run:
                        # Subir a Drive
                        _VAULT_JOBS[job_id]["progress"] = f"Subiendo {filename} a Drive..."
                        
                        # Guardar temporalmente
                        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                            tmp.write(pdf_bytes)
                            tmp_path = tmp.name
                        
                        try:
                            file_metadata = {
                                'name': filename,
                                'parents': [cliente_folder_id]
                            }
                            
                            media = MediaFileUpload(tmp_path, mimetype='application/pdf', resumable=True)
                            uploaded_file = drive_service.files().create(
                                body=file_metadata,
                                media_body=media,
                                fields='id,webViewLink,name,size'
                            ).execute()
                            
                            # Asignar permisos de lectura general
                            try:
                                file_id = uploaded_file.get('id')
                                drive_service.permissions().create(
                                    fileId=file_id,
                                    body={'type': 'anyone', 'role': 'reader'}
                                ).execute()
                            except Exception as perm_err:
                                print(f"[Vault Sync] Warning: No se pudo establecer permiso público: {perm_err}", file=sys.stderr)
                            
                            # Subir metadata JSON asociado
                            meta = {
                                "orden_id": orden.id,
                                "numero_presupuesto": orden.numero_presupuesto,
                                "cliente_id": orden.cliente_id,
                                "cliente_nombre": cliente_nombre,
                                "tipo": tipo,
                                "estado": orden.estado,
                                "total": float(orden.total or 0),
                                "fecha_creacion": orden.fecha_creacion.isoformat() if orden.fecha_creacion else None,
                                "fecha_sync": datetime.now().isoformat(),
                                "drive_file_id": uploaded_file.get('id'),
                                "drive_link": uploaded_file.get('webViewLink'),
                                "especificaciones": orden_data.get('especificaciones', {})
                            }
                            
                            meta_filename = filename.replace('.pdf', '_meta.json')
                            meta_bytes = json.dumps(meta, ensure_ascii=False, indent=2).encode('utf-8')
                            
                            with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as tmp_meta:
                                tmp_meta.write(meta_bytes)
                                tmp_meta_path = tmp_meta.name
                            
                            meta_media = MediaFileUpload(tmp_meta_path, mimetype='application/json', resumable=True)
                            drive_service.files().create(
                                body={'name': meta_filename, 'parents': [cliente_folder_id]},
                                media_body=meta_media,
                                fields='id'
                            ).execute()
                            
                            os.unlink(tmp_meta_path)
                            
                            _VAULT_JOBS[job_id]["stats"]["uploaded"] += 1
                            
                        finally:
                            if os.path.exists(tmp_path):
                                os.unlink(tmp_path)
                    else:
                        _VAULT_JOBS[job_id]["stats"]["skipped"] += 1

                    _VAULT_JOBS[job_id]["stats"]["processed"] += 1

                except Exception as e:
                    print(f"[Vault Sync Error] Orden {orden.id}: {e}", file=sys.stderr)
                    _VAULT_JOBS[job_id]["stats"]["errors"] += 1
                    _VAULT_JOBS[job_id]["stats"]["processed"] += 1

        # Finalizado
        _VAULT_JOBS[job_id] = {
            "status": "success" if _VAULT_JOBS[job_id]["stats"]["errors"] == 0 else "partial",
            "progress": f"Completado: {_VAULT_JOBS[job_id]['stats']['uploaded']} subidos, {_VAULT_JOBS[job_id]['stats']['skipped']} simulados, {_VAULT_JOBS[job_id]['stats']['errors']} errores",
            "stats": _VAULT_JOBS[job_id]["stats"],
            "created_at": _VAULT_JOBS[job_id]["created_at"]
        }

    except Exception as err:
        print(f"[Vault Sync Fatal Error] {err}", file=sys.stderr)
        _VAULT_JOBS[job_id] = {
            "status": "error",
            "error": str(err),
            "stats": _VAULT_JOBS[job_id].get("stats", {}),
            "created_at": _VAULT_JOBS[job_id].get("created_at", time.time())
        }


@vault_bp.route('/sync', methods=['POST'])
@login_required
def start_vault_sync():
    """
    Inicia sincronización nocturna/manual a Google Drive.
    Body: { "since_days": 1, "only_type": "orden|remito|null", "dry_run": false }
    Retorna 202 con job_id para polling.
    """
    _cleanup_old_jobs()
    
    data = request.get_json(force=True, silent=True) or {}
    since_days = int(data.get('since_days', 1))
    only_type = data.get('only_type')
    dry_run = bool(data.get('dry_run', False))
    
    if since_days < 1 or since_days > 365:
        return jsonify({"error": "since_days debe estar entre 1 y 365"}), 400
    
    if only_type and only_type not in ('orden', 'remito'):
        return jsonify({"error": "only_type debe ser 'orden', 'remito' o null"}), 400

    job_id = uuid.uuid4().hex[:8]
    _VAULT_JOBS[job_id] = {
        "status": "processing",
        "progress": "Iniciando sincronización Drive Vault...",
        "stats": {"processed": 0, "uploaded": 0, "skipped": 0, "errors": 0},
        "params": {"since_days": since_days, "only_type": only_type, "dry_run": dry_run},
        "created_at": time.time()
    }

    _VAULT_EXECUTOR.submit(_execute_vault_sync, job_id, since_days, only_type, dry_run)

    return jsonify({
        "status": "processing",
        "job_id": job_id,
        "message": "Sincronización Drive Vault iniciada en segundo plano."
    }), 202


@vault_bp.route('/sync/status/<job_id>', methods=['GET'])
@login_required
def get_vault_sync_status(job_id):
    """Polling para estado de sincronización."""
    job = _VAULT_JOBS.get(job_id)
    if not job:
        return jsonify({"error": "Job no encontrado o expirado."}), 404
    return jsonify(job), 200


@vault_bp.route('/sync/cancel/<job_id>', methods=['POST'])
@login_required
def cancel_vault_sync(job_id):
    """Cancela una sincronización en curso."""
    job = _VAULT_JOBS.get(job_id)
    if not job:
        return jsonify({"error": "Job no encontrado."}), 404
    
    if job["status"] == "processing":
        job["status"] = "cancelled"
        return jsonify({"status": "cancelled", "message": "Sincronización cancelada."}), 200
    
    return jsonify({"error": f"No se puede cancelar job en estado {job['status']}"}), 400


@vault_bp.route('/structure', methods=['GET'])
@login_required
def get_vault_structure():
    """Obtiene la estructura de carpetas del Vault en Drive (solo lectura, no sube nada)."""
    try:
        drive_service = _get_drive_service()
        
        # Buscar carpeta raíz
        results = drive_service.files().list(
            q=f"name='{VAULT_ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields="files(id,name)",
            spaces='drive'
        ).execute()
        
        folders = results.get('files', [])
        if not folders:
            return jsonify({"exists": False, "message": "Vault no inicializado en Drive"}), 200
        
        vault_root_id = folders[0]['id']
        
        # Listar años
        years = drive_service.files().list(
            q=f"'{vault_root_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields="files(id,name)",
            orderBy="name desc",
            spaces='drive'
        ).execute()
        
        structure = {"exists": True, "root_id": vault_root_id, "years": []}
        
        for year_folder in years.get('files', []):
            year_data = {"name": year_folder['name'], "id": year_folder['id'], "months": []}
            
            months = drive_service.files().list(
                q=f"'{year_folder['id']}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
                fields="files(id,name)",
                orderBy="name desc",
                spaces='drive'
            ).execute()
            
            for month_folder in months.get('files', []):
                month_data = {"name": month_folder['name'], "id": month_folder['id'], "types": []}
                
                types = drive_service.files().list(
                    q=f"'{month_folder['id']}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
                    fields="files(id,name)",
                    spaces='drive'
                ).execute()
                
                for type_folder in types.get('files', []):
                    # Contar archivos en esta carpeta
                    files_count = drive_service.files().list(
                        q=f"'{type_folder['id']}' in parents and trashed=false",
                        fields="files(id,name,mimeType,size,createdTime)",
                        spaces='drive'
                    ).execute()
                    
                    pdf_count = sum(1 for f in files_count.get('files', []) if f.get('mimeType') == 'application/pdf')
                    json_count = sum(1 for f in files_count.get('files', []) if f.get('mimeType') == 'application/json')
                    
                    month_data["types"].append({
                        "name": type_folder['name'],
                        "id": type_folder['id'],
                        "pdf_count": pdf_count,
                        "meta_count": json_count
                    })
                
                year_data["months"].append(month_data)
            
            structure["years"].append(year_data)
        
        return jsonify(structure), 200
        
    except Exception as e:
        print(f"[Vault Structure Error] {e}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500


@vault_bp.route('/config', methods=['GET'])
@login_required
def get_vault_config():
    """Configuración del Vault para el frontend."""
    return jsonify({
        "root_folder": VAULT_ROOT_FOLDER_NAME,
        "max_files_per_sync": MAX_FILES_PER_SYNC,
        "supported_types": ["orden", "remito"],
        "drive_configured": bool(os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON') or os.environ.get('GOOGLE_SERVICE_ACCOUNT_FILE'))
    }), 200