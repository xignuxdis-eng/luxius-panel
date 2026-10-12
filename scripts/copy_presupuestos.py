import psycopg2
from psycopg2.extras import RealDictCursor
import json

NEON_DSN = "postgresql://neondb_owner:npg_FjIl48GyUqDx@ep-plain-fire-axw02rtm.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"
SUPABASE_DSN = "postgresql://postgres.stravgsssyvyxeslpryk:Nueva98261!@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

neon_conn = psycopg2.connect(NEON_DSN)
supa_conn = psycopg2.connect(SUPABASE_DSN)
supa_conn.autocommit = True

neon_cur = neon_conn.cursor(cursor_factory=RealDictCursor)
supa_cur = supa_conn.cursor()

neon_cur.execute("SELECT * FROM presupuestos;")
rows = neon_cur.fetchall()
print(f"Total filas en Neon presupuestos: {len(rows)}")

columns = list(rows[0].keys())
col_names = ", ".join([f'"{c}"' for c in columns])
placeholders = ", ".join(["%s"] * len(columns))

insert_sql = f'INSERT INTO "presupuestos" ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;'

inserted = 0
for r in rows:
    vals = []
    for c in columns:
        v = r[c]
        if isinstance(v, (dict, list)):
            v = json.dumps(v)
        vals.append(v)
    try:
        supa_cur.execute(insert_sql, tuple(vals))
        inserted += 1
    except Exception as e:
        print(f"Error insertando presupuesto {r['id']}: {e}")

print(f"Insertados exitosamente en Supabase: {inserted}")

supa_cur.execute("SELECT count(*) FROM presupuestos;")
print("Conteo final en Supabase presupuestos:", supa_cur.fetchone()[0])

neon_conn.close()
supa_conn.close()
