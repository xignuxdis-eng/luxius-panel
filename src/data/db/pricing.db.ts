/**
 * Luxius System - Pricing, Rates, Combos, Currencies, Cashboxes & Banking
 */

import type {
    TarifaEntry,
    TarifasXignux,
    ComboItemComponent,
    ComboData,
    MonedaConfig,
    Caja,
    MovimientoCaja,
    Banco
} from './types';
import {
    SESSION_COMBOS_KEY,
    HIDDEN_COMBOS_KEY,
    SESSION_MATERIALES_KEY,
    SESSION_SERVICIOS_KEY
} from './cache';
import { API_URL, getAuthHeaders, syncSave, syncDelete } from './client';
import { getMateriales } from './inventory.db';
import { getServicios } from './system.db';

export type { TarifaEntry, TarifasXignux, ComboItemComponent, ComboData };

// ============================================================
// TARIFAS XIGNUX — Tarifario global centralizado
// ============================================================

export async function getTarifasXignux(): Promise<TarifasXignux> {
    try {
        const res = await fetch(`${API_URL}/tarifas`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('luxius_tarifas_xignux', JSON.stringify(data));
            return data;
        }
    } catch (e) {
        console.warn('[Tarifas] API offline, usando localStorage');
    }

    const stored = localStorage.getItem('luxius_tarifas_xignux');
    if (stored) {
        try {
            return JSON.parse(stored) as TarifasXignux;
        } catch (e) { }
    }

    return {};
}

/**
 * Lectura sincrona del tarifario para calculos inmediatos de precios en cliente
 */
export function getTarifasXignuxSync(): TarifasXignux {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('luxius_tarifas_xignux') : null;
    if (stored) {
        try {
            return JSON.parse(stored) as TarifasXignux;
        } catch (e) { }
    }
    return {};
}

export async function saveTarifasXignux(tarifas: TarifasXignux): Promise<boolean> {
    localStorage.setItem('luxius_tarifas_xignux', JSON.stringify(tarifas));

    const mats = getMateriales();
    let matsUpdated = false;
    mats.forEach(m => {
        const key = m.codigo?.toLowerCase() || m.descripcion.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (tarifas[key] && typeof tarifas[key].precio === 'number') {
            m.precioM2 = tarifas[key].precio;
            matsUpdated = true;
        }
    });
    if (matsUpdated) {
        localStorage.setItem(SESSION_MATERIALES_KEY, JSON.stringify(mats));
    }

    const servs = getServicios();
    let servsUpdated = false;
    servs.forEach(s => {
        const key = s.codigo?.toLowerCase() || s.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (tarifas[key] && typeof tarifas[key].precio === 'number') {
            s.precioBase = tarifas[key].precio;
            servsUpdated = true;
        }
    });
    if (servsUpdated) {
        localStorage.setItem(SESSION_SERVICIOS_KEY, JSON.stringify(servs));
    }

    try {
        const res = await fetch(`${API_URL}/tarifas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tarifas),
        });
        return res.ok;
    } catch (e) {
        console.warn('[Tarifas] API offline, guardado solo en localStorage');
        return true;
    }
}

// ============================================================
// COMBOS Y PRODUCTOS COMBINADOS
// ============================================================

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

    const existingIndex = sessionItems.findIndex(c => String(c.id) === String(combo.id));
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

// ==========================================
// MONEDAS Y COTIZACIONES
// ==========================================

const SESSION_MONEDAS_KEY = 'luxius_monedas';

export function getMonedas(): MonedaConfig[] {
    const raw = localStorage.getItem(SESSION_MONEDAS_KEY);
    if (raw) {
        try { return JSON.parse(raw); } catch {}
    }
    const defaultMonedas: MonedaConfig[] = [
        {
            id: 'ARS',
            codigo: 'ARS',
            nombre: 'Peso Argentino',
            simbolo: '$',
            cotizacion: 1,
            cotizacionTaller: 1,
            esBase: true,
            autoSync: false,
            margenSeguridad: 0,
            ultimaActualizacion: new Date().toISOString()
        },
        {
            id: 'USD_BLUE',
            codigo: 'USD',
            nombre: 'Dólar Blue / Informal',
            simbolo: 'US$',
            cotizacion: 1380,
            cotizacionTaller: 1400,
            esBase: false,
            autoSync: true,
            margenSeguridad: 2.5,
            ultimaActualizacion: new Date().toISOString()
        },
        {
            id: 'USD_OFICIAL',
            codigo: 'USD_OF',
            nombre: 'Dólar Oficial (BNA)',
            simbolo: 'US$ OF',
            cotizacion: 1040,
            cotizacionTaller: 1060,
            esBase: false,
            autoSync: true,
            margenSeguridad: 2.0,
            ultimaActualizacion: new Date().toISOString()
        },
        {
            id: 'EUR',
            codigo: 'EUR',
            nombre: 'Euro',
            simbolo: '€',
            cotizacion: 1520,
            cotizacionTaller: 1550,
            esBase: false,
            autoSync: false,
            margenSeguridad: 2.0,
            ultimaActualizacion: new Date().toISOString()
        },
        {
            id: 'USDT',
            codigo: 'USDT',
            nombre: 'Dólar Cripto (USDT)',
            simbolo: '₮',
            cotizacion: 1390,
            cotizacionTaller: 1420,
            esBase: false,
            autoSync: true,
            margenSeguridad: 2.0,
            ultimaActualizacion: new Date().toISOString()
        }
    ];
    localStorage.setItem(SESSION_MONEDAS_KEY, JSON.stringify(defaultMonedas));
    return defaultMonedas;
}

export function saveMoneda(moneda: Partial<MonedaConfig>): MonedaConfig[] {
    const list = getMonedas();
    const idx = list.findIndex(m => m.id === moneda.id);
    if (idx !== -1) {
        list[idx] = { ...list[idx], ...moneda, ultimaActualizacion: new Date().toISOString() };
    } else {
        const newMoneda: MonedaConfig = {
            id: moneda.id || `MON_${Date.now()}`,
            codigo: moneda.codigo || 'DIV',
            nombre: moneda.nombre || 'Nueva Moneda',
            simbolo: moneda.simbolo || '$',
            cotizacion: moneda.cotizacion || 1,
            cotizacionTaller: moneda.cotizacionTaller || moneda.cotizacion || 1,
            esBase: moneda.esBase || false,
            autoSync: moneda.autoSync || false,
            margenSeguridad: moneda.margenSeguridad || 0,
            ultimaActualizacion: new Date().toISOString()
        };
        list.push(newMoneda);
    }
    localStorage.setItem(SESSION_MONEDAS_KEY, JSON.stringify(list));
    return list;
}

// ==========================================
// CAJAS Y FLUJO DE EFECTIVO
// ==========================================

const SESSION_CAJAS_KEY = 'luxius_cajas';
const SESSION_MOV_CAJA_KEY = 'luxius_movimientos_caja';

export function getCajas(): Caja[] {
    const raw = localStorage.getItem(SESSION_CAJAS_KEY);
    if (raw) {
        try { return JSON.parse(raw); } catch {}
    }
    const defaultCajas: Caja[] = [
        {
            id: 1,
            nombre: 'Caja Mostrador / Recepción',
            tipo: 'efectivo',
            moneda: 'ARS',
            saldoActual: 85400,
            responsable: 'Atención al Cliente',
            estado: 'abierta',
            descripcion: 'Cobros diarios en mostrador, señas en efectivo y cambio.',
            habilitada: true
        },
        {
            id: 2,
            nombre: 'Caja Chica Taller',
            tipo: 'efectivo',
            moneda: 'ARS',
            saldoActual: 32000,
            responsable: 'Jefe de Taller',
            estado: 'abierta',
            descripcion: 'Gastos menores de ferretería, cinta, viáticos y fletes urgentes.',
            habilitada: true
        },
        {
            id: 3,
            nombre: 'Caja Fuerte USD',
            tipo: 'dolares',
            moneda: 'USD',
            saldoActual: 2450,
            responsable: 'Administración',
            estado: 'abierta',
            descripcion: 'Reserva de dólares en efectivo para insumos y cabezales.',
            habilitada: true
        },
        {
            id: 4,
            nombre: 'Mercado Pago / Digital',
            tipo: 'digital',
            moneda: 'ARS',
            saldoActual: 148500,
            responsable: 'Administración',
            estado: 'abierta',
            descripcion: 'Cobros QR, links de pago y transferencias directas.',
            habilitada: true
        }
    ];
    localStorage.setItem(SESSION_CAJAS_KEY, JSON.stringify(defaultCajas));
    return defaultCajas;
}

export function saveCaja(caja: Partial<Caja>): Caja {
    const list = getCajas();
    const idx = list.findIndex(c => c.id === caja.id);
    let result: Caja;
    if (idx !== -1) {
        list[idx] = { ...list[idx], ...caja } as Caja;
        result = list[idx];
    } else {
        const newCaja: Caja = {
            id: caja.id || Math.floor(Math.random() * 90000) + 1000,
            nombre: caja.nombre || 'Nueva Caja',
            tipo: caja.tipo || 'efectivo',
            moneda: caja.moneda || 'ARS',
            saldoActual: caja.saldoActual || 0,
            responsable: caja.responsable || 'General',
            estado: caja.estado || 'abierta',
            descripcion: caja.descripcion || '',
            habilitada: caja.habilitada !== false
        };
        list.push(newCaja);
        result = newCaja;
    }
    localStorage.setItem(SESSION_CAJAS_KEY, JSON.stringify(list));
    return result;
}

export function deleteCaja(id: number) {
    const list = getCajas().filter(c => c.id !== id);
    localStorage.setItem(SESSION_CAJAS_KEY, JSON.stringify(list));
}

export function getMovimientosCaja(): MovimientoCaja[] {
    const raw = localStorage.getItem(SESSION_MOV_CAJA_KEY);
    if (raw) {
        try { return JSON.parse(raw); } catch {}
    }
    const defaultMovs: MovimientoCaja[] = [
        {
            id: 1,
            cajaId: 1,
            fecha: new Date(Date.now() - 3600000 * 5).toISOString(),
            tipo: 'apertura',
            categoria: 'Apertura de Caja',
            concepto: 'Apertura de caja con fondo para cambio',
            monto: 30000,
            moneda: 'ARS',
            usuario: 'Recepción'
        },
        {
            id: 2,
            cajaId: 1,
            fecha: new Date(Date.now() - 3600000 * 3).toISOString(),
            tipo: 'ingreso',
            categoria: 'Seña',
            concepto: 'Seña 50% Orden #1042 (Lona Front)',
            monto: 45400,
            moneda: 'ARS',
            pedidoId: 1042,
            usuario: 'Ventas'
        },
        {
            id: 3,
            cajaId: 2,
            fecha: new Date(Date.now() - 3600000 * 2).toISOString(),
            tipo: 'egreso',
            categoria: 'Insumos Taller',
            concepto: 'Compra cinta bifaz y cutters ferretería',
            monto: 8500,
            moneda: 'ARS',
            comprobante: 'Factura B #4492',
            usuario: 'Taller'
        }
    ];
    localStorage.setItem(SESSION_MOV_CAJA_KEY, JSON.stringify(defaultMovs));
    return defaultMovs;
}

export function saveMovimientoCaja(mov: Partial<MovimientoCaja>): MovimientoCaja {
    const movs = getMovimientosCaja();
    const newMov: MovimientoCaja = {
        id: mov.id || Math.floor(Math.random() * 900000) + 1000,
        cajaId: mov.cajaId || 1,
        fecha: mov.fecha || new Date().toISOString(),
        tipo: mov.tipo || 'ingreso',
        categoria: mov.categoria || 'Otro',
        concepto: mov.concepto || 'Movimiento de caja',
        monto: Math.abs(mov.monto || 0),
        moneda: mov.moneda || 'ARS',
        pedidoId: mov.pedidoId,
        comprobante: mov.comprobante,
        usuario: mov.usuario || 'Sistema'
    };
    movs.unshift(newMov);
    localStorage.setItem(SESSION_MOV_CAJA_KEY, JSON.stringify(movs));

    const cajas = getCajas();
    const cIdx = cajas.findIndex(c => c.id === newMov.cajaId);
    if (cIdx !== -1) {
        if (newMov.tipo === 'ingreso' || newMov.tipo === 'apertura') {
            cajas[cIdx].saldoActual += newMov.monto;
        } else if (newMov.tipo === 'egreso') {
            cajas[cIdx].saldoActual = Math.max(0, cajas[cIdx].saldoActual - newMov.monto);
        } else if (newMov.tipo === 'ajuste') {
            cajas[cIdx].saldoActual = newMov.monto;
        }
        localStorage.setItem(SESSION_CAJAS_KEY, JSON.stringify(cajas));
    }

    return newMov;
}

// ==========================================
// BANCOS Y CUENTAS
// ==========================================

const SESSION_BANCOS_KEY = 'luxius_bancos';

export function getBancos(): Banco[] {
    const raw = localStorage.getItem(SESSION_BANCOS_KEY);
    if (raw) {
        try { return JSON.parse(raw); } catch {}
    }
    syncBancosFromBackend();
    return [];
}

async function syncBancosFromBackend() {
    try {
        const res = await fetch(`${API_URL}/stats/bancos`, { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                localStorage.setItem(SESSION_BANCOS_KEY, JSON.stringify(data));
            }
        }
    } catch { }
}

export function saveBanco(banco: Partial<Banco>): Banco {
    const list = getBancos();
    const idx = list.findIndex(b => b.id === banco.id);
    let result: Banco;
    if (idx !== -1) {
        list[idx] = { ...list[idx], ...banco } as Banco;
        result = list[idx];
    } else {
        const newBanco: Banco = {
            id: banco.id || Math.floor(Math.random() * 90000) + 1000,
            nombre: banco.nombre || 'Nuevo Banco',
            tipoCuenta: banco.tipoCuenta || 'corriente',
            numeroCuenta: banco.numeroCuenta || '',
            cbu: banco.cbu || '',
            alias: banco.alias || '',
            titular: banco.titular || '',
            cuitTitular: banco.cuitTitular || '',
            saldoActual: banco.saldoActual || 0,
            moneda: banco.moneda || 'ARS',
            habilitado: banco.habilitado !== false
        };
        list.push(newBanco);
        result = newBanco;
    }
    localStorage.setItem(SESSION_BANCOS_KEY, JSON.stringify(list));
    _pushBancosToBackend(list);
    return result;
}

export function deleteBanco(id: number) {
    const list = getBancos().filter(b => b.id !== id);
    localStorage.setItem(SESSION_BANCOS_KEY, JSON.stringify(list));
    _pushBancosToBackend(list);
}

function _pushBancosToBackend(list: Banco[]) {
    fetch(`${API_URL}/stats/bancos`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(list)
    }).catch(() => { });
}
