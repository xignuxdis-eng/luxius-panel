# build_android.ps1 — Build APK de LuXius Taller Mobile
# Requiere: Android Studio instalado, ANDROID_HOME configurado
# JDK: Usa el JBR bundled de Android Studio (OpenJDK 21)

$JAVA_HOME_PATH = "C:\Program Files\Android\Android Studio\jbr"
$env:JAVA_HOME = $JAVA_HOME_PATH
$env:PATH = "$JAVA_HOME_PATH\bin;" + $env:PATH

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    LUXIUS ANDROID BUILD" -ForegroundColor Cyan
Write-Host "    JVM: OpenJDK 21 (Android Studio JBR)" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build del frontend
Write-Host "  [1/3] Building Vite frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "  [ERROR] npm build falló" -ForegroundColor Red; exit 1 }

# 2. Sync con Capacitor
Write-Host ""
Write-Host "  [2/3] Syncing Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "  [ERROR] cap sync falló" -ForegroundColor Red; exit 1 }

# 3. Build APK debug
Write-Host ""
Write-Host "  [3/3] Building APK (debug)..." -ForegroundColor Yellow
Set-Location android
.\gradlew.bat assembleDebug
$buildResult = $LASTEXITCODE
Set-Location ..

if ($buildResult -ne 0) { Write-Host "  [ERROR] Gradle build falló" -ForegroundColor Red; exit 1 }

$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apkSize = [math]::Round((Get-Item $apkPath).Length / 1MB, 1)
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Green
    Write-Host "    APK GENERADO: $apkSize MB" -ForegroundColor Green
    Write-Host "    Ruta: $apkPath" -ForegroundColor Green
    Write-Host "  ============================================" -ForegroundColor Green
    Copy-Item $apkPath "LuXius-Taller-Mobile.apk" -Force
    Write-Host "    Copiado como: LuXius-Taller-Mobile.apk" -ForegroundColor Green
}
