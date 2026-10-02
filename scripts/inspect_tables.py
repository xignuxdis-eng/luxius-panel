import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s

conn = s.get_db_connection()
cur = conn.cursor()

for t in ['presupuestos', 'clientes', 'drive_vault_audits']:
    print(f'--- {t} ---')
    cur.execute(f"""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name='{t}' 
        ORDER BY ordinal_position
    """)
    for r in cur.fetchall():
        print(f'  {r[0]}: {r[1]}')

conn.close()