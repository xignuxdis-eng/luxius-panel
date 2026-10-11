// workshopStationProps.ts - Objetos pixel art de cada estación del Print Den (Bloque D / Fase 4)
// v2 (mejora de calidad): contorno oscuro de 1 px, luz arriba / sombra abajo en cada objeto, sombras en el piso,
// más detalles (plantas, lámparas, reglas, remaches, etiquetas) y animaciones sutiles (vapor, brillos, luces).
// Cada estación (menos el plotter, ya aprobado) se dibuja como un objeto reconocible, proporcionado al plotter.
// Todo es procedural (rectángulos de Graphics en píxeles lógicos 480x270) y fácil de reemplazar por PNG.
//
// Reglas:
//  - Los contadores (pilas de cajas) usan SOLO el número real que entrega `countOrdersForStation`.
//  - Las animaciones son decorativas (resplandor, cuchilla, luz de aviso) y no afirman ningún dato del sistema.
//  - Las coordenadas son relativas a la esquina de la estación; el título ocupa los primeros 16 px.

import { Container, Graphics, Sprite } from 'pixi.js';
import { getStationImage } from './workshopSpriteOverrides';

export interface StationProps {
    container: Container;
    /** `timeMs` = tiempo acumulado en milisegundos. Redibuja solo lo animado (≈11 veces por segundo). */
    update(timeMs: number): void;
    /** Número real de órdenes de la estación (pilas de cajas). */
    setCount(count: number): void;
}

/** Máximo de cajas que se dibujan en una pila (más allá se queda llena). */
export const MAX_PILE_BOXES = 12;

/* ------------------------------ utilidades de dibujo ------------------------------ */

const OUTLINE = 0x0a0e16;

/** Aclara (t > 0) u oscurece (t < 0) un color 0xRRGGBB. t entre -1 y 1. */
export function mix(color: number, t: number): number {
    const target = t >= 0 ? 255 : 0;
    const k = Math.abs(t);
    const r = Math.round(((color >> 16) & 255) * (1 - k) + target * k);
    const g = Math.round(((color >> 8) & 255) * (1 - k) + target * k);
    const b = Math.round((color & 255) * (1 - k) + target * k);
    return (r << 16) | (g << 8) | b;
}

const box = (g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1) => {
    g.rect(x, y, w, h).fill({ color, alpha });
};

/** Objeto con contorno, luz arriba y sombra abajo/derecha. */
function obj(g: Graphics, x: number, y: number, w: number, h: number, color: number) {
    box(g, x - 1, y - 1, w + 2, h + 2, OUTLINE, 0.9);
    box(g, x, y, w, h, color);
    if (h >= 3) {
        box(g, x, y, w, 1, mix(color, 0.35));
        box(g, x, y + h - 1, w, 1, mix(color, -0.35));
    }
    if (w >= 4 && h >= 3) box(g, x + w - 1, y + 1, 1, h - 2, mix(color, -0.2));
}

/** Sombra suave en el piso bajo un objeto. */
function floorShadow(g: Graphics, x: number, y: number, w: number, h: number, alpha = 0.3) {
    box(g, x, y, w, h, 0x000000, alpha);
}

export function pileBoxCount(count: number): number {
    return Math.max(0, Math.min(MAX_PILE_BOXES, Math.floor(count || 0)));
}

const BOX_COLORS = [0xb45309, 0xd97706, 0xa16207];

function drawBoxPile(g: Graphics, count: number, left: number, baseY: number, cols: number, bw: number, bh: number) {
    g.clear();
    const n = pileBoxCount(count);
    if (n > 0) floorShadow(g, left - 1, baseY, cols * (bw + 1) + 2, 2, 0.35);
    for (let i = 0; i < n; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = left + col * (bw + 1);
        const y = baseY - (row + 1) * (bh + 1);
        const c = BOX_COLORS[(col + row) % BOX_COLORS.length];
        obj(g, x, y, bw, bh, c);
        box(g, x + Math.floor(bw / 2) - 1, y, 2, bh, 0xfde68a, 0.75); // cinta
        box(g, x + 1, y + bh - 4, 3, 2, 0xf8fafc, 0.9); // etiqueta de envío
    }
}

/** Cada vez que cambia el cubo de tiempo se redibuja lo animado. */
function makeThrottle(stepMs = 90) {
    let last = -1;
    return (timeMs: number) => {
        const bucket = Math.floor(timeMs / stepMs);
        if (bucket === last) return false;
        last = bucket;
        return true;
    };
}

function plant(g: Graphics, x: number, y: number) {
    obj(g, x, y + 5, 7, 6, 0xb45309);
    box(g, x + 1, y + 5, 5, 1, 0x451a03, 0.6);
    box(g, x + 2, y, 3, 6, 0x16a34a);
    box(g, x, y + 2, 3, 3, 0x22c55e);
    box(g, x + 4, y + 1, 3, 3, 0x22c55e);
    box(g, x + 3, y - 2, 1, 3, 0x4ade80);
}

/* ----------------------------------- DISEÑO ----------------------------------- */
function buildDesign(w: number, _h: number): StationProps {
    const c = new Container();
    const base = new Graphics();
    const anim = new Graphics();
    c.addChild(base);
    c.addChild(anim);

    // Alfombra bajo el escritorio
    box(base, 6, 62, w - 12, 8, 0x312e81, 0.55);
    box(base, 6, 62, w - 12, 1, 0x4338ca, 0.6);
    floorShadow(base, 8, 60, w - 16, 3, 0.35);

    // Escritorio (madera con vetas)
    obj(base, 6, 44, w - 12, 14, 0x7c5a3a);
    box(base, 8, 47, w - 16, 1, 0x6b4c2f, 0.7);
    box(base, 10, 51, w - 24, 1, 0x6b4c2f, 0.5);
    box(base, 6, 58, w - 12, 2, 0x4a3322);
    obj(base, 8, 60, 3, 8, 0x4a3322);
    obj(base, w - 11, 60, 3, 8, 0x4a3322);
    // Cajonera
    obj(base, w - 30, 49, 16, 9, 0x5b4128);
    box(base, w - 24, 52, 4, 1, 0xfbbf24);

    // Silla de oficina
    floorShadow(base, 32, 66, 16, 3, 0.35);
    obj(base, 35, 56, 10, 4, 0x4c1d95);
    obj(base, 39, 60, 2, 5, 0x334155);
    obj(base, 34, 65, 12, 2, 0x1f2937);

    // Monitor con marco
    obj(base, 25, 23, 28, 19, 0x0f172a);
    obj(base, 37, 42, 4, 3, 0x334155);
    obj(base, 32, 44, 14, 2, 0x475569);
    box(base, 27, 25, 24, 15, 0x020617); // pantalla apagada (la animación la enciende)

    // Teclado y mouse
    obj(base, 30, 48, 18, 4, 0x94a3b8);
    for (let k = 0; k < 6; k++) box(base, 31 + k * 3, 49, 2, 1, 0x64748b);
    for (let k = 0; k < 5; k++) box(base, 32 + k * 3, 51, 2, 1, 0x64748b);
    obj(base, 52, 49, 3, 4, 0xe2e8f0);

    // Taza
    obj(base, 12, 46, 5, 6, 0xf8fafc);
    box(base, 17, 47, 2, 3, 0xe2e8f0);
    box(base, 13, 47, 3, 1, 0x7c2d12, 0.9);

    // Lámpara de escritorio
    obj(base, 64, 44, 5, 2, 0x334155);
    box(base, 66, 36, 1, 8, 0x94a3b8);
    obj(base, 62, 34, 8, 3, 0xf59e0b);

    // Notas adhesivas
    box(base, 24, 21, 3, 3, 0xfde047);
    box(base, 52, 21, 3, 3, 0xf472b6);

    // Tableta gráfica con lápiz
    obj(base, w - 24, 46, 14, 9, 0x1e293b);
    box(base, w - 23, 47, 12, 7, 0x0ea5e9, 0.55);
    box(base, w - 11, 45, 1, 6, 0xe2e8f0);

    plant(base, 8, 29);

    const tick = makeThrottle();
    const screenColors = [0x6d28d9, 0x0ea5e9, 0xdb2777];
    return {
        container: c,
        setCount() {},
        update(t) {
            if (!tick(t)) return;
            anim.clear();
            const idx = Math.floor(t / 1600) % screenColors.length;
            // resplandor del monitor sobre el escritorio y el teclado
            const pulse = 0.1 + 0.06 * Math.sin(t / 420);
            box(anim, 22, 42, 34, 8, screenColors[idx], pulse);
            // pantalla con miniatura animada y barra de herramientas
            box(anim, 27, 25, 24, 15, screenColors[idx], 0.9);
            box(anim, 27, 25, 24, 2, mix(screenColors[idx], -0.4));
            for (let k = 0; k < 3; k++) box(anim, 29 + k * 3, 25, 2, 1, 0xf8fafc, 0.8);
            const mx = 29 + Math.floor((t / 260) % 12);
            box(anim, mx, 30, 8, 6, 0xf8fafc, 0.88);
            box(anim, mx + 1, 31, 6, 4, screenColors[(idx + 1) % screenColors.length], 0.95);
            box(anim, 27, 25, 24, 1, 0xffffff, 0.2);
            // luz de la lámpara
            box(anim, 61, 37, 10, 8, 0xfde68a, 0.1 + 0.03 * Math.sin(t / 900));
            // vapor de la taza
            for (let k = 0; k < 2; k++) {
                const rise = ((t / 120 + k * 7) % 14) / 14;
                box(anim, 13 + k * 2 + Math.round(Math.sin(t / 300 + k)), 44 - Math.round(rise * 8), 1, 2, 0xffffff, 0.5 * (1 - rise));
            }
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

    // Pared del fondo oscura
    box(base, 4, 18, w - 8, 54, 0x0f172a, 0.55);

    // Estantería con soportes metálicos
    obj(base, 5, 20, 3, 52, 0x475569);
    obj(base, w - 8, 20, 3, 52, 0x475569);
    obj(base, 6, 38, w - 12, 3, 0x7c5a3a);
    obj(base, 6, 60, w - 12, 3, 0x7c5a3a);
    floorShadow(base, 8, 41, w - 16, 2, 0.35);
    floorShadow(base, 8, 63, w - 16, 2, 0.35);

    // Botellas de tinta CMYK (estante de arriba) con etiqueta y brillo
    const inks = [0x06b6d4, 0xec4899, 0xeab308, 0x1e293b];
    inks.forEach((color, i) => {
        const x = 12 + i * 15;
        obj(base, x, 24, 9, 14, color);
        box(base, x + 1, 25, 2, 12, 0xffffff, 0.3); // brillo vidrio
        obj(base, x + 3, 20, 3, 4, 0xe2e8f0);
        obj(base, x + 1, 29, 7, 5, 0xf8fafc);
        box(base, x + 2, 30, 5, 1, color);
        box(base, x + 2, 32, 3, 1, 0x94a3b8);
    });

    // Bobinas de vinilo (estante de abajo) con núcleo
    [10, 30, 50].forEach((x, i) => {
        obj(base, x, 42, 16, 18, 0xe2e8f0);
        box(base, x + 11, 43, 4, 16, 0xcbd5e1);
        box(base, x + 6, 48, 4, 6, 0x64748b);
        box(base, x + 7, 49, 2, 4, 0x1e293b);
        box(base, x + 1, 44, 2, 12, 0xffffff, 0.35);
        box(base, x, 46, 16, 1, [0x06b6d4, 0xec4899, 0xeab308][i], 0.9);
    });
    // Caja de insumos con etiqueta
    obj(base, w - 21, 46, 12, 14, 0xb45309);
    box(base, w - 16, 46, 2, 14, 0xfde68a, 0.75);
    box(base, w - 20, 53, 4, 3, 0xf8fafc);

    // Cajas bajo el estante
    obj(base, 14, 64, 14, 6, 0x92400e);
    box(base, 20, 64, 2, 6, 0xfde68a, 0.6);
    obj(base, 30, 64, 12, 6, 0xb45309);
    obj(base, 44, 66, 10, 4, 0x78350f);

    // Piso: tarima
    obj(base, 12, 70, w - 24, 3, 0x7c5a3a);
    box(base, 12, 72, w - 24, 1, 0x4a3322);

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
            if (on) box(anim, w - 17, 14, 10, 9, 0xf59e0b, 0.12);
            // destello que recorre los frascos
            const gx = 12 + Math.floor((t / 130) % 60);
            box(anim, gx, 25, 1, 12, 0xffffff, 0.22);
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
    floorShadow(base, tx + 2, ty + th + 3, tw, 3, 0.35);
    // Patas
    obj(base, tx + 4, ty + th + 3, 4, 10, 0x1f2937);
    obj(base, tx + tw - 8, ty + th + 3, 4, 10, 0x1f2937);
    // Mesa de corte verde con cuadrícula
    obj(base, tx, ty, tw, th, 0x14532d);
    for (let gx = tx + 13; gx < tx + tw; gx += 13) box(base, gx, ty + 2, 1, th - 3, 0x166534, 0.85);
    for (let gy = ty + 11; gy < ty + th - 1; gy += 11) box(base, tx + 1, gy, tw - 2, 1, 0x166534, 0.85);
    // Regla graduada arriba y a la izquierda
    box(base, tx + 1, ty + 1, tw - 2, 3, 0xfde68a, 0.9);
    for (let rx = tx + 3; rx < tx + tw - 2; rx += 3) box(base, rx, ty + 1, 1, rx % 9 === 0 ? 3 : 2, 0x78350f);
    box(base, tx + 1, ty + 4, 3, th - 5, 0xfde68a, 0.85);
    for (let ry = ty + 6; ry < ty + th - 2; ry += 3) box(base, tx + 1, ry, ry % 9 === 0 ? 3 : 2, 1, 0x78350f);
    // Franja de seguridad en el borde frontal
    for (let sx = tx + 1; sx < tx + tw - 2; sx += 6) {
        box(base, sx, ty + th - 2, 3, 2, 0xeab308);
        box(base, sx + 3, ty + th - 2, 3, 2, 0x111827);
    }
    // Pliego a cortar con bandas CMYK
    obj(base, tx + 14, ty + 12, 56, 18, 0xf8fafc);
    box(base, tx + 14, ty + 26, 14, 4, 0x06b6d4);
    box(base, tx + 28, ty + 26, 14, 4, 0xec4899);
    box(base, tx + 42, ty + 26, 14, 4, 0xeab308);
    box(base, tx + 56, ty + 26, 14, 4, 0x0f172a);
    box(base, tx + 16, ty + 14, 20, 2, 0x94a3b8, 0.6);
    box(base, tx + 16, ty + 18, 30, 2, 0x94a3b8, 0.45);
    // Tijeras sobre la mesa
    obj(base, tx + tw - 22, ty + 14, 9, 2, 0x94a3b8);
    obj(base, tx + tw - 20, ty + 17, 9, 2, 0xdc2626);
    // Riel de la guillotina
    obj(base, tx - 2, 21, tw + 4, 4, 0x475569);
    box(base, tx - 2, 22, tw + 4, 1, 0xcbd5e1, 0.7);
    // Tacho y rollo en el piso
    floorShadow(base, 12, 96, 18, 2, 0.35);
    obj(base, 14, 84, 14, 12, 0x334155);
    box(base, 13, 83, 16, 3, 0x475569);
    box(base, 16, 88, 10, 1, 0x1e293b);
    obj(base, w - 34, 82, 22, 14, 0xe2e8f0);
    box(base, w - 18, 83, 5, 12, 0xcbd5e1);
    box(base, w - 30, 86, 4, 6, 0x64748b);
    box(base, w - 29, 87, 2, 4, 0x1e293b);
    // Recortes sueltos en el piso
    box(base, 40, 90, 6, 2, 0xf8fafc, 0.9);
    box(base, 52, 93, 4, 2, 0xec4899, 0.9);
    box(base, 66, 91, 5, 2, 0x06b6d4, 0.9);

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
            box(anim, hx - 1, 19, 10, 11, OUTLINE, 0.9);
            box(anim, hx, 20, 8, 9, 0xec4899);
            box(anim, hx, 20, 8, 1, 0xfbcfe8);
            box(anim, hx + 3, 29, 2, th - 1, 0xe2e8f0, 0.55);
            box(anim, hx + 3, 29, 2, th - 1, 0xffffff, 0.15);
            // Virutas decorativas junto a la cuchilla
            for (let k = 0; k < 3; k++) {
                const off = Math.round(Math.sin(t / 240 + k * 2.1) * 3);
                box(anim, hx + 5 + off + k * 3, ty + th + 1 + k * 3, 2, 1, 0xf8fafc, 0.8);
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
    floorShadow(base, 10, 60, 66, 3, 0.35);
    obj(base, 10, 60, 3, 10, 0x4a3322);
    obj(base, 69, 60, 3, 10, 0x4a3322);
    obj(base, 8, 28, 66, 30, 0x7c5a3a);
    box(base, 10, 34, 62, 1, 0x6b4c2f, 0.6);
    box(base, 10, 44, 62, 1, 0x6b4c2f, 0.5);
    box(base, 8, 58, 66, 2, 0x4a3322);
    // Caja abierta con solapas
    obj(base, 14, 32, 24, 16, 0xb45309);
    obj(base, 14, 29, 24, 3, 0xd97706);
    box(base, 25, 32, 2, 16, 0xfde68a, 0.75);
    box(base, 16, 40, 5, 4, 0xf8fafc);
    // Balanza digital
    obj(base, 42, 46, 14, 5, 0x94a3b8);
    obj(base, 44, 44, 10, 2, 0xe2e8f0);
    box(base, 46, 48, 6, 2, 0x22c55e);
    // Cinta adhesiva
    obj(base, 46, 31, 12, 8, 0xdc2626);
    box(base, 46, 31, 12, 2, 0xfca5a5);
    obj(base, 58, 33, 4, 4, 0xe2e8f0);
    // Marcadores
    box(base, 60, 44, 8, 2, 0x111827);
    box(base, 60, 47, 8, 2, 0x2563eb);
    // Rollo de nylon con burbujas en el piso
    floorShadow(base, 12, 80, 28, 2, 0.35);
    obj(base, 12, 70, 28, 10, 0x7dd3fc);
    for (let k = 0; k < 7; k++) {
        box(base, 14 + k * 4, 72, 2, 2, 0xe0f2fe);
        box(base, 16 + k * 4, 76, 2, 2, 0xbae6fd);
    }
    // Papel kraft
    obj(base, 44, 72, 20, 8, 0xa16207);
    box(base, 44, 75, 20, 1, 0x854d0e);
    // Palet donde se apilan los paquetes terminados
    obj(base, 78, h - 12, 36, 3, 0x7c5a3a);
    for (let k = 0; k < 5; k++) box(base, 80 + k * 7, h - 11, 1, 1, 0x4a3322);
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
            box(anim, sx, 70, 2, 10, 0xffffff, 0.4);
            // pantalla de la balanza y luz de la cinta (decorativas)
            box(anim, 46, 48, 6, 2, Math.floor(t / 700) % 2 === 0 ? 0x4ade80 : 0x16a34a);
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

    // Portón enrollable con marco y remaches
    obj(base, 6, 20, w - 12, 28, 0x1e293b);
    box(base, 8, 22, w - 16, 24, 0x64748b);
    for (let sy = 26; sy < 46; sy += 4) {
        box(base, 8, sy, w - 16, 1, 0x475569);
        box(base, 8, sy + 1, w - 16, 1, 0x7c8ba1, 0.5);
    }
    for (let ry = 24; ry < 46; ry += 8) {
        box(base, 9, ry, 1, 1, 0xcbd5e1);
        box(base, w - 11, ry, 1, 1, 0xcbd5e1);
    }
    obj(base, Math.floor(w / 2) - 3, 43, 6, 2, 0x0f172a);
    // Topes de goma del muelle
    obj(base, 6, 47, 6, 3, 0x111827);
    obj(base, w - 12, 47, 6, 3, 0x111827);
    // Franja de seguridad amarilla en el piso
    for (let sx = 8; sx < w - 12; sx += 10) {
        box(base, sx, 52, 6, 2, 0xeab308, 0.9);
        box(base, sx + 6, 52, 4, 2, 0x111827, 0.8);
    }
    // Zona de espera con carretilla manual
    floorShadow(base, 12, 78, 16, 2, 0.35);
    obj(base, 12, 62, 4, 14, 0x475569);
    obj(base, 12, 74, 14, 3, 0x475569);
    obj(base, 22, 77, 4, 3, 0x0f172a);
    // Palet con nylon de embalaje
    floorShadow(base, 10, h - 8, w - 20, 2, 0.35);
    obj(base, 10, h - 12, w - 20, 3, 0x7c5a3a);
    for (let k = 0; k < 6; k++) box(base, 12 + k * 11, h - 11, 1, 1, 0x4a3322);
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
            if (on) {
                box(anim, w - 16, 14, 10, 9, 0xf59e0b, 0.2);
                box(anim, 8, 22, w - 16, 24, 0xfbbf24, 0.05);
            }
            // brillo que cruza el portón
            const gx = 8 + Math.floor((t / 90) % (w + 20)) - 10;
            if (gx > 8 && gx < w - 10) box(anim, gx, 22, 2, 24, 0xffffff, 0.12);
        }
    };
}

/* ------------------------------------ CAJA ------------------------------------ */
const CUSTOMER_SHIRTS = [0x38bdf8, 0xf472b6, 0xa3e635, 0xfb923c];

function buildCashier(w: number, _h: number): StationProps {
    const c = new Container();
    const base = new Graphics();
    const anim = new Graphics();
    c.addChild(base);
    c.addChild(anim);

    // Alfombra de entrada
    box(base, 14, 76, w - 28, 12, 0x7f1d1d, 0.5);
    box(base, 14, 76, w - 28, 1, 0xb91c1c, 0.7);
    // Mostrador con panel frontal moldurado
    floorShadow(base, 8, 64, w - 16, 3, 0.4);
    obj(base, 6, 40, w - 12, 16, 0x7c5a3a);
    box(base, 8, 43, w - 16, 1, 0x6b4c2f, 0.6);
    obj(base, 6, 56, w - 12, 8, 0x4a3322);
    box(base, 10, 58, w - 20, 4, 0x5b4128);
    box(base, 10, 58, w - 20, 1, 0x7c5a3a);
    // Caja registradora con teclas y cajón
    obj(base, 46, 26, 24, 16, 0x334155);
    box(base, 46, 27, 24, 1, 0x64748b);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) box(base, 48 + k * 5, 35 + r * 3, 4, 2, 0x94a3b8);
    obj(base, 46, 42, 24, 3, 0x475569);
    box(base, 56, 43, 4, 1, 0xfbbf24);
    // Monedas con brillo
    [14, 20, 26].forEach((x, i) => {
        for (let k = 0; k <= i + 1; k++) {
            box(base, x - 1, 37 - k * 2, 7, 3, OUTLINE, 0.7);
            box(base, x, 38 - k * 2, 5, 2, k % 2 ? 0xfbbf24 : 0xf59e0b);
            box(base, x, 38 - k * 2, 5, 1, 0xfde68a);
        }
    });
    // Terminal de tarjetas
    obj(base, 34, 34, 9, 7, 0x0f172a);
    box(base, 35, 35, 7, 3, 0x38bdf8, 0.8);
    box(base, 35, 39, 2, 1, 0x94a3b8);
    // Cartel de precios en la pared del fondo
    obj(base, 10, 19, 26, 13, 0x0f172a);
    box(base, 11, 20, 24, 11, 0x1e293b);
    box(base, 14, 23, 8, 1, 0xfbbf24);
    box(base, 14, 26, 14, 1, 0x94a3b8);
    box(base, 14, 28, 10, 1, 0x94a3b8);
    plant(base, w - 18, 27);
    // Marca de espera en el piso
    box(base, 24, 78, 26, 1, 0xeab308, 0.7);

    const tick = makeThrottle(110);
    return {
        container: c,
        setCount() {},
        update(t) {
            if (!tick(t)) return;
            anim.clear();
            // Pantalla de la caja con "dígitos" que cambian (decorativo)
            const bright = 0.7 + 0.25 * Math.sin(t / 700);
            box(anim, 48, 28, 14, 6, 0x22c55e, bright);
            for (let k = 0; k < 4; k++) {
                if (((Math.floor(t / 500) + k) % 3) !== 0) box(anim, 50 + k * 3, 30, 2, 2, 0x052e16);
            }
            // Luz del terminal de tarjetas
            box(anim, 40, 39, 2, 1, Math.floor(t / 800) % 2 === 0 ? 0x4ade80 : 0x15803d);
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
                box(anim, cx - 6, 94, 12, 2, 0x000000, 0.3 * a); // sombra
                box(anim, cx - 5, 69 + bob, 10, 10, OUTLINE, 0.7 * a);
                box(anim, cx - 4, 70 + bob, 8, 8, 0xfed7aa, a); // cabeza
                box(anim, cx - 4, 69 + bob, 8, 3, 0x78350f, a); // pelo
                box(anim, cx - 2, 73 + bob, 1, 1, 0x1f2937, a);
                box(anim, cx + 1, 73 + bob, 1, 1, 0x1f2937, a);
                box(anim, cx - 6, 78 + bob, 12, 12, OUTLINE, 0.7 * a);
                box(anim, cx - 5, 78 + bob, 10, 11, shirt, a); // torso
                box(anim, cx - 5, 78 + bob, 10, 1, mix(shirt, 0.35), a);
                box(anim, cx - 4, 89, 3, 6, 0x1e293b, a);
                box(anim, cx + 1, 89, 3, 6, 0x1e293b, a);
                box(anim, cx - 7, 79 + bob, 2, 8, 0xfed7aa, a); // brazos
                box(anim, cx + 5, 79 + bob, 2, 8, 0xfed7aa, a);
            }
        }
    };
}

/** Props de una estación hechos con una imagen PNG (content/sprites.ts): estática, sin animaciones ni pilas de cajas. */
function buildImageProps(id: string, width: number, height: number): StationProps | null {
    const img = getStationImage(id);
    if (!img) return null;
    const container = new Container();
    const sprite = new Sprite(img.tex);
    sprite.x = img.def.x ?? 0;
    sprite.y = img.def.y ?? 16;
    sprite.width = img.def.w ?? width;
    sprite.height = img.def.h ?? Math.max(1, height - 16);
    container.addChild(sprite);
    return { container, update: () => {}, setCount: () => {} };
}

/** Props de la estación, o null si no tiene (el plotter tiene su propio dibujo aprobado). */
export function createStationProps(id: string, width: number, height: number): StationProps | null {
    const image = buildImageProps(id, width, height);
    if (image) return image;
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
