# Roadmap: Integración de Xana y Telegram Bot 🤖📱

Este documento establece el plan de acción para conectar el sistema de memoria "Xana" y los agentes de IA (Antigravity) con un bot de Telegram, permitiendo control, monitoreo y ejecución remota desde cualquier dispositivo móvil.

---

## Fase 1: Fundaciones y Monitoreo (Modo Observador)
**Objetivo:** Conectar el bot de Telegram al backend de LuXius para poder visualizar el estado de la IA a distancia.

1. **Creación del Bot (BotFather):** 
   - Generar el Token de acceso en Telegram.
   - Definir comandos básicos en el menú del bot.
2. **Infraestructura Backend:** 
   - Crear un script `telegram_service.py` en el backend de LuXius utilizando la librería `python-telegram-bot` (o configurar Webhooks hacia Render).
   - Asegurar el bot (solo tú, mediante tu Chat ID, podrás darle órdenes).
3. **Comandos de Lectura:**
   - Implementar `/status`: Responde con el estado del backend y si la IA está activa.
   - Implementar `/tareas`: Lee de la base de datos de Xana y devuelve una lista de las tareas en progreso (`in_progress`) y completadas (`completed`).
   - Implementar `/sesiones`: Resumen de los últimos agentes y modelos que han modificado el código.

---

## Fase 2: Control Unidireccional y Notificaciones (Modo Gestor)
**Objetivo:** Poder dictar trabajo a la memoria de Xana desde el teléfono y recibir avisos cuando el sistema haga algo importante.

1. **Gestión de Tareas:**
   - Implementar `/addtask [texto]`: Permite escribir una idea o bug desde el celular y que se guarde automáticamente en la base de datos de Xana (para que la IA lo atienda luego).
   - Implementar `/clear`: Limpiar tareas completadas del historial.
2. **Notificaciones Push Activas:**
   - Modificar los endpoints de `xana.py` para que, cada vez que una sesión de la IA se cierre con estado `completed` o `failed`, el servidor te envíe un mensaje a Telegram automáticamente: *"✅ Tarea completada: Arreglar bug de descarga"* o *"❌ Fallo en intento: Compilación vite caída"*.
   - Notificación instantánea cuando la IA toma una **Decisión Arquitectónica** importante.

---

## Fase 3: Ejecución Agéntica Total (Modo Comandante)
**Objetivo:** Despertar y ordenar la ejecución de código a la IA directamente desde Telegram utilizando el SDK de Antigravity.

1. **Integración SDK:**
   - Instalar el `antigravity-sdk-python` en el servidor local.
   - Darle permisos al backend para instanciar sub-agentes en tu repositorio de forma headless (sin interfaz visual).
2. **Comando de Ejecución:**
   - Implementar `/execute [instrucción]`. Esto no solo guardará la tarea en la memoria, sino que despertará a un agente de Antigravity en segundo plano, le dará la instrucción, y te mantendrá al tanto del progreso del código por Telegram.
3. **Soporte Multimedia (Opcional pero brutal):**
   - **Notas de voz:** Si envías un audio de voz por Telegram ("Oye, entra al CSS y cambia el dashboard a color azul"), el bot usará un modelo de voz a texto (Gemini/Whisper), lo convertirá en una tarea de Xana, y ejecutará el agente.
   - **Imágenes:** Si envías un screenshot de un bug en la UI por Telegram, el agente lo recibe como contexto para ir a solucionarlo en el código.

---

> NOTA
> **Estado Actual:** Pendiente de ejecución. Este archivo vivirá en tu repositorio para que podamos retomarlo en el futuro simplemente escribiendo: *"Ejecuta la Fase 1 del Xana Telegram Roadmap"*.
