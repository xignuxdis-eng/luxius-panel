"""
seed_from_json.py
Importa datos desde los archivos JSON locales (server/data/) a la BD PostgreSQL local.
Uso: python seed_from_json.py
"""

import sys, os, json

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Agregar el directorio server al path
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SERVER_DIR)

from app import app
from models import db, Cliente, Maquina, Usuario, ConfigGlobal
from werkzeug.security import generate_password_hash

DATA_DIR = os.path.join(SERVER_DIR, 'data')

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        print(f"  [SKIP] No existe: {path}")
        return []
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data if isinstance(data, list) else []

def save_json_collection(name, data):
    """Guarda una coleccion JSON en config_global (igual que app.py)."""
    row = ConfigGlobal.query.filter_by(clave=f'collection_{name}').first()
    if not row:
        row = ConfigGlobal(clave=f'collection_{name}', valor=[])
        db.session.add(row)
    row.valor = data
    db.session.commit()

def main():
    print("=" * 60)
    print("  LUXIUS - Seed desde JSON locales -> PostgreSQL local")
    print("=" * 60)

    with app.app_context():

        # ── CLIENTES ──────────────────────────────────────────────
        print("\n[->] clientes...")
        clientes = load_json('clientes.json')
        created = 0
        for rec in clientes:
            cid = rec.get('id')
            if not cid:
                continue
            c = db.session.get(Cliente, cid)
            if not c:
                c = Cliente(id=cid)
                db.session.add(c)
                created += 1
            c.nombre      = rec.get('nombre', rec.get('persona', ''))
            c.empresa     = rec.get('empresa', '')
            c.persona     = rec.get('persona', '')
            c.relacion    = rec.get('relacion', '')
            c.responsable = rec.get('responsable', '')
            c.direccion   = rec.get('direccion', '')
            c.categoria   = rec.get('categoria', '')
            c.username    = rec.get('username', '')
            c.email       = rec.get('email', '')
            c.habilitado  = rec.get('habilitado', True)
            c.saldo       = rec.get('saldo', 0.0)
            c.deuda       = rec.get('deuda', 0.0)
            c.balance     = rec.get('balance', 0.0)
            c.pago_cuenta = rec.get('pagoCuenta', 0.0)
            c.precios_especiales = rec.get('preciosEspeciales', {})
        db.session.commit()
        print(f"  Insertados/actualizados: {len(clientes)} clientes ({created} nuevos)")

        # ── MAQUINAS ──────────────────────────────────────────────
        print("\n[->] maquinas...")
        maquinas = load_json('maquinas.json')
        created = 0
        for rec in maquinas:
            mid = rec.get('id')
            if not mid:
                continue
            m = db.session.get(Maquina, mid)
            if not m:
                m = Maquina(id=mid)
                db.session.add(m)
                created += 1
            m.nombre      = rec.get('nombre', '')
            m.marca       = rec.get('marca', '')
            m.modelo      = rec.get('modelo', '')
            m.estado      = rec.get('estado', '')
            m.extra       = {k: v for k, v in rec.items() if k not in ('id','nombre','marca','modelo','estado')}
        db.session.commit()
        print(f"  Insertados/actualizados: {len(maquinas)} maquinas ({created} nuevas)")

        # ── USUARIOS ──────────────────────────────────────────────
        print("\n[->] usuarios...")
        usuarios = load_json('usuarios.json')
        created = 0
        skipped = 0
        for rec in usuarios:
            uid = rec.get('id')
            if not uid:
                continue
            try:
                u = db.session.get(Usuario, uid)
                if not u:
                    username_lower = (rec.get('username') or '').lower()
                    u = Usuario.query.filter_by(username=username_lower).first()
                if not u:
                    u = Usuario(id=uid)
                    db.session.add(u)
                    created += 1
                u.nombre     = rec.get('nombre', '')
                u.username   = (rec.get('username') or '').lower()
                u.email      = rec.get('email', '')
                u.rol        = rec.get('rol', 'vendedor')
                u.habilitado = rec.get('habilitado', True)
                pwd = rec.get('password', 'xignux2026')
                u.password_hash = generate_password_hash(pwd)
                u.extra = {**(u.extra or {}), 'password': pwd}
                db.session.flush()
            except Exception as e:
                db.session.rollback()
                skipped += 1
        db.session.commit()
        print(f"  Insertados/actualizados: {len(usuarios)-skipped} usuarios ({created} nuevos, {skipped} omitidos por conflicto)")

        # ── MATERIALES (JSON collection en config_global) ─────────
        print("\n[->] materiales...")
        materiales = load_json('materiales.json')
        save_json_collection('materiales', materiales)
        print(f"  Guardados: {len(materiales)} materiales en config_global")

        # ── CALIDADES ─────────────────────────────────────────────
        print("\n[->] calidades...")
        calidades = load_json('calidades.json')
        save_json_collection('calidades', calidades)
        print(f"  Guardados: {len(calidades)} calidades en config_global")

        # ── SERVICIOS ─────────────────────────────────────────────
        print("\n[->] servicios...")
        servicios = load_json('servicios.json')
        save_json_collection('servicios', servicios)
        print(f"  Guardados: {len(servicios)} servicios en config_global")

        # ── LOGISTICAS ────────────────────────────────────────────
        print("\n[->] logisticas...")
        logisticas = load_json('logisticas.json')
        save_json_collection('logisticas', logisticas)
        print(f"  Guardados: {len(logisticas)} logisticas en config_global")

        # ── ORDENES (via routes/orders.py model) ──────────────────
        print("\n[->] ordenes...")
        ordenes = load_json('ordenes.json')
        if ordenes:
            try:
                import requests as req_lib
                headers = {}
                # Intentar via API local (ya levantada)
                login = req_lib.post('http://localhost:5000/api/auth/login',
                                     json={'username': 'admin', 'password': 'admin'}, timeout=5)
                if login.ok:
                    token = login.json().get('token', '')
                    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

                ok = 0
                for o in ordenes:
                    oid = o.get('id')
                    if oid:
                        r = req_lib.put(f'http://localhost:5000/api/orders/{oid}', json=o, headers=headers, timeout=10)
                        if not r.ok:
                            r = req_lib.post('http://localhost:5000/api/orders', json=o, headers=headers, timeout=10)
                        if r.ok:
                            ok += 1
                print(f"  Insertadas/actualizadas: {ok}/{len(ordenes)} ordenes")
            except Exception as e:
                print(f"  [WARN] No se pudieron importar ordenes via API: {e}")
        else:
            print("  Sin ordenes en JSON local")

    print("\n" + "=" * 60)
    print("  Seed completo. Reinicia el servidor backend local.")
    print("=" * 60)

if __name__ == '__main__':
    main()
