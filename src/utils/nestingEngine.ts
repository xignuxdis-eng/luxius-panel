/**
 * Luxius Nesting Engine - Motor de Imposición 2D en Bobina Continua
 * 
 * Diseñado específicamente para impresión en gran formato (Plotters de rollo).
 * Resuelve el problema de Strip Packing 2D continuo con ancho fijo y largo dinámico.
 * 
 * Regla de taller (crítica):
 * - La bobina comercialmente llamada "1.50m" mide en realidad 1.52m de ancho físico.
 * - Su ancho útil máximo imprimible / nesting permitido es exactamente de 1.515m (151.5 cm).
 * - La bobina de 1.37m tiene un ancho útil de 1.365m (136.5 cm).
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
}

export interface NestingConfig {
    rollWidth: number;        // Ancho nominal físico (ej: 1.52 o 1.37)
    usefulWidth?: number;     // Ancho útil máximo (ej: 1.515 o 1.365)
    gap?: number;             // Espacio de corte entre piezas en metros (default: 0.01 = 10mm)
    allowRotation?: boolean;  // Permitir rotación de 90° (default: true)
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
    // Si está en el rango de 1.50 a 1.52
    if (rounded >= 1.48 && rounded <= 1.53) {
        return 1.515;
    }
    if (rounded >= 1.35 && rounded <= 1.38) {
        return 1.365;
    }
    return Math.max(0.1, rounded - 0.015);
}

/**
 * Redondea a 3 decimales para precisión milimétrica en metros.
 */
function round3(n: number): number {
    return Math.round(n * 1000) / 1000;
}

/**
 * Algoritmo Principal de Nesting 2D en Bobina Continua (Skyline / Multi-Shelf Best-Fit).
 * 
 * Minimiza el avance lineal en Y probando el mejor acomodo de cada pieza
 * en el horizonte de la bobina.
 */
export function runNesting(items: NestingItem[], userConfig?: Partial<NestingConfig>): NestingResult {
    const rollWidth = userConfig?.rollWidth ?? 1.52;
    const usefulWidth = userConfig?.usefulWidth ?? getBobinaUsefulWidth(rollWidth);
    const gap = userConfig?.gap ?? 0.01; // 10mm de sangría entre piezas
    const globalAllowRotation = userConfig?.allowRotation ?? true;
    const safetyMarginStart = userConfig?.safetyMarginStart ?? 0.01;

    // Desglosar copias en piezas individuales
    interface FlatPiece {
        id: string | number;
        ot: string;
        label: string;
        w: number;
        h: number;
        allowRotation: boolean;
        orderId?: string | number;
    }

    const flatPieces: FlatPiece[] = [];
    let totalPiecesRequested = 0;
    let rawLinearMeters = 0;

    items.forEach(item => {
        const copies = Math.max(1, item.copies || 1);
        totalPiecesRequested += copies;

        const w = round3(item.width);
        const h = round3(item.height);

        // Calcular consumo individual teórico directo (suma simple sin nesting)
        // Probando la mejor orientación individual dentro de la bobina
        let singlePieceMl = h;
        if (w <= usefulWidth && h <= usefulWidth) {
            singlePieceMl = Math.min(w, h);
        } else if (w <= usefulWidth) {
            singlePieceMl = h;
        } else if (h <= usefulWidth) {
            singlePieceMl = w;
        }
        rawLinearMeters += singlePieceMl * copies;

        for (let i = 0; i < copies; i++) {
            flatPieces.push({
                id: `${item.id}_${i}`,
                ot: item.ot || `OT-${item.id}`,
                label: item.label || item.ot || `Pieza ${flatPieces.length + 1}`,
                w,
                h,
                allowRotation: item.allowRotation !== undefined ? item.allowRotation : globalAllowRotation,
                orderId: item.orderId || item.id
            });
        }
    });

    // Ordenar piezas por dimensión máxima descendente (Heurística estándar para empaquetado denso)
    flatPieces.sort((a, b) => {
        const maxA = Math.max(a.w, a.h);
        const maxB = Math.max(b.w, b.h);
        if (maxB !== maxA) return maxB - maxA;
        return (b.w * b.h) - (a.w * a.h);
    });

    const placedPieces: PlacedPiece[] = [];
    const unplacedPieces: NestingItem[] = [];

    // Estructura Skyline: segmentos horizontales continuos en el ancho del rollo [0, usefulWidth]
    // Cada nodo representa [x, x + width] con una altura actual y
    interface SkylineNode {
        x: number;
        width: number;
        y: number;
    }

    let skyline: SkylineNode[] = [
        { x: 0, width: usefulWidth, y: safetyMarginStart }
    ];

    // Helper: Encuentra el nivel más alto del skyline en el intervalo [x, x + width]
    function getSkylineLevel(x: number, w: number): number {
        let maxY = 0;
        for (const node of skyline) {
            const overlapStart = Math.max(x, node.x);
            const overlapEnd = Math.min(x + w, node.x + node.width);
            if (overlapStart < overlapEnd) {
                if (node.y > maxY) maxY = node.y;
            }
        }
        return maxY;
    }

    // Helper: Actualiza el skyline tras colocar una pieza
    function updateSkyline(x: number, w: number, y: number, h: number) {
        const newY = y + h + gap;
        const newNodes: SkylineNode[] = [];
        const pieceEnd = x + w;

        for (const node of skyline) {
            const nodeEnd = node.x + node.width;

            if (nodeEnd <= x || node.x >= pieceEnd) {
                // Sin solapamiento
                newNodes.push(node);
            } else {
                // Hay solapamiento
                if (node.x < x) {
                    // Parte izquierda antes de la pieza
                    newNodes.push({ x: node.x, width: x - node.x, y: node.y });
                }
                if (nodeEnd > pieceEnd) {
                    // Parte derecha después de la pieza
                    newNodes.push({ x: pieceEnd, width: nodeEnd - pieceEnd, y: node.y });
                }
            }
        }

        // Agregar el nuevo segmento ocupado por la pieza
        newNodes.push({ x, width: w, y: newY });

        // Ordenar y fusionar segmentos adyacentes con la misma altura
        newNodes.sort((a, b) => a.x - b.x);

        const merged: SkylineNode[] = [];
        for (const n of newNodes) {
            if (merged.length > 0) {
                const prev = merged[merged.length - 1];
                if (Math.abs((prev.x + prev.width) - n.x) < 0.0001 && Math.abs(prev.y - n.y) < 0.0001) {
                    prev.width += n.width;
                    continue;
                }
            }
            merged.push({ ...n });
        }

        skyline = merged;
    }

    // Colocar cada pieza buscando la posición de menor Y (Best Short Side Fit)
    for (const piece of flatPieces) {
        type CandidatePos = { x: number; y: number; w: number; h: number; rotated: boolean };
        const candidates: CandidatePos[] = [];

        // Evaluar orientación 1: Normal (w x h)
        if (piece.w <= usefulWidth) {
            // Probar colocar en cada posición X posible del skyline
            for (let i = 0; i < skyline.length; i++) {
                const x = skyline[i].x;
                if (x + piece.w <= usefulWidth + 0.0001) {
                    const y = getSkylineLevel(x, piece.w);
                    candidates.push({ x, y, w: piece.w, h: piece.h, rotated: false });
                }
            }
        }

        // Evaluar orientación 2: Girada 90° (h x w)
        if (piece.allowRotation && piece.h <= usefulWidth) {
            for (let i = 0; i < skyline.length; i++) {
                const x = skyline[i].x;
                if (x + piece.h <= usefulWidth + 0.0001) {
                    const y = getSkylineLevel(x, piece.h);
                    candidates.push({ x, y, w: piece.h, h: piece.w, rotated: true });
                }
            }
        }

        if (candidates.length === 0) {
            // La pieza excede el ancho útil incluso rotada
            unplacedPieces.push({
                id: piece.id,
                ot: piece.ot,
                label: piece.label,
                width: piece.w,
                height: piece.h,
                copies: 1,
                orderId: piece.orderId
            });
            continue;
        }

        // Seleccionar la posición que minimiza la altura Y resultante (y como desempate menor X)
        candidates.sort((a, b) => {
            const endYA = a.y + a.h;
            const endYB = b.y + b.h;
            if (Math.abs(endYA - endYB) > 0.001) {
                return endYA - endYB;
            }
            if (Math.abs(a.y - b.y) > 0.001) {
                return a.y - b.y;
            }
            return a.x - b.x;
        });

        const best = candidates[0];

        placedPieces.push({
            id: piece.id,
            ot: piece.ot,
            label: piece.label,
            x: round3(best.x),
            y: round3(best.y),
            width: round3(best.w),
            height: round3(best.h),
            rotated: best.rotated,
            originalWidth: piece.w,
            originalHeight: piece.h,
            orderId: piece.orderId
        });

        updateSkyline(best.x, best.w, best.y, best.h);
    }

    // Calcular el avance lineal máximo en Y ocupado por las piezas
    let maxY = 0;
    let totalPieceArea = 0;
    for (const p of placedPieces) {
        const pieceMaxY = p.y + p.height;
        if (pieceMaxY > maxY) maxY = pieceMaxY;
        totalPieceArea += (p.originalWidth * p.originalHeight);
    }

    const linearMeters = round3(maxY);
    rawLinearMeters = round3(rawLinearMeters);
    const savingsMeters = round3(Math.max(0, rawLinearMeters - linearMeters));
    const savingsPercent = rawLinearMeters > 0 ? Math.round((savingsMeters / rawLinearMeters) * 100) : 0;
    const totalRollArea = usefulWidth * (linearMeters || 1);
    const areaEfficiency = totalRollArea > 0 ? Math.min(100, Math.round((totalPieceArea / totalRollArea) * 100)) : 0;

    return {
        rollWidth,
        usefulWidth,
        gap,
        linearMeters,
        rawLinearMeters,
        savingsMeters,
        savingsPercent,
        totalPiecesPlaced: placedPieces.length,
        totalPiecesRequested,
        pieces: placedPieces,
        unplacedPieces,
        areaEfficiency
    };
}
