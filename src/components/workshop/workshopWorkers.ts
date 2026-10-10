// workshopWorkers.ts - Operarios del Print Den: creación desde usuarios, rutas por el pasillo y movimiento (Fase 3, sub-etapa 4.2)
// Todavía NO reacciona a órdenes (eso es 4.3). Aquí solo hay: quién es cada operario, dónde se para,
// cómo camina de un puesto a otro sin atravesar máquinas, y cómo se dibuja ordenado por profundidad.
//
// Reglas de diseño (decisiones del usuario D1=A, D3=A):
//  - D1: el rol sale del rol real del usuario cuando existe (artista -> diseñador, impresion -> impresor).
//        Quienes no tienen rol de taller ocupan los puestos libres en el orden del sistema viejo.
//  - D3: los operarios se paran en el pasillo, al borde de su estación, nunca dentro de la máquina.

import { Container, Graphics, Sprite } from 'pixi.js';
import type { StationConfig, StationId, WorkerRole } from './types';
import {
    CHARACTER_H,
    getCharacterShadowTexture,
    getCharacterTextures,
    type CharacterDirection,
    type CharacterTextures
} from './workshopCharacters';

export const MAP_W = 480;
export const MAX_WORKERS = 4;
/** Tope de encargos esperando (si se acumulan, se descarta el más viejo). */
export const MAX_ERRAND_QUEUE = 20;
/** Tiempo que el operario se queda en la estación antes de volver a su puesto. */
export const ERRAND_DWELL_MS = 3000;

/** Orden de roles del sistema viejo (WorkshopCanvas.tsx L161-166), usado como respaldo. */
export const LEGACY_ROLE_ORDER: WorkerRole[] = ['disenador', 'impresor', 'cortador', 'empaquetador'];

export const ROLE_SHIRT: Record<WorkerRole, string> = {
    disenador: '#8b5cf6',
    impresor: '#22c55e',
    cortador: '#ec4899',
    empaquetador: '#0284c7'
};

/** Colores de piel del sistema viejo (WorkshopCanvas.tsx L168). */
export const LEGACY_SKINS = ['#fca5a5', '#fdba74', '#c68642', '#fed7aa', '#8d5524'];

/** Estación donde trabaja cada rol. */
export const ROLE_STATION: Record<WorkerRole, StationId> = {
    disenador: 'diseno',
    impresor: 'plotter1',
    cortador: 'corte',
    empaquetador: 'empaque'
};

/**
 * El sistema viejo avanza `speed` px por cuadro en un lienzo de 860 px de ancho (se asume ~60 cuadros/s).
 * El mapa de Pixi mide 480 px, así que se escala para que el recorrido tarde parecido.
 */
export const LEGACY_CANVAS_W = 860;
export const LEGACY_FPS = 60;
export const legacySpeedToPxPerSec = (legacySpeed: number) => legacySpeed * LEGACY_FPS * (MAP_W / LEGACY_CANVAS_W);

export interface WorkerUser {
    id: number | string;
    nombre?: string;
    username?: string;
    rol?: string;
    role?: string;
    habilitado?: boolean;
}

export interface WorkerSpec {
    id: string;
    name: string;
    role: WorkerRole;
    /** Rol real del usuario si se pudo mapear; false si ocupó un puesto libre por orden del sistema viejo. */
    roleFromUser: boolean;
    shirtColor: string;
    skinColor: string;
    speedPxPerSec: number;
    /** Posición dentro del equipo (define el carril del pasillo y el color de piel). */
    index: number;
    /** Desplazamiento horizontal cuando hay varios operarios del mismo rol en la misma estación. */
    dupOffsetX: number;
}

export interface Point {
    x: number;
    y: number;
}

export interface StandPoint extends Point {
    facing: CharacterDirection;
}

const norm = (s?: string) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const ROLE_ALIASES: Record<string, WorkerRole> = {
    artista: 'disenador',
    diseno: 'disenador',
    disenador: 'disenador',
    impresion: 'impresor',
    impresor: 'impresor',
    cortador: 'cortador',
    corte: 'cortador',
    refilado: 'cortador',
    empaquetador: 'empaquetador',
    empaque: 'empaquetador'
};

/** Rol de taller que corresponde a un rol del sistema, o null si no es un rol de taller. */
export function mapUserToWorkerRole(rol?: string): WorkerRole | null {
    return ROLE_ALIASES[norm(rol)] ?? null;
}

export type HeldKind = 'carpeta' | 'rebotada' | 'rollo';
export type BubbleTone = 'ok' | 'warn' | 'info';

export interface Errand {
    role: WorkerRole;
    stationId: StationId;
    /** Texto del globo (D2: `OT #… EN COLA`). */
    text?: string;
    tone?: BubbleTone;
    /** Objeto que lleva en la mano mientras dura el encargo. */
    held?: HeldKind;
}

/**
 * Qué operario va adónde cuando una orden CAMBIA de estado (mismas reglas del sistema viejo,
 * WorkshopCanvas.tsx L198-258). Solo cuentan los cambios reales: las órdenes nuevas,
 * las que desaparecen y la primera lectura no disparan nada.
 * Decisión de 4.3: el sistema viejo mandaba a puntos sueltos del mapa; aquí van a la estación equivalente.
 */
export function planErrand(diff: {
    changeType: string;
    nextStatus?: string;
    order?: { id?: number; ot?: string };
}): Errand | null {
    if (diff.changeType !== 'status_change') return null;
    const ot = `OT #${diff.order?.ot || diff.order?.id || '?'}`;
    switch (diff.nextStatus) {
        case 'rebotado':
        case 'standby':
            // Decisión del usuario: las rebotadas vuelven a diseño.
            return { role: 'impresor', stationId: 'diseno', text: `${ot} REBOTADA`, tone: 'warn', held: 'rebotada' };
        case 'orden':
            return { role: 'disenador', stationId: 'plotter1', text: `${ot} EN COLA`, tone: 'ok', held: 'carpeta' };
        case 'impreso':
            // Decisión del usuario: las impresas van a despacho.
            return { role: 'impresor', stationId: 'despacho', text: `${ot} A DESPACHO`, tone: 'info', held: 'rollo' };
        default:
            return null;
    }
}

const DUP_OFFSETS = [0, 20, -20, 40];

/**
 * Crea hasta MAX_WORKERS operarios a partir de la lista de usuarios.
 * Se ignoran usuarios deshabilitados y clientes externos (no son operarios del taller).
 */
export function buildCrewSpecs(users: WorkerUser[]): WorkerSpec[] {
    const candidates = users.filter((u) => u && u.habilitado !== false && norm(u.rol || u.role) !== 'cliente');

    const withRole = candidates
        .map((u) => ({ u, role: mapUserToWorkerRole(u.rol || u.role) }))
        .filter((x): x is { u: WorkerUser; role: WorkerRole } => x.role !== null)
        .slice(0, MAX_WORKERS);

    const usedIds = new Set(withRole.map((x) => x.u.id));
    const rest = candidates.filter((u) => !usedIds.has(u.id) && mapUserToWorkerRole(u.rol || u.role) === null);

    const entries: Array<{ u: WorkerUser; role: WorkerRole; fromUser: boolean }> = withRole.map((x) => ({
        u: x.u,
        role: x.role,
        fromUser: true
    }));

    // Puestos libres: se reparten los roles que todavía no tiene nadie, en el orden del sistema viejo.
    for (const u of rest) {
        if (entries.length >= MAX_WORKERS) break;
        const taken = new Set(entries.map((e) => e.role));
        const role = LEGACY_ROLE_ORDER.find((r) => !taken.has(r)) ?? LEGACY_ROLE_ORDER[entries.length % LEGACY_ROLE_ORDER.length];
        entries.push({ u, role, fromUser: false });
    }

    const perRoleCount: Partial<Record<WorkerRole, number>> = {};
    return entries.map((e, index) => {
        const dup = perRoleCount[e.role] ?? 0;
        perRoleCount[e.role] = dup + 1;
        return {
            id: `w-${e.u.id}`,
            name: e.u.nombre || e.u.username || `Operario ${index + 1}`,
            role: e.role,
            roleFromUser: e.fromUser,
            shirtColor: ROLE_SHIRT[e.role],
            skinColor: LEGACY_SKINS[index % LEGACY_SKINS.length],
            speedPxPerSec: legacySpeedToPxPerSec(2.1 + index * 0.1),
            index,
            dupOffsetX: DUP_OFFSETS[dup % DUP_OFFSETS.length]
        };
    });
}

/* ==========================================================================
   GEOMETRÍA DEL PASILLO
   ========================================================================== */

export interface Lanes {
    /** Carril de abajo (más cerca de la fila inferior). */
    low: number;
    /** Carril de arriba (8 px más arriba). */
    high: number;
    /** Borde inferior de la fila de arriba y borde superior de la fila de abajo. */
    topEdge: number;
    bottomEdge: number;
}

/** Calcula los carriles del pasillo entre la fila superior y la inferior de estaciones. */
export function computeLanes(stations: StationConfig[]): Lanes {
    const top = stations.filter((s) => s.y + s.height <= 120);
    const bottom = stations.filter((s) => s.y >= 120);
    const topEdge = top.length ? Math.max(...top.map((s) => s.y + s.height)) : 110;
    const bottomEdge = bottom.length ? Math.min(...bottom.map((s) => s.y)) : 140;
    const low = bottomEdge - 6;
    return { low, high: low - 8, topEdge, bottomEdge };
}

/** Un punto (los pies del operario) es transitable si está dentro del mapa y fuera de toda estación. */
export function isWalkable(p: Point, stations: StationConfig[], margin = 1): boolean {
    if (p.x < 8 || p.x > MAP_W - 8 || p.y < 8) return false;
    return !stations.some(
        (s) =>
            p.x >= s.x - margin &&
            p.x <= s.x + s.width + margin &&
            p.y >= s.y - margin &&
            p.y <= s.y + s.height + margin
    );
}

/** Punto donde se para un operario en el pasillo, frente a su estación (D3=A). */
export function getStandPoint(station: StationConfig, laneY: number, dupOffsetX: number, lanes: Lanes): StandPoint {
    const cx = station.x + station.width / 2 + dupOffsetX;
    const x = Math.max(14, Math.min(MAP_W - 14, Math.round(cx)));
    const facing: CharacterDirection = station.y + station.height <= lanes.topEdge + 1 ? 'up' : 'down';
    return { x, y: laneY, facing };
}

/** Ruta en dos tramos: primero cambia de carril (vertical), luego avanza (horizontal). Sin tramos de largo cero. */
export function planPath(from: Point, to: Point): Point[] {
    const path: Point[] = [];
    if (Math.abs(from.y - to.y) > 0.01) path.push({ x: from.x, y: to.y });
    if (Math.abs(from.x - to.x) > 0.01 || path.length === 0) path.push({ x: to.x, y: to.y });
    return path.filter((p, i) => {
        const prev = i === 0 ? from : path[i - 1];
        return Math.hypot(p.x - prev.x, p.y - prev.y) > 0.01;
    });
}

/** Comprueba, muestreando cada `step` px, que toda la ruta es transitable. Se usa en las pruebas. */
export function isPathWalkable(from: Point, path: Point[], stations: StationConfig[], step = 2): boolean {
    let prev = from;
    for (const p of path) {
        const len = Math.hypot(p.x - prev.x, p.y - prev.y);
        const n = Math.max(1, Math.ceil(len / step));
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            if (!isWalkable({ x: prev.x + (p.x - prev.x) * t, y: prev.y + (p.y - prev.y) * t }, stations)) return false;
        }
        prev = p;
    }
    return true;
}

/* ==========================================================================
   EQUIPO DE OPERARIOS (Pixi)
   ========================================================================== */

export interface WorkerSnapshot {
    id: string;
    name: string;
    role: WorkerRole;
    x: number;
    y: number;
    mode: 'idle' | 'walk';
    facing: CharacterDirection;
    /** Globo activo (texto + tono) o null. */
    bubble: { text: string; tone: BubbleTone } | null;
}

interface WorkerState {
    spec: WorkerSpec;
    x: number;
    y: number;
    facing: CharacterDirection;
    mode: 'idle' | 'walk';
    path: Point[];
    arriveFacing: CharacterDirection;
    home: StandPoint;
    animMs: number;
    errand: 'none' | 'going' | 'dwell' | 'returning';
    dwellMs: number;
    bubble: { text: string; tone: BubbleTone } | null;
    held: Graphics | null;
    textures: CharacterTextures;
    container: Container;
    sprite: Sprite;
}

const WALK_FPS = 8;
const IDLE_BREATH_MS = 700;
/** Tope de tiempo por cuadro: evita saltos enormes al volver de una pestaña en segundo plano. */
const MAX_DELTA_MS = 100;

export class WorkerCrew {
    private workers: WorkerState[] = [];
    private stations: StationConfig[];
    private lanes: Lanes;
    private _destroyed = false;
    private queue: Errand[] = [];

    constructor(layer: Container, users: WorkerUser[], stations: StationConfig[]) {
        this.stations = stations;
        this.lanes = computeLanes(stations);
        layer.sortableChildren = true;

        const shadowTex = getCharacterShadowTexture();

        for (const spec of buildCrewSpecs(users)) {
            const station = this.findStationForRole(spec.role);
            const laneY = spec.index % 2 === 0 ? this.lanes.low : this.lanes.high;
            const home = station
                ? getStandPoint(station, laneY, spec.dupOffsetX, this.lanes)
                : { x: 60 + spec.index * 90, y: laneY, facing: 'down' as CharacterDirection };

            const textures = getCharacterTextures({
                role: spec.role,
                shirtColor: spec.shirtColor,
                skinColor: spec.skinColor
            });

            const container = new Container();
            container.label = `Worker:${spec.id}`;

            const shadow = new Sprite(shadowTex);
            shadow.anchor.set(0.5, 0.5);
            shadow.y = -1;
            container.addChild(shadow);

            const sprite = new Sprite(textures.idle[0]);
            sprite.anchor.set(0.5, 1);
            container.addChild(sprite);

            layer.addChild(container);

            this.workers.push({
                spec,
                x: home.x,
                y: home.y,
                facing: home.facing,
                mode: 'idle',
                path: [],
                arriveFacing: home.facing,
                home,
                animMs: spec.index * 260, // desfasa el respiro entre operarios
                errand: 'none',
                dwellMs: 0,
                bubble: null,
                held: null,
                textures,
                container,
                sprite
            });
            this.syncVisual(this.workers[this.workers.length - 1]);
        }
    }

    get destroyed(): boolean {
        return this._destroyed;
    }

    private findStationForRole(role: WorkerRole): StationConfig | undefined {
        const wanted = ROLE_STATION[role];
        const exact = this.stations.find((s) => s.id === wanted);
        if (exact) return exact;
        if (role === 'impresor') {
            return this.stations.find((s) => s.id.startsWith('plotter') || s.id.startsWith('maquina_'));
        }
        return undefined;
    }

    /** Foto de solo lectura del estado de cada operario (para pruebas y para 4.3/4.4). */
    getWorkers(): WorkerSnapshot[] {
        return this.workers.map((w) => ({
            id: w.spec.id,
            name: w.spec.name,
            role: w.spec.role,
            x: w.x,
            y: w.y,
            mode: w.mode,
            facing: w.facing,
            bubble: w.bubble
        }));
    }

    getSpecs(): WorkerSpec[] {
        return this.workers.map((w) => w.spec);
    }

    /** Manda a un operario a la estación indicada (se detiene en el pasillo, frente a ella). */
    sendTo(workerId: string, stationId: StationId): boolean {
        const w = this.workers.find((x) => x.spec.id === workerId);
        const station = this.stations.find((s) => s.id === stationId);
        if (!w || !station || this._destroyed) return false;
        const laneY = w.spec.index % 2 === 0 ? this.lanes.low : this.lanes.high;
        const target = getStandPoint(station, laneY, w.spec.dupOffsetX, this.lanes);
        this.startPath(w, target);
        return true;
    }

    /** Devuelve al operario a su puesto habitual. */
    sendHome(workerId: string): boolean {
        const w = this.workers.find((x) => x.spec.id === workerId);
        if (!w || this._destroyed) return false;
        this.startPath(w, w.home);
        return true;
    }

    private startPath(w: WorkerState, target: StandPoint) {
        w.path = planPath({ x: w.x, y: w.y }, target);
        w.arriveFacing = target.facing;
        if (w.path.length === 0) {
            w.mode = 'idle';
            w.facing = target.facing;
        } else {
            w.mode = 'walk';
        }
    }

    /** Encarga un viaje a un rol. Si ya hay uno igual esperando se ignora; la cola tiene tope. */
    enqueueErrand(errand: Errand): void {
        if (this._destroyed) return;
        if (this.queue.some((e) => e.role === errand.role && e.stationId === errand.stationId)) return;
        this.queue.push(errand);
        while (this.queue.length > MAX_ERRAND_QUEUE) this.queue.shift();
    }

    getQueueLength(): number {
        return this.queue.length;
    }

    /** Pone o saca el objeto que el operario lleva en la mano (un dibujito de 8x6 px o similar). */
    private setHeld(w: WorkerState, kind: HeldKind | null) {
        if (w.held) {
            try { if (!w.held.destroyed) w.held.destroy(); } catch (_) {}
            w.held = null;
        }
        if (!kind || w.container.destroyed) return;
        const g = new Graphics();
        if (kind === 'rollo') {
            g.rect(0, 0, 4, 11).fill({ color: 0xf9a8d4 }).stroke({ width: 1, color: 0x9d174d });
        } else {
            const base = kind === 'rebotada' ? 0xef4444 : 0xfacc15;
            const edge = kind === 'rebotada' ? 0x7f1d1d : 0x854d0e;
            g.rect(0, 0, 9, 7).fill({ color: base }).stroke({ width: 1, color: edge });
            g.rect(0, -2, 4, 2).fill({ color: edge });
        }
        g.x = 5;
        g.y = kind === 'rollo' ? -17 : -13;
        w.container.addChild(g);
        w.held = g;
    }

    private processQueue() {
        if (this.queue.length === 0) return;
        this.queue = this.queue.filter((e) => {
            const ofRole = this.workers.filter((w) => w.spec.role === e.role);
            if (ofRole.length === 0) return false; // nadie con ese rol: se descarta
            const free = ofRole.find((w) => w.errand === 'none' && w.mode === 'idle');
            if (!free) return true; // todos ocupados: espera
            if (this.sendTo(free.spec.id, e.stationId)) {
                free.errand = 'going';
                free.bubble = e.text ? { text: e.text, tone: e.tone ?? 'info' } : null;
                this.setHeld(free, e.held ?? null);
            }
            return false;
        });
    }

    /** Avanza la simulación. `deltaMS` es el tiempo real del cuadro (ticker.deltaMS): la velocidad no depende de los FPS. */
    update(deltaMS: number) {
        if (this._destroyed) return;
        const dt = Math.max(0, Math.min(deltaMS, MAX_DELTA_MS));
        this.processQueue();

        for (const w of this.workers) {
            w.animMs += dt;

            if (w.mode === 'walk' && w.path.length > 0) {
                let budget = (w.spec.speedPxPerSec * dt) / 1000;
                while (budget > 0 && w.path.length > 0) {
                    const target = w.path[0];
                    const dx = target.x - w.x;
                    const dy = target.y - w.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 0.0001) {
                        w.facing = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
                    }
                    if (dist <= budget) {
                        w.x = target.x;
                        w.y = target.y;
                        budget -= dist;
                        w.path.shift();
                    } else {
                        w.x += (dx / dist) * budget;
                        w.y += (dy / dist) * budget;
                        budget = 0;
                    }
                }
                if (w.path.length === 0) {
                    w.mode = 'idle';
                    w.facing = w.arriveFacing;
                }
            }

            if (w.errand === 'going' && w.mode === 'idle') {
                w.errand = 'dwell';
                w.dwellMs = ERRAND_DWELL_MS;
            } else if (w.errand === 'dwell') {
                w.dwellMs -= dt;
                if (w.dwellMs <= 0) {
                    w.errand = 'returning';
                    w.bubble = null;
                    this.setHeld(w, null);
                    this.startPath(w, w.home);
                }
            } else if (w.errand === 'returning' && w.mode === 'idle') {
                w.errand = 'none';
            }

            this.syncVisual(w);
        }
    }

    private syncVisual(w: WorkerState) {
        if (w.sprite.destroyed) return;
        w.container.x = Math.round(w.x);
        w.container.y = Math.round(w.y);
        // Profundidad: quien está más abajo en el mapa se dibuja delante.
        w.container.zIndex = Math.round(w.y);

        if (w.mode === 'walk') {
            const frame = Math.floor((w.animMs / 1000) * WALK_FPS) % 4;
            w.sprite.texture = w.textures.walk[w.facing][frame];
        } else if (w.facing === 'down' && w.errand === 'dwell') {
            // Trabajando en la estación (herramienta del rol)
            w.sprite.texture = w.textures.work[Math.floor(w.animMs / 400) % 2];
        } else if (w.facing === 'down') {
            w.sprite.texture = w.textures.idle[Math.floor(w.animMs / IDLE_BREATH_MS) % 2];
        } else {
            w.sprite.texture = w.textures.walk[w.facing][0];
        }
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        for (const w of this.workers) {
            try {
                if (!w.container.destroyed) w.container.destroy({ children: true });
            } catch (_) {}
        }
        this.workers = [];
    }
}

export { CHARACTER_H };
