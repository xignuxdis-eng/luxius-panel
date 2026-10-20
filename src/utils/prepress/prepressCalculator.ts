/**
 * Luxius System - Pure Prepress Inspection & DPI Mathematics
 */

import type { DpiTierInfo } from './prepressTypes';

export const METERS_TO_INCHES = 39.3700787;
export const INCHES_TO_CM = 2.54;
export const DEFAULT_ASSUMED_DPI = 300;

/**
 * Calcula el DPI efectivo real a escala 1:1 según el ancho en píxeles y el ancho objetivo en metros.
 */
export function calculateEffectiveDpi(
    pixelWidth?: number,
    targetWidthMeters?: number,
    fallbackDpi: number = DEFAULT_ASSUMED_DPI
): number {
    if (!pixelWidth || !targetWidthMeters || targetWidthMeters <= 0) {
        return fallbackDpi;
    }
    const inchesW = targetWidthMeters * METERS_TO_INCHES;
    const dpi = Math.round(pixelWidth / inchesW);
    return dpi > 0 ? dpi : fallbackDpi;
}

/**
 * Semáforo de Calidad Técnica de Impresión Gran Formato
 */
export function getDpiQualityTier(dpi: number): DpiTierInfo {
    if (dpi >= 150) {
        return {
            tier: 'optimal',
            label: 'Óptimo (>150 DPI)',
            badgeClass: 'optimal',
            color: '#10b981',
            icon: '🟢',
            desc: 'Excelente definición. Apto para vinilo de corte, calcomanías y visualización cercana (<1m).'
        };
    } else if (dpi >= 72) {
        return {
            tier: 'acceptable',
            label: 'Aceptable (72-150 DPI)',
            badgeClass: 'acceptable',
            color: '#f59e0b',
            icon: '🟡',
            desc: 'Apto para gigantografías, lonas front/back y vía pública vista a media/larga distancia (>2m).'
        };
    } else {
        return {
            tier: 'critical',
            label: 'Crítico (<72 DPI)',
            badgeClass: 'critical',
            color: '#ef4444',
            icon: '🔴',
            desc: 'Riesgo severo de pixelado visible. Se recomienda vectorizar en curvas con Redrawer Studio o solicitar arte en alta resolución.'
        };
    }
}

/**
 * Calcula la distancia euclídea en cm a partir de dos puntos en pantalla y la escala de zoom.
 */
export function calculateDistanceInCm(
    start: { x: number; y: number } | null,
    end: { x: number; y: number } | null,
    imageScale: number,
    dpi: number = DEFAULT_ASSUMED_DPI
): string | null {
    if (!start || !end || imageScale <= 0) return null;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const pxDistanceScreen = Math.sqrt(dx * dx + dy * dy);
    
    const pxOriginal = pxDistanceScreen / imageScale;
    const currentDpi = dpi > 0 ? dpi : DEFAULT_ASSUMED_DPI;
    const inches = pxOriginal / currentDpi;
    const cm = inches * INCHES_TO_CM;
    
    return cm.toFixed(2);
}
