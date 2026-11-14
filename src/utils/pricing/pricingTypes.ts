/**
 * Luxius System - Pricing & Quoting Types
 */

export type CustomPriceOverrideMode = 'auto' | 'final' | 'm2' | 'ml';

export interface PriceCalculationResult {
    subtotal: number;
    consumoEstimado: number;
    consumoM2?: number;
    consumoML?: number;
    servicesTotal?: number;
    bobinaAsignada?: number;
    precioMl?: number;
    rotated: boolean;
    esParticular?: boolean;
    recargoParticularPct?: number;
    precioDetalle?: {
        tipoCobro: 'ml' | 'm2';
        bobinaAncho?: number;
        bobinaUsada?: number;
        precioML?: number;
        precioM2?: number;
        rotated?: boolean;
        consumoML?: number;
        costoBase?: number;
        esParticular?: boolean;
        recargoParticularPct?: number;
        modalidadManual?: 'final' | 'm2' | 'ml';
        valorManual?: number;
    };
}
