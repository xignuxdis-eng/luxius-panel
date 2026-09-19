/**
 * Utilidad de optimización y reducción de resolución para imágenes en generación de PDF.
 * Resuelve el problema de PDFs excesivamente pesados provocados por incrustar
 * imágenes de producción de alta resolución (10MB - 50MB) en miniaturas de visualización.
 */

export interface OptimizeOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    timeoutMs?: number;
}

/**
 * Escala físicamente la resolución de una imagen (bitmaps o DataURLs)
 * y la comprime en JPEG ligero antes de incrustarla en el flujo de impresión del PDF.
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
        maxWidth = 360,
        maxHeight = 360,
        quality = 0.75,
        timeoutMs = 2500
    } = options;

    return new Promise((resolve) => {
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            // Fallback al recurso original si la carga remota demora demasiado
            resolve(src);
        }, timeoutMs);

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            if (timedOut) return;
            clearTimeout(timer);

            try {
                let { naturalWidth: width, naturalHeight: height } = img;
                if (!width || !height) {
                    width = img.width || maxWidth;
                    height = img.height || maxHeight;
                }

                // Si la imagen ya es pequeña y no es un DataURL gigante, devolverla
                if (width <= maxWidth && height <= maxHeight && src.length < 40000 && !src.startsWith('data:')) {
                    resolve(src);
                    return;
                }

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
                    resolve(src);
                    return;
                }

                // Fondo blanco para preservar legibilidad en PNGs transparentes al pasar a JPEG
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // Comprimir a JPEG con resolución optimizada (genera ~15-25KB por miniatura)
                const compressed = canvas.toDataURL('image/jpeg', quality);
                resolve(compressed);
            } catch (err) {
                console.warn('[PDF Image Optimizer] Error procesando imagen en canvas, usando original:', err);
                resolve(src);
            }
        };

        img.onerror = () => {
            if (timedOut) return;
            clearTimeout(timer);
            resolve(src);
        };

        img.src = src;
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
