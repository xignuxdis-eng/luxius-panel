<#
.SYNOPSIS
    FASE 1 - Higiene del repositorio luxius-panel.
    Ejecucion unica, sin confirmaciones. Deja el repo limpio y sincronizado
    en GitHub (origin) y GitLab (gitlab) a la vez.

.DESCRIPTION
    1. Configura 'origin' con doble push-url (GitHub + GitLab): a partir de aqui
       un unico `git push origin master` publica en ambos remotos.
    2. Saca del control de versiones (sin borrar del disco) los artefactos que
       nunca debieron subirse: .venv, __pycache__, dist, zip, BD SQLite, uploads,
       backups, multimedia pesada y archivos de prueba binarios.
    3. Reorganiza la raiz: scripts de test -> scripts/tests/, documentacion y
       roadmaps -> docs/, y elimina archivos vacios o duplicados.
    4. Commitea todo (incluyendo el trabajo pendiente de logo liviano en PDFs)
       y hace push a master en GitHub y GitLab.

.NOTES
    Ejecutar desde la raiz del proyecto:  .\scripts\fase1_limpieza.ps1
    Es idempotente: se puede volver a correr sin efectos secundarios.
    NO borra nada del disco salvo los archivos listados en $ArchivosBasura (vacios/duplicados).
#>

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$env:GIT_TERMINAL_PROMPT = '0'   # nunca quedarse colgado pidiendo credenciales

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    [!!] $msg" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
Step "0. Liberando posibles bloqueos de git"
Get-Process git, git-credential-manager, git-remote-https -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
if (Test-Path .git\index.lock) { Remove-Item .git\index.lock -Force; Warn "index.lock eliminado" }

# ---------------------------------------------------------------------------
Step "1. Configurando doble remoto de push (GitHub + GitLab)"
$github = 'https://github.com/xignuxdis-eng/luxius-panel.git'
$gitlab = 'https://gitlab.com/luxius-group/luxius-panel.git'

if (-not (git remote | Select-String -Quiet '^gitlab$')) { git remote add gitlab $gitlab }
git remote set-url origin $github
git remote set-url --delete --push origin $gitlab 2>$null
git remote set-url --delete --push origin $github 2>$null
git remote set-url --add --push origin $github
git remote set-url --add --push origin $gitlab
Ok "origin -> push a GitHub y GitLab en un solo comando"
git remote -v

# ---------------------------------------------------------------------------
Step "2. Sacando del repo artefactos que no deben versionarse (se conservan en disco)"
$Untrack = @(
    'server/.venv',
    'server/__pycache__',
    'server/routes/__pycache__',
    'server/services/__pycache__',
    'server/middleware/__pycache__',
    'dist',
    'luxius-panel.zip',
    'server/luxius.db',
    'server/uploads',
    'server/printer_logs',
    'server/data/ordenes.json',
    'server/data/printer_stats.json',
    'server/data/logs_no_asociados.json',
    'server/data/upload.json',
    'backups',
    'backup-luxius-2025-07-31_21-54-50',
    'xignux print den.mp4',
    'xignux_ambient.mp3',
    'build_log.txt',
    'test.pdf',
    'test_multipage.pdf',
    'test.cdr'
)
foreach ($p in $Untrack) {
    if (git ls-files --error-unmatch -- $p 2>$null) {
        git rm -r --cached --quiet -- $p
        Ok "untracked: $p"
    }
}
# exports de datos con fecha
git ls-files -- 'server/data/luxius_data_export_*.json' | ForEach-Object { git rm --cached --quiet -- $_; Ok "untracked: $_" }

# ---------------------------------------------------------------------------
Step "3. Reorganizando la raiz del proyecto"
New-Item -ItemType Directory -Force -Path scripts/tests, docs/roadmaps, docs/xana, docs/legacy | Out-Null

$TestScripts = @(
    'check_consistency.cjs','check_data.cjs','debug_billing.cjs','run_test.cjs','test.js',
    'test_auth_debug.cjs','test_batch_operations.cjs','test_live_pricing.cjs','test_pricing_logic.cjs',
    'test_soft_delete_validation.cjs','test_structural_validation.cjs','test_ui_sim.cjs','test_vip_pricing.cjs',
    'verify_all_deletion_flows.cjs','verify_analytics.cjs','verify_full_system_integration.cjs','verify_intelligence.cjs',
    'test-exifr.html','test-exifr-simple.html','test_agente.py'
)
$Roadmaps = @(
    'ROADMAP_ARTISTA_XPRESS_VIEWER.md','ROADMAP_DEFINITIVO_PRODUCCION_LUXIUS_V2.md',
    'ROADMAP_PRODUCCION_XANA_HOTFOLDER_DRIVE.md','Evolucion_Xana_Roadmap.md','Xana_Telegram_Roadmap.md',
    'Previews_Avanzados.md','Luxius Xpress Viewer.md','Sugerencia de Xana.md','SISTEMA_VERIFICADO.md','CONTINUAR_EN_CASA.md'
)
$XanaDocs = @(
    'XANA_AI_IMPLEMENTACION_COMPLETA.md','XANA_AI_MEJORAS_IMPLEMENTADAS.md',
    'XANA_AI_PAQUETE_4_IMPLEMENTADO.md','XANA_AI_TEST.md','XANA_MEMORIA_APP_MOVIL.md'
)
$Legacy = @(
    'Luxius19febrero.txt','fix_encoding.cjs','fix_encoding2.cjs','clean.js',
    'luxius_export_data.js','luxius_restore_backup.js','migracion_luxius_field.sql','migracion_postgres.sql'
)
$UtilScripts = @('create_backup.ps1','luxius_full_backup.ps1','setup_env.ps1','start.ps1','sync_r2_to_drive.py')

function MoveTracked($files, $dest) {
    foreach ($f in $files) {
        if (Test-Path -LiteralPath $f) {
            if (git ls-files --error-unmatch -- $f 2>$null) { git mv -f -- $f "$dest/$f" } else { Move-Item -LiteralPath $f -Destination "$dest/$f" -Force }
            Ok "movido: $f -> $dest/"
        }
    }
}
MoveTracked $TestScripts 'scripts/tests'
MoveTracked $Roadmaps    'docs/roadmaps'
MoveTracked $XanaDocs    'docs/xana'
MoveTracked $Legacy      'docs/legacy'
MoveTracked $UtilScripts 'scripts'

# Archivos vacios o duplicados que si se eliminan
$ArchivosBasura = @('orders.json','audit.json','env.example')
foreach ($f in $ArchivosBasura) {
    if (Test-Path $f) {
        if (git ls-files --error-unmatch -- $f 2>$null) { git rm -f --quiet -- $f } else { Remove-Item $f -Force }
        Ok "eliminado: $f"
    }
}

# ---------------------------------------------------------------------------
Step "4. Commit y push simultaneo (GitHub + GitLab)"
git add -A
git status --short | Select-Object -First 40
$msg = @"
chore(repo): fase 1 higiene - untrack artefactos, reorganizar raiz, logo SVG en PDFs

- Sacar del repo .venv, __pycache__, dist, zip, luxius.db, uploads, backups, mp4/mp3 y PDFs de prueba
- Ampliar .gitignore para que no vuelvan a entrar
- Mover scripts de test a scripts/tests/, roadmaps y docs Xana a docs/, legacy a docs/legacy
- Eliminar orders.json y audit.json vacios y env.example duplicado
- Terminar trabajo pendiente: logo SVG liviano (logoBase64Light.ts) en generatePdfBudget y generatePdfClientReport
- Doble push-url en origin: un solo push publica en GitHub y GitLab
- Actualizar XANA_MEMORIA_SISTEMA.md con estado, roadmap de mejoras y flujo multi-remoto
"@
git commit -m $msg
if ($LASTEXITCODE -ne 0) { Warn "Nada para commitear o commit fallido" }

git push origin master
if ($LASTEXITCODE -eq 0) { Ok "master publicado en GitHub y GitLab" } else { Warn "Push fallo en al menos un remoto. Revisar credenciales (git credential-manager)." }

# ---------------------------------------------------------------------------
Step "5. Build de verificacion"
npm run build 2>&1 | Select-Object -Last 8
if ($LASTEXITCODE -eq 0) { Ok "Build OK" } else { Warn "Build con errores: revisar salida" }

Write-Host "`nFASE 1 COMPLETADA." -ForegroundColor Green
Write-Host "Aviso para OTRAS maquinas que hagan 'git pull': se eliminaran de su disco server/uploads, server/luxius.db, dist/ y backups porque dejaron de estar versionados. Hacer copia previa si contienen datos locales." -ForegroundColor Yellow
