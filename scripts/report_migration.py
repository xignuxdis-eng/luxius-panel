import psycopg2
from psycopg2.extras import RealDictCursor

SUPABASE_DSN = 'postgresql://postgres.stravgsssyvyxeslpryk:Nueva98261!@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
conn = psycopg2.connect(SUPABASE_DSN)
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("""
    SELECT p.id, c.nombre as cliente, p.descripcion, p.estado, p.total, p.created_at
    FROM presupuestos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE c.nombre ILIKE '%axis%' 
       OR c.nombre ILIKE '%xignux%' 
       OR p.descripcion ILIKE '%mosto%'
       OR p.descripcion ILIKE '%axis%'
       OR p.descripcion ILIKE '%xignux%'
       OR CAST(p.especificaciones AS TEXT) ILIKE '%mosto%'
    ORDER BY p.created_at DESC;
""")
orders = cur.fetchall()
print(f"Total órdenes encontradas: {len(orders)}")
for o in orders:
    print(f"- ID: {o['id']} | Cliente: {o['cliente']} | Desc: {o['descripcion']} | Estado: {o['estado']} | Fecha: {o['created_at']}")

print("\n--- Verificación general de todas las tablas en Supabase ---")
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
""")
tables = [r['table_name'] for r in cur.fetchall()]
for t in tables:
    cur.execute(f'SELECT count(*) FROM "{t}";')
    cnt = cur.fetchone()['count']
    print(f"Tabla {t.ljust(25)}: {cnt} registros")

conn.close()
