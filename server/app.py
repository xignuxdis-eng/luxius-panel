import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from datetime import datetime, timezone, timedelta
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from config import Config
from models import db, Cliente, Maquina, Usuario, Vendedor, Presupuesto, ConfigGlobal
from sync_routes import sync_bp
from routes.auth import auth_bp
from routes.operators import operators_bp
from routes.tasks import tasks_bp
from routes.orders import orders_bp
from routes.xana import xana_bp
from routes.stats import stats_bp
from routes import import_bp, google_drive_bp
import routes.cloud_import
import routes.google_drive
import io, json, os, sys
from urllib.parse import urlparse
from werkzeug.utils import secure_filename
from flask import send_from_directory
from middleware.auth import login_required, admin_required

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOADS_DIR, exist_ok=True)

app = Flask(__name__)
app.config.from_object(Config)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB limit

# CORS — Restrict to known origins (no wildcard)
ALLOWED_ORIGINS = [
    'https://xignuxdis-eng.github.io',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3005',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3005',
]
CORS(app, resources={
    r"/api/*": {"origins": ALLOWED_ORIGINS},
    r"/uploads/*": {"origins": ALLOWED_ORIGINS},
    r"/health*": {"origins": "*"}
}, supports_credentials=True, allow_headers=["Content-Type", "Authorization", "Cache-Control", "X-Requested-With"])
db.init_app(app)


# ================================================================
# RATE LIMITING — Prevención de fuerza bruta
# ================================================================
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address

    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per minute"],        # Límite global: 200 req/min por IP
        storage_uri="memory://",                   # In-memory (para producción usar Redis)
    )
except Exception:
    class DummyLimiter:
        def limit(self, *args, **kwargs):
            return lambda f: f
    limiter = DummyLimiter()

from routes.xana_smart_order import smart_order_bp

# Make limiter available to blueprints
app.limiter = limiter
app.register_blueprint(sync_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(operators_bp)
app.register_blueprint(tasks_bp)
app.register_blueprint(orders_bp)
app.register_blueprint(xana_bp)
app.register_blueprint(stats_bp)
app.register_blueprint(import_bp)
app.register_blueprint(google_drive_bp)
app.register_blueprint(smart_order_bp)


# Rate limits are configured directly on routes or via limiter default limits

# ================================================================
# SECURITY & CORS HEADERS
# ================================================================
@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        return app.make_default_options_response()


@app.after_request
def add_security_headers(response):
    origin = request.headers.get('Origin')
    if origin and origin in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        req_headers = request.headers.get('Access-Control-Request-Headers')
        if req_headers:
            response.headers['Access-Control-Allow-Headers'] = req_headers
        else:
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Range, Cache-Control, Pragma, Accept, Origin'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Content-Disposition'

    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    return response


# Global error handler — log details server-side, return generic message to client
@app.errorhandler(500)
def handle_500(e):
    app.logger.error(f'Unhandled 500 error: {e}', exc_info=True)
    return jsonify({'error': 'Error interno del servidor'}), 500

@app.errorhandler(404)
def handle_404(e):
    return jsonify({'error': 'Recurso no encontrado'}), 404

# Basic health check endpoint
@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now(timezone.utc).isoformat()})


# DB health check — verifies connection to PostgreSQL (admin only)
@app.route('/health/db', methods=['GET'])
@admin_required
def health_db():
    try:
        from sqlalchemy import text
        db.session.execute(text("SELECT 1"))
        tables = db.session.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public'")).fetchall()
        table_names = [t[0] for t in tables]
        return jsonify({'status': 'ok', 'tables': table_names, 'version': 'unified-v2.0'})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

import mimetypes
from urllib.parse import urlparse, unquote

@app.route('/uploads/<path:filename>', methods=['GET', 'OPTIONS'])
@app.route('/api/preview/<path:filename>', methods=['GET', 'OPTIONS'])
def serve_upload(filename):
    if request.method == 'OPTIONS':
        return '', 200
    if '..' in filename or filename.startswith('/'):
        return jsonify({'error': 'Nombre de archivo inválido'}), 400

    filename = unquote(filename)
    local_path = os.path.join(UPLOADS_DIR, filename)

    # 1. Si existe localmente en disco, servirlo
    if os.path.isfile(local_path):
        return send_from_directory(UPLOADS_DIR, filename)

    # 2. Si no existe en disco local (Render), buscar en Cloudflare R2 y servir
    try:
        from services.r2_storage import r2_storage
        r2_keys_to_try = [
            f"uploads/{filename}",
            f"thumbnails/{filename}",
            filename
        ]
        
        for key in r2_keys_to_try:
            try:
                obj = r2_storage.client.get_object(Bucket=r2_storage.bucket_name, Key=key)
                content_type = obj.get('ContentType') or mimetypes.guess_type(filename)[0] or 'application/octet-stream'
                
                # Cachear localmente para acelerar próximas peticiones
                try:
                    os.makedirs(os.path.dirname(local_path), exist_ok=True)
                    with open(local_path, 'wb') as f:
                        f.write(obj['Body'].read())
                    return send_from_directory(UPLOADS_DIR, filename)
                except Exception:
                    from flask import Response
                    return Response(obj['Body'].read(), mimetype=content_type)
            except Exception:
                continue
    except Exception as e:
        app.logger.warning(f"[R2 Serve] Error checking R2 for {filename}: {e}")

    return jsonify({'error': f'Archivo no encontrado: {filename}'}), 404

@app.route('/api/download', methods=['GET'])
def proxy_download():
    file_url = request.args.get('url')
    custom_filename = request.args.get('filename', 'archivo_descargado')
    if not file_url:
        return jsonify({'error': 'Missing url parameter'}), 400

    file_url = unquote(file_url)
    safe_name = secure_filename(custom_filename) or 'archivo_descargado'

    # 1. Extraer nombre de archivo si la URL apunta a /uploads/
    clean_name = None
    if '/uploads/' in file_url:
        clean_name = file_url.split('/uploads/')[-1].split('?')[0]
    elif file_url.startswith('uploads/'):
        clean_name = file_url.replace('uploads/', '').split('?')[0]

    if clean_name:
        if '..' in clean_name:
            return jsonify({'error': 'Nombre de archivo inválido'}), 400
        
        local_path = os.path.join(UPLOADS_DIR, clean_name)
        if os.path.isfile(local_path):
            return send_from_directory(
                UPLOADS_DIR,
                clean_name,
                as_attachment=True,
                download_name=safe_name
            )
        
        # Buscar en Cloudflare R2
        try:
            from services.r2_storage import r2_storage
            for key in [f"uploads/{clean_name}", f"thumbnails/{clean_name}", clean_name]:
                try:
                    obj = r2_storage.client.get_object(Bucket=r2_storage.bucket_name, Key=key)
                    content_type = obj.get('ContentType') or mimetypes.guess_type(clean_name)[0] or 'application/octet-stream'
                    from flask import Response
                    headers = {
                        'Content-Disposition': f'attachment; filename="{safe_name}"',
                        'Content-Type': content_type,
                    }
                    return Response(obj['Body'].read(), headers=headers)
                except Exception:
                    continue
        except Exception as e:
            app.logger.warning(f"[R2 Download] Error reading {clean_name} from R2: {e}")

    # 2. Descarga remota si es una URL externa (R2 presigned, Google Drive, etc.)
    import requests as http_requests
    from flask import Response
    try:
        resp = http_requests.get(file_url, stream=True, timeout=60)
        if resp.status_code != 200:
            return jsonify({'error': f'Error al descargar archivo remoto: HTTP {resp.status_code}'}), 400

        def generate():
            for chunk in resp.iter_content(chunk_size=65536):
                yield chunk

        content_type = resp.headers.get('Content-Type', 'application/octet-stream')
        headers = {
            'Content-Disposition': f'attachment; filename="{safe_name}"',
            'Content-Type': content_type,
        }
        return Response(generate(), headers=headers)
    except Exception as e:
        app.logger.error(f"[Download Error] {e}")
        return jsonify({'error': f'Error al descargar el archivo: {str(e)}'}), 500

# Upload file extension whitelist
ALLOWED_UPLOAD_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif',
                              '.pdf', '.svg', '.cdr', '.ai', '.eps', '.psd',
                              '.webm', '.mp4', '.mp3', '.wav',
                              '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.json'}

@app.route('/api/upload', methods=['POST'])
@login_required
def upload_file_endpoint():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    original_name = file.filename
    ext = os.path.splitext(original_name)[1].lower()

    # Validate file extension
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        return jsonify({'error': f'Tipo de archivo no permitido: {ext}. Extensiones válidas: {sorted(ALLOWED_UPLOAD_EXTENSIONS)}'}), 400

    safe_original = secure_filename(original_name)
    unique_filename = f"{int(datetime.now(timezone.utc).timestamp() * 1000)}_{safe_original}"
    if ext and not unique_filename.lower().endswith(ext):
        unique_filename += ext

    file_path = os.path.join(UPLOADS_DIR, unique_filename)
    file.save(file_path)
    file_size = os.path.getsize(file_path)

    # Sincronizar automáticamente con Cloudflare R2
    try:
        from services.r2_storage import r2_storage
        content_type = mimetypes.guess_type(unique_filename)[0]
        r2_storage.upload_file(file_path, f"uploads/{unique_filename}", content_type=content_type)
    except Exception as e:
        app.logger.warning(f"[R2 AutoUpload] Error uploading {unique_filename} to R2: {e}")

    return jsonify({
        'filename': unique_filename,
        'path': f'/uploads/{unique_filename}',
        'originalName': original_name,
        'size': file_size
    }), 200

with app.app_context():
    import sys
    print("=" * 60, file=sys.stderr)
    print("[LUXIUS] Starting unified backend v2.0", file=sys.stderr)
    print(f"[LUXIUS] DB URI: {app.config['SQLALCHEMY_DATABASE_URI'][:50]}...", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    try:
        db.create_all()
        print("[LUXIUS] db.create_all() completed successfully", file=sys.stderr)
    except Exception as e:
        print(f"[LUXIUS] WARNING: db.create_all() error: {e}", file=sys.stderr)

    # Seed default system users if missing (preserve modified user accounts)
    def _seed_default_users():
        if Usuario.query.first():
            return
        from werkzeug.security import generate_password_hash
        defaults = [
            {'id': 1, 'nombre': 'SISTEMA', 'username': 'sistema', 'email': 'sistema@luxius.com', 'rol': 'principal', 'password': 'sistema123'},
            {'id': 10, 'nombre': 'ADRIAN', 'username': 'adrian', 'email': 'adrian@luxius.com', 'rol': 'principal', 'password': 'nueva98261'},
            {'id': 99, 'nombre': 'Administrador Central', 'username': 'admin', 'email': 'admin@luxius.com', 'rol': 'administrador', 'password': 'admin'},
            {'id': 7, 'nombre': 'IMPRESION', 'username': 'impresion', 'email': 'impresion@luxius.com', 'rol': 'impresion', 'password': 'impresion123'},
            {'id': 412540, 'nombre': 'Diseño', 'username': 'diseño', 'email': 'xignux.dis@gmail.com', 'rol': 'artista', 'password': 'diseño123'},
            {'id': 621671, 'nombre': 'VENDEDOR', 'username': 'vendedor', 'email': 'vendedor@xignux.com.ar', 'rol': 'vendedor', 'password': 'vendedor'},
        ]
        for u_data in defaults:
            pwd = u_data.pop('password')
            u = Usuario.query.filter_by(username=u_data['username']).first()
            if not u:
                u = Usuario.query.get(u_data['id'])
            if not u:
                u = Usuario(**u_data, password_hash=generate_password_hash(pwd), habilitado=True, extra={})
                db.session.add(u)
                db.session.commit()
            
            # Ensure Vendedor profile exists if applicable
            if u and u.rol in ('vendedor', 'principal', 'administrador'):
                v = Vendedor.query.filter_by(usuario_id=u.id).first()
                if not v:
                    v = Vendedor(usuario_id=u.id, nombre=u.nombre, email=u.email, activo=True, es_admin=(u.rol != 'vendedor'))
                    db.session.add(v)
                    db.session.commit()

    def _seed_default_clientes():
        try:
            if Cliente.query.first():
                return
            import os
            json_file = os.path.join(os.path.dirname(__file__), 'data', 'clientes.json')
            if os.path.exists(json_file):
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                for item in data:
                    cid = item.get('id')
                    if not cid:
                        continue
                    existing = db.session.get(Cliente, cid)
                    if not existing:
                        c = Cliente(
                            id=cid,
                            nombre=item.get('nombre', ''),
                            empresa=item.get('empresa', ''),
                            direccion=item.get('direccion', ''),
                            categoria=item.get('categoria', 'Consumidor Final'),
                            responsable=item.get('responsable', 'Mostrador'),
                            username=item.get('username', '')
                        )
                        db.session.add(c)
                db.session.commit()
        except Exception as e:
            print(f"[Seed] Error seeding clientes: {e}")

    try:
        _seed_default_users()
        _seed_default_clientes()
    except Exception as e:
        print(f"[Seed] Error seeding: {e}")


def _apply_usuario_fields(user, item):
    from werkzeug.security import generate_password_hash
    from middleware.auth import invalidate_user_token_version
    if 'nombre' in item and item['nombre']:
        user.nombre = item['nombre'].strip()
    if 'username' in item and item['username']:
        user.username = item['username'].lower().strip()
    if 'email' in item:
        user.email = (item['email'] or '').strip()
    if 'rol' in item and item['rol']:
        user.rol = item['rol'].lower().strip()
    if 'clientId' in item:
        user.client_id = item['clientId']
    if 'habilitado' in item:
        user.habilitado = bool(item['habilitado'])

    password = (item.get('password') or '').strip()
    if password:
        user.password_hash = generate_password_hash(password)
        user.token_version = (getattr(user, 'token_version', 1) or 1) + 1
        if getattr(user, 'id', None):
            invalidate_user_token_version(user.id)



# ================================================================
# HELPERS
# ================================================================

def _ensure_client_user(cliente: Cliente):
    user = Usuario.query.filter_by(client_id=cliente.id).first()
    if not user and cliente.username:
        user = Usuario.query.filter_by(username=cliente.username).first()
    if not user and cliente.email:
        user = Usuario.query.filter_by(username=cliente.email).first()

    user_data = {
        'nombre':     cliente.nombre,
        'username':   cliente.username or cliente.email or f'cli_{cliente.id}',
        'email':      cliente.email or '',
        'rol':        'cliente',
        'client_id':  cliente.id,
        'habilitado': cliente.habilitado if cliente.habilitado is not None else True,
    }

    if user:
        for k, v in user_data.items():
            setattr(user, k, v)
        user.updated_at = datetime.now(timezone.utc)
    else:
        user = Usuario(**user_data)
        db.session.add(user)
    db.session.commit()
    return user

# ================================================================
# GENERIC COLLECTION READ (compatibilidad con frontend)
# ================================================================

ALLOWED = ['clientes', 'maquinas', 'usuarios', 'vendedores', 'presupuestos', 'materiales', 'servicios', 'calidades', 'logisticas', 'proveedores', 'calendar', 'roles']

# Collections stored as JSON arrays in config_global (no dedicated DB model)
JSON_COLLECTIONS = {'materiales', 'servicios', 'calidades', 'logisticas', 'proveedores', 'calendar', 'roles'}

DEFAULT_ROLES_DATA = [
    {'id': 1, 'name': 'Administrador', 'key': 'administrador', 'status': 'Activo'},
    {'id': 2, 'name': 'Principal / Jefe de Producción', 'key': 'principal', 'status': 'Activo'},
    {'id': 3, 'name': 'Vendedor', 'key': 'vendedor', 'status': 'Activo'},
    {'id': 4, 'name': 'Operario', 'key': 'operario', 'status': 'Activo'},
    {'id': 5, 'name': 'Impresión', 'key': 'impresion', 'status': 'Activo'},
    {'id': 6, 'name': 'Artista / Diseño', 'key': 'artista', 'status': 'Activo'},
    {'id': 7, 'name': 'Cliente', 'key': 'cliente', 'status': 'Activo'},
]

def _get_json_collection(name):
    """Read a JSON collection from config_global."""
    row = ConfigGlobal.query.filter_by(clave=f'collection_{name}').first()
    if not row or not row.valor:
        if name == 'roles':
            _save_json_collection('roles', DEFAULT_ROLES_DATA)
            return DEFAULT_ROLES_DATA
        return []
    return row.valor


def _save_json_collection(name, data):
    """Write a JSON collection to config_global."""
    row = ConfigGlobal.query.filter_by(clave=f'collection_{name}').first()
    if not row:
        row = ConfigGlobal(clave=f'collection_{name}', valor=[])
        db.session.add(row)
    row.valor = data
    db.session.commit()


@app.get('/api/<collection>')
@login_required
def get_collection(collection: str):
    if collection not in ALLOWED:
        return jsonify({'error': 'Invalid collection'}), 403

    if collection in JSON_COLLECTIONS:
        items = _get_json_collection(collection)
        return jsonify(items)

    if collection == 'clientes':
        items = [c.to_dict() for c in Cliente.query.order_by(Cliente.id).all()]
    elif collection == 'maquinas':
        items = [m.to_dict() for m in Maquina.query.order_by(Maquina.id).all()]
    elif collection == 'usuarios':
        # Mapeo de roles BD → roles frontend Luxius (auth.ts UserRole)
        ROLE_MAP = {
            'principal': 'principal',
            'jefe_produccion': 'principal',
            'administrador': 'administrador',
            'admin': 'administrador',
            'vendedor': 'vendedor',
            'cliente': 'cliente',
            'impresion': 'impresion',
            'impresor': 'impresion',
            'artista': 'artista',
            'disenador': 'artista',
            'diseño': 'artista',
            'operario': 'principal',
        }
        raw = [u.to_dict() for u in Usuario.query.order_by(Usuario.id).all()]
        for u_obj, u_dict in zip(Usuario.query.order_by(Usuario.id).all(), raw):
            # SECURITY: Never expose passwords to the client
            u_dict['rol'] = u_obj.rol
            u_dict['role'] = ROLE_MAP.get(u_obj.rol, 'vendedor')
        items = raw
    elif collection == 'vendedores':
        items = [v.to_dict() for v in Vendedor.query.order_by(Vendedor.id).all()]
    elif collection == 'presupuestos':
        items = [p.to_dict() for p in Presupuesto.query.order_by(Presupuesto.created_at.desc()).all()]
    else:
        items = []
    return jsonify(items)




# ================================================================
# CLIENTES — POST (Create / Upsert)
# ================================================================

@app.post('/api/clientes')
@login_required
def post_clientes():
    item = request.get_json(force=True)
    if not item:
        return jsonify({'error': 'Body required'}), 400

    cliente = Cliente.query.filter_by(id=item.get('id')).first()
    is_new = cliente is None

    if is_new and not item.get('id'):
        max_id = db.session.query(db.func.max(Cliente.id)).scalar() or 0
        item['id'] = max_id + 1
        cliente = Cliente(id=item['id'])

    _apply_cliente_fields(cliente, item)
    db.session.add(cliente)
    db.session.commit()
    _ensure_client_user(cliente)
    return jsonify(cliente.to_dict())

# ================================================================
# CLIENTES — PUT (Update by ID)
# ================================================================

@app.put('/api/clientes/<int:id>')
@login_required
def put_clientes(id: int):
    item = request.get_json(force=True)
    cliente = Cliente.query.get(id)
    if not cliente:
        return jsonify({'error': 'Item not found'}), 404
    _apply_cliente_fields(cliente, item)
    cliente.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    _ensure_client_user(cliente)
    return jsonify(cliente.to_dict())

# ================================================================
# CLIENTES — DELETE
# ================================================================

@app.delete('/api/clientes/<int:id>')
@login_required
def delete_clientes(id: int):
    cliente = Cliente.query.get(id)
    if not cliente:
        return jsonify({'error': 'Not found'}), 404
    db.session.delete(cliente)
    db.session.commit()
    return jsonify({'success': True})

def _apply_maquina_fields(maquina, item):
    if 'nombre' in item:
        maquina.nombre = item['nombre']
    if 'marca' in item:
        maquina.marca = item['marca']
    if 'modelo' in item:
        maquina.modelo = item['modelo']
    if 'estado' in item:
        maquina.estado = item['estado']
    
    from sqlalchemy.orm.attributes import flag_modified
    extra = dict(maquina.extra or {})
    if 'tipo' in item:
        extra['tipo'] = item['tipo']
    if 'anchoMaximo' in item:
        extra['anchoMaximo'] = item['anchoMaximo']
    if 'habilitada' in item:
        extra['habilitada'] = item['habilitada']
    if 'estado' in item:
        extra['estado'] = item['estado']
    
    maquina.extra = extra
    flag_modified(maquina, 'extra')

# ================================================================
# MAQUINAS — POST (Create / Upsert)
# ================================================================

@app.post('/api/maquinas')
@login_required
def post_maquinas():
    item = request.get_json(force=True)
    if not item:
        return jsonify({'error': 'Body required'}), 400

    m_id = item.get('id')
    maquina = None
    if m_id:
        maquina = Maquina.query.get(m_id)

    is_new = maquina is None
    if is_new:
        if not m_id:
            max_id = db.session.query(db.func.max(Maquina.id)).scalar() or 0
            item['id'] = max_id + 1
        maquina = Maquina(id=item['id'])
        db.session.add(maquina)

    _apply_maquina_fields(maquina, item)
    db.session.commit()
    return jsonify(maquina.to_dict())

# ================================================================
# MAQUINAS — PUT (Update by ID)
# ================================================================

@app.put('/api/maquinas/<int:id>')
@login_required
def put_maquinas(id: int):
    item = request.get_json(force=True)
    maquina = Maquina.query.get(id)
    if not maquina:
        return jsonify({'error': 'Item not found'}), 404
    _apply_maquina_fields(maquina, item)
    maquina.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(maquina.to_dict())

# ================================================================
# MAQUINAS — DELETE
# ================================================================

@app.delete('/api/maquinas/<int:id>')
@login_required
def delete_maquinas(id: int):
    maquina = Maquina.query.get(id)
    if not maquina:
        return jsonify({'error': 'Not found'}), 404
    db.session.delete(maquina)
    db.session.commit()
    return jsonify({'success': True})

# ================================================================
# USUARIOS — POST, PUT & DELETE (Full Server Persistence)
# ================================================================

@app.post('/api/usuarios')
@login_required
def post_usuarios():
    item = request.get_json(force=True)
    if not item:
        return jsonify({'error': 'Body required'}), 400

    u_id = item.get('id')
    u_username = (item.get('username') or '').strip().lower()

    user = None
    if u_id:
        try:
            val_id = int(u_id)
            if val_id > 0:
                user = Usuario.query.get(val_id)
        except (ValueError, TypeError):
            user = None

    if not user and u_username:
        user = Usuario.query.filter_by(username=u_username).first()

    is_new = user is None
    if is_new:
        user = Usuario()
        db.session.add(user)

    try:
        _apply_usuario_fields(user, item)
        db.session.commit()

        if user.rol in ('vendedor', 'principal', 'administrador'):
            v = Vendedor.query.filter_by(usuario_id=user.id).first()
            if not v:
                v = Vendedor(usuario_id=user.id, nombre=user.nombre, email=user.email, activo=True, es_admin=(user.rol != 'vendedor'))
                db.session.add(v)
            else:
                v.nombre = user.nombre
                v.email = user.email
                v.activo = user.habilitado
            db.session.commit()

        resp_data = user.to_dict()
        from flask import g
        current_uid = getattr(g, 'user_id', None)
        if current_uid and str(user.id) == str(current_uid):
            from middleware.auth import generate_token
            resp_data['newToken'] = generate_token(user.id, user.rol, user.username, token_version=getattr(user, 'token_version', 1))

        return jsonify(resp_data)
    except Exception as e:
        db.session.rollback()
        err_msg = str(e)
        if 'unique' in err_msg.lower() or 'duplicate' in err_msg.lower():
            return jsonify({'error': 'El nombre de usuario o email ya está en uso'}), 409
        return jsonify({'error': f'Error al guardar usuario en base de datos: {err_msg}'}), 500



@app.put('/api/usuarios/<int:id>')
@login_required
def put_usuarios(id: int):
    item = request.get_json(force=True)
    user = Usuario.query.get(id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    try:
        _apply_usuario_fields(user, item)
        user.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        if user.rol in ('vendedor', 'principal', 'administrador'):
            v = Vendedor.query.filter_by(usuario_id=user.id).first()
            if v:
                v.nombre = user.nombre
                v.email = user.email
                v.activo = user.habilitado
                db.session.commit()

        resp_data = user.to_dict()
        from flask import g
        current_uid = getattr(g, 'user_id', None)
        if current_uid and str(user.id) == str(current_uid):
            from middleware.auth import generate_token
            resp_data['newToken'] = generate_token(user.id, user.rol, user.username, token_version=getattr(user, 'token_version', 1))

        return jsonify(resp_data)
    except Exception as e:
        db.session.rollback()
        err_msg = str(e)
        if 'unique' in err_msg.lower() or 'duplicate' in err_msg.lower():
            return jsonify({'error': 'El nombre de usuario o email ya está en uso'}), 409
        return jsonify({'error': f'Error al actualizar usuario: {err_msg}'}), 500


@app.delete('/api/usuarios/<int:id>')
@admin_required
def delete_usuarios(id: int):
    user = Usuario.query.get(id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'success': True})

# ================================================================
# GENERIC JSON COLLECTIONS — POST & DELETE (Fallback for material/servicio/calidad)
# ================================================================

@app.post('/api/<collection>')
@login_required
def post_json_collection(collection: str):
    """Upsert a single item in a JSON collection (used by frontend syncSave)."""
    if collection not in JSON_COLLECTIONS:
        return jsonify({'error': f'No POST handler for {collection}'}), 404

    item = request.get_json(force=True)
    if not item:
        return jsonify({'error': 'Body required'}), 400

    items = _get_json_collection(collection)
    item_id = item.get('id')

    if item_id is not None:
        found = False
        for i, existing in enumerate(items):
            if existing.get('id') == item_id:
                items[i] = {**existing, **item}
                found = True
                break
        if not found:
            items.insert(0, item)
    else:
        items.insert(0, item)

    _save_json_collection(collection, items)
    return jsonify(item)


@app.delete('/api/<collection>/<int:item_id>')
@login_required
def delete_json_collection_item(collection: str, item_id: int):
    """Delete an item from a JSON collection by ID."""
    if collection not in JSON_COLLECTIONS:
        return jsonify({'error': f'No DELETE handler for {collection}'}), 404

    items = _get_json_collection(collection)
    items = [i for i in items if i.get('id') != item_id]
    _save_json_collection(collection, items)
    return jsonify({'success': True})

# ================================================================
# MIGRATION — Receive
# ================================================================

VALID_KEYS = [
    'usuarios', 'clientes', 'materiales', 'calidades',
    'maquinas', 'proveedores', 'servicios', 'logisticas', 'calendar',
]

@app.post('/api/migration/receive')
@admin_required
def migration_receive():
    data = request.get_json(force=True)
    print('Receiving migration data...')
    for key, records in data.items():
        filename = key
        if filename.startswith('luxius_session_'):
            filename = filename.replace('luxius_session_', '', 1)
        if filename not in VALID_KEYS:
            continue
        print(f'Migrating {filename}... count: {len(records)}')
        if filename == 'clientes':
            for rec in records:
                c = Cliente.query.get(rec.get('id'))
                if not c:
                    c = Cliente(id=rec.get('id'))
                _apply_cliente_fields(c, rec)
                db.session.add(c)
        elif filename == 'maquinas':
            for rec in records:
                m = Maquina.query.get(rec.get('id'))
                if not m:
                    m = Maquina(id=rec.get('id'))
                _apply_maquina_fields(m, rec)
                db.session.add(m)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Data migrated successfully'})

# ================================================================
# DB — Backup
# ================================================================

@app.get('/api/db/backup')
@admin_required
def db_backup():
    backup = {
        'clientes': [c.to_dict() for c in Cliente.query.order_by(Cliente.id).all()],
        'maquinas': [m.to_dict() for m in Maquina.query.order_by(Maquina.id).all()],
    }
    ts = datetime.now(timezone.utc).isoformat().replace(':', '-').replace('.', '-')
    return app.response_class(
        response=json.dumps(backup, ensure_ascii=False, indent=2),
        status=200,
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment; filename=luxius_backup_{ts}.json'},
    )

# ================================================================
# DB — Normalize Case
# ================================================================

@app.post('/api/db/normalize-case')
@admin_required
def db_normalize_case():
    for c in Cliente.query.all():
        if c.nombre:       c.nombre      = c.nombre.upper()
        if c.empresa:      c.empresa     = c.empresa.upper()
        if c.responsable:  c.responsable = c.responsable.upper()
        if c.direccion:    c.direccion   = c.direccion.upper()
        if c.categoria:    c.categoria   = c.categoria.upper()
    for m in Maquina.query.all():
        if m.nombre:       m.nombre      = m.nombre.upper()
        if m.marca:        m.marca       = m.marca.upper()
        if m.nickName:     m.nickName    = m.nickName.upper()
    db.session.commit()
    return jsonify({'success': True, 'message': 'Normalización completada.'})

# ================================================================
# DB — Reset Balances
# ================================================================

@app.post('/api/db/reset-balances')
@admin_required
def db_reset_balances():
    for c in Cliente.query.all():
        c.saldo       = 0.0
        c.deuda       = 0.0
        c.balance     = 0.0
        c.pago_cuenta = 0.0
    db.session.commit()
    return jsonify({'success': True, 'message': 'Saldos reiniciados a cero correctamente.'})

# ================================================================
# FIELD MAPPERS
# ================================================================

def _apply_cliente_fields(c: Cliente, data: dict):
    c.nombre            = data.get('nombre', c.nombre or data.get('persona', ''))
    c.empresa           = data.get('empresa', c.empresa or '')
    c.persona           = data.get('persona', c.persona or '')
    c.relacion          = data.get('relacion', c.relacion or '')
    c.responsable       = data.get('responsable', c.responsable or '')
    c.direccion         = data.get('direccion', c.direccion or '')
    c.categoria         = data.get('categoria', c.categoria or '')
    c.username          = data.get('username', c.username or '')
    c.email             = data.get('email', c.email or '')
    c.habilitado        = data.get('habilitado', c.habilitado if c.habilitado is not None else True)
    c.saldo             = data.get('saldo', c.saldo or 0.0)
    c.deuda             = data.get('deuda', c.deuda or 0.0)
    c.balance           = data.get('balance', c.balance or 0.0)
    c.pago_cuenta       = data.get('pagoCuenta', c.pago_cuenta or 0.0)
    c.precios_especiales= data.get('preciosEspeciales', c.precios_especiales or {})
    if data.get('extra'):
        c.extra = {**(c.extra or {}), **data['extra']}
    c.updated_at = datetime.now(timezone.utc)

def _apply_maquina_fields(m: Maquina, data: dict):
    m.nombre          = data.get('nombre', m.nombre or data.get('nombre_maquina', ''))
    m.nombre_maquina  = data.get('nombre_maquina', m.nombre_maquina or data.get('nombre', ''))
    m.marca           = data.get('marca', m.marca or '')
    m.modelo          = data.get('modelo', m.modelo or '')
    m.nickName        = data.get('nickName', m.nickName or '')
    m.nro_serie       = data.get('nro_serie', m.nro_serie or '')
    m.estado          = data.get('estado', m.estado or '')
    m.cliente_id      = data.get('cliente_id', m.cliente_id)
    if data.get('extra'):
        m.extra = {**(m.extra or {}), **data['extra']}
    m.updated_at = datetime.now(timezone.utc)

# ================================================================
# SEED — Carga inicial desde clientes_db.json
# ================================================================

def seed_clientes():
    import os, json as _json
    if Cliente.query.first():
        return
    path = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'clientes_db.json')
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        records = _json.load(f)
    for rec in records:
        c = Cliente(
            id=rec.get('id'),
            persona=rec.get('persona', ''),
            empresa=rec.get('empresa', ''),
            relacion=rec.get('relacion', ''),
            nombre=rec.get('persona', ''),
        )
        db.session.add(c)
    db.session.commit()
    print(f'Seeded {len(records)} clientes from clientes_db.json')

# ================================================================
# TARIFAS XIGNUX — Tarifario global centralizado
# ================================================================

DEFAULT_TARIFAS = {
    'lona_front_light_13oz':    {'precio': 12500, 'rebajaMaxPct': 15},
    'lona_back_light_15oz':     {'precio': 15000, 'rebajaMaxPct': 15},
    'vinilo_adhesivo_brillo':   {'precio': 8400,  'rebajaMaxPct': 10},
    'vinilo_microperforado':    {'precio': 5100,  'rebajaMaxPct': 10},
    'costo_instalacion_m2':     {'precio': 2500,  'rebajaMaxPct': 20},
    'precio_base_estructura':   {'precio': 18000, 'rebajaMaxPct': 15},
    'tarifa_rotulado_m2':       {'precio': 2800,  'rebajaMaxPct': 20},
    'costo_iluminacion_led':    {'precio': 0,     'rebajaMaxPct': 0},
    'costo_confeccion_4l':      {'precio': 0,     'rebajaMaxPct': 0},
    'costo_diseno_hora':        {'precio': 0,     'rebajaMaxPct': 0},
    'costo_flete_km':           {'precio': 0,     'rebajaMaxPct': 0},
    'costo_poste_metal':        {'precio': 6500,  'rebajaMaxPct': 15},
    'costo_poste_madera':       {'precio': 4200,  'rebajaMaxPct': 15},
    'costo_poste_hormigon':     {'precio': 8000,  'rebajaMaxPct': 15},
    'costo_columna_m':          {'precio': 15000, 'rebajaMaxPct': 15},
    'costo_luminaria_unidad':   {'precio': 12000, 'rebajaMaxPct': 15},
    'costo_cableado_m':         {'precio': 3500,  'rebajaMaxPct': 15},
}

def _get_tarifas_from_db():
    """Read tarifas from config_global, fallback to DEFAULT_TARIFAS."""
    row = ConfigGlobal.query.filter_by(clave='tarifas_xignux').first()
    if row and row.valor:
        merged = {**DEFAULT_TARIFAS, **row.valor}
        return merged
    return {**DEFAULT_TARIFAS}


@app.get('/api/tarifas')
def get_tarifas():
    tarifas = _get_tarifas_from_db()
    return jsonify(tarifas)


@app.put('/api/tarifas')
@admin_required
def put_tarifas():
    data = request.get_json(force=True)
    if not data:
        return jsonify({'error': 'Body required'}), 400

    row = ConfigGlobal.query.filter_by(clave='tarifas_xignux').first()
    if not row:
        row = ConfigGlobal(clave='tarifas_xignux', valor={})
        db.session.add(row)

    row.valor = data
    db.session.commit()
    return jsonify({'success': True, 'tarifas': row.valor})


# ================================================================
# ANALYTICS ENDPOINTS
# ================================================================

@app.get('/api/analytics/stats')
def get_analytics_stats():
    # Fallback printer stats list
    return jsonify([])

@app.get('/api/analytics/dashboard')
def get_analytics_dashboard():
    clientes = Cliente.query.all()
    maquinas = Maquina.query.all()
    
    total_billing = 0.0
    for c in clientes:
        total_billing += float(c.saldo or 0)

    top_client = clientes[0].nombre if clientes else 'Ninguno'
    top_val = float(clientes[0].saldo or 0) if clientes else 0

    return jsonify({
        'summary': {
            'billing': total_billing,
            'm2Sold': 0.0,
            'm2Printed': 0.0,
            'stockWarnings': 0,
            'topClient': {'name': top_client, 'value': top_val}
        },
        'charts': {
            'billingByMonth': [],
            'materialData': [],
            'serviceData': []
        },
        'details': {
            'thisMonthOrders': []
        },
        'productionDetails': {
            'm2Details': [],
            'machineStats': [{'name': m.nombre, 'm2': 0, 'jobsCount': 0, 'hours': 0, 'efficiency': 0} for m in maquinas],
            'reprints': [],
            'comparison': []
        },
        'intelligence': {
            'efficiencyByMaterial': [],
            'stockForecast': [],
            'leakage': [],
            'profitability': []
        }
    })

@app.get('/api/analytics/reconciliation')
def get_analytics_reconciliation():
    return jsonify({'reconciled': []})


# ================================================================
# MAIN
# ================================================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=False)
