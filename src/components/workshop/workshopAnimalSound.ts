// workshopAnimalSound.ts - Sonidos característicos de las mascotas del Print Den (sintetizados con WebAudio).
// No usa archivos de audio: cada mascota describe su voz con DATOS (ver `PetSound` y content/pets.ts), así que
// agregar una mascota nueva no requiere tocar este archivo. Solo suena cuando el usuario hace clic (gesto del
// usuario) y si el botón "Animales" está en ON.

/** Receta de voz de una mascota (todo en datos, editable en content/pets.ts). */
export type PetSound =
    | {
          type: 'meow';
          /** Tono base en Hz (≈500 grave, ≈700 agudo). */
          pitch: number;
          /** Duración relativa (1 = maullido normal). */
          length?: number;
          /** true = más suave. */
          soft?: boolean;
      }
    | {
          type: 'bark';
          pitch: number;
          /** Cantidad de ladridos seguidos. */
          count: number;
          /** Segundos entre ladridos. */
          gap?: number;
          /** Duración de cada ladrido en segundos. */
          dur?: number;
          vol?: number;
          /** Termina con un resoplido. */
          snort?: boolean;
          /** Termina con un quejidito. */
          whine?: boolean;
      };

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
    try {
        if (!ctx) {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        }
        if (ctx && ctx.state === 'suspended') void ctx.resume();
        return ctx;
    } catch (_) {
        return null;
    }
}

/** Una nota con barrido de frecuencia (maullido / ladrido / quejido). */
function tone(c: AudioContext, t0: number, dur: number, f0: number, f1: number, type: OscillatorType, vol: number, vibrato = 0) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    if (vibrato > 0) {
        const lfo = c.createOscillator();
        const lg = c.createGain();
        lfo.frequency.value = 18;
        lg.gain.value = vibrato;
        lfo.connect(lg).connect(o.frequency);
        lfo.start(t0);
        lfo.stop(t0 + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.03, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
}

/** Ráfaga de ruido filtrado (la "aspereza" del ladrido o el resoplido). */
function noise(c: AudioContext, t0: number, dur: number, freq: number, vol: number) {
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination);
    s.start(t0);
}

const bark = (c: AudioContext, t: number, f: number, dur: number, vol: number) => {
    tone(c, t, dur, f, f * 0.55, 'sawtooth', vol);
    noise(c, t, dur, f * 3, vol * 0.8);
};

/** Reproduce la voz descrita por la receta. */
export function playAnimalSound(sound: PetSound) {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime + 0.02;
    if (sound.type === 'meow') {
        const len = sound.length ?? 1;
        const vol = sound.soft ? 0.12 : 0.16;
        const p = sound.pitch;
        tone(c, t, 0.55 * len, p, p * 1.7, sound.soft ? 'sine' : 'triangle', vol, 12);
        tone(c, t + 0.5 * len, 0.35 * len, p * 1.7, p * 0.92, sound.soft ? 'sine' : 'triangle', vol * 0.9, 8);
        return;
    }
    const dur = sound.dur ?? 0.12;
    const gap = sound.gap ?? 0.16;
    const vol = sound.vol ?? 0.15;
    for (let i = 0; i < sound.count; i++) bark(c, t + i * gap, sound.pitch * (1 + (i % 2) * 0.04), dur, vol);
    const end = t + (sound.count - 1) * gap + dur;
    if (sound.snort) noise(c, end + 0.08, 0.18, 700, 0.06);
    if (sound.whine) tone(c, end + 0.1, 0.3, 500, 780, 'sine', 0.07, 10);
}
