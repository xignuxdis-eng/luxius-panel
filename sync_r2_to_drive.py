#!/usr/bin/env python3
"""
Script de Migración y Depuración Automatizada: Cloudflare R2 -> Google Drive -> PostgreSQL

Autor: LuXius AI System
Descripción:
    1. Examina objetos en el bucket de Cloudflare R2 con antigüedad superior a DIAS_ANTIGUEDAD (por defecto 5 días).
    2. Descarga el archivo a memoria/buffer y lo sube a una carpeta de Google Drive vía Service Account.
    3. Actualiza el registro correspondiente en la base de datos PostgreSQL.
    4. Elimina de forma segura el objeto original en Cloudflare R2 ÚNICAMENTE tras confirmar la subida a Drive y actualización en BD.
    5. Registra logs detallados en la consola y en 'r2_migration.log'.
"""

import os
import sys
import io
import json
import logging
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

# Configuración de Logging (Consola + Archivo)
log_filename = "r2_migration.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_filename, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("R2ToDriveSync")

# Intentar importar dependencias de terceros
try:
    import boto3
    from botocore.config import Config as BotoConfig
except ImportError:
    logger.error("Falta la librería 'boto3'. Instálala ejecutando: pip install boto3")
    sys.exit(1)

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload
except ImportError:
    logger.error("Faltan librerías de Google. Instálalas ejecutando: pip install google-api-python-client google-auth")
    sys.exit(1)

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    logger.error("Falta la librería 'psycopg2'. Instálala ejecutando: pip install psycopg2-binary")
    sys.exit(1)


# ==========================================
# CONFIGURACIÓN Y VARIABLES DE ENTORNO
# ==========================================
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "luxius-media")
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL", f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com" if R2_ACCOUNT_ID else "")

GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "credentials.json")
GOOGLE_SERVICE_ACCOUNT_JSON = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/luxius_db")
DIAS_ANTIGUEDAD = int(os.getenv("DIAS_ANTIGUEDAD", "5"))


def get_r2_client():
    """Inicializa y retorna el cliente boto3 para Cloudflare R2"""
    if not R2_ACCESS_KEY_ID or not R2_SECRET_ACCESS_KEY or not R2_ENDPOINT_URL:
        raise ValueError("Credenciales de Cloudflare R2 incompletas en el archivo .env")
    
    return boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=BotoConfig(signature_version='s3v4'),
        region_name='auto'
    )


def get_drive_service():
    """Inicializa y retorna el servicio de la API v3 de Google Drive"""
    scopes = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
    
    if GOOGLE_SERVICE_ACCOUNT_JSON:
        info = json.loads(GOOGLE_SERVICE_ACCOUNT_JSON)
        creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
    elif os.path.exists(GOOGLE_SERVICE_ACCOUNT_FILE):
        creds = service_account.Credentials.from_service_account_file(GOOGLE_SERVICE_ACCOUNT_FILE, scopes=scopes)
    else:
        raise FileNotFoundError(
            f"No se encontró credencial de Google Drive (Revisar {GOOGLE_SERVICE_ACCOUNT_FILE} o GOOGLE_SERVICE_ACCOUNT_JSON)"
        )
    
    return build('drive', 'v3', credentials=creds)


def get_db_connection():
    """Inicializa la conexión con PostgreSQL"""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL no especificada en las variables de entorno")
    
    # Manejar formatos de URL postgresql://
    db_url = DATABASE_URL
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    return psycopg2.connect(db_url)


def upload_to_google_drive(drive_service, file_stream, filename, mimetype, folder_id=None):
    """
    Sube un archivo desde memoria buffer a Google Drive y retorna la URL pública y el File ID
    """
    file_metadata = {'name': filename}
    if folder_id:
        file_metadata['parents'] = [folder_id]
        
    media = MediaIoBaseUpload(file_stream, mimetype=mimetype or 'application/octet-stream', resumable=True)
    
    uploaded_file = drive_service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id, webViewLink, webContentLink'
    ).execute()
    
    file_id = uploaded_file.get('id')
    drive_link = uploaded_file.get('webViewLink') or f"https://drive.google.com/file/d/{file_id}/view"
    
    # Asignar permisos de lectura general al archivo subido
    try:
        drive_service.permissions().create(
            fileId=file_id,
            body={'type': 'anyone', 'role': 'reader'}
        ).execute()
    except Exception as perm_err:
        logger.warning(f"No se pudo establecer permiso público en Drive para {file_id}: {perm_err}")

    return file_id, drive_link


def update_database_record(conn, r2_key, filename, drive_id, drive_url):
    """
    Actualiza la fila correspondiente en la tabla order_files de PostgreSQL
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Buscar por filepath o filename
        search_query = """
            SELECT id, metadata_json FROM order_files 
            WHERE filepath LIKE %s OR filepath = %s OR filename = %s;
        """
        cur.execute(search_query, (f"%{r2_key}%", r2_key, filename))
        row = cur.fetchone()

        if not row:
            # Buscar coincidencia amplia por nombre de archivo
            cur.execute("SELECT id, metadata_json FROM order_files WHERE filename = %s LIMIT 1;", (filename,))
            row = cur.fetchone()

        if row:
            file_id = row['id']
            # Actualizar campos
            update_query = """
                UPDATE order_files 
                SET filepath = %s,
                    enlace_externo = %s,
                    metadata_json = jsonb_set(
                        COALESCE(metadata_json, '{}'::jsonb), 
                        '{archivado_en_drive}', 
                        'true'::jsonb
                    )
                WHERE id = %s;
            """
            cur.execute(update_query, (drive_url, drive_url, file_id))
            conn.commit()
            logger.info(f"✔ Registro BD ID #{file_id} actualizado con nueva URL de Drive.")
            return True
        else:
            logger.warning(f"⚠️ No se encontró registro en la BD para el objeto R2: {r2_key} (Filename: {filename}). Se procederá a crear o continuar.")
            return True


def run_migration():
    """Función principal de ejecución del proceso de depuración y migración"""
    logger.info("==========================================================")
    logger.info(" INICIANDO MIGRACIÓN AUTOMÁTICA: CLOUDFLARE R2 -> GOOGLE DRIVE")
    logger.info(f" Criterio de antigüedad: Archivos creados hace más de {DIAS_ANTIGUEDAD} días.")
    logger.info("==========================================================")

    # 1. Inicializar clientes de servicios
    try:
        r2_client = get_r2_client()
        drive_service = get_drive_service()
        db_conn = get_db_connection()
    except Exception as e:
        logger.error(f"❌ Error al inicializar conexiones: {e}")
        return

    # Calcular fecha de corte (UTC)
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=DIAS_ANTIGUEDAD)
    logger.info(f"Fecha de corte evaluada: {cutoff_date.isoformat()}")

    # Contadores de métricas
    total_evaluados = 0
    total_migrados = 0
    total_bytes_liberados = 0
    total_errores = 0

    try:
        paginator = r2_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=R2_BUCKET_NAME)

        for page in pages:
            if 'Contents' not in page:
                logger.info("No se encontraron objetos en el bucket de R2.")
                continue

            for obj in page['Contents']:
                total_evaluados += 1
                r2_key = obj['Key']
                last_modified = obj['LastModified']
                file_size = obj['Size']

                # Verificar si el objeto supera los días de antigüedad
                if last_modified < cutoff_date:
                    logger.info(f"\nProcesando candidato: '{r2_key}' | Tamaño: {file_size / (1024*1024):.2f} MB | Modificado: {last_modified}")
                    filename = os.path.basename(r2_key)

                    try:
                        # PASO A: Descargar archivo de R2 a buffer en memoria
                        logger.info(f"1/4. Descargando '{r2_key}' desde R2...")
                        buffer = io.BytesIO()
                        r2_client.download_fileobj(R2_BUCKET_NAME, r2_key, buffer)
                        buffer.seek(0)

                        # PASO B: Subir a Google Drive
                        logger.info(f"2/4. Subiendo '{filename}' a Google Drive...")
                        drive_id, drive_url = upload_to_google_drive(
                            drive_service=drive_service,
                            file_stream=buffer,
                            filename=filename,
                            mimetype=None,
                            folder_id=GOOGLE_DRIVE_FOLDER_ID
                        )
                        logger.info(f"✔ Subido a Drive con éxito. ID: {drive_id} | URL: {drive_url}")

                        # PASO C: Actualizar registro en PostgreSQL
                        logger.info(f"3/4. Actualizando base de datos PostgreSQL...")
                        db_success = update_database_record(
                            conn=db_conn,
                            r2_key=r2_key,
                            filename=filename,
                            drive_id=drive_id,
                            drive_url=drive_url
                        )

                        # PASO D: Limpieza segura en Cloudflare R2
                        if db_success:
                            logger.info(f"4/4. Eliminando objeto original en Cloudflare R2: '{r2_key}'...")
                            r2_client.delete_object(Bucket=R2_BUCKET_NAME, Key=r2_key)
                            total_migrados += 1
                            total_bytes_liberados += file_size
                            logger.info(f"🎉 Migración exitosa de '{r2_key}'.")
                        else:
                            logger.error(f"❌ Cancelada eliminación en R2 de '{r2_key}' debido a fallo en actualización de BD.")
                            total_errores += 1

                    except Exception as process_err:
                        logger.error(f"❌ Error migrando '{r2_key}': {process_err}")
                        db_conn.rollback()
                        total_errores += 1

    except Exception as list_err:
        logger.error(f"Error al listar objetos de Cloudflare R2: {list_err}")
    finally:
        db_conn.close()

    # Reporte de Cierre
    mb_liberados = total_bytes_liberados / (1024 * 1024)
    logger.info("\n==========================================================")
    logger.info(" RESUMEN FINAL DE LA MIGRACIÓN")
    logger.info("==========================================================")
    logger.info(f" Total objetos evaluados  : {total_evaluados}")
    logger.info(f" Total objetos migrados   : {total_migrados}")
    logger.info(f" Espacio liberado en R2   : {mb_liberados:.2f} MB")
    logger.info(f" Total errores registrados : {total_errores}")
    logger.info("==========================================================")


if __name__ == "__main__":
    run_migration()
