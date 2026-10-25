/**
 * Luxius System - Workshop Machines Data Domain
 */

import type { Maquina } from './types';
import {
    isDemoMode,
    DEMO_MAQUINAS_KEY,
    SESSION_MAQUINAS_KEY,
    HIDDEN_MAQUINAS_KEY
} from './cache';
import { syncSave, syncDelete } from './client';

export const DEFAULT_MAQUINAS: Maquina[] = [
    {
        id: 1,
        nombre: 'Roland RS-640',
        tipo: 'Plotter Ecosolvente',
        categoria: 'impresion',
        anchoMaximo: 1.60,
        ancho: 1.60,
        estado: 'online',
        habilitada: true
    },
    {
        id: 2,
        nombre: 'Roland SolJet Pro III',
        tipo: 'Plotter Gran Formato',
        categoria: 'impresion',
        anchoMaximo: 1.90,
        ancho: 1.90,
        estado: 'online',
        habilitada: true
    },
    {
        id: 3,
        nombre: 'Mimaki CG-60SR',
        tipo: 'Plotter de Corte',
        categoria: 'corte',
        anchoMaximo: 0.60,
        ancho: 0.60,
        estado: 'online',
        habilitada: true
    }
];

export function isCutMachine(m: Maquina): boolean {
    return m.categoria === 'corte' || (!!m.tipo && m.tipo.toLowerCase().includes('corte'));
}

export function getPrintMachines(): Maquina[] {
    return getMaquinas().filter(m => !isCutMachine(m));
}

export function getCutMachines(): Maquina[] {
    return getMaquinas().filter(m => isCutMachine(m));
}

function healMaquinasList(list: Maquina[]): { list: Maquina[], changed: boolean } {
    if (!Array.isArray(list) || list.length === 0) {
        return { list: [...DEFAULT_MAQUINAS], changed: true };
    }
    let changed = false;
    const cloned = list.map(m => ({ ...m }));

    // Identificar impresoras (no de corte)
    const printMachines = cloned.filter(m => !isCutMachine(m));

    // Si la segunda impresora tiene ID 2 o repite el nombre de la primera o dice RS-640:
    if (printMachines.length >= 2) {
        const m1 = printMachines[0];
        const m2 = printMachines[1];
        if (m2.id === 2 || m2.nombre === m1.nombre || m2.nombre.toLowerCase().includes('640') || m2.anchoMaximo === 1.90) {
            if (m2.nombre !== 'Roland SolJet Pro III' || m2.anchoMaximo !== 1.90) {
                m2.nombre = 'Roland SolJet Pro III';
                m2.anchoMaximo = 1.90;
                m2.ancho = 1.90;
                m2.tipo = 'Plotter Gran Formato';
                m2.categoria = 'impresion';
                changed = true;
            }
        }
    }

    // Asegurar que la primera impresora sea RS-640 (1.60m)
    if (printMachines.length >= 1) {
        const m1 = printMachines[0];
        if (!m1.nombre || m1.nombre.includes('SolJet')) {
            m1.nombre = 'Roland RS-640';
            m1.anchoMaximo = 1.60;
            m1.ancho = 1.60;
            changed = true;
        }
    }

    // Asegurar que el Plotter de corte Mimaki CG-60SR esté presente
    const hasCutter = cloned.some(m => isCutMachine(m) || m.id === 3 || m.nombre.toLowerCase().includes('mimaki'));
    if (!hasCutter) {
        cloned.push({
            id: 3,
            nombre: 'Mimaki CG-60SR',
            tipo: 'Plotter de Corte',
            categoria: 'corte',
            anchoMaximo: 0.60,
            ancho: 0.60,
            estado: 'online',
            habilitada: true
        });
        changed = true;
    }

    return { list: cloned, changed };
}

export function getMaquinas(): Maquina[] {
    if (isDemoMode()) {
        const demoMaqJson = localStorage.getItem(DEMO_MAQUINAS_KEY);
        if (demoMaqJson) {
            try {
                const list = JSON.parse(demoMaqJson) as Maquina[];
                if (Array.isArray(list) && list.length > 0) {
                    const { list: healed, changed } = healMaquinasList(list);
                    if (changed) {
                        try { localStorage.setItem(DEMO_MAQUINAS_KEY, JSON.stringify(healed)); } catch (_) {}
                    }
                    return healed;
                }
            } catch (e) { }
        }
        localStorage.setItem(DEMO_MAQUINAS_KEY, JSON.stringify(DEFAULT_MAQUINAS));
        return [...DEFAULT_MAQUINAS];
    }

    const sessionItemsJson = localStorage.getItem(SESSION_MAQUINAS_KEY);
    const hiddenItemsJson = localStorage.getItem(HIDDEN_MAQUINAS_KEY);

    let hiddenIds: number[] = [];
    if (hiddenItemsJson) {
        try { hiddenIds = JSON.parse(hiddenItemsJson) as number[]; } catch (e) { }
    }

    if (sessionItemsJson) {
        try {
            const items = JSON.parse(sessionItemsJson) as Maquina[];
            if (items && Array.isArray(items) && items.length > 0) {
                const { list: healed, changed } = healMaquinasList(items);
                if (changed) {
                    try { localStorage.setItem(SESSION_MAQUINAS_KEY, JSON.stringify(healed)); } catch (_) {}
                }
                return healed.filter(m => !hiddenIds.includes(m.id));
            }
        } catch (e) { }
    }

    // Default: Roland RS-640 (1.60m), Roland SolJet Pro III (1.90m) y Mimaki CG-60SR (0.60m)
    return DEFAULT_MAQUINAS.filter(m => !hiddenIds.includes(m.id));
}

export function getMaquinaById(id: number): Maquina | undefined {
    return getMaquinas().find(m => m.id === id);
}

export function getMaquinasOnline(): Maquina[] {
    return getMaquinas().filter(m => m.habilitada && m.estado === 'online');
}

export function saveMaquina(maquina: Partial<Maquina>): Maquina {
    const sessionItems = getMaquinas();

    const existingIndex = sessionItems.findIndex(m => String(m.id) === String(maquina.id));
    let result: Maquina;

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = { ...sessionItems[existingIndex], ...maquina } as Maquina;
        result = sessionItems[existingIndex];
    } else {
        const newMaquina: Maquina = {
            id: maquina.id || Math.floor(Math.random() * 900000) + 100000,
            nombre: maquina.nombre || 'Nueva Máquina',
            tipo: maquina.tipo || 'Impresora',
            anchoMaximo: maquina.anchoMaximo || 1.60,
            categoria: maquina.categoria || (maquina.tipo?.toLowerCase().includes('corte') ? 'corte' : 'impresion'),
            estado: maquina.estado || 'online',
            habilitada: maquina.habilitada !== undefined ? maquina.habilitada : true
        };
        if (maquina.ancho !== undefined) newMaquina.ancho = maquina.ancho;

        sessionItems.unshift(newMaquina);
        result = newMaquina;
    }

    localStorage.setItem(SESSION_MAQUINAS_KEY, JSON.stringify(sessionItems));
    syncSave('maquinas', result);
    return result;
}

export function deleteMaquina(id: number) {
    let sessionItems = getMaquinas();
    sessionItems = sessionItems.filter(m => m.id !== id);
    localStorage.setItem(SESSION_MAQUINAS_KEY, JSON.stringify(sessionItems));
    syncDelete('maquinas', id);
}

export interface PrinterLiveEvent {
    job_name: string;
    event_type: string;
    size_str: string;
    area_m2: number;
    ink_ml: string;
    speed_str: string;
    time_str: string;
    error_code: string;
    timestamp: string;
}

export interface PrinterLiveStatus {
    machine_id: string;
    machine_name: string;
    status: 'online' | 'offline' | 'printing' | 'error' | 'idle' | 'ready';
    is_online: boolean;
    last_seen: string | null;
    current_job: PrinterLiveEvent | null;
    last_completed_job?: PrinterLiveEvent | null;
    recent_events: PrinterLiveEvent[];
}

import { API_URL, fetchWithTimeout } from './client';

export async function fetchPrinterLiveStatus(): Promise<PrinterLiveStatus[]> {
    try {
        const res = await fetchWithTimeout(`${API_URL}/printer/status`, {}, 8000);
        if (res.ok) {
            const data = await res.json();
            if (data && data.ok && Array.isArray(data.printers)) {
                return data.printers;
            }
        }
    } catch {
        // Silencioso si no hay conexión o offline
    }
    return [];
}
