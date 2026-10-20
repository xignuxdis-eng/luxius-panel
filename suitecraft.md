# 🛠️ Documentación de Arquitectura: SuiteCraft en Xpress Viewer (PhotoCraft & VectorCraft)

> **Proyecto:** `luxius-panel` (`f:\Sitio XignuX`)  
> **Estado:** Implementado y Verificado (20/10/2026)  
> **Objetivo:** Reemplazar integraciones externas por las dos herramientas oficiales pedidas de la suite de Storytold:
> 1. **PhotoCraft** (`https://github.com/storytold/photocraft`) — Editor de imágenes ráster / retoque fotográfico.
> 2. **VectorCraft** (`https://github.com/storytold/vectorcraft`) — Editor de gráficos vectoriales / curvas Bézier / SVG.

---

## 1. Arquitectura Técnica Seleccionada: Opción A (Sub-aplicaciones Estáticas Aisladas)

Para preservar las normas inquebrantables de `luxius-panel` (**CSS Vanilla**, cero contaminación de reglas CSS globales, cero dependencias pesadas en `package.json` y prevención de picos de RAM / `StackOverflowException` durante la compilación), se implementó la **Opción A**:

### Ubicación de artefactos estáticos:
* `public/suitecraft/photocraft/` (contiene `index.html`, boot wasm y módulos WebAssembly de PhotoCraft).
* `public/suitecraft/vectorcraft/` (contiene `index.html`, `vectorcraft-web-...js` y WebAssembly de VectorCraft).

### Ventajas clave:
1. **Aislamiento Total de Estilos:** PhotoCraft y VectorCraft corren dentro de su propio contexto de navegación (`<iframe>`), sin afectar ni ser afectados por el CSS de Luxius.
2. **Cero Dependencias en `package.json`:** No se requieren compiladores de Rust ni herramientas CLI de Trunk en la máquina de desarrollo o CI; los binarios estáticos optimizados se sirven directamente desde `public/` y se copian a `dist/` en tiempo de build.
3. **MIME Types & Compatibilidad:** `.wasm` se sirve como `application/wasm` nativo; los archivos `.gitattributes` protegen binarios WebAssembly (`*.wasm binary`, `*.part-* binary`).

---

## 2. Integración en `XpressViewer`

### 2.1. Pestañas en la Barra de Navegación:
El tipo de navegación del visor se configuró como:
```ts
export type XpressViewerTab = 'viewer' | 'redrawer' | 'printsheeter' | 'photocraft' | 'vectorcraft';
```
En el header de `XpressViewer.tsx`:
* `👁️ Visor & Inspector` (inspección de medidas, preimpresión y DPI).
* `✏️ Redrawer & Vectorizador` (vectorización IA).
* `🧩 Mosaicos & Nesting HD` (panelizado y optimización de sustrato).
* `🖼️ PhotoCraft` (`RÁSTER` badge `#db2777`) — Editor de mapa de bits.
* `✒️ VectorCraft` (`VECTOR` badge `#0891b2`) — Editor vectorial y SVG.

### 2.2. Estrategia "Lazy Mount + Keep-Alive" (Sin pérdida de trabajo)
* **Lazy Mount:** El iframe de PhotoCraft o VectorCraft se monta únicamente cuando el operario hace clic en su respectiva pestaña por primera vez (`hasMountedPhotocraft` / `hasMountedVectorcraft`).
* **Keep-Alive en DOM:** Una vez montado un editor, **permanece activo en el DOM** alternando `display: flex / none`. Si el operario cambia al Visor/Inspector para revisar medidas de la OT o DPI de entrada y regresa a PhotoCraft o VectorCraft, **el lienzo, historial de deshacer y capas continúan exactamente donde estaban sin reiniciarse**.

### 2.3. Controles Operativos de Cabecera:
Cada pestaña cuenta con un header superior compacto de 46px:
* 📄 **Chip de archivo:** Nombre de producción del archivo activo.
* 🔄 **Recargar lienzo:** Forzado manual del iframe mediante claves incrementales (`reloadKey`).
* ↗️ **Abrir en pestaña nueva:** Para configuraciones multimonitor o ventanas auxiliares.
* ⛶ **Pantalla completa:** Inmersión completa de trabajo gráfico (`requestFullscreen` / `exitFullscreen`).
* ✕ **Volver al visor:** Cierra el editor y regresa a la inspección pre-prensa.

---

## 3. Guía de Actualización Futura de PhotoCraft y VectorCraft

Para actualizar las sub-aplicaciones en el futuro sin tocar código del core:

1. **Descargar los últimos builds web estáticos de GitHub Releases:**
   * PhotoCraft: `https://github.com/storytold/photocraft/releases` (descargar `photocraft-web-<version>.zip`)
   * VectorCraft: `https://github.com/storytold/vectorcraft/releases` (descargar `vectorcraft-web-<version>.zip`)

2. **Reemplazar los archivos en las carpetas públicas:**
   * Descomprimir el contenido de PhotoCraft en `public/suitecraft/photocraft/`
   * Descomprimir el contenido de VectorCraft en `public/suitecraft/vectorcraft/`
   * Asegurar que existan `public/suitecraft/photocraft/index.html` y `public/suitecraft/vectorcraft/index.html`.

3. **Verificación y Deploy:**
   ```bash
   npm run verify
   git add -A
   git commit -m "chore(suitecraft): upgrade PhotoCraft / VectorCraft to latest release"
   git push origin master
   ```
