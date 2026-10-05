import { getMateriales, getClientes, getServicios } from '@/data/db';
import type { DemasiasConfig } from '@/types';
import { getBobinaUsefulWidth } from './nestingEngine';

export const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

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

/**
 * Motor oficial unificado de calculo de precios y metros lineales de LuXius
 * Evalua orientacion normal vs rotada, margen de seguridad de 1cm, precios por bobina y precios especiales por cliente.
 */
export function calculateItemPriceDetailed(
    materialCode: string,
    rawW: number,
    rawH: number,
    c: number = 1,
    services?: Record<string, boolean>,
    clientIdParam?: string | number,
    demasiasConfig?: DemasiasConfig
): PriceCalculationResult {
    const mat = getMateriales().find(m => 
        m.codigo === materialCode || 
        String(m.codigo).toLowerCase() === String(materialCode).toLowerCase()
    );

    let w = round2(rawW);
    let h = round2(rawH);

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
            bobinaAsignada: undefined,
            precioMl: undefined,
            rotated: false,
            precioDetalle: undefined
        };
    }

    const { tipoCobro, bobinas, precioM2 } = mat;
    let basePrice = 0;
    let assignedBobina: number | undefined = undefined;
    let appliedPriceMl: number | undefined = undefined;
    let rotated = false;
    let linearMeters = 0;
    let bestCost = Infinity;

    let cliente = undefined;
    if (clientIdParam) {
        cliente = getClientes().find(cl => cl.id === parseInt(String(clientIdParam)));
    }
    const specialPrice = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[materialCode] : null;

    if (tipoCobro === 'ml') {
        if (!bobinas || bobinas.length === 0) {
            return {
                subtotal: 0,
                consumoEstimado: 0,
                bobinaAsignada: undefined,
                precioMl: undefined,
                rotated: false,
                precioDetalle: undefined
            };
        }

        const availableWidths = bobinas
            .map((b: any) => {
                const nominal = Number(b.ancho) || 0;
                const realAncho = (Math.abs(nominal - 1.50) < 0.03) ? 1.52 : nominal;
                const usefulWidth = getBobinaUsefulWidth(realAncho);
                return { ...b, ancho: realAncho, usefulWidth };
            })
            .filter((b: any) => b.usefulWidth > 0)
            .sort((a: any, b: any) => a.usefulWidth - b.usefulWidth);

        // Collect ALL valid bobina+orientation combos
        type Candidate = { bobina: number; rotated: boolean; ml: number; cost: number; priceMl: number };
        const candidates: Candidate[] = [];

        for (const b of availableWidths) {
            const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${materialCode}:${b.ancho}`] : null;
            const priceToUse = specialPriceWidth || specialPrice || b.precioML;

            // Normal orientation: ancho fits in bobina
            if (w <= b.usefulWidth) {
                const ml = round2(h * c);
                candidates.push({ bobina: b.ancho, rotated: false, ml, cost: Math.round(priceToUse * ml), priceMl: priceToUse });
            }

            // Rotated orientation: alto fits in bobina
            if (h <= b.usefulWidth) {
                const ml = round2(w * c);
                candidates.push({ bobina: b.ancho, rotated: true, ml, cost: Math.round(priceToUse * ml), priceMl: priceToUse });
            }
        }

        // Sort candidates according to workshop rules and material efficiency:
        // 1. If piece dimension is ~1.50m (> 1.365m up to 1.515m), it is designed for the 1.50m/1.52m roll.
        //    Forcing it onto 1.37m wastes 60% of roll width and nearly triples linear meters.
        // 2. Minimize total roll material area consumed (bobina * ml).
        // 3. Lowest total cost.
        // 4. Fewest linear meters.
        // 5. Natural orientation (unrotated) preferred over rotated.
        // 6. Narrower bobina tie-breaker.
        const maxDim = Math.max(w, h);
        const is150Piece = maxDim > 1.365 && maxDim <= 1.515;

        candidates.sort((a, b) => {
            if (is150Piece) {
                const aIs152 = a.bobina >= 1.48 && a.bobina <= 1.53;
                const bIs152 = b.bobina >= 1.48 && b.bobina <= 1.53;
                if (aIs152 && !bIs152) return -1;
                if (!aIs152 && bIs152) return 1;
            }

            const areaA = a.bobina * a.ml;
            const areaB = b.bobina * b.ml;
            if (Math.abs(areaA - areaB) > 0.05) {
                return areaA - areaB;
            }

            if (Math.abs(a.cost - b.cost) > 1) {
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
            const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${materialCode}:${widest.ancho}`] : null;
            const priceToUse = specialPriceWidth || specialPrice || widest.precioML;
            const ml = round2(h * c);
            bestCost = Math.round(priceToUse * ml);
            assignedBobina = widest.ancho;
            appliedPriceMl = priceToUse;
            linearMeters = ml;
        }

        basePrice = bestCost === Infinity ? 0 : Math.round(bestCost);
    } else {
        const priceToUse = specialPrice || precioM2 || 0;
        const m2 = round2(w * h * c);
        basePrice = w > 0 ? Math.round(m2 * priceToUse) : 0;
        linearMeters = 0;
    }

    // Servicios adicionales
    let servicesTotal = 0;
    if (services) {
        const availableServices = getServicios();
        Object.entries(services).forEach(([sId, active]) => {
            if (active) {
                const s = availableServices.find(serv => String(serv.id) === sId);
                if (s) {
                    const priceBase = parseFloat(s.precioBase as any) || 0;
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

    return {
        subtotal,
        consumoEstimado: tipoCobro === 'ml' ? linearMeters : round2(w * h * c),
        bobinaAsignada: assignedBobina,
        precioMl: appliedPriceMl,
        rotated,
        precioDetalle: tipoCobro === 'ml' ? {
            tipoCobro: 'ml',
            bobinaAncho: assignedBobina,
            bobinaUsada: assignedBobina,
            precioML: appliedPriceMl,
            rotated,
            consumoML: linearMeters,
            costoBase: basePrice
        } : {
            tipoCobro: 'm2',
            precioM2: specialPrice || precioM2 || 0,
            costoBase: basePrice
        }
    };
}
