from flask import request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from models import db, Usuario
from middleware.auth import generate_token
from routes import auth_bp

DEV_MODE = True


def _verify_user_password(user, password):
    if not user:
        return False

    expected_pwd = (user.extra or {}).get('password')
    if expected_pwd and expected_pwd == password:
        return True

    if user.password_hash:
        if user.password_hash == password:
            return True
        try:
            if check_password_hash(user.password_hash, password):
                return True
        except Exception:
            pass

    return False


@auth_bp.post('/login')
def login():
    data = request.get_json(force=True)
    if not data:
        return jsonify({'error': 'Cuerpo requerido'}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Usuario y contraseña requeridos'}), 400

    from sqlalchemy import func
    user = Usuario.query.filter(
        (func.lower(Usuario.username) == func.lower(username)) |
        (func.lower(Usuario.email) == func.lower(username))
    ).first()

    if not user:
        return jsonify({'error': 'Credenciales inválidas'}), 401

    if not user.habilitado:
        return jsonify({'error': 'Usuario deshabilitado'}), 403

    if not _verify_user_password(user, password):
        return jsonify({'error': 'Credenciales inválidas'}), 401

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
