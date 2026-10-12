// workshopRealClients.ts - Gestión de Clientes Reales con Metros Impresos para el Taller
// Los clientes aparecen en el taller como visitas acotadas al mostrador (caja/despacho)
// con nombres de clientes reales del sistema (ej: "Miguel Zacco:Axis") y datos de metros impresos.

import type { Order } from '@/types/orden';
import type { GuestKindConfig } from './content/guests';
import { fmtM2 } from './workshopAlerts';

export interface RealClientVisit {
    name: string;
    company: string;
    ordersCount: number;
    totalM2: number;
    stayMs: number;
    shirtColor: string;
    skinColor: string;
    hairColor: string;
    lines: string[];
}

/** Clientes insignia con metros impresos reales en el sistema de XignuX */
export const PREMIER_REAL_CLIENTS: RealClientVisit[] = [
    {
        name: 'Miguel Zacco:Axis',
        company: 'Axis',
        ordersCount: 89,
        totalM2: 416.8,
        stayMs: 12000, // 12 segundos (muy acotado)
        shirtColor: '#0284c7', // Azul corporativo Axis
        skinColor: '#f5d0a9',
        hairColor: '#334155',
        lines: [
            '¡Buen día equipo! Vengo a ver los metros de Axis.',
            '¿Cómo viene la tirada de lonas para Axis?',
            'Excelente nitidez y fidelidad de color como siempre.',
            'Ya me llevo los pliegos de Axis. ¡Gran trabajo chicos!'
        ]
    },
    {
        name: 'Paola Goffredo',
        company: 'Paola Goffredo',
        ordersCount: 7,
        totalM2: 34.5,
        stayMs: 11000,
        shirtColor: '#ec4899',
        skinColor: '#fed7aa',
        hairColor: '#451a03',
        lines: [
            'Hola, paso a retirar el trabajo de impresión.',
            '¡Qué lindo quedó el cartel!',
            'Muchas gracias, ya me lo llevo listo para colocar.'
        ]
    },
    {
        name: 'José Boterberg',
        company: 'José Boterberg',
        ordersCount: 3,
        totalM2: 18.2,
        stayMs: 10000,
        shirtColor: '#10b981',
        skinColor: '#f5d0a9',
        hairColor: '#1f2937',
        lines: [
            'Buen día, consulto por los vinilos impresos.',
            'Impecable la definición y el corte.',
            '¡Nos vemos en el próximo pedido!'
        ]
    }
];

/**
 * Normaliza nombres de clientes conocidos a su formato de empresa/titular.
 * Especialmente "Axis" -> "Miguel Zacco:Axis"
 */
export function normalizeClientName(rawName?: string | null): { name: string; company: string; isAxis: boolean } {
    const clean = (rawName || '').trim();
    if (!clean) return { name: 'Cliente', company: 'General', isAxis: false };
    
    if (/axis|zacco/i.test(clean)) {
        return { name: 'Miguel Zacco:Axis', company: 'Axis', isAxis: true };
    }
    
    return { name: clean, company: clean, isAxis: false };
}

/**
 * Agrupa y calcula los metros impresos reales de cada cliente según las órdenes activas y pasadas.
 */
export function computeRealClientsRanking(orders: Order[]): RealClientVisit[] {
    const clientMap = new Map<string, { company: string; ordersCount: number; totalM2: number; isAxis: boolean }>();

    // Inicializar clientes insignia
    for (const premier of PREMIER_REAL_CLIENTS) {
        clientMap.set(premier.name, {
            company: premier.company,
            ordersCount: premier.ordersCount,
            totalM2: premier.totalM2,
            isAxis: premier.company === 'Axis'
        });
    }

    // Acumular órdenes actuales en memoria
    for (const o of orders) {
        const { name, company, isAxis } = normalizeClientName(o.clienteNombre || o.clientName);
        const m2 = Math.max(0.01, (o.ancho || 0) * (o.alto || 0) * (o.copias || 1));
        
        const existing = clientMap.get(name);
        if (existing) {
            existing.ordersCount += 1;
            existing.totalM2 += m2;
        } else {
            clientMap.set(name, {
                company,
                ordersCount: 1,
                totalM2: m2,
                isAxis
            });
        }
    }

    const list: RealClientVisit[] = [];
    for (const [name, stats] of clientMap.entries()) {
        const isAxis = stats.isAxis;
        const totalM2Formatted = fmtM2(stats.totalM2);
        list.push({
            name,
            company: stats.company,
            ordersCount: stats.ordersCount,
            totalM2: Math.round(stats.totalM2 * 100) / 100,
            stayMs: isAxis ? 12000 : 10000, // Permanencia breve (10 a 12s)
            shirtColor: isAxis ? '#0284c7' : '#0ea5e9',
            skinColor: '#f5d0a9',
            hairColor: '#334155',
            lines: isAxis
                ? [
                    '¡Buen día equipo! Vengo a ver los metros de Axis.',
                    `¿Cómo viene la tirada para Axis? Llevamos ${stats.ordersCount} órdenes impresas.`,
                    'Excelente nitidez y fidelidad de color como siempre.',
                    'Ya me llevo los pliegos de Axis. ¡Gran trabajo chicos!'
                ]
                : [
                    `Buen día, vengo a retirar los ${totalM2Formatted} m² de mi pedido.`,
                    `¿Ya está lista la orden de ${stats.company}?`,
                    '¡Impresionante la rapidez de entrega!',
                    'Muchas gracias, ya me lo llevo listo para entrega.'
                ]
        });
    }

    // Ordenar por metros impresos descendente (Miguel Zacco:Axis primero)
    list.sort((a, b) => b.totalM2 - a.totalM2);
    return list;
}

/**
 * Selecciona el próximo cliente real que visitará el mostrador.
 * Prioriza con alta frecuencia a "Miguel Zacco:Axis" (cliente #1 en metros impresos).
 */
export function pickNextClientVisit(orders: Order[], rng: () => number = Math.random): Partial<GuestKindConfig> {
    const ranking = computeRealClientsRanking(orders);
    if (!ranking.length) {
        return {
            name: 'Miguel Zacco:Axis',
            shirt: '#0284c7',
            stayMs: 12000,
            lines: PREMIER_REAL_CLIENTS[0].lines
        };
    }

    // 70% de las veces elige al cliente líder en metros impresos (Miguel Zacco:Axis)
    const pick = (rng() < 0.7 || ranking.length === 1)
        ? ranking[0]
        : ranking[1 + Math.floor(rng() * (ranking.length - 1))];

    return {
        name: pick.name,
        shirt: pick.shirtColor,
        skin: pick.skinColor,
        hair: pick.hairColor,
        speed: 29,
        stayMs: pick.stayMs, // Tiempo de permanencia acotado (10-12s)
        tone: 'info',
        lines: pick.lines
    };
}
