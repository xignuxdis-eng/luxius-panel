import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s
import json

conn = s.get_db_connection()
cur = conn.cursor()

# Query 1: Check xana_tasks columns first
print("=== xana_tasks columns ===")
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'xana_tasks' 
    ORDER BY ordinal_position
""")
for r in cur.fetchall():
    print(f'  {r[0]}: {r[1]}')

# Query 1b: Search for drive/r2/vault tasks
print("\n=== xana_tasks with drive/r2/vault ===")
cur.execute("""
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'xana_tasks' AND column_name IN ('descripcion', 'descripcion', 'descripcion', 'title', 'description', 'name', 'details')
""")
text_col = None
for r in cur.fetchall():
    text_col = r[0]
    break

if text_col:
    cur.execute(f"""
        SELECT id, {text_col} 
        FROM xana_tasks
        WHERE {text_col} ILIKE '%drive%' OR {text_col} ILIKE '%r2%' OR {text_col} ILIKE '%vault%'
        LIMIT 10
    """)
    rows = cur.fetchall()
    if rows:
        for r in rows:
            print(f'  id={r[0]}, {text_col}={r[1]}')
    else:
        print('  (ninguna)')
else:
    print('  No text column found for search')

# Query 2: Check especificaciones in presupuestos
print("\n=== presupuestos.especificaciones (3 samples) ===")
cur.execute("""
    SELECT id, especificaciones 
    FROM presupuestos
    WHERE especificaciones IS NOT NULL 
    LIMIT 3
""")
rows = cur.fetchall()
for r in rows:
    print(f'  id={r[0]}')
    if r[1]:
        # Pretty print JSON
        if isinstance(r[1], str):
            try:
                parsed = json.loads(r[1])
                print(json.dumps(parsed, indent=4, ensure_ascii=False))
            except:
                print(f'  {r[1]}')
        else:
            print(json.dumps(r[1], indent=4, ensure_ascii=False))
    else:
        print('  NULL')

conn.close()