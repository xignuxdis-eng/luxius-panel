@echo off
chcp 65001 >nul
title LuXius Studio — Microservicio Local PSDFy (SAM 2)
cd /d "%~dp0"

echo ========================================================
echo    LUXIUS STUDIO — INICIADOR DE MICROSERVICIO PSDFY
echo ========================================================
echo.
echo  • Motor: Segment Anything 2 (SAM 2) & PyTorch
echo  • Puerto predeterminado: http://localhost:3457
echo  • Destino: Exportación nativa .PSD con capas editables
echo.

:: Verificar si python está instalado
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] No se encontró Python en el PATH del sistema.
    echo Instale Python 3.11 o superior desde python.org marcando "Add to PATH".
    pause
    exit /b 1
)

:: Verificar si psdfy está instalado
python -c "import psdfy" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [*] 'psdfy' no está instalado en este entorno de Python.
    echo [*] Instalando 'psdfy' mediante pip...
    python -m pip install --upgrade psdfy
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Falló la instalación de psdfy. Revise su conexión a Internet.
        pause
        exit /b 1
    )
    echo [*] Inicializando modelos de psdfy...
    psdfy install --no-weights
)

echo.
echo [OK] Iniciando microservicio local PSDFy en http://localhost:3457 ...
echo Mantenga esta ventana abierta mientras trabaje en LuXius Studio.
echo.

psdfy start
pause
