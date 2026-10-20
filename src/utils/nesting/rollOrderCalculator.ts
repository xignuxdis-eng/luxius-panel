/**
 * Luxius System - Roll Order and Special Lamination Calculations
 */

export interface OrderWithRollInfo {
    material?: string;
    bobinaAsignada?: number | string;
    ancho?: number;
    alto?: number;
    copias?: number;
    consumoEstimado?: number;
    [key: string]: any;
}

export const SPECIAL_LAMINATION_LIMIT = 2.93;

/**
 * Obtiene el ancho numérico de bobina asignada con fallback a 1.52.
 */
export function anchoDe(o: OrderWithRollInfo): number {
    return Number(o.bobinaAsignada ?? 1.52);
}

/**
 * Ordena órdenes para taller: primero el rollo más angosto (ej: 1.37) y luego el más ancho (1.52),
 * desempatando alfabéticamente por material.
 */
export function ordenarParaTaller<T extends OrderWithRollInfo>(orders: T[]): T[] {
    return [...orders].sort((a, b) => {
        const ba = anchoDe(a);
        const bb = anchoDe(b);
        if (ba !== bb) return ba - bb;
        return String(a.material || '').localeCompare(String(b.material || ''));
    });
}

/**
 * Evalúa si una orden requiere laminado especial evaluando si un único paño excede el límite (2.93m).
 */
export function isSpecialLaminationOrder(
    order: { ancho?: number; alto?: number; copias?: number; consumoEstimado?: number },
    cons?: { value: number; unit: string; [key: string]: any },
    limit: number = SPECIAL_LAMINATION_LIMIT
): boolean {
    const c = cons || { value: order.consumoEstimado ?? 0, unit: 'ml' };
    const rawW = Number(order.ancho) || 0;
    const rawH = Number(order.alto) || 0;
    const w = Math.round((rawW > 20 ? rawW / 100 : rawW) * 100) / 100;
    const h = Math.round((rawH > 20 ? rawH / 100 : rawH) * 100) / 100;

    if (c.unit === 'ml') {
        const copias = Math.max(1, Number(order.copias) || 1);
        const largoDeUnPano = c.value / copias;
        return largoDeUnPano > limit || Math.max(w, h) > limit;
    }
    return Math.max(w, h) > limit;
}
