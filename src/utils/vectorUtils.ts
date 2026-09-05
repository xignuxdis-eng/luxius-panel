/**
 * Utilidades vectoriales para Redrawer: Conversión a DXF, descarga y procesamiento de contornos de corte
 */

/**
 * Convierte caminos SVG básicos (líneas y polígonos aproximados) a formato DXF R12 estándar para plotters y CNC
 */
export function svgToDxf(svgString: string): string {
    const lines: string[] = [
        '0', 'SECTION',
        '2', 'HEADER',
        '9', '$ACADVER',
        '1', 'AC1009', // AutoCAD R12 standard
        '0', 'ENDSEC',
        '0', 'SECTION',
        '2', 'ENTITIES'
    ];

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const paths = doc.querySelectorAll('path, polygon, polyline, line, rect');

        paths.forEach((elem) => {
            if (elem.tagName.toLowerCase() === 'path') {
                const d = elem.getAttribute('d') || '';
                // Extraer comandos y coordenadas simples M x y L x y ...
                const commands = d.match(/([a-df-z])|([-+]?[0-9]*\.?[0-9]+)/gi);
                if (!commands) return;

                let currentX = 0;
                let currentY = 0;
                let startX = 0;
                let startY = 0;
                let currentCmd = 'M';
                let idx = 0;

                while (idx < commands.length) {
                    const token = commands[idx];
                    if (/^[a-df-z]$/i.test(token)) {
                        currentCmd = token;
                        idx++;
                        continue;
                    }

                    if (currentCmd === 'M' || currentCmd === 'm') {
                        const x = parseFloat(token);
                        const y = parseFloat(commands[++idx] || '0');
                        currentX = currentCmd === 'm' ? currentX + x : x;
                        currentY = currentCmd === 'm' ? currentY + y : y;
                        startX = currentX;
                        startY = currentY;
                        currentCmd = currentCmd === 'm' ? 'l' : 'L'; // Subsequent coordinates are lines
                        idx++;
                    } else if (currentCmd === 'L' || currentCmd === 'l') {
                        const x = parseFloat(token);
                        const y = parseFloat(commands[++idx] || '0');
                        const targetX = currentCmd === 'l' ? currentX + x : x;
                        const targetY = currentCmd === 'l' ? currentY + y : y;

                        // Emit LINE entity
                        lines.push(
                            '0', 'LINE',
                            '8', 'CORTE_LUXIUS',
                            '10', currentX.toFixed(3),
                            '20', (-currentY).toFixed(3), // Invert Y for standard CAD
                            '30', '0.0',
                            '11', targetX.toFixed(3),
                            '21', (-targetY).toFixed(3),
                            '31', '0.0'
                        );

                        currentX = targetX;
                        currentY = targetY;
                        idx++;
                    } else if (currentCmd === 'Z' || currentCmd === 'z') {
                        // Close path
                        lines.push(
                            '0', 'LINE',
                            '8', 'CORTE_LUXIUS',
                            '10', currentX.toFixed(3),
                            '20', (-currentY).toFixed(3),
                            '30', '0.0',
                            '11', startX.toFixed(3),
                            '21', (-startY).toFixed(3),
                            '31', '0.0'
                        );
                        currentX = startX;
                        currentY = startY;
                    } else {
                        // Saltar otros comandos no soportados directamente en R12 simple
                        idx++;
                    }
                }
            } else if (elem.tagName.toLowerCase() === 'line') {
                const x1 = parseFloat(elem.getAttribute('x1') || '0');
                const y1 = parseFloat(elem.getAttribute('y1') || '0');
                const x2 = parseFloat(elem.getAttribute('x2') || '0');
                const y2 = parseFloat(elem.getAttribute('y2') || '0');
                lines.push(
                    '0', 'LINE',
                    '8', 'CORTE_LUXIUS',
                    '10', x1.toFixed(3),
                    '20', (-y1).toFixed(3),
                    '30', '0.0',
                    '11', x2.toFixed(3),
                    '21', (-y2).toFixed(3),
                    '31', '0.0'
                );
            }
        });
    } catch (e) {
        console.warn('Error convirtiendo SVG a DXF:', e);
    }

    lines.push('0', 'ENDSEC', '0', 'EOF');
    return lines.join('\n');
}

/**
 * Descarga cualquier archivo como texto o blob en el navegador
 */
export function triggerFileDownload(content: string | Blob, filename: string, mimeType: string = 'text/plain') {
    const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
