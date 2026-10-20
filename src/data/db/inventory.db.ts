/**
 * Luxius System - Inventory, Materials, Calidades & Stock Movements
 */

import type { Material, Calidad, MovimientoStock } from './types';
import {
    isDemoMode,
    DEMO_MATERIALES_KEY,
    SESSION_MATERIALES_KEY,
    HIDDEN_MATERIALES_KEY,
    SESSION_CALIDADES_KEY,
    HIDDEN_CALIDADES_KEY,
    SESSION_MOV_STOCK_KEY
} from './cache';
import { DEMO_MATERIALES, DEMO_CALIDADES } from '../demoSandboxData';
import { syncSave, syncDelete } from './client';

export const DEFAULT_MATERIALES: Material[] = [
    {
        id: 13,
        codigo: "VV",
        descripcion: "Vinilo Orajet 3651",
        calidad: "ECO",
        tipo: "Sustrato",
        tipoCobro: "ml",
        precioM2: 32000,
        ancho: 1.52,
        habilitado: true,
        unidad: "M Lineal",
        stockActual: 45,
        stockMinimo: 15,
        bobinas: [
            { ancho: 1.37, precioML: 32000 },
            { ancho: 1.52, precioML: 34000 }
        ]
    },
    {
        id: 6,
        codigo: "VM",
        descripcion: "Vinilo Microperforado",
        calidad: "ECO",
        tipo: "Sustrato",
        tipoCobro: "m2",
        precioM2: 18000,
        ancho: 1.52,
        habilitado: true,
        unidad: "M Lineal",
        stockActual: 30,
        stockMinimo: 10
    },
    {
        id: 3,
        codigo: "VBB",
        descripcion: "Vinilo Adhesivo Base Blanca Brillante",
        calidad: "ECO",
        tipo: "Sustrato",
        tipoCobro: "m2",
        precioM2: 14000,
        ancho: 1.52,
        habilitado: true,
        unidad: "M Lineal",
        stockActual: 50,
        stockMinimo: 20
    },
    {
        id: 2,
        codigo: "BL",
        descripcion: "Lona Back Light 15oz",
        calidad: "ECO",
        tipo: "Sustrato",
        tipoCobro: "m2",
        precioM2: 18000,
        ancho: 3.2,
        habilitado: true,
        unidad: "M Lineal",
        stockActual: 60,
        stockMinimo: 15
    },
    {
        id: 1,
        codigo: "FL",
        descripcion: "Lona Front Light 13oz",
        calidad: "ECO",
        tipo: "Sustrato",
        tipoCobro: "m2",
        precioM2: 14000,
        ancho: 3.2,
        habilitado: true,
        unidad: "M Lineal",
        stockActual: 80,
        stockMinimo: 25
    },
    {
        id: 901,
        codigo: "INK-C",
        descripcion: "Tinta Cyan",
        calidad: "ECO",
        tipo: "tinta",
        tipoCobro: "m2",
        precioM2: 0,
        ancho: 0,
        color: "#00ffff",
        unidad: "Litros",
        habilitado: true,
        stockActual: 10,
        stockMinimo: 5
    },
    {
        id: 902,
        codigo: "INK-M",
        descripcion: "Tinta Magenta",
        calidad: "ECO",
        tipo: "tinta",
        tipoCobro: "m2",
        precioM2: 0,
        ancho: 0,
        color: "#ff00ff",
        unidad: "Litros",
        habilitado: true,
        stockActual: 10,
        stockMinimo: 5
    },
    {
        id: 903,
        codigo: "INK-Y",
        descripcion: "Tinta Yellow",
        calidad: "ECO",
        tipo: "tinta",
        tipoCobro: "m2",
        precioM2: 0,
        ancho: 0,
        color: "#ffff00",
        unidad: "Litros",
        habilitado: true,
        stockActual: 10,
        stockMinimo: 5
    },
    {
        id: 904,
        codigo: "INK-K",
        descripcion: "Tinta Black",
        calidad: "ECO",
        tipo: "tinta",
        tipoCobro: "m2",
        precioM2: 0,
        ancho: 0,
        color: "#222222",
        unidad: "Litros",
        habilitado: true,
        stockActual: 10,
        stockMinimo: 5
    },
    {
        id: 905,
        codigo: "FLS-01",
        descripcion: "Flush Limpieza",
        calidad: "ECO",
        tipo: "solvente",
        tipoCobro: "m2",
        precioM2: 0,
        ancho: 0,
        color: "#e0e0e0",
        unidad: "Litros",
        habilitado: true,
        stockActual: 5,
        stockMinimo: 2
    }
];

export function deduplicateMaterials(materials: Material[]): Material[] {
    if (!Array.isArray(materials) || materials.length === 0) return [];

    const deduped: Material[] = [];

    for (const item of materials) {
        if (!item) continue;
        const codeKey = (item.codigo || '').trim().toUpperCase();
        const descKey = (item.descripcion || '').trim().toLowerCase();

        let existingIndex = -1;
        if (codeKey) {
            existingIndex = deduped.findIndex(d => (d.codigo || '').trim().toUpperCase() === codeKey);
        }
        if (existingIndex === -1 && descKey) {
            existingIndex = deduped.findIndex(d => (d.descripcion || '').trim().toLowerCase() === descKey);
        }

        if (existingIndex !== -1) {
            const existing = deduped[existingIndex];

            // Prefer the item with a price > 0, or with official/lower ID
            const preferCurrent = (Number(existing.precioM2 || 0) === 0 && Number(item.precioM2 || 0) > 0) ||
                                  (Number(existing.id) > 100000 && Number(item.id) < 100000);

            const base = preferCurrent ? item : existing;
            const other = preferCurrent ? existing : item;

            deduped[existingIndex] = {
                ...other,
                ...base,
                id: (base.id < 100000 ? base.id : other.id) || base.id,
                stockActual: (existing.stockActual || 0) + (item.stockActual || 0),
                stockMinimo: Math.max(existing.stockMinimo || 0, item.stockMinimo || 0),
                precioM2: Number(base.precioM2 || 0) > 0 ? base.precioM2 : (other.precioM2 || 0),
                habilitado: existing.habilitado !== false && item.habilitado !== false
            };
        } else {
            deduped.push({ ...item });
        }
    }

    return deduped;
}

export function getMateriales(): Material[] {
    if (isDemoMode()) {
        const demoMatJson = localStorage.getItem(DEMO_MATERIALES_KEY);
        if (demoMatJson) {
            try {
                const list = JSON.parse(demoMatJson) as Material[];
                if (Array.isArray(list) && list.length > 0) return list;
            } catch (e) { }
        }
        localStorage.setItem(DEMO_MATERIALES_KEY, JSON.stringify(DEMO_MATERIALES));
        return [...DEMO_MATERIALES];
    }

    const sessionItemsJson = localStorage.getItem(SESSION_MATERIALES_KEY);
    const hiddenItemsJson = localStorage.getItem(HIDDEN_MATERIALES_KEY);

    let sessionItems: Material[] = [];
    let hiddenIds: number[] = [];

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson) as Material[];
        } catch (e) { }
    }

    if (sessionItems.length === 0) {
        sessionItems = [...DEFAULT_MATERIALES];
        try { localStorage.setItem(SESSION_MATERIALES_KEY, JSON.stringify(sessionItems)); } catch (e) { }
    }

    // Deduplicate in memory and auto-heal localStorage if duplicates were stored
    const dedupedItems = deduplicateMaterials(sessionItems);
    if (dedupedItems.length !== sessionItems.length) {
        try {
            localStorage.setItem(SESSION_MATERIALES_KEY, JSON.stringify(dedupedItems));
        } catch (e) { }
        sessionItems = dedupedItems;
    } else {
        sessionItems = dedupedItems;
    }

    if (hiddenItemsJson) {
        try {
            hiddenIds = JSON.parse(hiddenItemsJson) as number[];
        } catch (e) { }
    }

    const hiddenSet = new Set(hiddenIds);
    const filteredSession = sessionItems.filter(i => !hiddenSet.has(i.id));

    const calidadesList = getCalidades();
    const validCalidadesMap = new Map(calidadesList.map(c => [c.nombre.trim().toLowerCase(), c.nombre]));
    const defaultCalidadName = calidadesList.find(c => c.habilitado !== false)?.nombre || calidadesList[0]?.nombre || 'Solvente';

    return filteredSession.map(m => {
        let color = m.color;
        if (!color) {
            if (m.codigo === 'INK-C') color = '#00ffff';
            if (m.codigo === 'INK-M') color = '#ff00ff';
            if (m.codigo === 'INK-Y') color = '#ffff00';
            if (m.codigo === 'INK-K') color = '#222222';
            if (m.codigo === 'FLS-01') color = '#e0e0e0';
        }

        let unidad = m.unidad;
        if (!unidad) {
            const type = m.tipo?.toLowerCase();
            if (type === 'rollo') unidad = 'M Lineal';
            else if (type === 'tinta' || type === 'solvente') unidad = 'Litros';
            else if (type === 'plancha') unidad = 'un';
            else unidad = 'mts';
        }

        const rawCalidad = (m.calidad || '').trim();
        let calidad = defaultCalidadName;
        if (rawCalidad) {
            const lower = rawCalidad.toLowerCase();
            if (validCalidadesMap.has(lower)) {
                calidad = validCalidadesMap.get(lower)!;
            } else {
                const match = calidadesList.find(c =>
                    lower.includes(c.nombre.toLowerCase()) || c.nombre.toLowerCase().includes(lower)
                );
                calidad = match ? match.nombre : defaultCalidadName;
            }
        }

        return {
            ...m,
            calidad,
            color,
            unidad
        };
    });
}

export function saveMaterial(material: Partial<Material>): Material {
    const sessionItemsJson = localStorage.getItem(SESSION_MATERIALES_KEY);
    let sessionItems: Material[] = [];

    if (sessionItemsJson) {
        try {
            sessionItems = deduplicateMaterials(JSON.parse(sessionItemsJson));
        } catch (e) { }
    }

    const calidadesList = getCalidades();
    const validCalidadesMap = new Map(calidadesList.map(c => [c.nombre.trim().toLowerCase(), c.nombre]));
    const defaultCalidadName = calidadesList.find(c => c.habilitado !== false)?.nombre || calidadesList[0]?.nombre || 'Solvente';

    const rawCalidad = (material.calidad || '').trim();
    let normalizedCalidad = defaultCalidadName;
    if (rawCalidad) {
        const lower = rawCalidad.toLowerCase();
        if (validCalidadesMap.has(lower)) {
            normalizedCalidad = validCalidadesMap.get(lower)!;
        } else {
            const match = calidadesList.find(c => lower.includes(c.nombre.toLowerCase()) || c.nombre.toLowerCase().includes(lower));
            normalizedCalidad = match ? match.nombre : defaultCalidadName;
        }
    }

    const targetCode = (material.codigo || '').trim().toUpperCase();
    const targetDesc = (material.descripcion || '').trim().toLowerCase();

    const existingIndex = sessionItems.findIndex(m =>
        (material.id !== undefined && material.id !== null && String(m.id) === String(material.id)) ||
        (targetCode && (m.codigo || '').trim().toUpperCase() === targetCode) ||
        (targetDesc && (m.descripcion || '').trim().toLowerCase() === targetDesc)
    );
    const prevStock = existingIndex !== -1 ? (sessionItems[existingIndex].stockActual || 0) : undefined;
    let result: Material;

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = {
            ...sessionItems[existingIndex],
            ...material,
            id: sessionItems[existingIndex].id,
            calidad: normalizedCalidad
        } as Material;
        result = sessionItems[existingIndex];
    } else {
        const newMaterial: Material = {
            id: material.id || Math.floor(Math.random() * 900000) + 100000,
            codigo: material.codigo || 'NEW',
            descripcion: material.descripcion || '',
            calidad: normalizedCalidad,
            tipo: material.tipo || 'Sustrato',
            tipoCobro: material.tipoCobro || 'm2',
            preciosPorAncho: material.preciosPorAncho,
            precioM2: material.precioM2 || 0,
            ancho: material.ancho || 1.0,
            habilitado: material.habilitado !== undefined ? material.habilitado : true,
            stockActual: material.stockActual || 0,
            stockMinimo: material.stockMinimo || 10
        };

        sessionItems.unshift(newMaterial);
        result = newMaterial;
    }

    const cleanedItems = deduplicateMaterials(sessionItems);
    localStorage.setItem(SESSION_MATERIALES_KEY, JSON.stringify(cleanedItems));
    syncSave('materiales', result);

    // Registrar movimiento de stock si cambió la cantidad
    const newStock = result.stockActual || 0;
    if (existingIndex === -1) {
        if (newStock > 0) {
            saveMovimientoStock({
                materialId: result.id,
                materialCodigo: result.codigo,
                materialDescripcion: result.descripcion,
                tipo: 'inicial',
                cantidad: newStock,
                stockAnterior: 0,
                stockNuevo: newStock,
                usuario: getCurrentUserName()
            });
        }
    } else if (prevStock !== undefined && newStock !== prevStock) {
        saveMovimientoStock({
            materialId: result.id,
            materialCodigo: result.codigo,
            materialDescripcion: result.descripcion,
            tipo: newStock > prevStock ? 'ingreso' : 'egreso',
            cantidad: Math.abs(newStock - prevStock),
            stockAnterior: prevStock,
            stockNuevo: newStock,
            usuario: getCurrentUserName()
        });
    }

    try { window.dispatchEvent(new CustomEvent('luxius-materials-updated')); } catch (e) { }

    return result;
}

export function deleteMaterial(id: number) {
    const sessionItemsJson = localStorage.getItem(SESSION_MATERIALES_KEY);
    if (sessionItemsJson) {
        try {
            let sessionItems = JSON.parse(sessionItemsJson) as Material[];
            sessionItems = sessionItems.filter(m => m.id !== id);
            localStorage.setItem(SESSION_MATERIALES_KEY, JSON.stringify(sessionItems));
        } catch (e) { }
    }
    syncDelete('materiales', id);
    try { window.dispatchEvent(new CustomEvent('luxius-materials-updated')); } catch (e) { }
}

export function getMaterialById(id: number): Material | undefined {
    return getMateriales().find(m => m.id === id);
}

export function getMaterialByCodigo(codigo: string): Material | undefined {
    return getMateriales().find(m => m.codigo === codigo);
}

export function getMaterialesByCalidad(calidadId: number): Material[] {
    const calidad = getCalidadById(calidadId);
    if (!calidad) return [];
    return getMateriales().filter(m => m.calidad === calidad.nombre);
}

function getCurrentUserName(): string {
    try {
        const raw = localStorage.getItem('luxius-auth-v6');
        if (raw) {
            const parsed = JSON.parse(raw);
            const name = parsed?.state?.user?.name || parsed?.state?.user?.username;
            if (name) return name;
        }
    } catch (e) { }
    return 'Sistema';
}

export function getMovimientosStock(): MovimientoStock[] {
    const raw = localStorage.getItem(SESSION_MOV_STOCK_KEY);
    if (raw) {
        try { return JSON.parse(raw) as MovimientoStock[]; } catch (e) { }
    }
    return [];
}

export function saveMovimientoStock(mov: Partial<MovimientoStock>): MovimientoStock {
    const movs = getMovimientosStock();
    const newMov: MovimientoStock = {
        id: mov.id || Math.floor(Math.random() * 900000) + 1000,
        materialId: mov.materialId || 0,
        materialCodigo: mov.materialCodigo || '',
        materialDescripcion: mov.materialDescripcion || '',
        tipo: mov.tipo || 'ajuste',
        cantidad: Math.abs(mov.cantidad || 0),
        stockAnterior: mov.stockAnterior ?? 0,
        stockNuevo: mov.stockNuevo ?? 0,
        fecha: mov.fecha || new Date().toISOString(),
        usuario: mov.usuario || 'Sistema',
        observacion: mov.observacion
    };
    movs.unshift(newMov);
    localStorage.setItem(SESSION_MOV_STOCK_KEY, JSON.stringify(movs));
    try { window.dispatchEvent(new CustomEvent('luxius-stock-updated')); } catch (e) { }
    return newMov;
}

export const DEFAULT_CALIDADES: Calidad[] = [
    { id: 1, nombre: 'ECO', descripcion: 'Tintas ecológicas de alta duración', habilitado: true, orden: 1 },
    { id: 2, nombre: 'Estándar', descripcion: 'Calidad estándar 720 DPI', habilitado: true, orden: 2 },
    { id: 3, nombre: 'Alta', descripcion: 'Alta calidad 1440 DPI', habilitado: true, orden: 3 },
    { id: 4, nombre: 'UV', descripcion: 'Impresión UV cama plana y rollo', habilitado: true, orden: 4 },
    { id: 5, nombre: 'Fotográfica', descripcion: 'Impresión fotográfica de alta resolución', habilitado: true, orden: 5 },
    { id: 6, nombre: 'General', descripcion: 'Calidad estándar / insumos generales', habilitado: true, orden: 6 }
];

export function getCalidades(): Calidad[] {
    if (isDemoMode()) {
        return [...DEMO_CALIDADES];
    }

    const sessionItemsJson = localStorage.getItem(SESSION_CALIDADES_KEY);
    const hiddenItemsJson = localStorage.getItem(HIDDEN_CALIDADES_KEY);

    let sessionItems: Calidad[] = [];
    let hiddenIds: number[] = [];

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson) as Calidad[];
        } catch (e) { }
    }

    if (!Array.isArray(sessionItems) || sessionItems.length === 0) {
        sessionItems = [...DEFAULT_CALIDADES];
        try { localStorage.setItem(SESSION_CALIDADES_KEY, JSON.stringify(sessionItems)); } catch (e) { }
    }

    if (hiddenItemsJson) {
        try {
            hiddenIds = JSON.parse(hiddenItemsJson) as number[];
        } catch (e) { }
    }

    const hiddenSet = new Set(hiddenIds);
    const filteredSession = sessionItems.filter(i => !hiddenSet.has(i.id));

    if (filteredSession.length === 0) {
        return DEFAULT_CALIDADES;
    }

    return filteredSession;
}

export function saveCalidad(calidad: Partial<Calidad>): Calidad {
    const sessionItemsJson = localStorage.getItem(SESSION_CALIDADES_KEY);
    let sessionItems: Calidad[] = [];

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson);
        } catch (e) { }
    }

    if (!Array.isArray(sessionItems) || sessionItems.length === 0) {
        sessionItems = [...DEFAULT_CALIDADES];
    }

    const existingIndex = sessionItems.findIndex(c => String(c.id) === String(calidad.id));
    let result: Calidad;

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = { ...sessionItems[existingIndex], ...calidad } as Calidad;
        result = sessionItems[existingIndex];
    } else {
        const newCalidad: Calidad = {
            id: calidad.id || Math.floor(Math.random() * 900000) + 100000,
            nombre: calidad.nombre || 'Nueva Calidad',
            descripcion: calidad.descripcion || '',
            habilitado: calidad.habilitado !== undefined ? calidad.habilitado : true,
            orden: calidad.orden || 0
        };
        sessionItems.unshift(newCalidad);
        result = newCalidad;
    }

    localStorage.setItem(SESSION_CALIDADES_KEY, JSON.stringify(sessionItems));
    syncSave('calidades', result);
    return result;
}

export function deleteCalidad(id: number) {
    let sessionItems: Calidad[] = [];
    const raw = localStorage.getItem(SESSION_CALIDADES_KEY);
    if (raw) {
        try { sessionItems = JSON.parse(raw) as Calidad[]; } catch (e) { }
    }
    if (!Array.isArray(sessionItems) || sessionItems.length === 0) {
        sessionItems = [...DEFAULT_CALIDADES];
    }
    sessionItems = sessionItems.filter(c => c.id !== id);
    localStorage.setItem(SESSION_CALIDADES_KEY, JSON.stringify(sessionItems));
    syncDelete('calidades', id);
}

export function getCalidadById(id: number): Calidad | undefined {
    return getCalidades().find(c => c.id === id);
}
