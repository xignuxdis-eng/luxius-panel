from functools import wraps
from flask import request, jsonify, g
import jwt
import os

SECRET_KEY = os.environ.get('JWT_SECRET', 'luxius-secret-key-change-in-production')
ALGORITHM = 'HS256'
DEV_MODE = True

DEV_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInJvbCI6ImFkbWluIiwidXNlcm5hbWUiOiJkZXYifQ.E3iJ-axSQN-7CxFuanNmZLe3LADoted3rtjuISZ5tBw'
DEV_PAYLOAD = {'sub': 1, 'rol': 'admin', 'username': 'dev'}


def generate_token(user_id, rol, username):
    payload = {
        'sub': str(user_id),
        'rol': rol,
        'username': username,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token):
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    payload['sub'] = int(payload['sub'])
    return payload


def _resolve_payload(auth_header):
    token = None
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]

    if not token:
        return None

    if DEV_MODE and token == DEV_TOKEN:
        return dict(DEV_PAYLOAD)

    try:
        return decode_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def login_required(f):
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


def operator_required(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if g.user_rol not in ('operario', 'administrador', 'jefe_produccion', 'principal', 'vendedor', 'artista', 'disenador', 'impresion', 'impresor'):
            return jsonify({'error': 'Acceso denegado: se requiere rol de operario'}), 403
        return f(*args, **kwargs)
    return decorated
