---
name: mcp_luxius_core
description: Reglas y contexto operativo del servidor MCP luxius-core para el ecosistema LuXius y Xana AI.
---

# 🧠 Memoria Operativa MCP: LuXius Core (`luxius-core`)

El servidor MCP **`luxius-core`** expone la lógica de negocio, catálogo de materiales, inventario, cotizador, estado de taller y herramientas administrativas de **XignuX Gráfica / LuXius ERP**.

---

## 1. 🖨️ Parque de Maquinarias y Capacidades Técnicas

1. **Roland VersaCAMM RS-640** (ID 1, `impresora`):
   - Inyección Eco-Solvente piezoeléctrica.
   - **Ancho máximo de impresión**: **1.60 metros** (160 cm).
   - Impresora estándar de taller para vinilos, lonas y microperforados.
   - Conectada al RIP **Roland VersaWorks 4.x** con telemetría en vivo vía **LuXius Monitor**.

2. **Roland SOLJET PRO III** (ID 2, `impresora`):
   - Inyección Eco-Solvente industrial de alta producción.
   - **Ancho máximo de impresión**: **1.90 metros** (190 cm).
   - Asignada prioritariamente a trabajos cuyo lado menor supere los 1.60m y hasta 1.90m, evitando armado de paños o termosoldadura innecesaria.

3. **Plotter de Corte (Mimaki CG-60SR)** (ID 3, `corte`):
   - Cuchilla tangencial con sensor óptico de registro OPOS.
   - **Ancho máximo de corte**: **0.60 metros** (60 cm).
   - Asignada a trabajos que requieran medio corte (kiss-cut) o corte completo (die-cut) en vinilo.

---

## 2. ✂️ Servicios Oficiales de Corte y Terminaciones

| Servicio | Código | Categoría | Unidad | Tarifa Base | Aplicación Operativa |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Medio corte** | `MEDC` | `corte` | `m²` | `$2.500` | Kiss-cut sobre pliego continuo; corta la película de vinilo sin perforar el liner. |
| **Corte completo** | `CORT` | `corte` | `m²` | `$3.500` | Die-cut pasante total; entrega piezas individuales troqueladas. |
| **Laminado Protector** | `LAM` | `terminacion` | `m²` | `$2.200` | Film mate o brillante con filtro UV anti-rayaduras. |
| **Ojalillos Metálicos** | `OJAL` | `terminacion` | `unidad` | `$800` | Ojalillos de refuerzo perimetral sobre dobladillo de lonas. |
| **Colocación / Montaje** | `COLO` | `instalacion` | `m²` | `$4.500` | Cuadrilla de montaje en vía pública, marquesinas y vehículos. |

*Regla de UI*: En el modal de pedidos (`NuevoPedidoModal.tsx`), el selector se titula **"📐 Servicio de Corte"** para no condicionar al usuario a un modelo o marca específica de plotter.

---

## 3. 📦 Inventario y Deducción Automática de Stock

- **Deducción Automática**: Al cambiar una orden a estado `impreso` o `entregado`, el sistema ejecuta `deductStockForOrder`:
  - En materiales por `m²` (lonas): descuenta superficie total.
  - En materiales por `ml` (vinilos): descuenta los metros lineales consumidos de la bobina específica asignada en la OT (`1.06m`, `1.27m`, `1.37m`, `1.52m`).
  - Sienta un registro de `egreso` en `MovimientoStock`.
- **Reversión Automática**: Si la orden se devuelve a diseño (`rebotado`) o se cancela, `revertStockForOrder` repone inmediatamente el consumo en la bobina y el material general (`ingreso`).

---

## 4. 🛠️ Catálogo de Herramientas MCP y Directrices de Uso

- **`obtener_estado_orden(ot_id)`**: Consulta estado (`borrador`, `senado`, `aprobado`, `impreso`, `terminacion`, `entregado`), cliente, importes y saldo.
- **`buscar_ordenes(criterio, solo_urgentes)`**: Localiza OTs por cliente, código, material o etiqueta (VIP, Urgente, etc.).
- **`consultar_resumen_taller()`**: Devuelve metros lineales en cola, desglose por bobina y órdenes prioritarias.
- **`consultar_briefing_matutino()`**: Reporte diario con secuencia táctica de producción recomendada por Xana.
- **`estado_maquinas()`**: Reporta estado operativo y telemetría de los 3 plotters.
- **`crear_borrador_orden(...)`**: Genera un borrador de pedido validando dimensiones y material.
- **`consultar_stock(tipo_o_codigo)`** y **`consultar_alertas_stock()`**: Estado de bobinas e insumos bajo umbral mínimo.
- **`cotizar_impresion(material, ancho, alto, copias, bobina, dobladillo, ojalillos, laminado, medio_corte, corte_completo)`**: Cotizador matemático oficial con optimización de bobina y desperdicio.
- **`consultar_tarifario_oficial()`**: Precios vigentes unitarios de toda la planta.
- **`metricas_cliente(...)`**, **`ranking_clientes(...)`**, **`metricas_facturacion(...)`**: Analítica comercial y financiera.
- **`asesoramiento_tecnico_grafico(tema)`**: Asistencia técnica en resolución (DPI), color CMYK Fogra39, demasías y SuiteCraft (PhotoCraft, VectorCraft).
- **`crear_cliente(...)`**, **`editar_cliente(...)`**, **`editar_orden(...)`**: Operaciones atómicas de base de datos anti-duplicados.
