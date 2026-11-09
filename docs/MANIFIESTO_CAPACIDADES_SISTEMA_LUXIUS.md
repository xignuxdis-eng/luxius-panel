# 📘 MANIFIESTO GENERAL DE CAPACIDADES Y ECOSISTEMA — SISTEMA LUXIUS
> **Versión del Sistema:** 1.1.0 | **Ecosistema:** LuXius Panel / Taller Gráfico Industrial XignuX  
> **Fecha de Documentación:** Noviembre 2026 | **Entorno:** Producción Cloud & Taller Local  

---

## 🌐 1. Resumen Ejecutivo y Arquitectura Global

**LuXius System** es un ERP y entorno operativo industrial concebido específicamente para la gestión de talleres de **impresión digital de gran formato, rotulación, corte vectorial y cartelería publicitaria**. Integra en una única plataforma en la nube la recepción de archivos gráficos, análisis pre-prensa forense, cotización milimétrica, control de plotters de impresión, stock de bobinas y tintas, conciliación financiera, asistente de inteligencia artificial y herramientas de productividad para el equipo de trabajo.

### Componentes de la Arquitectura
```
                      ┌────────────────────────────────────────────────────────┐
                      │                 LUXIUS PANEL (Frontend)                │
                      │  React 18 + Vite + TS + Pixi.js + Nostalgist (WASM)    │
                      └───────────────────────────┬────────────────────────────┘
                                                  │
                      ┌───────────────────────────┴────────────────────────────┐
                      ▼                                                        ▼
         ┌─────────────────────────┐                              ┌─────────────────────────┐
         │     SUPABASE CLOUD      │                              │     LUXIUS BACKEND      │
         │ PostgreSQL Session Pool │                              │   Python / Flask API    │
         │ Autenticación & Datos   │                              │ Render Web Service      │
         └────────────┬────────────┘                              └────────────┬────────────┘
                      │                                                        │
                      ▼                                                        ▼
         ┌─────────────────────────┐                              ┌─────────────────────────┐
         │     XIGNUX MONITOR      │                              │     GOOGLE DRIVE &      │
         │  PC Taller / VersaWorks │                              │      TELEGRAM BOT       │
         │  Telemetría en Vivo     │                              │ Alertas & Backup Cloud  │
         └─────────────────────────┘                              └─────────────────────────┘
```

---

## 🧭 2. Desglose Módulo por Módulo y Capacidades Operativas

---

### 🖥️ Módulo 1: Dashboard Principal & Print Den (Workshop 2.5D)
**Ruta:** `/` | **Acceso:** Todos los roles con vista personalizada según permisos

El corazón operativo visual del sistema. Combina el estado general del negocio con una representación gráfica animada del taller en tiempo real.

- **Print Den (Motor Isométrico Pixi.js 2.5D)**:
  - Renderizado acelerado por WebGL del piso del taller con estaciones de trabajo: Plotters Roland (RS-640, SolJet Pro III), Plotter de Corte, Mesa de Despacho y Puesto de Diseño.
  - **Telemetría viva de Roland VersaWorks**: el plotter detecta si el software RIP está imprimiendo, activando el movimiento del carro, LED azul parpadeante y HUD superior con el nombre del archivo, medidas y consumo de tinta CMYK en tiempo real.
  - **Simulación ambiental viva**: operarios trabajando con estados de ánimo, mascota del taller interactiva con sonidos, clima del taller sincronizado e iluminación ambiental según la hora del día.
  - **Radio de Taller / Audio Bus**: reproductor de audio integrado con sintonizador de emisoras lo-fi y efectos de sonido de taller retro.
- **Calendario Interactivo de Entregas**:
  - Vista mensual y semanal de pedidos ordenados por fecha límite de entrega con código de colores según urgencia y estado.
  - Modal interactivo de detalles del día para visualizar qué trabajos deben salir en cada turno.
- **Quick Notes (Notas Rápidas de Taller)**:
  - Pizarrón digital sincronizado para dejar avisos rápidos entre turnos (mañana/tarde).
- **Indicadores Clave (KPIs)**:
  - Metraje total impreso en el día ($m^2$ y $ml$).
  - Trabajos en cola de espera, demorados o con alertas de material.

---

### 📦 Módulo 2: Mesa de Entrada de Pedidos (Workflow Kanban & Master Batch)
**Ruta:** `/entrada` | **Acceso:** Admin, Vendedor, Diseñador, Taller

Módulo neurálgico de recepción, preflight y despacho de trabajos a producción.

- **Ciclo de Vida de la Orden de Trabajo (OT-XXXXX)**:
  - Estados formales: `pendiente` ➔ `diseno` ➔ `orden` (listo para imprimir) ➔ `imprimiendo` ➔ `impreso` ➔ `terminado` ➔ `entregado` (o `anulado`).
- **Analizador Inteligente de Archivos (Metadata Parser)**:
  - Al arrastrar un archivo gráfico (PDF, TIFF, JPG, PNG, EPS), extrae al instante:
    * Dimensiones físicas exactas en centímetros y metros.
    * Resolución nativa en DPI (con advertencia si es menor a 150 DPI).
    * Modo de color (RGB o CMYK con alerta de conversión requerida).
    * Generación de miniatura de alta fidelidad.
- **Motor de Nesting Inteligente en Vinilo Vehicular ($\le 2.90$ m)**:
  - Algoritmo que agrupa pedidos de Vinilo Vehicular de igual ancho ($\le 1.515$ m) cuya suma longitudinal sea $\le 2.90$ m para unificar paños y minimizar el desperdicio del rollo de laminado protector.
- **Modo Lote (Batch Master & Floating Dock)**:
  - Carga masiva de múltiples archivos para un mismo cliente o clientes varios.
  - Aplicación global de escalas (`1:1`, `1:10`, `1:20`), materiales y copias con un solo clic.
  - Barra flotante de acciones masivas (cambiar estado, asignar impresor, exportar remito consolidado).
- **Control de Facturación y Saldos en Orden**:
  - Registro de seña, saldo pendiente, condición de cobro (Efectivo, Transferencia, Cheque, Cta Cte) y comprobante adjunto.
- **Exportación e Impresión de Documentación**:
  - Emisión de Comprobante / Remito de Taller con código de barras y QR para escaneo rápido en mesa de corte o entrega.

---

### 💰 Módulo 3: Presupuestador Inteligente (Cotizador Oficial)
**Ruta:** `/presupuestador` | **Acceso:** Admin, Vendedor

Calculadora comercial de alta precisión diseñada bajo las reglas de la industria gráfica.

- **Discriminación Estricta de Modalidad: Metro Cuadrado ($m^2$) vs Metro Lineal ($ml$)**:
  - **Cobro en $m^2$**: calcula la superficie real neta de la pieza ($\text{ancho} \times \text{alto} \times \text{copias}$) independientemente de la bobina.
  - **Cobro en $ml$**: calcula el avance lineal que consumirá la bobina en máquina, vinculando el precio al ancho exacto del rollo seleccionado (ej. 1.00m, 1.37m, 1.52m, 1.60m).
- **Precios Especiales por Cliente Integrados**:
  - Reconocimiento automático de acuerdos de precios preferenciales fijados por cliente:
    * Precios especiales en $m^2$ (válidos para cualquier rollo).
    * Precios especiales en $ml$ para bobinas específicas o para todos los anchos.
- **Servicios de Terminación y Adicionales**:
  - Inclusión de laminados (brillante, mate, vehicular), ojales metálicos, cortes por contorno, pegado en placas rígidas (PVC espumado, Corrugado, Polifan) e instalación en obra.
- **Presupuestos Formales en PDF**:
  - Generación de cotización membretada con validez comercial, desglose de ítems, condiciones de pago, tiempo estimado y botón de **"Aprobar y Crear Orden"** directa.

---

### 🎨 Módulo 4: Xpress Viewer & LuXius Studio (Suite Gráfica CAD)
**Rutas:** `/xpress-viewer` y `/luxius-studio` | **Acceso:** Admin, Diseñador, Taller

Suite de herramientas gráficas avanzadas en navegador para el departamento de arte y pre-prensa.

- **Prepress Inspector**:
  - Inspección técnica profunda de archivos vectoriales y rasterizados antes de enviar al RIP.
  - Detección de fuentes no incrustadas, sangrías faltantes, líneas finas y perfiles ICC.
- **PrintSheeter Studio**:
  - Generador de mosaicos (tiling) para gigantografías que superan el ancho del plotter, calculando solapes de 1.5 cm a 3 cm con guías de alineación para colocadores.
- **SuiteCraft**:
  - Editor vectorial ligero para crear líneas de corte (`CutContour`) sobre imágenes, demasías de corte y sangrías de seguridad para calcomanías.
- **Upscaler Studio**:
  - Ampliador y restaurador de imágenes de baja resolución mediante algoritmos de interpolación inteligente para reducir el pixelado en impresiones de gran escala.

---

### ✏️ Módulo 5: Estación de Diseño (Control de Arte & WhatsApp)
**Ruta:** `/diseno` | **Acceso:** Admin, Diseñador

Bandeja de trabajo especializada para los diseñadores del taller.

- **Cola de Archivos Pendientes de Revisión**:
  - Vista de fichas con miniaturas gigantes para corroborar proporción y legibilidad.
- **Flujo de Rechazo Asistido**:
  - Si un archivo no cumple requisitos técnicos (está en baja resolución, no tiene demasía o el texto no está en curvas), el diseñador puede rechazarlo con un clic.
  - Generación automática de mensaje profesional listo para enviar por WhatsApp al cliente explicándole qué debe corregir.
- **Pase a Producción**:
  - Con un clic se marca como "Aprobado para Impresión", pasando automáticamente a la cola del plotter.

---

### 🖨️ Módulo 6: Centro de Impresión & Producción
**Ruta:** `/impresion` | **Acceso:** Admin, Impresor, Taller

Panel de control para los maquinistas y operarios de impresión.

- **Monitoreo de Colas por Equipo**:
  - Separación por máquina física: Roland RS-640 (Solvente/Eco-solvente), Roland SolJet Pro III, Plotter de Corte Mimaki/Graphtec.
- **Telemetría y Control de Tinta en Vivo**:
  - Integración bidireccional con **XignuX Monitor V2.6** en la PC del taller.
  - Reporte de consumos reales acumulados en mililitros de tintas CMYK y m² impresos por turno.
- **Finalización de Trabajos**:
  - Marcado de OT como `impreso`, lo que dispara automáticamente el descuento de stock de la bobina correspondiente.

---

### 📊 Módulo 7: Gestión de Stock de Insumos & Almacén
**Ruta:** `/stock` | **Acceso:** Admin, Taller

Control milimétrico del inventario físico y del consumo proyectado.

- **Inventario de Bobinas y Metrajes**:
  - Control de stock por material (Vinilo Promocional, Base Gris, Microperforado, Lona Front, Lona Blackout, Papel Fotográfico, etc.) discriminado por ancho de rollo (1.00m, 1.37m, 1.52m, 1.60m).
- **Pronóstico de Consumo Dinámico (`evaluateOrderStock`)**:
  - Monitorea todas las órdenes activas en cola y calcula si el metraje disponible en taller alcanzará para cubrir la producción.
  - Alertas automáticas de faltante o reposición crítica con semáforo de colores.
- **Exclusión Inteligente de Órdenes Terminales**:
  - Las órdenes entregadas o anuladas se excluyen automáticamente para evitar falsos consumos.

---

### 📈 Módulo 8: Analíticas, Finanzas & Conciliación Bancaria
**Ruta:** `/analiticas` | **Acceso:** Admin

Centro de inteligencia de negocios y salud financiera del taller.

- **Facturación y Ventas**:
  - Evolución de facturación mensual, semanal y comparativa interanual.
  - Desglose de ventas por material más vendido, cliente de mayor volumen y rendimiento por vendedor.
- **Conciliación de Cuentas y Cajas**:
  - Arqueo de caja chica diaria y registro de egresos operativos (compras de insumos, fletes, viáticos).
  - Conciliación de movimientos bancarios contra órdenes registradas.
- **Cuentas por Cobrar**:
  - Reporte consolidado de deuda en la calle con días de atraso y saldo pendiente por cliente.

---

### 🛠️ Módulo 9: Herramientas de Taller & Productividad Gráfica
**Ruta:** `/utilidades` | **Acceso:** Admin, Diseñador, Vendedor, Taller

Caja de herramientas utilitarias para agilizar el trabajo diario sin recurrir a software externo.

- **Calculadora de Imposición de Planchas y Calcomanías**:
  - Calcula la cantidad exacta de etiquetas o stickers que caben en pliegos estándar (`A4`, `A3`, `SRA3`, `1 m²`) o a lo ancho de bobinas (`1.37 m`, `1.52 m`).
  - Compara automáticamente la orientación normal ($0^\circ$) frente a la rotada ($90^\circ$) considerando separación de corte y márgenes de pinza para elegir la opción de menor desperdicio.
- **Conversor Gráfico Universal**:
  - Conversión instantánea entre milímetros, centímetros, metros, pulgadas, puntos tipográficos y píxeles en base a una resolución determinada (DPI).
- **Calculadora de Peso y Diámetro de Bobinas**:
  - Estimación de peso en kg y diámetro restante del rollo para transporte y logística.

---

### 🤖 Módulo 10: Xana AI Assistant & Smart Order v2.0
**Ruta:** `/xana` (y widget flotante permanente) | **Acceso:** Todos los roles (según permisos RBAC)

Asistente de Inteligencia Artificial especializado en la industria gráfica gráfica argentina.

- **Smart Order v2.0 (Ingesta Inteligente de Enlaces)**:
  - Al pegar enlaces de **Google Drive** o **WeTransfer**, Xana descarga y analiza los archivos directamente en el navegador o backend:
    * Valida cabeceras para rechazar páginas HTML y aceptar únicamente archivos gráficos reales.
    * Extrae dimensiones físicas en cm, DPI, espacio de color y genera una vista previa Base64 instantánea.
    * Cotiza automáticamente cada pieza con el tarifario de Supabase.
    * Permite confirmar la orden directamente o transferir los ítems a la Mesa de Entrada con clientes y medidas precargadas.
- **19 Herramientas Industriales Integradas**:
  - `consultar_briefing_ejecutivo`: reporte integral matutino con estado de cola, alertas de stock y métricas.
  - `calcular_imposicion_plancha`: cálculo exacto de calcos en pliego o rollo.
  - `analizar_oportunidades_nesting`: detección de órdenes de vinilo vehicular combinables.
  - `consultar_cuentas_por_cobrar`: balance de deudores y saldos pendientes.
  - `cotizar_impresion`, `obtener_estado_orden`, `consultar_stock`, `consultar_tarifario_oficial`.
- **Pre-Enrutador Fast-Path (<50 ms)**:
  - Comandos directos (`/taller`, `/briefing`, `/alertas`, `/deudores`, `/nesting`, `/tarifario`) que responden al instante sin latencia de red ni consumo de cuota LLM.

---

### 🏛️ Módulo 11: Administración Maestra (ABM)
**Ruta:** `/abm/*` | **Acceso:** Admin

Gestión de todas las entidades base del sistema.

- **Clientes**:
  - Ficha comercial completa: Nombre, Razón Social, CUIT/DNI, Email, Teléfono, Condición de Venta.
  - **Editor de Precios Especiales con Discriminación $m^2$ vs $ml$**: panel ampliado para asignar tarifas exclusivas a clientes clave sin colapsos visuales.
  - Generador de reportes históricos de cliente en PDF.
- **Materiales y Sustratos**:
  - Configuración de tipo de cobro base ($m^2$ o $ml$), bobinas disponibles, precio de lista, mermas de impresión y costo de reposición.
- **Máquinas & Plotters**:
  - Registro de equipos, velocidades de impresión, costo por metro y anchos máximos útiles.
- **Proveedores, Bancos, Cajas, Monedas, Servicios y Tarifas XignuX**.

---

### 📑 Módulo 12: Reportes Ejecutivos & Informes de Gestión
**Ruta:** `/reportes` | **Acceso:** Admin

Generador de informes imprimibles y exportables.

- Reportes de producción por fecha o rango de fechas.
- Informes de rentabilidad bruta y neta por trabajo.
- Exportación de listados a Excel/CSV y documentos PDF listos para imprimir.

---

### ⚙️ Módulo 13: Configuración de Plataforma & Seguridad (Sistema)
**Ruta:** `/sistema/*` | **Acceso:** Admin

Centro de administración tecnológica y auditoría.

- **Gestión de Usuarios y Roles (RBAC)**:
  - Creación de usuarios con roles estrictos: `admin`, `disenador`, `impresor`, `taller`, `vendedor`, `cliente`.
- **Log Viewer**:
  - Visor de eventos del sistema para auditar modificaciones de órdenes, borrados o cambios de precios.
- **Telegram View**:
  - Configuración del bot de notificaciones automáticas y comandos de taller.
- **Google Drive Backup**:
  - Monitoreo del estado de copias de seguridad de archivos en la nube.

---

### 📱 Módulo 14: Mobile Workshop App (Workfield Manager)
**Ruta:** `/mobile/*` | **Acceso:** Todos los roles en dispositivos móviles / PWA

Versión optimizada para uso con una sola mano en teléfonos celulares para colocadores, técnicos y operarios en planta.

- Pestañas rápidas: **Taller**, **Diseño**, **Despacho**, **Admin**.
- **Quick Order Móvil**: carga rápida de pedidos desde la cámara o galería del teléfono.
- **WhatsApp Parser**: conversor de textos de pedidos de WhatsApp en órdenes de trabajo estructuradas.

---

### 🕹️ Módulo 15: LuXius Arcade Center (Emulador SNES & Retro)
**Acceso:** Modal accesible desde la barra superior de herramientas

Espacio de entretenimiento integrado para pausas activas del equipo de trabajo.

- **Emulador Universal Super Nintendo (SNES9x WASM)**:
  - Soporte completo para chips especiales de SNES (**SA-1**, **Super FX**) ejecutado nativamente en navegador vía Nostalgist.js sin plugins ni servidores externos.
  - Descompresión en memoria de archivos comprimidos en formato `.zip` mediante JSZip.
- **Biblioteca de 14 Juegos SNES Precargados**:
  - Catálogo interactivo con carátulas, buscador, categorías y sin auto-arranque forzado.
  - Títulos incluidos: *New Super Mario World 1: The Twelve Magic Orbs (SA-1)*, *Super Mario All-Stars + World*, *Street Fighter II*, *Street Fighter II Turbo*, *Super Street Fighter II*, *Sunset Riders*, *Super Star Wars (Ep. V y VI)*, *Donkey Kong Country 1 y 3*, *Super Punch-Out!!*, *Super Bomberman 2*, *Captain Commando*, *Toy Story*.
- **Gestor de Partidas Guardadas (Save States) en IndexedDB**:
  - 3 Slots independientes por juego con almacenamiento ilimitado.
  - Capturas de pantalla en miniatura automáticas del momento exacto del guardado.
  - Backup de partidas (`.state`) descargable a la PC e importador de partidas externas.
- **Configurador Visual de Controles**:
  - Reasignación de teclas del teclado en tiempo real.
  - Soporte nativo para Joysticks y Gamepads USB / Bluetooth (Xbox, PlayStation, Switch, 8BitDo) mediante Web Gamepad API.
- **Juegos Retro Adicionales**: Pac-Man, Tetris, Galaga, Space Invaders, Bomberman, Digger, Arkanoid, Donkey Kong clásico.

---

### 🧩 Módulo 16: Widgets Flotantes Globales
Accesibles de forma permanente desde cualquier pantalla del sistema.

1. **Floating Calculator**: calculadora comercial rápida con historial de cálculos.
2. **Floating Alarm**: temporizador para control de tiempos de secado de tintas o bajadas de máquina.
3. **Floating WhatsApp**: generador rápido de mensajes con enlace directo al chat de clientes.
4. **Media Player**: reproductor de audio de taller.
5. **Server Status LED**: indicador en tiempo real de la conectividad con Supabase y el Backend de Render.

---

## 🔒 3. Resumen de Seguridad, Despliegue y Flujo de Trabajo

- **Despliegue Continuo (CI/CD)**: Publicación automatizada a **GitHub Pages** mediante **GitHub Actions** al realizar push a la rama `master`.
- **Verificación Obligatoria Pre-Deploy**: Ejecución local de `npm run verify` (Typecheck + ESLint + Vitest + Build) que garantiza 0 errores de compilación y pruebas automatizadas aprobadas.
- **Base de Datos**: PostgreSQL en **Supabase** a través de Session Pooler transaccional.
- **Memoria del Sistema**: Bitácora técnica y registro de arquitectura en `XANA_MEMORIA_SISTEMA.md`.

