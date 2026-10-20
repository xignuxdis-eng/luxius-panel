# 🛠️ Roadmap de Implementación: SuiteCraft (Photocraft + Vectorcraft)

> **Archivo de guía estricta para Agente / IDE (`suitecraft.md`)**  
> **Proyecto:** `luxius-panel` (`f:\Sitio XignuX`)  
> **Objetivo:** Reemplazar la integración actual de **Gimp** por **Photocraft** (edición raster/mapa de bits) e incorporar **Vectorcraft** (edición vectorial), conformando una suite gráfica completa embebida mediante `<iframe>`.

---

## ⛔ REGLAS INQUEBRANTABLES DE EJECUCIÓN (LEER PRIMERO)

1. **PROHIBIDO HACER COMMIT O PUSH:**
   * **NO ejecutes** `git add`, `git commit` ni `git push` bajo ninguna circunstancia.
   * Aunque `.agents/AGENTS.md` menciona autonomía para commitear y pushear, **esta orden directa del usuario anula esa sección para esta tarea**.
   * Todo el desarrollo debe quedar únicamente en el directorio de trabajo local (*working tree*) para que el usuario lo inspeccione y pruebe localmente antes de subirlo.
2. **NO ROMPER CONVENCIONES DEL REPOSITORIO:**
   * **TypeScript Estricto:** `strict: true`, `noUnusedLocals`, `noUnusedParameters`. Cero `any` injustificados y cero variables o imports sobrantes de la antigua integración de Gimp.
   * **CSS Vanilla Exclusivo:** **NO uses Tailwind CSS**. Usa clases CSS propias del proyecto o estilos inline válidos en React (`fontStyle`, `flexShrink`, etc.).
3. **VERIFICACIÓN LOCAL OBLIGATORIA:**
   * Antes de dar por terminada la tarea, debes correr `npm run verify` (`typecheck` + `lint` + `test` + `build`) y garantizar **0 errores**.

---

## 🔍 Fase 1: Relevamiento y Limpieza de "Gimp"

1. **Localizar todas las referencias actuales:**
   * Buscar en `src/` los términos `gimp`, `Gimp`, `GIMP` y localizar el componente, pestaña de navegación, íconos y estilos donde se renderiza actualmente el editor.
2. **Identificar puntos de impacto:**
   * **Menú / Sidebar / Navegación:** Identificar cómo se accede hoy a la sección.
   * **Tipos de Vista / Rutas:** Revisar los union types de navegación (ej. `TabId`, `ViewMode`, etc.) para actualizar o mantener compatibilidad sin dejar código muerto.
   * **Tests existentes:** Verificar en `src/**/*.test.ts(x)` si algún test unitario valida la existencia o renderizado de la sección anterior.

---

## 🏗️ Fase 2: Arquitectura Recomendada (Iframe + UX Gráfica)

Para que **Photocraft** y **Vectorcraft** funcionen como una verdadera estación de trabajo gráfica dentro de `luxius-panel`, el agente debe implementar un contenedor unificado con las siguientes especificaciones técnicas:

### 1. Estrategia "Lazy Mount + Keep-Alive" (Crítico para no perder trabajo)
* **Problema a evitar:** Si el operador está diseñando en **Photocraft**, cambia un momento a **Vectorcraft** para trazar un vector, y al cambiar de pestaña el componente desmonta el `<iframe>` (`{active === 'photocraft' && <iframe />}`), **el navegador destruirá la sesión del iframe y el usuario perderá todo su lienzo no guardado**.
* **Solución obligatoria:**
  1. **Lazy Mount:** Montar el `<iframe>` de cada herramienta recién la primera vez que el usuario la selecciona (usando un estado `loadedTools: Record<'photocraft' | 'vectorcraft', boolean>`).
  2. **Keep-Alive con CSS:** Una vez montado un `<iframe>`, **mantenerlo en el DOM** y alternar su visibilidad con `display: activeTool === 'photocraft' ? 'block' : 'none'` (y `width: '100%'`, `height: '100%'`). Así el cambio entre **Photocraft** y **Vectorcraft** es instantáneo y conserva los archivos abiertos en memoria.

### 2. Barra Superior de Control Compacta (Header de SuiteCraft)
Implementar una barra superior compacta (40px–48px de alto) para maximizar el área útil del lienzo:
* **Conmutador de Herramienta (Tabs internos):**
  * 🖼️ **Photocraft** — *Edición Raster & Retoque Fotográfico*
  * ✒️ **Vectorcraft** — *Diseño Vectorial, Curvas & Troqueles*
* **Controles Operativos Derecha:**
  * **Pantalla Completa (`Fullscreen`):** Botón que invoque `containerRef.current?.requestFullscreen()` (y `document.exitFullscreen()`) para trabajar a pantalla completa sin distracciones.
  * **Recargar Editor (`Reload`):** Botón para forzar el recargado únicamente del iframe activo (incrementando una `key` individual por herramienta, ej. `reloadKey.photocraft`).
  * **Abrir en Pestaña Nueva (`External Link`):** Enlace/botón con `window.open(activeUrl, '_blank', 'noopener,noreferrer')` para operadores que trabajen con doble monitor o si algún navegador bloquea recursos de terceros.

### 3. Configuración Técnica de los `<iframe />`
Los editores gráficos web requieren acceso a WebGL, portapapeles del sistema (pegar imágenes/vectores con `Ctrl+V`), descargas de archivos exportados y modales propios:

```tsx
<iframe
  key={`${tool.id}-${reloadCount[tool.id]}`}
  src={tool.url}
  title={tool.name}
  onLoad={() => handleIframeLoad(tool.id)}
  style={{
    width: '100%',
    height: '100%',
    border: 'none',
    display: activeTool === tool.id ? 'block' : 'none',
    backgroundColor: '#18181b',
  }}
  allow="clipboard-read; clipboard-write; fullscreen; accelerometer; autoplay; encrypted-media; gyroscope"
  sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals"
/>
```

### 4. Configuración Centralizada de URLs
Definir un objeto de configuración limpio en la parte superior del módulo (permitiendo override por variables de entorno de Vite):

```ts
export type CraftToolId = 'photocraft' | 'vectorcraft';

export interface CraftToolConfig {
  id: CraftToolId;
  name: string;
  subtitle: string;
  url: string;
  badge: string;
}

export const SUITE_CRAFT_TOOLS: Record<CraftToolId, CraftToolConfig> = {
  photocraft: {
    id: 'photocraft',
    name: 'Photocraft',
    subtitle: 'Edición de imágenes, retoque y mapas de bits',
    url: import.meta.env.VITE_PHOTOCRAFT_URL || 'https://www.photopea.com', // Ajustar a la URL definitiva de Photocraft
    badge: 'RASTER',
  },
  vectorcraft: {
    id: 'vectorcraft',
    name: 'Vectorcraft',
    subtitle: 'Diseño vectorial, trazados y curvas de corte',
    url: import.meta.env.VITE_VECTORCRAFT_URL || 'https://www.vectorpea.com', // Ajustar a la URL definitiva de Vectorcraft
    badge: 'VECTOR',
  },
};
```

---

## 📋 Fase 3: Plan de Trabajo Paso a Paso

### Paso 1: Auditar el componente actual de Gimp
1. Abrir el archivo donde actualmente se renderiza Gimp y revisar cómo se integra en el layout principal (`App.tsx` o router/sidebar correspondiente).
2. Revisar las dimensiones del contenedor padre para asegurar que el contenedor del `<iframe>` ocupe el 100% del alto disponible (`flex: 1`, `display: flex`, `flexDirection: 'column'`, `minHeight: 0`, `overflow: 'hidden'`) sin generar doble barra de scroll.

### Paso 2: Reemplazar Gimp por el módulo SuiteCraft (Photocraft + Vectorcraft)
1. Reemplazar la vista/componente de Gimp por el nuevo contenedor que aloja **Photocraft** y **Vectorcraft**.
2. Incluir un estado de carga visual (`loading` spinner/skeleton oscuro) mientras cada `<iframe>` dispara su evento `onLoad`.
3. Asegurar que todos los estilos usen **CSS Vanilla** o inline styles tipados con `React.CSSProperties` respetando la estética oscura/industrial de **Luxius System**.

### Paso 3: Actualizar `XANA_MEMORIA_SISTEMA.md`
1. De acuerdo con las reglas del proyecto, documentar en **`XANA_MEMORIA_SISTEMA.md`** (Sección 6 — Bitácora de cambios):
   * El reemplazo del editor **Gimp** por **Photocraft** (edición raster).
   * La incorporación de **Vectorcraft** (edición vectorial).
   * La arquitectura de iframes persistentes (*Lazy Mount + Keep-Alive*) para evitar pérdida de trabajo al alternar entre herramientas.

---

## ✅ Fase 4: Verificación de Calidad (Obligatoria)

Ejecutar en terminal los siguientes comandos en orden y corregir cualquier advertencia o error:

1. `npm run typecheck` → **Debe dar 0 errores de TypeScript.**
2. `npm run lint` → **Debe dar 0 errores de ESLint.**
3. `npm run test` → **Todos los tests de Vitest deben pasar en verde.**
4. `npm run build` → **El build de producción debe compilar limpio.**
5. `npm run verify` → **Confirmación integral.**
6. `git status` → **Confirmar que los cambios están en el árbol local y que NO se ejecutó `git commit` ni `git push`.**
