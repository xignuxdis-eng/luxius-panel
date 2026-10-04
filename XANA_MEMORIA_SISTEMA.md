# 🧠 XANA MEMORIA DEL SISTEMA - CONTEXTO MAESTRO DEL ECOSISTEMA LUXIUS
> **Última Actualización:** 03/10/2026 23:15 (Ejecutadas tareas P1/P2/P3 del roadmap: server/ fuera del repo público, react-router 7, Redis opcional, limpieza de código muerto, suite de seguridad en repo. Pendientes del usuario en sección 8 → "📝 Tareas del Usuario")  
> **Propósito:** Documento de contexto permanente para cualquier Asistente IA (Antigravity, Cursor, Windsurf, Claude Dev, Copilot) o desarrollador que continúe el trabajo en cualquier entorno o IDE.

---

## 1. 🌐 Ecosistema de Repositorios y Despliegue

El sistema LuXius está compuesto por 3 repositorios centrales interconectados:

| Componente | Repositorio GitHub | Entorno / Hosting | URL de Producción |
| :--- | :--- | :--- | :--- |
| **Frontend Panel** | `xignuxdis-eng/luxius-panel` | GitHub Pages + Servidor Local Nginx | Web: `https://xignuxdis-eng.github.io/luxius-panel/`<br>Local: `http://localhost/` (`D:\XignuX\luxius-panel\dist`) |
| **Backend API** | `luXius-Backend` | Render (Python Web Service) | `https://luxius-backend.onrender.com` |
| **Landing Web** | `xignux-landing` | GitHub Pages / Hosting Web | Dominio oficial XignuX |
| **App Móvil** | `XignuX Workfield Manager` | Capacitor + Vanilla JS (Híbrida Android) | APK / AAB para técnicos de campo y colocadores |

---

## 2. ⚡ Reglas Obligatorias de Flujo de Trabajo (Para Cualquier IDE / IA)

1. **Autonomía y Auto-Aprobación**: Ejecutar directamente todas las tareas, comandos de terminal, compilaciones y despliegues sin detenerse a solicitar confirmaciones al usuario.
2. **Compilación y Build Frontend**: Cada cambio en el frontend (`f:\Sitio XignuX`) debe compilarse con `npm run build`.
3. **Sincronización Inmediata a GitHub**:
   - `git add -A && git commit -m "..." && git push origin master`
   - `origin` apunta exclusivamente a GitHub (`github.com/xignuxdis-eng/luxius-panel`). GitLab fue desvinculado el 02/10/2026.
   - Definir `$env:GIT_TERMINAL_PROMPT = '0'` antes de operaciones remotas en agentes/IDEs: evita que `git fetch/push` quede colgado esperando credenciales en una terminal no interactiva (incidente registrado en la bitácora, sección 6).
4. **Despliegue a GitHub Pages**:
   - Para que los cambios impacten en la versión web pública (`https://xignuxdis-eng.github.io/luxius-panel/`), la rama `gh-pages` debe actualizarse con el contenido de `dist/`. Desde la Fase 1 (22/09/2026) `dist/` **ya no se versiona en `master`**, por lo que `git subtree split` dejó de funcionar. Usar:
     ```powershell
     npm run build; .\scripts\deploy_gh_pages.ps1
     ```
     El script crea un commit huérfano con el contenido de `dist/` y lo fuerza a `gh-pages` en GitHub.
5. **Sincronización Local (Nginx)**:
   - Copiar el contenido de `dist/` al servidor Nginx local de producción:
     ```powershell
     Copy-Item -Path "f:\Sitio XignuX\dist\*" -Destination "D:\XignuX\luxius-panel\dist\" -Recurse -Force
     ```
6. **Políticas de Anti-Caché**: El frontend cuenta con un verificador de versiones (`versionCheck.ts` y `version.json` generado en build) que detecta nuevas versiones y fuerza la recarga de Service Workers y bundles.
7. **Cero Secretos en Código o Repositorios**: Jamás commitear tokens, contraseñas, URLs de conexión o claves API (`.env`, `*.db`, archivos de credenciales). Todo secreto debe inyectarse por variables de entorno del hosting (`Render`) o `.env` local (estrictamente git-ignorado). En logs, enmascarar siempre contraseñas y connection strings.
8. **Principio de Mínimo Privilegio en Endpoints (Flask)**: Todo nuevo endpoint en backend DEBE llevar decorador explícito (`@login_required`, `@operator_required` o `@admin_required`). Quedan terminantemente prohibidos los endpoints abiertos/públicos salvo justificación explícita de autenticación o assets estáticos con sanitización (ver lista blanca en Sección 4).
9. **Prevención de SSRF y Path Traversal**: En toda descarga o procesamiento de URLs externas (ej. escalador, importador cloud) usar `services/security_utils.py:is_safe_url` en cada redirección para bloquear IPs privadas (127.0.0.1, 10.x, 169.254.x, etc.) y esquemas no HTTP(S). En `/uploads`, validar siempre con `_safe_upload_relpath` y servir SVGs con CSP `sandbox`.
10. **Backend = solo `luXius-Backend` (privado)**: desde el 03/10/2026 la carpeta `server/` de `luxius-panel` **ya no se versiona** (está en `.gitignore`; queda solo como copia local en disco y en el historial viejo). Todo cambio de backend se hace y commitea en `f:\luXius-Backend\`. La carpeta legacy `luXius-Backend/server/` también fue eliminada (Render ejecuta `gunicorn app:app` desde la raíz). Antes de commitear cambios de rutas, correr `python scripts/tests/check_public_routes.py` (falla si aparece un endpoint público fuera de la lista blanca) y, con el backend local levantado, `python scripts/tests/test_security_suite.py` (33 pruebas).
11. **Despliegue gh-pages sin Redirección de Errores**: Al invocar `.\scripts\deploy_gh_pages.ps1` en PowerShell, **NO** usar `2>&1` porque el script define `$ErrorActionPreference = 'Stop'` y cualquier warning no fatal en stderr aborta la ejecución. Ejecutarlo de forma directa: `.\scripts\deploy_gh_pages.ps1`.

---

## 3. 🏗️ Arquitectura Técnica del Frontend (`luxius-panel`)

- **Tecnologías**: React 18, TypeScript, Vite, Vanilla CSS con temas Dark Mode / Cyberpunk industrial enriquecidos.
- **Optimización (Fase 3, 02/10/2026)**: 14 páginas lazy-loaded con `React.lazy()` + `Suspense` → 52 chunks separados (JS principal: 2480→327KB, **-87%**; CSS: 166→49KB, **-70%**).
- **PWA (Fase 4, 02/10/2026)**: Installable via `manifest.json`, service worker `sw.js` (cache-first statics, network-first API, offline SPA shell), iOS safe-area `env()`, `@media (display-mode: standalone)`.
- **Rutas y Vistas Principales**:
  - `src/pages/Entrada/`: Ingestión de pedidos, modal de nuevo pedido (`NuevoPedidoModal.tsx`), estados de OT.
  - `src/pages/Diseno/`: Aprobación técnica, previsualizaciones vectoriales y bitmaps.
  - `src/pages/Impresion/`: Cola de impresión por máquinas y bobinas.
  - `src/pages/Taller/`: Canvas de producción interactivo (`WorkshopCanvas.tsx`, `WorkshopDashboard.tsx`).
  - `src/pages/Presupuestador/`: Cotizador rápido para ventas y clientes.
  - `src/pages/ABM/`: Clientes, Materiales, Bobinas, Vendedores, Servicios, Monedas, Bancos.
  - `src/pages/Analytics/`: Conciliación bancaria, reportes financieros.
  - `src/pages/Xana/`: Dashboard de IA y logs de decisiones.
  - `src/pages/XpressViewer/`: Visor avanzado de archivos pesados.

### Módulos Críticos del Core:

#### A. Motor de Cálculo de Precios y Bobinas (`src/utils/pricingCalculator.ts`)
- Función central: `calculateItemPriceDetailed(...)`.
- **Lógica de optimización**:
  1. Evalúa tanto la orientación normal (`ancho <= útil`) como rotada (`alto <= útil`).
  2. Aplica un margen de seguridad de 1cm (`safetyMargin = 0.01`).
  3. Precios por cliente: Busca precios específicos por cliente (`preciosEspeciales[materialCode:bobina]` o `preciosEspeciales[materialCode]`).
  4. Minimización de desperdicio: Ordena candidatos por bobina más angosta y menor consumo lineal (`ml`).
  5. Fallback si excede todas las bobinas: Asigna la bobina más ancha disponible.
  - ⚠️ **Regla importante**: La variable `bestCost` debe mantenerse declarada (`let bestCost = Infinity;`) para evitar excepciones fatales `ReferenceError` en el cálculo.

#### B. Generador de Presupuestos y OTs en PDF
- Archivos: `src/utils/generatePdfBudget.ts`, `src/utils/generatePdfClientReport.ts` y `src/utils/pdfImageOptimizer.ts`.
- **Optimización Crítica de Resolución y Peso**:
  - Anteriormente, los PDFs incrustaban imágenes de producción a resolución completa (archivos de 10MB a 50MB), provocando que un presupuesto o reporte pesara más de 100 MB.
  - Se implementó `src/utils/pdfImageOptimizer.ts` (`optimizePdfThumbnail` y `batchOptimizePdfThumbnails`).
  - **Mecanismo**: Antes de renderizar la ventana de impresión, escala físicamente la imagen en un Canvas off-screen a un máximo de 360x360px con compresión JPEG calidad 0.72 - 0.75. Reduce el peso de cada miniatura a ~15-25 KB. El resultado es una **reducción de peso del PDF superior al 95%** manteniendo nitidez 100% fotográfica para impresión.
  - **Logo liviano (Sept 2026)**: el PNG base64 de 967 KB (`src/utils/logoBase64.ts`) fue reemplazado en ambos generadores de PDF por `XIGNUX_LOGO_LIGHT` (`src/utils/logoBase64Light.ts`), un SVG vectorial de ~0.5 KB generado con `node scripts/compressLogo.mjs`. `logoBase64.ts` se conserva solo para la UI; **no importarlo en generadores de PDF**.
- **Lógica de Impresión / Exportación**:
  - Usa estilos `@media print` que **no deben restringir la altura fija** (`height: auto !important`) para permitir multipaginación fluida.
  - Contenedores clave usan `break-inside: avoid; page-break-inside: avoid;`.
  - La galería de miniaturas al pie (`.thumb-gallery`, `.thumb-card`) paginan automáticamente sin desbordar el documento.

#### C. Ingestión de Archivos y Metadatos en Vivo
- Extrae DPI y dimensiones físicas de archivos directamente en el cliente (JPG, PNG, TIFF, SVG, PDF).
- Soporta importación de carpetas completas desde enlaces de Google Drive, OneDrive y WeTransfer a través del backend `/api/cloud-import` y `/api/google-drive`.

#### D. Módulo Xpress Studio & Redrawer AI para Rol Artista
- **Documento de Referencia Maestro**: `ROADMAP_ARTISTA_XPRESS_VIEWER.md`.
- **Ruta**: `/xpress-viewer` habilitada en `src/types/auth.ts` para `rolePermissions.artista`.
- **Capacidades**:
  - Carga contextual directa vía `searchParams`: `?fileUrl=...&fileName=...&tab=redrawer`.
  - Botones de inspección rápida `👁️ Xpress` por fila en `Diseno.tsx` y en el modal `SharedFileViewerModal.tsx`.
  - Navegación multipágina para PDFs vectoriales pesados vía Canvas PDF.js.
  - Herramientas de calibración de demasías/sangrado, medidor perimetral, paleta de colores CMYK/RGB.
  - Pestaña **Redrawer Studio**: Vectorización automática de logotipos de baja calidad con ImageTracer.

---

## 4. 🐍 Arquitectura Técnica del Backend (`luXius-Backend`)

- **Tecnologías**: Python 3.12, Flask / Flask-CORS, SQLAlchemy 2.0, Gunicorn.
- **Hosting**: Render (`https://luxius-backend.onrender.com`).
- **Bases de Datos**:
  - **Primaria**: PostgreSQL en Neon Serverless (SSL activo).
  - **Local / Respaldo**: SQLite (`luxius.db`).
- **Almacenamiento Multimedia**:
  - **Primario**: Cloudflare R2 (`luxius-media`) compatible con S3 (Zero Egress Fees).
  - **Bóveda Backup**: Google Drive API v3 organizada por Cliente/Año/Mes.
- **Autenticación**: JWT emitido al iniciar sesión, requerido en cabeceras HTTP `Authorization: Bearer <token>`.
- **Rutas Principales**:
  - `/api/ordenes`: CRUD y actualización de estado de órdenes de trabajo.
  - `/api/clientes`, `/api/materiales`, `/api/servicios`, `/api/vendedores`: Catálogos ABM.
  - `/api/cloud-import`: Descarga, extracción y análisis de enlaces compartidos (Drive/OneDrive/WeTransfer).
  - `/api/google-drive`: Integración nativa con Google Drive corporativo.
  - `/api/xana/*`: Endpoints para memoria, tareas (`/tasks`), sesiones (`/sessions`) y decisiones arquitectónicas (`/decisions`).

### Modelo de Seguridad, Autenticación y Control de Acceso (Auditoría 03/10/2026)
- **Jerarquía de Roles de Usuario**:
  - `ADMIN_ROLES = {'administrador', 'principal', 'jefe_produccion'}`: Acceso total al sistema, gestión de usuarios, cambio de roles/habilitación, rotación de credenciales, configuración de webhooks y variables críticas.
  - `OPERATOR_ROLES = ADMIN_ROLES | {'operario', 'vendedor', 'artista', 'disenador', 'impresion', 'impresor'}`: Operación de taller, gestión de órdenes, stock de materiales, máquinas, analytics y procesamiento de imágenes en escalador.
  - `CLIENT_ROLE = {'cliente'}`: Mínimo privilegio estricto. Solo lectura y gestión de sus propias órdenes (`Usuario.client_id == Presupuesto.cliente_id`), creación de órdenes forzando su `clientId`, sin acceso a catálogos internos de proveedores, máquinas, balance bancario o configuraciones globales.
- **Decoradores de Autorización (`middleware/auth.py`)**:
  - `@login_required`: Requiere token JWT válido en cabecera `Authorization: Bearer <token>` (o `?token=` en descargas específicas). Valida `token_version` en BD.
  - `@operator_required`: Verifica que el rol pertenezca a `OPERATOR_ROLES`.
  - `@admin_required`: Verifica que el rol pertenezca a `ADMIN_ROLES`.
  - `invalidate_user_token_version(user_id)`: Revoca instantáneamente todas las sesiones activas de un usuario al cambiar su contraseña o rol.
- **Lista Blanca de Endpoints Públicos Autorizados**:
  - `GET /health`: Monitoreo de estado de BD y almacenamiento.
  - `POST /api/auth/login`: Login protegido por `LoginThrottle` (máx 5 intentos fallidos / 15 min por IP+usuario; máx 20 por IP).
  - `GET /api/tarifas`: Catálogo público de precios base de producción.
  - `GET /api/upscaler/status`: Diagnóstico de GPU Vulkan local y catálogo de modelos.
  - `GET /api/xana/health`: Liveness del asistente IA.
  - `POST /api/import-cloud/file`: Ingesta de enlaces externos con anti-SSRF y regex estricto de `drive_id`.
  - `POST /api/telegram/webhook`: Webhook de Telegram protegido por `X-Telegram-Bot-Api-Secret-Token`.
  - `GET /uploads/<filename>`: Archivos públicos con prevención de path traversal y CSP sandbox para SVG/HTML.
  - `GET /api/download`: Descarga de archivos de producción; requiere token JWT para URLs externas.
- **Utilidades Centralizadas de Seguridad (`services/security_utils.py`)**:
  - `is_safe_url(url)`: Validación anti-SSRF completa (resuelve DNS, bloquea IPs privadas/loopback/cloud metadata `169.254.169.254`, valida esquema `http/https`).
  - `LoginThrottle`: Rate limiting en memoria para mitigación de ataques de fuerza bruta.
  - `telegram_webhook_secret(bot_token)`: Derivación HMAC-SHA256 del token o lectura de `TELEGRAM_WEBHOOK_SECRET`.
  - `client_ip(req)`: Extracción segura de IP considerando proxies inversos (Render / Nginx).
- **Frontend Global Auth Interceptor (`src/utils/authFetch.ts`)**:
  - Intercepta todas las peticiones `fetch()` hacia el backend e inyecta automáticamente `Authorization: Bearer <token>` si el usuario está autenticado, evitando errores 401 por omisión de headers en llamadas nuevas.
- **Inventario de Variables de Entorno del Backend**:
  - `DATABASE_URL`: URI de conexión a PostgreSQL (Neon Serverless con SSL).
  - `JWT_SECRET_KEY` / `JWT_SECRET`: Clave maestra para firma criptográfica de tokens JWT.
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT_URL`: Claves para Cloudflare R2 (almacenamiento S3 compatible).
  - `TELEGRAM_BOT_TOKEN`: Token oficial del bot otorgado por @BotFather.
  - `TELEGRAM_ADMIN_CHAT_ID`: ID del chat de Telegram autorizado para alertas y control de taller (`1499600102`).
  - `TELEGRAM_WEBHOOK_SECRET`: Secreto criptográfico para validar autenticidad de peticiones de Telegram.
  - `TELEGRAM_AUTO_WEBHOOK`: `1` (default en Render) para auto-registrar webhook al iniciar, `0` para deshabilitar.
  - `GEMINI_API_KEY`: Clave API de Google AI Studio para capacidades multimodales y LangGraph.
  - `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`: Proveedor LLM alternativo.
  - `GOOGLE_SERVICE_ACCOUNT_JSON` / `credentials.json`: Credenciales para bóveda Google Drive.

---

## 5. 📱 Ecosistema App Móvil (XignuX Workfield Manager)

- Documento de referencia: `XANA_MEMORIA_APP_MOVIL.md`.
- **Estado**: App híbrida en Capacitor + Vanilla JS orientada a operarios de campo (colocaciones, relevamientos y firmas).
- **Vulnerabilidades auditadas**:
  - Migración requerida a `androidScheme: "https"` y `cleartext: false` en `capacitor.config.json`.
  - Sanitización estricta de variables en `.innerHTML`.
  - Migración de `localStorage` a `@capacitor-community/secure-storage` para JWT.
- **Roadmap Móvil**:
  - Consumo directo de API `https://luxius-backend.onrender.com`.
  - Modo offline con sincronización en `/api/sync/push`.
  - Asistente Xana flotante en la app y captura de firma digital enviada al backend para remito centralizado.

---

## 6. 🛠️ Bitácora de Problemas Críticos Recientes y Soluciones Aplicadas

| Incidencia / Síntoma | Causa Raíz | Solución Implementada | Archivo(s) Modificado(s) |
| :--- | :--- | :--- | :--- |
| **Carga de orden se congelaba / pantalla trabada** | `ReferenceError: bestCost is not defined` en JavaScript al calcular precio/bobina. La variable no estaba declarada con `let`. | Se inicializó `let bestCost = Infinity;` en el motor de cálculo. | `src/utils/pricingCalculator.ts` |
| **Error 401 en consola al abrir modal de nueva orden** | Peticiones a `/api/servicios` y `/api/vendedores` no enviaban header `Authorization: Bearer <token>`. | Se agregó interceptor de token JWT guardado en `localStorage`. | `src/pages/Entrada/NuevoPedidoModal.tsx` |
| **PDFs salían cortados o miniaturas fuera de la hoja** | El CSS de impresión forzaba `height: 297mm !important` en `@media print`, cortando todo a una sola hoja A4; la grilla de miniaturas no tenía reglas de salto. | Se cambió a `height: auto`, `overflow: visible` y reglas `page-break-inside: avoid` en cada tarjeta de miniatura. | `src/utils/generatePdfBudget.ts`<br>`src/utils/presupuestoPdf.ts` |
| **Pérdida de archivos temporales al reiniciar Render** | Los servidores en Render son efímeros y limpian la carpeta `/uploads` local al reiniciarse. | Se implementó streaming transparente desde Cloudflare R2 con fallback a disco. | Backend: `routes/files.py` / `services/storage.py` |
| **Caché persistente en navegadores de clientes** | Los bundles antiguos quedaban en la memoria del navegador de los operarios. | Sistema de handshake de versiones (`version.json` + `versionCheck.ts`) que recarga automáticamente ante nuevo release. | `src/utils/versionCheck.ts` |
| **PDFs resultantes pesaban más de 100MB** | El navegador incrustaba imágenes de producción a resolución nativa completa (10MB-50MB por archivo) en lugar de resolución miniatura. | Se implementó `src/utils/pdfImageOptimizer.ts` con escalado físico en Canvas (360x360px JPEG 0.75) y logo comprimido, logrando >95% de reducción de peso. | `src/utils/pdfImageOptimizer.ts`<br>`src/utils/generatePdfBudget.ts`<br>`src/utils/generatePdfClientReport.ts` |
| **Artista no tenía acceso a Xpress Viewer ni herramientas de inspección rápida** | `/xpress-viewer` no estaba en `rolePermissions.artista` ni había enlaces contextuales desde las órdenes. | Se activó la ruta para Artista, soporte de `searchParams` en `XpressViewer.tsx` y botones `👁️ Xpress Studio` en `Diseno.tsx` y modales. | `src/types/auth.ts`<br>`src/pages/XpressViewer/XpressViewer.tsx`<br>`src/pages/Diseno/Diseno.tsx` |
| **Logo PNG de 967 KB seguía incrustándose en reportes de cliente** | `generatePdfClientReport.ts` importaba `XIGNUX_LOGO_BASE64` y lo recomprimía en canvas en cada PDF. | Se reemplazó por `XIGNUX_LOGO_LIGHT` (SVG ~0.5 KB) y se eliminó la recompresión del logo. Trabajo iniciado el 19/09 y cerrado el 22/09/2026. | `src/utils/generatePdfClientReport.ts`<br>`src/utils/logoBase64Light.ts`<br>`scripts/compressLogo.mjs` |
| **Repo con 300+ MB de basura versionada** | `.venv`, `__pycache__`, `dist/`, `luxius-panel.zip`, `server/luxius.db`, `server/uploads/`, backups y `.mp4/.mp3` fueron agregados antes de las reglas de `.gitignore`, por lo que seguían trackeados. | `scripts/fase1_limpieza.ps1`: `git rm --cached` de todo lo anterior (se conserva en disco), `.gitignore` ampliado, raíz reorganizada en `scripts/tests/`, `docs/roadmaps/`, `docs/xana/`, `docs/legacy/`. | `.gitignore`<br>`scripts/fase1_limpieza.ps1` |
| **Terminal del agente IA quedó colgada de forma permanente** | Un `git fetch` en shell no interactivo se quedó esperando usuario/contraseña por stdin; todos los comandos posteriores expiraron. | Regla: exportar `GIT_TERMINAL_PROMPT=0` antes de cualquier `fetch/push` desde agentes. El script de Fase 1 lo hace y además mata procesos `git` huérfanos y borra `index.lock`. Si ocurre, reiniciar la terminal del IDE. | `scripts/fase1_limpieza.ps1`<br>Sección 2, regla 3 |
| **Logo oficial no aparecía en PDFs y miniaturas quedaban vacías por impresión prematura** | El logo había sido sustituido por un placeholder SVG genérico. Además, `window.print()` se ejecutaba con un `setTimeout` fijo de 500-600ms antes de que las imágenes se decodificaran en el DOM, y órdenes con múltiples archivos solo mostraban el primero. | Se procesó el logo oficial XignuX (PNG 32-bit optimizado a 92KB), se implementó detector de imágenes listas (`img.decode()`) antes de abrir el diálogo de impresión, soporte multi-archivo en presupuestos y reportes, y concurrencia controlada en `pdfImageOptimizer.ts`. | `src/utils/logoBase64.ts`<br>`src/utils/logoBase64Light.ts`<br>`src/utils/pdfImageOptimizer.ts`<br>`src/utils/generatePdfBudget.ts`<br>`src/utils/generatePdfClientReport.ts`<br>`src/utils/presupuestoPdf.ts` |
| **Listado de órdenes mostraba precios de lista en lugar de precio especial o manual** | `calculateOrderPrice()` en `Entrada.tsx` recalculaba desde cero con la fórmula estándar de materiales ignorando `order.total`, `order.subtotal` y `order.precioUnitarioManual` guardados. | Se ajustó `calculateOrderPrice()` para priorizar `precioUnitarioManual`, luego `order.total` y `order.subtotal` persistidos, manteniendo el cálculo de materiales solo como fallback si no hay total guardado. | `src/pages/Entrada/Entrada.tsx` |
| **Importación de carpetas pesadas de Google Drive fallaba o parecía colgada por timeout** | El backend intentaba descargar sincrónicamente todos los archivos (ej. 140MB) en una sola llamada HTTP antes de responder, excediendo el límite de 90s/100s de frontend y Render. | Se desacopló la importación: descubrimiento instantáneo de metadatos en <1s con `skip_download=True`, endpoint de streaming bajo demanda (`/api/import-cloud/file`), y descarga progresiva en el cliente con feedback visual archivo por archivo. | `server/routes/cloud_import.py`<br>`luXius-Backend/routes/cloud_import.py`<br>`src/pages/Entrada/NuevoPedidoModal.tsx` |
| **Sección de analíticas quedaba colgada / pantalla congelada** | 1) `Uncaught TypeError: Cannot read properties of undefined (reading 'toLocaleString')` en tabla de rentabilidad por incompatibilidad de llaves (`c.billing` vs `c.facturacion`). 2) Múltiples peticiones HTTP en cascada sin timeout que bloqueaban la carga si el backend local no respondía. | Se protegieron todas las propiedades con fallback (`cliente`/`name`, `facturacion`/`billing`), se paralelizaron las peticiones con `Promise.allSettled` y timeouts de 7s en `Analytics.tsx`, y se blindó `ConciliationTable.tsx` contra campos nulos y timeouts de 6s. | `src/pages/Analytics/Analytics.tsx`<br>`src/pages/Analytics/ConciliationTable.tsx` |
| **Clientes recién creados desaparecían de Administración y no figuraban en el detalle de órdenes** | 1) `post_clientes()` en backend tenía condición fallida `if is_new and not item.get('id'):` que dejaba `cliente=None` cuando el frontend mandaba un ID temporal, disparando error 500 al guardar en BD y borrando el cliente local al ejecutar `refreshCollection`. 2) Backend no serializaba campos extendidos (`cuit`, `telefono`, `condVenta`, `vip`, `fechaInicio`). 3) `allClientes` en `Entrada.tsx` estaba congelado en un `useState(...)[0]` estático y comparaciones de ID sensibles a tipo. | Se corrigió `post_clientes()` y `_apply_cliente_fields()` en backend para instanciar siempre clientes nuevos con ID secuencial y persistir `cuit`, `telefono`, etc. en `extra`, se actualizó `Cliente.to_dict()` para devolverlos, se limpió el payload POST en `saveCliente` (`src/data/db.ts`), y se reactivó `allClientes` y comparaciones seguras por `String(id)` en `Entrada.tsx` y `NuevoPedidoModal.tsx`. | `luXius-Backend/app.py`<br>`luXius-Backend/models.py`<br>`luXius-Backend/server/app.py`<br>`server/app.py`<br>`server/models.py`<br>`src/data/db.ts`<br>`src/pages/Entrada/Entrada.tsx`<br>`src/pages/Entrada/NuevoPedidoModal.tsx` |
| **Crash en Render: `ModuleNotFoundError: No module named 'psycopg'`** | 1) SQLAlchemy 2.0 intentaba resolver la URL PostgreSQL cargando el dialecto nuevo `psycopg` (v3) que no estaba en `requirements.txt`. 2) Render estaba vinculado a la rama `master` de `luXius-Backend` en GitHub, la cual estaba desfasada por un mes respecto a `main` (`dad678a` vs `9387226`), impidiendo que Render desplegara las correcciones. | Se forzó el dialecto `postgresql+psycopg2://` en `config.py`, se instaló `psycopg[binary]>=3.1`, `psycopg-binary>=3.1` y `psycopg2-binary>=2.9` en `requirements.txt`, y se sincronizaron ambas ramas en GitHub (`git push origin main:master`), logrando el arranque exitoso de Gunicorn con `HTTP 200 OK` en producción. | `luXius-Backend/config.py`<br>`luXius-Backend/requirements.txt`<br>`server/config.py`<br>`server/requirements.txt` |
| **Generación de PDF individual colgaba "infinitamente en espera"** | `generatePdfBudget.ts` importaba `optimizePdfThumbnail` pero llamaba `batchOptimizePdfThumbnails` (no importado) → `ReferenceError` tras abrir el spinner "Optimizando PDF...". `generatePdfClientReport.ts` referenciaba `XIGNUX_LOGO_BASE64` sin importarlo. | Se corrigieron los imports en ambos generadores. | `src/utils/generatePdfBudget.ts`<br>`src/utils/generatePdfClientReport.ts` |
| **Faltaba selector de formato de PDF y consolidación masiva de OTs** | Los generadores de PDF no soportaban modo; no existía manera de elegir detallado vs simplificado ni de consolidar varias OTs en un solo documento. | Se reescribió `generatePdfBudget.ts` con `mode: 'detallado'\|'simplificado'` (simplificado omite precios/totales/datos bancarios) y se agregó `generatePdfBatch()` (una página A4 por OT, con deduplicación de miniaturas). Nuevo modal `PdfModeModal.tsx` y botón "📚 PDF Masivo" en la barra de acciones de Entrada. | `src/utils/generatePdfBudget.ts`<br>`src/components/PdfModeModal.tsx`<br>`src/pages/Entrada/Entrada.tsx` |
| **Stock sin historial de entradas ni exportación a PDF** | No existía log de movimientos de stock (ingresos/egresos/ajustes con fecha y hora). | Se creó `MovimientoStock`, capa `getMovimientosStock`/`saveMovimientoStock` + auto-log en `saveMaterial`, feed "scroll news" en tiempo real (`StockNewsFeed`, polling 3s + evento `luxius-stock-updated`) y `generateStockReportPdf` con filtros Semana / Mes / Últimos X días. | `src/types/entities.ts`<br>`src/data/db.ts`<br>`src/components/StockNewsFeed.tsx`<br>`src/components/StockNewsFeed.css`<br>`src/utils/generateStockReportPdf.ts`<br>`src/pages/Stock/Stock.tsx` |
| **Stock no permitía alta directa ni mostraba todas las variaciones/anchos** | No había alta in situ de materiales; los materiales con `tipoCobro='ml'` mostraban un único rollo (ignorando el array `bobinas`, p. ej. "Vinilo Vehicular" con dos anchos). | Botón "➕ Nuevo Material" (reutiliza `NuevoMaterialModal`) sin salir de la vista; expansión de `bobinas` en rollos por ancho; util `materialAudit.ts` que audita variaciones faltantes contra las ÓT y las sincroniza (`syncMaterialVariations`) + botón "🛡️ Auditar"; refresh en tiempo real vía evento `luxius-materials-updated` y `storage`. | `src/pages/Stock/Stock.tsx`<br>`src/utils/materialAudit.ts`<br>`src/data/db.ts` |
| **Stock compartido entre anchos (dimensiones enlazadas)** | `Material.stockActual` era un único valor por material; al ajustar la cantidad de un ancho se sobrescribía para todos los anchos del mismo material. | `Material.bobinas` ahora acepta `stockActual` por bobina; el ajuste apunta a un ancho específico (`handleOpenAdjustment(material, bobinaAncho)`) y persiste solo esa bobina; el feed registra el movimiento con sufijo del ancho (`... (1.37m)`). | `src/types/entities.ts`<br>`src/pages/Stock/Stock.tsx` |
| **Sección de Analíticas sin datos (resuelto)** | 1) `getMateriales().catch()` en `Analytics.tsx` llamaba `.catch` sobre un array (`getMateriales` es síncrona) → `TypeError` que hacía fallar todo `fetchData` y caer al fallback vacío. 2) `/api/analytics/stats` y `/api/analytics/reconciliation` eran stubs que devolvían vacío. | Se cambió a `Promise.resolve(getMateriales())`; se agregó `buildStatsFromOrders()` para generar las métricas de producción desde las órdenes impresas; `ConciliationTable` calcula la conciliación desde `getOrdenes()` cuando el backend está vacío; y se implementaron `/api/analytics/stats` y `/api/analytics/reconciliation` en `server/app.py` derivando datos de `Presupuesto`. | `src/pages/Analytics/Analytics.tsx`<br>`src/pages/Analytics/ConciliationTable.tsx`<br>`server/app.py` |
| **Faltaba alerta proactiva de faltantes por cruce inventario-OT** | No había cruce entre stock disponible y demanda de órdenes activas. | Nuevo `stockForecast.ts` (`computeStockForecast`) que calcula demanda por material/bobina y por grupo (`batchId`), con severidades crítico/bajo/ok; panel "📊 Proyección de faltantes" + badges en Stock, banner y badges por lote en Entrada, y campanita global "🔔 STOCK" en el Header. | `src/utils/stockForecast.ts`<br>`src/pages/Stock/Stock.tsx`<br>`src/pages/Entrada/Entrada.tsx`<br>`src/components/layout/Header.tsx` |
| **Alertas de stock se disparaban para órdenes ya procesadas y eran visibles para todos los roles** | El forecast incluía múltiples estados y no estaba restringido por rol. | Se filtró a solo `status === 'orden'` ("Para Imprimir") y se restringió la visibilidad a roles `administrador`/`principal`/`impresion` con `canViewStockAlerts()`. | `src/utils/stockForecast.ts`<br>`src/components/layout/Header.tsx`<br>`src/pages/Stock/Stock.tsx`<br>`src/pages/Entrada/Entrada.tsx` |
| **Niveles de tinta mostraban alerta de "sin stock" con 500 ml y el tanque se llenaba al 100%** | 1) `groupMinStock` usaba `Math.min(...valores, 0)` forzando el mínimo a 0 siempre. 2) La escala del tanque era 5 L (o 500 ml) en vez de la capacidad real de 2 L. | Se corrigió `groupMinStock` (sin el `, 0`); se definieron `LIQUID_CAPACITY_ML=2000`, `LIQUID_REASONABLE_ML=500`, `LIQUID_ALERT_ML=250`; el tanque escala a 2 L (500 ml = 25%); alerta "Reponer" < 250 ml; el estado del grupo usa el color más crítico (mínimo). | `src/pages/Stock/Stock.tsx`<br>`src/components/StockCharts.tsx` |
| **No se registraba el stock de tinta fuera de máquina (botellas cerradas)** | No existía el concepto de botellas selladas en el modelo. | Se agregó `Material.botellasCerradas` (cantidad) y `Material.botellasMl` (ml); indicador "🍾 − N + cerradas \| [ml]" editable en cada tinta. | `src/types/entities.ts`<br>`src/pages/Stock/Stock.tsx` |
| **La conciliación Órdenes vs RIP no usaba datos reales** | Los logs de la impresora (Roland VersaWorks) no se ingerían; `/api/analytics/reconciliation` era un stub. | Se creó `ripLogParser.ts` (parsea el XML EventLog de Roland, eventos 24/25 con tinta nl→ml y tamaño mm→m²) y `ripLogReconcile.ts` (matchea por nombre de archivo y calcula m² real, tinta real y eficiencia). Botón "Importar Log RIP" en `ConciliationTable` que guarda los logs en `localStorage`. | `src/utils/ripLogParser.ts`<br>`src/utils/ripLogReconcile.ts`<br>`src/pages/Analytics/ConciliationTable.tsx` |
| **R2→Drive podía borrar de R2 archivos de órdenes que todavía no se habían impreso** | `test_single_file.py` pedía la confirmación (`input()`) ANTES de buscar el presupuesto y evaluar `presupuesto.estado`, así que la protección 🔒 quedaba después del prompt y nunca surtía efecto. Además `buscar_presupuesto_por_archivo()` no traía `estado` ni `deleted_at` en el SELECT, y el script autenticaba contra Drive y ejecutaba `CREATE TABLE` antes de preguntar nada. | Se agregó `requiere_proteccion_por_no_impreso()` con `ESTADOS_IMPRESOS`, se amplió el SELECT con `p.estado, p.deleted_at`, y se reordenó `main()` para que la búsqueda de solo lectura y el chequeo 🔒 ocurran antes del `input()`. `get_drive_service()` y el DDL quedaron después del prompt; ambos `input()` asumen `n` ante `EOFError`. Verificado: `1790309456184_avelino_atrasyzocalo1_135x267cm.jpg` frena con `🔒 PROTEGIDO` sin preguntar. | `scripts/sync_r2_to_drive.py`<br>`scripts/test_single_file.py` |
| **Integración Telegram Bot (Fases 1, 2, 3), Briefing Matutino y Gestión de Etiquetas Operativas** | 1) No existía canal de mensajería instantánea ni control desatendido por Telegram con alertas de taller, tareas de Xana ni comandos de voz. 2) Las órdenes no contaban con etiquetas operativas (🚨 URGENTE, ⭐ VIP, etc.) asignables interactivamente ni en alta unitaria/lote ni con disparo automático de notificaciones push prioritarias. | Se implementó el servicio completo `services/telegram_service.py` con webhook bidireccional, procesamiento multimodal de voz (Gemini inline audio base64 con cascada de cuota libre), notificaciones push automáticas para órdenes urgentes/VIP, generación y despacho de briefing matutino (`MorningBriefingModal.tsx`), chips y selector de etiquetas en `Entrada.tsx` y `NuevoPedidoModal.tsx`, y nueva vista de administración `TelegramView.tsx` en `/sistema/telegram` con guía en 3 pasos y botones de prueba/webhook. | `services/telegram_service.py`<br>`routes/telegram.py`<br>`services/briefing_service.py`<br>`src/pages/Sistema/TelegramView.tsx`<br>`src/pages/Entrada/Entrada.tsx`<br>`src/pages/Entrada/NuevoPedidoModal.tsx` |
| **Briefing y `/taller` incluían órdenes ya impresas y mostraban bobinas 'Estándar' o triplicadas** (**03/10/2026**) | 1) `briefing_service.py` y `cmd_taller` filtraban con `in_(['orden', 'ORDEN_DE_TRABAJO', 'impreso', 'post', ...])`, mezclando 61 órdenes terminadas con las 24 realmente pendientes y reportando 173 ml en lugar de los 54.8 ml reales. 2) Las órdenes impresas antiguas tenían `bobinaAsignada=None` y caían en el fallback `Estándar`, fragmentando el Vinilo Vehicular en 1.37, 1.52 y 'Estándar'. | Se restringió el filtro estrictamente a órdenes vivas pendientes de impresión (`['orden', 'ORDEN_DE_TRABAJO']`), se agregaron funciones `resolve_material_name()` (normaliza siglas `VV`→`Vinilo Vehicular`, `FL`→`Lona Frontlight`, etc.) y `resolve_bobina_ancho()` (resuelve por asignación, precioDetalle o dimensiones de la pieza eliminando 'Estándar'), se contabilizan las 61 ya impresas en una métrica informativa separada (`✅ Ya Impresas: 61 OTs`), y se refinó la recomendación secuencial de Xana en tandas de 1.37m y 1.52m paso a paso. | `services/briefing_service.py`<br>`services/telegram_service.py` |
| **Scripts con emoji crasheaban al correrlos en consola Windows** | `cmd.exe`/`powershell.exe` usan cp1252 y los `print()` con `✔`, `🔒`, `⚠️` lanzaban `UnicodeEncodeError`. | Se corre con `$env:PYTHONIOENCODING="utf-8"`. El log a archivo nunca se vio afectado porque `logging.FileHandler` ya usa `encoding='utf-8'`. | `scripts/*.py` |
| **Panel web inutilizable en dispositivos móviles** (**RESUELTO 02/10/2026**) | 1) `MainLayout.css` fuerza `grid-template-columns: 260px 1fr` sin colapso de sidebar. 2) Solo 9 media queries en 68+ archivos CSS; `Stock.css` (691 líneas) tiene 0 breakpoints. 3) Cinco widgets flotantes se superponen en viewport <768px. 4) Touch targets bajo mínimo WCAG 44×44px. 5) `padding: 32px 40px` en `.main-content` desperdicia ~80px en móvil. | **Plan Mobile-First 4 fases COMPLETADO** (02/10/2026, commits `fa43e79`→`e529912`): Fase 1 (fundación tokens/sidebar/topbar), Fase 2 (9 CSS responsive + bottom-sheet 21 modales + FAB unificado), Fase 3 (React.lazy -87% JS + fonts condicionales), Fase 4 (PWA manifest + service worker + iOS safe-area). Bundle de 2.5MB→327KB. App instalable y usable en mobile. | `src/components/layout/MainLayout.*`<br>`src/styles/index.css`<br>`src/pages/*/Stock.css,Entrada.css,ABM.css,Dashboard.css`<br>`src/components/ui/Modal.css,FABMenu.*`<br>`src/App.tsx,index.html,public/manifest.json,public/sw.js` |
| **Faltaban etiquetas de producción para rollos (impresión física)** (**RESUELTO 02/10/2026**) | En el taller no existía una forma ágil de imprimir etiquetas alargadas autocompletadas para pegar a lo largo del rollo de material con los datos del destinatario, proyecto y detalle visual de archivos. | Se desarrolló el generador de etiquetas `generateLabelPdf.ts` (105mm ancho alargado adaptativo, logo XignuX, fecha de emisión, campos vacíos omitidos para evitar sensación de vacío, proyecto desde `nombreTarea`, teléfono WhatsApp 3517897667, grilla 2-col de miniaturas con nombres sin extensión y medidas en cm sin precios). Integrado en `Entrada.tsx` (botón masivo en barra de selección + botón individual en tabla y tarjetas mobile) y en `SharedFileViewerModal.tsx`. | `src/utils/generateLabelPdf.ts`<br>`src/pages/Entrada/Entrada.tsx`<br>`src/components/shared/SharedFileViewerModal.tsx` |
| **Etiquetas de producción: miniaturas rotas, demora y tipografía sin impacto** (**RESUELTO 02/10/2026**) | 1) `generateLabelPdf.ts` usaba `order.archivosOriginales` como URL en lugar de `order.archivos`, buscando nombres de archivo en Render que daban 404 y congelaban el navegador por timeouts sucesivos. 2) Falta de tipografía oficial de marca y logo pequeño. | Se corrigió la resolución de URLs usando `order.archivos` (con fallback a `imgMetadata.thumbnailUrl`), se integró ventana con loader animado inmediato para cero bloqueo del navegador, se ampliaron las dimensiones del logo a 240px centrado sin redundancia de texto, y se extrajeron e incrustaron en Base64 las fuentes corporativas **Artegra Sans Bold** (títulos, destinatario 24px) y **Artegra Sans Semibold** (cuerpo, detalles) desde `F:\Diseños\Xignux\Fuentes Logo`. | `src/utils/generateLabelPdf.ts`<br>`src/utils/artegraFontsBase64.ts`<br>`public/fonts/ArtegraSans-*.otf` |
| **Prueba de tipografía oficial en todo el sistema (Artegra Sans)** (**02/10/2026**) | Se solicitó probar cómo se ve todo el panel con la tipografía oficial corporativa (Artegra Sans Bold y Semibold) con punto de restauración para reversión segura. | Se creó y pusheó el tag Git `pre-artegra-global` (commit `28e5e42`). Se agregaron los archivos `@font-face` en `src/assets/fonts/` y se configuró Artegra Sans como fuente primaria en `src/styles/index.css` (headings Bold 700, body/inputs/botones Semibold 600) con fallback a Outfit/sans-serif. Reversión instantánea disponible vía `git reset --hard pre-artegra-global`. | `src/styles/index.css`<br>`src/assets/fonts/ArtegraSans-*.otf`<br>`src/pages/Entrada/NuevoPedidoModal.css` |
| **Glifos alterados de Fontspring DEMO en tipografía Artegra Sans** (**02/10/2026**) | En las fuentes DEMO de Fontspring, caracteres de puntuación como paréntesis `( )`, símbolos y números alterados como `4` muestran un logotipo 'spring' como marca de agua comercial. | Se configuró `unicode-range` en todas las reglas `@font-face` de `index.css` y `generateLabelPdf.ts` (`U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A`) para que paréntesis, dígitos alterados, signos y acentos caigan de forma limpia en el fallback de `Outfit` sin perder el diseño corporativo. | `src/styles/index.css`<br>`src/utils/generateLabelPdf.ts` |
| **Palabra "LuXius" en sidebar no tomaba Artegra Sans** (**02/10/2026**) | El selector `.logo-text` en `Sidebar.css` tenía una regla hardcodeada `font-family: 'Segoe UI', Tahoma, ...` que ignoraba la fuente global. | Se actualizó `.logo-text` en `Sidebar.css` y `Login.css` a `font-family: 'Artegra Sans', 'Outfit', sans-serif; font-weight: 900;` para que el branding principal del sistema se dibuje con la tipografía oficial. | `src/components/layout/Sidebar.css`<br>`src/pages/Login/Login.css` |
| **PDFs y etiquetas se expandían horizontalmente al abrir el documento** (**02/10/2026**) | En `@media print`, los contenedores usaban `width: 100% !important;` y `@page` carecía de tamaño fijado, provocando que al imprimir o guardar en PDF el contenido se estirara al ancho total de la hoja (A4 210mm) o pantalla en vez de conservar el formato alargado de 105mm. | Se fijó el tamaño en `@page { size: 105mm 297mm; margin: 0; }` y los contenedores `.label-page` y `.a4-page` con `width: 105mm !important; max-width: 105mm !important; min-width: 105mm !important; margin: 0 auto !important;` tanto en print como en pantalla, logrando que el documento conserve su ancho físico exacto sin expandirse hacia los lados. | `src/utils/generateLabelPdf.ts`<br>`src/utils/generatePdfBudget.ts`<br>`src/utils/generatePdfClientReport.ts` |
| **Destinatario no estaba centrado en etiqueta de rollo** (**02/10/2026**) | El bloque de destinatario y dirección en la etiqueta física estaba alineado a la izquierda, perdiendo simetría con el logo y el bloque de proyecto centrados. | Se aplicó `text-align: center;` a `.label-section`, `.label-section-header`, `.label-section-value` y `.label-section-address` para lograr una composición estética completamente centrada y armónica. | `src/utils/generateLabelPdf.ts` |
| **Botones de cabecera (Stock, Sincronizar, Arcade) ilegibles o desalineados** (**02/10/2026**) | `pixel-btn-warning` y `pixel-btn` carecían de CSS definido, renderizando texto negro sobre fondo oscuro en "STOCK" y "ARCADE", mientras "SINCRONIZAR" tenía estilos inline discordantes sin radio de borde. | Se crearon las clases `.header-action-btn` con variantes estilizadas `.header-stock-btn` (ámbar), `.header-sync-btn` (azul ciber) y `.header-arcade-btn` (violeta neón) con altura fija 36px, esquinas redondeadas, contrastes nítidos WCAG y compatibilidad con modo claro y modo pixel. | `src/components/layout/Header.tsx`<br>`src/components/layout/Header.css`<br>`src/styles/pixelart.css`<br>`src/components/layout/Sidebar.tsx`<br>`src/components/layout/Sidebar.css` |
| **Ayuda visual para paños y órdenes con metros lineales > 2.93m (Laminado Especial)** (**02/10/2026**) | En producción, los paños gráficos que superan 2.93 metros lineales requieren un método de laminado especial. En la tabla de órdenes de Entrada y Reportes, todos los consumos se mostraban uniformemente en cian/azul sin advertencias de longitud. | Se implementó un indicador visual prominente con la paleta lila/morada de `Sistema Web` (`#c084fc`, `rgba(147, 51, 234, ...)`), borde brillante, brillo box-shadow, ícono `⚡`, badge `LAMINADO ESP.` y tooltip explicativo para cualquier orden o paño con metros lineales o dimensión > 2.93m. En la columna Medidas se resalta la cota que supera 2.93m, en los lotes cerrados se muestra el aviso de lote con paños especiales, y en la fila se añade acento lateral morado. | `src/pages/Entrada/Entrada.tsx`<br>`src/pages/Entrada/Entrada.css`<br>`src/pages/Reportes/Reportes.tsx` |
| **Pipeline R2→Drive y Gestión Segura de Huérfanos** (**02/10/2026**) | Se acumulaban 680 archivos huérfanos (1.79 GB) en Cloudflare R2 sin orden asociada en BD. `sync_r2_to_drive.py` buscaba archivos solo con `(especificaciones -> 'archivos') ? filename` (perdiendo archivos en `archivosOriginales`, paths con prefijo o URLs), volcaba todos los huérfanos en una sola carpeta plana y saturaba el correo con 1 email por cada archivo. La consola Windows crasheaba con `UnicodeEncodeError`. En la web (`GoogleDriveView.tsx`) no había visibilidad ni control de la cola de huérfanos. | 1) Se comprobó que el 100% de los 680 huérfanos (1.79 GB) ya cuentan con backup en Google Drive y 0 colisión con presupuestos activos. 2) Se reescribió `resolve_orphans.py` con purga por lote (`--all`, `--ext`, `--dry-run`, menú interactivo), chunks de 500 y actualización atómica en PostgreSQL. 3) Se mejoró `sync_r2_to_drive.py` con búsqueda resiliente multi-fallback (`archivos`, `archivosOriginales`, `r2_key` y texto `LIKE %filename%`), carpetas mensuales en Drive (`_Huerfanos_SinClasificar/YYYY-MM/`), y notificación por email consolidada al finalizar (`send_orphan_batch_summary`). 4) Se agregaron endpoints `/vault/orphans` y `/vault/orphans/purge` en `luXius-Backend` (junto con fix de importación de `uuid`). 5) En `GoogleDriveView.tsx` se añadió tarjeta y tabla interactiva de "Cola de Huérfanos" con métricas en vivo, enlaces a Drive y botón de purga segura. 6) Se blindaron los scripts de terminal con `sys.stdout.reconfigure(encoding='utf-8')` contra `UnicodeEncodeError` en Windows. | `scripts/sync_r2_to_drive.py`<br>`scripts/resolve_orphans.py`<br>`src/pages/Sistema/GoogleDriveView.tsx`<br>`luXius-Backend/routes/google_drive.py` |
| **Xpress Studio / Preimpresión en Tiempo Real (Fase 3 & 5)** (**03/10/2026**) | En el taller y área de diseño, la revisión técnica de archivos requería software externo pesado (Illustrator, Photoshop) para verificar DPI real a escala 1:1, definir demasías/sangrados de corte o lonas con bolsillo, y validar perfiles de color antes de imprimir. Además, no se podía aprobar o rebotar la orden directamente desde el visor. | Se desarrolló la suite completa de Preimpresión en `XpressViewer.tsx`: 1) **Inspector DPI 1:1 físico** con semáforo interactivo (>150 DPI Óptimo verde, 72-150 Gigantografía amarillo, <72 Crítico rojo) y cálculo reactivo según ancho/alto en metros. 2) **Calibrador de Demasías y Sangrado** con selección de caras (top/bottom/left/right), presets rápidos (2cm vinilo, 5cm, 10cm bolsillo lona), margen de seguridad y renderizado de guías perimetrales dinámicas en Canvas/SVG con persistencia a la orden. 3) **Simulador de Virado Solvente (CMYK)** para prever oscurecimiento de tintas en soportes vinílicos. 4) **Aprobación / Rebote Directo** con modal de motivos para diseñadores/operarios. 5) Enlace bidireccional desde `Diseno.tsx` y `SharedFileViewerModal.tsx` pasando `orderId` al visor. | `src/pages/XpressViewer/XpressViewer.tsx`<br>`src/pages/XpressViewer/XpressViewer.css`<br>`src/components/shared/SharedFileViewerModal.tsx`<br>`src/pages/Diseno/Diseno.tsx` |
| **Optimización de Chunks Vite y Service Worker PWA Auto-Invalidable** (**03/10/2026**) | 1) Chunks sobredimensionados post code-split (`StatusChangeModal` de 523 KB y `Analytics` de 421 KB). 2) Warnings de Vite por importación mixta estática y dinámica simultánea de `db.ts` y `authStore.ts`. 3) `sw.js` tenía `CACHE_NAME` estático que retenía assets viejos en navegadores de operarios. | 1) Se configuró `manualChunks` en `vite.config.ts` extrayendo `vendor-pdf` (876 KB), `vendor-charts` (371 KB), `vendor-icons` (24 KB) y `vendor-core` (224 KB), logrando que `StatusChangeModal` baje a 93 KB y `Analytics` a 40 KB. 2) Desacople limpio de `db.ts` y `authStore.ts` mediante evento de ventana `luxius-auth-expired` eliminando llamadas circulares. 3) Plugin de Vite inyecta automáticamente `CACHE_NAME = 'luxius-v' + Date.now()` en `sw.js` en cada compilación para invalidación garantizada de caché PWA al desplegar. | `vite.config.ts`<br>`src/data/db.ts`<br>`src/store/authStore.ts`<br>`src/utils/versionCheck.ts` |
| **Redrawer Studio: Guardado y Reemplazo Directo a la OT (Fase 4 Artista)** (**03/10/2026**) | Tras vectorizar un archivo de baja calidad en Redrawer Studio, el diseñador debía descargar el archivo SVG localmente a su máquina y volver a adjuntarlo a mano a la orden de trabajo en la web, perdiendo tiempo y trazabilidad. | Se integró el flujo de guardado directo a la OT: 1) Detección de orden vinculada (`order`) en Redrawer Studio mostrando tarjeta de OT (`#ot`, cliente, medidas, estado). 2) Botón de acción `⚡ Guardar Vector en Orden #OT`. 3) Modal interactivo con opciones: "Reemplazar arte principal (recomendado)" (coloca el SVG en `archivos[0]` y preserva el arte previo como respaldo) o "Agregar como archivo adicional". 4) Checkbox para aprobar el arte y avanzar la OT a cola de impresión (`ORDEN_DE_TRABAJO`). 5) Conversión instantánea del SVG a File/Blob, subida atómica a Cloudflare R2 vía `uploadFile()` con barra de progreso, persistencia en PostgreSQL con `saveOrden()`, nota en historial y notificación inmediata al visor. | `src/pages/XpressViewer/RedrawerStudio.tsx`<br>`src/pages/XpressViewer/RedrawerStudio.css`<br>`src/pages/XpressViewer/XpressViewer.tsx`<br>`docs/roadmaps/ROADMAP_ARTISTA_XPRESS_VIEWER.md` |
| **Etiquetas Operativas (Tags) para Órdenes de Trabajo** (**03/10/2026**) | En el flujo de entrada de pedidos y cola de impresión faltaba una manera rápida y visual de categorizar prioridades o tipos de trabajo (`URGENTE`, `REIMPRESIÓN`, `MUESTRA`, `VIP`, `ESPERA PAGO`, `STOCK`) tanto individualmente como por lote, con filtros dinámicos. | Se implementó el sistema completo de tags: 1) Definición tipada de `OrderTagDef` y presets en `src/types/orden.ts`. 2) Barra de filtros con chips interactivos para filtrar la cola por etiqueta. 3) Componente `OrderTagBadges` con popover dinámico para agregar/quitar tags en órdenes individuales y filas hijas de lotes con persistencia inmediata vía `saveOrden()`. 4) Botón de lote `🏷️ Asignar Etiqueta` en la barra flotante de selección múltiple. 5) Serialización y persistencia dual en `especificaciones['tags']` en `luXius-Backend/routes/orders.py` y `server/routes/orders.py`. | `src/types/orden.ts`<br>`src/pages/Entrada/Entrada.tsx`<br>`src/pages/Entrada/Entrada.css`<br>`server/routes/orders.py`<br>`luXius-Backend/routes/orders.py` |
| **Bot de Telegram para Monitoreo y Taller (Fase 1)** (**03/10/2026**) | El taller y administración carecían de un canal ágil y remoto para consultar en tiempo real el estado de la cola de impresión, metros lineales pendientes, alertas de stock crítico y tareas del sistema sin abrir la web o estando fuera de horario. | Se desarrolló el servicio nativo de bot de Telegram: 1) `services/telegram_service.py` con cliente HTTP directo (sin dependencias externas pesadas) y validación de seguridad por `TELEGRAM_ADMIN_CHAT_ID`. 2) Comandos `/start`, `/status` (salud y latencia PostgreSQL), `/taller` (órdenes vivas, metros lineales, urgencias), `/alertas` (stock bajo mínimo), `/tareas` (tareas activas Xana) y `/sesiones` (commits recientes e historial de agentes). 3) Rutas webhook y configuración en `routes/telegram.py` registradas en `app.py`. 4) Hoja de ruta documentada en `docs/roadmaps/Xana_Telegram_Roadmap.md`. | `server/services/telegram_service.py`<br>`server/routes/telegram.py`<br>`luXius-Backend/services/telegram_service.py`<br>`luXius-Backend/routes/telegram.py`<br>`docs/roadmaps/Xana_Telegram_Roadmap.md` |
| **Certificación Gate A4 Suite Anti-Alucinación (Xana IA)** (**03/10/2026**) | Existía riesgo de alucinaciones en cotizaciones matemáticas, tolerancias técnicas de taller (ancho de plotter, demasía, consumo tinta) y consultas sobre clientes o pedidos inexistentes que podían degradar la confiabilidad del asistente. | Se blindó la capa determinista y se certificó formalmente la Suite A4: 1) Nuevas herramientas `cotizar_trabajo` (matemática exacta con optimización de bobina y recargos) y `consultar_especificacion_tecnica` (tolerancias reales verificadas de taller) en `services/xana_tools.py`. 2) Validación estricta en `tool_obtener_metricas_ventas_cliente` y `tool_obtener_estado_ot` retornando error estructurado ante entidades inexistentes sin inventar números. 3) Creación y ejecución de `scripts/test_suite_a4.py` evaluando las 23 pruebas de `SUITE_A4_ANTIALUCINACION.md`. Resultado: **23/23 casos aprobados (100.0%)** y 0 fallas en casos trampa. Reporte oficial generado en `docs/xana/REPORTE_GATE_A4_EJECUTADO.md`. | `server/services/xana_tools.py`<br>`luXius-Backend/services/xana_tools.py`<br>`luXius-Backend/services/xana_graph.py`<br>`server/scripts/test_suite_a4.py`<br>`luXius-Backend/scripts/test_suite_a4.py`<br>`docs/xana/SUITE_A4_ANTIALUCINACION.md`<br>`docs/xana/REPORTE_GATE_A4_EJECUTADO.md` |
| **Calibración Gates A2 & A6 de Xana IA, Postergación Taller y Escalador Inteligente** (**03/10/2026**) | Se requería auditar el Shadow Mode (Gate A2) y el budget de latencia síncrona (Gate A6) de Xana IA, posponer la etapa física del taller hasta operar frente al RIP, y trazar la arquitectura para solucionar el pixelado en gigantografía cuando los clientes envían fotos de baja calidad. | 1) Se ejecutó la suite de calibración (`scripts/test_xana_calibration.py`) con 20 prompts representativos: **Gate A2 aprobado con 100.0% de acuerdo** entre router determinista y LLM; **Gate A6 aprobado con p95 de 2,726 ms (≤ 3,000 ms budget)** y promedio de 2,068 ms. 2) Se blindó `_build_llm()` con `max_retries=0` y `timeout=10.0` para fail-fast automático ante 429 de APIs externas. 3) Se agregaron endpoints `/api/xana/shadow/stats` y `/api/xana/calibration/report`. 4) La fase de Taller Físico (Daemon Hot Folder) se declaró formalmente **pausada por tiempo indeterminado** hasta estar in situ frente a la máquina. 5) Se redactó el roadmap arquitectónico del **Escalador Inteligente de Imágenes (AI Super-Resolution)** en `docs/roadmaps/ROADMAP_ESCALADOR_INTELIGENTE_IMAGENES.md` (arquitectura híbrida de 3 niveles: cliente WebGL/Lanczos-3 rápido para previews < 2s, worker asíncrono backend con Real-ESRGAN/GFPGAN para 4x/8x y restauración de rostros, integración directa en `XpressViewer.tsx` con split slider y guardado de versión HD en la OT). | `docs/xana/REPORTE_CALIBRACION_XANA_GATES_A2_A6.md`<br>`docs/roadmaps/ROADMAP_ESCALADOR_INTELIGENTE_IMAGENES.md`<br>`server/routes/xana.py`<br>`luXius-Backend/routes/xana.py`<br>`server/services/xana_graph.py`<br>`luXius-Backend/services/xana_graph.py` |
| **Escalador Inteligente de Imágenes con Aceleración GPU Vulkan (Real-ESRGAN)** (**03/10/2026**) | Al ampliar artes de baja resolución de clientes para cartelería o gigantografías, la pérdida de definición y pixelado degradaban la calidad de impresión. | Se integró el motor neuronal local `realesrgan-ncnn-vulkan.exe` con aceleración directa por hardware en GPU AMD Radeon RX 5700 XT (modelos `x4plus` y `x4plus-anime`), con tiempos de inferencia récord de 906 ms a 2.3 s y fallback por CPU en PIL Lanczos. En el backend se creó `services/upscaler_service.py` y rutas `/api/upscaler/*`, y en el frontend se implementó el modal `UpscalerModal` en `XpressViewer.tsx` con split slider interactivo before/after (0-100%), cotas DPI en tiempo real y guardado/reemplazo directo en la OT. | `services/upscaler_service.py`<br>`routes/upscaler.py`<br>`src/pages/XpressViewer/XpressViewer.tsx`<br>`src/pages/XpressViewer/XpressViewer.css`<br>`docs/roadmaps/ROADMAP_ESCALADOR_INTELIGENTE_IMAGENES.md` |
| **Auditoría de Seguridad Integral: Secretos expuestos, claves por defecto y falta de autenticación en endpoints** (**03/10/2026**) | 6 cuentas operativas tenían claves por defecto ('admin', 'adrian', 'sistema', 'impresion', 'diseño', 'vendedor') heredadas de seeds antiguos. Varios endpoints carecían de decoradores de auth. Endpoint `/api/usuarios` permitía auto-ascenso a administrador. Secretos hardcodeados en código. | Rotación de contraseñas de las 6 cuentas con hashes aleatorios seguros (`CREDENCIALES_NUEVAS.txt`), restricción estricta de ABM usuarios solo a administradores, invalidación de tokens (`token_version`), protección con decoradores `@login_required`/`@operator_required`, webhook Telegram con `secret_token`, anti-SSRF con `is_safe_url`, throttle anti fuerza bruta en login, e interceptor `authFetch.ts` en frontend. | `middleware/auth.py`<br>`services/security_utils.py`<br>`routes/auth.py`<br>`app.py`<br>`routes/orders.py`<br>`routes/telegram.py`<br>`routes/upscaler.py`<br>`src/utils/authFetch.ts`<br>`src/data/db.ts` |
| **Falta de variables R2_* en Render causaba fallback a almacenamiento local** (**03/10/2026**) | En el dashboard de Render no estaban configuradas las variables de entorno `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, etc., provocando que el backend intentara guardar en disco efímero de Render o fallara en el streaming. | Implementado módulo transitorio `private_legacy_r2.py` en el repo privado para no interrumpir el servicio multimedia (`storage: r2-legacy` en `/health`), con plan de migración inmediata a claves rotadas cargadas en Render. | `config.py`<br>`luXius-Backend/private_legacy_r2.py` |
| **Contraseñas cambiadas por el usuario no impactaban en la base de datos** (**03/10/2026**) | Hasta el commit `dbccec1` (03/09/2026), la función `saveUsuario` en el frontend solo persistía datos en el `localStorage` del navegador y no enviaba peticiones PUT/POST al backend, haciendo que la base de datos conservara los valores de fábrica. | Depuración completa de `saveUsuario` para sincronizar con `/api/usuarios`, invalidación de caché local en `getUsuarios()` y rotación definitiva en PostgreSQL. | `src/data/db.ts`<br>`app.py` |
| **Rate limit global compartido por todos los usuarios** (**03/10/2026**) | Flask-Limiter usaba `get_remote_address` y en Render todas las peticiones llegan desde la IP del proxy, por lo que el límite de 200 req/min por IP era en la práctica global; además el estado vivía en memoria de cada worker. | `key_func` pasa a `client_ip(request)` (X-Forwarded-For) y `storage_uri` usa `REDIS_URL` si existe; `RedisLoginThrottle` opcional. | `app.py`<br>`services/security_utils.py`<br>`requirements.txt` |

---

## 7. 🚀 Guía Rápida para Continuar en Cualquier Otro IDE / Máquina

Si abres este proyecto en otro IDE (Cursor, VS Code, Windsurf, etc.) o en otra PC:

1. **Estado Actual de Producción (03/10/2026)**:
   - **Backend Render**: Operativo al 100% (`https://luxius-backend.onrender.com/health` responde 200 OK, storage: `r2-legacy` transitorio a la espera de variables R2 rotadas en Render). Ambas ramas `main` y `master` de `luXius-Backend` sincronizadas en GitHub con webhook de Telegram protegido con `secret_token` (`/api/telegram/webhook`), configuración in-situ protegida (`/api/telegram/config`), servicio de briefing matutino (`/api/production/briefing`), escalador IA seguro (`/api/upscaler/*`), cuentas de producción con contraseñas rotadas en `CREDENCIALES_NUEVAS.txt`, e interceptor global `authFetch` en frontend.
   - **Telegram Bot Activo**: Bot oficial `@LuXius_Taller_Bot` (ID `8862580603`) con webhook verificado en Render y chat admin `1499600102`. Comandos `/status`, `/taller`, `/briefing`, `/alertas`, `/tareas`, `/addtask`, `/done`, `/clear` y notas de voz multimodales vía Gemini activas.
   - **Frontend Web**: Publicado y funcional en `https://xignuxdis-eng.github.io/luxius-panel/` (rama `gh-pages` actualizada).
   - **Frontend Repositorio**: Rama `master` de `luxius-panel` en GitHub sincronizada. Incluye panel de gestión de Telegram (`/sistema/telegram`), filtro estricto de órdenes pendientes vs impresas en taller, selector de etiquetas operativas en carga y lote, y suite de preimpresión/escalador IA en Xpress Studio.
   - **Remotos**: `origin` apunta exclusivamente a GitHub (`xignuxdis-eng`). GitLab fue desvinculado el 02/10/2026.
2. **Dependencias**:
   ```bash
   npm install
   ```
3. **Levantar Entorno de Desarrollo**:
   ```bash
   npm run dev
   ```
4. **Verificar Compilación TypeScript**:
   ```bash
   npm run build
   ```
5. **Desplegar Cambios**:
   - `git add -A && git commit -m "..." && git push origin master` (publica en GitHub).
   - `npm run build; .\scripts\deploy_gh_pages.ps1` -> actualiza la versión pública en `gh-pages`.
   - Copiar `dist/` a `D:\XignuX\luxius-panel\dist\` (si es la PC del taller con Nginx local).
6. **Contexto Adicional**:
   - Para entender el agente Xana: revisar `.agents/rules/xana_agent.md` y `.agents/AGENTS.md`.
   - Para el Roadmap del Artista y Xpress Viewer: revisar `docs/roadmaps/ROADMAP_ARTISTA_XPRESS_VIEWER.md`.
   - Para la app móvil: revisar `docs/xana/XANA_MEMORIA_APP_MOVIL.md`.
   - Para la arquitectura general de infraestructura: revisar `ESPECIFICACION_TECNICA_ECOSISTEMA_LUXIUS.md`.

---

## 8. 🗺️ Plan de Mejoras Vigente (Roadmap Técnico) y Estado

> Convención: `[x]` hecho, `[~]` en curso, `[ ]` pendiente. Quien complete una tarea la marca aquí en el mismo commit.

### Fase 1: Higiene del repositorio y Sincronización de Base de Datos (22-25/09/2026)
- [x] Cerrar trabajo pendiente del logo SVG liviano en `generatePdfBudget.ts` y `generatePdfClientReport.ts`.
- [x] Ampliar `.gitignore` (backups, `*.db`, `server/uploads/`, multimedia, PDFs de prueba, `build_log.txt`).
- [x] Script `scripts/fase1_limpieza.ps1` (untrack de artefactos, reorganización, commit y push).
- [x] Publicar `dist/` a `gh-pages` con `scripts/deploy_gh_pages.ps1`.
- [x] **Bugfix Crítico Clientes y Sincronización BD**: Corregido `post_clientes()` y `_apply_cliente_fields()` en backend para crear e hidratar clientes en BD sin depender de IDs temporales.
- [x] **Serialización Completa de Clientes**: Almacenamiento en `extra` y serialización en `Cliente.to_dict()` de `cuit`, `telefono`, `condVenta`, `vip`, `fechaInicio`.
- [x] **Revisión Reactiva Frontend**: Reactividad de `allClientes` y búsquedas seguras por `String(id)` en `Entrada.tsx`, `NuevoPedidoModal.tsx` y `db.ts`.
- [x] **Estabilidad de Render**: Soporte dual de drivers `psycopg2` y `psycopg` (v3) en `requirements.txt` y dialecto explícito en `config.py`; sincronizadas ramas `main` y `master` en `luXius-Backend`.

### Sesión 26/09/2026: Módulo Stock y PDFs (completado)
- [x] Feed "scroll news" de entradas de stock en tiempo real + exportación a PDF con filtros (Semana / Mes / Últimos X días).
- [x] Fix de imports en generadores de PDF (`batchOptimizePdfThumbnails` y `XIGNUX_LOGO_BASE64`) que dejaban la generación colgada.
- [x] Selector de PDF **Detallado / Simplificado** + **generación masiva** (consolidar N OTs en un solo PDF, una página A4 por OT).
- [x] Alta directa de materiales en Stock (`NuevoMaterialModal`) sin navegar a ABM.
- [x] Expansión de `bobinas` en la vista de Stock (cada ancho como rollo independiente; corrige "Vinilo Vehicular" con un solo rollo).
- [x] Auditoría de variaciones (`materialAudit.ts` + botón "🛡️ Auditar") y refresh en tiempo real de materiales (`luxius-materials-updated`).
- [x] Desacople de stock por bobina: `Material.bobinas[].stockActual` para que cada ancho/dimensión sea independiente.
- [x] Autorización permanente de commit/push automático registrada en `.agents/AGENTS.md` (regla 9).

### Sesión 26/09/2026 (2ª parte): Analíticas, Alertas de Stock y Logs RIP (completado)
- [x] Proyección de faltantes (`stockForecast.ts`) con alertas crítico/bajo/ok por material y por grupo integral de órdenes (`batchId`).
- [x] Filtro de alertas a solo "Para imprimir" (`status === 'orden'`) y control de acceso a roles Administrador/Impresor (`canViewStockAlerts`).
- [x] Calibración de niveles de tinta: capacidad 2 L, razonable 500 ml, alerta < 250 ml; fix del `Math.min(..., 0)` que forzaba "Sin Stock".
- [x] Botellas cerradas: `Material.botellasCerradas` + `Material.botellasMl` con indicador editable por tinta.
- [x] Fix de Analíticas: `TypeError getMateriales().catch()`, métricas de producción desde órdenes, conciliación autosuficiente desde `getOrdenes()`.
- [x] Importación de logs RIP de Roland VersaWorks (`ripLogParser.ts` + `ripLogReconcile.ts` + botón "Importar Log RIP").

### Sesión 27/09/2026: Estrategia de Evolución de Xana y Fase 0 (en curso)
- [x] Documento de consenso `MD consensos/Xana_Estrategia_Consenso_Final_v2.md` (arquitectura híbrida, 5 fases, gates A1-A6, ítems ⚠️ resueltos: roles y umbral anti-OOM).
- [x] **Fase 0** — Fix de roles: `XanaAssistant.tsx` lee `luxius-auth-v6` y mapea roles reales (`administrador`/`principal`→admin, `impresion`→impresor, `cliente`/`vendedor`/`artista`); fallback sin sesión → `cliente` (mínimo privilegio).
- [x] **Fase 0** — Token JWT en `/xana/chat` (`XanaAssistant.tsx` envía `Authorization: Bearer`).
- [x] **Fase 0** — Fallback de commits: `xana.py` ya no devuelve `tasks`; `XanaDashboard.tsx` defensivo con `commit_hash || '—'`.
- [x] **Fase 0** — Guard anti-OOM: `dimension_analyzer.py` usa `MAX_IMAGE_PIXELS = 500MP` (env `XANA_MAX_IMAGE_PIXELS`).
- [x] **Fase 0** — Regex de escala: `detect_scale_in_text` ya no matchea "110" como 1:10 (requiere `:` o `/` para números sin prefijo).
- [x] Memoria de Xana: `TASK-015` y `DEC-013` agregadas a `DEFAULT_XANA_DATA` en `xana.py`.
- [x] **Fase 0** — Suite A4 redactada en `docs/xana/SUITE_A4_ANTIALUCINACION.md` (20-30 casos manuales + 5 trampa + matriz A1 de selección de tools).
- [x] **Fase 0** — Limpieza del cluster legacy del chat: eliminados `XanaAIChat.tsx`, `xanaKnowledgeBase.ts`, `xanaFaqHandler.ts`, `intentClassifier.ts`, `contextResponses.ts`, `openaiService.ts` y `xanaConfig.ts` (todos sin consumidores vivos; el chat activo es `XanaAssistant` → `/api/xana/chat`).
- [ ] **Fase 0** — Bloqueante: desplegar/validar `luXius-Backend` en Render (los fixes de backend están en la copia local `server/`).
- [~] **Fase 1** — En curso:
  - [x] Deploy del backend vivo: fixes de Fase 0 pusheados a `luXius-Backend` (commit `e76ceb3`), ramas `main`+`master` → Render redeploy.
  - [x] **Paso 1** — Tool layer determinista: `services/xana_tools.py` con las 4 tools (`obtener_estado_ot`, `consultar_stock_materiales`, `obtener_metricas_ventas_cliente`, `crear_orden_trabajo`) + esquemas `XANA_TOOLS` + `execute_xana_tool`. Los materiales se leen de `collection_materiales` (ConfigGlobal), no hace falta tabla nueva.
  - [x] **Paso 2** — Function calling en `xana_graph.py`: nodo `function_calling` con Gemini `bind_tools`, fallback al router regex (shadow mode listo).
  - [x] **Paso 3** — Adaptador de proveedor LLM: `_build_llm()` en `xana_graph.py` soporta `XANA_LLM_PROVIDER` (`gemini` default | `deepseek` vía `langchain_openai.ChatOpenAI`), con `DEEPSEEK_API_KEY`/`DEEPSEEK_MODEL`. Documentado en `.env.example`. Ambos nodos (function calling y chat general) usan el proveedor configurable.
  - [x] **Shadow Mode logging (A2)** — `_classify_regex_intent()` + `_log_shadow_decision()` registran cada decisión en `collection_xana_shadow` (máx 500): `message`, `regex_intent`, `final_intent`, `tool_name`. Recolectando línea base.
  - [x] **Verificación en producción (27/09)** — Function calling funciona end-to-end con Gemini (tool `consultar_stock_materiales` seleccionada y ejecutada correctamente). Probes A4 anti-alucinación **todos pasaron** (material/cliente/orden inexistente y precio no se inventan). Latencia A6: function calling ~2.9s, chat general ~3.2s.
  - [x] **Gates cerrados y calibrados**:
    - **A1 (cross-model ≥90%)** — ⏸️ **diferido**: DeepSeek pendiente de créditos; Gemini operando en producción con Function Calling nativo.
    - [x] **A2 (shadow mode)** — ✅ **APROBADO**: 100.0% de acuerdo verificado en 20 prompts representativos. Endpoints `/api/xana/shadow/stats` y `/api/xana/calibration/report` activos.
    - [x] **A4 (suite trampa)** — ✅ **CERTIFICADA 100%**: Suite formal de 23 casos ejecutada exitosamente (23/23 OK, 0 alucinaciones en casos trampa). Reporte oficial en `docs/xana/REPORTE_GATE_A4_EJECUTADO.md`.
    - [x] **A6 (latencia)** — ✅ **APROBADO**: p95 medido en 2,726 ms (dentro del budget ≤ 3.0 s, avg: 2,068 ms). Fail-fast blindado con `max_retries=0` y `timeout=10.0`.

### ⏭️ PRÓXIMO PASO (si me quedo sin tokens): Fase 2 — Base de Conocimiento Estructurada + RAG Pragmático
- Fichas técnicas/anchos/precios estructurados (Capa Estructurada) **reutilizando `pricingCalculator.ts` y precios existentes**.
- Índice RAG plano persistente **solo** para manuales y guías (sin Qdrant/ChromaDB/LlamaIndex), con citas obligatorias.
- Instrumentar latencia de búsqueda (gate A3: ≤300ms, corpus ≤500 docs/5MB).
- Ver detalle completo en `MD consensos/Xana_Estrategia_Consenso_Final_v2.md` (Fase 2) y suite en `docs/xana/SUITE_A4_ANTIALUCINACION.md`.

### Sesión 02/10/2026: Auditoría Mobile-First UX/UI y Plan Estratégico
- [x] **Auditoría completa del codebase para adaptabilidad móvil**: Se auditaron 68+ archivos CSS, layouts, componentes y patrones responsive.
- [x] **Decisión arquitectónica: NO crear versión separada para móvil**. Razones: doble codebase insostenible, panel de gestión (no B2C), React SPA ya soporta responsive nativo, time-to-market 3-6 semanas vs 2-4 meses.
- [x] **Plan estratégico documentado** en `plan_mobile_first_ux_ui.md` (Antigravity artifact) con 4 fases priorizadas por impacto/esfuerzo.
- [x] **9 hallazgos identificados** (5 críticos, 4 moderados):
  - H1: Layout `260px 1fr` sin colapso real de sidebar.
  - H2: No existe botón hamburguesa ni mecanismo toggle.
  - H3: 9 media queries totales en 68+ archivos (Stock.css: 0).
  - H4: 4 floating widgets superpuestos en viewport móvil.
  - H5: Tablas de datos sin scroll horizontal ni card-view.
  - H6: Touch targets <44px en nav-items, mini-adjust, type-btn.
  - H7: Font sizes en px/rem fijos sin clamp().
  - H8: Padding excesivo (32px 40px) en main-content.
  - H9: Viewport meta correcto (sin bloqueo de zoom ✅).
- [x] **Desvinculación GitLab verificada** (02/10/2026 17:12): `origin` apunta exclusivamente a GitHub en ambos repos (`luxius-panel` y `luXius-Backend`). No quedan remotos, push-URLs, ni configuraciones globales/locales referenciando GitLab. `git push --dry-run` OK en ambos.
- [x] **Fase 1 (Fundación Mobile-First)** — COMPLETADA 02/10/2026:
  - Tokens y breakpoints centralizados en `src/styles/index.css` (`--bp-mobile`, `--space-page`, fluid `--fs-*` con clamp, `--touch-target-min: 44px`).
  - `MainLayout`: Barra superior móvil (`mobile-topbar`) con hamburguesa accesible, marca compacta, backdrop overlay (`sidebar-overlay`), auto-cierre al cambiar de ruta y padding adaptativo (`var(--space-page)`).
  - `Sidebar`: Modo drawer off-canvas (`position: fixed`, `transform: translateX(-100%)` a `translateX(0)` cuando `.open`), botón de cierre táctil (`✕`), auto-cierre al seleccionar cualquier opción, touch targets WCAG ≥44px.
  - `Header`: Título fluido con `clamp()`, envoltorio de botones responsivo (`flex-wrap`), ocultamiento de fecha larga en viewport estrecho.
  - Floating Widgets (`FloatingCalculator`, `MediaPlayer`): Dimensiones adaptativas (`max-width: calc(100vw - 32px)`) para evitar clipping en pantallas móviles.
- [x] **Fase 2 (Componentes Mobile-First)** — COMPLETADA 02/10/2026 (commits `bffb096`→`d81596c`):
  - **Punto de retorno**: Tag `pre-fase2-mobile` en commit `fa43e79` (local + GitHub). Revertir: `git reset --hard pre-fase2-mobile`.
  - **Auditoría pre-intervención Fase 2** (13 archivos CSS escaneados por `@media`):
    | Archivo | Media Queries | Problemas |
    |---|---|---|
    | `Stock.css` (691 lín) | 0 ❌ | Grid desborda <320px, padding fijo 24px, tanques 3D no escalan, touch targets `.mini-adjust` 4px |
    | `ABM.css` (242 lín) | 0 ❌ | `.abm-table` sin overflow wrapper, `.op-btn-sm` 32px (<44 WCAG), `.bobina-row` sin wrap |
    | `Entrada.css` (387 lín) | 0 ❌ | Filtros sin wrap, `.btn-icon-action` 28px, `.batch-expand-btn` 24px |
    | `Dashboard.css` (328 lín) | 1 ✅ | Stats grid desborda <360px, `.stat-value` 28px fijo, status bar sin wrap |
    | `NuevoClienteModal.css` | 1 ✅ | Ya colapsa grid a 1col en <640px. OK. |
  - **Orden de ejecución**: Batch 1 (Stock → Entrada → ABM) + Batch 2 (Dashboard refinamiento).
  - **Tokens Fase 1 reutilizados**: `--space-page`, `--space-card`, `--space-gap`, `--fs-*`, `--touch-target-min`, `--bp-mobile`, `--bp-tablet`.
  - [x] **Batch 1 COMPLETADO** (02/10/2026 17:23, commit `bffb096`):
    - `Stock.css` (+168 líneas): Grid `minmax(min(100%, 220px))`, padding `var(--space-page)`, `.mini-adjust`/`.type-btn`/`.adjust-btn-overlay` con `min-height: var(--touch-target-min)`, tanques 3D escalables (50→42→36px), modal `min(400px, calc(100vw-32px))`, stat-pills scroll horizontal en mobile, grid 1col en ≤480px.
    - `Entrada.css` (+150 líneas): `.btn-icon-action`/`.batch-expand-btn` touch-safe 44px, scroll shadow indicator (pseudo-element `::after`), filtros `flex-wrap` en tablet y `flex-direction: column` en mobile, tabla con padding compacto y font escalado, batch badges reducidos.
    - `ABM.css` (+126 líneas): Tabs con `scroll-snap-type: x mandatory` + scrollbar oculta, `.abm-list-view` overflow-x, `.op-btn-sm` touch-safe 44px, `.bobina-row` wrap→column en mobile, header actions stacking, tabla compacta.
  - [x] **Batch 2 COMPLETADO** (02/10/2026 17:23, commit `bffb096`):
    - `Dashboard.css` (+82 líneas): Stats grid `minmax(min(100%, 180px))`, `.stat-value` → `var(--fs-2xl)`, system-status-compact wrap, alerts stack vertical en mobile, botones touch-safe, hover transform deshabilitado en mobile.
  - **Desplegado Batch 1+2**: GitHub Pages (`gh-pages` → `b724fa2`) + Nginx local sincronizado.
  - [x] **Batch 3 COMPLETADO** (02/10/2026 17:34, commit `d50b254`):
    - `Modal.css` (+88 líneas): Bottom-sheet pattern centralizado para 21 modales. En ≤768px: `align-items: flex-end`, `slideUp` animation cubic-bezier iOS-style, esquinas redondeadas superiores, drag handle indicator, 85vh max. En ≤480px: 92vh near full-screen. Close button touch-safe 44px en todos los viewports.
    - `NuevoPedidoModal.css` (+133 líneas): `.compact-grid` 4col→2col (tablet)→1col (mobile), tabs scroll-snap, inputs `min-height: 44px`, form actions column stack, uploads y promos escalados.
  - **Desplegado Batch 3**: GitHub Pages (`gh-pages` → `920226b`) + Nginx local sincronizado.
  - [x] **Batch 4 COMPLETADO** (02/10/2026 18:19, commit `d81596c`):
    - Nuevo `FABMenu.tsx` + `FABMenu.css`: Botón flotante unificado ⚡ visible solo en ≤768px.
    - 4 acciones: Xana IA (🤖), WhatsApp (💬), Calculadora (🧮), Reproductor (🎵).
    - Oculta 5 widgets individuales en mobile vía CSS (`!important` en `.xana-button`, `.floating-whatsapp`, `.calc-toggle-btn`, `.media-player-toggle`, `.minimized-alarm`).
    - Staggered animations (40ms delay), backdrop overlay, cierre por click outside.
    - `MainLayout.tsx` integra `<FABMenu>` con actions que simulan click en widgets originales.
  - **Desplegado Batch 4**: GitHub Pages (`gh-pages` → `2ed3642`) + Nginx local sincronizado.
  - [ ] **Pendiente Fase 2 (menor)**: dashboard tabs swipeable (nice-to-have, bajo impacto).
- [x] **Fase 3 (Performance)** — COMPLETADA 02/10/2026, commit `8877297`:
  - **React.lazy() code-splitting**: 14 páginas → 52 chunks separados.
    - Bundle JS principal: 2480KB → **327KB** (**-87%**).
    - CSS principal: 166KB → **49KB** (**-70%**).
    - Cada página se carga on-demand al navegar, con `<Suspense fallback={<RouteFallback />}>`.
  - **Fuentes pixel condicionales**: `index.html` reemplazó `<link>` estático por script condicional que solo carga ~150KB de Google Fonts si `localStorage.theme === 'pixel'`. `ThemeToggle.tsx` carga dinámicamente las fuentes al cambiar a pixel theme en runtime.
  - **Logo WebP**: descartado (logo es text-based `✦ LuXius`, el PNG de `/public/` no está en path crítico).
  - **Desplegado**: GitHub Pages (`gh-pages` → `efde55c`) + Nginx local sincronizado.
- [x] **Fase 4 (QA + Polish)** — COMPLETADA 02/10/2026, commit `82fcb8a`:
  - **PWA manifest** (`public/manifest.json`): `standalone` display, dark theme `#1a1b1e`, `xignux_logo.png` como icon 192x192/512x512, categorías business/productivity.
  - **Service Worker** (`public/sw.js`): cache-first para statics (JS/CSS/fonts/images), network-first para API, offline SPA shell (fallback a `index.html` en navigation requests).
  - **index.html PWA tags**: `<link rel="manifest">`, `theme-color`, `apple-touch-icon`, `apple-mobile-web-app-capable`, `viewport-fit=cover`, SW registration.
  - **CSS polish**: `overscroll-behavior: none`, `env(safe-area-inset-*)` para iPhone notch/Dynamic Island, `-webkit-tap-highlight-color: transparent`, `@media (display-mode: standalone)`.
  - **Desplegado**: GitHub Pages (`gh-pages` → `45a96a5`) + Nginx local sincronizado.
- **KPIs definidos**: Lighthouse Performance ≥85, LCP ≤2.5s, FID ≤100ms, CLS ≤0.1, touch target compliance 100%.
- **Archivos nuevos creados (Fase 2-4)**: `src/components/ui/FABMenu.tsx`, `src/components/ui/FABMenu.css`, `public/manifest.json`, `public/sw.js`.
- **Archivos modificados (Fase 2-4)**: `Stock.css`, `Entrada.css`, `ABM.css`, `Dashboard.css`, `Modal.css`, `NuevoPedidoModal.css`, `index.css`, `MainLayout.tsx`, `App.tsx`, `ThemeToggle.tsx`, `index.html` (total: +1200 líneas de CSS/TSX).

### ✅ Fase 2 — Base de Conocimiento Estructurada + RAG Pragmático (COMPLETADA 27/09/2026)
- [x] **Servicio `xana_knowledge.py`**: Capa Estructurada (materiales, bobinas, precios, tolerancias, procedimientos) + Capa RAG (índice plano con sentence-transformers all-MiniLM-L6-v2).
- [x] **Tools de conocimiento** (6 nuevas): `consultar_ficha_tecnica`, `consultar_bobinas_disponibles`, `consultar_precio_material`, `buscar_en_manuales`, `consultar_procedimiento`, `consultar_tolerancias`.
- [x] **Integración en LangGraph**: Nodo `knowledge_node` con fallback regex + function calling vía tools tipadas.
- [x] **Citas obligatorias**: Todas las respuestas incluyen fuente (`KB:materiales:VV`, `RAG:guia_calibracion_tintas.md:chunk0`).
- [x] **Telemetría Gate A3**: Latencia de búsqueda loggeada en `collection_xana_rag_telemetry` (p95, avg, corpus size).
- [x] **Corpus RAG inicial**: 3 guías (calibración tintas, cambio bobina, preparación archivos) en `server/rag_corpus/`.
- [x] **Endpoints de gestión KB**: `/kb/sync`, `/kb/rag/ingest`, `/kb/rag/search`, `/kb/rag/stats`, `/kb/stats`.
- [x] **Límites Gate A3**: Corpus ≤500 docs / ≤5MB, similitud threshold 0.35, top-k 4.

### ✅ Fase 3 — Métricas y Análisis de Tendencias Seguro (COMPLETADA 27/09/2026)
- [x] **Servicio `xana_analytics.py`**: Vistas SQL parametrizadas de solo lectura (`v_ventas_cliente`, `v_consumo_material`, `v_rendimiento_maquina`, `v_resumen_financiero`) compatibles SQLite + PostgreSQL.
- [x] **Tools analíticas** (5 nuevas): `obtener_ventas_cliente`, `obtener_consumo_materiales`, `obtener_rendimiento_maquinas`, `obtener_resumen_financiero`, `obtener_top_clientes`.
- [x] **Seguridad**: Sin Text-to-SQL libre, timeouts configurables (3s default), límite 100 filas, busy_timeout SQLite 5s.
- [x] **Control de acceso**: Restringido a roles `admin`, `principal`, `impresion`.
- [x] **Telemetría Gate A4**: Latencia loggeada en `xana_analytics_telemetry` (p95, avg, success rate).
- [x] **Integración en LangGraph**: Nodo `analytics_node` con routing por intención `analytics`.
- [x] **Endpoints de gestión**: `/analytics/telemetry`, `/analytics/query`.
- [x] **Límites Gate A4**: timeout ≤3s, max_rows ≤100, vistas parametrizadas únicamente.

### ✅ Fase 4 — Voz e Integración Móvil (COMPLETADA 27/09/2026)
- [x] **Frontend Web (XanaAssistant.tsx)**: Web Speech API integrada — botón voz (Mic/MicOff), `recognition.lang='es-AR'`, continuo + resultados intermedios, input poblado con transcript, animación CSS pulse "listening".
- [x] **Backend `xana_voice.py`**: Pipeline asíncrono idéntico a Smart Order (ThreadPoolExecutor + job_id + polling 202 Accepted).
  - Endpoints: `POST /api/xana/voice/transcribe` (202 + job_id), `GET /api/xana/voice/transcribe/status/<job_id>`, `POST /api/xana/voice/transcribe-and-order` (flujo completo Voz → Transcripción → Smart Order Draft).
  - Proveedores STT configurables por `XANA_STT_PROVIDER`: `mock` (dev), `google` (Cloud Speech-to-Text), `whisper` (openai-whisper local CPU).
  - Límite 25MB, formatos webm/ogg/mp3/wav/m4a, lang default `es-AR`.
- [x] **Patrón móvil documentado**: `docs/xana/XANA_MEMORIA_APP_MOVIL.md` actualizado con Fase E (Voz a OT) — flujo end-to-end MediaRecorder → transcribe polling → smart-order draft → confirmación usuario → OT real.
- [x] **Integración Capacitor**: Permiso `RECORD_AUDIO` en AndroidManifest, SecureStorage para JWT, HTTPS enforced.

### ✅ Fase 5 — Módulos Avanzados (COMPLETADA 27/09/2026)
- [x] **Smart Order interactivo**: `XanaSmartOrderCard.tsx` — Tarjeta interactiva completa con:
  - Selector de material en vivo con recálculo de precios vía `pricingCalculator.ts` (motor oficial)
  - Selector de escala human-in-the-loop (1:1 / 1:10 ⭐ / 1:20) con recálculo inmediato de consumo, bobina, precio
  - Desglose de consumo por bobina (chips visuales)
  - Precio total editable antes de confirmar
  - Alertas de escala heurística 3D (1:10 detectado)
  - SHA-256 anchor visible por archivo (integridad)
  - Botón "Abrir en Modal" para edición completa en `NuevoPedidoModal`
  - Confirmación crea OT real en PostgreSQL vía `/api/xana/smart-order/confirm`
- [x] **Backend `xana_smart_order.py`**: Pipeline asíncrono (ThreadPoolExecutor + job_id + 202 polling)
  - Ingesta WeTransfer / Google Drive / archivos locales con anti-SSRF
  - Análisis dimensional + heurística 3D de escalas + checksum SHA-256
  - Subida no bloqueante a Cloudflare R2
  - Resolución inteligente de cliente + tarifas por material
  - Endpoints: `POST /api/xana/smart-order` (202), `GET /api/xana/smart-order/status/<job_id>`, `POST /api/xana/smart-order/confirm`
- [x] **Drive Vault nocturno**: `xana_vault.py` — Sincronización programada a Google Drive
  - Estructura: `/XignuX Vault/{AÑO}/{MES}/{TIPO}/{CLIENTE}/`
  - Sube PDF (modo simplificado) + metadata JSON por orden/remito
  - Proveedor Service Account (configurable por `GOOGLE_SERVICE_ACCOUNT_JSON`)
  - Endpoints: `POST /api/xana/vault/sync` (202 + job_id), `GET /api/xana/vault/sync/status/<job_id>`, `GET /api/xana/vault/structure`, `GET /api/xana/vault/config`
  - Límite 500 archivos por corrida, dry-run mode, cancelación
  - Permisos públicos auto-asignados en Drive para acceso directo

### Sesión 02/10/2026: Etiquetas de Producción para Rollos (completado)
- [x] Generador de Etiquetas de Producción (`generateLabelPdf.ts`) — PDF alargado (105mm ancho) adaptativo para pegar a lo largo del rollo de material impreso.
- [x] Mapeo de Proyecto / Etiqueta / Nombre Trabajo desde `nombreTarea` (en reemplazo del código de OT).
- [x] Omisión limpia de campos vacíos (sin títulos huérfanos de Dirección, Proyecto o Detalle cuando no hay datos).
- [x] Grilla de archivos de 2 columnas con nombres limpios (sin extensiones de archivo), medidas en centímetros (con multiplicador de copias) y miniaturas optimizadas.
- [x] Teléfono WhatsApp configurable (3517897667) y pie de marca oficial XignuX.
- [x] Integración en `Entrada.tsx` (botón masivo en barra de selección "🏷️ Etiqueta Rollo", botón individual en tabla y botón en tarjetas mobile).
- [x] Integración en `SharedFileViewerModal.tsx` ("🏷️ Imprimir Etiqueta").

### Sesión 02/10/2026: Tipografía Corporativa Oficial y Ajustes PDF (completado)
- [x] **Punto de Restauración Tag Git**: Creado y pusheado el tag `pre-artegra-global` (commit `28e5e42`).
- [x] **Tipografía Oficial Artegra Sans en todo el sistema**: Fuentes corporativas `ArtegraSans-Bold.otf` y `ArtegraSans-SemiBold.otf` integradas globalmente en `src/styles/index.css` (Headings Bold, UI/Forms SemiBold) con fallback a Outfit.
- [x] **Fix de marca de agua Fontspring DEMO**: Configuración de `unicode-range` (`U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A`) para que caracteres alterados como paréntesis `()`, `4` y signos caigan limpia y automáticamente en Outfit.
- [x] **Tipografía corporativa en branding `✦ LuXius`**: Actualizados estilos en `Sidebar.css` y `Login.css` eliminando hardcoding de Segoe UI.
- [x] **Fijación de ancho físico en documentos PDF**: `@page { size: 105mm 297mm; margin: 0; }` y `max-width: 105mm !important` en `generateLabelPdf.ts`, y `@page { size: 210mm 297mm; }` y `.a4-page { max-width: 210mm !important; }` en `generatePdfBudget.ts` y `generatePdfClientReport.ts`, evitando estiramiento horizontal al abrir o guardar el documento.
- [x] **Centrado estético de destinatario y dirección** en `generateLabelPdf.ts`.
- [x] **Restauración y contraste de botones de cabecera**: Clases unificadas `.header-action-btn`, `.header-stock-btn` (ámbar), `.header-sync-btn` (azul) y `.header-arcade-btn` (violeta neón) con soporte para tema oscuro, claro y pixel.

### Sesión 02/10/2026: Ayuda Visual para Producción — Laminado Especial (> 2.93 ml) (completado)
- [x] **Alerta visual lila/morado en consumo**: Detección automática en órdenes o paños donde metros lineales o dimensión > 2.93m (`consumption.unit === 'ml' && consumption.value > 2.93` o `maxDim > 2.93`).
- [x] **Diseño de alta visibilidad**: Celda de consumo destacada con estilo morado neón (`.special-lamination-box`), resplandor `0 0 12px rgba(168, 85, 247, 0.35)`, valor en blanco lila `⚡ X.XX ml`, rollo violeta armónico y badge `LAMINADO ESP.`.
- [x] **Resalte en columna Medidas**: En piezas mayores a 2.93m, la cota específica se resalta en morado negrita (`#c084fc`) con ícono `⚡`.
- [x] **Indicador en Lotes de Producción (Acordeón)**: Fila principal de lote muestra la píldora `⚡ Paños > 2.93m (Laminado Esp.)` aun con el lote contraído. En cada fila hija desplegada se muestra el badge lila y un borde lateral morado (`.is-special-lamination`).
- [x] **Integración en Reportes**: Módulo de Reportes adaptado con el mismo indicador visual para trazabilidad integral.

### Sesión 02/10/2026: Pipeline R2 → Google Drive, Resolución de 680 Huérfanos y UI Dual (completado)
- [x] **Auditoría Exhaustiva de 680 Huérfanos en R2**: Verificación contra PostgreSQL que los 680 archivos encolados (1.79 GB total: 349 PDFs, 314 JPGs, etc.) corresponden al 100% a archivos heredados de prueba de agosto/septiembre 2026 sin órdenes vivas, y que **el 100% (680/680) cuenta con respaldo comprobado en Google Drive** (`drive_file_id` y `drive_url` válidos).
- [x] **Reescritura y Potenciación de `scripts/resolve_orphans.py`**:
  - Soporte de purga por lote (`--all`, `--ext`, `--dry-run`, `--limit`, `--before`, `--interactive`) y menú de consola interactivo.
  - Purga segura mediante API S3 `delete_objects` en chunks de 500 objetos con actualización atómica de estado en PostgreSQL (`orphan_review_queue.status = 'borrado'`).
  - Blindaje con `sys.stdout.reconfigure(encoding='utf-8')` para terminales Windows cp1252.
- [x] **Optimización de `scripts/sync_r2_to_drive.py`**:
  - Búsqueda multinivel en `buscar_presupuesto_por_archivo`: evalúa `archivos`, `archivosOriginales`, `r2_key` y búsqueda de subcadena en el JSON de especificaciones (`especificaciones::text LIKE %filename%`), evitando falsos huérfanos.
  - Organización mensual de huérfanos en Google Drive: `_Huerfanos_SinClasificar/YYYY-MM/` en lugar de una única carpeta saturada.
  - Consolidación de notificaciones por email: envío de un único resumen agrupado (`send_orphan_batch_summary`) al finalizar la corrida en lugar de 1 correo por archivo.
  - Configuración automática de encoding UTF-8 en stdout/stderr.
- [x] **Endpoints en `luXius-Backend` (`routes/google_drive.py`)**:
  - Métricas de huérfanos en `GET /api/google-drive/vault/status` (`orphan_stats`: total, bytes, backed_up).
  - Listado de huérfanos en `GET /api/google-drive/vault/orphans`.
  - Purga segura en `POST /api/google-drive/vault/orphans/purge` (solo archivos con backup comprobado en Drive).
  - Corrección de importación faltante de `uuid` en jobs de auditoría. Desplegado y verificado en `origin main`.
- [x] **Integración Visual en `src/pages/Sistema/GoogleDriveView.tsx`**:
  - Tarjeta en panel de arquitectura: "Cola de Huérfanos" con total de archivos pendientes, espacio consumido en MB y porcentaje de respaldo en Drive.
  - Tabla desplegable de archivos huérfanos con nombres, tamaños, fechas y enlaces directos a Google Drive.
  - Botón de acción rápida "Purgar de R2" con confirmación y retroalimentación inmediata sin requerir terminal.

### Sesión 03/10/2026: Preimpresión en Tiempo Real (Xpress Studio) y Optimización de Rendimiento Frontend (completado)
- [x] **Inspector DPI 1:1 Físico e Interactivo**:
  - Detección reactiva de resolución real basada en dimensiones de píxeles y ancho/alto ingresado en metros $\left(\frac{\text{px}}{\text{metros} \times 39.3701}\right)$.
  - Semáforo de calidad de impresión: > 150 DPI Óptimo (verde), 72–150 DPI Gigantografía (amarillo), < 72 DPI Pixelado Crítico (rojo).
  - Cálculo instantáneo al modificar ancho o alto objetivo de producción.
- [x] **Calibrador Visual de Demasías y Sangrado**:
  - Controles perimetrales independientes (Superior, Inferior, Izquierda, Derecha).
  - Presets técnicos de un clic: 2.0 cm (vinilo estándar), 5.0 cm (cuadro/bastidor), 10.0 cm (bolsillo para caño en lona front/blackout).
  - Margen de seguridad editable (ej. 1.0 cm) para evitar cortes de textos o logos.
  - Renderizado dinámico de guías en canvas con cotas numéricas, área de demasía traslúcida y línea de corte punteada.
  - Persistencia directa en la orden de trabajo (`order.demasiasConfig` y `order.demasias`) con feedback visual.
- [x] **Simulador de Virado Solvente (CMYK)**:
  - Toggle interactivo con shader/filtro de oscurecimiento y saturación característica de impresión sobre PVC/vinilo con tintas solventes.
  - Insignia de advertencia de perfil de color y simulación activa.
- [x] **Barra de Aprobación Técnica y Pase a Producción (Fase 5)**:
  - Botón de aprobación técnica directa: cambia estado de la orden a `ORDEN_DE_TRABAJO` para avanzar a cola de impresión sin abandonar el visor.
  - Botón de rechazo / rebote con modal de motivos (ej. resolución insuficiente, sin sangrado, texto sobre borde) para avisar al vendedor/cliente.
- [x] **Navegación Contextual con Orden**:
  - Apertura desde `Diseno.tsx` y `SharedFileViewerModal.tsx` pasando parámetro `orderId`.
  - El visor carga automáticamente los datos de la orden (cliente, medidas solicitadas, archivo adjunto y demasías existentes).
- [x] **Optimización de Rendimiento y Chunks en Vite**:
  - Configuración de `manualChunks` en `vite.config.ts`: extracción de `vendor-pdf` (876 KB), `vendor-charts` (371 KB), `vendor-icons` (24 KB) y `vendor-core` (224 KB).
  - `StatusChangeModal` reducido de 523 KB a 93 KB; `Analytics` reducido de 421 KB a 40 KB.
  - Resuelto el warning de importación mixta estática/dinámica de `db.ts` y `authStore.ts` desacoplando la expiración de sesión mediante evento custom (`luxius-auth-expired`).
- [x] **Redrawer Studio: Guardado y Reemplazo Directo a la OT (Fase 4 Artista)**:
  - Detección reactiva de la orden vinculada en el estudio de redibujo (`order`).
  - Tarjeta en barra lateral con resumen de la OT (código, cliente, dimensiones de producción y estado).
  - Botón de acción `⚡ Guardar Vector en Orden #OT`.
  - Modal de guardado inteligente con selección de modo: "Reemplazar arte principal (recomendado)" (el SVG pasa a `archivos[0]` y el arte previo queda como secundario) o "Agregar como archivo adicional".
  - Opción de aprobación automática a `ORDEN_DE_TRABAJO` para pase inmediato a taller sin pasos intermedios.
  - Subida a Cloudflare R2 vía `uploadFile()` con progreso animado, persistencia en BD vía `saveOrden()` y nota de auditoría en el historial.

### Sesión 03/10/2026: Roadmap Ítems 1, 3 y 4 — Etiquetas Operativas, Bot de Telegram Fase 1 y Gate A4 Certificado (completado)
- [x] **Ítem 1: Etiquetas Operativas para Órdenes de Trabajo (OTs)**:
  - Sistema de badges operacionales (`🚨 URGENTE`, `🔄 REIMPRESIÓN`, `🧪 MUESTRA`, `⭐ VIP`, `⏳ ESPERA PAGO`, `📦 STOCK`) en `src/types/orden.ts`.
  - Filtro por chips en barra de Entrada, popover interactivo en cada orden y en filas hijas de lotes para asignar/quitar tags en caliente con persistencia inmediata vía `saveOrden()`.
  - Botón de asignación masiva en barra de selección flotante de Entrada.
  - Persistencia bidireccional en `especificaciones['tags']` sincronizada en backend (`server/routes/orders.py` y `luXius-Backend/routes/orders.py`).
- [x] **Ítem 3: Bot de Telegram para Monitoreo y Taller (Fase 1)**:
  - Servicio `services/telegram_service.py` con cliente HTTP directo a Telegram Bot API y autenticación estricta por `TELEGRAM_ADMIN_CHAT_ID`.
  - Comandos operacionales: `/start`, `/status` (latencia PostgreSQL y recuentos), `/taller` (cola activa, metros lineales, OTs urgentes), `/alertas` (stock crítico), `/tareas` (tareas activas Xana), `/sesiones` (historial de commits e IA).
  - Rutas blueprint `routes/telegram.py` (`POST /api/telegram/webhook`, `GET /api/telegram/status`, `POST /api/telegram/setup-webhook`) registradas en `app.py`.
  - Hoja de ruta documentada en `docs/roadmaps/Xana_Telegram_Roadmap.md`.
- [x] **Ítem 4: Certificación Gate A4 Anti-Alucinación de Xana IA (23/23 Casos)**:
  - Capa de tools deterministas en `services/xana_tools.py`: `cotizar_trabajo` (fórmula matemática exacta con optimización de bobina) y `consultar_especificacion_tecnica` (tolerancias de taller: plotter 3.20m, demasía 5cm, duración vinilo 3-5 años, consumo tinta 8-15ml).
  - Blindaje anti-invención en `tool_obtener_metricas_ventas_cliente` y `tool_obtener_estado_ot` ante clientes o IDs inexistentes (`ok: False`).
  - Script de auditoría `scripts/test_suite_a4.py` en backend y server.
  - Ejecución con 100% de efectividad (23/23 casos aprobados, 0 fallas en casos trampa).
  - Reporte formal en `docs/xana/REPORTE_GATE_A4_EJECUTADO.md`.

### Sesión 03/10/2026: Calibración Gates A2 & A6 de Xana IA, Postergación de Taller Físico y Roadmap de Escalador Inteligente
- [x] **Calibración Gate A2 (Shadow Mode & Observabilidad)**:
  - Benchmark de 20 prompts representativos ejecutado exitosamente con 100.0% de acuerdo entre router determinista y LLM.
  - Endpoints `/api/xana/shadow/stats` y `/api/xana/calibration/report` implementados en backend.
  - Reporte formal emitido en `docs/xana/REPORTE_CALIBRACION_XANA_GATES_A2_A6.md`.
- [x] **Calibración Gate A6 (Budget de Latencia Síncrona)**:
  - Latencia evaluada empíricamente: mediana p50 = 2,001 ms, promedio = 2,068 ms, percentil p95 = 2,726 ms (dentro del budget ≤ 3,000 ms).
  - Protección fail-fast implementada en `_build_llm()` (`max_retries=0`, `timeout=10.0`) para caída inmediata a salvaguarda determinista ante eventuales agotamientos de cuota en APIs externas sin bloquear el servidor.
- [~] **Etapa Taller Físico (Daemon Hot Folder RIP)**:
  - **Pausada por tiempo indeterminado**: Se difiere su despliegue hasta coordinar el trabajo presencial in situ frente a la computadora del taller vinculada a las impresoras Roland.
- [x] **Nuevo Camino Estratégico: Escalador Inteligente de Imágenes (AI Super-Resolution)**:
  - Documentada propuesta arquitectónica integral en `docs/roadmaps/ROADMAP_ESCALADOR_INTELIGENTE_IMAGENES.md`.
  - Solución al problema de imágenes de baja resolución de clientes (15-45 DPI reales en gigantografía).
  - Arquitectura en 3 niveles: 1) Cliente WebGL/Lanczos-3 para previews instantáneas (< 2s) a costo cero; 2) Worker asíncrono con Real-ESRGAN/GFPGAN para reconstrucción profunda 4x/8x y restauración de rostros; 3) Integración visual en `XpressViewer.tsx` con slider comparativo antes/después y guardado automático de la versión HD en la OT.

### Sesión 03/10/2026 (2ª parte): Implementación del Escalador Inteligente de Imágenes (Real-ESRGAN Vulkan GPU) en Backend y Xpress Studio (completado)
- [x] **Despliegue del Motor Neuronal Local (Real-ESRGAN NCNN Vulkan)**:
  - Binario oficial `realesrgan-ncnn-vulkan.exe` con aceleración directa por hardware Vulkan en GPU AMD Radeon RX 5700 XT.
  - Modelos integrados: `realesrgan-x4plus` (fotografía, personas, fondos orgánicos) y `realesrgan-x4plus-anime` (6B, optimizado para logotipos, tipografías nítidas, calcomanías y curvas vectoriales sin distorsión).
  - Tiempos de inferencia récord: **906 ms** para modelo anime 4x y **2,350 ms** para modelo fotográfico.
- [x] **Servicio y Endpoints Backend**:
  - `services/upscaler_service.py` con resolución dinámica de rutas, ejecución segura en subproceso Vulkan y fallback elástico en CPU mediante PIL Lanczos-3 + unsharp mask adaptativa.
  - `routes/upscaler.py` registrado en `app.py` (`luXius-Backend` y `Sitio XignuX/server`).
  - Endpoints operativos:
    - `GET /api/upscaler/status`: diagnóstico del motor, GPU disponible y catálogo de modelos.
    - `POST /api/upscaler/process`: procesamiento 2x/4x, subida opcional a Cloudflare R2 y actualización atómica de la OT en PostgreSQL con nota de auditoría.
- [x] **Higiene de Repositorio (.gitignore)**:
  - Exclusión de `tools/realesrgan/`, binarios `.exe`, `.dll`, `.bin` y `.param` en `.gitignore` de ambos repositorios, protegiendo a GitHub de binarios pesados (~48MB).
- [x] **Frontend Interactivo en Xpress Studio (`XpressViewer.tsx` y `XpressViewer.css`)**:
  - Botón de acceso directo "✨ Escalar IA" en Toolbar principal y en la tarjeta "📐 Medidas & Inspector DPI 1:1" del Sidebar.
  - Modal `UpscalerModal` con diseño Glassmorphism, selector de modelo (Foto vs Logo/Vector), selector de escala (2x / 4x) y estado de procesamiento animado en GPU.
  - **Comparador interactivo Split Slider Before/After**: visualización interactiva de 0% a 100% comparando imagen original vs escalada con cotas de DPI en tiempo real (ej. `35 DPI 🔴 ➔ 140 DPI 🟢`).
  - Barra de métricas técnicas con tamaño en px, ganancia porcentual de definición, motor utilizado y latencia en segundos.
  - Flujo de persistencia en OT:
    - `💾 Guardar y Reemplazar Arte en OT`: sustituye el archivo principal en la orden y archiva el anterior.
    - `➕ Guardar como Arte Secundario`: añade la imagen escalada a la OT conservando la original.
    - `👁️ Aplicar al Visor`: actualiza la vista activa de Xpress Studio para seguir midiendo con el cintrón digital.
    - `⬇️ Descargar PNG HD`: descarga directa del archivo generado en alta resolución.
- [x] **Verificación y Compilación Exitosa**:
  - `npm run build` ejecutado en 6.80s sin errores de TypeScript ni empaquetado.

### Sesión 03/10/2026 (3ª parte): Bot de Telegram Fases 2 & 3, Resumen Matutino (Briefing) y Voice-to-Task Multimodal (completado)
- [x] **Telegram Bot — Fase 2: Modo Gestor & Memoria de Xana**:
  - Comando `/addtask [texto]`: registro automático de tareas con ID `TASK-XXX`, timestamp ART y persistencia en `ConfigGlobal` de Neon PostgreSQL.
  - Comando `/completar [ID]` o `/done`: cierre de tareas de la memoria.
  - Comando `/clear`: depuración del historial manteniendo tareas en progreso y el backlog limpio.
  - Notificaciones push activas inmediatas (`notify_urgent_order`, `notify_stock_alert`, `notify_xana_decision`) disparadas en segundo plano cuando una OT se marca como `🚨 URGENTE` o `⭐ VIP`, o ante insumos bajo mínimo.
  - Endpoint `POST /api/telegram/notify` para alertas directas.
- [x] **Resumen Matutino de Producción (Briefing Diario Automatizado)**:
  - Servicio central `services/briefing_service.py` y endpoint `GET /api/production/briefing`.
  - Agrupamiento inteligente por bobina para tandas continuas de taller (ej. 85.3 ml en VV 1.37), compromisos de entrega para el día, detección de urgencias y recomendación táctica de Xana.
  - Comando `/briefing` en Telegram para consulta remota en cualquier momento.
  - Integración en frontend: botón `☀️ Briefing del Día` en el Header del Dashboard, modal interactivo `MorningBriefingModal.tsx` con métricas, barras de demanda de bobina y botón `📲 Enviar Reporte a Telegram` (`POST /api/telegram/briefing/trigger`).
- [x] **Telegram Bot — Fase 3: Modo Comandante con Audio de Voz Multimodal**:
  - Webhook receptor de notas de voz (`voice` / `audio`) con descarga binaria mediante Telegram API.
  - Inferencia y transcripción multimodal con Gemini en cascada (`gemini-3.5-flash` → `gemini-flash-latest` → `gemini-2.5-pro`) con paso de audio inline base64.
  - Voice-to-Task agéntico: extracción de la intención y creación automática de tareas en la memoria de Xana sin intervención manual ante audios que indiquen anotar o recordar trabajos.
  - Comando `/execute [directiva]` para resolución agéntica directa vía LangGraph.
- [x] **Verificación y Compilación**:
  - `npm run build` ejecutado en 7.36s sin errores.
  - Backend daemon en puerto 5000 activo con PostgreSQL conectado y rutas `/api/production/briefing` y `/api/telegram/*` probadas y operativas.

### Sesión 03/10/2026 (4ª parte): Despliegue en Vivo de Telegram Bot, Configuración In-Situ y Depuración de Métricas de Taller (completado)
- [x] **Conexión Exitosa del Bot en Producción**:
  - Bot oficial `@LuXius_Taller_Bot` (ID `8862580603`) vinculado exitosamente al backend en Render (`https://luxius-backend.onrender.com/api/telegram/webhook`).
  - Chat ID del administrador registrado: `1499600102`. Webhook oficial confirmado por Telegram API (`{"description": "Webhook was set", "ok": true}`).
- [x] **Panel de Configuración In-Situ (`TelegramView.tsx`)**:
  - Nueva vista de administración en `/sistema/telegram` (`src/pages/Sistema/TelegramView.tsx` y `TelegramView.css`).
  - Tarjeta de credenciales directa: permite ingresar y modificar el Bot Token y Chat ID sin necesidad de ingresar a la consola de Render.
  - Endpoint `POST /api/telegram/config` con validación en vivo contra `getMe` de Telegram y persistencia en `ConfigGlobal` de PostgreSQL (Neon).
  - Botones de acción directa: `🔗 Configurar Webhook en Telegram`, `📤 Probar Mensaje` y `☀️ Despachar Briefing`.
  - Guía visual interactiva de 3 pasos con enlaces directos a `@BotFather` y `@userinfobot`.
- [x] **Depuración de Métricas de Producción (Filtro Estricto de Pendientes vs Impresas)**:
  - **Diagnóstico**: La base de datos contiene 85 órdenes vivas: 61 ya terminadas (`impreso`) y 24 pendientes de impresión (`orden` / `ORDEN_DE_TRABAJO`). El briefing y `/taller` incluían erróneamente las órdenes ya impresas, inflando el metraje de 54.8 ml a 173 ml y mostrando trabajos antiguos ya finalizados.
  - **Resolución**: Filtro estricto en `services/briefing_service.py` y `cmd_taller` (`Presupuesto.estado.in_(['orden', 'ORDEN_DE_TRABAJO'])`). Las 61 órdenes terminadas se reportan como métrica informativa separada (`✅ Ya Impresas: 61 OTs`).
  - **Normalización de Bobinas y Materiales**: Eliminado el fallback ambiguo `"Estándar"`. Funciones `resolve_material_name()` (normaliza `VV` → `Vinilo Vehicular`, `FL` → `Lona Frontlight`, `VBB` → `Vinilo Base Blanca`, `BL` → `Lona Backlight`) y `resolve_bobina_ancho()` (resuelve con exactitud a `1.37m` o `1.52m` según dimensiones de la pieza).
  - **Secuencia Óptima de Xana Verificada**:
    1. Tanda 1 en bobina `Vinilo Vehicular (1.37m)` para 16 OTs (35.2 ml continuos).
    2. Tanda 2 en bobina `Vinilo Vehicular (1.52m)` para 8 OTs (19.7 ml continuos).
    Total exacto en cola: **24 OTs / 54.83 metros lineales**.
- [x] **Etiquetas Operativas en Carga de Pedido**:
  - Selector visual interactivo de `PRESET_ORDER_TAGS` (`🚨 URGENTE`, `⭐ VIP`, `🔄 REIMPRESIÓN`, `🧪 MUESTRA`, `⏳ ESPERA PAGO`, `📦 STOCK`) integrado en `NuevoPedidoModal.tsx` tanto para carga unitaria como por lotes.

### Sesión 03/10/2026 (5ª parte): Menú Táctil Smartwatch / Móvil, Visualización de Fotos y Emisión de Documentos PDF en Telegram (completado)
- [x] **Teclado Táctil Persistente (ReplyKeyboardMarkup)**:
  - Interfaz de botones táctiles directos en pantalla (`get_main_reply_keyboard()`): `☀️ Briefing`, `🖨️ Cola Taller`, `🚨 Alertas Stock`, `📋 Tareas`, `🖼️ Ver Arte OT`, `📄 Pedir PDF OT`, `⚡ Estado`, `ℹ️ Ayuda`.
  - Optimizado especialmente para Samsung Galaxy Watch Ultra (Wear OS) y apps móviles de Telegram (Android/iOS) para operar el taller sin tipear en teclado miniatura.
  - Comando `/menu` para activar o refrescar el teclado en cualquier momento.
- [x] **Registro Oficial de Comandos Nativos (`setMyCommands`)**:
  - Función `register_telegram_bot_commands()` registra los comandos y descripciones en la API de Telegram para autocompletado en el menú nativo `/`.
  - Integrado automáticamente en `/setup-webhook` y en el endpoint `POST /api/telegram/register-commands`.
  - Nuevo botón en frontend `src/pages/Sistema/TelegramView.tsx`: `📱 Sincronizar Menú y Comandos`.
- [x] **Visualización de Arte y Fotos de Producción (`/foto [código]` o `/ver`)**:
  - Motor de búsqueda flexible `find_order_by_query()` (por ID parcial ej. `ee97`, cliente ej. `axis`, o la orden más urgente activa si se pulsa el botón sin parámetros).
  - Descarga transparente desde Cloudflare R2 (`uploads/<archivo>`, `thumbnails/<archivo>`) o disco local.
  - Preprocesamiento inteligente `prepare_telegram_image()`: conversión de CMYK a RGB JPEG y reescalado adaptativo (máx 1600px, compresión de 11.2MB a ~290KB en milisegundos) para visualización instantánea sin lag en la muñeca o smartphone.
  - Entrega con `sendPhoto` y botones inline táctiles (`[📄 Descargar PDF]` y `[🖨️ Cola Taller]`).
- [x] **Emisión y Descarga de Documentos PDF (`/pdf [código]`)**:
  - Si la orden cuenta con archivo PDF vectorial adjunto en R2: descarga y envío directo vía `sendDocument`.
  - Si la orden no tiene PDF adjunto (subida en JPG/PNG): generación dinámica en tiempo real de Ficha Técnica / Remito A4 en PDF (`generate_order_ficha_pdf()` con Pillow), incluyendo cabecera LuXius, cliente, fecha, medidas, material, consumo ml, total y previsualización del arte de producción embebido (~140KB).
- [x] **Recepción y Análisis de Fotografías de Usuario con Gemini Vision**:
  - Soporte de mensajes tipo `photo` en el webhook. Descarga de imagen y análisis visual automático con `gemini-3.5-flash` para identificar comprobantes de pago, inspección de trabajos impresos en taller, fotos de marquesinas y etiquetas.
- [x] **Integración con Voz Multimodal**:
  - Extracción de intenciones de audio para disparar fotos (`FOTO_OT: <código>`) y PDFs (`PDF_OT: <código>`) ante órdenes habladas directas.
- [x] **Compilación y Verificación**:
  - Frontend verificado (`npm run build` en 6.94s).
  - Backend verificado con pruebas unitarias para descarga de R2, compresión de imágenes y generación de PDF.

### Sesión 03/10/2026 (6ª parte): Resolución de Transcripción de Audio en Telegram Bot y Resiliencia Gemini Multimodal (completado)
- [x] **Diagnóstico de Falla en Notas de Voz**:
  - Al enviar audios desde smartwatch o móvil pidiendo fotos, PDFs o instrucciones, el bot respondía `"No pude transcribir el audio en este momento. Por favor intentá de nuevo o escribí el comando en texto."`.
  - Causa raíz identificada empíricamente:
    1. `models_cascade = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro']`: `gemini-2.5-pro` arrojaba HTTP 404 (modelo deprecado en 2026); `gemini-flash-latest` arrojaba HTTP 503 por alta demanda; y `gemini-3.5-flash` sufría rate limiting intermitente (HTTP 429 por agotamiento de cuota por minuto).
    2. Al fallar los 3 modelos silenciosamente, `ai_text` quedaba vacío, activando el mensaje genérico de error.
    3. Normalización MIME: los audios enviados por Telegram (`voice` en contenedor OGG con codec Opus o nombres `.oga`) requerían normalización canónica a `audio/ogg` y descarte de sufijos como `; codecs=opus`.
- [x] **Cascada Resiliente de Modelos Gemini Audio & Visión**:
  - Actualización de la cascada con modelos operativos certificados: `['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite']`.
  - `gemini-3.5-flash-lite` y `gemini-3.1-flash-lite` comprobados con tiempos de respuesta de 1.7s a 2.6s con pools de cuota separados, respondiendo inmediatamente cuando `3.5-flash` recibe 429 o 503.
  - Aumento de timeout de red a 25 segundos para procesamiento holgado de audio binario.
  - Aplicada idéntica protección en cascada para el análisis de fotografías (`process_telegram_photo_message`).
- [x] **Detección Inteligente de Intenciones por Voz con Fallback**:
  - Extracción robusta de intenciones ante respuestas conversacionales del LLM: búsqueda de límites de palabra `\b` para códigos de orden (`OT-XXX`, `orden 104`, `#876`) evitando falsos positivos en palabras como "foto".
  - Despacho automático directo de `/foto`, `/pdf`, `/taller` y `/briefing` ante comandos hablados desde reloj o móvil.
- [x] **Sincronización Total y Despliegue**:
  - `services/telegram_service.py` sincronizado al 100% entre `luXius-Backend` y `Sitio XignuX/server`.
  - Verificado con test de integración simulado (`test_voice_flow.py`) con fallback exitoso y verificado.

### Sesión 03/10/2026 (7ª parte): Super-Xana AI — Inteligencia Gráfica Experta, Asesoramiento de Preimpresión y Resolución (DPI / Escalador IA Real-ESRGAN Vulkan), Gestión de Color (CMYK vs RGB / Rich Black), Sustratos, 13 Tools Deterministas y Memoria Multi-Turn (completado)
- [x] **Diagnóstico y Causa Raíz de Limitación Cognitiva**:
  - `_build_llm()` en `xana_graph.py` tenía `gemini-2.5-flash` hardcodeado con timeout corto de 10s.
  - Al agotarse la cuota diaria gratuita de ese modelo (HTTP 429), Xana caía silenciosamente al fallback estático local que solo conocía 3 respuestas fijas ('hola', 'vinilo', 'lona'), perdiendo toda su capacidad agéntica.
- [x] **Motor de Cascada Multi-Modelo Resiliente (`MODELS_CASCADE`)**:
  - Cascada de modelos configurada: `['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.6-flash', 'gemini-3.5-flash']`.
  - Priorización de variantes `-lite` con latencias ultrarrápidas (1.2s a 1.5s) y pools de cuotas independientes con disponibilidad continua.
  - Manejo seguro de tipos de contenido de LangChain mediante `_extract_text(content)`.
- [x] **Conocimiento Maestro de la Industria Gráfica & Preimpresión**:
  - **Resolución DPI y Distancia de Visualización**:
    - Distancia > 5m (gigantografías, vallas de ruta): 35 a 72 DPI reales a escala 1:1. El ojo humano no percibe mayor resolución a esa distancia y colapsa el RIP.
    - Distancia 2 a 5m (marquesinas, banners, fondos de prensa): 100 a 150 DPI reales.
    - Distancia < 1m (gráfica vehicular, vidrieras, cuadros Canvas): 150 a 300 DPI reales.
    - Regla de Escala 1:10: mínimo 300 DPI en archivo para conservar al menos 30 DPI al escalar al 100% en taller.
  - **Gestión de Color y Tintas**:
    - Espacio CMYK estricto (Fogra39 / US Web Coated SWOP). Advertencia al usuario sobre pérdida de brillo en tonos RGB flúor.
    - Negro Enriquecido (Rich Black): `C:40 M:30 Y:30 K:100` o `C:50 M:40 Y:40 K:100` para fondos plenos oscuros. Nunca K:100 solo (queda gris lavado).
    - Negro Puro: `K:100` puro sin CMY para textos chicos (< 24pt) y líneas finas para evitar desfasaje de registro de cabezales.
    - Prevención de virado azul a violeta: Mantener Magenta 30-40% por debajo de Cyan (ej. C:100 M:60).
  - **Sustratos y Lonas**:
    - Monomérico (1-2 años, superficies planas), Polimérico (3-5 años exterior), Cast/Wrap (rotulación vehicular deformable con calor), Microperforado (60/40 para lunetas y vidrieras).
    - Lona Frontlight 13oz (luz frontal), Backlight 15oz (cajas de luz con mayor carga de tinta), Blackout (doble faz opaca), Mesh (microperforada para viento).
  - **Asesoramiento de Imágenes & Escalador IA**:
    - Diagnóstico de imágenes pixeladas de clientes (WhatsApp/Google) y recomendación activa del módulo **Escalador IA (Real-ESRGAN Vulkan)** de LuXius en Xpress Studio (4x por GPU).
- [x] **Ampliación de Herramientas Operativas a 13 Tools (`xana_tools.py`)**:
  - `consultar_resumen_taller_y_cola`: OTs pendientes, metros lineales, desglose por bobina (1.37 vs 1.52) y urgencias.
  - `consultar_metricas_facturacion`: Facturación, cobranzas, saldo pendiente y ticket promedio.
  - `consultar_ranking_clientes`: Top clientes por volumen y facturación.
  - `buscar_ordenes_avanzado`: Búsqueda multicriterio por cliente, OT o material con filtro de urgencias.
  - `consultar_alertas_stock_critico`: Insumos y bobinas por debajo del mínimo de seguridad.
  - `consultar_asesoramiento_grafico`: Base de conocimiento gráfico determinista.
  - `consultar_tarifario_oficial`: Lista de precios oficial por m² y ml.
- [x] **Memoria Conversacional Multi-Turn**:
  - Soporte de `history` en `general_chat_node`, endpoint web `/api/xana/chat` y `cmd_execute` de Telegram (`TELEGRAM_CHAT_HISTORIES`).
- [x] **Frontend Web (`XanaAssistant.tsx`)**:
  - Agregadas opciones de acceso rápido en el menú desplegable: `🎨 Consejos Gráficos & DPI` y `🖨️ Cola de Taller`.
- [x] **Verificación y Pruebas Unitarias**:
  - Probada resolución de preguntas gráficas complejas (DPI para 6x3m, solución a imágenes pixeladas de WhatsApp, negro enriquecido y Luneta Hilux) con respuestas exhaustivas y precisas.
  - `npm run build` ejecutado en 6.27s sin errores.
  - Backend daemon en puerto 5000 activo y operativo.

---

### Sesión 03/10/2026 (8ª parte): Auditoría de Seguridad Integral y Endurecimiento para Producción (completado)
- **Contexto**: auditoría completa (backend Flask + frontend React + repos + producción). `luxius-panel` es PÚBLICO (necesario para gh-pages), por lo que todo lo que está en `server/` y en el historial git es visible para cualquiera.
- **CRÍTICO resuelto**:
  - 6 cuentas de producción (`admin`, `adrian`, `sistema`, `impresion`, `diseño`, `vendedor`) usaban contraseñas por defecto publicadas en el código (`admin/admin` con rol administrador). **Rotadas** con contraseñas aleatorias fuertes (token_version incrementado → sesiones cerradas). Las nuevas quedaron SOLO en `f:\luXius-Backend\CREDENCIALES_NUEVAS.txt` (git-ignorado) para repartir y borrar.
  - Seed de usuarios (`app.py`) ya no tiene contraseñas fijas (aleatorias, solo con BD vacía). `src/data/db.ts` ya no publica contraseñas en el bundle y no cachea contraseñas en localStorage. Tests/seeds leen credenciales de `LUXIUS_TEST_USER/PASS`.
  - Secretos hardcodeados eliminados: `config.py` (JWT default + credenciales R2), `sync_uploads_to_r2.py`, `make_full_backup.py` (URL Neon), `server/middleware/auth.py` legacy. Todo sale de variables de entorno. Logs enmascaran la URL de BD.
  - Escalada de privilegios: `POST/PUT /api/usuarios` permitía a cualquier usuario (incluso cliente) cambiar su `rol` a administrador u otros usuarios. Ahora solo admins (`ADMIN_ROLES`) crean usuarios o cambian rol/habilitado/clientId; el resto solo edita su propio perfil. Cambio de rol/deshabilitar invalida tokens.
  - Telegram: `/webhook` exige header `X-Telegram-Bot-Api-Secret-Token` (secreto = `TELEGRAM_WEBHOOK_SECRET` o HMAC-SHA256(JWT_SECRET_KEY, bot_token)); todo `setWebhook` envía `secret_token`; en Render se re-registra automáticamente al arrancar (desactivable con `TELEGRAM_AUTO_WEBHOOK=0`). `/setup-webhook`, `/config`, `/notify`, `/briefing/trigger`, `/register-commands` → `admin_required` y solo aceptan la URL oficial; `/status` → login.
- **ALTO resuelto**:
  - Endpoints que eran públicos ahora requieren sesión: `/api/analytics/*` (operator), `/api/production/briefing`, `/api/xana/shadow/stats`, `/api/xana/calibration/report` (operator), `/api/xana/smart-order/status/<id>`, `/api/google-drive/vault/reconcile/status/<id>`, `/api/stats/advanced|reportes` (operator).
  - SSRF: `/api/upscaler/process` (era público, aceptaba `file://`) → `operator_required` + lectura directa de `/uploads` (local/R2) + `is_safe_url` en cada redirección. `/api/download` → URLs externas requieren token (header o `?token=`) + anti-SSRF por salto.
  - IDOR órdenes: rol `cliente` solo lista/lee/edita/borra/comenta SUS órdenes (`Usuario.client_id`); al crear se fuerza su `clientId`; `/api/orders/batch` → operator. Mismo control en `/api/tasks/<id>/messages`.
  - Colecciones: cliente solo ve su usuario/ficha/presupuestos; proveedores/calendar/vendedores → []. Altas/bajas/modificaciones de clientes, máquinas y colecciones JSON (materiales, servicios, roles…) → `operator_required`.
  - Login: bloqueo anti fuerza bruta (5 fallos por IP+usuario → 15 min, 20 por IP) y la contraseña se verifica antes de revelar "Usuario deshabilitado".
- **MEDIO resuelto**: path traversal en `/uploads` (validación tras decodificar + `realpath`), SVG/HTML servidos con CSP `sandbox`, `drive_id` validado por regex en `/api/import-cloud/file`, errores ya no filtran excepciones internas, archivos sensibles des-trackeados del repo privado (`backups/*.db`, `instance/luxius.db`, `db_users_list.txt`, `backend.log`), bundle viejo `assets/` eliminado del repo público.
- **Frontend**: nuevo interceptor global `src/utils/authFetch.ts` (inicializado en `main.tsx`) que agrega `Authorization: Bearer` a toda llamada al backend que no lo traiga. Corregido doble `/api/api/` en `TelegramView.tsx`, `estadisticas.tsx` y `reportes.tsx`.
- **Nuevo módulo**: `services/security_utils.py` (`is_safe_url`, `LoginThrottle`, `telegram_webhook_secret`, `client_ip`).
- **Verificación**: 33/33 tests de seguridad locales OK (scratch `test_security.py`), mapa de rutas: solo quedan públicas `/health`, `/uploads`, `/api/download` (solo /uploads sin token), `/api/tarifas`, `/api/auth/login`, `/api/import-cloud/file`, `/api/telegram/webhook` (con secreto), `/api/upscaler/status`, `/api/xana/health`.
- **PENDIENTE (acciones del usuario, no automatizables)**:
  1. **URGENTE** rotar el token API de Cloudflare R2 (las claves viejas siguen en el historial público de `luxius-panel`) y cargar las nuevas en Render (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) y en los `.env` locales. Verificar con `GET /health` → `"storage": "r2"`.
  2. Rotar la contraseña de Neon (estuvo en el repo privado y en el historial) y actualizar `DATABASE_URL` en Render y `.env` locales.
  3. Repartir las contraseñas de `CREDENCIALES_NUEVAS.txt` y borrar el archivo; dar contraseña a los usuarios cliente si van a usar el portal (hoy no tienen).
  4. Opcional: rotar claves Gemini/OpenAI; separar `server/` del repo público (o repo privado + repo público solo con el build) y reescribir el historial público (destructivo, requiere confirmación explícita).
  5. **Transitorio R2**: como Render no tenia variables R2_*, el backend PRIVADO usa private_legacy_r2.py (solo en luXius-Backend, ignorado en luxius-panel) como respaldo para no cortar las imagenes. /health muestra storage: r2-legacy hasta que se carguen las claves rotadas en Render; despues borrar ese archivo.
  6. **Seguimiento (03/10 noche)**: `getUsuarios()` purga contraseñas viejas cacheadas en localStorage de cada navegador. Causa de que las contraseñas 'ya cambiadas' siguieran siendo las de fábrica: antes del commit `dbccec1` (03/09/2026) `saveUsuario` solo guardaba en localStorage. `npm audit`: 2 moderadas en react-router 6.x (open redirect con backslash / SSR) — riesgo bajo (no se navega a URLs del usuario ni hay SSR); el fix exige migrar a react-router 7 (breaking), planificar. `src/pages/Dashboard/Profile.tsx` es código muerto (no se importa; usa `/api/users` inexistente).


---

### 🔮 Roadmap Maestro de Cambios Futuros (Guía de Implementación Paso a Paso para Cualquier Modelo de IA)

> **Instrucciones para Agentes de IA (Antigravity, Cursor, Windsurf, Claude, Copilot, etc.)**:
> Cada una de las siguientes tareas está diseñada para ser autosuficiente. Contiene objetivo, dependencias, archivos específicos, paso a paso técnico, criterios de verificación y mitigación de riesgos.
> Al abordar una tarea:
> 1. Leer cuidadosamente los archivos afectados antes de editarlos.
> 2. Implementar los cambios siguiendo la arquitectura existente (respetar TypeScript estricto, SQLAlchemy 2.0 y Vanilla CSS).
> 3. Ejecutar los comandos de verificación especificados.
> 4. Actualizar el estado de la tarea en este documento (`[ ]` ➔ `[x]`).
> 5. Commitear con mensaje descriptivo y pushear a los repositorios correspondientes siguiendo las reglas de la Sección 2.

---

#### 🚨 Nivel P0: Acciones Inmediatas del Usuario (Credenciales y Seguridad Crítica)

##### [ ] Tarea P0.1: Rotación de Token API de Cloudflare R2 y Desactivación de Fallback Transitorio
- **Objetivo**: Garantizar el almacenamiento multimedia en Cloudflare R2 con credenciales rotadas y privadas, eliminando el fallback transitorio `private_legacy_r2.py`.
- **Prerrequisitos**: Acceso a la consola de Cloudflare (cuenta XignuX) y al panel de control de Render (`luxius-backend`).
- **Archivos Afectados**:
  - Panel Render: `Environment Variables`
  - `f:\luXius-Backend\.env` y `f:\Sitio XignuX\.env`
  - `f:\luXius-Backend\config.py`
  - `f:\luXius-Backend\private_legacy_r2.py` (a eliminar tras verificar)
- **Paso a Paso de Implementación**:
  1. *[Acción Usuario]* En Cloudflare Dashboard > R2 > Manage R2 API Tokens: crear un nuevo API Token con permisos de lectura y escritura (`Object Read & Write`) sobre el bucket `luxius-media`. Revocar el token anterior.
  2. *[Acción Usuario]* En Render Dashboard > Web Service `luxius-backend` > Environment:
     - Configurar `R2_ACCOUNT_ID` = `<tu_account_id>`
     - Configurar `R2_ACCESS_KEY_ID` = `<nuevo_access_key>`
     - Configurar `R2_SECRET_ACCESS_KEY` = `<nuevo_secret_access_key>`
     - Configurar `R2_BUCKET_NAME` = `luxius-media`
     - Guardar cambios (Render reiniciará automáticamente el servicio).
  3. *[Acción Usuario o IA]* Actualizar las variables homónimas en los archivos locales `.env` (`f:\luXius-Backend\.env` y `f:\Sitio XignuX\.env`).
  4. *[Acción IA]* Ejecutar probe: `python -c "import urllib.request, json; res = json.loads(urllib.request.urlopen('https://luxius-backend.onrender.com/health').read()); print(res.get('storage'))"`.
  5. *[Acción IA]* Una vez que la respuesta sea `"storage": "r2"` (y ya no `"r2-legacy"`):
     - Borrar el archivo transitorio: `Remove-Item f:\luXius-Backend\private_legacy_r2.py`
     - En `f:\luXius-Backend\config.py`, retirar el bloque try/except de importación de `private_legacy_r2` y la bandera `R2_USING_LEGACY`.
     - Commitear y pushear a `main` y `main:master`.
- **Criterio de Verificación**:
  - `GET https://luxius-backend.onrender.com/health` responde `{"status": "ok", "storage": "r2"}`.
  - Subida de un archivo de prueba vía `/api/cloud-import` o `/xpress-viewer` confirmada en el bucket.
- **Riesgo y Rollback**: Si las credenciales son incorrectas, `boto3` fallará al conectar con S3; el servicio caerá al fallback local o emitirá error 500 al subir archivos. Rollback: verificar sintaxis de claves en Render sin espacios adicionales.

##### [ ] Tarea P0.2: Rotación de Contraseña de Base de Datos Neon PostgreSQL
- **Objetivo**: Invalidar las credenciales históricas de Neon que estuvieron expuestas en commits antiguos y aislar el acceso a la base de datos de producción.
- **Prerrequisitos**: Acceso a la consola de Neon (`neon.tech`) del proyecto LuXius.
- **Archivos Afectados**:
  - Consola Neon
  - Panel Render: Variable `DATABASE_URL`
  - `f:\luXius-Backend\.env`, `f:\Sitio XignuX\.env` y `f:\Sitio XignuX\server\.env`
- **Paso a Paso de Implementación**:
  1. *[Acción Usuario]* En la consola de Neon, ir a Roles/Users > Seleccionar el usuario de conexión > Reset Password.
  2. *[Acción Usuario]* Copiar la nueva cadena de conexión SSL (`postgresql://usuario:nueva_pass@ep-....neon.tech/luxius_db?sslmode=require`).
  3. *[Acción Usuario]* En Render > Environment Variables de `luxius-backend`: actualizar `DATABASE_URL` con la nueva cadena. Guardar y esperar el deploy.
  4. *[Acción Usuario]* Actualizar la variable `DATABASE_URL` en los archivos `.env` locales.
- **Criterio de Verificación**:
  - `GET https://luxius-backend.onrender.com/health` responde `{"database": "connected", "status": "ok"}`.
  - En local, levantar `python app.py` y verificar que conecta con éxito sin error de autenticación.
- **Riesgo y Rollback**: Si se cambia la contraseña en Neon antes de actualizarla en Render, habrá una ventana de caída del backend (HTTP 500 / Database Connection Error) hasta que Render aplique la nueva variable. Realizar el cambio en horarios de baja actividad de taller.

##### [ ] Tarea P0.3: Distribución de Nuevas Contraseñas y Purga de `CREDENCIALES_NUEVAS.txt`
- **Objetivo**: Proveer las nuevas credenciales seguras al personal de producción (`admin`, `adrian`, `sistema`, `impresion`, `diseño`, `vendedor`) y eliminar de disco el archivo temporal con las contraseñas en texto claro.
- **Prerrequisitos**: `f:\luXius-Backend\CREDENCIALES_NUEVAS.txt` existente.
- **Archivos Afectados**:
  - `f:\luXius-Backend\CREDENCIALES_NUEVAS.txt` (a eliminar)
- **Paso a Paso de Implementación**:
  1. *[Acción Usuario]* Comunicar de forma segura a cada usuario su nueva contraseña generada.
  2. *[Acción Usuario]* Verificar que cada usuario puede iniciar sesión en `https://xignuxdis-eng.github.io/luxius-panel/`.
  3. *[Acción Usuario]* Una vez distribuidas, borrar físicamente el archivo `CREDENCIALES_NUEVAS.txt`:
     `Remove-Item "f:\luXius-Backend\CREDENCIALES_NUEVAS.txt" -Force`
- **Criterio de Verificación**: Archivo `CREDENCIALES_NUEVAS.txt` inexistente en disco y personal logueado exitosamente.

##### [ ] Tarea P0.4: Habilitación y Asignación de Contraseñas a Usuarios Clientes
- **Objetivo**: Permitir que los clientes (`Axis`, `MaderHaus`, etc.) tengan acceso seguro al portal web para ver sus pedidos sin compartir permisos con otros clientes.
- **Prerrequisitos**: Usuarios cliente creados en BD (actualmente 3 carecen de `client_id` y todos carecen de `password_hash`).
- **Archivos Afectados**:
  - Base de Datos PostgreSQL (`usuarios`, `clientes`)
  - `src/pages/ABM/ABM.tsx` (Gestión de Usuarios)
- **Paso a Paso de Implementación**:
  1. *[Acción IA/Usuario]* En el panel web de Administración (rol Administrador), editar cada usuario con rol `cliente`:
     - Asignar el `clientId` correspondiente a su entidad en el ABM de Clientes.
     - Asignar una contraseña segura y marcar `habilitado = true`.
  2. *[Acción IA]* Alternativamente, ejecutar script puntual en `scratch/` que vincule `usuarios.client_id` basándose en el nombre de fantasía del cliente en `clientes`.
- **Criterio de Verificación**:
  - Iniciar sesión con un usuario cliente; la API `/api/orders` solo debe devolver las órdenes pertenecientes a ese cliente (`_client_scope_id`). Intentos de consultar órdenes de otros clientes deben arrojar HTTP 403 Forbidden.

---

#### 🛠️ Nivel P1: Mejoras Críticas de Arquitectura y Dependencias

##### [x] Tarea P1.1: Desacople de `server/` del Repositorio Público `luxius-panel`
> **Estado 03/10/2026 23:15**: HECHO. `git rm -r --cached server` + `server/` en `.gitignore` del panel. Los archivos siguen en disco. **Sigue pendiente (requiere OK explícito del usuario)**: reescribir el historial público con `git-filter-repo` para borrar commits viejos con secretos; mientras tanto la mitigación es rotar R2/Neon (P0.1/P0.2).
- **Objetivo**: Evitar la exposición innecesaria del código fuente y endpoints del backend en el repositorio público de frontend de GitHub Pages.
- **Contexto**: El repositorio `luxius-panel` es público para permitir el hosting gratuito de GitHub Pages. La carpeta `server/` es un espejo del backend `luXius-Backend` (que sí es privado). Si bien los secretos ya fueron eliminados del código, exponer la lógica de endpoints y esquemas facilita el reconocimiento a atacantes.
- **Archivos Afectados**:
  - `f:\Sitio XignuX\server\`
  - `.gitignore` de `luxius-panel`
- **Paso a Paso de Implementación**:
  1. *[Acción IA]* Verificar que todos los cambios de `f:\Sitio XignuX\server\` estén debidamente incorporados en `f:\luXius-Backend\`.
  2. *[Acción IA]* Realizar un untrack de la carpeta en Git sin borrar los archivos del disco local:
     ```powershell
     cd "f:\Sitio XignuX"
     git rm -r --cached server
     ```
  3. *[Acción IA]* Agregar `server/` al archivo `f:\Sitio XignuX\.gitignore`.
  4. *[Acción IA]* Compilar frontend para asegurar que ninguna ruta o módulo de Vite importe código desde `server/` (`npm run build`).
  5. *[Acción IA]* Commitear en `luxius-panel`: `git commit -m "chore(security): untrack server directory from public frontend repository" && git push origin master`.
  6. *(Opcional / Requiere Confirmación de Usuario)*: Reescribir el historial de Git del repositorio público con `git-filter-repo` para purgar commits históricos con secretos antiguos. **ADVERTENCIA: Esta operación es destructiva y reescribe los hashes de Git**. No ejecutar sin confirmación explícita del usuario.
- **Criterio de Verificación**:
  - En GitHub (`https://github.com/xignuxdis-eng/luxius-panel`), la carpeta `server/` ya no figura en la rama `master`.
  - El frontend compila y despliega en `gh-pages` con total normalidad.

##### [x] Tarea P1.2: Migración de `react-router-dom` 6.x a 7.x (Resolución Vulnerabilidades npm)
> **Estado 03/10/2026 23:15**: HECHO. `react-router-dom@^7.18.4`; sin cambios de código (API usada: HashRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation, useSearchParams). Build OK y smoke test en navegador (login, redirección de rutas protegidas y catch-all) sin errores de consola. **No probado aún con sesión iniciada**: el usuario debe navegar las pantallas principales tras el deploy. `npm audit` ahora solo reporta esbuild/vite (ver P1.4).
- **Objetivo**: Resolver las 2 vulnerabilidades moderadas reportadas por `npm audit` en `react-router` / `react-router-dom` (open redirect con backslashes y riesgos de SSR).
- **Prerrequisitos**: Frontend compilando limpiamente (`npm run build`).
- **Archivos Afectados**:
  - `f:\Sitio XignuX\package.json`
  - `src/App.tsx`
  - `src/main.tsx`
- **Paso a Paso de Implementación**:
  1. *[Acción IA]* En una rama Git temporal o con stash de seguridad, actualizar las dependencias:
     `npm install react-router-dom@latest`
  2. *[Acción IA]* Revisar `package.json` para verificar que `react-router-dom` y `@types/react-router-dom` pasaron a la versión 7+.
  3. *[Acción IA]* Verificar compatibilidad de `HashRouter`, `Routes`, `Route`, `useNavigate`, `useLocation` y `useParams` en `src/App.tsx` y layouts.
  4. *[Acción IA]* Ejecutar `npm run build` y resolver incompatibilidades de TypeScript o imports deprecados si los hubiere.
  5. *[Acción IA]* Probar en navegador (vía dev server o test local): navegación entre Entrada, Taller, Stock, XpressViewer y modales.
  6. *[Acción IA]* Ejecutar `npm audit` y confirmar que las vulnerabilidades quedaron resueltas (0 vulnerabilidades o severidad baja no explotable).
  7. *[Acción IA]* Commitear y desplegar a `master` y `gh-pages`.
- **Criterio de Verificación**: `npm audit` reporta 0 vulnerabilidades en el árbol de dependencias de react-router; `npm run build` genera los chunks correctamente y la navegación funciona sin recargas completas.
- **Riesgo y Rollback**: Romper la navegación en modo SPA hash (`/#/entrada`). Rollback: `git reset --hard HEAD~1` y `npm install`.

##### [~] Tarea P1.3: Almacenamiento Distribuido para Rate-Limiting, Throttle y Jobs Asíncronos
> **Estado 03/10/2026 23:15**: CÓDIGO LISTO, falta que el usuario cree un Redis (ej. Upstash free) y cargue `REDIS_URL` en Render. `services/security_utils.py` → `RedisLoginThrottle` (se activa solo si `REDIS_URL` responde a `ping`, si no cae a memoria); `app.py` → Flask-Limiter usa `REDIS_URL` como `storage_uri`; `redis>=4.2` en `requirements.txt`. Además el limitador global ahora usa la IP real del cliente (`client_ip`, X-Forwarded-For) en vez de la IP del proxy de Render (antes los 200 req/min eran compartidos por TODOS los usuarios). Pendiente IA: mover `_SMART_JOBS` / `_ACTIVE_RECONCILE_JOBS` a Redis cuando exista `REDIS_URL`.
- **Objetivo**: Evitar que el rate limiting (`LoginThrottle`, `Flask-Limiter`) y el seguimiento de tareas (`_SMART_JOBS`, `_ACTIVE_RECONCILE_JOBS`) se ejecuten en la memoria volátil del proceso de Gunicorn, lo cual duplica los límites ante múltiples workers y pierde el estado al reiniciar el dyno en Render.
- **Prerrequisitos**: Base de datos Redis o servicio serverless compatible (ej. Upstash Redis o Redis addon en Render).
- **Archivos Afectados**:
  - `f:\luXius-Backend\requirements.txt`
  - `f:\luXius-Backend\services\security_utils.py`
  - `f:\luXius-Backend\services\xana_smart_order.py`
  - `f:\luXius-Backend\services\drive_reconciliation.py`
  - `f:\luXius-Backend\app.py`
- **Paso a Paso de Implementación**:
  1. *[Acción IA]* Agregar `redis>=5.0.0` a `requirements.txt`.
  2. *[Acción IA]* Si la variable `REDIS_URL` está configurada en el entorno:
     - Configurar `Flask-Limiter(..., storage_uri=os.environ.get('REDIS_URL'))`.
     - Adaptar `LoginThrottle` en `security_utils.py` para usar claves `throttle:ip:<ip>` y `throttle:user:<user>` con TTL nativo de Redis (`SET key val EX 900`).
     - Almacenar los estados de `_SMART_JOBS` en Redis con serialización JSON y expiración automática de 24 horas.
  3. *[Acción IA]* Si `REDIS_URL` no está presente, mantener el fallback en memoria actual para desarrollo local sin dependencias obligatorias.
- **Criterio de Verificación**: Al correr Gunicorn con 2 workers (`--workers=2`), los intentos de login fallidos se computan globalmente entre ambos procesos.

##### [ ] Tarea P1.4: Actualizar Vite 5 → 6.4.3+ (o 8) para cerrar la alerta de esbuild
- **Contexto**: `npm audit` (03/10/2026) reporta `esbuild <=0.24.2` (GHSA-67mh-4wv8-2f99, moderada) vía `vite@5.4.21`. Solo afecta al **servidor de desarrollo** (`npm run dev`): una web maliciosa abierta en el mismo navegador podría leer respuestas del dev server. El build publicado en gh-pages NO está afectado.
- **Archivos**: `package.json`, `vite.config.ts` (plugin propio que inyecta `CACHE_NAME` en `sw.js`, `manualChunks`, alias), `@vitejs/plugin-react`.
- **Pasos**: 1) Rama/stash de seguridad. 2) `npm install -D vite@^6 @vitejs/plugin-react@latest` (probar 6 antes que 8). 3) `npm run build`; revisar que existan los chunks `vendor-pdf`, `vendor-charts`, `vendor-icons`, `vendor-core` y que `dist/sw.js` tenga `CACHE_NAME = 'luxius-v<timestamp>'`. 4) `npx vite preview` + smoke test con sesión. 5) `npm audit` sin esbuild. 6) Deploy gh-pages.
- **Mitigación mientras tanto**: no navegar sitios desconocidos con `npm run dev` corriendo.

---

#### 🔒 Nivel P2: Endurecimiento de Seguridad, Privacidad y Mantenibilidad

##### [ ] Tarea P2.1: URLs Firmadas Temporales (Presigned URLs) para `/uploads` y Multimedia
- **Objetivo**: Evitar que cualquier usuario o scraper pueda descargar artes gráficos de clientes en `/uploads/<filename>` con solo conocer o enumerar el nombre del archivo.
- **Prerrequisitos**: Cloudflare R2 con permisos para generar presigned URLs en S3 (`boto3.generate_presigned_url`).
- **Archivos Afectados**:
  - `f:\luXius-Backend\services\r2_storage.py` (cliente boto3 de R2)
  - `f:\luXius-Backend\app.py` (`serve_upload`, ruta `/uploads/<path:filename>`, ~línea 220)
  - Frontend: localizar con grep las construcciones de URL `/uploads/` (no existe un resolvedor único; verificar antes de editar)
- **Paso a Paso de Implementación**:
  1. *[Acción IA]* En `services/r2_storage.py`, implementar `generate_download_url(filename, expires_in=3600)`:
     - Genera una URL firmada de Cloudflare R2 válida por 1 hora (`s3_client.generate_presigned_url('get_object', Params={'Bucket': BUCKET, 'Key': f'uploads/{filename}'}, ExpiresIn=expires_in)`).
  2. *[Acción IA]* En los serializadores de órdenes (`Presupuesto.to_dict()`) y endpoints de consulta, devolver URLs firmadas dinámicas o crear el endpoint autenticado `GET /api/files/signed-url?file=<filename>` (`@login_required`).
  3. *[Acción IA]* Mantener `/uploads/<filename>` público solo para miniaturas y logos públicos si fuera necesario, restringiendo los artes de alta resolución originales.
- **Criterio de Verificación**: Peticiones directas anónimas a archivos de clientes en R2 o backend devuelven 401/403 sin la firma temporal criptográfica válida.

##### [x] Tarea P2.2: Limpieza y Eliminación de Código Muerto en Frontend y Backend
> **Estado 03/10/2026 23:15**: HECHO. Se eliminaron 50 archivos TS/TSX inalcanzables desde `src/main.tsx` (detectados con un recorrido de imports que resuelve los alias de Vite): `src/services/api.ts`, `src/pages/Dashboard/{admin,artista,cliente,impresor}/`, `Profile.tsx`, `pages/{Dashboard,Landing,Login,Uploads}.tsx`, componentes legacy (`Sidebar.tsx`, `Header.tsx`, `AppSidebar.tsx`, `StockCharts.tsx`, tests de admin, etc.), `src/data/{clients,materials,tasks,initialClientes,id_utils}.ts`, `utils/{csv,format,clearData,materialHelpers}.ts`. Errores de `tsc --noEmit` bajaron de 202 a 65 (los restantes son previos y no bloquean el build, que es `vite build`). Se conservaron a propósito `ProveedoresView.tsx`/`NuevoProveedorModal.tsx` (no ruteados, posible feature futura) y `logoBase64.ts`. Backend: eliminada la copia legacy `luXius-Backend/server/` (196 archivos).
- **Objetivo**: Reducir la superficie de ataque, eliminar advertencias de linting y mejorar los tiempos de build retirando módulos huérfanos.
- **Archivos Afectados**:
  - Frontend: `src/pages/Dashboard/Profile.tsx` (código muerto que apunta a `/api/users/<id>` inexistente; el perfil real es `PerfilModal.tsx` con `saveUsuario`).
  - Backend: Directorio obsoleto `f:\luXius-Backend\server\` (espejo residual no consumido por Gunicorn, que corre `f:\luXius-Backend\app.py`).
  - Frontend: `updateUser`/`getUsers` en `src/services/api.ts` (líneas ~294 y ~351). **Ojo**: NO están sin uso; los consumen páginas legacy (`src/components/AdminTest.tsx`, `DashboardAdminSimple.tsx`, `DashboardDebug.tsx`, `src/pages/Dashboard/admin/usuarios.tsx`, `admin/upload.tsx`, `Profile.tsx`). Primero confirmar con grep en `App.tsx` que esas páginas no están ruteadas; recién entonces borrar páginas + métodos juntos.
- **Paso a Paso de Implementación**:
  1. *[Acción IA]* Verificar que `Profile.tsx` no esté importado en ninguna parte del proyecto mediante grep search. Borrar `src/pages/Dashboard/Profile.tsx`.
  2. *[Acción IA]* En `f:\luXius-Backend\`, eliminar la carpeta `server/` que contiene archivos legacy no utilizados por la aplicación principal.
  3. *[Acción IA]* Si las páginas legacy del punto anterior no están ruteadas, borrarlas junto con `updateUser`/`getUsers` de `src/services/api.ts`.
  4. *[Acción IA]* Ejecutar `npm run build` y correr suite de tests en backend para confirmar que no se rompieron dependencias.
- **Criterio de Verificación**: `npm run build` pasa limpiamente; árbol de archivos más liviano y sin código huérfano.

##### [x] Tarea P2.3: Unificación de Servicios de Voz y Bóveda Drive entre Ambos Repositorios
> **Estado 03/10/2026 23:15**: CERRADA SIN PORTAR (decisión). Ningún archivo del frontend llama a `/api/xana/voice/*` ni `/api/xana/vault/*`; la voz real funciona por Web Speech API (web) y Gemini (Telegram), y la bóveda Drive vive en `routes/google_drive.py`. `xana_voice.py` usa STT `mock` por defecto. Si algún día se necesitan, recuperarlos del historial de `luxius-panel` (`server/routes/xana_voice.py`, `xana_vault.py`) y registrarlos en `luXius-Backend/app.py`.
- **Objetivo**: Resolver la divergencia donde `xana_voice.py` y `xana_vault.py` existen en `f:\Sitio XignuX\server\` pero no en `f:\luXius-Backend\`.
- **Archivos Afectados**:
  - `f:\luXius-Backend\routes\xana_voice.py`
  - `f:\luXius-Backend\routes\xana_vault.py`
  - `f:\luXius-Backend\app.py`
  - `scratch/sync_server.py`
- **Paso a Paso de Implementación**:
  1. *[Acción IA]* Copiar `xana_voice.py` y `xana_vault.py` desde `Sitio XignuX/server/routes/` (verificado que existen ahí) hacia `luXius-Backend/routes/`, revisando antes sus imports y dependencias (STT/Drive) contra `requirements.txt`.
  2. *[Acción IA]* Agregar los registros de blueprints correspondientes en `f:\luXius-Backend\app.py` con decoradores de autenticación correspondientes (`@login_required` o `@operator_required`).
  3. *[Acción IA]* Ajustar `scratch/sync_server.py` para eliminar la regla de divergencia y permitir sincronización 100% simétrica de blueprints.
- **Criterio de Verificación**: Ambos repositorios contienen los mismos servicios; endpoints de voz y bóveda responden correctamente con token JWT.

##### [ ] Tarea P2.4: Endurecimiento de Seguridad en App Móvil (`XignuX Workfield Manager`)
- **Objetivo**: Asegurar que la aplicación Capacitor para operarios de campo no almacene tokens en texto plano y fuerce comunicaciones cifradas.
- **Documento de Referencia**: `docs/xana/XANA_MEMORIA_APP_MOVIL.md`.
- **Archivos Afectados**:
  - `capacitor.config.json` de la App Móvil.
  - Almacenamiento de sesión móvil (`auth.js` / `storage.js`).
- **Paso a Paso de Implementación**:
  1. *[Acción IA]* En `capacitor.config.json`, configurar `server.androidScheme = "https"` y `server.cleartext = false`.
  2. *[Acción IA]* Reemplazar `localStorage.setItem('luxius_token', ...)` por `@capacitor-community/secure-storage` para evitar extracción de tokens en dispositivos rooteados o volcados de memoria.
  3. *[Acción IA]* Asegurar que todas las llamadas de la app móvil apunten a `https://luxius-backend.onrender.com` con `Authorization: Bearer <token>`.
- **Criterio de Verificación**: Build de Android (APK/AAB) generado sin advertencias de tráfico en texto claro; token protegido por Keystore de Android.

##### [ ] Tarea P2.5: Verificar confianza en `X-Forwarded-For` detrás de Render
- **Contexto**: `client_ip()` toma la PRIMERA IP de `X-Forwarded-For`. Si Render no sobrescribe ese header, un atacante podría falsear su IP y esquivar `LoginThrottle` / Flask-Limiter (no permite acceder a nada, solo evadir el bloqueo por intentos).
- **Pasos**: 1) Agregar temporalmente un log (o endpoint admin) que registre `X-Forwarded-For` y `remote_addr` en Render. 2) Hacer una petición con `X-Forwarded-For: 1.2.3.4` falso y ver qué llega. 3) Si Render agrega la IP real al FINAL, cambiar `client_ip()` para tomar la última IP (o usar `werkzeug.middleware.proxy_fix.ProxyFix(x_for=1)`). 4) Re-correr `test_security_suite.py`.

---

#### 📊 Nivel P3: Observabilidad, Automatización de Pruebas y Calidad de Código

##### [x] Tarea P3.1: Incorporación de Suite Automatizada de Pruebas de Seguridad en Repositorio
> **Estado 03/10/2026 23:15**: HECHO. `scripts/tests/check_public_routes.py` (estático, 84 rutas, 9 públicas en lista blanca, exit 1 si aparece otra) y `scripts/tests/test_security_suite.py` (33/33 PASS contra backend local; parametrizable con `LUXIUS_API_URL`, `LUXIUS_TEST_CLIENT_UID/CID`, `LUXIUS_TEST_ADMIN_UID`).
- **Objetivo**: Que cada pipeline o desarrollador pueda verificar de forma instantánea la seguridad de rutas antes de desplegar, evitando regresiones donde endpoints protegidos vuelvan a quedar públicos.
- **Archivos Afectados**:
  - `f:\luXius-Backend\scripts\tests\test_security_suite.py`
  - `f:\luXius-Backend\scripts\tests\map_routes.py`
- **Paso a Paso de Implementación**:
  1. *[Acción IA]* Trasladar `scratch/test_security.py` a `scripts/tests/test_security_suite.py`.
  2. *[Acción IA]* Parametrizar la URL base (`LUXIUS_API_URL` por defecto `http://127.0.0.1:5000`) y permitir ejecutar pruebas contra servidor local o producción.
  3. *[Acción IA]* Incorporar `map_routes.py` que inspecciona la app Flask (`app.url_map`) y falla automáticamente si encuentra algún endpoint no documentado en la lista blanca de endpoints públicos.
  4. *[Acción IA]* Documentar el comando de ejecución en la Sección 7 de la memoria:
     `python scripts/tests/test_security_suite.py`
- **Criterio de Verificación**: Ejecución de la suite con salida `33/33 tests PASSED` en consola.

##### [x] Tarea P3.2: Entornos Virtuales y Auditoría Continua de Dependencias Python (`pip-audit`)
> **Estado 03/10/2026 23:15**: HECHO. `pip-audit -r requirements.txt` (desde un venv aislado, sin instalar nada global): **No known vulnerabilities found**. Repetir periódicamente.
- **Objetivo**: Garantizar que el entorno de desarrollo y las dependencias de Render estén libres de vulnerabilidades conocidas (CVEs) sin instalar paquetes globales.
- **Prerrequisitos**: Cumplimiento de la regla de la skill `managing-python-dependencies`.
- **Archivos Afectados**:
  - `f:\luXius-Backend\requirements.txt`
- **Paso a Paso de Implementación**:
  1. *[Acción IA]* Activar el entorno virtual dedicado del backend (`.venv`).
  2. *[Acción IA]* Ejecutar `pip-audit -r requirements.txt` dentro del virtualenv.
  3. *[Acción IA]* Si se detectan paquetes vulnerables, actualizar versiones en `requirements.txt` preservando la compatibilidad con SQLAlchemy 2.0 y Flask 3.x.
- **Criterio de Verificación**: `pip-audit` finaliza con 0 vulnerabilidades conocidas en las dependencias declaradas.

---

#### 🏭 Nivel P4: Integraciones Físicas de Taller (Pausada hasta Operar in Situ)

##### [~] Tarea P4.1: Despliegue del Daemon Hot Folder para Roland VersaWorks en PC de Taller
- **Estado**: **Pausada temporalmente** (Sesión 03/10/2026). Se retomará cuando el desarrollador o agente trabaje frente a la PC física conectada al RIP.
- **Objetivo**: Descarga autónoma de archivos listos para imprimir en la carpeta vigilada (Hot Folder) de Roland VersaWorks en la PC del taller, reportando estado al backend (`En cola de RIP`).
- **Documento de Referencia**: `docs/roadmaps/ROADMAP_PRODUCCION_XANA_HOTFOLDER_DRIVE.md`.
- **Archivos Afectados**:
  - `scripts/luxius_rip_daemon.py`
  - `daemon_config.json`
- **Paso a Paso para cuando se reactive**:
  1. En la PC del taller, clonar o copiar el script ligero `luxius_rip_daemon.py`.
  2. Configurar en `daemon_config.json` la ruta local del Hot Folder de VersaWorks (ej. `C:\Roland VersaWorks\HotFolder_ColaA\`) y el token de autenticación del backend.
  3. Ejecutar como servicio de fondo en Windows o script de inicio.
- **Criterio de Verificación**: Al cambiar una orden a estado `orden`, el archivo se descarga en el Hot Folder y la orden muestra badge verde `En cola de RIP`.


---

### 📝 Tareas del Usuario (no automatizables — actualizado 03/10/2026 23:15)

> Cuando completes una, avisá a la IA para que la marque `[x]` y haga la limpieza asociada.

1. [ ] **Rotar token de Cloudflare R2** (P0.1) y cargar `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` en Render → la IA verifica `/health` = `"storage":"r2"` y borra `private_legacy_r2.py`.
2. [ ] **Rotar contraseña de Neon** (P0.2) y actualizar `DATABASE_URL` en Render y en `.env` locales (hacerlo en horario sin actividad del taller).
3. [ ] **Repartir contraseñas nuevas** de `f:\luXius-Backend\CREDENCIALES_NUEVAS.txt` y borrar el archivo (P0.3).
4. [ ] **Probar el bot de Telegram**: mandar `/start` a `@LuXius_Taller_Bot` y confirmar que responde (verifica el webhook con secreto).
5. [ ] **Probar el panel con sesión iniciada** tras el deploy de react-router 7: Entrada, Diseño, Impresión, Stock, ABM, Sistema, Xpress Studio, Presupuestador. Avisar si alguna pantalla queda en blanco.
6. [ ] **(Opcional) Crear Redis** (Upstash free o Redis de Render) y cargar `REDIS_URL` en Render (P1.3) → límites de login compartidos entre workers.
7. [ ] **(Opcional) Portal de clientes**: decidir si los clientes van a entrar al panel; si sí, asignarles `clientId` y contraseña desde Sistema → Usuarios (P0.4).
8. [ ] **(Decisión) Reescribir historial público** de `luxius-panel` para borrar commits viejos con secretos (destructivo; solo con tu OK explícito). Si rotás R2 y Neon, deja de ser urgente.
9. [ ] **(Opcional) Rotar claves Gemini/OpenAI** si alguna vez estuvieron en el repo.

## 9. 📦 Pipeline R2 → Google Drive (`scripts/sync_r2_to_drive.py`)

Migración de respaldo: baja objetos de Cloudflare R2 con antigüedad mayor a
`DIAS_ANTIGUEDAD` (default 5 días), los sube a Google Drive, registra la
referencia en PostgreSQL y **solo entonces** borra el original de R2.

### Archivos del sistema (NO tocar salvo pedido explícito)
- `scripts/sync_r2_to_drive.py` — pipeline principal (cron)
- `scripts/test_single_file.py` — prueba controlada de un archivo puntual
- `scripts/resolve_orphans.py` — revisión interactiva de huérfanos
- `scripts/generate_drive_token.py` — genera OAuth de usuario de Drive
- `.github/workflows/r2-to-drive.yml` — cron `0 6 */3 * *`

### Configuración (.env)
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`,
`GOOGLE_DRIVE_FOLDER_ID` (carpeta raíz), `GOOGLE_OAUTH_TOKEN_JSON` o
`GOOGLE_OAUTH_TOKEN_FILE`, `DATABASE_URL`, `DIAS_ANTIGUEDAD`,
`EXCLUIR_PREFIJOS` (default `thumbnails/`), `CARPETA_HUERFANOS`,
`DRY_RUN`, `MAX_REINTENTOS_DRIVE`, `BACKOFF_BASE_SEGUNDOS`, `SMTP_*`.

### Estructura de carpetas en Drive
```
{AÑO}/{MM}/{DD}/{CLIENTE}/{OT-XXXXXXXX}/{archivo.ext}
```
- Año/Mes/Día salen de `presupuestos.created_at` (**no** del `LastModified` de R2).
- `OT-XXXXXXXX` = `"OT-" + UPPER(SUBSTRING(presupuestos.id, 1, 8))`. Ver sección 9.1.
- Cliente = `clientes.nombre` (LEFT JOIN), o `Sin-Cliente`.
- Sin match → subcarpeta mensual `_Huerfanos_SinClasificar/{YYYY-MM}/`.

### 9.1. El número de OT NO es un campo en la base
Diagnosticado el 30/09/2026. No existe columna `ot`/`numero_ot` en ninguna
tabla ni clave equivalente dentro de `especificaciones`. Se **calcula al vuelo**
desde el UUID:
```python
ot = f"OT-{str(p.id)[:8].upper()}"    # server/routes/orders.py:234
```
Aparece idéntico en `orders.py:234,295-299`, `app.py:1200`, `stats.py:397,500`,
`services/xana_tools.py:140,251`, `services/xana_graph.py:187`. El frontend
cae a `OT-${order.id}` si `order.ot` viene vacío.

**No usar `descripcion ILIKE 'Proyecto OT-%'`**: 102 de 181 presupuestos la
tienen, con colisiones masivas (OT-8 aparece 8 veces), todas creadas en dos
días de agosto 2026, y solo 18 tienen archivos. Es residuo de datos de prueba.
El propio código la descarta como basura en `Entrada.tsx:1330`,
`Reportes.tsx:461` y `generatePdfClientReport.ts:83`.

**La nomenclatura de producción NO está aplicada a los archivos de R2.** La
fórmula `OT-[N°]_x[Copias]_[Mat]_[Serv]_[Medidas]` existe en
`SharedFileViewerModal.tsx:18-83` (activa) y `server/index.js:63-146` (legacy,
usa el UUID completo), pero `archivos[]` tiene **0 elementos** con prefijo
`OT-` en toda la tabla. Los nombres reales son `{timestamp_ms}_{original}`.

### 9.2. Protección "no imprimir archivos de órdenes no impresas"
`requiere_proteccion_por_no_impreso(estado, deleted_at)` en `sync_r2_to_drive.py`.
Devuelve `True` (no se toca nada) salvo que:
- `deleted_at IS NOT NULL` (papelera) → `False`
- `estado = 'cancelado'` → `False`
- `estado IN ESTADOS_IMPRESOS = {'impreso','post','completo','entregado','finalizado'}` → `False`

En `test_single_file.py` el chequeo corre **antes** del `input()`
"¿Continuar?" (línea ~80), así que un archivo protegido frena sin preguntar.
`get_drive_service()` y `ensure_orphan_queue_table()` quedaron después del
prompt para que abortar no cueste nada. Ambos `input()` tienen `except EOFError`
que asumen `n` por seguridad (comportamiento correcto en CI/cron).

### 9.3. Estados de `presupuestos.estado` (diagnosticado 30/09/2026)
Solo **4 valores** existen en la tabla:
| estado | total | vivos (`deleted_at IS NULL`) | con archivos |
|---|---|---|---|
| `ORDEN_DE_TRABAJO` | 92 | 14 | 32 |
| `impreso` | 62 | 61 | 61 |
| `cancelado` | 26 | 0 | 0 |
| `borrador` | 1 | 0 | 0 |

Filtro recomendado: `estado = 'impreso'` = ya impreso; `estado =
'ORDEN_DE_TRABAJO'` = listo para imprimir, todavía no. Sumar siempre
`deleted_at IS NULL` (154 de 181 están en papelera).

`estado` es `String(20)` libre, sin CHECK ni enum. El mapa canónico BD↔frontend
está en `server/routes/orders.py:19-73` y el tipo en `src/types/orden.ts:2-15`.
Fuente de verdad para "pasó impresión": el set de `server/app.py:1072`
(`PRINTED_STATUSES`). **No usar el SQL de `services/xana_analytics.py`** —
cuenta `aprobado`/`en_taller`/`entregado`/`facturado` y devuelve todo en cero.
Lo mismo `server/routes/stats.py:52`.

**No existe** ninguna columna ni clave JSON con `impres`/`print`/`produccion`
en el schema. No hay tabla de órdenes, impresiones ni cola de impresión.
`sync_log` existe como tabla de auditoría pero tiene 0 filas.

### 9.4. Sistema `drive_reconciliation.py` — ELIMINADO (30/09/2026)
Bóveda histórica con Shared Drive + tabla `drive_vault_audits`, nunca
operativa. Se borraron el service, los endpoints `/google-drive/vault/*`, los
imports en `routes/google_drive.py`, el modelo `DriveVaultAudit` y la tabla
`drive_vault_audits` (DROP confirmado, 0 filas). **El sistema vivo es el
pipeline de la sección 9.** Queda una referencia de texto en
`server/routes/xana.py:142` (objective histórico) y la pantalla
`src/pages/Sistema/GoogleDriveView.tsx` conserva llamadas a los endpoints
eliminados (devuelve 404 hasta que se adapte o se retire).

### 9.5. Notas operativas
- En `cmd.exe`/`powershell.exe` de Windows, los prints con emoji/✔/🔒 lanzan
  `UnicodeEncodeError` (cp1252). Usar `$env:PYTHONIOENCODING="utf-8"`.
  El log a archivo nunca se ve afectado (usa `encoding='utf-8'` explícito).
- Los objetos R2 no traen metadata del nombre original (`Metadata: {}`,
  `ContentDisposition: None`). Hay dos patrones de key:
  `uploads/{timestamp}_{nombre_original}` y `uploads/YYYYMMDD/{hash}.{ext}`.
  Los legacy con hash no se pueden matchear por nombre contra `archivos[]`.
- `orphan_review_queue` se conserva; los huérfanos se respaldan en Drive pero
  **nunca** se borran de R2.

---
