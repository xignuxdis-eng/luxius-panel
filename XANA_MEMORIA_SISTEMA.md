# 🧠 XANA MEMORIA DEL SISTEMA - CONTEXTO MAESTRO DEL ECOSISTEMA LUXIUS
> **Última Actualización:** 03/10/2026 13:30 (En sincronía con Producción — Bot Telegram en Vivo + Depuración Métricas de Taller + Escalador IA)  
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

---

## 7. 🚀 Guía Rápida para Continuar en Cualquier Otro IDE / Máquina

Si abres este proyecto en otro IDE (Cursor, VS Code, Windsurf, etc.) o en otra PC:

1. **Estado Actual de Producción (03/10/2026)**:
   - **Backend Render**: Operativo al 100% (`https://luxius-backend.onrender.com/health` responde 200 OK). Ambas ramas `main` y `master` de `luXius-Backend` sincronizadas en GitHub con webhook de Telegram (`/api/telegram/webhook`), configuración persistente in-situ (`/api/telegram/config`), servicio de briefing matutino (`/api/production/briefing`), escalador IA (`/api/upscaler/*`) y calibración de gates Xana A2, A4 y A6 certificadas.
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

---

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
