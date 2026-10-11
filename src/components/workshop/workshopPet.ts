// workshopPet.ts - Las mascotas del Print Den (Bloque F9, ampliado): Frijol, Jaina, Muchi, Teo y Borry.
// TODO es DECORATIVO: no representa ningún dato del sistema (las estadísticas de las fichas son de fantasía).
// Siempre hay una mascota en el taller (la "residente"); cada tanto se turnan. Solo cuando vuelve la luz después de
// un apagón aparecen todas juntas y luego se van yendo de a una hasta quedar una sola, que renueva la rotación.
// Pasean por el taller sin atravesar estaciones, se sientan, duermen (o se rascan las pulgas) y los operarios
// a veces las acarician; algunas se dejan más que otras. Al hacerles clic suena su sonido característico.

import { Container, Graphics, Rectangle } from 'pixi.js';
import type { StationConfig } from './types';
import { MAP_W, computeLanes, isWalkable, type Lanes, type Point, type WorkerCrew } from './workshopWorkers';

import { PET_PROFILES, type PetProfile, type PetStat } from './content/pets';
import { WORKSHOP_CONFIG, randomIn } from './content/config';
export { PET_PROFILES };
export type { PetProfile, PetStat };

type PetState = 'sit' | 'walk' | 'sleep' | 'scratch';

const DARK = 0x1f2937;
const MARGIN = 2;
const MAX_Y = 262;

export interface PetHooks {
    /** Clic sobre una mascota (posición en el mapa). `petted` indica si se dejó acariciar. */
    onTap?: (profile: PetProfile, x: number, y: number, petted: boolean) => void;
    /** Un operario la acarició con éxito. */
    onWorkerPet?: (profile: PetProfile, x: number, y: number) => void;
}

export class WorkshopPet {
    private container = new Container();
    private body = new Graphics();
    private zz = new Graphics();
    private hit: Container | null = null;
    private stations: StationConfig[];
    private lanes: Lanes;
    private gapXs: number[] = [];
    private lowerRowBottom = 240;

    private x = 300;
    private y: number;
    private state: PetState = 'sit';
    private facingLeft = false;
    private path: Point[] = [];
    private timerMs = 3000;
    private animMs = 0;
    private lastPose = '';
    private enabled = true;
    private visible = false;
    private leaving = false;
    private destroyed = false;
    private workerCooldownMs = 0;
    private rng: () => number;

    constructor(
        readonly profile: PetProfile,
        layer: Container,
        hitLayer: Container | undefined,
        stations: StationConfig[],
        private hooks: PetHooks = {},
        rng: () => number = Math.random
    ) {
        this.stations = stations;
        this.rng = rng;
        this.lanes = computeLanes(stations);
        this.y = this.lanes.low + 4;
        const lowerRow = stations.filter((s) => s.y >= 120).sort((a, b) => a.x - b.x);
        for (let i = 0; i + 1 < lowerRow.length; i++) {
            const a = lowerRow[i].x + lowerRow[i].width;
            const b = lowerRow[i + 1].x;
            if (b - a >= 8) this.gapXs.push(Math.round((a + b) / 2));
        }
        if (lowerRow.length) this.lowerRowBottom = Math.max(...lowerRow.map((s) => s.y + s.height));

        this.container.label = `Pet:${profile.name}`;
        this.container.eventMode = 'none';
        this.container.visible = false;
        this.container.addChild(this.body);
        this.container.addChild(this.zz);
        layer.addChild(this.container);

        if (hitLayer) {
            this.hit = new Container();
            this.hit.label = `PetHit:${profile.name}`;
            this.hit.hitArea = new Rectangle(-9, -13, 18, 15);
            this.hit.eventMode = 'none';
            this.hit.cursor = 'pointer';
            this.hit.on('pointertap', () => this.tap());
            hitLayer.addChild(this.hit);
        }
    }

    /* ------------------------------ Estado público ------------------------------ */

    getPosition(): Point {
        return { x: this.x, y: this.y };
    }

    isVisible(): boolean {
        return this.visible;
    }

    isLeaving(): boolean {
        return this.leaving;
    }

    /** Qué está haciendo ahora (para la ficha). */
    getActivity(): string {
        if (!this.visible) return 'Descansando fuera del taller';
        if (this.leaving) return 'Yéndose a dar una vuelta';
        switch (this.state) {
            case 'walk':
                return 'Paseando por el taller';
            case 'sleep':
                return 'Durmiendo la siesta 💤';
            case 'scratch':
                return 'Rascándose las pulgas';
            default:
                return this.profile.species === 'gato' ? 'Sentada, mirando todo' : 'Sentado, atento';
        }
    }

    setEnabled(v: boolean) {
        this.enabled = v;
        this.applyVisibility();
    }

    private applyVisibility() {
        if (this.container.destroyed) return;
        const show = this.enabled && this.visible;
        this.container.visible = show;
        if (this.hit && !this.hit.destroyed) this.hit.eventMode = show ? 'static' : 'none';
    }

    /** Aparece en el taller. `instant`: en un lugar al azar; si no, entra caminando por un costado. */
    enter(instant = false) {
        if (this.destroyed) return;
        if (this.visible && !this.leaving) return;
        if (this.visible && this.leaving) {
            this.leaving = false;
            this.setState('sit', 400);
            return;
        }
        this.visible = true;
        this.leaving = false;
        const laneY = this.lanes.low + 4;
        if (instant) {
            for (let i = 0; i < 20; i++) {
                const p = this.sampleTarget();
                if (isWalkable(p, this.stations, MARGIN) && p.y <= MAX_Y) {
                    this.x = p.x;
                    this.y = p.y;
                    break;
                }
            }
            this.setState('sit', 1000 + this.rng() * 3000);
        } else {
            const fromLeft = this.rng() < 0.5;
            this.x = fromLeft ? 1 : MAP_W - 1;
            this.y = laneY;
            this.facingLeft = !fromLeft;
            this.path = [{ x: fromLeft ? 40 + this.rng() * 80 : MAP_W - 40 - this.rng() * 80, y: laneY }];
            this.setState('walk', 0);
        }
        this.sync();
        this.applyVisibility();
    }

    /** Se va caminando hacia un costado del mapa y desaparece. */
    leave() {
        if (this.destroyed || !this.visible || this.leaving) return;
        const laneY = this.lanes.low + 4;
        const toLeft = this.x < MAP_W / 2;
        const edge = toLeft ? -6 : MAP_W + 6;
        const near: Point = { x: toLeft ? 14 : MAP_W - 14, y: laneY };
        const from: Point = { x: this.x, y: this.y };
        const cands: Point[][] = [[{ x: from.x, y: laneY }, near], [{ x: from.x, y: laneY }]];
        for (const gx of this.gapXs) cands.push([{ x: gx, y: from.y }, { x: gx, y: laneY }, near]);
        for (const cand of cands) {
            const clean = cand.filter((p, i) => Math.hypot(p.x - (i === 0 ? from.x : cand[i - 1].x), p.y - (i === 0 ? from.y : cand[i - 1].y)) > 0.01);
            if (clean.length && !this.pathClear(from, clean)) continue;
            const last = clean.length ? clean[clean.length - 1] : from;
            this.path = [...clean, ...(Math.abs(last.y - laneY) < 0.5 ? [{ x: edge, y: laneY }] : [{ x: last.x, y: laneY }, { x: edge, y: laneY }])];
            this.leaving = true;
            this.setState('walk', 0);
            return;
        }
        // No hay camino despejado: simplemente se escabulle
        this.visible = false;
        this.applyVisibility();
    }

    /** Un operario intenta acariciarla. Devuelve true si se dejó. */
    tryPetByWorker(): boolean {
        if (!this.visible || this.leaving || this.workerCooldownMs > 0) return false;
        this.workerCooldownMs = randomIn(WORKSHOP_CONFIG.pets.careCooldownMs, this.rng);
        if (this.rng() < this.profile.petChance) {
            this.path = [];
            this.setState('sit', 3500);
            this.hooks.onWorkerPet?.(this.profile, this.x, this.y - 10);
            return true;
        }
        this.evade();
        return false;
    }

    private tap() {
        if (!this.enabled || !this.visible || this.destroyed) return;
        const petted = this.rng() < this.profile.petChance;
        if (petted) {
            this.path = [];
            this.leaving = false;
            this.setState('sit', 4500);
        } else if (!this.leaving) {
            this.evade();
        }
        this.hooks.onTap?.(this.profile, this.x, this.y - 10, petted);
    }

    /** Se aparta (no quiso caricias). */
    private evade() {
        if (this.leaving) return;
        if (!this.planLeg()) this.setState('sit', 1500);
    }

    private setState(s: PetState, timerMs: number) {
        this.state = s;
        this.timerMs = timerMs;
        this.lastPose = '';
    }

    /* ------------------------------ Planificación ------------------------------ */

    private pathClear(from: Point, path: Point[]): boolean {
        let prev = from;
        for (const p of path) {
            const len = Math.hypot(p.x - prev.x, p.y - prev.y);
            const n = Math.max(1, Math.ceil(len / 2));
            for (let i = 0; i <= n; i++) {
                const t = i / n;
                const pt = { x: prev.x + (p.x - prev.x) * t, y: prev.y + (p.y - prev.y) * t };
                if (pt.y > MAX_Y || !isWalkable(pt, this.stations, MARGIN)) return false;
            }
            prev = p;
        }
        return true;
    }

    private sampleOne(): Point {
        const rand = (a: number, b: number) => Math.round(a + this.rng() * (b - a));
        const L = this.lanes;
        const r = this.rng();
        if (r < 0.55) return { x: rand(14, MAP_W - 14), y: rand(L.topEdge + 6, L.bottomEdge - 4) };
        if (r < 0.8 && this.gapXs.length) {
            const gx = this.gapXs[Math.floor(this.rng() * this.gapXs.length)];
            return { x: gx, y: rand(L.bottomEdge + 10, Math.min(MAX_Y, this.lowerRowBottom + 12)) };
        }
        return { x: rand(14, MAP_W - 14), y: rand(this.lowerRowBottom + 6, MAX_Y) };
    }

    private sampleTarget(): Point {
        if (!this.profile.farWalker) return this.sampleOne();
        // Los caminadores prefieren destinos lejanos: de 3 candidatos, el más lejano
        let best = this.sampleOne();
        for (let i = 0; i < 2; i++) {
            const c = this.sampleOne();
            if (Math.hypot(c.x - this.x, c.y - this.y) > Math.hypot(best.x - this.x, best.y - this.y)) best = c;
        }
        return best;
    }

    private planLeg(): boolean {
        const from: Point = { x: this.x, y: this.y };
        for (let tries = 0; tries < 25; tries++) {
            const to = this.sampleTarget();
            if (Math.hypot(to.x - from.x, to.y - from.y) < 20) continue;
            const cands: Point[][] = [
                [{ x: from.x, y: to.y }, to],
                [{ x: to.x, y: from.y }, to]
            ];
            for (const gx of this.gapXs) cands.push([{ x: gx, y: from.y }, { x: gx, y: to.y }, to]);
            for (const cand of cands) {
                const clean = cand.filter((p, i) => Math.hypot(p.x - (i === 0 ? from.x : cand[i - 1].x), p.y - (i === 0 ? from.y : cand[i - 1].y)) > 0.01);
                if (clean.length === 0 || !this.pathClear(from, clean)) continue;
                this.path = clean;
                this.setState('walk', 0);
                return true;
            }
        }
        return false;
    }

    /* ------------------------------ Dibujo ------------------------------ */

    private drawCat(pose: string) {
        const g = this.body;
        const p = this.profile;
        const BODY = p.body;
        const SHADE = p.shade;
        const BELLY = p.belly;
        const ears = (hx: number, hy: number) => {
            g.rect(hx, hy - 2, 1, 2).rect(hx + 3, hy - 2, 1, 2).fill({ color: SHADE });
        };
        if (pose === 'sit') {
            g.rect(-4, -5, 5, 5).fill({ color: BODY });
            g.rect(-4, -2, 5, 2).fill({ color: BELLY });
            g.rect(-3, -4, 1, 2).rect(-1, -5, 1, 2).fill({ color: SHADE });
            g.rect(0, -8, 5, 4).fill({ color: BODY });
            ears(0, -8);
            g.rect(3, -7, 1, 1).fill({ color: p.eye });
            g.rect(5, -6, 1, 1).fill({ color: p.nose });
            g.rect(-7, -1, 3, 1).rect(-7, -4, 1, 3).fill({ color: SHADE });
        } else if (pose === 'walk0' || pose === 'walk1') {
            const step = pose === 'walk0' ? 0 : 1;
            g.rect(-5, -5, 8, 3).fill({ color: BODY });
            g.rect(-5, -3, 8, 1).fill({ color: BELLY });
            g.rect(-3, -5, 1, 2).rect(0, -5, 1, 2).fill({ color: SHADE });
            g.rect(3, -8, 4, 4).fill({ color: BODY });
            ears(3, -8);
            g.rect(6, -7, 1, 1).fill({ color: p.eye });
            g.rect(7, -6, 1, 1).fill({ color: p.nose });
            g.rect(-5 + step, -2, 1, 2).rect(-2 - step, -2, 1, 2).rect(0 + step, -2, 1, 2).rect(2 - step, -2, 1, 2).fill({ color: SHADE });
            g.rect(-7, -6, 2, 1).rect(-7, -9, 1, 3).fill({ color: SHADE });
        } else {
            // dormida (hecha un ovillo)
            g.rect(-5, -3, 10, 3).fill({ color: BODY });
            g.rect(-4, -4, 8, 1).fill({ color: BODY });
            g.rect(-3, -3, 1, 2).rect(0, -3, 1, 2).fill({ color: SHADE });
            g.rect(2, -4, 4, 3).fill({ color: BODY });
            g.rect(2, -5, 1, 1).rect(5, -5, 1, 1).fill({ color: SHADE });
            g.rect(4, -3, 1, 1).fill({ color: p.eye === 0xfacc15 ? 0x6b7280 : DARK });
            g.rect(-6, -2, 2, 1).fill({ color: SHADE });
        }
    }

    private drawDog(pose: string) {
        const g = this.body;
        const p = this.profile;
        const B = p.body;
        const S = p.shade;
        const L = p.belly;
        const w = p.chubby ? 2 : 0; // los regordetes son más anchos
        const eyes = (ex: number, ey: number) => {
            if (p.bulgyEyes) {
                g.rect(ex - 1, ey - 1, 3, 3).fill({ color: 0xffffff });
                g.rect(ex, ey, 1, 1).fill({ color: 0x111111 });
            } else {
                g.rect(ex, ey, 1, 1).fill({ color: p.eye === 0xf8fafc ? 0xf8fafc : p.eye });
            }
        };
        const wag = Math.floor(this.animMs / 140) % 2;
        if (pose === 'sit' || pose === 'scratch0' || pose === 'scratch1') {
            g.rect(-5 - w, -7, 7 + w, 7).fill({ color: B });
            g.rect(-4 - w, -3, 5 + w, 3).fill({ color: L });
            // cola que se mueve
            g.rect(-7 - w, wag ? -6 : -4, 2, 1).fill({ color: S });
            g.rect(1, -11, 6, 5).fill({ color: B });
            g.rect(1, -11, 2, 3).fill({ color: S }); // oreja caída
            g.rect(6, -9, 3, 3).fill({ color: L });
            g.rect(8, -9, 1, 1).fill({ color: p.nose });
            eyes(4, -10);
            g.rect(0, -4, 1, 4).fill({ color: S });
            if (pose === 'scratch0') g.rect(-2 - w, -2, 4, 1).fill({ color: S });
            if (pose === 'scratch1') g.rect(-1 - w, -6, 3, 1).rect(1, -7, 1, 1).fill({ color: S });
        } else if (pose === 'walk0' || pose === 'walk1') {
            const step = pose === 'walk0' ? 0 : 1;
            g.rect(-7 - w, -8, 11 + w, 5 + (w ? 1 : 0)).fill({ color: B });
            g.rect(-6 - w, -4, 9 + w, 1).fill({ color: L });
            g.rect(4, -11, 5, 5).fill({ color: B });
            g.rect(4, -11, 2, 3).fill({ color: S });
            g.rect(8, -9, 3, 3).fill({ color: L });
            g.rect(10, -9, 1, 1).fill({ color: p.nose });
            eyes(7, -10);
            g.rect(-7 + step - w, -3, 1, 3).rect(-4 - step - w, -3, 1, 3).rect(0 + step, -3, 1, 3).rect(3 - step, -3, 1, 3).fill({ color: S });
            g.rect(-9 - w, -9 + (wag ? 0 : 1), 2, 1).fill({ color: S });
        } else {
            // durmiendo
            g.rect(-6 - w, -4, 11 + w, 4).fill({ color: B });
            g.rect(-5 - w, -1, 9 + w, 1).fill({ color: L });
            g.rect(4, -5, 5, 4).fill({ color: B });
            g.rect(4, -5, 2, 2).fill({ color: S });
            g.rect(8, -3, 2, 2).fill({ color: L });
            g.rect(9, -3, 1, 1).fill({ color: p.nose });
            g.rect(6, -4, 1, 1).fill({ color: DARK });
            g.rect(-8 - w, -2, 2, 1).fill({ color: S });
        }
    }

    private drawPose(pose: string) {
        const g = this.body;
        g.clear();
        const w = this.profile.chubby ? 8 : 6;
        g.ellipse(0, 0, w, 1.6).fill({ color: 0x000000, alpha: 0.28 });
        if (this.profile.species === 'gato') this.drawCat(pose);
        else this.drawDog(pose);
    }

    private drawZz(t: number) {
        const g = this.zz;
        g.clear();
        if (this.state === 'sleep') {
            const a = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t / 420));
            const dy = -((t / 90) % 6);
            g.rect(4, -9 + dy, 3, 1).rect(5, -8 + dy, 1, 1).rect(4, -7 + dy, 3, 1).fill({ color: 0xe0f2fe, alpha: a });
        } else if (this.state === 'scratch') {
            // pulguitas saltando
            for (let i = 0; i < 3; i++) {
                const ph = (t / 160 + i * 1.7) % 4;
                g.rect(-4 + i * 3, -8 - Math.abs(Math.sin(ph)) * 5, 1, 1).fill({ color: 0x1f2937, alpha: 0.9 });
            }
        }
    }

    private sync() {
        if (this.container.destroyed) return;
        this.container.x = Math.round(this.x);
        this.container.y = Math.round(this.y);
        this.container.zIndex = Math.round(this.y);
        this.container.scale.x = this.facingLeft ? -1 : 1;
        if (this.hit && !this.hit.destroyed) {
            this.hit.x = this.container.x;
            this.hit.y = this.container.y;
        }
        let pose: string = this.state;
        if (this.state === 'walk') pose = Math.floor(this.animMs / 200) % 2 === 0 ? 'walk0' : 'walk1';
        else if (this.state === 'scratch') pose = Math.floor(this.animMs / 110) % 2 === 0 ? 'scratch0' : 'scratch1';
        if (pose !== this.lastPose) {
            this.lastPose = pose;
            this.drawPose(pose);
        }
        this.drawZz(this.animMs);
        this.zz.scale.x = this.facingLeft ? -1 : 1;
    }

    update(dtMs: number) {
        if (this.destroyed || !this.enabled || !this.visible) return;
        const dt = Math.max(0, Math.min(dtMs, 100));
        this.animMs += dt;
        if (this.workerCooldownMs > 0) this.workerCooldownMs -= dt;

        if (this.state === 'walk') {
            let budget = (this.profile.speed * (this.leaving ? 1.25 : 1) * dt) / 1000;
            while (budget > 0 && this.path.length > 0) {
                const t = this.path[0];
                const dx = t.x - this.x;
                const dy = t.y - this.y;
                const dist = Math.hypot(dx, dy);
                if (Math.abs(dx) > 0.01) this.facingLeft = dx < 0;
                if (dist <= budget) {
                    this.x = t.x;
                    this.y = t.y;
                    budget -= dist;
                    this.path.shift();
                } else {
                    this.x += (dx / dist) * budget;
                    this.y += (dy / dist) * budget;
                    budget = 0;
                }
            }
            if (this.path.length === 0) {
                if (this.leaving) {
                    this.leaving = false;
                    this.visible = false;
                    this.applyVisibility();
                    return;
                }
                const pr = this.profile;
                const roll = this.rng();
                const restMs = pr.rest[0] + this.rng() * (pr.rest[1] - pr.rest[0]);
                if (roll < pr.sleepChance) this.setState('sleep', 15000 + this.rng() * 20000);
                else if (roll < pr.sleepChance + pr.scratchChance) this.setState('scratch', 2500 + this.rng() * 3000);
                else this.setState('sit', restMs);
            }
        } else {
            this.timerMs -= dt;
            if (this.timerMs <= 0) {
                if (!this.planLeg()) this.setState('sit', 2000 + this.rng() * 3000);
            }
        }
        this.sync();
    }

    destroy() {
        this.destroyed = true;
        try {
            if (!this.container.destroyed) this.container.destroy({ children: true });
        } catch (_) {}
        try {
            if (this.hit && !this.hit.destroyed) this.hit.destroy({ children: true });
        } catch (_) {}
    }
}

/** Pausa entre cambios de residente (ms). En modo rápido de pruebas: localStorage 'luxius_print_den_events_fast' = '1'. */
function rotationDelayMs(rng: () => number): number {
    let fast = false;
    try {
        fast = localStorage.getItem('luxius_print_den_events_fast') === '1';
    } catch (_) {}
    return randomIn(fast ? WORKSHOP_CONFIG.pets.rotationFastMs : WORKSHOP_CONFIG.pets.rotationMs, rng);
}

/**
 * Coordina a las cinco mascotas: siempre hay una "residente" en el taller y se turnan.
 * Después de un apagón se juntan todas y luego se van yendo de a una hasta quedar una sola.
 */
export class PetManager {
    readonly pets: WorkshopPet[];
    private resident: WorkshopPet;
    private rotateMs: number;
    private phase: 'normal' | 'gather' | 'disperse' = 'normal';
    private phaseMs = 0;
    private pendingEnters: { pet: WorkshopPet; delayMs: number }[] = [];
    private nextLeaveMs = 0;
    private careMs: number = WORKSHOP_CONFIG.pets.careCheckMs;
    private enabled = true;

    constructor(
        layer: Container,
        hitLayer: Container | undefined,
        stations: StationConfig[],
        hooks: PetHooks = {},
        private rng: () => number = Math.random
    ) {
        this.pets = PET_PROFILES.map((p) => new WorkshopPet(p, layer, hitLayer, stations, hooks, rng));
        this.resident = this.pets[Math.floor(rng() * this.pets.length)];
        this.resident.enter(true);
        this.rotateMs = rotationDelayMs(rng);
    }

    setEnabled(v: boolean) {
        this.enabled = v;
        this.pets.forEach((p) => p.setEnabled(v));
    }

    getPet(id: string): WorkshopPet | undefined {
        return this.pets.find((p) => p.profile.id === id);
    }

    visiblePets(): WorkshopPet[] {
        return this.pets.filter((p) => p.isVisible());
    }

    /** Apagón superado: aparecen todas juntas y luego se van de a una. */
    reunion() {
        if (!this.enabled || this.phase !== 'normal') return;
        this.phase = 'gather';
        this.phaseMs = 0;
        this.pendingEnters = this.pets.filter((p) => !p.isVisible() || p.isLeaving()).map((pet, i) => ({ pet, delayMs: 400 + i * 1400 }));
    }

    private rotate() {
        const others = this.pets.filter((p) => p !== this.resident && !p.isVisible());
        if (others.length === 0) return;
        const next = others[Math.floor(this.rng() * others.length)];
        this.resident.leave();
        next.enter(false);
        this.resident = next;
    }

    update(dtMs: number, crew: WorkerCrew | null) {
        if (!this.enabled) return;
        const dt = Math.max(0, Math.min(dtMs, 100));
        this.pets.forEach((p) => p.update(dt));

        if (this.phase === 'normal') {
            this.rotateMs -= dt;
            if (this.rotateMs <= 0) {
                this.rotateMs = rotationDelayMs(this.rng);
                this.rotate();
            }
        } else if (this.phase === 'gather') {
            this.phaseMs += dt;
            this.pendingEnters.forEach((e) => (e.delayMs -= dt));
            this.pendingEnters.filter((e) => e.delayMs <= 0).forEach((e) => e.pet.enter(false));
            this.pendingEnters = this.pendingEnters.filter((e) => e.delayMs > 0);
            if (this.pendingEnters.length === 0 && this.phaseMs > WORKSHOP_CONFIG.pets.gatherHoldMs) {
                this.phase = 'disperse';
                this.nextLeaveMs = 2000;
            }
        } else {
            this.nextLeaveMs -= dt;
            if (this.nextLeaveMs <= 0) {
                const staying = this.pets.filter((p) => p.isVisible() && !p.isLeaving());
                if (staying.length <= 1) {
                    if (staying[0]) this.resident = staying[0];
                    this.phase = 'normal';
                    this.rotateMs = rotationDelayMs(this.rng);
                } else {
                    const goer = staying[Math.floor(this.rng() * staying.length)];
                    goer.leave();
                    this.nextLeaveMs = randomIn(WORKSHOP_CONFIG.pets.leaveIntervalMs, this.rng);
                }
            }
        }

        // Los operarios pasan cerca y a veces las acarician
        this.careMs -= dt;
        if (this.careMs <= 0 && crew) {
            this.careMs = WORKSHOP_CONFIG.pets.careCheckMs;
            const roles = ['disenador', 'impresor', 'cortador', 'empaquetador'] as const;
            const spots = roles.map((r) => crew.getPositionByRole(r)).filter((p): p is Point => !!p);
            for (const pet of this.pets) {
                if (!pet.isVisible() || pet.isLeaving()) continue;
                const pp = pet.getPosition();
                if (spots.some((s) => Math.hypot(s.x - pp.x, s.y - pp.y) < WORKSHOP_CONFIG.pets.careRadius)) pet.tryPetByWorker();
            }
        }
    }

    destroy() {
        this.pets.forEach((p) => p.destroy());
    }
}
