<#
.SYNOPSIS
    Publica el contenido de dist/ en la rama gh-pages (GitHub Pages) sin versionar dist/ en master.

.DESCRIPTION
    Crea un commit huerfano con el arbol de dist/ usando git plumbing (sin tocar el working tree
    ni el indice principal) y lo fuerza a la rama gh-pages en todos los push-URLs de origin
    (GitHub y GitLab). Reemplaza al antiguo `git subtree split --prefix dist master`.

.NOTES
    Ejecutar desde la raiz del proyecto despues de `npm run build`:
        .\scripts\deploy_gh_pages.ps1
#>

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'
$env:GIT_ASKPASS = ''

if (-not (Test-Path dist/index.html)) {
    Write-Host "dist/index.html no existe. Ejecutar 'npm run build' primero." -ForegroundColor Red
    exit 1
}

# Copia de seguridad de 404.html para SPA routing en GitHub Pages
if ((Test-Path 404.html) -and -not (Test-Path dist/404.html)) { Copy-Item 404.html dist/404.html }

# Indice temporal para no interferir con el indice de trabajo
$tmpIndex = Join-Path $env:TEMP "luxius_ghpages_index_$PID"
$env:GIT_INDEX_FILE = $tmpIndex
try {
    git read-tree --empty
    git --work-tree=dist add -A .
    $tree = (git write-tree).Trim()
} finally {
    Remove-Item Env:\GIT_INDEX_FILE -ErrorAction SilentlyContinue
    Remove-Item $tmpIndex -Force -ErrorAction SilentlyContinue
}

$src = (git rev-parse --short HEAD).Trim()
$msg = "deploy(gh-pages): build de master@$src $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$commit = (git commit-tree $tree -m $msg).Trim()

git push --force origin "${commit}:refs/heads/gh-pages"
if ($LASTEXITCODE -eq 0) {
    Write-Host "gh-pages actualizado -> $commit (desde master@$src)" -ForegroundColor Green
    Write-Host "Web: https://xignuxdis-eng.github.io/luxius-panel/" -ForegroundColor Green
} else {
    Write-Host "Fallo el push a gh-pages en al menos un remoto." -ForegroundColor Yellow
    exit 1
}
