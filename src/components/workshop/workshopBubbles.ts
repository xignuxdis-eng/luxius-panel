// workshopBubbles.ts - Globos de texto sobre los operarios (Fase 3, sub-etapa 4.4)
// Se dibujan en la capa de interfaz (UILayer, a resolución real de pantalla) para que el texto sea nítido
// y legible (12 px reales). Cada cuadro se reposicionan sobre la cabeza del operario.

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { BubbleTone, WorkerSnapshot } from './workshopWorkers';
import { CHARACTER_H } from './workshopCharacters';

const TONE_COLOR: Record<BubbleTone, number> = {
    ok: 0x22c55e,
    warn: 0xef4444,
    info: 0x38bdf8
};

const FONT_PX = 12;
const PAD_X = 6;
const PAD_Y = 3;

interface BubbleItem {
    root: Container;
    bg: Graphics;
    label: Text;
    text: string;
    tone: BubbleTone | null;
}

export class WorkerBubbles {
    private items = new Map<string, BubbleItem>();
    private layer: Container;
    private style = new TextStyle({
        fontFamily: 'monospace',
        fontSize: FONT_PX,
        fontWeight: 'bold',
        fill: 0xf8fafc
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
        const item: BubbleItem = { root, bg, label, text: '', tone: null };
        this.items.set(id, item);
        return item;
    }

    /** Reposiciona/actualiza los globos. `scale` es la escala del mundo; `screenW` el ancho visible en px reales. */
    sync(workers: WorkerSnapshot[], scale: number, screenW: number) {
        const placed: Array<{ item: BubbleItem; x: number; y: number; bw: number }> = [];
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
                const bw = Math.ceil(item.label.width) + PAD_X * 2;
                const bh = FONT_PX + PAD_Y * 2 + 2;
                item.bg.clear();
                item.bg.roundRect(0, 0, bw, bh, 4);
                item.bg.fill({ color: 0x090d16, alpha: 1 });
                item.bg.stroke({ width: 1.5, color: TONE_COLOR[w.bubble.tone] });
            }

            const bw = item.bg.width;
            const bh = FONT_PX + PAD_Y * 2 + 2;
            let x = Math.round(w.x * scale - bw / 2);
            x = Math.max(2, Math.min(Math.round(screenW) - bw - 2, x));
            const y = Math.round((w.y - CHARACTER_H) * scale - bh - 4);
            item.root.x = x;
            item.root.visible = true;
            placed.push({ item, x, y: Math.max(2, y), bw });
        }

        // Anti-solape: si dos globos se pisan, el segundo (de izquierda a derecha) sube sobre el anterior.
        const bh = FONT_PX + PAD_Y * 2 + 2;
        placed.sort((a, b) => a.x - b.x);
        for (let i = 0; i < placed.length; i++) {
            let y = placed[i].y;
            for (let tries = 0; tries < placed.length; tries++) {
                const clash = placed.slice(0, i).find(
                    (p) => p.x < placed[i].x + placed[i].bw && placed[i].x < p.x + p.bw && Math.abs(p.y - y) < bh + 2
                );
                if (!clash) break;
                y = clash.y - bh - 2;
            }
            placed[i].y = Math.max(2, y);
            placed[i].item.root.y = placed[i].y;
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
