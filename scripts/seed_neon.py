"""
Roadmap Neon — Fase 0: Seed & Migration Script
Ejecutar con: python scripts/seed_neon.py

Crea las tablas en la base de datos configurada y agrega datos semilla
(1 vendedor + 1 cliente) si no existen.
"""

import sys
import os

if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Agregar el directorio server al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server'))

from dotenv import load_dotenv
# Cargar .env desde la raíz del proyecto
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from flask import Flask
from config import Config
from models import db, Cliente, Vendedor, Usuario, Maquina, Presupuesto, SyncLog, ConfigGlobal

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    return app

def seed_data():
    app = create_app()
    
    with app.app_context():
        print(f"[SEED] Database URI: {Config.SQLALCHEMY_DATABASE_URI[:60]}...")
        
        # Fase 0.1: Crear todas las tablas
        print("[SEED] Creando tablas...")
        db.create_all()
        print("[SEED] ✅ Tablas creadas/verificadas.")
        
        # Verificar tablas existentes
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print(f"[SEED] Tablas encontradas: {tables}")
        
        expected = ['clientes', 'vendedores', 'usuarios', 'maquinas', 'presupuestos', 'sync_log', 'config_global']
        missing = [t for t in expected if t not in tables]
        if missing:
            print(f"[SEED] ⚠️  Tablas faltantes: {missing}")
        else:
            print("[SEED] ✅ Todas las tablas esperadas existen.")
        
        # Fase 0.2: Insertar datos semilla
        # Vendedor
        vendedor = Vendedor.query.first()
        if vendedor is None:
            vendedor = Vendedor(
                nombre='Admin Luxius',
                email='admin@luxius.com',
                telefono='',
                activo=True,
                es_admin=True,
            )
            db.session.add(vendedor)
            db.session.commit()
            print(f"[SEED] ✅ Vendedor semilla creado: id={vendedor.id}, nombre='{vendedor.nombre}'")
        else:
            print(f"[SEED] ℹ️  Ya existe vendedor: id={vendedor.id}, nombre='{vendedor.nombre}'")
        
        # Cliente
        cliente = Cliente.query.first()
        if cliente is None:
            cliente = Cliente(
                nombre='Cliente General',
                empresa='',
                habilitado=True,
            )
            db.session.add(cliente)
            db.session.commit()
            print(f"[SEED] ✅ Cliente semilla creado: id={cliente.id}, nombre='{cliente.nombre}'")
        else:
            print(f"[SEED] ℹ️  Ya existe cliente: id={cliente.id}, nombre='{cliente.nombre}'")
        
        # Resumen
        print("\n[SEED] === RESUMEN ===")
        print(f"  Vendedores: {Vendedor.query.count()}")
        print(f"  Clientes:   {Cliente.query.count()}")
        print(f"  Presupuestos: {Presupuesto.query.count()}")
        print(f"  SyncLogs:   {SyncLog.query.count()}")
        print("[SEED] ✅ Seed completado exitosamente.")

if __name__ == '__main__':
    seed_data()
