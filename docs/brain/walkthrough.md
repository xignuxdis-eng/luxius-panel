# Luxius System & Xana Memory Walkthrough

## Actualizaciones Recientes y Fixes Críticos

### 1. Fix de Congelamiento en Carga de Órdenes (`ReferenceError: bestCost`)
- **Problema**: Al cargar archivos o cotizar ítems en `NuevoPedidoModal`, la aplicación se colgaba completamente.
- **Causa**: En `src/utils/pricingCalculator.ts`, `bestCost` no estaba declarado (`let bestCost = Infinity;`). En modo estricto de JS esto causaba un `ReferenceError` fatal no capturado.
- **Solución**: Se inicializó `let bestCost = Infinity;`. Ahora el optimizador de bobinas y cálculo de metros corre sin interrupciones.

### 2. Fix de Autenticación 401 en Sincronización de Servicios y Vendedores
- **Problema**: En consola aparecían errores `401 Unauthorized` al consultar `/api/servicios` y `/api/vendedores`.
- **Solución**: En `src/pages/Entrada/NuevoPedidoModal.tsx`, se incluyó la cabecera `Authorization: Bearer <token>` obtenida de la sesión activa en `localStorage`.

### 3. Fix de Paginación y Desborde en PDFs con Miniaturas
- **Problema**: Al generar PDFs o presupuestos con miniaturas de órdenes, el contenido se desbordaba y se cortaba.
- **Solución**: En `src/utils/generatePdfBudget.ts` y `src/utils/presupuestoPdf.ts`, se eliminó el forzado de `height: 297mm !important` en `@media print`, configurando `height: auto` y clases con `page-break-inside: avoid` por cada miniatura para permitir paginación fluida.

### 4. Memoria Maestra de Xana Consolidada
- Se creó **`XANA_MEMORIA_SISTEMA.md`** como documento maestro y fuente de la verdad para cualquier asistente de IA (Cursor, Windsurf, Claude Dev, Antigravity) o desarrollador.
- Se actualizaron las instrucciones de agente en `.agents/rules/xana_agent.md` y `CONTINUAR_EN_CASA.md`.

## Despliegue y Estado
- Rama `master` y `gh-pages` sincronizadas en GitHub (`https://xignuxdis-eng.github.io/luxius-panel/`).
- Servidor local Nginx sincronizado en `D:\XignuX\luxius-panel\dist\`.
