// Port JS 1:1 de src/utils/pdfImageOptimizer.ts para el banco de pruebas de peso de PDF.
const PLACEHOLDER_SVG = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
    '<rect width="200" height="200" fill="#f1f5f9"/>' +
    '<text x="100" y="108" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">Sin vista previa</text>' +
    '</svg>'
);

async function optimizePdfThumbnail(src, options = {}) {
    if (!src || typeof src !== 'string') return '';
    if (src.startsWith('data:image/svg+xml') || src.endsWith('.svg')) return src;
    const { maxWidth = 300, maxHeight = 300, quality = 0.65, timeoutMs = 4000 } = options;
    try {
        let blob;
        if (src.startsWith('data:')) {
            blob = await (await fetch(src)).blob();
        } else {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const resp = await fetch(src, { signal: controller.signal });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                blob = await resp.blob();
            } finally { clearTimeout(timer); }
        }
        if (blob.size < 100) return PLACEHOLDER_SVG;
        if (blob.size < 20000) return await blobToDataUrl(blob);
        const bitmap = await createImageBitmap(blob);
        let { width, height } = bitmap;
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { bitmap.close(); return PLACEHOLDER_SVG; }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        const compressed = canvas.toDataURL('image/jpeg', quality);
        if (compressed.length > 130000) return canvas.toDataURL('image/jpeg', 0.4);
        return compressed;
    } catch (err) {
        console.warn('[opt] fallback placeholder', err);
        return PLACEHOLDER_SVG;
    }
}
function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(blob);
    });
}
window.optimizePdfThumbnail = optimizePdfThumbnail;
window.PLACEHOLDER_SVG = PLACEHOLDER_SVG;
