import type { Order, Cliente, Material } from '@/types'
import { getBobinaUsefulWidth } from '@/utils/nestingEngine'

export const round2 = (val: number): number => Math.round((val + Number.EPSILON) * 100) / 100;

export interface ConsumptionResult {
    value: number;
    unit: string;
    bobina: string | null;
}

export function calculateOrderPrice(order: Order, allMateriales: Material[], allClientes: Cliente[]): number {
    // 1. Precio manual (monto acordado personalizado) → máxima prioridad
    const manualPrice = (order as any).precioUnitarioManual
        ?? (order as any).precio_manual
        ?? (order as any).precioManual;
    if (manualPrice !== undefined && manualPrice !== null && Number(manualPrice) > 0) {
        return Math.round(Number(manualPrice));
    }

    // 2. Total/subtotal ya persistido (incluye precio especial, servicios, demasías)
    const storedTotal = Number(order.total || 0);
    const storedSubtotal = Number(order.subtotal || 0);
    if (storedTotal > 0) return Math.round(storedTotal);
    if (storedSubtotal > 0) return Math.round(storedSubtotal);

    // 3. Fallback: recalcular desde materiales (solo para órdenes sin total guardado)
    const matData = allMateriales.find(m => m.codigo === order.material);
    const w = round2(Number(order.ancho) || 0);
    const h = round2(Number(order.alto) || 0);
    const c = Number(order.copias) || 1;

    if (matData) {
        if (matData.tipoCobro === 'ml' && matData.bobinas && matData.bobinas.length > 0) {
            const safetyMargin = 0.01;
            const availableWidths = matData.bobinas
                .map((b: any) => ({ ...b, usefulWidth: round2(b.ancho - safetyMargin) }))
                .filter((b: any) => b.usefulWidth > 0)
                .sort((a: any, b: any) => a.usefulWidth - b.usefulWidth);

            const cliente = allClientes.find(cl => String(cl.id) === String(order.clientId));
            const specialPrice = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[order.material] : null;

            type Candidate = { bobina: number; ml: number; cost: number; rotated: boolean };
            const candidates: Candidate[] = [];

            for (const b of availableWidths) {
                const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${order.material}:${b.ancho}`] : null;
                const priceToUse = specialPriceWidth || specialPrice || b.precioML;

                if (w <= b.usefulWidth) {
                    const ml = round2(h * c);
                    candidates.push({ bobina: b.ancho, ml, cost: Math.round(priceToUse * ml), rotated: false });
                }
                if (h <= b.usefulWidth) {
                    const ml = round2(w * c);
                    candidates.push({ bobina: b.ancho, ml, cost: Math.round(priceToUse * ml), rotated: true });
                }
            }

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
                if (Math.abs(areaA - areaB) > 0.05) return areaA - areaB;
                if (Math.abs(a.cost - b.cost) > 1) return a.cost - b.cost;
                if (Math.abs(a.ml - b.ml) > 0.01) return a.ml - b.ml;
                if (a.rotated !== b.rotated) return a.rotated ? 1 : -1;
                return a.bobina - b.bobina;
            });

            if (candidates.length > 0) return candidates[0].cost;

            if (availableWidths.length > 0) {
                const widest = availableWidths[availableWidths.length - 1];
                const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${order.material}:${widest.ancho}`] : null;
                const priceToUse = specialPriceWidth || specialPrice || widest.precioML;
                const ml = round2(h * c);
                return Math.round(priceToUse * ml);
            }
        }

        if (matData.precioM2) {
            const cliente = allClientes.find(cl => String(cl.id) === String(order.clientId));
            const specialPrice = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[order.material] : null;
            const priceToUse = specialPrice || matData.precioM2 || 0;
            const m2 = round2(w * h * c);
            return Math.round(m2 * priceToUse);
        }
    }

    return 0;
}

export function getConsumption(order: Order, allMateriales: Material[]): ConsumptionResult {
    const matData = allMateriales.find(m => m.codigo === order.material);

    const rawW = Number(order.ancho) || 0;
    const rawH = Number(order.alto) || 0;
    const w = round2(rawW > 20 ? rawW / 100 : rawW);
    const h = round2(rawH > 20 ? rawH / 100 : rawH);
    const c = Number(order.copias) || 1;

    const isMl = matData?.tipoCobro === 'ml' || (matData?.bobinas && matData.bobinas.length > 0) || order.material === 'VV' || order.material === 'VVP';

    if (isMl) {
        let val = order.consumoEstimado !== undefined ? round2(order.consumoEstimado) : undefined;
        let assignedBobina = order.bobinaAsignada || order.precioDetalle?.bobinaAncho || order.precioDetalle?.bobinaUsada;

        const maxDim = Math.max(w, h);
        const is150Piece = maxDim > 1.365 && maxDim <= 1.515;
        // Corrección reactiva si una pieza de 1.50m tenía erróneamente guardada bobina 1.37m o consumo de 1.50ml
        const isAnomaly137 = is150Piece && (Number(assignedBobina) === 1.37 || String(assignedBobina).includes('1.37'));

        if (val === undefined || !assignedBobina || isAnomaly137) {
            if (matData?.bobinas && matData.bobinas.length > 0) {
                const availableWidths = matData.bobinas
                    .map((b: any) => {
                        const nominal = Number(b.ancho) || 0;
                        const realAncho = (Math.abs(nominal - 1.50) < 0.03) ? 1.52 : nominal;
                        const usefulWidth = getBobinaUsefulWidth(realAncho);
                        return { ...b, ancho: realAncho, usefulWidth };
                    })
                    .filter((b: any) => b.usefulWidth > 0)
                    .sort((a: any, b: any) => a.usefulWidth - b.usefulWidth);

                type Candidate = { bobina: number; ml: number; rotated: boolean };
                const candidates: Candidate[] = [];

                for (const b of availableWidths) {
                    if (w <= b.usefulWidth) {
                        candidates.push({ bobina: b.ancho, ml: round2(h * c), rotated: false });
                    }
                    if (h <= b.usefulWidth) {
                        candidates.push({ bobina: b.ancho, ml: round2(w * c), rotated: true });
                    }
                }

                candidates.sort((a, b) => {
                    if (is150Piece) {
                        const aIs152 = a.bobina >= 1.48 && a.bobina <= 1.53;
                        const bIs152 = b.bobina >= 1.48 && b.bobina <= 1.53;
                        if (aIs152 && !bIs152) return -1;
                        if (!aIs152 && bIs152) return 1;
                    }
                    const areaA = a.bobina * a.ml;
                    const areaB = b.bobina * b.ml;
                    if (Math.abs(areaA - areaB) > 0.05) return areaA - areaB;
                    if (Math.abs(a.ml - b.ml) > 0.01) return a.ml - b.ml;
                    if (a.rotated !== b.rotated) return a.rotated ? 1 : -1;
                    return a.bobina - b.bobina;
                });

                if (candidates.length > 0) {
                    val = candidates[0].ml;
                    assignedBobina = candidates[0].bobina;
                } else {
                    val = round2(h * c);
                    assignedBobina = availableWidths[availableWidths.length - 1]?.ancho;
                }
            } else {
                // Standard Vehicular Vinyl roll sizes: 1.37m & 1.52m
                if (is150Piece) {
                    assignedBobina = 1.52;
                    val = (w <= 1.515) ? round2(h * c) : round2(w * c);
                } else if (w <= 1.365) {
                    assignedBobina = 1.37;
                    val = round2(h * c);
                } else if (h <= 1.365 && round2(w * c) <= round2(h * c)) {
                    assignedBobina = 1.37;
                    val = round2(w * c);
                } else if (w <= 1.515 || h <= 1.515) {
                    assignedBobina = 1.52;
                    val = (h <= 1.515 && round2(w * c) < round2(h * c)) ? round2(w * c) : round2(h * c);
                } else {
                    assignedBobina = 1.52;
                    val = round2(h * c);
                }
            }
        }
        return {
            value: round2(val),
            unit: 'ml',
            bobina: assignedBobina ? `${assignedBobina}` : null
        };
    }
    return {
        value: round2(w * h * c),
        unit: 'm²',
        bobina: null
    };
}

export function isSpecialLaminationOrder(
    order: Order,
    cons?: ConsumptionResult,
    allMateriales?: Material[]
): boolean {
    const c = cons || (allMateriales ? getConsumption(order, allMateriales) : { value: order.consumoEstimado ?? 0, unit: 'ml', bobina: null });
    const rawW = Number(order.ancho) || 0;
    const rawH = Number(order.alto) || 0;
    const w = round2(rawW > 20 ? rawW / 100 : rawW);
    const h = round2(rawH > 20 ? rawH / 100 : rawH);

    if (c.unit === 'ml') {
        const copias = Math.max(1, Number(order.copias) || 1);
        const largoDeUnPano = c.value / copias;
        return largoDeUnPano > 2.93 || Math.max(w, h) > 2.93;
    }

    return Math.max(w, h) > 2.93;
}
