-- ==============================================================================
-- Migración 001: Inmutabilidad estricta de AuditLog y Rol Dedicado de Aplicación
-- ==============================================================================
-- Fecha: 2026-11-09
-- Propósito: Garantizar que la tabla public.audit_logs sea estrictamente de
-- append-only (solo INSERT / SELECT). Ningún usuario ni proceso de aplicación
-- podrá modificar ni borrar registros históricos de auditoría.
--
-- ADVERTENCIA: Este archivo NO se ejecuta automáticamente contra producción.
-- Debe ser revisado y ejecutado manualmente por el administrador de base de datos en Supabase SQL Editor.
-- ==============================================================================

-- 1. Función y Trigger para bloquear UPDATE y DELETE por fila
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SEGURIDAD: audit_logs es inmutable. Las operaciones UPDATE y DELETE están terminantemente prohibidas en esta tabla.'
        USING ERRCODE = '27000'; -- trigger_protocol_violated
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_logs_prevent_mutation ON public.audit_logs;

CREATE TRIGGER trg_audit_logs_prevent_mutation
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- 2. Función y Trigger para bloquear TRUNCATE por sentencia
CREATE OR REPLACE FUNCTION public.prevent_audit_log_truncate()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SEGURIDAD: audit_logs es inmutable. La operación TRUNCATE está terminantemente prohibida en esta tabla.'
        USING ERRCODE = '27000';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_logs_prevent_truncate ON public.audit_logs;

CREATE TRIGGER trg_audit_logs_prevent_truncate
    BEFORE TRUNCATE ON public.audit_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.prevent_audit_log_truncate();


-- ==============================================================================
-- PROPUESTA DE ROL DEDICADO DE APLICACIÓN (Principio de Menor Privilegio)
-- ==============================================================================
-- Actualmente la aplicación Flask conecta con un rol que tiene privilegios amplios.
-- Se propone la creación del rol `luxius_backend_app` para gunicorn/backend:
-- - No puede crear ni alterar tablas (sin permisos DDL).
-- - No tiene permisos UPDATE/DELETE ni TRUNCATE sobre `audit_logs`.
-- - Solo SELECT / INSERT en audit_logs y secuencia asociada.
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'luxius_backend_app') THEN
        -- Reemplazar 'CAMBIAR_PASSWORD_AQUI_CON_GENERADOR_SEGURO' por un secreto aleatorio de 64 caracteres
        CREATE ROLE luxius_backend_app WITH LOGIN PASSWORD 'CAMBIAR_PASSWORD_AQUI_CON_GENERADOR_SEGURO';
    END IF;
END
$$;

-- Conceder conexión a la base de datos
GRANT CONNECT ON DATABASE postgres TO luxius_backend_app;
GRANT USAGE ON SCHEMA public TO luxius_backend_app;

-- Permisos DML en tablas operativas normales (SELECT, INSERT, UPDATE, DELETE)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO luxius_backend_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO luxius_backend_app;

-- RESTRICCIÓN EXPLÍCITA SOBRE audit_logs:
-- Revocar cualquier UPDATE, DELETE o TRUNCATE que haya sido otorgado por ALL TABLES
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.audit_logs FROM luxius_backend_app;

-- Otorgar únicamente SELECT e INSERT sobre audit_logs
GRANT SELECT, INSERT ON TABLE public.audit_logs TO luxius_backend_app;

-- Asegurar que las futuras tablas sigan este esquema si no se altera
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO luxius_backend_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO luxius_backend_app;

COMMENT ON TABLE public.audit_logs IS 'Bitácora inmutable de eventos de seguridad y negocio. Protegida con triggers de rechazo de mutación y restricción de roles.';
