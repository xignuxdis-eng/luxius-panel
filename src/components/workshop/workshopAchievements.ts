// workshopAchievements.ts - Logros "estilo WoW" del Print Den (Bloque F5)
// Se calculan SOLO con datos reales de las órdenes. Qué logros ya se ganaron se guarda en el navegador
// (localStorage) para avisar una única vez cuando se desbloquea uno nuevo.

import type { Order } from '@/types/orden';
import { isOverdue, orderM2 } from './workshopAlerts';

export type AchievementTier = 'Común' | 'Raro' | 'Épico' | 'Legendario';

export const TIER_COLOR: Record<AchievementTier, string> = {
    Común: '#9d9d9d',
    Raro: '#0070dd',
    Épico: '#a335ee',
    Legendario: '#ff8000'
};

export interface Achievement {
    id: string;
    icon: string;
    title: string;
    description: string;
    tier: AchievementTier;
    progress: number;
    target: number;
    /** Cumple la condición ahora mismo. */
    met: boolean;
    /** Se mantiene desbloqueado aunque la condición deje de cumplirse. */
    unlocked: boolean;
}

const STORAGE_KEY = 'luxius_print_den_achv';

const DELIVERED = ['entregado', 'finalizado'];
const PRODUCED = ['impreso', 'post', 'completo', 'entregado', 'finalizado'];

interface Def {
    id: string;
    icon: string;
    title: string;
    description: string;
    tier: AchievementTier;
    target: number;
    value: (ctx: Ctx) => number;
    /** Condición alternativa a value >= target. */
    met?: (ctx: Ctx) => boolean;
}

interface Ctx {
    orders: Order[];
    delivered: number;
    producedM2: number;
    biggestM2: number;
    overdue: number;
    active: number;
    rebotadas: number;
    clients: number;
    queue: number;
}

const DEFS: Def[] = [
    { id: 'first-delivery', icon: '📦', title: 'Primera entrega', description: 'Entregar la primera orden.', tier: 'Común', target: 1, value: (c) => c.delivered },
    { id: 'ten-deliveries', icon: '🚚', title: 'Repartidor oficial', description: 'Entregar 10 órdenes.', tier: 'Común', target: 10, value: (c) => c.delivered },
    { id: 'fifty-deliveries', icon: '🎖️', title: 'Medio centenar', description: 'Entregar 50 órdenes.', tier: 'Raro', target: 50, value: (c) => c.delivered },
    { id: 'hundred-deliveries', icon: '🏅', title: 'Centenario', description: 'Entregar 100 órdenes.', tier: 'Épico', target: 100, value: (c) => c.delivered },
    { id: 'five-hundred', icon: '👑', title: 'Leyenda del Den', description: 'Entregar 500 órdenes.', tier: 'Legendario', target: 500, value: (c) => c.delivered },
    { id: 'big-format', icon: '🖼️', title: 'Gran formato', description: 'Una sola orden de 10 m² o más.', tier: 'Raro', target: 10, value: (c) => c.biggestM2 },
    { id: 'm2-100', icon: '🎨', title: 'Cien metros', description: 'Producir 100 m² en total.', tier: 'Raro', target: 100, value: (c) => c.producedM2 },
    { id: 'm2-1000', icon: '🌈', title: 'Maratón de tinta', description: 'Producir 1.000 m² en total.', tier: 'Legendario', target: 1000, value: (c) => c.producedM2 },
    { id: 'full-queue', icon: '🔥', title: 'Cola a full', description: '8 o más órdenes en la cola de impresión a la vez.', tier: 'Común', target: 8, value: (c) => c.queue },
    { id: 'loyal-clients', icon: '🤝', title: 'Clientes fieles', description: 'Trabajar para 10 clientes distintos.', tier: 'Raro', target: 10, value: (c) => c.clients },
    {
        id: 'no-delays',
        icon: '⏱️',
        title: 'Reloj suizo',
        description: 'Tener 5 o más órdenes en curso y ninguna atrasada.',
        tier: 'Épico',
        target: 5,
        value: (c) => c.active,
        met: (c) => c.active >= 5 && c.overdue === 0
    },
    {
        id: 'no-bounces',
        icon: '🛡️',
        title: 'A la primera',
        description: 'Tener 20 o más órdenes en el sistema y ninguna rebotada.',
        tier: 'Épico',
        target: 20,
        value: (c) => c.orders.length,
        met: (c) => c.orders.length >= 20 && c.rebotadas === 0
    }
];

export function computeAchievements(orders: Order[], now: Date = new Date(), previouslyUnlocked: string[] = []): Achievement[] {
    const ctx: Ctx = {
        orders,
        delivered: orders.filter((o) => DELIVERED.includes(o.status)).length,
        producedM2: orders.filter((o) => PRODUCED.includes(o.status)).reduce((a, o) => a + orderM2(o), 0),
        biggestM2: orders.reduce((a, o) => Math.max(a, orderM2(o)), 0),
        overdue: orders.filter((o) => isOverdue(o, now)).length,
        active: orders.filter((o) => ['diseno', 'orden', 'impreso', 'post', 'completo', 'rebotado'].includes(o.status)).length,
        rebotadas: orders.filter((o) => o.status === 'rebotado').length,
        clients: new Set(orders.map((o) => o.clientId).filter((x) => x != null)).size,
        queue: orders.filter((o) => o.status === 'orden').length
    };
    return DEFS.map((d) => {
        const value = d.value(ctx);
        const met = d.met ? d.met(ctx) : value >= d.target;
        return {
            id: d.id,
            icon: d.icon,
            title: d.title,
            description: d.description,
            tier: d.tier,
            progress: Math.min(d.target, Math.round(value * 10) / 10),
            target: d.target,
            met,
            unlocked: met || previouslyUnlocked.includes(d.id)
        };
    });
}

interface Stored {
    ids: string[];
}

export function loadUnlocked(): Stored | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Stored;
        return Array.isArray(parsed?.ids) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Guarda los logros ganados y devuelve los NUEVOS (para avisar). La primera vez que se usa en este navegador
 * se guardan todos en silencio (no tendría sentido avisar de lo que ya estaba cumplido).
 */
export function syncUnlocked(list: Achievement[]): Achievement[] {
    try {
        const stored = loadUnlocked();
        const nowIds = list.filter((a) => a.unlocked).map((a) => a.id);
        const merged = Array.from(new Set([...(stored?.ids ?? []), ...nowIds]));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids: merged }));
        if (!stored) return [];
        return list.filter((a) => a.unlocked && !stored.ids.includes(a.id));
    } catch {
        return [];
    }
}
