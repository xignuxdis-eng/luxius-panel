// workshopPixiUtils.ts - Utility functions and layout definitions for WorkshopCanvasPixi
// Separated to ensure Vite React Fast Refresh / HMR works flawlessly without full page reloads.

import { Order, OrderStatus } from '@/types/orden';
import { StationId, StationConfig } from './types';
import { getMaquinas } from '@/data/db';
import { WORKSHOP_CONFIG } from './content/config';

export interface OrderStateSnapshot {
    [orderId: number]: OrderStatus;
}

export interface OrderDiff {
    orderId: number;
    prevStatus: OrderStatus | undefined;
    /** undefined cuando la orden desapareció de la lista (no se inventa un estado). */
    nextStatus: OrderStatus | undefined;
    order: Order;
    changeType: 'new' | 'status_change' | 'removed';
}

/**
 * Calculates diffs between previous order state and incoming orders.
 */
export function diffOrders(
    prevSnapshot: OrderStateSnapshot,
    nextOrders: Order[]
): { diffs: OrderDiff[]; nextSnapshot: OrderStateSnapshot } {
    const nextSnapshot: OrderStateSnapshot = {};
    const diffs: OrderDiff[] = [];
    const seenIds = new Set<number>();

    for (const order of nextOrders) {
        seenIds.add(order.id);
        nextSnapshot[order.id] = order.status;
        const prevStatus = prevSnapshot[order.id];

        if (prevStatus === undefined) {
            diffs.push({
                orderId: order.id,
                prevStatus: undefined,
                nextStatus: order.status,
                order,
                changeType: 'new'
            });
        } else if (prevStatus !== order.status) {
            diffs.push({
                orderId: order.id,
                prevStatus,
                nextStatus: order.status,
                order,
                changeType: 'status_change'
            });
        }
    }

    // Check for removed orders
    for (const idStr of Object.keys(prevSnapshot)) {
        const id = Number(idStr);
        if (!seenIds.has(id)) {
            diffs.push({
                orderId: id,
                prevStatus: prevSnapshot[id],
                nextStatus: undefined,
                order: { id } as Order,
                changeType: 'removed'
            });
        }
    }

    return { diffs, nextSnapshot };
}

/**
 * Native 480x270 Top-down Workshop Stations Layout
 * Enlarged station areas with concise labels to prevent any text clipping.
 */
export const getPixiStations = (): StationConfig[] => {
    const maquinas = getMaquinas();

    const baseStations: StationConfig[] = [
        {
            id: 'diseno',
            title: 'Diseño',
            description: 'Mesa de pre-prensa y validación de artes.',
            x: 16,
            y: 36,
            width: 46,
            height: 44,
            color: '#8b5cf6',
            icon: '🖥️',
            propsScale: 0.5
        },
        {
            id: 'refrigerios',
            title: 'Refrigerios',
            description: 'Zona de descanso: heladera, cafetera y cocina para una pausa.',
            x: 70,
            y: 36,
            width: 52,
            height: 60,
            color: '#14b8a6',
            icon: '☕',
            propsScale: 0.82
        }
    ];

    if (maquinas.length <= 1) {
        const m = maquinas[0];
        baseStations.push({
            id: 'plotter1',
            title: m?.nombre && m.nombre.length <= 16 ? m.nombre : 'Plotter',
            description: m ? `${m.tipo || 'Impresora'} (${m.anchoMaximo || 1.6}m) - Status: ${(m.estado || 'online').toUpperCase()}` : 'Impresora Roland gran formato.',
            x: 240 - Math.round(104 * WORKSHOP_CONFIG.plotterScale),
            y: 36,
            width: Math.round(208 * WORKSHOP_CONFIG.plotterScale),
            height: Math.round(74 * WORKSHOP_CONFIG.plotterScale),
            color: m?.estado === 'offline' ? '#64748b' : '#22c55e',
            icon: '🖨️',
            maquinaId: m?.id,
            estado: m?.estado || 'online'
        });
    } else {
        const startX = 114;
        const availableW = 252;
        const count = maquinas.length;
        const stepX = Math.floor(availableW / count);

        maquinas.forEach((m, idx) => {
            const colors = ['#22c55e', '#06b6d4', '#ec4899', '#eab308', '#3b82f6'];
            const color = colors[idx % colors.length];
            const stationId = idx === 0 ? 'plotter1' : idx === 1 ? 'plotter2' : `maquina_${m.id}`;

            baseStations.push({
                id: stationId,
                title: m.nombre && m.nombre.length <= 14 ? m.nombre : (idx === 0 ? 'Plotter 1' : idx === 1 ? 'Plotter 2' : (m.nombre || 'Plotter')),
                description: `${m.tipo || 'Impresora'} (${m.anchoMaximo || 1.6}m) - Status: ${(m.estado || 'online').toUpperCase()}`,
                x: startX + idx * stepX,
                y: 36,
                width: Math.max(100, stepX - 6),
                height: Math.round(74 * WORKSHOP_CONFIG.plotterScale),
                color: m.estado === 'offline' ? '#64748b' : color,
                icon: '🖨️',
                maquinaId: m.id,
                estado: m.estado
            });
        });
    }

    baseStations.push(
        {
            id: 'insumos',
            title: 'Insumos',
            description: 'Tintas CMYK y bobinas en stock.',
            x: 418,
            y: 36,
            width: 46,
            height: 44,
            color: '#eab308',
            icon: '🎨',
            propsScale: 0.5
        },
        {
            id: 'despacho',
            title: 'Despacho',
            description: 'Salida de paquetes y flete.',
            x: 16,
            y: 166,
            width: 64,
            height: 72,
            color: '#64748b',
            icon: '🚚',
            propsScale: 0.72
        },
        {
            id: 'empaque',
            title: 'Empaque',
            description: 'Doblado, ojalillos y embalaje.',
            x: 118,
            y: 170,
            width: 78,
            height: 68,
            color: '#a855f7',
            icon: '📦',
            propsScale: 0.64
        },
        {
            id: 'corte',
            title: 'Refilado',
            description: 'Corte, refilado y trillado.',
            x: 238,
            y: 164,
            width: 70,
            height: 62,
            color: '#ec4899',
            icon: '✂️',
            propsScale: 0.58
        },
        {
            id: 'caja',
            title: 'Caja',
            description: 'Ventas, cobros y mostrador.',
            x: 404,
            y: 168,
            width: 52,
            height: 64,
            color: '#f59e0b',
            icon: '🪙',
            propsScale: 0.6
        }
    );

    return baseStations;
};

export const getDynamicStations = getPixiStations;

/** Órdenes del sistema que corresponden a una estación (mismas reglas que el contador). */
export const ordersForStation = (stationId: StationId, ordersList: Order[]): Order[] => {
    if (stationId === 'diseno') return ordersList.filter(o => o.status === 'diseno' || o.status === 'rebotado');
    if (stationId === 'plotter1' || stationId === 'plotter2' || stationId.startsWith('maquina_')) {
        return ordersList.filter(o => o.status === 'orden');
    }
    if (stationId === 'corte') return ordersList.filter(o => o.status === 'impreso' || o.status === 'post');
    if (stationId === 'empaque') return ordersList.filter(o => o.status === 'completo');
    if (stationId === 'despacho') return ordersList.filter(o => o.status === 'entregado');
    return [];
};

export const countOrdersForStation = (stationId: StationId, ordersList: Order[]): number =>
    ordersForStation(stationId, ordersList).length;
