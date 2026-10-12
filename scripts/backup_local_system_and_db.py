#!/usr/bin/env python3
"""
Script de Backup Integral Local de LuXius:
1. Exporta la Base de Datos completa (SQL + JSON por tabla) desde Supabase.
2. Genera un archivo ZIP del código del sistema (Frontend, Scripts, Memoria de Sistema y Configuración).
"""

import os
import sys
import json
import zipfile
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Codificación UTF-8 en terminales Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKUPS_DIR = os.path.join(BASE_DIR, "backups")
os.makedirs(BACKUPS_DIR, exist_ok=True)

TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
DB_BACKUP_DIR = os.path.join(BACKUPS_DIR, f"db_backup_{TIMESTAMP}")
os.makedirs(DB_BACKUP_DIR, exist_ok=True)

SYSTEM_ZIP_PATH = os.path.join(BACKUPS_DIR, f"luxius_system_backup_{TIMESTAMP}.zip")

# DSN Supabase
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = 'postgresql://postgres.stravgsssyvyxeslpryk:Nueva98261!@aws-0-us-east-1.pooler.supabase.com:5432/postgres'

print("==========================================================")
print(" 🛡️  INICIANDO RESPALDO LOCAL DE SISTEMA Y BASE DE DATOS")
print(f" Timestamp: {TIMESTAMP}")
print(f" Carpeta destino: {BACKUPS_DIR}")
print("==========================================================\n")

# --- PASO 1: BACKUP DE BASE DE DATOS ---
print("📦 [1/2] Conectando a Supabase PostgreSQL...")
try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    print("✔ Conexión exitosa a la base de datos.")

    # Obtener todas las tablas del esquema public
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    tables = [r['table_name'] for r in cur.fetchall()]
    print(f"✔ Tablas detectadas ({len(tables)}): {', '.join(tables)}\n")

    sql_dump_file = os.path.join(DB_BACKUP_DIR, "full_database_dump.sql")
    metadata_summary = {
        "timestamp": TIMESTAMP,
        "database_host": conn.info.host,
        "database_name": conn.info.dbname,
        "tables": {}
    }

    with open(sql_dump_file, "w", encoding="utf-8") as sql_f:
        sql_f.write(f"-- LuXius Database Full Dump\n-- Generado: {datetime.now().isoformat()}\n\n")
        sql_f.write("SET session_replication_role = 'replica';\n\n")

        for table in tables:
            print(f"  -> Extrayendo tabla '{table}'...")
            cur.execute(f'SELECT * FROM "{table}";')
            rows = cur.fetchall()

            # Serializador JSON seguro para fechas y UUIDs
            def default_json(obj):
                if isinstance(obj, datetime):
                    return obj.isoformat()
                return str(obj)

            # 1. Guardar JSON por tabla
            table_json_file = os.path.join(DB_BACKUP_DIR, f"{table}.json")
            with open(table_json_file, "w", encoding="utf-8") as jf:
                json.dump(rows, jf, default=default_json, indent=2, ensure_ascii=False)

            # 2. Generar SQL de restauración
            if rows:
                cols = list(rows[0].keys())
                cols_str = ', '.join([f'"{c}"' for c in cols])
                sql_f.write(f"-- Datos de la tabla {table} ({len(rows)} filas)\n")
                
                for row in rows:
                    values = []
                    for c in cols:
                        val = row[c]
                        if val is None:
                            values.append("NULL")
                        elif isinstance(val, (int, float)):
                            values.append(str(val))
                        elif isinstance(val, bool):
                            values.append("TRUE" if val else "FALSE")
                        elif isinstance(val, (dict, list)):
                            escaped = json.dumps(val, default=default_json).replace("'", "''")
                            values.append(f"'{escaped}'")
                        elif isinstance(val, datetime):
                            values.append(f"'{val.isoformat()}'")
                        else:
                            escaped = str(val).replace("'", "''")
                            values.append(f"'{escaped}'")
                    
                    sql_f.write(f'INSERT INTO "{table}" ({cols_str}) VALUES ({", ".join(values)}) ON CONFLICT DO NOTHING;\n')
                sql_f.write("\n")

            metadata_summary["tables"][table] = len(rows)
            print(f"     ✔ {len(rows)} registros respaldados en {table}.json y en SQL.")

        sql_f.write("\nSET session_replication_role = 'origin';\n")

    summary_file = os.path.join(DB_BACKUP_DIR, "summary.json")
    with open(summary_file, "w", encoding="utf-8") as sf:
        json.dump(metadata_summary, sf, indent=2)

    cur.close()
    conn.close()
    print(f"\n✔ Base de datos respaldada exitosamente en:\n  {DB_BACKUP_DIR}")

except Exception as e:
    print(f"❌ Error al respaldar la base de datos: {e}")
    sys.exit(1)


# --- PASO 2: BACKUP DE CÓDIGO Y SISTEMA ---
print("\n📁 [2/2] Creando archivo ZIP del sistema...")

EXCLUDE_DIRS = {'node_modules', '.git', 'dist', 'build', '__pycache__', 'backups', '.vite', '.tempmediaStorage'}
EXCLUDE_EXTS = {'.zip', '.log', '.tmp', '.lock'}

total_files_zipped = 0
with zipfile.ZipFile(SYSTEM_ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(BASE_DIR):
        # Excluir directorios pesados
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in EXCLUDE_EXTS:
                continue
            
            abs_path = os.path.join(root, file)
            rel_path = os.path.relpath(abs_path, BASE_DIR)
            
            # No incluir archivos dentro de backups
            if rel_path.startswith("backups") or rel_path.startswith(".git"):
                continue

            zipf.write(abs_path, rel_path)
            total_files_zipped += 1

zip_size_mb = os.path.getsize(SYSTEM_ZIP_PATH) / (1024 * 1024)
print(f"✔ Archivos incluidos: {total_files_zipped}")
print(f"✔ Tamaño comprimido: {zip_size_mb:.2f} MB")
print(f"✔ Archivo ZIP generado en:\n  {SYSTEM_ZIP_PATH}")

print("\n==========================================================")
print(" ✅ RESPALDO COMPLETO REALIZADO CON ÉXITO")
print("==========================================================")
print(f" BD DUMP   : {DB_BACKUP_DIR}")
print(f" SISTEMA   : {SYSTEM_ZIP_PATH}")
print("==========================================================")
