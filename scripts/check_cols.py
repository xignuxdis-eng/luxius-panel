import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s

conn = s.get_db_connection()
cur = conn.cursor()

# Check xana_knowledge columns
cur.execute('SELECT column_name FROM information_schema.columns WHERE table_name = \'xana_knowledge\'')
print('=== xana_knowledge columns ===')
for r in cur.fetchall():
    print(r[0])

conn.close()