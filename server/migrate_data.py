import os
import json
from app import app, db, Cliente, Usuario, Maquina, Presupuesto, ConfigGlobal, _get_json_collection, _save_json_collection, _apply_cliente_fields, _apply_usuario_fields, _apply_maquina_fields

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[Migrate] Error loading {filename}: {e}")
    return []

def migrate_all():
    with app.app_context():
        db.create_all()
        print("[Migrate] Starting Data Migration from JSON to SQL Database...")

        # 1. Migrate Clientes
        clientes_data = load_json('clientes.json')
        c_count = 0
        for item in clientes_data:
            cid = item.get('id')
            if not cid:
                continue
            cliente = db.session.get(Cliente, cid)
            if not cliente:
                cliente = Cliente(id=cid)
                db.session.add(cliente)
                c_count += 1
            _apply_cliente_fields(cliente, item)
        db.session.commit()
        print(f"[OK] Migrated {c_count} new Clientes (Total: {Cliente.query.count()})")

        # 2. Migrate Maquinas
        maquinas_data = load_json('maquinas.json')
        m_count = 0
        for item in maquinas_data:
            mid = item.get('id')
            if not mid:
                continue
            maquina = db.session.get(Maquina, mid)
            if not maquina:
                maquina = Maquina(id=mid)
                db.session.add(maquina)
                m_count += 1
            _apply_maquina_fields(maquina, item)
        db.session.commit()
        print(f"[OK] Migrated {m_count} new Maquinas (Total: {Maquina.query.count()})")

        # 3. Migrate Usuarios
        usuarios_data = load_json('usuarios.json')
        u_count = 0
        for item in usuarios_data:
            uid = item.get('id')
            uname = (item.get('username') or '').strip().lower()
            if not uid:
                continue
            user = db.session.get(Usuario, uid)
            if not user and uname:
                user = Usuario.query.filter_by(username=uname).first()
            if not user:
                user = Usuario(id=uid)
                db.session.add(user)
                u_count += 1
            try:
                _apply_usuario_fields(user, item)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                print(f"[Migrate Warning] Skipping user id {uid} ({uname}): {e}")
        print(f"[OK] Migrated {u_count} new Usuarios (Total: {Usuario.query.count()})")

        # 4. Migrate JSON Collections (Materiales, Servicios, Calidades, Logisticas)
        for col_name in ['materiales', 'servicios', 'calidades', 'logisticas']:
            data = load_json(f'{col_name}.json')
            if data:
                existing = _get_json_collection(col_name)
                # Merge by ID/codigo
                existing_map = {str(x.get('id') or x.get('codigo')): x for x in existing}
                for item in data:
                    key = str(item.get('id') or item.get('codigo'))
                    if key:
                        existing_map[key] = item
                merged_list = list(existing_map.values())
                _save_json_collection(col_name, merged_list)
                print(f"[OK] Migrated collection {col_name}: {len(merged_list)} items.")

        print("[SUCCESS] Migration Completed Successfully!")

if __name__ == '__main__':
    migrate_all()
