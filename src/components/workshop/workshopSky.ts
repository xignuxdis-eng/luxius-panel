// workshopSky.ts - El cielo que se ve por las ventanas del Print Den (Bloque F7/F8)
// Dibuja, SOLO dentro de los vidrios de las ventanas: sol (de día), luna y estrellas (de noche),
// colores de amanecer/atardecer y el clima real (nubes, lluvia, nieve, niebla, tormenta con relámpagos).
// Es decorativo y no recibe clics.

import { Container, Graphics } from 'pixi.js';
import type { WeatherKind } from './workshopWeather';

const WIN_W = 64;
const WIN_H = 24;
/** Vidrios de la textura de la ventana (3 paneles grandes en una fila). */
const PANE_COLS = [3, 23, 43];
const PANE_ROWS: Array<[number, number]> = [[3, 18]];
const PANE_W = 18;

export type TimeOfDay = 'day' | 'dusk' | 'night';

export function timeOfDay(hour: number): TimeOfDay {
    const h = ((hour % 24) + 24) % 24;
    if (h >= 8 && h < 17.5) return 'day';
    if ((h >= 5.5 && h < 8) || (h >= 17.5 && h < 20)) return 'dusk';
    return 'night';
}

interface WinItem {
    root: Container;
    g: Graphics;
    mask: Graphics;
}

export class WorkshopSky {
    private wins: WinItem[] = [];
    private hour = 12;
    private weather: WeatherKind | null = null;
    private acc = 0;
    private flashMs = 0;
    private nextFlashMs = 4000;
    private destroyed = false;

    constructor(private layer: Container, windowXs: number[], private y: number) {
        layer.eventMode = 'none';
        for (const wx of windowXs) {
            const root = new Container();
            root.x = wx;
            root.y = this.y;
            root.eventMode = 'none';
            const mask = new Graphics();
            for (const c of PANE_COLS) for (const [r, h] of PANE_ROWS) mask.rect(c, r, PANE_W, h).fill({ color: 0xffffff });
            const g = new Graphics();
            root.addChild(g);
            root.addChild(mask);
            root.mask = mask;
            layer.addChild(root);
            this.wins.push({ root, g, mask });
        }
        this.draw(0);
    }

    setHour(hour: number) {
        this.hour = hour;
    }

    setWeather(kind: WeatherKind | null) {
        this.weather = kind;
    }

    setEnabled(v: boolean) {
        this.layer.visible = v;
    }

    private draw(t: number) {
        const tod = timeOfDay(this.hour);
        const overcast = this.weather !== null && this.weather !== 'clear';
        const h = this.hour;
        for (const w of this.wins) {
            if (w.g.destroyed) continue;
            const g = w.g;
            g.clear();

            // cielo base
            let base = 0x7dd3fc;
            let alpha = 0.88;
            if (tod === 'dusk') {
                base = h < 12 ? 0xfdba74 : 0xfb923c;
                alpha = 0.88;
            } else if (tod === 'night') {
                base = 0x0b1030;
                alpha = 0.96;
            }
            if (overcast && tod === 'day') {
                base = this.weather === 'storm' ? 0x475569 : 0x94a3b8;
                alpha = 0.92;
            }
            g.rect(0, 0, WIN_W, WIN_H).fill({ color: base, alpha });
            if (tod === 'day' && !overcast) g.rect(0, WIN_H - 7, WIN_W, 7).fill({ color: 0xe0f2fe, alpha: 0.4 });
            if (tod === 'dusk') g.rect(0, WIN_H - 9, WIN_W, 9).fill({ color: 0xa855f7, alpha: 0.3 });

            // sol
            if (tod !== 'night' && !overcast) {
                const frac = Math.max(0, Math.min(1, (h - 6) / 14));
                const sx = 8 + frac * (WIN_W - 16);
                const sy = 17 - Math.sin(frac * Math.PI) * 11;
                g.circle(sx, sy, 8).fill({ color: 0xfde68a, alpha: 0.28 });
                g.circle(sx, sy, 3.8).fill({ color: 0xfde047 });
            }

            // luna y estrellas
            if (tod === 'night') {
                if (!overcast || this.weather === 'cloudy') {
                    for (let i = 0; i < 18; i++) {
                        const sx = (i * 19 + 7) % WIN_W;
                        const sy = (i * 7 + 2) % (WIN_H - 4);
                        const tw = 0.5 + 0.5 * Math.sin(t / 500 + i * 1.7);
                        g.rect(sx, sy, 1, 1).fill({ color: 0xffffff, alpha: 0.35 + 0.55 * tw });
                    }
                    g.circle(50, 7, 4.5).fill({ color: 0xfef3c7 });
                    g.circle(52, 6, 4).fill({ color: 0x0b1030 });
                }
            }

            // nubes
            if (overcast) {
                const col = tod === 'night' ? 0x64748b : this.weather === 'storm' ? 0x334155 : 0xf1f5f9;
                for (let i = 0; i < 4; i++) {
                    const cx = ((t * 0.004 + i * 24) % (WIN_W + 30)) - 15;
                    g.ellipse(cx, 5 + (i % 2) * 5, 11, 3.6).fill({ color: col, alpha: 0.9 });
                    g.ellipse(cx + 6, 3.5 + (i % 2) * 5, 7, 3).fill({ color: col, alpha: 0.9 });
                }
            }

            // precipitación
            if (this.weather === 'rain' || this.weather === 'storm') {
                for (let i = 0; i < 24; i++) {
                    const px = (i * 5.3 + 1) % WIN_W;
                    const py = ((t * 0.07 + i * 7.3) % 30) - 3;
                    g.rect(Math.round(px), Math.round(py), 1, 3).fill({ color: 0xbae6fd, alpha: 0.9 });
                }
            } else if (this.weather === 'snow') {
                for (let i = 0; i < 20; i++) {
                    const px = (i * 6.1 + Math.sin(t / 700 + i) * 2 + WIN_W) % WIN_W;
                    const py = ((t * 0.018 + i * 5.1) % 27) - 2;
                    g.rect(Math.round(px), Math.round(py), 1, 1).fill({ color: 0xffffff });
                }
            } else if (this.weather === 'fog') {
                g.rect(0, 0, WIN_W, WIN_H).fill({ color: 0xe2e8f0, alpha: 0.5 });
            }

            // relámpago
            if (this.flashMs > 0) {
                g.rect(0, 0, WIN_W, WIN_H).fill({ color: 0xffffff, alpha: 0.75 * (this.flashMs / 140) });
            }
        }
    }

    update(dtMs: number, timeMs: number) {
        if (this.destroyed || !this.layer.visible) return;
        if (this.weather === 'storm') {
            this.nextFlashMs -= dtMs;
            if (this.nextFlashMs <= 0) {
                this.flashMs = 140;
                this.nextFlashMs = 3500 + Math.random() * 6000;
            }
        }
        if (this.flashMs > 0) this.flashMs = Math.max(0, this.flashMs - dtMs);
        this.acc += dtMs;
        if (this.acc < 60) return;
        this.acc = 0;
        this.draw(timeMs);
    }

    destroy() {
        this.destroyed = true;
        this.wins = [];
        try {
            if (!this.layer.destroyed) this.layer.removeChildren();
        } catch (_) {}
    }
}
