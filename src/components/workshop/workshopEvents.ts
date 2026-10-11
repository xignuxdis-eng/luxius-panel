// workshopEvents.ts - Eventos y visitas aleatorias del Print Den (Bloque F5/F10)
// TODOS son decorativos (no representan datos del sistema). Cada tanto ocurre algo: se corta la luz un ratito,
// se derrama un café, empieza la "hora feliz" con música, llega un repartidor o un técnico.
// Nada pasa si el usuario apagó los eventos, y nunca hay dos eventos a la vez.

import type { WorkshopFx } from './workshopFx';
import type { WorkshopLighting } from './workshopLighting';
import type { GuestManager } from './workshopGuests';
import type { WorkerCrew, Point } from './workshopWorkers';

export type WorkshopEventName = 'blackout' | 'coffee' | 'happyhour' | 'birthday' | 'repartidor' | 'tecnico' | 'cliente' | 'pizzero' | 'yawn' | 'ordertalk';

export const EVENT_NAMES: WorkshopEventName[] = ['blackout', 'coffee', 'happyhour', 'birthday', 'repartidor', 'tecnico', 'cliente', 'pizzero', 'yawn', 'ordertalk'];

import { EVENT_TEXTS } from './content/texts';
import { WORKSHOP_CONFIG, randomIn } from './content/config';
import { workshopNow, hourOf } from './workshopLighting';

// Se leen de EVENT_TEXTS / WORKSHOP_CONFIG en el momento de usarlos, así los cambios remotos (content/remote.ts) se notan sin recargar.
const BLACKOUT_LINES = EVENT_TEXTS.blackout;
const BLACKOUT_BACK = EVENT_TEXTS.blackoutBack;
const COFFEE_LINES = EVENT_TEXTS.coffee;
const HAPPY_LINES = EVENT_TEXTS.happyHour;
const BIRTHDAY_LINES = EVENT_TEXTS.birthday;
const YAWN_LINES = EVENT_TEXTS.yawn;
const blackoutDarkMs = () => WORKSHOP_CONFIG.events.blackout.darkUntilMs;
const blackoutEndMs = () => WORKSHOP_CONFIG.events.blackout.endMs;

/** Final del día: de 19 a 6 hs (hora del taller). */
const isLateHour = () => {
    const h = hourOf(workshopNow());
    return h >= 19 || h < 6;
};

/** Pausa entre eventos (ms). En modo rápido de pruebas: localStorage 'luxius_print_den_events_fast' = '1'. */
function nextDelayMs(rng: () => number): number {
    let fast = false;
    try {
        fast = localStorage.getItem('luxius_print_den_events_fast') === '1';
    } catch (_) {}
    return randomIn(fast ? WORKSHOP_CONFIG.events.intervalFastMs : WORKSHOP_CONFIG.events.intervalMs, rng);
}

export interface EventDeps {
    crew: () => WorkerCrew | null;
    fx: () => WorkshopFx | null;
    lighting: () => WorkshopLighting | null;
    guests: () => GuestManager | null;
    /** Puntos libres del pasillo donde puede caer algo (coordenadas del mapa). */
    floorSpot: () => Point;
    /** Se llama cuando vuelve la luz después de un apagón (las mascotas se juntan). */
    onPowerBack?: () => void;
    /** Lugar frente a la zona de Refrigerios (para la torta de cumpleaños). */
    breakSpot?: () => Point | null;
    /** Una frase con datos reales del día (sin nombres de clientes), o null si no hay datos. */
    orderLine?: () => string | null;
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
            this.deps.guests()?.dismiss('cliente');
            this.deps.guests()?.dismiss('pizzero');
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
        if (name === 'repartidor' || name === 'tecnico' || name === 'cliente' || name === 'pizzero') {
            const ok = this.deps.guests()?.spawn(name) ?? false;
            if (ok && name === 'pizzero') crew?.announce(['¡Llegó la pizza! 🍕'], 1, 'ok');
            return ok;
        }
        if (name === 'yawn') {
            if (!isLateHour() || !crew) return false;
            return crew.announce(YAWN_LINES, 1, 'chat') > 0;
        }
        if (name === 'ordertalk') {
            const line = this.deps.orderLine?.() ?? null;
            if (!line || !crew) return false;
            return crew.announce([line], 1, 'info') > 0;
        }
        this.running = { name, t: 0, done: false, step: 0 };
        if (name === 'coffee') {
            const spot = this.deps.floorSpot();
            this.running.spot = spot;
            this.deps.fx()?.spill(spot.x, spot.y);
            crew?.announce(COFFEE_LINES, 1, 'warn');
        } else if (name === 'birthday') {
            const spot = this.deps.breakSpot?.() ?? this.deps.floorSpot();
            this.running.spot = spot;
            const names = crew ? crew.getWorkers().map((w) => w.name) : [];
            const who = names.length ? names[Math.floor(this.rng() * names.length)] : 'el equipo';
            this.deps.fx()?.cake(spot.x, spot.y, WORKSHOP_CONFIG.events.birthdayMs);
            this.deps.fx()?.confetti(spot.x, spot.y - 6, 40, 30);
            crew?.announce([`¡Feliz cumple, ${who}! 🎂`, ...BIRTHDAY_LINES], 2, 'ok');
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

        // Evento en curso
        const r = this.running;
        if (r) {
            r.t += dtMs;
            const fx = this.deps.fx();
            if (r.name === 'blackout') {
                // 0-0.4 s: parpadea; 0.4-3.6 s: oscuro; 3.6-4.4 s: parpadea al volver
                let level = 0;
                if (r.t < 400) level = Math.floor(r.t / 100) % 2 === 0 ? 0.5 : 0;
                else if (r.t < blackoutDarkMs()) level = 1;
                else if (r.t < blackoutEndMs()) level = Math.floor((r.t - blackoutDarkMs()) / 100) % 2 === 0 ? 0.6 : 0.1;
                this.deps.lighting()?.setBlackout(level);
                if (r.step === 0 && r.t >= blackoutDarkMs()) {
                    r.step = 1;
                    this.deps.crew()?.announce(BLACKOUT_BACK, 1, 'ok');
                }
                if (r.t >= blackoutEndMs()) {
                    this.deps.lighting()?.setBlackout(0);
                    this.deps.onPowerBack?.();
                    this.running = null;
                    this.timer = nextDelayMs(this.rng);
                }
            } else if (r.name === 'coffee') {
                if (r.t >= WORKSHOP_CONFIG.events.coffeeMs) {
                    this.running = null;
                    this.timer = nextDelayMs(this.rng);
                }
            } else if (r.name === 'birthday') {
                this.notesMs -= dtMs;
                if (this.notesMs <= 0 && fx && r.spot) {
                    this.notesMs = 700;
                    fx.notes(r.spot.x, r.spot.y - 12, 1);
                    fx.confetti(r.spot.x, r.spot.y - 8, 6, 24);
                }
                if (r.t >= WORKSHOP_CONFIG.events.birthdayMs) {
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
                if (r.t >= WORKSHOP_CONFIG.events.happyHourMs) {
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
