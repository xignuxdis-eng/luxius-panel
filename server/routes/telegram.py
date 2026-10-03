"""
Rutas de la API para Telegram Bot Webhook, Notificaciones Push y Gestión — LuXius & Xana
"""

import os
import requests
from flask import Blueprint, request, jsonify
from services.telegram_service import (
    process_telegram_update,
    get_telegram_token,
    get_admin_chat_ids,
    send_telegram_broadcast,
    cmd_briefing
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
    token = get_telegram_token()
    admins = get_admin_chat_ids()

    if not token:
        return jsonify({
            'configured': False,
            'message': 'TELEGRAM_BOT_TOKEN no configurado en variables de entorno.',
            'admins_count': len(admins)
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
        'phases': {
            'phase_1_monitoring': True,
            'phase_2_management_push': True,
            'phase_3_voice_commander': True
        },
        'status': 'active' if reachable else 'unreachable'
    })


@telegram_bp.post('/setup-webhook')
def telegram_setup_webhook():
    """Configura o elimina la URL del webhook en los servidores de Telegram."""
    token = get_telegram_token()
    if not token:
        return jsonify({'ok': False, 'error': 'TELEGRAM_BOT_TOKEN no configurado.'}), 400

    data = request.get_json(silent=True) or {}
    webhook_url = data.get('url')

    if webhook_url:
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
