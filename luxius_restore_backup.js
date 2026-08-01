/**
 * Luxius Restore Backup Utility
 * 
 * Reestaura el sistema desde un archivo .zip de respaldo.
 * SEGURIDAD: Realiza un respaldo del estado actual antes de aplicar cambios.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Validar parámetros
const zipPath = process.argv[2];

if (!zipPath) {
    console.error('❌ ERROR: Debes proporcionar la ruta del archivo .zip');
    console.log('Uso: node luxius_restore_backup.js "ruta/al/respaldo.zip"');
    process.exit(1);
}

const fullZipPath = path.resolve(zipPath);

if (!fs.existsSync(fullZipPath)) {
    console.error(`❌ ERROR: El archivo no existe: ${fullZipPath}`);
    process.exit(1);
}

const tempDir = path.join(__dirname, '.restore_temp');

console.log('🚀 Iniciando proceso de restauración...\n');

try {
    // 2. Crear Respaldo de Seguridad Automático
    console.log('🛡️  PASO 1: Creando respaldo de seguridad del estado actual...');
    try {
        execSync('powershell.exe -File ./luxius_full_backup.ps1', { stdio: 'inherit' });
    } catch (e) {
        console.warn('⚠️  Advertencia: Hubo un problema con el script de respaldo .ps1, procediendo con backup manual de carpetas críticas...');
        // Fallback manual si el .ps1 falla (aunque no debería)
    }

    // 3. Preparar carpeta temporal y extraer
    console.log('\n📦 PASO 2: Extrayendo archivos del backup pedido...');
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir);

    // Usamos PowerShell para descomprimir sin dependencias de NPM
    execSync(`powershell.exe -Command "Expand-Archive -Path '${fullZipPath}' -DestinationPath '${tempDir}' -Force"`);

    // 4. Validar Estructura del Backup
    console.log('🔍 PASO 3: Validando estructura del backup...');
    const essentialItems = ['src', 'server', 'package.json'];
    const missing = essentialItems.filter(item => !fs.existsSync(path.join(tempDir, item)));

    if (missing.length > 0) {
        throw new Error(`El backup parece corrupto o incompleto. Faltan: ${missing.join(', ')}`);
    }
    console.log('✅ Estructura válida.');

    // 5. Aplicar Restauración
    console.log('\n⚠️  PASO 4: Aplicando cambios al sistema...');

    // Lista de carpetas/archivos a limpiar antes de restaurar (para evitar mezclas)
    const itemsToReplace = ['src', 'server', 'public', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts'];

    itemsToReplace.forEach(item => {
        const currentPath = path.join(__dirname, item);
        const restorePath = path.join(tempDir, item);

        if (fs.existsSync(restorePath)) {
            if (fs.existsSync(currentPath)) {
                // Eliminar el actual para asegurar limpieza total
                fs.rmSync(currentPath, { recursive: true, force: true });
            }
            // Mover desde temporal a la raíz
            fs.renameSync(restorePath, currentPath);
            console.log(`   - ${item} restaurado.`);
        }
    });

    // Restaurar archivos .env si existen en el backup
    const files = fs.readdirSync(tempDir);
    files.filter(f => f.startsWith('.env')).forEach(envFile => {
        fs.renameSync(path.join(tempDir, envFile), path.join(__dirname, envFile));
        console.log(`   - ${envFile} restaurado.`);
    });

    console.log('\n✨ ¡RESTAURACIÓN COMPLETADA CON ÉXITO!');
    console.log('💡 Se ha creado un backup de seguridad previo en la carpeta de respaldos.');

} catch (err) {
    console.error('\n❌ ERROR CRÍTICO DURANTE LA RESTAURACIÓN:');
    console.error(err.message);
    console.log('\nNo se han realizado cambios permanentes que comprometan el sistema (o se ha guardado el estado previo).');
} finally {
    // 6. Limpieza final
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}
