"""
Xana Voice Transcription — Pipeline Asíncrono de Voz a Borrador OT (Fase 4)
---------------------------------------------------------------------------
* Patrón idéntico a xana_smart_order.py: ThreadPoolExecutor + job_id + polling
* Acepta audio (webm/ogg/mp3/wav), transcribe con STT, devuelve texto
* El transcript puede enviarse a /api/xana/smart-order para crear borrador OT
* Preparado para Google Speech-to-Text, Whisper (local) o proveedor configurable
"""

import os
import sys
import uuid
import time
import shutil
from flask import Blueprint, request, jsonify
from middleware.auth import login_required
from concurrent.futures import ThreadPoolExecutor

_VOICE_EXECUTOR = ThreadPoolExecutor(max_workers=2)

# Store jobs in memory (same pattern as smart_order)
_VOICE_JOBS = {}  # { job_id: { "status": "processing"|"success"|"error", "progress": str, "transcript": str, "error": str, "created_at": float } }

# Config
MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25MB
ALLOWED_AUDIO_TYPES = {'audio/webm', 'audio/ogg', 'audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/x-m4a'}
ALLOWED_EXTENSIONS = {'.webm', '.ogg', '.mp3', '.wav', '.m4a'}

voice_bp = Blueprint('xana_voice', __name__, url_prefix='/api/xana/voice')


def _cleanup_old_jobs():
    now = time.time()
    for jid in list(_VOICE_JOBS.keys()):
        if now - _VOICE_JOBS[jid].get('created_at', now) > 1800:  # 30 min TTL
            _VOICE_JOBS.pop(jid, None)


def _execute_voice_transcription(audio_path: str, job_id: str, language: str = 'es-AR'):
    """Ejecuta la transcripción en background thread."""
    from app import UPLOADS_DIR
    
    try:
        _VOICE_JOBS[job_id] = {
            "status": "processing", 
            "progress": "Iniciando transcripción...", 
            "created_at": time.time()
        }

        # ================================================================
        # PROVEEDOR STT - CONFIGURABLE POR ENV
        # ================================================================
        # Opciones:
        # 1. 'google' - Google Cloud Speech-to-Text (requiere credentials)
        # 2. 'whisper' - openai-whisper local (CPU, ~1GB modelo base)
        # 3. 'mock' - Para testing sin proveedor externo
        # ================================================================
        
        stt_provider = os.environ.get('XANA_STT_PROVIDER', 'mock').lower()
        
        _VOICE_JOBS[job_id]["progress"] = f"Transcribiendo con {stt_provider}..."
        
        transcript = ""
        
        if stt_provider == 'google':
            transcript = _transcribe_google(audio_path, language)
        elif stt_provider == 'whisper':
            transcript = _transcribe_whisper(audio_path, language)
        else:
            # Mock para testing - en producción configurar proveedor real
            transcript = _transcribe_mock(audio_path)
        
        _VOICE_JOBS[job_id] = {
            "status": "success",
            "transcript": transcript,
            "language": language,
            "created_at": _VOICE_JOBS[job_id].get('created_at', time.time())
        }
        
    except Exception as err:
        print(f"[Voice Transcription Error] {err}", file=sys.stderr)
        _VOICE_JOBS[job_id] = {
            "status": "error",
            "error": str(err),
            "created_at": _VOICE_JOBS[job_id].get('created_at', time.time())
        }
    finally:
        # Cleanup temp audio file
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass


def _transcribe_mock(audio_path: str) -> str:
    """Transcripción mock para testing - devuelve texto fijo basado en nombre archivo."""
    # En testing, usar el nombre del archivo como transcript simulado
    fname = os.path.basename(audio_path)
    # Simular diferentes comandos de voz
    mock_transcripts = [
        "Crear orden para cliente XignuX vinilo vehicular ancho 1.37 alto 2.5 copias 2",
        "Cotizar lona frontlight 3 metros por 1.5 para cliente municipal",
        "Nueva orden vinilo microperforado 1.52 por 3 para vidriera",
        "Pedido urgente lona backlight 2 por 2 con ojales",
        "Cotización vinilo esmerilado 1.37 por 1 para oficina"
    ]
    import hashlib
    idx = int(hashlib.md5(fname.encode()).hexdigest(), 16) % len(mock_transcripts)
    return mock_transcripts[idx]


def _transcribe_google(audio_path: str, language: str) -> str:
    """Transcripción con Google Cloud Speech-to-Text."""
    try:
        from google.cloud import speech
        client = speech.SpeechClient()
        
        with open(audio_path, 'rb') as audio_file:
            content = audio_file.read()
        
        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code=language,
            enable_automatic_punctuation=True,
        )
        
        response = client.recognize(config=config, audio=audio)
        return ' '.join([r.alternatives[0].transcript for r in response.results])
    except Exception as e:
        print(f"[Voice STT Google Error] {e}", file=sys.stderr)
        raise


def _transcribe_whisper(audio_path: str, language: str) -> str:
    """Transcripción con Whisper local (openai-whisper)."""
    try:
        import whisper
        # Modelo base ~145MB, carga una sola vez en memoria
        model = whisper.load_model("base")
        result = model.transcribe(audio_path, language=language.split('-')[0])
        return result['text'].strip()
    except Exception as e:
        print(f"[Voice STT Whisper Error] {e}", file=sys.stderr)
        raise


@voice_bp.route('/transcribe', methods=['POST'])
@login_required
def transcribe_audio():
    """
    Inicia transcripción asíncrona de audio.
    Retorna 202 Accepted con job_id para polling.
    """
    _cleanup_old_jobs()
    
    # Verificar archivo en request.files
    if 'audio' not in request.files:
        return jsonify({"error": "No se proporcionó archivo de audio (campo 'audio')"}), 400
    
    audio_file = request.files['audio']
    if not audio_file or audio_file.filename == '':
        return jsonify({"error": "Archivo de audio vacío"}), 400
    
    # Validar tipo MIME
    content_type = audio_file.content_type or ''
    if content_type not in ALLOWED_AUDIO_TYPES:
        # Intentar validar por extensión
        ext = os.path.splitext(audio_file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify({"error": f"Tipo de audio no soportado. Permitidos: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
    
    # Validar tamaño (streaming check)
    audio_file.seek(0, 2)  # Seek to end
    size = audio_file.tell()
    audio_file.seek(0)  # Reset
    
    if size > MAX_AUDIO_SIZE:
        return jsonify({"error": f"Audio excede tamaño máximo de {MAX_AUDIO_SIZE // (1024*1024)}MB"}), 413
    
    # Parámetros opcionales
    language = request.form.get('language', 'es-AR')
    
    # Guardar archivo temporal
    from app import UPLOADS_DIR
    temp_dir = os.path.join(UPLOADS_DIR, 'temp_voice')
    os.makedirs(temp_dir, exist_ok=True)
    
    ext = os.path.splitext(audio_file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = '.webm'
    
    unique_name = f"voice_{uuid.uuid4().hex[:8]}{ext}"
    temp_path = os.path.join(temp_dir, unique_name)
    audio_file.save(temp_path)
    
    # Crear job
    job_id = uuid.uuid4().hex[:8]
    _VOICE_JOBS[job_id] = {
        "status": "processing",
        "progress": "Audio recibido, iniciando transcripción...",
        "created_at": time.time()
    }
    
    # Despachar a thread pool
    _VOICE_EXECUTOR.submit(_execute_voice_transcription, temp_path, job_id, language)
    
    return jsonify({
        "status": "processing",
        "job_id": job_id,
        "message": "Transcripción iniciada en segundo plano."
    }), 202


@voice_bp.route('/transcribe/status/<job_id>', methods=['GET'])
@login_required
def get_transcription_status(job_id):
    """
    Polling ultra-ligero para obtener estado de transcripción.
    """
    job = _VOICE_JOBS.get(job_id)
    if not job:
        return jsonify({"error": "Job no encontrado o expirado."}), 404
    
    return jsonify(job), 200


@voice_bp.route('/transcribe-and-order', methods=['POST'])
@login_required
def transcribe_and_create_order():
    """
    Flujo completo: Audio -> Transcripción -> Smart Order Draft.
    Para integración móvil end-to-end.
    """
    _cleanup_old_jobs()
    
    if 'audio' not in request.files:
        return jsonify({"error": "No se proporcionó archivo de audio"}), 400
    
    audio_file = request.files['audio']
    if not audio_file or audio_file.filename == '':
        return jsonify({"error": "Archivo de audio vacío"}), 400
    
    # Parámetros de la orden (opcionales, se extraen del transcript si no se proveen)
    cliente = request.form.get('cliente', '')
    material = request.form.get('material', 'VV').upper()
    calidad = request.form.get('calidad', 'ECO').upper()
    copias = int(request.form.get('copias', 1))
    observaciones = request.form.get('observaciones', '')
    
    # Guardar audio temporal
    from app import UPLOADS_DIR
    temp_dir = os.path.join(UPLOADS_DIR, 'temp_voice')
    os.makedirs(temp_dir, exist_ok=True)
    
    ext = os.path.splitext(audio_file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = '.webm'
    
    unique_name = f"voice_{uuid.uuid4().hex[:8]}{ext}"
    temp_path = os.path.join(temp_dir, unique_name)
    audio_file.save(temp_path)
    
    # Paso 1: Transcribir (síncrono para este flujo combinado, o usar job_id y polling)
    # Para simplicidad móvil, hacemos transcripción síncrona aquí
    stt_provider = os.environ.get('XANA_STT_PROVIDER', 'mock').lower()
    
    try:
        if stt_provider == 'google':
            transcript = _transcribe_google(temp_path, 'es-AR')
        elif stt_provider == 'whisper':
            transcript = _transcribe_whisper(temp_path, 'es-AR')
        else:
            transcript = _transcribe_mock(temp_path)
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": f"Error en transcripción: {str(e)}"}), 500
    
    # Limpiar audio
    if os.path.exists(temp_path):
        os.remove(temp_path)
    
    # Paso 2: Usar transcript para crear smart order (reutiliza lógica existente)
    # Llamar internamente a la función de smart order
    from routes.xana_smart_order import _execute_smart_order_process
    
    try:
        draft_order = _execute_smart_order_process(
            url=None,  # No hay URL, usamos transcript como observaciones
            cliente_input=cliente,
            material_code=material,
            calidad_code=calidad,
            copias_default=copias,
            observaciones=f"{observaciones}\n[Transcripción de voz]: {transcript}".strip(),
            uploaded_files=[],
            job_id=None  # Síncrono
        )
        
        return jsonify({
            "status": "success",
            "transcript": transcript,
            "draft_order": draft_order,
            "message": "Orden creada desde dictado de voz."
        }), 201
        
    except Exception as e:
        return jsonify({"error": f"Error creando orden: {str(e)}", "transcript": transcript}), 500


@voice_bp.route('/config', methods=['GET'])
@login_required
def get_voice_config():
    """Configuración del servicio de voz para el frontend."""
    return jsonify({
        "stt_provider": os.environ.get('XANA_STT_PROVIDER', 'mock'),
        "max_audio_size_mb": MAX_AUDIO_SIZE // (1024 * 1024),
        "allowed_types": list(ALLOWED_AUDIO_TYPES),
        "supported_languages": ['es-AR', 'es-ES', 'en-US', 'pt-BR'],
        "web_speech_supported": True  # Frontend usa Web Speech API nativo
    }), 200