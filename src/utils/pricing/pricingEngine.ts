/**
 * Luxius System - Pricing Calculation Pure Engine
 */

import { getMateriales, getClientes, getServicios } from '@/data/db';
import type { DemasiasConfig } from '@/types';
import { getBobinaUsefulWidth } from '../nestingEngine';
import type { PriceCalculationResult } from './pricingTypes';

export const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

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
    const specialPrice = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[materialCode] : null;

    let basePrice = 0;
    let assignedBobina: number | undefined;
    let appliedPriceMl: number | undefined;
    let rotated = false;
    let linearMeters = 0;

    if (tipoCobro === 'ml') {
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
            const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${materialCode}:${bobinaAncho}`] : null;
            const priceToUse = specialPriceWidth || specialPrice || precioML;

            // 1. Orientacion Normal (Ancho de la pieza a lo ancho de la bobina)
            if (w <= usefulWidth) {
                const ml = round2(h * c);
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
                const ml = round2(w * c);
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
