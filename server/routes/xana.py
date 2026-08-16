"""
Endpoint de Xana AI — Rutas para LangGraph y Diagnósticos
/api/xana/chat
/api/xana/health
"""

from flask import request, jsonify
from routes import xana_bp
import sys
import os

# Asegurar importación de services
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from services.xana_graph import run_xana_chat, tool_inspect_db_health

@xana_bp.post('/chat')
def xana_chat_endpoint():
    data = request.get_json(force=True) or {}
    message = data.get('message', '').strip()
    
    if not message:
        return jsonify({'error': 'Mensaje requerido'}), 400

    user_role = data.get('userRole', 'cliente')
    username = data.get('username', 'Usuario')
    user_id = data.get('userId', 0)
    client_logs = data.get('clientLogs', [])
    current_url = data.get('currentUrl', '/')

    try:
        result = run_xana_chat(
            message=message,
            user_role=user_role,
            username=username,
            user_id=user_id,
            client_logs=client_logs,
            current_url=current_url
        )
        return jsonify({
            'success': True,
            'reply': result.get('reply'),
            'intent': result.get('intent'),
            'diagnostics': result.get('diagnostics')
        }), 200
    except Exception as e:
        print(f"[Xana API Error]: {e}", file=sys.stderr)
        return jsonify({
            'success': False,
            'error': f'Error en el motor LangGraph de Xana: {str(e)}'
        }), 500


@xana_bp.get('/health')
def xana_health():
    """Diagnóstico rápido del motor Xana."""
    db_status = tool_inspect_db_health()
    return jsonify({
        'status': 'OK',
        'engine': 'LangGraph Stateful Engine v1.0',
        'db_health': db_status
    })
