/**
 * Luxius System - Special Client Pricing Engine & Utilities
 *
 * Maneja la discriminación rigurosa de precios especiales a clientes:
 * - Materiales cobrados en M2: el precio es por superficie (m²) y NO importa el ancho del rollo.
 * - Materiales cobrados en ML: el precio es por metro lineal y SÍ importa el ancho de bobina.
 *
 * Formatos de clave soportados en `cliente.preciosEspeciales`:
 * 1. `{matCode}:m2`          -> Precio especial explícito por metro cuadrado ($/m²)
 * 2. `{matCode}:ml:{ancho}`  -> Precio especial explícito por metro lineal para bobina específica ($/ml)
 * 3. `{matCode}:{ancho}`     -> Formato clásico: bobina específica ($/ml, ej: "VV:1.52")
 * 4. `{matCode}:ml`          -> Precio especial general en metro lineal para todos los anchos ($/ml)
 * 5. `{matCode}`             -> Formato clásico: si el material es m2 se cobra en m²; si es ml, en ml general.
 */

import type { Cliente, Material } from '@/types';

export interface ParsedSpecialPrice {
    rawKey: string;
    materialCode: string;
    unit: 'm2' | 'ml';
    ancho?: number;
    precio: number;
}

export interface SpecialPriceResolution {
    hasSpecialPrice: boolean;
    price?: number;
    unit?: 'm2' | 'ml';
    appliedKey?: string;
}

/**
 * Parsea cualquier clave almacenada en `preciosEspeciales` a una estructura clara con unidad y ancho.
 */
export function parseSpecialPriceKey(key: string, precio: number, allMaterials?: Material[]): ParsedSpecialPrice {
    const trimmed = key.trim();
    const parts = trimmed.split(':');
    const matCode = parts[0];
    const mat = allMaterials?.find(m => m.codigo.toLowerCase() === matCode.toLowerCase());

    // 1. matCode:m2
    if (parts.length === 2 && parts[1].toLowerCase() === 'm2') {
        return {
            rawKey: key,
            materialCode: matCode,
            unit: 'm2',
            precio
        };
    }

    // 2. matCode:ml:ancho
    if (parts.length === 3 && parts[1].toLowerCase() === 'ml') {
        const parsedAncho = parseFloat(parts[2]);
        return {
            rawKey: key,
            materialCode: matCode,
            unit: 'ml',
            ancho: !isNaN(parsedAncho) && parsedAncho > 0 ? parsedAncho : undefined,
            precio
        };
    }

    // 3. matCode:ml (general)
    if (parts.length === 2 && parts[1].toLowerCase() === 'ml') {
        return {
            rawKey: key,
            materialCode: matCode,
            unit: 'ml',
            precio
        };
    }

    // 4. matCode:ancho (formato clásico ML, ej: "VV:1.52")
    if (parts.length === 2) {
        const parsedAncho = parseFloat(parts[1]);
        if (!isNaN(parsedAncho) && parsedAncho > 0) {
            return {
                rawKey: key,
                materialCode: matCode,
                unit: 'ml',
                ancho: parsedAncho,
                precio
            };
        }
    }

    // 5. matCode solo (formato clásico plano, ej: "VBB" o "FL")
    // Se infiere la unidad según la configuración del material (default: m2)
    const inferredUnit: 'm2' | 'ml' = mat?.tipoCobro === 'ml' ? 'ml' : 'm2';
    return {
        rawKey: key,
        materialCode: matCode,
        unit: inferredUnit,
        precio
    };
}

/**
 * Construye la clave normalizada para guardar en `preciosEspeciales`.
 */
export function buildSpecialPriceKey(materialCode: string, unit: 'm2' | 'ml', ancho?: number | string | null): string {
    const code = materialCode.trim().toUpperCase();
    if (unit === 'm2') {
        return `${code}:m2`;
    }

    // Metro Lineal (ml)
    if (ancho !== undefined && ancho !== null && ancho !== '') {
        const numAncho = typeof ancho === 'number' ? ancho : parseFloat(ancho);
        if (!isNaN(numAncho) && numAncho > 0) {
            // Guardamos como matCode:ancho (compatible histórico y directo)
            return `${code}:${numAncho}`;
        }
    }

    return `${code}:ml`;
}

/**
 * Resuelve el precio especial que corresponde aplicar a un cliente para un material dado,
 * discriminando si la cotización se realiza por metro lineal (evaluando bobina) o por metro cuadrado.
 */
export function resolveSpecialPrice(
    cliente: Cliente | null | undefined,
    materialCode: string,
    bobinaAncho?: number,
    materialTipoCobro?: 'm2' | 'ml'
): SpecialPriceResolution {
    if (!cliente || !cliente.preciosEspeciales || typeof cliente.preciosEspeciales !== 'object') {
        return { hasSpecialPrice: false };
    }

    const precios = cliente.preciosEspeciales;
    const targetMat = materialCode.trim().toLowerCase();

    // Helper insensible a mayúsculas
    const findVal = (queryKey: string): number | undefined => {
        const q = queryKey.toLowerCase();
        for (const [k, v] of Object.entries(precios)) {
            if (k.toLowerCase() === q && typeof v === 'number' && !isNaN(v) && v > 0) {
                return v;
            }
        }
        return undefined;
    };

    // 1. Si se evalúa una bobina específica en metro lineal:
    if (bobinaAncho !== undefined && bobinaAncho > 0) {
        const anchoFixed = bobinaAncho.toFixed(2);
        const anchoNum = String(bobinaAncho);

        // a) Clave explícita para este ancho: "VV:ml:1.52", "VV:1.52", etc.
        const pExact =
            findVal(`${targetMat}:ml:${anchoFixed}`) ??
            findVal(`${targetMat}:ml:${anchoNum}`) ??
            findVal(`${targetMat}:${anchoFixed}`) ??
            findVal(`${targetMat}:${anchoNum}`);

        if (pExact !== undefined) {
            return {
                hasSpecialPrice: true,
                price: pExact,
                unit: 'ml',
                appliedKey: `${materialCode}:${anchoNum}`
            };
        }

        // b) Clave general en ML para todos los anchos: "VV:ml"
        const pMlGeneral = findVal(`${targetMat}:ml`);
        if (pMlGeneral !== undefined) {
            return {
                hasSpecialPrice: true,
                price: pMlGeneral,
                unit: 'ml',
                appliedKey: `${materialCode}:ml`
            };
        }
    }

    // 2. Clave explícita en M2: "VV:m2" o "VBB:m2"
    // (Aplica a cualquier ancho porque en M2 no importa el ancho del rollo)
    const pM2Explicit = findVal(`${targetMat}:m2`);
    if (pM2Explicit !== undefined) {
        return {
            hasSpecialPrice: true,
            price: pM2Explicit,
            unit: 'm2',
            appliedKey: `${materialCode}:m2`
        };
    }

    // 3. Clave clásica sin sufijo de unidad: "VBB" o "VV"
    const pLegacy = findVal(targetMat);
    if (pLegacy !== undefined) {
        const unit = materialTipoCobro === 'ml' ? 'ml' : 'm2';
        return {
            hasSpecialPrice: true,
            price: pLegacy,
            unit,
            appliedKey: materialCode
        };
    }

    return { hasSpecialPrice: false };
}

export function normalizeRollWidthMeters(rawAncho: number): number {
    if (!Number.isFinite(rawAncho) || rawAncho <= 0) return 0;
    const normalized = rawAncho > 20 ? rawAncho / 100 : rawAncho;
    return Math.round((normalized + Number.EPSILON) * 100) / 100;
}

export interface ClientMlSpecialInfo {
    hasMlSpecial: boolean;
    explicitWidths: number[];
    generalMlPrice?: number;
}

/**
 * Detecta si un cliente tiene configurado un precio especial explícito por metro lineal (`ml`)
 * para un material (por ej. `VM:ml`, `VM:1.50`, `VM:ml:1.50`), incluso si el material base
 * en el catálogo está configurado por `m2`.
 */
export function getClientMlSpecialInfo(
    cliente: Cliente | null | undefined,
    materialCode: string
): ClientMlSpecialInfo {
    if (!cliente || !cliente.preciosEspeciales || typeof cliente.preciosEspeciales !== 'object') {
        return { hasMlSpecial: false, explicitWidths: [] };
    }

    const targetMat = materialCode.trim().toLowerCase();
    const widthSet = new Set<number>();
    let generalMlPrice: number | undefined;

    for (const [key, val] of Object.entries(cliente.preciosEspeciales)) {
        if (typeof val !== 'number' || isNaN(val) || val <= 0) continue;
        // Solo consideramos claves explícitamente en ML (`:ml`, `:ml:ancho`, `:ancho`),
        // pasando allMaterials undefined y chequeando key con ':'.
        if (!key.includes(':')) continue;
        const parsed = parseSpecialPriceKey(key, val);
        if (parsed.materialCode.trim().toLowerCase() !== targetMat) continue;
        if (parsed.unit !== 'ml') continue;

        if (parsed.ancho && parsed.ancho > 0) {
            const w = normalizeRollWidthMeters(parsed.ancho);
            if (w > 0) widthSet.add(w);
        } else {
            generalMlPrice = val;
        }
    }

    const explicitWidths = Array.from(widthSet).sort((a, b) => a - b);
    return {
        hasMlSpecial: explicitWidths.length > 0 || generalMlPrice !== undefined,
        explicitWidths,
        generalMlPrice,
    };
}


