# Setup Environment Script for Luxius
# This script downloads and configures a local Node.js environment

$nodeVersion = "v20.18.0"
$nodeArch = "x64"
$nodeDir = Join-Path $PSScriptRoot ".node"
$nodeZip = Join-Path $PSScriptRoot "node.zip"
$nodeUrl = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-win-$nodeArch.zip"

if (-not (Test-Path $nodeDir)) {
    Write-Host "✦ Downloading Node.js $nodeVersion..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip
        Write-Host "✦ Extracting Node.js..." -ForegroundColor Cyan
        Expand-Archive -Path $nodeZip -DestinationPath $PSScriptRoot
        $extractedDir = Join-Path $PSScriptRoot "node-$nodeVersion-win-$nodeArch"
        Rename-Item -Path $extractedDir -NewName ".node"
        Remove-Item $nodeZip
    } catch {
        Write-Error "Failed to download or extract Node.js. Please check your internet connection."
        exit 1
    }
} else {
    Write-Host "✦ Local Node.js environment found." -ForegroundColor Green
}

# Update Path for current session
$env:Path = "$(Join-Path $nodeDir '');$env:Path"

# Verify Installations
$nodeV = & node -v
$npmV = & npm -v

Write-Host "✦ Node.js Version: $nodeV" -ForegroundColor Green
Write-Host "✦ npm Version: $npmV" -ForegroundColor Green

# Install dependencies if node_modules is missing
if (-not (Test-Path (Join-Path $PSScriptRoot "node_modules"))) {
    Write-Host "✦ Installing dependencies (this may take a minute)..." -ForegroundColor Cyan
    & npm install
} else {
    Write-Host "✦ Dependencies already installed." -ForegroundColor Green
}

Write-Host "✦ Environment Ready! 🚀" -ForegroundColor Magenta
