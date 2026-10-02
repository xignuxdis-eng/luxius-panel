import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s

conn = s.get_db_connection()
cur = conn.cursor()

# Check xana_tasks with drive/r2/vault in objective column
print('=== xana_tasks with drive/r2/vault (objective) ===')
cur.execute("""SELECT id, objective FROM xana_tasks WHERE objective ILIKE '%drive%' OR objective ILIKE '%r2%' OR objective ILIKE '%vault%' LIMIT 10""")
rows = cur.fetchall()
if rows:
    for r in rows:
        print(f'  id={r[0]}, objective={r[1][:200]}')
else:
    print('  (ninguna)')

# Check sync_log table for any R2/Drive related entries
print()
print('=== sync_log recent entries ===')
cur.execute("""SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 10""")
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

conn.close()