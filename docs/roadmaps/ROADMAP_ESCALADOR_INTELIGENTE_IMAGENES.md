# 🗺️ Roadmap Arquitectónico: Escalador Inteligente de Imágenes (AI Super-Resolution) para LuXius

**Sistema:** Ecosistema LuXius (XignuX)  
**Módulos Afectados:** `XpressViewer.tsx` (Preimpresión), `luXius-Backend` (`services/upscaler_service.py`), `Xana AI`  
**Estado:** Propuesta Técnica Aprobada para Desarrollo  
**Fecha:** 03 de Octubre, 2026  

---

## 📌 1. Justificación y Problemática de Producción

En el rubro de la comunicación visual, cartelería comercial y gigantografía (lonas frontlight de 5x3m, vinilos vehiculares, microperforados para vidrieras):

1. **El cuello de botella de los archivos de clientes:**
   * Más del 60% de los clientes envían fotografías y diseños a través de WhatsApp o descargados de redes sociales (resoluciones típicas de 800×600 a 1600×1200 píxeles, 72 DPI de pantalla).
   * Al proyectar estas imágenes sobre las medidas reales de producción (ej. 2.50 × 1.80 metros), la resolución física cae drásticamente a **15–45 DPI reales**, generando impresiones pixeladas, bordes en serrucho y reclamos de clientes.

2. **Límites de las herramientas actuales:**
   * **Redrawer Studio (Vectorizador SVG):** Excelente para logos planos y tipografías, pero **inutilizable para fotografías**, retratos de personas, fondos complejos o degradados tonales.
   * **Inspector DPI 1:1 de Xpress Studio:** Alerta certeramente en rojo cuando la resolución es `< 72 DPI`, pero no ofrece al operario una solución directa dentro del sistema; el diseñador se ve forzado a recurrir a software externo pesado (Photoshop / Topaz Gigapixel).

---

## 🎯 2. Objetivos del Escalador Inteligente

* **Escalado Inteligente 2x, 4x y 8x:** Reconstrucción de detalles de alta frecuencia mediante redes neuronales convolucionales profundas de Super-Resolución (Real-ESRGAN / BSRGAN).
* **Eliminación de Artefactos JPEG:** Supresión del "ruido de compresión" y bloques típicos de imágenes de WhatsApp.
* **Restauración Facial Opcional (GFPGAN):** En cartelería con personas o fotografías de eventos, reconstrucción fotorrealista de rostros evitando distorsiones plásticas.
* **Cálculo de DPI Objetivo:** Posibilidad de elegir *"Escalar automáticamente hasta alcanzar 150 DPI en las medidas de la orden"*.
* **Guardado Directo en la OT:** Guardado del archivo escalado en Cloudflare R2 como `nombre_upscaled_4x.png` vinculado de inmediato a la orden de trabajo.

---

## 🏛️ 3. Arquitectura Híbrida en 3 Capas

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Xpress Studio)                        │
│                                                                        │
│   Inspector DPI 1:1 ──► [ ✨ Escalar con IA (2x / 4x) ]                │
│                                │                                       │
│          ┌─────────────────────┴──────────────────────┐                │
│          ▼                                            ▼                │
│   [MODO RÁPIDO CLIENTE]                    [MODO PROFUNDO CLOUD/GPU]   │
│   • Canvas Lanczos-3 + Shaders WebGL       • Real-ESRGAN (x4plus)      │
│   • Previews instantáneas (< 2s)           • GFPGAN (Rostros)          │
│   • 0 Costo Servidor / 100% Offline        • Workers Asíncronos 202    │
└───────────────────────────────────────────────┬────────────────────────┘
                                                │
                                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND & ALMACENAMIENTO                        │
│                                                                        │
│   • POST /api/upscaler/process (202 Accepted + Job ID)                 │
│   • GET  /api/upscaler/status/<job_id> (Polling reactivo con progreso) │
│   • Guardado atómico en Cloudflare R2: uploads/{ot}/{filename}_hd.png  │
│   • Actualización en PostgreSQL: order.archivos[0] = nueva_url         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 4. Desglose de Capas Técnicas

### Capa 1: Procesamiento en Navegador (Client-Side WebGL / WebAssembly)
* **Tecnología:** Algoritmo de remuestreo bicúbico/Lanczos-3 con matriz de convolución para enfoque (*Unsharp Masking*) y reducción de ruido en Canvas 2D/WebGL.
* **Propósito:** Preview interactiva de ultra-baja latencia (menos de 2 segundos) para que el diseñador vea una aproximación antes de lanzar el remuestreo de alta densidad.
* **Consumo de recursos:** 0 llamadas API, 0 costo en Render, funciona incluso sin internet.

### Capa 2: Worker Neuronal Asíncrono (Backend / PC de Diseño Local)
* **Modelos Seleccionados:**
  1. `RealESRGAN_x4plus`: Modelo general para fotografías, carteles y fondos de alta resolución.
  2. `RealESRGAN_x4plus_anime_6B`: Optimizado para ilustraciones digitales, vectores rasterizados y tipografías con bordes afilados.
  3. `GFPGAN v1.4`: Inferencia secundaria para rostros humanos en gigantografía de eventos o marcas corporativas.
* **Infraestructura Flexible:**
  * **Modo Cloud (Render CPU):** Utilizando ONNX Runtime cuantizado (`INT8`), reduciendo el consumo de RAM a < 500 MB por inferencia.
  * **Modo Acelerado (PC de Taller con NVIDIA):** Si la PC de diseño del taller cuenta con GPU GeForce RTX (CUDA), el servicio puede ejecutarse localmente a velocidad extrema (3 a 8 segundos por imagen de gran formato).
* **Manejo de Errores y Límites:**
  * Límite de resolución de entrada: máximo 4096×4096 px para evitar desbordes de memoria.
  * Timeout de seguridad: 60 segundos por trabajo.

### Capa 3: Experiencia de Usuario (UI / UX en XpressViewer)
1. **Semáforo Interactivo Mejorado:**
   * Si el semáforo está en rojo (`< 72 DPI`), aparece el botón de acción rápida:  
     `⚡ Optimizar Resolución con IA (Objetivo: 150 DPI)`.
2. **Comparador Interactivo de Nitidez (Split Slider):**
   * Vista dividida izquierda/derecha (idéntica al Redrawer Studio) para deslizar y comparar la textura del original contra la versión mejorada por la red neuronal.
3. **Tarjeta de Métricas de Impresión:**
   * Píxeles Originales vs Píxeles HD (ej. `1200×800 px` ➔ `4800×3200 px`).
   * DPI Original vs DPI Resultante (ej. `38 DPI 🔴` ➔ `152 DPI 🟢`).
4. **Acción de Reemplazo en 1 Clic:**
   * `[ 💾 Guardar como Arte Principal de la OT ]`
   * `[ ➕ Guardar como Arte Secundario ]`
   * Notificación visual y recálculo automático del semáforo a color verde.

---

## 📅 5. Fases de Implementación Sugeridas

| Fase | Hito Principal | Entregable |
| :---: | :--- | :--- |
| **Fase 1: Motor WebGL en Frontend** | Previews en tiempo real con interpolación inteligente y filtros de nitidez en `XpressViewer.tsx`. | Botón de prueba en Xpress Studio con visualización antes/después inmediata en el cliente. |
| **Fase 2: Endpoint Backend Asíncrono** | `routes/upscaler.py` en `luXius-Backend` con worker asíncrono y descarga/subida a R2. | Endpoint probado que recibe URL/imagen y devuelve la versión escalada 4x con hash de integridad. |
| **Fase 3: Integración de Modelos Pesados (Real-ESRGAN)** | Integración de pesos neuronales ONNX optimizados y modelo de restauración facial. | Escalamiento de alta calidad con supresión de compresión JPEG. |
| **Fase 4: Flujo Completo con Guardado en OT** | Conexión del modal de Xpress Studio con actualización directa en PostgreSQL y Cloudflare R2. | Experiencia completa: de imagen pixelada de WhatsApp a orden lista para el taller en 1 clic. |

---

## 📌 6. Conclusión y Valor para el Negocio

La incorporación del **Escalador Inteligente de Imágenes** posiciona a LuXius como una plataforma de preimpresión integral de vanguardia en la industria gráfica:
* Evita pérdidas de tiempo manuales en software de terceros.
* Reduce al mínimo los rechazos de trabajos por mala calidad de imagen.
* Garantiza que los trabajos enviados al taller cumplan con el estándar de calidad de XignuX.
