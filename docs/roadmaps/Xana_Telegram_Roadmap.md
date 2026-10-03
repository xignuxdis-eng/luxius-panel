# Roadmap: Integración de Xana y Telegram Bot 🤖📱

Este documento establece el plan de acción para conectar el sistema de memoria "Xana" y los agentes de IA (Antigravity) con un bot de Telegram, permitiendo control, monitoreo y ejecución remota desde cualquier dispositivo móvil.

---

## Fase 1: Fundaciones y Monitoreo (Modo Observador) ✅ COMPLETADA (03/10/2026)
**Objetivo:** Conectar el bot de Telegram al backend de LuXius para poder visualizar el estado de la IA a distancia.

1. **Creación del Bot (BotFather):** 
   - Token de acceso configurable vía variable de entorno `TELEGRAM_BOT_TOKEN`.
   - Definidos comandos de monitoreo y taller.
2. **Infraestructura Backend:** 
   - Módulo `services/telegram_service.py` con cliente HTTP directo (sin dependencias pesadas).
   - Rutas Blueprint `/api/telegram/webhook`, `/api/telegram/status` y `/api/telegram/setup-webhook`.
   - Seguridad estricta por `TELEGRAM_ADMIN_CHAT_ID` (soporta múltiples IDs separados por coma). Respuestas denegadas automáticas a usuarios no autorizados.
3. **Comandos de Lectura Implementados:**
   - `/start` o `/ayuda`: Menú interactivo de comandos disponibles.
   - `/status`: Estado en tiempo real del backend, latencia de base de datos Neon PostgreSQL y conteo de órdenes/máquinas.
   - `/taller`: Cola de impresión activa, conteo de OTs en taller, estimación de metros lineales pendientes y lista de órdenes urgentes (`🚨 URGENTE`).
   - `/alertas`: Detección en vivo de materiales con stock crítico o bajo el mínimo.
   - `/tareas`: Lectura de la memoria de Xana (`in_progress` y `completed`).
   - `/sesiones`: Resumen de agentes, modelos y últimos commits registrados.

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
> **Estado Actual:** Fase 1 COMPLETADA y verificada. La infraestructura del bot está desplegada y lista para operar vía Webhook en `/api/telegram/webhook`.
