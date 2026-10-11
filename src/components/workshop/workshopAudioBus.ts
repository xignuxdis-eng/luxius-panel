// workshopAudioBus.ts - Salida de audio ÚNICA del sistema: todos los sonidos sintetizados (efectos, voces, mascotas, radio,
// alarma) pasan por acá. Un solo AudioContext, un volumen general y un compresor/limitador que frena cualquier pico,
// así un pitido nunca puede sonar mucho más fuerte que el resto. Los niveles de cada sonido están en content/audio.ts.

import { AUDIO_BUS } from './content/audio';

let ctx: AudioContext | null = null;
let out: AudioNode | null = null;

/** Contexto de audio compartido (se crea la primera vez y se reanuda si el navegador lo suspendió). */
export function getAudioContext(): AudioContext | null {
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

/** Nodo al que hay que conectar TODO sonido (en lugar de `ctx.destination`): volumen general + limitador. */
export function audioOut(c: AudioContext): AudioNode {
    if (out && c === ctx) return out;
    try {
        const master = c.createGain();
        master.gain.value = AUDIO_BUS.master;
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = AUDIO_BUS.threshold;
        comp.knee.value = AUDIO_BUS.knee;
        comp.ratio.value = AUDIO_BUS.ratio;
        comp.attack.value = AUDIO_BUS.attack;
        comp.release.value = AUDIO_BUS.release;
        master.connect(comp).connect(c.destination);
        if (c === ctx) out = master;
        return master;
    } catch (_) {
        return c.destination;
    }
}
