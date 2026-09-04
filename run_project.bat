@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "SERVER_DIR=%ROOT%\server"
set "BACKEND_REPO=F:\luXius-Backend"

echo.
echo  ============================================
echo    LUXIUS PROJECT - Entorno de Desarrollo
echo    Ultima actualizacion: 2026-09-04
echo  ============================================
echo.

REM --- SYNC: Copiar archivos del repo backend al server local ---
echo  [SYNC] Sincronizando backend desde repo git...

set "SYNC_FILES=app.py models.py requirements.txt"
for %%F in (%SYNC_FILES%) do (
    if exist "%BACKEND_REPO%\%%F" (
        copy /Y "%BACKEND_REPO%\%%F" "%SERVER_DIR%\%%F" >nul 2>&1
    )
)

set "SYNC_DIRS=routes middleware services"
for %%D in (%SYNC_DIRS%) do (
    if exist "%BACKEND_REPO%\%%D" (
        if not exist "%SERVER_DIR%\%%D" mkdir "%SERVER_DIR%\%%D"
        xcopy /Y /Q /S "%BACKEND_REPO%\%%D\*.*" "%SERVER_DIR%\%%D\" >nul 2>&1
    )
)

REM Sync .env if not present in server
if not exist "%SERVER_DIR%\.env" (
    if exist "%BACKEND_REPO%\.env" (
        copy /Y "%BACKEND_REPO%\.env" "%SERVER_DIR%\.env" >nul 2>&1
        echo  [SYNC] .env copiado desde repo backend.
    )
)
echo  [SYNC] Backend sincronizado con luXius-Backend repo.
echo.

REM --- BACKEND: Python venv ---
echo  [BACKEND] Configurando Python...
cd /d "%SERVER_DIR%"

if not exist ".venv" (
    echo  [BACKEND] Creando entorno virtual...
    python -m venv .venv
    if errorlevel 1 (
        echo  [ERROR] No se pudo crear el venv. Python instalado y en PATH?
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
    pip install -r requirements.txt --quiet 2>nul
    echo  [BACKEND] Entorno virtual OK.
)

REM --- FRONTEND: Node.js ---
cd /d "%ROOT%"
echo  [FRONTEND] Verificando Node.js...
if not exist "node_modules" (
    echo  [FRONTEND] Instalando dependencias npm...
    call npm install
    if errorlevel 1 (
        echo  [ERROR] Fallo npm install. Node.js instalado?
        pause
        exit /b 1
    )
) else (
    echo  [FRONTEND] Dependencias npm OK.
)

REM --- LAUNCH ---
echo.
echo  [LAUNCH] Iniciando servidores...

REM Kill any leftover processes on ports 5000 and 3005
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5000 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%p /F >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3005 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%p /F >nul 2>&1
)

REM Start backend
start "Luxius Backend (Flask :5000)" /D "%SERVER_DIR%" cmd /k "call .venv\Scripts\activate.bat && python app.py"

REM Wait for backend to boot
echo  [LAUNCH] Esperando que el backend inicie...
timeout /t 4 /nobreak >nul

REM Start frontend
start "Luxius Frontend (Vite :3005)" /D "%ROOT%" cmd /k "npm run dev"

REM Wait for frontend to boot, then open browser
timeout /t 3 /nobreak >nul
start "" "http://localhost:3005"

echo.
echo  ============================================
echo    SERVIDORES INICIADOS
echo  ============================================
echo.
echo    Backend  : http://localhost:5000/api
echo    Frontend : http://localhost:3005
echo.
echo    API detecta automaticamente:
echo      - Local:  http://localhost:5000/api
echo      - Cloud:  https://luxius-backend.onrender.com/api
echo.
echo    Cambios en el frontend se reflejan al
echo    instante (Vite HMR).
echo.
echo    Para deployar a produccion:
echo      1. npm run build
echo      2. git add -A ^&^& git commit -m "msg" ^&^& git push
echo.
echo    Presiona cualquier tecla para cerrar todo.
echo.
pause >nul

REM Cleanup: kill backend and frontend processes
taskkill /FI "WINDOWTITLE eq Luxius Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Luxius Frontend*" /F >nul 2>&1
echo  [CLEANUP] Servidores detenidos.
