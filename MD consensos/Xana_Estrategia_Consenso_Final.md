# 📄 Documento de Estrategia, Consenso y Mitigación de Riesgos: Evolución de Xana

**Ecosistema:** XignuX / Luxius (luXius-Backend, luxius-panel, Workfield Manager)
**Estado:** Arquitectura y hoja de ruta aprobadas en consenso — Gates **A1, A2 y A4** quedan pendientes de validación empírica según el cronograma de fases detallado más abajo. Ningún gate se considera cumplido hasta que su criterio de aceptación se ejecute y se documente.
**Objetivo:** Evolución del asistente Xana hacia un agente con Function Calling, RAG de dominio gráfico y análisis de datos seguro, sobre el código existente.

---

## 🏛️ Parte 1: Principios Fundamentales de la Arquitectura

1. **Evolución sobre el motor actual (`xana_graph.py`):** Xana evolucionará el grafo `LangGraph` ya existente. No se reescribe el módulo desde cero.
2. **Monolito en Flask con Ejecución Asíncrona:** Se mantiene la arquitectura en `luXius-Backend`. Para evitar bloqueos HTTP en llamadas de LLM (3-10s), se adopta el patrón probado en `xana_smart_order.py`: despacho vía `ThreadPoolExecutor`, respuesta inmediata `202 Accepted` con `job_id` y *polling* desde el cliente.
3. **Modelo Único de Alta Velocidad (Single-Model First):** Se utiliza un solo modelo rápido (DeepSeek-V3 o Gemini Flash) como núcleo para *Function Calling* y chat interactivo. El razonamiento pesado se reserva únicamente para tareas analíticas en background. El proveedor se mantiene **configurable por variable de entorno (`.env`)**.
4. **Separación Estricta Anti-Alucinación:**
   * **Capa Estructurada (Fuentes de Verdad / Precios / Tolerancias):** Los datos paramétricos (anchos de bobina, precios por m², tolerancias) viven en tablas/JSON y se consultan exclusivamente con *Tools* tipadas deterministas (motor de precios). El LLM **nunca** calcula números ni inventa tarifas.
   * **Capa RAG / Unstructured:** Embeddings e índice liviano persistente **únicamente** para prosa, manuales de procedimiento y guías de taller. Sin dependencias pesadas (se descartan Qdrant/ChromaDB/LlamaIndex en esta etapa).
5. **Seguridad y Vistas Tipadas (No Text-to-SQL Libre):** Se prohíbe la generación de SQL ad-hoc por el LLM. En su lugar, se exponen *Tools* tipadas que ejecutan consultas parametrizadas sobre **Vistas de Solo Lectura** (`v_ventas_cliente`, `v_consumo_material`) con `busy_timeout` y límites estrictos de filas.

---

## 🛡️ Parte 2: Anexo de Puntos de Verificación, Mitigación de Riesgos y Responsabilidades

| ID | Punto de Control / Gate | Criterio de Aceptación / Salida | Fase Vinculada | Responsable / Momento |
|---|---|---|---|---|
| **A1** | **Validación Cross-Modelo** | Run de 15-20 prompts de prueba por tool. Tasa de acierto ≥ 90% en selección de tools, comparando DeepSeek-V3 vs. Gemini Flash. Documentar en `MODEL_NOTES.md`. | Gate de **salida de Fase 1** | Dev Backend / Al finalizar Fase 1 |
| **A2** | **Observabilidad y Shadow Mode** | Logging obligatorio de decisiones LLM + fallback determinista con regex + 7 días en modo *Shadow* en paralelo con el router antiguo. **Requisito previo:** medir y registrar la **línea base del router regex** sobre el mismo set de prompts al inicio del Shadow Mode (documentado en `MODEL_NOTES.md`). **El router LLM debe igualar o superar esa línea base durante el período** — alcanzar el 90% en aislamiento (A1) no alcanza por sí solo. | Requisito de **Fase 1** | Dev Backend / Durante Fase 1 |
| **A3** | **Techo de Escala RAG** | Índice plano válido mientras el corpus esté ≤ 500 docs / ≤ 5MB de texto. Instrumentar tiempo de búsqueda; si supera 300–500 ms o se excede el corpus, se abre evaluación formal de migración. | Requisito de **Fase 2** | Dev Backend / Durante Fase 2 |
| **A4** | **Evaluación Continua Anti-Alucinación** | Suite de 20-30 casos manuales + 5 casos "trampa" (clientes/materiales inexistentes). Toda invención de precio o dato no verificado por una tool es **Bug Crítico Bloqueante**. **Nota:** este gate solo es evaluable una vez que exista al menos una tool o LLM respondiendo (desde Fase 1 en adelante). En Fase 0 únicamente se redacta y prepara la suite — no hay nada de function calling o RAG todavía que pueda alucinar. | Preparación en **Fase 0** · Primer gate real evaluable en **Fase 1** · Transversal desde ahí | Liderazgo Técnico / Previo a cada deploy |
| **A5** | **Priorización Estricta Fase 0** | 1. JWT/Roles `luxius-auth-v6` (Seguridad, bloqueante) 2. Guards Anti-OOM (Estabilidad) 3. Fixes de commits en DB y regex de escala (Funcional). Criterio mínimo de salida: rol correcto por cada rol real, token presente en `/xana/chat`, y archivo > umbral no produce OOM. | Requisito de **Fase 0** | Dev Backend + Frontend / Ejecución inmediata |
| **A6** | **Budget de Latencia del Chat** | p95 del camino interactivo (función + respuesta) ≤ 3 s. Si se supera, activar estrategia de degradación (respuesta en segundo plano con polling). Instrumentar en el widget `XanaAssistant`. | Requisito de **Fase 1** | Dev Frontend + Backend / Durante Fase 1 |

---

## 🚀 Parte 3: Hoja de Ruta de Implementación (5 Fases con Gates Integrados)

### 🔹 FASE 0 — Estabilización del Núcleo (Prerrequisito Inmediato)
* **Objetivo:** Resolver deuda técnica crítica en `luXius-Backend` (backend) y `luxius-panel` (frontend). Varios fixes viven en ambos repos y deben desplegarse en secuencia.
* **Entregables (orden de A5):**
  1. Propagación de token JWT en `/xana/chat` (frontend `XanaAssistant.tsx`) y detección de roles vía `luxius-auth-v6` **con mapeo de valores reales**: `administrador`/`principal` → admin, `impresion` → impresor, `artista`/`vendedor`/`cliente` (cubre la clave de storage y la comparación de strings).
  2. Guards anti-OOM en subida y análisis de archivos pesados (`dimension_analyzer.py`: reemplazar `Image.MAX_IMAGE_PIXELS = None` por un tope explícito).
  3. Fallback de commits en base de datos (`xana.py`) y corrección del crash en `XanaDashboard.tsx` (`commit_hash.slice`), más la regex de escala de imágenes (`dimension_analyzer.py`).
  4. Redacción de la suite inicial de 20-30 casos de prueba de A4 (sin ejecutar el criterio de alucinación todavía, ya que no hay LLM/tools activos aún).
  5. Limpieza del código legacy sin uso en frontend: `XanaAIChat.tsx`, `xanaKnowledgeBase.ts`, `xanaFaqHandler.ts` y los tipos no consumidos de `xanaConfig.ts`.
* **Gate de salida (A5):** Suite de pruebas de auth/estabilidad corre sin fallos de autenticación ni caídas de servidor. *(Este gate es de seguridad y estabilidad — no confundir con el gate de alucinación de A4, que recién aplica desde Fase 1.)*

---

### 🔹 FASE 1 — Selection Engine & Function Calling en LangGraph
* **Objetivo:** Evolucionar `xana_graph.py` reemplazando el router de regex por selección de herramientas vía LLM.
* **Entregables:**
  * Implementación del motor de selección en LangGraph.
  * **Adaptador de proveedor de LLM** (interfaz común + cliente DeepSeek-V3 además del Gemini actual), configurable por `.env`. Sin esto, el gate A1 (comparar DeepSeek-V3 vs Gemini Flash) no es ejecutable.
  * Exposición de *Tools* iniciales: `obtener_estado_ot`, `consultar_stock_materiales`, `crear_orden_trabajo`, `obtener_metricas_ventas_cliente`.
  * **Medición y registro de la línea base del router regex** (requisito previo de A2), documentado en `MODEL_NOTES.md`.
  * Activación de **Shadow Mode** (A2): 7 días corriendo en paralelo con el router antiguo.
  * Fallback determinista si el LLM no invoca ninguna tool ante una entrada que claramente lo requiere.
  * Primera corrida real de la suite A4 contra las tools ya expuestas.
* **Gate de salida (A1 + A2 + A4):**
  * ≥ 90% de aciertos en selección de tool entre DeepSeek-V3 y Gemini Flash, documentado en `MODEL_NOTES.md`.
  * El router LLM iguala o supera al router regex en el período de shadow (no solo el 90% aislado).
  * Cero invenciones de datos/precios en la suite de casos trampa.

---

### 🔹 FASE 2 — Base de Conocimiento Estructurada + RAG Pragmático
* **Objetivo:** Dotar a Xana de contexto sobre materiales y manuales de taller sin inflar la infraestructura.
* **Entregables:**
  * Fichas técnicas, anchos de bobina y precios estructurados en tablas/JSON (Capa Estructurada), **reutilizando el motor de precios existente** (`pricingCalculator.ts` en frontend y precios de material en backend) en lugar de reconstruirlo.
  * Índice RAG plano y persistente únicamente para manuales y guías operativas, con citas obligatorias en las respuestas.
  * Instrumentación de telemetría de latencia de búsqueda (A3).
* **Gate de salida (A3 + A4):** Búsqueda RAG por debajo de 300 ms + aprobación de los casos trampa (no invención de especificaciones no documentadas).

---

### 🔹 FASE 3 — Métricas y Análisis de Tendencias Seguro
* **Objetivo:** Permitir consultas analíticas de negocio sin riesgos operacionales sobre la base de datos.
* **Entregables:**
  * Vistas SQL de solo lectura (`v_ventas_cliente`, `v_consumo_material`), **definidas y validadas en ambos dialectos**: SQLite local (`luxius.db`) y Neon PostgreSQL (producción).
  * *Tools* analíticas parametrizadas (sin exposición de SQL libre).
  * Timeouts y límites de filas — **valores propuestos a confirmar en consenso**: timeout ~3s, máximo ~100 filas por consulta. Estos números no estaban en versiones previas del documento y deben revisarse antes de fijarse como definitivos.
* **Gate de salida (A4):** Validación de consultas analíticas sin bloqueo del hilo principal de Flask ni lecturas no autorizadas.

---

### 🔹 FASE 4 — Experiencia de Voz e Integración Móvil
* **Objetivo:** Conectar las interfaces cliente al nuevo núcleo inteligente.
* **Entregables:**
  * Integración de Web Speech API en `luxius-panel`.
  * Flujo de transcripción y borrador de OT asíncrono en `Workfield Manager`, vía el pipeline de `xana_smart_order.py`.
* **Gate de salida:** Prueba end-to-end desde dictado por voz en la app móvil hasta la creación de la OT borrador en el panel web.

---

## 🟢 Estado del Consenso

Arquitectura y hoja de ruta aprobadas por consenso. **Iniciando ejecución de Fase 0.** Los gates A1, A2 y A4 permanecen pendientes de validación empírica y se irán cerrando fase por fase según los criterios de esta tabla — este documento no se considera "validado end-to-end" hasta que cada gate quede marcado como cumplido con su evidencia (logs, `MODEL_NOTES.md`, resultados de la suite de pruebas).
