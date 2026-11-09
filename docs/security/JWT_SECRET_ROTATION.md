# Procedimiento Operativo: Rotación de Clave Secreta JWT (LuXius)

## 1. Contexto y Arquitectura
El backend de LuXius firma los tokens de sesión utilizando HMAC-SHA256 (`HS256`).
La variable de entorno que define la clave es `JWT_SECRET_KEY` (o `JWT_SECRET`).
Adicionalmente, cada usuario en la base de datos PostgreSQL posee una columna `token_version` (entero, por defecto `1`).

## 2. Generación de Nueva Clave Criptográfica
Ejecutar en una terminal segura con Python 3:
```bash
python -c "import secrets; print(secrets.token_hex(64))"
```
Esto genera una cadena pseudoaleatoria de 128 caracteres hexadecimales (64 bytes de entropía).

## 3. Actualización de Variables de Entorno
1. **Render.com / Servidor Backend:**
   - Ir al Dashboard de Render -> Backend Service -> **Environment Variables**.
   - Actualizar `JWT_SECRET_KEY` con el nuevo valor generado.
   - Guardar y permitir el redeploy automático.
2. **Entornos Locales / Desarrollo:**
   - Actualizar en el archivo `.env` (nunca versionado en git).

## 4. Revocación Instantánea de Sesiones Activas
Si se sospecha un compromiso de credenciales o se desea forzar el cierre de todas las sesiones de usuarios actuales:
Ejecutar en la base de datos (Supabase SQL Editor o psql):
```sql
-- Revoca inmediatamente todos los tokens JWT emitidos previamente
UPDATE public.usuarios SET token_version = token_version + 1;
```
El middleware de autenticación (`middleware/auth.py`) compara el `token_version` del payload JWT contra el valor actual en la base de datos. Cualquier token con una versión inferior a la de la base de datos es rechazado con `401 Unauthorized`.

Para revocar la sesión de un usuario específico:
```sql
UPDATE public.usuarios SET token_version = token_version + 1 WHERE id = <ID_USUARIO>;
```
