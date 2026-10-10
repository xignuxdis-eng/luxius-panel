// workshopStationProps.ts - Objetos pixel art de cada estación del Print Den (Bloque D / Fase 4)
// Cada estación (menos el plotter, ya aprobado) se dibuja como un objeto reconocible, proporcionado al plotter.
// Todo es procedural (rectángulos de Graphics en píxeles lógicos 480x270) y fácil de reemplazar por PNG.
//
// Reglas:
//  - Los contadores (pilas de cajas) usan SOLO el número real que entrega `countOrdersForStation`.
//  - Las animaciones son decorativas (resplandor, cuchilla, luz de aviso) y no afirman ningún dato del sistema.
//  - Las coordenadas son relativas a la esquina de la estación; el título ocupa los primeros 16 px.

import { Container, Graphics } from 'pixi.js';

export interface StationProps {
    container: Container;
    /** `timeMs` = tiempo acumulado en milisegundos. Redibuja solo lo animado (≈11 veces por segundo). */
    update(timeMs: number): void;
    /** Número real de órdenes de la estación (pilas de cajas). */
    setCount(count: number): void;
}

/** Máximo de cajas que se dibujan en una pila (más allá se queda llena). */
export const MAX_PILE_BOXES = 12;

const box = (g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1) => {
    g.rect(x, y, w, h).fill({ color, alpha });
};

/** Cantidad de cajas visibles para un contador real. */
export function pileBoxCount(count: number): number {
    return Math.max(0, Math.min(MAX_PILE_BOXES, Math.floor(count || 0)));
}

const BOX_COLORS = [0xb45309, 0xd97706, 0xa16207];

function drawBoxPile(g: Graphics, count: number, left: number, baseY: number, cols: number, bw: number, bh: number) {
    g.clear();
    const n = pileBoxCount(count);
    for (let i = 0; i < n; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = left + col * (bw + 1);
        const y = baseY - (row + 1) * (bh + 1);
        box(g, x, y, bw, bh, BOX_COLORS[(col + row) % BOX_COLORS.length]);
        box(g, x, y, bw, 1, 0xfde68a, 0.55); // luz superior
        box(g, x + Math.floor(bw / 2) - 1, y, 2, bh, 0xfde68a, 0.7); // cinta
        box(g, x, y + bh - 1, bw, 1, 0x451a03, 0.6); // sombra inferior
    }
}

/** Cada vez que cambia el cubo de tiempo (90 ms) se redibuja lo animado. */
function makeThrottle(stepMs = 90) {
    let last = -1;
    return (timeMs: number) => {
        const bucket = Math.floor(timeMs / stepMs);
        if (bucket === last) return false;
        last = bucket;
        return true;
    };
}

/* ----------------------------------- DISEÑO ----------------------------------- */
function buildDesign(w: number, _h: number): StationProps {
    const c = new Container();
    const base = new Graphics();
    const anim = new Graphics();
    c.addChild(base);
    c.addChild(anim);

    // Escritorio
    box(base, 6, 44, w - 12, 14, 0x7c5a3a);
    box(base, 6, 44, w - 12, 2, 0xa07850);
    box(base, 6, 58, w - 12, 2, 0x4a3322);
    box(base, 8, 60, 3, 8, 0x4a3322);
    box(base, w - 11, 60, 3, 8, 0x4a3322);
    // Monitor
    box(base, 26, 24, 26, 18, 0x0f172a);
    box(base, 37, 42, 4, 3, 0x334155);
    box(base, 33, 44, 12, 1, 0x475569);
    // Teclado y mouse
    box(base, 30, 48, 18, 4, 0x94a3b8);
    for (let k = 0; k < 6; k++) box(base, 31 + k * 3, 49, 2, 2, 0x64748b);
    box(base, 52, 49, 3, 4, 0xcbd5e1);
    // Taza
    box(base, 12, 46, 5, 6, 0xf8fafc);
    box(base, 17, 47, 2, 3, 0xf8fafc);
    // Tableta gráfica
    box(base, w - 24, 46, 14, 9, 0x1e293b);
    box(base, w - 23, 47, 12, 7, 0x0ea5e9, 0.55);

    const tick = makeThrottle();
    const screenColors = [0x6d28d9, 0x0ea5e9, 0xdb2777];
    return {
        container: c,
        setCount() {},
        update(t) {
            if (!tick(t)) return;
            anim.clear();
            const idx = Math.floor(t / 1600) % screenColors.length;
            // resplandor del monitor sobre el escritorio
            const pulse = 0.1 + 0.06 * Math.sin(t / 420);
            box(anim, 22, 40, 34, 8, screenColors[idx], pulse);
            // pantalla con miniatura animada
            box(anim, 28, 26, 22, 14, screenColors[idx], 0.9);
            const mx = 30 + Math.floor((t / 260) % 12);
            box(anim, mx, 30, 8, 6, 0xf8fafc, 0.85);
            box(anim, mx + 1, 31, 6, 4, screenColors[(idx + 1) % screenColors.length], 0.9);
        }
    };
}

/* ----------------------------------- INSUMOS ---------------------------------- */
function buildSupplies(w: number, _h: number): StationProps {
    const c = new Container();
    const base = new Graphics();
    const anim = new Graphics();
    c.addChild(base);
    c.addChild(anim);

    // Estantería
    box(base, 6, 20, 2, 50, 0x4a3322);
    box(base, w - 8, 20, 2, 50, 0x4a3322);
    box(base, 6, 38, w - 12, 3, 0x7c5a3a);
    box(base, 6, 60, w - 12, 3, 0x7c5a3a);
    box(base, 6, 41, w - 12, 1, 0x4a3322);
    box(base, 6, 63, w - 12, 1, 0x4a3322);

    // Botellas de tinta CMYK (estante de arriba)
    const inks = [0x06b6d4, 0xec4899, 0xeab308, 0x1e293b];
    inks.forEach((color, i) => {
        const x = 12 + i * 15;
        box(base, x, 23, 9, 15, color);
        box(base, x + 1, 24, 2, 13, 0xffffff, 0.28);
        box(base, x + 3, 20, 3, 3, 0xe2e8f0);
        box(base, x + 1, 29, 7, 4, 0xf8fafc);
        box(base, x + 3, 30, 3, 2, color);
    });

    // Bobinas de vinilo (estante de abajo)
    [10, 30, 50].forEach((x) => {
        box(base, x, 42, 16, 18, 0xe2e8f0);
        box(base, x + 11, 42, 5, 18, 0xcbd5e1);
        box(base, x, 42, 16, 2, 0x94a3b8);
        box(base, x + 6, 50, 4, 3, 0x64748b);
    });
    // Caja de insumos
    box(base, w - 21, 46, 12, 14, 0xb45309);
    box(base, w - 21, 46, 12, 2, 0xd97706);
    box(base, w - 16, 46, 2, 14, 0xfde68a, 0.7);

    // Piso: tarima
    box(base, 14, 70, w - 28, 3, 0x7c5a3a);
    box(base, 14, 73, w - 28, 1, 0x4a3322);

    const tick = makeThrottle(120);
    return {
        container: c,
        setCount() {},
        update(t) {
            if (!tick(t)) return;
            anim.clear();
            // luz de estantería (decorativa)
            const on = Math.floor(t / 900) % 2 === 0;
            box(anim, w - 14, 17, 4, 3, on ? 0xf59e0b : 0x78350f);
        }
    };
}

/* ----------------------------------- REFILADO --------------------------------- */
function buildCutting(w: number, _h: number): StationProps {
    const c = new Container();
    const base = new Graphics();
    const anim = new Graphics();
    c.addChild(base);
    c.addChild(anim);

    const tx = 8;
    const ty = 28;
    const tw = w - 16;
    const th = 44;
    // Mesa de corte verde con cuadrícula
    box(base, tx, ty, tw, th, 0x14532d);
    box(base, tx, ty, tw, 2, 0x166534);
    for (let gx = tx + 13; gx < tx + tw; gx += 13) box(base, gx, ty + 2, 1, th - 2, 0x166534, 0.8);
    for (let gy = ty + 11; gy < ty + th; gy += 11) box(base, tx, gy, tw, 1, 0x166534, 0.8);
    box(base, tx, ty + th, tw, 3, 0x052e16);
    box(base, tx + 4, ty + th + 3, 4, 10, 0x052e16);
    box(base, tx + tw - 8, ty + th + 3, 4, 10, 0x052e16);
    // Pliego a cortar
    box(base, tx + 14, ty + 12, 56, 18, 0xf8fafc, 0.92);
    box(base, tx + 14, ty + 26, 14, 4, 0x06b6d4);
    box(base, tx + 28, ty + 26, 14, 4, 0xec4899);
    box(base, tx + 42, ty + 26, 14, 4, 0xeab308);
    box(base, tx + 56, ty + 26, 14, 4, 0x0f172a);
    // Riel de la guillotina
    box(base, tx - 2, 22, tw + 4, 4, 0x475569);
    box(base, tx - 2, 22, tw + 4, 1, 0x94a3b8);
    // Tacho y rollo en el piso
    box(base, 14, 84, 14, 14, 0x334155);
    box(base, 13, 83, 16, 3, 0x475569);
    box(base, w - 34, 82, 22, 14, 0xe2e8f0);
    box(base, w - 34, 82, 22, 2, 0x94a3b8);
    box(base, w - 18, 82, 6, 14, 0xcbd5e1);

    const tick = makeThrottle(80);
    return {
        container: c,
        setCount() {},
        update(t) {
            if (!tick(t)) return;
            anim.clear();
            // Cuchilla que recorre el riel (ida y vuelta lenta)
            const range = tw - 16;
            const phase = (t / 5200) % 2;
            const ratio = phase < 1 ? phase : 2 - phase;
            const hx = tx + 2 + Math.round(ratio * range);
            box(anim, hx, 20, 8, 9, 0xec4899);
            box(anim, hx + 3, 29, 2, th - 1, 0xe2e8f0, 0.5);
            box(anim, hx, 20, 8, 1, 0xfbcfe8);
            // Virutas decorativas junto a la cuchilla
            for (let k = 0; k < 3; k++) {
                const off = Math.round(Math.sin(t / 240 + k * 2.1) * 3);
                box(anim, hx + 5 + off + k * 3, ty + th + 1 + k * 3, 2, 1, 0xf8fafc, 0.75);
            }
        }
    };
}

/* ----------------------------------- EMPAQUE ---------------------------------- */
function buildPacking(_w: number, h: number): StationProps {
    const c = new Container();
    const base = new Graphics();
    const pile = new Graphics();
    const anim = new Graphics();
    c.addChild(base);
    c.addChild(pile);
    c.addChild(anim);

    // Mesa de empaque
    box(base, 8, 28, 66, 30, 0x7c5a3a);
    box(base, 8, 28, 66, 2, 0xa07850);
    box(base, 8, 58, 66, 2, 0x4a3322);
    box(base, 10, 60, 3, 10, 0x4a3322);
    box(base, 69, 60, 3, 10, 0x4a3322);
    // Caja abierta con solapas
    box(base, 14, 32, 24, 16, 0xb45309);
    box(base, 14, 29, 24, 3, 0xd97706);
    box(base, 25, 32, 2, 16, 0xfde68a, 0.7);
    // Cinta adhesiva
    box(base, 46, 34, 12, 8, 0xdc2626);
    box(base, 46, 34, 12, 2, 0xfca5a5);
    box(base, 58, 36, 4, 4, 0xe2e8f0);
    // Rollo de nylon con burbujas en el piso
    box(base, 12, 70, 28, 10, 0x7dd3fc, 0.9);
    for (let k = 0; k < 7; k++) box(base, 14 + k * 4, 73, 2, 2, 0xe0f2fe);
    box(base, 12, 79, 28, 2, 0x0369a1);
    // Palet donde se apilan los paquetes terminados
    box(base, 78, h - 12, 36, 3, 0x7c5a3a);
    box(base, 78, h - 9, 36, 2, 0x4a3322);

    const baseY = h - 12;
    const tick = makeThrottle(120);
    let lastCount = -1;
    return {
        container: c,
        setCount(n) {
            const clamped = pileBoxCount(n);
            if (clamped === lastCount) return;
            lastCount = clamped;
            drawBoxPile(pile, n, 80, baseY, 3, 10, 8);
        },
        update(t) {
            if (!tick(t)) return;
            anim.clear();
            // Brillo que recorre el rollo de burbujas
            const sx = 12 + Math.floor((t / 160) % 26);
            box(anim, sx, 70, 2, 10, 0xffffff, 0.35);
            // luz de la cinta (decorativa)
            box(anim, 66, 31, 3, 3, Math.floor(t / 1100) % 2 === 0 ? 0x22c55e : 0x14532d);
        }
    };
}

/* ----------------------------------- DESPACHO --------------------------------- */
function buildDispatch(w: number, h: number): StationProps {
    const c = new Container();
    const base = new Graphics();
    const pile = new Graphics();
    const anim = new Graphics();
    c.addChild(base);
    c.addChild(pile);
    c.addChild(anim);

    // Portón enrollable
    box(base, 6, 20, w - 12, 28, 0x1e293b);
    box(base, 8, 22, w - 16, 24, 0x64748b);
    for (let sy = 26; sy < 46; sy += 4) box(base, 8, sy, w - 16, 1, 0x475569);
    box(base, Math.floor(w / 2) - 3, 43, 6, 2, 0x0f172a);
    // Franja de seguridad amarilla en el piso
    for (let sx = 8; sx < w - 12; sx += 10) box(base, sx, 52, 6, 2, 0xeab308, 0.85);
    // Zona de espera con carretilla manual
    box(base, 12, 62, 4, 14, 0x475569);
    box(base, 12, 74, 14, 3, 0x475569);
    box(base, 22, 77, 3, 3, 0x0f172a);
    // Palet
    box(base, 10, h - 12, w - 20, 3, 0x7c5a3a);
    box(base, 10, h - 9, w - 20, 2, 0x4a3322);

    const baseY = h - 12;
    const tick = makeThrottle(110);
    let lastCount = -1;
    return {
        container: c,
        setCount(n) {
            const clamped = pileBoxCount(n);
            if (clamped === lastCount) return;
            lastCount = clamped;
            drawBoxPile(pile, n, 14, baseY, 4, 13, 9);
        },
        update(t) {
            if (!tick(t)) return;
            anim.clear();
            // Baliza de aviso del portón (decorativa)
            const on = Math.floor(t / 600) % 2 === 0;
            box(anim, w - 14, 16, 6, 5, on ? 0xf59e0b : 0x78350f);
            if (on) box(anim, w - 16, 14, 10, 9, 0xf59e0b, 0.18);
        }
    };
}

/* ------------------------------------ CAJA ------------------------------------ */
const CUSTOMER_SHIRTS = [0x38bdf8, 0xf472b6, 0xa3e635, 0xfb923c];

function buildCashier(w: number, h: number): StationProps {
    const c = new Container();
    const base = new Graphics();
    const anim = new Graphics();
    c.addChild(base);
    c.addChild(anim);

    // Mostrador
    box(base, 6, 40, w - 12, 16, 0x7c5a3a);
    box(base, 6, 40, w - 12, 2, 0xa07850);
    box(base, 6, 56, w - 12, 8, 0x4a3322);
    box(base, 8, 58, w - 16, 1, 0x7c5a3a);
    // Caja registradora
    box(base, 46, 26, 24, 16, 0x334155);
    box(base, 46, 26, 24, 2, 0x64748b);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) box(base, 48 + k * 5, 35 + r * 3, 4, 2, 0x94a3b8);
    box(base, 46, 42, 24, 3, 0x475569);
    // Monedas
    [14, 20, 26].forEach((x, i) => {
        for (let k = 0; k <= i + 1; k++) box(base, x, 38 - k * 2, 5, 2, k % 2 ? 0xfbbf24 : 0xf59e0b);
    });
    // Terminal de tarjetas
    box(base, 34, 34, 9, 7, 0x0f172a);
    box(base, 35, 35, 7, 3, 0x38bdf8, 0.8);
    // Cartel de precios en la pared del fondo
    box(base, 10, 20, 26, 12, 0x0f172a);
    box(base, 11, 21, 24, 10, 0x1e293b);
    box(base, 14, 24, 8, 1, 0xfbbf24);
    box(base, 14, 27, 14, 1, 0x94a3b8);
    // Burbuja de espera marcada en el piso
    box(base, 24, 78, 26, 1, 0xeab308, 0.7);

    const tick = makeThrottle(110);
    return {
        container: c,
        setCount() {},
        update(t) {
            if (!tick(t)) return;
            anim.clear();
            // Pantalla de la caja (parpadeo suave, decorativo)
            const bright = 0.7 + 0.25 * Math.sin(t / 700);
            box(anim, 48, 28, 14, 6, 0x22c55e, bright);
            // Cliente ocasional (decorativo): aparece unos segundos cada ~26 s y se desvanece
            const cycle = 26000;
            const cycIdx = Math.floor(t / cycle);
            const local = t % cycle;
            const start = 15000;
            const dur = 7500;
            if (local >= start && local <= start + dur) {
                const fadeIn = Math.min(1, (local - start) / 700);
                const fadeOut = Math.min(1, (start + dur - local) / 700);
                const a = Math.max(0, Math.min(fadeIn, fadeOut));
                const cx = 38;
                const bob = Math.round(Math.sin(local / 380));
                const shirt = CUSTOMER_SHIRTS[cycIdx % CUSTOMER_SHIRTS.length];
                box(anim, cx - 4, 70 + bob, 8, 8, 0xfed7aa, a); // cabeza
                box(anim, cx - 4, 69 + bob, 8, 3, 0x78350f, a); // pelo
                box(anim, cx - 5, 78 + bob, 10, 11, shirt, a); // torso
                box(anim, cx - 4, 89, 3, 6, 0x1e293b, a);
                box(anim, cx + 1, 89, 3, 6, 0x1e293b, a);
                box(anim, cx - 6, 79 + bob, 2, 8, 0xfed7aa, a); // brazos
                box(anim, cx + 4, 79 + bob, 2, 8, 0xfed7aa, a);
                void h;
            }
        }
    };
}

/** Props de la estación, o null si no tiene (el plotter tiene su propio dibujo aprobado). */
export function createStationProps(id: string, width: number, height: number): StationProps | null {
    switch (id) {
        case 'diseno':
            return buildDesign(width, height);
        case 'insumos':
            return buildSupplies(width, height);
        case 'corte':
            return buildCutting(width, height);
        case 'empaque':
            return buildPacking(width, height);
        case 'despacho':
            return buildDispatch(width, height);
        case 'caja':
            return buildCashier(width, height);
        default:
            return null;
    }
}
