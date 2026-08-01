# Script de Backup Automático de Seguridad
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

$luxiusZip = "f:\XignuX Print Den\luxius_backup_$timestamp.zip"
Write-Host "Comprimiendo Luxius Print Den en: $luxiusZip"
Compress-Archive -Path "f:\XignuX Print Den\src", "f:\XignuX Print Den\public", "f:\XignuX Print Den\server", "f:\XignuX Print Den\package.json", "f:\XignuX Print Den\vite.config.ts", "f:\XignuX Print Den\index.html" -DestinationPath $luxiusZip -Force
Write-Host "✅ Backup Luxius Creado con Éxito!"

$workfieldZip = "f:\Diseños\Xignux\stitch_xignux_workfield_manager\stitch_xignux_workfield_manager\workfield_backup_$timestamp.zip"
Write-Host "Comprimiendo Workfield Manager en: $workfieldZip"
Compress-Archive -Path "f:\Diseños\Xignux\stitch_xignux_workfield_manager\stitch_xignux_workfield_manager\src", "f:\Diseños\Xignux\stitch_xignux_workfield_manager\stitch_xignux_workfield_manager\package.json", "f:\Diseños\Xignux\stitch_xignux_workfield_manager\stitch_xignux_workfield_manager\vite.config.js", "f:\Diseños\Xignux\stitch_xignux_workfield_manager\stitch_xignux_workfield_manager\index.html" -DestinationPath $workfieldZip -Force
Write-Host "✅ Backup Workfield Creado con Éxito!"
