import os
import time
import requests
import urllib.parse
from datetime import datetime, timezone
from flask import request, jsonify
from routes import google_drive_bp
from models import db, ConfigGlobal
from middleware.auth import optional_login

CONFIG_KEY = 'google_drive_oauth'

def get_drive_config():
    """Retrieve Google Drive OAuth config from DB or environment."""
    row = ConfigGlobal.query.filter_by(clave=CONFIG_KEY).first()
    data = (row.valor if row and isinstance(row.valor, dict) else {})
    
    client_id = data.get('client_id') or os.environ.get('GOOGLE_CLIENT_ID', '').strip()
    client_secret = data.get('client_secret') or os.environ.get('GOOGLE_CLIENT_SECRET', '').strip()
    
    return {
        'row': row,
        'data': data,
        'client_id': client_id,
        'client_secret': client_secret,
        'access_token': data.get('access_token'),
        'refresh_token': data.get('refresh_token'),
        'token_expiry': data.get('token_expiry', 0),
        'email': data.get('email'),
        'name': data.get('name'),
        'picture': data.get('picture'),
        'connected_at': data.get('connected_at'),
    }

def get_valid_access_token():
    """Return a fresh/valid Google access token, refreshing if necessary."""
    cfg = get_drive_config()
    client_id = cfg['client_id']
    client_secret = cfg['client_secret']
    refresh_token = cfg['refresh_token']
    access_token = cfg['access_token']
    token_expiry = cfg['token_expiry'] or 0

    if not refresh_token and not access_token:
        return None

    # Check if access_token is still valid (with 2 min buffer)
    now = time.time()
    if access_token and (now < token_expiry - 120):
        return access_token

    # Token expired or expiring soon, refresh it
    if refresh_token and client_id and client_secret:
        try:
            resp = requests.post('https://oauth2.googleapis.com/token', data={
                'client_id': client_id,
                'client_secret': client_secret,
                'refresh_token': refresh_token,
                'grant_type': 'refresh_token'
            }, timeout=15)

            if resp.status_code == 200:
                tok_data = resp.json()
                new_access_token = tok_data.get('access_token')
                expires_in = tok_data.get('expires_in', 3600)
                new_expiry = int(time.time()) + expires_in

                # Update database
                row = cfg['row']
                if not row:
                    row = ConfigGlobal(clave=CONFIG_KEY, valor={})
                    db.session.add(row)

                val = dict(row.valor or {})
                val['access_token'] = new_access_token
                val['token_expiry'] = new_expiry
                row.valor = val
                db.session.commit()

                return new_access_token
            else:
                print(f"[Google OAuth] Error refreshing token: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"[Google OAuth] Token refresh exception: {e}")

    return access_token

@google_drive_bp.route('/status', methods=['GET'])
@optional_login
def get_status():
    """Return current connection status and email."""
    cfg = get_drive_config()
    client_id = cfg['client_id']
    connected = bool(cfg['refresh_token'] or cfg['access_token'])
    
    masked_client_id = ''
    if client_id:
        if len(client_id) > 15:
            masked_client_id = f"{client_id[:8]}...{client_id[-12:]}"
        else:
            masked_client_id = client_id

    return jsonify({
        'configured': bool(client_id and cfg['client_secret']),
        'connected': connected,
        'email': cfg['email'],
        'name': cfg['name'],
        'picture': cfg['picture'],
        'connected_at': cfg['connected_at'],
        'client_id_preview': masked_client_id,
        'has_client_id': bool(client_id),
        'has_client_secret': bool(cfg['client_secret'])
    }), 200

@google_drive_bp.route('/config', methods=['POST'])
@optional_login
def save_config():
    """Save or update Google OAuth Client ID and Client Secret."""
    data = request.get_json(force=True, silent=True) or {}
    client_id = data.get('clientId', '').strip()
    client_secret = data.get('clientSecret', '').strip()

    if not client_id:
        return jsonify({'error': 'Client ID es requerido'}), 400

    row = ConfigGlobal.query.filter_by(clave=CONFIG_KEY).first()
    if not row:
        row = ConfigGlobal(clave=CONFIG_KEY, valor={})
        db.session.add(row)

    val = dict(row.valor or {})
    val['client_id'] = client_id
    if client_secret:
        val['client_secret'] = client_secret
    row.valor = val
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Credenciales de Google guardadas exitosamente'
    }), 200

@google_drive_bp.route('/auth-url', methods=['GET'])
@optional_login
def get_auth_url():
    """Generate the Google OAuth2 consent URL."""
    cfg = get_drive_config()
    client_id = cfg['client_id']
    if not client_id:
        return jsonify({'error': 'Client ID de Google no configurado'}), 400

    redirect_uri = request.args.get('redirectUri', '').strip()
    if not redirect_uri:
        # Fallback to standard app origin
        redirect_uri = f"{request.host_url.rstrip('/')}/sistema/google-drive"

    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        'access_type': 'offline',
        'prompt': 'consent',
        'include_granted_scopes': 'true'
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return jsonify({'authUrl': auth_url}), 200

@google_drive_bp.route('/exchange-code', methods=['POST'])
@optional_login
def exchange_code():
    """Exchange authorization code for tokens and fetch user profile."""
    data = request.get_json(force=True, silent=True) or {}
    code = data.get('code', '').strip()
    redirect_uri = data.get('redirectUri', '').strip()

    if not code:
        return jsonify({'error': 'Código de autorización requerido'}), 400

    cfg = get_drive_config()
    client_id = cfg['client_id']
    client_secret = cfg['client_secret']

    if not client_id or not client_secret:
        return jsonify({'error': 'Credenciales de Google Client ID/Secret no configuradas en el servidor'}), 400

    try:
        # Exchange code for access & refresh tokens
        tok_res = requests.post('https://oauth2.googleapis.com/token', data={
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code'
        }, timeout=20)

        if tok_res.status_code != 200:
            err_data = tok_res.json() if tok_res.headers.get('content-type', '').startswith('application/json') else {}
            err_msg = err_data.get('error_description') or err_data.get('error') or tok_res.text
            return jsonify({'error': f"Error de Google OAuth: {err_msg}"}), 400

        tok_data = tok_res.json()
        access_token = tok_data.get('access_token')
        refresh_token = tok_data.get('refresh_token') or cfg.get('refresh_token')
        expires_in = tok_data.get('expires_in', 3600)
        token_expiry = int(time.time()) + expires_in

        # Fetch user profile info
        user_email = ''
        user_name = ''
        user_picture = ''
        try:
            u_res = requests.get('https://www.googleapis.com/oauth2/v2/userinfo', headers={
                'Authorization': f"Bearer {access_token}"
            }, timeout=10)
            if u_res.status_code == 200:
                u_data = u_res.json()
                user_email = u_data.get('email', '')
                user_name = u_data.get('name', '')
                user_picture = u_data.get('picture', '')
        except Exception as ue:
            print(f"[Google OAuth] Userinfo error: {ue}")

        # Save to DB
        row = ConfigGlobal.query.filter_by(clave=CONFIG_KEY).first()
        if not row:
            row = ConfigGlobal(clave=CONFIG_KEY, valor={})
            db.session.add(row)

        val = dict(row.valor or {})
        val.update({
            'client_id': client_id,
            'client_secret': client_secret,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_expiry': token_expiry,
            'email': user_email,
            'name': user_name,
            'picture': user_picture,
            'connected_at': datetime.now(timezone.utc).isoformat()
        })
        row.valor = val
        db.session.commit()

        return jsonify({
            'success': True,
            'email': user_email,
            'name': user_name,
            'picture': user_picture,
            'message': f"Cuenta de Google vinculada exitosamente como {user_email or 'empresa'}"
        }), 200

    except Exception as e:
        print(f"[Google OAuth] Exchange code exception: {e}")
        return jsonify({'error': f"Error al procesar la vinculación: {str(e)}"}), 500

@google_drive_bp.route('/disconnect', methods=['POST'])
@optional_login
def disconnect():
    """Disconnect the Google Account and remove tokens."""
    row = ConfigGlobal.query.filter_by(clave=CONFIG_KEY).first()
    if row and isinstance(row.valor, dict):
        val = dict(row.valor)
        val.pop('access_token', None)
        val.pop('refresh_token', None)
        val.pop('token_expiry', None)
        val.pop('email', None)
        val.pop('name', None)
        val.pop('picture', None)
        val.pop('connected_at', None)
        row.valor = val
        db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Cuenta de Google desvinculada exitosamente'
    }), 200


# ================================================================
# ENDPOINTS DE BÓVEDA HISTÓRICA & RECONCILIACIÓN CLASIFICADA
# ================================================================
from services.drive_reconciliation import (
    drive_vault_service, run_reconciliation_audit, 
    _ACTIVE_RECONCILE_JOBS, _RECONCILE_EXECUTOR
)
from models import DriveVaultAudit
from config import Config


@google_drive_bp.route('/vault/status', methods=['GET'])
@optional_login
def get_vault_status():
    """Retorna las métricas actuales de la bóveda en Google Drive y Cloudflare R2."""
    cfg = get_drive_config()
    latest_audit = DriveVaultAudit.query.order_by(DriveVaultAudit.started_at.desc()).first()
    
    shared_drive_id = os.environ.get('GOOGLE_DRIVE_SHARED_DRIVE_ID', '').strip()
    vault_folder_id = os.environ.get('GOOGLE_DRIVE_VAULT_FOLDER_ID', '').strip()

    return jsonify({
        'connected': bool(cfg['refresh_token'] or cfg['access_token']),
        'email': cfg['email'],
        'shared_drive_configured': bool(shared_drive_id),
        'shared_drive_id': shared_drive_id,
        'vault_folder_id': vault_folder_id,
        'r2_bucket': Config.R2_BUCKET_NAME,
        'latest_audit': latest_audit.to_dict() if latest_audit else None
    }), 200


@google_drive_bp.route('/vault/reconcile', methods=['POST'])
@optional_login
def trigger_reconciliation():
    """Inicia un job asíncrono de auditoría y reconciliación clasificada."""
    data = request.get_json(force=True, silent=True) or {}
    auto_sync = data.get('auto_sync', True)
    job_id = str(uuid.uuid4())[:8]

    _ACTIVE_RECONCILE_JOBS[job_id] = {
        'status': 'running',
        'progress': 'Iniciando escaneo de integridad...',
        'started_at': datetime.now(timezone.utc).isoformat()
    }

    _RECONCILE_EXECUTOR.submit(run_reconciliation_audit, job_id, auto_sync)

    return jsonify({
        'status': 'running',
        'job_id': job_id,
        'message': 'Auditoría de reconciliación iniciada en segundo plano.'
    }), 202


@google_drive_bp.route('/vault/reconcile/status/<job_id>', methods=['GET'])
def get_reconcile_job_status(job_id):
    """Retorna el progreso o resultado de un job de reconciliación."""
    job = _ACTIVE_RECONCILE_JOBS.get(job_id)
    if not job:
        # Buscar en DB
        rec = DriveVaultAudit.query.filter_by(job_id=job_id).first()
        if rec:
            return jsonify({'status': 'success', 'audit': rec.to_dict()}), 200
        return jsonify({'error': 'Job de reconciliación no encontrado.'}), 404

    return jsonify(job), 200


@google_drive_bp.route('/vault/audit-history', methods=['GET'])
@optional_login
def get_audit_history():
    """Retorna el historial de las últimas 15 auditorías de integridad."""
    audits = DriveVaultAudit.query.order_by(DriveVaultAudit.started_at.desc()).limit(15).all()
    return jsonify({
        'history': [a.to_dict() for a in audits]
    }), 200

