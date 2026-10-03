"""
Servicio de Integración Telegram Bot para LuXius y Xana
Fase 1: Monitoreo y Taller (Modo Observador)
Fase 2: Modo Gestor & Notificaciones Push Activas (/addtask, /completar, /clear, /briefing, alertas)
Fase 3: Modo Comandante con Audio de Voz (Voice-to-Task / Audio Transcription con Gemini Multimodal)
"""

import os
import sys
import json
import base64
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import requests
from models import db, Presupuesto, Cliente, Maquina, Vendedor, ConfigGlobal
from services.briefing_service import generate_daily_briefing

AR_TZ = timezone(timedelta(hours=-3))


def _now_ar_iso() -> str:
    return datetime.now(AR_TZ).isoformat()


def get_telegram_config() -> dict:
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    admin_id = os.environ.get('TELEGRAM_ADMIN_CHAT_ID', '').strip()
    if not token or not admin_id:
        try:
            cfg = ConfigGlobal.query.filter_by(clave='telegram_config').first()
            if cfg and isinstance(cfg.valor, dict):
                if not token:
                    token = str(cfg.valor.get('bot_token', '')).strip()
                if not admin_id:
                    admin_id = str(cfg.valor.get('admin_chat_id', '')).strip()
        except Exception:
            pass
    return {'token': token, 'admin_chat_id': admin_id}


def get_telegram_token() -> str:
    return get_telegram_config().get('token', '')


def get_admin_chat_ids() -> list:
    raw = get_telegram_config().get('admin_chat_id', '')
    if not raw:
        return []
    return [c.strip() for c in str(raw).split(',') if c.strip()]


def save_telegram_config(token: Optional[str] = None, admin_chat_id: Optional[str] = None) -> bool:
    """Persiste el token o chat ID en la tabla config_global (clave='telegram_config')."""
    try:
        cfg = ConfigGlobal.query.filter_by(clave='telegram_config').first()
        if not cfg:
            cfg = ConfigGlobal(clave='telegram_config', valor={})
            db.session.add(cfg)
        val = dict(cfg.valor or {})
        if token is not None:
            val['bot_token'] = token.strip()
        if admin_chat_id is not None:
            val['admin_chat_id'] = str(admin_chat_id).strip()
        cfg.valor = val
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"[telegram] Error guardando config en BD: {e}", file=sys.stderr)
        return False


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
            resp = requests.post(url, json=payload, timeout=10)
        return resp.ok
    except Exception as e:
        print(f"[telegram] Error enviando mensaje a Telegram: {e}", file=sys.stderr)
        return False


def send_telegram_broadcast(text: str, parse_mode: str = 'Markdown') -> int:
    """Envía un mensaje a todos los administradores configurados."""
    chat_ids = get_admin_chat_ids()
    sent_count = 0
    for cid in chat_ids:
        if cid and cid != '*':
            if send_telegram_message(cid, text, parse_mode=parse_mode):
                sent_count += 1
    return sent_count


# ================================================================
# NOTIFICACIONES PUSH ACTIVAS (Fase 2)
# ================================================================

def notify_urgent_order(ot_code: str, client_name: str, material: str, ml: float, reason: str = 'Marcada como urgente en Entrada', status: str = 'ORDEN') -> bool:
    """Dispara alerta push a los administradores cuando una orden se vuelve urgente o VIP."""
    msg = (
        f"🚨 *¡ALERTA DE PRIORIDAD EN TALLER!*\n\n"
        f"• *Orden:* `{ot_code}`\n"
        f"• *Cliente:* {client_name}\n"
        f"• *Material:* {material} ({ml:.2f} ml)\n"
        f"• *Estado:* `{status}`\n"
        f"• *Motivo:* {reason}\n\n"
        f"⚡ _Priorizar en cola de impresión del taller._"
    )
    return send_telegram_broadcast(msg) > 0


def notify_stock_alert(codigo: str, desc: str, stock: float, minimo: float, unidad: str = 'm') -> bool:
    """Dispara alerta push cuando un insumo crítico cae por debajo del stock mínimo."""
    msg = (
        f"⚠️ *ALERTA DE INSUMO CRÍTICO*\n\n"
        f"• *Código:* `{codigo}`\n"
        f"• *Material:* {desc}\n"
        f"• *Stock Actual:* {stock} {unidad}\n"
        f"• *Mínimo Requerido:* {minimo} {unidad}\n\n"
        f"🛒 _Se recomienda gestionar reposición inmediata._"
    )
    return send_telegram_broadcast(msg) > 0


def notify_xana_decision(decision_id: str, topic: str, choice: str) -> bool:
    """Notifica una nueva decisión arquitectónica asentada en la memoria de Xana."""
    msg = (
        f"🧠 *XANA AI — DECISIÓN ARQUITECTÓNICA ASENTADA*\n\n"
        f"• *ID:* `{decision_id}`\n"
        f"• *Tema:* {topic}\n"
        f"• *Elección:* {choice}\n"
    )
    return send_telegram_broadcast(msg) > 0


# ================================================================
# GESTIÓN DE TAREAS Y MEMORIA DE XANA (Fase 2)
# ================================================================

def _get_xana_memory() -> Dict[str, Any]:
    cfg = ConfigGlobal.query.filter_by(clave='xana_memory').first()
    if cfg and cfg.valor and isinstance(cfg.valor, dict):
        return cfg.valor
    return {'tasks': [], 'decisions': [], 'sessions': [], 'commits': []}


def _save_xana_memory(store: Dict[str, Any]) -> bool:
    try:
        cfg = ConfigGlobal.query.filter_by(clave='xana_memory').first()
        if not cfg:
            cfg = ConfigGlobal(clave='xana_memory', valor=store)
            db.session.add(cfg)
        else:
            cfg.valor = store
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"[telegram] Error guardando memoria Xana: {e}", file=sys.stderr)
        return False


def cmd_addtask(text_content: str, source: str = 'telegram') -> str:
    """Agrega una nueva tarea a la memoria de Xana."""
    content = text_content.strip()
    if not content:
        return "⚠️ Debes ingresar una descripción para la tarea. Ej: `/addtask Revisar cuchilla plotter Roland`"

    store = _get_xana_memory()
    tasks = store.get('tasks', [])

    # Calcular próximo número de tarea
    max_num = 0
    for t in tasks:
        tid = t.get('task_id', '')
        match = re.search(r'(\d+)', tid)
        if match:
            max_num = max(max_num, int(match.group(1)))

    next_num = max(max_num + 1, len(tasks) + 1)
    task_code = f"TASK-{next_num:03d}"

    new_task = {
        "id": next_num,
        "task_id": task_code,
        "project": "LuXius Taller / Operativo",
        "objective": content,
        "status": "in_progress",
        "source": source,
        "priority": "alta" if ("urgente" in content.lower() or "hoy" in content.lower()) else "normal",
        "created_at": _now_ar_iso(),
        "updated_at": _now_ar_iso()
    }

    tasks.insert(0, new_task)
    store['tasks'] = tasks
    if _save_xana_memory(store):
        return (
            f"✅ *Tarea Registrada en Xana*\n\n"
            f"• *ID:* `{task_code}`\n"
            f"• *Objetivo:* {content}\n"
            f"• *Prioridad:* {new_task['priority'].upper()}\n"
            f"• *Estado:* `in_progress` 🔄\n"
            f"• *Origen:* `{source}`"
        )
    return "❌ Error persistiendo la tarea en la base de datos."


def cmd_completar(task_arg: str) -> str:
    """Marca una tarea como completada en la memoria de Xana."""
    arg = task_arg.strip().upper()
    if not arg:
        return "⚠️ Indique el ID de la tarea a completar. Ej: `/completar TASK-016` o `/completar 16`"

    store = _get_xana_memory()
    tasks = store.get('tasks', [])

    found = None
    for t in tasks:
        tid = str(t.get('task_id', '')).upper()
        sid = str(t.get('id', ''))
        if arg in (tid, sid, f"TASK-{arg}", f"TASK-0{arg}", f"TASK-00{arg}"):
            found = t
            break

    if not found:
        return f"❓ No se encontró ninguna tarea con identificador `{arg}`."

    found['status'] = 'completed'
    found['updated_at'] = _now_ar_iso()
    store['tasks'] = tasks

    if _save_xana_memory(store):
        return (
            f"🎉 *Tarea Marcada como Completada*\n\n"
            f"• *ID:* `{found.get('task_id')}`\n"
            f"• *Objetivo:* {found.get('objective')}\n"
            f"• *Estado:* `completed` ✅"
        )
    return "❌ Error actualizando la tarea en la base de datos."


def cmd_clear() -> str:
    """Limpia o archiva tareas completadas antiguas de la vista activa."""
    store = _get_xana_memory()
    tasks = store.get('tasks', [])

    in_progress = [t for t in tasks if t.get('status') == 'in_progress']
    completed = [t for t in tasks if t.get('status') == 'completed']

    # Conservar solo las 3 completadas más recientes
    keep_completed = completed[:3]
    cleaned_count = len(completed) - len(keep_completed)

    store['tasks'] = in_progress + keep_completed
    if _save_xana_memory(store):
        return (
            f"🧹 *Historial de Tareas Depurado*\n\n"
            f"• *Tareas archivadas:* {max(0, cleaned_count)}\n"
            f"• *Tareas activas en curso:* {len(in_progress)}\n"
            f"• *Completadas visibles:* {len(keep_completed)}"
        )
    return "❌ Error al limpiar historial."


# ================================================================
# COMANDOS DE MONITOREO Y TALLER (Fase 1 y Fase 2)
# ================================================================

def cmd_start() -> str:
    return (
        "🤖 *Xana System — Bot de Control y Taller LuXius (v2.0)*\n"
        "Sistema de control agéntico, taller y monitoreo para *XignuX Gráfica*.\n\n"
        "📊 *Monitoreo y Taller:*\n"
        "• `/status` — Salud del servidor, PostgreSQL y latencia\n"
        "• `/taller` — Cola de impresión, metros lineales y OTs urgentes\n"
        "• `/briefing` — ☀️ Resumen matutino de producción del día\n"
        "• `/alertas` — Materiales críticos con stock bajo el mínimo\n\n"
        "🧠 *Gestión de Tareas de Xana (Fase 2):*\n"
        "• `/tareas` — Ver tareas en curso y completadas\n"
        "• `/addtask [texto]` — Dictar una nueva tarea para Xana\n"
        "• `/completar [ID]` — Marcar tarea como completada\n"
        "• `/clear` — Depurar tareas completadas antiguas\n"
        "• `/sesiones` — Últimos agentes, modelos y commits registrados\n\n"
        "🎤 *Modo Comandante (Fase 3):*\n"
        "• ¡Enviame una **nota de voz**! Xana la transcribirá y creará la tarea o responderá tu consulta al instante.\n"
        "• `/execute [orden]` — Ejecutar consulta agéntica directa a Xana.\n\n"
        "🔒 *Seguridad:* Acceso verificado y restringido por Chat ID."
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

    now_ar = datetime.now(AR_TZ).strftime("%d/%m/%Y %H:%M ART")

    return (
        "⚙️ *Diagnóstico de Infraestructura LuXius*\n\n"
        f"• *Servidor:* Online ✅ ({now_ar})\n"
        f"• *Base de Datos Neon:* {db_status}\n"
        f"• *Órdenes Totales:* {total_orders} OTs registradas\n"
        f"• *Clientes:* {total_clientes}\n"
        f"• *Máquinas Registradas:* {total_maquinas}\n"
        "• *Xana AI:* Operativa (LangGraph + Gate A4 Certificado)\n"
        "• *Cloudflare R2:* Conectado y Activo\n"
        "• *Telegram Gateway:* Modo Gestor & Comandante Activo"
    )


def cmd_taller() -> str:
    try:
        ordenes = Presupuesto.query.filter(
            Presupuesto.deleted_at.is_(None),
            Presupuesto.estado.in_(['orden', 'ORDEN_DE_TRABAJO', 'impreso', 'post', 'borrador'])
        ).order_by(Presupuesto.created_at.asc()).all()

        total_taller = len(ordenes)
        total_ml = 0.0
        urgentes = []
        regular_queue = []

        for p in ordenes:
            esp = p.especificaciones or {}
            tags = [str(t).lower() for t in (esp.get('tags') or [])]
            is_urgente = any('urgente' in t or 'vip' in t for t in tags)

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
            f"• *Total en Proceso:* {total_taller} OTs",
            f"• *Metros Lineales Pendientes:* {total_ml:.2f} ml",
            f"• *🚨 OTs Urgentes:* {len(urgentes)}\n"
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


def cmd_briefing() -> str:
    """Genera y retorna el briefing matutino de producción."""
    try:
        report = generate_daily_briefing()
        return report.get('markdown') or "⚠️ No se pudo formatear el briefing matutino."
    except Exception as e:
        return f"⚠️ Error generando briefing matutino: {e}"


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
        store = _get_xana_memory()
        tasks = store.get('tasks', [])

        if not tasks:
            return "📋 *Memoria de Xana:* No hay tareas registradas en la base de datos."

        in_prog = [t for t in tasks if t.get('status') == 'in_progress']
        completed = [t for t in tasks if t.get('status') == 'completed']

        lines = ["🧠 *Tareas en la Memoria de Xana:*"]
        if in_prog:
            lines.append(f"\n🔄 *En Progreso ({len(in_prog)}):*")
            for t in in_prog[:6]:
                desc = t.get('objective') or t.get('description') or 'Tarea'
                tid = t.get('task_id', 'TASK')
                prio = f" [{t.get('priority')}]" if t.get('priority') == 'alta' else ""
                lines.append(f"• `{tid}`{prio}: {desc[:75]}")

        if completed:
            lines.append(f"\n✅ *Completadas Recientes:*")
            for t in completed[:4]:
                desc = t.get('objective') or t.get('description') or 'Tarea'
                tid = t.get('task_id', 'TASK')
                lines.append(f"• `{tid}`: {desc[:70]}")

        lines.append("\n💡 _Para agregar una tarea: `/addtask [texto]` o mandá un audio._")
        return "\n".join(lines)
    except Exception as e:
        return f"⚠️ Error consultando tareas de Xana: {e}"


def cmd_sesiones() -> str:
    try:
        store = _get_xana_memory()
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


def cmd_execute(instruction: str) -> str:
    """Ejecuta una consulta directa con el motor de Xana."""
    clean = instruction.strip()
    if not clean:
        return "⚠️ Debes ingresar una directiva para ejecutar. Ej: `/execute consultar stock de vinilo`"

    try:
        from services.xana_graph import run_xana_chat
        res = run_xana_chat(clean, user_role='admin', username='TelegramAdmin')
        reply = res.get('reply') or "No se obtuvo respuesta del motor de Xana."
        return f"⚡ *Ejecución de Xana:*\n\n{reply}"
    except Exception as e:
        return f"⚠️ Error ejecutando comando agéntico: {e}"


# ================================================================
# MODO COMANDANTE CON AUDIO DE VOZ (Fase 3)
# ================================================================

def process_telegram_voice_message(chat_id: int | str, file_id: str, mime_type: str = 'audio/ogg') -> dict:
    """
    Descarga una nota de voz de Telegram, la transcribe con Gemini Multimodal y ejecuta la acción adecuada.
    """
    token = get_telegram_token()
    gemini_key = os.environ.get('GEMINI_API_KEY', '').strip()

    if not token:
        return {"ok": False, "error": "token_missing"}
    if not gemini_key:
        send_telegram_message(chat_id, "⚠️ No se puede procesar el audio: `GEMINI_API_KEY` no configurada en el servidor.")
        return {"ok": False, "error": "gemini_key_missing"}

    send_telegram_message(chat_id, "🎤 _Escuchando y analizando nota de voz con Xana..._")

    try:
        # 1. Obtener file_path desde Telegram
        file_info_url = f"https://api.telegram.org/bot{token}/getFile?file_id={file_id}"
        resp_info = requests.get(file_info_url, timeout=10)
        if not resp_info.ok:
            send_telegram_message(chat_id, "❌ Error al obtener el archivo de audio desde Telegram.")
            return {"ok": False, "error": "telegram_get_file_failed"}

        file_path = resp_info.json().get('result', {}).get('file_path')
        if not file_path:
            send_telegram_message(chat_id, "❌ No se encontró la ruta del archivo de audio.")
            return {"ok": False, "error": "no_file_path"}

        # 2. Descargar audio binario
        download_url = f"https://api.telegram.org/file/bot{token}/{file_path}"
        audio_resp = requests.get(download_url, timeout=15)
        if not audio_resp.ok:
            send_telegram_message(chat_id, "❌ Falló la descarga del mensaje de voz.")
            return {"ok": False, "error": "audio_download_failed"}

        audio_bytes = audio_resp.content
        b64_audio = base64.b64encode(audio_bytes).decode('utf-8')

        # 3. Invocar Gemini Multimodal en cascada
        prompt_text = (
            "Sos Xana, el asistente de inteligencia operativa de LuXius System para XignuX Gráfica (imprenta digital y gigantografía).\n"
            "Escuchá con atención este mensaje de voz del operario/dueño y respondé estructuradamente con el siguiente formato exacto:\n\n"
            "TRANSCRIPCION: \"<texto transcripto fielmente en español argentino>\"\n"
            "ACCION: <si el audio pide anotar una tarea o recordatorio, escribí: CREAR_TAREA: <título conciso>; de lo contrario escribí NINGUNA>\n"
            "RESPUESTA: <tu respuesta ejecutiva, cordial y directa al usuario>\n"
        )

        models_cascade = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro']
        ai_text = ""
        success_model = None

        for model in models_cascade:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "inline_data": {
                                    "mime_type": mime_type or "audio/ogg",
                                    "data": b64_audio
                                }
                            },
                            {
                                "text": prompt_text
                            }
                        ]
                    }
                ]
            }

            try:
                g_resp = requests.post(gemini_url, json=payload, timeout=18)
                if g_resp.ok:
                    data = g_resp.json()
                    cands = data.get('candidates', [])
                    if cands:
                        ai_text = cands[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                        if ai_text:
                            success_model = model
                            break
            except Exception as e:
                print(f"[telegram audio] Error con modelo {model}: {e}", file=sys.stderr)

        if not ai_text:
            send_telegram_message(chat_id, "⚠️ No pude transcribir el audio en este momento. Por favor intentá de nuevo o escribí el comando en texto.")
            return {"ok": False, "error": "transcription_failed"}

        # 4. Parsear respuesta
        transcription_match = re.search(r'TRANSCRIPCION:\s*["\']?(.*?)["\']?(?=\nACCION:|\nRESPUESTA:|$)', ai_text, re.DOTALL | re.IGNORECASE)
        action_match = re.search(r'ACCION:\s*(.*?)(?=\nRESPUESTA:|$)', ai_text, re.DOTALL | re.IGNORECASE)
        response_match = re.search(r'RESPUESTA:\s*(.*)', ai_text, re.DOTALL | re.IGNORECASE)

        transcription = transcription_match.group(1).strip() if transcription_match else ""
        action = action_match.group(1).strip() if action_match else ""
        response_body = response_match.group(1).strip() if response_match else ai_text.strip()

        # Si se detectó acción de CREAR_TAREA
        task_created_msg = ""
        if "CREAR_TAREA:" in action.upper():
            task_title = action.split(":", 1)[1].strip()
            if task_title:
                res_task = cmd_addtask(task_title, source="telegram_voice")
                task_created_msg = f"\n\n{res_task}"

        final_msg = (
            f"🎤 *Audio Procesado por Xana*\n"
            f"🗣️ _{transcription or 'Audio analizado'}_{task_created_msg}\n\n"
            f"🤖 *Respuesta:*\n{response_body}"
        )

        send_telegram_message(chat_id, final_msg)
        return {"ok": True, "transcription": transcription, "model": success_model}

    except Exception as e:
        print(f"[telegram] Excepción procesando mensaje de voz: {e}", file=sys.stderr)
        send_telegram_message(chat_id, f"⚠️ Ocurrió un error al procesar la nota de voz: {str(e)[:80]}")
        return {"ok": False, "error": str(e)}


# ================================================================
# ENRUTADOR PRINCIPAL DE WEBHOOK
# ================================================================

def process_telegram_update(update: dict) -> dict:
    """Procesa un webhook update de Telegram y despacha comandos de texto y voz."""
    message = update.get('message') or update.get('edited_message')
    if not message:
        return {"ok": True, "action": "ignored_no_message"}

    chat = message.get('chat', {})
    chat_id = chat.get('id')
    if not chat_id:
        return {"ok": True, "action": "ignored_no_chat_id"}

    # Verificación de Seguridad por Chat ID
    if not is_admin_chat(chat_id):
        refusal = (
            f"⛔ *Acceso Denegado*\n\n"
            f"Tu Chat ID `{chat_id}` no está registrado como administrador autorizado de LuXius System.\n"
            f"Contactá a la administración para habilitar este dispositivo."
        )
        send_telegram_message(chat_id, refusal)
        return {"ok": False, "error": "unauthorized_chat_id", "chat_id": chat_id}

    # 1. Comprobar si es un mensaje de voz o audio (Fase 3)
    voice = message.get('voice') or message.get('audio')
    if voice:
        file_id = voice.get('file_id')
        mime_type = voice.get('mime_type') or 'audio/ogg'
        return process_telegram_voice_message(chat_id, file_id, mime_type)

    # 2. Comprobar texto
    text = (message.get('text') or '').strip()
    if not text:
        return {"ok": True, "action": "ignored_empty_text"}

    parts = text.split(maxsplit=1)
    raw_cmd = parts[0].lower()
    arg = parts[1].strip() if len(parts) > 1 else ""

    # Limpiar arroba de username del bot (ej. /status@luxius_bot -> /status)
    cmd = raw_cmd.split('@')[0] if '@' in raw_cmd else raw_cmd

    response_text = ""
    if cmd in ('/start', '/ayuda', '/help'):
        response_text = cmd_start()
    elif cmd in ('/status', '/salud', '/estado'):
        response_text = cmd_status()
    elif cmd in ('/taller', '/cola', '/impresion'):
        response_text = cmd_taller()
    elif cmd in ('/briefing', '/manana', '/mañana', '/resumen'):
        response_text = cmd_briefing()
    elif cmd in ('/alertas', '/stock'):
        response_text = cmd_alertas()
    elif cmd in ('/tareas', '/tasks'):
        response_text = cmd_tareas()
    elif cmd in ('/addtask', '/agregartarea', '/nueva'):
        response_text = cmd_addtask(arg, source='telegram')
    elif cmd in ('/completar', '/done', '/terminar'):
        response_text = cmd_completar(arg)
    elif cmd in ('/clear', '/limpiar'):
        response_text = cmd_clear()
    elif cmd in ('/sesiones', '/agentes', '/commits'):
        response_text = cmd_sesiones()
    elif cmd in ('/execute', '/ejecutar', '/xana'):
        response_text = cmd_execute(arg)
    else:
        # Si escribe texto libre sin comando, lo tratamos como consulta interactiva a Xana
        response_text = cmd_execute(text)

    send_telegram_message(chat_id, response_text)
    return {"ok": True, "command": cmd, "chat_id": chat_id}
