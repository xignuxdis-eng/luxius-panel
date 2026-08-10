@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "SERVER_DIR=%ROOT%\server"

echo.
echo  ============================================
echo    LUXIUS PROJECT - Entorno de Desarrollo
echo  ============================================
echo.

REM ─── BACKEND ───────────────────────────────
echo  [BACKEND] Configurando Python...
cd /d "%SERVER_DIR%"

if not exist ".venv" (
    echo  [BACKEND] Creando entorno virtual...
    python -m venv .venv
    if errorlevel 1 (
        echo  [ERROR] No se pudo crear el venv. ^^¿Python instalado y en PATH?^^
        pause
        exit /b 1
    )
    call .venv\Scripts\activate.bat
    echo  [BACKEND] Instalando dependencias...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo  [ERROR] Fallo la instalacion de dependencias Python.
        pause
        exit /b 1
    )
    echo  [BACKEND] Entorno listo.
) else (
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt --quiet
    echo  [BACKEND] Entorno virtual OK.
)

REM ─── FRONTEND ──────────────────────────────
cd /d "%ROOT%"
echo  [FRONTEND] Verificando Node.js...
if not exist "node_modules" (
    echo  [FRONTEND] Instalando dependencias npm...
    call npm install
    if errorlevel 1 (
        echo  [ERROR] Fallo npm install. ^^¿Node.js instalado?^^
        pause
        exit /b 1
    )
) else (
    echo  [FRONTEND] Dependencias npm OK.
)

REM ─── LAUNCH ────────────────────────────────
echo.
echo  [LAUNCH] Iniciando servidores...

start "Luxius Backend (Python/SQL :5000)" cmd /k "cd /d "%SERVER_DIR%" && call .venv\Scripts\activate.bat && python app.py"

timeout /t 3 /nobreak >nul

start "Luxius Frontend (Vite :3005)" cmd /k "cd /d "%ROOT%" && npm run dev"

echo.
echo  ============================================
echo    SERVIDORES INICIADOS
echo  ============================================
echo.
echo    Backend  : http://localhost:5000
echo    Frontend : http://localhost:3005
echo.
echo    El navegador se abrira automaticamente.
echo    Cierra esta ventana para detener los
echo    procesos hijos.
echo.
pause >nul
