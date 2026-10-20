/**
 * Luxius System - Pricing & Quoting Types
 */

export interface PriceCalculationResult {
    subtotal: number;
    consumoEstimado: number;
    bobinaAsignada?: number;
    precioMl?: number;
    rotated: boolean;
    precioDetalle?: {
        tipoCobro: 'ml' | 'm2';
        bobinaAncho?: number;
        bobinaUsada?: number;
        precioML?: number;
        precioM2?: number;
        rotated?: boolean;
        consumoML?: number;
        costoBase?: number;
    };
}
