/**
 * Vector and Professional Image Preview Extraction Utility for LuXius
 * Supports: TIFF, EPS, AI, PDF, SVG, CDR
 */

export async function extractTiffThumbnail(file: File): Promise<string | null> {
    try {
        // Read first 2MB which contains headers and Photoshop resource thumbnails
        const slice = file.slice(0, Math.min(file.size, 2 * 1024 * 1024));
        const buffer = await slice.arrayBuffer();
        const view = new DataView(buffer);
        
        if (view.byteLength < 8) return null;
        
        const isLE = view.getUint16(0, false) === 0x4949; // "II"
        const isBE = view.getUint16(0, false) === 0x4D4D; // "MM"
        if (!isLE && !isBE) return null;
        
        const le = isLE;
        let ifdOffset = le ? view.getUint32(4, true) : view.getUint32(4, false);
        
        let thumbOffset = 0;
        let thumbSize = 0;
        
        const processIFD = (offset: number): number => {
            if (offset <= 0 || offset + 2 > view.byteLength) return 0;
            const numEntries = le ? view.getUint16(offset, true) : view.getUint16(offset, false);
            let pos = offset + 2;
            
            for (let i = 0; i < numEntries; i++) {
                if (pos + 12 > view.byteLength) break;
                const tag = le ? view.getUint16(pos, true) : view.getUint16(pos, false);
                const type = le ? view.getUint16(pos + 2, true) : view.getUint16(pos + 2, false);
                const count = le ? view.getUint32(pos + 4, true) : view.getUint32(pos + 4, false);
                const val = le ? view.getUint32(pos + 8, true) : view.getUint32(pos + 8, false);
                
                if (tag === 513) { // JPEGInterchangeFormat
                    thumbOffset = val;
                } else if (tag === 514) { // JPEGInterchangeFormatLength
                    thumbSize = val;
                } else if (tag === 34377) { // Photoshop ImageSourceData
                    try {
                        let bOff = val;
                        while (bOff < val + count - 12 && bOff + 12 <= view.byteLength) {
                            const sig = view.getUint32(bOff, false); // "8BIM"
                            if (sig !== 0x3842494D) break;
                            const id = view.getUint16(bOff + 4, false);
                            const nameLen = view.getUint8(bOff + 6);
                            const namePad = (nameLen + 1 + 1) & ~1;
                            const dataLen = view.getUint32(bOff + 6 + namePad, false);
                            const dataOff = bOff + 6 + namePad + 4;
                            
                            if (id === 1033 || id === 1036) { // Thumbnail
                                const fmt = view.getUint32(dataOff, false);
                                if (fmt === 1) { // JPEG
                                    thumbOffset = dataOff + 28;
                                    thumbSize = dataLen - 28;
                                    break;
                                }
                            }
                            bOff = dataOff + ((dataLen + 1) & ~1);
                        }
                    } catch (_) {}
                }
                pos += 12;
            }
            
            return (pos < view.byteLength - 4) ? (le ? view.getUint32(pos, true) : view.getUint32(pos, false)) : 0;
        };
        
        for (let step = 0; step < 4 && ifdOffset > 0; step++) {
            if (thumbOffset > 0 && thumbSize > 0) break;
            ifdOffset = processIFD(ifdOffset);
        }
        
        if (thumbOffset > 0 && thumbSize > 0 && thumbOffset + thumbSize <= file.size) {
            const thumbBlob = file.slice(thumbOffset, thumbOffset + thumbSize);
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null as any);
                reader.readAsDataURL(thumbBlob);
            });
        }
    } catch (e) {
        console.warn('[TIFF-Preview] Error extrayendo miniatura de TIFF:', e);
    }
    return null;
}

export async function extractEpsThumbnail(file: File): Promise<string | null> {
    try {
        const slice = file.slice(0, 1024 * 512);
        const buffer = await slice.arrayBuffer();
        const view = new DataView(buffer);
        
        // 1. Check for DOS EPS Binary Header (0xC5D0D3C6)
        if (view.byteLength > 30 && view.getUint32(0, true) === 0xC5D0D3C6) {
            const tiffOffset = view.getUint32(20, true);
            const tiffLength = view.getUint32(24, true);
            
            if (tiffOffset > 0 && tiffOffset + tiffLength <= file.size) {
                const tiffBlob = file.slice(tiffOffset, tiffOffset + tiffLength);
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = () => resolve(null as any);
                    reader.readAsDataURL(tiffBlob);
                });
            }
        }
    } catch (e) {
        console.warn('[EPS-Preview] Error extrayendo miniatura binaria de EPS:', e);
    }
    return null;
}

export function generateVectorCard(
    type: string, 
    fileName: string, 
    dimensions?: { width: number; height: number }, 
    dpi?: number
): string {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        // Gradient background
        const grad = ctx.createLinearGradient(0, 0, 320, 360);
        grad.addColorStop(0, '#131c2e');
        grad.addColorStop(1, '#090d16');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 320, 360);

        // Tech grid pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 20; x < 320; x += 20) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 360); ctx.stroke();
        }
        for (let y = 20; y < 360; y += 20) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(320, y); ctx.stroke();
        }

        // Icon
        ctx.font = '52px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(type.toUpperCase() === 'EPS' ? '📐' : (type.toUpperCase() === 'AI' ? '✒️' : '✏️'), 160, 90);

        // Header Badge
        ctx.fillStyle = '#ff8c38';
        ctx.font = 'bold 18px Inter, Arial, sans-serif';
        ctx.fillText(`VECTOR ${type.toUpperCase()}`, 160, 135);

        // Filename
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px Inter, Arial, sans-serif';
        const cleanName = fileName.length > 28 ? fileName.substring(0, 25) + '...' : fileName;
        ctx.fillText(cleanName, 160, 165);

        // Dimensions card box
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(24, 195, 272, 110);
        ctx.strokeStyle = 'rgba(255, 140, 56, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(24, 195, 272, 110);

        // Size
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 22px Inter, Arial, sans-serif';
        if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
            ctx.fillText(`${dimensions.width} × ${dimensions.height} cm`, 160, 240);
        } else {
            ctx.fillText('Vector Escala 1:1', 160, 240);
        }

        // DPI / Color space
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Inter, Arial, sans-serif';
        ctx.fillText(`${dpi || 300} DPI • MODO CMYK`, 160, 275);

        return canvas.toDataURL('image/png');
    } catch (_) {
        return '';
    }
}
