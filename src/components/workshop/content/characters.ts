// content/characters.ts - ASPECTO DE LOS OPERARIOS (solo datos): color de camisa por rol, tonos de piel y colores
// fijos del sprite (pantalón, zapatos, herramientas...). Para cambiar la imagen completa por un PNG ver content/sprites.ts.
//
// RASGOS INDIVIDUALES (sutiles): cada operario recibe color de pelo, peinado y accesorio de forma estable según su id,
// así que siempre se ve igual. Para forzar los de alguien concreto, agregalo a LOOK_OVERRIDES por nombre en minúsculas.

import type { WorkerRole } from '../types';

/** Color de camisa de cada rol. */
export const ROLE_SHIRT: Record<WorkerRole, string> = {
    disenador: '#8b5cf6',
    impresor: '#22c55e',
    cortador: '#ec4899',
    empaquetador: '#0284c7'
};

/** Colores de piel (se reparten entre los operarios en orden). */
export const LEGACY_SKINS = ['#fca5a5', '#fdba74', '#c68642', '#fed7aa', '#8d5524'];

/** Colores de pelo posibles (castaño, negro, caoba, rubio oscuro, rubio, pelirrojo, canoso). */
export const HAIR_COLORS = ['#3b2a20', '#1f1a17', '#7c4a21', '#b9772f', '#d6b25e', '#8a3b1f', '#6b7280'];

export type HairStyle = 'short' | 'tuft' | 'long' | 'cap' | 'bun';
export type Accessory = 'none' | 'glasses' | 'beard' | 'headband' | 'mustache';

/** Peinados posibles (repetir un valor lo hace más frecuente). */
export const HAIR_STYLES: HairStyle[] = ['short', 'short', 'tuft', 'long', 'cap'];
/** Accesorios posibles (repetir 'none' hace que la mayoría no lleve ninguno). */
export const ACCESSORIES: Accessory[] = ['none', 'none', 'glasses', 'beard', 'headband', 'mustache'];

export interface LookTraits {
    hairColor: string;
    hairStyle: HairStyle;
    accessory: Accessory;
    gender?: 'f' | 'm';
}

/** Rasgos fijos para operarios concretos. Clave: nombre en minúsculas. */
export const LOOK_OVERRIDES: Record<string, Partial<LookTraits>> = {
    adrian: {
        gender: 'm',
        hairStyle: 'short',
        hairColor: '#2b2118',
        accessory: 'glasses'
    },
    carlos: {
        gender: 'm',
        hairStyle: 'cap',
        hairColor: '#1f1a17',
        accessory: 'beard'
    },
    mirta: {
        gender: 'f',
        hairStyle: 'bun',
        hairColor: '#52525b',
        accessory: 'glasses'
    },
    admin: {
        gender: 'f',
        hairStyle: 'bun',
        hairColor: '#52525b',
        accessory: 'glasses'
    },
    agustin: {
        gender: 'm',
        hairStyle: 'tuft',
        hairColor: '#7c4a21',
        accessory: 'none'
    },
    curushi: {
        gender: 'f',
        hairStyle: 'long',
        hairColor: '#4a2818',
        accessory: 'headband'
    }
};

/** Hash estable de un texto (para que cada operario tenga siempre los mismos rasgos). */
function hashStr(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Elige los rasgos de un operario según su id (y el nombre, si hay un override). */
export function pickTraits(id: string, name?: string): LookTraits {
    const h = hashStr(id);
    const base: LookTraits = {
        hairColor: HAIR_COLORS[h % HAIR_COLORS.length],
        hairStyle: HAIR_STYLES[(h >>> 5) % HAIR_STYLES.length],
        accessory: ACCESSORIES[(h >>> 9) % ACCESSORIES.length],
        gender: 'm'
    };
    const key = (name || '').trim().toLowerCase();
    const idKey = (id || '').trim().toLowerCase();
    const matchKey = Object.keys(LOOK_OVERRIDES).find(k => key.includes(k) || idKey.includes(k));
    const ov = matchKey ? LOOK_OVERRIDES[matchKey] : undefined;
    const res = ov ? { ...base, ...ov } : base;
    if (res.gender === 'f' && (res.accessory === 'beard' || res.accessory === 'mustache')) {
        res.accessory = 'headband';
    }
    return res;
}

/** Colores fijos del sprite procedural (la camisa, la piel y el pelo vienen de cada operario). */
export const CHARACTER_PALETTE = {
    hairDefault: '#3b2a20',
    eye: '#0f172a',
    pants: '#334155',
    pantsDark: '#1e293b',
    shoe: '#0f172a',
    glasses: '#7dd3fc', // marco de los anteojos
    headband: '#f43f5e', // vincha
    metalLight: '#e2e8f0', // tableta (marco)
    screenBlue: '#38bdf8', // tableta (pantalla)
    ink: '#06b6d4', // botella de tinta
    handleRed: '#ef4444', // mango del cúter
    blade: '#cbd5e1', // hoja del cúter
    cardboard: '#a16207', // caja
    tape: '#fde68a' // cinta
};
