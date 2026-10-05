# 📘 Roadmap Estratégico & Metodología: Manual Operativo LuXius (XignuX)

**Versión:** 1.0 — Arquitectura Documental y Procedimientos SOP  
**Fecha:** 05 de Octubre, 2026  
**Propósito:** Especificación integral para la redacción, organización, señalización visual y despliegue del manual de usuario y procedimientos operativos estandarizados del ecosistema LuXius, con doble propósito: capacitación humana y base de conocimiento RAG para Xana IA.

---

## 🏛️ 1. Visión y Doble Propósito

El Manual Operativo de LuXius no es un documento pasivo tradicional; está concebido como una **herramienta viva de producción** con doble impacto:

1. **Para el Equipo Humano (SOP Industrial):**
   * Reduce la curva de aprendizaje de nuevos vendedores, diseñadores y maquinistas.
   * Estandariza la operatoria diaria eliminando discrepancias en medidas, cotizaciones, sangrías y asignación de bobinas.
   * Proporciona referencias visuales instantáneas (capturas señalizadas paso a paso) para resolver dudas en menos de 10 segundos.

2. **Para la Inteligencia Artificial (Cerebro RAG de Xana):**
   * Cada sección redactada en Markdown con títulos jerárquicos se indexa directamente en `xana_knowledge.py` y `DEFAULT_XANA_DATA`.
   * Permite que el bot de Telegram (`@LuXius_Taller_Bot`) y el chat web respondan dudas técnicas con citas exactas al manual (`RAG:manual_nesting_studio.md`).

---

## 📐 2. Plantilla Estandarizada por Función (Estructura de 5 Apartados)

Cada herramienta, pantalla o proceso crítico del sistema contará con su propia ficha estructurada de forma uniforme:

```markdown
### [Módulo] — [Nombre de la Función / Pantalla]

#### 1. Propósito
Explicación concisa (1 o 2 oraciones) de qué necesidad resuelve la herramienta y su impacto en el taller.

#### 2. Requisitos Previos y Permisos
* Rol de usuario requerido (Vendedor, Diseñador, Operario, Administrador).
* Estado de la orden necesario (ej: `diseno`, `orden`, `impreso`).
* Datos obligatorios antes de iniciar (ej: cliente seleccionado, archivo gráfico adjunto).

#### 3. Instrucciones Paso a Paso
1. En [menú / pantalla], haga clic en **[Botón o Enlace]** *(ver Imagen X)*.
2. Complete o seleccione los campos correspondientes:
   * **[Campo A]:** Explicación del dato.
   * **[Campo B]:** Explicación del dato.
3. Haga clic en **[Guardar / Confirmar / Aplicar]**.

#### 4. Resultado Esperado
Descripción exacta del cambio observable en la interfaz (mensaje verde de éxito, cambio de color de la OT, recálculo de metros lineales o generación de comprobante).

#### 5. Resolución de Anomalías y Casos Frecuentes
* *¿Qué hacer si [situación A]?* Acción correctora recomendada.
* *¿Qué hacer si [situación B]?* Acción correctora recomendada.
```

---

## 🗺️ 3. Estructura Modular por Estaciones de Trabajo (Cadena de Valor)

Para facilitar la consulta rápida de cada perfil sin sobrecargar con información irrelevante, el contenido se organizará por roles operativos:

### Módulo 1: Acceso, Navegación y Perfiles
* 1.1 Inicio de sesión, roles (Admin, Vendedor, Diseñador, Taller) y cambio de contraseña.
* 1.2 Estructura del Dashboard general y atajos de teclado.

### Módulo 2: Mostrador, Carga de Pedidos y Cotización (Ventas)
* 2.1 Carga rápida de presupuestos y pedidos (`NuevoPedidoModal`).
* 2.2 Cotización automática por $m^2$ vs metros lineales ($ml$).
* 2.3 Importación Inteligente Smart Order (WeTransfer, Google Drive, descompresión ZIP).
* 2.4 Detección heurística de escala 1:10 y validación de medidas con el cliente.
* 2.5 Gestión de señas, pagos pendientes y registro de comprobantes.

### Módulo 3: Preimpresión y Diseño (Xpress Studio)
* 3.1 Visor interactivo y semáforo DPI 1:1 físico (>150 DPI Óptimo, 72–150 Gigantografía, <72 Crítico).
* 3.2 Calibrador visual de demasías y sangrado (vinilo 2cm, bastidor 5cm, bolsillo lona 10cm).
* 3.3 Simulador de virado solvente CMYK (perfiles de color en PVC/vinilo).
* 3.4 Escalador neuronal de imágenes con IA (GPU Vulkan 4x para artes de baja resolución).
* 3.5 Redrawer Studio (vectorizado automático, reemplazo directo en la OT y pase a taller).

### Módulo 4: Taller y Planificación (Nesting 2D & Lotes)
* 4.1 Reglas oficiales de bobina de taller: Bobina 1.50m física 1.52m (útil 1.515m) vs Bobina 1.37m (útil 1.365m).
* 4.2 Selección múltiple y apertura de `Nesting Studio 2D`.
* 4.3 Gestión interactiva de copias por pieza en tiempo real `[-] [N] [+]`.
* 4.4 Interpretación del plano de imposición: nombres de archivo, copias `(1/N)` y cotas métricas centradas.
* 4.5 Ajustes de separación de corte (gap), rotación 90° y marcas perimetrales.
* 4.6 Unificación de lotes (`mergeOrdersIntoBatch`) y exportación del plano PNG de alta resolución.

### Módulo 5: Producción, Cola de Impresión y Stock
* 5.1 Cola de impresión en taller: filtros de estados y asignación a plotters.
* 5.2 Control de stock de rollos: consumo estimado vs real y previsión de reposición.
* 5.3 Gestión de alertas por falta de material o quiebre de stock.

### Módulo 6: Post-Impresión, Despacho y Entrega
* 6.1 Cambio de estado a `impreso`, `post` (terminaciones) y `completo`.
* 6.2 Generación de etiquetas de producción con código QR / OT para bultos.
* 6.3 Entrega al cliente y liquidación final de saldos.

### Módulo 7: Administración y Configuración
* 7.1 Gestión de clientes (ABM, listas de precios especiales y cuentas corrientes).
* 7.2 Tarifario oficial de materiales, tintas y mano de obra.
* 7.3 Reportes de facturación, métricas de taller y auditoría del sistema.

### Módulo 8: Asistente Xana IA y Canal Telegram
* 8.1 Uso del bot oficial `@LuXius_Taller_Bot` (comandos `/status`, `/taller`, `/briefing`, `/alertas`).
* 8.2 Creación de tareas y recordatorios mediante notas de voz multimodales.
* 8.3 Consultas técnicas al router determinista y base de conocimiento.

---

## 📸 4. Estándar Visual para Capturas de Pantalla

La claridad visual es prioritaria para que el manual sea efectivo:

1. **Recorte con Enfoque:**
   * Evitar capturas de pantalla completa cuando sólo se explica un modal o un botón.
   * Recortar el componente exacto con un margen contextual de 20-30 px alrededor.

2. **Señalización Estandarizada:**
   * **Recuadros Rojos (`#ef4444`, grosor 2px):** Para campos obligatorios o botones de acción principal.
   * **Flechas Indicadoras:** Para indicar secuencias de clics (Paso 1 $\rightarrow$ Paso 2).
   * **Badges Numéricos Circulares `(1)`, `(2)`, `(3)`:** Cuando un formulario requiere llenar datos en orden.

3. **Nomenclatura Uniforme de Archivos:**
   ```
   docs/images/manual/[modulo]_[pantalla]_[paso].png
   ```
   * *Ejemplo:* `docs/images/manual/nesting_imposicion_copias_paso02.png`

4. **Referencia Cruzada en Texto:**
   * Todo paso clave debe citar su imagen: *"Haga clic en el botón **📐 Nesting Studio** (ver Imagen 4.2)"*.
   * Pie de foto obligatorio: `*Imagen 4.2: Barra de herramientas con las órdenes seleccionadas y acceso a Nesting Studio.*`

---

## 💻 5. Integración In-App ("Ayuda Contextual")

Para evitar que el manual quede archivado en una carpeta externa sin uso:

1. **Botón `❓ Ayuda` en Toolbars:**
   * En la barra de herramientas de `Entrada.tsx`, `XpressViewer.tsx` y `NestingStudioModal.tsx`, se habilitará un botón discreto de ayuda contextual.
2. **Drawer Lateral Renderizado en Markdown:**
   * Al hacer clic, se abre un panel lateral deslizable que renderiza directamente la sección correspondiente del manual con sus capturas y pasos, sin necesidad de salir del flujo de trabajo actual ni abrir otra pestaña.

---

## 🗓️ 6. Plan de Ejecución y Cronograma Sugerido

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ETAPA 1: Estructura y Carpeta Base (`docs/manual/`)                                         │
│ • Crear índice maestro y plantillas Markdown.                                               │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ ETAPA 2: Módulos Críticos de Taller (Nesting Studio + Preimpresión Xpress Studio)          │
│ • Redactar guías de Nesting 2D, bobinas de 1.50m/1.37m, copias y exportación PNG.            │
│ • Redactar guías de Xpress Viewer (DPI, sangrado, escalador IA).                            │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ ETAPA 3: Módulos de Ventas y Administración (Entrada, Cotizaciones, ABM y Reportes)         │
│ • Redactar flujo de carga de pedidos, señas y facturación.                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ ETAPA 4: Integración RAG en Xana + Botón In-App en LuXius Web                              │
│ • Cargar archivos en el servicio de conocimiento de Xana.                                   │
│ • Habilitar botón de ayuda contextual `❓` en el frontend.                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```
