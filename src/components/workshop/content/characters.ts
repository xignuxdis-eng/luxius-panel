// content/characters.ts - ASPECTO DE LOS OPERARIOS (solo datos): color de camisa por rol, tonos de piel y colores
// fijos del sprite (pantalón, zapatos, herramientas...). Para cambiar la imagen completa por un PNG ver content/sprites.ts.

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

/** Colores fijos del sprite procedural (la camisa, la piel y el pelo vienen de cada operario). */
export const CHARACTER_PALETTE = {
    hairDefault: '#3b2a20',
    eye: '#0f172a',
    pants: '#334155',
    pantsDark: '#1e293b',
    shoe: '#0f172a',
    metalLight: '#e2e8f0', // tableta (marco)
    screenBlue: '#38bdf8', // tableta (pantalla)
    ink: '#06b6d4', // botella de tinta
    handleRed: '#ef4444', // mango del cúter
    blade: '#cbd5e1', // hoja del cúter
    cardboard: '#a16207', // caja
    tape: '#fde68a' // cinta
};
