/**
 * Luxius System - Orders (OTs) Data Domain
 */

import type { Order, UpdateBatchGroupParams } from './types';
import { isDemoMode, DEMO_ORDENES_KEY, HIDDEN_ORDENES_KEY } from './cache';
import { DEMO_ORDENES } from '../demoSandboxData';
import { API_URL, fetchWithTimeout } from './client';

export type { UpdateBatchGroupParams };

export function matchesOrderId(order: { id?: number | string, ot?: string, uuid?: string }, targetId: number | string): boolean {
    if (!order || targetId === undefined || targetId === null) return false;
    const targetStr = String(targetId).trim().toLowerCase();
    const targetClean = targetStr.replace(/^ot-/i, '');
    const targetHex = targetClean.replace(/-/g, '');

    const idStr = String(order.id || '').trim().toLowerCase();
    const idClean = idStr.replace(/^ot-/i, '');

    const otStr = String(order.ot || '').trim().toLowerCase();
    const otClean = otStr.replace(/^ot-/i, '');

    const uuidStr = String((order as any).uuid || '').trim().toLowerCase();
    const uuidHex = uuidStr.replace(/-/g, '');

    return (
        idStr === targetStr ||
        idClean === targetClean ||
        otStr === targetStr ||
        otClean === targetClean ||
        (uuidStr !== '' && (uuidStr === targetStr || uuidStr === targetClean)) ||
        (uuidHex !== '' && targetHex !== '' && (
            uuidHex === targetHex ||
            (targetHex.length >= 6 && uuidHex.startsWith(targetHex)) ||
            (uuidHex.length >= 6 && targetHex.startsWith(uuidHex))
        ))
    );
}

export async function getOrdenes(forceRefresh = false): Promise<Order[]> {
    if (isDemoMode()) {
        const demoOrdersJson = localStorage.getItem(DEMO_ORDENES_KEY);
        if (demoOrdersJson) {
            try {
                const list = JSON.parse(demoOrdersJson);
                if (Array.isArray(list) && list.length > 0) return list;
            } catch (e) { }
        }
        localStorage.setItem(DEMO_ORDENES_KEY, JSON.stringify(DEMO_ORDENES));
        return [...DEMO_ORDENES];
    }

    const localOrdersJson = localStorage.getItem('luxius_session_ordenes') || '[]';
    let localOrders: Order[] = [];
    try {
        localOrders = JSON.parse(localOrdersJson);
    } catch (e) { }

    // Si se guardó hace menos de 2 segundos y no se forza recarga, usar local para evitar parpadeos
    const lastSaveTs = Number(localStorage.getItem('luxius_ordenes_last_save') || '0');
    const timeSinceLastSave = Date.now() - lastSaveTs;
    if (!forceRefresh && timeSinceLastSave < 2000 && localOrders.length > 0) {
        return localOrders;
    }

    try {
        const response = await fetchWithTimeout(`${API_URL}/orders`, {}, 35000);
        if (response.status === 304) {
            // ETag validó que no hubo cambios en el servidor
            return localOrders;
        }
        if (response.ok) {
            const apiOrders = await response.json();
            if (Array.isArray(apiOrders)) {
                // El servidor es la fuente única y autoritativa de verdad
                localStorage.setItem('luxius_session_ordenes', JSON.stringify(apiOrders));
                localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
                return apiOrders;
            }
        }
    } catch (error) {
        console.warn('[db] Falló la obtención remota de órdenes, usando copia offline:', error);
    }
    return localOrders;
}

export function getNextSequentialId(existingOrders: Order[]): number {
    let maxId = 0;
    if (Array.isArray(existingOrders)) {
        for (const o of existingOrders) {
            const idNum = Number(o.id) || 0;
            let otNum = 0;
            if (o.ot) {
                const match = String(o.ot).match(/\d+/);
                if (match) otNum = parseInt(match[0], 10);
            }
            if (idNum > 0 && idNum < 500000) maxId = Math.max(maxId, idNum);
            if (otNum > 0 && otNum < 500000) maxId = Math.max(maxId, otNum);
        }
    }
    return maxId > 0 ? maxId + 1 : 1;
}

export async function saveOrden(order: Partial<Order>): Promise<Order> {
    if (isDemoMode()) {
        const demoOrdersJson = localStorage.getItem(DEMO_ORDENES_KEY) || '[]';
        let demoOrders: Order[] = [];
        try { demoOrders = JSON.parse(demoOrdersJson); } catch (e) { }
        if (!demoOrders.length) demoOrders = [...DEMO_ORDENES];

        const targetLookup = (order as any).uuid || order.id || order.ot;
        const existingIdx = targetLookup !== undefined && targetLookup !== null
            ? demoOrders.findIndex(o => matchesOrderId(o, targetLookup))
            : -1;

        const nowIso = new Date().toISOString();
        let saved: Order;

        if (existingIdx >= 0) {
            const existing = demoOrders[existingIdx];
            saved = {
                ...existing,
                ...order,
                updatedAt: nowIso,
            } as Order;
            demoOrders[existingIdx] = saved;
        } else {
            const nextSeqId = order.id || getNextSequentialId(demoOrders);
            const otCode = order.ot || `OT-${nextSeqId}`;
            saved = {
                id: Number(nextSeqId),
                ot: otCode,
                nombreTarea: order.nombreTarea || (order as any).observaciones || 'Trabajo Demo',
                descripcion: order.descripcion || order.nombreTarea || 'Trabajo Demo',
                clientId: Number(order.clientId) || 90001,
                clienteNombre: order.clienteNombre || 'Agencia Creativa Aurora',
                material: order.material || 'Lona Frontlight 510g Brillante 3.20m',
                calidad: order.calidad || 'Solvente Gran Formato',
                ancho: Number(order.ancho) || 1.0,
                alto: Number(order.alto) || 1.0,
                copias: Number(order.copias) || 1,
                subtotal: Number(order.subtotal) || 15000,
                status: (order.status || 'orden') as any,
                category: (order.category || 'impresion') as any,
                accesorios: order.accesorios || [],
                laminado: Boolean(order.laminado),
                bordado: Boolean(order.bordado),
                panelizado: Boolean(order.panelizado),
                portabanners: Number(order.portabanners) || 0,
                demasias: order.demasias || 0,
                envio: order.envio || 'Retira por taller',
                emergencia: Boolean(order.emergencia),
                fechaCreacion: order.fechaCreacion || nowIso,
                createdAt: (order as any).createdAt || nowIso,
                fechaEntrega: order.fechaEntrega || nowIso.split('T')[0],
                observaciones: order.observaciones || '',
                observaciones2: order.observaciones2 || '',
                archivos: order.archivos || ['https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&auto=format&fit=crop'],
                archivosOriginales: order.archivosOriginales || ['archivo_demo.pdf'],
                ...order,
            } as Order;
            demoOrders.unshift(saved);
        }

        try {
            localStorage.setItem(DEMO_ORDENES_KEY, JSON.stringify(demoOrders));
        } catch (e) { }

        return saved;
    }

    const localOrdersJson = localStorage.getItem('luxius_session_ordenes') || '[]';
    let localOrders: Order[] = [];
    try { localOrders = JSON.parse(localOrdersJson); } catch (e) { }

    const now = new Date();

    // 1. Buscar si ya existe la orden localmente para preservar especificaciones, archivos y detalles
    const targetLookup = (order as any).uuid || order.id || order.ot;
    const existingIdx = targetLookup !== undefined && targetLookup !== null
        ? localOrders.findIndex(o => matchesOrderId(o, targetLookup))
        : -1;
    const existing = existingIdx >= 0 ? localOrders[existingIdx] : undefined;

    const nextSeqId = order.id || existing?.id || getNextSequentialId(localOrders);
    const otCode = order.ot || existing?.ot || `OT-${nextSeqId}`;

    // Si ya existe la orden, mezclar encima de existing para NUNCA vaciar archivos, materiales ni subtotales
    const newOrder: Order = existing ? {
        ...existing,
        ...order,
        id: existing.id || order.id || Number(nextSeqId),
        ot: existing.ot || order.ot || otCode,
        status: (order.status || existing.status || 'orden') as any,
        category: (order.category || existing.category || 'impresion') as any,
        updatedAt: now.toISOString(),
    } : {
        id: Number(nextSeqId) || getNextSequentialId(localOrders),
        ot: otCode,
        nombreTarea: order.nombreTarea || (order as any).observaciones || '',
        clientId: Number(order.clientId) || 1,
        clienteNombre: order.clienteNombre || 'Cliente',
        material: order.material || 'Lona Front',
        calidad: order.calidad || 'Standard',
        ancho: Number(order.ancho) || 1.0,
        alto: Number(order.alto) || 1.0,
        copias: Number(order.copias) || 1,
        subtotal: Number(order.subtotal) || 0,
        status: (order.status || 'orden') as any,
        category: (order.category || 'impresion') as any,
        archivos: order.archivos || [],
        archivosOriginales: order.archivosOriginales || [],
        fechaCreacion: order.fechaCreacion || now.toISOString(),
        createdAt: (order as any).createdAt || now.toISOString(),
        fechaEntrega: order.fechaEntrega || now.toISOString().split('T')[0],
        ...order,
    } as Order;

    // Handle HIDDEN_ORDENES_KEY: clear from hidden list if order is being saved/restored
    const hiddenJson = localStorage.getItem(HIDDEN_ORDENES_KEY) || '[]';
    try {
        let hiddenIds: (number | string)[] = JSON.parse(hiddenJson);
        const before = hiddenIds.length;
        hiddenIds = hiddenIds.filter(id => !matchesOrderId({ id: id as any, ot: String(id) }, newOrder.id));
        if (hiddenIds.length !== before) {
            localStorage.setItem(HIDDEN_ORDENES_KEY, JSON.stringify(hiddenIds));
        }
    } catch (e) { }

    if (existingIdx >= 0) {
        localOrders[existingIdx] = newOrder;
    } else {
        const idx = localOrders.findIndex(o => matchesOrderId(o, newOrder.id));
        if (idx >= 0) {
            localOrders[idx] = newOrder;
        } else {
            localOrders.unshift(newOrder);
        }
    }
    
    try {
        localStorage.setItem('luxius_session_ordenes', JSON.stringify(localOrders));
        localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
    } catch (e) {
        console.warn('[db] QuotaExceededError en localStorage. Sanitizando DataURLs pesados:', e);
        const sanitized = localOrders.map(o => ({
            ...o,
            archivos: (o.archivos || []).map((f, i) => f.startsWith('data:') && f.length > 50000 ? (o.archivosOriginales?.[i] || 'archivo.eps') : f)
        }));
        try {
            localStorage.setItem('luxius_session_ordenes', JSON.stringify(sanitized));
            localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
        } catch (e2) {
            console.error('[db] Error crítico en localStorage setItem:', e2);
        }
    }

    try {
        const backendTargetId = (newOrder as any).uuid || (existing as any)?.uuid || (order as any).uuid || order.id || existing?.id;
        const method = backendTargetId ? 'PUT' : 'POST';
        const url = backendTargetId ? `${API_URL}/orders/${backendTargetId}` : `${API_URL}/orders`;

        const payloadToSend = backendTargetId ? { ...order, id: backendTargetId } : newOrder;

        const response = await fetchWithTimeout(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadToSend),
        }, 60000);

        if (response.ok) {
            const serverOrder = await response.json();
            
            try {
                const currentLocalStr = localStorage.getItem('luxius_session_ordenes') || '[]';
                const currentLocal: Order[] = JSON.parse(currentLocalStr);
                const localIdx = currentLocal.findIndex(o => matchesOrderId(o, (serverOrder as any).uuid || serverOrder.id || serverOrder.ot || (newOrder as any).uuid || newOrder.id));
                if (localIdx >= 0) {
                    currentLocal[localIdx] = { ...currentLocal[localIdx], ...serverOrder };
                    localStorage.setItem('luxius_session_ordenes', JSON.stringify(currentLocal));
                    localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
                }
            } catch(e) { }

            return serverOrder;
        } else {
            console.error('[db] API saveOrden respondió con código no-ok:', response.status);
        }
    } catch (error) {
        console.warn('[db] API saveOrden falló o timeout, la orden se conservará localmente:', error);
    }

    return newOrder;
}

export async function deleteOrden(id: number | string): Promise<boolean> {
    if (id === undefined || id === null) return false;

    if (isDemoMode()) {
        const demoOrdersJson = localStorage.getItem(DEMO_ORDENES_KEY) || '[]';
        try {
            let demoOrders: Order[] = JSON.parse(demoOrdersJson);
            demoOrders = demoOrders.filter(o => !matchesOrderId(o, id));
            localStorage.setItem(DEMO_ORDENES_KEY, JSON.stringify(demoOrders));
        } catch (e) { }
        return true;
    }

    // 1. Remove from local storage session orders
    const localOrdersJson = localStorage.getItem('luxius_session_ordenes') || '[]';
    try {
        let localOrders: Order[] = JSON.parse(localOrdersJson);
        localOrders = localOrders.filter(o => !matchesOrderId(o, id));
        localStorage.setItem('luxius_session_ordenes', JSON.stringify(localOrders));
        localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
    } catch (e) { }

    // 2. Delete from remote backend API
    try {
        await fetchWithTimeout(`${API_URL}/orders/${id}`, { method: 'DELETE' }, 45000);
    } catch (error) {
        console.warn('[db] API deleteOrden falló:', error);
    }
    return true;
}

export async function saveBatchOrders(
    action: 'delete' | 'update' | 'restore',
    ids: (number | string)[],
    data?: Partial<Order>,
    items?: (Partial<Order> & { id: number | string })[]
): Promise<{ success: boolean, count: number }> {
    if (!ids || ids.length === 0) return { success: true, count: 0 };

    if (isDemoMode()) {
        const demoOrdersJson = localStorage.getItem(DEMO_ORDENES_KEY) || '[]';
        try {
            let demoOrders: Order[] = JSON.parse(demoOrdersJson);
            if (action === 'delete') {
                demoOrders = demoOrders.filter(o => !ids.some(id => matchesOrderId(o, id)));
            } else if (action === 'update') {
                demoOrders = demoOrders.map(o => {
                    if (items && items.length > 0) {
                        const specific = items.find(it => matchesOrderId(o, it.id));
                        if (specific) return { ...o, ...data, ...specific };
                    }
                    if (data && ids.some(targetId => matchesOrderId(o, targetId))) {
                        return { ...o, ...data };
                    }
                    return o;
                });
            }
            localStorage.setItem(DEMO_ORDENES_KEY, JSON.stringify(demoOrders));
        } catch (e) { }
        return { success: true, count: ids.length };
    }

    if (action === 'delete') {
        const localOrdersJson = localStorage.getItem('luxius_session_ordenes') || '[]';
        try {
            let localOrders: Order[] = JSON.parse(localOrdersJson);
            localOrders = localOrders.filter(o => !ids.some(id => matchesOrderId(o, id)));
            localStorage.setItem('luxius_session_ordenes', JSON.stringify(localOrders));
            localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
        } catch (e) { }

    } else if (action === 'update') {
        const localOrdersJson = localStorage.getItem('luxius_session_ordenes') || '[]';
        try {
            let localOrders: Order[] = JSON.parse(localOrdersJson);
            localOrders = localOrders.map(o => {
                if (items && items.length > 0) {
                    const specific = items.find(it => matchesOrderId(o, it.id));
                    if (specific) {
                        return { ...o, ...data, ...specific };
                    }
                }
                if (data && ids.some(targetId => matchesOrderId(o, targetId))) {
                    return { ...o, ...data };
                }
                return o;
            });
            localStorage.setItem('luxius_session_ordenes', JSON.stringify(localOrders));
            localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
        } catch (e) { }

    } else if (action === 'restore') {
        const localOrdersJson = localStorage.getItem('luxius_session_ordenes') || '[]';
        try {
            let localOrders: Order[] = JSON.parse(localOrdersJson);
            localOrders = localOrders.map(o => {
                if (ids.some(targetId => matchesOrderId(o, targetId))) {
                    return { ...o, status: (o.category === 'diseno' ? 'diseno' : 'orden') as any };
                }
                return o;
            });
            localStorage.setItem('luxius_session_ordenes', JSON.stringify(localOrders));
            localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
        } catch (e) { }

        // Remove from tombstone so restored orders become visible again
        try {
            const hiddenJson = localStorage.getItem(HIDDEN_ORDENES_KEY) || '[]';
            let hidden: string[] = JSON.parse(hiddenJson);
            const before = hidden.length;
            hidden = hidden.filter(h => {
                return !ids.some(id => {
                    const cleanId = String(id).trim().toLowerCase().replace(/^ot-/i, '');
                    return h === cleanId;
                });
            });
            if (hidden.length !== before) {
                localStorage.setItem(HIDDEN_ORDENES_KEY, JSON.stringify(hidden));
            }
        } catch (e) { }
    }

    // Await sync with remote API so caller's subsequent loadOrders() gets updated DB state
    try {
        const response = await fetchWithTimeout(`${API_URL}/orders/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ids, data, updateData: data, items }),
        }, 60000);
        if (!response.ok) {
            console.error('[db] API saveBatchOrders respuesta no-ok:', response.status);
            throw new Error(`El servidor rechazó la operación por lote (código ${response.status})`);
        } else {
            localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
        }
    } catch (e) {
        console.error('[db] API saveBatchOrders falló:', e);
        throw e;
    }

    return { success: true, count: ids.length };
}

export async function updateBatchGroup(
    batchOrders: Order[],
    params: UpdateBatchGroupParams
): Promise<{ success: boolean; count: number }> {
    if (!batchOrders || batchOrders.length === 0) {
        throw new Error('No se encontraron órdenes para actualizar en el lote');
    }

    const cleanBatchName = (params.batchName || '').trim() || 'Lote de Producción';
    const slug = cleanBatchName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const targetBatchId = params.batchId || batchOrders[0]?.batchId || `lote_${params.clientId || batchOrders[0]?.clientId || '0'}_${slug}_${Date.now().toString(36)}`;

    const itemsToUpdate: (Partial<Order> & { id: number | string })[] = [];
    const allIds: (number | string)[] = [];

    for (const order of batchOrders) {
        const orderId = (order as any).uuid || order.id || order.ot;
        allIds.push(orderId);

        const itemParam = params.items?.find(i => matchesOrderId(order, i.id));
        if (itemParam?.unlinked) {
            // Desvincular orden del lote: quitar batchId y loteNombre
            const baseDesc = order.descripcionItem || (order.nombreTarea && order.nombreTarea.includes(' - ') ? order.nombreTarea.split(' - ').slice(1).join(' - ').trim() : '') || order.archivosOriginales?.[0] || 'OT Individual';
            itemsToUpdate.push({
                id: orderId,
                batchId: '',
                loteNombre: '',
                nombreTarea: baseDesc,
                descripcion: baseDesc,
                ...(params.clientId ? { clientId: params.clientId, clienteNombre: params.clienteNombre } : {}),
                ...(params.fechaEntrega !== undefined ? { fechaEntrega: params.fechaEntrega } : {}),
                ...(params.envio !== undefined ? { envio: params.envio } : {}),
                ...(params.observaciones !== undefined ? { observaciones: params.observaciones, comments: params.observaciones } : {})
            });
        } else {
            // Mantener en el lote con el nuevo nombre y datos compartidos
            const pieceDesc = itemParam?.itemDesc !== undefined
                ? itemParam.itemDesc.trim()
                : (order.descripcionItem || (order.nombreTarea && order.nombreTarea.includes(' - ') ? order.nombreTarea.split(' - ').slice(1).join(' - ').trim() : '') || order.archivosOriginales?.[0] || '');
            
            const newNombreTarea = pieceDesc ? `${cleanBatchName} - ${pieceDesc}` : cleanBatchName;

            itemsToUpdate.push({
                id: orderId,
                batchId: targetBatchId,
                loteNombre: cleanBatchName,
                descripcionItem: pieceDesc,
                nombreTarea: newNombreTarea,
                descripcion: newNombreTarea,
                ...(params.clientId ? { clientId: params.clientId, clienteNombre: params.clienteNombre } : {}),
                ...(params.fechaEntrega !== undefined ? { fechaEntrega: params.fechaEntrega } : {}),
                ...(params.envio !== undefined ? { envio: params.envio } : {}),
                ...(params.observaciones !== undefined ? { observaciones: params.observaciones, comments: params.observaciones } : {})
            });
        }
    }

    const result = await saveBatchOrders('update', allIds, {
        batchId: targetBatchId,
        loteNombre: cleanBatchName,
        ...(params.clientId ? { clientId: params.clientId, clienteNombre: params.clienteNombre } : {}),
        ...(params.fechaEntrega !== undefined ? { fechaEntrega: params.fechaEntrega } : {}),
        ...(params.envio !== undefined ? { envio: params.envio } : {}),
        ...(params.observaciones !== undefined ? { observaciones: params.observaciones } : {})
    }, itemsToUpdate);

    return result;
}

export async function mergeOrdersIntoBatch(
    orderIds: (number | string)[],
    batchName: string
): Promise<{ success: boolean; batchId: string; count: number }> {
    if (!orderIds || orderIds.length < 2) {
        throw new Error('Se requieren al menos 2 órdenes para unificar un lote');
    }

    const cleanBatchName = batchName.trim() || `Lote Unificado ${new Date().toLocaleDateString('es-AR')}`;
    const slug = cleanBatchName.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    const orders = await getOrdenes();
    const targetOrders = orders.filter(o => orderIds.some(id => matchesOrderId(o, id)));

    const clientId = targetOrders[0]?.clientId || '0';
    const batchId = `lote_${clientId}_${slug}_${Date.now().toString(36)}`;

    const result = await saveBatchOrders('update', orderIds, {
        batchId,
        loteNombre: cleanBatchName
    });

    return {
        success: result.success,
        batchId,
        count: targetOrders.length
    };
}

export async function getOrdenById(id: number): Promise<Order | undefined> {
    const orders = await getOrdenes();
    return orders.find(o => o.id === id);
}

export async function getOrdenesByStatus(status: string): Promise<Order[]> {
    const orders = await getOrdenes();
    return orders.filter(o => o.status === status);
}

export async function getOrdenesByCliente(clienteId: number): Promise<Order[]> {
    const orders = await getOrdenes();
    return orders.filter(o => (o.clientId === clienteId) || (o as any).clienteId === clienteId);
}

export async function getOrdenesPendientes(): Promise<Order[]> {
    const pendingStatuses = ['preorden', 'orden', 'diseno', 'previa'];
    const orders = await getOrdenes();
    return orders.filter(o => pendingStatuses.includes(o.status));
}
