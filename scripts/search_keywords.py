import psycopg2
from psycopg2.extras import RealDictCursor

SUPABASE_DSN = 'postgresql://postgres.stravgsssyvyxeslpryk:Nueva98261!@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
conn = psycopg2.connect(SUPABASE_DSN)
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("""
    SELECT p.id, c.nombre as cliente, p.descripcion, p.created_at, p.especificaciones, p.notas
    FROM presupuestos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE p.descripcion ILIKE '%mosto%'
       OR CAST(p.especificaciones AS TEXT) ILIKE '%mosto%'
       OR CAST(p.notas AS TEXT) ILIKE '%mosto%';
""")
rows = cur.fetchall()
print(f"Total registros con palabra 'mosto': {len(rows)}")
for r in rows:
    print(r)

cur.execute("""
    SELECT p.id, c.nombre as cliente, p.descripcion, p.created_at
    FROM presupuestos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE c.nombre ILIKE '%xignux%' OR p.descripcion ILIKE '%xignux%';
""")
rows_xignux = cur.fetchall()
print(f"\nTotal registros con palabra 'xignux': {len(rows_xignux)}")
for rx in rows_xignux:
    print(rx)

conn.close()
