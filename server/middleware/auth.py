from functools import wraps
from flask import request, jsonify, g
import jwt
import os
import secrets
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Ensure .env is loaded
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv()

# ================================================================
# SECURITY CONFIGURATION
# ================================================================

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', os.environ.get('JWT_SECRET', 'da72dc6fbc016729e3cea397466aad8e7db9b2fbebaa6f09a8a76372f3853519'))

if not SECRET_KEY or SECRET_KEY == 'luxius-secret-key-change-in-production':
    SECRET_KEY = 'da72dc6fbc016729e3cea397466aad8e7db9b2fbebaa6f09a8a76372f3853519'

ALGORITHM = 'HS256'
TOKEN_EXPIRY_HOURS = 720  # Tokens expire after 30 days (720 hours)


# ================================================================
# ADMIN ROLES — Roles considered privileged
# ================================================================

ADMIN_ROLES = {'administrador', 'principal', 'jefe_produccion'}
OPERATOR_ROLES = ADMIN_ROLES | {'operario', 'vendedor', 'artista', 'disenador', 'impresion', 'impresor'}


def generate_token(user_id, rol, username):
    """Generate a JWT token with expiration."""
    now = datetime.now(timezone.utc)
    payload = {
        'sub': str(user_id),
        'rol': rol,
        'username': username,
        'iat': now,
        'exp': now + timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token):
    """Decode and validate a JWT token."""
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    payload['sub'] = int(payload['sub'])
    return payload


def _resolve_payload(auth_header):
    """Extract and validate JWT from Authorization header or query parameter."""
    token = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header[7:].strip()
    elif request.args.get('token'):
        token = request.args.get('token').strip()

    if not token:
        return None

    try:
        return decode_token(token)
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def login_required(f):
    """Decorator: requires a valid JWT token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        payload = _resolve_payload(auth_header)

        if not payload:
            return jsonify({'error': 'Token requerido o inválido'}), 401

        g.user_id = payload['sub']
        g.user_rol = payload['rol']
        g.username = payload['username']

        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator: requires login + admin/principal/jefe_produccion role."""
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if g.user_rol not in ADMIN_ROLES:
            return jsonify({'error': 'Acceso denegado: se requiere rol de administrador'}), 403
        return f(*args, **kwargs)
    return decorated


def operator_required(f):
    """Decorator: requires login + any operator-level role."""
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if g.user_rol not in OPERATOR_ROLES:
            return jsonify({'error': 'Acceso denegado: se requiere rol de operario'}), 403
        return f(*args, **kwargs)
    return decorated


def optional_login(f):
    """Decorator: sets user context if token provided, but doesn't block if absent."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        payload = _resolve_payload(auth_header)
        if payload:
            g.user_id = payload['sub']
            g.user_rol = payload['rol']
            g.username = payload['username']
        else:
            g.user_id = None
            g.user_rol = None
            g.username = None
        return f(*args, **kwargs)
    return decorated

