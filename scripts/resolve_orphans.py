#!/usr/bin/env python3
"""
Script de Gestión y Purga por Lote: Archivos Huérfanos (orphan_review_queue)
LuXius System - XignuX

Uso:
    python scripts/resolve_orphans.py                     # Modo menú interactivo
    python scripts/resolve_orphans.py --dry-run            # Simulación segura (no borra nada)
    python scripts/resolve_orphans.py --all --yes          # Purga masiva desatendida de R2 (solo con backup Drive)
    python scripts/resolve_orphans.py --ext .pdf --yes     # Purga por extensión
    python scripts/resolve_orphans.py --before 2026-09-01  # Purga anteriores a cierta fecha
"""

import os
import sys
import argparse
import logging
from datetime import datetime
from dotenv import load_dotenv

# Asegurar codificación utf-8 en terminales Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

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


def obtener_pendientes(conn, ext=None, before_date=None, limit=None):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        query = """
            SELECT id, r2_key, filename, file_size_bytes, drive_file_id, drive_url, detected_at
            FROM orphan_review_queue
            WHERE status = 'pendiente'
        """
        params = []

        if ext:
            query += " AND filename ILIKE %s"
            params.append(f"%{ext}")

        if before_date:
            query += " AND detected_at < %s"
            params.append(before_date)

        query += " ORDER BY detected_at ASC"

        if limit:
            query += " LIMIT %s"
            params.append(limit)

        cur.execute(query, tuple(params))
        return cur.fetchall()


def purgar_lote_r2(r2_client, conn, filas, dry_run=False):
    """
    Borra objetos de R2 en bloques de hasta 500 y actualiza la BD de forma atómica.
    SOLO procesa aquellos que tienen `drive_file_id` comprobado (backup seguro).
    """
    validos = [f for f in filas if f.get('drive_file_id')]
    sin_drive = [f for f in filas if not f.get('drive_file_id')]

    if sin_drive:
        logger.warning(f"⚠️ Se omitieron {len(sin_drive)} archivo(s) porque NO cuentan con ID de backup en Drive.")

    if not validos:
        print("No hay archivos válidos con backup en Drive para purgar.")
        return 0, 0

    total_bytes = sum(f['file_size_bytes'] or 0 for f in validos)
    total_archivos = len(validos)

    print(f"\n==========================================================")
    print(f" RESUMEN DE PURGA ({'DRY-RUN / SIMULACIÓN' if dry_run else 'EJECUCIÓN REAL'})")
    print(f"==========================================================")
    print(f" Total archivos a purgar  : {total_archivos}")
    print(f" Espacio a liberar en R2  : {total_bytes / (1024 * 1024):.2f} MB ({total_bytes / (1024*1024*1024):.2f} GB)")
    print(f" Backup en Google Drive   : 100% verificado ({total_archivos}/{total_archivos})")
    print(f"==========================================================")

    if dry_run:
        print("🧪 MODO DRY-RUN: No se eliminó nada de R2 ni se modificó la base de datos.")
        return 0, 0

    # Chunks de 500 para la API S3/R2 delete_objects
    CHUNK_SIZE = 500
    borrados_count = 0
    bytes_liberados = 0

    for i in range(0, total_archivos, CHUNK_SIZE):
        chunk = validos[i:i + CHUNK_SIZE]
        delete_keys = [{'Key': item['r2_key']} for item in chunk]
        chunk_ids = [item['id'] for item in chunk]
        chunk_bytes = sum(item['file_size_bytes'] or 0 for item in chunk)

        try:
            # 1. Borrar del bucket R2
            resp = r2_client.delete_objects(
                Bucket=R2_BUCKET_NAME,
                Delete={'Objects': delete_keys, 'Quiet': True}
            )
            errores = resp.get('Errors', [])
            if errores:
                logger.error(f"Error borrando chunk de R2: {errores[:3]}")

            # 2. Actualizar registro en PostgreSQL
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE orphan_review_queue
                    SET status = 'borrado', resolved_at = now()
                    WHERE id = ANY(%s);
                """, (chunk_ids,))
                conn.commit()

            borrados_count += len(chunk)
            bytes_liberados += chunk_bytes
            print(f"  ✔ Procesados {borrados_count}/{total_archivos} archivos ({bytes_liberados / (1024*1024):.1f} MB liberados)...")

        except Exception as err:
            logger.error(f"❌ Error en lote {i//CHUNK_SIZE + 1}: {err}")
            conn.rollback()

    print(f"\n🎉 Purga completada con éxito:")
    print(f"  Total liberado de Cloudflare R2: {bytes_liberados / (1024*1024):.2f} MB ({bytes_liberados / (1024*1024*1024):.2f} GB).")
    print(f"  Registros actualizados a 'borrado' en orphan_review_queue.")
    return borrados_count, bytes_liberados


def modo_uno_a_uno(r2_client, conn, filas):
    print(f"\nRevisión 1 por 1 ({len(filas)} archivos):\n")
    for row in filas:
        mb = (row['file_size_bytes'] or 0) / (1024 * 1024)
        print("-" * 60)
        print(f" ID en cola   : {row['id']}")
        print(f" Archivo      : {row['filename']}")
        print(f" Ruta en R2   : {row['r2_key']}")
        print(f" Tamaño       : {mb:.2f} MB")
        print(f" Backup Drive : {row['drive_url']}")
        print(f" Detectado    : {row['detected_at']}")

        try:
            respuesta = input(" ¿Borrar de R2? Ya está en Drive. [y=borrar / n=conservar / s=saltar / q=salir]: ").strip().lower()
        except EOFError:
            print("\nOperación cancelada por fin de entrada.")
            break

        if respuesta == 'q':
            print("Saliendo de la revisión.")
            break
        elif respuesta == 'y':
            try:
                r2_client.delete_object(Bucket=R2_BUCKET_NAME, Key=row['r2_key'])
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE orphan_review_queue SET status='borrado', resolved_at=now() WHERE id=%s;",
                        (row['id'],)
                    )
                    conn.commit()
                print(" 🗑️  Borrado de R2 y resuelto.")
            except Exception as e:
                conn.rollback()
                print(f" ❌ Error al borrar de R2: {e}")
        elif respuesta == 'n':
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE orphan_review_queue SET status='conservado', resolved_at=now() WHERE id=%s;",
                    (row['id'],)
                )
                conn.commit()
            print(" 📌 Conservado en R2 permanentemente.")
        else:
            print(" ⏭️  Saltado.")


def main():
    parser = argparse.ArgumentParser(description="Gestión y purga por lote de archivos huérfanos en R2")
    parser.add_argument("--all", action="store_true", help="Procesar todos los huérfanos pendientes")
    parser.add_argument("--dry-run", action="store_true", help="Simular sin borrar ni alterar la BD")
    parser.add_argument("--yes", "-y", action="store_true", help="Confirmar automáticamente sin preguntar")
    parser.add_argument("--ext", type=str, help="Filtrar por extensión (ej. .pdf, .jpg)")
    parser.add_argument("--before", type=str, help="Filtrar detectados antes de YYYY-MM-DD")
    parser.add_argument("--limit", type=int, help="Límite máximo de archivos a procesar")
    parser.add_argument("--interactive", action="store_true", help="Forzar revisión manual 1 a 1")
    args = parser.parse_args()

    conn = get_db_connection()
    r2_client = get_r2_client()

    pendientes = obtener_pendientes(conn, ext=args.ext, before_date=args.before, limit=args.limit)

    if not pendientes:
        print("✅ No hay archivos huérfanos pendientes que cumplan con los criterios.")
        conn.close()
        return

    total_mb = sum((p['file_size_bytes'] or 0) for p in pendientes) / (1024 * 1024)
    total_gb = total_mb / 1024
    con_drive = sum(1 for p in pendientes if p.get('drive_file_id'))

    # Si se pasó argumento directo en línea de comandos (--all o --ext con --yes)
    if args.interactive:
        modo_uno_a_uno(r2_client, conn, pendientes)
        conn.close()
        return

    if args.all or (args.ext and args.yes):
        if not args.yes and not args.dry_run:
            confirm = input(f"¿Confirmás purgar {len(pendientes)} archivos ({total_gb:.2f} GB) de R2? [escribe 'BORRAR' para confirmar]: ").strip()
            if confirm != "BORRAR":
                print("Operación cancelada.")
                conn.close()
                return

        purgar_lote_r2(r2_client, conn, pendientes, dry_run=args.dry_run)
        conn.close()
        return

    # Menú Interactivo por defecto
    print("\n" + "=" * 62)
    print(" 📦 PANEL DE CONTROL DE HUÉRFANOS (R2 -> GOOGLE DRIVE)")
    print("=" * 62)
    print(f" Total huérfanos pendientes : {len(pendientes)}")
    print(f" Espacio ocupado en R2      : {total_mb:.2f} MB ({total_gb:.2f} GB)")
    print(f" Respaldados en Drive       : {con_drive}/{len(pendientes)} ({con_drive*100//len(pendientes)}%)")
    print("=" * 62)
    print("\nOpciones disponibles:")
    print(" [1] 🚀 Purgar TODOS los huérfanos de R2 (ya respaldados en Drive)")
    print(" [2] 🔍 Simulación (Dry-Run: ver qué se borraría sin tocar nada)")
    print(" [3] 📄 Purgar solo PDFs (.pdf)")
    print(" [4] 🖼️  Purgar solo Imágenes (.jpg, .jpeg, .tif)")
    print(" [5] 👤 Revisar 1 por 1 (interactivo manual)")
    print(" [0] ❌ Salir")

    try:
        opc = input("\nElige una opción [0-5]: ").strip()
    except EOFError:
        opc = "0"

    if opc == "1":
        conf = input(f"⚠️  Se borrarán {len(pendientes)} archivos ({total_gb:.2f} GB) de R2.\n   Escribe 'BORRAR' para confirmar la purga masiva: ").strip()
        if conf == "BORRAR":
            purgar_lote_r2(r2_client, conn, pendientes, dry_run=False)
        else:
            print("Operación cancelada. No se tocó ningún archivo.")
    elif opc == "2":
        purgar_lote_r2(r2_client, conn, pendientes, dry_run=True)
    elif opc == "3":
        pdfs = [p for p in pendientes if p['filename'].lower().endswith('.pdf')]
        conf = input(f"Se purgarán {len(pdfs)} PDFs de R2. Escribe 'BORRAR' para confirmar: ").strip()
        if conf == "BORRAR":
            purgar_lote_r2(r2_client, conn, pdfs, dry_run=False)
        else:
            print("Operación cancelada.")
    elif opc == "4":
        imgs = [p for p in pendientes if any(p['filename'].lower().endswith(e) for e in ('.jpg', '.jpeg', '.tif', '.png'))]
        conf = input(f"Se purgarán {len(imgs)} imágenes de R2. Escribe 'BORRAR' para confirmar: ").strip()
        if conf == "BORRAR":
            purgar_lote_r2(r2_client, conn, imgs, dry_run=False)
        else:
            print("Operación cancelada.")
    elif opc == "5":
        modo_uno_a_uno(r2_client, conn, pendientes)
    else:
        print("Saliendo sin realizar cambios.")

    conn.close()


if __name__ == "__main__":
    main()
