# Luxius Full Backup Automation Script
# Genera un respaldo completo del sistema (Frontend, Server, Datos y Configuración)

$ErrorActionPreference = "Stop"

# 1. Definir Timestamp y Rutas
$timestamp = Get-Date -Format "yyyy_MM_dd_HHmm"
$backupName = "luxius_backup_$timestamp"
$parentDir = $PSScriptRoot
$tempPath = Join-Path $parentDir $backupName
$zipPath = "$tempPath.zip"

Write-Host "🚀 Iniciando respaldo: $backupName..." -ForegroundColor Cyan

try {
    # 2. Crear carpeta temporal
    if (Test-Path $tempPath) { Remove-Item -Path $tempPath -Recurse -Force }
    New-Item -ItemType Directory -Path $tempPath | Out-Null

    # 3. Copiar Frontend (src y public)
    Write-Host "📦 Copiando carpetas de Frontend..." -ForegroundColor Gray
    if (Test-Path "src") { Copy-Item -Path "src" -Destination $tempPath -Recurse -Force }
    if (Test-Path "public") { Copy-Item -Path "public" -Destination $tempPath -Recurse -Force }

    # 4. Copiar Server (Incluye data y uploads)
    Write-Host "📦 Copiando carpeta de Servidor y Datos..." -ForegroundColor Gray
    if (Test-Path "server") { Copy-Item -Path "server" -Destination $tempPath -Recurse -Force }

    # 5. Copiar Archivos de Configuración Raíz
    Write-Host "📄 Copiando archivos de configuración..." -ForegroundColor Gray
    $configFiles = @(
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "tsconfig.app.json",
        "tsconfig.node.json",
        "vite.config.ts",
        "index.html"
    )

    foreach ($file in $configFiles) {
        if (Test-Path $file) {
            Copy-Item -Path $file -Destination $tempPath -Force
        }
    }

    # 6. Copiar archivos .env
    Get-ChildItem -Path "." -Filter ".env*" | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $tempPath -Force
    }

    # 7. Comprimir todo en ZIP
    Write-Host "🗜️ Comprimiendo archivos en $backupName.zip..." -ForegroundColor Yellow
    Compress-Archive -Path "$tempPath\*" -DestinationPath $zipPath -Force

    # 8. Limpiar carpeta temporal
    Write-Host "🧹 Limpiando archivos temporales..." -ForegroundColor Gray
    Remove-Item -Path $tempPath -Recurse -Force

    Write-Host "`n✅ ¡RESPALDO COMPLETADO CON ÉXITO!" -ForegroundColor Green
    Write-Host "📍 Ubicación: $zipPath" -ForegroundColor Green

} catch {
    Write-Host "`n❌ ERROR DURANTE EL RESPALDO:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if (Test-Path $tempPath) { Remove-Item -Path $tempPath -Recurse -Force }
}

Pause
