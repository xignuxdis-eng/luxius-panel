import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s

conn = s.get_db_connection()
cur = conn.cursor()

# Check xana_tasks columns
print('=== xana_tasks columns ===')
cur.execute("""SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'xana_tasks' ORDER BY ordinal_position""")
for r in cur.fetchall():
    print(f'  {r[0]}: {r[1]}')

# Check xana_tasks for drive/r2/vault
print()
print('=== xana_tasks with drive/r2/vault ===')
cur.execute("""SELECT column_name FROM information_schema.columns WHERE table_name = 'xana_tasks' AND column_name IN ('descripcion', 'description', 'title', 'name', 'details')""")
text_col = None
for r in cur.fetchall():
    text_col = r[0]
    break

if text_col:
    cur.execute(f"""SELECT id, {text_col} FROM xana_tasks WHERE {text_col} ILIKE '%drive%' OR {text_col} ILIKE '%r2%' OR {text_col} ILIKE '%vault%' LIMIT 10""")
    rows = cur.fetchall()
    if rows:
        for r in rows:
            print(f'  id={r[0]}, {text_col}={r[1][:100]}')
    else:
        print('  (ninguna)')
else:
    print('  No text column found for search')

# Check presupuestos.especificaciones for R2/Drive keys
print()
print('=== presupuestos.especificaciones keys search ===')
cur.execute("""SELECT id, especificaciones FROM presupuestos WHERE especificaciones IS NOT NULL AND (especificaciones::text ILIKE '%r2%' OR especificaciones::text ILIKE '%drive%' OR especificaciones::text ILIKE '%key%' OR especificaciones::text ILIKE '%url%' OR especificaciones::text ILIKE '%cloudflare%' OR especificaciones::text ILIKE '%bucket%') LIMIT 5""")
rows = cur.fetchall()
for r in rows:
    print(f'  id={r[0]}')
    print(f'  {str(r[1])[:500]}...')

conn.close()