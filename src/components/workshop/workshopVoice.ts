// workshopVoice.ts - Voces de los personajes y tilines de interfaz del Print Den (WebAudio, sin archivos de audio).
// Los datos viven en content/voices.ts; aca solo esta el "como suena". Suena unicamente por gestos/eventos del
// usuario y si los botones "Voces" / "Interfaz" de la barra estan en ON.

import { ROLE_VOICES, VOICE_OVERRIDES, VOICE_SPREAD, VOICE_SETTINGS, VOICE_GREETINGS, UI_SOUNDS, type VoiceProfile } from './content/voices';
import { getAudioContext } from './workshopAnimalSound';
import type { WorkerRole } from './types';

function hash01(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
}

/** Voz final de un personaje: la del rol + sus ajustes propios + una variacion estable calculada de su id. */
export function resolveVoice(role: WorkerRole, name: string, id: string): VoiceProfile {
    const base = ROLE_VOICES[role] ?? ROLE_VOICES.empaquetador;
    const override = VOICE_OVERRIDES[name.trim().toLowerCase()] ?? VOICE_OVERRIDES[id] ?? {};
    const v = { ...base, ...override };
    const r = hash01(id) * 2 - 1; // -1..1, siempre igual para el mismo operario
    const r2 = hash01(id + '#') * 2 - 1;
    return { ...v, pitch: v.pitch * (1 + r * VOICE_SPREAD), blipMs: v.blipMs * (1 + r2 * 0.15) };
}

export function randomGreeting(): string {
    return VOICE_GREETINGS[Math.floor(Math.random() * VOICE_GREETINGS.length)] ?? 'Hola!';
}

let busyUntil = 0;

/** Un pip: oscilador corto con ataque y caida rapidos. */
function blip(c: AudioContext, t0: number, freq: number, dur: number, vol: number, wave: OscillatorType) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(freq * 1.04, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
}

/**
 * Hace "hablar" a un personaje: un pip por letra (vocales un poco mas agudas, espacios = pausa).
 * `force` = true (clic del usuario) ignora la pausa entre frases automaticas.
 */
export function playVoice(voice: VoiceProfile, text: string, force = false): boolean {
    const c = getAudioContext();
    if (!c) return false;
    const now = c.currentTime;
    if (!force && now < busyUntil) return false;
    const clean = text.replace(/[^\p{L}\p{N}\s?!.,]/gu, '');
    const rising = /\?\s*$/.test(clean);
    const loud = /!\s*$/.test(clean);
    const step = voice.blipMs / 1000;
    let t = now + 0.01;
    let n = 0;
    const letters = [...clean];
    for (let i = 0; i < letters.length && n < VOICE_SETTINGS.maxBlips; i++) {
        const ch = letters[i];
        if (/\s/.test(ch) || /[.,]/.test(ch)) {
            t += step * 0.9;
            continue;
        }
        const code = ch.toLowerCase().charCodeAt(0);
        const vowel = 'aeiouáéíóú'.includes(ch.toLowerCase());
        // variacion determinista por letra, en semitonos (-3..+3), y vocales una tercera mas arriba
        const semis = ((code % 7) - 3) + (vowel ? 3 : 0);
        let f = voice.pitch * Math.pow(2, semis / 12);
        if (rising && i > letters.length - 4) f *= 1.18; // la pregunta sube al final
        blip(c, t, f, Math.max(0.04, step * 0.85), voice.vol * (loud && i > letters.length - 4 ? 1.5 : 1), voice.wave);
        t += step;
        n++;
    }
    busyUntil = t + VOICE_SETTINGS.cooldownMs / 1000;
    return n > 0;
}

/** Tilin de interfaz: 'open' (sube) al abrir una ficha/panel, 'close' (baja) al cerrarlo. */
export function playUiSound(kind: keyof typeof UI_SOUNDS) {
    const c = getAudioContext();
    if (!c) return;
    const cfg = UI_SOUNDS[kind];
    let t = c.currentTime + 0.005;
    for (const f of cfg.notes) {
        blip(c, t, f, cfg.noteMs / 1000 + 0.05, cfg.vol, cfg.wave);
        t += cfg.noteMs / 1000;
    }
}
