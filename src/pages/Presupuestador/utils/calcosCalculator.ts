export type TipoCorteCalco = 'medio' | 'completo';

export interface CalcosQuoteInput {
    anchoCm: number;
    altoCm: number;
    cantidad: number;
    gapMm?: number;
    usableWidthCm?: number;
    rollWidthCm?: number;
    precioImpresionM2?: number;
    precioCorteM2: number;
}

export interface CalcosQuoteResult {
    valido: boolean;
    excedeAnchoMimaki: boolean;
    rotado: boolean;
    calcosPorFila: number;
    filas: number;
    largoNecesarioM: number;
    areaRolloM2: number;
    areaFacturableM2: number;
    areaNetaCalcosM2: number;
    aprovechamientoPct: number;
    costoImpresion: number;
    costoCorte: number;
    total: number;
    precioUnitario: number;
}

/**
 * Calcula el aprovechamiento óptimo de calcos/stickers en plotter Mimaki (ej. CG-60SR, 60 cm)
 * evaluando orientación normal (0°) y rotada (90°), largo lineal consumido y costos de
 * impresión + servicio de corte (medio corte o corte completo).
 */
export function calculateCalcosMimakiQuote(input: CalcosQuoteInput): CalcosQuoteResult {
    const anchoCm = Number(input.anchoCm) || 0;
    const altoCm = Number(input.altoCm) || 0;
    const cantidad = Math.max(1, Math.floor(Number(input.cantidad) || 0));
    const gapCm = Math.max(0, Number(input.gapMm ?? 3) || 0) / 10;
    const rollWidthCm = Math.max(10, Number(input.rollWidthCm ?? 60) || 60);
    const usableWidthCm = Math.min(rollWidthCm, Math.max(10, Number(input.usableWidthCm ?? 56) || 56));
    const precioImpresionM2 = Math.max(0, Number(input.precioImpresionM2) || 0);
    const precioCorteM2 = Math.max(0, Number(input.precioCorteM2) || 0);

    if (anchoCm <= 0 || altoCm <= 0) {
        return {
            valido: false,
            excedeAnchoMimaki: false,
            rotado: false,
            calcosPorFila: 0,
            filas: 0,
            largoNecesarioM: 0,
            areaRolloM2: 0,
            areaFacturableM2: 0,
            areaNetaCalcosM2: 0,
            aprovechamientoPct: 0,
            costoImpresion: 0,
            costoCorte: 0,
            total: 0,
            precioUnitario: 0,
        };
    }

    const colsNormal = Math.floor((usableWidthCm + gapCm) / (anchoCm + gapCm));
    const colsRotated = Math.floor((usableWidthCm + gapCm) / (altoCm + gapCm));

    if (colsNormal <= 0 && colsRotated <= 0) {
        return {
            valido: false,
            excedeAnchoMimaki: true,
            rotado: false,
            calcosPorFila: 0,
            filas: 0,
            largoNecesarioM: 0,
            areaRolloM2: 0,
            areaFacturableM2: 0,
            areaNetaCalcosM2: 0,
            aprovechamientoPct: 0,
            costoImpresion: 0,
            costoCorte: 0,
            total: 0,
            precioUnitario: 0,
        };
    }

    const filasNormal = colsNormal > 0 ? Math.ceil(cantidad / colsNormal) : Infinity;
    const largoNormalCm = filasNormal * (altoCm + gapCm);

    const filasRotated = colsRotated > 0 ? Math.ceil(cantidad / colsRotated) : Infinity;
    const largoRotatedCm = filasRotated * (anchoCm + gapCm);

    const rotado = largoRotatedCm < largoNormalCm;
    const calcosPorFila = rotado ? colsRotated : colsNormal;
    const filas = rotado ? filasRotated : filasNormal;
    const largoRawM = (rotado ? largoRotatedCm : largoNormalCm) / 100;
    const largoNecesarioM = Math.max(0.01, Math.round(largoRawM * 100) / 100);

    const areaRolloM2 = Math.max(0.01, Math.round((rollWidthCm / 100) * largoNecesarioM * 100) / 100);
    // Regla comercial: mínimo 1 m² facturable por trabajo de calcos/stickers
    const areaFacturableM2 = Math.max(1, areaRolloM2);
    const areaNetaCalcosM2 = Math.round(((anchoCm * altoCm * cantidad) / 10000) * 100) / 100;
    const aprovechamientoPct = Math.min(100, Math.max(1, Math.round((areaNetaCalcosM2 / areaRolloM2) * 100)));

    const costoImpresion = Math.round(areaFacturableM2 * precioImpresionM2);
    const costoCorte = Math.round(areaFacturableM2 * precioCorteM2);
    const total = costoImpresion + costoCorte;
    const precioUnitario = Math.round((total / cantidad) * 100) / 100;

    return {
        valido: true,
        excedeAnchoMimaki: false,
        rotado,
        calcosPorFila,
        filas,
        largoNecesarioM,
        areaRolloM2,
        areaFacturableM2,
        areaNetaCalcosM2,
        aprovechamientoPct,
        costoImpresion,
        costoCorte,
        total,
        precioUnitario,
    };
}
