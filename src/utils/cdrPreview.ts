import JSZip from 'jszip';

export async function extractCdrThumbnail(fileOrBuffer: File | ArrayBuffer): Promise<string | null> {
    try {
        console.log('[CDR-Preview] Iniciando lectura de archivo CDR con JSZip...');
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(fileOrBuffer);
        
        const allFileKeys = Object.keys(loadedZip.files);
        console.log('[CDR-Preview] Archivos encontrados dentro del CDR:', allFileKeys);

        // 1. Priority search for known thumbnail patterns (case-insensitive)
        const priorityPatterns = [
            /previews\/thumbnail\.png$/i,
            /previews\/thumbnail\.bmp$/i,
            /metadata\/thumbnails\/thumbnail\.png$/i,
            /metadata\/thumbnails\/thumbnail\.bmp$/i,
            /thumbnail\.(png|bmp|jpg|jpeg)$/i,
            /preview\.(png|bmp|jpg|jpeg)$/i,
            /\.(png|bmp|jpg|jpeg)$/i
        ];

        let matchedKey: string | undefined;
        for (const pattern of priorityPatterns) {
            matchedKey = allFileKeys.find(k => pattern.test(k));
            if (matchedKey) break;
        }

        if (!matchedKey) {
            console.warn('[CDR-Preview] No se encontró ninguna imagen de preview dentro del CDR');
            return null;
        }

        console.log('[CDR-Preview] Extrayendo miniatura desde:', matchedKey);
        const entry = loadedZip.files[matchedKey];
        if (!entry) return null;

        const uint8 = await entry.async('uint8array');
        if (!uint8 || uint8.length === 0) return null;

        let mimeType = 'image/png';
        const lowerKey = matchedKey.toLowerCase();
        if (lowerKey.endsWith('.bmp')) {
            mimeType = 'image/bmp';
        } else if (lowerKey.endsWith('.jpg') || lowerKey.endsWith('.jpeg')) {
            mimeType = 'image/jpeg';
        }

        const blob = new Blob([uint8], { type: mimeType });

        // Convert blob to DataURL for maximum compatibility across all browsers
        const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    resolve(URL.createObjectURL(blob));
                }
            };
            reader.onerror = () => resolve(URL.createObjectURL(blob));
            reader.readAsDataURL(blob);
        });

        console.log(`[CDR-Preview] Miniatura extraída con éxito (${uint8.length} bytes, ${mimeType})`);
        return dataUrl;
    } catch (e) {
        console.warn('[CDR-Preview] No se pudo descomprimir el CDR (posiblemente versión anterior a Corel X4 / sin contenedor ZIP):', e);
    }
    return null;
}
