# 🧠 XANA MEMORIA DEL SISTEMA - CONTEXTO MAESTRO DEL ECOSISTEMA LUXIUS
> **Última Actualización:** Septiembre 2026 (En sincronía con Producción)  
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

---

## 7. 🚀 Guía Rápida para Continuar en Cualquier Otro IDE / Máquina

Si abres este proyecto en otro IDE (Cursor, VS Code, Windsurf, etc.) o en otra PC:

1. **Dependencias**:
   ```bash
   npm install
   ```
2. **Levantar Entorno de Desarrollo**:
   ```bash
   npm run dev
   ```
3. **Verificar Compilación TypeScript**:
   ```bash
   npm run build
   ```
4. **Desplegar Cambios**:
   - `git add -A && git commit -m "..." && git push origin master` (publica en GitHub y GitLab a la vez)
   - `npm run build; .\scripts\deploy_gh_pages.ps1` -> actualiza `gh-pages`
   - Copiar `dist/` a `D:\XignuX\luxius-panel\dist\` (si es la PC del taller).
5. **Contexto Adicional**:
   - Para entender el agente Xana: revisar `.agents/rules/xana_agent.md` y `.agents/AGENTS.md`.
   - Para el Roadmap del Artista y Xpress Viewer: revisar `docs/roadmaps/ROADMAP_ARTISTA_XPRESS_VIEWER.md`.
   - Para la app móvil: revisar `docs/xana/XANA_MEMORIA_APP_MOVIL.md`.
   - Para la arquitectura general de infraestructura: revisar `ESPECIFICACION_TECNICA_ECOSISTEMA_LUXIUS.md`.
   - Para el estado del plan de mejoras: sección 8 de este documento (es la **única lista de tareas vigente**; actualizarla en cada commit relevante).
6. **Al hacer `git pull` en una máquina que ya tenía el repo antes de la Fase 1** (22/09/2026): git eliminará del disco `server/uploads/`, `server/luxius.db`, `dist/` y `backup-luxius-*/` porque dejaron de estar versionados. Hacer copia previa si esa máquina tiene datos locales en esas rutas (la PC del taller, por ejemplo).

---

## 8. 🗺️ Plan de Mejoras Vigente (Roadmap Técnico) y Estado

> Convención: `[x]` hecho, `[~]` en curso, `[ ]` pendiente. Quien complete una tarea la marca aquí en el mismo commit.

### Fase 1: Higiene del repositorio (22/09/2026)
- [x] Cerrar trabajo pendiente del logo SVG liviano en `generatePdfBudget.ts` y `generatePdfClientReport.ts`.
- [x] Ampliar `.gitignore` (backups, `*.db`, `server/uploads/`, multimedia, PDFs de prueba, `build_log.txt`).
- [x] Script `scripts/fase1_limpieza.ps1` (untrack de artefactos, reorganización, doble remoto, commit y push).
- [x] Ejecutado `.\scripts\fase1_limpieza.ps1` el 22/09/2026: commit `8c41d2c` (2516 archivos, -800k líneas) publicado en GitHub y GitLab con el mismo SHA. `origin` tiene 2 push-URLs.
- [x] Publicar `dist/` a `gh-pages` con `scripts/deploy_gh_pages.ps1` (reemplaza a `git subtree split`, que ya no aplica porque `dist/` no se versiona en `master`).

### Fase 2: Seguridad (prioridad alta)
- [ ] Sacar contraseñas hardcodeadas del seed `_seed_default_users()` en `server/app.py`; leerlas de variables de entorno (`SEED_*_PASSWORD`) o generarlas aleatorias y loguearlas una vez.
- [ ] Rotar en Neon las contraseñas de `sistema`, `adrian`, `admin`, `impresion`, `diseño`, `vendedor` (están expuestas en el historial Git).
- [ ] Confirmar que `JWT_SECRET_KEY` en Render no es el valor por defecto de `config.py`.
- [ ] Rate limiter: pasar de `memory://` a Redis (Render Key Value) para que persista entre reinicios y workers.
- [ ] Correr `gitleaks` sobre el historial y purgar secretos si aparecen (`git filter-repo`).

### Fase 3: Deuda técnica del backend
- [ ] Decidir el destino de `server/index.js` (Express legacy, 1237 líneas) e `install_service.js`: extraer `logParser.js` a un servicio propio si las impresoras lo usan, o eliminarlos.
- [ ] Reemplazar `db.create_all()` por migraciones con Flask-Migrate/Alembic.
- [ ] Partir `server/app.py` (>1000 líneas) en blueprints: `routes/clientes.py`, `routes/maquinas.py`, `routes/usuarios.py`, `routes/tarifas.py`, `routes/analytics.py`.
- [ ] Unificar `luXius-Backend` y `server/` (submódulo Git o repo único) para eliminar la copia manual de `run_project.bat`.

### Fase 4: Calidad y CI/CD
- [ ] `vitest` para `src/utils/pricingCalculator.ts` (asignación de bobina por menor desperdicio, precios especiales por cliente).
- [ ] `pytest` para `routes/orders.py` y `sync_routes.py`.
- [ ] `.gitlab-ci.yml` con etapas `lint`, `test`, `build` y despliegue automático a `gh-pages`; habilitar SAST y Secret Detection.
- [ ] Migrar `scripts/tests/*.cjs` a tests reales o eliminarlos.

### Fase 5: Producto (ver `ESPECIFICACION_TECNICA_ECOSISTEMA_LUXIUS.md`)
- [ ] Módulo 1: Smart Order de Xana (`/api/xana/smart-order`) end-to-end con tarjeta interactiva.
- [ ] Módulo 2: Bóveda Drive con cron nocturno y `drive_folder_id` en `presupuestos`.
- [ ] Módulo 3: Daemon Hot Folder RIP con `POST /api/orders/{id}/rip-status`.
