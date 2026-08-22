# Roadmap: Previews Avanzados para LuXius

## Objetivo

Incorporar a LuXius un sistema de previsualización universal para órdenes de trabajo, capaz de mostrar archivos bitmap y formatos vectoriales/profesionales como CDR, AI, EPS, PDF y SVG sin modificar ni reemplazar los archivos originales.

La preview debe funcionar como una representación visual interna del archivo, manteniendo siempre el archivo fuente original disponible para impresión y producción.

---

## 1. Alcance funcional

### Formatos iniciales

- JPG / JPEG
- PNG
- TIFF
- WebP
- PDF
- SVG
- EPS
- AI
- CDR

### Resultado esperado

Al cargar una orden de trabajo, LuXius debe:

1. Detectar automáticamente el formato de cada archivo.
2. Determinar si es bitmap, vectorial o documento.
3. Generar una preview cuando sea necesario.
4. Guardar la preview como recurso cacheado.
5. Mostrarla en la interfaz junto al archivo original.
6. Evitar reprocesar archivos que ya tengan una preview válida.
7. Regenerar la preview si cambia el archivo fuente.

---

# Fase 1 — Arquitectura del Preview Service

## Objetivo

Separar la lógica de generación de previews del frontend.

### Crear

`PreviewService`

Responsabilidades:

- detectar extensión/MIME;
- seleccionar el renderer adecuado;
- generar preview;
- generar thumbnail;
- almacenar metadata;
- administrar cache;
- informar errores de renderizado.

### Flujo

```text
Archivo de OT
     ↓
Detección de formato
     ↓
PreviewService
     ↓
Renderer específico
     ↓
Preview intermedia
     ↓
PNG/WebP thumbnail
     ↓
Cache
     ↓
React
```

---

# Fase 2 — Mantener previews existentes

Antes de incorporar formatos nuevos, encapsular el procesamiento actual de imágenes.

### Bitmap

- JPG
- PNG
- TIFF
- WebP

### Objetivo

Que el frontend no necesite distinguir entre:

```text
imagen.jpg
```

y

```text
diseño.cdr
```

Ambos deben implementar conceptualmente:

```text
Archivo
├── nombre
├── extensión
├── tamaño
├── metadata
├── preview_url
└── estado_preview
```

---

# Fase 3 — PDF y SVG

## PDF

Implementar renderer de PDF en backend.

Objetivo:

```text
PDF
 ↓
render de primera página
 ↓
WebP
```

En documentos multipágina:

```text
PDF
 ↓
page 1 → preview
page 2 → preview
page 3 → preview
...
```

Inicialmente puede mostrarse solamente la primera página.

## SVG

SVG puede utilizarse directamente cuando sea seguro hacerlo, pero para una preview uniforme conviene generar también una versión rasterizada cacheada.

---

# Fase 4 — EPS

## Renderer

Evaluar Ghostscript como motor de renderizado de PostScript/EPS.

Flujo:

```text
EPS
 ↓
Ghostscript
 ↓
PNG/WebP
 ↓
Preview
```

### Requisitos

- controlar tamaño máximo;
- controlar DPI;
- limitar consumo de memoria;
- manejar EPS corruptos;
- evitar que un archivo malformado bloquee el worker.

### Resultado

LuXius podrá visualizar archivos EPS sin necesidad de instalar Illustrator/CorelDRAW en el servidor.

---

# Fase 5 — AI

## Estrategia

Detectar primero la estructura del archivo.

Muchos archivos AI modernos contienen una representación PDF compatible.

Flujo preferente:

```text
AI
 ↓
¿contiene PDF compatible?
 ↓
Sí
 ↓
PDF renderer
 ↓
Preview
```

Fallback:

```text
AI
 ↓
PostScript/EPS
 ↓
Renderer
 ↓
Preview
```

### Importante

Nunca reemplazar el `.ai` original.

La conversión solamente existe como recurso temporal/cache de visualización.

---

# Fase 6 — CDR

## Prioridad alta

Investigar e integrar `libcdr` / `pylibcdr`.

Repositorio de referencia:

https://github.com/LibreOffice/libcdr

Bindings Python:

https://github.com/mpds-io/pylibcdr

### Estrategia

Primero intentar detectar si el CDR contiene un thumbnail embebido.

```text
CDR
 ↓
¿thumbnail disponible?
 ├── Sí → extraer thumbnail
 └── No → renderer CDR
```

Esto permitiría acelerar muchísimo la apertura de órdenes.

### Fallback

```text
CDR
 ↓
libcdr / pylibcdr
 ↓
SVG
 ↓
PNG/WebP
 ↓
Cache
```

---

# Fase 7 — Sistema Universal de Cache

Cada archivo debe tener una identidad basada en su contenido.

Ejemplo:

```text
SHA256(archivo)
```

La cache podría organizarse como:

```text
previews/
  ab/
    ab1234...webp
```

Metadata:

```json
{
  "source_hash": "abc123...",
  "format": "cdr",
  "renderer": "libcdr",
  "renderer_version": "1.x",
  "width": 350,
  "height": 120,
  "preview": "preview.webp",
  "created_at": "...",
  "status": "ready"
}
```

### Ventaja

Si dos órdenes contienen exactamente el mismo archivo, LuXius puede reutilizar la misma preview.

---

# Fase 8 — Estados de Preview

Implementar estados explícitos:

```text
pending
processing
ready
failed
unsupported
```

UI:

```text
⏳ Generando preview...
```

```text
✓ Preview disponible
```

```text
⚠ No se pudo generar preview
```

```text
? Formato no compatible
```

Nunca debe impedirse la carga de la OT porque falle una preview.

---

# Fase 9 — Integración con las Órdenes de Trabajo

Cada archivo de una OT debería tener:

```text
archivo
 ├── original
 ├── metadata
 ├── preview
 └── procesamiento
```

Ejemplo visual:

```text
┌──────────────────────────┐
│                          │
│        PREVIEW           │
│                          │
│         CDR              │
│                          │
└──────────────────────────┘

cartel_cliente.cdr
350 × 120 cm
Vectorial
Preview disponible
```

---

# Fase 10 — Frontend React

Crear un componente único:

`UniversalFilePreview`

Ejemplo conceptual:

```text
<UniversalFilePreview
    file={file}
    size="medium"
/>
```

El componente recibe siempre el mismo objeto independientemente del formato.

### Funciones

- thumbnail;
- vista ampliada;
- zoom;
- pantalla completa;
- navegación entre archivos;
- indicador de formato;
- indicador de procesamiento;
- fallback cuando no existe preview.

---

# Fase 11 — Visor ampliado

Una vez funcionando el thumbnail, agregar un visor completo.

Funciones futuras:

- zoom;
- pan;
- fullscreen;
- navegación entre archivos;
- información técnica;
- dimensiones;
- DPI;
- colores;
- cantidad de páginas;
- tamaño del archivo.

Para archivos vectoriales podría agregarse:

```text
Zoom 25%
Zoom 50%
Zoom 100%
Zoom 200%
Ajustar a pantalla
```

---

# Fase 12 — Preflight visual

Esta fase transforma el sistema de previews en una herramienta de preproducción.

Detectar:

- resolución baja;
- dimensiones;
- orientación;
- RGB / CMYK;
- transparencias;
- fuentes;
- imágenes incrustadas;
- cantidad de páginas;
- bounding box;
- objetos fuera del área;
- posibles problemas de renderizado.

Ejemplo:

```text
✓ Dimensiones
✓ Formato
✓ Preview
⚠ Resolución baja
✓ CMYK
⚠ Fuente no incrustada
```

---

# Fase 13 — Seguridad

Los renderizadores deben ejecutarse aislados.

### Reglas

- límites de tamaño de archivo;
- timeout por render;
- límite de memoria;
- procesos aislados;
- no ejecutar archivos;
- sanitizar nombres;
- limitar formatos;
- eliminar temporales;
- registrar errores.

Especial atención a Ghostscript y cualquier parser que procese archivos provenientes de clientes.

---

# Fase 14 — Procesamiento asíncrono

Cuando una OT contiene muchos archivos:

```text
Upload
   ↓
OT creada inmediatamente
   ↓
Queue
   ↓
Preview Worker
   ↓
Procesamiento paralelo
   ↓
Actualización de estados
```

La interfaz no debe quedar bloqueada esperando que se procesen 20–100 archivos.

---

# Fase 15 — Infraestructura

## Primera implementación

Mantenerlo dentro del backend Flask si el volumen todavía es moderado.

## Evolución

Si XignuX aumenta considerablemente la cantidad de archivos:

```text
Flask API
    ↓
Queue
    ↓
Preview Worker
    ↓
Storage
```

Posibles tecnologías futuras:

- Redis
- Celery/RQ
- worker dedicado
- almacenamiento de objetos

No implementar estas piezas hasta que sean necesarias.

---

# Fase 16 — Pruebas

Crear un conjunto de archivos reales de producción:

```text
tests/previews/
├── jpg/
├── png/
├── tiff/
├── pdf/
├── svg/
├── eps/
├── ai/
└── cdr/
```

Probar:

- archivos pequeños;
- archivos grandes;
- múltiples páginas;
- transparencias;
- CMYK;
- RGB;
- fuentes;
- imágenes incrustadas;
- archivos corruptos;
- archivos sin thumbnail;
- CDR de diferentes versiones;
- AI PDF-compatible;
- EPS complejo.

---

# Fase 17 — Prioridad de implementación

## MVP

1. Arquitectura `PreviewService`.
2. Unificar bitmap + preview.
3. PDF.
4. SVG.
5. EPS.
6. AI.
7. CDR.
8. Cache.
9. Estados de procesamiento.
10. Integración React.

## V2

11. Visor ampliado.
12. Procesamiento asíncrono.
13. Preflight.
14. Metadata avanzada.
15. Detección de problemas.

## V3

16. Worker dedicado.
17. Cola de procesamiento.
18. almacenamiento externo.
19. optimización avanzada.
20. sistema de plugins/renderers.

---

# Arquitectura final propuesta

```text
                         LuXius
                            │
                     Orden de Trabajo
                            │
                     Archivos adjuntos
                            │
                    ┌───────▼────────┐
                    │ PreviewService │
                    └───────┬────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
       Bitmap             Vector             PDF
          │                 │                  │
     Pillow/etc.       ┌────┴────┐             │
                        │         │             │
                      CDR       EPS/AI          │
                        │         │             │
                     libcdr   Ghostscript       │
                        │         │             │
                        └────┬────┘             │
                             │                  │
                             ▼                  ▼
                           SVG/PNG/WebP
                                │
                                ▼
                              CACHE
                                │
                                ▼
                       UniversalFilePreview
                                │
                                ▼
                         Usuario LuXius
```

# Objetivo final

El usuario de LuXius no debería preocuparse por el formato.

Si una orden contiene:

```text
logo.cdr
cartel.ai
vinilo.eps
foto.jpg
diseño.pdf
```

LuXius debería mostrar los cinco archivos visualmente dentro de la misma interfaz.

El archivo original siempre permanece intacto.

La preview es solamente una representación visual generada automáticamente.

---

## Recomendación tecnológica inicial

### CDR
`libcdr / pylibcdr`

### EPS
Ghostscript

### AI
PDF interno → renderer PDF; fallback EPS/PostScript

### PDF
Renderer PDF

### SVG
Renderer SVG / rasterización controlada

### Bitmap
Pillow

### Cache
SHA-256 + WebP

### Backend
Flask

### Frontend
React

### Futuro
Worker asíncrono + Redis/RQ o Celery

---

## Resultado esperado para LuXius

**Previews Avanzados** debería convertirse en una capa independiente del sistema.

Eso permitirá agregar nuevos formatos en el futuro sin modificar la lógica de las órdenes de trabajo.

La interfaz simplemente preguntará:

```text
¿Este archivo tiene preview?
```

y mostrará la representación disponible.

De esta manera, LuXius puede evolucionar desde un gestor de archivos de producción hacia un sistema capaz de realizar una primera inspección visual y técnica de los trabajos gráficos antes de imprimirlos.
