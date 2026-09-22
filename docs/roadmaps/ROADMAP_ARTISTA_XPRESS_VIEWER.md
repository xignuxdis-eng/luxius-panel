# 🗺️ ROADMAP: XPRESS VIEWER & STUDIO PARA EL ROL DE ARTISTA (LUXIUS)

> **Propósito:** Este documento sirve como guía arquitectónica y plan de acción modular para la integración completa de **Xpress Viewer** en el flujo de trabajo del **Rol Artista** en LuXius. Si una sesión de desarrollo o modelo de IA se queda sin tokens o es continuada por otro agente/desarrollador, este archivo contiene todo el contexto, estado actual y especificaciones para retomar el trabajo de inmediato.

---

## 📌 1. Visión General del Módulo

El **Rol Artista** (`role: 'artista'`) es el encargado de:
1. Recibir órdenes en estado `preorden`, `diseno` o `rebotado`.
2. Inspeccionar archivos de clientes (formatos vectoriales y mapas de bits: PDF, CDR, AI, EPS, TIFF, JPG, PNG).
3. Validar resolución física real (DPI a escala 1:1), modo de color (CMYK vs RGB), proporciones y demasías/sangrado para corte o confección de lonas y vinilos.
4. Re-dibujar o vectorizar logotipos de baja calidad con el módulo **Redrawer Studio (ImageTracer)**.
5. Aprobar técnicamente la orden y transferirla a la cola de impresión (`orden` o `impresion`).

**Xpress Viewer** es la herramienta nuclear de LuXius diseñada para abrir archivos pesados sin colgar el navegador, analizar metadatos y aplicar herramientas de preimpresión.

---

## 🚦 2. Estado de Fases y Progreso

| Fase | Descripción | Estado | Archivos Principales |
| :--- | :--- | :--- | :--- |
| **Fase 1** | **Acceso, Permisos y Navegación de Artista** | ✅ **COMPLETADA** | `src/types/auth.ts`, `src/components/layout/Sidebar.tsx` |
| **Fase 2** | **Apertura Contextual de Órdenes y Archivos** | ✅ **COMPLETADA** | `src/pages/XpressViewer/XpressViewer.tsx`, `src/pages/Diseno/Diseno.tsx`, `src/components/shared/SharedFileViewerModal.tsx` |
| **Fase 3** | **Herramientas de Preimpresión en Tiempo Real** | 🟡 **LISTA PARA EJECUCIÓN** | `src/pages/XpressViewer/XpressViewer.tsx`, `src/types/orden.ts` |
| **Fase 4** | **Redrawer AI: Guardado y Reemplazo Directo en OT** | ⚪ *Planificada* | `src/pages/XpressViewer/RedrawerStudio.tsx`, `src/services/api.ts` |
| **Fase 5** | **Aprobación Técnica y Pase a Impresión desde el Visor** | ⚪ *Planificada* | `src/pages/XpressViewer/XpressViewer.tsx`, `src/pages/Entrada/StatusChangeModal.tsx` |

---

## 📋 3. Detalle de Fases Implementadas y Futuras

### ✅ FASE 1: Permisos y Navegación (Completada)
- **Logro:** Se incluyó `'/xpress-viewer'` en `rolePermissions.artista` dentro de `src/types/auth.ts`.
- **Efecto:** El elemento `Xpress Viewer` con ícono `👁️` ahora se muestra de forma nativa en la barra lateral (`Sidebar.tsx`) cuando un usuario con rol `artista` inicia sesión.

---

### ✅ FASE 2: Apertura Contextual de Órdenes (Completada)
- **Logro:**
  1. `XpressViewer.tsx` ahora lee parámetros de URL (`searchParams`): `fileUrl`, `fileName` y `tab`.
  2. En `src/pages/Diseno/Diseno.tsx`, se incorporó:
     - Una barra de acceso rápido en la cabecera ("Xpress Studio & Vectorizador AI").
     - Botón directo `👁️ Xpress` en cada fila de la tabla de trabajos que tenga archivos cargados. Al hacer clic, navega a `/xpress-viewer?fileUrl=...&fileName=...`.
  3. En `src/components/shared/SharedFileViewerModal.tsx`, se incorporó un botón "👁️ Xpress Studio" en cada tarjeta de archivo para inspección inmediata.

---

### 🟡 FASE 3: Herramientas de Preimpresión en Tiempo Real (Siguiente Paso)

**Objetivo:** Permitir al Artista verificar y ajustar parámetros técnicos dentro del mismo visor antes de enviar a taller.

#### 1. Calibrador de Demasías y Sangrado Visual
- **Ubicación:** `src/pages/XpressViewer/XpressViewer.tsx` (herramienta `toolMode === 'bleed'`).
- **Funcionalidad:**
  - Permitir ingresar demasía en centímetros (ej: 2cm, 5cm para bolsillo de lona, o 0.5cm para sangrado de vinilo de corte).
  - Dibujar una guía perimetral semitransparente sobre el canvas/preview con líneas discontinuas cyan/magenta indicando la línea de corte y la línea de seguridad.
  - Guardar la configuración de demasías (`demasiasConfig`: `{ top, bottom, left, right, cm }`) en la orden asociada si se pasa `orderId` en la URL (`/xpress-viewer?orderId=123`).

#### 2. Inspector Automático de DPI a Escala 1:1
- Comparar las dimensiones en píxeles del archivo contra las medidas solicitadas en la orden (`ancho` y `alto` en metros):
  $$\text{DPI Calculado} = \frac{\text{Pixeles de Ancho}}{\text{Ancho en Metros} \times 39.3701}$$
- Mostrar un badge interactivo con semáforo de calidad:
  - 🟢 **Óptimo (>150 DPI)**: Alta definición para vinilo de corte / cartelería cercana.
  - 🟡 **Aceptable (72 - 150 DPI)**: Apto para gigantografías y lonas front/backlight vistas a distancia (>3 metros).
  - 🔴 **Crítico (<72 DPI)**: Advertencia de pixelado severo con botón para abrir automáticamente en el **Redrawer Studio**.

#### 3. Detección y Alerta CMYK vs RGB
- Analizar el perfil del archivo. Si es RGB, alertar al artista con una sugerencia de previsualización de virado de color típico de tintas solventes/UV (alerta de negros no enriquecidos y saturación de verdes/azules fosforescentes).

---

### ⚪ FASE 4: Redrawer AI con Guardado y Reemplazo Directo a la OT

**Objetivo:** Que el Artista pueda vectorizar un logo de mala calidad y vincular el SVG resultante directamente a la orden sin descargarlo y volverlo a subir manualmente.

- **Ubicación:** `src/pages/XpressViewer/RedrawerStudio.tsx`.
- **Flujo:**
  1. Si `orderId` está presente en la URL, mostrar el botón: `⚡ Guardar Vector en Orden #OT`.
  2. Al hacer clic, convertir el SVG a Blob y enviarlo a `POST /api/ordenes/<id>/archivos` o subirlo a Cloudflare R2 vía `/api/upload`.
  3. Registrar en el historial de la OT: *"Arte vectorizado con Redrawer Studio por [Artista]"*.

---

### ⚪ FASE 5: Aprobación Técnica y Pase a Impresión desde Xpress Viewer

**Objetivo:** Cerrar el ciclo de diseño sin salir del visor.

- **Ubicación:** `src/pages/XpressViewer/XpressViewer.tsx`.
- **Flujo:**
  1. Barra inferior con selector de acción rápida:
     - 🚀 **Aprobar y Pasar a Impresión**: Cambia el estado de la orden a `orden` o `impresion`.
     - ↩️ **Rebotar a Vendedor/Cliente**: Abre un modal breve para redactar motivo (ej: *"Resolución insuficiente, se solicitó archivo en curvas"*).
  2. Notificación en tiempo real vía WebSocket o actualización de estado en base de datos.

---

## 🛠️ 4. Guía para el Próximo Modelo de IA / Desarrollador

Si estás continuando este trabajo:

1. **Verificación Inicial:**
   ```bash
   npm run build
   ```
2. **Para probar la vista del Artista:**
   - Inicia sesión con rol `artista` en `/login`.
   - Navega a `/diseno` para ver la cola de diseño con los botones de Xpress Studio y los accesos en la tabla.
   - Navega a `/xpress-viewer` para interactuar con el visor HD y el Redrawer Studio.
3. **Parámetros de URL soportados por Xpress Viewer:**
   - `/xpress-viewer?fileUrl=<url_encodeada>&fileName=<nombre_archivo>`
   - `/xpress-viewer?tab=redrawer` (Abre directamente la pestaña de vectorización).
   - `/xpress-viewer?tab=redrawer&fileUrl=<url>` (Carga el archivo directamente en el vectorizador).

4. **Reglas de Despliegue Obligatorias (Ver `.agents/AGENTS.md`):**
   - Compilar con `npm run build`.
   - Sincronizar rama `gh-pages` con el contenido de `dist/`.
   - Copiar a `D:\XignuX\luxius-panel\dist\` si se ejecuta en el servidor local de producción.
