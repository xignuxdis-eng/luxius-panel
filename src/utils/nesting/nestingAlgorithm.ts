/**
 * Luxius Nesting Algorithm - Strip Packing 2D Continuo (Skyline / Multi-Shelf Best-Fit)
 */

import type { NestingItem, PlacedPiece, NestingConfig, NestingResult } from './nestingTypes';
import { getBobinaUsefulWidth } from './nestingTypes';

function round3(n: number): number {
    return Math.round(n * 1000) / 1000;
}

export function runNesting(items: NestingItem[], userConfig?: Partial<NestingConfig>): NestingResult {
    const rollWidth = userConfig?.rollWidth ?? 1.52;
    const usefulWidth = userConfig?.usefulWidth ?? getBobinaUsefulWidth(rollWidth);
    const gap = userConfig?.gap ?? 0.01; // 10mm de sangría entre piezas
    const globalAllowRotation = userConfig?.allowRotation ?? true;
    const safetyMarginStart = userConfig?.safetyMarginStart ?? 0.01;

    interface FlatPiece {
        id: string | number;
        ot: string;
        label: string;
        w: number;
        h: number;
        allowRotation: boolean;
        orderId?: string | number;
        copyIndex: number;
        totalCopies: number;
    }

    const flatPieces: FlatPiece[] = [];
    let totalPiecesRequested = 0;
    let rawLinearMeters = 0;

    items.forEach(item => {
        const copies = Math.max(1, item.copies || 1);
        totalPiecesRequested += copies;

        const w = round3(item.width);
        const h = round3(item.height);

        let singlePieceMl = h;
        if (w <= usefulWidth && h <= usefulWidth) {
            singlePieceMl = Math.min(w, h);
        } else if (w <= usefulWidth) {
            singlePieceMl = h;
        } else if (h <= usefulWidth) {
            singlePieceMl = w;
        }
        rawLinearMeters += (singlePieceMl * copies) + (gap * (copies - 1));

        for (let i = 0; i < copies; i++) {
            flatPieces.push({
                id: `${item.id}_${i}`,
                ot: item.ot || String(item.id),
                label: item.label || item.ot || `Item ${item.id}`,
                w,
                h,
                allowRotation: item.allowRotation !== undefined ? item.allowRotation : globalAllowRotation,
                orderId: item.orderId || item.id,
                copyIndex: i + 1,
                totalCopies: copies
            });
        }
    });

    // Ordenar piezas por tamaño decreciente (heurística First-Fit Decreasing)
    flatPieces.sort((a, b) => {
        const maxDimA = Math.max(a.w, a.h);
        const maxDimB = Math.max(b.w, b.h);
        if (Math.abs(maxDimA - maxDimB) > 0.001) {
            return maxDimB - maxDimA;
        }
        const areaA = a.w * a.h;
        const areaB = b.w * b.h;
        return areaB - areaA;
    });

    interface Segment {
        x: number;
        width: number;
        y: number;
    }

    const skyline: Segment[] = [
        { x: 0, width: usefulWidth, y: safetyMarginStart }
    ];

    const placedPieces: PlacedPiece[] = [];
    const unplacedPieces: NestingItem[] = [];

    const findMinYForInterval = (startX: number, pieceW: number): number => {
        const endX = startX + pieceW;
        let highestY = 0;
        for (const seg of skyline) {
            const segEndX = seg.x + seg.width;
            if (seg.x < endX && segEndX > startX) {
                if (seg.y > highestY) {
                    highestY = seg.y;
                }
            }
        }
        return highestY;
    };

    const updateSkyline = (placedX: number, placedW: number, placedY: number, placedH: number) => {
        const newY = placedY + placedH + gap;
        const placedEndX = placedX + placedW;

        const newSkyline: Segment[] = [];

        for (const seg of skyline) {
            const segEndX = seg.x + seg.width;

            if (segEndX <= placedX || seg.x >= placedEndX) {
                newSkyline.push(seg);
            } else {
                if (seg.x < placedX) {
                    newSkyline.push({
                        x: seg.x,
                        width: placedX - seg.x,
                        y: seg.y
                    });
                }
                if (segEndX > placedEndX) {
                    newSkyline.push({
                        x: placedEndX,
                        width: segEndX - placedEndX,
                        y: seg.y
                    });
                }
            }
        }

        newSkyline.push({
            x: placedX,
            width: placedW,
            y: newY
        });

        newSkyline.sort((a, b) => a.x - b.x);

        const merged: Segment[] = [];
        for (const seg of newSkyline) {
            if (merged.length === 0) {
                merged.push({ ...seg });
            } else {
                const prev = merged[merged.length - 1];
                if (Math.abs(prev.x + prev.width - seg.x) < 0.001 && Math.abs(prev.y - seg.y) < 0.001) {
                    prev.width += seg.width;
                } else {
                    merged.push({ ...seg });
                }
            }
        }

        skyline.length = 0;
        skyline.push(...merged);
    };

    for (const piece of flatPieces) {
        interface PlacementCandidate {
            x: number;
            y: number;
            w: number;
            h: number;
            rotated: boolean;
        }

        const candidates: PlacementCandidate[] = [];

        const testOrientation = (pw: number, ph: number, isRotated: boolean) => {
            if (pw > usefulWidth) return;

            const testedX = new Set<number>();
            testedX.add(0);

            for (const seg of skyline) {
                testedX.add(seg.x);
                if (seg.x + seg.width - pw >= 0) {
                    testedX.add(round3(seg.x + seg.width - pw));
                }
            }

            for (const x of testedX) {
                if (x < 0 || x + pw > usefulWidth + 0.001) continue;
                const y = findMinYForInterval(x, pw);
                candidates.push({ x, y, w: pw, h: ph, rotated: isRotated });
            }
        };

        testOrientation(piece.w, piece.h, false);

        if (piece.allowRotation && Math.abs(piece.w - piece.h) > 0.001) {
            testOrientation(piece.h, piece.w, true);
        }

        if (candidates.length === 0) {
            unplacedPieces.push({
                id: piece.id,
                ot: piece.ot,
                label: piece.label,
                width: piece.w,
                height: piece.h,
                copies: 1,
                orderId: piece.orderId
            });
            continue;
        }

        candidates.sort((a, b) => {
            const endYA = a.y + a.h;
            const endYB = b.y + b.h;
            if (Math.abs(endYA - endYB) > 0.001) {
                return endYA - endYB;
            }
            if (Math.abs(a.y - b.y) > 0.001) {
                return a.y - b.y;
            }
            return a.x - b.x;
        });

        const best = candidates[0];

        placedPieces.push({
            id: piece.id,
            ot: piece.ot,
            label: piece.label,
            x: round3(best.x),
            y: round3(best.y),
            width: round3(best.w),
            height: round3(best.h),
            rotated: best.rotated,
            originalWidth: piece.w,
            originalHeight: piece.h,
            orderId: piece.orderId,
            copyIndex: piece.copyIndex,
            totalCopies: piece.totalCopies
        });

        updateSkyline(best.x, best.w, best.y, best.h);
    }

    let maxY = 0;
    let totalPieceArea = 0;
    for (const p of placedPieces) {
        const pieceMaxY = p.y + p.height;
        if (pieceMaxY > maxY) maxY = pieceMaxY;
        totalPieceArea += (p.originalWidth * p.originalHeight);
    }

    const linearMeters = round3(maxY);
    rawLinearMeters = round3(rawLinearMeters);
    const savingsMeters = round3(Math.max(0, rawLinearMeters - linearMeters));
    const savingsPercent = rawLinearMeters > 0 ? Math.round((savingsMeters / rawLinearMeters) * 100) : 0;
    const totalRollArea = usefulWidth * (linearMeters || 1);
    const areaEfficiency = totalRollArea > 0 ? Math.min(100, Math.round((totalPieceArea / totalRollArea) * 100)) : 0;

    return {
        rollWidth,
        usefulWidth,
        gap,
        linearMeters,
        rawLinearMeters,
        savingsMeters,
        savingsPercent,
        totalPiecesPlaced: placedPieces.length,
        totalPiecesRequested,
        pieces: placedPieces,
        unplacedPieces,
        areaEfficiency
    };
}
