"""
Rutas de API para Producción y Briefing Diario de Taller — LuXius
GET /api/production/briefing
"""

from flask import Blueprint, jsonify, request
from middleware.auth import login_required
from services.briefing_service import generate_daily_briefing

briefing_bp = Blueprint('briefing_bp', __name__, url_prefix='/api/production')


@briefing_bp.get('/briefing')
@login_required
def get_production_briefing():
    """Retorna el informe matutino consolidado de producción y taller."""
    try:
        data = generate_daily_briefing()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({
            'ok': False,
            'error': f'Error generando briefing de producción: {str(e)}'
        }), 500
