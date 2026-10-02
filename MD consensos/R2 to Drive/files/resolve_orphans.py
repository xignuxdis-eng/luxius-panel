#!/usr/bin/env python3
"""
Script Interactivo: Resolución de Archivos Huérfanos (orphan_review_queue)

Uso:
    python scripts/resolve_orphans.py

Lista los archivos que sync_r2_to_drive.py detectó sin registro en la BD
(ya respaldados en Google Drive, todavía presentes en R2) y te deja decidir,
uno por uno, si borrarlos de R2 o conservarlos.
"""

import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ResolveOrphans")

try:
    import boto3
    from botocore.config import Config as BotoConfig
except ImportError:
    logger.error("Falta 'boto3'. Instalá con: pip install boto3")
    sys.exit(1)

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    logger.error("Falta 'psycopg2'. Instalá con: pip install psycopg2-binary")
    sys.exit(1)

R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "luxius-media")
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL", f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com" if R2_ACCOUNT_ID else "")
DATABASE_URL = os.getenv("DATABASE_URL", "")


def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=BotoConfig(signature_version='s3v4'),
        region_name='auto'
    )


def get_db_connection():
    db_url = DATABASE_URL.replace("postgres://", "postgresql://", 1) if DATABASE_URL.startswith("postgres://") else DATABASE_URL
    return psycopg2.connect(db_url)


def main():
    conn = get_db_connection()
    r2_client = get_r2_client()

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT id, r2_key, filename, file_size_bytes, drive_url, detected_at
            FROM orphan_review_queue
            WHERE status = 'pendiente'
            ORDER BY detected_at ASC;
        """)
        pendientes = cur.fetchall()

    if not pendientes:
        print("✅ No hay archivos huérfanos pendientes de revisión.")
        return

    print(f"\nHay {len(pendientes)} archivo(s) huérfano(s) pendiente(s):\n")

    for row in pendientes:
        mb = (row['file_size_bytes'] or 0) / (1024 * 1024)
        print("-" * 60)
        print(f" ID en cola   : {row['id']}")
        print(f" Archivo      : {row['filename']}")
        print(f" Ruta en R2   : {row['r2_key']}")
        print(f" Tamaño       : {mb:.2f} MB")
        print(f" Backup Drive : {row['drive_url']}")
        print(f" Detectado    : {row['detected_at']}")

        respuesta = input(" ¿Borrar de R2? Ya está respaldado en Drive. [y/N/s=saltar]: ").strip().lower()

        with conn.cursor() as cur:
            if respuesta == 'y':
                try:
                    r2_client.delete_object(Bucket=R2_BUCKET_NAME, Key=row['r2_key'])
                    cur.execute(
                        "UPDATE orphan_review_queue SET status='borrado', resolved_at=now() WHERE id=%s;",
                        (row['id'],)
                    )
                    conn.commit()
                    print(" 🗑️  Borrado de R2 y marcado como resuelto.")
                except Exception as e:
                    conn.rollback()
                    print(f" ❌ Error al borrar de R2: {e}")
            elif respuesta == 'n':
                cur.execute(
                    "UPDATE orphan_review_queue SET status='conservado', resolved_at=now() WHERE id=%s;",
                    (row['id'],)
                )
                conn.commit()
                print(" 📌 Conservado en R2 y marcado como resuelto (no se volverá a preguntar).")
            else:
                print(" ⏭️  Saltado — seguirá apareciendo como pendiente la próxima vez.")

    conn.close()
    print("\nListo.")


if __name__ == "__main__":
    main()
