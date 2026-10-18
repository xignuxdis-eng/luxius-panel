# Luxius — XignuX Print Den

Sistema integral de gestión de presupuestos, órdenes de trabajo, clientes y sincronización para imprenta digital y taller gráfico.

---

## 🏗️ Arquitectura del Sistema

- **Frontend**: SPA construida en React 18, TypeScript, Vite, Tailwind/Lucide Icons, Zustand.
  - Producción: Desplegado en GitHub Pages.
  - Desarrollo local: `http://localhost:5173` (o `:3005`).
- **Backend**: API REST en Python Flask, SQLAlchemy ORM, Flask-CORS.
  - Producción: Desplegado en Render (`https://luxius-backend.onrender.com/api`).
  - Desarrollo local: `http://localhost:5000/api`.
- **Base de Datos**: PostgreSQL alojado en **Supabase** (AWS us-east-1, connection pooler).
  - Migrado desde Neon el 11/10/2026. Neon quedó desconectado y solo se conserva como respaldo histórico.
- **Almacenamiento Multimedia**: Cloudflare R2 / Almacenamiento local en `server/uploads/`.

---

## 📋 Requisitos Previos

- **Node.js**: v18.0.0 o superior (con `npm`).
- **Python**: v3.10 o superior (con `pip`).
- **Git**

---

## ⚙️ Configuración del Entorno (.env)

El backend carga automáticamente el archivo `.env` ubicado en la raíz del proyecto (`F:\XignuX Print Den\.env`):

```dotenv
# ----------------------------------------------------
# POSTGRESQL DATABASE CONFIGURATION (Supabase)
# ----------------------------------------------------
# Usar el connection pooler de Supabase (puerto 5432), NO la conexión directa.
# Settings > Database > Connection string > URI (Session pooler).
DATABASE_URL=postgresql://<user>:<password>@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# ----------------------------------------------------
# CLOUDFLARE R2 CONFIGURATION
# ----------------------------------------------------
R2_ACCOUNT_ID=<your_account_id>
R2_ACCESS_KEY_ID=<your_access_key>
R2_SECRET_ACCESS_KEY=<your_secret_key>
R2_BUCKET_NAME=luxius-media
R2_ENDPOINT_URL=https://<your_account_id>.r2.cloudflarestorage.com

# ----------------------------------------------------
# JWT / SEGURIDAD
# ----------------------------------------------------
JWT_SECRET_KEY=<generar con: python -c "import secrets; print(secrets.token_hex(64))">
```

> **Notas de conexión (Supabase):**
> - Usá el **Session pooler** (puerto `5432`). Supabase cierra conexiones ociosas del pool directo, lo que rompe llamadas largas de gunicorn.
> - El backend normaliza automáticamente el prefijo `postgres://` a `postgresql://` y fuerza el driver `psycopg2` para SQLAlchemy 2.x.
> - La cadena **no necesita** `?sslmode=require` con el pooler; si se conecta directo a la base, sí es obligatorio.
> - ⚠️ **Nunca** pegues la URL con saltos de línea. Un `\n` pegado desde el dashboard broke el arranque del backend (`postgres\n does not exist`).

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
# Frontend
npm install

# Backend
pip install python-dotenv psycopg2-binary flask flask-sqlalchemy flask-cors sqlalchemy
```

### 2. Verificar la conexión a la base

Las tablas se crean solas al arrancar el backend (`db.create_all()`). Para comprobar la conexión sin levantar nada:

```bash
cd server
python -c "import app; print('BD OK')"
```

El script histórico `scripts/seed_neon.py` fue renombrado a `scripts/seed_db.py` tras la migración. **No lo ejecutes contra producción**: opera sobre `DATABASE_URL` (Supabase) y escribe de verdad.

### 3. Iniciar Backend Local

```bash
cd server
python app.py
```

El servidor estará escuchando en `http://localhost:5000` y reportará en consola la conexión exitosa a PostgreSQL en Supabase.

### 4. Iniciar Frontend Local

En otra terminal:

```bash
npm run dev
```

Abre tu navegador en `http://localhost:5173` (o el puerto indicado por Vite).

---

## 🧪 Pruebas de Integración y Endpoints

Para verificar la conectividad de la base de datos, endpoints de órdenes y sincronización, ejecuta:

```bash
python scripts/test_endpoints.py
```

Verificará:
1. `GET /api/health` — Conectividad a Supabase y tablas existentes.
2. `GET /api/orders` — Listado de órdenes activas.
3. `POST /api/orders` — Creación de orden con asignación automática de ID y código OT.
4. `GET /api/sync/pull` — Endpoint de sincronización móvil / cloud.
5. Limpieza automática del registro de prueba.

---

## 🧪 Verificación (TypeScript / Lint / Build)

```bash
npm run typecheck   # tsc --noEmit (modo strict)
npm run lint        # ESLint — falla solo ante errores
npm run lint:fix    # autofix (prefer-const, etc.)
npm run verify      # typecheck + lint + build, en cadena
```

Los tres comandos corren en el workflow de GitHub Actions **antes** del deploy,
de modo que un error de tipos bloquea la publicación en vez de llegar a producción.

### ESLint

Configuración en `eslint.config.js` (flat config, ESLint 9). Cubre solo `src/`;
el resto del repo tiene `.js`/`.cjs`/`.py` legacy fuera del bundle de Vite.

Reglas apagadas a propósito, con motivo documentado en el archivo:

| Regla | Motivo |
|---|---|
| `no-undef` | `tsc` ya resuelve identificadores; la regla base marca tipos (`BlobPart`, `RequestInfo`) como no definidos |
| `@typescript-eslint/no-require-imports` | Scripts y clases del juego arcade usan CommonJS |
| `@typescript-eslint/no-explicit-any` | Casts necesarios frente a la API y libs de terceros |
| `@typescript-eslint/no-unused-expressions` | Falso positivo en `cb && cb(x)` y `!guard && hacer()` |
| `no-console` | El logueo a consola es intencional (diagnóstico de taller) |

---

## 🔄 Endpoints Principales de la API

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del backend y lista de tablas públicas |
| `GET` | `/api/orders` | Obtener todas las órdenes activas |
| `POST` | `/api/orders` | Crear o actualizar orden |
| `PUT` | `/api/orders/<id>` | Actualizar orden específica |
| `DELETE` | `/api/orders/<id>` | Borrado suave (soft delete) |
| `POST` | `/api/orders/batch` | Operaciones masivas (delete, restore, update) |
| `GET` | `/api/sync/pull` | Sincronización descendente (Servidor -> Cliente/Mobile) |
| `POST` | `/api/sync/push` | Sincronización ascendente (Mobile -> Servidor) |
| `POST` | `/api/upload` | Carga de archivos y comprobantes |

---

## 🛡️ Políticas de Respaldo y Resiliencia

- **Supabase Backups**: Supabase realiza respaldos automáticos del estado de la base de datos (PITR disponible según el plan). Programar dumps desde el panel o vía `supabase db dump` como red de seguridad.
- **Fallback a SQLite**: Si la base de datos remota es inaccesible o no está configurada, el archivo `server/config.py` conmuta automáticamente a una base SQLite local (`server/luxius.db`) para evitar caídas totales durante desarrollo offline.
