const fs = require('fs');
let content = fs.readFileSync('src/components/UniversalFilePreview.tsx', 'utf8');

const replacements = {
    'dY"-': '🔗',
    'dY\'': '💥',
    'dYs?': '⚙️',
    'dY"?': '📏',
    'dYZ_': '🔎',
    'dYZ"': '🎨',
    'dY" ': '✨ ',
    'dY?,?': '🎯',
    'dY"': '📦',
    'dY",': '📄',
    'dY"`': '📑',
    'mAltiples': 'múltiples',
    'automAticamente': 'automáticamente',
    'PA?GS': 'PÁGS',
    'pAgs': 'págs',
    'MecAnica': 'Mecánica',
    'asignaciA3n': 'asignación',
    'explosiA3n': 'explosión',
    'resoluciA3n': 'resolución',
    'Atems': 'Ítems',
    'A-tem': 'Ítem',
    'A3rdenes': 'órdenes',
    'A3rden': 'orden',
    'ARestaurar': '¿Restaurar',
    'eliminaciA3n': 'eliminación'
};

for (const [bad, good] of Object.entries(replacements)) {
    content = content.split(bad).join(good);
}

// Special case for the square icon (we know it starts with ðŸ)
content = content.replace(/ðŸ“\w/g, '📄');
content = content.replace(/ðŸ“/g, '📄');

fs.writeFileSync('src/components/UniversalFilePreview.tsx', content, 'utf8');
console.log('Fixed UniversalFilePreview.tsx');
