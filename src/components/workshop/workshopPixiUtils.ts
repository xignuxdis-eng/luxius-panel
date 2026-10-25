// workshopPixiUtils.ts - Utility functions and layout definitions for WorkshopCanvasPixi
// Separated to ensure Vite React Fast Refresh / HMR works flawlessly without full page reloads.

import { Order, OrderStatus } from '@/types/orden';
import { StationId, StationConfig } from './types';
import { getMaquinas, isCutMachine } from '@/data/db';
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
    const printMachines = maquinas.filter(m => !isCutMachine(m));

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
            x: 68,
            y: 36,
            width: 50,
            height: 60,
            color: '#14b8a6',
            icon: '☕',
            propsScale: 0.82
        }
    ];

    if (printMachines.length <= 1) {
        const m = printMachines[0];
        baseStations.push({
            id: 'plotter1',
            title: m?.nombre && m.nombre.length <= 16 ? m.nombre : 'Plotter RS-640',
            description: m ? `${m.tipo || 'Impresora'} (${m.anchoMaximo || 1.6}m) - Status: ${(m.estado || 'online').toUpperCase()}` : 'Impresora Roland RS-640 (1.60m).',
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
        // Dos plotters de impresión: RS-640 (1.60m, más angosto) y SolJet Pro III (1.90m, más ancho)
        const m1 = printMachines[0]; // RS-640
        const m2 = printMachines[1]; // SolJet Pro III

        baseStations.push(
            {
                id: 'plotter1',
                title: m1.nombre && m1.nombre.length <= 14 ? m1.nombre : 'RS-640 (1.6m)',
                description: `${m1.nombre || 'Roland RS-640'} (${m1.anchoMaximo || 1.60}m) - Status: ${(m1.estado || 'online').toUpperCase()}`,
                x: 126,
                y: 36,
                width: 124,
                height: Math.round(74 * WORKSHOP_CONFIG.plotterScale),
                color: m1.estado === 'offline' ? '#64748b' : '#22c55e',
                icon: '🖨️',
                maquinaId: m1.id,
                estado: m1.estado
            },
            {
                id: 'plotter2',
                title: m2.nombre && m2.nombre.length <= 14 ? m2.nombre : 'SolJet (1.9m)',
                description: `${m2.nombre || 'Roland SolJet Pro III'} (${m2.anchoMaximo || 1.90}m) - Status: ${(m2.estado || 'online').toUpperCase()}`,
                x: 258,
                y: 36,
                width: 148,
                height: Math.round(74 * WORKSHOP_CONFIG.plotterScale),
                color: m2.estado === 'offline' ? '#64748b' : '#06b6d4',
                icon: '🖨️',
                maquinaId: m2.id,
                estado: m2.estado
            }
        );

        // Si hubiera terceras impresoras adicionales
        if (printMachines.length > 2) {
            printMachines.slice(2).forEach((m) => {
                baseStations.push({
                    id: `maquina_${m.id}`,
                    title: m.nombre || 'Plotter',
                    description: `${m.tipo || 'Impresora'} (${m.anchoMaximo || 1.6}m) - Status: ${(m.estado || 'online').toUpperCase()}`,
                    x: 240,
                    y: 36,
                    width: 120,
                    height: Math.round(74 * WORKSHOP_CONFIG.plotterScale),
                    color: '#eab308',
                    icon: '🖨️',
                    maquinaId: m.id,
                    estado: m.estado
                });
            });
        }
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
            width: 62,
            height: 72,
            color: '#64748b',
            icon: '🚚',
            propsScale: 0.72
        },
        {
            id: 'empaque',
            title: 'Empaque',
            description: 'Doblado, ojalillos y embalaje.',
            x: 96,
            y: 170,
            width: 72,
            height: 68,
            color: '#a855f7',
            icon: '📦',
            propsScale: 0.64
        },
        {
            id: 'corte',
            title: 'Refilado',
            description: 'Mesa de corte manual, refilado y trillado.',
            x: 184,
            y: 164,
            width: 68,
            height: 62,
            color: '#ec4899',
            icon: '✂️',
            propsScale: 0.58
        },
        {
            id: 'plotter_corte',
            title: 'Plotter Corte',
            description: 'Mimaki CG-60SR (0.60m) - Medio corte y troquelado.',
            x: 270,
            y: 164,
            width: 84,
            height: 64,
            color: '#06b6d4',
            icon: '📐',
            propsScale: 0.65
        },
        {
            id: 'caja',
            title: 'Caja',
            description: 'Ventas, cobros y mostrador.',
            x: 396,
            y: 168,
            width: 54,
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
    if (stationId === 'plotter1') {
        // Roland RS-640 (1.60m)
        return ordersList.filter(o => {
            if (o.status !== 'orden') return false;
            if (o.maquinaId === 1 || o.maquinaId === 901) return true;
            if (o.maquinaId === 2 || o.maquinaId === 902) return false;
            const w = Math.min(Number(o.ancho) || 0, Number(o.alto) || 0);
            const realW = w > 20 ? w / 100 : w;
            return realW <= 1.60;
        });
    }
    if (stationId === 'plotter2') {
        // Roland SolJet Pro III (1.90m)
        return ordersList.filter(o => {
            if (o.status !== 'orden') return false;
            if (o.maquinaId === 2 || o.maquinaId === 902) return true;
            if (o.maquinaId === 1 || o.maquinaId === 901) return false;
            const w = Math.min(Number(o.ancho) || 0, Number(o.alto) || 0);
            const realW = w > 20 ? w / 100 : w;
            return realW > 1.60;
        });
    }
    if (stationId.startsWith('maquina_')) {
        const mId = parseInt(stationId.replace('maquina_', ''), 10);
        return ordersList.filter(o => o.status === 'orden' && o.maquinaId === mId);
    }
    // Sector nuevo: Plotter de corte (Mimaki CG-60SR)
    if (stationId === 'plotter_corte') {
        return ordersList.filter(o => {
            const hasCorte = o.corte && (o.corte.tipo === 'medio' || o.corte.tipo === 'completo');
            if (!hasCorte) return false;
            return o.status === 'impreso' || o.status === 'orden' || o.status === 'post';
        });
    }
    // Refilado manual: órdenes impresas sin corte en plotter (o con corte ya finalizado)
    if (stationId === 'corte') {
        return ordersList.filter(o => {
            const hasPlotterCorte = o.corte && (o.corte.tipo === 'medio' || o.corte.tipo === 'completo');
            if (hasPlotterCorte && o.corte?.estado !== 'cortado') return false;
            return o.status === 'impreso' || o.status === 'post';
        });
    }
    if (stationId === 'empaque') return ordersList.filter(o => o.status === 'completo');
    if (stationId === 'despacho') return ordersList.filter(o => o.status === 'entregado');
    return [];
};

export const countOrdersForStation = (stationId: StationId, ordersList: Order[]): number =>
    ordersForStation(stationId, ordersList).length;
