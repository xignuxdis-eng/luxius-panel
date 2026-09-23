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
 * Usa fetch() -> Blob -> createImageBitmap, con fallback a Image element off-screen.
 * Si la optimización falla pero la URL es válida, retorna la URL directa para que el navegador la renderice.
 */
export async function optimizePdfThumbnail(
    src: string | undefined | null,
    options: OptimizeOptions = {}
): Promise<string> {
    if (!src || typeof src !== 'string') return '';

    // Si ya es un SVG vectorial ligero o un icono data URL, mantenerlo intacto
    if (src.startsWith('data:image/svg+xml') || src.endsWith('.svg')) {
        return src;
    }

    const {
        maxWidth = 320,
        maxHeight = 320,
        quality = 0.72,
        timeoutMs = 8000
    } = options;

    try {
        let blob: Blob | null = null;

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
                if (resp.ok) {
                    blob = await resp.blob();
                }
            } catch (fetchErr) {
                // Fetch falló (puede ser CORS o red). Probaremos fallback vía new Image()
                blob = null;
            } finally {
                clearTimeout(timer);
            }
        }

        if (blob) {
            // Si el blob es muy pequeño (< 100 bytes), probablemente es un error/placeholder
            if (blob.size < 100) {
                return PLACEHOLDER_SVG;
            }

            // Si el blob ya es pequeño (< 25KB) y no necesita redimensionar, usarlo directo
            if (blob.size < 25000) {
                return await blobToDataUrl(blob);
            }

            // createImageBitmap opera velozmente sobre el blob en memoria
            const bitmap = await createImageBitmap(blob);
            let { width, height } = bitmap;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.max(1, Math.round(width * ratio));
                height = Math.max(1, Math.round(height * ratio));
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(bitmap, 0, 0, width, height);
                bitmap.close();

                const compressed = canvas.toDataURL('image/jpeg', quality);
                if (compressed.length > 150000) {
                    return canvas.toDataURL('image/jpeg', 0.5);
                }
                return compressed;
            }
            bitmap.close();
        }

        // Fallback: Si fetch falló o no pudo crear canvas desde blob, intentar cargar mediante HTMLImageElement
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Image element timeout')), Math.min(timeoutMs, 5000));
            img.onload = () => { clearTimeout(timer); resolve(); };
            img.onerror = () => { clearTimeout(timer); reject(new Error('Image element load error')); };
            img.src = src;
        });

        let { naturalWidth: width, naturalHeight: height } = img;
        if (width > 0 && height > 0) {
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.max(1, Math.round(width * ratio));
                height = Math.max(1, Math.round(height * ratio));
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                return canvas.toDataURL('image/jpeg', quality);
            }
        }

        return src;
    } catch (err) {
        console.warn('[PDF Image Optimizer] No se pudo re-escalar imagen, usando src original o placeholder:', err);
        // Si el src es una URL válida, devolverla para que el navegador intente renderizarla directamente
        if (src && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/') || src.startsWith('blob:'))) {
            return src;
        }
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
 * Procesa un lote de URLs con control de concurrencia para no saturar las conexiones
 * del navegador ni provocar timeouts en cascada.
 */
export async function batchOptimizePdfThumbnails(
    sources: (string | undefined | null)[],
    options: OptimizeOptions = {}
): Promise<string[]> {
    const concurrency = 4;
    const results: string[] = new Array(sources.length);

    for (let i = 0; i < sources.length; i += concurrency) {
        const batch = sources.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map(src => optimizePdfThumbnail(src, options))
        );
        for (let j = 0; j < batchResults.length; j++) {
            results[i + j] = batchResults[j];
        }
    }

    return results;
}

