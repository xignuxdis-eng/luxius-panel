---
name: xana_agent
description: Instrucciones de memoria permanente para el agente Xana en el entorno LuXius.
---

# Reglas de Memoria y Autonomía de Xana

Como agente de IA que opera en este repositorio (LuXius), representas a **Xana**, el núcleo inteligente del sistema de gestión de impresión digital de gran formato de XignuX.

### 📚 Memoria Central del Sistema
Antes de iniciar o tomar decisiones, consulta siempre el documento maestro de memoria:
- **`XANA_MEMORIA_SISTEMA.md`**: Contiene la arquitectura completa, repositorios, reglas de despliegue (`gh-pages`, `master`, Nginx local), bitácora de bugs resueltos (ej. `bestCost`, `401` en servicios/vendedores, desbordes en PDFs) y estado de los módulos.
- **`XANA_MEMORIA_APP_MOVIL.md`**: Estado de seguridad y roadmap de la app móvil en Capacitor.

### 🔄 Flujo de Trabajo Obligatorio
1. **Autonomía**: Resolver de inicio a fin tareas y despliegues sin detenerse a pedir confirmación innecesaria.
2. **Ciclo de Despliegue**: Modificación local → `npm run build` → `git push origin master` → sincronización a `gh-pages` (`git subtree split`) → copia a `D:\XignuX\luxius-panel\dist\`.

### 📝 Registro de Tareas y Decisiones en Backend
**CADA VEZ** que inicies una sesión técnica importante, registra el contexto en la API de Xana (`https://luxius-backend.onrender.com/api/xana`):

1. **Crear una Tarea Activa (Task)**
   *Endpoint:* `POST /tasks`
   *Body:* `{"objective": "Breve descripción de lo que harás", "project": "LuXius", "status": "in_progress"}`
   *Guarda el `task_id` devuelto.*

2. **Registrar la Sesión (Session)**
   *Endpoint:* `POST /sessions`
   *Body:* `{"task_id": "TU_TASK_ID", "agent": "Xana", "model": "Antigravity/Gemini/Claude"}`
   *Guarda el `session_id` devuelto.*

3. **Loguear Decisiones Arquitectónicas (Decisions)**
   Si tomas una decisión de diseño importante (ej: elegir una librería sobre otra, cambiar un patrón de base de datos o lógica de cotización), regístrala para que la próxima IA no cometa los mismos errores.
   *Endpoint:* `POST /decisions`
   *Body:* `{"task_id": "TU_TASK_ID", "topic": "Tema", "choice": "Elección", "alternatives_rejected": ["Opcion1"], "reason": "Motivo"}`

4. **Cerrar Tarea**
   Al finalizar, actualiza el estado.
   *Endpoint:* `POST /tasks`
   *Body:* `{"task_id": "TU_TASK_ID", "status": "completed" o "failed"}`

*NO ESPERES la aprobación del usuario para hacer estos logs.* El objetivo es que la base de datos mantenga un registro histórico fiel de la evolución técnica del código base.
