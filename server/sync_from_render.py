"""
sync_from_render.py
Descarga todos los datos desde Render (produccion) y los importa
a la base de datos PostgreSQL local.

Uso: python sync_from_render.py
"""

import requests
import json
import sys
import os

# Fix Windows console encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ── CONFIG ──────────────────────────────────────────────────────────────
RENDER_API   = "https://luxius-backend.onrender.com/api"
LOCAL_API    = "http://localhost:5000/api"
AUTH_USER    = "admin"
AUTH_PASS    = "admin"          # ajustar si cambió

ENDPOINTS = [
    "clientes",
    "materiales",
    "calidades",
    "maquinas",
    "usuarios",
    "proveedores",
    "servicios",
    "logisticas",
    "calendar",
    "roles",
    "orders",           # ordenes
    "combos",
]
# ────────────────────────────────────────────────────────────────────────

def get_token(base_url):
    """Obtiene JWT del backend indicado."""
    try:
        r = requests.post(f"{base_url}/auth/login",
                          json={"username": AUTH_USER, "password": AUTH_PASS},
                          timeout=90)
        if r.ok:
            data = r.json()
            return data.get("token") or data.get("access_token")
    except Exception as e:
        print(f"  [AUTH ERROR] {e}")
    return None


def fetch_all(base_url, endpoint, token):
    """Descarga todos los registros de un endpoint."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        r = requests.get(f"{base_url}/{endpoint}", headers=headers, timeout=120)
        if r.ok:
            data = r.json()
            # Algunos endpoints devuelven {items: [...]} en vez de [...]
            if isinstance(data, list):
                return data
            if isinstance(data, dict):
                for key in ("items", "data", "results", endpoint):
                    if key in data and isinstance(data[key], list):
                        return data[key]
        else:
            print(f"  [WARN] {endpoint} -> HTTP {r.status_code}")
    except Exception as e:
        print(f"  [ERROR] {endpoint}: {e}")
    return []


def push_to_local(endpoint, records, token):
    """Sube registros al backend local, uno por uno via PUT/POST."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"} if token else {}
    created = 0
    updated = 0
    failed  = 0

    for rec in records:
        rec_id = rec.get("id")
        # Intentar PUT (actualizar) primero, luego POST (crear)
        try:
            if rec_id:
                r = requests.put(f"{LOCAL_API}/{endpoint}/{rec_id}",
                                 json=rec, headers=headers, timeout=30)
                if r.ok:
                    updated += 1
                    continue
                # Si no existe, crear
                if r.status_code in (404, 405):
                    r2 = requests.post(f"{LOCAL_API}/{endpoint}",
                                       json=rec, headers=headers, timeout=30)
                    if r2.ok:
                        created += 1
                    else:
                        print(f"  [FAIL] POST {endpoint}/{rec_id}: {r2.status_code} {r2.text[:120]}")
                        failed += 1
                else:
                    print(f"  [FAIL] PUT {endpoint}/{rec_id}: {r.status_code} {r.text[:120]}")
                    failed += 1
            else:
                r = requests.post(f"{LOCAL_API}/{endpoint}",
                                  json=rec, headers=headers, timeout=30)
                if r.ok:
                    created += 1
                else:
                    print(f"  [FAIL] POST {endpoint}: {r.status_code} {r.text[:120]}")
                    failed += 1
        except Exception as e:
            print(f"  [ERROR] {endpoint} id={rec_id}: {e}")
            failed += 1

    return created, updated, failed


def main():
    print("=" * 60)
    print("  LUXIUS - Sincronizacion Render -> Local")
    print("=" * 60)

    # 1. Autenticar en Render
    print("\n[1] Autenticando en Render...")
    render_token = get_token(RENDER_API)
    if not render_token:
        print("  [ERROR] No se pudo autenticar en Render. Abortando.")
        sys.exit(1)
    print("  ✅ Token Render OK")

    # 2. Autenticar en Local
    print("\n[2] Autenticando en servidor local...")
    local_token = get_token(LOCAL_API)
    if not local_token:
        print("  [WARN] No se pudo autenticar en local (puede ser que no requiera auth para escritura)")
    else:
        print("  ✅ Token Local OK")

    total_records = 0

    # 3. Iterar por cada colección
    for ep in ENDPOINTS:
        print(f"\n[→] {ep}...")

        records = fetch_all(RENDER_API, ep, render_token)
        if not records:
            print(f"  [SKIP] Sin datos o endpoint inexistente")
            continue

        print(f"  Descargados: {len(records)} registros")
        total_records += len(records)

        created, updated, failed = push_to_local(ep, records, local_token)
        print(f"  Local → Creados: {created} | Actualizados: {updated} | Fallidos: {failed}")

        # Guardar copia JSON local de respaldo
        backup_dir = os.path.join(os.path.dirname(__file__), "data_backup")
        os.makedirs(backup_dir, exist_ok=True)
        with open(os.path.join(backup_dir, f"{ep}.json"), "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2, default=str)

    print("\n" + "=" * 60)
    print(f"  ✅ Sincronización completa — {total_records} registros totales")
    print(f"  Backups JSON guardados en: server/data_backup/")
    print("=" * 60)


if __name__ == "__main__":
    main()
