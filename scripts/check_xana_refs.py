import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s

conn = s.get_db_connection()
cur = conn.cursor()

# Check xana_knowledge for drive_reconciliation
cur.execute("""SELECT id, topic, content FROM xana_knowledge 
    WHERE content ILIKE '%drive_reconciliation%' OR topic ILIKE '%drive_reconciliation%' 
    OR content ILIKE '%reconciliacion%' OR topic ILIKE '%reconciliacion%'""")
rows = cur.fetchall()
print('=== xana_knowledge ===')
for r in rows:
    print(f'id={r[0]}, topic={r[1][:100]}')
    print(f'  content: {str(r[2])[:200]}...')
    print()

# Check xana_decisions
cur.execute("""SELECT id, choice, topic, reason FROM xana_decisions 
    WHERE choice ILIKE '%drive_reconciliation%' OR choice ILIKE '%reconciliacion%' OR choice ILIKE '%vault%' 
    OR topic ILIKE '%drive_reconciliation%' OR topic ILIKE '%reconciliacion%' OR topic ILIKE '%vault%'""")
rows = cur.fetchall()
print('=== xana_decisions ===')
for r in rows:
    print(f'id={r[0]}, choice={str(r[1])[:100]}, topic={r[2]}, reason={str(r[3])[:100]}...')

# Check xana_tasks
cur.execute("""SELECT id, project, objective FROM xana_tasks 
    WHERE objective ILIKE '%drive_reconciliation%' OR objective ILIKE '%reconciliacion%' OR objective ILIKE '%vault%'""")
rows = cur.fetchall()
print()
print('=== xana_tasks ===')
for r in rows:
    print(f'id={r[0]}, project={r[1]}, objective={str(r[2])[:200]}...')

# Check ConfigGlobal for google_drive_oauth
cur.execute("""SELECT clave, valor FROM config_global WHERE clave LIKE '%google%' OR clave LIKE '%drive%'""")
rows = cur.fetchall()
print()
print('=== config_global (google/drive) ===')
for r in rows:
    print(f'clave={r[0]}, valor={str(r[1])[:300]}...')

# Check .env variables for drive
print()
print('=== .env check ===')
import os
from dotenv import load_dotenv
load_dotenv()
vars_to_check = [
    'GOOGLE_DRIVE_SHARED_DRIVE_ID',
    'GOOGLE_DRIVE_VAULT_FOLDER_ID', 
    'GOOGLE_DRIVE_FOLDER_ID',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_OAUTH_TOKEN_JSON',
    'GOOGLE_OAUTH_TOKEN_FILE'
]
for v in vars_to_check:
    val = os.getenv(v)
    if val:
        print(f'{v}={val[:60]}...' if len(val) > 60 else f'{v}={val}')
    else:
        print(f'{v}=NOT SET')

conn.close()