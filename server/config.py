import os
import sys

class Config:
    _raw_db_url = os.environ.get('DATABASE_URL', '')

    # Render/Neon usan postgres:// pero SQLAlchemy 2.x necesita postgresql://
    if _raw_db_url and _raw_db_url.startswith('postgres://'):
        _raw_db_url = _raw_db_url.replace('postgres://', 'postgresql://', 1)

    # Default a SQLite si no hay DATABASE_URL configurada
    _db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'luxius.db')
    _sqlite_uri = f'sqlite:///{_db_path}'

    if _raw_db_url and 'postgresql' in _raw_db_url:
        SQLALCHEMY_DATABASE_URI = _raw_db_url
        print(f"[CONFIG] Using PostgreSQL: {_raw_db_url[:50]}...", file=sys.stderr)
    else:
        SQLALCHEMY_DATABASE_URI = _sqlite_uri if not _raw_db_url else _raw_db_url
        print(f"[CONFIG] Using: {SQLALCHEMY_DATABASE_URI[:50]}...", file=sys.stderr)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'luxius-secret-key-change-in-production')
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB
