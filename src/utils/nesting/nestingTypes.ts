/**
 * Luxius Nesting Types & Roll Specifications
 */

export interface NestingItem {
    id: string | number;
    ot?: string;
    label?: string;
    width: number;   // en metros (ej: 0.80)
    height: number;  // en metros (ej: 0.50)
    copies: number;  // cantidad de copias de este ítem
    cliente?: string;
    material?: string;
    orderId?: string | number;
    allowRotation?: boolean; // si es falso, no se permite girar 90°
}

export interface PlacedPiece {
    id: string | number;
    ot: string;
    label: string;
    x: number;       // coordenada X en metros desde el borde izquierdo del rollo
    y: number;       // coordenada Y en metros desde el inicio del rollo
    width: number;   // ancho ocupado en metros
    height: number;  // largo ocupado en metros
    rotated: boolean;// true si se giró 90°
    originalWidth: number;
    originalHeight: number;
    orderId?: string | number;
    copyIndex?: number;  // 1-based index (ej: 1)
    totalCopies?: number;// Total copias de este ítem (ej: 3)
}

export interface NestingConfig {
    rollWidth: number;          // Ancho nominal físico (ej: 1.52 o 1.37)
    usefulWidth?: number;       // Ancho útil máximo (ej: 1.515 o 1.365)
    gap?: number;               // Espacio de corte entre piezas en metros (default: 0.01 = 10mm)
    allowRotation?: boolean;    // Permitir rotación de 90° (default: true)
    safetyMarginStart?: number; // Margen de avance inicial en metros (default: 0.01)
}

export interface NestingResult {
    rollWidth: number;
    usefulWidth: number;
    gap: number;
    linearMeters: number;     // Consumo final en metros lineales (ml)
    rawLinearMeters: number;  // Consumo sin nesting (suma aritmética simple)
    savingsMeters: number;    // Metros lineales ahorrados
    savingsPercent: number;   // Porcentaje de ahorro en metros (0-100%)
    totalPiecesPlaced: number;
    totalPiecesRequested: number;
    pieces: PlacedPiece[];
    unplacedPieces: NestingItem[];
    areaEfficiency: number;   // % de área impresa sobre área de rollo gastada
}

// Constantes oficiales de taller para anchos de bobina
export const BOBINA_SPECS: Record<number, { nominal: number; realWidth: number; usefulWidth: number }> = {
    1.50: { nominal: 1.50, realWidth: 1.52, usefulWidth: 1.515 },
    1.52: { nominal: 1.52, realWidth: 1.52, usefulWidth: 1.515 },
    1.37: { nominal: 1.37, realWidth: 1.37, usefulWidth: 1.365 },
    1.60: { nominal: 1.60, realWidth: 1.60, usefulWidth: 1.590 },
    1.07: { nominal: 1.07, realWidth: 1.07, usefulWidth: 1.050 },
    0.91: { nominal: 0.91, realWidth: 0.91, usefulWidth: 0.895 },
};

/**
 * Obtiene el ancho útil imprimible de una bobina según la regla de taller.
 */
export function getBobinaUsefulWidth(nominalWidth: number): number {
    const rounded = Math.round(nominalWidth * 100) / 100;
    if (BOBINA_SPECS[rounded]) {
        return BOBINA_SPECS[rounded].usefulWidth;
    }
    if (rounded >= 1.48 && rounded <= 1.53) {
        return 1.515;
    }
    if (rounded >= 1.35 && rounded <= 1.38) {
        return 1.365;
    }
    return Math.max(0.1, rounded - 0.015);
}
