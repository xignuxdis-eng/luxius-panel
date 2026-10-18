# 🔒 Seguridad del Sistema LuXius

> **Actualizado: 17/10/2026.** La versión anterior de este documento describía un
> sistema basado en `localStorage` con rutas `/dashboard/*` que ya no existen.
> El texto actual refleja la implementación real.

---

## 🛡️ Arquitectura de autenticación

### Flujo

1. `POST /api/auth/login` → el backend valida contra PostgreSQL con
   `werkzeug.security.check_password_hash` y devuelve un **JWT HS256**.
2. El token se guarda en `localStorage` bajo `luxius_auth_token`.
3. `src/utils/authFetch.ts` intercepta `window.fetch` e inyecta
   `Authorization: Bearer <token>` en **toda** petición al backend. Así ningún
   componente se olvida de adjuntarlo.
4. El backend valida el token en `server/middleware/auth.py` y expone el rol en
   `g.user_rol` para las comprobaciones de autorización.

### Endurecimiento del token

- **Expiración**: 72 horas.
- **Revocación inmediata**: el JWT incluye `token_version`, comparado contra la
  columna del usuario en cada request. Incrementar `token_version` invalida todos
  los tokens activos de esa persona al instante.
- **Fail-safe del secreto**: si `JWT_SECRET_KEY` no está definida, el servidor
  genera una clave aleatoria **por proceso** en lugar de usar un default
  hardcodeado. El servicio arranca, pero ningún token sobrevive al reinicio.

### Protección contra fuerza bruta

- `flask-limiter`: 200 req/min por IP (soporta `REDIS_URL` para estado compartido).
- `LoginThrottle` (`server/services/security_utils.py`): 5 intentos fallidos por
  `(IP + usuario)` y 20 por IP, con bloqueo de 15 minutos.

### Autorización por rol

`ADMIN_ROLES = {administrador, principal, jefe_produccion}` y `OPERATOR_ROLES`
Amplían ese conjunto. Cada endpoint declara explícitamente su decorador
(`login_required`, `operator_required`, `admin_required`).

El frontend **también** filtra rutas (`hasRolePermission` en `src/types/auth.ts`),
pero eso es solo UX: la autoridad real está en el backend.

---

## 🌐 Endurecimiento de la API

| Riesgo | Mitigación | Dónde |
|---|---|---|
| SSRF en descargas | `is_safe_url()` resuelve DNS y rechaza IPs privadas, loopback y `.internal` | `services/security_utils.py` |
| Path traversal en uploads | `_safe_upload_relpath()` valida con `os.path.realpath` | `server/app.py` |
| XSS vía SVG/HTML | CSP `sandbox` en contenido activo servido | `_harden_upload_response()` |
| Upload de ejecutables | Whitelist de extensiones | `ALLOWED_UPLOAD_EXTENSIONS` |
| Fuga de hashes | `Usuario.to_dict()` nunca expone `password_hash` | `server/app.py` |
| Enumeración de usuarios | Se verifica la contraseña **antes** de revelar el estado de la cuenta | `routes/auth.py` |
| Acceso horizontal (cliente → otros clientes) | `get_collection` fuerza a cada `cliente` a ver solo su `cliente_id` | `server/app.py` |
| Errores al cliente | `@app.errorhandler(500)` registra el detalle server-side y devuelve un mensaje genérico | `server/app.py` |

### CORS

`is_origin_allowed()` acepta el dominio de GitHub Pages, `localhost`,
esquemas `capacitor://` / `ionic://` y rangos de IP privada (taller). Cualquier
otro origen se rechaza, y `CORS_ORIGINS` permite ampliar por variable de entorno.

### ⚠️ Pendiente conocido

`GET /uploads/<filename>` y `GET /api/preview/<filename>` **no requieren
autenticación**. Cualquiera que conozca el nombre del archivo descarga material
del cliente. El resto del sistema sí está protegido.

---

## 🔐 Gestión de secretos

Los secretos viven **solo** en variables de entorno (`.env`, que está en
`.gitignore` y nunca se versionó):

```
DATABASE_URL · R2_* · JWT_SECRET_KEY · OPENAI_API_KEY · GEMINI_API_KEY
GOOGLE_DRIVE_* · SMTP_*
```

`server/config.py` no tiene ningún valor por defecto: si falta una variable
crítica, genera una aleatoria o falla explícitamente. Ningún `.env`, `token.json`
ni `client_secret.json` está en el repositorio.

---

## 🔎 Verificación continua

| Comando | Qué garantiza |
|---|---|
| `npm run typecheck` | `tsc --noEmit` en modo `strict` |
| `npm run lint` | ESLint: 0 errores; `react-hooks/exhaustive-deps` queda como aviso |
| `npm run build` | Bundle de producción |
| `npm run verify` | Los tres en cadena |

Los tres corren en `.github/workflows/deploy.yml` **antes** del deploy. Antes de
esto, `vite build` no type-chequeaba, así que los errores llegaban a producción
sin que nadie los viera.