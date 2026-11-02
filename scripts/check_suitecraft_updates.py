#!/usr/bin/env python3
"""
scripts/check_suitecraft_updates.py
Verifica y actualiza automáticamente PhotoCraft y VectorCraft (SuiteCraft)
desde los repositorios oficiales de Storytold en GitHub:
  - https://github.com/storytold/photocraft
  - https://github.com/storytold/vectorcraft

Mantiene la arquitectura de autocarga inyectando el puente de eventos
(dispatchDrop, TrunkApplicationStarted, postMessage) en los index.html generados.
"""

import sys
import os
import json
import urllib.request
import urllib.error
import zipfile
import shutil
import re

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUITECRAFT_DIR = os.path.join(ROOT_DIR, "public", "suitecraft")
VERSION_FILE = os.path.join(SUITECRAFT_DIR, "version.json")

GITHUB_HEADERS = {
    "User-Agent": "LuXius-SuiteCraft-Updater/1.0",
    "Accept": "application/vnd.github.v3+json"
}

# Token opcional de GitHub para evitar rate limiting en CI
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
if GITHUB_TOKEN:
    GITHUB_HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"

AUTOLOAD_SNIPPET_PHOTOCRAFT = """  <script>
  (function() {
    const CANVAS_ID = 'photocraft_canvas';
    const LOADING_ID = 'photocraft_loading';
    let isAppReady = false;
    let pendingFile = null;
    let lastDelivered = null;

    function dispatchDrop(file) {
      if (!file) return false;
      const canvas = document.getElementById(CANVAS_ID) || document.querySelector('canvas');
      if (!canvas) return false;

      const fileKey = file.name + ':' + file.size;
      if (lastDelivered === fileKey) return true;

      const dt = new DataTransfer();
      dt.items.add(file);

      const pos = {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      };

      try {
        const dragEnter = new DragEvent('dragenter', pos);
        const dragOver = new DragEvent('dragover', pos);
        const drop = new DragEvent('drop', pos);

        window.dispatchEvent(dragEnter);
        canvas.dispatchEvent(dragEnter);
        window.dispatchEvent(dragOver);
        canvas.dispatchEvent(dragOver);
        canvas.dispatchEvent(drop);
        window.dispatchEvent(drop);
        lastDelivered = fileKey;
        console.log('[SuiteCraft:PhotoCraft] Archivo entregado exitosamente al lienzo:', file.name, file.size + 'B');
        return true;
      } catch (err) {
        console.error('[SuiteCraft:PhotoCraft] Error despachando drop:', err);
        return false;
      }
    }

    function onAppReady() {
      isAppReady = true;
      if (pendingFile) {
        const f = pendingFile;
        pendingFile = null;
        setTimeout(() => dispatchDrop(f), 350);
      }
    }

    function queueFile(file) {
      if (isAppReady) {
        setTimeout(() => dispatchDrop(file), 250);
      } else {
        pendingFile = file;
      }
    }

    window.addEventListener('TrunkApplicationStarted', () => {
      const checkInterval = setInterval(() => {
        const loading = document.getElementById(LOADING_ID);
        const canvas = document.getElementById(CANVAS_ID) || document.querySelector('canvas');
        const isGone = !loading || !document.body.contains(loading) || loading.style.display === 'none';
        if (isGone && canvas) {
          clearInterval(checkInterval);
          setTimeout(onAppReady, 300);
        }
      }, 120);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isAppReady) onAppReady();
      }, 15000);
    });

    async function loadUrl(url, fallbackName) {
      if (!url) return;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const fileName = fallbackName || url.split('/').pop()?.split('?')[0] || 'diseno.png';
        const file = new File([blob], fileName, { type: blob.type || 'image/png' });
        queueFile(file);
      } catch (err) {
        console.warn('[SuiteCraft:PhotoCraft] No se pudo descargar la imagen por fetch:', err);
      }
    }

    try {
      if (window.location.hash && window.location.hash.length > 1) {
        const raw = decodeURIComponent(window.location.hash.slice(1));
        let targetUrl = null;
        try {
          const json = JSON.parse(raw);
          if (json.files && json.files.length > 0) targetUrl = json.files[0];
        } catch (_) {
          if (/^(https?|data|blob):/i.test(raw)) targetUrl = raw;
        }
        if (targetUrl) {
          loadUrl(targetUrl);
        }
      }
    } catch (err) {
      console.warn('[SuiteCraft:PhotoCraft] Error leyendo hash inicial:', err);
    }

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'SUITECRAFT_LOAD_BUFFER' && data.buffer) {
        try {
          const blob = new Blob([data.buffer], { type: data.mimeType || 'image/png' });
          const file = new File([blob], data.fileName || 'diseno.png', { type: blob.type });
          queueFile(file);
        } catch (err) {
          console.error('[SuiteCraft:PhotoCraft] Error procesando buffer de postMessage:', err);
        }
      } else if (data.type === 'SUITECRAFT_LOAD_FILE' && data.fileUrl) {
        loadUrl(data.fileUrl, data.fileName);
      }
    });
  })();
  </script>
</body>
</html>
"""

AUTOLOAD_SNIPPET_VECTORCRAFT = """  <script>
  (function() {
    const CANVAS_ID = 'vectorcraft_canvas';
    const LOADING_ID = 'vectorcraft_loading';
    let isAppReady = false;
    let pendingFile = null;
    let lastDelivered = null;

    function dispatchDrop(file) {
      if (!file) return false;
      const canvas = document.getElementById(CANVAS_ID) || document.querySelector('canvas');
      if (!canvas) return false;

      const fileKey = file.name + ':' + file.size;
      if (lastDelivered === fileKey) return true;

      const dt = new DataTransfer();
      dt.items.add(file);

      const pos = {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      };

      try {
        const dragEnter = new DragEvent('dragenter', pos);
        const dragOver = new DragEvent('dragover', pos);
        const drop = new DragEvent('drop', pos);

        window.dispatchEvent(dragEnter);
        canvas.dispatchEvent(dragEnter);
        window.dispatchEvent(dragOver);
        canvas.dispatchEvent(dragOver);
        canvas.dispatchEvent(drop);
        window.dispatchEvent(drop);
        lastDelivered = fileKey;
        console.log('[SuiteCraft:VectorCraft] Archivo entregado exitosamente al lienzo:', file.name, file.size + 'B');
        return true;
      } catch (err) {
        console.error('[SuiteCraft:VectorCraft] Error despachando drop:', err);
        return false;
      }
    }

    function onAppReady() {
      isAppReady = true;
      if (pendingFile) {
        const f = pendingFile;
        pendingFile = null;
        setTimeout(() => dispatchDrop(f), 350);
      }
    }

    function queueFile(file) {
      if (isAppReady) {
        setTimeout(() => dispatchDrop(file), 250);
      } else {
        pendingFile = file;
      }
    }

    window.addEventListener('TrunkApplicationStarted', () => {
      const checkInterval = setInterval(() => {
        const loading = document.getElementById(LOADING_ID);
        const canvas = document.getElementById(CANVAS_ID) || document.querySelector('canvas');
        const isGone = !loading || !document.body.contains(loading) || loading.style.display === 'none';
        if (isGone && canvas) {
          clearInterval(checkInterval);
          setTimeout(onAppReady, 300);
        }
      }, 120);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isAppReady) onAppReady();
      }, 15000);
    });

    async function loadUrl(url, fallbackName) {
      if (!url) return;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const fileName = fallbackName || url.split('/').pop()?.split('?')[0] || 'diseno.svg';
        const file = new File([blob], fileName, { type: blob.type || 'image/svg+xml' });
        queueFile(file);
      } catch (err) {
        console.warn('[SuiteCraft:VectorCraft] No se pudo descargar la imagen por fetch:', err);
      }
    }

    try {
      if (window.location.hash && window.location.hash.length > 1) {
        const raw = decodeURIComponent(window.location.hash.slice(1));
        let targetUrl = null;
        try {
          const json = JSON.parse(raw);
          if (json.files && json.files.length > 0) targetUrl = json.files[0];
        } catch (_) {
          if (/^(https?|data|blob):/i.test(raw)) targetUrl = raw;
        }
        if (targetUrl) {
          loadUrl(targetUrl);
        }
      }
    } catch (err) {
      console.warn('[SuiteCraft:VectorCraft] Error leyendo hash inicial:', err);
    }

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'SUITECRAFT_LOAD_BUFFER' && data.buffer) {
        try {
          const blob = new Blob([data.buffer], { type: data.mimeType || 'image/svg+xml' });
          const file = new File([blob], data.fileName || 'diseno.svg', { type: blob.type });
          queueFile(file);
        } catch (err) {
          console.error('[SuiteCraft:VectorCraft] Error procesando buffer de postMessage:', err);
        }
      } else if (data.type === 'SUITECRAFT_LOAD_FILE' && data.fileUrl) {
        loadUrl(data.fileUrl, data.fileName);
      }
    });
  })();
  </script>
</body>
</html>
"""


def load_local_versions():
    if os.path.exists(VERSION_FILE):
        try:
            with open(VERSION_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Aviso] No se pudo leer version.json: {e}")
    return {
        "photocraft": {"version": "v0.0.0"},
        "vectorcraft": {"version": "v0.0.0"}
    }


def save_local_versions(data):
    with open(VERSION_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def get_latest_github_release(repo_name):
    url = f"https://api.github.com/repos/storytold/{repo_name}/releases/latest"
    req = urllib.request.Request(url, headers=GITHUB_HEADERS)
    with urllib.request.urlopen(req, timeout=15) as res:
        if res.status == 200:
            return json.loads(res.read().decode("utf-8"))
    return None


def inject_autoload_bridge(index_path, tool_name):
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Si ya contiene el puente, no duplicar
    if "dispatchDrop(file)" in content:
        print(f"  -> Puente de autocarga ya presente en {index_path}")
        return

    # Inyectar antes de </body></html>
    snippet = AUTOLOAD_SNIPPET_PHOTOCRAFT if tool_name == "photocraft" else AUTOLOAD_SNIPPET_VECTORCRAFT
    if "</body>" in content:
        parts = content.rsplit("</body>", 1)
        new_content = parts[0] + snippet
    else:
        new_content = content + snippet

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"  -> Puente de autocarga inyectado correctamente en {tool_name}")


def update_tool(tool_name, release_info):
    tag = release_info.get("tag_name")
    published = release_info.get("published_at")
    assets = release_info.get("assets", [])

    # Buscar asset web zip
    web_asset = None
    for a in assets:
        if "web" in a["name"] and a["name"].endswith(".zip"):
            web_asset = a
            break

    if not web_asset:
        print(f"[!] No se encontró asset web.zip en release {tag} de {tool_name}")
        return False

    download_url = web_asset["browser_download_url"]
    print(f"[*] Descargando {web_asset['name']} ({web_asset['size']} bytes)...")

    tmp_zip = os.path.join(SUITECRAFT_DIR, f"{tool_name}_update.zip")
    req = urllib.request.Request(download_url, headers={"User-Agent": GITHUB_HEADERS["User-Agent"]})
    with urllib.request.urlopen(req, timeout=60) as resp, open(tmp_zip, "wb") as out:
        shutil.copyfileobj(resp, out)

    dest_dir = os.path.join(SUITECRAFT_DIR, tool_name)
    backup_dir = os.path.join(SUITECRAFT_DIR, f"{tool_name}_backup")

    # Respaldar
    if os.path.exists(backup_dir):
        shutil.rmtree(backup_dir)
    if os.path.exists(dest_dir):
        shutil.copytree(dest_dir, backup_dir)

    try:
        # Extraer
        with zipfile.ZipFile(tmp_zip, 'r') as zip_ref:
            zip_ref.extractall(dest_dir)

        # Inyectar puente en index.html
        index_file = os.path.join(dest_dir, "index.html")
        if os.path.exists(index_file):
            inject_autoload_bridge(index_file, tool_name)

        if os.path.exists(backup_dir):
            shutil.rmtree(backup_dir)
        if os.path.exists(tmp_zip):
            os.remove(tmp_zip)

        print(f"[OK] {tool_name} actualizado con éxito a {tag}!")
        return True

    except Exception as e:
        print(f"[ERROR] Falló la extracción de {tool_name}: {e}")
        if os.path.exists(backup_dir):
            print(f"[*] Restaurando respaldo previo...")
            if os.path.exists(dest_dir):
                shutil.rmtree(dest_dir)
            shutil.copytree(backup_dir, dest_dir)
            shutil.rmtree(backup_dir)
        return False


def main():
    print("=== SuiteCraft Automatic Update Checker ===")
    local_data = load_local_versions()
    has_changes = False
    updated_tools = []

    for tool in ["photocraft", "vectorcraft"]:
        print(f"\nVerificando {tool}...")
        try:
            rel = get_latest_github_release(tool)
            if not rel:
                print(f"No se pudo obtener información de {tool}")
                continue

            latest_tag = rel.get("tag_name")
            current_tag = local_data.get(tool, {}).get("version", "v0.0.0")

            print(f"  Versión local:  {current_tag}")
            print(f"  Versión remota: {latest_tag}")

            if latest_tag != current_tag:
                print(f"  -> ¡Nueva versión detectada! ({current_tag} -> {latest_tag})")
                success = update_tool(tool, rel)
                if success:
                    local_data[tool] = {
                        "version": latest_tag,
                        "updatedAt": rel.get("published_at")
                    }
                    has_changes = True
                    updated_tools.append(f"{tool} ({latest_tag})")
            else:
                print(f"  -> Ya está en la última versión ({current_tag}).")

        except Exception as err:
            print(f"Error comprobando {tool}: {err}")

    if has_changes:
        save_local_versions(local_data)
        print("\n[Éxito] Se actualizaron herramientas:", ", ".join(updated_tools))
        # Salida especial para GitHub Actions
        github_output = os.environ.get("GITHUB_OUTPUT")
        if github_output:
            with open(github_output, "a", encoding="utf-8") as f:
                f.write("updated=true\n")
                f.write(f"tools={' '.join(updated_tools)}\n")
        sys.exit(0)
    else:
        print("\n[Al día] Ambas herramientas se encuentran actualizadas.")
        github_output = os.environ.get("GITHUB_OUTPUT")
        if github_output:
            with open(github_output, "a", encoding="utf-8") as f:
                f.write("updated=false\n")
        sys.exit(0)


if __name__ == "__main__":
    main()

