// workshopPixiUtils.ts - Utility functions and layout definitions for WorkshopCanvasPixi
// Separated to ensure Vite React Fast Refresh / HMR works flawlessly without full page reloads.

import { Order, OrderStatus } from '@/types/orden';
import { StationId, StationConfig } from './types';
import { getMaquinas } from '@/data/db';

export interface OrderStateSnapshot {
    [orderId: number]: OrderStatus;
}

export interface OrderDiff {
    orderId: number;
    prevStatus: OrderStatus | undefined;
    nextStatus: OrderStatus;
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
                nextStatus: 'entregado',
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
            width: 86,
            height: 72,
            color: '#8b5cf6',
            icon: '🖥️'
        }
    ];

    if (maquinas.length <= 1) {
        const m = maquinas[0];
        baseStations.push({
            id: 'plotter1',
            title: m?.nombre && m.nombre.length <= 16 ? m.nombre : 'Plotter',
            description: m ? `${m.tipo || 'Impresora'} (${m.anchoMaximo || 1.6}m) - Status: ${(m.estado || 'online').toUpperCase()}` : 'Impresora Roland gran formato.',
            x: 136,
            y: 36,
            width: 208,
            height: 74,
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
                width: Math.max(120, stepX - 6),
                height: 74,
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
            x: 378,
            y: 36,
            width: 86,
            height: 72,
            color: '#eab308',
            icon: '🎨'
        },
        {
            id: 'despacho',
            title: 'Despacho',
            description: 'Salida de paquetes y flete.',
            x: 16,
            y: 140,
            width: 86,
            height: 100,
            color: '#64748b',
            icon: '🚚'
        },
        {
            id: 'empaque',
            title: 'Empaque',
            description: 'Doblado, ojalillos y embalaje.',
            x: 114,
            y: 140,
            width: 120,
            height: 100,
            color: '#a855f7',
            icon: '📦'
        },
        {
            id: 'corte',
            title: 'Refilado',
            description: 'Corte, refilado y trillado.',
            x: 246,
            y: 140,
            width: 120,
            height: 100,
            color: '#ec4899',
            icon: '✂️'
        },
        {
            id: 'caja',
            title: 'Caja',
            description: 'Ventas, cobros y mostrador.',
            x: 378,
            y: 140,
            width: 86,
            height: 100,
            color: '#f59e0b',
            icon: '🪙'
        }
    );

    return baseStations;
};

export const getDynamicStations = getPixiStations;

export const countOrdersForStation = (stationId: StationId, ordersList: Order[]): number => {
    if (stationId === 'diseno') return ordersList.filter(o => o.status === 'diseno' || o.status === 'rebotado').length;
    if (stationId === 'plotter1' || stationId === 'plotter2' || stationId.startsWith('maquina_')) {
        return ordersList.filter(o => o.status === 'orden').length;
    }
    if (stationId === 'corte') return ordersList.filter(o => o.status === 'impreso' || o.status === 'post').length;
    if (stationId === 'empaque') return ordersList.filter(o => o.status === 'completo').length;
    if (stationId === 'despacho') return ordersList.filter(o => o.status === 'entregado').length;
    return 0;
};
