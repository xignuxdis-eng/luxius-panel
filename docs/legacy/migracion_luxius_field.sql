-- ============================================
-- LUXIUS FIELD — Migración PostgreSQL
-- Sincronización simplificada: LWW + UUIDs
-- Vendedores, Presupuestos, Sync Log
-- ============================================

-- Extensión para UUIDs nativos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. VENDEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS vendedores (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre          VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    telefono        VARCHAR(50),
    activo          BOOLEAN DEFAULT TRUE,
    es_admin        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PRESUPUESTOS (tabla central de negocio)
-- ============================================
CREATE TABLE IF NOT EXISTS presupuestos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendedor_id     INTEGER NOT NULL REFERENCES vendedores(id),
    cliente_id      INTEGER REFERENCES clientes(id) ON DELETE SET NULL,

    estado          VARCHAR(20) NOT NULL DEFAULT 'borrador',
    descripcion     VARCHAR(500),
    especificaciones JSONB NOT NULL DEFAULT '{}',

    subtotal        DECIMAL(12,2) DEFAULT 0,
    descuento       DECIMAL(12,2) DEFAULT 0,
    total           DECIMAL(12,2) DEFAULT 0,

    sena_porcentaje DECIMAL(5,2) DEFAULT 50.00,
    sena_monto      DECIMAL(12,2) DEFAULT 0,
    sena_metodo     VARCHAR(20) DEFAULT 'pendiente',
    alias_cbu       VARCHAR(100),

    monto_pagado    DECIMAL(12,2) DEFAULT 0,
    saldo_pendiente DECIMAL(12,2) DEFAULT 0,
    fecha_entrega_estimada DATE,

    notas           TEXT,
    origen          VARCHAR(20) DEFAULT 'mobile',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT chk_estado CHECK (estado IN (
        'borrador', 'enviado', 'senado', 'aprobado',
        'en_taller', 'entregado', 'cancelado'
    )),
    CONSTRAINT chk_sena_metodo CHECK (sena_metodo IN (
        'efectivo', 'transferencia', 'pendiente'
    ))
);

-- ============================================
-- 3. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_presupuestos_vendedor
    ON presupuestos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado
    ON presupuestos(estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente
    ON presupuestos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_updated
    ON presupuestos(updated_at);
CREATE INDEX IF NOT EXISTS idx_presupuestos_vendedor_updated
    ON presupuestos(vendedor_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_presupuestos_deleted
    ON presupuestos(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- 4. SYNC LOG (tabla + trigger)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_log (
    id              BIGSERIAL PRIMARY KEY,
    entity_type     VARCHAR(50)  NOT NULL,
    entity_id       UUID         NOT NULL,
    operation       VARCHAR(10)  NOT NULL,
    vendedor_id     INTEGER      NOT NULL,
    changed_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_changed
    ON sync_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_sync_log_vendor_changed
    ON sync_log(vendedor_id, changed_at);

CREATE OR REPLACE FUNCTION presupuestos_sync_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO sync_log (entity_type, entity_id, operation, vendedor_id, changed_at)
        VALUES ('presupuestos', OLD.id, 'DELETE', OLD.vendedor_id, NOW());
        RETURN OLD;
    ELSE
        INSERT INTO sync_log (entity_type, entity_id, operation, vendedor_id, changed_at)
        VALUES ('presupuestos', NEW.id, TG_OP, NEW.vendedor_id, NOW());
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_presupuestos_sync ON presupuestos;
CREATE TRIGGER trg_presupuestos_sync
    AFTER INSERT OR UPDATE OR DELETE ON presupuestos
    FOR EACH ROW EXECUTE FUNCTION presupuestos_sync_trigger();

-- ============================================
-- 5. SEED: Vendedor admin inicial
-- ============================================
INSERT INTO vendedores (nombre, email, es_admin, activo)
SELECT 'Administrador', 'admin@luxius.local', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM vendedores WHERE es_admin = TRUE);
