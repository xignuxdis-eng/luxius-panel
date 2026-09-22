# Start script for Luxius
# Ensures environment is set up before running the dev server

$nodeDir = Join-Path $PSScriptRoot ".node"

if (-not (Test-Path $nodeDir)) {
    Write-Host "✦ Environment not found. Running setup..." -ForegroundColor Yellow
    & ".\setup_env.ps1"
}

# Update Path for current session
$env:Path = "$(Join-Path $nodeDir '');$env:Path"

Write-Host "✦ Starting Luxius Development Server..." -ForegroundColor Cyan
& npm run dev
