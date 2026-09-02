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
    SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'da72dc6fbc016729e3cea397466aad8e7db9b2fbebaa6f09a8a76372f3853519')
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB

    # Cloudflare R2 Configuration
    R2_ACCOUNT_ID = os.environ.get('R2_ACCOUNT_ID', '62e10a84196d5f6cfb46c97af6e5931d')
    R2_ACCESS_KEY_ID = os.environ.get('R2_ACCESS_KEY_ID', '178b4702bd26eb05de12c6f9077a92f4')
    R2_SECRET_ACCESS_KEY = os.environ.get('R2_SECRET_ACCESS_KEY', '5d878d399c74a0d116b65097099d0664e269964c748924fa034c3268b3c0aecc')
    R2_BUCKET_NAME = os.environ.get('R2_BUCKET_NAME', 'luxius-media')
    R2_ENDPOINT_URL = os.environ.get('R2_ENDPOINT_URL', 'https://62e10a84196d5f6cfb46c97af6e5931d.r2.cloudflarestorage.com')

