<#
.SYNOPSIS
    Verifica si el deploy de GitHub Pages publico el build que vos acabas de commitear.

.DESCRIPTION
    ANTES este script publicaba dist/ con un force-push a la rama `gh-pages`.
    Eso COMPITIA con `.github/workflows/deploy.yml`, que ya sube un artefacto y
    publica con `actions/deploy-pages`: los dos mecanismos escribian en el mismo
    sitio y el del workflow pisaba al del script. Resultado: los commits de
    `gh-pages` daban exito y aun asi la web servia un build viejo.

    Desde el 19/10/2026 la unica fuente de verdad es GitHub Actions:
        codigo -> git push origin master -> workflow -> GitHub Pages

    Este script ya NO publica nada. Solo COMPRUEBA que lo que se esta sirviendo
    corresponda al commit de master actual, para detectar deploys que quedaron
    a medias en lugar de asumir que salieron bien.

.EXAMPLE
    .\scripts\deploy_gh_pages.ps1

    Si el sitio aun no refleja el commit,espera 2-4 minutos y vuelve a correr.
    Si sigue igual, revisa la pestana Actions en GitHub: el workflow fallo.
#>

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))

$Url = 'https://xignuxdis-eng.github.io/luxius-panel/'
$master = (git rev-parse --short HEAD).Trim()

Write-Host ''
Write-Host '=== Verificacion de deploy (GitHub Pages via GitHub Actions) ===' -ForegroundColor Cyan
Write-Host "  Rama:        master@$master"
Write-Host "  Publicacion: $Url"
Write-Host ''

Write-Host '  El deploy lo hace .github/workflows/deploy.yml al hacer push a master.' -ForegroundColor DarkGray
Write-Host '  NO ejecutes ningun script que haga force-push a gh-pages: pisa al workflow.' -ForegroundColor DarkGray
Write-Host ''

try {
    # Sin cache-busting en la query: somejaria a contaminar la verificacion.
    $resp = Invoke-WebRequest -Uri $Url -TimeoutSec 30 -UseBasicParsing
    $html = $resp.Content
} catch {
    Write-Host "  [FALLO] No se pudo consultar el sitio: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if ($html -notmatch 'assets/index-([A-Za-z0-9_\-]+)-(\d+)\.js') {
    Write-Host '  [AVISO] No se encontro la referencia al chunk principal en index.html.' -ForegroundColor Yellow
    exit 1
}

$stamp = $Matches[2]
$serverEpoch = [int64]$Matches[2]
$serverTime = [DateTimeOffset]::FromUnixTimeMilliseconds($serverEpoch).LocalDateTime

Write-Host "  Chunk servido: index-...-$stamp.js" -ForegroundColor DarkGray
Write-Host "  Fecha del build: $($serverTime.ToString('dd/MM/yyyy HH:mm:ss'))" -ForegroundColor DarkGray
Write-Host ''

# El commit de master deberia ser mas nuevo o igual al build publicado.
$commitTime = (git log -1 --format=%ct).Trim()
$commitDate = [DateTimeOffset]::FromUnixTimeSeconds([int64]$commitTime).LocalDateTime

if ($commitTime -le $serverEpoch) {
    Write-Host '  [OK] La web esta sirviendo un build igual o mas nuevo que el commit actual.' -ForegroundColor Green
    exit 0
}

Write-Host "  [PENDIENTE] El commit es mas nuevo que el build publicado." -ForegroundColor Yellow
Write-Host "    master:     $($commitDate.ToString('dd/MM/yyyy HH:mm:ss'))" -ForegroundColor Yellow
Write-Host "    publicado:  $($serverTime.ToString('dd/MM/yyyy HH:mm:ss'))" -ForegroundColor Yellow
Write-Host ''
Write-Host '    GitHub Actions tarda 2-4 minutos en publicar. Volve a correr en unos minutos.' -ForegroundColor Yellow
Write-Host '    Si tras 10 minutos sigue igual, el workflow fallo: revisalo en' -ForegroundColor Yellow
Write-Host '    https://github.com/xignuxdis-eng/luxius-panel/actions' -ForegroundColor Yellow
exit 0