# Guía de Preparación de Archivos para Impresión - XignuX Gráfica

## Especificaciones Técnicas Obligatorias

### Resolución y DPI
| Tipo de Trabajo | DPI Mínimo | DPI Recomendado | DPI Máximo |
|-----------------|------------|-----------------|------------|
| Gigantografía (>2m) | 72 | 150 | 300 |
| Cartelería estándar | 72 | 150 | 300 |
| Vinilo vehicular | 150 | 300 | 600 |
| Calcos/Stickers | 300 | 600 | 1200 |
| Fotográfico | 150 | 300 | 600 |

### Modo de Color
- **OBLIGATORIO**: CMYK (no RGB)
- Perfil de color: **ISO Coated v2 300% (ECI)** o **US Web Coated SWOP v2**
- Negro rico: C:60 M:40 Y:40 K:100 (para fondos grandes)
- Negro texto: C:0 M:0 Y:0 K:100 (para textos finos)

### Dimensiones y Sangrado
- **Sangrado (bleed)**: 3mm por lado MÍNIMO (5mm recomendado)
- **Zona de seguridad**: 5mm desde borde de corte (textos/logos importantes)
- **Marcas de corte**: Incluir en PDF (offset 3mm, grosor 0.25pt)

### Escalas Comunes
- **1:1 (Tamaño real)**: Archivos ≤ 2m en dimensión mayor
- **1:10 (Escala 10%)**: Gigantografía > 2m
- **1:20 (Escala 5%)**: Muy grande formato (>5m)
- ⚠️ **REGLA**: Indicar escala en nombre archivo: `OT-1234_lona_300x150cm_1-10.pdf`

---

## Formatos de Archivo Aceptados

| Formato | Uso Recomendado | Notas |
|---------|-----------------|-------|
| **PDF/X-1a:2001** | ✅ PREFERIDO | Embebe fuentes, CMYK obligatorio |
| **PDF/X-4** | ✅ Bueno | Soporta transparencias |
| **TIFF** | Fotográfico | LZW comprimido, sin capas |
| **JPEG** | Solo fotos | Calidad ≥ 90, evitar recompresión |
| **EPS** | Vectorial legacy | Convertir a PDF/X preferible |
| **AI/INDD** | Solo fuente | Requiere paquete completo con fuentes/imágenes |

### NO ACEPTADOS
- Word, PowerPoint, Publisher, CorelDraw (.cdr), Canva (exportar a PDF/X)
- PNG con transparencia (aplanar sobre fondo)
- GIF, BMP, formatos web

---

## Fuentes y Texto
- **Convertir a curvas/outlines** siempre que sea posible
- Si se mantienen fuentes: embebidas en PDF + enviar archivos .otf/.ttf
- Tamaño mínimo: 6pt (positivo), 8pt (negativo/blanco sobre color)
- Interlineado: ≥ 120% del tamaño de fuente

---

## Imágenes y Gráficos
- **Resolución efectiva**: Verificar en InDesign/Illustrator (Ventana > Enlaces)
- **No escalar > 120%** en maquetación (pierde calidad)
- **Imágenes vinculadas**: Incluir en carpeta "Links" al enviar
- **Transparencias**: Aplanar en PDF/X-1a o usar PDF/X-4

---

## Naming Convention (Obligatorio)
```
OT-{numero}_{material}_{ancho}x{alto}cm_{escala}_{version}.pdf
Ej: OT-ABC12345_VV_137x300cm_1-1_v1.pdf
    OT-XYZ789_LONA_300x150cm_1-10_v2.pdf
```

---

## Checklist Pre-Vuelo (Preflight)

☐ Modo color CMYK  
☐ Perfil ISO Coated v2 / SWOP  
☐ Sangrado 3mm+ todos lados  
☐ Marcas de corte incluidas  
☐ Fuentes embebidas o convertidas a curvas  
☐ Imágenes ≥ DPI mínimo según tabla  
☐ Sin RGB, spot colors no convertidos  
☐ Overprint preview verificado (negros, barnices)  
☐ Nombre archivo sigue convención  
☐ Tamaño archivo < 2GB (límite WeTransfer/Drive)

---

## Herramientas de Verificación
- **Adobe Acrobat Pro**: Print Production > Preflight > "PDF/X-1a compliance"
- **PitStop Pro**: Preflight automatizado
- **Enfocus Preflight**: Online/gratuito para básicos
- **LuXius Smart Order**: Análisis automático al subir (DPI, dimensiones, escala, miniatura)

---

## Envío de Archivos
1. **LuXius Panel** → Nueva Orden → Arrastrar archivos (máx 500MB c/u)
2. **Google Drive/WeTransfer** → Compartir enlace en orden
3. **USB/Presencial** → Carpeta por OT en recepción

### Tiempos de Análisis Automático
- < 50MB: < 10 segundos
- 50-200MB: 10-30 segundos  
- > 200MB: Procesamiento asíncrono (job_id + polling)

---

## Contacto Soporte Técnico
- **Diseño/Preimpresión**: interno 101 / diseno@xignux.com
- **Taller/Impresión**: interno 102 / taller@xignux.com
- **Urgencias producción**: +54 9 351 XXX XXXX (WhatsApp Business)