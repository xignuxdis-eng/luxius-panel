// workshopFx.ts - Efectos decorativos del Print Den: confeti, corazones, notas musicales y manchas en el piso.
// Todo es decorativo (no representa datos). Cada partícula es un Graphics pequeño que se elimina al terminar;
// hay un tope total para no cargar el equipo.

import { Container, Graphics } from 'pixi.js';

const MAX_PARTICLES = 160;
const CONFETTI_COLORS = [0xef4444, 0xf59e0b, 0xfacc15, 0x22c55e, 0x38bdf8, 0xa855f7, 0xec4899, 0xffffff];

type Kind = 'confetti' | 'heart' | 'note' | 'spark';

interface Particle {
    g: Graphics;
    kind: Kind;
    vx: number;
    vy: number;
    gravity: number;
    life: number;
    max: number;
    x: number;
    y: number;
    sway: number;
    phase: number;
}

interface Puddle {
    g: Graphics;
    life: number;
    max: number;
}

export class WorkshopFx {
    private particles: Particle[] = [];
    private puddles: Puddle[] = [];
    private destroyed = false;
    private rng: () => number = Math.random;
    /** Gotera de lluvia: gotas que caen (decorativo). El balde es independiente: lo colocan y retiran los operarios. */
    private rain: { x: number; y: number; dripMs: number } | null = null;
    private bucket: Graphics | null = null;

    /** `floorLayer`: debajo de los operarios (manchas). `topLayer`: por encima (partículas). */
    constructor(private floorLayer: Container, private topLayer: Container) {
        floorLayer.eventMode = 'none';
        topLayer.eventMode = 'none';
    }

    setRandom(rng: () => number) {
        this.rng = rng;
    }

    private add(kind: Kind, g: Graphics, x: number, y: number, vx: number, vy: number, gravity: number, max: number) {
        if (this.destroyed || this.particles.length >= MAX_PARTICLES) {
            g.destroy();
            return;
        }
        g.x = x;
        g.y = y;
        g.eventMode = 'none';
        this.topLayer.addChild(g);
        this.particles.push({ g, kind, vx, vy, gravity, life: 0, max, x, y, sway: 0.2 + this.rng() * 0.5, phase: this.rng() * 6.28 });
    }

    /** Lluvia de confeti desde (x, y) hacia arriba y los costados. */
    confetti(x: number, y: number, count = 40, spread = 28) {
        for (let i = 0; i < count; i++) {
            const g = new Graphics();
            const c = CONFETTI_COLORS[Math.floor(this.rng() * CONFETTI_COLORS.length)];
            const w = this.rng() < 0.5 ? 2 : 1;
            g.rect(0, 0, w, 2).fill({ color: c });
            const ang = -Math.PI / 2 + (this.rng() - 0.5) * 2.1;
            const sp = 0.5 + this.rng() * 1.1;
            this.add('confetti', g, x + (this.rng() - 0.5) * spread, y, Math.cos(ang) * sp, Math.sin(ang) * sp * 1.6, 0.035, 70 + Math.floor(this.rng() * 50));
        }
    }

    /** Corazoncitos que suben y se desvanecen. */
    hearts(x: number, y: number, count = 3) {
        for (let i = 0; i < count; i++) {
            const g = new Graphics();
            const c = 0xfb7185;
            // corazón pixelado de 5x4
            g.rect(1, 0, 1, 1).rect(3, 0, 1, 1).rect(0, 1, 5, 1).rect(1, 2, 3, 1).rect(2, 3, 1, 1).fill({ color: c });
            this.add('heart', g, x - 2 + (i - 1) * 5, y, (this.rng() - 0.5) * 0.15, -0.3 - this.rng() * 0.15, 0, 55 + i * 8);
        }
    }

    /** Notas musicales que suben flotando (hora feliz). */
    notes(x: number, y: number, count = 2) {
        for (let i = 0; i < count; i++) {
            const g = new Graphics();
            const c = this.rng() < 0.5 ? 0x38bdf8 : 0xfacc15;
            g.rect(0, 5, 3, 2).rect(2, 0, 1, 6).rect(3, 0, 2, 1).fill({ color: c });
            this.add('note', g, x + (this.rng() - 0.5) * 12, y, (this.rng() - 0.5) * 0.12, -0.22 - this.rng() * 0.12, 0, 90 + Math.floor(this.rng() * 30));
        }
    }

    /** Recortes y chispitas que salen de una estación con trabajo real en curso (1 o 2 píxeles). */
    work(x: number, y: number, color: number) {
        const g = new Graphics();
        const sz = this.rng() < 0.5 ? 1 : 2;
        g.rect(0, 0, sz, sz).fill({ color });
        this.add('spark', g, x + (this.rng() - 0.5) * 14, y, (this.rng() - 0.5) * 0.3, -0.25 - this.rng() * 0.25, 0.008, 36 + Math.floor(this.rng() * 24));
    }

    /** Torta de cumpleaños en el piso (se retira sola). */
    cake(x: number, y: number, ttlMs = 12000) {
        if (this.destroyed || this.puddles.length >= 6) return;
        const g = new Graphics();
        g.rect(-5, -4, 10, 5).fill({ color: 0xf9a8d4 });
        g.rect(-5, -4, 10, 2).fill({ color: 0xffffff });
        g.rect(-5, 1, 10, 1).fill({ color: 0x92400e });
        g.rect(-3, -8, 1, 4).rect(0, -8, 1, 4).rect(3, -8, 1, 4).fill({ color: 0x38bdf8 });
        g.rect(-3, -9, 1, 1).rect(0, -9, 1, 1).rect(3, -9, 1, 1).fill({ color: 0xfacc15 });
        g.x = x;
        g.y = y;
        g.eventMode = 'none';
        this.floorLayer.addChild(g);
        this.puddles.push({ g, life: 0, max: ttlMs });
    }
    /** Mancha en el piso (café derramado) que se seca y desaparece. */
    spill(x: number, y: number, ttlMs = 22000) {
        if (this.destroyed || this.puddles.length >= 6) return;
        const g = new Graphics();
        g.ellipse(0, 0, 7, 3).fill({ color: 0x5b3a1e, alpha: 0.85 });
        g.ellipse(-2, -1, 3, 1).fill({ color: 0x8b5e34, alpha: 0.9 });
        g.rect(7, -2, 2, 1).rect(8, 0, 1, 1).fill({ color: 0x5b3a1e, alpha: 0.7 });
        g.x = x;
        g.y = y;
        g.eventMode = 'none';
        this.floorLayer.addChild(g);
        this.puddles.push({ g, life: 0, max: ttlMs });
    }

    /**
     * Enciende o apaga el goteo de la gotera en (x, y). Con `withBucket` (por defecto) también pone o saca el balde
     * de inmediato; con `false` el balde lo maneja `setBucket` (para que un operario lo coloque o lo retire).
     */
    setRain(on: boolean, x = 0, y = 0, withBucket = true) {
        if (this.destroyed) return;
        if (!on) {
            this.rain = null;
            if (withBucket) this.setBucket(false);
            return;
        }
        if (!this.rain) this.rain = { x, y, dripMs: 400 };
        if (withBucket) this.setBucket(true, x, y);
    }

    /** Pone o saca el balde del piso en (x, y). */
    setBucket(on: boolean, x = 0, y = 0) {
        if (this.destroyed) return;
        if (!on) {
            if (this.bucket) {
                try {
                    if (!this.bucket.destroyed) this.bucket.destroy();
                } catch (_) {}
                this.bucket = null;
            }
            return;
        }
        if (this.bucket) return;
        const g = new Graphics();
        g.ellipse(0, 0, 6, 2).fill({ color: 0x000000, alpha: 0.25 });
        g.rect(-4, -7, 8, 7).fill({ color: 0x64748b });
        g.rect(-4, -7, 8, 1).fill({ color: 0x94a3b8 });
        g.rect(-3, -6, 6, 1).fill({ color: 0x38bdf8 });
        g.rect(-4, -4, 8, 1).fill({ color: 0x475569 });
        g.x = x;
        g.y = y;
        g.eventMode = 'none';
        this.floorLayer.addChild(g);
        this.bucket = g;
    }

    update(dtMs: number) {
        if (this.destroyed) return;
        if (this.rain) {
            this.rain.dripMs -= dtMs;
            if (this.rain.dripMs <= 0) {
                this.rain.dripMs = 700 + this.rng() * 900;
                const g = new Graphics();
                g.rect(0, 0, 1, 2).fill({ color: 0x7dd3fc });
                this.add('spark', g, this.rain.x + (this.rng() - 0.5) * 2, this.rain.y - 34, 0, 0.5, 0.06, 24);
            }
        }
        const f = dtMs / 16.67;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += f;
            p.vy += p.gravity * f;
            p.x += p.vx * f;
            p.y += p.vy * f;
            p.g.x = Math.round(p.x + (p.kind === 'confetti' ? Math.sin(p.life * 0.15 + p.phase) * p.sway : p.kind === 'note' ? Math.sin(p.life * 0.08 + p.phase) * 1.2 : 0));
            p.g.y = Math.round(p.y);
            const left = 1 - p.life / p.max;
            p.g.alpha = left < 0.3 ? Math.max(0, left / 0.3) : 1;
            if (p.life >= p.max || p.g.destroyed) {
                try {
                    if (!p.g.destroyed) p.g.destroy();
                } catch (_) {}
                this.particles.splice(i, 1);
            }
        }
        for (let i = this.puddles.length - 1; i >= 0; i--) {
            const p = this.puddles[i];
            p.life += dtMs;
            const left = 1 - p.life / p.max;
            p.g.alpha = left < 0.35 ? Math.max(0, left / 0.35) : 1;
            if (p.life >= p.max) {
                try {
                    if (!p.g.destroyed) p.g.destroy();
                } catch (_) {}
                this.puddles.splice(i, 1);
            }
        }
    }

    destroy() {
        this.rain = null;
        this.setBucket(false);
        this.destroyed = true;
        for (const p of this.particles) {
            try {
                if (!p.g.destroyed) p.g.destroy();
            } catch (_) {}
        }
        for (const p of this.puddles) {
            try {
                if (!p.g.destroyed) p.g.destroy();
            } catch (_) {}
        }
        this.particles = [];
        this.puddles = [];
    }
}
