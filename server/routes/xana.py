"""
Endpoint de Xana AI — Rutas para LangGraph, Memoria Persistente y Diagnósticos
/api/xana/chat
/api/xana/health
/api/xana/tasks
/api/xana/decisions
/api/xana/sessions
/api/xana/commits
/api/xana/actions
/api/xana/context/prompt
"""

from flask import request, jsonify
from routes import xana_bp
from datetime import datetime, timezone, timedelta
import subprocess
import sys
import os
import json

# Asegurar importación de services y models
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from services.xana_graph import run_xana_chat, tool_inspect_db_health
from models import db, ConfigGlobal

AR_TZ = timezone(timedelta(hours=-3))

def _now_iso():
    return datetime.now(AR_TZ).isoformat()

# ================================================================
# MEMORIA Y PERSISTENCIA DE XANA
# ================================================================

DEFAULT_XANA_DATA = {
    "tasks": [
        {
            "id": 1,
            "task_id": "TASK-001",
            "project": "LuXius Core",
            "objective": "Integración y soporte de importación en la nube para Google Drive y WeTransfer con streaming, bypass CSRF y descompresión automática de ZIPs.",
            "status": "completed",
            "created_at": "2026-08-29T18:00:00-03:00",
            "updated_at": "2026-08-29T21:40:00-03:00"
        },
        {
            "id": 2,
            "task_id": "TASK-002",
            "project": "LuXius Panel",
            "objective": "Normalización y estandarización horaria en todo el sistema para la zona de Argentina (ART / UTC-3).",
            "status": "completed",
            "created_at": "2026-08-29T19:15:00-03:00",
            "updated_at": "2026-08-29T20:50:00-03:00"
        },
        {
            "id": 3,
            "task_id": "TASK-003",
            "project": "LuXius Producción",
            "objective": "Estandarización de fórmula de nombres de producción con códigos compactos de material y servicios: OT-[N°]_x[Copias]_[Mat]_[Serv]_[Medidas].",
            "status": "completed",
            "created_at": "2026-08-29T19:30:00-03:00",
            "updated_at": "2026-08-29T20:52:00-03:00"
        },
        {
            "id": 4,
            "task_id": "TASK-004",
            "project": "LuXius Media",
            "objective": "Visor universal de archivos de producción con motor Canvas PDF.js HD, evitando bloqueos de iframes.",
            "status": "completed",
            "created_at": "2026-08-29T20:00:00-03:00",
            "updated_at": "2026-08-29T20:55:00-03:00"
        },
        {
            "id": 5,
            "task_id": "TASK-005",
            "project": "LuXius Financiero",
            "objective": "Módulo de gestión de Cajas, Monedas (USD/ARS/Billeteras), Bancos y Conciliación contable.",
            "status": "completed",
            "created_at": "2026-08-29T17:00:00-03:00",
            "updated_at": "2026-08-29T19:00:00-03:00"
        },
        {
            "id": 6,
            "task_id": "TASK-006",
            "project": "LuXius Entrada",
            "objective": "Optimización visual de tabla de pedidos: eliminación de columnas redundantes y fusión de OT con títulos de proyecto.",
            "status": "completed",
            "created_at": "2026-08-29T21:00:00-03:00",
            "updated_at": "2026-08-29T21:25:00-03:00"
        },
        {
            "id": 7,
            "task_id": "TASK-007",
            "project": "LuXius Documentación PDF",
            "objective": "Sistema de PDFs diferenciados: Presupuesto Comercial (seña sugerida 50%, sin saldo forzado) y Detalle de Impresión con grilla de miniaturas de artes gráficos.",
            "status": "completed",
            "created_at": "2026-08-29T21:45:00-03:00",
            "updated_at": "2026-08-29T21:58:00-03:00"
        },
        {
            "id": 8,
            "task_id": "TASK-008",
            "project": "LuXius Logística / Despacho",
            "objective": "Roadmap Fase 1 a 3: Módulo de Etiquetas de Envío y Despacho en formato térmico 10x15cm con QR dinámico de tracking, bultos y multi-OT.",
            "status": "pending",
            "created_at": "2026-08-29T21:55:00-03:00",
            "updated_at": "2026-08-29T22:00:00-03:00"
        },
        {
            "id": 9,
            "task_id": "TASK-009",
            "project": "LuXius Cloud Storage",
            "objective": "Automatización programada de purga y sincronización Cloudflare R2 a Google Drive cada 3 días vía sync_r2_to_drive.py.",
            "status": "completed",
            "created_at": "2026-08-29T20:30:00-03:00",
            "updated_at": "2026-09-02T00:30:00-03:00"
        },
        {
            "id": 10,
            "task_id": "TASK-010",
            "project": "Xana Smart Order & Análisis Gráfico",
            "objective": "Borrador Inteligente Xana (POST /api/xana/smart-order): procesamiento asíncrono en background con job_id, análisis de DPI y dimensiones sin saturación de RAM con Pillow draft mode, miniaturas en R2 y heurística tridimensional anti-escalas 1:10.",
            "status": "completed",
            "created_at": "2026-09-01T22:00:00-03:00",
            "updated_at": "2026-09-02T00:30:00-03:00"
        },
        {
            "id": 11,
            "task_id": "TASK-011",
            "project": "LuXius Pricing & Metraje Unificado",
            "objective": "Motor oficial unificado de cálculo de metros lineales y precios en pricingCalculator.ts: margen de seguridad de 1cm, evaluación dual de orientación normal vs rotada a 90° para ahorro de bobina y coincidencia 100% con NuevoPedidoModal.",
            "status": "completed",
            "created_at": "2026-09-02T00:32:00-03:00",
            "updated_at": "2026-09-02T00:38:00-03:00"
        },
        {
            "id": 12,
            "task_id": "TASK-012",
            "project": "Bóveda Google Drive Shared Drive (Fase 2)",
            "objective": "Implementación de Bóveda Histórica en Google Workspace Shared Drive corporativo y motor de reconciliación clasificada (SYNCED_MATCH, MISSING_NEW, HASH_MISMATCH, LIFECYCLE_PURGED) con tabla DriveVaultAudit y panel interactivo en GoogleDriveView.",
            "status": "completed",
            "created_at": "2026-09-02T00:38:00-03:00",
            "updated_at": "2026-09-02T00:43:00-03:00"
        }
    ],
    "decisions": [
        {
            "id": 1,
            "decision_id": "DEC-001",
            "task_id": "TASK-001",
            "topic": "Descarga de enlaces en la nube",
            "choice": "Servicio de importación por streaming y descompresión automática en servidor.",
            "alternatives_rejected": ["Descarga exclusiva en el navegador del cliente", "Subida manual obligatoria"],
            "reason": "Permite a los clientes y vendedores pegar enlaces pesados de WeTransfer o Drive sin saturar la red local.",
            "created_at": "2026-08-29T18:10:00-03:00"
        },
        {
            "id": 2,
            "decision_id": "DEC-002",
            "task_id": "TASK-003",
            "topic": "Nomenclatura para software RIP",
            "choice": "Fórmula con prefijo OT unívoco y códigos compactos de 3-4 letras para materiales y acabados.",
            "alternatives_rejected": ["Nombres largos descriptivos con DPI y modo de color"],
            "reason": "Los programas RIP (PhotoPrint, Onyx, Caldera) truncan nombres mayores a 100 caracteres.",
            "created_at": "2026-08-29T19:40:00-03:00"
        },
        {
            "id": 3,
            "decision_id": "DEC-003",
            "task_id": "TASK-004",
            "topic": "Previsualización de PDFs y vectores",
            "choice": "Renderizado por Canvas mediante PDF.js con fallback a tarjetas vectoriales en tiempo real.",
            "alternatives_rejected": ["Iframes directos a localhost", "Google Docs Viewer"],
            "reason": "Los iframes causan bloqueos de conexión cruzada y errores en dispositivos móviles.",
            "created_at": "2026-08-29T20:10:00-03:00"
        },
        {
            "id": 4,
            "decision_id": "DEC-004",
            "task_id": "TASK-002",
            "topic": "Control de zona horaria del sistema",
            "choice": "Normalización forzada a Argentina (ART / UTC-3) tanto en API backend como en visualizadores web.",
            "alternatives_rejected": ["UTC puro sin conversión local"],
            "reason": "Evita discrepancias en fechas de pedidos creados cerca de la medianoche.",
            "created_at": "2026-08-29T20:30:00-03:00"
        },
        {
            "id": 5,
            "decision_id": "DEC-005",
            "task_id": "TASK-007",
            "topic": "Cálculo de Seña en Documentos PDF",
            "choice": "Eliminación de la seña del 50% forzada en saldos. Se reemplazó por leyenda sugerida para presupuestos y supresión total en órdenes impresas.",
            "alternatives_rejected": ["Asumir 50% pagado en todas las órdenes"],
            "reason": "Generaba discrepancias contables al dar por cobrado dinero que aún no había ingresado.",
            "created_at": "2026-08-29T21:48:00-03:00"
        },
        {
            "id": 6,
            "decision_id": "DEC-006",
            "task_id": "TASK-007",
            "topic": "Miniaturas gráficas en documentos",
            "choice": "Inclusión de tarjetas y mosaico de imágenes de los artes en los PDFs de presupuesto y reportes de clientes.",
            "alternatives_rejected": ["PDFs basados exclusivamente en texto"],
            "reason": "Permite al cliente y al operario verificar visualmente las piezas a producir antes y durante la impresión.",
            "created_at": "2026-08-29T21:55:00-03:00"
        },
        {
            "id": 7,
            "decision_id": "DEC-007",
            "task_id": "TASK-008",
            "topic": "Estándar de Etiquetas de Envío",
            "choice": "Formato térmico industrial de 10x15cm con QR dinámico, código de barras y datos logísticos.",
            "alternatives_rejected": ["Remitos en papel suelto A4"],
            "reason": "Compatibilidad universal con impresoras térmicas adhesivas (Zebra, Brother) para despacho rápido.",
            "created_at": "2026-08-29T22:00:00-03:00"
        },
        {
            "id": 8,
            "decision_id": "DEC-008",
            "task_id": "TASK-010",
            "topic": "Jerarquía de Autoridad Dual R2 vs Google Drive",
            "choice": "Cloudflare R2 actúa como Autoridad Máster (capa caliente, zero egress), mientras que Google Drive Shared Drive actúa como Bóveda Fría de respaldo navegable.",
            "alternatives_rejected": ["Drive como fuente única", "R2 sin respaldo en Drive"],
            "reason": "Combina velocidad instantánea y costo cero de ancho de banda para el frontend y RIP con la seguridad de archivo corporativo en Google Workspace.",
            "created_at": "2026-09-01T23:30:00-03:00"
        },
        {
            "id": 9,
            "decision_id": "DEC-009",
            "task_id": "TASK-012",
            "topic": "Reconciliación Clasificada de Integridad",
            "choice": "Auditoría nocturna con categorización de discrepancias (SYNCED_MATCH, MISSING_NEW, HASH_MISMATCH, LIFECYCLE_PURGED). HASH_MISMATCH emite alerta crítica sin sobreescribir ciegamente.",
            "alternatives_rejected": ["Reintento ciego con sobreescritura", "Sincronización unidireccional simple"],
            "reason": "Evita la pérdida silenciosa de modificaciones deliberadas y garantiza trazabilidad criptográfica SHA-256.",
            "created_at": "2026-09-02T00:35:00-03:00"
        },
        {
            "id": 10,
            "decision_id": "DEC-010",
            "task_id": "TASK-011",
            "topic": "Unificación de Cálculo de Metros Lineales y Rotación 90°",
            "choice": "Algoritmo único en pricingCalculator.ts con margen de seguridad de 1 cm y evaluación simultánea de orientación normal vs rotada a 90°.",
            "alternatives_rejected": ["Cálculos independientes en modal y asistente Xana"],
            "reason": "Garantiza que la cotización inteligente de Xana y el modal de pedidos coincidan al centavo y en metros exactos.",
            "created_at": "2026-09-02T00:38:00-03:00"
        }
    ],
    "sessions": [

        {
            "id": 1,
            "session_id": "SES-XANA-20260829-01",
            "task_id": "TASK-001",
            "agent": "Antigravity Pair-Programmer",
            "model": "Gemini 2.5 Pro",
            "started_at": "2026-08-29T17:30:00-03:00",
            "ended_at": None
        },
        {
            "id": 2,
            "session_id": "SES-XANA-20260829-02",
            "task_id": "TASK-007",
            "agent": "Xana AI LangGraph Engine",
            "model": "LangGraph Stateful Workflow",
            "started_at": "2026-08-29T21:45:00-03:00",
            "ended_at": "2026-08-29T22:01:00-03:00"
        }
    ],
    "actions": [],
    "commits": []
}

def _get_xana_store():
    try:
        cfg = ConfigGlobal.query.filter_by(clave='xana_memory').first()
        if cfg and cfg.valor and isinstance(cfg.valor, dict):
            stored = cfg.valor
            for k in DEFAULT_XANA_DATA:
                if k not in stored or not stored[k]:
                    stored[k] = DEFAULT_XANA_DATA[k]
            return stored
    except Exception as e:
        print(f"[Xana Store] DB fetch error, using defaults: {e}")
    return DEFAULT_XANA_DATA

def _save_xana_store(data):
    try:
        cfg = ConfigGlobal.query.filter_by(clave='xana_memory').first()
        if not cfg:
            cfg = ConfigGlobal(clave='xana_memory', valor=data)
            db.session.add(cfg)
        else:
            cfg.valor = data
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"[Xana Store] DB save error: {e}")
        return False

def _get_live_git_commits():
    commits = []
    try:
        cmd = ['git', 'log', '-n', '15', '--pretty=format:%H|%s|%an|%cI']
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
        if res.returncode == 0 and res.stdout:
            lines = res.stdout.strip().split('\n')
            for idx, line in enumerate(lines):
                parts = line.split('|')
                if len(parts) >= 4:
                    chash, msg, author, cdate = parts[0], parts[1], parts[2], parts[3]
                    commits.append({
                        "id": idx + 1,
                        "commit_hash": chash,
                        "message": msg,
                        "author": author,
                        "branch": "master",
                        "repo": "luxius-panel",
                        "created_at": cdate
                    })
    except Exception as e:
        print(f"[Xana Git Sync] Failed to inspect git log: {e}")
    return commits

# ================================================================
# ENDPOINTS DE XANA TELEMETRÍA Y MEMORIA
# ================================================================

@xana_bp.get('/tasks')
def get_xana_tasks():
    store = _get_xana_store()
    return jsonify(store.get('tasks', []))

@xana_bp.post('/tasks')
def add_xana_task():
    data = request.get_json(force=True) or {}
    store = _get_xana_store()
    tasks = store.get('tasks', [])
    new_id = len(tasks) + 1
    task = {
        "id": new_id,
        "task_id": data.get('task_id', f'TASK-{new_id:03d}'),
        "project": data.get('project', 'LuXius System'),
        "objective": data.get('objective', ''),
        "status": data.get('status', 'in_progress'),
        "created_at": _now_iso(),
        "updated_at": _now_iso()
    }
    tasks.insert(0, task)
    store['tasks'] = tasks
    _save_xana_store(store)
    return jsonify(task), 201

@xana_bp.get('/decisions')
def get_xana_decisions():
    store = _get_xana_store()
    return jsonify(store.get('decisions', []))

@xana_bp.post('/decisions')
def add_xana_decision():
    data = request.get_json(force=True) or {}
    store = _get_xana_store()
    decisions = store.get('decisions', [])
    new_id = len(decisions) + 1
    decision = {
        "id": new_id,
        "decision_id": data.get('decision_id', f'DEC-{new_id:03d}'),
        "task_id": data.get('task_id', 'TASK-001'),
        "topic": data.get('topic', ''),
        "choice": data.get('choice', ''),
        "alternatives_rejected": data.get('alternatives_rejected', []),
        "reason": data.get('reason', ''),
        "created_at": _now_iso()
    }
    decisions.insert(0, decision)
    store['decisions'] = decisions
    _save_xana_store(store)
    return jsonify(decision), 201

@xana_bp.get('/sessions')
def get_xana_sessions():
    store = _get_xana_store()
    return jsonify(store.get('sessions', []))

@xana_bp.get('/commits')
def get_xana_commits():
    live_commits = _get_live_git_commits()
    store = _get_xana_store()
    saved_commits = store.get('commits', [])
    
    # Merge live commits with saved commits
    seen = set()
    combined = []
    for c in live_commits:
        h = c.get('commit_hash')
        if h and h not in seen:
            seen.add(h)
            combined.append(c)
    for c in saved_commits:
        h = c.get('commit_hash')
        if h and h not in seen:
            seen.add(h)
            combined.append(c)
            
    return jsonify(combined if combined else DEFAULT_XANA_DATA["tasks"])

@xana_bp.post('/commits')
def add_xana_commit():
    data = request.get_json(force=True) or {}
    store = _get_xana_store()
    commits = store.get('commits', [])
    new_id = len(commits) + 1
    commit = {
        "id": new_id,
        "commit_hash": data.get('commit_hash', 'manual-log'),
        "task_id": data.get('task_id', ''),
        "message": data.get('message', ''),
        "author": data.get('author', 'Admin'),
        "branch": data.get('branch', 'master'),
        "repo": data.get('repo', 'luxius-panel'),
        "created_at": _now_iso()
    }
    commits.insert(0, commit)
    store['commits'] = commits
    _save_xana_store(store)
    return jsonify(commit), 201

@xana_bp.get('/actions')
def get_xana_actions():
    store = _get_xana_store()
    return jsonify(store.get('actions', []))

@xana_bp.get('/context/prompt')
def get_xana_prompt_context():
    store = _get_xana_store()
    tasks = store.get('tasks', [])
    decisions = store.get('decisions', [])
    commits = _get_live_git_commits() or store.get('commits', [])
    
    prompt_lines = [
        "# [XANA LIVE CONTEXT - LUXIUS PRINT MANAGEMENT SYSTEM]",
        "",
        "## 🏢 Entorno y Propósito",
        "- **Empresa:** XignuX Gráfica (Córdoba, Argentina).",
        "- **Stack Tecnológico:** React + Vite + TypeScript (Frontend), Python Flask + PostgreSQL NeonDB (Backend), Flutter (Móvil).",
        "- **Zona Horaria del Sistema:** ART / America/Argentina/Buenos_Aires (UTC-3).",
        "",
        "## 🎯 Objetivos y Tareas del Sistema",
    ]
    
    for t in tasks:
        prompt_lines.append(f"- **[{t.get('status', 'in_progress').upper()}] {t.get('task_id', '')}**: {t.get('objective', '')} ({t.get('project', '')})")
        
    prompt_lines.append("")
    prompt_lines.append("## ⚖️ Decisiones Arquitectónicas Principales")
    for d in decisions:
        prompt_lines.append(f"- **{d.get('decision_id', '')} ({d.get('topic', '')})**: ✅ {d.get('choice', '')} | Motivo: {d.get('reason', '')}")
        
    prompt_lines.append("")
    prompt_lines.append("## 📦 Últimos Commits Sincronizados")
    for c in commits[:8]:
        prompt_lines.append(f"- `{str(c.get('commit_hash', ''))[:7]}` {c.get('message', '')} ({c.get('author', '')})")
        
    markdown_text = "\n".join(prompt_lines)
    
    return jsonify({
        "prompt_markdown": markdown_text,
        "tasks_count": len(tasks),
        "decisions_count": len(decisions),
        "commits_count": len(commits),
        "timestamp": _now_iso()
    })

# ================================================================
# CHAT Y DIAGNÓSTICO
# ================================================================

@xana_bp.post('/chat')
def xana_chat_endpoint():
    data = request.get_json(force=True) or {}
    message = data.get('message', '').strip()
    
    if not message:
        return jsonify({'error': 'Mensaje requerido'}), 400

    user_role = data.get('userRole', 'cliente')
    username = data.get('username', 'Usuario')
    user_id = data.get('userId', 0)
    client_logs = data.get('clientLogs', [])
    current_url = data.get('currentUrl', '/')

    try:
        result = run_xana_chat(
            message=message,
            user_role=user_role,
            username=username,
            user_id=user_id,
            client_logs=client_logs,
            current_url=current_url
        )
        return jsonify({
            'success': True,
            'reply': result.get('reply'),
            'intent': result.get('intent'),
            'diagnostics': result.get('diagnostics')
        }), 200
    except Exception as e:
        print(f"[Xana API Error]: {e}", file=sys.stderr)
        return jsonify({
            'success': False,
            'error': f'Error en el motor LangGraph de Xana: {str(e)}'
        }), 500


@xana_bp.get('/health')
def xana_health():
    """Diagnóstico rápido del motor Xana."""
    db_status = tool_inspect_db_health()
    return jsonify({
        'status': 'OK',
        'engine': 'LangGraph Stateful Engine v1.0',
        'db_health': db_status
    })

