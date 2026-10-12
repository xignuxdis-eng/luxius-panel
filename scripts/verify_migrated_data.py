import psycopg2
from psycopg2.extras import RealDictCursor

SUPABASE_DSN = 'postgresql://postgres.stravgsssyvyxeslpryk:Nueva98261!@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
conn = psycopg2.connect(SUPABASE_DSN)
cur = conn.cursor(cursor_factory=RealDictCursor)

print("--- Columnas de presupuestos ---")
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'presupuestos';")
cols = [r['column_name'] for r in cur.fetchall()]
print(cols)

print("\n--- Búsqueda de órdenes Mosto / Axis / Xignux ---")
cur.execute("""
    SELECT p.id, c.nombre as cliente_nombre, p.descripcion, p.estado, p.created_at, p.total
    FROM presupuestos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE c.nombre ILIKE '%mosto%' 
       OR c.nombre ILIKE '%axis%' 
       OR c.nombre ILIKE '%xignux%'
       OR p.descripcion ILIKE '%mosto%'
       OR p.descripcion ILIKE '%axis%'
       OR p.descripcion ILIKE '%xignux%'
       OR CAST(p.especificaciones AS TEXT) ILIKE '%mosto%'
    ORDER BY p.id DESC;
""")
orders = cur.fetchall()
print(f"Total órdenes encontradas: {len(orders)}")
for o in orders:
    print(f"ID: {o.get('id')} | Cliente: {o.get('cliente_nombre')} | Desc: {o.get('descripcion')} | Total: ${o.get('total')} | Estado: {o.get('estado')}")


print("\n--- Clientes de Axis y Xignux ---")
cur.execute("""
    SELECT id, nombre, telefono, email, created_at FROM clientes 
    WHERE nombre ILIKE '%axis%' OR nombre ILIKE '%xignux%' OR nombre ILIKE '%mosto%';
""")
clients = cur.fetchall()
print(f"Total clientes encontrados: {len(clients)}")
for cl in clients:
    print(f"ID: {cl.get('id')} | Nombre: {cl.get('nombre')} | Tel: {cl.get('telefono')}")

print("\n--- Conteo total en Supabase ---")
cur.execute("SELECT count(*) FROM presupuestos;")
print("Presupuestos totales:", cur.fetchone()['count'])
cur.execute("SELECT count(*) FROM clientes;")
print("Clientes totales:", cur.fetchone()['count'])
cur.execute("SELECT count(*) FROM usuarios;")
print("Usuarios totales:", cur.fetchone()['count'])
cur.execute("SELECT count(*) FROM vendedores;")
print("Vendedores totales:", cur.fetchone()['count'])

conn.close()
