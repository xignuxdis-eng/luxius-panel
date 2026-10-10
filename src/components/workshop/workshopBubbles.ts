// workshopBubbles.ts - Globos de texto sobre los operarios (Fase 3, sub-etapas 4.4 y 4.6)
// Se dibujan en la capa de interfaz (UILayer, a resolución real de pantalla) para que el texto sea nítido
// y legible (12 px reales). Cada cuadro se reposicionan sobre la cabeza del operario.
// Las frases largas (charlas) se parten en varias líneas.

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { BubbleTone, WorkerSnapshot } from './workshopWorkers';
import { CHARACTER_H } from './workshopCharacters';

const TONE_COLOR: Record<BubbleTone, number> = {
    ok: 0x22c55e,
    warn: 0xef4444,
    info: 0x38bdf8,
    chat: 0xfacc15
};

const FONT_PX = 12;
const PAD_X = 6;
const PAD_Y = 3;
const WRAP_PX = 230;

interface BubbleItem {
    root: Container;
    bg: Graphics;
    label: Text;
    text: string;
    tone: BubbleTone | null;
    /** Tamaño real del globo (el alto cambia si el texto ocupa más de una línea). */
    w: number;
    h: number;
}

interface Placed {
    item: BubbleItem;
    x: number;
    y: number;
}

export class WorkerBubbles {
    private items = new Map<string, BubbleItem>();
    private layer: Container;
    private style = new TextStyle({
        fontFamily: 'monospace',
        fontSize: FONT_PX,
        fontWeight: 'bold',
        fill: 0xf8fafc,
        wordWrap: true,
        wordWrapWidth: WRAP_PX
    });

    constructor(layer: Container) {
        this.layer = layer;
    }

    private create(id: string): BubbleItem {
        const root = new Container();
        root.label = `Bubble:${id}`;
        const bg = new Graphics();
        const label = new Text({ text: '', style: this.style });
        label.x = PAD_X;
        label.y = PAD_Y;
        root.addChild(bg);
        root.addChild(label);
        this.layer.addChild(root);
        const item: BubbleItem = { root, bg, label, text: '', tone: null, w: 0, h: 0 };
        this.items.set(id, item);
        return item;
    }

    /** Reposiciona/actualiza los globos. `scale` es la escala del mundo; `screenW` el ancho visible en px reales. */
    sync(workers: WorkerSnapshot[], scale: number, screenW: number) {
        const placed: Placed[] = [];
        for (const w of workers) {
            const item = this.items.get(w.id) ?? (w.bubble ? this.create(w.id) : undefined);
            if (!item || item.root.destroyed) continue;

            if (!w.bubble) {
                item.root.visible = false;
                continue;
            }

            if (item.text !== w.bubble.text || item.tone !== w.bubble.tone) {
                item.text = w.bubble.text;
                item.tone = w.bubble.tone;
                item.label.text = w.bubble.text;
                item.w = Math.ceil(item.label.width) + PAD_X * 2;
                item.h = Math.ceil(item.label.height) + PAD_Y * 2 + 2;
                item.bg.clear();
                item.bg.roundRect(0, 0, item.w, item.h, 4);
                item.bg.fill({ color: 0x090d16, alpha: 1 });
                item.bg.stroke({ width: 1.5, color: TONE_COLOR[w.bubble.tone] });
            }

            let x = Math.round(w.x * scale - item.w / 2);
            x = Math.max(2, Math.min(Math.round(screenW) - item.w - 2, x));
            const y = Math.round((w.y - CHARACTER_H) * scale - item.h - 4);
            item.root.x = x;
            item.root.visible = true;
            placed.push({ item, x, y: Math.max(2, y) });
        }

        // Anti-solape: si dos globos se pisan, el segundo (de izquierda a derecha) sube sobre el anterior.
        placed.sort((a, b) => a.x - b.x);
        for (let i = 0; i < placed.length; i++) {
            const cur = placed[i];
            let y = cur.y;
            for (let tries = 0; tries < placed.length; tries++) {
                const clash = placed
                    .slice(0, i)
                    .find(
                        (p) =>
                            p.x < cur.x + cur.item.w &&
                            cur.x < p.x + p.item.w &&
                            y < p.y + p.item.h + 2 &&
                            p.y < y + cur.item.h + 2
                    );
                if (!clash) break;
                y = clash.y - cur.item.h - 2;
            }
            cur.y = Math.max(2, y);
            cur.item.root.y = cur.y;
        }
    }

    destroy() {
        for (const item of this.items.values()) {
            try {
                if (!item.root.destroyed) item.root.destroy({ children: true });
            } catch (_) {}
        }
        this.items.clear();
    }
}
