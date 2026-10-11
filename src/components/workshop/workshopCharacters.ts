// workshopCharacters.ts - Personajes pixel art procedurales (16x24 px) para el Print Den (Fase 3, sub-etapa 4.1)
// Solo SPRITES: no tiene lógica de órdenes, movimiento ni sonido. Se conecta al mapa en 4.2.
// Cada pose se genera como matriz de caracteres y se convierte en textura con createPixelTexture
// (nearest-neighbor, con cache). Es fácil de reemplazar por PNG más adelante.
//
// Presupuesto de texturas por operario: 3 variantes x 4 direcciones (caminata) + 1 (respiro) + 2 (trabajo) = 15.
// Con 4 operarios son 60 + 1 sombra compartida.

import { Texture, Rectangle } from 'pixi.js';
import { createPixelTexture } from './workshopSprites';
import { getCharacterSheet } from './workshopSpriteOverrides';
import { CHARACTER_PALETTE } from './content/characters';
import { CHARACTER_SHEET_LAYOUT } from './content/sprites';
import type { WorkerRole } from './types';

export const CHARACTER_W = 16;
export const CHARACTER_H = 24;

export type CharacterDirection = 'down' | 'up' | 'left' | 'right';
export const CHARACTER_DIRECTIONS: CharacterDirection[] = ['down', 'up', 'left', 'right'];

/** Variante de pierna/brazo en la caminata: N = neutro, A y B = pasos opuestos. */
export type WalkVariant = 'N' | 'A' | 'B';
/** Secuencia de 4 cuadros de caminata (los cuadros 0 y 2 comparten textura). */
export const WALK_SEQUENCE: WalkVariant[] = ['N', 'A', 'N', 'B'];

export interface CharacterLook {
    shirtColor: string;
    skinColor: string;
    hairColor?: string;
    role: WorkerRole;
    /** Clave de la hoja PNG de reemplazo (por defecto el rol). Ver content/sprites.ts. */
    sheetKey?: string;
}

export type CharacterPose =
    | { kind: 'walk'; dir: CharacterDirection; variant: WalkVariant }
    | { kind: 'idle'; breath: boolean }
    | { kind: 'work'; frame: 0 | 1; role: WorkerRole };

export interface CharacterTextures {
    /** 4 cuadros por dirección, en el orden de WALK_SEQUENCE. */
    walk: Record<CharacterDirection, Texture[]>;
    /** 2 cuadros: reposo y respiro (de frente). */
    idle: Texture[];
    /** 2 cuadros de "trabajando" según el rol (de frente). */
    work: Texture[];
}

type Grid = string[][];

const blank = (): Grid => Array.from({ length: CHARACTER_H }, () => Array<string>(CHARACTER_W).fill('.'));

const put = (g: Grid, x: number, y: number, c: string) => {
    if (x >= 0 && x < CHARACTER_W && y >= 0 && y < CHARACTER_H) g[y][x] = c;
};

const rect = (g: Grid, x0: number, y0: number, x1: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(g, x, y, c);
};

const toRows = (g: Grid): string[] => g.map((row) => row.join(''));

const mirrorRows = (rows: string[]): string[] => rows.map((r) => r.split('').reverse().join(''));

/** Oscurece un color #rrggbb multiplicando cada canal por `factor` (0-1). */
function darken(hex: string, factor: number): string {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const r = Math.round(((n >> 16) & 255) * factor);
    const g = Math.round(((n >> 8) & 255) * factor);
    const b = Math.round((n & 255) * factor);
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Letras de la matriz:
 *  H pelo · S piel · s piel oscura · E ojo · T camisa · t camisa oscura
 *  P pantalón · p pantalón oscuro · B zapato
 *  a metal claro · b azul pantalla · c cian tinta · r rojo mango · g gris hoja · n cartón · y cinta
 */
export function buildCharacterPalette(look: CharacterLook): Record<string, string> {
    const P = CHARACTER_PALETTE;
    return {
        H: look.hairColor || P.hairDefault,
        S: look.skinColor,
        s: darken(look.skinColor, 0.8),
        E: P.eye,
        T: look.shirtColor,
        t: darken(look.shirtColor, 0.7),
        P: P.pants,
        p: P.pantsDark,
        B: P.shoe,
        a: P.metalLight,
        b: P.screenBlue,
        c: P.ink,
        r: P.handleRed,
        g: P.blade,
        n: P.cardboard,
        y: P.tape
    };
}

/** Piernas vistas de frente o de espalda. El pie "levantado" queda 1 px más arriba. */
function drawLegsFront(g: Grid, variant: WalkVariant) {
    const leftLift = variant === 'A' ? 1 : 0;
    const rightLift = variant === 'B' ? 1 : 0;

    const leg = (x0: number, x1: number, lift: number, innerX: number) => {
        rect(g, x0, 16, x1, 20 - lift, 'P');
        rect(g, innerX, 16, innerX, 20 - lift, 'p');
        rect(g, x0, 21 - lift, x1, 22 - lift, 'B');
    };
    leg(5, 7, leftLift, 7);
    leg(8, 10, rightLift, 8);
}

function drawBodyFront(g: Grid, variant: WalkVariant, back: boolean, bob: number) {
    // Cabeza
    if (!back) {
        rect(g, 6, 2 + bob, 9, 2 + bob, 'H');
        rect(g, 5, 3 + bob, 10, 3 + bob, 'H');
        put(g, 5, 4 + bob, 'H');
        put(g, 10, 4 + bob, 'H');
        rect(g, 6, 4 + bob, 9, 4 + bob, 'S');
        rect(g, 5, 5 + bob, 10, 6 + bob, 'S');
        put(g, 6, 5 + bob, 'E');
        put(g, 9, 5 + bob, 'E');
        rect(g, 6, 7 + bob, 9, 7 + bob, 'S');
    } else {
        rect(g, 6, 2 + bob, 9, 2 + bob, 'H');
        rect(g, 5, 3 + bob, 10, 7 + bob, 'H');
    }
    rect(g, 7, 8 + bob, 8, 8 + bob, 's');

    // Torso
    rect(g, 4, 9 + bob, 11, 14 + bob, 'T');
    rect(g, 11, 9 + bob, 11, 14 + bob, 't');
    rect(g, 4, 15 + bob, 11, 15 + bob, 't');

    // Brazos: las manos suben/bajan en sentido opuesto en cada paso
    const d = variant === 'A' ? -1 : variant === 'B' ? 1 : 0;
    const arm = (x: number, dy: number) => {
        rect(g, x, 10 + bob, x, 12 + bob, 'T');
        rect(g, x, 13 + bob + Math.min(dy, 0), x, 14 + bob + dy, 'S');
    };
    arm(3, d);
    arm(12, -d);
}

function drawSideRight(g: Grid, variant: WalkVariant, bob: number) {
    // Cabeza mirando a la derecha
    rect(g, 5, 2 + bob, 9, 2 + bob, 'H');
    rect(g, 5, 3 + bob, 10, 3 + bob, 'H');
    rect(g, 5, 4 + bob, 7, 4 + bob, 'H');
    rect(g, 8, 4 + bob, 10, 4 + bob, 'S');
    rect(g, 5, 5 + bob, 6, 5 + bob, 'H');
    rect(g, 7, 5 + bob, 10, 5 + bob, 'S');
    put(g, 9, 5 + bob, 'E');
    put(g, 11, 5 + bob, 'S'); // nariz
    rect(g, 7, 6 + bob, 10, 6 + bob, 'S');
    rect(g, 7, 7 + bob, 9, 7 + bob, 'S');
    rect(g, 7, 8 + bob, 8, 8 + bob, 's');

    // Torso de perfil
    rect(g, 5, 9 + bob, 10, 14 + bob, 'T');
    rect(g, 5, 9 + bob, 5, 14 + bob, 't');
    rect(g, 5, 15 + bob, 10, 15 + bob, 't');

    // Brazo que se balancea
    const dx = variant === 'A' ? 1 : variant === 'B' ? -1 : 0;
    rect(g, 7 + dx, 10 + bob, 8 + dx, 12 + bob, 't');
    rect(g, 7 + dx, 13 + bob, 8 + dx, 14 + bob, 'S');

    // Piernas: abiertas en A, juntas en B
    const s = variant === 'A' ? 1 : variant === 'B' ? -1 : 0;
    rect(g, 6, 16, 9, 17, 'P');
    rect(g, 6 - s, 18, 7 - s, 20, 'P'); // pierna de atrás
    rect(g, 8 + s, 18, 9 + s, 20, 'P'); // pierna de adelante
    rect(g, 6 - s, 21, 8 - s, 22, 'B');
    rect(g, 8 + s, 21, 10 + s, 22, 'B');
}

/** Herramienta que sostiene el operario al "trabajar" (de frente). `up` sube 1 px en el segundo cuadro. */
function drawTool(g: Grid, role: WorkerRole, up: number) {
    switch (role) {
        case 'disenador': // tableta
            rect(g, 6, 12 - up, 9, 14 - up, 'a');
            rect(g, 7, 13 - up, 8, 13 - up, 'b');
            break;
        case 'impresor': // botella de tinta
            rect(g, 7, 11 - up, 8, 11 - up, 'E');
            rect(g, 7, 12 - up, 8, 14 - up, 'c');
            break;
        case 'cortador': // cúter: hoja y mango
            rect(g, 8, 10 - up, 8, 13 - up, 'g');
            rect(g, 7, 14 - up, 8, 14 - up, 'r');
            break;
        case 'empaquetador': // caja con cinta
            rect(g, 5, 12 - up, 10, 15 - up, 'n');
            rect(g, 7, 12 - up, 8, 15 - up, 'y');
            break;
    }
}

function drawWork(g: Grid, role: WorkerRole, frame: 0 | 1) {
    drawBodyFront(g, 'N', false, 0);
    drawLegsFront(g, 'N');
    // Se borran los brazos de reposo y se dibujan los antebrazos hacia el frente
    rect(g, 3, 10, 3, 15, '.');
    rect(g, 12, 10, 12, 15, '.');
    rect(g, 3, 10, 3, 11, 'T');
    rect(g, 12, 10, 12, 11, 'T');
    put(g, 4, 12, 't');
    put(g, 11, 12, 't');
    put(g, 5, 12 - frame, 'S');
    put(g, 10, 12 - frame, 'S');
    drawTool(g, role, frame);
}

/** Genera la matriz de caracteres (24 filas de 16 columnas) de una pose. Función pura, sin Pixi. */
export function buildCharacterMatrix(pose: CharacterPose): string[] {
    const g = blank();

    if (pose.kind === 'walk') {
        if (pose.dir === 'down' || pose.dir === 'up') {
            drawBodyFront(g, pose.variant, pose.dir === 'up', 0);
            drawLegsFront(g, pose.variant);
            return toRows(g);
        }
        drawSideRight(g, pose.variant, 0);
        const rows = toRows(g);
        return pose.dir === 'left' ? mirrorRows(rows) : rows;
    }

    if (pose.kind === 'idle') {
        drawBodyFront(g, 'N', false, pose.breath ? 1 : 0);
        drawLegsFront(g, 'N');
        return toRows(g);
    }

    drawWork(g, pose.role, pose.frame);
    return toRows(g);
}

const lookKey = (look: CharacterLook) =>
    `${look.role}_${look.shirtColor}_${look.skinColor}_${look.hairColor || 'def'}`.replace(/[^a-zA-Z0-9_]/g, '');

/** Sombra elíptica compartida (14x5 px, negro semitransparente). Se coloca bajo los pies del operario. */
export function getCharacterShadowTexture(): Texture {
    const matrix = [
        '....kkkkkkkk....',
        '..kkkkkkkkkkkk..',
        '.kkkkkkkkkkkkkk.',
        '..kkkkkkkkkkkk..',
        '....kkkkkkkk....'
    ];
    return createPixelTexture('char_shadow', matrix, { k: 'rgba(0,0,0,0.35)' });
}

const sheetCache = new Map<string, CharacterTextures>();

/** Corta una hoja PNG de operario en cuadros (ver CHARACTER_SHEET_LAYOUT en content/sprites.ts). */
function texturesFromSheet(sheetKey: string, sheet: Texture): CharacterTextures {
    const cached = sheetCache.get(sheetKey);
    if (cached && !cached.idle[0].destroyed) return cached;
    const L = CHARACTER_SHEET_LAYOUT;
    const frame = (col: number, row: number) =>
        new Texture({ source: sheet.source, frame: new Rectangle(col * CHARACTER_W, row * CHARACTER_H, CHARACTER_W, CHARACTER_H) });
    const walk = {} as Record<CharacterDirection, Texture[]>;
    for (const dir of CHARACTER_DIRECTIONS) {
        walk[dir] = Array.from({ length: L.walkCols }, (_, c) => frame(c, L.walkRows[dir]));
    }
    const result: CharacterTextures = {
        walk,
        idle: [walk.down[0], frame(L.idleBreathCol, L.idleRow)],
        work: [frame(L.workCols[0], L.workRow), frame(L.workCols[1], L.workRow)]
    };
    sheetCache.set(sheetKey, result);
    return result;
}

/** Obtiene (y crea si hace falta) todas las texturas de un operario. Usa la cache de workshopSprites. */
export function getCharacterTextures(look: CharacterLook): CharacterTextures {
    // Hoja PNG propia (por rol o visita); si no hay, la hoja 'default' (salvo visitas); si no, el dibujo procedural
    const sheetKey = look.sheetKey ?? look.role;
    const sheet = getCharacterSheet(sheetKey) ?? (look.sheetKey ? null : getCharacterSheet('default'));
    if (sheet) return texturesFromSheet(getCharacterSheet(sheetKey) ? sheetKey : 'default', sheet);
    const key = lookKey(look);
    const palette = buildCharacterPalette(look);
    const tex = (name: string, pose: CharacterPose) =>
        createPixelTexture(`char_${key}_${name}`, buildCharacterMatrix(pose), palette);

    const walk = {} as Record<CharacterDirection, Texture[]>;
    for (const dir of CHARACTER_DIRECTIONS) {
        const byVariant: Record<WalkVariant, Texture> = {
            N: tex(`walk_${dir}_N`, { kind: 'walk', dir, variant: 'N' }),
            A: tex(`walk_${dir}_A`, { kind: 'walk', dir, variant: 'A' }),
            B: tex(`walk_${dir}_B`, { kind: 'walk', dir, variant: 'B' })
        };
        walk[dir] = WALK_SEQUENCE.map((v) => byVariant[v]);
    }

    const idle = [walk.down[0], tex('idle_breath', { kind: 'idle', breath: true })];
    const work = [
        tex('work_0', { kind: 'work', frame: 0, role: look.role }),
        tex('work_1', { kind: 'work', frame: 1, role: look.role })
    ];

    return { walk, idle, work };
}
