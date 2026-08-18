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
- **Base de Datos**: PostgreSQL alojado en **Neon.tech** (Serverless, alta disponibilidad y persistencia sin límite de 90 días).
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
# POSTGRESQL DATABASE CONFIGURATION (Neon)
# ----------------------------------------------------
DATABASE_URL=postgresql://<user>:<password>@<host>/neondb?sslmode=require&channel_binding=require

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
JWT_SECRET_KEY=luxius-secret-key-change-in-production
```

> **Nota sobre SSL en Neon:** La cadena `DATABASE_URL` debe incluir siempre `?sslmode=require` (o `&channel_binding=require`). El backend automáticamente normaliza el prefijo `postgres://` a `postgresql://` para compatibilidad con SQLAlchemy 2.x.

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
# Frontend
npm install

# Backend
pip install python-dotenv psycopg2-binary flask flask-sqlalchemy flask-cors sqlalchemy
```

### 2. Inicializar / Verificar Base de Datos (Seed)

Ejecuta el script para verificar o crear las tablas y asegurar los registros base (vendedor y cliente inicial):

```bash
python scripts/seed_neon.py
```

### 3. Iniciar Backend Local

```bash
cd server
python app.py
```

El servidor estará escuchando en `http://localhost:5000` y reportará en consola la conexión exitosa a PostgreSQL Neon.

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
1. `GET /api/health` — Conectividad a Neon y tablas existentes.
2. `GET /api/orders` — Listado de órdenes activas.
3. `POST /api/orders` — Creación de orden con asignación automática de ID y código OT.
4. `GET /api/sync/pull` — Endpoint de sincronización móvil / cloud.
5. Limpieza automática del registro de prueba.

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

- **Neon Point-in-Time Recovery**: Neon realiza respaldos continuos automáticos del estado de la base de datos.
- **Fallback a SQLite**: Si la base de datos remota es inaccesible o no está configurada, el archivo `server/config.py` conmuta automáticamente a una base SQLite local (`server/luxius.db`) para evitar caídas totales durante desarrollo offline.
