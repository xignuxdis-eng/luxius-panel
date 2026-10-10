// workshopLighting.ts - Iluminación y ciclo día/noche leve del Print Den (Bloque E)
// Capa de luz sobre el mundo: un velo oscuro cuyo nivel depende de la HORA REAL del equipo (suave, nunca muy oscuro),
// conos de luz cálidos de las lámparas del pasillo (blendMode 'add') y luz cian bajo las máquinas que están activas.
// Todo es decorativo; la capa no recibe clics.

import { Container, Graphics } from 'pixi.js';

/** Oscuridad máxima de la noche (se mantiene baja para que el taller siempre se lea bien). */
export const MAX_DARKNESS = 0.3;

/**
 * Nivel de oscuridad (0 a MAX_DARKNESS) según la hora local, en horas decimales (0 a 24).
 * Día pleno 8:00-17:30, atardecer 17:30-20:00, noche 20:00-5:30, amanecer 5:30-8:00.
 */
export function ambientDarkness(hour: number): number {
    const h = ((hour % 24) + 24) % 24;
    if (h >= 8 && h < 17.5) return 0;
    if (h >= 17.5 && h < 20) return MAX_DARKNESS * ((h - 17.5) / 2.5);
    if (h >= 5.5 && h < 8) return MAX_DARKNESS * (1 - (h - 5.5) / 2.5);
    return MAX_DARKNESS;
}

/**
 * Hora actual del taller. Para pruebas se puede forzar con
 *   localStorage.setItem('luxius_print_den_hour', '23')   (y borrar la clave para volver a la hora real).
 */
export function workshopNow(): Date {
    try {
        const o = localStorage.getItem('luxius_print_den_hour');
        if (o !== null && o !== '') {
            const h = parseFloat(o);
            if (Number.isFinite(h)) {
                const d = new Date();
                d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
                return d;
            }
        }
    } catch (_) {}
    return new Date();
}

export const hourOf = (d: Date) => d.getHours() + d.getMinutes() / 60;

export interface LightPoint {
    x: number;
    y: number;
}

export interface PlotterLightSpot {
    id: string;
    x: number;
    y: number;
    w: number;
}

export class WorkshopLighting {
    private overlay = new Graphics();
    private lamps = new Graphics();
    private glows = new Map<string, Graphics>();
    private lastBucket = -1;
    private darkness = 0;
    /** Apagón decorativo (0 = luz normal, 1 = oscuridad casi total). */
    private blackout = 0;
    private destroyed = false;

    constructor(private layer: Container, private w: number, private h: number, lamps: LightPoint[]) {
        this.overlay.eventMode = 'none';
        this.lamps.eventMode = 'none';
        this.layer.eventMode = 'none';
        this.layer.addChild(this.overlay);

        // Conos de luz: círculos concéntricos muy suaves (aditivos)
        this.lamps.blendMode = 'add';
        for (const l of lamps) {
            for (let r = 46; r >= 8; r -= 6) {
                this.lamps.circle(l.x, l.y, r).fill({ color: 0xffe9a8, alpha: 0.018 });
            }
            this.lamps.rect(l.x - 2, l.y - 1, 4, 2).fill({ color: 0xfff7d6, alpha: 0.9 });
        }
        this.layer.addChild(this.lamps);
        this.redraw();
    }

    /** Registra las luces cian de las máquinas (plotters). */
    setPlotterSpots(spots: PlotterLightSpot[]) {
        for (const s of spots) {
            if (this.glows.has(s.id)) continue;
            const g = new Graphics();
            g.blendMode = 'add';
            g.eventMode = 'none';
            for (let i = 0; i < 4; i++) {
                g.roundRect(s.x - 4 - i * 3, s.y - i * 2, s.w + 8 + i * 6, 22 + i * 4, 6).fill({ color: 0x38bdf8, alpha: 0.05 });
            }
            g.alpha = 0;
            this.layer.addChild(g);
            this.glows.set(s.id, g);
        }
    }

    private redraw() {
        this.overlay.clear();
        const level = Math.max(this.darkness, this.blackout * 0.78);
        if (level > 0.001) {
            this.overlay.rect(0, 0, this.w, this.h).fill({ color: 0x050816, alpha: level });
        }
        // Las lámparas se notan más de noche y casi nada de día; en un apagón se apagan
        this.lamps.alpha = (0.25 + 0.75 * (this.darkness / MAX_DARKNESS)) * (1 - this.blackout);
    }

    /** Apagón temporal (evento decorativo). */
    setBlackout(level: number) {
        const v = Math.max(0, Math.min(1, level));
        if (Math.abs(v - this.blackout) < 0.001) return;
        this.blackout = v;
        this.redraw();
    }

    getDarkness(): number {
        return this.darkness;
    }

    /** `timeMs` acumulado; `active[id]` = máquina con trabajo en cola y en línea. Se actualiza la hora cada ~30 s. */
    update(timeMs: number, active: Record<string, boolean>, now: Date = workshopNow()) {
        if (this.destroyed) return;
        const bucket = Math.floor(timeMs / 30000);
        if (bucket !== this.lastBucket) {
            this.lastBucket = bucket;
            const d = ambientDarkness(now.getHours() + now.getMinutes() / 60);
            if (Math.abs(d - this.darkness) > 0.002) {
                this.darkness = d;
                this.redraw();
            }
        }
        this.glows.forEach((g, id) => {
            if (g.destroyed) return;
            const target = active[id] ? 0.55 + 0.25 * Math.sin(timeMs / 380) : 0;
            g.alpha += (target - g.alpha) * 0.08;
        });
    }

    destroy() {
        this.destroyed = true;
        this.glows.clear();
        try {
            if (!this.layer.destroyed) this.layer.removeChildren();
        } catch (_) {}
    }
}
