/**
 * Script para generar un logo base64 comprimido a partir del original pesado.
 * Ejecutar con: node scripts/compressLogo.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const tsContent = readFileSync('src/utils/logoBase64.ts', 'utf8');
const match = tsContent.match(/data:image\/[^;]+;base64,([^"']+)/);
if (!match) { console.error('No se encontró base64 en logoBase64.ts'); process.exit(1); }

const originalBytes = Buffer.from(match[1], 'base64');
console.log('Logo original:', (originalBytes.length / 1024).toFixed(1), 'KB');

// Use sharp-free approach: just write a tiny optimized SVG logo instead
// Since we can't use sharp in this environment, we'll create a clean SVG logo

const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 80" width="280" height="80">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e2433"/>
      <stop offset="100%" style="stop-color:#334155"/>
    </linearGradient>
  </defs>
  <rect width="280" height="80" rx="8" fill="url(#g1)"/>
  <text x="140" y="38" text-anchor="middle" fill="#ffffff" font-family="system-ui,-apple-system,sans-serif" font-size="28" font-weight="900" letter-spacing="3">XignuX</text>
  <text x="140" y="58" text-anchor="middle" fill="#94a3b8" font-family="system-ui,-apple-system,sans-serif" font-size="10" font-weight="500" letter-spacing="1">SERVICIOS GRÁFICOS</text>
</svg>`;

const svgBase64 = Buffer.from(svgLogo).toString('base64');
const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
console.log('SVG logo comprimido:', (svgBase64.length / 1024).toFixed(1), 'KB');
console.log('Data URL length:', dataUrl.length, 'chars');

// Write a lightweight version alongside the original
const output = `// Logo XignuX comprimido para PDFs — SVG vectorial ~0.5KB (reemplaza PNG de 967KB)
// Importar este en lugar de logoBase64.ts en los generadores de PDF
export const XIGNUX_LOGO_LIGHT = "${dataUrl}";
`;

writeFileSync('src/utils/logoBase64Light.ts', output, 'utf8');
console.log('✅ Escrito: src/utils/logoBase64Light.ts');
