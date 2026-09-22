# 🗺️ Roadmap de Producción: Xana Smart Orders, Google Drive Vault & Hot Folder RIP

**Fecha de Creación:** 01 de Septiembre, 2026  
**Sistema:** LuXius System - XignuX  
**Estado:** Planificado para Ejecución  

---

## 📌 Resumen Ejecutivo

Este roadmap detalla la implementación de 3 capacidades de alto impacto para automatizar el flujo operativo desde la recepción de archivos hasta la impresión física en taller:

```
[1. ENTRADA INTELIGENTE]          [2. RESPALDO Y BÓVEDA]          [3. TALLER / RIP]
  Xana Smart Orders                 R2 ↔ Google Drive              Daemon Hot Folder
  Link WeTransfer / Drive           Backup nocturno automático     Descarga automática a RIP
  Análisis de medidas y cotización  Jerarquía por cliente/año      Nomenclatura estandarizada
```

---

## 🤖 MÓDULO 1: Creación Inteligente de Pedidos con Xana AI

### Objetivo
Permitir que un vendedor u operario pegue un link de **WeTransfer**, **Google Drive** o suba archivos directamente al chat de Xana, y que Xana extraiga los archivos, lea medidas y DPI, calcule costos y genere la orden lista para confirmar siguiendo exactamente la lógica de `NuevoPedidoModal.tsx`.

### Hitos de Implementación (Fase 1)

#### 1.1 Ingesta y Descompresión Cloud (`routes/cloud_import.py`)
- [ ] Conectar el endpoint `/api/cloud-import` con soporte para:
  - Links directos y cortos de WeTransfer (`we.tl/...` y `wetransfer.com/downloads/...`).
  - Enlaces de archivos y carpetas de Google Drive (`drive.google.com/drive/folders/...` y `/file/d/...`).
  - Descompresión automática de archivos `.zip` y `.rar` en buffer de memoria o carpeta temporal.
- [ ] Subida paralela automática de los archivos extraídos a **Cloudflare R2** (`luxius-media/uploads/`).

#### 1.2 Extracción Técnica de Metadata
- [ ] Extracción de dimensiones físicas exactas (ancho y alto en cm) mediante `Pillow` y `pypdfium2`.
- [ ] Lectura de resolución (DPI) y espacio de color (`CMYK` vs `RGB`).
- [ ] Generación automática de miniaturas web (`thumbnailUrl`) para preview instantánea en el chat.

#### 1.3 Motor de Cotización y Lógica de Negocio (Igual a `NuevoPedidoModal`)
- [ ] Detección inteligente de cliente por texto o coincidencia difusa (ej: *"Axis"*, *"MaderHaus"*).
- [ ] Algoritmo de selección de bobina óptima (ej: compara bobinas de 1.00m, 1.37m, 1.52m y minimiza descarte).
- [ ] Cálculo de metros lineales (ml), consumo, demasías y servicios adicionales (troquelado, corte, ojalillado).
- [ ] Aplicación de tarifas personalizadas del cliente según lista de precios en Neon PostgreSQL.

#### 1.4 Interfaz de Confirmación en Xana Chat (`XanaAssistant.tsx`)
- [ ] Renderizado de Tarjeta Interactiva de Pedido con:
  - Miniaturas de cada imagen.
  - Tabla de medidas, copias y bobina asignada.
  - Precio total desglosado.
  - Botón verde **`[ ✅ Confirmar y Mandar a Producción ]`** (guarda directo en BD).
  - Botón azul **`[ ✏️ Abrir en Modal de Edición ]`** (precarga los datos en `NuevoPedidoModal` para ajustes manuales).

---

## ☁️ MÓDULO 2: Bóveda de Respaldo Histórico en Google Drive (R2 ↔ Drive)

### Objetivo
Mantener **Cloudflare R2** como almacenamiento primario de ultra alta velocidad para la web y la app móvil, mientras **Google Drive** actúa como bóveda histórica corporativa organizada por clientes y fechas.

### Hitos de Implementación (Fase 2)

#### 2.1 Conector Google Drive Service Account
- [ ] Configuración del servicio OAuth2 / Service Account (`credentials.json` o variable de entorno `GOOGLE_SERVICE_ACCOUNT_JSON`).
- [ ] Verificación de permisos de escritura sobre la carpeta raíz de Google Drive de la empresa.

#### 2.2 Jerarquía Automática de Bóveda
- [ ] Creación programática de carpetas anidadas:
  ```
  📁 LuXius Bóveda
    └── 📁 2026
        └── 📁 09-Septiembre
            └── 📁 AXIS
                └── 📁 OT-AA559B46_Mader_Hilux
                    ├── 1788229090158_mader_hilux_techo.jpg
                    ├── 1788229057508_mader_hilux_capot.jpg
                    └── Ficha_Presupuesto_OT-AA559B46.pdf
  ```

#### 2.3 Automatización y Políticas de Ciclo de Vida
- [ ] Endpoint `/api/sync/drive-backup` para disparo manual o webhook.
- [ ] Tarea programada (Cron Job diario a las 02:00 AM) para sincronizar órdenes del día.
- [ ] Enlace cruzado en base de datos: registrar el `drive_file_id` y `drive_folder_url` en la tabla `presupuestos` de PostgreSQL.

---

## 🖨️ MÓDULO 3: Daemon de Taller & Integración Hot Folder RIP

### Objetivo
Eliminar por completo las descargas manuales y el renombrado de archivos en el taller de impresión. Cuando una orden entra a estado "Impresión", el archivo se descarga automáticamente en la carpeta que monitorea el software RIP (**PhotoPrint, VersaWorks, Flexi, Onyx**).

### Hitos de Implementación (Fase 3)

#### 3.1 Daemon de Taller Local (`server/daemon/`)
- [ ] Script ligero en Python (`luxius_rip_daemon.py`) ejecutable como servicio de Windows o al iniciar sesión en la PC del taller.
- [ ] Configuración en archivo `daemon_config.json`:
  - `HOT_FOLDER_PATH`: Ruta local (ej: `C:\RIP_HotFolder\` o `D:\VersaWorks\Input\`).
  - `API_BASE_URL`: `https://luxius-backend.onrender.com/api` (o IP local).
  - `POLL_INTERVAL_SECONDS`: Intervalo de escucha (ej: 10 segundos).
  - `AUTO_DELETE_AFTER_RIP`: Opcional tras ser procesado por el RIP.

#### 3.2 Nomenclatura de Producción 100% Estandarizada
- [ ] El Daemon descarga el archivo directamente desde Cloudflare R2 con el formato exacto:
  `OT-[ID]_[COPIAS]x_[MATERIAL]_[CALIDAD]_[ANCHO]x[ALTO] --- [NOMBRE_ORIGINAL].[EXT]`
  *Ejemplo:* `OT-AA559B46_x2_VV_ECO_1.310x1.150 --- mader hilux techo.jpg`

#### 3.3 Feedback de Estado Bidireccional
- [ ] El Daemon notifica al backend cuando el archivo fue descargado con éxito en el RIP.
- [ ] En el panel de LuXius, la tarjeta de la orden muestra el indicador verde: `📥 En cola de RIP`.

---

## 🗓️ Cronograma y Orden de Ejecución Sugerido

| Orden | Módulo | Duración Estimada | Entregable Principal |
| :---: | :--- | :---: | :--- |
| **Paso 1** | **Xana Smart Orders** (WeTransfer / Drive / Chat) | Inmediato | Poder enviar un link en el chat de Xana y que devuelva la orden calculada con tarjeta de confirmación. |
| **Paso 2** | **Google Drive Vault Backup** | Siguiente | Jerarquía `/Año/Mes/Cliente/` creada y sincronizada automáticamente en Google Drive. |
| **Paso 3** | **Daemon Hot Folder RIP** | Final | Instalador/script para la PC del taller que descarga automáticamente los archivos al RIP. |

---

> 💡 **Nota:** Este documento queda registrado en el repositorio como guía maestra de implementación técnica para Antigravity y Xana.
