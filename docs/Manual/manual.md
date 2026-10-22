# PROMPT PARA GOOGLE ANTIGRAVITY: GENERACIÓN DEL MANUAL DE OPERACIONES DEL ECOSISTEMA XIGNUX / LUXIUS

Actúa como un equipo de documentación técnica y operativa de software industrial compuesto por dos roles estrictamente delimitados:
1. **Modelo Diagramador (Arquitectura, Alcance y Flujos)**
2. **Modelo Ejecutor (Procedimientos, Reglas de Operación y Validación)**

Tu objetivo es elaborar el **Manual de Operaciones Integral** del proyecto, basándote **únicamente** en la información técnica, de código y de contexto provista en este workspace y en el hilo de trabajo. 

---

### ⛔ REGLAS DE ORO DE FIDELIDAD TÉCNICA (ANTI-INVENCIÓN)
1. **Cero alucinación:** No inventes tablas de base de datos, nombres de endpoints, responsabilidades de personas, herramientas de software ni políticas operativas que no estén documentadas en el proyecto.
2. **Gestión explícita de vacíos técnicos:** Si falta información necesaria (por ejemplo, el criterio exacto de timeout de una sesión, el esquema de columnas de una tabla no provista o un responsable nominal), **no inventes un hecho**. Debes registrarlo explícitamente bajo la etiqueta `[VACÍO TÉCNICO / PENDIENTE DE VALIDACIÓN]` y plantear supuestos limitados claramente etiquetados como `[SUPUESTO LIMITADO]`.
3. **Consistencia terminológica absoluta:** Respeta la nomenclatura técnica ya establecida en el código y en las especificaciones:
   - Componentes: `luxius-panel` (React 18 + Vite), `luXius-Backend` (Flask / Python 3.11)[cite: 1, 3], `Workfield Manager` (Android / Capacitor 8)[cite: 1, 3].
   - Identificadores y estados: OTs con formato `OT-XXXXXXXX`, estados de orden (`Para Imprimir`, `En Impresión`, `Terminado / Despacho`, `Espera Pago`)[cite: 2, 3], roles (`Tincho`, `Quique`, `Operario`, `Diseñador`, `Vendedor`, `Administrador`)[cite: 1, 2, 3].
   - Subsistema Xana: `xana_graph.py`, `xana_smart_order.py`, LangGraph, patrón asíncrono `job_id` + polling 202 Accepted.
   - Modo Sandbox: Persistencia volátil en memoria del navegador / `INITIAL_CLIENTES`[cite: 1, 3].

---

### 👥 ROLES OPERATIVOS DEL AGENTE

#### 1. MODELO DIAGRAMADOR
- Analiza cada proceso documentado, delimita su alcance exacto y detecta actores/sistemas participantes, entradas, salidas, decisiones condicionales, dependencias técnicas y excepciones operativas.
- Define la tipología de diagrama más conveniente para cada caso:
  * Diagramas de flujo de decisión (Mermaid `graph TD` o `flowchart LR`) para rutas condicionales de validación.
  * Diagramas de secuencia (Mermaid `sequenceDiagram`) para interacciones cliente-servidor (ej. App Móvil ↔ Flask Backend ↔ SQLite/PostgreSQL)[cite: 1, 3].
  * Diagramas de carriles / Swimlanes para procesos que cruzan distintos roles operativos (ej. Técnico en campo vs. Operador de taller)[cite: 1, 3].
- Incorpora una **Leyenda formal de símbolos y convenciones** al inicio de cada diagrama.
- **Restricción:** No conviertas en pasos definitivos aquellas bifurcaciones o acciones que carezcan de respaldo en el código provisto.

#### 2. MODELO EJECUTOR
- Traduce cada flujo validado por el Diagramador en un procedimiento operativo estándar (SOP), ordenado, reproducible y detallado.
- Para cada paso desglosa:
  * **Quién actúa:** Rol o componente de software exacto.
  * **Qué hace:** Acción operativa precisa.
  * **Qué necesita (Entrada):** Datos requeridos, campos obligatorios o precondiciones de estado.
  * **Qué resultado produce (Salida):** Cambio visual en el panel, actualización de base de datos o comprobante generado.
  * **Controles y validaciones:** Reglas que impiden avanzar ante datos inválidos.
  * **Gestión de excepciones y errores:** Diagnóstico y ruta de escalamiento inmediata ante fallas.
  * **Marcadores de indefinición:** Si no se conoce el responsable o la tolerancia cuantitativa, rotúlalo como `[PENDIENTE DE DEFINICIÓN]`.

---

### 🔄 PROTOCOLO DE TRASPASO ENTRE AMBOS MODELOS
Incluye obligatoriamente un apartado de gobernanza entre el Diagramador y el Ejecutor que documente:
1. **Entregables de Traspaso:** Checklist exacto de datos que el Diagramador debe transferir al Ejecutor (matriz de entradas/salidas, condiciones lógicas de decisión, catálogo de excepciones).
2. **Matriz de Coincidencia (Diagrama vs. Procedimiento):** Protocolo para verificar que cada nodo de decisión y cada carril del diagrama tenga una instrucción operativa idéntica y no contradictoria en el SOP.
3. **Mecanismo de Arbitraje y Despeje de Ambigüedades:** Reglas para pausar y registrar divergencias antes de declarar un proceso como "Listo para Producción".

---

### 📑 ESTRUCTURA REQUERIDA PARA EL MANUAL

Organiza el documento en un archivo Markdown (`docs/manual_operaciones_erp.md`) con la siguiente arquitectura:

1. **Control de Versiones y Metadatos**
   * Señala versiones y fechas únicamente si constan en la documentación provista (ej. App Móvil v2.5.1[cite: 3], consenso consolidado septiembre/octubre 2026)[cite: 1, 2]. Si no, marcar como `[PENDIENTE DE ASIGNACIÓN]`.
2. **Propósito y Alcance del Ecosistema**
   * Delimitación de `luxius-panel`, `luXius-Backend`, `Workfield Manager` y el subsistema `Xana`[cite: 1, 3].
   * Directrices de uso del **Entorno de Prácticas / Modo Demo (Sandbox en memoria)** para capacitación y capturas de pantalla seguras.
3. **Roles, Responsabilidades y Matriz RBAC**
   * Perfiles del sistema según `luxius-auth-v6` y roles de taller identificados[cite: 1, 3].
4. **Protocolo de Traspaso (Diagramador ↔ Ejecutor)**
5. **Procesos Documentados y Diagramas de Flujo (Modelo Diagramador)**
   * Flujo 1: Relevamiento Técnico en Campo y Conversión a Presupuesto/OT (`Workfield Manager` → `/api/tasks` → `/api/orders`)[cite: 1, 3].
   * Flujo 2: Gestión de Cola de Trabajo y Despacho en Taller (`luxius-panel`, estados de OT, vistas Canvas 2D / Grid)[cite: 2, 3].
   * Flujo 3: Ejecución Asíncrona de Consultas y Acciones con Asistente Xana (`/xana/chat`, LangGraph, Function Calling tipado y patrón `job_id`).
   * Flujo 4: Operación de ABMs y Gestión de Tarifarios/Materiales (`/api/clientes`, `/api/maquinas`, `INITIAL_CLIENTES`)[cite: 1, 3].
6. **Instrucciones Operativas Paso a Paso (Modelo Ejecutor)**
   * Fichas operativas para cada uno de los procesos y módulos documentados, aplicando la estructura: *Responsable, Precondiciones, Pasos, Salidas, Validaciones y Errores Frecuentes*.
7. **Controles, Gestión de Excepciones y Escalamiento Técnico**
   * Contingencias por caídas de red (alternancia Servidor Nube vs. Local `192.168.1.45:5000`)[cite: 3].
   * Gestión de bloqueos por stock faltante o riesgos de entrega en taller[cite: 2, 3].
   * Protecciones de memoria (guards anti-OOM) y timeouts en consultas analíticas[cite: 1].
8. **Glosario Unificado de Términos**
   * Términos de negocio gráfico (refilado, demasía, lona front/backlight, vinilos, m², plotter)[cite: 1, 3] y términos del sistema.
9. **Inventario de Elementos Pendientes de Validar**
   * Consolidado de todos los `[VACÍO TÉCNICO]` y `[SUPUESTO LIMITADO]` detectados durante la elaboración para su revisión con el equipo responsable.

---

### INSTRUCCIONES DE EJECUCIÓN INMEDIATA
Inicia leyendo los archivos del espacio de trabajo en `luxius-panel` y `luXius-Backend`[cite: 2], valida la coherencia con el documento de estrategia y consenso de Xana (Fases 0 a 4 y Gates A1 a A5)[cite: 1], y genera el documento en `docs/manual_operaciones_erp.md` manteniendo el tono técnico, preciso y estructurado.