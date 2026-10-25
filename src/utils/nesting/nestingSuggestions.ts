/**
 * Luxius System - Sugerencias de Anidado Inteligente
 * Detecta piezas en Vinilo Vehicular que comparten el mismo ancho y cuya
 * suma de metros lineales no supera 2.90m, recomendando su anidado para
 * optimizar el tiempo de laminado continuo.
 */

export interface NestingCandidateItem {
    id: string | number;
    fileName?: string;
    ancho: number;
    alto: number;
    copias?: number;
    material?: string;
}

export interface VehicularNestingSuggestion {
    id: string;
    matchingWidth: number;
    totalLinearMeters: number;
    itemCount: number;
    totalCopies: number;
    itemIds: (string | number)[];
    items: NestingCandidateItem[];
    message: string;
    benefitText: string;
}

/**
 * Determina si un material corresponde a Vinilo Vehicular (VV, VVP, Orajet 3651, polimérico, etc.).
 */
export function isVehicularVinyl(material?: string | null): boolean {
    if (!material) return false;
    const s = String(material).trim().toLowerCase();
    return (
        s === 'vv' ||
        s === 'vvp' ||
        s.includes('vehicular') ||
        s.includes('3651') ||
        s.includes('orajet') ||
        s.includes('fundicion') ||
        s.includes('fundición') ||
        s.includes('wrapping') ||
        s.includes('polimerico') ||
        s.includes('polimérico')
    );
}

function normalizeDimension(val: number): number {
    const num = Number(val) || 0;
    if (num <= 0) return 0;
    return Math.round((num > 20 ? num / 100 : num) * 100) / 100;
}

/**
 * Analiza un conjunto de ítems u órdenes y detecta si existen 2 o más
 * piezas de Vinilo Vehicular con el mismo ancho cuya suma de metros lineales
 * sea <= 2.90m (umbral ideal para laminado continuo en un solo tramo).
 */
export function detectVehicularNestingSuggestions(
    items: NestingCandidateItem[],
    maxLinearMeters: number = 2.90
): VehicularNestingSuggestion[] {
    if (!Array.isArray(items) || items.length < 2) {
        return [];
    }

    // 1. Filtrar solo ítems de Vinilo Vehicular con dimensiones válidas
    const vehicularItems = items.filter(it => {
        if (!isVehicularVinyl(it.material)) return false;
        const w = normalizeDimension(it.ancho);
        const h = normalizeDimension(it.alto);
        return w > 0 && h > 0;
    });

    if (vehicularItems.length < 2) {
        return [];
    }

    interface ItemOrientation {
        item: NestingCandidateItem;
        width: number;
        lengthMl: number;
        rotated: boolean;
    }

    // 2. Extraer anchos candidatos únicos (tolerancia de ±2cm)
    const distinctWidths: number[] = [];
    vehicularItems.forEach(it => {
        const w = normalizeDimension(it.ancho);
        const h = normalizeDimension(it.alto);
        [w, h].forEach(dim => {
            if (dim > 0 && !distinctWidths.some(dw => Math.abs(dw - dim) < 0.02)) {
                distinctWidths.push(dim);
            }
        });
    });

    const suggestions: VehicularNestingSuggestion[] = [];

    // 3. Evaluar cada ancho candidato
    distinctWidths.forEach(targetWidth => {
        const matchingOrientations: ItemOrientation[] = [];

        vehicularItems.forEach(it => {
            const w = normalizeDimension(it.ancho);
            const h = normalizeDimension(it.alto);
            const copias = Math.max(1, Number(it.copias) || 1);

            const matchesDirect = Math.abs(w - targetWidth) < 0.02;
            const matchesRotated = Math.abs(h - targetWidth) < 0.02;

            if (matchesDirect && (!matchesRotated || (h * copias <= w * copias))) {
                matchingOrientations.push({
                    item: it,
                    width: w,
                    lengthMl: Math.round(h * copias * 100) / 100,
                    rotated: false
                });
            } else if (matchesRotated) {
                matchingOrientations.push({
                    item: it,
                    width: h,
                    lengthMl: Math.round(w * copias * 100) / 100,
                    rotated: true
                });
            }
        });

        if (matchingOrientations.length >= 2) {
            const totalMl = Math.round(
                matchingOrientations.reduce((sum, o) => sum + o.lengthMl, 0) * 100
            ) / 100;

            if (totalMl <= maxLinearMeters && totalMl > 0) {
                const totalCopies = matchingOrientations.reduce((sum, o) => sum + (Number(o.item.copias) || 1), 0);
                const itemIds = matchingOrientations.map(o => o.item.id);

                const key = itemIds.slice().sort().join('-');
                const alreadyExists = suggestions.some(s => s.itemIds.slice().sort().join('-') === key);

                if (!alreadyExists) {
                    suggestions.push({
                        id: `sug-vv-${targetWidth.toFixed(2)}-${itemIds.length}`,
                        matchingWidth: targetWidth,
                        totalLinearMeters: totalMl,
                        itemCount: matchingOrientations.length,
                        totalCopies,
                        itemIds,
                        items: matchingOrientations.map(o => o.item),
                        message: `Se detectaron ${matchingOrientations.length} piezas en Vinilo Vehicular con el mismo ancho (${targetWidth.toFixed(2)}m) sumando ${totalMl.toFixed(2)} ml (≤ ${maxLinearMeters.toFixed(2)}m).`,
                        benefitText: `Podés anidarlas juntas para laminar en un solo tramo continuo de ${totalMl.toFixed(2)} ml en lugar de laminar cada pieza por separado, ahorrando tiempo de máquina y operario.`
                    });
                }
            }
        }
    });

    return suggestions;
}
