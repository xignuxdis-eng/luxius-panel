import JSZip from 'jszip';

export async function extractCdrThumbnail(fileOrBuffer: File | ArrayBuffer): Promise<string | null> {
    try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(fileOrBuffer);
        
        // Potential paths inside modern CorelDRAW (.cdr) ZIP packages
        const possiblePaths = [
            'previews/thumbnail.png',
            'previews/thumbnail.bmp',
            'metadata/thumbnails/thumbnail.png',
            'metadata/thumbnails/thumbnail.bmp',
            'color/preview.bmp',
            'preview.png',
            'preview.bmp'
        ];
        
        for (const path of possiblePaths) {
            const entry = loadedZip.file(path);
            if (entry) {
                const blob = await entry.async('blob');
                return URL.createObjectURL(blob);
            }
        }
        
        // Search any file in the zip with 'thumbnail' or 'preview'
        const fileNames = Object.keys(loadedZip.files);
        const match = fileNames.find(n => /(thumbnail|preview)\.(png|bmp|jpg|jpeg)/i.test(n));
        if (match) {
            const entry = loadedZip.file(match);
            if (entry) {
                const blob = await entry.async('blob');
                return URL.createObjectURL(blob);
            }
        }
    } catch (e) {
        console.warn('[CDR-Preview] No se pudo extraer miniatura local del CDR:', e);
    }
    return null;
}
