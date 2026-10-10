// workshopAnimalSound.ts - Sonidos característicos de las mascotas del Print Den (sintetizados con WebAudio).
// No usa archivos de audio. Solo suena cuando el usuario hace clic (gesto del usuario) y si el botón "Animales" está en ON.

export type AnimalVoice = 'frijol' | 'jaina' | 'muchi' | 'teo' | 'borry';

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

/** Reproduce la voz del animal. */
export function playAnimalSound(voice: AnimalVoice) {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime + 0.02;
    switch (voice) {
        case 'frijol': // maullido tranquilo, medio
            tone(c, t, 0.55, 520, 880, 'triangle', 0.16, 14);
            tone(c, t + 0.5, 0.35, 880, 480, 'triangle', 0.14, 10);
            break;
        case 'jaina': // maullido corto y suave, más agudo
            tone(c, t, 0.3, 700, 1050, 'sine', 0.13, 8);
            tone(c, t + 0.28, 0.25, 1050, 620, 'sine', 0.11, 6);
            break;
        case 'muchi': // ladridos rápidos y agudos (inquieto)
            bark(c, t, 620, 0.09, 0.14);
            bark(c, t + 0.14, 650, 0.09, 0.14);
            bark(c, t + 0.28, 600, 0.1, 0.13);
            break;
        case 'teo': // "guau" grave y resoplido (regordete)
            bark(c, t, 210, 0.26, 0.2);
            noise(c, t + 0.34, 0.18, 700, 0.06);
            break;
        case 'borry': // ladrido medio + quejidito
            bark(c, t, 380, 0.16, 0.16);
            bark(c, t + 0.24, 360, 0.16, 0.14);
            tone(c, t + 0.5, 0.3, 500, 780, 'sine', 0.07, 10);
            break;
    }
}
