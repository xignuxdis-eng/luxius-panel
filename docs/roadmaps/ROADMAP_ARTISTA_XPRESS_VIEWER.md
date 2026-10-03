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
| **Fase 3** | **Herramientas de Preimpresión en Tiempo Real** | ✅ **COMPLETADA** | `src/pages/XpressViewer/XpressViewer.tsx`, `src/types/orden.ts` |
| **Fase 4** | **Redrawer AI: Guardado y Reemplazo Directo en OT** | ✅ **COMPLETADA** | `src/pages/XpressViewer/RedrawerStudio.tsx`, `src/data/db.ts` |
| **Fase 5** | **Aprobación Técnica y Pase a Impresión desde el Visor** | ✅ **COMPLETADA** | `src/pages/XpressViewer/XpressViewer.tsx`, `src/data/db.ts` |

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

### ✅ FASE 3: Herramientas de Preimpresión en Tiempo Real (Completada)
- **Logro:**
  1. Calibrador de demasías y sangrado visual perimetral (presets 2cm, 5cm, 10cm bolsillo lona) con renderizado en canvas y persistencia a la orden.
  2. Inspector de DPI a escala física 1:1 reactivo con semáforo interactivo (>150 verde, 72-150 amarillo, <72 rojo).
  3. Simulador de virado solvente CMYK con filtro interactivo y aviso de perfil.

---

### ✅ FASE 4: Redrawer AI con Guardado y Reemplazo Directo a la OT (Completada)
- **Logro:**
  1. Si `order` está presente en Redrawer Studio, se muestra la tarjeta de OT vinculada y el botón `⚡ Guardar Vector en Orden #OT`.
  2. Modal de guardado con opciones: "Reemplazar arte principal" (coloca el vector en `archivos[0]` y preserva el arte anterior) o "Agregar como archivo adicional".
  3. Conversión del SVG con retoques a Blob/File, subida directa a Cloudflare R2 vía `uploadFile()`, persistencia en PostgreSQL vía `saveOrden()` y registro en historial/observaciones.
  4. Opción de aprobación automática: cambia el estado a `orden` (listo para taller).

---

### ✅ FASE 5: Aprobación Técnica y Pase a Impresión desde Xpress Viewer (Completada)
- **Logro:**
  1. Barra de aprobación técnica en el visor: botón `Aprobar para Impresión` (avanza estado de la OT a `ORDEN_DE_TRABAJO`).
  2. Botón `Rebotar al Vendedor` con modal de motivos para notificar resolución deficiente o falta de curvas.

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
