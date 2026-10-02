import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s

conn = s.get_db_connection()
cur = conn.cursor()

# Check sync_log columns
print('=== sync_log columns ===')
cur.execute("""SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sync_log' ORDER BY ordinal_position""")
for r in cur.fetchall():
    print(f'  {r[0]}: {r[1]}')

# Check sync_log recent entries
print()
print('=== sync_log recent entries ===')
cur.execute("""SELECT * FROM sync_log ORDER BY id DESC LIMIT 10""")
for r in cur.fetchall():
    print(f'  {r}')

# Check orphan_review_queue
print()
print('=== orphan_review_queue ===')
cur.execute("""SELECT * FROM orphan_review_queue ORDER BY id DESC LIMIT 10""")
for r in cur.fetchall():
    print(f'  {r}')

# Check if there are any records in presupuestos with non-empty archivos arrays
print()
print('=== presupuestos with non-empty archivos ===')
cur.execute("""SELECT id, especificaciones FROM presupuestos WHERE especificaciones IS NOT NULL AND (especificaciones->>'archivos') != '[]' LIMIT 5""")
rows = cur.fetchall()
for r in rows:
    print(f'  id={r[0]}')
    print(f'  archivos={r[1].get("archivos", [])}')

# Check drive_vault_audits
print()
print('=== drive_vault_audits ===')
cur.execute("""SELECT * FROM drive_vault_audits ORDER BY id DESC LIMIT 5""")
for r in cur.fetchall():
    print(f'  {r}')

conn.close()