# 🧠 XANA MEMORIA DEL SISTEMA - CONTEXTO MAESTRO DEL ECOSISTEMA LUXIUS
> **Última Actualización:** 26/09/2026 (En sincronía con Producción)  
> **Propósito:** Documento de contexto permanente para cualquier Asistente IA (Antigravity, Cursor, Windsurf, Claude Dev, Copilot) o desarrollador que continúe el trabajo en cualquier entorno o IDE.

---

## 1. 🌐 Ecosistema de Repositorios y Despliegue

El sistema LuXius está compuesto por 3 repositorios centrales interconectados:

| Componente | Repositorio GitHub | Entorno / Hosting | URL de Producción |
| :--- | :--- | :--- | :--- |
| **Frontend Panel** | `xignuxdis-eng/luxius-panel`<br>**Espejo GitLab:** `luxius-group/luxius-panel` (project id `86780561`) | GitHub Pages + Servidor Local Nginx | Web: `https://xignuxdis-eng.github.io/luxius-panel/`<br>Local: `http://localhost/` (`D:\XignuX\luxius-panel\dist`) |
| **Backend API** | `luXius-Backend` | Render (Python Web Service) | `https://luxius-backend.onrender.com` |
| **Landing Web** | `xignux-landing` | GitHub Pages / Hosting Web | Dominio oficial XignuX |
| **App Móvil** | `XignuX Workfield Manager` | Capacitor + Vanilla JS (Híbrida Android) | APK / AAB para técnicos de campo y colocadores |

---

## 2. ⚡ Reglas Obligatorias de Flujo de Trabajo (Para Cualquier IDE / IA)

1. **Autonomía y Auto-Aprobación**: Ejecutar directamente todas las tareas, comandos de terminal, compilaciones y despliegues sin detenerse a solicitar confirmaciones al usuario.
2. **Compilación y Build Frontend**: Cada cambio en el frontend (`f:\Sitio XignuX`) debe compilarse con `npm run build`.
3. **Sincronización Inmediata a GitHub y GitLab (doble remoto)**:
   - `git add -A && git commit -m "..." && git push origin master`
   - `origin` tiene **dos push-URLs** (GitHub y GitLab), configuradas por `scripts/fase1_limpieza.ps1`. Un solo `git push origin master` publica en ambos. Verificar con `git remote -v` (deben aparecer 2 líneas `push`). Si falta, reconfigurar:
     ```powershell
     git remote set-url --add --push origin https://github.com/xignuxdis-eng/luxius-panel.git
     git remote set-url --add --push origin https://gitlab.com/luxius-group/luxius-panel.git
     ```
   - Ambos remotos deben tener **el mismo SHA en `master`**. Fuente de verdad: el commit más reciente; nunca hacer force-push sobre uno solo.
   - Definir `$env:GIT_TERMINAL_PROMPT = '0'` antes de operaciones remotas en agentes/IDEs: evita que `git fetch/push` quede colgado esperando credenciales en una terminal no interactiva (incidente registrado en la bitácora, sección 6).
4. **Despliegue a GitHub Pages**:
   - Para que los cambios impacten en la versión web pública (`https://xignuxdis-eng.github.io/luxius-panel/`), la rama `gh-pages` debe actualizarse con el contenido de `dist/`. Desde la Fase 1 (22/09/2026) `dist/` **ya no se versiona en `master`**, por lo que `git subtree split` dejó de funcionar. Usar:
     ```powershell
     npm run build; .\scripts\deploy_gh_pages.ps1
     ```
     El script crea un commit huérfano con el contenido de `dist/` y lo fuerza a `gh-pages` en GitHub y GitLab.
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
| **Terminal del agente IA quedó colgada de forma permanente** | Un `git fetch gitlab` en shell no interactivo se quedó esperando usuario/contraseña por stdin; todos los comandos posteriores expiraron. | Regla: exportar `GIT_TERMINAL_PROMPT=0` antes de cualquier `fetch/push` desde agentes. El script de Fase 1 lo hace y además mata procesos `git` huérfanos y borra `index.lock`. Si ocurre, reiniciar la terminal del IDE. | `scripts/fase1_limpieza.ps1`<br>Sección 2, regla 3 |
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
| **Sección de Analíticas sin datos (diagnóstico)** | Los endpoints `/api/analytics/stats` y `/api/analytics/reconciliation` son stubs que devuelven `[]`/`{'reconciled':[]}`; `/api/analytics/dashboard` lee la tabla `Presupuesto` (distinta de la colección de órdenes del frontend `/api/orders`); el `Resumen Ejecutivo` está gated por rol (`isAdmin`); `fetchJsonWithTimeout` y `ConciliationTable` no envían `Authorization`. | **Pendiente de implementar** (ver Sección 8, "Analíticas"). | (diagnóstico) `src/pages/Analytics/Analytics.tsx`<br>`src/pages/Analytics/ConciliationTable.tsx`<br>`server/app.py` |


---

## 7. 🚀 Guía Rápida para Continuar en Cualquier Otro IDE / Máquina

Si abres este proyecto en otro IDE (Cursor, VS Code, Windsurf, etc.) o en otra PC:

1. **Estado Actual de Producción (Septiembre 2026)**:
   - **Backend Render**: Operativo al 100% (`https://luxius-backend.onrender.com/health` responde 200 OK). Ambas ramas `main` y `master` de `luXius-Backend` están en el commit `6cce8e0`.
   - **Frontend Web**: Publicado y funcional en `https://xignuxdis-eng.github.io/luxius-panel/` (rama `gh-pages` actualizada).
   - **Frontend Repositorio**: Rama `master` de `luxius-panel` en GitHub sincronizada. Últimos commits de esta sesión: `f597485` (stock por bobina), `480365f` (autorización commit automático), `1f094de` (stock CRUD/audit), `3e9d76e` (selector PDF + masivo), `d2ab9c0` (fix imports PDF), `d3471a5` (feed stock + export PDF).
   - **Remotos**: ⚠️ `origin` actualmente tiene **una sola URL de push (GitHub)**; GitLab está configurado como remoto separado (`gitlab`). No se está cumpliendo el "doble remoto en `origin`" descrito en la Sección 2 regla 3 (pendiente reconfigurar si se requiere espejo GitLab). Los deploys actuales publican solo en GitHub.
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

### Lo que sigue inmediatamente (Siguientes Pasos de Trabajo):
- [ ] **Analíticas sin datos (fix pendiente)**:
  - [ ] Implementar los endpoints stub `/api/analytics/stats` y `/api/analytics/reconciliation` en el backend (o apuntar el frontend a `routes/stats.py`).
  - [ ] Unificar la fuente de datos de `/api/analytics/dashboard` (hoy lee `Presupuesto`; el frontend usa `/api/orders`).
  - [ ] Enviar `Authorization` (JWT) en `fetchJsonWithTimeout` y `ConciliationTable`.
  - [ ] Sincronizar `server/` con `luXius-Backend` para que ambos tengan la misma implementación de analíticas.
- [ ] **Reconfigurar doble remoto**: `origin` hoy tiene solo GitHub; agregar push-URL de GitLab (Sección 2, regla 3) o documentar operación solo-GitHub.
- [ ] **Validación en Vivo de Clientes en UI**: Probar la creación de un nuevo cliente desde Administración (`ClientesView`) y verificar que persista en el detalle de las órdenes tras F5 sin parpadeos.
- [ ] **Fase 2 - Seguridad (prioridad alta)**:
  - [ ] Sacar contraseñas hardcodeadas del seed `_seed_default_users()` en `server/app.py`; leerlas de variables de entorno (`SEED_*_PASSWORD`).
  - [ ] Rotar en Neon las contraseñas de usuarios por defecto expuestas en el historial Git.
  - [ ] Confirmar que `JWT_SECRET_KEY` en Render sea único y seguro.
  - [ ] Migrar Rate Limiter de `memory://` a Redis para persistencia entre workers.
- [ ] **Fase 3 - Deuda Técnica Backend**:
  - [ ] Partir `server/app.py` y `luXius-Backend/app.py` en Blueprints (`routes/clientes.py`, `routes/maquinas.py`, etc.).
  - [ ] Unificar la duplicación entre la carpeta `server/` y el repo `luXius-Backend`.
- [ ] **Fase 5 - Módulos de Producto**:
  - [ ] Módulo 1: Smart Order de Xana (`/api/xana/smart-order`) con tarjeta interactiva.
  - [ ] Módulo 2: Bóveda Drive con sincronización nocturna de órdenes y remitos.
