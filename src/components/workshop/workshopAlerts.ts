// workshopAlerts.ts - Alertas, resumen del día y estadísticas de estación del Print Den (Bloque F1/F2/F4)
// Todo se calcula con datos REALES del sistema (órdenes, materiales, máquinas). Nada se inventa:
// si un dato no existe, simplemente no se muestra. Funciones puras (sin Pixi ni React) para poder probarlas.

import type { Order } from '@/types/orden';
import type { Material, Maquina } from '@/types/entities';
import type { StationConfig, StationId } from './types';
import { ordersForStation } from './workshopPixiUtils';

export type AlertKind = 'stock' | 'offline' | 'mantenimiento' | 'atraso' | 'rebote';
export type AlertSeverity = 'warn' | 'danger';

export interface StationAlert {
    stationId: StationId;
    kind: AlertKind;
    severity: AlertSeverity;
    title: string;
    detail: string;
}

/** Estados en los que una orden sigue "viva" en el taller (para saber si está atrasada). */
const ACTIVE_STATUSES = ['diseno', 'orden', 'impreso', 'post', 'completo', 'rebotado'];
const PRODUCED_STATUSES = ['impreso', 'post', 'completo', 'entregado', 'finalizado'];
const DELIVERED_STATUSES = ['entregado', 'finalizado'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Día (a medianoche local) de una fecha en texto. Devuelve null si no se puede leer. */
export function parseDay(text?: string | null): number | null {
    if (!text) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(text));
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
    const d = new Date(String(text));
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

export const orderM2 = (o: Pick<Order, 'ancho' | 'alto' | 'copias'>): number => {
    const a = Number(o.ancho) || 0;
    const h = Number(o.alto) || 0;
    const c = Number(o.copias) || 1;
    return a * h * c;
};

export const fmtM2 = (n: number): string => (Math.round(n * 10) / 10).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Estación donde está una orden según su estado (la primera máquina recibe las de impresión). */
export function stationForStatus(status: string, stations: StationConfig[]): StationId | null {
    switch (status) {
        case 'diseno':
        case 'rebotado':
            return 'diseno';
        case 'orden': {
            const p = stations.find((s) => s.id.startsWith('plotter') || s.id.startsWith('maquina_'));
            return p ? p.id : null;
        }
        case 'impreso':
        case 'post':
            return 'corte';
        case 'completo':
            return 'empaque';
        default:
            return null;
    }
}

export function isOverdue(o: Order, now: Date): boolean {
    if (!ACTIVE_STATUSES.includes(o.status)) return false;
    const due = parseDay(o.fechaEntrega);
    return due !== null && due < startOfDay(now);
}

const listNames = (names: string[], max = 3) =>
    names.length <= max ? names.join(', ') : `${names.slice(0, max).join(', ')} y ${names.length - max} más`;

/** Alertas reales por estación. Una estación puede tener varias. */
export function computeStationAlerts(
    orders: Order[],
    materiales: Material[],
    maquinas: Maquina[],
    stations: StationConfig[],
    now: Date = new Date()
): StationAlert[] {
    const out: StationAlert[] = [];

    // 1. Stock bajo (insumos): solo materiales habilitados con mínimo y existencia cargados
    const low = materiales.filter(
        (m) =>
            m.habilitado !== false &&
            typeof m.stockMinimo === 'number' &&
            m.stockMinimo > 0 &&
            typeof m.stockActual === 'number' &&
            m.stockActual <= m.stockMinimo
    );
    if (low.length > 0 && stations.some((s) => s.id === 'insumos')) {
        out.push({
            stationId: 'insumos',
            kind: 'stock',
            severity: 'warn',
            title: `Stock bajo en ${low.length} ${plural(low.length, 'material', 'materiales')}`,
            detail: listNames(low.map((m) => `${m.codigo || m.descripcion} (${m.stockActual}/${m.stockMinimo})`))
        });
    }

    // 2. Máquinas fuera de línea o en mantenimiento
    for (const s of stations) {
        if (s.maquinaId == null && !s.id.startsWith('plotter')) continue;
        const maq = maquinas.find((m) => m.id === s.maquinaId);
        const estado = s.estado || maq?.estado;
        if (estado === 'offline') {
            out.push({
                stationId: s.id,
                kind: 'offline',
                severity: 'danger',
                title: `${s.title} está desconectada`,
                detail: 'Sin comunicación: las órdenes en cola no se pueden imprimir ahí.'
            });
        } else if (estado === 'mantenimiento') {
            out.push({
                stationId: s.id,
                kind: 'mantenimiento',
                severity: 'warn',
                title: `${s.title} en mantenimiento`,
                detail: 'Marcada en mantenimiento en el sistema.'
            });
        }
    }

    // 3. Órdenes atrasadas (fecha de entrega vencida), agrupadas por la estación donde están
    const lateByStation = new Map<StationId, Order[]>();
    for (const o of orders) {
        if (!isOverdue(o, now)) continue;
        const sid = stationForStatus(o.status, stations);
        if (!sid) continue;
        const arr = lateByStation.get(sid) ?? [];
        arr.push(o);
        lateByStation.set(sid, arr);
    }
    lateByStation.forEach((list, sid) => {
        out.push({
            stationId: sid,
            kind: 'atraso',
            severity: 'danger',
            title: `${list.length} ${plural(list.length, 'orden atrasada', 'órdenes atrasadas')}`,
            detail: listNames(list.map((o) => `OT #${o.ot || o.id}`))
        });
    });

    // 4. Rebotadas esperando en diseño
    const rebotadas = orders.filter((o) => o.status === 'rebotado');
    if (rebotadas.length > 0 && stations.some((s) => s.id === 'diseno')) {
        out.push({
            stationId: 'diseno',
            kind: 'rebote',
            severity: 'warn',
            title: `${rebotadas.length} ${plural(rebotadas.length, 'orden rebotada', 'órdenes rebotadas')}`,
            detail: listNames(rebotadas.map((o) => `OT #${o.ot || o.id}`))
        });
    }

    return out;
}

/** Severidad más alta y cantidad de alertas de una estación (para el ícono). */
export function summarizeAlerts(alerts: StationAlert[]): Map<StationId, { severity: AlertSeverity; count: number }> {
    const map = new Map<StationId, { severity: AlertSeverity; count: number }>();
    for (const a of alerts) {
        const cur = map.get(a.stationId);
        if (!cur) map.set(a.stationId, { severity: a.severity, count: 1 });
        else map.set(a.stationId, { severity: cur.severity === 'danger' || a.severity === 'danger' ? 'danger' : 'warn', count: cur.count + 1 });
    }
    return map;
}

/* ------------------------------ Resumen del día ------------------------------ */

export interface DaySummary {
    /** Órdenes entregadas/finalizadas cuya última actualización fue hoy. */
    entregadasHoy: number;
    /** m² de órdenes que pasaron a impreso o más adelante, con última actualización hoy. */
    m2Hoy: number;
    atrasadas: number;
    enCola: number;
}

const isToday = (iso: string | undefined, now: Date) => {
    if (!iso) return false;
    const d = new Date(iso);
    return !Number.isNaN(d.getTime()) && startOfDay(d) === startOfDay(now);
};

export function computeDaySummary(orders: Order[], now: Date = new Date()): DaySummary {
    let entregadasHoy = 0;
    let m2Hoy = 0;
    let atrasadas = 0;
    let enCola = 0;
    for (const o of orders) {
        if (DELIVERED_STATUSES.includes(o.status) && isToday(o.updatedAt, now)) entregadasHoy++;
        if (PRODUCED_STATUSES.includes(o.status) && isToday(o.updatedAt, now)) m2Hoy += orderM2(o);
        if (isOverdue(o, now)) atrasadas++;
        if (o.status === 'orden') enCola++;
    }
    return { entregadasHoy, m2Hoy, atrasadas, enCola };
}

/* ------------------------------ Ficha de estación ------------------------------ */

export interface StationStats {
    queue: number;
    queueM2: number;
    /** Próximas órdenes (hasta 4). */
    next: Order[];
    /** Solo máquinas: m² de las órdenes de esta máquina que pasaron a impreso o más, actualizadas hoy. */
    todayM2: number | null;
    /** Solo máquinas: cantidad de esas órdenes. */
    todayCount: number | null;
}

export function computeStationStats(station: StationConfig, orders: Order[], now: Date = new Date()): StationStats {
    const list = ordersForStation(station.id, orders);
    const isMachine = station.id.startsWith('plotter') || station.id.startsWith('maquina_');
    let todayM2: number | null = null;
    let todayCount: number | null = null;
    if (isMachine && station.maquinaId != null) {
        const mine = orders.filter(
            (o) => o.maquinaId === station.maquinaId && PRODUCED_STATUSES.includes(o.status) && isToday(o.updatedAt, now)
        );
        todayCount = mine.length;
        todayM2 = mine.reduce((acc, o) => acc + orderM2(o), 0);
    }
    return {
        queue: list.length,
        queueM2: list.reduce((acc, o) => acc + orderM2(o), 0),
        next: list.slice(0, 4),
        todayM2,
        todayCount
    };
}
