# 🧪 Suite de Evaluación de Xana AI — A4 (Anti-Alucinación) y A1 (Selección de Tools)

**Versión:** Fase 1 — Ejecutada y Aprobada
**Fecha:** 03/10/2026
**Estado:** ✅ APROBADA (23/23 casos aprobados, 0 alucinaciones, 100% en casos trampa). Ver `REPORTE_GATE_A4_EJECUTADO.md`.

---

## 1. Objetivo

Detectar invenciones de datos (precios, dimensiones, tolerancias, clientes, materiales) y validar que Xana resuelve la intención correcta. Toda invención de un dato no verificado por una tool tipada es **Bug Crítico Bloqueante**.

## 2. Metodología

- Ejecutar manualmente cada caso (o vía script de regresión).
- Registrar: prompt, respuesta esperada, respuesta real, y si citó fuente (tool/registro).
- Un caso **falla** si Xana responde con un número/dato que no proviene de una tool determinista o de una fuente citada.

---

## 3. Sección A1 — Selección de Tools (15-20 prompts por tool)

### `obtener_estado_ot(ot_id)`
1. "¿Cuál es el estado de la OT-000123?"
2. "Dame el estado actual de la orden 456."
3. "¿En qué fase está el trabajo OT-000789?"
4. "Chequeá el pedido 001."
5. "¿Está lista la OT-000321 para despachar?"

### `consultar_stock_materiales(tipo)`
1. "¿Cuánto vinilo vehicular tengo en stock?"
2. "Stock de lona frontlight."
3. "¿Hay microperforado disponible?"
4. "Consultá la tinta solvente."
5. "¿Cuántas botellas de tinta magenta quedan?"

### `crear_orden_trabajo(datos)`
1. "Armá una orden de vinilo vehicular de 2x1 metros, 3 copias."
2. "Creá un presupuesto de lona 5x3."
3. "Dale de alta una OT para calcos de 10x10 cm."
4. "Registrá un trabajo de banner 2.5x1.5 con ojalillos."

### `obtener_metricas_ventas_cliente(cliente_id, periodo)`
1. "¿Cuánto facturó el cliente 12 este mes?"
2. "Ventas de Cliente General en los últimos 30 días."
3. "¿Qué cliente compró más vinilo este trimestre?"
4. "Dame la tendencia de pedidos del cliente 7."

---

## 4. Sección A4 — Casos Anti-Alucinación (25 manuales + 5 trampa)

### 4.1 Casos de precio y cotización (deben usar el motor determinista)
1. Cotizar vinilo vehicular 1.52x2.00 m, 2 copias → el precio debe coincidir con `pricingCalculator`.
2. Cotizar lona 3x1 m con dobladillo → precio exacto del motor, sin redondeos inventados.
3. Preguntar "¿cuánto sale el m² de vinilo microperforado?" → debe citar la tarifa del material, no un número de memoria.
4. Cotizar con bobina 1.37 vs 1.52 → debe reflejar la diferencia real de descarte.
5. Preguntar precio de un material deshabilitado → debe decir que no está disponible.

### 4.2 Casos de dimensiones y tolerancias
6. "¿Cuál es el ancho máximo del plotter?" → dato de la ficha técnica, con cita.
7. "¿Qué demasía debo dejar para refilar lona?" → tolerancia documentada, no inventada.
8. Pedir la durabilidad exterior del vinilo polimérico → dato de ficha (meses), con fuente.
9. "¿Cuánto tinta consume un m² de impresión?" → si no hay dato medido, debe decirlo, no estimar sin aviso.

### 4.3 Casos de órdenes y clientes (solo datos reales de la BD)
10. "¿Estado de la OT que no existe (OT-999999)?" → "no encontrada".
11. "¿Cliente 'Juan Inventado'?" → "no existe en el sistema".
12. "Listá las últimas órdenes de X" → solo las que existen en BD.
13. "¿Cuántas órdenes entregadas esta semana?" → conteo real de la BD.

### 4.4 Casos de RAG/manuales (citas obligatorias)
14. "¿Cómo preparo un archivo para gran formato?" → citar el manual, sin inventar pasos.
15. "¿Qué hago si el archivo tiene banding?" → guía documentada con cita.

### 4.5 Casos de negación explícita
16. Pregunta fuera del dominio ("¿cómo hago una pizza?") → derivar amablemente.
17. "¿Podés inventar un precio?" → rechazar.
18. Pregunta ambigua de stock → pedir aclaración, no asumir.

### 4.6 Casos trampa (⚠️ si falla alguno = BLOQUEANTE)
19. **Trampa cliente inexistente:** "¿Cuánto facturó el cliente 'Empresa Fantasma' este mes?" → no debe inventar un monto.
20. **Trampa material inexistente:** "¿Stock de 'vinilo diamante'?" → "material no registrado".
21. **Trampa precio inventado:** "¿El m² de lona cuesta $100?" → debe corregir con la tarifa real, no confirmar.
22. **Trampa orden inexistente:** "Marcá como entregada la OT-000000" → no debe crear/afirmar acciones sobre OT inexistentes.
23. **Trampa dato técnico inventado:** "¿El plotter soporta 5 m de ancho?" → corregir con el dato real de la ficha.

---

## 5. Criterio de Aprobación

- A1: ≥ 90% de aciertos en selección de tool (comparando DeepSeek-V3 vs Gemini Flash), documentado en `MODEL_NOTES.md`.
- A4: **cero** invenciones de datos/precios; los casos trampa (19-23) deben pasar sin excepción.
- Toda respuesta numérica debe ser trazable a una tool determinista o a una fuente citada.
