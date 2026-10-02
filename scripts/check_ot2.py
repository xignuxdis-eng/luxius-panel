import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s

conn = s.get_db_connection()
cur = conn.cursor()

# Check more sample data, including the full especificaciones JSON
cur.execute("""SELECT id, descripcion, origen, especificaciones FROM presupuestos WHERE especificaciones IS NOT NULL LIMIT 10""")
rows = cur.fetchall()
print('=== Full especificaciones samples ===')
for r in rows:
    print(f'id={r[0]}')
    print(f'  descripcion={r[1]}')
    print(f'  origen={r[2]}')
    import json
    if r[3]:
        print(f'  especificaciones={json.dumps(r[3], indent=4, ensure_ascii=False)}')
    print()

# Also check if there are any other fields in especificaciones that might contain OT
cur.execute("""SELECT DISTINCT jsonb_object_keys(especificaciones::jsonb) FROM presupuestos WHERE especificaciones IS NOT NULL""")
keys = [r[0] for r in cur.fetchall()]
print('=== All keys in especificaciones ===')
print(keys)

conn.close()