import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { extractCdrThumbnail } from '@/utils/cdrPreview'
import { generateVectorCard } from '@/utils/vectorPreview'

try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    }
} catch (e) {
    console.warn("[Luxius-PDF] Error configurando PDF worker:", e);
}

export interface FileMetadata {
    width: number;
    height: number;
    dpi: number;
    format: string;
    colorMode: string;
    pageCount?: number;
    thumbnailUrl?: string;
}

export const getPdfThumbnail = async (_file: File | ArrayBuffer | null, pageNum: number = 1, widthCm?: number, heightCm?: number): Promise<string> => {
    const timeoutMs = 3500;
    try {
        if (_file) {
            // For huge files (> 25MB), skip PDF.js canvas render in browser to prevent OOM hang
            const isHugeFile = (_file instanceof File && _file.size > 25 * 1024 * 1024) ||
                              (!(_file instanceof File) && _file.byteLength > 25 * 1024 * 1024);
            if (!isHugeFile) {
                try {
                    const renderPromise = (async () => {
                        const data = (_file instanceof File) ? await _file.arrayBuffer() : _file.slice(0);
                        const loadingTask = pdfjsLib.getDocument({ data });
                        const pdf = await loadingTask.promise;
                        const page = await pdf.getPage(Math.min(pageNum, pdf.numPages));

                        // Lightweight thumbnail resolution: target 400px max dimension
                        const unscaledViewport = page.getViewport({ scale: 1.0 });
                        const targetMaxDim = 400;
                        const scale = Math.min(1.5, Math.max(0.4, targetMaxDim / Math.max(unscaledViewport.width, unscaledViewport.height)));
                        const viewport = page.getViewport({ scale });

                        const renderCanvas = document.createElement('canvas');
                        renderCanvas.width = viewport.width;
                        renderCanvas.height = viewport.height;
                        const renderCtx = renderCanvas.getContext('2d');
                        if (renderCtx) {
                            renderCtx.fillStyle = '#ffffff';
                            renderCtx.fillRect(0, 0, viewport.width, viewport.height);

                            const renderTask = page.render({
                                canvas: renderCanvas,
                                canvasContext: renderCtx,
                                viewport: viewport
                            });
                            await renderTask.promise;

                            return renderCanvas.toDataURL('image/webp', 0.80);
                        }
                        return '';
                    })();

                    const timeoutPromise = new Promise<string>((resolve) =>
                        setTimeout(() => resolve(''), timeoutMs)
                    );

                    const result = await Promise.race([renderPromise, timeoutPromise]);
                    if (result) return result;
                } catch (pdfErr) {
                    console.warn("[Luxius-PDF] Falló renderizado real, usando fallback", pdfErr);
                }
            }
        }

        // Fallback card if rendering failed, timed out or file was too large
        const w = 400, h = 500;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(20, 20, w - 40, 120);
        ctx.fillStyle = '#e94560';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('📄', w / 2, 110);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(`Página ${pageNum}`, w / 2, 220);
        if (widthCm && heightCm) {
            ctx.fillStyle = '#666';
            ctx.font = '18px Arial';
            ctx.fillText(`${widthCm} × ${heightCm} cm`, w / 2, 260);
        }
        return canvas.toDataURL('image/webp', 0.85);
    } catch (e) {
        console.warn('[Luxius-PDF] Error en generación de miniatura:', e);
        return '';
    }
};

export const parseJPGDPI = (view: DataView): number => {
    const len = view.byteLength;
    let offset = 2; // Skip SOI (FF D8)

    while (offset < len - 4) {
        if (view.getUint8(offset) !== 0xFF) break;
        const marker = view.getUint8(offset + 1);
        const size = view.getUint16(offset + 2);

        // 1. APP0 (JFIF)
        if (marker === 0xE0 && size >= 16) {
            const identifier = String.fromCharCode(
                view.getUint8(offset + 4), view.getUint8(offset + 5),
                view.getUint8(offset + 6), view.getUint8(offset + 7),
                view.getUint8(offset + 8)
            );
            if (identifier === 'JFIF\0') {
                const unit = view.getUint8(offset + 13); // 1 = DPI, 2 = DPC
                const xres = view.getUint16(offset + 14);
                if (unit === 1 && xres > 0) return xres;
                if (unit === 2 && xres > 0) return Math.round(xres * 2.54);
            }
        }

        // 2. APP13 (Photoshop / 8BIM)
        if (marker === 0xED && size >= 12) {
            const app13Data = new DataView(view.buffer, view.byteOffset + offset + 4, size - 2);
            let j = 0;
            while (j < app13Data.byteLength - 12) {
                if (app13Data.getUint32(j) === 0x3842494D) { // '8BIM'
                    const id = app13Data.getUint16(j + 4);
                    const nameLen = app13Data.getUint8(j + 6);
                    const nameFieldLen = (nameLen + 1 + 1) & ~1; // Length byte + string + pad to even
                    const resourceSize = app13Data.getUint32(j + 6 + nameFieldLen);
                    if (id === 0x03ED) { // ResolutionInfo
                        const hRes = app13Data.getUint16(j + 6 + nameFieldLen + 4); // Skip size field, then 4 bytes of fixed point HRes
                        if (hRes > 0) return hRes;
                    }
                    j += 6 + nameFieldLen + 4 + resourceSize;
                    if (resourceSize % 2 !== 0) j++; // Pad to even
                } else {
                    j++;
                }
            }
        }

        // 3. APP1 (EXIF)
        if (marker === 0xE1 && size >= 20) {
            // Search for "Exif\0\0"
            if (view.getUint32(offset + 4) === 0x45786966) {
                const startOfTiff = offset + 10;
                const isLittleEndian = view.getUint16(startOfTiff) === 0x4949;
                const ifd0Offset = isLittleEndian ? view.getUint32(startOfTiff + 4, true) : view.getUint32(startOfTiff + 4, false);
                const ifdOffset = startOfTiff + ifd0Offset;

                if (ifdOffset < view.byteLength - 2) {
                    const numEntries = isLittleEndian ? view.getUint16(ifdOffset, true) : view.getUint16(ifdOffset, false);
                    for (let entry = 0; entry < numEntries; entry++) {
                        const entryPos = ifdOffset + 2 + (entry * 12);
                        if (entryPos > view.byteLength - 12) break;
                        const tag = isLittleEndian ? view.getUint16(entryPos, true) : view.getUint16(entryPos, false);
                        if (tag === 0x011A) { // XResolution
                            const type = isLittleEndian ? view.getUint16(entryPos + 2, true) : view.getUint16(entryPos + 2, false);
                            const valOffset = isLittleEndian ? view.getUint32(entryPos + 8, true) : view.getUint32(entryPos + 8, false);

                            if (type === 5) { // RATIONAL
                                const dataPos = startOfTiff + valOffset;
                                if (dataPos < view.byteLength - 8) {
                                    const num = isLittleEndian ? view.getUint32(dataPos, true) : view.getUint32(dataPos, false);
                                    const den = isLittleEndian ? view.getUint32(dataPos + 4, true) : view.getUint32(dataPos + 4, false);
                                    if (den !== 0) return Math.round(num / den);
                                }
                            }
                        }
                    }
                }
            }
        }

        offset += size + 2;
        if (offset > 128000) break; // Scan a larger portion for metadata
    }

    return 72; // Default for Large Format/Web if unknown
};

export const parseJPGColorMode = (view: DataView): string => {
    const len = view.byteLength;
    let offset = 2;
    while (offset < len - 4) {
        if (view.getUint8(offset) !== 0xFF) break;
        const marker = view.getUint8(offset + 1);
        const size = view.getUint16(offset + 2);
        if (marker === 0xC0 || marker === 0xC2) { // SOF0 or SOF2
            const comps = view.getUint8(offset + 9);
            if (comps === 1) return 'Escala de grises';
            if (comps === 4) return 'CMYK';
            return 'RGB';
        }
        offset += size + 2;
    }
    return 'RGB';
};

export const parsePNGDPI = (view: DataView): number => {
    if (view.byteLength < 8 || view.getUint32(0) !== 0x89504E47) return 72;

    let i = 8;
    while (i < view.byteLength - 12) {
        const length = view.getUint32(i);
        const chunkType = String.fromCharCode(
            view.getUint8(i + 4), view.getUint8(i + 5),
            view.getUint8(i + 6), view.getUint8(i + 7)
        );

        if (chunkType === 'pHYs') {
            const ppuX = view.getUint32(i + 8);
            const unit = view.getUint8(i + 16); // 1: meters
            if (unit === 1) return Math.round(ppuX * 0.0254);
        }

        i += length + 12;
        if (i > 100000) break;
    }
    return 72;
};

export const parsePNGColorMode = (view: DataView): string => {
    if (view.byteLength < 26 || view.getUint32(0) !== 0x89504E47) return 'RGB';
    const colorType = view.getUint8(25);
    if (colorType === 0) return 'Escala de grises';
    if (colorType === 4) return 'Escala de grises + Alpha';
    return 'RGB';
};

export const parseTIFFMetadata = (view: DataView) => {
    if (view.byteLength < 10) return { widthPx: 0, heightPx: 0, dpi: 300, thumbOffset: 0, thumbSize: 0, colorMode: 'CMYK' };
    const le = view.getUint16(0) === 0x4949;
    const magic = le ? view.getUint16(2, true) : view.getUint16(2, false);
    if (magic !== 42) return { widthPx: 0, heightPx: 0, dpi: 300, thumbOffset: 0, thumbSize: 0, colorMode: 'CMYK' };
    let off = le ? view.getUint32(4, true) : view.getUint32(4, false);
    let mW = 0, mH = 0, mD = 300, tO = 0, tS = 0, rU = 2, cM = 'CMYK';
    const visited = new Set<number>();

    const process = (o: number, d: number = 0) => {
        if (d > 5 || o <= 0 || o > view.byteLength - 2 || visited.has(o)) return 0;
        visited.add(o);
        const n = le ? view.getUint16(o, true) : view.getUint16(o, false);
        let cw = 0, ch = 0, cd = 0, cu = 2;
        const subs: number[] = [];
        for (let i = 0; i < n; i++) {
            const p = o + 2 + (i * 12);
            if (p > view.byteLength - 12) break;
            const tag = le ? view.getUint16(p, true) : view.getUint16(p, false);
            const type = le ? view.getUint16(p + 2, true) : view.getUint16(p + 2, false);
            const cnt = le ? view.getUint32(p + 4, true) : view.getUint32(p + 4, false);
            const val = le ? view.getUint32(p + 8, true) : view.getUint32(p + 8, false);

            if (tag === 256) cw = type === 3 ? (le ? view.getUint16(p + 8, true) : view.getUint16(p + 8, false)) : val;
            else if (tag === 257) ch = type === 3 ? (le ? view.getUint16(p + 8, true) : view.getUint16(p + 8, false)) : val;
            else if (tag === 296) cu = le ? view.getUint16(p + 8, true) : view.getUint16(p + 8, false);
            else if (tag === 282 && (type === 5 || type === 10) && val < view.byteLength - 8) {
                const num = le ? view.getUint32(val, true) : view.getUint32(val, false);
                const den = le ? view.getUint32(val + 4, true) : view.getUint32(val + 4, false);
                if (den !== 0) cd = Math.round(num / den);
            } else if (tag === 513) { if (tO === 0) tO = val; }
            else if (tag === 514) { if (tS === 0) tS = val; }
            else if (tag === 262) { // PhotometricInterpretation
                const ph = type === 3 ? (le ? view.getUint16(p + 8, true) : view.getUint16(p + 8, false)) : val;
                if (ph === 1) cM = 'Escala de grises';
                else if (ph === 2) cM = 'RGB';
                else if (ph === 5) cM = 'CMYK';
            }
            else if (tag === 330) {
                if (cnt === 1) subs.push(val);
                else if (cnt > 1 && val < view.byteLength - (cnt * 4)) {
                    for (let k = 0; k < cnt; k++) subs.push(le ? view.getUint32(val + k * 4, true) : view.getUint32(val + k * 4, false));
                }
            } else if (tag === 34377) {
                try {
                    let bOff = val;
                    while (bOff < val + cnt - 12) {
                        const sig = view.getUint32(bOff, false); // "8BIM"
                        if (sig !== 0x3842494D) break;
                        const id = view.getUint16(bOff + 4, false);
                        const nameLen = view.getUint8(bOff + 6);
                        const namePad = (nameLen + 1 + 1) & ~1;
                        const dataLen = view.getUint32(bOff + 6 + namePad, false);
                        const dataOff = bOff + 6 + namePad + 4;
                        if (id === 1033 || id === 1036) {
                            const fmt = view.getUint32(dataOff, false);
                            if (fmt === 1) {
                                tO = dataOff + 28;
                                tS = dataLen - 28;
                                console.log(`[Luxius-TIFF] Photoshop Thumbnail (ID:${id}) encontrado en ${tO} (${tS} bytes)`);
                            }
                        }
                        bOff = dataOff + ((dataLen + 1) & ~1);
                    }
                } catch (e) { console.warn("[Luxius-TIFF] Error parseando Photoshop Resource Block", e); }
            }
        }
        if (cw > mW) { mW = cw; mH = ch; mD = cd || mD; rU = cu; }
        if (tO === 0) for (const s of subs) { process(s, d + 1); if (tO > 0) break; }
        const nx = o + 2 + (n * 12);
        return (nx < view.byteLength - 4) ? (le ? view.getUint32(nx, true) : view.getUint32(nx, false)) : 0;
    };
    for (let i = 0; i < 4 && off > 0; i++) off = process(off, 0);
    if (rU === 3 && mD > 0) mD = Math.round(mD * 2.54);
    return { widthPx: mW, heightPx: mH, dpi: mD || 300, thumbOffset: tO, thumbSize: tS, colorMode: cM };
};

export const parseEPSMetadata = async (file: File) => {
    let w = 0, h = 0, d = 300, thumb = "";
    try {
        const buf = await file.slice(0, 1024 * 1024).arrayBuffer();
        const view = new DataView(buf);
        if (view.byteLength > 30 && view.getUint32(0, true) === 0xC5D0D3C6) {
            const to = view.getUint32(20, true), ts = view.getUint32(24, true);
            if (to > 0 && to + ts <= file.size) {
                const tBlob = file.slice(to, to + ts);
                thumb = await new Promise(r => { const rd = new FileReader(); rd.onloadend = () => r(rd.result as string); rd.readAsDataURL(tBlob); });
            }
        }
        const txt = new TextDecoder().decode(new Uint8Array(buf));
        const bb = txt.match(/%%HiResBoundingBox:\s*([\d.]+)\s*([\d.]+)\s*([\d.]+)\s*([\d.]+)/i) || txt.match(/%%BoundingBox:\s*([\d]+)\s*([\d]+)\s*([\d]+)\s*([\d]+)/i);
        if (bb) {
            w = Math.round(((parseFloat(bb[3]) - parseFloat(bb[1])) * 2.54 / 72) * 10) / 10;
            h = Math.round(((parseFloat(bb[4]) - parseFloat(bb[2])) * 2.54 / 72) * 10) / 10;
        }
        const res = txt.match(/<tiff:XResolution>([\d./]+)<\/tiff:XResolution>/i) || txt.match(/tiff:XResolution="([\d./]+)"/i);
        if (res) {
            const raw = res[1];
            d = Math.round(raw.includes('/') ? (parseFloat(raw.split('/')[0]) / parseFloat(raw.split('/')[1])) : parseFloat(raw));
        }
    } catch (e) { }

    if (!thumb) {
        thumb = generateVectorCard('EPS', file.name, { width: w, height: h }, d);
    }

    return { width: w, height: h, dpi: d, thumbnailUrl: thumb };
};

export const getImageDPI = async (file: File): Promise<number> => {
    console.log(`[Luxius-Meta] Analizando DPI (Optimizado): ${file.name} (${file.size} bytes)`);
    try {
        const headerBlob = file.slice(0, 128 * 1024);
        const buffer = await headerBlob.arrayBuffer();
        const view = new DataView(buffer);
        const extension = file.name.split('.').pop()?.toLowerCase() || '';

        if (extension === 'jpg' || extension === 'jpeg') {
            const dpi = parseJPGDPI(view);
            console.log(`[Luxius-Meta] DPI JPG detectado: ${dpi}`);
            return dpi;
        } else if (extension === 'png') {
            const dpi = parsePNGDPI(view);
            console.log(`[Luxius-Meta] DPI PNG detectado: ${dpi}`);
            return dpi;
        } else if (extension === 'tif' || extension === 'tiff') {
            const tiffMeta = parseTIFFMetadata(view);
            console.log(`[Luxius-Meta] DPI TIFF detectado: ${tiffMeta.dpi}`);
            return tiffMeta.dpi;
        }
    } catch (err) {
        console.error(`[Luxius-Meta] Error analizando DPI:`, err);
    }
    return 72;
};

export const getImageColorMode = async (file: File): Promise<string> => {
    try {
        const headerBlob = file.slice(0, 128 * 1024);
        const buffer = await headerBlob.arrayBuffer();
        const view = new DataView(buffer);
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (extension === 'jpg' || extension === 'jpeg') return parseJPGColorMode(view);
        if (extension === 'png') return parsePNGColorMode(view);
        if (extension === 'tif' || extension === 'tiff') return parseTIFFMetadata(view).colorMode;
    } catch (err) {
        console.warn('[Luxius-Meta] Error detectando modo de color:', err);
    }
    return 'CMYK';
};

export const extractMetadata = async (
    file: File,
    existingUrl?: string,
    pageNum: number = 1,
    cachedBuffer?: ArrayBuffer
): Promise<FileMetadata> => {
    const extension = file.name.split('.').pop()?.toUpperCase() || 'N/A';
    let pageCount = 0;
    let thumbnailUrl = undefined;
    let widthCm = 0;
    let heightCm = 0;
    let dpi = 72;
    let colorMode = 'CMYK';
    console.log(`[Luxius-Meta] Iniciando extracción: ${file.name} (Pág ${pageNum})`);

    try {
        if (extension === 'PDF') {
            const arrayBuffer = cachedBuffer || await file.arrayBuffer();

            // 1. PDF-LIB with Increased Timeout
            try {
                const loadPromise = PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                const pdfDoc = await Promise.race([
                    loadPromise,
                    new Promise<null>((_, rej) => setTimeout(() => rej(new Error("Timeout PDF-LIB")), 8000))
                ]);
                if (pdfDoc) {
                    pageCount = pdfDoc.getPageCount();
                    const pageIdx = Math.min(pageNum - 1, Math.max(0, pageCount - 1));
                    const pdfPage = pdfDoc.getPage(pageIdx);
                    const { width, height } = pdfPage.getSize();
                    widthCm = Math.round((width * 2.54 / 72) * 10) / 10;
                    heightCm = Math.round((height * 2.54 / 72) * 10) / 10;
                }
            } catch (le) { console.warn("[Luxius-Meta] PDF-LIB falló o tomó demasiado tiempo", le); }

            // 2. DPI/Color from XMP
            try {
                const decoder = new TextDecoder();
                const chunk = new Uint8Array(arrayBuffer.slice(0, 1024 * 500));
                const fullText = decoder.decode(chunk);
                const xResMatch = fullText.match(/<tiff:XResolution>([\d./]+)<\/tiff:XResolution>/i) ||
                    fullText.match(/tiff:XResolution="([\d./]+)"/i);
                if (xResMatch) {
                    const raw = xResMatch[1];
                    const val = raw.includes('/') ? (parseFloat(raw.split('/')[0]) / parseFloat(raw.split('/')[1])) : parseFloat(raw);
                    dpi = Math.round(val < 100 ? val * 2.54 : val);
                }
                if (fullText.includes('ColorMode>3') || fullText.includes('/DeviceRGB')) colorMode = 'RGB';
                else if (fullText.includes('ColorMode>4') || fullText.includes('/DeviceCMYK')) colorMode = 'CMYK';
            } catch (e) { }

            // 2b. PDFJS Image Object & Viewport Effective DPI calculation (only if not found in XMP & lightweight)
            if (dpi <= 72 && arrayBuffer.byteLength <= 20 * 1024 * 1024) {
                try {
                    const pdfJsDoc = await Promise.race([
                        pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise,
                        new Promise<null>((_, rej) => setTimeout(() => rej(new Error("Timeout PDFJS")), 2500))
                    ]);
                    if (pdfJsDoc) {
                        const pdfPage = await pdfJsDoc.getPage(Math.min(pageNum, pdfJsDoc.numPages));
                        const viewport = pdfPage.getViewport({ scale: 1.0 });

                        let detectedDpi = 0;
                        const ops = await Promise.race([
                            pdfPage.getOperatorList(),
                            new Promise<null>((_, rej) => setTimeout(() => rej(new Error("Timeout ops")), 2000))
                        ]);

                        if (ops && ops.fnArray) {
                            let lastTransformArgs: number[] | null = null;
                            const maxScan = Math.min(ops.fnArray.length, 300);
                            for (let k = 0; k < maxScan; k++) {
                                const fn = ops.fnArray[k];

                                if (fn === pdfjsLib.OPS.transform) {
                                    lastTransformArgs = ops.argsArray[k] as number[];
                                }

                                if (
                                    fn === pdfjsLib.OPS.paintImageXObject ||
                                    fn === pdfjsLib.OPS.paintInlineImageXObject ||
                                    fn === pdfjsLib.OPS.paintImageXObjectRepeat
                                ) {
                                    const imgName = ops.argsArray[k][0];
                                    try {
                                        let imgObj: any = null;
                                        if (pdfPage.objs.has(imgName)) imgObj = pdfPage.objs.get(imgName);
                                        else if (pdfPage.commonObjs.has(imgName)) imgObj = pdfPage.commonObjs.get(imgName);

                                        if (imgObj && imgObj.width && imgObj.height) {
                                            let calcDpi = 0;

                                            if (lastTransformArgs && lastTransformArgs.length >= 4) {
                                                const a = Math.abs(lastTransformArgs[0]);
                                                const b = Math.abs(lastTransformArgs[1]);
                                                const c = Math.abs(lastTransformArgs[2]);
                                                const d = Math.abs(lastTransformArgs[3]);

                                                const placementWidthPts = Math.max(a, b) || viewport.width;
                                                const placementHeightPts = Math.max(c, d) || viewport.height;

                                                const placementWidthInches = placementWidthPts / 72;
                                                const placementHeightInches = placementHeightPts / 72;

                                                const dpiX = Math.round(imgObj.width / placementWidthInches);
                                                const dpiY = Math.round(imgObj.height / placementHeightInches);
                                                calcDpi = Math.max(dpiX, dpiY);
                                            } else {
                                                const pageWidthInches = viewport.width / 72;
                                                const pageHeightInches = viewport.height / 72;
                                                const dpiX = Math.round(imgObj.width / pageWidthInches);
                                                const dpiY = Math.round(imgObj.height / pageHeightInches);
                                                calcDpi = Math.max(dpiX, dpiY);
                                            }

                                            if (calcDpi > detectedDpi) detectedDpi = calcDpi;
                                        }
                                    } catch (e) { }
                                    lastTransformArgs = null;
                                }
                            }

                            if (detectedDpi > 0) {
                                dpi = detectedDpi;
                                console.log(`[Luxius-Meta] DPI real de imagen en PDF: ${dpi} DPI`);
                            }
                        }
                    }
                } catch (pdfJsErr) {
                    console.warn("[Luxius-Meta] Error o timeout en DPI de PDFJS", pdfJsErr);
                }
            }

            // 3. Page Thumbnail (Lazy call)
            try {
                thumbnailUrl = await getPdfThumbnail(arrayBuffer, pageNum, widthCm || 21, heightCm || 29);
            } catch (e) { }
        } else if (extension === 'EPS') {
            const eps = await parseEPSMetadata(file);
            widthCm = eps.width; heightCm = eps.height; dpi = eps.dpi; thumbnailUrl = eps.thumbnailUrl;
        } else if (extension === 'TIF' || extension === 'TIFF') {
            const buffer = cachedBuffer || await file.arrayBuffer();
            const tiff = parseTIFFMetadata(new DataView(buffer));
            if (tiff.widthPx > 0) {
                widthCm = Math.round(tiff.widthPx * 2.54 / tiff.dpi * 10) / 10;
                heightCm = Math.round(tiff.heightPx * 2.54 / tiff.dpi * 10) / 10;
                dpi = tiff.dpi; colorMode = tiff.colorMode;
            }
            if (tiff.thumbOffset > 0 && tiff.thumbSize > 0) {
                try {
                    const thumbBlob = new Blob([buffer.slice(tiff.thumbOffset, tiff.thumbOffset + tiff.thumbSize)], { type: 'image/jpeg' });
                    thumbnailUrl = await new Promise<string>(r => { const rd = new FileReader(); rd.onloadend = () => r(rd.result as string); rd.readAsDataURL(thumbBlob); });
                } catch (e) { }
            }
        } else if (extension === 'CDR') {
            try {
                thumbnailUrl = (await extractCdrThumbnail(cachedBuffer || file)) || '';
            } catch (e) { }
        } else {
            const meta = await new Promise<any>((resolve) => {
                const img = new Image(); const url = existingUrl || URL.createObjectURL(file);
                img.onload = async () => {
                    const d = await getImageDPI(file); const cm = await getImageColorMode(file);
                    resolve({ width: Math.round(img.width * 2.54 / d * 10) / 10, height: Math.round(img.height * 2.54 / d * 10) / 10, dpi: d, colorMode: cm });
                    if (!existingUrl) URL.revokeObjectURL(url);
                };
                img.onerror = () => { resolve({ width: 0, height: 0, dpi: 72, colorMode: 'RGB' }); if (!existingUrl) URL.revokeObjectURL(url); };
                img.src = url;
            });
            widthCm = meta.width; heightCm = meta.height; dpi = meta.dpi; colorMode = meta.colorMode;
        }
    } catch (err) { console.error('[Luxius-Meta] Error fatal:', err); }

    return {
        width: widthCm || 0,
        height: heightCm || 0,
        dpi: dpi || 72,
        format: extension,
        colorMode: colorMode || 'CMYK',
        pageCount,
        thumbnailUrl
    };
};
