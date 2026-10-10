// workshopPet.ts - Tóner, la mascota (gata) del Print Den (Bloque F9)
// DECORATIVA: no representa ningún dato del sistema. Pasea por el taller sin atravesar estaciones, se sienta,
// se echa a dormir y, si le hacés clic, se despierta y suelta corazoncitos.

import { Container, Graphics, Rectangle } from 'pixi.js';
import type { StationConfig } from './types';
import { MAP_W, computeLanes, isWalkable, type Lanes, type Point } from './workshopWorkers';

export const PET_NAME = 'Tóner';

type PetState = 'sit' | 'walk' | 'sleep';

const BODY = 0xf59e0b;
const SHADE = 0xb45309;
const BELLY = 0xfde68a;
const DARK = 0x1f2937;
const NOSE = 0xfda4af;

const SPEED_PX_S = 16;
const MARGIN = 2;
const MAX_Y = 262;

export interface PetHooks {
    /** Clic sobre la mascota (posición en el mapa). */
    onTap?: (x: number, y: number) => void;
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
    private destroyed = false;
    private rng: () => number;

    constructor(layer: Container, hitLayer: Container | undefined, stations: StationConfig[], private hooks: PetHooks = {}, rng: () => number = Math.random) {
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

        this.container.label = 'Pet:Toner';
        this.container.eventMode = 'none';
        this.container.addChild(this.body);
        this.container.addChild(this.zz);
        layer.addChild(this.container);

        if (hitLayer) {
            this.hit = new Container();
            this.hit.label = 'PetHit';
            this.hit.hitArea = new Rectangle(-9, -12, 18, 14);
            this.hit.eventMode = 'static';
            this.hit.cursor = 'pointer';
            this.hit.on('pointertap', () => this.tap());
            hitLayer.addChild(this.hit);
        }
        this.setState('sit', 3000 + this.rng() * 4000);
        this.sync();
    }

    getPosition(): Point {
        return { x: this.x, y: this.y };
    }

    setEnabled(v: boolean) {
        this.enabled = v;
        if (this.container.destroyed) return;
        this.container.visible = v;
        if (this.hit && !this.hit.destroyed) this.hit.eventMode = v ? 'static' : 'none';
    }

    private tap() {
        if (!this.enabled || this.destroyed) return;
        this.path = [];
        this.setState('sit', 4500);
        this.hooks.onTap?.(this.x, this.y - 10);
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

    private sampleTarget(): Point {
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

    private drawPose(pose: string) {
        const g = this.body;
        g.clear();
        // sombra
        g.ellipse(0, 0, 6, 1.6).fill({ color: 0x000000, alpha: 0.28 });
        const ears = (hx: number, hy: number) => {
            g.rect(hx, hy - 2, 1, 2).rect(hx + 3, hy - 2, 1, 2).fill({ color: SHADE });
        };
        if (pose === 'sit') {
            g.rect(-4, -5, 5, 5).fill({ color: BODY });
            g.rect(-4, -2, 5, 2).fill({ color: BELLY });
            g.rect(-3, -4, 1, 2).rect(-1, -5, 1, 2).fill({ color: SHADE });
            g.rect(0, -8, 5, 4).fill({ color: BODY });
            ears(0, -8);
            g.rect(3, -7, 1, 1).fill({ color: DARK });
            g.rect(5, -6, 1, 1).fill({ color: NOSE });
            g.rect(-7, -1, 3, 1).rect(-7, -4, 1, 3).fill({ color: SHADE });
        } else if (pose === 'walk0' || pose === 'walk1') {
            const step = pose === 'walk0' ? 0 : 1;
            g.rect(-5, -5, 8, 3).fill({ color: BODY });
            g.rect(-5, -3, 8, 1).fill({ color: BELLY });
            g.rect(-3, -5, 1, 2).rect(0, -5, 1, 2).fill({ color: SHADE });
            g.rect(3, -8, 4, 4).fill({ color: BODY });
            ears(3, -8);
            g.rect(6, -7, 1, 1).fill({ color: DARK });
            g.rect(7, -6, 1, 1).fill({ color: NOSE });
            // patas
            g.rect(-5 + step, -2, 1, 2).rect(-2 - step, -2, 1, 2).rect(0 + step, -2, 1, 2).rect(2 - step, -2, 1, 2).fill({ color: SHADE });
            // cola en alto
            g.rect(-7, -6, 2, 1).rect(-7, -9, 1, 3).fill({ color: SHADE });
        } else {
            // dormida (hecha un ovillo)
            g.rect(-5, -3, 10, 3).fill({ color: BODY });
            g.rect(-4, -4, 8, 1).fill({ color: BODY });
            g.rect(-3, -3, 1, 2).rect(0, -3, 1, 2).fill({ color: SHADE });
            g.rect(2, -4, 4, 3).fill({ color: BODY });
            g.rect(2, -5, 1, 1).rect(5, -5, 1, 1).fill({ color: SHADE });
            g.rect(4, -3, 1, 1).fill({ color: DARK });
            g.rect(-6, -2, 2, 1).fill({ color: SHADE });
        }
    }

    private drawZz(t: number) {
        const g = this.zz;
        g.clear();
        if (this.state !== 'sleep') return;
        const a = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t / 420));
        const dy = -((t / 90) % 6);
        g.rect(4, -9 + dy, 3, 1).rect(5, -8 + dy, 1, 1).rect(4, -7 + dy, 3, 1).fill({ color: 0xe0f2fe, alpha: a });
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
        let pose = this.state === 'walk' ? (Math.floor(this.animMs / 200) % 2 === 0 ? 'walk0' : 'walk1') : this.state;
        if (pose !== this.lastPose) {
            this.lastPose = pose;
            this.drawPose(pose);
        }
        this.drawZz(this.animMs);
        // El zz no debe voltearse con la gata
        this.zz.scale.x = this.facingLeft ? -1 : 1;
    }

    update(dtMs: number) {
        if (this.destroyed || !this.enabled) return;
        const dt = Math.max(0, Math.min(dtMs, 100));
        this.animMs += dt;

        if (this.state === 'walk') {
            let budget = (SPEED_PX_S * dt) / 1000;
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
                // al llegar: a veces se echa a dormir, a veces se sienta
                this.setState(this.rng() < 0.35 ? 'sleep' : 'sit', this.rng() < 0.35 ? 15000 + this.rng() * 20000 : 3000 + this.rng() * 5000);
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
