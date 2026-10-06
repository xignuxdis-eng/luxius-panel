# 🖨️ Roadmap Estratégico: Nesting 2D Automatizado con Hot Folders y RIP (VersaWorks)

**Versión:** 1.0 — Arquitectura de Preimpresión Desatendida (*Lights-Out Prepress*)  
**Fecha:** 05 de Octubre, 2026  
**Ecosistema:** LuXius Backend & LuXius Panel (Frontend) $\leftrightarrow$ Roland VersaWorks 6 / VersaWorks Dual

---

## 🎯 1. Visión y Objetivo

Transformar el proceso de taller desde la confirmación de un lote de órdenes en la web hasta la inyección desatendida de archivos listos para imprimir en el RIP, eliminando:
1. La necesidad de que el maquinista descargue archivos sueltos a mano.
2. La imposición manual en el software RIP.
3. Las discrepancias cromáticas por conversión involuntaria de perfiles de color (RGB $\leftrightarrow$ CMYK).

---

## 🏗️ 2. Arquitectura de 3 Capas

```
┌────────────────────────────────────────────────────────┐
│             1. LuXius Panel (Frontend)                 │
│  • Selección múltiple de órdenes en Entrada            │
│  • Algoritmo Skyline 2D (rotación 90°, gap configurable)│
│  • Visualizador con orientación y texto adaptativo     │
│  • Disparador: "🚀 Enviar Pliego a Hot Folder RIP"     │
└──────────────────────────┬─────────────────────────────┘
                           │ Coordenadas (x, y, w, h, rotado)
                           ▼
┌────────────────────────────────────────────────────────┐
│             2. LuXius Backend (Python Worker)          │
│  • Endpoint /api/nesting/render-master-sheet           │
│  • PyMuPDF (fitz) / Pillow en espacio CMYK nativo      │
│  • Cero remuestreo destructivo ni alteración de perfil │
│  • Generación de Master Nested PDF / TIFF 1:1 a 150DPI │
│  • Marcas de corte perimetrales y código de lote       │
└──────────────────────────┬─────────────────────────────┘
                           │ Archivo generado en disco compartido
                           ▼
┌────────────────────────────────────────────────────────┐
│       3. Daemon de Taller & Roland VersaWorks          │
│  • Daemon descarga el Master PDF a Hot Folder local:   │
│    C:\VersaWorks\Input\Queue_A\LOTE_20261005_150m.pdf   │
│  • VersaWorks detecta el archivo desatendido           │
│  • Envío directo a cabezales del plotter Roland        │
└────────────────────────────────────────────────────────┘
```

---

## ⚙️ 3. Modos de Operación con VersaWorks

### Modo A: Pliego Compuesto Maestro (Master Nested PDF de LuXius) — *Recomendado*
* **Cómo funciona:** LuXius realiza la imposición óptima mediante el motor Skyline (mucho más eficiente en ahorro de metros lineales que el auto-nesting básico de un RIP), genera un único archivo PDF/X-4 o TIFF 1:1 en CMYK y lo deposita en la Hot Folder de la Cola A (`Queue A`).
* **Ventaja:** Cero trabajo para el maquinista. VersaWorks lo toma como un trabajo unitario continuo y lo procesa al instante sin necesidad de acomodar piezas manualmente.

### Modo B: Auto-Nesting Nativo de VersaWorks ("Job Action: Nesting")
* **Cómo funciona:** LuXius deposita los archivos individuales aprobados en la Hot Folder vinculada a una cola con la propiedad `Job Action: Nesting` activada con un tiempo de espera de lote (ej: 5-10 minutos o ancho completo de bobina).
* **Ventaja:** Alternativa para tiradas de piezas sueltas donde se prefiera delegar el empaquetado final a la lógica de VersaWorks.

---

## 🛠️ 4. Especificaciones Técnicas de la Composición en Backend

1. **Gestión de Color (Color-Safe):**
   * Preservación estricta del espacio de color nativo del archivo (CMYK Fogra39 o U.S. Web Coated SWOP).
   * Prohibido convertir a RGB antes de componer para evitar descalces o pérdida de saturación en plotters solventes/ecosolventes.
2. **Resolución y Dimensiones:**
   * Lienzo a tamaño 1:1 según bobina física seleccionada (1.52m, 1.37m, 1.60m, etc.) y metros lineales resultantes.
   * Resolución de salida: 150 DPI nativos (óptimo para VersaWorks sin saturar memoria RAM).
3. **Señalética en el Pliego:**
   * Marcas de corte en esquinas (`Crop Marks`).
   * Rótulo inferior fuera del área de impresión: `[LUXIUS NESTING] [LOTE] [CLIENTE] [FECHA] [TOTAL ML]`.

---

## 📅 5. Fases de Implementación

* **Fase 1 (Composición Backend):** Endpoint `/api/nesting/render-master-sheet` en Python que reciba la lista de piezas ubicadas y devuelva la URL del Master PDF generado en Cloudflare R2 / Storage local.
* **Fase 2 (Daemon de Taller Hot Folder):** Servicio local en la PC del taller que sincroniza la cola de producción directamente con la carpeta `C:\VersaWorks\Input\Queue_A`.
* **Fase 3 (Telemetría y Reconciliación RIP):** Ingesta automática de los logs de VersaWorks (`EventLog`) para contrastar el consumo real de tinta y metros lineales con lo presupuestado.
