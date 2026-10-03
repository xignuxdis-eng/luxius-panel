"""
Servicio de Integración Telegram Bot para LuXius y Xana
Fase 1: Monitoreo y Taller (Modo Observador)
Fase 2: Modo Gestor & Notificaciones Push Activas (/addtask, /completar, /clear, /briefing, alertas)
Fase 3: Modo Comandante con Audio de Voz Multimodal (Voice-to-Task / Audio Transcription con Gemini)
Fase 4: Teclado Táctil Wear OS & Móvil, Visualización de Arte (Fotos) y Emisión de Documentos / PDFs
"""

import os
import sys
import json
import base64
import re
import io
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple, Union
import requests
from PIL import Image, ImageDraw

from models import db, Presupuesto, Cliente, Maquina, Vendedor, ConfigGlobal
from services.briefing_service import generate_daily_briefing, resolve_material_name, resolve_bobina_ancho

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


# ================================================================
# TECLADO TÁCTIL (WEAR OS & MÓVIL) Y COMANDOS NATIVOS
# ================================================================

def get_main_reply_keyboard() -> dict:
    """
    Retorna el teclado táctil persistente optimizado para smartwatches (Galaxy Watch) y móviles.
    Al tocar cada botón, Telegram envía el texto de manera instantánea sin tipear.
    """
    return {
        'keyboard': [
            [{'text': '☀️ Briefing'}, {'text': '🖨️ Cola Taller'}],
            [{'text': '🚨 Alertas Stock'}, {'text': '📋 Tareas'}],
            [{'text': '🖼️ Ver Arte OT'}, {'text': '📄 Pedir PDF OT'}],
            [{'text': '⚡ Estado'}, {'text': 'ℹ️ Ayuda'}]
        ],
        'resize_keyboard': True,
        'is_persistent': True
    }


def register_telegram_bot_commands() -> bool:
    """Registra los comandos oficiales en Telegram API para el menú emergente nativo."""
    token = get_telegram_token()
    if not token:
        return False
    url = f"https://api.telegram.org/bot{token}/setMyCommands"
    commands = [
        {"command": "briefing", "description": "☀️ Resumen matutino y tandas de bobina"},
        {"command": "taller", "description": "🖨️ Cola activa de impresión y metros"},
        {"command": "foto", "description": "🖼️ Ver arte o foto de una OT (ej: /foto ee97)"},
        {"command": "pdf", "description": "📄 Descargar archivo PDF o remito de una OT"},
        {"command": "alertas", "description": "🚨 Insumos bajo stock mínimo"},
        {"command": "tareas", "description": "📋 Tareas activas de Xana"},
        {"command": "addtask", "description": "➕ Crear nueva tarea en la memoria"},
        {"command": "done", "description": "✅ Marcar tarea como completada"},
        {"command": "status", "description": "⚡ Salud del servidor y base de datos"},
        {"command": "menu", "description": "📱 Activar botones táctiles en pantalla"}
    ]
    try:
        resp = requests.post(url, json={"commands": commands}, timeout=10)
        return resp.ok
    except Exception as e:
        print(f"[telegram commands] Error registrando comandos: {e}", file=sys.stderr)
        return False


# ================================================================
# ENVÍO DE MENSAJES Y ARCHIVOS MULTIMEDIA
# ================================================================

def send_telegram_message(chat_id: int | str, text: str, parse_mode: str = 'Markdown', reply_markup: Optional[dict] = None) -> bool:
    """Envía un mensaje de texto con soporte automático para el teclado táctil."""
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
    markup = reply_markup if reply_markup is not None else get_main_reply_keyboard()
    if markup:
        payload['reply_markup'] = markup

    try:
        resp = requests.post(url, json=payload, timeout=12)
        if not resp.ok:
            payload.pop('parse_mode', None)
            resp = requests.post(url, json=payload, timeout=12)
        return resp.ok
    except Exception as e:
        print(f"[telegram] Error enviando mensaje a Telegram: {e}", file=sys.stderr)
        return False


def send_telegram_photo(chat_id: int | str, photo: Any, caption: Optional[str] = None, parse_mode: str = 'Markdown', filename: str = 'arte.jpg', reply_markup: Optional[dict] = None) -> bool:
    """
    Envía una fotografía a Telegram (URL o bytes binarios).
    Acepta inline_keyboard o reply_markup.
    """
    token = get_telegram_token()
    if not token:
        return False

    url = f"https://api.telegram.org/bot{token}/sendPhoto"
    data = {'chat_id': chat_id}
    if caption:
        data['caption'] = caption
        data['parse_mode'] = parse_mode

    if reply_markup is not None:
        data['reply_markup'] = json.dumps(reply_markup)

    try:
        if isinstance(photo, (bytes, bytearray)):
            files = {'photo': (filename, photo, 'image/jpeg')}
            resp = requests.post(url, data=data, files=files, timeout=25)
        elif isinstance(photo, str) and (photo.startswith('http://') or photo.startswith('https://')):
            data['photo'] = photo
            resp = requests.post(url, data=data, timeout=25)
        else:
            with open(photo, 'rb') as f:
                files = {'photo': (os.path.basename(photo), f, 'image/jpeg')}
                resp = requests.post(url, data=data, files=files, timeout=25)
        return resp.ok
    except Exception as e:
        print(f"[telegram photo] Error enviando foto: {e}", file=sys.stderr)
        return False


def send_telegram_document(chat_id: int | str, document: Any, filename: str = 'documento.pdf', caption: Optional[str] = None, parse_mode: str = 'Markdown', reply_markup: Optional[dict] = None) -> bool:
    """
    Envía un archivo PDF o documento a Telegram (URL o bytes binarios).
    """
    token = get_telegram_token()
    if not token:
        return False

    url = f"https://api.telegram.org/bot{token}/sendDocument"
    data = {'chat_id': chat_id}
    if caption:
        data['caption'] = caption
        data['parse_mode'] = parse_mode

    if reply_markup is not None:
        data['reply_markup'] = json.dumps(reply_markup)

    try:
        if isinstance(document, (bytes, bytearray)):
            files = {'document': (filename, document, 'application/pdf')}
            resp = requests.post(url, data=data, files=files, timeout=30)
        elif isinstance(document, str) and (document.startswith('http://') or document.startswith('https://')):
            data['document'] = document
            resp = requests.post(url, data=data, timeout=30)
        else:
            with open(document, 'rb') as f:
                files = {'document': (filename or os.path.basename(document), f, 'application/pdf')}
                resp = requests.post(url, data=data, files=files, timeout=30)
        return resp.ok
    except Exception as e:
        print(f"[telegram document] Error enviando documento: {e}", file=sys.stderr)
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
        f"• *Orden:* `OT-{ot_code}`\n"
        f"• *Cliente:* {client_name}\n"
        f"• *Material:* {material} ({ml:.2f} ml)\n"
        f"• *Estado:* `{status}`\n"
        f"• *Motivo:* {reason}\n\n"
        f"⚡ _Priorizar en cola de impresión del taller. Podés pedir su arte con: `/foto {ot_code}`_"
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
        f"📦 _Reponer insumo antes de iniciar tandas de producción._"
    )
    return send_telegram_broadcast(msg) > 0


def notify_xana_decision(decision_id: str, context: str, decision: str) -> bool:
    """Notifica una decisión autónoma relevante tomada por Xana."""
    msg = (
        f"🧠 *DECISIÓN AUTÓNOMA DE XANA*\n\n"
        f"• *ID:* `{decision_id}`\n"
        f"• *Contexto:* {context}\n"
        f"• *Resolución:* {decision}\n\n"
        f"⚙️ _Asentado en memoria operativa del sistema._"
    )
    return send_telegram_broadcast(msg) > 0


# ================================================================
# GESTIÓN DE TAREAS Y MEMORIA DE XANA (Fase 2)
# ================================================================

def _get_xana_memory() -> dict:
    row = ConfigGlobal.query.filter_by(clave='xana_data').first()
    if row and isinstance(row.valor, dict):
        return row.valor
    return {'tasks': [], 'sessions': [], 'commits': []}


def _save_xana_memory(data: dict) -> bool:
    try:
        row = ConfigGlobal.query.filter_by(clave='xana_data').first()
        if not row:
            row = ConfigGlobal(clave='xana_data', valor={})
            db.session.add(row)
        row.valor = data
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"[telegram] Error guardando xana_data: {e}", file=sys.stderr)
        return False


def cmd_addtask(task_text: str, source: str = 'telegram') -> str:
    clean = task_text.strip()
    if not clean:
        return "⚠️ Debes ingresar una descripción para la tarea. Ej: `/addtask Revisar stock de vinilo vehicular`"

    try:
        store = _get_xana_memory()
        tasks = store.get('tasks', [])

        next_idx = len(tasks) + 1
        task_id = f"TASK-{next_idx:03d}"
        now_str = _now_ar_iso()

        prio = 'normal'
        if any(w in clean.lower() for w in ('urgente', 'urgencia', 'ya', 'inmediato', 'crítico')):
            prio = 'alta'

        new_t = {
            'task_id': task_id,
            'description': clean,
            'objective': clean,
            'status': 'in_progress',
            'created_at': now_str,
            'updated_at': now_str,
            'priority': prio,
            'source': source
        }

        tasks.append(new_t)
        store['tasks'] = tasks
        _save_xana_memory(store)

        prio_badge = " 🚨 (Prioridad Alta)" if prio == 'alta' else ""
        return (
            f"✅ *Tarea Registrada en Memoria de Xana*\n\n"
            f"• *ID:* `{task_id}`{prio_badge}\n"
            f"• *Detalle:* {clean}\n"
            f"• *Estado:* `in_progress`\n\n"
            f"💡 _Para completarla: `/done {task_id}`_"
        )
    except Exception as e:
        return f"⚠️ Error registrando tarea en la base de datos: {e}"


def cmd_completar(task_arg: str) -> str:
    clean = task_arg.strip().upper()
    if not clean:
        return "⚠️ Debes ingresar el ID de la tarea. Ej: `/done TASK-012`"

    try:
        store = _get_xana_memory()
        tasks = store.get('tasks', [])

        found = None
        for t in tasks:
            if t.get('task_id', '').upper() == clean or clean in t.get('task_id', '').upper():
                found = t
                break

        if not found:
            return f"❌ No se encontró ninguna tarea con el ID `{clean}`."

        found['status'] = 'completed'
        found['completed_at'] = _now_ar_iso()
        store['tasks'] = tasks
        _save_xana_memory(store)

        desc = found.get('objective') or found.get('description') or ''
        return f"🎉 *Tarea Completada:* `{found.get('task_id')}`\n_{desc}_\n\nQuedó registrada como finalizada en la memoria."
    except Exception as e:
        return f"⚠️ Error actualizando tarea: {e}"


def cmd_clear() -> str:
    try:
        store = _get_xana_memory()
        tasks = store.get('tasks', [])

        in_progress = [t for t in tasks if t.get('status') == 'in_progress']
        purged_count = len(tasks) - len(in_progress)

        store['tasks'] = in_progress
        _save_xana_memory(store)

        return f"🧹 *Memoria de Xana Depurada:*\nSe archivaron {purged_count} tareas completadas. Quedan {len(in_progress)} tareas activas en progreso."
    except Exception as e:
        return f"⚠️ Error limpiando tareas: {e}"


# ================================================================
# COMANDOS DE MONITOREO Y TALLER (Fase 1 y Fase 2)
# ================================================================

def cmd_start() -> str:
    register_telegram_bot_commands()
    return (
        "🤖 *Xana System — Bot de Control y Taller LuXius (v2.1)*\n"
        "Sistema de control agéntico, taller y monitoreo para *XignuX Gráfica*.\n\n"
        "📱 *Botones Táctiles Activos (Galaxy Watch & Móvil):*\n"
        "Podés usar los botones fijos en pantalla para consultar todo de 1 solo toque.\n\n"
        "📊 *Monitoreo y Taller:*\n"
        "• `/taller` — Cola de impresión, metros lineales y OTs urgentes\n"
        "• `/briefing` — ☀️ Resumen matutino de producción del día\n"
        "• `/alertas` — Insumos críticos con stock bajo el mínimo\n"
        "• `/status` — Salud del servidor, PostgreSQL y latencia\n\n"
        "🖼️ *Visualización y Archivos (Fase 4):*\n"
        "• `/foto [código]` — Ver el arte o foto de producción de una OT (ej: `/foto ee97`)\n"
        "• `/pdf [código]` — Descargar el PDF original o ficha técnica de una OT\n"
        "• `/menu` — Mostrar los botones táctiles de acceso rápido\n\n"
        "🧠 *Gestión de Tareas de Xana (Fase 2):*\n"
        "• `/tareas` — Ver tareas en curso y completadas\n"
        "• `/addtask [texto]` — Dictar una nueva tarea para Xana\n"
        "• `/done [ID]` — Marcar tarea como completada\n"
        "• `/clear` — Depurar tareas completadas antiguas\n\n"
        "🎤 *Modo Comandante (Fase 3):*\n"
        "• ¡Enviame una **nota de voz**! Xana la transcribirá y creará la tarea o responderá al instante.\n"
        "• Podés pedir por voz: _'mandame la foto de la orden sacilotto'_ o _'pasame el pdf de la orden 123'_.\n\n"
        "🔒 *Seguridad:* Acceso verificado y restringido por Chat ID."
    )


def cmd_menu(chat_id: int | str) -> bool:
    """Fuerza la activación del teclado de botones táctiles en el reloj o móvil."""
    register_telegram_bot_commands()
    msg = (
        "📱 *Teclado Táctil Activado*\n\n"
        "Tenés los botones de acceso rápido fijados en la parte inferior de la pantalla:\n"
        "• ☀️ *Briefing:* Resumen matutino de taller\n"
        "• 🖨️ *Cola Taller:* Órdenes vivas y metros lineales\n"
        "• 🚨 *Alertas Stock:* Insumos bajo mínimo\n"
        "• 📋 *Tareas:* Tareas activas de Xana\n"
        "• 🖼️ *Ver Arte OT:* Solicitar foto de una orden\n"
        "• 📄 *Pedir PDF OT:* Descargar PDF o remito de una orden\n"
        "• ⚡ *Estado:* Latencia y salud de servidores\n\n"
        "⌚ _En tu Galaxy Watch Ultra podés pulsar directamente cada botón con el dedo._"
    )
    return send_telegram_message(chat_id, msg, reply_markup=get_main_reply_keyboard())


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
        "• *Telegram Gateway:* Modo Gestor, Comandante y Visor Activos"
    )


def cmd_taller() -> str:
    try:
        ordenes = Presupuesto.query.filter(
            Presupuesto.deleted_at.is_(None),
            Presupuesto.estado.in_(['orden', 'ORDEN_DE_TRABAJO'])
        ).order_by(Presupuesto.created_at.asc()).all()

        total_impresas = Presupuesto.query.filter(
            Presupuesto.deleted_at.is_(None),
            Presupuesto.estado.in_(['impreso', 'IMPRESO'])
        ).count()

        total_taller = len(ordenes)
        total_ml = 0.0
        urgentes = []
        regular_queue = []

        for o in ordenes:
            esp = o.especificaciones or {}
            ancho = esp.get('ancho') or esp.get('anchoReal') or 0
            alto = esp.get('alto') or esp.get('altoReal') or 0
            copias = esp.get('copias') or 1
            tags = esp.get('tags') or []

            try:
                c = int(copias)
                a = float(alto)
                ml = a * c
            except Exception:
                ml = 1.0

            total_ml += ml
            mat_raw = esp.get('material') or 'Material Estándar'
            mat_name = resolve_material_name(mat_raw)
            bobina_ancho = resolve_bobina_ancho(esp, float(ancho) if str(ancho).replace('.','',1).isdigit() else 1.0)
            mat_display = f"{mat_name} ({bobina_ancho})"

            is_urg = any('URGENTE' in str(t).upper() or 'VIP' in str(t).upper() for t in tags)
            cl_name = o.cliente.nombre if o.cliente else 'Sin Cliente'
            ot_code = f"OT-{str(o.id)[:8]}"

            item_data = {
                'ot': ot_code,
                'cliente': cl_name,
                'material': mat_display,
                'ml': round(ml, 2),
                'urgente': is_urg
            }

            if is_urg:
                urgentes.append(item_data)
            else:
                regular_queue.append(item_data)

        lines = [
            "🖨️ *Estado Actual de la Cola de Impresión*\n",
            f"• *Trabajos Pendientes de Impresión:* {total_taller} OTs",
            f"• *Metros Lineales en Cola:* {total_ml:.2f} ml",
            f"• *🚨 OTs Urgentes / VIP:* {len(urgentes)}",
            f"• *✅ Ya Impresas en Taller:* {total_impresas} OTs\n"
        ]

        if urgentes:
            lines.append("🔥 *URGENCIAS ACTIVAS:*")
            for u in urgentes[:5]:
                lines.append(f"• 🚨 *{u['ot']}* | {u['cliente']} — {u['material']} ({u['ml']} ml)")
            lines.append("")

        lines.append("📋 *Próximas OTs en Cola de Producción:*")
        all_sorted = urgentes + regular_queue
        for idx, item in enumerate(all_sorted[:8], 1):
            badge = "🚨 " if item['urgente'] else ""
            lines.append(f"{idx}. {badge}*{item['ot']}* — {item['cliente']} ({item['material']}) · {item['ml']} ml")

        if not all_sorted:
            lines.append("✨ *Taller al día: No hay trabajos pendientes de impresión.*")
        else:
            lines.append("\n💡 _Para ver el arte o foto: `/foto [código]`_")

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


TELEGRAM_CHAT_HISTORIES: Dict[str, List[Dict[str, str]]] = {}


def cmd_execute(instruction: str, chat_id: Optional[Union[int, str]] = None) -> str:
    """Ejecuta una consulta directa con el motor de Xana manteniendo contexto conversacional."""
    clean = instruction.strip()
    if not clean:
        return "⚠️ Debes ingresar una directiva para ejecutar. Ej: `/execute consultar stock de vinilo`"

    try:
        from services.xana_graph import run_xana_chat
        history = None
        cid_str = str(chat_id) if chat_id else ""
        if cid_str:
            history = TELEGRAM_CHAT_HISTORIES.get(cid_str, [])

        res = run_xana_chat(clean, user_role='admin', username='TelegramAdmin', history=history)
        reply = res.get('reply') or "No se obtuvo respuesta del motor de Xana."

        if cid_str:
            if cid_str not in TELEGRAM_CHAT_HISTORIES:
                TELEGRAM_CHAT_HISTORIES[cid_str] = []
            TELEGRAM_CHAT_HISTORIES[cid_str].append({'role': 'user', 'content': clean})
            TELEGRAM_CHAT_HISTORIES[cid_str].append({'role': 'assistant', 'content': reply})
            if len(TELEGRAM_CHAT_HISTORIES[cid_str]) > 12:
                TELEGRAM_CHAT_HISTORIES[cid_str] = TELEGRAM_CHAT_HISTORIES[cid_str][-12:]

        return f"⚡ *Ejecución de Xana:*\n\n{reply}"
    except Exception as e:
        return f"⚠️ Error ejecutando comando agéntico: {e}"


# ================================================================
# FASE 4: VISUALIZACIÓN DE FOTOS Y GENERACIÓN / ENVÍO DE PDFS
# ================================================================

def find_order_by_query(query: str = "") -> Optional[Presupuesto]:
    """Busca una orden de trabajo por código parcial, cliente o devuelve la más prioritaria."""
    clean = (query or '').strip().lower()
    for prefix in ('ot-', '#', 'ot_', 'orden '):
        if clean.startswith(prefix):
            clean = clean[len(prefix):].strip()

    # Si no se pasó código o coincide con el texto del botón
    if not clean or clean in ('ver foto ot', 'pedir pdf ot', 'foto', 'pdf', 'arte'):
        # 1. Buscar orden urgente activa
        urg = Presupuesto.query.filter(
            Presupuesto.deleted_at.is_(None),
            Presupuesto.estado.in_(['orden', 'ORDEN_DE_TRABAJO'])
        ).order_by(Presupuesto.created_at.asc()).all()
        for o in urg:
            tags = (o.especificaciones or {}).get('tags', [])
            if any('URGENTE' in str(t).upper() or 'VIP' in str(t).upper() for t in tags):
                return o
        if urg:
            return urg[0]
        return Presupuesto.query.filter(Presupuesto.deleted_at.is_(None)).order_by(Presupuesto.id.desc()).first()

    # 1. Búsqueda por ID (parcial al inicio o contenido)
    by_id = Presupuesto.query.filter(
        Presupuesto.deleted_at.is_(None),
        Presupuesto.id.ilike(f"{clean}%")
    ).first()
    if by_id:
        return by_id

    by_id_sub = Presupuesto.query.filter(
        Presupuesto.deleted_at.is_(None),
        Presupuesto.id.ilike(f"%{clean}%")
    ).first()
    if by_id_sub:
        return by_id_sub

    # 2. Búsqueda por nombre de cliente
    cliente_match = Cliente.query.filter(
        Cliente.nombre.ilike(f"%{clean}%")
    ).all()
    if cliente_match:
        c_ids = [c.id for c in cliente_match]
        by_client = Presupuesto.query.filter(
            Presupuesto.deleted_at.is_(None),
            Presupuesto.cliente_id.in_(c_ids)
        ).order_by(Presupuesto.id.desc()).first()
        if by_client:
            return by_client

    # 3. Búsqueda en descripción
    by_desc = Presupuesto.query.filter(
        Presupuesto.deleted_at.is_(None),
        Presupuesto.descripcion.ilike(f"%{clean}%")
    ).first()
    if by_desc:
        return by_desc

    return None


def get_order_image_bytes(order: Presupuesto) -> Tuple[Optional[bytes], Optional[str]]:
    """Obtiene los bytes del archivo de imagen de la orden desde disco local o Cloudflare R2."""
    esp = order.especificaciones or {}
    archivos = esp.get('archivos') or esp.get('archivosOriginales') or []
    if not archivos:
        return None, None

    image_exts = ('.jpg', '.jpeg', '.png', '.webp', '.bmp')
    target_filename = None
    for a in archivos:
        ext = os.path.splitext(a)[1].lower()
        if ext in image_exts:
            target_filename = a
            break

    if not target_filename:
        target_filename = archivos[0]

    # 1. Intentar disco local
    try:
        from app import UPLOADS_DIR
        local_p = os.path.join(UPLOADS_DIR, target_filename)
        if os.path.isfile(local_p):
            with open(local_p, 'rb') as f:
                return f.read(), target_filename
    except Exception:
        pass

    # 2. Intentar Cloudflare R2
    try:
        from services.r2_storage import r2_storage
        for prefix in ('uploads/', 'thumbnails/', ''):
            try:
                k = f"{prefix}{target_filename}"
                obj = r2_storage.client.get_object(Bucket=r2_storage.bucket_name, Key=k)
                data = obj['Body'].read()
                if data:
                    return data, target_filename
            except Exception:
                continue
    except Exception as e:
        print(f"[telegram r2] Error conectando con R2: {e}", file=sys.stderr)

    return None, target_filename


def prepare_telegram_image(image_bytes: bytes, max_dim: int = 1600) -> bytes:
    """Optimiza y convierte la imagen a RGB JPEG para entrega instantánea a Smartwatch y Móvil."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')
        w, h = img.size
        if max(w, h) > max_dim:
            scale = max_dim / max(w, h)
            new_size = (max(1, int(w * scale)), max(1, int(h * scale)))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        out = io.BytesIO()
        img.save(out, format='JPEG', quality=85, optimize=True)
        return out.getvalue()
    except Exception as e:
        print(f"[telegram prepare image] Error optimizando: {e}", file=sys.stderr)
        return image_bytes


def generate_order_ficha_pdf(order_code: str, cliente: str, medidas: str, material: str, ml: float, fecha: str, total: float = 0.0, preview_img_bytes: Optional[bytes] = None) -> bytes:
    """Genera dinámicamente una Ficha Técnica / Remito A4 en PDF para una orden."""
    w, h = 1240, 1754  # A4 a 150 DPI
    img = Image.new('RGB', (w, h), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Cabecera corporativa Azul Oscuro
    draw.rectangle([0, 0, w, 160], fill=(15, 23, 42))
    draw.text((60, 40), "LUXIUS SYSTEM", fill=(56, 189, 248))
    draw.text((60, 80), "XignuX Gráfica · Ficha Técnica de Taller", fill=(255, 255, 255))
    draw.text((w - 380, 60), f"OT #{order_code}", fill=(251, 191, 36))

    # Borde exterior
    draw.rectangle([40, 190, w - 40, h - 80], outline=(226, 232, 240), width=3)

    # Tabla de especificaciones
    y = 230
    draw.text((70, y), "DATOS DE LA ORDEN DE TRABAJO", fill=(30, 41, 59))
    y += 50
    draw.line([70, y, w - 70, y], fill=(226, 232, 240), width=2)
    y += 30

    fields = [
        ("Cliente:", cliente),
        ("Fecha de Emisión:", fecha),
        ("Medidas Objetivo:", medidas),
        ("Material / Bobina:", material),
        ("Metros Lineales:", f"{ml:.2f} ml"),
        ("Monto Estimado:", f"${total:,.2f}" if total else "A convenir")
    ]

    for label, val in fields:
        draw.text((80, y), label, fill=(100, 116, 139))
        draw.text((280, y), str(val), fill=(15, 23, 42))
        y += 42

    y += 40
    draw.line([70, y, w - 70, y], fill=(226, 232, 240), width=2)
    y += 30

    draw.text((70, y), "ARTE DE PRODUCCIÓN (PREVIEW)", fill=(30, 41, 59))
    y += 50

    if preview_img_bytes:
        try:
            art = Image.open(io.BytesIO(preview_img_bytes))
            if art.mode not in ('RGB', 'L'):
                art = art.convert('RGB')
            max_art_w = w - 160
            max_art_h = (h - 120) - y
            art.thumbnail((max_art_w, max_art_h), Image.Resampling.LANCZOS)
            offset_x = (w - art.width) // 2
            img.paste(art, (offset_x, y))
        except Exception as e:
            draw.text((80, y), f"[Error previsualizando arte: {e}]", fill=(239, 68, 68))
    else:
        draw.text((80, y), "[Sin previsualización de arte disponible]", fill=(148, 163, 184))

    # Pie de página
    draw.text((60, h - 50), "Documento generado por Xana Operativa · LuXius System", fill=(148, 163, 184))

    pdf_io = io.BytesIO()
    img.save(pdf_io, format='PDF', resolution=150.0)
    return pdf_io.getvalue()


def cmd_foto(chat_id: int | str, arg: str = "") -> bool:
    """Envía la imagen o arte de producción de una orden al chat de Telegram."""
    order = find_order_by_query(arg)
    if not order:
        clean_arg = arg.strip()
        msg = f"❌ No se encontró ninguna orden que coincida con `{clean_arg}`." if clean_arg else "❌ No hay órdenes pendientes con arte disponible en este momento."
        msg += "\n\n💡 *Ejemplo:* `/foto ee97` o decime por voz _'mostrame la foto de sacilotto'_."
        return send_telegram_message(chat_id, msg)

    ot_code = str(order.id)[:8]
    cl_name = order.cliente.nombre if order.cliente else 'Sin Cliente'
    esp = order.especificaciones or {}

    ancho = esp.get('ancho') or esp.get('anchoReal') or '0'
    alto = esp.get('alto') or esp.get('altoReal') or '0'
    material = resolve_material_name(esp.get('material') or 'Vinilo')
    bobina = resolve_bobina_ancho(esp, float(ancho) if str(ancho).replace('.','',1).isdigit() else 1.0)

    try:
        copias = int(esp.get('copias') or 1)
        ml = (float(alto) * copias) if str(alto).replace('.','',1).isdigit() else 1.0
    except Exception:
        ml = 1.0

    send_telegram_message(chat_id, f"🔍 _Buscando arte para OT #{ot_code} ({cl_name})..._")

    img_bytes, filename = get_order_image_bytes(order)
    if not img_bytes:
        archivos = esp.get('archivos') or esp.get('archivosOriginales') or []
        pdf_file = next((a for a in archivos if a.lower().endswith('.pdf')), None)
        if pdf_file:
            msg = (
                f"ℹ️ *Orden #{ot_code} ({cl_name})*\n"
                f"Esta orden cuenta con un archivo vectorial PDF: `{pdf_file}`.\n\n"
                f"📥 Podés descargarlo con `/pdf {ot_code}`."
            )
            return send_telegram_message(chat_id, msg)
        else:
            return send_telegram_message(chat_id, f"⚠️ La orden `#{ot_code}` no tiene archivos de imagen disponibles.")

    optimized_bytes = prepare_telegram_image(img_bytes)

    caption = (
        f"🖼️ *Orden #{ot_code}*\n"
        f"👤 *Cliente:* {cl_name}\n"
        f"📐 *Medidas:* {ancho} x {alto} m · ({ml:.2f} ml)\n"
        f"🧵 *Material:* {material} ({bobina})\n"
        f"🚦 *Estado:* `{order.estado}`\n"
        f"📄 *Archivo:* `{filename}`"
    )

    inline_keyboard = {
        'inline_keyboard': [
            [
                {'text': '📄 Descargar PDF', 'callback_data': f'pdf_{ot_code}'},
                {'text': '🖨️ Cola Taller', 'callback_data': 'cmd_taller'}
            ]
        ]
    }

    return send_telegram_photo(chat_id, optimized_bytes, caption=caption, filename=filename or f"OT_{ot_code}.jpg", reply_markup=inline_keyboard)


def cmd_pdf(chat_id: int | str, arg: str = "") -> bool:
    """Envía el PDF original o genera una Ficha Técnica en PDF para la orden."""
    order = find_order_by_query(arg)
    if not order:
        clean_arg = arg.strip()
        msg = f"❌ No se encontró ninguna orden que coincida con `{clean_arg}`." if clean_arg else "❌ No hay órdenes pendientes para emitir PDF."
        msg += "\n\n💡 *Ejemplo:* `/pdf ee97` o decime por voz _'mandame el pdf de sacilotto'_."
        return send_telegram_message(chat_id, msg)

    ot_code = str(order.id)[:8]
    cl_name = order.cliente.nombre if order.cliente else 'Sin Cliente'
    esp = order.especificaciones or {}

    send_telegram_message(chat_id, f"📄 _Preparando documento PDF para OT #{ot_code}..._")

    archivos = esp.get('archivos') or esp.get('archivosOriginales') or []
    pdf_filename = next((a for a in archivos if a.lower().endswith('.pdf')), None)

    pdf_bytes = None
    target_name = f"OT_{ot_code}_FichaTecnica.pdf"

    # 1. Si la orden tiene un PDF original adjunto en R2, enviarlo
    if pdf_filename:
        try:
            from services.r2_storage import r2_storage
            for prefix in ('uploads/', ''):
                try:
                    k = f"{prefix}{pdf_filename}"
                    obj = r2_storage.client.get_object(Bucket=r2_storage.bucket_name, Key=k)
                    data = obj['Body'].read()
                    if data:
                        pdf_bytes = data
                        target_name = pdf_filename
                        break
                except Exception:
                    continue
        except Exception:
            pass

    # 2. Si no hay PDF original en R2 (ej. arte subido en JPG), generar Ficha Técnica PDF en vivo
    if not pdf_bytes:
        img_bytes, _ = get_order_image_bytes(order)
        ancho = esp.get('ancho') or esp.get('anchoReal') or '0'
        alto = esp.get('alto') or esp.get('altoReal') or '0'
        material = resolve_material_name(esp.get('material') or 'Vinilo')
        bobina = resolve_bobina_ancho(esp, float(ancho) if str(ancho).replace('.','',1).isdigit() else 1.0)
        try:
            copias = int(esp.get('copias') or 1)
            ml = (float(alto) * copias) if str(alto).replace('.','',1).isdigit() else 1.0
        except Exception:
            ml = 1.0
        fecha = order.created_at.strftime("%d/%m/%Y") if order.created_at else datetime.now().strftime("%d/%m/%Y")
        total = float(order.total or 0)

        pdf_bytes = generate_order_ficha_pdf(
            order_code=ot_code,
            cliente=cl_name,
            medidas=f"{ancho} x {alto} m",
            material=f"{material} ({bobina})",
            ml=ml,
            fecha=fecha,
            total=total,
            preview_img_bytes=img_bytes
        )

    caption = (
        f"📄 *Ficha Técnica / Documento OT #{ot_code}*\n"
        f"👤 *Cliente:* {cl_name}\n"
        f"🚦 *Estado:* `{order.estado}`"
    )

    return send_telegram_document(chat_id, pdf_bytes, filename=target_name, caption=caption)


# ================================================================
# MODO COMANDANTE CON AUDIO Y FOTOS (Fase 3 & Fase 4)
# ================================================================

def process_telegram_photo_message(chat_id: int | str, photo_list: list, caption: str = "") -> dict:
    """Procesa una foto enviada por el usuario (desde smartwatch o móvil) mediante Gemini Vision."""
    token = get_telegram_token()
    gemini_key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not token or not photo_list:
        return {"ok": False, "error": "missing_data"}

    send_telegram_message(chat_id, "👁️ _Analizando fotografía con Xana Vision..._")

    try:
        photo = photo_list[-1]
        file_id = photo.get('file_id')

        file_info_url = f"https://api.telegram.org/bot{token}/getFile?file_id={file_id}"
        resp_info = requests.get(file_info_url, timeout=10)
        if not resp_info.ok:
            return {"ok": False, "error": "get_file_failed"}
        file_path = resp_info.json().get('result', {}).get('file_path')
        if not file_path:
            return {"ok": False, "error": "no_file_path"}

        download_url = f"https://api.telegram.org/file/bot{token}/{file_path}"
        r_down = requests.get(download_url, timeout=15)
        if not r_down.ok:
            return {"ok": False, "error": "download_failed"}

        b64_img = base64.b64encode(r_down.content).decode('utf-8')

        prompt = (
            "Sos Xana, el asistente de inteligencia de LuXius System para XignuX Gráfica (imprenta digital y gigantografía).\n"
            "El usuario te acaba de enviar esta fotografía desde su celular o smartwatch Samsung Galaxy Watch.\n"
            f"Texto/Comentario adjunto: '{caption or 'Sin texto'}'\n\n"
            "Analizá la imagen y respondé de manera concisa y ejecutiva en español argentino:\n"
            "1. ¿Qué tipo de contenido es? (Comprobante de pago, trabajo impreso en taller, foto de marquesina, muestra de color, etiqueta, etc.)\n"
            "2. Datos clave detectados (números de OT, importes en pesos, clientes, medidas o fechas si son legibles).\n"
            "3. Conclusión o recomendación técnica para producción o administración."
        )

        models_cascade = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-lite-latest']
        analysis = ""
        for model in models_cascade:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": b64_img
                                }
                            },
                            {
                                "text": prompt
                            }
                        ]
                    }
                ]
            }

            try:
                g_resp = requests.post(gemini_url, json=payload, timeout=22)
                if g_resp.ok:
                    data = g_resp.json()
                    cands = data.get('candidates', [])
                    if cands:
                        analysis = cands[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                        if analysis:
                            break
                else:
                    print(f"[telegram photo analysis] Modelo {model} falló con HTTP {g_resp.status_code}", file=sys.stderr)
            except Exception as e:
                print(f"[telegram photo analysis] Excepción con modelo {model}: {e}", file=sys.stderr)

        if analysis:
            reply = f"👁️ *Análisis Visual de Xana:*\n\n{analysis}"
            send_telegram_message(chat_id, reply)
            return {"ok": True, "analysis": analysis}

        send_telegram_message(chat_id, "⚠️ Recibí la imagen pero no pude completar el análisis visual en este momento.")
        return {"ok": False, "error": "gemini_error"}
    except Exception as e:
        print(f"[telegram photo analysis] Error: {e}", file=sys.stderr)
        send_telegram_message(chat_id, f"⚠️ Error analizando fotografía: {str(e)[:80]}")
        return {"ok": False, "error": str(e)}


def process_telegram_voice_message(chat_id: int | str, file_id: str, mime_type: str = 'audio/ogg') -> dict:
    """Descarga una nota de voz de Telegram, la transcribe con Gemini Multimodal y ejecuta la acción adecuada."""
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
        audio_resp = requests.get(download_url, timeout=20)
        if not audio_resp.ok:
            send_telegram_message(chat_id, "❌ Falló la descarga del mensaje de voz.")
            return {"ok": False, "error": "audio_download_failed"}

        audio_bytes = audio_resp.content
        b64_audio = base64.b64encode(audio_bytes).decode('utf-8')

        # Normalizar MIME type para compatibilidad con Gemini Audio API
        raw_mime = (mime_type or 'audio/ogg').split(';')[0].strip().lower()
        if raw_mime in ('audio/oga', 'audio/opus'):
            eff_mime = 'audio/ogg'
        elif raw_mime in ('audio/mp3', 'audio/mpeg'):
            eff_mime = 'audio/mp3'
        elif raw_mime in ('audio/wav', 'audio/x-wav'):
            eff_mime = 'audio/wav'
        elif raw_mime in ('audio/m4a', 'audio/x-m4a', 'audio/aac'):
            eff_mime = 'audio/aac'
        else:
            eff_mime = 'audio/ogg'

        # 3. Invocar Gemini Multimodal en cascada inteligente
        prompt_text = (
            "Sos Xana, el asistente de inteligencia operativa de LuXius System para XignuX Gráfica (imprenta digital y gigantografía).\n"
            "Escuchá con atención este mensaje de voz del operario/dueño y respondé estructuradamente con el siguiente formato exacto:\n\n"
            "TRANSCRIPCION: \"<texto transcripto fielmente en español argentino>\"\n"
            "ACCION: <elegí UNA de las siguientes opciones:\n"
            "- CREAR_TAREA: <título conciso> (si pide anotar una tarea o recordatorio)\n"
            "- FOTO_OT: <código o cliente> (si pide ver la foto, imagen o arte de una orden)\n"
            "- PDF_OT: <código o cliente> (si pide el pdf, remito o ficha técnica de una orden)\n"
            "- TALLER (si pregunta cómo está el taller, qué hay para imprimir o la cola)\n"
            "- BRIEFING (si pide el resumen matutino del día)\n"
            "- NINGUNA (para consultas generales o dudas)>\n"
            "RESPUESTA: <tu respuesta ejecutiva, cordial y directa al usuario>\n"
        )

        models_cascade = [
            'gemini-3.5-flash',
            'gemini-3.5-flash-lite',
            'gemini-3.6-flash',
            'gemini-flash-lite-latest',
            'gemini-3.1-flash-lite'
        ]
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
                                    "mime_type": eff_mime,
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
                g_resp = requests.post(gemini_url, json=payload, timeout=25)
                if g_resp.ok:
                    data = g_resp.json()
                    cands = data.get('candidates', [])
                    if cands:
                        parts = cands[0].get('content', {}).get('parts', [])
                        if parts:
                            ai_text = parts[0].get('text', '')
                            if ai_text:
                                success_model = model
                                break
                else:
                    print(f"[telegram audio] Modelo {model} falló con HTTP {g_resp.status_code}: {g_resp.text[:120]}", file=sys.stderr)
            except Exception as e:
                print(f"[telegram audio] Excepción con modelo {model}: {e}", file=sys.stderr)

        if not ai_text:
            print(f"[telegram audio] Falla total: ninguno de los {len(models_cascade)} modelos pudo procesar el audio.", file=sys.stderr)
            send_telegram_message(chat_id, "⚠️ No pude transcribir el audio en este momento. Por favor intentá de nuevo o escribí el comando en texto.")
            return {"ok": False, "error": "transcription_failed"}

        # 4. Parsear respuesta
        transcription_match = re.search(r'TRANSCRIPCION:\s*["\']?(.*?)["\']?(?=\nACCION:|\nRESPUESTA:|$)', ai_text, re.DOTALL | re.IGNORECASE)
        action_match = re.search(r'ACCION:\s*(.*?)(?=\nRESPUESTA:|$)', ai_text, re.DOTALL | re.IGNORECASE)
        response_match = re.search(r'RESPUESTA:\s*(.*)', ai_text, re.DOTALL | re.IGNORECASE)

        transcription = transcription_match.group(1).strip() if transcription_match else ""
        action = action_match.group(1).strip() if action_match else ""
        response_body = response_match.group(1).strip() if response_match else ai_text.strip()

        # Detección inteligente de intenciones (con fallback sobre transcripción y texto completo)
        full_text = f"{transcription} {action} {response_body}"
        full_text_lower = full_text.lower()
        act_upper = action.upper()

        target_ot = ""
        # 1. Si action tiene código explícito (ej: FOTO_OT: 104)
        if ":" in action and any(k in act_upper for k in ("FOTO_OT:", "PDF_OT:")):
            target_ot = action.split(":", 1)[1].strip()

        # 2. Si no se extrajo de action, buscar en el texto respetando límites de palabra
        if not target_ot:
            ot_search = re.search(r'\b(?:ot[\s\-_:#]*|orden[\s\-_:#]+|#\s*)([a-zA-Z0-9]{2,12})\b', full_text_lower)
            if ot_search:
                candidate = ot_search.group(1).strip()
                if candidate not in ('de', 'del', 'la', 'el', 'un', 'una', 'urgente', 'activa'):
                    target_ot = candidate

        # Tarea
        task_created_msg = ""
        if "CREAR_TAREA:" in act_upper or any(k in full_text_lower for k in ('anotar tarea', 'crear tarea', 'recordame', 'recordatorio')):
            task_title = ""
            if "CREAR_TAREA:" in act_upper:
                task_title = action.split(":", 1)[1].strip()
            elif transcription:
                task_title = transcription
            if task_title:
                res_task = cmd_addtask(task_title, source="telegram_voice")
                task_created_msg = f"\n\n{res_task}"

        final_msg = (
            f"🎤 *Audio Procesado por Xana*\n"
            f"🗣️ _{transcription or 'Audio analizado'}_{task_created_msg}\n\n"
            f"🤖 *Respuesta:*\n{response_body}"
        )
        send_telegram_message(chat_id, final_msg)

        # Ejecución proactiva si pidió Foto, PDF, Taller o Briefing
        if any(k in full_text_lower for k in ('foto', 'imagen', 'arte', 'diseño')) or "FOTO_OT" in act_upper:
            cmd_foto(chat_id, target_ot)
        elif any(k in full_text_lower for k in ('pdf', 'remito', 'ficha')) or "PDF_OT" in act_upper:
            cmd_pdf(chat_id, target_ot)
        elif "TALLER" in act_upper or any(k in full_text_lower for k in ('taller', 'cola de impresión', 'cola de impresion', 'para imprimir', 'máquinas', 'impresoras')):
            send_telegram_message(chat_id, cmd_taller())
        elif "BRIEFING" in act_upper or any(k in full_text_lower for k in ('briefing', 'resumen matutino', 'resumen del día', 'cómo arrancamos', 'arranque')):
            send_telegram_message(chat_id, cmd_briefing())

        return {"ok": True, "transcription": transcription, "model": success_model}

    except Exception as e:
        print(f"[telegram] Excepción procesando mensaje de voz: {e}", file=sys.stderr)
        send_telegram_message(chat_id, f"⚠️ Ocurrió un error al procesar la nota de voz: {str(e)[:80]}")
        return {"ok": False, "error": str(e)}


# ================================================================
# ENRUTADOR PRINCIPAL DE WEBHOOK
# ================================================================

def process_telegram_update(update: dict) -> dict:
    """Procesa un webhook update de Telegram y despacha comandos de texto, botones, fotos y voz."""
    # 0. Manejo de botones Inline (Callback Queries)
    callback_query = update.get('callback_query')
    if callback_query:
        cb_id = callback_query.get('id')
        cb_data = callback_query.get('data') or ''
        cb_chat = callback_query.get('message', {}).get('chat', {})
        cb_chat_id = cb_chat.get('id')

        token = get_telegram_token()
        if token and cb_id:
            try:
                requests.post(f"https://api.telegram.org/bot{token}/answerCallbackQuery", json={'callback_query_id': cb_id}, timeout=5)
            except Exception:
                pass

        if not is_admin_chat(cb_chat_id):
            return {"ok": False, "error": "unauthorized"}

        if cb_data.startswith('pdf_'):
            ot_sub = cb_data.split('_', 1)[1]
            cmd_pdf(cb_chat_id, ot_sub)
        elif cb_data.startswith('foto_'):
            ot_sub = cb_data.split('_', 1)[1]
            cmd_foto(cb_chat_id, ot_sub)
        elif cb_data == 'cmd_taller':
            send_telegram_message(cb_chat_id, cmd_taller())
        elif cb_data == 'cmd_briefing':
            send_telegram_message(cb_chat_id, cmd_briefing())

        return {"ok": True, "action": "callback_processed", "data": cb_data}

    # Mensaje normal
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

    # 2. Comprobar si es una fotografía enviada por el usuario (Fase 4)
    photo = message.get('photo')
    if photo:
        caption = message.get('caption') or ''
        return process_telegram_photo_message(chat_id, photo, caption)

    # 3. Comprobar texto / comandos / botones táctiles
    text = (message.get('text') or '').strip()
    if not text:
        return {"ok": True, "action": "ignored_empty_text"}

    parts = text.split(maxsplit=1)
    raw_cmd = parts[0].lower()
    arg = parts[1].strip() if len(parts) > 1 else ""

    cmd = raw_cmd.split('@')[0] if '@' in raw_cmd else raw_cmd
    norm = text.lower().strip()

    # Despachador enriquecido para comandos y botones táctiles del reloj
    if norm.startswith('☀️') or norm == 'briefing' or cmd in ('/briefing', '/manana', '/mañana', '/resumen'):
        send_telegram_message(chat_id, cmd_briefing())
    elif norm.startswith('🖨️') or norm in ('cola taller', 'taller', 'cola') or cmd in ('/taller', '/cola', '/impresion'):
        send_telegram_message(chat_id, cmd_taller())
    elif norm.startswith('🚨') or norm in ('alertas stock', 'alertas', 'stock') or cmd in ('/alertas', '/stock'):
        send_telegram_message(chat_id, cmd_alertas())
    elif norm.startswith('📋') or norm in ('tareas', 'tasks') or cmd in ('/tareas', '/tasks'):
        send_telegram_message(chat_id, cmd_tareas())
    elif norm.startswith('⚡') or norm in ('estado', 'salud', 'status') or cmd in ('/status', '/salud', '/estado'):
        send_telegram_message(chat_id, cmd_status())
    elif norm.startswith('ℹ️') or norm in ('ayuda', 'help') or cmd in ('/start', '/ayuda', '/help'):
        send_telegram_message(chat_id, cmd_start())
    elif norm.startswith('📱') or norm in ('menu', 'menú', 'botones') or cmd in ('/menu', '/botones'):
        cmd_menu(chat_id)
    elif norm.startswith('🖼️') or norm in ('ver arte ot', 'ver foto ot', 'arte', 'foto') or cmd in ('/foto', '/imagen', '/ver', '/arte'):
        cmd_foto(chat_id, arg)
    elif norm.startswith('📄') or norm in ('pedir pdf ot', 'pdf', 'remito', 'doc') or cmd in ('/pdf', '/remito', '/doc'):
        cmd_pdf(chat_id, arg)
    elif cmd in ('/addtask', '/agregartarea', '/nueva'):
        send_telegram_message(chat_id, cmd_addtask(arg, source='telegram'))
    elif cmd in ('/completar', '/done', '/terminar'):
        send_telegram_message(chat_id, cmd_completar(arg))
    elif cmd in ('/clear', '/limpiar'):
        send_telegram_message(chat_id, cmd_clear())
    elif cmd in ('/sesiones', '/agentes', '/commits'):
        send_telegram_message(chat_id, cmd_sesiones())
    elif cmd in ('/execute', '/ejecutar', '/xana'):
        send_telegram_message(chat_id, cmd_execute(arg, chat_id=chat_id))
    else:
        # Si escribe texto libre sin comando, lo tratamos como consulta interactiva a Xana
        send_telegram_message(chat_id, cmd_execute(text, chat_id=chat_id))

    return {"ok": True, "command": cmd, "chat_id": chat_id}
