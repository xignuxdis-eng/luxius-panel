"""
Rutas de la API para Telegram Bot Webhook, Notificaciones Push y Gestión — LuXius & Xana
"""

import os
import requests
from flask import Blueprint, request, jsonify
from services.telegram_service import (
    process_telegram_update,
    get_telegram_token,
    get_telegram_config,
    get_admin_chat_ids,
    save_telegram_config,
    send_telegram_broadcast,
    cmd_briefing,
    register_telegram_bot_commands
)
from middleware.auth import login_required

telegram_bp = Blueprint('telegram_bp', __name__, url_prefix='/api/telegram')


@telegram_bp.post('/webhook')
def telegram_webhook():
    """Recibe webhooks de la API de Telegram (mensajes de texto y notas de voz)."""
    try:
        data = request.get_json(force=True)
    except Exception as e:
        return jsonify({'ok': False, 'error': f'JSON inválido: {e}'}), 400

    result = process_telegram_update(data)
    return jsonify(result)


@telegram_bp.get('/status')
def telegram_status():
    """Verifica si el bot de Telegram está configurado y accesible."""
    cfg = get_telegram_config()
    token = cfg.get('token', '')
    admin_id = cfg.get('admin_chat_id', '')
    admins = get_admin_chat_ids()

    if not token:
        return jsonify({
            'configured': False,
            'message': 'TELEGRAM_BOT_TOKEN no configurado (puedes ingresarlo aquí mismo o en variables de entorno).',
            'admins_count': len(admins),
            'admin_chat_id': admin_id,
            'has_token': False
        })

    bot_info = None
    reachable = False
    try:
        resp = requests.get(f"https://api.telegram.org/bot{token}/getMe", timeout=5)
        if resp.ok:
            reachable = True
            bot_info = resp.json().get('result')
    except Exception as e:
        bot_info = {'error': str(e)}

    return jsonify({
        'configured': True,
        'reachable': reachable,
        'bot_info': bot_info,
        'admins_configured': len(admins),
        'admin_chat_id': admin_id,
        'has_token': True,
        'phases': {
            'phase_1_monitoring': True,
            'phase_2_management_push': True,
            'phase_3_voice_commander': True
        },
        'status': 'active' if reachable else 'unreachable'
    })


@telegram_bp.post('/config')
@login_required
def telegram_save_config():
    """Guarda o actualiza las credenciales de Telegram en base de datos (ConfigGlobal)."""
    data = request.get_json(silent=True) or {}
    token = data.get('bot_token', '').strip()
    admin_id = str(data.get('admin_chat_id', '')).strip()

    if token:
        # Validar el token contra Telegram
        try:
            resp = requests.get(f"https://api.telegram.org/bot{token}/getMe", timeout=6)
            if not resp.ok:
                return jsonify({'ok': False, 'error': f'Token inválido según Telegram: {resp.text}'}), 400
        except Exception as e:
            return jsonify({'ok': False, 'error': f'No se pudo verificar el token: {e}'}), 400

    saved = save_telegram_config(
        token=token if token else None,
        admin_chat_id=admin_id if admin_id else None
    )
    if not saved:
        return jsonify({'ok': False, 'error': 'Error guardando configuración en base de datos'}), 500

    # Si se pasó token o ya existía, intentar registrar el webhook automáticamente
    effective_token = token or get_telegram_token()
    webhook_res = None
    if effective_token:
        try:
            w_url = data.get('webhook_url') or 'https://luxius-backend.onrender.com/api/telegram/webhook'
            w_resp = requests.post(
                f"https://api.telegram.org/bot{effective_token}/setWebhook",
                json={'url': w_url},
                timeout=8
            )
            webhook_res = w_resp.json() if w_resp.ok else None
        except Exception:
            pass

    return jsonify({
        'ok': True,
        'message': 'Configuración de Telegram guardada correctamente.',
        'webhook_registered': webhook_res is not None,
        'webhook_response': webhook_res
    }), 200


@telegram_bp.post('/setup-webhook')
def telegram_setup_webhook():
    """Configura o elimina la URL del webhook en los servidores de Telegram."""
    data = request.get_json(silent=True) or {}
    # Aceptar token opcional enviado desde el frontend si el usuario lo ingresó en vivo
    token = data.get('bot_token', '').strip() or get_telegram_token()
    if not token:
        return jsonify({'ok': False, 'error': 'TELEGRAM_BOT_TOKEN no configurado.'}), 400

    webhook_url = data.get('url') or data.get('webhook_url') or 'https://luxius-backend.onrender.com/api/telegram/webhook'

    if webhook_url and webhook_url != 'delete':
        # Registrar también los comandos nativos en Telegram
        register_telegram_bot_commands()
        resp = requests.post(
            f"https://api.telegram.org/bot{token}/setWebhook",
            json={'url': webhook_url},
            timeout=10
        )
    else:
        resp = requests.post(f"https://api.telegram.org/bot{token}/deleteWebhook", timeout=10)

    try:
        result = resp.json()
    except Exception:
        result = {'raw': resp.text}

    return jsonify(result), resp.status_code


@telegram_bp.post('/register-commands')
@login_required
def telegram_register_commands():
    """Registra los comandos de menú en Telegram API."""
    ok = register_telegram_bot_commands()
    return jsonify({
        'ok': ok,
        'message': 'Comandos registrados en Telegram' if ok else 'Error registrando comandos'
    }), (200 if ok else 500)


@telegram_bp.post('/notify')
@login_required
def telegram_notify():
    """Envía una notificación push directa a los administradores de Telegram."""
    data = request.get_json(silent=True) or {}
    message = data.get('message', '').strip()
    if not message:
        return jsonify({'ok': False, 'error': 'message es requerido'}), 400

    sent_count = send_telegram_broadcast(message)
    return jsonify({
        'ok': True,
        'sent_count': sent_count,
        'message': message
    }), 200


@telegram_bp.post('/briefing/trigger')
@login_required
def trigger_briefing_broadcast():
    """Genera y envía el briefing matutino a todos los administradores."""
    text = cmd_briefing()
    sent_count = send_telegram_broadcast(text)
    return jsonify({
        'ok': True,
        'sent_count': sent_count,
        'briefing_text': text
    }), 200
