/**
 * Luxius Data Export Utility
 * 
 * Este script agrupa todas las colecciones JSON de la base de datos local
 * en un único archivo de exportación, validando la integridad de cada uno.
 */

const fs = require('fs');
const path = require('path');

// 1. Configuración de Rutas
const DATA_DIR = path.join(__dirname, 'server', 'data');
const EXPORT_DIR = path.join(__dirname, 'exports');

const COLLECTIONS = [
    'materiales',
    'servicios',
    'ordenes',
    'usuarios',
    'clientes',
    'maquinas',
    'calidades'
];

// 2. Generar nombre de archivo con fecha
const date = new Date();
const timestamp = date.toISOString().split('T')[0].replace(/-/g, '_');
const exportFilename = `luxius_data_export_${timestamp}.json`;
const exportPath = path.join(__dirname, exportFilename);

console.log('🚀 Iniciando exportación de datos Luxius...\n');

const exportData = {
    metadata: {
        exportedAt: date.toISOString(),
        version: "1.0.0",
        collectionsIncluded: COLLECTIONS
    },
    data: {}
};

try {
    // 3. Procesar cada colección
    for (const collection of COLLECTIONS) {
        const filePath = path.join(DATA_DIR, `${collection}.json`);

        console.log(`🔍 Validando: ${collection}.json...`);

        if (!fs.existsSync(filePath)) {
            console.error(`⚠️  ERROR: El archivo ${collection}.json no existe.`);
            process.exit(1);
        }

        const rawData = fs.readFileSync(filePath, 'utf8');

        try {
            const parsedData = JSON.parse(rawData);
            exportData.data[collection] = parsedData;
            console.log(`✅  ${collection}: OK (${Array.isArray(parsedData) ? parsedData.length : 'Object'} registros)`);
        } catch (parseErr) {
            console.error(`\n❌ ERROR DE PARSEO EN: ${collection}.json`);
            console.error(`Mensaje: ${parseErr.message}`);
            console.error('Abortando exportación para evitar datos corruptos.');
            process.exit(1);
        }
    }

    // 4. Escribir archivo final
    console.log(`\n📦 Generando archivo final: ${exportFilename}...`);
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf8');

    console.log('\n✨ ¡EXPORTACIÓN COMPLETADA CON ÉXITO!');
    console.log(`📍 Ruta: ${exportPath}\n`);

} catch (err) {
    console.error('\n❌ ERROR INESPERADO DURANTE LA EXPORTACIÓN:');
    console.error(err.message);
    process.exit(1);
}
