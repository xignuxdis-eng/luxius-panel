// src/pages/XpressViewer/printsheeter/nestingEngine.ts
// Motor de Nesting 2D por ancho de bobina y análisis de materiales (port de layout_engine.py y material_analyzer.py)

import { ImageDataItem, Placement, LayoutResult, MaterialAnalysisResult, MaterialRollEstimate } from './types';

export class NestingEngine {
    constructor(
        public rollWidthMm: number,
        public spacingMm: number,
        public allowRotation: boolean = false
    ) {}

    public calculateLayout(
        images: ImageDataItem[],
        masterDpi: number = 300
    ): LayoutResult | null {
        if (!images.length) return null;

        const rollWidthPx = Math.round((this.rollWidthMm / 25.4) * masterDpi);
        const spacingPx = Math.round((this.spacingMm / 25.4) * masterDpi);

        // Preparamos items calculando medidas físicas y píxeles al DPI maestro
        const items = images.map((img, idx) => {
            const dpiX = img.dpiX || 300;
            const dpiY = img.dpiY || dpiX;
            const wMm = img.forcedWMm != null ? img.forcedWMm : (img.widthPx / dpiX) * 25.4;
            const hMm = img.forcedHMm != null ? img.forcedHMm : (img.heightPx / dpiY) * 25.4;
            let targetW = Math.max(1, Math.round((wMm / 25.4) * masterDpi));
            let targetH = Math.max(1, Math.round((hMm / 25.4) * masterDpi));
            let rot90 = false;

            if (this.allowRotation) {
                if (targetW > targetH) {
                    const temp = targetW;
                    targetW = targetH;
                    targetH = temp;
                    rot90 = true;
                }
            }

            if (targetW > rollWidthPx) {
                if (this.allowRotation && targetH <= rollWidthPx) {
                    const temp = targetW;
                    targetW = targetH;
                    targetH = temp;
                    rot90 = !rot90;
                }
            }

            return {
                id: `nest-${idx}-${img.id}`,
                img,
                w: targetW,
                h: targetH,
                rot90,
                originalWMm: wMm,
                originalHMm: hMm
            };
        });

        // 1. Ordenar piezas por altura descendente (heurística First-Fit Decreasing Height)
        items.sort((a, b) => b.h - a.h);

        const placements: Placement[] = [];
        let currentX = 0;
        let currentY = 0;
        let rowHeight = 0;
        let maxXUsed = 0;

        let totalPiecesAreaPx = 0;

        for (const item of items) {
            // Si la pieza excede el ancho de la bobina en la fila actual, pasa a la siguiente fila
            if (currentX + item.w > rollWidthPx && currentX > 0) {
                currentX = 0;
                currentY += rowHeight + spacingPx;
                rowHeight = 0;
            }

            placements.push({
                id: item.id,
                imageId: item.img.id,
                url: item.img.url,
                filename: item.img.filename,
                x: currentX,
                y: currentY,
                w: item.w,
                h: item.h,
                rot90: item.rot90,
                opacity: 1.0,
                isCenterpiece: false
            });

            totalPiecesAreaPx += item.w * item.h;
            rowHeight = Math.max(rowHeight, item.h);
            currentX += item.w + spacingPx;
            maxXUsed = Math.max(maxXUsed, currentX - spacingPx);
        }

        const totalHeightPx = currentY + rowHeight;
        const totalHeightMm = (totalHeightPx / masterDpi) * 25.4;
        const totalLinearMeters = Math.round((totalHeightMm / 1000) * 100) / 100;

        const totalUsedM2 = Math.round(((this.rollWidthMm / 1000) * (totalHeightMm / 1000)) * 100) / 100;
        const netPiecesM2 = Math.round(((totalPiecesAreaPx / (masterDpi * masterDpi)) * (25.4 * 25.4 / 1000000)) * 100) / 100;
        const wasteM2 = Math.max(0, Math.round((totalUsedM2 - netPiecesM2) * 100) / 100);
        const efficiencyPercent = totalUsedM2 > 0 ? Math.round((netPiecesM2 / totalUsedM2) * 100) : 100;

        return {
            canvasWidthPx: Math.max(maxXUsed, rollWidthPx),
            canvasHeightPx: Math.max(10, totalHeightPx),
            canvasWidthMm: this.rollWidthMm,
            canvasHeightMm: totalHeightMm,
            masterDpi,
            placements,
            totalLinearMeters,
            efficiencyPercent,
            wasteM2,
            totalUsedM2
        };
    }

    /**
     * Compara el consumo de material entre bobinas estándar de mercado
     */
    public static compareRolls(
        images: ImageDataItem[],
        spacingMm: number = 10,
        allowRotation: boolean = true,
        candidateRollsMm: number[] = [1070, 1370, 1520, 1600]
    ): MaterialAnalysisResult {
        if (!images.length) {
            return {
                totalFiles: 0,
                totalAreaM2: 0,
                recommendedRoll: '1.37m',
                estimates: []
            };
        }

        const estimates: MaterialRollEstimate[] = [];
        let totalNetM2 = 0;

        for (const img of images) {
            const dpiX = img.dpiX || 300;
            const dpiY = img.dpiY || dpiX;
            const wMm = img.forcedWMm != null ? img.forcedWMm : (img.widthPx / dpiX) * 25.4;
            const hMm = img.forcedHMm != null ? img.forcedHMm : (img.heightPx / dpiY) * 25.4;
            totalNetM2 += (wMm / 1000) * (hMm / 1000);
        }

        let bestIndex = 0;
        let minWasteM2 = Infinity;

        candidateRollsMm.forEach((rollMm, idx) => {
            const engine = new NestingEngine(rollMm, spacingMm, allowRotation);
            const res = engine.calculateLayout(images, 150); // cálculo rápido a 150 DPI
            if (res) {
                const rollWidthM = rollMm / 1000;
                const rollHeightM = res.canvasHeightMm / 1000;
                const usedM2 = rollWidthM * rollHeightM;
                const wasteM2 = Math.max(0, usedM2 - totalNetM2);
                const wastePercent = usedM2 > 0 ? Math.round((wasteM2 / usedM2) * 100) : 0;

                estimates.push({
                    rollWidthCm: rollMm / 10,
                    linearMeters: Math.round(rollHeightM * 100) / 100,
                    areaM2: Math.round(usedM2 * 100) / 100,
                    usedM2: Math.round(totalNetM2 * 100) / 100,
                    wastePercent,
                    isRecommended: false
                });

                if (wasteM2 < minWasteM2) {
                    minWasteM2 = wasteM2;
                    bestIndex = idx;
                }
            }
        });

        if (estimates[bestIndex]) {
            estimates[bestIndex].isRecommended = true;
        }

        const rec = estimates[bestIndex] ? `${(estimates[bestIndex].rollWidthCm / 100).toFixed(2)}m` : '1.37m';

        return {
            totalFiles: images.length,
            totalAreaM2: Math.round(totalNetM2 * 100) / 100,
            recommendedRoll: rec,
            estimates
        };
    }
}
