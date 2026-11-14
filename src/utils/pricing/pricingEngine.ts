/**
 * Luxius System - Pricing Calculation Pure Engine
 */

import { getMateriales, getClientes, getServicios, getTarifasXignuxSync } from '@/data/db';
import type { DemasiasConfig } from '@/types';
import { getBobinaUsefulWidth, runNesting, type NestingItem } from '../nestingEngine';
import type {
    PriceCalculationResult,
    CustomPriceOverrideMode,
    BatchNestingPriceInputItem,
    BatchNestingGroupSummary,
    BatchNestingItemResult,
    BatchNestingPricingResult
} from './pricingTypes';
import { resolveSpecialPrice } from './specialPricing';

export const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

function computeFallbackLinearMeters(
    w: number,
    h: number,
    c: number,
    bobinas?: Array<{ ancho?: number }>,
    defaultAncho?: number
): number {
    const widths: { ancho: number; usefulWidth: number }[] = [];
    if (Array.isArray(bobinas)) {
        bobinas.forEach(b => {
            if (b && typeof b.ancho === 'number' && b.ancho > 0) {
                widths.push({ ancho: b.ancho, usefulWidth: getBobinaUsefulWidth(b.ancho) });
            }
        });
    }
    if (widths.length === 0 && defaultAncho && defaultAncho > 0) {
        widths.push({ ancho: defaultAncho, usefulWidth: getBobinaUsefulWidth(defaultAncho) });
    }
    if (widths.length === 0) {
        return round2(h * c);
    }

    widths.sort((a, b) => a.ancho - b.ancho);
    const candidates: { ml: number; area: number; rotated: boolean }[] = [];

    widths.forEach(({ ancho, usefulWidth }) => {
        if (w <= usefulWidth) {
            const fits = Math.max(1, Math.floor(usefulWidth / (w || 1)));
            const ml = round2(Math.ceil(c / fits) * h);
            candidates.push({ ml, area: ancho * ml, rotated: false });
        }
        if (h <= usefulWidth) {
            const fits = Math.max(1, Math.floor(usefulWidth / (h || 1)));
            const ml = round2(Math.ceil(c / fits) * w);
            candidates.push({ ml, area: ancho * ml, rotated: true });
        }
    });

    if (candidates.length > 0) {
        candidates.sort((a, b) => {
            if (Math.abs(a.area - b.area) > 0.01) return a.area - b.area;
            if (Math.abs(a.ml - b.ml) > 0.01) return a.ml - b.ml;
            if (a.rotated !== b.rotated) return a.rotated ? 1 : -1;
            return 0;
        });
        return candidates[0].ml;
    }

    return round2(h * c);
}

/**
 * Motor oficial unificado de calculo de precios y metros lineales de LuXius
 * Evalua orientacion normal vs rotada, margen de seguridad de 1cm, precios por bobina,
 * precios especiales por cliente y multiplicador para cliente particular.
 */
export function calculateItemPriceDetailed(
    materialCode: string,
    rawW: number,
    rawH: number,
    c: number = 1,
    services?: Record<string, boolean>,
    clientIdParam?: string | number,
    demasiasConfig?: DemasiasConfig,
    isParticular?: boolean
): PriceCalculationResult {
    const mat = getMateriales().find(m => 
        m.codigo === materialCode || 
        String(m.codigo).toLowerCase() === String(materialCode).toLowerCase()
    );

    let w = round2(rawW > 20 ? rawW / 100 : rawW);
    let h = round2(rawH > 20 ? rawH / 100 : rawH);

    // Si hay demasias activas (lona), agregar 5cm (0.05m) por lado
    if (demasiasConfig) {
        if (demasiasConfig.left) w += 0.05;
        if (demasiasConfig.right) w += 0.05;
        if (demasiasConfig.top) h += 0.05;
        if (demasiasConfig.bottom) h += 0.05;
        w = round2(w);
        h = round2(h);
    }

    if (!mat || h <= 0 || w <= 0) {
        return {
            subtotal: 0,
            consumoEstimado: 0,
            consumoM2: 0,
            consumoML: 0,
            servicesTotal: 0,
            bobinaAsignada: undefined,
            precioMl: undefined,
            rotated: false
        };
    }

    const { tipoCobro, precioM2, bobinas } = mat;

    // Buscar precios especiales de cliente si corresponde
    let cliente = null;
    if (clientIdParam) {
        const clientList = getClientes();
        cliente = clientList.find(cl => String(cl.id) === String(clientIdParam));
    }

    // Verificar si el cliente tiene un precio especial explícito por M2 para este material
    // (Por ejemplo: "VV:m2" para cotizar vinilo en M2 plano, o "VBB:m2" / "VBB" en materiales M2)
    const explicitM2Resolution = resolveSpecialPrice(cliente, materialCode, undefined, tipoCobro);
    const hasExplicitM2 = explicitM2Resolution.hasSpecialPrice && explicitM2Resolution.unit === 'm2';

    let basePrice = 0;
    let assignedBobina: number | undefined;
    let appliedPriceMl: number | undefined;
    let appliedPriceM2: number | undefined;
    let rotated = false;
    let linearMeters = 0;

    if (tipoCobro === 'ml' && !hasExplicitM2) {
        const availableWidths: { ancho: number; precioML: number; usefulWidth: number }[] = [];
        
        if (Array.isArray(bobinas) && bobinas.length > 0) {
            bobinas.forEach(b => {
                if (b && typeof b.ancho === 'number' && typeof b.precioML === 'number') {
                    availableWidths.push({
                        ancho: b.ancho,
                        precioML: b.precioML,
                        usefulWidth: getBobinaUsefulWidth(b.ancho)
                    });
                }
            });
        }

        availableWidths.sort((a, b) => a.ancho - b.ancho);

        const candidates: {
            bobina: number;
            rotated: boolean;
            priceMl: number;
            ml: number;
            cost: number;
        }[] = [];

        availableWidths.forEach(({ ancho: bobinaAncho, precioML, usefulWidth }) => {
            const specialRes = resolveSpecialPrice(cliente, materialCode, bobinaAncho, tipoCobro);
            const priceToUse = (specialRes.hasSpecialPrice && specialRes.price) ? specialRes.price : precioML;

            // 1. Orientacion Normal (Ancho de la pieza a lo ancho de la bobina)
            if (w <= usefulWidth) {
                const fitsPerRow = Math.max(1, Math.floor(usefulWidth / (w || 1)));
                const rows = Math.ceil(c / fitsPerRow);
                const ml = round2(rows * h);
                const cost = Math.round(priceToUse * ml);
                candidates.push({
                    bobina: bobinaAncho,
                    rotated: false,
                    priceMl: priceToUse,
                    ml,
                    cost
                });
            }

            // 2. Orientacion Rotada 90° (Alto de la pieza a lo ancho de la bobina)
            if (h <= usefulWidth) {
                const fitsPerRow = Math.max(1, Math.floor(usefulWidth / (h || 1)));
                const rows = Math.ceil(c / fitsPerRow);
                const ml = round2(rows * w);
                const cost = Math.round(priceToUse * ml);
                candidates.push({
                    bobina: bobinaAncho,
                    rotated: true,
                    priceMl: priceToUse,
                    ml,
                    cost
                });
            }
        });

        // Criterio de ordenamiento: menor costo total -> menor desperdicio de ML -> sin rotar preferido
        candidates.sort((a, b) => {
            if (a.cost !== b.cost) {
                return a.cost - b.cost;
            }

            if (Math.abs(a.ml - b.ml) > 0.01) {
                return a.ml - b.ml;
            }

            if (a.rotated !== b.rotated) {
                return a.rotated ? 1 : -1;
            }

            return a.bobina - b.bobina;
        });

        let bestCost = candidates.length > 0 ? candidates[0].cost : Infinity;

        if (candidates.length > 0) {
            const best = candidates[0];
            assignedBobina = best.bobina;
            rotated = best.rotated;
            linearMeters = best.ml;
            appliedPriceMl = best.priceMl;
            bestCost = best.cost;
        }

        // Fallback si excede todas las bobinas: asignar la bobina mas ancha
        if (bestCost === Infinity && availableWidths.length > 0) {
            const widest = availableWidths[availableWidths.length - 1];
            const specialRes = resolveSpecialPrice(cliente, materialCode, widest.ancho, tipoCobro);
            const priceToUse = (specialRes.hasSpecialPrice && specialRes.price) ? specialRes.price : widest.precioML;
            const fitsPerRow = Math.max(1, Math.floor(widest.usefulWidth / (w || 1)));
            const rows = Math.ceil(c / fitsPerRow);
            const ml = round2(rows * h);
            bestCost = Math.round(priceToUse * ml);
            assignedBobina = widest.ancho;
            appliedPriceMl = priceToUse;
            linearMeters = ml;
        }

        basePrice = bestCost === Infinity ? 0 : Math.round(bestCost);
    } else {
        // Cobro en M2: NO importa el ancho del rollo (se factura por superficie plana calculada)
        const specialM2 = resolveSpecialPrice(cliente, materialCode, undefined, tipoCobro);
        const priceToUse = (specialM2.hasSpecialPrice && specialM2.price) ? specialM2.price : (precioM2 || 0);
        const m2 = round2(w * h * c);
        basePrice = w > 0 ? Math.round(m2 * priceToUse) : 0;
        linearMeters = 0;
        appliedPriceM2 = priceToUse;
    }

    // Si se aplica modalidad de Cliente Particular, aplicar recargo porcentual personalizado
    let particularMarkupPct = 0;
    if (isParticular) {
        const tarifas = getTarifasXignuxSync();
        const matKey = mat.codigo?.toLowerCase() || materialCode.toLowerCase();
        if (tarifas[matKey] && typeof tarifas[matKey].recargoParticularPct === 'number') {
            particularMarkupPct = tarifas[matKey].recargoParticularPct || 0;
        } else {
            particularMarkupPct = 30; // 30% sugerido estándar si no está configurado
        }
        basePrice = Math.round(basePrice * (1 + particularMarkupPct / 100));
    }

    // Servicios adicionales
    let servicesTotal = 0;
    if (services) {
        const availableServices = getServicios();
        const tarifas = isParticular ? getTarifasXignuxSync() : {};
        Object.entries(services).forEach(([sId, active]) => {
            if (active) {
                const s = availableServices.find(serv => String(serv.id) === sId);
                if (s) {
                    let priceBase = parseFloat(s.precioBase as any) || 0;
                    if (isParticular) {
                        const sKey = s.codigo?.toLowerCase() || s.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                        const sPct = (tarifas[sKey] && typeof tarifas[sKey].recargoParticularPct === 'number')
                            ? (tarifas[sKey].recargoParticularPct || 0)
                            : particularMarkupPct;
                        priceBase = priceBase * (1 + sPct / 100);
                    }
                    let multiplier = c;
                    if (s.unidad === 'm2') {
                        multiplier = round2(w * h * c);
                    } else if (s.unidad === 'metro') {
                        multiplier = round2((rotated ? w : h) * c);
                    }
                    servicesTotal += Math.round(priceBase * multiplier);
                }
            }
        });
    }

    const subtotal = basePrice + servicesTotal;

    const isCalculationMl = tipoCobro === 'ml' && !hasExplicitM2;
    const surfaceM2 = round2(w * h * c);
    const effectiveML = linearMeters > 0
        ? linearMeters
        : computeFallbackLinearMeters(w, h, c, bobinas, mat.ancho);

    return {
        subtotal,
        consumoEstimado: isCalculationMl ? linearMeters : surfaceM2,
        consumoM2: surfaceM2,
        consumoML: effectiveML,
        servicesTotal,
        bobinaAsignada: assignedBobina,
        precioMl: appliedPriceMl,
        rotated,
        esParticular: !!isParticular,
        recargoParticularPct: isParticular ? particularMarkupPct : 0,
        precioDetalle: isCalculationMl ? {
            tipoCobro: 'ml',
            bobinaAncho: assignedBobina,
            bobinaUsada: assignedBobina,
            precioML: appliedPriceMl,
            rotated,
            consumoML: linearMeters,
            costoBase: basePrice,
            esParticular: !!isParticular,
            recargoParticularPct: isParticular ? particularMarkupPct : 0
        } : {
            tipoCobro: 'm2',
            precioM2: appliedPriceM2 || precioM2 || 0,
            costoBase: basePrice,
            esParticular: !!isParticular,
            recargoParticularPct: isParticular ? particularMarkupPct : 0
        }
    };
}

export interface CustomPriceItemMetrics {
    m2: number;
    ml: number;
    autoSubtotal: number;
    servicesTotal: number;
}

export interface CustomPriceCalculationSummary {
    mode: CustomPriceOverrideMode;
    rateValue: number;
    totalM2: number;
    totalML: number;
    servicesTotal: number;
    baseCustomTotal: number;
    finalTotal: number;
    effectiveRateM2: number;
    effectiveRateML: number;
}

export function resolveItemCustomSubtotal(
    mode: CustomPriceOverrideMode,
    customValue: number | null,
    item: CustomPriceItemMetrics,
    batchAutoTotal: number = 0,
    batchCount: number = 1
): number {
    if (mode === 'auto' || customValue === null || Number.isNaN(customValue) || customValue < 0) {
        return Math.round(item.autoSubtotal);
    }
    if (mode === 'm2') {
        return Math.round(round2(item.m2) * customValue) + Math.round(item.servicesTotal);
    }
    if (mode === 'ml') {
        return Math.round(round2(item.ml) * customValue) + Math.round(item.servicesTotal);
    }
    // mode === 'final'
    const targetFinal = Math.round(customValue);
    if (batchCount <= 1) return targetFinal;
    if (batchAutoTotal > 0) {
        return Math.round((item.autoSubtotal / batchAutoTotal) * targetFinal);
    }
    return Math.round(targetFinal / batchCount);
}

export function applyCustomPriceOverride(
    mode: CustomPriceOverrideMode,
    customValue: number | null,
    items: CustomPriceItemMetrics[]
): CustomPriceCalculationSummary {
    const totalM2 = round2(items.reduce((acc, it) => acc + (Number(it.m2) || 0), 0));
    const totalML = round2(items.reduce((acc, it) => acc + (Number(it.ml) || 0), 0));
    const servicesTotal = Math.round(items.reduce((acc, it) => acc + (Number(it.servicesTotal) || 0), 0));
    const autoTotal = Math.round(items.reduce((acc, it) => acc + (Number(it.autoSubtotal) || 0), 0));

    let finalTotal = autoTotal;
    if (mode !== 'auto' && customValue !== null && !Number.isNaN(customValue) && customValue >= 0) {
        if (mode === 'final') {
            finalTotal = Math.round(customValue);
        } else {
            finalTotal = items.reduce(
                (acc, it) => acc + resolveItemCustomSubtotal(mode, customValue, it, autoTotal, items.length),
                0
            );
        }
    }

    const baseCustomTotal = Math.max(0, finalTotal - servicesTotal);
    const effectiveRateM2 = totalM2 > 0 ? Math.round(baseCustomTotal / totalM2) : 0;
    const effectiveRateML = totalML > 0 ? Math.round(baseCustomTotal / totalML) : 0;

    return {
        mode,
        rateValue: customValue !== null && !Number.isNaN(customValue) ? customValue : 0,
        totalM2,
        totalML,
        servicesTotal,
        baseCustomTotal,
        finalTotal,
        effectiveRateM2,
        effectiveRateML,
    };
}

function normalizeEffectiveDims(
    rawW: number,
    rawH: number,
    demasiasConfig?: DemasiasConfig
): { w: number; h: number } {
    let w = round2(rawW > 20 ? rawW / 100 : rawW);
    let h = round2(rawH > 20 ? rawH / 100 : rawH);
    if (demasiasConfig) {
        if (demasiasConfig.left) w += 0.05;
        if (demasiasConfig.right) w += 0.05;
        if (demasiasConfig.top) h += 0.05;
        if (demasiasConfig.bottom) h += 0.05;
        w = round2(w);
        h = round2(h);
    }
    return { w, h };
}

/**
 * Cotiza un conjunto de ítems aplicando nesting 2D multi-bobina opcional.
 * Agrupa exclusivamente ítems en ML que compartan `material` y `calidad`,
 * evalúa todas las bobinas disponibles del material y elige la de menor costo total.
 */
export function calculateBatchPricingWithNesting(
    items: BatchNestingPriceInputItem[],
    clientIdParam?: string | number,
    defaultCalidad: string = 'ECO'
): BatchNestingPricingResult {
    const allMateriales = getMateriales();
    const allClientes = getClientes();
    const cliente = clientIdParam
        ? allClientes.find(cl => String(cl.id) === String(clientIdParam)) || null
        : null;

    interface AnalyzedEntry {
        index: number;
        input: BatchNestingPriceInputItem;
        individualResult: PriceCalculationResult;
        effW: number;
        effH: number;
        copies: number;
        areaM2: number;
        matCode: string;
        calidadNorm: string;
        baseNoMarkup: number;
        mlRaw: number;
    }

    const analyzed: AnalyzedEntry[] = items.map((input, index) => {
        const individualResult = calculateItemPriceDetailed(
            input.material,
            input.ancho,
            input.alto,
            input.copias,
            input.servicios,
            clientIdParam,
            input.demasiasConfig,
            input.esParticular
        );
        const { w: effW, h: effH } = normalizeEffectiveDims(
            Number(input.ancho) || 0,
            Number(input.alto) || 0,
            input.demasiasConfig
        );
        const copies = Math.max(1, Math.round(Number(input.copias) || 1));
        const areaM2 = effW > 0 && effH > 0 ? round2(effW * effH * copies) : 0;

        const matObj = allMateriales.find(
            m => m.codigo === input.material ||
                String(m.codigo).toLowerCase() === String(input.material || '').toLowerCase()
        );
        const matCode = matObj?.codigo || String(input.material || '').trim();
        const calidadNorm = String(input.calidad || defaultCalidad || 'ECO').trim().toUpperCase();

        const mlRaw = individualResult.precioDetalle?.tipoCobro === 'ml'
            ? (individualResult.consumoML ?? individualResult.consumoEstimado ?? 0)
            : 0;
        const baseNoMarkup = (individualResult.precioMl && mlRaw > 0)
            ? Math.round(individualResult.precioMl * mlRaw)
            : Math.max(0, individualResult.subtotal - (individualResult.servicesTotal ?? 0));

        return {
            index,
            input,
            individualResult,
            effW,
            effH,
            copies,
            areaM2,
            matCode,
            calidadNorm,
            baseNoMarkup,
            mlRaw,
        };
    });

    const itemResults: BatchNestingItemResult[] = analyzed.map(e => ({
        id: e.input.id,
        individualResult: e.individualResult,
        effectiveResult: e.individualResult,
        isNested: false,
        rawSubtotal: e.individualResult.subtotal,
        nestedSubtotal: e.individualResult.subtotal,
        savingsAmount: 0,
    }));

    const subgroupMap = new Map<string, AnalyzedEntry[]>();
    for (const entry of analyzed) {
        if (
            entry.input.skipNesting ||
            entry.individualResult.precioDetalle?.tipoCobro !== 'ml' ||
            entry.effW <= 0 ||
            entry.effH <= 0 ||
            !entry.matCode
        ) {
            continue;
        }
        const key = `${entry.matCode.toUpperCase()}|${entry.calidadNorm}`;
        const bucket = subgroupMap.get(key);
        if (bucket) {
            bucket.push(entry);
        } else {
            subgroupMap.set(key, [entry]);
        }
    }

    const groups: BatchNestingGroupSummary[] = [];

    subgroupMap.forEach((subgroup, groupKey) => {
        if (subgroup.length < 2) return;

        const mat = allMateriales.find(
            m => m.codigo === subgroup[0].matCode ||
                String(m.codigo).toLowerCase() === subgroup[0].matCode.toLowerCase()
        );
        if (!mat || mat.tipoCobro !== 'ml' || !Array.isArray(mat.bobinas) || mat.bobinas.length === 0) {
            return;
        }

        const rawMlTotal = round2(subgroup.reduce((acc, e) => acc + e.mlRaw, 0));
        const rawBaseNoMarkupSum = subgroup.reduce((acc, e) => acc + e.baseNoMarkup, 0);

        const nestingItems: NestingItem[] = subgroup.map(e => ({
            id: e.input.id,
            width: e.effW,
            height: e.effH,
            copies: e.copies,
            material: mat.codigo,
        }));

        const narrowItems: NestingItem[] = nestingItems.map(item => ({
            ...item,
            width: Math.min(item.width, item.height),
            height: Math.max(item.width, item.height),
        }));
        const hasOrientedDiff = narrowItems.some((it, idx) => it.width !== nestingItems[idx].width);

        interface BobinaCandidate {
            bobina: number;
            priceMl: number;
            nestedMl: number;
            baseCostNoMarkup: number;
            areaUsed: number;
        }

        const candidates: BobinaCandidate[] = [];
        for (const b of mat.bobinas) {
            if (!b || typeof b.ancho !== 'number' || b.ancho <= 0 || typeof b.precioML !== 'number') {
                continue;
            }
            // Evaluar heurística con rotación libre y empaquetado uniforme sin rotar
            // (para evitar que girar la primera pieza bloquee carriles paralelos).
            const layouts = [
                runNesting(nestingItems, { rollWidth: b.ancho, allowRotation: true }),
                runNesting(nestingItems, { rollWidth: b.ancho, allowRotation: false }),
                ...(hasOrientedDiff ? [runNesting(narrowItems, { rollWidth: b.ancho, allowRotation: false })] : []),
            ].filter(res => res.unplacedPieces.length === 0);

            if (layouts.length === 0) continue;
            layouts.sort((a, z) => a.linearMeters - z.linearMeters);
            const nRes = layouts[0];

            const specialRes = resolveSpecialPrice(cliente, mat.codigo, b.ancho, mat.tipoCobro);
            const priceMl = (specialRes.hasSpecialPrice && specialRes.price) ? specialRes.price : b.precioML;
            const nestedMl = round2(nRes.linearMeters);
            const baseCostNoMarkup = Math.round(priceMl * nestedMl);

            candidates.push({
                bobina: b.ancho,
                priceMl,
                nestedMl,
                baseCostNoMarkup,
                areaUsed: round2(b.ancho * nestedMl),
            });
        }

        if (candidates.length === 0) return;

        candidates.sort((a, b) => {
            if (a.baseCostNoMarkup !== b.baseCostNoMarkup) {
                return a.baseCostNoMarkup - b.baseCostNoMarkup;
            }
            if (Math.abs(a.areaUsed - b.areaUsed) > 0.01) {
                return a.areaUsed - b.areaUsed;
            }
            if (Math.abs(a.nestedMl - b.nestedMl) > 0.01) {
                return a.nestedMl - b.nestedMl;
            }
            return a.bobina - b.bobina;
        });

        const best = candidates[0];
        const improvesCost = best.baseCostNoMarkup < rawBaseNoMarkupSum;
        const improvesMlTie = best.baseCostNoMarkup === rawBaseNoMarkupSum && best.nestedMl < rawMlTotal - 0.01;
        if (!improvesCost && !improvesMlTie) return;

        const totalArea = subgroup.reduce((acc, e) => acc + e.areaM2, 0);
        let allocatedMl = 0;
        let allocatedBaseCost = 0;
        let groupRawCostTotal = 0;
        let groupNestedCostTotal = 0;

        const rawCostTotalPreview = subgroup.reduce((acc, e) => acc + e.individualResult.subtotal, 0);
        const subgroupPctEstimate = rawMlTotal > 0
            ? Math.round(((rawMlTotal - best.nestedMl) / rawMlTotal) * 100)
            : 0;

        subgroup.forEach((entry, subIdx) => {
            const isLast = subIdx === subgroup.length - 1;
            const weight = totalArea > 0 ? (entry.areaM2 / totalArea) : (1 / subgroup.length);

            const itemNestedMl = isLast
                ? Math.max(0, round2(best.nestedMl - allocatedMl))
                : round2(weight * best.nestedMl);
            allocatedMl = round2(allocatedMl + itemNestedMl);

            const itemBaseNoMarkup = isLast
                ? Math.max(0, Math.round(best.baseCostNoMarkup - allocatedBaseCost))
                : Math.round(weight * best.baseCostNoMarkup);
            allocatedBaseCost += itemBaseNoMarkup;

            const pct = entry.individualResult.recargoParticularPct || 0;
            const itemCostoBase = pct > 0
                ? Math.round(itemBaseNoMarkup * (1 + pct / 100))
                : itemBaseNoMarkup;
            const servicesTotal = entry.individualResult.servicesTotal ?? 0;
            const nestedSubtotal = itemCostoBase + servicesTotal;

            groupRawCostTotal += entry.individualResult.subtotal;
            groupNestedCostTotal += nestedSubtotal;

            const baseDetalle = entry.individualResult.precioDetalle;
            const effectiveResult: PriceCalculationResult = {
                ...entry.individualResult,
                subtotal: nestedSubtotal,
                consumoEstimado: itemNestedMl,
                consumoML: itemNestedMl,
                bobinaAsignada: best.bobina,
                precioMl: best.priceMl,
                precioDetalle: {
                    ...(baseDetalle || { tipoCobro: 'ml' }),
                    tipoCobro: 'ml',
                    bobinaAncho: best.bobina,
                    bobinaUsada: best.bobina,
                    precioML: best.priceMl,
                    consumoML: itemNestedMl,
                    costoBase: itemCostoBase,
                    nestingAplicado: true,
                    mlSinNesting: entry.mlRaw,
                    mlConNesting: itemNestedMl,
                    ahorroNestingPct: subgroupPctEstimate,
                },
            };

            itemResults[entry.index] = {
                id: entry.input.id,
                individualResult: entry.individualResult,
                effectiveResult,
                isNested: true,
                rawSubtotal: entry.individualResult.subtotal,
                nestedSubtotal,
                savingsAmount: Math.max(0, entry.individualResult.subtotal - nestedSubtotal),
            };
        });

        const savingsAmount = Math.max(0, groupRawCostTotal - groupNestedCostTotal);
        const savingsMl = Math.max(0, round2(rawMlTotal - best.nestedMl));
        const savingsPct = rawCostTotalPreview > 0
            ? Math.round((savingsAmount / rawCostTotalPreview) * 100)
            : (rawMlTotal > 0 ? Math.round((savingsMl / rawMlTotal) * 100) : 0);

        groups.push({
            groupKey,
            material: mat.codigo,
            calidad: subgroup[0].calidadNorm,
            itemIds: subgroup.map(e => e.input.id),
            bobinaGanadora: best.bobina,
            precioMLAplicado: best.priceMl,
            rawMlTotal,
            nestedMlTotal: best.nestedMl,
            savingsMl,
            savingsPct,
            rawCostTotal: groupRawCostTotal,
            nestedCostTotal: groupNestedCostTotal,
            savingsAmount,
        });
    });

    const rawBatchTotal = Math.round(itemResults.reduce((acc, r) => acc + r.rawSubtotal, 0));
    const nestedBatchTotal = Math.round(itemResults.reduce((acc, r) => acc + r.nestedSubtotal, 0));
    const totalSavingsAmount = Math.max(0, rawBatchTotal - nestedBatchTotal);

    const totalRawMl = round2(
        itemResults.reduce((acc, r) => {
            if (r.individualResult.precioDetalle?.tipoCobro !== 'ml') return acc;
            return acc + (r.individualResult.consumoML ?? r.individualResult.consumoEstimado ?? 0);
        }, 0)
    );
    const totalNestedMl = round2(
        itemResults.reduce((acc, r) => {
            if (r.effectiveResult.precioDetalle?.tipoCobro !== 'ml') return acc;
            return acc + (r.effectiveResult.consumoML ?? r.effectiveResult.consumoEstimado ?? 0);
        }, 0)
    );
    const totalSavingsMl = Math.max(0, round2(totalRawMl - totalNestedMl));
    const totalSavingsPct = rawBatchTotal > 0
        ? Math.round((totalSavingsAmount / rawBatchTotal) * 100)
        : (totalRawMl > 0 ? Math.round((totalSavingsMl / totalRawMl) * 100) : 0);

    return {
        items: itemResults,
        groups,
        hasNestingOpportunity: groups.length > 0,
        rawBatchTotal,
        nestedBatchTotal,
        totalSavingsAmount,
        totalRawMl,
        totalNestedMl,
        totalSavingsMl,
        totalSavingsPct,
    };
}
