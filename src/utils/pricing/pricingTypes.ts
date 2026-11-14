/**
 * Luxius System - Pricing & Quoting Types
 */

import type { DemasiasConfig } from '@/types';

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
        nestingAplicado?: boolean;
        mlSinNesting?: number;
        mlConNesting?: number;
        ahorroNestingPct?: number;
    };
}

export interface BatchNestingPriceInputItem {
    id: string | number;
    material: string;
    calidad?: string;
    ancho: number;
    alto: number;
    copias: number;
    servicios?: Record<string, boolean>;
    demasiasConfig?: DemasiasConfig;
    esParticular?: boolean;
    skipNesting?: boolean;
}

export interface BatchNestingGroupSummary {
    groupKey: string;
    material: string;
    calidad: string;
    itemIds: Array<string | number>;
    bobinaGanadora: number;
    precioMLAplicado: number;
    rawMlTotal: number;
    nestedMlTotal: number;
    savingsMl: number;
    savingsPct: number;
    rawCostTotal: number;
    nestedCostTotal: number;
    savingsAmount: number;
}

export interface BatchNestingItemResult {
    id: string | number;
    individualResult: PriceCalculationResult;
    effectiveResult: PriceCalculationResult;
    isNested: boolean;
    rawSubtotal: number;
    nestedSubtotal: number;
    savingsAmount: number;
}

export interface BatchNestingPricingResult {
    items: BatchNestingItemResult[];
    groups: BatchNestingGroupSummary[];
    hasNestingOpportunity: boolean;
    rawBatchTotal: number;
    nestedBatchTotal: number;
    totalSavingsAmount: number;
    totalRawMl: number;
    totalNestedMl: number;
    totalSavingsMl: number;
    totalSavingsPct: number;
}
