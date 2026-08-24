/**
 * Luxius Database Access Layer
 * 
 * Now integrated with Local API for Orders and File Persistence.
 */

// Import JSON data (Static/Fallback) - REMOVED to ensure Server Truth
// import configData from './db/config.json' // Kept for config defaults if needed, but others should be server-only

// Types
import type { Cliente, Material, Calidad, Maquina, Order, Servicio, Proveedor, Logistica } from '@/types'
import { INITIAL_CLIENTES } from './initialClientes'

// API Configuration
export const API_URL = 'https://luxius-backend.onrender.com/api';

export function resolveMediaUrl(fileStr: string): string {
    if (!fileStr) return ''
    const trimmed = fileStr.trim()

    if (trimmed.startsWith('data:')) return trimmed

    const httpIdx = trimmed.indexOf('http://')
    const httpsIdx = trimmed.indexOf('https://')
    const firstHttp = httpIdx !== -1 ? httpIdx : httpsIdx
    if (firstHttp !== -1) {
        return trimmed.substring(firstHttp)
    }

    const baseUrl = API_URL.replace(/\/api\/?$/, '')
    let cleanPath = trimmed.replace(/^\/+/, '')

    if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.replace(/^uploads\//, '')
    }

    return `${baseUrl}/uploads/${cleanPath}`
}

const COLLECTIONS_CONFIG = [
    { key: 'luxius_session_clientes', endpoint: 'clientes' },
    { key: 'luxius_session_materiales', endpoint: 'materiales' },
    { key: 'luxius_session_calidades', endpoint: 'calidades' },
    { key: 'luxius_session_maquinas', endpoint: 'maquinas' },
    { key: 'luxius_session_usuarios', endpoint: 'usuarios' },
    { key: 'luxius_session_proveedores', endpoint: 'proveedores' },
    { key: 'luxius_session_servicios', endpoint: 'servicios' },
    { key: 'luxius_session_logisticas', endpoint: 'logisticas' },
    { key: 'luxius_session_calendar', endpoint: 'calendar' },
    { key: 'luxius_session_roles', endpoint: 'roles' }
];

export const SESSION_CLIENTES_KEY = 'luxius_session_clientes'
export const HIDDEN_CLIENTES_KEY = 'luxius_deleted_clientes'

export const SESSION_MATERIALES_KEY = 'luxius_session_materiales'
export const HIDDEN_MATERIALES_KEY = 'luxius_deleted_materiales'

export const SESSION_CALIDADES_KEY = 'luxius_session_calidades'
export const HIDDEN_CALIDADES_KEY = 'luxius_deleted_calidades'

export const SESSION_MAQUINAS_KEY = 'luxius_session_maquinas'
export const HIDDEN_MAQUINAS_KEY = 'luxius_deleted_maquinas'

export const SESSION_USUARIOS_KEY = 'luxius_session_usuarios'
export const HIDDEN_USUARIOS_KEY = 'luxius_deleted_usuarios'

export const SESSION_PROVEEDORES_KEY = 'luxius_session_proveedores'
export const HIDDEN_PROVEEDORES_KEY = 'luxius_deleted_proveedores'

export const SESSION_SERVICIOS_KEY = 'luxius_session_servicios'
export const HIDDEN_SERVICIOS_KEY = 'luxius_deleted_servicios'

export const SESSION_LOGISTICAS_KEY = 'luxius_session_logisticas'
export const HIDDEN_LOGISTICAS_KEY = 'luxius_deleted_logisticas'

export const SESSION_ROLES_KEY = 'luxius_session_roles'
export const HIDDEN_ROLES_KEY = 'luxius_deleted_roles'

export const SESSION_CALENDAR_EVENTS_KEY = 'luxius_session_calendar_events'
export const SESSION_LOGS_KEY = 'luxius_session_logs'


// --- SYNC HELPERS ---
function getAuthHeaders(baseHeaders: Record<string, string> = {}): Record<string, string> {
    const headers = { ...baseHeaders };
    try {
        const stored = localStorage.getItem('luxius_auth');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.state?.token) {
                headers['Authorization'] = `Bearer ${parsed.state.token}`;
            }
        }
    } catch (_) { }
    return headers;
}

const syncSave = (collection: string, data: any) => {
    console.log(`[Sync] Saving to ${collection}`, data);
    fetch(`${API_URL}/${collection}`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
        keepalive: true
    }).then(res => {
        if (!res.ok) console.warn(`[Sync] Save failed ${collection}: ${res.status}`);
    }).catch(e => console.error(`[Sync] Network error [${collection}]:`, e));
};

const syncDelete = (collection: string, id: number) => {
    console.log(`[Sync] Deleting from ${collection} ID: ${id}`);
    fetch(`${API_URL}/${collection}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        keepalive: true
    }).then(res => {
        if (!res.ok) console.warn(`[Sync] Delete failed ${collection}: ${res.status}`);
    }).catch(e => console.error(`[Sync] Network error delete [${collection}]:`, e));
};

const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 60000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const headers = getAuthHeaders(options.headers || {});
        const response = await fetch(url, { ...options, headers, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

export async function initializeData() {
    console.log("🔄 Syncing data from Server...");

    // Clear legacy tombstone keys that cause data resurrection bugs (except for ordenes, which we need for offline/fallback deletion)
    [
        'luxius_deleted_clientes', 'luxius_deleted_materiales', 'luxius_deleted_calidades',
        'luxius_deleted_maquinas', 'luxius_deleted_usuarios', 'luxius_deleted_proveedores',
        'luxius_deleted_servicios', 'luxius_deleted_logisticas', 'luxius_deleted_roles',
        'luxius_deleted_combos'
    ].forEach(k => localStorage.removeItem(k));

    try {
        await Promise.all(COLLECTIONS_CONFIG.map(async (col) => {
            try {
                const res = await fetchWithTimeout(`${API_URL}/${col.endpoint}`, { cache: 'no-store' }, 60000);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        localStorage.setItem(col.key, JSON.stringify(data));
                    }
                }
            } catch (e) { }
        }));
    } catch (e) { }

    console.log("✅ Data sync complete.");
}

export async function refreshCollection(endpoint: string) {
    const config = COLLECTIONS_CONFIG.find(c => c.endpoint === endpoint);
    if (!config) return;

    try {
        const res = await fetchWithTimeout(`${API_URL}/${endpoint}`, { cache: 'no-store' }, 10000);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                localStorage.setItem(config.key, JSON.stringify(data));
            }
        }
    } catch (e) { }
}



export function matchesOrderId(order: { id?: number | string, ot?: string }, targetId: number | string): boolean {
    if (!order || targetId === undefined || targetId === null) return false;
    const targetStr = String(targetId).trim().toLowerCase();
    const targetClean = targetStr.replace(/^ot-/i, '');

    const idStr = String(order.id || '').trim().toLowerCase();
    const idClean = idStr.replace(/^ot-/i, '');

    const otStr = String(order.ot || '').trim().toLowerCase();
    const otClean = otStr.replace(/^ot-/i, '');

    return (
        idStr === targetStr ||
        idClean === targetClean ||
        otStr === targetStr ||
        otClean === targetClean
    );
}

export const HIDDEN_ORDENES_KEY = 'luxius_deleted_ordenes';

export async function getOrdenes(): Promise<Order[]> {
    const hiddenJson = localStorage.getItem(HIDDEN_ORDENES_KEY) || '[]';
    let hiddenCleanIds: Set<string> = new Set();
    try {
        const rawHidden = JSON.parse(hiddenJson) as any[];
        rawHidden.forEach(item => {
            const s = String(item).trim().toLowerCase().replace(/^ot-/i, '');
            if (s) hiddenCleanIds.add(s);
        });
    } catch (e) { }

    const isHidden = (o: Order) => {
        if (!o) return false;
        const idClean = String(o.id || '').trim().toLowerCase().replace(/^ot-/i, '');
        const otClean = String(o.ot || '').trim().toLowerCase().replace(/^ot-/i, '');
        return hiddenCleanIds.has(idClean) || hiddenCleanIds.has(otClean);
    };

    const localOrdersJson = localStorage.getItem('luxius_session_ordenes') || '[]';
    let localOrders: Order[] = [];
    try {
        localOrders = JSON.parse(localOrdersJson);
        localOrders = localOrders.filter(o => !isHidden(o));
    } catch (e) { }

    // If localStorage was recently written (within 5 seconds), trust it fully
    // to avoid race conditions where stale API data overwrites a just-saved/deleted order.
    // IMPORTANT: Do NOT require localOrders.length > 0 — deletions can leave it empty.
    const lastSaveTs = Number(localStorage.getItem('luxius_ordenes_last_save') || '0');
    const timeSinceLastSave = Date.now() - lastSaveTs;
    if (timeSinceLastSave < 5000) {
        console.log('[db] getOrdenes: Usando localStorage reciente (guardado hace', timeSinceLastSave, 'ms). Orders:', localOrders.length);
        return localOrders;
    }

    try {
        const response = await fetchWithTimeout(`${API_URL}/orders`, {}, 30000);
        if (response.ok) {
            const apiOrders = await response.json();
            if (Array.isArray(apiOrders)) {
                const normalizeId = (id: any) => String(id || '').trim().toLowerCase().replace(/^ot-/i, '');
                
                const activeApiOrders = apiOrders.filter((o: any) => !isHidden(o));
                const apiIds = new Set(activeApiOrders.map((o: any) => normalizeId(o.id)));
                const localById = new Map(localOrders.map(o => [normalizeId(o.id), o]));

                // Merge: API orders win UNLESS local has a more recent status change
                const mergedApi = activeApiOrders.map((apiOrder: any) => {
                    const localVersion = localById.get(normalizeId(apiOrder.id));
                    if (localVersion) {
                        // If locally soft-deleted, preserve that status
                        if (localVersion.status === 'eliminado' && apiOrder.status !== 'eliminado') {
                            return localVersion;
                        }
                        // Keep local data that might have been edited (archivos, metadata, etc.)
                        return { ...apiOrder, ...localVersion, id: apiOrder.id };
                    }
                    return apiOrder;
                });

                // Add local-only orders (not in API, e.g. recently created)
                const uniqueLocal = localOrders.filter(o => !apiIds.has(normalizeId(o.id || o.ot)));
                
                // Auto-sync offline/local orders to the cloud backend
                if (uniqueLocal.length > 0) {
                    let updatedLocally = false;
                    console.log(`[db] Found ${uniqueLocal.length} unsynced local orders. Uploading to backend...`);
                    
                    Promise.allSettled(uniqueLocal.map(async (order) => {
                        const localId = order.id || order.ot;
                        const method = order.id ? 'PUT' : 'POST';
                        const url = order.id ? `${API_URL}/orders/${order.id}` : `${API_URL}/orders`;
                        try {
                            const res = await fetchWithTimeout(url, {
                                method,
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(order)
                            }, 30000);
                            
                            if (res.ok) {
                                const savedOrder = await res.json();
                                // If backend assigned a new ID, update our local store so it doesn't duplicate!
                                if (savedOrder.id && String(savedOrder.id) !== String(localId)) {
                                    const localJson = localStorage.getItem('luxius_session_ordenes') || '[]';
                                    let parsedLocal = JSON.parse(localJson);
                                    const idx = parsedLocal.findIndex((o: any) => (o.id || o.ot) === localId);
                                    if (idx >= 0) {
                                        parsedLocal[idx] = { ...parsedLocal[idx], ...savedOrder };
                                        localStorage.setItem('luxius_session_ordenes', JSON.stringify(parsedLocal));
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('[db] Auto-sync failed for order:', localId);
                        }
                    }));
                }

                const merged = [...mergedApi, ...uniqueLocal];
                localStorage.setItem('luxius_session_ordenes', JSON.stringify(merged));
                return merged;
            }
        }
    } catch (error) {
        console.warn('[db] Falló la obtención de órdenes remotas, usando locales:', error);
    }
    return localOrders;
}


export function getNextSequentialId(existingOrders: Order[]): number {
    let maxId = 0
    if (Array.isArray(existingOrders)) {
        for (const o of existingOrders) {
            const idNum = Number(o.id) || 0
            let otNum = 0
            if (o.ot) {
                const match = String(o.ot).match(/\d+/)
                if (match) otNum = parseInt(match[0], 10)
            }
            if (idNum > 0 && idNum < 500000) maxId = Math.max(maxId, idNum)
            if (otNum > 0 && otNum < 500000) maxId = Math.max(maxId, otNum)
        }
    }
    return maxId > 0 ? maxId + 1 : 1
}

export async function saveOrden(order: Partial<Order>): Promise<Order> {
    const localOrdersJson = localStorage.getItem('luxius_session_ordenes') || '[]'
    let localOrders: Order[] = []
    try { localOrders = JSON.parse(localOrdersJson); } catch (e) { }

    const now = new Date()
    const nextSeqId = order.id || getNextSequentialId(localOrders)
    const otCode = order.ot || `OT-${nextSeqId}`

    const newOrder: Order = {
        id: Number(nextSeqId),
        ot: otCode,
        nombreTarea: order.nombreTarea || (order as any).observaciones || `Proyecto ${otCode}`,
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
        fechaEntrega: order.fechaEntrega || now.toISOString().split('T')[0],
        ...order,
    } as Order

    // Handle HIDDEN_ORDENES_KEY: clear from hidden list if order is being saved/restored
    // (so previously deleted orders become visible again when restored)
    const hiddenJson = localStorage.getItem(HIDDEN_ORDENES_KEY) || '[]';
    try {
        let hiddenIds: (number | string)[] = JSON.parse(hiddenJson);
        const before = hiddenIds.length;
        hiddenIds = hiddenIds.filter(id => !matchesOrderId({ id: id as any, ot: String(id) }, newOrder.id));
        if (hiddenIds.length !== before) {
            localStorage.setItem(HIDDEN_ORDENES_KEY, JSON.stringify(hiddenIds));
        }
    } catch (e) { }

    const idx = localOrders.findIndex(o => matchesOrderId(o, newOrder.id));
    if (idx >= 0) {
        localOrders[idx] = { ...localOrders[idx], ...newOrder };
    } else {
        localOrders.unshift(newOrder);
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
        const method = order.id ? 'PUT' : 'POST';
        const url = order.id ? `${API_URL}/orders/${order.id}` : `${API_URL}/orders`;

        const response = await fetchWithTimeout(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrder),
        }, 60000);

        if (response.ok) {
            const serverOrder = await response.json();
            return serverOrder;
        }
    } catch (error) {
        console.warn('[db] API saveOrden falló o timeout, la orden se conservará localmente:', error);
    }

    return newOrder;
}

export async function deleteOrden(id: number | string): Promise<boolean> {
    if (id === undefined || id === null) return false;

    // 1. Remove from local storage session orders
    const localOrdersJson = localStorage.getItem('luxius_session_ordenes') || '[]';
    try {
        let localOrders: Order[] = JSON.parse(localOrdersJson);
        localOrders = localOrders.filter(o => !matchesOrderId(o, id));
        localStorage.setItem('luxius_session_ordenes', JSON.stringify(localOrders));
        localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
    } catch (e) { }

    // 2. Add to tombstone (luxius_deleted_ordenes) so it doesn't resurrect from API
    try {
        const hiddenJson = localStorage.getItem(HIDDEN_ORDENES_KEY) || '[]';
        const hidden: string[] = JSON.parse(hiddenJson);
        const cleanId = String(id).trim().toLowerCase().replace(/^ot-/i, '');
        if (!hidden.includes(cleanId)) {
            hidden.push(cleanId);
            localStorage.setItem(HIDDEN_ORDENES_KEY, JSON.stringify(hidden));
        }
    } catch (e) { }

    // 3. Delete from remote backend API
    try {
        await fetchWithTimeout(`${API_URL}/orders/${id}`, { method: 'DELETE' }, 60000);
    } catch (error) {
        console.warn('[db] API deleteOrden falló:', error);
    }
    return true;
}

export async function saveBatchOrders(
    action: 'delete' | 'update' | 'restore',
    ids: (number | string)[],
    data?: Partial<Order>
): Promise<{ success: boolean, count: number }> {
    if (!ids || ids.length === 0) return { success: true, count: 0 };

    if (action === 'delete') {
        const localOrdersJson = localStorage.getItem('luxius_session_ordenes') || '[]';
        try {
            let localOrders: Order[] = JSON.parse(localOrdersJson);
            localOrders = localOrders.filter(o => !ids.some(id => matchesOrderId(o, id)));
            localStorage.setItem('luxius_session_ordenes', JSON.stringify(localOrders));
            localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
            
            // Add to tombstone
            const hiddenJson = localStorage.getItem(HIDDEN_ORDENES_KEY) || '[]';
            const hidden: string[] = JSON.parse(hiddenJson);
            let updated = false;
            ids.forEach(id => {
                const cleanId = String(id).trim().toLowerCase().replace(/^ot-/i, '');
                if (!hidden.includes(cleanId)) {
                    hidden.push(cleanId);
                    updated = true;
                }
            });
            if (updated) {
                localStorage.setItem(HIDDEN_ORDENES_KEY, JSON.stringify(hidden));
            }
        } catch (e) { }

    } else if (action === 'update' && data) {
        const localOrdersJson = localStorage.getItem('luxius_session_ordenes') || '[]';
        try {
            let localOrders: Order[] = JSON.parse(localOrdersJson);
            localOrders = localOrders.map(o => {
                if (ids.some(targetId => matchesOrderId(o, targetId))) {
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
    }

    try {
        const response = await fetchWithTimeout(`${API_URL}/orders/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ids, data, updateData: data }),
        }, 60000);

        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn('[db] API saveBatchOrders falló, procesado localmente:', e);
    }
    return { success: true, count: ids.length };
}

export async function uploadFile(
    file: File,
    onProgress?: (percent: number, loaded: number, total: number) => void
): Promise<{ filename: string, path: string, originalName: string, size: number, thumbnailUrl?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    // Timeout dinámico: mínimo 120s, +30s por cada 10MB adicional, máximo 600s
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.min(600000, Math.max(120000, 120000 + Math.ceil(fileSizeMB / 10) * 30000));

    // Get auth token
    let authToken = '';
    try {
        const stored = localStorage.getItem('luxius_auth');
        if (stored) {
            const parsed = JSON.parse(stored);
            authToken = parsed?.state?.token || '';
        }
    } catch (_) { /* no-op */ }

    console.log(`[Upload] Iniciando subida: ${file.name} (${fileSizeMB.toFixed(1)} MB) timeout: ${timeoutMs / 1000}s`);

    const uploadResult = await new Promise<{ filename: string, path: string, originalName: string, size: number, thumbnailUrl?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/upload`, true);
        xhr.timeout = timeoutMs;

        // Auth header
        if (authToken) {
            xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        }

        // Progress tracking
        if (xhr.upload && onProgress) {
            let lastReported = 0;
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && e.total > 0) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    // Debounce: solo reportar cada 2% o cuando llegue a 100%
                    if (percent >= lastReported + 2 || percent === 100) {
                        lastReported = percent;
                        onProgress(percent, e.loaded, e.total);
                    }
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    if (res.success || res.filename) {
                        console.log(`[Upload] ✅ Subida exitosa: ${file.name} -> ${res.filename}`);
                        resolve({
                            filename: res.filename || res.path,
                            path: res.path || res.filename,
                            originalName: res.originalName || file.name,
                            size: res.size || file.size,
                            thumbnailUrl: res.thumbnailUrl
                        });
                    } else {
                        reject(new Error(res.error || 'Upload failed'));
                    }
                } catch (e) {
                    reject(new Error('Respuesta inválida del servidor'));
                }
            } else if (xhr.status === 413) {
                reject(new Error(`Archivo demasiado grande (${fileSizeMB.toFixed(1)} MB). El servidor rechazó la subida.`));
            } else {
                let errorMsg = `Error del servidor (HTTP ${xhr.status})`;
                try {
                    const errRes = JSON.parse(xhr.responseText);
                    errorMsg = errRes.error || errorMsg;
                } catch (_) { /* no-op */ }
                reject(new Error(errorMsg));
            }
        };

        xhr.onerror = () => reject(new Error(`Error de red al subir ${file.name}. Verifique su conexión.`));
        xhr.ontimeout = () => reject(new Error(`Timeout al subir ${file.name} (${fileSizeMB.toFixed(1)} MB). El archivo es muy grande o la conexión es lenta.`));

        xhr.send(formData);
    });

    return uploadResult;
}

// ASYNC Helpers (Dependent on getOrdenes)

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


// ============================================================
// Clientes (Sync/LocalStorage)
// ============================================================

export function getClientes(): Cliente[] {
    const versionKey = 'luxius_db_clientes_v4';
    if (localStorage.getItem(versionKey) !== 'v4') {
        localStorage.removeItem(SESSION_CLIENTES_KEY);
        localStorage.setItem(versionKey, 'v4');
    }

    const sessionItemsJson = localStorage.getItem(SESSION_CLIENTES_KEY)

    if (sessionItemsJson) {
        try {
            const list = JSON.parse(sessionItemsJson) as Cliente[];
            if (Array.isArray(list) && list.length > 0) {
                return list;
            }
        } catch (e) { }
    }

    localStorage.setItem(SESSION_CLIENTES_KEY, JSON.stringify(INITIAL_CLIENTES));
    return INITIAL_CLIENTES;
}

export function saveCliente(cliente: Partial<Cliente>): Cliente {
    const sessionItemsJson = localStorage.getItem(SESSION_CLIENTES_KEY)
    let sessionItems: Cliente[] = []

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson)
        } catch (e) { }
    }

    const existingIndex = sessionItems.findIndex(c => c.id === cliente.id)
    let result: Cliente

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = { ...sessionItems[existingIndex], ...cliente } as Cliente
        result = sessionItems[existingIndex]
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
        }
        sessionItems.unshift(newCliente)
        result = newCliente
    }

    localStorage.setItem(SESSION_CLIENTES_KEY, JSON.stringify(sessionItems))
    syncSave('clientes', result);
    return result
}

export function deleteCliente(id: number) {
    const sessionItemsJson = localStorage.getItem(SESSION_CLIENTES_KEY)
    if (sessionItemsJson) {
        try {
            let sessionItems = JSON.parse(sessionItemsJson) as Cliente[]
            sessionItems = sessionItems.filter(c => c.id !== id)
            localStorage.setItem(SESSION_CLIENTES_KEY, JSON.stringify(sessionItems))
        } catch (e) { }
    }
    syncDelete('clientes', id);
}

export function getClienteById(id: number): Cliente | undefined {
    return getClientes().find(c => c.id === id)
}

export function getClientesActivos(): Cliente[] {
    return getClientes().filter(c => c.habilitado)
}


// ============================================================
// Materiales
// ============================================================

export function getMateriales(): Material[] {
    const sessionItemsJson = localStorage.getItem(SESSION_MATERIALES_KEY)
    const hiddenItemsJson = localStorage.getItem(HIDDEN_MATERIALES_KEY)

    let sessionItems: Material[] = []
    let hiddenIds: number[] = []

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson) as Material[]
        } catch (e) { }
    }

    if (hiddenItemsJson) {
        try {
            hiddenIds = JSON.parse(hiddenItemsJson) as number[]
        } catch (e) { }
    }

    const hiddenSet = new Set(hiddenIds)
    const filteredSession = sessionItems.filter(i => !hiddenSet.has(i.id))

    const calidadesList = getCalidades();
    const validCalidadesMap = new Map(calidadesList.map(c => [c.nombre.trim().toLowerCase(), c.nombre]));
    const defaultCalidadName = calidadesList.find(c => c.habilitado !== false)?.nombre || calidadesList[0]?.nombre || 'Solvente';

    return filteredSession.map(m => {
        let color = m.color
        if (!color) {
            if (m.codigo === 'INK-C') color = '#00ffff'
            if (m.codigo === 'INK-M') color = '#ff00ff'
            if (m.codigo === 'INK-Y') color = '#ffff00'
            if (m.codigo === 'INK-K') color = '#222222'
            if (m.codigo === 'FLS-01') color = '#e0e0e0'
        }

        let unidad = m.unidad
        if (!unidad) {
            const type = m.tipo?.toLowerCase()
            if (type === 'rollo') unidad = 'M Lineal'
            else if (type === 'tinta' || type === 'solvente') unidad = 'Litros'
            else if (type === 'plancha') unidad = 'un'
            else unidad = 'mts'
        }

        let rawCalidad = (m.calidad || '').trim();
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
        }
    })
}

export function saveMaterial(material: Partial<Material>): Material {
    const sessionItemsJson = localStorage.getItem(SESSION_MATERIALES_KEY)
    let sessionItems: Material[] = []

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson)
        } catch (e) { }
    }

    const calidadesList = getCalidades();
    const validCalidadesMap = new Map(calidadesList.map(c => [c.nombre.trim().toLowerCase(), c.nombre]));
    const defaultCalidadName = calidadesList.find(c => c.habilitado !== false)?.nombre || calidadesList[0]?.nombre || 'Solvente';

    let rawCalidad = (material.calidad || '').trim();
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

    const existingIndex = sessionItems.findIndex(m => m.id === material.id)
    let result: Material

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = {
            ...sessionItems[existingIndex],
            ...material,
            calidad: normalizedCalidad
        } as Material
        result = sessionItems[existingIndex]
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

        }

        sessionItems.unshift(newMaterial)
        result = newMaterial
    }

    localStorage.setItem(SESSION_MATERIALES_KEY, JSON.stringify(sessionItems))
    syncSave('materiales', result);
    return result
}

export function deleteMaterial(id: number) {
    const sessionItemsJson = localStorage.getItem(SESSION_MATERIALES_KEY)
    if (sessionItemsJson) {
        try {
            let sessionItems = JSON.parse(sessionItemsJson) as Material[]
            sessionItems = sessionItems.filter(m => m.id !== id)
            localStorage.setItem(SESSION_MATERIALES_KEY, JSON.stringify(sessionItems))
        } catch (e) { }
    }
    syncDelete('materiales', id);
}

export function getMaterialById(id: number): Material | undefined {
    return getMateriales().find(m => m.id === id)
}

export function getMaterialByCodigo(codigo: string): Material | undefined {
    return getMateriales().find(m => m.codigo === codigo)
}

export function getMaterialesByCalidad(calidadId: number): Material[] {
    const calidad = getCalidadById(calidadId);
    if (!calidad) return [];
    return getMateriales().filter(m => m.calidad === calidad.nombre)
}

// ============================================================
// Calidades
// ============================================================

export function getCalidades(): Calidad[] {
    const sessionItemsJson = localStorage.getItem(SESSION_CALIDADES_KEY)
    const hiddenItemsJson = localStorage.getItem(HIDDEN_CALIDADES_KEY)

    let sessionItems: Calidad[] = []
    let hiddenIds: number[] = []

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson) as Calidad[]
        } catch (e) { }
    }

    if (hiddenItemsJson) {
        try {
            hiddenIds = JSON.parse(hiddenItemsJson) as number[]
        } catch (e) { }
    }

    const hiddenSet = new Set(hiddenIds)
    const filteredSession = sessionItems.filter(i => !hiddenSet.has(i.id))

    return filteredSession
}

export function saveCalidad(calidad: Partial<Calidad>): Calidad {
    const sessionItemsJson = localStorage.getItem(SESSION_CALIDADES_KEY)
    let sessionItems: Calidad[] = []

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson)
        } catch (e) { }
    }

    const existingIndex = sessionItems.findIndex(c => c.id === calidad.id)
    let result: Calidad

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = { ...sessionItems[existingIndex], ...calidad } as Calidad
        result = sessionItems[existingIndex]
    } else {
        const newCalidad: Calidad = {
            id: calidad.id || Math.floor(Math.random() * 900000) + 100000,
            nombre: calidad.nombre || 'Nueva Calidad',
            descripcion: calidad.descripcion || '',
            habilitado: calidad.habilitado !== undefined ? calidad.habilitado : true,
            orden: calidad.orden || 0
        }
        sessionItems.unshift(newCalidad)
        result = newCalidad
    }

    localStorage.setItem(SESSION_CALIDADES_KEY, JSON.stringify(sessionItems))
    syncSave('calidades', result);
    return result
}

export function deleteCalidad(id: number) {
    const sessionItemsJson = localStorage.getItem(SESSION_CALIDADES_KEY)
    if (sessionItemsJson) {
        try {
            let sessionItems = JSON.parse(sessionItemsJson) as Calidad[]
            sessionItems = sessionItems.filter(c => c.id !== id)
            localStorage.setItem(SESSION_CALIDADES_KEY, JSON.stringify(sessionItems))
        } catch (e) { }
    }
    syncDelete('calidades', id);
}

export function getCalidadById(id: number): Calidad | undefined {
    return getCalidades().find(c => c.id === id)
}

// ============================================================
// Maquinas (Sync)
// ============================================================



export function getMaquinas(): Maquina[] {
    const sessionItemsJson = localStorage.getItem(SESSION_MAQUINAS_KEY)
    const hiddenItemsJson = localStorage.getItem(HIDDEN_MAQUINAS_KEY)

    let hiddenIds: number[] = []
    if (hiddenItemsJson) {
        try { hiddenIds = JSON.parse(hiddenItemsJson) as number[] } catch (e) { }
    }

    if (sessionItemsJson) {
        try {
            const items = JSON.parse(sessionItemsJson) as Maquina[]
            if (items && Array.isArray(items)) {
                return items.filter(m => !hiddenIds.includes(m.id))
            }
        } catch (e) { }
    }

    // Sin datos mock — devolver vacío. El usuario agrega máquinas manualmente.
    return []
}

export function getMaquinaById(id: number): Maquina | undefined {
    return getMaquinas().find(m => m.id === id)
}

export function getMaquinasOnline(): Maquina[] {
    return getMaquinas().filter(m => m.habilitada && m.estado === 'online')
}

export function saveMaquina(maquina: Partial<Maquina>): Maquina {
    const sessionItems = getMaquinas()

    const existingIndex = sessionItems.findIndex(m => m.id === maquina.id)
    let result: Maquina

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = { ...sessionItems[existingIndex], ...maquina } as Maquina
        result = sessionItems[existingIndex]
    } else {
        const newMaquina: Maquina = {
            id: maquina.id || Math.floor(Math.random() * 900000) + 100000,
            nombre: maquina.nombre || 'Nueva Máquina',
            tipo: maquina.tipo || 'Impresora',
            anchoMaximo: maquina.anchoMaximo || 1.60,
            estado: maquina.estado || 'online',
            habilitada: maquina.habilitada !== undefined ? maquina.habilitada : true
        }
        if (maquina.ancho !== undefined) newMaquina.ancho = maquina.ancho

        sessionItems.unshift(newMaquina)
        result = newMaquina
    }

    localStorage.setItem(SESSION_MAQUINAS_KEY, JSON.stringify(sessionItems))
    syncSave('maquinas', result);
    return result
}

export function deleteMaquina(id: number) {
    let sessionItems = getMaquinas()
    sessionItems = sessionItems.filter(m => m.id !== id)
    localStorage.setItem(SESSION_MAQUINAS_KEY, JSON.stringify(sessionItems))
    syncDelete('maquinas', id);
}

// ============================================================
// Usuarios (Sync)
// ============================================================

interface Usuario {
    id: number
    nombre: string
    username: string
    rol: string
    role?: string
    email: string
    habilitado: boolean
    password?: string
    avatar?: string
    clientId?: number
}




const DEFAULT_USUARIOS: Usuario[] = [
    {
        id: 1,
        nombre: "Adrian (Principal)",
        username: "adrian",
        email: "adrian@luxius.com",
        rol: "principal",
        role: "principal",
        habilitado: true,
        password: "nueva98261"
    },
    {
        id: 2,
        nombre: "Admin (Administrador)",
        username: "admin",
        email: "admin@luxius.com",
        rol: "administrador",
        role: "administrador",
        habilitado: true,
        password: "admin123"
    },
    {
        id: 3,
        nombre: "Vendedor (Ventas)",
        username: "vendedor",
        email: "vendedor@luxius.com",
        rol: "vendedor",
        role: "vendedor",
        habilitado: true,
        password: "vendedor123"
    },
    {
        id: 4,
        nombre: "Impresion (Taller)",
        username: "impresion",
        email: "impresion@luxius.com",
        rol: "impresion",
        role: "impresion",
        habilitado: true,
        password: "impresion123"
    },
    {
        id: 5,
        nombre: "Diseño (Artista)",
        username: "diseno",
        email: "diseno@luxius.com",
        rol: "artista",
        role: "artista",
        habilitado: true,
        password: "diseno123"
    },
    {
        id: 6,
        nombre: "Cliente (Externo)",
        username: "cliente",
        email: "cliente@luxius.com",
        rol: "cliente",
        role: "cliente",
        clientId: 826300,
        habilitado: true,
        password: "cliente123"
    },
    {
        id: 830011,
        nombre: "Carlos Flores",
        username: "carlos",
        email: "carlos@luxius.com",
        rol: "impresion",
        role: "impresion",
        habilitado: true,
        password: "carlos123"
    }
];

export function getUsuarios(): Usuario[] {
    const versionKey = 'luxius_db_users_v7';
    const sessionItemsJson = localStorage.getItem(SESSION_USUARIOS_KEY);
    let sessionItems: Usuario[] = [];

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson) as Usuario[];
        } catch (e) { }
    }

    if (localStorage.getItem(versionKey) !== 'v7') {
        const sessionIds = new Set(sessionItems.map(u => u.id));
        const sessionUsernames = new Set(sessionItems.map(u => (u.username || '').toLowerCase()));

        for (const defUser of DEFAULT_USUARIOS) {
            if (!sessionIds.has(defUser.id) && !sessionUsernames.has((defUser.username || '').toLowerCase())) {
                sessionItems.push(defUser);
            }
        }
        localStorage.setItem(SESSION_USUARIOS_KEY, JSON.stringify(sessionItems));
        localStorage.setItem(versionKey, 'v7');
    }

    if (sessionItems.length > 0) {
        return sessionItems;
    }

    localStorage.setItem(SESSION_USUARIOS_KEY, JSON.stringify(DEFAULT_USUARIOS));
    return DEFAULT_USUARIOS;
}


export function getUsuarioById(id: number): Usuario | undefined {
    return getUsuarios().find(u => u.id === id)
}

export function getUsuarioByUsername(username: string): Usuario | undefined {
    return getUsuarios().find(u => u.username?.toLowerCase() === username?.toLowerCase())
}

export function saveUsuario(usuario: Partial<Usuario>): Usuario {
    const sessionItems = getUsuarios();

    const existingIndex = sessionItems.findIndex(u => (usuario.id && u.id === usuario.id) || (usuario.username && u.username.toLowerCase() === usuario.username.toLowerCase()))
    let result: Usuario

    if (existingIndex !== -1) {
        // Only update password if provided
        const updatedUser = { ...sessionItems[existingIndex], ...usuario } as Usuario
        if (!usuario.password) {
            updatedUser.password = sessionItems[existingIndex].password
        }
        sessionItems[existingIndex] = updatedUser
        result = sessionItems[existingIndex]
    } else {
        const newUsuario: Usuario = {
            id: usuario.id || Math.floor(Math.random() * 900000) + 100000,
            nombre: usuario.nombre || '',
            username: usuario.username || '',
            email: usuario.email || '',
            rol: usuario.rol || 'vendedor',
            habilitado: usuario.habilitado !== undefined ? usuario.habilitado : true,
            password: usuario.password || '' // Save password for new user
        }
        sessionItems.unshift(newUsuario)
        result = newUsuario
    }

    localStorage.setItem(SESSION_USUARIOS_KEY, JSON.stringify(sessionItems))
    syncSave('usuarios', result);
    return result
}

export function deleteUsuario(id: number) {
    let sessionItems = getUsuarios()
    sessionItems = sessionItems.filter(u => u.id !== id)
    localStorage.setItem(SESSION_USUARIOS_KEY, JSON.stringify(sessionItems))
    syncDelete('usuarios', id);
}


// ============================================================
// Proveedores (Sync)
// ============================================================



// Providers data removed - Server is Truth

export function getProveedores(): Proveedor[] {
    const sessionItemsJson = localStorage.getItem(SESSION_PROVEEDORES_KEY)

    if (sessionItemsJson) {
        try {
            return JSON.parse(sessionItemsJson) as Proveedor[]
        } catch (e) { }
    }

    return []
}

export function saveProveedor(proveedor: Partial<Proveedor>): Proveedor {
    const sessionItemsJson = localStorage.getItem(SESSION_PROVEEDORES_KEY)
    let sessionItems: Proveedor[] = []

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson)
        } catch (e) { }
    }

    const existingIndex = sessionItems.findIndex(p => p.id === proveedor.id)
    let result: Proveedor

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = { ...sessionItems[existingIndex], ...proveedor } as Proveedor
        result = sessionItems[existingIndex]
    } else {
        const newProveedor: Proveedor = {
            id: proveedor.id || Math.floor(Math.random() * 900000) + 100000,
            nombre: proveedor.nombre || 'Nuevo Proveedor',
            contacto: proveedor.contacto || '',
            telefono: proveedor.telefono || '',
            email: proveedor.email || '',
            direccion: proveedor.direccion || '',
            cuit: proveedor.cuit || '',
            cbu: proveedor.cbu || '',
            rubro: proveedor.rubro || 'General',
            saldo: proveedor.saldo || 0, // 0 = al dia, negativo = deuda, positivo = a favor
            notas: proveedor.notas || '',
            habilitado: proveedor.habilitado !== undefined ? proveedor.habilitado : true
        }
        sessionItems.unshift(newProveedor)
        result = newProveedor
    }

    localStorage.setItem(SESSION_PROVEEDORES_KEY, JSON.stringify(sessionItems))
    syncSave('proveedores', result);
    return result
}

export function deleteProveedor(id: number) {
    const sessionItemsJson = localStorage.getItem(SESSION_PROVEEDORES_KEY)
    if (sessionItemsJson) {
        try {
            let sessionItems = JSON.parse(sessionItemsJson) as Proveedor[]
            sessionItems = sessionItems.filter(p => p.id !== id)
            localStorage.setItem(SESSION_PROVEEDORES_KEY, JSON.stringify(sessionItems))
        } catch (e) { }
    }
    syncDelete('proveedores', id);
}

// ============================================================
// Config
// ============================================================

interface Config {
    empresa: {
        nombre: string
        direccion: string
        telefono: string
        email: string
        cuit: string
        logo: string
    }
    sistema: {
        version: string
        nombre: string
        nombreAnterior: string
        ultimaActualizacion: string
    }
    ordenes: {
        proximoId: number
        proximaOT: number
        prefijo: string
    }
    defaults: {
        demasias: number
        envio: string
        calidadId: number
        materialId: number
    }
    contadores: {
        ordenesHoy: number
        pendientesImpresion: number
        trabajosCompletados: number
        entregasHoy: number
    }
}

export function getConfig(): Config {
    return {
        empresa: { nombre: 'Luxius', direccion: '', telefono: '', email: '', cuit: '', logo: '' },
        sistema: { version: '1.0', nombre: 'Luxius', nombreAnterior: '', ultimaActualizacion: '' },
        ordenes: { proximoId: 0, proximaOT: 0, prefijo: 'OT' },
        defaults: { demasias: 0, envio: '', calidadId: 0, materialId: 0 },
        contadores: { ordenesHoy: 0, pendientesImpresion: 0, trabajosCompletados: 0, entregasHoy: 0 }
    } as Config
}

export async function getContadores() {
    // Actually this needs to be async now because it depends on orders
    // But configData has static counters.
    // For now return dynamic counters from DB
    const stats = await getStats();
    return stats;
}

export function getEmpresa(): Config['empresa'] {
    return { nombre: 'Luxius', direccion: '', telefono: '', email: '', cuit: '', logo: '' }
}

// ============================================================
// Servicios
// ============================================================

function inferServicioCodigo(s: Partial<Servicio>): string {
    if (s.codigo && s.codigo.trim() !== '') {
        return s.codigo.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4)
    }
    const name = (s.nombre || '').toUpperCase()
    if (name.includes('TENSA')) return 'TEN'
    if (name.includes('ROTULA')) return 'ROT'
    if (name.includes('LAMINA')) return 'LAM'
    if (name.includes('DEMAS')) return 'DEM'
    const clean = name.replace(/[^A-Z0-9]/g, '')
    return clean ? clean.substring(0, 4) : 'SERV'
}

export function getServicios(): Servicio[] {
    const sessionItemsJson = localStorage.getItem(SESSION_SERVICIOS_KEY)

    if (sessionItemsJson) {
        try {
            const items = JSON.parse(sessionItemsJson) as Servicio[]
            let hasChanges = false
            const sanitized = items.map(s => {
                if (!s.codigo || s.codigo.trim() === '') {
                    hasChanges = true
                    return { ...s, codigo: inferServicioCodigo(s) }
                }
                return s
            })
            if (hasChanges) {
                localStorage.setItem(SESSION_SERVICIOS_KEY, JSON.stringify(sanitized))
            }
            return sanitized
        } catch (e) { }
    }

    return []
}

export function getServicioById(id: number): Servicio | undefined {
    return getServicios().find(s => s.id === id)
}

export function getServiciosActivos(): Servicio[] {
    return getServicios().filter(s => s.habilitado)
}

export function saveServicio(servicio: Partial<Servicio>): Servicio {
    const sessionItemsJson = localStorage.getItem(SESSION_SERVICIOS_KEY)
    let sessionItems: Servicio[] = []

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson)
        } catch (e) { }
    }

    const existingIndex = sessionItems.findIndex(s => s.id === servicio.id)
    let result: Servicio

    if (existingIndex !== -1) {
        const merged = { ...sessionItems[existingIndex], ...servicio } as Servicio
        if (!merged.codigo || merged.codigo.trim() === '') {
            merged.codigo = inferServicioCodigo(merged)
        }
        sessionItems[existingIndex] = merged
        result = sessionItems[existingIndex]
    } else {
        const code = inferServicioCodigo(servicio)
        const newServicio: Servicio = {
            id: servicio.id || Math.floor(Math.random() * 900000) + 100000,
            codigo: code,
            nombre: servicio.nombre || '',
            descripcion: servicio.descripcion || '',
            precioBase: servicio.precioBase || 0,
            unidad: servicio.unidad || 'unidad',
            habilitado: servicio.habilitado !== undefined ? servicio.habilitado : true
        }
        sessionItems.unshift(newServicio)
        result = newServicio
    }

    localStorage.setItem(SESSION_SERVICIOS_KEY, JSON.stringify(sessionItems))
    syncSave('servicios', result);
    return result
}

export function deleteServicio(id: number) {
    const sessionItemsJson = localStorage.getItem(SESSION_SERVICIOS_KEY)
    if (sessionItemsJson) {
        try {
            let sessionItems = JSON.parse(sessionItemsJson) as Servicio[]
            sessionItems = sessionItems.filter(s => s.id !== id)
            localStorage.setItem(SESSION_SERVICIOS_KEY, JSON.stringify(sessionItems))
        } catch (e) { }
    }
    syncDelete('servicios', id);
}


// ============================================================
// Stats (ASYNC)
// ============================================================

export async function getStats() {
    const ordenes = await getOrdenes()
    const isToday = (dateString: string) => {
        if (!dateString) return false
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return false
            const now = new Date()

            return date.getDate() === now.getDate() &&
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear()
        } catch (e) {
            return false
        }
    }

    // DEBUG: Print all today orders found
    const todayOrders = ordenes.filter(o => isToday(o.createdAt || '') || isToday((o as any).fechaCreacion || ''))
    console.log(`Found ${todayOrders.length} orders for today:`, todayOrders.map(o => o.createdAt || (o as any).fechaCreacion))

    return {
        // Ordenes creadas hoy
        ordenesHoy: todayOrders.length,

        // En cola de impresion: 'orden' (Para Imprimir), 'impresion' y 'previa'
        pendientesImpresion: ordenes.filter(o => ['orden', 'impresion', 'previa'].includes(o.status)).length,

        // Completados: Todo lo que pasó impresión (impreso, post, completo, entregado)
        trabajosCompletados: ordenes.filter(o => ['impreso', 'post', 'completo', 'entregado', 'finalizado'].includes(o.status)).length,

        // Entregas para hoy
        entregasHoy: ordenes.filter(o => isToday(o.fechaEntrega)).length,

        // Calculated from actual data
        totalClientes: getClientes().length,
        clientesActivos: getClientesActivos().length,
        totalMateriales: getMateriales().length,
        maquinasOnline: getMaquinasOnline().length,

        // Pendientes generales: Todo lo que NO está terminado ni entregado
        ordenesPendientes: ordenes.filter(o => !['impreso', 'post', 'completo', 'entregado', 'anulado', 'rebotado', 'finalizado'].includes(o.status)).length,

        totalServicios: getServicios().length
    }
}

// ============================================================
// Calendario (ASYNC)
// ============================================================

export async function getCalendarEvents(userId?: string | number, role?: string): Promise<import('@/types').CalendarEvent[]> {
    const orders = await getOrdenes()

    // Filter orders that should appear in the calendar based on role
    const relevantOrders = orders.filter(o => {
        if (!role) return true // Show all if no role provided (standard/admin)
        if (role === 'administrador' || role === 'principal' || role === 'sistema') return true

        // Printers see orders ready for print (Para Imprimir)
        if (role === 'impresion' && o.status === 'orden') return true

        // Artists see orders in design (En Diseño) assigned to them
        if (role === 'artista' || role === 'diseno') {
            return o.status === 'preorden' && o.artistaId === userId
        }

        // Sales see everything
        if (role === 'vendedor' || role === 'ventas') return true

        // Workshop/Post see orders in print or finishing
        if (role === 'taller' || role === 'post') {
            return ['impreso', 'post', 'completo'].includes(o.status)
        }

        return false
    })

    const orderEvents: import('@/types').CalendarEvent[] = relevantOrders.map(o => {
        const isAssignment = (role === 'artista' && o.artistaId === userId) ||
            (role === 'impresion' && o.status === 'preorden')

        // Use 'rebotado' only if the status exists, but our new typing might not support it yet. 
        // fallback safely.
        const isRebotado = (o.status as any) === 'rebotado'

        return {
            id: `order-${o.id}`,
            title: `${isRebotado ? '🔴' : (isAssignment ? '🎯' : '📦')} ${o.clienteNombre} - OT:${o.ot}`,
            start: o.fechaEntrega,
            type: isRebotado ? 'rebotado' : (isAssignment ? 'assignment' : 'order'),
            orderId: o.id,
            clienteNombre: o.clienteNombre,
            description: o.observaciones,
            allDay: true
        }
    })

    const sessionEventsJson = localStorage.getItem(SESSION_CALENDAR_EVENTS_KEY)
    let sessionEvents: import('@/types').CalendarEvent[] = []
    if (sessionEventsJson) {
        try {
            sessionEvents = JSON.parse(sessionEventsJson)
        } catch (e) { }
    }

    // Filter by userId for personal events
    const personalEvents = userId
        ? sessionEvents.filter(e => e.userId === userId)
        : sessionEvents

    return [...orderEvents, ...personalEvents]
}


export function saveCalendarEvent(event: Partial<import('@/types').CalendarEvent>) {
    const sessionEventsJson = localStorage.getItem(SESSION_CALENDAR_EVENTS_KEY)
    let sessionEvents: import('@/types').CalendarEvent[] = []

    if (sessionEventsJson) {
        try {
            sessionEvents = JSON.parse(sessionEventsJson)
        } catch (e) { }
    }

    const existingIndex = sessionEvents.findIndex(e => e.id === event.id)
    if (existingIndex !== -1) {
        sessionEvents[existingIndex] = { ...sessionEvents[existingIndex], ...event } as any
    } else {
        const newEvent = {
            id: event.id || Math.random().toString(36).substring(2, 9),
            title: event.title || 'Nuevo Evento',
            start: event.start || new Date().toISOString().split('T')[0],
            type: event.type || 'other',
            userId: event.userId, // Ensure userId is saved
            ...event
        } as import('@/types').CalendarEvent
        sessionEvents.push(newEvent)
    }

    localStorage.setItem(SESSION_CALENDAR_EVENTS_KEY, JSON.stringify(sessionEvents))
    return event.id ? event : sessionEvents[sessionEvents.length - 1]
}

export function deleteCalendarEvent(id: string | number) {
    const sessionEventsJson = localStorage.getItem(SESSION_CALENDAR_EVENTS_KEY)
    if (sessionEventsJson) {
        try {
            let sessionEvents = JSON.parse(sessionEventsJson) as import('@/types').CalendarEvent[]
            sessionEvents = sessionEvents.filter(e => e.id !== id)
            localStorage.setItem(SESSION_CALENDAR_EVENTS_KEY, JSON.stringify(sessionEvents))
        } catch (e) { }
    }
}

// ============================================================
// Roles (Sync)

// ============================================================

import type { RoleConfig, SystemLog } from '@/types/auth'



export function getRoles(): RoleConfig[] {
    const sessionItemsJson = localStorage.getItem(SESSION_ROLES_KEY)
    if (sessionItemsJson) {
        try {
            return JSON.parse(sessionItemsJson)
        } catch (e) { }
    }

    // Default Roles
    const defaultRoles: RoleConfig[] = [
        { id: 1, name: 'Principal', key: 'principal', status: 'Activo' },
        { id: 2, name: 'Administración', key: 'administrador', status: 'Activo' },
        { id: 3, name: 'Vendedor', key: 'vendedor', status: 'Activo' },
        { id: 4, name: 'Cliente', key: 'cliente', status: 'Activo' },
        { id: 5, name: 'Impresión', key: 'impresion', status: 'Activo' },
        { id: 7, name: 'Artista', key: 'artista', status: 'Activo' },
    ]
    localStorage.setItem(SESSION_ROLES_KEY, JSON.stringify(defaultRoles))
    return defaultRoles
}

export function saveRole(role: Partial<RoleConfig>): RoleConfig {
    const roles = getRoles()
    const existingIndex = roles.findIndex(r => r.id === role.id)
    let result: RoleConfig

    if (existingIndex !== -1) {
        roles[existingIndex] = { ...roles[existingIndex], ...role } as RoleConfig
        result = roles[existingIndex]
    } else {
        const newRole: RoleConfig = {
            id: role.id || Math.floor(Math.random() * 900000) + 1000,
            name: role.name || 'Nuevo Rol',
            key: role.key || `role_${Date.now()}`,
            status: role.status || 'Activo',
            permissions: role.permissions || []
        }
        roles.push(newRole)
        result = newRole
    }

    localStorage.setItem(SESSION_ROLES_KEY, JSON.stringify(roles))
    addLog('UPDATE_ROLE', 'system', `Rol actualizado/creado: ${result.name}`)
    return result
}

export function deleteRole(id: number) {
    let roles = getRoles()
    const role = roles.find(r => r.id === id)
    if (role && ['principal', 'administrador'].includes(role.key)) {
        alert('No se pueden eliminar roles de sistema críticos.')
        return
    }
    roles = roles.filter(r => r.id !== id)
    localStorage.setItem(SESSION_ROLES_KEY, JSON.stringify(roles))
    addLog('DELETE_ROLE', 'system', `Rol eliminado ID: ${id}`)
}

// ============================================================
// System Logs (Sync)
// ============================================================

export function getLogs(): SystemLog[] {
    const logsJson = localStorage.getItem(SESSION_LOGS_KEY)
    if (logsJson) {
        try {
            return JSON.parse(logsJson)
        } catch (e) { }
    }
    return []
}

export function addLog(action: string, user: string, details: string) {
    const logs = getLogs()
    const newLog: SystemLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action,
        user,
        details
    }
    logs.unshift(newLog)
    // Keep only last 200 logs
    if (logs.length > 200) {
        logs.pop()
    }
    localStorage.setItem(SESSION_LOGS_KEY, JSON.stringify(logs))
}

const DASHBOARD_NOTES_KEY = 'luxius_dashboard_notes'

export function getDashboardNotes(userId: number | string): string {
    const key = `${DASHBOARD_NOTES_KEY}_${userId}`
    return localStorage.getItem(key) || ''
}

export function saveDashboardNotes(userId: number | string, notes: string) {
    const key = `${DASHBOARD_NOTES_KEY}_${userId}`
    localStorage.setItem(key, notes)
}

// ============================================================
// Logisticas (Sync)
// ============================================


export function getLogisticas(): Logistica[] {
    const sessionItemsJson = localStorage.getItem(SESSION_LOGISTICAS_KEY)

    if (sessionItemsJson) {
        try {
            return JSON.parse(sessionItemsJson) as Logistica[]
        } catch (e) { }
    }

    return []
}

export function saveLogistica(logistica: Partial<Logistica>): Logistica {

    let sessionItems: Logistica[] = []

    const sessionJson = localStorage.getItem(SESSION_LOGISTICAS_KEY)
    if (sessionJson) {
        try {
            sessionItems = JSON.parse(sessionJson)
        } catch (e) { }
    }

    const existingIndex = sessionItems.findIndex(l => l.id === logistica.id)
    let result: Logistica

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = { ...sessionItems[existingIndex], ...logistica } as Logistica
        result = sessionItems[existingIndex]
    } else {
        const id = logistica.id || Math.floor(Math.random() * 900000) + 100000
        const newLogistica: Logistica = {
            id,
            nombre: logistica.nombre || 'Nueva Logística',
            descripcion: logistica.descripcion || '',
            costo: logistica.costo || 0,
            habilitado: logistica.habilitado !== undefined ? logistica.habilitado : true
        }
        sessionItems.unshift(newLogistica)
        result = newLogistica
    }

    localStorage.setItem(SESSION_LOGISTICAS_KEY, JSON.stringify(sessionItems))
    syncSave('logisticas', result);
    return result
}

export function deleteLogistica(id: number) {
    const sessionJson = localStorage.getItem(SESSION_LOGISTICAS_KEY)
    if (sessionJson) {
        try {
            let sessionItems = JSON.parse(sessionJson) as Logistica[]
            sessionItems = sessionItems.filter(l => l.id !== id)
            localStorage.setItem(SESSION_LOGISTICAS_KEY, JSON.stringify(sessionItems))
        } catch (e) { }
    }
    syncDelete('logisticas', id);
}


// ============================================================
// TARIFAS XIGNUX — Tarifario global centralizado
// ============================================================

export interface TarifaEntry {
    precio: number
    rebajaMaxPct: number
}

export type TarifasXignux = Record<string, TarifaEntry>

export async function getTarifasXignux(): Promise<TarifasXignux> {
    // 1. Intentar desde API
    try {
        const res = await fetch(`${API_URL}/tarifas`, { cache: 'no-store' })
        if (res.ok) {
            const data = await res.json()
            // Guardar en localStorage como cache
            localStorage.setItem('luxius_tarifas_xignux', JSON.stringify(data))
            return data
        }
    } catch (e) {
        console.warn('[Tarifas] API offline, usando localStorage')
    }

    // 2. Fallback: localStorage
    const stored = localStorage.getItem('luxius_tarifas_xignux')
    if (stored) {
        try {
            return JSON.parse(stored) as TarifasXignux
        } catch (e) { }
    }

    return {}
}

export async function saveTarifasXignux(tarifas: TarifasXignux): Promise<boolean> {
    // Siempre guardar en localStorage primero
    localStorage.setItem('luxius_tarifas_xignux', JSON.stringify(tarifas))

    // Sincronizar materiales locales con precios del tarifario
    const mats = getMateriales()
    let matsUpdated = false
    mats.forEach(m => {
        const key = m.codigo?.toLowerCase() || m.descripcion.toLowerCase().replace(/[^a-z0-9]+/g, '_')
        if (tarifas[key] && typeof tarifas[key].precio === 'number') {
            m.precioM2 = tarifas[key].precio
            matsUpdated = true
        }
    })
    if (matsUpdated) {
        localStorage.setItem(SESSION_MATERIALES_KEY, JSON.stringify(mats))
    }

    // Sincronizar servicios locales con precios del tarifario
    const servs = getServicios()
    let servsUpdated = false
    servs.forEach(s => {
        const key = s.codigo?.toLowerCase() || s.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_')
        if (tarifas[key] && typeof tarifas[key].precio === 'number') {
            s.precioBase = tarifas[key].precio
            servsUpdated = true
        }
    })
    if (servsUpdated) {
        localStorage.setItem(SESSION_SERVICIOS_KEY, JSON.stringify(servs))
    }

    // Intentar guardar en backend también
    try {
        const res = await fetch(`${API_URL}/tarifas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tarifas),
        })
        return res.ok
    } catch (e) {
        console.warn('[Tarifas] API offline, guardado solo en localStorage')
        // Retornamos true porque localStorage sí se guardó
        return true
    }
}

// ============================================================
// COMBOS Y PRODUCTOS COMBINADOS
// ============================================================

export const SESSION_COMBOS_KEY = 'luxius_combos';
export const HIDDEN_COMBOS_KEY = 'luxius_deleted_combos';

export interface ComboItemComponent {
    id?: number | string;
    tipo: 'material' | 'servicio' | 'producto';
    nombre: string;
    cantidad: number;
    precioUnitario: number;
}

export interface ComboData {
    id: number;
    codigo: string;
    nombre: string;
    categoria: string;
    descripcion: string;
    materialCodigo?: string;
    ancho?: number;
    alto?: number;
    componentes: ComboItemComponent[];
    precioSugerido: number;
    precioFinal: number;
    habilitado: boolean;
    destacado?: boolean;
}

export function getCombos(): ComboData[] {
    const sessionItemsJson = localStorage.getItem(SESSION_COMBOS_KEY);
    const hiddenItemsJson = localStorage.getItem(HIDDEN_COMBOS_KEY);

    let sessionItems: ComboData[] = [];
    let hiddenIds: number[] = [];

    if (sessionItemsJson) {
        try { sessionItems = JSON.parse(sessionItemsJson); } catch (e) { }
    }
    if (hiddenItemsJson) {
        try { hiddenIds = JSON.parse(hiddenItemsJson); } catch (e) { }
    }

    const hiddenSet = new Set(hiddenIds);
    const filteredSession = sessionItems.filter(c => !hiddenSet.has(c.id));

    return filteredSession;
}

export function saveCombo(combo: Partial<ComboData>): ComboData {
    const sessionItemsJson = localStorage.getItem(SESSION_COMBOS_KEY);
    let sessionItems: ComboData[] = [];
    if (sessionItemsJson) {
        try { sessionItems = JSON.parse(sessionItemsJson); } catch (e) { }
    }

    const existingIndex = sessionItems.findIndex(c => c.id === combo.id);
    let result: ComboData;

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = { ...sessionItems[existingIndex], ...combo } as ComboData;
        result = sessionItems[existingIndex];
    } else {
        const nextId = combo.id || Math.floor(Math.random() * 900000) + 100000;
        const newCombo: ComboData = {
            id: nextId,
            codigo: combo.codigo || `COMBO-${nextId}`,
            nombre: combo.nombre || 'Nuevo Combo',
            categoria: combo.categoria || 'Generales',
            descripcion: combo.descripcion || '',
            materialCodigo: combo.materialCodigo || '',
            ancho: Number(combo.ancho) || 1.0,
            alto: Number(combo.alto) || 1.0,
            componentes: combo.componentes || [],
            precioSugerido: Number(combo.precioSugerido) || 0,
            precioFinal: Number(combo.precioFinal) || 0,
            habilitado: combo.habilitado !== undefined ? combo.habilitado : true,
            destacado: combo.destacado || false
        };
        sessionItems.unshift(newCombo);
        result = newCombo;
    }

    localStorage.setItem(SESSION_COMBOS_KEY, JSON.stringify(sessionItems));
    syncSave('combos', result);
    return result;
}

export function deleteCombo(id: number) {
    const sessionItemsJson = localStorage.getItem(SESSION_COMBOS_KEY);
    if (sessionItemsJson) {
        try {
            let sessionItems = JSON.parse(sessionItemsJson) as ComboData[];
            sessionItems = sessionItems.filter(c => c.id !== id);
            localStorage.setItem(SESSION_COMBOS_KEY, JSON.stringify(sessionItems));
        } catch (e) { }
    }
    syncDelete('combos', id);
}
