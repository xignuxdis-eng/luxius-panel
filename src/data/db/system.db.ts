/**
 * Luxius System - System Configuration, Users, Roles, Services, Calendar & Logs
 */

import type {
    Usuario,
    Config,
    Servicio,
    Proveedor,
    Logistica,
    RoleConfig,
    SystemLog,
    CalendarEvent,
    XanaTask,
    XanaSession,
    XanaDecision,
    XanaAction,
    XanaCommit,
    XanaPromptContext
} from './types';
import {
    isDemoMode,
    SESSION_USUARIOS_KEY,
    SESSION_PROVEEDORES_KEY,
    SESSION_SERVICIOS_KEY,
    SESSION_LOGISTICAS_KEY,
    SESSION_ROLES_KEY,
    SESSION_CALENDAR_EVENTS_KEY,
    SESSION_LOGS_KEY
} from './cache';
import { API_URL, getAuthHeaders, fetchWithTimeout, syncSave, syncDelete } from './client';
import { getOrdenes } from './orders.db';
import { getClientes, getClientesActivos } from './clients.db';
import { getMateriales } from './inventory.db';
import { getMaquinasOnline } from './machines.db';
import { isDesignerOwner } from '@/types';

// ============================================================
// Usuarios (Sync)
// ============================================================

const DEFAULT_USUARIOS: Usuario[] = [
    {
        id: 1,
        nombre: "Adrian (Principal)",
        username: "adrian",
        email: "adrian@luxius.com",
        rol: "principal",
        role: "principal",
        habilitado: true
    },
    {
        id: 2,
        nombre: "Mirta (Administración)",
        username: "admin",
        email: "mirta@luxius.com",
        rol: "administrador",
        role: "administrador",
        habilitado: true
    },
    {
        id: 3,
        nombre: "Vendedor (Ventas)",
        username: "vendedor",
        email: "vendedor@luxius.com",
        rol: "vendedor",
        role: "vendedor",
        habilitado: true
    },
    {
        id: 4,
        nombre: "Impresion (Taller)",
        username: "impresion",
        email: "impresion@luxius.com",
        rol: "impresion",
        role: "impresion",
        habilitado: true
    },
    {
        id: 5,
        nombre: "Diseño (Artista)",
        username: "diseno",
        email: "diseno@luxius.com",
        rol: "artista",
        role: "artista",
        habilitado: true
    },
    {
        id: 6,
        nombre: "Cliente (Externo)",
        username: "cliente",
        email: "cliente@luxius.com",
        rol: "cliente",
        role: "cliente",
        clientId: 826300,
        habilitado: true
    },
    {
        id: 7,
        nombre: "Curushi (Diseño)",
        username: "curushi",
        email: "curushi@luxius.com",
        rol: "artista",
        role: "artista",
        habilitado: true
    },
    {
        id: 830011,
        nombre: "Carlos Flores",
        username: "carlos",
        email: "carlos@luxius.com",
        rol: "impresion",
        role: "impresion",
        habilitado: true
    }
];

export function getUsuarios(): Usuario[] {
    if (isDemoMode()) {
        return [
            {
                id: 99999,
                nombre: "Visitante (Modo Demo)",
                username: "visitante",
                rol: "visitante",
                role: "visitante",
                email: "visitante@luxius.com",
                habilitado: true
            }
        ];
    }

    const versionKey = 'luxius_db_users_v9';
    const sessionItemsJson = localStorage.getItem(SESSION_USUARIOS_KEY);
    let sessionItems: Usuario[] = [];

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson) as Usuario[];
        } catch (e) { }
    }

    // SEGURIDAD: versiones anteriores guardaban contraseñas en localStorage → purgarlas
    if (sessionItems.some(u => u && (u as any).password)) {
        sessionItems = sessionItems.map(u => {
            const { password: _omit, ...rest } = u as any;
            return rest as Usuario;
        });
        localStorage.setItem(SESSION_USUARIOS_KEY, JSON.stringify(sessionItems));
    }

    if (localStorage.getItem(versionKey) !== 'v9') {
        const sessionIds = new Set(sessionItems.map(u => u.id));
        const sessionUsernames = new Set(sessionItems.map(u => (u.username || '').toLowerCase()));

        // Actualizar usuario id 2 a Mirta si aún decía Admin
        sessionItems = sessionItems.map(u => {
            if (u.id === 2 || (u.username || '').toLowerCase() === 'admin') {
                return { ...u, nombre: 'Mirta (Administración)', email: 'mirta@luxius.com' };
            }
            return u;
        });

        for (const defUser of DEFAULT_USUARIOS) {
            if (!sessionIds.has(defUser.id) && !sessionUsernames.has((defUser.username || '').toLowerCase())) {
                sessionItems.push(defUser);
            }
        }
        localStorage.setItem(SESSION_USUARIOS_KEY, JSON.stringify(sessionItems));
        localStorage.setItem(versionKey, 'v9');
    }

    if (sessionItems.length > 0) {
        return sessionItems;
    }

    localStorage.setItem(SESSION_USUARIOS_KEY, JSON.stringify(DEFAULT_USUARIOS));
    return DEFAULT_USUARIOS;
}

export function getUsuarioById(id: number): Usuario | undefined {
    return getUsuarios().find(u => u.id === id);
}

export function getUsuarioByUsername(username: string): Usuario | undefined {
    return getUsuarios().find(u => u.username?.toLowerCase() === username?.toLowerCase());
}

export async function saveUsuario(usuario: Partial<Usuario>): Promise<Usuario> {
    const sessionItems = getUsuarios();

    const existingIndex = sessionItems.findIndex(u => 
        (usuario.id && String(u.id) === String(usuario.id)) || 
        (usuario.username && u.username.toLowerCase() === usuario.username.toLowerCase())
    );
    let result: Usuario;

    if (existingIndex !== -1) {
        const updatedUser = { ...sessionItems[existingIndex], ...usuario } as Usuario;
        delete updatedUser.password;
        sessionItems[existingIndex] = updatedUser;
        result = sessionItems[existingIndex];
    } else {
        const newUsuario: Usuario = {
            id: usuario.id || 0,
            nombre: usuario.nombre || '',
            username: usuario.username || '',
            email: usuario.email || '',
            rol: usuario.rol || 'vendedor',
            habilitado: usuario.habilitado !== undefined ? usuario.habilitado : true,
            password: ''
        };
        sessionItems.unshift(newUsuario);
        result = newUsuario;
    }

    // Save locally first for instant UI response
    localStorage.setItem(SESSION_USUARIOS_KEY, JSON.stringify(sessionItems));

    // Persist directly to PostgreSQL database via API
    try {
        const payload: any = {
            nombre: result.nombre,
            username: result.username,
            email: result.email,
            rol: result.rol,
            habilitado: result.habilitado,
        };
        if (result.id && result.id > 0) {
            payload.id = result.id;
        }
        if (usuario.password && usuario.password.trim() !== '') {
            payload.password = usuario.password.trim();
        }

        const res = await fetchWithTimeout(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        }, 15000);

        if (res.ok) {
            const serverUser = await res.json();
            if (serverUser.newToken) {
                localStorage.setItem('luxius_auth_token', serverUser.newToken);
            }
            const currentUsers = getUsuarios();
            const idx = currentUsers.findIndex(u => 
                (serverUser.id && u.id === serverUser.id) || 
                (u.username && u.username.toLowerCase() === serverUser.username.toLowerCase())
            );
            if (idx !== -1) {
                currentUsers[idx] = { ...currentUsers[idx], ...serverUser };
            } else {
                currentUsers.unshift(serverUser);
            }
            localStorage.setItem(SESSION_USUARIOS_KEY, JSON.stringify(currentUsers));
            result = serverUser;
        } else {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Error del servidor (${res.status})`);
        }
    } catch (e: any) {
        console.error('[db] Error persistiendo usuario en servidor:', e);
        throw e;
    }

    return result;
}

export async function deleteUsuario(id: number): Promise<void> {
    let sessionItems = getUsuarios();
    sessionItems = sessionItems.filter(u => u.id !== id);
    localStorage.setItem(SESSION_USUARIOS_KEY, JSON.stringify(sessionItems));

    try {
        const res = await fetchWithTimeout(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        }, 10000);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.warn('[db] Advertencia al eliminar usuario:', errData.error || res.status);
        }
    } catch (e) {
        console.error('[db] Error eliminando usuario en backend:', e);
    }
}

// ============================================================
// Proveedores (Sync)
// ============================================================

export function getProveedores(): Proveedor[] {
    const sessionItemsJson = localStorage.getItem(SESSION_PROVEEDORES_KEY);

    if (sessionItemsJson) {
        try {
            return JSON.parse(sessionItemsJson) as Proveedor[];
        } catch (e) { }
    }

    return [];
}

export function saveProveedor(proveedor: Partial<Proveedor>): Proveedor {
    const sessionItemsJson = localStorage.getItem(SESSION_PROVEEDORES_KEY);
    let sessionItems: Proveedor[] = [];

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson);
        } catch (e) { }
    }

    const existingIndex = sessionItems.findIndex(p => String(p.id) === String(proveedor.id));
    let result: Proveedor;

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = { ...sessionItems[existingIndex], ...proveedor } as Proveedor;
        result = sessionItems[existingIndex];
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
            saldo: proveedor.saldo || 0,
            notas: proveedor.notas || '',
            habilitado: proveedor.habilitado !== undefined ? proveedor.habilitado : true
        };
        sessionItems.unshift(newProveedor);
        result = newProveedor;
    }

    localStorage.setItem(SESSION_PROVEEDORES_KEY, JSON.stringify(sessionItems));
    syncSave('proveedores', result);
    return result;
}

export function deleteProveedor(id: number) {
    const sessionItemsJson = localStorage.getItem(SESSION_PROVEEDORES_KEY);
    if (sessionItemsJson) {
        try {
            let sessionItems = JSON.parse(sessionItemsJson) as Proveedor[];
            sessionItems = sessionItems.filter(p => p.id !== id);
            localStorage.setItem(SESSION_PROVEEDORES_KEY, JSON.stringify(sessionItems));
        } catch (e) { }
    }
    syncDelete('proveedores', id);
}

// ============================================================
// Config
// ============================================================

export function getConfig(): Config {
    return {
        empresa: { nombre: 'Luxius', direccion: '', telefono: '', email: '', cuit: '', logo: '' },
        sistema: { version: '1.1.0', nombre: 'Luxius', nombreAnterior: '', ultimaActualizacion: '' },
        ordenes: { proximoId: 0, proximaOT: 0, prefijo: 'OT' },
        defaults: { demasias: 0, envio: '', calidadId: 0, materialId: 0 },
        contadores: { ordenesHoy: 0, pendientesImpresion: 0, trabajosCompletados: 0, entregasHoy: 0 }
    } as Config;
}

export async function getContadores() {
    const stats = await getStats();
    return stats;
}

export function getEmpresa(): Config['empresa'] {
    return { nombre: 'Luxius', direccion: '', telefono: '', email: '', cuit: '', logo: '' };
}

// ============================================================
// Servicios
// ============================================================

function inferServicioCodigo(s: Partial<Servicio>): string {
    if (s.codigo && s.codigo.trim() !== '') {
        return s.codigo.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
    }
    const name = (s.nombre || '').toUpperCase();
    if (name.includes('TENSA')) return 'TEN';
    if (name.includes('ROTULA')) return 'ROT';
    if (name.includes('LAMINA')) return 'LAM';
    if (name.includes('DEMAS')) return 'DEM';
    const clean = name.replace(/[^A-Z0-9]/g, '');
    return clean ? clean.substring(0, 4) : 'SERV';
}

export function getServicios(): Servicio[] {
    const sessionItemsJson = localStorage.getItem(SESSION_SERVICIOS_KEY);

    if (sessionItemsJson) {
        try {
            const items = JSON.parse(sessionItemsJson) as Servicio[];
            let hasChanges = false;
            const sanitized = items.map(s => {
                if (!s.codigo || s.codigo.trim() === '') {
                    hasChanges = true;
                    return { ...s, codigo: inferServicioCodigo(s) };
                }
                return s;
            });
            if (hasChanges) {
                localStorage.setItem(SESSION_SERVICIOS_KEY, JSON.stringify(sanitized));
            }
            return sanitized;
        } catch (e) { }
    }

    return [];
}

export function getServicioById(id: number): Servicio | undefined {
    return getServicios().find(s => s.id === id);
}

export function getServiciosActivos(): Servicio[] {
    return getServicios().filter(s => s.habilitado);
}

export function saveServicio(servicio: Partial<Servicio>): Servicio {
    const sessionItemsJson = localStorage.getItem(SESSION_SERVICIOS_KEY);
    let sessionItems: Servicio[] = [];

    if (sessionItemsJson) {
        try {
            sessionItems = JSON.parse(sessionItemsJson);
        } catch (e) { }
    }

    const existingIndex = sessionItems.findIndex(s => String(s.id) === String(servicio.id));
    let result: Servicio;

    if (existingIndex !== -1) {
        const merged = { ...sessionItems[existingIndex], ...servicio } as Servicio;
        if (!merged.codigo || merged.codigo.trim() === '') {
            merged.codigo = inferServicioCodigo(merged);
        }
        sessionItems[existingIndex] = merged;
        result = sessionItems[existingIndex];
    } else {
        const code = inferServicioCodigo(servicio);
        const newServicio: Servicio = {
            id: servicio.id || Math.floor(Math.random() * 900000) + 100000,
            codigo: code,
            nombre: servicio.nombre || '',
            descripcion: servicio.descripcion || '',
            precioBase: servicio.precioBase || 0,
            unidad: servicio.unidad || 'unidad',
            habilitado: servicio.habilitado !== undefined ? servicio.habilitado : true
        };
        sessionItems.unshift(newServicio);
        result = newServicio;
    }

    localStorage.setItem(SESSION_SERVICIOS_KEY, JSON.stringify(sessionItems));
    syncSave('servicios', result);
    return result;
}

export function deleteServicio(id: number) {
    const sessionItemsJson = localStorage.getItem(SESSION_SERVICIOS_KEY);
    if (sessionItemsJson) {
        try {
            let sessionItems = JSON.parse(sessionItemsJson) as Servicio[];
            sessionItems = sessionItems.filter(s => s.id !== id);
            localStorage.setItem(SESSION_SERVICIOS_KEY, JSON.stringify(sessionItems));
        } catch (e) { }
    }
    syncDelete('servicios', id);
}

// ============================================================
// Stats (ASYNC)
// ============================================================

export async function getStats() {
    const ordenes = await getOrdenes();
    const isToday = (dateString: string) => {
        if (!dateString) return false;
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return false;
            const now = new Date();

            return date.getDate() === now.getDate() &&
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear();
        } catch (e) {
            return false;
        }
    };

    const todayOrders = ordenes.filter(o => isToday(o.createdAt || '') || isToday((o as any).fechaCreacion || ''));

    return {
        ordenesHoy: todayOrders.length,
        pendientesImpresion: ordenes.filter(o => ['orden', 'impresion', 'previa'].includes(o.status)).length,
        trabajosCompletados: ordenes.filter(o => ['impreso', 'post', 'completo', 'entregado', 'finalizado'].includes(o.status)).length,
        entregasHoy: ordenes.filter(o => isToday(o.fechaEntrega)).length,
        totalClientes: getClientes().length,
        clientesActivos: getClientesActivos().length,
        totalMateriales: getMateriales().length,
        maquinasOnline: getMaquinasOnline().length,
        ordenesPendientes: ordenes.filter(o => !['impreso', 'post', 'completo', 'entregado', 'anulado', 'rebotado', 'finalizado'].includes(o.status)).length,
        totalServicios: getServicios().length
    };
}

// ============================================================
// Calendario (ASYNC)
// ============================================================

export async function getCalendarEvents(userId?: string | number, role?: string): Promise<CalendarEvent[]> {
    const orders = await getOrdenes();

    const relevantOrders = orders.filter(o => {
        if (!role) return true;
        if (role === 'administrador' || role === 'principal' || role === 'sistema') return true;
        if (role === 'impresion' && o.status === 'orden') return true;
        if (role === 'artista' || role === 'diseno' || role === 'disenador') {
            return isDesignerOwner(o, { id: userId, role });
        }
        if (role === 'vendedor' || role === 'ventas') return true;
        if (role === 'taller' || role === 'post') {
            return ['impreso', 'post', 'completo'].includes(o.status);
        }
        return false;
    });

    const orderEvents: CalendarEvent[] = relevantOrders.map(o => {
        const isAssignment = ((role === 'artista' || role === 'diseno' || role === 'disenador') && isDesignerOwner(o, { id: userId, role })) ||
            (role === 'impresion' && o.status === 'preorden');
        const isRebotado = (o.status as any) === 'rebotado';

        return {
            id: `order-${o.id}`,
            title: `${isRebotado ? '🔴' : (isAssignment ? '🎯' : '📦')} ${o.clienteNombre} - OT:${o.ot}`,
            start: o.fechaEntrega,
            type: isRebotado ? 'rebotado' : (isAssignment ? 'assignment' : 'order'),
            orderId: o.id,
            clienteNombre: o.clienteNombre,
            description: o.observaciones,
            allDay: true
        };
    });

    const sessionEventsJson = localStorage.getItem(SESSION_CALENDAR_EVENTS_KEY);
    let sessionEvents: CalendarEvent[] = [];
    if (sessionEventsJson) {
        try {
            sessionEvents = JSON.parse(sessionEventsJson);
        } catch (e) { }
    }

    const personalEvents = userId
        ? sessionEvents.filter(e => e.userId === userId)
        : sessionEvents;

    return [...orderEvents, ...personalEvents];
}

export function saveCalendarEvent(event: Partial<CalendarEvent>) {
    const sessionEventsJson = localStorage.getItem(SESSION_CALENDAR_EVENTS_KEY);
    let sessionEvents: CalendarEvent[] = [];

    if (sessionEventsJson) {
        try {
            sessionEvents = JSON.parse(sessionEventsJson);
        } catch (e) { }
    }

    const existingIndex = sessionEvents.findIndex(e => String(e.id) === String(event.id));
    if (existingIndex !== -1) {
        sessionEvents[existingIndex] = { ...sessionEvents[existingIndex], ...event } as any;
    } else {
        const newEvent = {
            id: event.id || Math.random().toString(36).substring(2, 9),
            title: event.title || 'Nuevo Evento',
            start: event.start || new Date().toISOString().split('T')[0],
            type: event.type || 'other',
            userId: event.userId,
            ...event
        } as CalendarEvent;
        sessionEvents.push(newEvent);
    }

    localStorage.setItem(SESSION_CALENDAR_EVENTS_KEY, JSON.stringify(sessionEvents));
    return event.id ? event : sessionEvents[sessionEvents.length - 1];
}

export function deleteCalendarEvent(id: string | number) {
    const sessionEventsJson = localStorage.getItem(SESSION_CALENDAR_EVENTS_KEY);
    if (sessionEventsJson) {
        try {
            let sessionEvents = JSON.parse(sessionEventsJson) as CalendarEvent[];
            sessionEvents = sessionEvents.filter(e => e.id !== id);
            localStorage.setItem(SESSION_CALENDAR_EVENTS_KEY, JSON.stringify(sessionEvents));
        } catch (e) { }
    }
}

// ============================================================
// Roles (Sync)
// ============================================================

export const DEFAULT_SYSTEM_ROLES: RoleConfig[] = [
    { id: 1, name: 'Administrador', key: 'administrador', status: 'Activo' },
    { id: 2, name: 'Principal / Jefe de Producción', key: 'principal', status: 'Activo' },
    { id: 3, name: 'Vendedor', key: 'vendedor', status: 'Activo' },
    { id: 4, name: 'Operario', key: 'operario', status: 'Activo' },
    { id: 5, name: 'Impresión', key: 'impresion', status: 'Activo' },
    { id: 6, name: 'Artista / Diseño', key: 'artista', status: 'Activo' },
    { id: 7, name: 'Cliente', key: 'cliente', status: 'Activo' },
];

export function getRoles(): RoleConfig[] {
    const sessionItemsJson = localStorage.getItem(SESSION_ROLES_KEY);
    if (sessionItemsJson) {
        try {
            const parsed = JSON.parse(sessionItemsJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) { }
    }

    localStorage.setItem(SESSION_ROLES_KEY, JSON.stringify(DEFAULT_SYSTEM_ROLES));
    return DEFAULT_SYSTEM_ROLES;
}

export function saveRole(role: Partial<RoleConfig>): RoleConfig {
    const roles = getRoles();
    const existingIndex = roles.findIndex(r => String(r.id) === String(role.id));
    let result: RoleConfig;

    if (existingIndex !== -1) {
        roles[existingIndex] = { ...roles[existingIndex], ...role } as RoleConfig;
        result = roles[existingIndex];
    } else {
        const newRole: RoleConfig = {
            id: role.id || Math.floor(Math.random() * 900000) + 1000,
            name: role.name || 'Nuevo Rol',
            key: role.key || `role_${Date.now()}`,
            status: role.status || 'Activo',
            permissions: role.permissions || []
        };
        roles.push(newRole);
        result = newRole;
    }

    localStorage.setItem(SESSION_ROLES_KEY, JSON.stringify(roles));
    addLog('UPDATE_ROLE', 'system', `Rol actualizado/creado: ${result.name}`);
    return result;
}

export function deleteRole(id: number) {
    let roles = getRoles();
    const role = roles.find(r => r.id === id);
    if (role && ['principal', 'administrador'].includes(role.key)) {
        alert('No se pueden eliminar roles de sistema críticos.');
        return;
    }
    roles = roles.filter(r => r.id !== id);
    localStorage.setItem(SESSION_ROLES_KEY, JSON.stringify(roles));
    addLog('DELETE_ROLE', 'system', `Rol eliminado ID: ${id}`);
}

// ============================================================
// System Logs (Sync)
// ============================================================

export function getLogs(): SystemLog[] {
    const logsJson = localStorage.getItem(SESSION_LOGS_KEY);
    if (logsJson) {
        try {
            return JSON.parse(logsJson);
        } catch (e) { }
    }
    return [];
}

export function addLog(action: string, user: string, details: string) {
    const logs = getLogs();
    const newLog: SystemLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action,
        user,
        details
    };
    logs.unshift(newLog);
    if (logs.length > 200) {
        logs.pop();
    }
    localStorage.setItem(SESSION_LOGS_KEY, JSON.stringify(logs));
}

const DASHBOARD_NOTES_KEY = 'luxius_dashboard_notes';

export function getDashboardNotes(userId: number | string): string {
    const key = `${DASHBOARD_NOTES_KEY}_${userId}`;
    return localStorage.getItem(key) || '';
}

export function saveDashboardNotes(userId: number | string, notes: string) {
    const key = `${DASHBOARD_NOTES_KEY}_${userId}`;
    localStorage.setItem(key, notes);
}

// ============================================================
// Logisticas (Sync)
// ============================================================

const DEFAULT_LOGISTICAS: Logistica[] = [
    { id: 1, nombre: 'Retiro en Local / Taller', descripcion: 'El cliente retira personalmente en taller', costo: 0, habilitado: true },
    { id: 2, nombre: 'Vía Cargo', descripcion: 'Envío por encomienda Vía Cargo', costo: 0, habilitado: true },
    { id: 3, nombre: 'Andreani', descripcion: 'Envío a sucursal o domicilio Andreani', costo: 0, habilitado: true },
    { id: 4, nombre: 'Mensajería / Moto', descripcion: 'Cadetería o moto express', costo: 0, habilitado: true },
    { id: 5, nombre: 'Flete / Transporte Propio', descripcion: 'Flete o logística propia', costo: 0, habilitado: true },
];

export function getLogisticas(): Logistica[] {
    const sessionItemsJson = localStorage.getItem(SESSION_LOGISTICAS_KEY);

    if (sessionItemsJson) {
        try {
            const parsed = JSON.parse(sessionItemsJson) as Logistica[];
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) { }
    }

    localStorage.setItem(SESSION_LOGISTICAS_KEY, JSON.stringify(DEFAULT_LOGISTICAS));
    return DEFAULT_LOGISTICAS;
}

export function saveLogistica(logistica: Partial<Logistica>): Logistica {
    let sessionItems: Logistica[] = [];

    const sessionJson = localStorage.getItem(SESSION_LOGISTICAS_KEY);
    if (sessionJson) {
        try {
            sessionItems = JSON.parse(sessionJson);
        } catch (e) { }
    }

    const existingIndex = sessionItems.findIndex(l => String(l.id) === String(logistica.id));
    let result: Logistica;

    if (existingIndex !== -1) {
        sessionItems[existingIndex] = { ...sessionItems[existingIndex], ...logistica } as Logistica;
        result = sessionItems[existingIndex];
    } else {
        const id = logistica.id || Math.floor(Math.random() * 900000) + 100000;
        const newLogistica: Logistica = {
            id,
            nombre: logistica.nombre || 'Nueva Logística',
            descripcion: logistica.descripcion || '',
            costo: logistica.costo || 0,
            habilitado: logistica.habilitado !== undefined ? logistica.habilitado : true
        };
        sessionItems.unshift(newLogistica);
        result = newLogistica;
    }

    localStorage.setItem(SESSION_LOGISTICAS_KEY, JSON.stringify(sessionItems));
    syncSave('logisticas', result);
    return result;
}

export function deleteLogistica(id: number) {
    const sessionJson = localStorage.getItem(SESSION_LOGISTICAS_KEY);
    if (sessionJson) {
        try {
            let sessionItems = JSON.parse(sessionJson) as Logistica[];
            sessionItems = sessionItems.filter(l => l.id !== id);
            localStorage.setItem(SESSION_LOGISTICAS_KEY, JSON.stringify(sessionItems));
        } catch (e) { }
    }
    syncDelete('logisticas', id);
}

// ============================================================
// XANA AI API BINDINGS
// ============================================================

export async function getXanaTasks(): Promise<XanaTask[]> {
    try {
        const res = await fetch(`${API_URL}/xana/tasks`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
}

export async function getXanaSessions(): Promise<XanaSession[]> {
    try {
        const res = await fetch(`${API_URL}/xana/sessions`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
}

export async function getXanaDecisions(): Promise<XanaDecision[]> {
    try {
        const res = await fetch(`${API_URL}/xana/decisions`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
}

export async function getXanaActions(): Promise<XanaAction[]> {
    try {
        const res = await fetch(`${API_URL}/xana/actions`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
}

export async function getXanaCommits(): Promise<XanaCommit[]> {
    try {
        const res = await fetch(`${API_URL}/xana/commits`, { headers: getAuthHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
}

export async function logXanaCommit(commit: Partial<XanaCommit>): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/xana/commits`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(commit)
        });
        return res.ok;
    } catch { return false; }
}

export async function getXanaPromptContext(): Promise<XanaPromptContext | null> {
    try {
        const res = await fetch(`${API_URL}/xana/prompt-context`, { headers: getAuthHeaders() });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}
