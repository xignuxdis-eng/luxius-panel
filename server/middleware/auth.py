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

SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or os.environ.get('JWT_SECRET')

if not SECRET_KEY:
    import warnings
    warnings.warn(
        "CRITICAL: JWT_SECRET_KEY environment variable is not set! "
        "The server will reject all authentication attempts. "
        "Set a strong random secret: python -c \"import secrets; print(secrets.token_hex(64))\"",
        RuntimeWarning
    )
    # Use a per-process random key so the server can still start, but all
    # tokens become invalid on restart (fail-safe, not fail-open)
    SECRET_KEY = secrets.token_hex(64)

ALGORITHM = 'HS256'
TOKEN_EXPIRY_HOURS = 72  # Tokens expire after 3 days



# ================================================================
# ADMIN ROLES — Roles considered privileged
# ================================================================

ADMIN_ROLES = {'administrador', 'principal', 'jefe_produccion'}
OPERATOR_ROLES = ADMIN_ROLES | {'operario', 'vendedor', 'artista', 'disenador', 'impresion', 'impresor'}


import time

# Cache local en proceso por usuario: { user_id: (token_version, timestamp) }
_TOKEN_VERSION_CACHE = {}
TOKEN_VERSION_CACHE_TTL = 60.0  # 60 segundos de TTL por usuario independiente

def get_user_token_version(user_id):
    now = time.time()
    cached = _TOKEN_VERSION_CACHE.get(user_id)
    if cached and (now - cached[1]) < TOKEN_VERSION_CACHE_TTL:
        return cached[0]
    
    # Refrescar desde base de datos Neon PostgreSQL
    try:
        from models import Usuario, db
        user = db.session.get(Usuario, user_id)
        if user:
            ver = getattr(user, 'token_version', 1) or 1
            _TOKEN_VERSION_CACHE[user_id] = (ver, now)
            return ver
    except Exception:
        pass
    
    return 1

def invalidate_user_token_version(user_id):
    _TOKEN_VERSION_CACHE.pop(user_id, None)

def generate_token(user_id, rol, username, token_version=None):
    """Generate a JWT token with expiration and token_version."""
    if token_version is None:
        token_version = get_user_token_version(user_id)
        
    now = datetime.now(timezone.utc)
    payload = {
        'sub': str(user_id),
        'rol': rol,
        'username': username,
        'token_version': token_version,
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
    """Extract and validate JWT from Authorization header only."""
    token = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header[7:].strip()

    if not token:
        return None

    try:
        payload = decode_token(token)
        user_id = payload['sub']
        token_ver = payload.get('token_version', 1)
        
        # Validar version de token (revocacion instantanea)
        current_db_ver = get_user_token_version(user_id)
        if token_ver < current_db_ver:
            return None  # Token revocado
            
        return payload
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

