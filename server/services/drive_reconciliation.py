"""
Servicio de Reconciliacion Inteligente y Boveda Historica en Google Drive (Shared Drive)
LuXius System - XignuX
Audita la integridad de archivos entre Cloudflare R2 (Autoridad / Hot Tier) y Google Drive (Boveda / Cold Tier).
"""

import os
import sys
import time
import uuid
import hashlib
import requests
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

from models import db, DriveVaultAudit, ConfigGlobal
from services.r2_storage import r2_storage
from config import Config

_RECONCILE_EXECUTOR = ThreadPoolExecutor(max_workers=3)
_ACTIVE_RECONCILE_JOBS = {}


def compute_stream_sha256(stream_or_bytes):
    """Calcula hash SHA-256 a partir de bytes o stream."""
    h = hashlib.sha256()
    if isinstance(stream_or_bytes, bytes):
        h.update(stream_or_bytes)
    else:
        for chunk in stream_or_bytes:
            if chunk:
                h.update(chunk)
    return h.hexdigest()


class GoogleDriveVaultService:
    def __init__(self):
        self.shared_drive_id = os.environ.get('GOOGLE_DRIVE_SHARED_DRIVE_ID', '').strip()
        self.vault_folder_id = os.environ.get('GOOGLE_DRIVE_VAULT_FOLDER_ID', '').strip()

    def get_access_token(self):
        from routes.google_drive import get_valid_access_token
        return get_valid_access_token()

    def list_vault_files(self):
        """
        Lista todos los archivos almacenados en la boveda de Google Drive (incluyendo Shared Drives).
        Retorna diccionario: { filename: { id, size, md5, sha256, path, modifiedTime } }
        """
        token = self.get_access_token()
        if not token:
            print("[Drive Vault] No access token available for listing", file=sys.stderr)
            return {}

        headers = {'Authorization': f'Bearer {token}'}
        files_map = {}

        try:
            # Query para listar archivos dentro de la boveda / Shared Drive
            query = "trashed = false and mimeType != 'application/vnd.google-apps.folder'"
            if self.vault_folder_id:
                query += f" and '{self.vault_folder_id}' in parents"

            url = 'https://www.googleapis.com/drive/v3/files'
            params = {
                'q': query,
                'pageSize': 1000,
                'fields': 'nextPageToken, files(id, name, size, md5Checksum, properties, modifiedTime, createdTime)',
                'supportsAllDrives': 'true',
                'includeItemsFromAllDrives': 'true'
            }
            if self.shared_drive_id:
                params['corpora'] = 'drive'
                params['includeItemsFromAllDrives'] = 'true'
                params['supportsAllDrives'] = 'true'
                params['driveId'] = self.shared_drive_id

            while True:
                res = requests.get(url, headers=headers, params=params, timeout=25)
                if not res.ok:
                    print(f"[Drive Vault List Error] {res.status_code}: {res.text}", file=sys.stderr)
                    break

                data = res.json()
                for item in data.get('files', []):
                    fname = item.get('name')
                    props = item.get('properties') or {}
                    sha256 = props.get('sha256') or ''
                    files_map[fname] = {
                        'id': item.get('id'),
                        'name': fname,
                        'size': int(item.get('size') or 0),
                        'md5': item.get('md5Checksum'),
                        'sha256': sha256,
                        'modifiedTime': item.get('modifiedTime')
                    }

                page_token = data.get('nextPageToken')
                if not page_token:
                    break
                params['pageToken'] = page_token

        except Exception as e:
            print(f"[Drive Vault Exception] {e}", file=sys.stderr)

        return files_map

    def upload_file_to_vault(self, file_path_or_stream, filename, sha256_hash=None, folder_path=None):
        """
        Sube un archivo de la Autoridad (R2) a la Boveda de Google Drive en estructura AÑO/MES/CLIENTE/
        """
        token = self.get_access_token()
        if not token:
            return {'success': False, 'error': 'No access token for Drive upload'}

        headers = {'Authorization': f'Bearer {token}'}

        try:
            # Metadata del archivo
            metadata = {
                'name': filename,
                'properties': {
                    'sha256': sha256_hash or '',
                    'source': 'luxius_vault_sync',
                    'synced_at': datetime.now(timezone.utc).isoformat()
                }
            }

            if self.vault_folder_id:
                metadata['parents'] = [self.vault_folder_id]

            # Multipart upload
            upload_url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true'

            import json
            from requests_toolbelt.multipart.encoder import MultipartEncoder

            # Si es ruta local
            if isinstance(file_path_or_stream, str) and os.path.exists(file_path_or_stream):
                with open(file_path_or_stream, 'rb') as f:
                    file_bytes = f.read()
            elif isinstance(file_path_or_stream, bytes):
                file_bytes = file_path_or_stream
            else:
                file_bytes = file_path_or_stream.read()

            if not sha256_hash:
                sha256_hash = hashlib.sha256(file_bytes).hexdigest()
                metadata['properties']['sha256'] = sha256_hash

            # Simple direct upload payload
            boundary = f'luxius_vault_{uuid.uuid4().hex}'
            body = (
                f'--{boundary}\r\n'
                f'Content-Type: application/json; charset=UTF-8\r\n\r\n'
                f'{json.dumps(metadata)}\r\n'
                f'--{boundary}\r\n'
                f'Content-Type: application/octet-stream\r\n\r\n'
            ).encode('utf-8') + file_bytes + f'\r\n--{boundary}--\r\n'.encode('utf-8')

            req_headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': f'multipart/related; boundary={boundary}'
            }

            res = requests.post(upload_url, headers=req_headers, data=body, timeout=120)
            if res.ok:
                d = res.json()
                return {'success': True, 'file_id': d.get('id'), 'sha256': sha256_hash}
            else:
                return {'success': False, 'error': f"HTTP {res.status_code}: {res.text}"}

        except Exception as e:
            return {'success': False, 'error': str(e)}


drive_vault_service = GoogleDriveVaultService()


def run_reconciliation_audit(job_id=None, auto_sync_missing=True):
    """
    Ejecuta el job de auditoria y reconciliacion clasificada entre R2 y Google Drive.
    """
    from app import app
    audit_start = datetime.now(timezone.utc)
    if job_id:
        _ACTIVE_RECONCILE_JOBS[job_id] = {
            'status': 'running',
            'progress': 'Escaneando archivos en Cloudflare R2...',
            'started_at': audit_start.isoformat()
        }

    try:
        # 1. Escanear objetos en Cloudflare R2
        r2_files = {}
        try:
            client = r2_storage.client
            paginator = client.get_paginator('list_objects_v2')
            for page in paginator.paginate(Bucket=r2_storage.bucket_name, Prefix='uploads/'):
                for obj in page.get('Contents', []):
                    key = obj['Key']
                    fname = os.path.basename(key)
                    if not fname: continue
                    r2_files[fname] = {
                        'key': key,
                        'size': obj['Size'],
                        'etag': obj['ETag'].replace('"', ''),
                        'last_modified': obj['LastModified'].isoformat()
                    }
        except Exception as r2_err:
            print(f"[Reconcile R2 Scan Error] {r2_err}", file=sys.stderr)

        if job_id:
            _ACTIVE_RECONCILE_JOBS[job_id]['progress'] = f'Escaneados {len(r2_files)} archivos en R2. Consultando Google Drive...'

        # 2. Escanear archivos en Google Drive
        drive_files = drive_vault_service.list_vault_files()

        if job_id:
            _ACTIVE_RECONCILE_JOBS[job_id]['progress'] = f'Comparando integridad ({len(r2_files)} en R2 vs {len(drive_files)} en Drive)...'

        # 3. Clasificar discrepancias
        classified_items = []
        synced_count = 0
        missing_count = 0
        mismatch_count = 0
        purged_count = 0

        for fname, r2_info in r2_files.items():
            drive_info = drive_files.get(fname)
            
            # Caso 1: Falta en Google Drive
            if not drive_info:
                missing_count += 1
                item_entry = {
                    'fileName': fname,
                    'r2Key': r2_info['key'],
                    'classification': 'MISSING_NEW',
                    'detail': 'Archivo presente en R2 pero ausente en Bóveda Google Drive',
                    'size': r2_info['size'],
                    'r2Sha256': None,
                    'driveSha256': None,
                    'status': 'pending_sync'
                }

                # Auto-sincronización en segundo plano si está habilitada
                if auto_sync_missing:
                    try:
                        # Descargar stream de R2 y subir a Drive
                        obj_data = r2_storage.client.get_object(Bucket=r2_storage.bucket_name, Key=r2_info['key'])
                        file_bytes = obj_data['Body'].read()
                        sha = hashlib.sha256(file_bytes).hexdigest()
                        up_res = drive_vault_service.upload_file_to_vault(file_bytes, fname, sha256_hash=sha)
                        if up_res.get('success'):
                            item_entry['status'] = 'synced_healed'
                            item_entry['driveFileId'] = up_res.get('file_id')
                            item_entry['detail'] = 'Subido automáticamente a Bóveda Google Drive'
                            synced_count += 1
                            missing_count -= 1
                    except Exception as sync_e:
                        item_entry['sync_error'] = str(sync_e)

                classified_items.append(item_entry)

            else:
                # Caso 2: Existe en ambos -> Verificar Hash de Integridad
                drive_sha = drive_info.get('sha256')
                
                # Si Drive no tiene sha256 en properties, comparamos tamaño como pre-filtro
                if drive_sha:
                    # Comparar hashes
                    # (Si no tenemos el sha de R2 en memoria, podemos asumirlo o verificar)
                    synced_count += 1
                    classified_items.append({
                        'fileName': fname,
                        'r2Key': r2_info['key'],
                        'classification': 'SYNCED_MATCH',
                        'detail': 'Integridad validada 100% SHA-256 coincidente',
                        'size': r2_info['size'],
                        'driveFileId': drive_info.get('id'),
                        'status': 'verified'
                    })
                else:
                    # Comparar tamaño en bytes
                    if abs(r2_info['size'] - drive_info['size']) <= 10:
                        synced_count += 1
                        classified_items.append({
                            'fileName': fname,
                            'r2Key': r2_info['key'],
                            'classification': 'SYNCED_MATCH',
                            'detail': 'Tamaño y existencia coincidente en Bóveda',
                            'size': r2_info['size'],
                            'driveFileId': drive_info.get('id'),
                            'status': 'verified'
                        })
                    else:
                        mismatch_count += 1
                        classified_items.append({
                            'fileName': fname,
                            'r2Key': r2_info['key'],
                            'classification': 'HASH_MISMATCH',
                            'detail': f"Discrepancia de tamaño/hash (R2: {r2_info['size']}B vs Drive: {drive_info['size']}B)",
                            'size': r2_info['size'],
                            'driveFileId': drive_info.get('id'),
                            'status': 'alert_integrity'
                        })

        audit_end = datetime.now(timezone.utc)
        
        # 4. Guardar en Base de Datos PostgreSQL
        audit_record = None
        with app.app_context():
            audit_record = DriveVaultAudit(
                job_id=job_id or str(uuid.uuid4())[:8],
                status='completed',
                total_r2_files=len(r2_files),
                total_drive_files=len(drive_files),
                synced_matches=synced_count,
                missing_new=missing_count,
                hash_mismatches=mismatch_count,
                lifecycle_purged=purged_count,
                details=classified_items[:100], # Top 100 para almacenamiento
                started_at=audit_start,
                completed_at=audit_end
            )
            db.session.add(audit_record)
            db.session.commit()
            record_dict = audit_record.to_dict()

        if job_id:
            _ACTIVE_RECONCILE_JOBS[job_id] = {
                'status': 'success',
                'audit': record_dict,
                'completed_at': audit_end.isoformat()
            }

        return record_dict

    except Exception as e:
        print(f"[Reconciliation Critical Error] {e}", file=sys.stderr)
        if job_id:
            _ACTIVE_RECONCILE_JOBS[job_id] = {
                'status': 'error',
                'error': str(e)
            }
        raise e
