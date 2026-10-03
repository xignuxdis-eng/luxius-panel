import os
import sys

class Config:
    _raw_db_url = os.environ.get('DATABASE_URL', '')

    # Render/Neon usan postgres:// o postgresql:// sin driver; forzar psycopg2 para compatibilidad total
    if _raw_db_url:
        if _raw_db_url.startswith('postgres://'):
            _raw_db_url = _raw_db_url.replace('postgres://', 'postgresql+psycopg2://', 1)
        elif _raw_db_url.startswith('postgresql://'):
            _raw_db_url = _raw_db_url.replace('postgresql://', 'postgresql+psycopg2://', 1)

    # Default a SQLite si no hay DATABASE_URL configurada
    _db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'luxius.db')
    _sqlite_uri = f'sqlite:///{_db_path}'

    @staticmethod
    def _mask_db_url(url):
        """Oculta usuario/contraseña de la URL de BD antes de loguearla."""
        try:
            from urllib.parse import urlsplit
            parts = urlsplit(url)
            host = parts.hostname or ''
            return f"{parts.scheme}://***:***@{host}{parts.path}"
        except Exception:
            return '***'

    if _raw_db_url and 'postgresql' in _raw_db_url:
        SQLALCHEMY_DATABASE_URI = _raw_db_url
        print(f"[CONFIG] Using PostgreSQL: {_mask_db_url.__func__(_raw_db_url)}", file=sys.stderr)
    else:
        SQLALCHEMY_DATABASE_URI = _sqlite_uri if not _raw_db_url else _raw_db_url
        print(f"[CONFIG] Using: {_mask_db_url.__func__(SQLALCHEMY_DATABASE_URI) if '@' in SQLALCHEMY_DATABASE_URI else SQLALCHEMY_DATABASE_URI}", file=sys.stderr)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    # SEGURIDAD: ningún secreto puede tener valor por defecto en el código (repo público).
    # Si falta JWT_SECRET_KEY se usa una clave aleatoria por proceso (fail-safe: tokens inválidos).
    SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or os.environ.get('JWT_SECRET') or os.urandom(64).hex()
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB

    # Cloudflare R2 Configuration (solo variables de entorno)
    try:
        # TEMPORAL: módulo que existe solo en el repo privado del backend (ver private_legacy_r2.py)
        from private_legacy_r2 import LEGACY_R2 as _LEGACY_R2
    except Exception:
        _LEGACY_R2 = {}
    R2_ACCOUNT_ID = os.environ.get('R2_ACCOUNT_ID') or _LEGACY_R2.get('R2_ACCOUNT_ID', '')
    R2_ACCESS_KEY_ID = os.environ.get('R2_ACCESS_KEY_ID') or _LEGACY_R2.get('R2_ACCESS_KEY_ID', '')
    R2_SECRET_ACCESS_KEY = os.environ.get('R2_SECRET_ACCESS_KEY') or _LEGACY_R2.get('R2_SECRET_ACCESS_KEY', '')
    R2_USING_LEGACY = bool(_LEGACY_R2) and not os.environ.get('R2_ACCESS_KEY_ID')
    R2_BUCKET_NAME = os.environ.get('R2_BUCKET_NAME', 'luxius-media')
    R2_ENDPOINT_URL = os.environ.get('R2_ENDPOINT_URL') or (
        f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com" if R2_ACCOUNT_ID else ''
    )
    if not (R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY):
        print("[CONFIG] ADVERTENCIA: credenciales R2 no configuradas (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)", file=sys.stderr)

