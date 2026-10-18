// src/pages/XpressViewer/printsheeter/mosaicEngine.ts
// Port directo a TypeScript de los algoritmos matemáticos de mosaic_engine.py

import { ImageDataItem, Placement, LayoutResult } from './types';

export class MosaicEngine {
    constructor(
        public masterWidthMm: number,
        public masterHeightMm: number
    ) {}

    private getTargetDims(img: ImageDataItem, masterDpi: number): { targetW: number; targetH: number } {
        const dpiX = img.dpiX || 300;
        const dpiY = img.dpiY || dpiX;
        const wMm = img.forcedWMm != null ? img.forcedWMm : (img.widthPx / dpiX) * 25.4;
        const hMm = img.forcedHMm != null ? img.forcedHMm : (img.heightPx / dpiY) * 25.4;
        const targetW = Math.max(1, Math.round((wMm / 25.4) * masterDpi));
        const targetH = Math.max(1, Math.round((hMm / 25.4) * masterDpi));
        return { targetW, targetH };
    }

    private getMaxDims(list: ImageDataItem[], masterDpi: number): { maxW: number; maxH: number } {
        let maxW = 0;
        let maxH = 0;
        for (const img of list) {
            const { targetW, targetH } = this.getTargetDims(img, masterDpi);
            if (targetW > maxW) maxW = targetW;
            if (targetH > maxH) maxH = targetH;
        }
        return { maxW: maxW || 100, maxH: maxH || 100 };
    }

    private addCenterpiece(
        placements: Placement[],
        centerpiece: ImageDataItem | null | undefined,
        canvasWidthPx: number,
        canvasHeightPx: number,
        masterDpi: number
    ) {
        if (!centerpiece) return;
        const { targetW, targetH } = this.getTargetDims(centerpiece, masterDpi);
        const x = Math.round((canvasWidthPx - targetW) / 2);
        const y = Math.round((canvasHeightPx - targetH) / 2);

        placements.push({
            id: `cp-${centerpiece.id}`,
            imageId: centerpiece.id,
            url: centerpiece.url,
            filename: centerpiece.filename,
            x,
            y,
            w: targetW,
            h: targetH,
            rot90: false,
            opacity: 1.0,
            isCenterpiece: true
        });
    }

    public generateSpiral(
        images: ImageDataItem[],
        copies: number,
        spacingMm: number,
        masterDpi: number = 300,
        centerpiece?: ImageDataItem | null,
        evadeCenter: boolean = false,
        fadeBorders: boolean = false
    ): LayoutResult | null {
        if (copies <= 0 || !images.length) return null;
        const canvasWidthPx = Math.round((this.masterWidthMm / 25.4) * masterDpi);
        const canvasHeightPx = Math.round((this.masterHeightMm / 25.4) * masterDpi);
        const spacingPx = Math.round((spacingMm / 25.4) * masterDpi);

        const placements: Placement[] = [];
        const centerX = canvasWidthPx / 2;
        const centerY = canvasHeightPx / 2;
        const goldenAngle = 2.39996323; // Ángulo áureo
        const { maxW, maxH } = this.getMaxDims(images, masterDpi);
        const baseRadius = Math.sqrt((maxW / 2) ** 2 + (maxH / 2) ** 2);
        const c = baseRadius + spacingPx;

        for (let i = 0; i < copies; i++) {
            const img = images[i % images.length];
            const { targetW, targetH } = this.getTargetDims(img, masterDpi);
            const theta = i * goldenAngle;
            const r = c * Math.sqrt(i);
            const x = Math.round(centerX + r * Math.cos(theta) - targetW / 2);
            const y = Math.round(centerY + r * Math.sin(theta) - targetH / 2);

            placements.push({
                id: `p-${i}-${img.id}`,
                imageId: img.id,
                url: img.url,
                filename: img.filename,
                x,
                y,
                w: targetW,
                h: targetH,
                rot90: false,
                opacity: 1.0,
                isCenterpiece: false
            });
        }

        this.addCenterpiece(placements, centerpiece, canvasWidthPx, canvasHeightPx, masterDpi);
        return this.normalizeAndReturn(placements, canvasWidthPx, canvasHeightPx, masterDpi, evadeCenter, fadeBorders);
    }

    public generateFrame(
        images: ImageDataItem[],
        copies: number,
        spacingMm: number,
        masterDpi: number = 300,
        centerpiece?: ImageDataItem | null,
        evadeCenter: boolean = false,
        fadeBorders: boolean = false
    ): LayoutResult | null {
        if (copies <= 0 || !images.length) return null;
        const canvasWidthPx = Math.round((this.masterWidthMm / 25.4) * masterDpi);
        const canvasHeightPx = Math.round((this.masterHeightMm / 25.4) * masterDpi);
        const spacingPx = Math.round((spacingMm / 25.4) * masterDpi);
        const { maxW, maxH } = this.getMaxDims(images, masterDpi);

        const placements: Placement[] = [];
        const centerX = canvasWidthPx / 2;
        const centerY = canvasHeightPx / 2;
        const cols = Math.ceil(Math.sqrt(copies));
        const rows = Math.ceil(copies / cols);
        const totalW = cols * maxW + (cols - 1) * spacingPx;
        const totalH = rows * maxH + (rows - 1) * spacingPx;
        const startX = centerX - totalW / 2;
        const startY = centerY - totalH / 2;

        let count = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (count >= copies) break;
                const img = images[count % images.length];
                const { targetW, targetH } = this.getTargetDims(img, masterDpi);
                const cellX = startX + c * (maxW + spacingPx);
                const cellY = startY + r * (maxH + spacingPx);
                const x = Math.round(cellX + (maxW - targetW) / 2);
                const y = Math.round(cellY + (maxH - targetH) / 2);

                placements.push({
                    id: `frame-${count}-${img.id}`,
                    imageId: img.id,
                    url: img.url,
                    filename: img.filename,
                    x,
                    y,
                    w: targetW,
                    h: targetH,
                    rot90: false,
                    opacity: 1.0,
                    isCenterpiece: false
                });
                count++;
            }
        }

        this.addCenterpiece(placements, centerpiece, canvasWidthPx, canvasHeightPx, masterDpi);
        return this.normalizeAndReturn(placements, canvasWidthPx, canvasHeightPx, masterDpi, evadeCenter, fadeBorders);
    }

    public generateWaves(
        images: ImageDataItem[],
        copies: number,
        spacingMm: number,
        masterDpi: number = 300,
        centerpiece?: ImageDataItem | null,
        evadeCenter: boolean = false,
        fadeBorders: boolean = false
    ): LayoutResult | null {
        if (copies <= 0 || !images.length) return null;
        const canvasWidthPx = Math.round((this.masterWidthMm / 25.4) * masterDpi);
        const canvasHeightPx = Math.round((this.masterHeightMm / 25.4) * masterDpi);
        const spacingPx = Math.round((spacingMm / 25.4) * masterDpi);
        const { maxW, maxH } = this.getMaxDims(images, masterDpi);

        const placements: Placement[] = [];
        const centerX = canvasWidthPx / 2;
        const centerY = canvasHeightPx / 2;
        const cols = Math.ceil(Math.sqrt(copies));
        const rows = Math.ceil(copies / cols);
        const totalW = cols * maxW + (cols - 1) * spacingPx;
        const totalH = rows * maxH + (rows - 1) * spacingPx;
        const startX = centerX - totalW / 2;
        const startY = centerY - totalH / 2;
        const amplitude = maxH / 2 + spacingPx;
        const frequency = (2 * Math.PI) / Math.max(1, cols / 2);

        let count = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (count >= copies) break;
                const img = images[count % images.length];
                const { targetW, targetH } = this.getTargetDims(img, masterDpi);
                const cellX = startX + c * (maxW + spacingPx);
                const yOffset = Math.sin(c * frequency) * amplitude;
                const cellY = startY + r * (maxH + spacingPx * 2) + yOffset;
                const x = Math.round(cellX + (maxW - targetW) / 2);
                const y = Math.round(cellY + (maxH - targetH) / 2);

                placements.push({
                    id: `waves-${count}-${img.id}`,
                    imageId: img.id,
                    url: img.url,
                    filename: img.filename,
                    x,
                    y,
                    w: targetW,
                    h: targetH,
                    rot90: false,
                    opacity: 1.0,
                    isCenterpiece: false
                });
                count++;
            }
        }

        this.addCenterpiece(placements, centerpiece, canvasWidthPx, canvasHeightPx, masterDpi);
        return this.normalizeAndReturn(placements, canvasWidthPx, canvasHeightPx, masterDpi, evadeCenter, fadeBorders);
    }

    public generateHalftone(
        images: ImageDataItem[],
        copies: number,
        spacingMm: number,
        masterDpi: number = 300,
        centerpiece?: ImageDataItem | null,
        evadeCenter: boolean = false,
        fadeBorders: boolean = false
    ): LayoutResult | null {
        if (copies <= 0 || !images.length) return null;
        const canvasWidthPx = Math.round((this.masterWidthMm / 25.4) * masterDpi);
        const canvasHeightPx = Math.round((this.masterHeightMm / 25.4) * masterDpi);
        const spacingPx = Math.round((spacingMm / 25.4) * masterDpi);
        const { maxW, maxH } = this.getMaxDims(images, masterDpi);

        const placements: Placement[] = [];
        const centerX = canvasWidthPx / 2;
        const centerY = canvasHeightPx / 2;
        const gridDim = Math.ceil(Math.sqrt(copies));
        const startX = centerX - (gridDim * (maxW + spacingPx)) / 2;
        const startY = centerY - (gridDim * (maxH + spacingPx)) / 2;

        let count = 0;
        for (let row = 0; row < gridDim; row++) {
            for (let col = 0; col < gridDim; col++) {
                if (count >= copies) break;
                const img = images[count % images.length];
                const { targetW, targetH } = this.getTargetDims(img, masterDpi);
                const cellX = startX + col * (maxW + spacingPx);
                const cellY = startY + row * (maxH + spacingPx);

                const distanceX = Math.abs(col - gridDim / 2) / (gridDim / 2 || 1);
                const distanceY = Math.abs(row - gridDim / 2) / (gridDim / 2 || 1);
                const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
                const scale = Math.max(0.2, 1.0 - distance * 0.7);

                const x = Math.round(cellX + (maxW - targetW) / 2);
                const y = Math.round(cellY + (maxH - targetH) / 2);

                placements.push({
                    id: `halftone-${count}-${img.id}`,
                    imageId: img.id,
                    url: img.url,
                    filename: img.filename,
                    x,
                    y,
                    w: targetW,
                    h: targetH,
                    rot90: false,
                    opacity: Math.max(0.15, Math.min(1.0, scale)),
                    isCenterpiece: false
                });
                count++;
            }
        }

        this.addCenterpiece(placements, centerpiece, canvasWidthPx, canvasHeightPx, masterDpi);
        return this.normalizeAndReturn(placements, canvasWidthPx, canvasHeightPx, masterDpi, evadeCenter, fadeBorders);
    }

    public generateDiagonals(
        images: ImageDataItem[],
        copies: number,
        spacingMm: number,
        masterDpi: number = 300,
        centerpiece?: ImageDataItem | null,
        evadeCenter: boolean = false,
        fadeBorders: boolean = false
    ): LayoutResult | null {
        if (copies <= 0 || !images.length) return null;
        const canvasWidthPx = Math.round((this.masterWidthMm / 25.4) * masterDpi);
        const canvasHeightPx = Math.round((this.masterHeightMm / 25.4) * masterDpi);
        const spacingPx = Math.round((spacingMm / 25.4) * masterDpi);
        const { maxW, maxH } = this.getMaxDims(images, masterDpi);

        const placements: Placement[] = [];
        const centerX = canvasWidthPx / 2;
        const centerY = canvasHeightPx / 2;
        const cols = Math.ceil(Math.sqrt(copies)) + 2;
        const rows = Math.ceil(copies / cols) + 2;
        const totalW = cols * maxW + (cols - 1) * spacingPx;
        const totalH = rows * maxH + (rows - 1) * spacingPx;
        const startX = centerX - totalW / 2;
        const startY = centerY - totalH / 2;

        let count = 0;
        for (let r = 0; r < rows; r++) {
            const rowOffset = r % 2 !== 0 ? maxW / 2 + spacingPx / 2 : 0;
            for (let c = 0; c < cols; c++) {
                if (count >= copies) break;
                const img = images[count % images.length];
                const { targetW, targetH } = this.getTargetDims(img, masterDpi);
                const cellX = startX + c * (maxW + spacingPx) + rowOffset;
                const cellY = startY + r * (maxH + spacingPx);
                const x = Math.round(cellX + (maxW - targetW) / 2);
                const y = Math.round(cellY + (maxH - targetH) / 2);

                placements.push({
                    id: `diag-${count}-${img.id}`,
                    imageId: img.id,
                    url: img.url,
                    filename: img.filename,
                    x,
                    y,
                    w: targetW,
                    h: targetH,
                    rot90: false,
                    opacity: 1.0,
                    isCenterpiece: false
                });
                count++;
            }
        }

        this.addCenterpiece(placements, centerpiece, canvasWidthPx, canvasHeightPx, masterDpi);
        return this.normalizeAndReturn(placements, canvasWidthPx, canvasHeightPx, masterDpi, evadeCenter, fadeBorders);
    }

    public generateSpiralLines(
        images: ImageDataItem[],
        copies: number,
        spacingMm: number,
        masterDpi: number = 300,
        centerpiece?: ImageDataItem | null,
        evadeCenter: boolean = false,
        fadeBorders: boolean = false
    ): LayoutResult | null {
        if (copies <= 0 || !images.length) return null;
        const canvasWidthPx = Math.round((this.masterWidthMm / 25.4) * masterDpi);
        const canvasHeightPx = Math.round((this.masterHeightMm / 25.4) * masterDpi);
        const spacingPx = Math.round((spacingMm / 25.4) * masterDpi);
        const { maxW } = this.getMaxDims(images, masterDpi);

        const placements: Placement[] = [];
        const centerX = canvasWidthPx / 2;
        const centerY = canvasHeightPx / 2;
        const arms = Math.max(2, Math.min(8, Math.round(Math.sqrt(copies) / 2)));
        const itemsPerArm = Math.ceil(copies / arms);
        const b = ((maxW + spacingPx) / (2 * Math.PI)) * arms;

        let count = 0;
        for (let arm = 0; arm < arms; arm++) {
            const armOffset = ((2 * Math.PI) / arms) * arm;
            for (let i = 1; i <= itemsPerArm; i++) {
                if (count >= copies) break;
                const img = images[count % images.length];
                const { targetW, targetH } = this.getTargetDims(img, masterDpi);
                const t = i * (Math.PI / 4);
                const theta = t + armOffset;
                const r = b * t;
                const x = Math.round(centerX + r * Math.cos(theta) - targetW / 2);
                const y = Math.round(centerY + r * Math.sin(theta) - targetH / 2);

                placements.push({
                    id: `spiral_lines-${count}-${img.id}`,
                    imageId: img.id,
                    url: img.url,
                    filename: img.filename,
                    x,
                    y,
                    w: targetW,
                    h: targetH,
                    rot90: false,
                    opacity: 1.0,
                    isCenterpiece: false
                });
                count++;
            }
        }

        this.addCenterpiece(placements, centerpiece, canvasWidthPx, canvasHeightPx, masterDpi);
        return this.normalizeAndReturn(placements, canvasWidthPx, canvasHeightPx, masterDpi, evadeCenter, fadeBorders);
    }

    public generatePhotoMosaic(
        images: ImageDataItem[],
        copies: number,
        centerpiece: ImageDataItem,
        centerpiecePixels: Uint8ClampedArray | null,
        cpCols: number,
        cpRows: number,
        masterDpi: number = 300
    ): LayoutResult | null {
        if (copies <= 0 || !images.length || !centerpiece || !centerpiecePixels) return null;
        const canvasWidthPx = Math.round((this.masterWidthMm / 25.4) * masterDpi);
        const canvasHeightPx = Math.round((this.masterHeightMm / 25.4) * masterDpi);

        const cols = cpCols;
        const rows = cpRows;
        const cellW = Math.round(canvasWidthPx / Math.max(1, cols));
        const cellH = Math.round(canvasHeightPx / Math.max(1, rows));

        const placements: Placement[] = [];
        const palette = images.map((img) => ({
            img,
            color: img.avgColor || [200, 200, 200]
        }));

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const pixelIndex = (r * cols + c) * 4;
                const targetR = centerpiecePixels[pixelIndex];
                const targetG = centerpiecePixels[pixelIndex + 1];
                const targetB = centerpiecePixels[pixelIndex + 2];

                let bestMatch = images[0];
                let bestDist = Infinity;
                for (const item of palette) {
                    const dist =
                        (targetR - item.color[0]) ** 2 +
                        (targetG - item.color[1]) ** 2 +
                        (targetB - item.color[2]) ** 2;
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestMatch = item.img;
                    }
                }

                placements.push({
                    id: `pm-${r}-${c}`,
                    imageId: bestMatch.id,
                    url: bestMatch.url,
                    filename: bestMatch.filename,
                    x: c * cellW,
                    y: r * cellH,
                    w: cellW,
                    h: cellH,
                    rot90: false,
                    opacity: 1.0,
                    isCenterpiece: false
                });
            }
        }

        return {
            canvasWidthPx,
            canvasHeightPx,
            canvasWidthMm: this.masterWidthMm,
            canvasHeightMm: this.masterHeightMm,
            masterDpi,
            placements,
            evadeCenter: false,
            fadeBorders: false
        };
    }

    private normalizeAndReturn(
        placements: Placement[],
        canvasWidthPx: number,
        canvasHeightPx: number,
        masterDpi: number,
        evadeCenter: boolean,
        fadeBorders: boolean
    ): LayoutResult {
        let finalPlacements = placements;

        // Evasión de Centro
        if (evadeCenter) {
            const centerpieces = placements.filter((p) => p.isCenterpiece);
            if (centerpieces.length > 0) {
                const centerBboxes = centerpieces.map((cp) => {
                    const pad = cp.w * 0.08;
                    return {
                        x1: cp.x - pad,
                        y1: cp.y - pad,
                        x2: cp.x + cp.w + pad,
                        y2: cp.y + cp.h + pad
                    };
                });

                finalPlacements = placements.filter((p) => {
                    if (p.isCenterpiece) return true;
                    const pX2 = p.x + p.w;
                    const pY2 = p.y + p.h;
                    for (const bbox of centerBboxes) {
                        if (p.x < bbox.x2 && pX2 > bbox.x1 && p.y < bbox.y2 && pY2 > bbox.y1) {
                            return false; // Colisionó con el centro -> se evade
                        }
                    }
                    return true;
                });
            }
        }

        // Desvanecimiento radial de bordes
        if (fadeBorders && finalPlacements.length > 0) {
            const cx = canvasWidthPx / 2.0;
            const cy = canvasHeightPx / 2.0;
            let maxR = 1.0;

            for (const p of finalPlacements) {
                if (!p.isCenterpiece) {
                    const itemCx = p.x + p.w / 2.0;
                    const itemCy = p.y + p.h / 2.0;
                    const dist = Math.hypot(itemCx - cx, itemCy - cy);
                    if (dist > maxR) maxR = dist;
                }
            }

            for (const p of finalPlacements) {
                if (!p.isCenterpiece) {
                    const itemCx = p.x + p.w / 2.0;
                    const itemCy = p.y + p.h / 2.0;
                    const dist = Math.hypot(itemCx - cx, itemCy - cy);
                    const fade = Math.max(0.0, 1.0 - dist / maxR);
                    p.opacity = Math.min(p.opacity, fade);
                }
            }
        }

        return {
            canvasWidthPx,
            canvasHeightPx,
            canvasWidthMm: this.masterWidthMm,
            canvasHeightMm: this.masterHeightMm,
            masterDpi,
            placements: finalPlacements,
            evadeCenter,
            fadeBorders
        };
    }
}
