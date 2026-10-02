import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s

conn = s.get_db_connection()
cur = conn.cursor()

# Check all columns in presupuestos
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'presupuestos' ORDER BY ordinal_position")
cols = [r[0] for r in cur.fetchall()]
print('=== presupuestos columns ===')
for c in cols:
    print(c)

# Check some sample data for OT-related fields
cur.execute("""SELECT id, descripcion, origen, (especificaciones::jsonb -> 'carteles') AS carteles FROM presupuestos LIMIT 3""")
rows = cur.fetchall()
print()
print('=== Sample data ===')
for r in rows:
    print(f'id={r[0]}')
    print(f'  descripcion={r[1]}')
    print(f'  origen={r[2]}')
    print(f'  carteles={r[3]}')
    print()

conn.close()