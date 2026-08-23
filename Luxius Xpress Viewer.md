# Luxius Xpress Viewer — Roadmap de Implementación

**Sistema:** LuXius  
**Módulo:** Universal Graphic & Production Viewer  
**Documento:** Roadmap Técnico y Funcional v1.0  
**Fecha:** Agosto 2026  

---

## 📋 Resumen Ejecutivo

**Luxius Xpress Viewer** es un motor de visualización e inspección técnica unificado, diseñado para integrarse al ecosistema LuXius (o funcionar como módulo independiente de respuesta rápida). Su objetivo primordial es permitir la apertura, inspección técnica y verificación de archivos de diseño, preprensa y cartelería sin requerir licencias ni la ejecución de suites pesadas como CorelDRAW, Adobe Illustrator, Photoshop o AutoCAD.

A diferencia de un editor web (estilo Photopea), **Luxius Xpress Viewer** se enfoca exclusivamente en la **fidelidad visual, lectura de metadata técnica de producción y velocidad de respuesta**.

---

## 🎯 Objetivos Principales

1. **Agilidad en Recepción y Taller:** Reducir a cero el tiempo de espera por apertura de softwares pesados para simples verificaciones de archivos.
2. **Arquitectura Progresiva de Asincronía:** Implementar una estrategia de *Fast Preview* (extracción instantánea) + *High Quality Render* (procesamiento vectorial/raster completo).
3. **Vista de Producción Integrada:** Extraer datos críticos para impresión (dimensiones a escala real, perfil de color CMYK/RGB, resolución DPI, estado de fuentes/curvas y peso).
4. **Desacoplamiento Modular:** Construir un sistema basado en controladores/renderers enchufables (*Plugins*) ampliables en el tiempo.

---

## 🏗️ Arquitectura General del Sistema

```
                        LUXIUS XPRESS VIEWER
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
        Arrastrar Archivo                   Abrir desde LuXius
                │                                 │
                └────────────────┬────────────────┘
                                 ▼
                         DETECTOR DE FORMATO
                       (MIME / Header Analysis)
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
        FAST PREVIEW ENGINE             HIGH QUALITY ENGINE
     (Extracción de Embedded            (Procesamiento Backend /
     Previews / Canvas Direct)           Workers Especializados)
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                        INTERFACE DE USUARIO
           ┌───────────────────────────────────────────┐
           │  • Visor Interactivo (Zoom, Pan, Fits)   │
           │  • Panel Lateral de Metadata de Impresión │
           │  • Herramienta de Medición / Control CMYK  │
           └───────────────────────────────────────────┘
```

---

## 🛠️ Fases del Roadmap de Desarrollo

### FASE 1: Core del Sistema & Renderers Esenciales
> **Objetivo:** Tener un visor funcional con interfaz base, soporte para imágenes bitmaps y documentos PDF/SVG, integrando la "Vista de Producción" primaria.

* **1.1. UI/UX Base del Visor:**
  * Implementación del contenedor interactivo (Canvas / SVG viewport).
  * Controles de navegación: *Pan* (arrastrar), *Zoom* (rueda/botones 10%-1000%), *Fit to Screen* (Ajustar a pantalla), *Pantalla Completa*.
  * Zona de arrastrar y soltar (*Drag & Drop*) responsiva.

* **1.2. Motor de Formatos Bitmaps Nativos (Client-Side):**
  * Formatos: `JPG`, `JPEG`, `PNG`, `WEBP`, `BMP`, `GIF`.
  * Procesamiento en el navegador mediante Canvas / Web Workers.
  * Extracción de metadata básica: Ancho/Alto en píxeles, tamaño de archivo, relación de aspecto.

* **1.3. Motor para Documentos & Vectores Estándar:**
  * Formato `PDF`: Integración de `PDF.js` para renderizado multinivel con navegación entre páginas.
  * Formato `SVG`: Renderizado DOM/Canvas nativo con escalabilidad infinita sin pérdida de calidad.

* **1.4. Panel de "Vista de Producción" (v1):**
  * Cálculo de dimensiones físicas reales (conversión de px/puntos a `cm`/`m` según DPI).
  * Detección de espacio de color básico (RGB vs CMYK en PDFs/Bitmaps).
  * Alerta de resolución (ejemplo: warning si un bitmap para gigantografía está por debajo de 100 DPI a tamaño real).

---

### FASE 2: Extracción Fast Preview & Formatos Propietarios
> **Objetivo:** Permitir la previsualización ultrarrápida de archivos pesados (`.cdr`, `.psd`, `.ai`) aprovechando sus vistas previas internas sin costo computacional elevado.

* **2.1. Fast Preview Engine (Extracción de Previews Embebidas):**
  * **CorelDRAW (`.cdr`):** Descompresión al vuelo del contenedor ZIP interno para extraer la imagen `previews/thumbnail.bmp` o `thumbnail.png`.
  * **Adobe Photoshop (`.psd`):** Lectura del *Image Resource Section* (Resource ID 1036 / Thumbnail Resource) para mostrar la miniatura comprimida.
  * **Adobe Illustrator (`.ai`):** Análisis del stream PDF contenido o extracción de la preview rasterizada en el header del archivo EPS/AI.

* **2.2. Backend Processing Workers (Servicios de Apoyo):**
  * Configuración de microservicio/Worker en Python (Flask/Celery o FastAPI) para tareas de conversión que requieran bibliotecas nativas.
  * Integración de utilidades server-side (`ImageMagick`, `Ghostscript`, `poppler-utils`) para generación de renders HQ de respaldo cuando falle la preview embebida.

* **2.3. Detección Avanzada de Errores e Inspección:**
  * Alerta de **Texto no convertido a curvas** (detección de fuentes incrustadas/faltantes en PDF/EPS).
  * Detección de capas (*Layers*) en archivos PSD/AI.

---

### FASE 3: Formatos Cad & Vectoriales de Taller
> **Objetivo:** Incorporar soporte para vectoriales de corte, ruteado y planos técnicos de cartelería.

* **3.1. Motor CAD / Plotter:**
  * Formatos: `DXF`, `DWG` (versiones 2D), `PLT`, `HPGL`.
  * Integración de parsers JavaScript (`dxf-parser` / Three.js / Canvas 2D) para interpretación de entidades lineales, arcos y polígonos.
  * Opción de conmutación de unidades (mm / cm / m) para trazados de corte.

* **3.2. Renderizado en Alta Fidelidad (HQ Render):**
  * Implementación del ciclo de vida dual: **Fast Preview** se muestra a los <200ms; **HQ Render** se procesa en segundo plano y reemplaza la vista cuando se requiere zoom de alta precisión.
  * Renderizado diferencial de capas vectoriales para evitar saturación de memoria.

---

### FASE 4: Herramientas Avanzadas de Producción & Integración LuXius
> **Objetivo:** Convertir el visor en una herramienta de control de calidad completa vinculada a las órdenes de trabajo y presupuestos de XignuX.

* **4.1. Herramientas Interactivas de Taller:**
  * **Regla / Cintrón Digital (Medición):** Permite al usuario trazar una línea sobre la vista previa para medir distancias reales en `cm`/`mm`.
  * **Pipeta de Color / Densitómetro:** Inspección de valores de color en puntos específicos (`CMYK%` o `RGB/HEX`).
  * **Comprobación de Demasías / MÁRGENES DE SANGRÍA:** Guías visuales para verificar demasía de impresión y área segura de corte.

* **4.2. Integración Total con LuXius Workflow:**
  * Apertura directa desde la Ficha de Orden de Trabajo (OT).
  * Botón de **"Aprobar para Impresión"** / **"Rechazar con Observaciones"** directamente desde el visor.
  * Generación de miniatura oficial de la OT al subir el archivo.
  * Modo Standalone (acceso rápido vía URL `luxius.xignux/viewer` para arrastrar archivos sueltos).

---

## 📊 Matriz de Cobertura de Formatos

| Categoría | Formato | Fast Preview (Local) | HQ Render (Full) | Metadatos Extraídos |
| :--- | :--- | :--- | :--- | :--- |
| **Bitmaps** | JPG, PNG, WEBP, BMP, TIF | Instantáneo (Browser) | Native Canvas | Dimensiones, DPI, Espacio de Color, Peso |
| **Adobe** | AI, PSD | Extracción Thumbnail | Backend / PDF-stream | Capas, Modos de Color, Fuentes |
| **Corel** | CDR | Extracción ZIP Thumbnail | Vector SVG/Raster HQ | Versión Corel, Dimensiones de página |
| **Documentos**| PDF, EPS, PS | PDF.js / Instant | Vector Render | Páginas, TrimBox, BleedBox, CMYK/RGB |
| **CAD / Cut** | DXF, PLT, HPGL | Direct WebGL / Canvas | Vector Canvas 2D | Longitud total de corte, Unidades |

---

## 🚀 Próximos Pasos Recomendados

1. **Sprint 0:** Crear el repositorio/módulo dentro de la arquitectura de LuXius y maquetar la UI del visor en React/Tailwind.
2. **Sprint 1:** Implementar la lectura de bitmaps, PDFs y el motor de extracción de thumbnails de `.cdr`.
3. **Sprint 2:** Integrar el panel lateral de *Metadata de Producción* y la regla de medición interactiva.
