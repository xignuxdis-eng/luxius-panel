"""
legacy_importer.py
Servicio para importar datos históricos desde archivos CSV al sistema Luxius.
Maneja la lógica de validación, mapeo y creación masiva.
"""

import csv
import io
import logging
from database import db
from models import User, UserRole, Product, UnitType, Moneda

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LegacyImporter:
    """Clase encargada de procesar archivos CSV e importarlos a la base de datos."""

    @staticmethod
    def import_users(csv_file_content):
        """
        Importa clientes desde un CSV.
        Formato esperado: nombre,apellido,email,username,password,empresa,cuit,telefono
        """
        results = {'success': 0, 'errors': [], 'total': 0}
        
        try:
            stream = io.StringIO(csv_file_content.decode('utf-8'))
            reader = csv.DictReader(stream)
            
            for row in reader:
                results['total'] += 1
                try:
                    # Validar si ya existe
                    if User.query.filter((User.email == row['email']) | (User.username == row['username'])).first():
                        results['errors'].append(f"Fila {results['total']}: Usuario o email ya existe ({row['username']})")
                        continue
                    
                    new_user = User(
                        nombre=row['nombre'],
                        apellido=row['apellido'],
                        email=row['email'],
                        username=row['username'],
                        role=UserRole.CLIENTE,
                        empresa=row.get('empresa'),
                        cuit=row.get('cuit'),
                        telefono=row.get('telefono'),
                        activo=True
                    )
                    new_user.set_password(row.get('password', 'Luxius2026!'))
                    
                    db.session.add(new_user)
                    results['success'] += 1
                    
                except Exception as e:
                    results['errors'].append(f"Fila {results['total']}: Error inesperado - {str(e)}")
            
            db.session.commit()
            return results
            
        except Exception as e:
            db.session.rollback()
            return {'success': 0, 'errors': [f"Error crítico: {str(e)}"], 'total': 0}

    @staticmethod
    def import_materials(csv_file_content):
        """
        Importa materiales (productos) desde un CSV.
        Formato esperado: nombre,categoria,descripcion,precio_venta,unidad,sku,moneda
        """
        results = {'success': 0, 'errors': [], 'total': 0}
        
        try:
            stream = io.StringIO(csv_file_content.decode('utf-8'))
            reader = csv.DictReader(stream)
            
            for row in reader:
                results['total'] += 1
                try:
                    # Validar unidad
                    unidad_str = row.get('unidad', 'm2').lower()
                    unit_type = UnitType.METRO_CUADRADO
                    if 'unid' in unidad_str: unit_type = UnitType.UNIDAD
                    elif 'ml' in unidad_str: unit_type = UnitType.METRO_LINEAL
                    
                    moneda = Moneda.USD if row.get('moneda') == 'USD' else Moneda.ARS
                    
                    # El nombre es obligatorio
                    if not row.get('nombre'):
                        results['errors'].append(f"Fila {results['total']}: Nombre faltante")
                        continue

                    new_product = Product(
                        nombre=row['nombre'],
                        categoria=row.get('categoria', 'Migración'),
                        descripcion=row.get('descripcion'),
                        precio_venta_base=float(row.get('precio_venta', 0)),
                        unidad_medida=unit_type,
                        moneda=moneda,
                        sku=row.get('sku'),
                        activo=True,
                        stock_actual=0,
                        stock_minimo=0
                    )
                    
                    db.session.add(new_product)
                    results['success'] += 1
                    
                except Exception as e:
                    results['errors'].append(f"Fila {results['total']}: Error - {str(e)}")
            
            db.session.commit()
            return results
            
        except Exception as e:
            db.session.rollback()
            return {'success': 0, 'errors': [f"Error crítico: {str(e)}"], 'total': 0}
