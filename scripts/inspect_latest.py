import psycopg2
from psycopg2.extras import RealDictCursor

SUPABASE_DSN = 'postgresql://postgres.stravgsssyvyxeslpryk:Nueva98261!@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
conn = psycopg2.connect(SUPABASE_DSN)
cur = conn.cursor(cursor_factory=RealDictCursor)

print("--- Columnas de clientes ---")
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clientes';")
cols = [r['column_name'] for r in cur.fetchall()]
print(cols)

print("\n--- Últimos 10 clientes creados ---")
cur.execute("SELECT * FROM clientes ORDER BY id DESC LIMIT 10;")
for cl in cur.fetchall():
    print(cl)

print("\n--- Últimos 10 presupuestos creados ---")
cur.execute("SELECT * FROM presupuestos ORDER BY id DESC LIMIT 10;")
for pr in cur.fetchall():
    print(pr)

conn.close()
