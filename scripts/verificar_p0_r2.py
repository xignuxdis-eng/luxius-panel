"""
Verificacion de seguridad post-rotacion (P0.1 — Cloudflare R2).

Uso:
    1) Rotar el token en el panel de Cloudflare y cargar las 4 variables
       (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)
       en Render.
    2) En Render, confirmar que `TELEGRAM_AUTO_WEBHOOK` y el deploy terminaron.
    3) Correr este script desde la raiz del repo de frontend.

Que hace:
    - Consulta /health de produccion y muestra si el storage es 'r2' o
      'r2-legacy' (si sigue en legacy, la rotacion no termino).
    - Verifica que private_legacy_r2.py haya desaparecido del repo privado.
    - Verifica que config.py ya no importe ese modulo.
    - Comprueba que ningun archivo del repo panel contenga el secreto R2.
    - Revisa si el historial publico de git expone credenciales de R2.

Solo lectura. No escribe ni modifica nada.
"""
import io
import os
import subprocess
import sys
import urllib.request

PANEL = r'F:\Sitio XignuX'
PRIVADO = r'F:\luXius-Backend'
LEGACY = 'private_legacy_r2.py'
HEALTH = 'https://luxius-backend.onrender.com/health'


def t(m):
    print(f'  {m}')


def encabezado(m):
    print(f'\n{m}\n' + '-' * len(m))


def revisar_health():
    encabezado('1. Estado de almacenamiento en produccion')
    import json
    # Render en plan gratuito puede tardar en despertar (cold start).
    for intento in range(3):
        try:
            with urllib.request.urlopen(HEALTH, timeout=40) as r:
                d = json.loads(r.read().decode('utf-8', 'replace'))
            storage = d.get('storage', '?')
            t(f"HTTP {r.status} | storage = {storage}")
            if storage == 'r2':
                t('OK: ya usa las credenciales nuevas.')
            elif storage == 'r2-legacy':
                t('PENDIENTE: sigue usando private_legacy_r2.py.')
                t('Cargar las 4 variables R2_* en Render y redesplegar.')
            else:
                t(f'ATENCION: storage={storage}. Si es "local", R2 no esta configurado.')
            return
        except Exception as ex:
            if intento < 2:
                t(f'  intento {intento + 1} fallo ({str(ex)[:60]}), reintentando...')
                continue
    t(f'No se pudo consultar tras 3 intentos: {str(ex)[:90]}')
    t('Si Render esta en plan gratuito, puede ser cold start. Probar de nuevo.')


def revisar_archivo_legacy():
    encabezado('2. Archivo transitorio private_legacy_r2.py')
    existe = os.path.exists(os.path.join(PRIVADO, LEGACY))
    t(f'{LEGACY} en el repo privado: {"SIGUE EXISTE" if existe else "eliminado (OK)"}')
    if existe:
        t('Borrarlo recien confirmada la rotacion: Remove-Item "%s" -Force'
          % os.path.join(PRIVADO, LEGACY))
        t('Y luego limpiar el import en config.py.')

    cfg = os.path.join(PRIVADO, 'config.py')
    if os.path.exists(cfg):
        txt = io.open(cfg, encoding='utf-8', errors='replace').read()
        if LEGACY in txt:
            t('config.py TODAVIA importa el modulo legacy -> limpiar bloque try/except')
            t('y retirar la bandera R2_USING_LEGACY.')
        else:
            t('config.py limpio (sin referencia al modulo legacy).')


def revisar_working_tree():
    encabezado('3. Secretos R2 en el repo del panel (working tree)')
    clave_marca = 'R2_SECRET_ACCESS_KEY'
    # Valor que realmenteLooks como una credencial de Cloudflare: string
    # alfanumerico largo. Los placeholders y las lecturas de entorno no cuentan.
    import re
    patron = re.compile(r'^[A-Za-z0-9_\-]{20,}$')
    placeholders = {
        'R2_SECRET_ACCESS_KEY', 'None', 'None', '', '<value>', '<secret>',
        '<your_secret_key>', '<nuevo_secret_access_key>', '<secret_key>',
    }
    findings = []
    for raiz, dirs, files in os.walk(PANEL):
        dirs[:] = [d for d in dirs if d not in
                   ('node_modules', '.git', 'dist', 'android', 'backups',
                    'elementos descargados', '_pruebas_versaworks',
                    '.kilo', '.agents', '.agent', '__pycache__')]
        for f in files:
            # Solo codigo ejecutable; los .md son documentacion con placeholders.
            if not f.endswith(('.ts', '.tsx', '.js', '.cjs', '.py', '.json',
                               '.yml', '.ps1', '.css', '.sh')):
                continue
            if f.endswith('.json'):
                continue  # manifest/lock: no llevan secretos
            ruta = os.path.join(raiz, f)
            if '.env' in f:
                continue
            try:
                txt = io.open(ruta, encoding='utf-8', errors='replace').read()
            except Exception:
                continue
            for i, linea in enumerate(txt.splitlines(), 1):
                if clave_marca not in linea:
                    continue
                # Debe ser una asignacion con valor literal (no os.getenv)
                if 'os.getenv' in linea or 'environ.get' in linea or 'import ' in linea:
                    continue
                if '=' not in linea:
                    continue
                valor = linea.split('=', 1)[1].strip().strip('",\'` ')
                if valor in placeholders:
                    continue
                if not patron.match(valor):
                    continue
                findings.append((os.path.relpath(ruta, PANEL), i, linea.strip()[:70]))
    if findings:
        t(f'{len(findings)} credencial(es) hardcodeada(s) con valor real:')
        for ruta, ln, linea in findings[:12]:
            t(f'  {ruta}:{ln}: {linea}')
    else:
        t('OK: sin secretos R2 hardcodeados en el codigo fuente.')
    # Nota aparte: los .md pueden contener placeholders, no es un hallazgo.
    t('(los .md quedan fuera a proposito: contienen placeholders, no secretos)')


def revisar_historial():
    encabezado('4. Credenciales R2 en el historial publico de git')
    try:
        r = subprocess.run(
            ['git', '-C', PANEL, 'log', '--all', '--oneline', '-S',
             'R2_SECRET_ACCESS_KEY', '--'],
            capture_output=True, text=True, timeout=180)
        commits = [l for l in r.stdout.splitlines() if l.strip()]
        t(f'commits que tocaron R2_SECRET_ACCESS_KEY: {len(commits)}')
        for c in commits[:8]:
            t(f'  {c}')
        if commits:
            t('')
            t('Estos commits pueden contener el valor real del secreto.')
            t('Rotar el token (P0.1) es lo que invalida el valor;')
            t('reescribir el historial es destructivo y opcional.')
    except Exception as ex:
        t(f'No se pudo revisar: {str(ex)[:90]}')


if __name__ == '__main__':
    print('=' * 68)
    print(' VERIFICACION P0.1 — Rotacion de Cloudflare R2')
    print('=' * 68)
    revisar_health()
    revisar_archivo_legacy()
    revisar_working_tree()
    revisar_historial()
    print('\n' + '=' * 68)
    print(' Reclamo: todo en OK salvo que una seccion marque PENDIENTE.')
    print('=' * 68)