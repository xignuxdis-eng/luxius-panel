import psycopg2

SUPABASE_DSN = 'postgresql://postgres.stravgsssyvyxeslpryk:Nueva98261!@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
conn = psycopg2.connect(SUPABASE_DSN)
cur = conn.cursor()

# Verificar si agustin ya existe
cur.execute("SELECT id, nombre, username, rol FROM usuarios WHERE username = 'agustin';")
row = cur.fetchone()
if not row:
    cur.execute("""
        INSERT INTO usuarios (nombre, username, rol, habilitado, token_version)
        VALUES ('Agustín', 'agustin', 'cortador', true, 1);
    """)
    conn.commit()
    print("Agustín creado en usuarios.")
else:
    print("Agustín ya existía:", row)

cur.execute("SELECT id, nombre, username, rol FROM usuarios WHERE username IN ('adrian', 'carlos', 'mirta', 'agustin') ORDER BY id;")
for r in cur.fetchall():
    print("Miembro:", r)

conn.close()
