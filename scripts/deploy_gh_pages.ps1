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
    corresponda al commit de master actual.

    La comparacion es por SHA, no por hora. El reloj de la maquina de desarrollo
    puede estar desfasado del runner y del CDN (se midio un desfase de 2,5 min),
    y comparar marcas de tiempo daba falsos "PENDIENTE" sobre builds correctos.
    Para eso el build incrusta el SHA en version.json (GITHUB_SHA en Actions).

.EXAMPLE
    .\scripts\deploy_gh_pages.ps1

    Si el sitio aun no refleja el commit, espera 2-4 minutos y vuelve a correr.
    Si sigue igual, revisa la pestana Actions en GitHub: el workflow fallo.
#>

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))

$Base = 'https://xignuxdis-eng.github.io/luxius-panel'
$headSha = (git rev-parse HEAD).Trim()

Write-Host ''
Write-Host '=== Verificacion de deploy (GitHub Pages via GitHub Actions) ===' -ForegroundColor Cyan
Write-Host "  Commit:      master@$($headSha.Substring(0,7))"
Write-Host "  Publicacion: $Base/"
Write-Host ''
Write-Host '  El deploy lo hace .github/workflows/deploy.yml al hacer push a master.' -ForegroundColor DarkGray
Write-Host '  NO ejecutes ningun script que haga force-push a gh-pages: pisa al workflow.' -ForegroundColor DarkGray
Write-Host ''

# version.json se regenera en cada build, asi que pedirlo con un parametro distinto
# evita que el CDN nos devuelva una copia vieja.
$vUrl = "$Base/version.json?_=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
try {
    $json = Invoke-RestMethod -Uri $vUrl -TimeoutSec 30
} catch {
    Write-Host "  [FALLO] No se pudo consultar version.json: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$buildTime = $null
if ($json.PSObject.Properties.Name -contains 'buildTime') {
    $buildTime = [DateTimeOffset]::Parse($json.buildTime).LocalDateTime
}
Write-Host "  Build publicado: $($json.version)  $($buildTime.ToString('dd/MM/yyyy HH:mm:ss'))" -ForegroundColor DarkGray

$servedSha = $null
if ($json.PSObject.Properties.Name -contains 'commitSha') {
    $servedSha = $json.commitSha
}

if (-not $servedSha) {
    Write-Host ''
    Write-Host '  [AVISO] El build publicado no trae commitSha: fue compilado antes de' -ForegroundColor Yellow
    Write-Host '    que se agregara ese campo. Solo se puede comparar por fecha.' -ForegroundColor Yellow
    if ($buildTime) { Write-Host "    Fecha del build: $($buildTime.ToString('dd/MM/yyyy HH:mm:ss'))" -ForegroundColor Yellow }
    exit 2
}

Write-Host ''
if ($servedSha -eq $headSha) {
    Write-Host '  [OK] La web esta sirviendo exactamente este commit.' -ForegroundColor Green
    exit 0
}

Write-Host '  [PENDIENTE] La web sirve un commit distinto al actual.' -ForegroundColor Yellow
Write-Host "    master:      $($headSha.Substring(0,7))" -ForegroundColor Yellow
Write-Host "    publicado:   $($servedSha.Substring(0,7))" -ForegroundColor Yellow
Write-Host ''
Write-Host '    GitHub Actions tarda 2-4 minutos en publicar. Volve a correr en unos minutos.' -ForegroundColor Yellow
Write-Host '    Si tras 10 minutos sigue igual, el workflow fallo: revisalo en' -ForegroundColor Yellow
Write-Host '    https://github.com/xignuxdis-eng/luxius-panel/actions' -ForegroundColor Yellow
exit 0