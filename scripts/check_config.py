import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s

conn = s.get_db_connection()
cur = conn.cursor()
cur.execute("SELECT clave, valor FROM config_global WHERE clave = 'google_drive_oauth'")
rows = cur.fetchall()
if rows:
    for r in rows:
        print(f'EXISTE: {r[0]} = {str(r[1])[:300]}...')
else:
    print('NO EXISTE: config_global.google_drive_oauth')
conn.close()