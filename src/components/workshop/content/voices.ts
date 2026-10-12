// content/voices.ts - VOCES de los personajes y sonidos de interfaz (solo datos, editable).
// No usa archivos de audio: todo se sintetiza en el navegador (ver workshopVoice.ts). Cada operario habla con una
// secuencia de "pips" cortos, uno por letra, al estilo de las consolas clasicas. El rol define el timbre y cada
// operario recibe una variacion propia de tono y velocidad (calculada de su id), asi que todos suenan distinto.

import type { WorkerRole } from '../types';

export type VoiceWave = 'square' | 'triangle' | 'sine' | 'sawtooth';

export interface VoiceProfile {
    /** Tono base en Hz (~300 grave, ~700 agudo). */
    pitch: number;
    /** Timbre: 'square' = chiptune clasico, 'triangle' = suave, 'sawtooth' = nasal, 'sine' = campanita. */
    wave: VoiceWave;
    /** Milisegundos entre pips (menos = habla mas rapido). */
    blipMs: number;
    /** Volumen (0 a 0.1 aprox.). */
    vol: number;
}

/** Voz base de cada rol. */
export const ROLE_VOICES: Record<WorkerRole, VoiceProfile> = {
    disenador: { pitch: 640, wave: 'triangle', blipMs: 64, vol: 0.06 },
    impresor: { pitch: 360, wave: 'square', blipMs: 74, vol: 0.035 },
    cortador: { pitch: 520, wave: 'sawtooth', blipMs: 56, vol: 0.03 },
    empaquetador: { pitch: 440, wave: 'square', blipMs: 68, vol: 0.035 }
};

/**
 * Ajustes para un operario puntual: la clave es su nombre en minusculas (o su id). Ejemplo:
 *   'adrian': { pitch: 300, wave: 'square' }
 * Lo que no se indique se toma del rol.
 */
export const VOICE_OVERRIDES: Record<string, Partial<VoiceProfile>> = {
    curushi: { pitch: 680, wave: 'triangle', blipMs: 56, vol: 0.05 },
    mirta: { pitch: 580, wave: 'triangle', blipMs: 54, vol: 0.05 },
    admin: { pitch: 580, wave: 'triangle', blipMs: 54, vol: 0.05 }
};

/** Cuanto varia el tono entre operarios del mismo rol (0.2 = +-20%). Ponelo en 0 para que todos suenen igual. */
export const VOICE_SPREAD = 0.2;

export const VOICE_SETTINGS = {
    /** Maximo de pips por frase (las frases largas se cortan para no cansar). */
    maxBlips: 14,
    /** Pausa minima entre frases automaticas de globo (ms), para que no se pisen. */
    cooldownMs: 1100
};

/** Frases cortas que "dice" un operario al hacerle clic cuando no tiene un globo activo (solo dan forma al sonido; no se muestran). */
export const VOICE_GREETINGS = ['Hola!', 'Que tal?', 'Buenas!', 'Dale, dale!', 'Mmm...', 'Presente!'];

/** Tilines de interfaz (notas en Hz, duracion en segundos). */
export const UI_SOUNDS = {
    open: { notes: [880, 1320], noteMs: 70, vol: 0.05, wave: 'triangle' as VoiceWave },
    close: { notes: [1100, 740], noteMs: 60, vol: 0.035, wave: 'triangle' as VoiceWave }
};
