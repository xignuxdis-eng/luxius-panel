/**
 * Luxius System - Clients Data Domain
 */

import type { Cliente } from './types';
import {
    isDemoMode,
    DEMO_CLIENTES_KEY,
    SESSION_CLIENTES_KEY,
    refreshCollection
} from './cache';
import { DEMO_CLIENTES } from '../demoSandboxData';
import { API_URL, getAuthHeaders, fetchWithTimeout, syncDelete } from './client';

export function getClientes(): Cliente[] {
    if (isDemoMode()) {
        const demoClientesJson = localStorage.getItem(DEMO_CLIENTES_KEY);
        if (demoClientesJson) {
            try {
                const list = JSON.parse(demoClientesJson) as Cliente[];
                if (Array.isArray(list) && list.length > 0) return list;
            } catch (e) { }
        }
        localStorage.setItem(DEMO_CLIENTES_KEY, JSON.stringify(DEMO_CLIENTES));
        return [...DEMO_CLIENTES];
    }

    const versionKey = 'luxius_db_clientes_v4';
    if (localStorage.getItem(versionKey) !== 'v4') {
        localStorage.removeItem(SESSION_CLIENTES_KEY);
        localStorage.setItem(versionKey, 'v4');
    }

    const sessionItemsJson = localStorage.getItem(SESSION_CLIENTES_KEY);

    if (sessionItemsJson) {
        try {
            const list = JSON.parse(sessionItemsJson) as Cliente[];
            if (Array.isArray(list)) {
                return list;
            }
        } catch (e) { }
    }

    // Trigger async server fetch in background if empty
    refreshCollection('clientes');
    return [];
}

export async function saveCliente(cliente: Partial<Cliente>): Promise<Cliente> {
    if (isDemoMode()) {
        const demoClientesJson = localStorage.getItem(DEMO_CLIENTES_KEY) || '[]';
        let demoClientes: Cliente[] = [];
        try { demoClientes = JSON.parse(demoClientesJson); } catch (e) { }
        if (!demoClientes.length) demoClientes = [...DEMO_CLIENTES];

        const existingIndex = demoClientes.findIndex(c => String(c.id) === String(cliente.id));
        let saved: Cliente;

        if (existingIndex !== -1) {
            saved = { ...demoClientes[existingIndex], ...cliente } as Cliente;
            demoClientes[existingIndex] = saved;
        } else {
            saved = {
                id: cliente.id || Math.floor(Math.random() * 900000) + 100000,
                nombre: cliente.nombre || 'Nuevo Cliente Demo',
                empresa: cliente.empresa || '',
                cuit: cliente.cuit || '30-00000000-0',
                telefono: cliente.telefono || '11 0000-0000',
                email: cliente.email || 'demo@cliente.com',
                direccion: cliente.direccion || '',
                condVenta: cliente.condVenta || 'EFECTIVO',
                habilitado: cliente.habilitado !== undefined ? cliente.habilitado : true,
                vip: cliente.vip || false,
                categoria: cliente.categoria || 'Agencia',
                responsable: cliente.responsable || 'Mostrador',
                ...cliente
            } as Cliente;
            demoClientes.unshift(saved);
        }

        try {
            localStorage.setItem(DEMO_CLIENTES_KEY, JSON.stringify(demoClientes));
        } catch (e) { }

        return saved;
    }

    const sessionItemsJson = localStorage.getItem(SESSION_CLIENTES_KEY);
    let sessionItems: Cliente[] = [];

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson);
        } catch (e) { }
    }

    const existingIndex = sessionItems.findIndex(c => String(c.id) === String(cliente.id));
    let result: Cliente;
    const isExisting = Boolean(cliente.id && existingIndex !== -1);

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = { ...sessionItems[existingIndex], ...cliente } as Cliente;
        result = sessionItems[existingIndex];
    } else {
        const newCliente: Cliente = {
            id: cliente.id || Math.floor(Math.random() * 900000) + 100000,
            nombre: cliente.nombre || '',
            empresa: cliente.empresa || '',
            cuit: cliente.cuit || '',
            telefono: cliente.telefono || '',
            email: cliente.email || '',
            direccion: cliente.direccion || '',
            condVenta: cliente.condVenta || 'EFECTIVO',
            habilitado: cliente.habilitado !== undefined ? cliente.habilitado : true,
            vip: cliente.vip || false,
            categoria: cliente.categoria || 'Consumidor Final',
            responsable: cliente.responsable || 'Mostrador',
            fechaInicio: cliente.fechaInicio || new Date().toISOString().split('T')[0],
            username: cliente.username || '',
            preciosEspeciales: cliente.preciosEspeciales || {}
        };
        sessionItems.unshift(newCliente);
        result = newCliente;
    }

    localStorage.setItem(SESSION_CLIENTES_KEY, JSON.stringify(sessionItems));
    
    try {
        const method = isExisting ? 'PUT' : 'POST';
        const url = isExisting ? `${API_URL}/clientes/${result.id}` : `${API_URL}/clientes`;
        
        // Si es un nuevo cliente, evitar enviar un ID aleatorio ficticio para que el backend asigne el secuencial
        const payload: any = { ...result };
        if (!isExisting) {
            delete payload.id;
        }

        const res = await fetchWithTimeout(url, {
            method,
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        }, 10000);
        
        if (res.ok) {
            const serverCliente = await res.json();
            try {
                const currentLocalStr = localStorage.getItem(SESSION_CLIENTES_KEY) || '[]';
                const currentLocal: Cliente[] = JSON.parse(currentLocalStr);
                const localIdx = currentLocal.findIndex(c => String(c.id) === String(result.id));
                if (localIdx >= 0) {
                    currentLocal[localIdx] = { ...currentLocal[localIdx], ...serverCliente };
                    localStorage.setItem(SESSION_CLIENTES_KEY, JSON.stringify(currentLocal));
                    result = currentLocal[localIdx];
                } else {
                    currentLocal.unshift(serverCliente);
                    localStorage.setItem(SESSION_CLIENTES_KEY, JSON.stringify(currentLocal));
                    result = serverCliente;
                }
            } catch(e) { }
        } else {
            console.warn(`[Sync] Save failed clientes: ${res.status}`);
        }
    } catch (e) {
        console.error(`[Sync] Network error [clientes]:`, e);
    }
    
    return result;
}

export function deleteCliente(id: number) {
    const sessionItemsJson = localStorage.getItem(SESSION_CLIENTES_KEY);
    if (sessionItemsJson) {
        try {
            let sessionItems = JSON.parse(sessionItemsJson) as Cliente[];
            sessionItems = sessionItems.filter(c => c.id !== id);
            localStorage.setItem(SESSION_CLIENTES_KEY, JSON.stringify(sessionItems));
        } catch (e) { }
    }
    syncDelete('clientes', id);
}

export function getClienteById(id: number): Cliente | undefined {
    return getClientes().find(c => c.id === id);
}

export function getClientesActivos(): Cliente[] {
    return getClientes().filter(c => c.habilitado);
}
