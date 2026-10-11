// workshopOrderTalk.ts - Frases de los operarios con datos REALES del día (cantidades, m², antigüedad).
// Nunca incluye nombres de clientes ni de órdenes. Las plantillas están en content/texts.ts (ORDER_TALK).

import type { Order } from '@/types/orden';
import { computeDaySummary, fmtM2 } from './workshopAlerts';
import { ORDER_TALK } from './content/texts';

const fill = (tpl: string, vars: Record<string, string | number>) =>
    tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

const pick = (list: string[], rng: () => number) => list[Math.floor(rng() * list.length)];

/** Devuelve una frase al azar con datos del día, o null si todavía no hay órdenes cargadas. */
export function orderTalkLine(orders: Order[], now: Date, rng: () => number = Math.random): string | null {
    if (!orders.length) return null;
    const s = computeDaySummary(orders, now);
    const options: string[] = [];
    if (s.enCola === 0) options.push(pick(ORDER_TALK.queueEmpty, rng));
    else if (s.enCola === 1) options.push(pick(ORDER_TALK.queueOne, rng));
    else options.push(fill(pick(ORDER_TALK.queue, rng), { n: s.enCola }));
    if (s.atrasadas === 1) options.push(pick(ORDER_TALK.overdueOne, rng));
    else if (s.atrasadas > 1) options.push(fill(pick(ORDER_TALK.overdue, rng), { n: s.atrasadas }));
    if (s.m2Hoy > 0) options.push(fill(pick(ORDER_TALK.m2, rng), { m2: fmtM2(s.m2Hoy) }));
    // La orden en cola más antigua (por fecha de creación)
    let oldest = 0;
    for (const o of orders) {
        if (o.status !== 'orden' || !o.createdAt) continue;
        const t = new Date(o.createdAt).getTime();
        if (Number.isNaN(t)) continue;
        oldest = Math.max(oldest, Math.floor((now.getTime() - t) / 86400000));
    }
    if (oldest >= 2) options.push(fill(pick(ORDER_TALK.oldest, rng), { dias: oldest }));
    return options.length ? pick(options, rng) : null;
}
