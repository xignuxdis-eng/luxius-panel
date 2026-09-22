/**
 * Utilidad de optimización y reducción de resolución para imágenes en generación de PDF.
 * Resuelve el problema de PDFs excesivamente pesados provocados por incrustar
 * imágenes de producción de alta resolución (10MB - 50MB) en miniaturas de visualización.
 *
 * IMPORTANTE: NUNCA devuelve la URL/src original como fallback. Si la imagen no puede
 * ser procesada, devuelve un placeholder SVG ultra-liviano (~200 bytes).
 */

export interface OptimizeOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    timeoutMs?: number;
}

/** Placeholder SVG ultra-liviano para cuando la imagen no puede procesarse (~200 bytes) */
const PLACEHOLDER_SVG = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
    '<rect width="200" height="200" fill="#f1f5f9"/>' +
    '<text x="100" y="108" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="sans-serif">Sin vista previa</text>' +
    '</svg>'
);

/**
 * Escala físicamente la resolución de una imagen y la comprime en JPEG ligero.
 * Usa fetch() -> Blob -> createImageBitmap para evitar problemas de CORS con <img>.
 * Si falla, devuelve un placeholder SVG liviano — NUNCA el archivo original pesado.
 */
export async function optimizePdfThumbnail(
    src: string | undefined | null,
    options: OptimizeOptions = {}
): Promise<string> {
    if (!src || typeof src !== 'string') return '';

    // Si ya es un SVG vectorial ligero, mantenerlo intacto
    if (src.startsWith('data:image/svg+xml') || src.endsWith('.svg')) {
        return src;
    }

    const {
        maxWidth = 300,
        maxHeight = 300,
        quality = 0.65,
        timeoutMs = 4000
    } = options;

    try {
        let blob: Blob;

        if (src.startsWith('data:')) {
            // Data URL: convertir directamente a blob
            const resp = await fetch(src);
            blob = await resp.blob();
        } else {
            // URL externa: fetch con timeout y AbortController
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const resp = await fetch(src, { signal: controller.signal });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                blob = await resp.blob();
            } finally {
                clearTimeout(timer);
            }
        }

        // Si el blob es muy pequeño (< 2KB), probablemente es un error/placeholder
        if (blob.size < 100) {
            return PLACEHOLDER_SVG;
        }

        // Si el blob ya es pequeño (< 20KB) y no necesita redimensionar, usarlo directo
        if (blob.size < 20000) {
            return await blobToDataUrl(blob);
        }

        // createImageBitmap funciona sin CORS issues ya que operamos sobre el blob local
        const bitmap = await createImageBitmap(blob);
        let { width, height } = bitmap;

        // Calcular dimensiones proporcionales reducidas
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            bitmap.close();
            return PLACEHOLDER_SVG;
        }

        // Fondo blanco para preservar legibilidad en PNGs transparentes al pasar a JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        // Comprimir a JPEG — genera ~8-20KB por miniatura
        const compressed = canvas.toDataURL('image/jpeg', quality);

        // Verificar que el resultado comprimido sea razonablemente pequeño (< 100KB)
        // Si es más grande, recomprimir con calidad más baja
        if (compressed.length > 130000) {
            const recompressed = canvas.toDataURL('image/jpeg', 0.4);
            return recompressed;
        }

        return compressed;
    } catch (err) {
        console.warn('[PDF Image Optimizer] No se pudo procesar imagen, usando placeholder liviano:', err);
        // NUNCA devolver src original — puede ser un archivo de 50MB
        return PLACEHOLDER_SVG;
    }
}

/** Convierte un Blob a data URL */
function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Procesa en paralelo un conjunto de URLs de imágenes y devuelve sus versiones optimizadas en miniatura.
 */
export async function batchOptimizePdfThumbnails(
    sources: (string | undefined | null)[],
    options: OptimizeOptions = {}
): Promise<string[]> {
    return Promise.all(sources.map(src => optimizePdfThumbnail(src, options)));
}
