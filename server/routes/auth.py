from flask import request, jsonify, current_app
from werkzeug.security import check_password_hash, generate_password_hash
from models import db, Usuario
from middleware.auth import generate_token
from routes import auth_bp


def _verify_user_password(user, password):
    """Verify password using ONLY secure hash comparison."""
    if not user:
        return False

    if not user.password_hash:
        return False

    try:
        return check_password_hash(user.password_hash, password)
    except Exception:
        return False


@auth_bp.post('/login')
def login():
    from services.security_utils import login_throttle, client_ip

    data = request.get_json(force=True, silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({'error': 'Cuerpo requerido'}), 400

    username = str(data.get('username', '') or '').strip()
    password = str(data.get('password', '') or '')

    if not username or not password:
        return jsonify({'error': 'Usuario y contraseña requeridos'}), 400

    ip = client_ip(request)
    wait = login_throttle.retry_after(ip, username)
    if wait:
        resp = jsonify({'error': f'Demasiados intentos fallidos. Probá de nuevo en {max(1, wait // 60)} min.'})
        resp.headers['Retry-After'] = str(wait)
        return resp, 429

    from sqlalchemy import func
    user = Usuario.query.filter(
        (func.lower(Usuario.username) == func.lower(username)) |
        (func.lower(Usuario.email) == func.lower(username))
    ).first()

    # Siempre verificar la contraseña ANTES de revelar cualquier estado de la cuenta
    if not user or not _verify_user_password(user, password):
        login_throttle.register_failure(ip, username)
        return jsonify({'error': 'Credenciales inválidas'}), 401

    login_throttle.register_success(ip, username)

    if not user.habilitado:
        return jsonify({'error': 'Usuario deshabilitado'}), 403

    # ── Restricción de rol para la autenticación ──
    ROLES_PERMITIDOS = {'administrador', 'jefe_produccion', 'principal', 'vendedor', 'impresion', 'artista', 'cliente', 'operario'}
    if user.rol not in ROLES_PERMITIDOS:
        return jsonify({
            'error': 'Acceso denegado: rol no autorizado',
            'code': 'ROL_NO_PERMITIDO',
        }), 403

    token = generate_token(
        user_id=user.id,
        rol=user.rol,
        username=user.username,
    )

    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'nombre': user.nombre,
            'username': user.username,
            'email': user.email,
            'rol': user.rol,
            'clientId': user.client_id,
        },
    })
