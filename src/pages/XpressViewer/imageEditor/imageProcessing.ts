/**
 * LuXius GimpStudio HD - Pixel Engine & Pre-Press Image Processing
 * 
 * High-performance Canvas/ImageData processing:
 * - Levels with dynamic histogram and Gamma LUT
 * - Tone & color corrections (Brightness, Contrast, Saturation, Vibrance, Temp)
 * - Magic Wand Alpha background removal with tolerance
 * - Unsharp Mask (Gran Formato print sharpening)
 * - Threshold binarization for vinyl plotters
 * - Mirror Bleed perimeter sangrado generator
 * - Layer compositing with native HTML5 canvas blend modes
 */

import { Layer, LevelsAdjustment, MirrorBleedParams, ToneAdjustments, UnsharpMaskParams } from './types';

export interface HistogramData {
    r: Uint32Array;
    g: Uint32Array;
    b: Uint32Array;
    lum: Uint32Array;
    max: number;
}

/**
 * Calculates 256-bin histogram for R, G, B and Luminance
 */
export function computeHistogram(imageData: ImageData): HistogramData {
    const r = new Uint32Array(256);
    const g = new Uint32Array(256);
    const b = new Uint32Array(256);
    const lum = new Uint32Array(256);
    const data = imageData.data;
    const len = data.length;

    let maxVal = 0;

    for (let i = 0; i < len; i += 4) {
        if (data[i + 3] === 0) continue; // Skip full transparent
        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];
        const l = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);

        r[red]++;
        g[green]++;
        b[blue]++;
        lum[l]++;

        if (lum[l] > maxVal) maxVal = lum[l];
    }

    return { r, g, b, lum, max: maxVal };
}

/**
 * Precomputes 256-byte Lookup Table (LUT) for GIMP-style Levels
 */
export function buildLevelsLUT(levels: LevelsAdjustment): Uint8ClampedArray {
    const lut = new Uint8ClampedArray(256);
    const { inLow, gamma, inHigh, outLow, outHigh } = levels;
    const invGamma = 1.0 / Math.max(0.01, gamma);
    const inRange = Math.max(1, inHigh - inLow);
    const outRange = outHigh - outLow;

    for (let i = 0; i < 256; i++) {
        // Clamp to input range
        let norm = (i - inLow) / inRange;
        norm = Math.max(0, Math.min(1, norm));

        // Apply gamma power curve
        const gammaCorrected = Math.pow(norm, invGamma);

        // Map to output range
        const finalVal = Math.round(outLow + gammaCorrected * outRange);
        lut[i] = Math.max(0, Math.min(255, finalVal));
    }

    return lut;
}

/**
 * Applies Levels adjustment to ImageData using precomputed LUT
 */
export function applyLevels(src: ImageData, dst: ImageData, lut: Uint8ClampedArray): void {
    const s = src.data;
    const d = dst.data;
    const len = s.length;

    for (let i = 0; i < len; i += 4) {
        d[i] = lut[s[i]];
        d[i + 1] = lut[s[i + 1]];
        d[i + 2] = lut[s[i + 2]];
        d[i + 3] = s[i + 3];
    }
}

/**
 * Applies professional tone adjustments:
 * Brightness, Contrast, Saturation, Vibrance, Exposure, Temperature
 */
export function applyToneAdjustments(
    src: ImageData, 
    dst: ImageData, 
    adj: ToneAdjustments
): void {
    const s = src.data;
    const d = dst.data;
    const len = s.length;

    const bMult = adj.brightness / 100 * 255;
    const cFactor = (259 * (adj.contrast + 255)) / (255 * (259 - adj.contrast));
    const satFactor = 1 + adj.saturation / 100;
    const expMult = Math.pow(2, adj.exposure / 50);
    const tempShift = adj.temperature; // -100 to 100
    const vibAmount = adj.vibrance / 100;

    for (let i = 0; i < len; i += 4) {
        let r = s[i];
        let g = s[i + 1];
        let b = s[i + 2];
        const a = s[i + 3];

        if (a === 0) {
            d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 0;
            continue;
        }

        // 1. Exposure
        if (adj.exposure !== 0) {
            r *= expMult;
            g *= expMult;
            b *= expMult;
        }

        // 2. Brightness
        if (adj.brightness !== 0) {
            r += bMult;
            g += bMult;
            b += bMult;
        }

        // 3. Contrast
        if (adj.contrast !== 0) {
            r = cFactor * (r - 128) + 128;
            g = cFactor * (g - 128) + 128;
            b = cFactor * (b - 128) + 128;
        }

        // 4. Temperature (White balance shift: warm = +red -blue, cool = -red +blue)
        if (tempShift !== 0) {
            r += tempShift * 0.4;
            b -= tempShift * 0.4;
        }

        // 5. Saturation & Vibrance
        const maxC = Math.max(r, Math.max(g, b));
        const minC = Math.min(r, Math.min(g, b));
        const currentSat = maxC === 0 ? 0 : (maxC - minC) / maxC;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Vibrance affects less saturated colors more
        const effectiveSat = satFactor + (1 - currentSat) * vibAmount;

        r = lum + (r - lum) * effectiveSat;
        g = lum + (g - lum) * effectiveSat;
        b = lum + (b - lum) * effectiveSat;

        d[i] = Math.max(0, Math.min(255, Math.round(r)));
        d[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        d[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
        d[i + 3] = a;
    }
}

/**
 * Unsharp Mask Filter (Sharpening for Plotters & Large Format Printing)
 */
export function applyUnsharpMask(
    src: ImageData,
    dst: ImageData,
    params: UnsharpMaskParams
): void {
    const { amount, radius, threshold } = params;

    // Fast separable gaussian approximation
    const blurred = fastGaussianBlur(src, radius);

    const s = src.data;
    const b = blurred.data;
    const d = dst.data;
    const len = s.length;
    const factor = amount / 100;

    for (let i = 0; i < len; i += 4) {
        const diffR = s[i] - b[i];
        const diffG = s[i + 1] - b[i + 1];
        const diffB = s[i + 2] - b[i + 2];

        if (Math.abs(diffR) >= threshold) {
            d[i] = Math.max(0, Math.min(255, s[i] + diffR * factor));
        } else {
            d[i] = s[i];
        }

        if (Math.abs(diffG) >= threshold) {
            d[i + 1] = Math.max(0, Math.min(255, s[i + 1] + diffG * factor));
        } else {
            d[i + 1] = s[i + 1];
        }

        if (Math.abs(diffB) >= threshold) {
            d[i + 2] = Math.max(0, Math.min(255, s[i + 2] + diffB * factor));
        } else {
            d[i + 2] = s[i + 2];
        }

        d[i + 3] = s[i + 3];
    }
}

/**
 * Fast Gaussian Blur for convolution / preview
 */
export function fastGaussianBlur(src: ImageData, radius: number): ImageData {
    const width = src.width;
    const height = src.height;
    const rInt = Math.max(1, Math.round(radius));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d')!;
    ctx.putImageData(src, 0, 0);

    const blurredCanvas = document.createElement('canvas');
    blurredCanvas.width = width;
    blurredCanvas.height = height;
    const bCtx = blurredCanvas.getContext('2d')!;
    bCtx.filter = `blur(${rInt}px)`;
    bCtx.drawImage(tempCanvas, 0, 0);

    return bCtx.getImageData(0, 0, width, height);
}

/**
 * Threshold / Binarization (1-bit pure Black and White for vinyl cutting)
 */
export function applyThreshold(src: ImageData, dst: ImageData, thresholdVal: number): void {
    const s = src.data;
    const d = dst.data;
    const len = s.length;

    for (let i = 0; i < len; i += 4) {
        const lum = Math.round(0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2]);
        const val = lum >= thresholdVal ? 255 : 0;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
        d[i + 3] = s[i + 3];
    }
}

/**
 * Magic Wand Background Removal (Color distance with tolerance and alpha feathering)
 * Removes matching colors across canvas or starting from a clicked pixel
 */
export function removeColorBackground(
    canvas: HTMLCanvasElement,
    targetColor: [number, number, number],
    tolerance: number,
    feather: number = 1
): void {
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const len = data.length;

    const [tr, tg, tb] = targetColor;
    const tolSq = tolerance * tolerance * 3;
    const featherSq = (tolerance + feather * 8) * (tolerance + feather * 8) * 3;

    for (let i = 0; i < len; i += 4) {
        const dr = data[i] - tr;
        const dg = data[i + 1] - tg;
        const db = data[i + 2] - tb;
        const distSq = dr * dr + dg * dg + db * db;

        if (distSq <= tolSq) {
            // Full transparent
            data[i + 3] = 0;
        } else if (distSq < featherSq && feather > 0) {
            // Feathered soft edge
            const alphaFactor = (distSq - tolSq) / (featherSq - tolSq);
            data[i + 3] = Math.round(data[i + 3] * alphaFactor);
        }
    }

    ctx.putImageData(imgData, 0, 0);
}

/**
 * Mirror Bleed Generator (Bolsillos y sangrados perimetrales en espejo)
 * Reflects the outer borders of the image outward by specified pixels,
 * preventing white borders during trimming or welding banner pockets.
 */
export function generateMirrorBleedCanvas(
    sourceCanvas: HTMLCanvasElement,
    params: MirrorBleedParams
): HTMLCanvasElement {
    const { topCm, bottomCm, leftCm, rightCm, dpi, mode, solidColor = '#FFFFFF' } = params;
    const pxPerCm = dpi / 2.54;

    const topPx = Math.round(topCm * pxPerCm);
    const bottomPx = Math.round(bottomCm * pxPerCm);
    const leftPx = Math.round(leftCm * pxPerCm);
    const rightPx = Math.round(rightCm * pxPerCm);

    const origW = sourceCanvas.width;
    const origH = sourceCanvas.height;
    const newW = origW + leftPx + rightPx;
    const newH = origH + topPx + bottomPx;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = newW;
    outCanvas.height = newH;
    const ctx = outCanvas.getContext('2d')!;

    if (mode === 'solid') {
        ctx.fillStyle = solidColor;
        ctx.fillRect(0, 0, newW, newH);
        ctx.drawImage(sourceCanvas, leftPx, topPx);
        return outCanvas;
    }

    // 1. Draw centered original image
    ctx.drawImage(sourceCanvas, leftPx, topPx);

    if (mode === 'mirror') {
        // TOP BLEED (Reflected vertically)
        if (topPx > 0) {
            ctx.save();
            ctx.translate(leftPx, topPx);
            ctx.scale(1, -1);
            ctx.drawImage(sourceCanvas, 0, 0, origW, Math.min(topPx, origH), 0, 0, origW, topPx);
            ctx.restore();
        }

        // BOTTOM BLEED (Reflected vertically)
        if (bottomPx > 0) {
            ctx.save();
            ctx.translate(leftPx, topPx + origH);
            ctx.scale(1, -1);
            ctx.drawImage(sourceCanvas, 0, Math.max(0, origH - bottomPx), origW, Math.min(bottomPx, origH), 0, -bottomPx, origW, bottomPx);
            ctx.restore();
        }

        // LEFT BLEED (Reflected horizontally)
        if (leftPx > 0) {
            ctx.save();
            ctx.translate(leftPx, topPx);
            ctx.scale(-1, 1);
            ctx.drawImage(sourceCanvas, 0, 0, Math.min(leftPx, origW), origH, 0, 0, leftPx, origH);
            ctx.restore();
        }

        // RIGHT BLEED (Reflected horizontally)
        if (rightPx > 0) {
            ctx.save();
            ctx.translate(leftPx + origW, topPx);
            ctx.scale(-1, 1);
            ctx.drawImage(sourceCanvas, Math.max(0, origW - rightPx), 0, Math.min(rightPx, origW), origH, -rightPx, 0, rightPx, origH);
            ctx.restore();
        }

        // CORNERS (Reflected both horizontally and vertically)
        // Top-Left
        if (topPx > 0 && leftPx > 0) {
            ctx.save();
            ctx.translate(leftPx, topPx);
            ctx.scale(-1, -1);
            ctx.drawImage(sourceCanvas, 0, 0, Math.min(leftPx, origW), Math.min(topPx, origH), 0, 0, leftPx, topPx);
            ctx.restore();
        }
        // Top-Right
        if (topPx > 0 && rightPx > 0) {
            ctx.save();
            ctx.translate(leftPx + origW, topPx);
            ctx.scale(-1, -1);
            ctx.drawImage(sourceCanvas, Math.max(0, origW - rightPx), 0, rightPx, topPx, -rightPx, 0, rightPx, topPx);
            ctx.restore();
        }
        // Bottom-Left
        if (bottomPx > 0 && leftPx > 0) {
            ctx.save();
            ctx.translate(leftPx, topPx + origH);
            ctx.scale(-1, -1);
            ctx.drawImage(sourceCanvas, 0, Math.max(0, origH - bottomPx), leftPx, bottomPx, 0, -bottomPx, leftPx, bottomPx);
            ctx.restore();
        }
        // Bottom-Right
        if (bottomPx > 0 && rightPx > 0) {
            ctx.save();
            ctx.translate(leftPx + origW, topPx + origH);
            ctx.scale(-1, -1);
            ctx.drawImage(sourceCanvas, Math.max(0, origW - rightPx), Math.max(0, origH - bottomPx), rightPx, bottomPx, -rightPx, -bottomPx, rightPx, bottomPx);
            ctx.restore();
        }
    }

    return outCanvas;
}

/**
 * Flips canvas horizontally or vertically
 */
export function flipCanvas(canvas: HTMLCanvasElement, horiz: boolean, vert: boolean): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d')!;

    ctx.save();
    ctx.translate(horiz ? canvas.width : 0, vert ? canvas.height : 0);
    ctx.scale(horiz ? -1 : 1, vert ? -1 : 1);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();

    return out;
}

/**
 * Composites all visible layers into a single flattened canvas
 */
export function flattenLayers(
    layers: Layer[],
    width: number,
    height: number
): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d')!;

    for (const layer of layers) {
        if (!layer.visible || layer.opacity <= 0) continue;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
        ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
        ctx.drawImage(layer.canvas, layer.x, layer.y, layer.width, layer.height);
        ctx.restore();
    }

    return out;
}
