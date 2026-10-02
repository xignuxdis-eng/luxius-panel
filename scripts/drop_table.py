import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s

conn = s.get_db_connection()
cur = conn.cursor()
cur.execute("DROP TABLE IF EXISTS drive_vault_audits;")
conn.commit()
print('Tabla drive_vault_audits eliminada')

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name = 'drive_vault_audits'")
rows = cur.fetchall()
if rows:
    print('ADVERTENCIA: La tabla sigue existiendo:', rows)
else:
    print('Confirmado: tabla no existe')

conn.close()