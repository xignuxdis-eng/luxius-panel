// content/guests.ts - CATÁLOGO DE VISITAS del Print Den (solo datos). Son personajes decorativos.
// Para cambiar cómo se ve o qué dice una visita, editá su bloque. Los colores son '#rrggbb'.
// (Agregar un tipo de visita NUEVO además requiere dispararlo desde workshopEvents.ts.)

import type { BubbleTone } from '../workshopWorkers';

export type GuestKind = 'repartidor' | 'tecnico' | 'cliente' | 'pizzero';

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
    cliente: {
        name: 'Miguel Zacco:Axis',
        shirt: '#0284c7',
        skin: '#f5d0a9',
        hair: '#334155',
        speed: 29,
        tone: 'info',
        stayMs: 12000, // Permanencia breve y acotada en mostrador
        lines: [
            '¡Buen día equipo! Vengo a ver los metros de Axis.',
            '¿Cómo viene la tirada de lonas para Axis?',
            'Excelente nitidez y fidelidad de color como siempre.',
            'Ya me llevo los pliegos de Axis. ¡Gran trabajo chicos!'
        ]
    },
    pizzero: {
        name: 'Repartidor de pizza (visita)',
        shirt: '#dc2626',
        skin: '#f1c27d',
        hair: '#292524',
        speed: 34,
        tone: 'ok',
        stayMs: 9000,
        lines: ['¡Pizza para el equipo! 🍕', 'Todavía está calentita.', '¡Que aproveche! Chau, chau.']
    }
};
