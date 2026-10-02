#!/usr/bin/env python3
"""
Generador de Token OAuth para Google Drive (cuenta personal @gmail.com)

Por qué existe este script:
    Las Service Accounts de Google no tienen cuota de almacenamiento propia
    fuera de un dominio de Google Workspace. Para subir archivos a TU Google
    Drive personal, el script principal (sync_r2_to_drive.py) necesita
    autenticarse como VOS, no como una Service Account. Este script hace
    ese login una sola vez (abre el navegador, te pide iniciar sesión y dar
    permiso) y guarda un token reutilizable para las próximas corridas.

Requisito previo:
    Descargar 'client_secret.json' desde Google Cloud Console:
    APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth
    → Tipo de aplicación: "Aplicación de escritorio" → Crear → Descargar JSON.
    Poné ese archivo en la misma carpeta desde donde corrés este script
    (o indicá la ruta con la variable de entorno GOOGLE_OAUTH_CLIENT_FILE).

Uso (desde la terminal de VS Code, en la raíz del repo):
    python scripts/generate_drive_token.py

Qué hace:
    1. Abre tu navegador para que inicies sesión con tu cuenta @gmail.com.
    2. Te muestra una pantalla de "Google no verificó esta app" — es normal
       porque es tu propia app personal, no una app pública. Hacé clic en
       "Avanzado" → "Ir a [nombre de tu app] (no seguro)" → "Permitir".
    3. Guarda el resultado en 'token.json'.

Qué hacer con el archivo generado:
    Copiá el CONTENIDO completo de token.json y pegalo como el valor del
    secret GOOGLE_OAUTH_TOKEN_JSON en GitHub (Settings → Secrets → Actions).
    NUNCA subas token.json ni client_secret.json a git.
"""

import os
import sys

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError:
    print("[ERROR] Falta 'google-auth-oauthlib'. Instalá con: pip install google-auth-oauthlib")
    sys.exit(1)

SCOPES = ['https://www.googleapis.com/auth/drive']
CLIENT_SECRET_FILE = os.getenv("GOOGLE_OAUTH_CLIENT_FILE", "client_secret.json")
TOKEN_OUTPUT_FILE = "token.json"


def main():
    if not os.path.exists(CLIENT_SECRET_FILE):
        print(
            f"❌ No encontré '{CLIENT_SECRET_FILE}' en esta carpeta.\n"
            f"   Descargalo desde Google Cloud Console (Credenciales → Crear credenciales →\n"
            f"   ID de cliente de OAuth → tipo 'Aplicación de escritorio') y poné el archivo\n"
            f"   .json descargado en esta misma carpeta con ese nombre, o definí\n"
            f"   GOOGLE_OAUTH_CLIENT_FILE apuntando a su ruta."
        )
        sys.exit(1)

    print("[INFO] Abriendo el navegador para autorizar el acceso a tu Google Drive...")
    flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
    creds = flow.run_local_server(port=0)

    with open(TOKEN_OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(creds.to_json())

    print(f"\n[OK] Token generado y guardado en: {TOKEN_OUTPUT_FILE}")
    print("\nProximo paso:")
    print(f"  1. Abri {TOKEN_OUTPUT_FILE} y copiá TODO su contenido.")
    print("  2. Pegalo como el valor del secret GOOGLE_OAUTH_TOKEN_JSON en GitHub")
    print("     (Settings -> Secrets and variables -> Actions -> New repository secret).")
    print(f"  3. Verificá que '{TOKEN_OUTPUT_FILE}' y '{CLIENT_SECRET_FILE}' esten en .gitignore")
    print("     — NUNCA deben subirse al repositorio.")


if __name__ == "__main__":
    main()
