// content/guests.ts - CATÁLOGO DE VISITAS del Print Den (solo datos). Son personajes decorativos.
// Para cambiar cómo se ve o qué dice una visita, editá su bloque. Los colores son '#rrggbb'.
// (Agregar un tipo de visita NUEVO además requiere dispararlo desde workshopEvents.ts.)

import type { BubbleTone } from '../workshopWorkers';

export type GuestKind = 'repartidor' | 'tecnico' | 'guardia';

export interface GuestKindConfig {
    name: string;
    shirt: string;
    skin: string;
    hair: string;
    /** Velocidad al caminar (px/s). */
    speed: number;
    tone: BubbleTone;
    /** Cuánto se queda en la estación (ms). */
    stayMs: number;
    lines: string[];
}

export const GUEST_KINDS: Record<GuestKind, GuestKindConfig> = {
    repartidor: {
        name: 'Repartidor (visita)',
        shirt: '#f97316',
        skin: '#fdba74',
        hair: '#1f2937',
        speed: 30,
        tone: 'info',
        stayMs: 9000,
        lines: ['¡Paquete para el taller! 📦', 'Firmá acá, por favor.', '¡Qué lindos esos impresos! Chau, chau.']
    },
    tecnico: {
        name: 'Técnico de plotter (visita)',
        shirt: '#64748b',
        skin: '#c68642',
        hair: '#111827',
        speed: 28,
        tone: 'info',
        stayMs: 11000,
        lines: ['Vengo a revisar el plotter 🔧', 'Cabezales limpios, todo en orden.', 'Con estos cuidados, imprimen de maravilla.']
    },
    guardia: {
        name: 'Guardia nocturno (visita)',
        shirt: '#1e3a8a',
        skin: '#fed7aa',
        hair: '#374151',
        speed: 20,
        tone: 'info',
        stayMs: 5000,
        lines: [
            'Todo tranquilo en el Den... por ahora.',
            'Ronda nocturna: sin novedades.',
            '¡Por el honor del taller! 🛡️',
            'Alto ahí, viajero... ah, no, es un vinilo.',
            'Que la luz de las lámparas guíe sus impresiones.'
        ]
    }
};
