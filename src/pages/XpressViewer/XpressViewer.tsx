import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import './XpressViewer.css';
import { API_URL } from '../../data/db';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import JSZip from 'jszip';

try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    }
} catch (e) {
    console.warn("[Luxius-PDF] Error configurando PDF worker:", e);
}

export const XpressViewer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [metadata, setMetadata] = useState<any>(null);
    const [statusText, setStatusText] = useState<string>('');

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const processFile = async (uploadedFile: File) => {
        setIsProcessing(true);
        setFile(uploadedFile);
        setStatusText('Analizando formato...');

        try {
            const ext = uploadedFile.name.split('.').pop()?.toLowerCase();
            const format = ext?.toUpperCase() || 'Desconocido';
            let extractedPreview: string | null = null;
            let meta: any = {
                name: uploadedFile.name,
                size: (uploadedFile.size / 1024 / 1024).toFixed(2) + ' MB',
                format: format,
                width: 0,
                height: 0,
                dpi: 0,
                colorMode: 'Desconocido',
                source: 'Client-Side Fast Preview'
            };

            // 1. Bitmaps Nativos (Client-Side)
            if (uploadedFile.type.startsWith('image/') && !['psd', 'cdr'].includes(ext || '')) {
                setStatusText('Renderizando bitmap nativo...');
                extractedPreview = URL.createObjectURL(uploadedFile);
                
                // Get dimensions
                await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        meta.width = img.width;
                        meta.height = img.height;
                        meta.colorMode = 'RGB (Web)';
                        resolve(true);
                    };
                    img.src = extractedPreview as string;
                });
            } 
            // 2. PDF (Client-Side con PDF.js)
            else if (ext === 'pdf') {
                setStatusText('Renderizando motor vectorial PDF...');
                const arrayBuffer = await uploadedFile.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);
                
                // Extraer metadata del PDF
                meta.pages = pdf.numPages;
                const viewport = page.getViewport({ scale: 1.5 });
                meta.width = Math.round(viewport.width);
                meta.height = Math.round(viewport.height);
                meta.colorMode = 'Documento';

                // Renderizar a Canvas oculto y exportar a DataURL
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({ canvasContext: context!, viewport: viewport }).promise;
                extractedPreview = canvas.toDataURL('image/webp', 0.8);
            }
            // 3. CorelDRAW (Client-Side ZIP Extraction)
            else if (ext === 'cdr') {
                setStatusText('Extrayendo ZIP interno (Fast Preview CDR)...');
                const arrayBuffer = await uploadedFile.arrayBuffer();
                const zip = new JSZip();
                
                try {
                    const loadedZip = await zip.loadAsync(arrayBuffer);
                    
                    // Buscar la miniatura
                    const previewFile = loadedZip.file("previews/thumbnail.png") || loadedZip.file("previews/thumbnail.bmp");
                    if (previewFile) {
                        const blob = await previewFile.async("blob");
                        extractedPreview = URL.createObjectURL(blob);
                        
                        // Intentar leer el metadata.xml para la versión
                        const metaFile = loadedZip.file("metadata/metadata.xml");
                        if (metaFile) {
                            const xmlStr = await metaFile.async("string");
                            // Regex rápido para buscar la versión del documento
                            const versionMatch = xmlStr.match(/<cdr:version>([^<]+)<\/cdr:version>/i);
                            if (versionMatch && versionMatch[1]) {
                                meta.version = `CorelDRAW v${versionMatch[1]}`;
                            }
                        }

                        // Calcular tamaño del preview
                        await new Promise((resolve) => {
                            const img = new Image();
                            img.onload = () => {
                                meta.width = img.width;
                                meta.height = img.height;
                                meta.colorMode = 'Preview Bitmap Embebido';
                                resolve(true);
                            };
                            img.src = extractedPreview as string;
                        });
                    } else {
                        throw new Error("No se encontró miniatura en el CDR");
                    }
                } catch (e) {
                    console.warn("Fallo la extracción ZIP del CDR, cayendo al Backend:", e);
                    setStatusText('Fallo Fast Preview, conectando al Backend (HQ Render)...');
                }
            }

            // Si pudimos resolver localmente
            if (extractedPreview) {
                setPreviewUrl(extractedPreview);
                setMetadata(meta);
                setIsProcessing(false);
                return;
            }

            // 4. Fallback: Procesar en el Backend
            setStatusText('Enviando al servicio HQ Render (Backend)...');
            const formData = new FormData();
            formData.append('file', uploadedFile);

            const res = await fetch(`${API_URL}/preview`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    const fullUrl = data.url.startsWith('http') ? data.url : `${API_URL.replace(/\/api\/?$/, '')}${data.url}`;
                    setPreviewUrl(fullUrl);
                }

                meta.width = data.width || 0;
                meta.height = data.height || 0;
                meta.dpi = data.dpi || 0;
                meta.colorMode = data.colorMode || 'Desconocido';
                meta.source = 'Backend HQ Render';

                setMetadata(meta);
            } else {
                console.error("Error processing preview in backend");
            }

        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            processFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
        onDrop,
        noClick: file !== null 
    });

    const handleClear = () => {
        setFile(null);
        setPreviewUrl(null);
        setMetadata(null);
    };

    return (
        <div className="xpress-container">
            {/* Viewport Area */}
            <div className="xpress-viewport" {...getRootProps()}>
                <input {...getInputProps()} />
                
                {!file ? (
                    <div className={`xpress-dropzone ${isDragActive ? 'active' : ''}`}>
                        <div className="xpress-dropzone-icon">☁️</div>
                        <p>Arrastra un archivo aquí o haz clic para explorar</p>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px' }}>
                            Soporta: CDR, AI, EPS, PDF, SVG, JPG, PNG, WEBP
                        </span>
                        <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                            <span className="xpress-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>⚡ Fast Preview Activo</span>
                        </div>
                    </div>
                ) : (
                    <div className="xpress-preview-container">
                        {isProcessing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                <span style={{ color: '#94a3b8' }}>{statusText}</span>
                            </div>
                        ) : previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="xpress-preview-image" />
                        ) : (
                            <div style={{ color: '#ef4444' }}>
                                ⚠️ No se pudo generar una vista previa para este archivo.
                            </div>
                        )}
                        
                        <div className="xpress-toolbar">
                            <button className="xpress-tool-btn" title="Zoom In">🔍+</button>
                            <button className="xpress-tool-btn" title="Zoom Out">🔍-</button>
                            <button className="xpress-tool-btn" title="Pantalla Completa">⛶</button>
                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 8px' }}></div>
                            <button className="xpress-tool-btn" onClick={(e) => { e.stopPropagation(); handleClear(); }} title="Cerrar archivo">❌</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Metadata */}
            <div className="xpress-sidebar">
                <div className="xpress-sidebar-header">
                    <h2>👁️ Xpress Viewer</h2>
                </div>
                
                <div className="xpress-sidebar-content">
                    {metadata ? (
                        <>
                            <div className="xpress-card">
                                <h3>Información del Archivo</h3>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Archivo</span>
                                    <span className="xpress-meta-value" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={metadata.name}>
                                        {metadata.name}
                                    </span>
                                </div>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Formato</span>
                                    <span className="xpress-meta-value">
                                        <span className="xpress-badge">{metadata.format}</span>
                                    </span>
                                </div>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Peso</span>
                                    <span className="xpress-meta-value">{metadata.size}</span>
                                </div>
                                {metadata.version && (
                                    <div className="xpress-meta-row">
                                        <span className="xpress-meta-label">Versión</span>
                                        <span className="xpress-meta-value">{metadata.version}</span>
                                    </div>
                                )}
                            </div>

                            <div className="xpress-card">
                                <h3>Vista de Producción</h3>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Resolución</span>
                                    <span className="xpress-meta-value">
                                        {metadata.width} × {metadata.height} px
                                    </span>
                                </div>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Color</span>
                                    <span className="xpress-meta-value">{metadata.colorMode}</span>
                                </div>
                                {metadata.pages && (
                                    <div className="xpress-meta-row">
                                        <span className="xpress-meta-label">Páginas</span>
                                        <span className="xpress-meta-value">{metadata.pages}</span>
                                    </div>
                                )}
                                <div className="xpress-meta-row" style={{ marginTop: '12px' }}>
                                    <span className="xpress-meta-label" style={{ fontSize: '0.8rem' }}>Motor de Preview:</span>
                                    <span className="xpress-meta-value" style={{ fontSize: '0.8rem', color: metadata.source.includes('Client') ? '#34d399' : '#fbbf24' }}>
                                        {metadata.source}
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '40px 20px' }}>
                            Abre un archivo para ver su metadata técnica.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default XpressViewer;
