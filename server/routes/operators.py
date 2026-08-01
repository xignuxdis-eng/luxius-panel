from flask import jsonify, request, g
from models import db, Usuario, Vendedor, ConfigGlobal
from middleware.auth import operator_required
from routes import operators_bp

# Fallback hardcodeado — se usa SOLO si config_global está vacía
_FALLBACK_PRICING = {
    'lona_front_light_13oz': 12500.00,
    'lona_back_light_15oz': 15000.00,
    'vinilo_adhesivo_brillo': 8400.00,
    'vinilo_microperforado': 5100.00,
    'costo_instalacion_m2': 2500.00,
    'precio_base_estructura': 18000.00,
    'tarifa_rotulado_m2': 2800.00,
    'costo_iluminacion_led': 0,
    'costo_confeccion_4l': 0,
    'costo_diseno_hora': 0,
    'costo_flete_km': 0,
    'costo_poste_metal': 6500.00,
    'costo_poste_madera': 4200.00,
    'costo_poste_hormigon': 8000.00,
    'costo_columna_m': 15000.00,
    'costo_luminaria_unidad': 12000.00,
    'costo_cableado_m': 3500.00,
}


def _get_global_tarifas():
    """Read the global tariff from config_global, merging with fallback."""
    row = ConfigGlobal.query.filter_by(clave='tarifas_xignux').first()
    db_tarifas = row.valor if row and row.valor else {}

    # Build flat pricing dict + limits dict
    pricing = {}
    limites = {}
    for key, fallback_price in _FALLBACK_PRICING.items():
        entry = db_tarifas.get(key, {})
        if isinstance(entry, dict):
            pricing[key] = entry.get('precio', fallback_price)
            limites[key] = {'rebajaMaxPct': entry.get('rebajaMaxPct', 0)}
        else:
            # Legacy format: just a number
            pricing[key] = entry if entry else fallback_price
            limites[key] = {'rebajaMaxPct': 0}
    return pricing, limites


def _get_servicios_abm():
    """Read services from config_global collection_servicios."""
    row = ConfigGlobal.query.filter_by(clave='collection_servicios').first()
    servicios = row.valor if row and row.valor else []
    # Only return enabled services
    return [s for s in servicios if s.get('habilitado', True)]


@operators_bp.get('/profile')
@operator_required
def get_profile():
    user = db.session.get(Usuario, g.user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    vendedor = None
    if user.rol in ('vendedor', 'administrador', 'disenador', 'impresor'):
        vendedor = Vendedor.query.filter_by(usuario_id=user.id).first()

    # Global tariffs from config_global
    global_pricing, limites = _get_global_tarifas()

    # Per-user overrides (stored in usuario.extra['tarifas'])
    user_tarifas = user.extra.get('tarifas', {}) if user.extra else {}
    pricing = {**global_pricing, **user_tarifas}

    # Services from ABM
    servicios_abm = _get_servicios_abm()

    return jsonify({
        'id': user.id,
        'nombre': user.nombre,
        'username': user.username,
        'email': user.email,
        'rol': user.rol,
        'clientId': user.client_id,
        'vendedorId': vendedor.id if vendedor else None,
        'esAdmin': vendedor.es_admin if vendedor else False,
        'tarifas': pricing,
        'limites': limites,
        'servicios': servicios_abm,
        'habilitado': user.habilitado,
    })


@operators_bp.patch('/profile')
@operator_required
def update_profile():
    user = db.session.get(Usuario, g.user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    data = request.get_json(force=True)
    if not data:
        return jsonify({'error': 'Cuerpo requerido'}), 400

    extra = user.extra or {}

    if 'tarifas' in data:
        extra['tarifas'] = {**extra.get('tarifas', {}), **data['tarifas']}

    user.extra = extra
    db.session.commit()

    global_pricing, limites = _get_global_tarifas()
    pricing = {**global_pricing, **extra.get('tarifas', {})}

    return jsonify({
        'success': True,
        'tarifas': pricing,
        'limites': limites,
    })
