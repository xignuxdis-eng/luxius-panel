// workshopEvents.ts - Eventos y visitas aleatorias del Print Den (Bloque F5/F10)
// TODOS son decorativos (no representan datos del sistema). Cada tanto ocurre algo: se corta la luz un ratito,
// se derrama un café, empieza la "hora feliz" con música, llega un repartidor o un técnico. De noche hay un guardia.
// Nada pasa si el usuario apagó los eventos, y nunca hay dos eventos a la vez.

import type { WorkshopFx } from './workshopFx';
import type { WorkshopLighting } from './workshopLighting';
import type { GuestManager } from './workshopGuests';
import type { WorkerCrew, Point } from './workshopWorkers';

export type WorkshopEventName = 'blackout' | 'coffee' | 'happyhour' | 'repartidor' | 'tecnico';

export const EVENT_NAMES: WorkshopEventName[] = ['blackout', 'coffee', 'happyhour', 'repartidor', 'tecnico'];

const BLACKOUT_LINES = ['¡Se fue la luz! 🔦', '¿Alguien tocó el térmico?', 'Tranquilos, tranquilos...'];
const BLACKOUT_BACK = ['¡Volvió la luz! 💡', 'Menos mal, no se perdió ningún archivo.'];
const COFFEE_LINES = ['¡Mi café! ☕', 'Cuidado: piso mojado.', 'Alguien traiga el secador...'];
const HAPPY_LINES = ['¡Hora feliz en el Den! 🎶', '¡Música, maestro! 🎵', 'Y encima los impresos salen bárbaros.'];

/** Pausa entre eventos (ms). En modo rápido de pruebas: localStorage 'luxius_print_den_events_fast' = '1'. */
function nextDelayMs(rng: () => number): number {
    let fast = false;
    try {
        fast = localStorage.getItem('luxius_print_den_events_fast') === '1';
    } catch (_) {}
    return fast ? 5000 + rng() * 4000 : 55000 + rng() * 65000;
}

export interface EventDeps {
    crew: () => WorkerCrew | null;
    fx: () => WorkshopFx | null;
    lighting: () => WorkshopLighting | null;
    guests: () => GuestManager | null;
    /** Puntos libres del pasillo donde puede caer algo (coordenadas del mapa). */
    floorSpot: () => Point;
    /** Hora decimal actual del taller (para el guardia nocturno). */
    hour: () => number;
}

interface Running {
    name: WorkshopEventName;
    t: number;
    done: boolean;
    spot?: Point;
    step: number;
}

export class WorkshopEvents {
    private enabled = true;
    private timer: number;
    private running: Running | null = null;
    private guardCheckMs = 0;
    private notesMs = 0;
    private destroyed = false;

    constructor(private deps: EventDeps, private rng: () => number = Math.random) {
        this.timer = nextDelayMs(rng);
    }

    setEnabled(v: boolean) {
        this.enabled = v;
        if (!v) {
            this.stopRunning();
            this.deps.guests()?.dismiss('repartidor');
            this.deps.guests()?.dismiss('tecnico');
            this.deps.guests()?.dismiss('guardia');
        }
    }

    isEnabled() {
        return this.enabled;
    }

    private stopRunning() {
        if (this.running?.name === 'blackout') this.deps.lighting()?.setBlackout(0);
        this.running = null;
    }

    /** Dispara un evento ahora (usado por el temporizador y por las pruebas). */
    trigger(name: WorkshopEventName): boolean {
        if (this.destroyed || this.running) return false;
        const crew = this.deps.crew();
        if (name === 'repartidor' || name === 'tecnico') {
            const ok = this.deps.guests()?.spawn(name) ?? false;
            return ok;
        }
        this.running = { name, t: 0, done: false, step: 0 };
        if (name === 'coffee') {
            const spot = this.deps.floorSpot();
            this.running.spot = spot;
            this.deps.fx()?.spill(spot.x, spot.y);
            crew?.announce(COFFEE_LINES, 1, 'warn');
        } else if (name === 'happyhour') {
            crew?.announce(HAPPY_LINES, 2);
            this.notesMs = 0;
        } else if (name === 'blackout') {
            crew?.announce(BLACKOUT_LINES, 1);
        }
        return true;
    }

    update(dtMs: number) {
        if (this.destroyed) return;

        // Guardia nocturno: patrulla de 22:00 a 06:00
        this.guardCheckMs -= dtMs;
        if (this.guardCheckMs <= 0) {
            this.guardCheckMs = 5000;
            const g = this.deps.guests();
            if (g) {
                const h = this.deps.hour();
                const night = h >= 22 || h < 6;
                if (this.enabled && night && !g.has('guardia')) g.spawn('guardia');
                else if ((!night || !this.enabled) && g.has('guardia')) g.dismiss('guardia');
            }
        }

        // Evento en curso
        const r = this.running;
        if (r) {
            r.t += dtMs;
            const fx = this.deps.fx();
            if (r.name === 'blackout') {
                // 0-0.4 s: parpadea; 0.4-3.6 s: oscuro; 3.6-4.4 s: parpadea al volver
                let level = 0;
                if (r.t < 400) level = Math.floor(r.t / 100) % 2 === 0 ? 0.5 : 0;
                else if (r.t < 3600) level = 1;
                else if (r.t < 4400) level = Math.floor((r.t - 3600) / 100) % 2 === 0 ? 0.6 : 0.1;
                this.deps.lighting()?.setBlackout(level);
                if (r.step === 0 && r.t >= 3600) {
                    r.step = 1;
                    this.deps.crew()?.announce(BLACKOUT_BACK, 1, 'ok');
                }
                if (r.t >= 4400) {
                    this.deps.lighting()?.setBlackout(0);
                    this.running = null;
                    this.timer = nextDelayMs(this.rng);
                }
            } else if (r.name === 'coffee') {
                if (r.t >= 6000) {
                    this.running = null;
                    this.timer = nextDelayMs(this.rng);
                }
            } else if (r.name === 'happyhour') {
                this.notesMs -= dtMs;
                if (this.notesMs <= 0 && fx) {
                    this.notesMs = 450;
                    const crew = this.deps.crew();
                    const p = crew ? crew.getPositionByRole('disenador') : null;
                    const spot = p ?? this.deps.floorSpot();
                    fx.notes(spot.x, spot.y - 22, 1);
                    const spot2 = this.deps.floorSpot();
                    fx.notes(spot2.x, spot2.y - 8, 1);
                }
                if (r.t >= 11000) {
                    this.running = null;
                    this.timer = nextDelayMs(this.rng);
                }
            }
            return;
        }

        if (!this.enabled) return;
        this.timer -= dtMs;
        if (this.timer <= 0) {
            const pick = EVENT_NAMES[Math.floor(this.rng() * EVENT_NAMES.length)];
            if (!this.trigger(pick)) this.timer = 4000;
            else if (!this.running) this.timer = nextDelayMs(this.rng); // visita: sin estado en curso
        }
    }

    destroy() {
        this.destroyed = true;
        try {
            this.deps.lighting()?.setBlackout(0);
        } catch (_) {}
        this.running = null;
    }
}
