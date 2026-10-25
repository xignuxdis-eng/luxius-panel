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
import { DEMO_MAQUINAS } from '../demoSandboxData';
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

export function getMaquinas(): Maquina[] {
    if (isDemoMode()) {
        const demoMaqJson = localStorage.getItem(DEMO_MAQUINAS_KEY);
        if (demoMaqJson) {
            try {
                const list = JSON.parse(demoMaqJson) as Maquina[];
                if (Array.isArray(list) && list.length > 0) return list;
            } catch (e) { }
        }
        localStorage.setItem(DEMO_MAQUINAS_KEY, JSON.stringify(DEMO_MAQUINAS));
        return [...DEMO_MAQUINAS];
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
                return items.filter(m => !hiddenIds.includes(m.id));
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
