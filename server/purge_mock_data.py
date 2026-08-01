import json
import os
from app import app, db, Cliente, Usuario, Presupuesto

def purge_all_mock_and_test_data():
    with app.app_context():
        print("Cleaning up database test & mock data...")
        
        # 1. Delete Test & Mock Orders / Presupuestos
        test_orders = Presupuesto.query.filter(
            (Presupuesto.descripcion.ilike('%test%')) |
            (Presupuesto.notas.ilike('%test%')) |
            (Presupuesto.origen == 'test')
        ).all()
        
        for p in test_orders:
            db.session.delete(p)
        db.session.commit()
        print(f"Deleted {len(test_orders)} test orders from SQL database.")

        # 2. Delete Test Clients (keeping real ones)
        test_clients = Cliente.query.filter(
            (Cliente.nombre.ilike('%test%')) |
            (Cliente.email.ilike('%test%'))
        ).all()
        
        for c in test_clients:
            db.session.delete(c)
        db.session.commit()
        print(f"Deleted {len(test_clients)} test clients from SQL database.")

        # 3. Clean server/data JSON fallback files
        data_dir = os.path.join(os.path.dirname(__file__), 'data')
        ordenes_json = os.path.join(data_dir, 'ordenes.json')
        if os.path.exists(ordenes_json):
            with open(ordenes_json, 'w', encoding='utf-8') as f:
                json.dump([], f)
            print("Purged ordenes.json")

        print("Database purge complete! System is clean.")

if __name__ == '__main__':
    purge_all_mock_and_test_data()
