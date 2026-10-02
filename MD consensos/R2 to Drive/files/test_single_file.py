#!/usr/bin/env python3
"""
Prueba Controlada: Migración de UN SOLO archivo real

Reutiliza las mismas funciones de sync_r2_to_drive.py (conexión a R2, subida
a Drive, actualización de BD) pero las aplica sobre un único archivo elegido
a mano, con confirmación antes de borrar nada. Sirve para validar el pipeline
completo antes de correr la migración sobre el lote completo de candidatos.

Uso:
    python scripts/test_single_file.py                  -> lista los 10 más antiguos
    python scripts/test_single_file.py "<clave_exacta>"  -> prueba ese archivo puntual
"""

import sys
import io
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sync_r2_to_drive as sync


def listar_candidatos(r2_client, bucket, top_n=10):
    objetos = []
    paginator = r2_client.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=bucket):
        for obj in page.get('Contents', []):
            if any(obj['Key'].startswith(prefijo) for prefijo in sync.EXCLUIR_PREFIJOS):
                continue
            objetos.append(obj)
    objetos.sort(key=lambda o: o['LastModified'])
    return objetos[:top_n]


def main():
    r2_client = sync.get_r2_client()

    if len(sys.argv) > 1:
        r2_key = sys.argv[1]

        if any(r2_key.startswith(prefijo) for prefijo in sync.EXCLUIR_PREFIJOS):
            print(f"❌ '{r2_key}' está bajo un prefijo protegido (EXCLUIR_PREFIJOS={sync.EXCLUIR_PREFIJOS}).")
            print("   Este archivo nunca se migra ni se borra. Elegí otro.")
            return
    else:
        print("No especificaste un archivo. Estos son los 10 más antiguos del bucket (excluyendo protegidos):\n")
        candidatos = listar_candidatos(r2_client, sync.R2_BUCKET_NAME)
        for i, obj in enumerate(candidatos, 1):
            mb = obj['Size'] / (1024 * 1024)
            print(f"  {i}. {obj['Key']}  ({mb:.2f} MB)  modificado: {obj['LastModified']}")
        print("\nUso: python scripts/test_single_file.py \"clave/exacta/archivo.ext\"")
        return

    # Verificar que el objeto existe
    try:
        obj = r2_client.head_object(Bucket=sync.R2_BUCKET_NAME, Key=r2_key)
    except Exception as e:
        print(f"Error: no se encontró el objeto '{r2_key}' en el bucket: {e}")
        return

    filename = os.path.basename(r2_key)
    file_size = obj['ContentLength'] if 'ContentLength' in obj else obj.get('Size', 0)
    mb = file_size / (1024 * 1024)

    print(f"\nArchivo seleccionado:")
    print(f"  Ruta R2: {r2_key}")
    print(f"  Nombre:  {filename}")
    print(f"  Tamaño:  {mb:.2f} MB")
    print(f"  Modificado: {obj['LastModified']}")

    if sync.DRY_RUN:
        print("\n[DRY-RUN] No se ejecutará ninguna acción real (DRY_RUN=true en .env).")
        print("Para probar de verdad, poné DRY_RUN=false en tu .env SOLO para esta prueba,")
        print("y volvé a ponerlo en true después.")
        return

    # Confirmación interactiva
    resp = input("\n¿Continuar con la migración de ESTE archivo? [y/N]: ").strip().lower()
    if resp != 'y':
        print("Abortado por el usuario.")
        return

    # Conectar Drive y BD
    drive_service = sync.get_drive_service()
    db_conn = sync.get_db_connection()
    sync.ensure_orphan_queue_table(db_conn)

    try:
        # PASO A: Descargar de R2
        print(f"\n1/4. Descargando '{r2_key}' desde R2...")
        buffer = io.BytesIO()
        r2_client.download_fileobj(sync.R2_BUCKET_NAME, r2_key, buffer)
        buffer.seek(0)

        # PASO B: Subir a Drive
        print(f"2/4. Subiendo '{filename}' a Google Drive...")
        drive_id, drive_url = sync.upload_to_google_drive(
            drive_service=drive_service,
            file_stream=buffer,
            filename=filename,
            mimetype=None,
            folder_id=sync.GOOGLE_DRIVE_FOLDER_ID
        )
        print(f"   ✔ Subido a Drive. ID: {drive_id}")
        print(f"   URL: {drive_url}")

        # PASO C: Actualizar BD
        print(f"3/4. Actualizando base de datos PostgreSQL...")
        resultado_bd = sync.update_database_record(
            conn=db_conn,
            r2_key=r2_key,
            filename=filename,
            drive_id=drive_id,
            drive_url=drive_url
        )

        # PASO D: Borrar de R2 (solo si BD actualizada)
        if resultado_bd == 'actualizado':
            confirm = input(f"\n4/4. BD actualizada. ¿Borrar '{r2_key}' de R2? [y/N]: ").strip().lower()
            if confirm == 'y':
                r2_client.delete_object(Bucket=sync.R2_BUCKET_NAME, Key=r2_key)
                print(f"   🗑️  Borrado de R2. Migración completa.")
            else:
                print(f"   ⏭️  NO borrado de R2 (según tu decisión).")
        elif resultado_bd == 'huerfano':
            queue_id = sync.queue_orphan(
                conn=db_conn,
                r2_key=r2_key,
                filename=filename,
                file_size=file_size,
                drive_id=drive_id,
                drive_url=drive_url
            )
            sync.send_orphan_notification(r2_key, filename, file_size, drive_url, queue_id)
            print(f"   📥 Encolado como huérfano (ID #{queue_id}). NO se borra de R2.")
        else:
            print(f"   ❌ Error en BD, no se borra de R2.")

    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")
        db_conn.rollback()
    finally:
        db_conn.close()


if __name__ == "__main__":
    main()
