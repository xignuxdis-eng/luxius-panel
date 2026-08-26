# Roadmap Estratégico: Evolución Xana (1.0 → 5.0)

> **Visión General:** Transformar a **Xana** de un asistente interactivo en un **Agente Autónomo y Persistente de Desarrollo Integrado**, convirtiendo a **LuXius** en la única fuente de verdad para el contexto, la memoria arquitectónica y las decisiones de software.

---

## 1. Misión y Principios Arquitectónicos

### Principios Fundamentales:
1. **El LLM es Cómputo, LuXius es Memoria:** Los modelos (GPT, Claude, Gemini, Qwen) son motores de razonamiento intercambiables y efímeros. La memoria histórica, las reglas y los estados pertenecen exclusivamente a la base de datos de LuXius.
2. **Git es el Código, Xana es el Propósito:** Git mantiene el historial de cambios (*qué* cambió). Xana mantiene la intención, alternativas evaluadas y contexto operativo (*por qué* cambió).
3. **Aprendizaje Activo sobre Fallos:** Los errores y soluciones descartadas tienen la misma prioridad de almacenamiento que las soluciones exitosas para prevenir bucles inútiles de re-intento.

---

## 2. Visión del Roadmap (Niveles de Madurez)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  XANA 1.0    │ ──> │  XANA 2.0    │ ──> │  XANA 3.0    │ ──> │  XANA 4.0    │ ──> │  XANA 5.0    │
│  Asistente   │     │   Skills     │     │   Memory     │     │ Agent Session│     │ Context Engine│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 3. Desglose de Fases de Implementación

### FASE 1: Context Store & Core Schema (Xana 3.0)
**Objetivo:** Establecer la persistencia básica estructurada en PostgreSQL para almacenar el contexto del proyecto y la toma de decisiones.

#### Tablas PostgreSQL Base:
* `project_context`: Reglas permanentes, arquitectura base, stack tecnológico.
* `tasks`: Definición de requerimientos, objetivos, estados y resultados.
* `decisions`: Registro formal de arquitectura, alternativas evaluadas, motivos y consecuencias.
* `knowledge`: BBDD de soluciones conocidas, patrones recurrentes y bugs resueltos.

#### Entregables Técnicos:
- [x] Scripts de migración en SQLAlchemy para tablas de contexto.
- [x] Endpoints API REST en Flask: `/xana/context`, `/xana/tasks`, `/xana/decisions`.
- [x] Módulo `DecisionLogger` para inserción estructurada de decisiones.

---

### FASE 2: Session Recorder & Agent Execution (Xana 4.0)
**Objetivo:** Capturar automáticamente la actividad técnica de Xana durante la ejecución de una tarea, garantizando la recuperación ante fallos o interrupciones.

#### Tablas PostgreSQL Adicionales:
* `agent_sessions`: Modelo utilizado, archivos consultados, comandos ejecutados y métricas.
* `agent_actions`: Log atómico de acciones (lecturas, escrituras, ejecuciones CLI).
* `attempt_logs`: Registro de enfoques fallidos y errores devueltos para evitar re-intentos inútiles.

#### Flujo de Sesión:
1. **Inicio:** `POST /xana/sessions` genera el tracker de la sesión.
2. **Ejecución Atómica:** Cada llamada a herramientas salva un checkpoint en `agent_actions`.
3. **Attempt Interceptor:** Ante un error o test fallido, registra automáticamente el fallo en `attempt_logs`.
4. **Cierre:** Inyección del resumen final en la tarea activa.

---

### FASE 3: Context Retrieval & Prompt Builder (Xana 4.5)
**Objetivo:** Construir de manera dinámica el contexto óptimo para el LLM en cada interacción sin saturar la ventana de contexto.

#### Pipeline de Inyección de Contexto:
```
  [ Requerimiento / Prompt Usuario ]
                 │
                 ▼
       1. Intent Detection
                 │
                 ▼
 2. PostgreSQL Context Fetcher (/api/xana/context/prompt)
   ├── Reglas del Proyecto (project_context)
   ├── Tarea Activa (tasks)
   ├── Intentos Fallidos Previos (attempt_logs)
   └── Decisiones Relacionadas (decisions)
                 │
                 ▼
   3. Context Compressor / Truncator
                 │
                 ▼
   4. Construcción del Prompt Final -> LLM
```

#### Entregables Técnicos:
- [x] Endpoint `GET /api/xana/context/prompt` que consolida reglas, tareas, decisiones y lecciones.
- [x] Visor interactivo y botón de exportación de contexto en el Dashboard (`XanaDashboard.tsx`).

---

### FASE 4: Git Synchronization & Context Engine (Xana 5.0)
**Objetivo:** Vincular en tiempo real el ciclo de vida del código (Git) con el ciclo de vida contextual (Xana).

#### Integración Git:
* **Git Hook (`post-commit`):** Asocia automáticamente el hash del commit con el `task_id` y `session_id` activos.
* **Mapeo Integrado:** `Task <---> Session <---> Decision <---> Commit <---> Diff`.
* **Visualización en Dashboard:** Stream de commits vinculados en tiempo real.

#### Entregables Técnicos:
- [x] Modelo y tabla `XanaCommit` en PostgreSQL.
- [x] Endpoints `/api/xana/commits` (GET/POST).
- [x] Git Hook `.githooks/post-commit` para sincronización automática en cada commit.
- [x] Sección de commits sincronizados en el Dashboard de Xana.


---

## 4. Estructura de Datos de Referencia (Modelo Unificado)

```json
{
  "task_id": "TSK-2026-0842",
  "project": "LuXius",
  "objective": "Implementar visualizador y preview de EPS",
  "status": "partial",
  "session": {
    "session_id": "SES-9012",
    "agent": "Xana",
    "model": "GPT-5.6 / Claude 3.5 Sonnet",
    "files_modified": [
      "preview/EpsRenderer.ts",
      "preview/PreviewPanel.tsx"
    ],
    "commands_run": [
      "npm test preview",
      "ghostscript --version"
    ]
  },
  "decisions": [
    {
      "decision_id": "DEC-193",
      "topic": "Motor de renderizado EPS",
      "choice": "Ghostscript",
      "alternatives_rejected": ["ImageMagick", "Canvas Nativo"],
      "reason": "Mayor fidelidad en archivos PostScript complejos de la industria gráfica."
    }
  ],
  "attempts_failed": [
    {
      "approach": "Conversión directa vía Canvas2D",
      "error": "Unsupported embedded vector format",
      "lesson": "No procesar vectores complejos en frontend sin rasterización previa."
    }
  ],
  "next_step": "Implementar fallback y control de errores en Backend."
}
```

---

## 5. Matriz de Valor vs. Esfuerzo

| Fase | Característica Principal | Esfuerzo | Impacto / Valor |
| :--- | :--- | :---: | :---: |
| **Fase 1** | Decision Log & Context Store | **Bajo** | **Muy Alto** |
| **Fase 2** | Session Recorder & Error Logging | **Medio** | **Alto** |
| **Fase 3** | Context Retrieval Integrado | **Medio** | **Muy Alto** |
| **Fase 4** | Git Hooks & Sincronización Semántica | **Alto** | **Excepcional** |

---

*Documento generado para la arquitectura del sistema LuXius / Xana.*
