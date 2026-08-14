import sys, json, uuid
sys.path.insert(0, r'f:\XignuX Print Den\server')
from app import app
from models import db

DATA_FILE = r'f:\XignuX Print Den\server\data\ordenes.json'
with open(DATA_FILE, 'r', encoding='utf-8') as f:
    ordenes = json.load(f)

print(f'Ordenes en JSON: {len(ordenes)}')

with app.app_context():
    ok = 0
    for o in ordenes:
        new_uuid = str(uuid.uuid4())
        try:
            db.session.execute(db.text(
                'INSERT INTO presupuestos (id, estado, notas, created_at, updated_at) '
                'VALUES (:id, :estado, :notas, NOW(), NOW()) '
                'ON CONFLICT DO NOTHING'
            ), {
                'id': new_uuid,
                'estado': o.get('status', 'borrador'),
                'notas': json.dumps(o, ensure_ascii=False)
            })
            ok += 1
        except Exception as e:
            db.session.rollback()
            print('Error:', str(e)[:100])
    db.session.commit()
    total = db.session.execute(db.text('SELECT COUNT(*) FROM presupuestos')).scalar()
    print(f'Ordenes insertadas: {ok}. Total presupuestos en BD: {total}')
