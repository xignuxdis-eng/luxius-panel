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
            if (items && Array.isArray(items)) {
                return items.filter(m => !hiddenIds.includes(m.id));
            }
        } catch (e) { }
    }

    // Sin datos mock — devolver vacío. El usuario agrega máquinas manualmente.
    return [];
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
