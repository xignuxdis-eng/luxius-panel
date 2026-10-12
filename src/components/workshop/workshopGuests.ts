// workshopGuests.ts - Visitas del Print Den (Bloque F10): repartidor, técnico de plotter y guardia nocturno.
// Son personajes DECORATIVOS (no representan personas ni datos del sistema). Entran por la puerta de la izquierda,
// caminan por el pasillo, se quedan un rato en una estación diciendo sus frases y se van. No participan de las
// charlas ni de los encargos de los operarios, y solo hablan cuando nadie más está hablando.

import { Container, Rectangle, Sprite } from 'pixi.js';
import type { StationConfig } from './types';
import {
    getCharacterShadowTexture,
    getCharacterTextures,
    type CharacterDirection,
    type CharacterTextures
} from './workshopCharacters';
import { lineDurationMs } from './workshopBanter';
import { computeLanes, getStandPoint, planPath, type BubbleTone, type Lanes, type Point, type WorkerSnapshot } from './workshopWorkers';

import { GUEST_KINDS, type GuestKind, type GuestKindConfig } from './content/guests';
export type { GuestKind };

type KindConfig = GuestKindConfig;
const KIND = GUEST_KINDS;

type Phase = 'in' | 'stay' | 'out';

interface Guest {
    id: string;
    kind: GuestKind;
    cfg: KindConfig;
    x: number;
    y: number;
    facing: CharacterDirection;
    arriveFacing: CharacterDirection;
    mode: 'idle' | 'walk';
    path: Point[];
    phase: Phase;
    timerMs: number;
    lineIdx: number;
    bubble: { text: string; tone: BubbleTone } | null;
    bubbleMs: number;
    animMs: number;
    textures: CharacterTextures;
    container: Container;
    sprite: Sprite;
    leaving: boolean;
    rest: number;
}

const WALK_FPS = 6;

export class GuestManager {
    private guests: Guest[] = [];
    private lanes: Lanes;
    private destroyed = false;
    private seq = 0;
    /** Se llama al tocar a una visita (la ficha es un aviso corto o la ficha RPG del cliente). */
    onTap?: (info: { kind: GuestKind; name: string; text: string; id: string }) => void;

    constructor(private layer: Container, private stations: StationConfig[], private rng: () => number = Math.random) {
        this.lanes = computeLanes(stations);
    }

    has(kind: GuestKind): boolean {
        return this.guests.some((g) => g.kind === kind);
    }

    count(): number {
        return this.guests.length;
    }

    /** Hace entrar a una visita. Devuelve false si ya hay una de ese tipo (máximo 1 por tipo). */
    spawn(kind: GuestKind, customCfg?: Partial<GuestKindConfig>): boolean {
        if (this.destroyed || this.has(kind)) return false;
        const base = KIND[kind];
        const cfg: KindConfig = {
            ...base,
            ...(customCfg || {}),
            lines: customCfg?.lines ?? base.lines
        };
        const laneY = this.lanes.low;
        const textures = getCharacterTextures({
            role: 'empaquetador',
            sheetKey: `guest_${kind}_${cfg.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
            shirtColor: cfg.shirt,
            skinColor: cfg.skin,
            hairColor: cfg.hair
        });

        const container = new Container();
        container.label = `Guest:${kind}`;
        container.eventMode = 'static';
        container.cursor = 'pointer';
        container.hitArea = new Rectangle(-8, -28, 16, 30);
        const shadow = new Sprite(getCharacterShadowTexture());
        shadow.anchor.set(0.5, 0.5);
        shadow.y = -1;
        container.addChild(shadow);
        const sprite = new Sprite(textures.idle[0]);
        sprite.anchor.set(0.5, 1);
        container.addChild(sprite);
        this.layer.addChild(container);

        const g: Guest = {
            id: `g-${kind}-${++this.seq}`,
            kind,
            cfg,
            x: 4,
            y: laneY,
            facing: 'right',
            arriveFacing: 'down',
            mode: 'walk',
            path: [],
            phase: 'in',
            timerMs: 0,
            lineIdx: 0,
            bubble: null,
            bubbleMs: 0,
            animMs: 0,
            textures,
            container,
            sprite,
            leaving: false,
            rest: 0
        };

        const target = this.targetStation(kind);
        if (!target) {
            container.destroy({ children: true });
            return false;
        }
        const stand = getStandPoint(target, laneY, 0, this.lanes);
        g.path = planPath({ x: g.x, y: g.y }, { x: stand.x, y: stand.y });
        g.arriveFacing = stand.facing;
        this.guests.push(g);
        container.on('pointertap', () => {
            const text = g.bubble?.text ?? g.cfg.lines[Math.floor(this.rng() * g.cfg.lines.length)];
            this.onTap?.({ kind, name: g.cfg.name, text, id: g.id });
        });
        this.sync(g);
        return true;
    }

    /** Indica a las visitas de un tipo que se retiren (salen por la puerta de la izquierda). */
    dismiss(kind: GuestKind): void {
        for (const g of this.guests) {
            if (g.kind === kind && !g.leaving) this.startLeaving(g);
        }
    }

    private targetStation(kind: GuestKind): StationConfig | undefined {
        if (kind === 'repartidor') return this.stations.find((s) => s.id === 'despacho');
        if (kind === 'cliente') return this.stations.find((s) => s.id === 'caja');
        if (kind === 'pizzero') return this.stations.find((s) => s.id === 'refrigerios');
        return this.stations.find((s) => s.id.startsWith('plotter') || s.id.startsWith('maquina_'));
    }

    private startLeaving(g: Guest) {
        g.leaving = true;
        g.phase = 'out';
        g.bubble = null;
        const onLane = g.y === this.lanes.low || g.y === this.lanes.high;
        // si no está sobre el pasillo, primero vuelve al carril de abajo y sale por la puerta
        g.path = onLane ? [{ x: -10, y: g.y }] : planPath({ x: g.x, y: g.y }, { x: -10, y: this.lanes.low });
        g.mode = 'walk';
    }

    private sync(g: Guest) {
        if (g.sprite.destroyed) return;
        g.container.x = Math.round(g.x);
        g.container.y = Math.round(g.y);
        g.container.zIndex = Math.round(g.y);
        if (g.mode === 'walk') {
            const frame = Math.floor((g.animMs / 1000) * WALK_FPS) % 4;
            g.sprite.texture = g.textures.walk[g.facing][frame];
        } else if (g.facing === 'down') {
            g.sprite.texture = g.textures.idle[Math.floor(g.animMs / 700) % 2];
        } else {
            g.sprite.texture = g.textures.walk[g.facing][0];
        }
    }

    /** `someoneElseSpeaking`: hay charla/saludo/pensamiento en el taller (las visitas esperan su turno). */
    update(deltaMS: number, someoneElseSpeaking: boolean) {
        if (this.destroyed) return;
        const dt = Math.max(0, Math.min(deltaMS, 100));
        for (let i = this.guests.length - 1; i >= 0; i--) {
            const g = this.guests[i];
            g.animMs += dt;

            if (g.mode === 'walk' && g.path.length > 0) {
                let budget = (g.cfg.speed * dt) / 1000;
                while (budget > 0 && g.path.length > 0) {
                    const t = g.path[0];
                    const dx = t.x - g.x;
                    const dy = t.y - g.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 0.0001) g.facing = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                    if (dist <= budget) {
                        g.x = t.x;
                        g.y = t.y;
                        budget -= dist;
                        g.path.shift();
                    } else {
                        g.x += (dx / dist) * budget;
                        g.y += (dy / dist) * budget;
                        budget = 0;
                    }
                }
                if (g.path.length === 0) {
                    g.mode = 'idle';
                    if (g.phase === 'out') {
                        try {
                            if (!g.container.destroyed) g.container.destroy({ children: true });
                        } catch (_) {}
                        this.guests.splice(i, 1);
                        continue;
                    }
                    g.facing = g.phase === 'in' ? g.arriveFacing : g.facing;
                    if (g.phase === 'in') {
                        g.phase = 'stay';
                        g.timerMs = g.cfg.stayMs;
                        g.lineIdx = 0;
                        g.rest = 600;
                    }
                }
            }

            // Frases
            if (g.bubble) {
                g.bubbleMs -= dt;
                if (g.bubbleMs <= 0) g.bubble = null;
            } else if (g.phase === 'stay' && !g.leaving && !someoneElseSpeaking) {
                g.rest -= dt;
                if (g.rest <= 0) {
                    const line = g.cfg.lines[g.lineIdx % g.cfg.lines.length];
                    g.lineIdx++;
                    g.bubble = { text: line, tone: g.cfg.tone };
                    g.bubbleMs = lineDurationMs(line);
                    g.rest = 700 + this.rng() * 900;
                }
            }

            // Tiempos de la fase
            if (g.phase === 'stay') {
                g.timerMs -= dt;
                if (g.timerMs <= 0) this.startLeaving(g);
            }

            this.sync(g);
        }
    }

    /** Fotos para dibujar los globos de las visitas (mismo formato que los operarios). */
    getSnapshots(): WorkerSnapshot[] {
        return this.guests.map((g) => ({
            id: g.id,
            name: g.cfg.name,
            role: 'empaquetador',
            workshopRole: g.kind === 'cliente' ? 'Cliente' : (g.kind === 'tecnico' ? 'Técnico' : (g.kind === 'repartidor' ? 'Repartidor' : 'Visita')),
            x: g.x,
            y: g.y,
            mode: g.mode,
            facing: g.facing,
            bubble: g.bubble,
            orderId: null,
            stroll: 'rest',
            errand: 'none',
            chatting: false,
            visiting: false,
            roleFromUser: false,
            shirtColor: g.cfg.shirt,
            skinColor: g.cfg.skin,
            errandText: null
        }));
    }

    destroy() {
        this.destroyed = true;
        for (const g of this.guests) {
            try {
                if (!g.container.destroyed) g.container.destroy({ children: true });
            } catch (_) {}
        }
        this.guests = [];
    }
}
