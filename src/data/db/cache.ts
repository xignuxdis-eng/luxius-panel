/**
 * Luxius System - Cache & Offline Storage Management
 */

import { DEMO_CLIENTES, DEMO_MATERIALES, DEMO_MAQUINAS, DEMO_ORDENES } from '../demoSandboxData';
import { API_URL, fetchWithTimeout } from './client';
import { deduplicateMaterials } from './inventory.db';

export const DEMO_ORDENES_KEY = 'luxius_demo_orders';
export const DEMO_CLIENTES_KEY = 'luxius_demo_clientes';
export const DEMO_MATERIALES_KEY = 'luxius_demo_materiales';
export const DEMO_MAQUINAS_KEY = 'luxius_demo_maquinas';

/**
 * Detecta si el sistema se encuentra en Modo Demo / Visitante Sandbox
 */
export function isDemoMode(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const token = localStorage.getItem('luxius_auth_token');
        if (token === 'luxius_demo_token_sandbox_2026') return true;
        const authData = localStorage.getItem('luxius-auth-v6');
        if (authData) {
            const parsed = JSON.parse(authData);
            if (parsed?.state?.user?.role === 'visitante' || parsed?.state?.user?.username === 'visitante') return true;
        }
    } catch {}
    return false;
}

export const COLLECTIONS_CONFIG = [
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

export const SESSION_CLIENTES_KEY = 'luxius_session_clientes';
export const HIDDEN_CLIENTES_KEY = 'luxius_deleted_clientes';

export const SESSION_MATERIALES_KEY = 'luxius_session_materiales';
export const HIDDEN_MATERIALES_KEY = 'luxius_deleted_materiales';

export const SESSION_CALIDADES_KEY = 'luxius_session_calidades';
export const HIDDEN_CALIDADES_KEY = 'luxius_deleted_calidades';

export const SESSION_MAQUINAS_KEY = 'luxius_session_maquinas';
export const HIDDEN_MAQUINAS_KEY = 'luxius_deleted_maquinas';

export const SESSION_USUARIOS_KEY = 'luxius_session_usuarios';
export const HIDDEN_USUARIOS_KEY = 'luxius_deleted_usuarios';

export const SESSION_PROVEEDORES_KEY = 'luxius_session_proveedores';
export const HIDDEN_PROVEEDORES_KEY = 'luxius_deleted_proveedores';

export const SESSION_SERVICIOS_KEY = 'luxius_session_servicios';
export const HIDDEN_SERVICIOS_KEY = 'luxius_deleted_servicios';

export const SESSION_LOGISTICAS_KEY = 'luxius_session_logisticas';
export const HIDDEN_LOGISTICAS_KEY = 'luxius_deleted_logisticas';

export const SESSION_ROLES_KEY = 'luxius_session_roles';
export const HIDDEN_ROLES_KEY = 'luxius_deleted_roles';

export const SESSION_CALENDAR_EVENTS_KEY = 'luxius_session_calendar_events';
export const SESSION_LOGS_KEY = 'luxius_session_logs';
export const SESSION_MOV_STOCK_KEY = 'luxius_movimientos_stock';

export const HIDDEN_ORDENES_KEY = 'luxius_deleted_ordenes';
export const SESSION_COMBOS_KEY = 'luxius_combos';
export const HIDDEN_COMBOS_KEY = 'luxius_deleted_combos';

export async function initializeData() {
    if (isDemoMode()) {
        console.log("🧪 [Sandbox Demo] Inicializando entorno aislado con datos ficticios...");
        if (!localStorage.getItem(DEMO_ORDENES_KEY)) {
            localStorage.setItem(DEMO_ORDENES_KEY, JSON.stringify(DEMO_ORDENES));
        }
        if (!localStorage.getItem(DEMO_CLIENTES_KEY)) {
            localStorage.setItem(DEMO_CLIENTES_KEY, JSON.stringify(DEMO_CLIENTES));
        }
        if (!localStorage.getItem(DEMO_MATERIALES_KEY)) {
            localStorage.setItem(DEMO_MATERIALES_KEY, JSON.stringify(DEMO_MATERIALES));
        }
        if (!localStorage.getItem(DEMO_MAQUINAS_KEY)) {
            localStorage.setItem(DEMO_MAQUINAS_KEY, JSON.stringify(DEMO_MAQUINAS));
        }
        return;
    }

    console.log("🔄 Syncing data from Server...");

    // Limpiar tumbas obsoletas de localStorage para evitar que filtren datos legítimos
    [
        'luxius_deleted_clientes', 'luxius_deleted_materiales', 'luxius_deleted_calidades',
        'luxius_deleted_maquinas', 'luxius_deleted_usuarios', 'luxius_deleted_proveedores',
        'luxius_deleted_servicios', 'luxius_deleted_logisticas', 'luxius_deleted_roles',
        'luxius_deleted_combos', 'luxius_deleted_ordenes'
    ].forEach(k => localStorage.removeItem(k));

    try {
        await Promise.all(COLLECTIONS_CONFIG.map(async (col) => {
            try {
                const res = await fetchWithTimeout(`${API_URL}/${col.endpoint}`, { cache: 'no-store' }, 45000);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        if (col.endpoint === 'calidades' && data.length === 0) {
                            // Conservar calidades predeterminadas si el servidor devuelve lista vacía
                        } else {
                            const finalData = col.endpoint === 'materiales' ? deduplicateMaterials(data) : data;
                            localStorage.setItem(col.key, JSON.stringify(finalData));
                        }
                    }
                }
            } catch (e) { }
        }));
    } catch (e) { }

    console.log("✅ Data sync complete.");
}

export async function refreshCollection(endpoint: string) {
    if (isDemoMode()) return;
    const config = COLLECTIONS_CONFIG.find(c => c.endpoint === endpoint);
    if (!config) return;

    try {
        const res = await fetchWithTimeout(`${API_URL}/${endpoint}`, { cache: 'no-store' }, 15000);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                if (endpoint === 'calidades' && data.length === 0) {
                    // Conservar calidades predeterminadas si el servidor devuelve lista vacía
                } else {
                    const finalData = endpoint === 'materiales' ? deduplicateMaterials(data) : data;
                    localStorage.setItem(config.key, JSON.stringify(finalData));
                }
            }
        }
    } catch (e) { }
}
