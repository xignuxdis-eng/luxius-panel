#!/usr/bin/env python3
"""
Script de Migración y Depuración Automatizada: Cloudflare R2 -> Google Drive -> PostgreSQL

Autor: LuXius AI System
Descripción:
    1. Examina objetos en el bucket de Cloudflare R2 con antigüedad superior a DIAS_ANTIGUEDAD (por defecto 5 días).
    2. Descarga el archivo a memoria/buffer y lo sube a una carpeta de Google Drive vía OAuth de usuario.
    3. Actualiza el registro correspondiente en la base de datos PostgreSQL.
    4. Elimina de forma segura el objeto original en Cloudflare R2 ÚNICAMENTE tras confirmar la subida a Drive y actualización en BD.
    5. Registra logs detallados en la consola y en 'r2_migration.log'.
"""

import os
import sys
import io
import re
import json
import time
import smtplib
import logging
from email.mime.text import MIMEText
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# Asegurar codificación utf-8 en terminales Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

load_dotenv()

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

try:
    import boto3
    from botocore.config import Config as BotoConfig
except ImportError:
    logger.error("Falta la librería 'boto3'. Instálala ejecutando: pip install boto3")
    sys.exit(1)

try:
    from google.oauth2.credentials import Credentials as UserCredentials
    from google.auth.transport.requests import Request as GoogleAuthRequest
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload
    from googleapiclient.errors import HttpError
except ImportError:
    logger.error("Faltan librerías de Google. Instálalas ejecutando: pip install google-api-python-client google-auth")
    sys.exit(1)

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    logger.error("Falta la librería 'psycopg2'. Instálala ejecutando: pip install psycopg2-binary")
    sys.exit(1)


R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "luxius-media")
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL", f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com" if R2_ACCOUNT_ID else "")

GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
GOOGLE_OAUTH_TOKEN_JSON = os.getenv("GOOGLE_OAUTH_TOKEN_JSON")
GOOGLE_OAUTH_TOKEN_FILE = os.getenv("GOOGLE_OAUTH_TOKEN_FILE", "token.json")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/luxius_db")
DIAS_ANTIGUEDAD = int(os.getenv("DIAS_ANTIGUEDAD", "5"))

EXCLUIR_PREFIJOS = [p.strip() for p in os.getenv("EXCLUIR_PREFIJOS", "thumbnails/").split(",") if p.strip()]
CARPETA_HUERFANOS = os.getenv("CARPETA_HUERFANOS", "_Huerfanos_SinClasificar")

DRY_RUN = os.getenv("DRY_RUN", "false").strip().lower() in ("true", "1", "yes")

MAX_REINTENTOS = int(os.getenv("MAX_REINTENTOS_DRIVE", "5"))
BACKOFF_BASE_SEGUNDOS = float(os.getenv("BACKOFF_BASE_SEGUNDOS", "2"))
CODIGOS_HTTP_REINTENTABLES = {429, 500, 502, 503, 504}

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "")
SMTP_TO = os.getenv("SMTP_TO")


def get_r2_client():
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
    scopes = ['https://www.googleapis.com/auth/drive']
    token_info = None
    if GOOGLE_OAUTH_TOKEN_JSON:
        token_info = json.loads(GOOGLE_OAUTH_TOKEN_JSON)
    elif os.path.exists(GOOGLE_OAUTH_TOKEN_FILE):
        with open(GOOGLE_OAUTH_TOKEN_FILE, "r", encoding="utf-8") as f:
            token_info = json.load(f)
    else:
        raise FileNotFoundError(
            f"No se encontró el token OAuth de Drive (ni GOOGLE_OAUTH_TOKEN_JSON ni "
            f"'{GOOGLE_OAUTH_TOKEN_FILE}'). Corré primero: python scripts/generate_drive_token.py"
        )
    creds = UserCredentials.from_authorized_user_info(token_info, scopes=scopes)
    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleAuthRequest())
    return build('drive', 'v3', credentials=creds)


def get_db_connection():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL no especificada en las variables de entorno")
    db_url = DATABASE_URL
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    return psycopg2.connect(db_url)


def _ejecutar_con_reintentos(func_execute, descripcion):
    intento = 0
    while True:
        intento += 1
        try:
            return func_execute()
        except HttpError as http_err:
            status = getattr(http_err.resp, 'status', None)
            if status in CODIGOS_HTTP_REINTENTABLES and intento < MAX_REINTENTOS:
                espera = BACKOFF_BASE_SEGUNDOS * (2 ** (intento - 1))
                logger.warning(
                    f"⏳ {descripcion} devolvió HTTP {status} (transitorio). "
                    f"Reintento {intento}/{MAX_REINTENTOS} en {espera:.1f}s..."
                )
                time.sleep(espera)
                continue
            raise


def upload_to_google_drive(drive_service, file_stream, filename, mimetype, folder_id=None):
    file_metadata = {'name': filename}
    if folder_id:
        file_metadata['parents'] = [folder_id]
    media = MediaIoBaseUpload(file_stream, mimetype=mimetype or 'application/octet-stream', resumable=True)
    uploaded_file = _ejecutar_con_reintentos(
        drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink, webContentLink'
        ).execute,
        descripcion=f"Subida de '{filename}' a Drive"
    )
    file_id = uploaded_file.get('id')
    drive_link = uploaded_file.get('webViewLink') or f"https://drive.google.com/file/d/{file_id}/view"
    try:
        _ejecutar_con_reintentos(
            drive_service.permissions().create(
                fileId=file_id,
                body={'type': 'anyone', 'role': 'reader'}
            ).execute,
            descripcion=f"Asignación de permisos para {file_id}"
        )
    except Exception as perm_err:
        logger.warning(f"No se pudo establecer permiso público en Drive para {file_id}: {perm_err}")
    return file_id, drive_link


def sanitizar_nombre_carpeta(nombre):
    if not nombre:
        return "Sin-Nombre"
    limpio = re.sub(r'[\\/]+', '-', str(nombre)).strip()
    return limpio or "Sin-Nombre"


def get_or_create_folder(drive_service, name, parent_id, cache):
    cache_key = (parent_id, name)
    if cache_key in cache:
        return cache[cache_key]
    safe_name = name.replace("'", "\\'")
    query = (
        f"name = '{safe_name}' and '{parent_id}' in parents "
        f"and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    )
    resultado = _ejecutar_con_reintentos(
        drive_service.files().list(q=query, fields="files(id, name)", spaces='drive').execute,
        descripcion=f"Búsqueda de carpeta '{name}'"
    )
    archivos = resultado.get('files', [])
    if archivos:
        folder_id = archivos[0]['id']
    else:
        metadata = {
            'name': name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_id]
        }
        creada = _ejecutar_con_reintentos(
            drive_service.files().create(body=metadata, fields='id').execute,
            descripcion=f"Creación de carpeta '{name}'"
        )
        folder_id = creada['id']
        logger.info(f"📁 Carpeta creada en Drive: '{name}'")
    cache[cache_key] = folder_id
    return folder_id


def construir_ruta_carpetas(drive_service, root_folder_id, partes, cache):
    parent_id = root_folder_id
    for parte in partes:
        parent_id = get_or_create_folder(drive_service, sanitizar_nombre_carpeta(parte), parent_id, cache)
    return parent_id


def ensure_orphan_queue_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS orphan_review_queue (
                id SERIAL PRIMARY KEY,
                r2_key TEXT NOT NULL,
                filename TEXT NOT NULL,
                file_size_bytes BIGINT,
                drive_file_id TEXT,
                drive_url TEXT,
                status TEXT NOT NULL DEFAULT 'pendiente',
                detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                resolved_at TIMESTAMPTZ
            );
        """)
        conn.commit()


def queue_orphan(conn, r2_key, filename, file_size, drive_id, drive_url):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO orphan_review_queue (r2_key, filename, file_size_bytes, drive_file_id, drive_url, status)
            VALUES (%s, %s, %s, %s, %s, 'pendiente')
            RETURNING id;
        """, (r2_key, filename, file_size, drive_id, drive_url))
        new_id = cur.fetchone()[0]
        conn.commit()
        return new_id


def send_orphan_batch_summary(huerfanos):
    """
    Envía un único correo consolidado al finalizar el proceso en lugar de saturar
    con 1 correo por cada archivo huérfano detectado.
    """
    if not huerfanos:
        return
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD and SMTP_TO):
        logger.warning(
            "SMTP no configurado (faltan SMTP_HOST/SMTP_USER/SMTP_PASSWORD/SMTP_TO). "
            f"No se enviará email de resumen para los {len(huerfanos)} archivo(s) huérfano(s)."
        )
        return

    total_bytes = sum(h.get('size', 0) for h in huerfanos)
    total_mb = total_bytes / (1024 * 1024)

    lineas = []
    for h in huerfanos[:25]:
        size_mb = h.get('size', 0) / (1024 * 1024)
        lineas.append(f"- {h['filename']} ({size_mb:.2f} MB) | ID #{h['id']} | Drive: {h['drive_url']}")
    if len(huerfanos) > 25:
        lineas.append(f"... y {len(huerfanos) - 25} archivo(s) más.")

    cuerpo = (
        f"Se detectaron {len(huerfanos)} archivo(s) en Cloudflare R2 sin presupuesto activo asociado en la base de datos.\n"
        f"Espacio total involucrado: {total_mb:.2f} MB ({total_mb / 1024:.2f} GB).\n\n"
        f"Todos los archivos fueron respaldados preventivamente en Google Drive y registrados en 'orphan_review_queue'.\n"
        f"NINGUNO fue borrado de R2 (quedan pendientes de resolución segura).\n\n"
        f"Muestra de archivos detectados:\n" + "\n".join(lineas) + "\n\n"
        f"Para gestionar o purgar estos archivos en lote, ejecuta en el servidor o localmente:\n"
        f"  python scripts/resolve_orphans.py\n"
    )
    msg = MIMEText(cuerpo, _charset="utf-8")
    msg["Subject"] = f"[LuXius] Resumen de {len(huerfanos)} archivos huérfanos respaldados en Drive ({total_mb:.1f} MB)"
    msg["From"] = SMTP_FROM
    msg["To"] = SMTP_TO
    destinatarios = [addr.strip() for addr in SMTP_TO.split(",") if addr.strip()]
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, destinatarios, msg.as_string())
        logger.info(f"📧 Resumen consolidado de huérfanos ({len(huerfanos)} archivos) enviado a: {SMTP_TO}")
    except Exception as mail_err:
        logger.error(f"❌ No se pudo enviar el email de resumen de huérfanos: {mail_err}")


def buscar_presupuesto_por_archivo(conn, filename, r2_key=None):
    """
    Búsqueda resiliente con múltiples niveles de resolución:
    1. Coincidencia exacta en 'archivos' o 'archivosOriginales'.
    2. Coincidencia por r2_key completa en 'archivos'.
    3. Coincidencia de texto dentro del JSON de especificaciones (para URLs o rutas anidadas).
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Nivel 1: Búsqueda exacta en arrays 'archivos' y 'archivosOriginales'
        cur.execute("""
            SELECT p.id, p.created_at, p.estado, p.deleted_at, c.nombre AS cliente_nombre
            FROM presupuestos p
            LEFT JOIN clientes c ON c.id = p.cliente_id
            WHERE p.especificaciones IS NOT NULL
              AND (
                  (p.especificaciones::jsonb -> 'archivos') ? %s
                  OR (p.especificaciones::jsonb -> 'archivosOriginales') ? %s
              )
            LIMIT 1;
        """, (filename, filename))
        row = cur.fetchone()
        if row:
            ot = f"OT-{str(row['id'])[:8].upper()}"
            return {
                'presupuesto_id': row['id'],
                'cliente_nombre': row['cliente_nombre'] or 'Sin-Cliente',
                'created_at': row['created_at'],
                'ot': ot,
                'estado': row['estado'],
                'deleted_at': row['deleted_at'],
            }

        # Nivel 2: Si r2_key es diferente al nombre de archivo (ej. con prefijo 'uploads/...'), buscar por r2_key
        if r2_key and r2_key != filename:
            cur.execute("""
                SELECT p.id, p.created_at, p.estado, p.deleted_at, c.nombre AS cliente_nombre
                FROM presupuestos p
                LEFT JOIN clientes c ON c.id = p.cliente_id
                WHERE p.especificaciones IS NOT NULL
                  AND (p.especificaciones::jsonb -> 'archivos') ? %s
                LIMIT 1;
            """, (r2_key,))
            row = cur.fetchone()
            if row:
                ot = f"OT-{str(row['id'])[:8].upper()}"
                return {
                    'presupuesto_id': row['id'],
                    'cliente_nombre': row['cliente_nombre'] or 'Sin-Cliente',
                    'created_at': row['created_at'],
                    'ot': ot,
                    'estado': row['estado'],
                    'deleted_at': row['deleted_at'],
                }

        # Nivel 3: Búsqueda de subcadena en todo el contenido de especificaciones (longitud mínima 8 caracteres)
        if len(filename) >= 8:
            cur.execute("""
                SELECT p.id, p.created_at, p.estado, p.deleted_at, c.nombre AS cliente_nombre
                FROM presupuestos p
                LEFT JOIN clientes c ON c.id = p.cliente_id
                WHERE p.especificaciones IS NOT NULL
                  AND p.especificaciones::text LIKE %s
                LIMIT 1;
            """, (f"%{filename}%",))
            row = cur.fetchone()
            if row:
                ot = f"OT-{str(row['id'])[:8].upper()}"
                return {
                    'presupuesto_id': row['id'],
                    'cliente_nombre': row['cliente_nombre'] or 'Sin-Cliente',
                    'created_at': row['created_at'],
                    'ot': ot,
                    'estado': row['estado'],
                    'deleted_at': row['deleted_at'],
                }

        return None


ESTADOS_IMPRESOS = {'impreso', 'post', 'completo', 'entregado', 'finalizado'}


def requiere_proteccion_por_no_impreso(estado, deleted_at):
    """
    True si el archivo debe quedarse INTACTO en R2 porque el presupuesto
    todavía no pasó por impresión. No protege si está en papelera
    (deleted_at no nulo), si está 'cancelado', o si el estado ya indica
    impresión o etapa posterior (ESTADOS_IMPRESOS). Protege para cualquier
    otro estado (ORDEN_DE_TRABAJO, borrador, desconocido) — ante la duda,
    no se borra nada.
    """
    if deleted_at is not None:
        return False
    estado_normalizado = (estado or '').strip().lower()
    if estado_normalizado == 'cancelado':
        return False
    if estado_normalizado in ESTADOS_IMPRESOS:
        return False
    return True


def guardar_referencia_drive(conn, presupuesto_id, filename, drive_id, drive_url):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE presupuestos
            SET especificaciones = (
                jsonb_set(
                    especificaciones::jsonb,
                    '{driveFiles}',
                    COALESCE(especificaciones::jsonb -> 'driveFiles', '[]'::jsonb)
                        || jsonb_build_array(
                            jsonb_build_object(
                                'filename', %s,
                                'driveId', %s,
                                'driveUrl', %s
                            )
                        ),
                    true
                )
            )::json
            WHERE id = %s;
        """, (filename, drive_id, drive_url, presupuesto_id))
        conn.commit()
        logger.info(f"✔ Presupuesto #{presupuesto_id} actualizado con referencia a Drive para '{filename}'.")


def run_migration():
    logger.info("==========================================================")
    logger.info(" INICIANDO MIGRACIÓN AUTOMÁTICA: CLOUDFLARE R2 -> GOOGLE DRIVE")
    logger.info(f" Criterio de antigüedad: Archivos creados hace más de {DIAS_ANTIGUEDAD} días.")
    logger.info(f" Prefijos protegidos (NUNCA se tocan): {EXCLUIR_PREFIJOS}")
    logger.info("==========================================================")

    if DRY_RUN:
        logger.info("🧪 MODO DRY-RUN ACTIVADO: no se subirá nada a Drive, no se tocará la BD, no se borrará nada de R2.")

    try:
        r2_client = get_r2_client()
        drive_service = get_drive_service()
        db_conn = get_db_connection()
        if not DRY_RUN:
            ensure_orphan_queue_table(db_conn)
    except Exception as e:
        logger.error(f"❌ Error al inicializar conexiones: {e}")
        return

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=DIAS_ANTIGUEDAD)
    logger.info(f"Fecha de corte evaluada: {cutoff_date.isoformat()}")

    total_evaluados = 0
    total_migrados = 0
    total_bytes_liberados = 0
    total_errores = 0
    total_huerfanos = 0
    total_excluidos = 0
    total_protegidos = 0
    folder_cache = {}
    nuevos_huerfanos = []

    try:
        paginator = r2_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=R2_BUCKET_NAME)

        for page in pages:
            if 'Contents' not in page:
                logger.info("No se encontraron objetos en el bucket de R2.")
                continue

            for obj in page['Contents']:
                r2_key = obj['Key']

                if any(r2_key.startswith(prefijo) for prefijo in EXCLUIR_PREFIJOS):
                    total_excluidos += 1
                    continue

                total_evaluados += 1
                last_modified = obj['LastModified']
                file_size = obj['Size']

                if last_modified < cutoff_date:
                    logger.info(f"\nProcesando candidato: '{r2_key}' | Tamaño: {file_size / (1024*1024):.2f} MB | Modificado: {last_modified}")
                    filename = os.path.basename(r2_key)

                    if DRY_RUN:
                        logger.info(f"🧪 [DRY-RUN] Se migraría '{r2_key}' ({file_size / (1024*1024):.2f} MB) — no se ejecuta ninguna acción real.")
                        continue

                    try:
                        match = buscar_presupuesto_por_archivo(db_conn, filename, r2_key=r2_key)

                        if match and requiere_proteccion_por_no_impreso(match['estado'], match['deleted_at']):
                            total_protegidos += 1
                            logger.info(
                                f"🔒 '{r2_key}' PROTEGIDO: presupuesto #{match['presupuesto_id']} "
                                f"(estado='{match['estado']}') todavía no está impreso. "
                                f"Se deja intacto en R2, se vuelve a evaluar en la próxima corrida."
                            )
                            continue

                        if match:
                            fecha = match['created_at']
                            partes_ruta = [
                                f"{fecha.year:04d}",
                                f"{fecha.month:02d}",
                                f"{fecha.day:02d}",
                                match['cliente_nombre'],
                                match['ot'],
                            ]
                        else:
                            partes_ruta = [
                                CARPETA_HUERFANOS,
                                f"{last_modified.year:04d}-{last_modified.month:02d}"
                            ]

                        logger.info(f"1/4. Ruta en Drive: {'/'.join(partes_ruta)}")
                        carpeta_id = construir_ruta_carpetas(
                            drive_service, GOOGLE_DRIVE_FOLDER_ID, partes_ruta, folder_cache
                        )

                        logger.info(f"2/4. Descargando '{r2_key}' desde R2...")
                        buffer = io.BytesIO()
                        r2_client.download_fileobj(R2_BUCKET_NAME, r2_key, buffer)
                        buffer.seek(0)

                        logger.info(f"3/4. Subiendo '{filename}' a Google Drive...")
                        drive_id, drive_url = upload_to_google_drive(
                            drive_service=drive_service,
                            file_stream=buffer,
                            filename=filename,
                            mimetype=None,
                            folder_id=carpeta_id
                        )
                        logger.info(f"✔ Subido a Drive con éxito. ID: {drive_id} | URL: {drive_url}")

                        if match:
                            guardar_referencia_drive(db_conn, match['presupuesto_id'], filename, drive_id, drive_url)
                            logger.info(f"4/4. Eliminando objeto original en Cloudflare R2: '{r2_key}'...")
                            r2_client.delete_object(Bucket=R2_BUCKET_NAME, Key=r2_key)
                            total_migrados += 1
                            total_bytes_liberados += file_size
                            logger.info(f"🎉 Migración exitosa de '{r2_key}'.")
                        else:
                            queue_id = queue_orphan(
                                conn=db_conn,
                                r2_key=r2_key,
                                filename=filename,
                                file_size=file_size,
                                drive_id=drive_id,
                                drive_url=drive_url
                            )
                            nuevos_huerfanos.append({
                                'id': queue_id,
                                'r2_key': r2_key,
                                'filename': filename,
                                'size': file_size,
                                'drive_url': drive_url
                            })
                            total_huerfanos += 1
                            logger.info(
                                f"📥 '{r2_key}' respaldado en Drive y encolado (ID #{queue_id}) para revisión manual. "
                                f"NO se borró de R2."
                            )

                    except Exception as process_err:
                        logger.error(f"❌ Error migrando '{r2_key}': {process_err}")
                        db_conn.rollback()
                        total_errores += 1

        # Enviar resumen consolidado de huérfanos por correo si hubo detecciones nuevas
        if nuevos_huerfanos and not DRY_RUN:
            send_orphan_batch_summary(nuevos_huerfanos)

    except Exception as list_err:
        logger.error(f"Error al listar objetos de Cloudflare R2: {list_err}")
    finally:
        db_conn.close()

    mb_liberados = total_bytes_liberados / (1024 * 1024)
    logger.info("\n==========================================================")
    logger.info(" RESUMEN FINAL DE LA MIGRACIÓN")
    logger.info("==========================================================")
    logger.info(f" Total objetos evaluados   : {total_evaluados}")
    logger.info(f" Total objetos excluidos   : {total_excluidos} (protegidos por EXCLUIR_PREFIJOS, no se tocan)")
    logger.info(f" Total objetos migrados    : {total_migrados}")
    logger.info(f" Total archivos huérfanos  : {total_huerfanos} (respaldados en Drive, pendientes de revisión)")
    logger.info(f" Total archivos protegidos : {total_protegidos} (presupuesto aún no impreso, se dejan intactos en R2)")
    logger.info(f" Espacio liberado en R2    : {mb_liberados:.2f} MB")
    logger.info(f" Total errores registrados : {total_errores}")
    if DRY_RUN:
        logger.info(" (Modo DRY-RUN: ninguna acción real fue ejecutada)")
    logger.info("==========================================================")


if __name__ == "__main__":
    run_migration()
