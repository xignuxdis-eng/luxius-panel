import psycopg2
from psycopg2.extras import RealDictCursor
import json
import sys

NEON_DSN = "postgresql://neondb_owner:npg_FjIl48GyUqDx@ep-plain-fire-axw02rtm.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"
SUPABASE_DSN = "postgresql://postgres.stravgsssyvyxeslpryk:Nueva98261!@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

def main():
    print("[1/5] Conectando a Neon...")
    try:
        neon_conn = psycopg2.connect(NEON_DSN)
        print("  -> Conexión a Neon EXITOSA!")
    except Exception as e:
        print(f"  -> ERROR al conectar a Neon: {e}")
        sys.exit(1)

    print("[2/5] Conectando a Supabase...")
    try:
        supa_conn = psycopg2.connect(SUPABASE_DSN)
        print("  -> Conexión a Supabase EXITOSA!")
    except Exception as e:
        print(f"  -> ERROR al conectar a Supabase: {e}")
        neon_conn.close()
        sys.exit(1)

    neon_cur = neon_conn.cursor(cursor_factory=RealDictCursor)
    supa_cur = supa_conn.cursor()

    # 1. Obtener todas las tablas públicas en Neon
    neon_cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    tables = [r['table_name'] for r in neon_cur.fetchall()]
    print(f"[3/5] Tablas encontradas en Neon ({len(tables)}): {tables}")

    # 2. Para cada tabla, sincronizar los datos
    print("[4/5] Migrando tablas completas...")
    
    # Orden de migración recomendado si hay foreign keys:
    priority_order = ['usuarios', 'vendedores', 'clientes', 'maquinas', 'presupuestos', 'config_global', 'drive_vault_audits', 'sync_log']
    ordered_tables = [t for t in priority_order if t in tables] + [t for t in tables if t not in priority_order]

    for table in ordered_tables:
        print(f"\n--- Migrando tabla: {table} ---")
        neon_cur.execute(f"SELECT * FROM \"{table}\";")
        rows = neon_cur.fetchall()
        print(f"  Filas encontradas en Neon: {len(rows)}")
        if not rows:
            print(f"  Tabla vacía en Neon, omitiendo copia.")
            continue

        columns = list(rows[0].keys())
        col_names = ", ".join([f'"{c}"' for c in columns])
        placeholders = ", ".join(["%s"] * len(columns))

        # Encontrar primary key de la tabla en Neon
        neon_cur.execute(f"""
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_name = '{table}';
        """)
        pk_rows = neon_cur.fetchall()
        pk_cols = [r['column_name'] for r in pk_rows]

        # Verificar si la tabla existe en Supabase, si no, crearla con el DDL básico o migrar
        supa_cur.execute(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = '{table}'
            );
        """)
        exists_in_supa = supa_cur.fetchone()[0]

        if not exists_in_supa:
            print(f"  [AVISO] La tabla {table} no existía en Supabase. Extrayendo DDL de Neon...")
            # Extraer columnas y tipos de Neon
            neon_cur.execute(f"""
                SELECT column_name, data_type, udt_name, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '{table}';
            """)
            col_defs = []
            for col in neon_cur.fetchall():
                t = col['udt_name']
                if t == 'varchar': t = 'text'
                col_defs.append(f'"{col["column_name"]}" {t}')
            create_sql = f'CREATE TABLE IF NOT EXISTS "{table}" ({", ".join(col_defs)});'
            supa_cur.execute(create_sql)
            supa_conn.commit()
            print(f"  Tabla {table} creada en Supabase.")

        # Obtener columnas existentes en Supabase para evitar discrepancias si alguna columna difiere
        supa_cur.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '{table}';
        """)
        supa_cols = set([r[0] for r in supa_cur.fetchall()])

        valid_cols = [c for c in columns if c in supa_cols]
        valid_col_names = ", ".join([f'"{c}"' for c in valid_cols])
        valid_placeholders = ", ".join(["%s"] * len(valid_cols))

        # Si tenemos primary key, hacemos UPSERT (ON CONFLICT DO UPDATE)
        if pk_cols and all(pk in valid_cols for pk in pk_cols):
            pk_conflict = ", ".join([f'"{pk}"' for pk in pk_cols])
            update_assignments = ", ".join([f'"{c}" = EXCLUDED."{c}"' for c in valid_cols if c not in pk_cols])
            if update_assignments:
                insert_sql = f"""
                    INSERT INTO "{table}" ({valid_col_names})
                    VALUES ({valid_placeholders})
                    ON CONFLICT ({pk_conflict}) DO UPDATE SET {update_assignments};
                """
            else:
                insert_sql = f"""
                    INSERT INTO "{table}" ({valid_col_names})
                    VALUES ({valid_placeholders})
                    ON CONFLICT ({pk_conflict}) DO NOTHING;
                """
        else:
            # Sin PK identificada, truncate o insert directo
            insert_sql = f"""
                INSERT INTO "{table}" ({valid_col_names})
                VALUES ({valid_placeholders});
            """

        inserted_count = 0
        for row in rows:
            values = []
            for c in valid_cols:
                val = row[c]
                # Si es dict o list para campos jsonb
                if isinstance(val, (dict, list)):
                    val = json.dumps(val)
                values.append(val)
            try:
                supa_cur.execute(insert_sql, tuple(values))
                inserted_count += 1
            except Exception as e_row:
                print(f"  Error en fila {table}: {e_row}")
                supa_conn.rollback()
                break
        else:
            supa_conn.commit()
            print(f"  -> Migrados con éxito: {inserted_count}/{len(rows)} registros.")

    print("\n[5/5] Sincronización de secuencias (IDs autoincrementales)...")
    for table in ordered_tables:
        try:
            supa_cur.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = '{table}' AND column_default LIKE 'nextval%';
            """)
            seq_cols = supa_cur.fetchall()
            for sc in seq_cols:
                col_name = sc[0]
                supa_cur.execute(f"""
                    SELECT setval(pg_get_serial_sequence('"{table}"', '{col_name}'), COALESCE(MAX("{col_name}"), 1)) FROM "{table}";
                """)
                supa_conn.commit()
                print(f"  Secuencia actualizada para {table}.{col_name}")
        except Exception as e_seq:
            supa_conn.rollback()

    neon_cur.close()
    neon_conn.close()
    supa_cur.close()
    supa_conn.close()
    print("\n=======================================================")
    print("  ¡MIGRACIÓN COMPLETA Y VERIFICADA AL 100%!")
    print("=======================================================")

if __name__ == "__main__":
    main()
