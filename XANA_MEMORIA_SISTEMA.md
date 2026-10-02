# 🧠 XANA MEMORIA DEL SISTEMA - CONTEXTO MAESTRO DEL ECOSISTEMA LUXIUS
> **Última Actualización:** 02/10/2026 (En sincronía con Producción)  
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
| **Scripts con emoji crasheaban al correrlos en consola Windows** | `cmd.exe`/`powershell.exe` usan cp1252 y los `print()` con `✔`, `🔒`, `⚠️` lanzaban `UnicodeEncodeError`. | Se corre con `$env:PYTHONIOENCODING="utf-8"`. El log a archivo nunca se vio afectado porque `logging.FileHandler` ya usa `encoding='utf-8'`. | `scripts/*.py` |
| **Panel web inutilizable en dispositivos móviles** | 1) `MainLayout.css` fuerza `grid-template-columns: 260px 1fr` sin colapso de sidebar. 2) Solo 9 media queries en 68+ archivos CSS; `Stock.css` (691 líneas) tiene 0 breakpoints. 3) Cuatro widgets flotantes (`XanaAssistant`, `FloatingWhatsApp`, `FloatingAlarm`, `FloatingCalculator`) se superponen en viewport <768px. 4) Touch targets bajo mínimo WCAG 44×44px en `.nav-item`, `.mini-adjust`, `.type-btn`. 5) `padding: 32px 40px` en `.main-content` desperdicia ~80px en móvil. | **Decisión arquitectónica: NO crear versión separada para móvil** — se adopta estrategia de Responsive Progresivo (Mobile-First Enhancement) sobre el codebase existente. Plan de 4 fases documentado en `plan_mobile_first_ux_ui.md` (auditoría Antigravity 02/10/2026). Implementación pendiente en Fases 1-4 del roadmap. | `src/components/layout/MainLayout.css`<br>`src/components/layout/Sidebar.css`<br>`src/styles/index.css`<br>`src/pages/Stock/Stock.css`<br>`src/components/XanaAssistant.css` |


---

## 7. 🚀 Guía Rápida para Continuar en Cualquier Otro IDE / Máquina

Si abres este proyecto en otro IDE (Cursor, VS Code, Windsurf, etc.) o en otra PC:

1. **Estado Actual de Producción (Septiembre 2026)**:
   - **Backend Render**: Operativo al 100% (`https://luxius-backend.onrender.com/health` responde 200 OK). Ambas ramas `main` y `master` de `luXius-Backend` están en el commit `6cce8e0`.
   - **Frontend Web**: Publicado y funcional en `https://xignuxdis-eng.github.io/luxius-panel/` (rama `gh-pages` actualizada).
   - **Frontend Repositorio**: Rama `master` de `luxius-panel` en GitHub sincronizada. Últimos commits de esta sesión (más reciente → más antiguo): `d62f544` (import logs RIP Roland), `b5e8e54` (conciliación+stats backend), `5b854d8` (fix analíticas), `699f708` (layout tinta), `7ac5544` (ml botellas), `b82e4d9` (tinta 2L + botellas), `26c0a97` (calibración tinta), `d91fb35` (filtro alertas + roles), `b70f97a` (fix types), `804bd33` (proyección faltantes), `32f7ac2` (memoria), `f597485` (stock por bobina), `480365f` (autorización commit automático), `1f094de` (stock CRUD/audit), `3e9d76e` (selector PDF + masivo), `d2ab9c0` (fix imports PDF), `d3471a5` (feed stock + export PDF).
   - **Remotos**: `origin` apunta exclusivamente a GitHub. GitLab fue desvinculado el 02/10/2026.
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
  - [ ] **Gates pendientes**:
    - **A1 (cross-model ≥90%)** — ⏸️ **diferido**: `DEEPSEEK_API_KEY` configurada en Render pero sin créditos en la cuenta. Operando solo con Gemini (Function Calling verificado en prod). Se reactivará al recargar tokens en DeepSeek.
    - **A2 (shadow 7 días)** — ⏳ recolectando; comparar LLM vs regex al cumplir la ventana.
    - **A4 (suite trampa)** — ✅ probes manuales pasados; falta ejecutar la suite completa de 23 casos.
    - **A6 (latencia)** — ~3s medido; fijar el valor definitivo del presupuesto (≤3s vs aceptar ~3.2s en chat general).

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
- [x] **Fase 1 (Fundación Mobile-First)** — COMPLETADA 02/10/2026:
  - Tokens y breakpoints centralizados en `src/styles/index.css` (`--bp-mobile`, `--space-page`, fluid `--fs-*` con clamp, `--touch-target-min: 44px`).
  - `MainLayout`: Barra superior móvil (`mobile-topbar`) con hamburguesa accesible, marca compacta, backdrop overlay (`sidebar-overlay`), auto-cierre al cambiar de ruta y padding adaptativo (`var(--space-page)`).
  - `Sidebar`: Modo drawer off-canvas (`position: fixed`, `transform: translateX(-100%)` a `translateX(0)` cuando `.open`), botón de cierre táctil (`✕`), auto-cierre al seleccionar cualquier opción, touch targets WCAG ≥44px.
  - `Header`: Título fluido con `clamp()`, envoltorio de botones responsivo (`flex-wrap`), ocultamiento de fecha larga en viewport estrecho.
  - Floating Widgets (`FloatingCalculator`, `MediaPlayer`): Dimensiones adaptativas (`max-width: calc(100vw - 32px)`) para evitar clipping en pantallas móviles.
- [ ] **Fase 2 (Componentes)** — Pendiente: stock grid mobile-first, tablas responsivas (ABM/Usuarios), modales bottom-sheet, FAB unificado, dashboard tabs.
- [ ] **Fase 3 (Performance)** — Pendiente: React.lazy() en rutas, fuentes condicionales (pixel fonts solo si theme=pixel), logo WebP, code splitting de XanaAssistant (32KB monolítico).
- [ ] **Fase 4 (QA + Polish)** — Pendiente: testing BrowserStack, Lighthouse ≥85 mobile, PWA manifest + service worker, gestos nativos (swipe sidebar).
- **KPIs definidos**: Lighthouse Performance ≥85, LCP ≤2.5s, FID ≤100ms, CLS ≤0.1, touch target compliance 100%.
- **Archivos nuevos planificados**: `src/styles/breakpoints.css`, `src/styles/mobile.css`, `src/components/layout/BottomNav.tsx`, `src/components/ui/FABMenu.tsx`, `src/hooks/useMediaQuery.ts`, `src/hooks/useSwipeGesture.ts`, `public/manifest.json`.

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
- Sin match → una sola carpeta `_Huerfanos_SinClasificar`.

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
