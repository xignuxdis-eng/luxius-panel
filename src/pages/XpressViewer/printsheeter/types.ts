// src/pages/XpressViewer/printsheeter/types.ts
// Tipos y estructuras de datos para el motor PrintSheeter (Mosaicos, Nesting y Análisis)

export type MosaicPattern = 
    | 'spiral' 
    | 'frame' 
    | 'waves' 
    | 'halftone' 
    | 'diagonals' 
    | 'spiral_lines' 
    | 'photo_mosaic';

export interface ImageDataItem {
    id: string;
    path?: string;
    url: string;
    filename: string;
    widthPx: number;
    heightPx: number;
    dpiX: number;
    dpiY: number;
    forcedWMm?: number;
    forcedHMm?: number;
    isCenterpiece?: boolean;
    avgColor?: [number, number, number]; // [r, g, b]
}

export interface Placement {
    id: string;
    imageId: string;
    url: string;
    filename: string;
    x: number;          // pixels on canvas
    y: number;          // pixels on canvas
    w: number;          // target width in pixels
    h: number;          // target height in pixels
    rot90: boolean;
    opacity: number;
    isCenterpiece?: boolean;
}

export interface LayoutResult {
    canvasWidthPx: number;
    canvasHeightPx: number;
    canvasWidthMm: number;
    canvasHeightMm: number;
    masterDpi: number;
    placements: Placement[];
    evadeCenter?: boolean;
    fadeBorders?: boolean;
    // Métricas para nesting
    totalLinearMeters?: number;
    efficiencyPercent?: number;
    wasteM2?: number;
    totalUsedM2?: number;
}

export interface MaterialRollEstimate {
    rollWidthCm: number;
    linearMeters: number;
    areaM2: number;
    usedM2: number;
    wastePercent: number;
    isRecommended?: boolean;
}

export interface MaterialAnalysisResult {
    totalFiles: number;
    totalAreaM2: number;
    recommendedRoll: string;
    estimates: MaterialRollEstimate[];
}
