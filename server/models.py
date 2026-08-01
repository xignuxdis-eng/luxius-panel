from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, BigInteger, Numeric, Date,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

db = SQLAlchemy()


# ================================================================
# CLIENTES
# ================================================================
class Cliente(db.Model):
    __tablename__ = 'clientes'

    id                = Column(Integer, primary_key=True)
    nombre            = Column(String(255), nullable=False)
    empresa           = Column(String(255), default='')
    persona           = Column(String(255), default='')
    relacion          = Column(String(50), default='')
    responsable       = Column(String(255), default='')
    direccion         = Column(String(255), default='')
    categoria         = Column(String(100), default='')
    username          = Column(String(100), default='')
    email             = Column(String(255), default='')
    habilitado        = Column(Boolean, default=True)
    saldo             = Column(Float, default=0.0)
    deuda             = Column(Float, default=0.0)
    balance           = Column(Float, default=0.0)
    pago_cuenta       = Column(Float, default=0.0)
    precios_especiales = Column(JSONB, default=dict)
    extra             = Column(JSONB, default=dict)
    created_at        = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at        = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                               onupdate=lambda: datetime.now(timezone.utc))

    maquinas = relationship('Maquina', back_populates='cliente',
                            cascade='all, delete-orphan', lazy='selectin')
    presupuestos = relationship('Presupuesto', back_populates='cliente')

    def to_dict(self):
        return {
            'id': self.id, 'nombre': self.nombre, 'empresa': self.empresa,
            'persona': self.persona, 'relacion': self.relacion,
            'responsable': self.responsable, 'direccion': self.direccion,
            'categoria': self.categoria, 'username': self.username,
            'email': self.email, 'habilitado': self.habilitado,
            'saldo': self.saldo, 'deuda': self.deuda, 'balance': self.balance,
            'pagoCuenta': self.pago_cuenta,
            'preciosEspeciales': self.precios_especiales or {},
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }


# ================================================================
# MAQUINAS
# ================================================================
class Maquina(db.Model):
    __tablename__ = 'maquinas'

    id             = Column(Integer, primary_key=True)
    cliente_id     = Column(Integer,
                        ForeignKey('clientes.id', ondelete='CASCADE'), nullable=True)
    nombre         = Column(String(255), nullable=False)
    nombre_maquina = Column(String(255), default='')
    marca          = Column(String(100), default='')
    modelo         = Column(String(100), default='')
    nickName       = Column(String(100), default='')
    nro_serie      = Column(String(100), default='')
    estado         = Column(String(50), default='')
    extra          = Column(JSONB, default=dict)
    created_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                            onupdate=lambda: datetime.now(timezone.utc))

    cliente = relationship('Cliente', back_populates='maquinas')

    def to_dict(self):
        return {
            'id': self.id, 'cliente_id': self.cliente_id,
            'nombre': self.nombre, 'nombre_maquina': self.nombre_maquina or self.nombre,
            'marca': self.marca, 'modelo': self.modelo,
            'nickName': self.nickName, 'nro_serie': self.nro_serie,
            'estado': self.estado,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }


# ================================================================
# USUARIOS
# ================================================================
class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id            = Column(Integer, primary_key=True)
    nombre        = Column(String(255), default='')
    username      = Column(String(100), default='')
    email         = Column(String(255), default='')
    password_hash = Column(String(255), default='')
    rol           = Column(String(50), default='cliente')
    client_id     = Column(Integer, ForeignKey('clientes.id', ondelete='SET NULL'), nullable=True)
    habilitado    = Column(Boolean, default=True)
    extra         = Column(JSONB, default=dict)
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    cliente = relationship('Cliente', backref='usuarios')

    def to_dict(self):
        return {
            'id': self.id, 'nombre': self.nombre, 'username': self.username,
            'email': self.email, 'rol': self.rol, 'clientId': self.client_id,
            'habilitado': self.habilitado,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }


# ================================================================
# LUXIUS FIELD — NUEVOS MODELOS
# ================================================================

class Vendedor(db.Model):
    __tablename__ = 'vendedores'

    id         = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    nombre     = Column(String(255), nullable=False)
    email      = Column(String(255))
    telefono   = Column(String(50))
    activo     = Column(Boolean, default=True)
    es_admin   = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    presupuestos = relationship('Presupuesto', back_populates='vendedor')

    def to_dict(self):
        return {
            'id': self.id, 'usuario_id': self.usuario_id,
            'nombre': self.nombre, 'email': self.email,
            'telefono': self.telefono, 'activo': self.activo,
            'es_admin': self.es_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Presupuesto(db.Model):
    __tablename__ = 'presupuestos'

    ESTADOS_BLOQUEADOS = {'senado', 'aprobado', 'en_taller'}

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendedor_id     = Column(Integer, ForeignKey('vendedores.id'), nullable=False)
    cliente_id      = Column(Integer, ForeignKey('clientes.id', ondelete='SET NULL'), nullable=True)

    estado          = Column(String(20), default='borrador')
    descripcion     = Column(String(500))
    especificaciones = Column(JSONB, default=dict)

    subtotal        = Column(Numeric(12, 2), default=0)
    descuento       = Column(Numeric(12, 2), default=0)
    total           = Column(Numeric(12, 2), default=0)

    sena_porcentaje = Column(Numeric(5, 2), default=50.00)
    sena_monto      = Column(Numeric(12, 2), default=0)
    sena_metodo     = Column(String(20), default='pendiente')
    alias_cbu       = Column(String(100))

    monto_pagado    = Column(Numeric(12, 2), default=0)
    saldo_pendiente = Column(Numeric(12, 2), default=0)
    fecha_entrega_estimada = Column(Date, nullable=True)

    notas      = Column(Text)
    origen     = Column(String(20), default='mobile')
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)

    vendedor = relationship('Vendedor', back_populates='presupuestos')
    cliente  = relationship('Cliente', back_populates='presupuestos')

    def to_dict(self):
        return {
            'id': str(self.id),
            'vendedor_id': self.vendedor_id,
            'cliente_id': self.cliente_id,
            'estado': self.estado,
            'descripcion': self.descripcion,
            'especificaciones': self.especificaciones or {},
            'subtotal': float(self.subtotal or 0),
            'descuento': float(self.descuento or 0),
            'total': float(self.total or 0),
            'sena_porcentaje': float(self.sena_porcentaje or 50),
            'sena_monto': float(self.sena_monto or 0),
            'sena_metodo': self.sena_metodo,
            'alias_cbu': self.alias_cbu,
            'monto_pagado': float(self.monto_pagado or 0),
            'saldo_pendiente': float(self.saldo_pendiente or 0),
            'fecha_entrega_estimada': self.fecha_entrega_estimada.isoformat()
                                      if self.fecha_entrega_estimada else None,
            'notas': self.notas,
            'origen': self.origen,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
        }


class SyncLog(db.Model):
    __tablename__ = 'sync_log'

    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    entity_type = Column(String(50), nullable=False)
    entity_id   = Column(UUID(as_uuid=True), nullable=False)
    operation   = Column(String(10), nullable=False)
    vendedor_id = Column(Integer, nullable=False)
    changed_at  = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ================================================================
# CONFIGURACIÓN GLOBAL (Tarifario, etc.)
# ================================================================
class ConfigGlobal(db.Model):
    __tablename__ = 'config_global'

    id         = Column(Integer, primary_key=True)
    clave      = Column(String(100), unique=True, nullable=False)
    valor      = Column(JSONB, default=dict)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'clave': self.clave,
            'valor': self.valor or {},
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
