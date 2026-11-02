/**
 * Utilidades canónicas para el formateo y limpieza de números y nombres de Órdenes de Trabajo (OT).
 * Evita duplicaciones y redundancias como 'OT OT', 'OT-OT-', etc.
 */

/**
 * Normaliza cualquier valor (id, ot, texto) a un código de OT canónico en formato 'OT-XXXX'.
 * Elimina cualquier repetición previa de prefijos 'OT', espacios, guiones o barras bajas.
 *
 * Ejemplos:
 *  - formatOTNumber("OT-OT-FDC3D915") => "OT-FDC3D915"
 *  - formatOTNumber("OT 5521") => "OT-5521"
 *  - formatOTNumber("5521") => "OT-5521"
 *  - formatOTNumber(1234) => "OT-1234"
 *  - formatOTNumber("ot - OT - 987") => "OT-987"
 *  - formatOTNumber("") => "OT-0"
 */
export function formatOTNumber(raw: string | number | null | undefined): string {
    if (raw === null || raw === undefined) {
        return 'OT-0'
    }

    const str = String(raw).trim()
    if (!str) {
        return 'OT-0'
    }

    // Remueve todas las instancias consecutivas iniciales de 'OT', 'ot', guiones, espacios y underscores
    const stripped = str.replace(/^(\s*OT[\s\-_]*)+/i, '').trim()

    if (!stripped) {
        return 'OT-0'
    }

    return `OT-${stripped}`
}

/**
 * Extrae únicamente la parte numérica / alfanumérica pura de la OT, sin el prefijo 'OT-'.
 *
 * Ejemplos:
 *  - extractOTRaw("OT-OT-FDC3D915") => "FDC3D915"
 *  - extractOTRaw("OT-1234") => "1234"
 *  - extractOTRaw(55) => "55"
 */
export function extractOTRaw(raw: string | number | null | undefined): string {
    if (raw === null || raw === undefined) {
        return '0'
    }

    const str = String(raw).trim()
    if (!str) {
        return '0'
    }

    const stripped = str.replace(/^(\s*OT[\s\-_]*)+/i, '').trim()
    return stripped || '0'
}

/**
 * Limpia el nombre original de un archivo para evitar redundancia de 'OT' al ensamblar
 * el nombre de producción. Si el archivo ya venía con prefijo 'OT-XXXX' o '---', extrae
 * la parte sustancial del nombre.
 *
 * Ejemplos:
 *  - cleanOriginalFilename("OT 1234 Banner.jpg", "OT-1234") => "Banner.jpg"
 *  - cleanOriginalFilename("OT-1234_x1_LONA --- Poster.png") => "Poster.png"
 *  - cleanOriginalFilename("OT-OT-999 Foto.tif", "OT-999") => "Foto.tif"
 */
export function cleanOriginalFilename(originalName: string, otCode?: string): string {
    if (!originalName) return ''

    let cleaned = originalName.trim()

    // 1. Si contiene '---', tomar la parte derecha después del separador
    if (cleaned.includes('---')) {
        const parts = cleaned.split('---')
        cleaned = parts[parts.length - 1].trim()
    }

    // 2. Si se suministró un código de OT específico, quitarlo si está al inicio (incluso con OT repetido)
    if (otCode) {
        const rawCode = extractOTRaw(otCode)
        const specificRegex = new RegExp(`^(\\s*OT[\\s\\-_]*)+${rawCode}[\\s\\-_]*`, 'i')
        cleaned = cleaned.replace(specificRegex, '').trim()
    }

    // 3. Quitar cualquier prefijo genérico remanente de OT (ej. "OT 1234 -", "OT-")
    cleaned = cleaned.replace(/^(\s*OT[\s\-_]*)+([a-zA-Z0-9]+)?[\s\-_]*/i, (match, _p1, p2) => {
        // Si hay una palabra común que no sea un número/código, no devorarla por error si no era OT
        if (p2 && isNaN(Number(p2)) && p2.length > 10) {
            return match
        }
        return ''
    }).trim()

    // 4. Si después de limpiar quedó solo la extensión o vacío, revertir al nombre original saneado
    if (!cleaned || cleaned.startsWith('.')) {
        return originalName.trim()
    }

    return cleaned
}
