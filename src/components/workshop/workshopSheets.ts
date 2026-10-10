// workshopSheets.ts - Fichas técnicas "estilo WoW" de los operarios del Print Den
//
// IMPORTANTE (regla de datos): las estadísticas, fortalezas y debilidades son de FANTASÍA y divertidas.
// Se generan de forma determinista a partir del rol y del nombre/ID del operario (siempre la misma ficha para la misma persona)
// y la pantalla lo aclara. Los datos REALES de la ficha son: nombre, rol, qué está haciendo ahora y cuántas órdenes
// hay esperando a su rol (se calculan fuera de este archivo con las órdenes del sistema).

import type { WorkerRole } from './types';
import type { WorkerSnapshot } from './workshopWorkers';

export interface WorkerStat {
    key: string;
    label: string;
    icon: string;
    value: number; // 1..100
    color: string;
}

export interface WorkerSheet {
    className: string;
    title: string;
    level: number;
    rarity: 'Raro' | 'Épico' | 'Legendario';
    rarityColor: string;
    stats: WorkerStat[];
    strengths: string[];
    weaknesses: string[];
    quote: string;
    gear: string;
}

/** Hash simple y estable de un texto (no criptográfico). */
export function hashString(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Generador pseudoaleatorio estable a partir de una semilla (mulberry32). */
function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface RoleProfile {
    className: string;
    titles: string[];
    /** Base de cada estadística (1..100) para el rol. */
    base: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    quotes: string[];
    gear: string[];
}

export const STAT_DEFS: Array<{ key: string; label: string; icon: string; color: string }> = [
    { key: 'creatividad', label: 'Creatividad', icon: '🎨', color: '#a78bfa' },
    { key: 'precision', label: 'Precisión', icon: '🎯', color: '#38bdf8' },
    { key: 'velocidad', label: 'Velocidad', icon: '⚡', color: '#facc15' },
    { key: 'aguante', label: 'Aguante', icon: '🛡️', color: '#4ade80' },
    { key: 'paciencia', label: 'Paciencia', icon: '🧘', color: '#f472b6' },
    { key: 'cafe', label: 'Maná de café', icon: '☕', color: '#fb923c' }
];

const PROFILES: Record<WorkerRole, RoleProfile> = {
    disenador: {
        className: 'Mago Arcano del Píxel',
        titles: ['Hechicero de las Capas', 'Señor del Degradé', 'Tejedor de Vectores', 'Archimago del Kerning'],
        base: { creatividad: 88, precision: 70, velocidad: 62, aguante: 48, paciencia: 56, cafe: 82 },
        strengths: [
            'Convierte un boceto borroso en arte legendario.',
            'Detecta una fuente mal elegida a diez metros.',
            'Lanza degradés con daño crítico a los ojos del cliente.',
            'Atajos de teclado a nivel Grand Maestro.',
            'Mana infinito mientras haya café.'
        ],
        weaknesses: [
            'Pierde 2 de vida cuando le piden "el logo más grande".',
            'Se debilita ante archivos JPG de 20 KB.',
            'Vulnerable al comentario "dejalo como estaba".',
            'Cada cambio de último momento le cuesta un punto de cordura.',
            'Se distrae con tipografías nuevas.'
        ],
        quotes: ['Un poco más de contraste y es épico.', 'Eso no es amarillo, es oro legendario.', 'Dame cinco minutos más de render.'],
        gear: ['Tableta Gráfica de las Mil Capas', 'Monitor Calibrado del Destino', 'Teclado de Atajos Prohibidos']
    },
    impresor: {
        className: 'Maestro de la Forja de Tinta',
        titles: ['Domador del Plotter', 'Guardián del Cabezal', 'Alquimista CMYK', 'Señor del Banding Cero'],
        base: { creatividad: 58, precision: 86, velocidad: 66, aguante: 78, paciencia: 74, cafe: 64 },
        strengths: [
            'Calibra el plotter con los ojos cerrados.',
            'Detecta un cabezal sucio por el sonido.',
            'Aguante épico en turnos de lotes interminables.',
            'Sus negros son más profundos que Dark Souls.',
            'Sabe cuánto vinilo queda sin mirar el rollo.'
        ],
        weaknesses: [
            'Sufre un debuff al ver líneas de banding.',
            'Pierde la calma si falta tinta cian a mitad de lote.',
            'Vulnerable a los archivos en RGB sin perfil.',
            'Se paraliza con "es urgente, para ya".',
            'Hablarle del ancho de bobina lo deja hablando una hora.'
        ],
        quotes: ['Esto sale en una sola pasada.', 'Cero banding, cero drama.', 'El plotter y yo tenemos un trato.'],
        gear: ['Espátula Sagrada de Calibración', 'Guantes de Nitrilo +5', 'Lupa de Detección de Banding']
    },
    cortador: {
        className: 'Pícaro del Filo',
        titles: ['Sombra del Cutter', 'Maestro del Refilado', 'Cuchilla Silenciosa', 'Verdugo del Sangrado'],
        base: { creatividad: 46, precision: 92, velocidad: 78, aguante: 66, paciencia: 60, cafe: 58 },
        strengths: [
            'Corta al milímetro sin dejar una sola rebaba.',
            'Sabe cuánto sangrado dejar sin medirlo.',
            'Esquiva el desperdicio de material con agilidad felina.',
            'Críticos garantizados en bordes rectos.',
            'Mano firme incluso de madrugada.'
        ],
        weaknesses: [
            'Pierde puntos de vida ante cortes sin guías.',
            'Lo desespera que le pidan esquinas redondeadas a último momento.',
            'Vulnerable a lonas con pliegues.',
            'Se estresa con cutters sin filo.',
            'Siempre pierde la regla justo cuando la necesita.'
        ],
        quotes: ['Un milímetro de más es un mundo.', 'Este corte queda de manual.', 'Cuchilla afilada, mente tranquila.'],
        gear: ['Cutter de Hoja Quebrada', 'Regla Metálica del Destino', 'Tabla de Corte Verde +10']
    },
    empaquetador: {
        className: 'Paladín del Embalaje',
        titles: ['Escudo del Despacho', 'Caballero de la Cinta', 'Guardián de los Rollos', 'Rey del Nylon Burbuja'],
        base: { creatividad: 52, precision: 72, velocidad: 70, aguante: 90, paciencia: 80, cafe: 60 },
        strengths: [
            'Ningún rollo llega roto bajo su protección.',
            'Arma cajas más rápido que un speedrunner.',
            'Aguante inagotable cargando pedidos pesados.',
            'Sabe pegar la cinta recta al primer intento.',
            'Defensa total contra golpes de transporte.'
        ],
        weaknesses: [
            'Pierde vida si la caja es medio centímetro más chica.',
            'Odia que falte una etiqueta de envío.',
            'Se debilita ante pedidos sin dirección.',
            'Vulnerable a quedarse sin cinta justo al final.',
            'Un pallet mal apilado lo saca de quicio.'
        ],
        quotes: ['Acá no se rompe nada.', 'Entrega segura, cliente feliz.', 'Cinta recta, vida recta.'],
        gear: ['Pistola de Cinta Legendaria', 'Rollo de Nylon Burbuja Épico', 'Carretilla de la Ligereza']
    }
};

/** Fichas de ejemplo para pruebas y para mostrar en pantalla. Siempre la misma ficha para el mismo operario. */
export function buildWorkerSheet(snapshot: Pick<WorkerSnapshot, 'id' | 'name' | 'role'>): WorkerSheet {
    const profile = PROFILES[snapshot.role];
    const seed = hashString(`${snapshot.id}|${snapshot.name}|${snapshot.role}`);
    const rnd = seeded(seed);

    const stats: WorkerStat[] = STAT_DEFS.map((d) => {
        const jitter = Math.round((rnd() - 0.5) * 24); // ±12
        const value = Math.max(18, Math.min(99, (profile.base[d.key] ?? 50) + jitter));
        return { key: d.key, label: d.label, icon: d.icon, value, color: d.color };
    });

    const pick = <T,>(arr: T[], n: number): T[] => {
        const pool = [...arr];
        const out: T[] = [];
        while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
        return out;
    };

    const level = 52 + Math.floor(rnd() * 14); // 52..65
    const avg = stats.reduce((a, s) => a + s.value, 0) / stats.length;
    const rarity: WorkerSheet['rarity'] = avg >= 78 ? 'Legendario' : avg >= 68 ? 'Épico' : 'Raro';
    const rarityColor = rarity === 'Legendario' ? '#ff8000' : rarity === 'Épico' ? '#a335ee' : '#0070dd';

    return {
        className: profile.className,
        title: pick(profile.titles, 1)[0],
        level,
        rarity,
        rarityColor,
        stats,
        strengths: pick(profile.strengths, 2),
        weaknesses: pick(profile.weaknesses, 2),
        quote: pick(profile.quotes, 1)[0],
        gear: pick(profile.gear, 1)[0]
    };
}

/** Qué está haciendo el operario ahora mismo, en texto (datos reales del movimiento del taller). */
export function describeActivity(w: Pick<WorkerSnapshot, 'errand' | 'chatting' | 'stroll' | 'mode' | 'visiting' | 'errandText' | 'role'>): string {
    const station: Record<WorkerRole, string> = {
        disenador: 'Diseño',
        impresor: 'el Plotter',
        cortador: 'Refilado',
        empaquetador: 'Empaque'
    };
    if (w.errand === 'going') return `Llevando una orden${w.errandText ? ` (${w.errandText})` : ''}`;
    if (w.errand === 'dwell') return `Entregando una orden${w.errandText ? ` (${w.errandText})` : ''}`;
    if (w.errand === 'returning') return 'Volviendo a su puesto con la tarea cumplida';
    if (w.chatting) return 'Charlando con un compañero';
    if (w.visiting) return 'Trabajando un rato en otra estación';
    if (w.stroll === 'out') return 'Dando una vuelta por el taller';
    if (w.stroll === 'back') return 'Volviendo a su puesto';
    if (w.mode === 'walk') return 'Caminando por el taller';
    return `En su puesto de ${station[w.role]}, atento a nuevas órdenes`;
}

export const ROLE_LABEL: Record<WorkerRole, string> = {
    disenador: 'Diseñador',
    impresor: 'Impresor',
    cortador: 'Cortador',
    empaquetador: 'Empaquetador'
};
