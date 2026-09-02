import { getMateriales, getClientes, getServicios } from '@/data/db';
import type { DemasiasConfig } from '@/types';

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

        const safetyMargin = 0.01;
        const availableWidths = bobinas
            .map((b: any) => ({ ...b, usefulWidth: round2(b.ancho - safetyMargin) }))
            .filter((b: any) => b.usefulWidth > 0)
            .sort((a: any, b: any) => a.usefulWidth - b.usefulWidth);

        let bestCost = Infinity;

        // 1. Orientacion Normal (el ancho entra en el ancho util de la bobina)
        for (const b of availableWidths) {
            if (w <= b.usefulWidth) {
                const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${materialCode}:${b.ancho}`] : null;
                const priceToUse = specialPriceWidth || specialPrice || b.precioML;
                const ml = round2(h * c);
                const cost = Math.round(priceToUse * ml);
                if (cost < bestCost) {
                    bestCost = cost;
                    rotated = false;
                    assignedBobina = b.ancho;
                    appliedPriceMl = priceToUse;
                    linearMeters = ml;
                }
                break;
            }
        }

        // 2. Orientacion Rotada (el alto entra en el ancho util de la bobina)
        for (const b of availableWidths) {
            if (h <= b.usefulWidth) {
                const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${materialCode}:${b.ancho}`] : null;
                const priceToUse = specialPriceWidth || specialPrice || b.precioML;
                const ml = round2(w * c);
                const cost = Math.round(priceToUse * ml);
                if (cost < bestCost) {
                    bestCost = cost;
                    rotated = true;
                    assignedBobina = b.ancho;
                    appliedPriceMl = priceToUse;
                    linearMeters = ml;
                }
                break;
            }
        }

        // 3. Fallback si excede todas las bobinas: asignar la bobina mas ancha
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
