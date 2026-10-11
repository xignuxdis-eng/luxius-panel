// content/pets.ts - CATÁLOGO DE MASCOTAS del Print Den (solo datos, nada de lógica).
//
// CÓMO AGREGAR O EDITAR UNA MASCOTA
//   1. Copiá uno de los bloques de PET_PROFILES y cambiá los valores. Listo: aparece sola en el taller, en la
//      rotación, en la reunión tras un apagón, con su ficha y su sonido. No hace falta tocar código.
//   2. `species` ('gato' | 'perro') define el dibujo. Los colores (`body`, `shade`, `belly`, `eye`, `nose`) son
//      hexadecimales. `chubby` la hace más ancha y `bulgyEyes` le da ojos saltones.
//   3. Comportamiento: `speed` (px/s), `rest` (pausa entre paseos, ms), `sleepChance`, `scratchChance`
//      (probabilidad de dormir / rascarse al llegar), `petChance` (probabilidad de dejarse acariciar, 0 a 1),
//      `farWalker` (prefiere recorridos largos).
//   4. `sound`: su voz (ver `PetSound` en workshopAnimalSound.ts): maullido ('meow') o ladrido ('bark').
//   5. `stats`, `strengths`, `weaknesses`: texto y números de la ficha. Son de FANTASÍA (decorativos).
// El `id` debe ser único y sin espacios.

import type { PetSound } from '../workshopAnimalSound';

export interface PetStat {
    label: string;
    value: number;
    color: string;
}

export interface PetProfile {
    id: string;
    name: string;
    species: 'gato' | 'perro';
    emoji: string;
    /** Título estilo WoW para la ficha. */
    title: string;
    level: number;
    body: number;
    shade: number;
    belly: number;
    eye: number;
    nose: number;
    chubby?: boolean;
    bulgyEyes?: boolean;
    /** Velocidad al caminar (px/s del mapa). */
    speed: number;
    /** Pausa entre paseos [min, max] en ms. */
    rest: [number, number];
    sleepChance: number;
    scratchChance: number;
    /** Probabilidad de dejarse acariciar (por un operario o por el usuario). */
    petChance: number;
    /** Prefiere recorridos largos. */
    farWalker?: boolean;
    sound: PetSound;
    stats: PetStat[];
    strengths: string[];
    weaknesses: string[];
}

export const PET_PROFILES: PetProfile[] = [
    {
        id: 'frijol',
        name: 'Frijol',
        species: 'gato',
        emoji: '🐈‍⬛',
        title: 'Gata Negra de Guardia',
        level: 7,
        body: 0x2b2b35,
        shade: 0x111116,
        belly: 0x3c3c48,
        eye: 0xfacc15,
        nose: 0xfda4af,
        speed: 14,
        rest: [3000, 8000],
        sleepChance: 0.4,
        scratchChance: 0,
        petChance: 0.7,
        sound: { type: 'meow', pitch: 520 },
        stats: [
            { label: 'Sigilo', value: 92, color: '#a78bfa' },
            { label: 'Cariño', value: 70, color: '#f472b6' },
            { label: 'Curiosidad', value: 78, color: '#38bdf8' },
            { label: 'Energía', value: 55, color: '#fbbf24' },
            { label: 'Siesta', value: 85, color: '#34d399' }
        ],
        strengths: ['Se pasea por todo el taller como si fuera suyo', 'Ronroneo calmante: +5 de buen ánimo al equipo'],
        weaknesses: ['Se camufla con el vinilo negro', 'Despierta de mal humor si la siesta se interrumpe']
    },
    {
        id: 'jaina',
        name: 'Jaina',
        species: 'gato',
        emoji: '🐈',
        title: 'Gata Gris Serena',
        level: 9,
        body: 0x9ca3af,
        shade: 0x6b7280,
        belly: 0xd1d5db,
        eye: 0x34d399,
        nose: 0xfda4af,
        speed: 12,
        rest: [4000, 10000],
        sleepChance: 0.5,
        scratchChance: 0,
        petChance: 0.25,
        sound: { type: 'meow', pitch: 700, length: 0.6, soft: true },
        stats: [
            { label: 'Calma', value: 98, color: '#34d399' },
            { label: 'Cariño', value: 35, color: '#f472b6' },
            { label: 'Curiosidad', value: 60, color: '#38bdf8' },
            { label: 'Energía', value: 40, color: '#fbbf24' },
            { label: 'Siesta', value: 95, color: '#a78bfa' }
        ],
        strengths: ['Calma inalterable, incluso con una entrega urgente', 'Elegancia: nunca pisa un charco de tinta'],
        weaknesses: ['Solo acepta caricias cuando ella lo decide', 'Ignora olímpicamente cuando la llaman']
    },
    {
        id: 'muchi',
        name: 'Muchi',
        species: 'perro',
        emoji: '🐕‍🦺',
        title: 'Torbellino Negro',
        level: 4,
        body: 0x25252d,
        shade: 0x101015,
        belly: 0x3a3a45,
        eye: 0xf8fafc,
        nose: 0x52525b,
        speed: 32,
        rest: [500, 1800],
        sleepChance: 0.04,
        scratchChance: 0,
        petChance: 0.12,
        farWalker: true,
        sound: { type: 'bark', pitch: 620, count: 3, gap: 0.14, dur: 0.09, vol: 0.14 },
        stats: [
            { label: 'Velocidad', value: 96, color: '#38bdf8' },
            { label: 'Energía', value: 99, color: '#fbbf24' },
            { label: 'Cariño', value: 40, color: '#f472b6' },
            { label: 'Obediencia', value: 22, color: '#a78bfa' },
            { label: 'Siesta', value: 8, color: '#34d399' }
        ],
        strengths: ['Primero en llegar a cualquier rincón', 'Detecta repartidores a tres cuadras'],
        weaknesses: ['Imposible de acariciar: no se queda quieto', 'Persigue su propia cola (y a veces la alcanza)']
    },
    {
        id: 'teo',
        name: 'Teo',
        species: 'perro',
        emoji: '🐕',
        title: 'Guardián de la Panza',
        level: 10,
        body: 0x25252d,
        shade: 0x101015,
        belly: 0x3a3a45,
        eye: 0xf8fafc,
        nose: 0x52525b,
        chubby: true,
        bulgyEyes: true,
        speed: 10,
        rest: [4000, 9000],
        sleepChance: 0.45,
        scratchChance: 0,
        petChance: 0.9,
        sound: { type: 'bark', pitch: 210, count: 1, dur: 0.26, vol: 0.2, snort: true },
        stats: [
            { label: 'Cariño', value: 97, color: '#f472b6' },
            { label: 'Apetito', value: 99, color: '#fbbf24' },
            { label: 'Obediencia', value: 60, color: '#a78bfa' },
            { label: 'Energía', value: 30, color: '#38bdf8' },
            { label: 'Siesta', value: 90, color: '#34d399' }
        ],
        strengths: ['Mimos ilimitados: +10 de buen ánimo', 'Ojitos saltones que derriten cualquier corazón'],
        weaknesses: ['Se duerme en medio del pasillo', 'Cualquier galletita lo distrae']
    },
    {
        id: 'borry',
        name: 'Borry',
        species: 'perro',
        emoji: '🐕',
        title: 'Rascador Errante',
        level: 6,
        body: 0x92623a,
        shade: 0x5e3a1c,
        belly: 0xc79a6a,
        eye: 0x1f2937,
        nose: 0x1f2937,
        speed: 22,
        rest: [1200, 4000],
        sleepChance: 0.12,
        scratchChance: 0.4,
        petChance: 0.7,
        farWalker: true,
        sound: { type: 'bark', pitch: 380, count: 2, gap: 0.24, dur: 0.16, vol: 0.15, whine: true },
        stats: [
            { label: 'Resistencia', value: 85, color: '#34d399' },
            { label: 'Caminata', value: 92, color: '#38bdf8' },
            { label: 'Cariño', value: 65, color: '#f472b6' },
            { label: 'Energía', value: 70, color: '#fbbf24' },
            { label: 'Pulgas', value: 99, color: '#ef4444' }
        ],
        strengths: ['Gran caminante: recorre el taller completo', 'Leal con todo el equipo'],
        weaknesses: ['Se rasca en los peores momentos', 'Debuff permanente: Pulgas']
    }
];
