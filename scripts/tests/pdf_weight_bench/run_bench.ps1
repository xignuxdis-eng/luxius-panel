<#
.SYNOPSIS
    Banco de pruebas: mide el peso real del PDF que genera Chrome (Guardar como PDF) segun
    como se incrustan las imagenes. Reproduce el pipeline de generatePdfClientReport.

.DESCRIPTION
    Copia dos JPG de produccion pesados a %TEMP%\luxius_pdf_test, abre bench.html en Chrome
    headless en 3 modos y reporta el tamano del PDF resultante:
      raw     -> <img> apunta al archivo original (como antes del optimizador)
      opt     -> <img> pasa por optimizePdfThumbnail (300px JPEG 0.72)
      svgpass -> SVG con raster embebido (el optimizador lo deja pasar sin tocar)

    Uso:  .\scripts\tests\pdf_weight_bench\run_bench.ps1 [-Rows 8] [-Img1 <ruta.jpg>] [-Img2 <ruta.jpg>]
#>
param(
    [int]$Rows = 8,
    [string]$Img1 = 'server\uploads\OT-37_x1_VV_ECO_1.500x1.820 --- servitag lat5 150x182cm.jpg',
    [string]$Img2 = 'server\uploads\OT-28_x1_VV_ECO_1.330x2.050 --- servitag atras2 133x205cm.jpg'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)))
Set-Location $root

$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw 'No se encontro Chrome ni Edge' }

$t = Join-Path $env:TEMP 'luxius_pdf_test'
New-Item -ItemType Directory -Force -Path $t | Out-Null
Copy-Item $Img1 "$t\big.jpg" -Force
Copy-Item $Img2 "$t\big2.jpg" -Force
Copy-Item "$PSScriptRoot\bench.html", "$PSScriptRoot\optimizer.js" $t -Force

"Imagenes fuente: big.jpg={0:N1} MB  big2.jpg={1:N1} MB" -f ((Get-Item "$t\big.jpg").Length/1MB), ((Get-Item "$t\big2.jpg").Length/1MB)
"Chrome: $chrome"
""
"{0,-10} {1,6} {2,12}" -f 'modo', 'filas', 'PDF (MB)'
foreach ($mode in 'raw', 'opt', 'svgpass') {
    $out = "$t\out_$mode.pdf"
    Remove-Item $out -ErrorAction SilentlyContinue
    $url = "file:///$($t.Replace('\','/'))/bench.html?mode=$mode&n=$Rows"
    $args = @('--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--no-pdf-header-footer',
              '--virtual-time-budget=60000', '--run-all-compositor-stages-before-draw', '--disable-features=Gcm',
              "--print-to-pdf=$out", $url)
    $p = Start-Process -FilePath $chrome -ArgumentList $args -Wait -PassThru -WindowStyle Hidden -RedirectStandardError "$t\chrome_err_$mode.log"
    if (Test-Path $out) { "{0,-10} {1,6} {2,12:N2}" -f $mode, $Rows, ((Get-Item $out).Length/1MB) }
    else { "{0,-10} {1,6} {2,12}" -f $mode, $Rows, 'FALLO' }
}
""
"PDFs en: $t"
