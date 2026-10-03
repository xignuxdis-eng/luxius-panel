# Roadmap: Integración de Xana y Telegram Bot 🤖📱

Este documento establece el plan de acción para conectar el sistema de memoria "Xana" y los agentes de IA con un bot de Telegram, permitiendo control, monitoreo, briefing matutino y ejecución remota desde cualquier dispositivo móvil.

---

## Fase 1: Fundaciones y Monitoreo (Modo Observador) ✅ COMPLETADA (03/10/2026)
**Objetivo:** Conectar el bot de Telegram al backend de LuXius para poder visualizar el estado de la infraestructura a distancia.

1. **Creación del Bot (BotFather):** 
   - Token de acceso configurable vía variable de entorno `TELEGRAM_BOT_TOKEN`.
   - Definidos comandos de monitoreo y taller.
2. **Infraestructura Backend:** 
   - Módulo `services/telegram_service.py` con cliente HTTP directo (sin dependencias pesadas).
   - Rutas Blueprint `/api/telegram/webhook`, `/api/telegram/status` y `/api/telegram/setup-webhook`.
   - Seguridad estricta por `TELEGRAM_ADMIN_CHAT_ID` (soporta múltiples IDs separados por coma). Respuestas denegadas automáticas a usuarios no autorizados.
3. **Comandos de Lectura Implementados:**
   - `/start` o `/ayuda`: Menú interactivo de comandos disponibles clasificados.
   - `/status`: Estado en tiempo real del backend, latencia de base de datos Neon PostgreSQL y conteo de órdenes/máquinas.
   - `/taller`: Cola de impresión activa, conteo de OTs en taller, estimación de metros lineales pendientes y lista de órdenes urgentes (`🚨 URGENTE`).
   - `/alertas`: Detección en vivo de materiales con stock crítico o bajo el mínimo.
   - `/tareas`: Lectura de la memoria de Xana (`in_progress` y `completed`).
   - `/sesiones`: Resumen de agentes, modelos y últimos commits registrados.

---

## Fase 2: Control Gestor, Briefing Matutino y Notificaciones Push ✅ COMPLETADA (03/10/2026)
**Objetivo:** Dictar trabajo a la memoria de Xana desde el teléfono, generar el briefing matutino de taller y recibir notificaciones push en tiempo real ante eventos prioritarios.

1. **Gestión Remota de Memoria de Xana:**
   - `/addtask [texto]`: Permite ingresar ideas, órdenes o requerimientos desde el celular. Se le asigna automáticamente un identificador secuencial `TASK-XXX`, timestamp ART (UTC-3), prioridad heurística y persistencia en `ConfigGlobal` de Neon PostgreSQL.
   - `/completar [ID]` o `/done [ID]`: Marca la tarea indicada como `completed` en la memoria del sistema.
   - `/clear`: Depura y archiva tareas completadas antiguas manteniendo visible el backlog limpio y ordenado.
2. **☀️ Briefing Matutino de Producción (`/briefing`):**
   - Servicio central `services/briefing_service.py` y endpoint `GET /api/production/briefing`.
   - Analiza en caliente metros lineales totales, bobinas más exigidas para consolidar tandas continuas de impresión, compromisos de entrega para hoy, urgencias y alertas de insumos.
   - Incluye recomendación operativa táctica de Xana para el taller.
   - Integrado en el panel web (`src/pages/Dashboard/Dashboard.tsx`) con botón `☀️ Briefing del Día`, modal Glassmorphism y botón de despacho inmediato a Telegram (`POST /api/telegram/briefing/trigger`).
3. **Notificaciones Push Activas a Telegram:**
   - `notify_urgent_order()`: Disparo automático e inmediato en segundo plano cuando un vendedor o diseñador crea o actualiza una OT con etiqueta `🚨 URGENTE` o `⭐ VIP`.
   - `notify_stock_alert()`: Disparo de alerta push cuando un insumo cae bajo el stock mínimo.
   - `notify_xana_decision()`: Aviso instantáneo cuando se asienta una nueva decisión arquitectónica (`DEC-XXX`) en el sistema.
   - Endpoint `POST /api/telegram/notify` disponible para envíos directos autorizados.

---

## Fase 3: Modo Comandante con Audio de Voz Multimodal ✅ COMPLETADA (03/10/2026)
**Objetivo:** Permitir el control y la interacción por voz en tiempo real con Xana desde Telegram utilizando modelos multimodales avanzados.

1. **Procesamiento de Notas de Voz (`voice` / `audio`):**
   - Detección reactiva en el webhook `/api/telegram/webhook`.
   - Descarga en memoria binaria del audio `.oga` / `.ogg` mediante Telegram Bot API.
   - Inferencia con Gemini Multimodal en cascada elástica (`gemini-3.5-flash` → `gemini-flash-latest` → `gemini-2.5-pro`) pasando los bytes inline base64.
2. **Voice-to-Task Agéntico:**
   - La IA transcribe fielmente el mensaje y extrae la intención:
     - Si es un pedido de tarea (ej: *"anotame revisar las cuchillas del plotter Roland"*), extrae la directiva `ACCION: CREAR_TAREA: ...` y la crea de forma totalmente desatendida en la base de datos de Xana.
     - Si es una consulta de taller, responde ejecutivamente en el mismo mensaje.
3. **Comando de Ejecución Agéntica:**
   - `/execute [instrucción]` o envío de texto libre: Invoca el motor LangGraph de Xana para resolver dudas de stock, metraje o tolerancias técnicas al instante.

---

> **Estado Actual:** Fases 1, 2 y 3 COMPLETADAS, verificadas en vivo contra Neon PostgreSQL y compiladas en el frontend de producción.
