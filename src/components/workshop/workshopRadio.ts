// workshopRadio.ts - Radio del taller (Print Den): tres "emisoras" sintetizadas con osciladores (estilo 8 bits).
// Todo es decorativo. No hay archivos de audio: las melodías son datos (listas de notas) editables acá abajo.
// Las notas se escriben en semitonos respecto de la nota base (null = silencio). La radio arranca siempre apagada
// (los navegadores no permiten sonido hasta que el usuario toca algo) y respeta el silencio general del taller.

import { audioEngine } from './AudioEngine';

export interface RadioStation {
    name: string;
    emoji: string;
    /** Milisegundos por paso. */
    stepMs: number;
    /** Nota base (Hz). */
    root: number;
    wave: OscillatorType;
    bassWave: OscillatorType;
    volume: number;
    lead: Array<number | null>;
    bass: Array<number | null>;
}

export const RADIO_STATIONS: RadioStation[] = [
    {
        name: 'Retro',
        emoji: '🕹️',
        stepMs: 150,
        root: 261.63,
        wave: 'square',
        bassWave: 'triangle',
        volume: 0.025,
        lead: [0, 4, 7, 12, 7, 4, 0, null, 2, 5, 9, 14, 9, 5, 2, null, 4, 7, 11, 16, 11, 7, 4, null, 0, 4, 7, 12, 14, 12, 7, 4],
        bass: [-12, null, -12, null, -7, null, -7, null, -10, null, -10, null, -5, null, -5, null]
    },
    {
        name: 'Chill',
        emoji: '🌙',
        stepMs: 340,
        root: 220,
        wave: 'triangle',
        bassWave: 'sine',
        volume: 0.035,
        lead: [0, null, 3, null, 7, null, 10, null, 7, null, 3, null, 5, null, 8, null, 12, null, 8, null, 5, null, 3, null, 0, null, null, null, null, null, null, null],
        bass: [-24, null, null, null, -17, null, null, null, -21, null, null, null, -19, null, null, null]
    },
    {
        name: 'Funk',
        emoji: '🎷',
        stepMs: 125,
        root: 164.81,
        wave: 'sawtooth',
        bassWave: 'square',
        volume: 0.018,
        lead: [0, null, 3, 5, null, 7, null, 3, 0, null, 10, 7, null, 5, 3, null, 0, null, 3, 5, null, 7, 10, null, 12, 10, 7, null, 5, 3, 0, null],
        bass: [-12, -12, null, -12, -9, null, -12, null, -12, -12, null, -7, -9, null, -12, null]
    }
];

const freq = (root: number, semis: number) => root * Math.pow(2, semis / 12);

class WorkshopRadio {
    private ctx: AudioContext | null = null;
    private timer: number | null = null;
    private step = 0;
    private idx = 0; // 0 = apagada; 1..N = emisora

    /** 0 = apagada, 1..N = emisora actual. */
    current(): number {
        return this.idx;
    }

    /** Pasa a la siguiente emisora; después de la última se apaga. Devuelve el nuevo estado. */
    next(): number {
        this.set((this.idx + 1) % (RADIO_STATIONS.length + 1));
        return this.idx;
    }

    set(i: number) {
        this.stop();
        this.idx = Math.max(0, Math.min(RADIO_STATIONS.length, i));
        if (this.idx === 0) return;
        try {
            if (!this.ctx) {
                const Ctx = window.AudioContext || (window as any).webkitAudioContext;
                if (Ctx) this.ctx = new Ctx();
            }
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        } catch (_) {}
        if (!this.ctx) return;
        const st = RADIO_STATIONS[this.idx - 1];
        this.step = 0;
        this.timer = window.setInterval(() => this.tick(), st.stepMs);
    }

    stop() {
        if (this.timer !== null) window.clearInterval(this.timer);
        this.timer = null;
    }

    /** Apaga y deja la radio en "apagada" (al salir del taller). */
    off() {
        this.stop();
        this.idx = 0;
    }

    private tick() {
        const ctx = this.ctx;
        if (!ctx || this.idx === 0 || audioEngine.getMuted()) return;
        const st = RADIO_STATIONS[this.idx - 1];
        const l = st.lead[this.step % st.lead.length];
        const b = st.bass[this.step % st.bass.length];
        if (l !== null) this.tone(freq(st.root, l), st.wave, st.volume, (st.stepMs / 1000) * 0.9);
        if (b !== null) this.tone(freq(st.root, b), st.bassWave, st.volume * 1.3, (st.stepMs / 1000) * 1.6);
        this.step++;
    }

    private tone(f: number, type: OscillatorType, vol: number, dur: number) {
        const ctx = this.ctx;
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(f, now);
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + dur + 0.02);
        } catch (_) {}
    }
}

export const workshopRadio = new WorkshopRadio();
