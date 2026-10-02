#!/usr/bin/env python3
"""
Prueba Controlada: Migración de UN SOLO archivo real

Reutiliza las mismas funciones de sync_r2_to_drive.py (conexión a R2, búsqueda
de presupuesto, árbol de carpetas en Drive, subida, actualización de BD) pero
las aplica sobre un único archivo elegido a mano, con confirmación antes de
borrar nada.

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
        print('\nUso: python scripts/test_single_file.py "clave/exacta/archivo.ext"')
        return

    try:
        obj = r2_client.head_object(Bucket=sync.R2_BUCKET_NAME, Key=r2_key)
    except Exception as e:
        print(f"Error: no se encontró el objeto '{r2_key}' en el bucket: {e}")
        return

    filename = os.path.basename(r2_key)
    file_size = obj.get('ContentLength', obj.get('Size', 0))
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

    # Búsqueda de solo lectura ANTES de preguntar nada — no autentica con Drive,
    # no escribe en la BD, no descarga ni sube ni borra nada todavía.
    db_conn = sync.get_db_connection()
    print(f"\nBuscando presupuesto asociado a '{filename}'...")
    match = sync.buscar_presupuesto_por_archivo(db_conn, filename)

    if match and sync.requiere_proteccion_por_no_impreso(match['estado'], match['deleted_at']):
        print(
            f"\n🔒 PROTEGIDO: presupuesto #{match['presupuesto_id']} (estado='{match['estado']}') "
            f"todavía no está impreso. El archivo se deja intacto en R2, no se sube ni se toca nada."
        )
        db_conn.close()
        return

    if match:
        fecha = match['created_at']
        partes_ruta = [
            f"{fecha.year:04d}", f"{fecha.month:02d}", f"{fecha.day:02d}",
            match['cliente_nombre'], match['ot'],
        ]
        print(f"✔ Match: Presupuesto #{match['presupuesto_id']} | Cliente: {match['cliente_nombre']} | {match['ot']}")
    else:
        partes_ruta = [sync.CARPETA_HUERFANOS]
        print("⚠️ No matchea con ningún presupuesto — iría a la carpeta de huérfanos.")

    print(f"Ruta prevista en Drive: {'/'.join(partes_ruta)}")

    # Recién ahora se pregunta, ya sabiendo qué va a pasar. A partir de acá
    # todo lo que sigue SÍ tiene efectos reales (Drive, BD, R2).
    try:
        resp = input("\n¿Continuar con la migración de ESTE archivo? [y/N]: ").strip().lower()
    except EOFError:
        resp = 'n'
        print("\n(No se pudo leer confirmación interactiva — se asume 'no continuar' por seguridad.)")

    if resp != 'y':
        print("Abortado por el usuario.")
        db_conn.close()
        return

    drive_service = sync.get_drive_service()
    sync.ensure_orphan_queue_table(db_conn)
    folder_cache = {}

    try:
        carpeta_id = sync.construir_ruta_carpetas(drive_service, sync.GOOGLE_DRIVE_FOLDER_ID, partes_ruta, folder_cache)

        print(f"1/3. Descargando '{r2_key}' desde R2...")
        buffer = io.BytesIO()
        r2_client.download_fileobj(sync.R2_BUCKET_NAME, r2_key, buffer)
        buffer.seek(0)

        print(f"2/3. Subiendo '{filename}' a Google Drive...")
        drive_id, drive_url = sync.upload_to_google_drive(
            drive_service=drive_service,
            file_stream=buffer,
            filename=filename,
            mimetype=None,
            folder_id=carpeta_id
        )
        print(f"   ✔ Subido a Drive. ID: {drive_id}")
        print(f"   URL: {drive_url}")

        if match:
            sync.guardar_referencia_drive(db_conn, match['presupuesto_id'], filename, drive_id, drive_url)
            try:
                confirm = input(f"\n3/3. BD actualizada. ¿Borrar '{r2_key}' de R2? [y/N]: ").strip().lower()
            except EOFError:
                confirm = 'n'
                print("\n   (No se pudo leer confirmación interactiva — se asume 'no borrar' por seguridad.)")

            if confirm == 'y':
                r2_client.delete_object(Bucket=sync.R2_BUCKET_NAME, Key=r2_key)
                print(f"   🗑️  Borrado de R2. Migración completa.")
            else:
                print(f"   ⏭️  NO borrado de R2 (según tu decisión).")
        else:
            queue_id = sync.queue_orphan(db_conn, r2_key, filename, file_size, drive_id, drive_url)
            sync.send_orphan_notification(r2_key, filename, file_size, drive_url, queue_id)
            print(f"   📥 Encolado como huérfano (ID #{queue_id}). NO se borra de R2.")

    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")
        db_conn.rollback()
    finally:
        db_conn.close()


if __name__ == "__main__":
    main()
