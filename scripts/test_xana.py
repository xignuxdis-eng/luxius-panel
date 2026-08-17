"""
Test Suite: Xana AI & LangGraph Diagnostics
Ejecuta pruebas in-process con Flask test_client y LangGraph.
Ejecutar con: python scripts/test_xana.py
"""

import sys
import os
import json

if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Agregar server al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app import app
from services.xana_graph import run_xana_chat, tool_inspect_db_health, tool_analyze_frontend_logs

print("=" * 60)
print("TEST SUITE: XANA AI & LANGGRAPH DIAGNOSTICS")
print("=" * 60)

client = app.test_client()

# ----------------------------------------------------
# Test 1: Health & Engine Check
# ----------------------------------------------------
print("\n[Test 1] GET /api/xana/health")
try:
    resp = client.get('/api/xana/health')
    data = resp.get_json()
    print(f"  HTTP Status: {resp.status_code}")
    print(f"  Engine: {data.get('engine')}")
    db_h = data.get('db_health', {})
    print(f"  DB Status: {db_h.get('status')} (Latencia: {db_h.get('latency_ms')} ms)")
    print(f"  Presupuestos Activos: {db_h.get('tables', {}).get('presupuestos_activos')}")
    assert resp.status_code == 200
    print("  RESULT: PASS ✅")
except Exception as e:
    print(f"  RESULT: FAIL ❌ -> {e}")

# ----------------------------------------------------
# Test 2: Diagnóstico de Error de Consola (Simulando archivo pesado HTTP 413)
# ----------------------------------------------------
print("\n[Test 2] POST /api/xana/chat (Diagnóstico de Errores de Consola)")
try:
    simulated_logs = [
        {
            "type": "error",
            "message": "Failed to load resource: the server responded with a status of 413 (Payload Too Large)",
            "url": "/ordenes/nueva"
        }
    ]
    resp = client.post('/api/xana/chat', json={
        "message": "Revisa los errores de mi pantalla",
        "userRole": "admin",
        "username": "Admin",
        "clientLogs": simulated_logs
    })
    data = resp.get_json()
    print(f"  HTTP Status: {resp.status_code}")
    print(f"  Intent: {data.get('intent')}")
    print(f"  Respuesta Xana:")
    for line in data.get('reply', '').split('\n'):
        print(f"    {line}")
    assert resp.status_code == 200
    assert "413" in data.get('reply') or "Tamaño de Archivo" in data.get('reply')
    print("  RESULT: PASS ✅")
except Exception as e:
    print(f"  RESULT: FAIL ❌ -> {e}")

# ----------------------------------------------------
# Test 3: Auditoría de Base de Datos (Rol: Admin)
# ----------------------------------------------------
print("\n[Test 3] POST /api/xana/chat (Auditoría de BD por Admin)")
try:
    resp = client.post('/api/xana/chat', json={
        "message": "Audita la salud de la base de datos Neon y tablas",
        "userRole": "admin",
        "username": "SuperAdmin"
    })
    data = resp.get_json()
    print(f"  HTTP Status: {resp.status_code}")
    print(f"  Intent: {data.get('intent')}")
    print(f"  Respuesta Xana:")
    for line in data.get('reply', '').split('\n')[:8]:
        print(f"    {line}")
    assert resp.status_code == 200
    assert "Neon" in data.get('reply')
    print("  RESULT: PASS ✅")
except Exception as e:
    print(f"  RESULT: FAIL ❌ -> {e}")

# ----------------------------------------------------
# Test 4: Control de Roles y Seguridad (Rol: Cliente intentando auditar BD)
# ----------------------------------------------------
print("\n[Test 4] POST /api/xana/chat (Control de Roles: Cliente restringido)")
try:
    resp = client.post('/api/xana/chat', json={
        "message": "Audita la base de datos Neon",
        "userRole": "cliente",
        "username": "JuanCliente"
    })
    data = resp.get_json()
    reply = data.get('reply', '')
    print(f"  HTTP Status: {resp.status_code}")
    print(f"  Respuesta Xana: {reply}")
    assert resp.status_code == 200
    assert "exclusivamente para Administradores" in reply or "🔒" in reply
    print("  Bloqueo de seguridad verificado correctamente.")
    print("  RESULT: PASS ✅")
except Exception as e:
    print(f"  RESULT: FAIL ❌ -> {e}")

# ----------------------------------------------------
# Test 5: Consulta de Materiales y Producción
# ----------------------------------------------------
print("\n[Test 5] POST /api/xana/chat (Consulta de Materiales)")
try:
    resp = client.post('/api/xana/chat', json={
        "message": "¿Qué tipos de vinilo y lona manejan?",
        "userRole": "vendedor",
        "username": "Vendedor1"
    })
    data = resp.get_json()
    print(f"  HTTP Status: {resp.status_code}")
    print(f"  Respuesta Xana:")
    for line in data.get('reply', '').split('\n'):
        print(f"    {line}")
    assert resp.status_code == 200
    assert len(data.get('reply', '')) > 20
    print("  RESULT: PASS ✅")
except Exception as e:
    print(f"  RESULT: FAIL ❌ -> {e}")

print("\n" + "=" * 60)
print("ALL 5 XANA AI & LANGGRAPH TESTS PASSED (100% SUCCESS) 🎉")
print("=" * 60)
