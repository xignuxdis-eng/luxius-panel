#!/usr/bin/env python3
"""
scripts/check_psdfy_updates.py
Verifica y actualiza la información de versión de PSDFy (Mattel-Limbo/psdfy)
desde PyPI y GitHub Releases oficiales:
  - GitHub: https://github.com/Mattel-Limbo/psdfy
  - PyPI:   https://pypi.org/pypi/psdfy

Uso:
  python scripts/check_psdfy_updates.py            # Comprobar versiones
  python scripts/check_psdfy_updates.py --upgrade  # Si está en local, actualiza via pip
"""

import sys
import os
import json
import urllib.request
import urllib.error
import subprocess

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION_FILE = os.path.join(ROOT_DIR, "public", "suitecraft", "version.json")

GITHUB_API_URL = "https://api.github.com/repos/Mattel-Limbo/psdfy/releases/latest"
PYPI_API_URL = "https://pypi.org/pypi/psdfy/json"

def get_latest_remote_version():
    """Consulta la última versión publicada en PyPI y GitHub."""
    latest_tag = None
    published_at = None

    # 1. Intentar PyPI
    try:
        req = urllib.request.Request(PYPI_API_URL, headers={"User-Agent": "LuXius-PSDFy-Updater/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            info = data.get("info", {})
            latest_tag = "v" + info.get("version", "").lstrip("v")
    except Exception as e:
        print(f"[!] PyPI query failed: {e}")

    # 2. Intentar GitHub Releases si PyPI no devolvió nada
    if not latest_tag:
        try:
            req = urllib.request.Request(GITHUB_API_URL, headers={"User-Agent": "LuXius-PSDFy-Updater/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                latest_tag = data.get("tag_name")
                published_at = data.get("published_at")
        except Exception as e:
            print(f"[!] GitHub query failed: {e}")

    return latest_tag, published_at

def load_local_version():
    if not os.path.exists(VERSION_FILE):
        return {}
    try:
        with open(VERSION_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[!] Error leyendo version.json: {e}")
        return {}

def save_local_version(data):
    try:
        with open(VERSION_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"[OK] {VERSION_FILE} actualizado exitosamente.")
    except Exception as e:
        print(f"[ERROR] No se pudo escribir version.json: {e}")

def main():
    print("=== PSDFy (LuXius Studio) Version & Update Checker ===")
    
    local_data = load_local_version()
    current_info = local_data.get("psdfy", {})
    current_version = current_info.get("version", "v0.0.0")

    print(f"Versión local registrada: {current_version}")
    print("Consultando versión remota (PyPI / GitHub)...")

    latest_tag, published_at = get_latest_remote_version()
    if not latest_tag:
        print("[ERROR] No se pudo verificar la versión remota de psdfy.")
        sys.exit(1)

    print(f"Última versión remota:   {latest_tag}")

    has_update = latest_tag != current_version

    if has_update:
        print(f"[*] ¡Nueva versión disponible! ({current_version} -> {latest_tag})")
        local_data["psdfy"] = {
            "version": latest_tag,
            "updatedAt": published_at or current_info.get("updatedAt"),
            "engine": "SAM 2 & PyTorch",
            "repo": "https://github.com/Mattel-Limbo/psdfy",
            "defaultPort": 3457
        }
        save_local_version(local_data)
        
        # Si se pasó el flag --upgrade y estamos en local con pip disponible
        if "--upgrade" in sys.argv:
            print("[*] Ejecutando: pip install --upgrade psdfy ...")
            try:
                subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "psdfy"], check=True)
                print("[OK] Paquete psdfy actualizado en el entorno local.")
            except Exception as pip_err:
                print(f"[!] Falló la actualización por pip: {pip_err}")

        # Salida para GitHub Actions
        github_output = os.environ.get("GITHUB_OUTPUT")
        if github_output:
            with open(github_output, "a", encoding="utf-8") as f:
                f.write(f"updated=true\n")
                f.write(f"psdfy_version={latest_tag}\n")
    else:
        print(f"[OK] PSDFy ya se encuentra en la versión más reciente ({current_version}).")
        github_output = os.environ.get("GITHUB_OUTPUT")
        if github_output:
            with open(github_output, "a", encoding="utf-8") as f:
                f.write("updated=false\n")

if __name__ == "__main__":
    main()

