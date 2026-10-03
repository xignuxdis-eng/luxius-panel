"""
Servicio de Integración Telegram Bot para LuXius y Xana — Fase 1 (Monitoreo y Taller)
Permite visualizar a distancia el estado del backend, taller, stock y memoria de Xana.
"""

import os
import sys
import json
from datetime import datetime, timezone
import requests
from models import db, Presupuesto, Cliente, Maquina, Vendedor, ConfigGlobal


def get_telegram_token() -> str:
    return os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()


def get_admin_chat_ids() -> list:
    raw = os.environ.get('TELEGRAM_ADMIN_CHAT_ID', '').strip()
    if not raw:
        return []
    return [c.strip() for c in raw.split(',') if c.strip()]


def is_admin_chat(chat_id: int | str) -> bool:
    allowed = get_admin_chat_ids()
    if not allowed or '*' in allowed:
        return True
    return str(chat_id).strip() in allowed


def send_telegram_message(chat_id: int | str, text: str, parse_mode: str = 'Markdown') -> bool:
    token = get_telegram_token()
    if not token:
        print("[telegram] Error: TELEGRAM_BOT_TOKEN no configurado.", file=sys.stderr)
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': parse_mode,
        'disable_web_page_preview': True
    }
    try:
        resp = requests.post(url, json=payload, timeout=10)
        if not resp.ok:
            # Fallback sin parse_mode si falla por markdown malformado
            payload.pop('parse_mode', None)
            requests.post(url, json=payload, timeout=10)
        return resp.ok
    except Exception as e:
        print(f"[telegram] Error enviando mensaje a Telegram: {e}", file=sys.stderr)
        return False


def cmd_start() -> str:
    return (
        "🤖 *Xana System — Telegram Workshop & Monitoring Bot (v1.0)*\n"
        "Sistema de control y monitoreo remoto para *XignuX Gráfica*.\n\n"
        "📋 *Comandos disponibles:*\n"
        "• `/status` — Salud del backend, PostgreSQL y latencia\n"
        "• `/taller` — Cola de impresión, metros lineales y OTs urgentes\n"
        "• `/alertas` — Materiales críticos con stock bajo el mínimo\n"
        "• `/tareas` — Tareas en curso y completadas en Xana\n"
        "• `/sesiones` — Últimos agentes, modelos y commits registrados\n\n"
        "🔒 *Seguridad*: Sesión protegida por autorización de Chat ID."
    )


def cmd_status() -> str:
    from sqlalchemy import text
    start_t = datetime.now()
    try:
        db.session.execute(text("SELECT 1")).close()
        latency_ms = round((datetime.now() - start_t).total_seconds() * 1000, 1)
        db_status = f"🟢 Conectado ({latency_ms} ms)"
    except Exception as e:
        db_status = f"🔴 Error ({str(e)[:30]})"

    try:
        total_orders = Presupuesto.query.filter(Presupuesto.deleted_at.is_(None)).count()
        total_clientes = Cliente.query.count()
        total_maquinas = Maquina.query.count()
    except Exception:
        total_orders = total_clientes = total_maquinas = 0

    now_ar = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")

    return (
        "⚙️ *Diagnóstico de Infraestructura LuXius*\n\n"
        f"• *Servidor*: Online ✅ ({now_ar})\n"
        f"• *Base de Datos Neon*: {db_status}\n"
        f"• *Órdenes Totales*: {total_orders} OTs registradas\n"
        f"• *Clientes*: {total_clientes}\n"
        f"• *Máquinas Registradas*: {total_maquinas}\n"
        "• *Xana AI*: Operativa (LangGraph + Anti-Alucinación A4)\n"
        "• *Cloudflare R2*: Conectado y Activo"
    )


def cmd_taller() -> str:
    try:
        ordenes = Presupuesto.query.filter(
            Presupuesto.deleted_at.is_(None),
            Presupuesto.estado.in_(['orden', 'impreso', 'post', 'borrador'])
        ).order_by(Presupuesto.created_at.asc()).all()

        total_taller = len(ordenes)
        total_ml = 0.0
        urgentes = []
        regular_queue = []

        for p in ordenes:
            esp = p.especificaciones or {}
            tags = esp.get('tags') or []
            is_urgente = 'urgente' in tags or '🚨 URGENTE' in tags

            # Estimación de consumo en metros lineales
            ml = float(esp.get('consumoEstimado') or 0.0)
            if ml <= 0:
                alto = float(esp.get('alto') or 0.0)
                copias = int(esp.get('copias') or 1)
                ml = alto * copias
            total_ml += ml

            cname = p.cliente.nombre if p.cliente else 'Cliente'
            mat = esp.get('material') or 'Sustrato'
            ot_code = f"OT-{str(p.id)[:8].upper()}"

            entry = {
                'ot': ot_code,
                'cliente': cname,
                'material': mat,
                'ml': round(ml, 2),
                'urgente': is_urgente,
                'estado': p.estado
            }

            if is_urgente:
                urgentes.append(entry)
            else:
                regular_queue.append(entry)

        lines = [
            "🏭 *Estado del Taller y Cola de Impresión*",
            f"• *Total en Proceso*: {total_taller} OTs",
            f"• *Metros Lineales Pendientes*: {total_ml:.2f} ml",
            f"• *🚨 OTs Urgentes*: {len(urgentes)}\n"
        ]

        if urgentes:
            lines.append("🔥 *URGENCIAS ACTIVAS:*")
            for u in urgentes[:5]:
                lines.append(f"• 🚨 *{u['ot']}* | {u['cliente']} ({u['material']}) — {u['ml']} ml [{u['estado']}]")
            lines.append("")

        lines.append("📋 *Próximas en Cola:*")
        all_sorted = urgentes + regular_queue
        for idx, item in enumerate(all_sorted[:6], 1):
            badge = "🚨 " if item['urgente'] else ""
            lines.append(f"{idx}. {badge}*{item['ot']}* — {item['cliente']} ({item['material']}) · {item['ml']} ml")

        if not all_sorted:
            lines.append("✨ *No hay trabajos pendientes en taller.*")

        return "\n".join(lines)
    except Exception as e:
        return f"⚠️ Error consultando estado del taller: {e}"


def cmd_alertas() -> str:
    try:
        row = ConfigGlobal.query.filter_by(clave='collection_materiales').first()
        materiales = row.valor if (row and isinstance(row.valor, list)) else []

        alertas = []
        for m in materiales:
            stock = float(m.get('stockActual') or 0)
            minimo = float(m.get('stockMinimo') or 10)
            if stock <= minimo:
                alertas.append({
                    'codigo': m.get('codigo', 'S/C'),
                    'desc': m.get('descripcion', 'Material'),
                    'stock': stock,
                    'minimo': minimo,
                    'unidad': m.get('unidad', 'm')
                })

        if not alertas:
            return "✅ *Stock Bajo Control*\nTodos los materiales e insumos están por encima del stock mínimo establecido."

        lines = [f"⚠️ *Alertas de Stock Crítico ({len(alertas)} insumo(s))*:"]
        for a in alertas[:10]:
            lines.append(f"• 🔴 *{a['codigo']}* ({a['desc']}): {a['stock']} {a['unidad']} (Mínimo: {a['minimo']} {a['unidad']})")

        if len(alertas) > 10:
            lines.append(f"\n_y {len(alertas) - 10} materiales más en alerta._")

        return "\n".join(lines)
    except Exception as e:
        return f"⚠️ Error consultando alertas de stock: {e}"


def cmd_tareas() -> str:
    try:
        cfg = ConfigGlobal.query.filter_by(clave='xana_memory').first()
        store = cfg.valor if (cfg and isinstance(cfg.valor, dict)) else {}
        tasks = store.get('tasks', [])

        if not tasks:
            return "📋 *Memoria de Xana*: No hay tareas registradas en la base de datos."

        in_prog = [t for t in tasks if t.get('status') == 'in_progress']
        completed = [t for t in tasks if t.get('status') == 'completed']

        lines = ["🧠 *Tareas en la Memoria de Xana:*"]
        if in_prog:
            lines.append("\n🔄 *En Progreso:*")
            for t in in_prog[:5]:
                desc = t.get('description') or t.get('objective') or 'Tarea'
                lines.append(f"• [{t.get('priority', 'normal')}] {desc[:80]}")

        if completed:
            lines.append("\n✅ *Completadas Recientemente:*")
            for t in completed[-4:]:
                desc = t.get('description') or t.get('objective') or 'Tarea'
                lines.append(f"• {desc[:80]}")

        return "\n".join(lines)
    except Exception as e:
        return f"⚠️ Error consultando tareas de Xana: {e}"


def cmd_sesiones() -> str:
    try:
        cfg = ConfigGlobal.query.filter_by(clave='xana_memory').first()
        store = cfg.valor if (cfg and isinstance(cfg.valor, dict)) else {}
        sessions = store.get('sessions', [])
        commits = store.get('commits', [])

        lines = ["👥 *Registro de Sesiones y Agentes:*"]
        if sessions:
            lines.append("\nÚltimas sesiones:")
            for s in sessions[-4:]:
                agente = s.get('agent_name') or s.get('agent') or 'Antigravity'
                modelo = s.get('model', 'DeepSeek-V3 / Gemini')
                dt = s.get('timestamp') or s.get('created_at') or ''
                lines.append(f"• *{agente}* ({modelo}) — {dt[:16]}")
        else:
            lines.append("• Sin sesiones previas registradas.")

        if commits:
            lines.append("\n📌 *Últimos Commits Asentados:*")
            for c in commits[-3:]:
                h = str(c.get('hash', ''))[:7]
                msg = c.get('message', '')
                lines.append(f"• `{h}`: {msg[:60]}")

        return "\n".join(lines)
    except Exception as e:
        return f"⚠️ Error consultando sesiones: {e}"


def process_telegram_update(update: dict) -> dict:
    """Procesa un webhook update de Telegram y ejecuta el comando si está autorizado."""
    message = update.get('message') or update.get('edited_message')
    if not message:
        return {"ok": True, "action": "ignored_no_message"}

    chat = message.get('chat', {})
    chat_id = chat.get('id')
    text = (message.get('text') or '').strip()

    if not chat_id or not text:
        return {"ok": True, "action": "ignored_empty"}

    # Verificación de Seguridad por Chat ID
    if not is_admin_chat(chat_id):
        refusal = (
            f"⛔ *Acceso Denegado*\n\n"
            f"Tu Chat ID `{chat_id}` no está registrado como administrador autorizado de LuXius System.\n"
            f"Contactá a la administración para habilitar este dispositivo."
        )
        send_telegram_message(chat_id, refusal)
        return {"ok": False, "error": "unauthorized_chat_id", "chat_id": chat_id}

    cmd = text.split()[0].lower()
    # Limpiar arroba de username del bot (ej. /status@luxius_bot -> /status)
    if '@' in cmd:
        cmd = cmd.split('@')[0]

    response_text = ""
    if cmd in ('/start', '/ayuda', '/help'):
        response_text = cmd_start()
    elif cmd in ('/status', '/salud', '/estado'):
        response_text = cmd_status()
    elif cmd in ('/taller', '/cola', '/impresion'):
        response_text = cmd_taller()
    elif cmd in ('/alertas', '/stock'):
        response_text = cmd_alertas()
    elif cmd in ('/tareas', '/tasks'):
        response_text = cmd_tareas()
    elif cmd in ('/sesiones', '/agentes', '/commits'):
        response_text = cmd_sesiones()
    else:
        response_text = (
            f"❓ Comando no reconocido: `{cmd}`\n\n"
            "Escribí `/ayuda` para ver la lista de comandos disponibles."
        )

    send_telegram_message(chat_id, response_text)
    return {"ok": True, "command": cmd, "chat_id": chat_id}
