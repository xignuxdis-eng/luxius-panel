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

type ToolMode = 'none' | 'measure' | 'bleed';
type Point = { x: number, y: number };

type ColorSwatch = {
    hex: string;
    rgb: [number, number, number];
    cmyk: { c: number, m: number, y: number, k: number };
    count: number;
};

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
};

const rgbToCmyk = (r: number, g: number, b: number) => {
    let c = 1 - (r / 255);
    let m = 1 - (g / 255);
    let y = 1 - (b / 255);
    let k = Math.min(c, Math.min(m, y));
    
    if (k === 1) {
        return { c: 0, m: 0, y: 0, k: 100 };
    }
    
    c = (c - k) / (1 - k);
    m = (m - k) / (1 - k);
    y = (y - k) / (1 - k);
    
    return { 
        c: Math.round(c * 100), 
        m: Math.round(m * 100), 
        y: Math.round(y * 100), 
        k: Math.round(k * 100) 
    };
};

export interface XpressViewerProps { initialFileUrl?: string; initialFile?: File; initialFileName?: string; onClose?: () => void; }

export const XpressViewer: React.FC<XpressViewerProps> = ({ initialFileUrl, initialFile, initialFileName, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [metadata, setMetadata] = useState<any>(null);
    const [statusText, setStatusText] = useState<string>('');

    // Herramientas Interactivas
    const [toolMode, setToolMode] = useState<ToolMode>('none');
    const [measureStart, setMeasureStart] = useState<Point | null>(null);
    const [measureEnd, setMeasureEnd] = useState<Point | null>(null);
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [imageScale, setImageScale] = useState(1);
    
    // Config
    const [assumedDpi, setAssumedDpi] = useState<number>(300);

    const imageRef = useRef<HTMLImageElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    React.useEffect(() => {
        if (initialFile) { processFile(initialFile); } else if (initialFileUrl) {
            const fetchFile = async () => {
                setIsProcessing(true);
                setStatusText('Descargando archivo original...');
                try {
                    const res = await fetch(initialFileUrl);
                    const blob = await res.blob();
                    const fileName = initialFileName || initialFileUrl.split('/').pop() || 'archivo_remoto';
                    const newFile = new File([blob], fileName, { type: blob.type });
                    processFile(newFile);
                } catch (e) {
                    console.error('Error fetching initial file', e);
                    setStatusText('Error descargando archivo');
                    setIsProcessing(false);
                }
            };
            fetchFile();
        }
    }, [initialFileUrl]);

    const extractColorsFromImage = (img: HTMLImageElement) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Sampling ultra rÃ¡pido a 64x64
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);
        
        const imageData = ctx.getImageData(0, 0, 64, 64).data;
        const colorCounts: Record<string, ColorSwatch> = {};
        
        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const a = imageData[i + 3];
            
            // Ignorar pÃ­xeles transparentes o fondo blanco puro
            if (a < 128) continue;
            if (r > 250 && g > 250 && b > 250) continue;
            
            // Agrupar colores cercanos (Quantization de 32 niveles)
            const step = 32;
            let qR = Math.round(r / step) * step;
            let qG = Math.round(g / step) * step;
            let qB = Math.round(b / step) * step;
            qR = qR > 255 ? 255 : qR;
            qG = qG > 255 ? 255 : qG;
            qB = qB > 255 ? 255 : qB;
            
            const key = `${qR},${qG},${qB}`;
            if (!colorCounts[key]) {
                colorCounts[key] = {
                    hex: rgbToHex(qR, qG, qB),
                    rgb: [qR, qG, qB],
                    cmyk: rgbToCmyk(qR, qG, qB),
                    count: 0
                };
            }
            colorCounts[key].count++;
        }
        
        const sortedColors = Object.values(colorCounts).sort((a, b) => b.count - a.count).slice(0, 5);
        setMetadata((prev: any) => ({ ...prev, colors: sortedColors }));
    };

    const processFile = async (uploadedFile: File) => {
        setIsProcessing(true);
        setFile(uploadedFile);
        setStatusText('Analizando formato...');
        setToolMode('none');
        setMeasureStart(null);
        setMeasureEnd(null);

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

            // 1. Bitmaps Nativos
            if (uploadedFile.type.startsWith('image/') && !['psd', 'cdr'].includes(ext || '')) {
                setStatusText('Renderizando bitmap nativo...');
                extractedPreview = URL.createObjectURL(uploadedFile);
                
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
            // 2. PDF (PDF.js)
            else if (ext === 'pdf') {
                setStatusText('Renderizando motor vectorial PDF...');
                const arrayBuffer = await uploadedFile.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);
                
                meta.pages = pdf.numPages;
                const viewport = page.getViewport({ scale: 1.5 });
                meta.width = Math.round(viewport.width);
                meta.height = Math.round(viewport.height);
                meta.colorMode = 'Documento';

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({ canvasContext: context!, viewport: viewport }).promise;
                extractedPreview = canvas.toDataURL('image/webp', 0.8);
            }
            // 3. CorelDRAW (JSZip)
            else if (ext === 'cdr') {
                setStatusText('Extrayendo ZIP interno (Fast Preview CDR)...');
                const arrayBuffer = await uploadedFile.arrayBuffer();
                const zip = new JSZip();
                
                try {
                    const loadedZip = await zip.loadAsync(arrayBuffer);
                    const previewFile = loadedZip.file("previews/thumbnail.png") || loadedZip.file("previews/thumbnail.bmp");
                    if (previewFile) {
                        const blob = await previewFile.async("blob");
                        extractedPreview = URL.createObjectURL(blob);
                        
                        const metaFile = loadedZip.file("metadata/metadata.xml");
                        if (metaFile) {
                            const xmlStr = await metaFile.async("string");
                            const versionMatch = xmlStr.match(/<cdr:version>([^<]+)<\/cdr:version>/i);
                            if (versionMatch && versionMatch[1]) {
                                meta.version = `CorelDRAW v${versionMatch[1]}`;
                            }
                        }

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
                        throw new Error("No miniatura");
                    }
                } catch (e) {
                    console.warn("Fallo ZIP CDR:", e);
                    setStatusText('Fallo Fast Preview, conectando al Backend...');
                }
            }

            if (extractedPreview) {
                setPreviewUrl(extractedPreview);
                setMetadata(meta);
                setIsProcessing(false);
                return;
            }

            // 4. Fallback Backend
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
        setToolMode('none');
        setMeasureStart(null);
        setMeasureEnd(null);
    };

    // Herramientas Interactivas: Eventos
    const handleMouseDown = (e: React.MouseEvent) => {
        if (toolMode !== 'measure' || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMeasureStart({ x, y });
        setMeasureEnd({ x, y });
        setIsMeasuring(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isMeasuring || toolMode !== 'measure' || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMeasureEnd({ x, y });
    };

    const handleMouseUp = () => {
        if (toolMode === 'measure') {
            setIsMeasuring(false);
        }
    };

    const handleImageLoad = () => {
        if (imageRef.current && metadata) {
            const displayWidth = imageRef.current.clientWidth;
            const originalWidth = metadata.width;
            if (originalWidth > 0) {
                setImageScale(displayWidth / originalWidth);
            }
            // Extraer colores si no se hizo aÃºn
            if (!metadata.colors) {
                extractColorsFromImage(imageRef.current);
            }
        }
    };

    React.useEffect(() => {
        const handleResize = () => handleImageLoad();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [metadata, previewUrl]);

    // MatemÃ¡ticas de MediciÃ³n
    const calculateDistance = () => {
        if (!measureStart || !measureEnd) return null;
        const dx = measureEnd.x - measureStart.x;
        const dy = measureEnd.y - measureStart.y;
        const pxDistanceScreen = Math.sqrt(dx * dx + dy * dy);
        
        const pxOriginal = pxDistanceScreen / imageScale;
        const currentDpi = metadata?.dpi && metadata.dpi > 0 ? metadata.dpi : assumedDpi;
        const inches = pxOriginal / currentDpi;
        const cm = inches * 2.54;
        
        return cm.toFixed(2);
    };

    const measurement = calculateDistance();

    return (
        <div className="xpress-container">
            <div className="xpress-viewport" {...getRootProps()}>
                <input {...getInputProps()} />
                
                {!file ? (
                    <div className={`xpress-dropzone ${isDragActive ? 'active' : ''}`}>
                        <div className="xpress-dropzone-icon">â˜ï¸</div>
                        <p>Arrastra un archivo aquÃ­ o haz clic para explorar</p>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px' }}>
                            Soporta: CDR, AI, EPS, PDF, SVG, JPG, PNG, WEBP
                        </span>
                        <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                            <span className="xpress-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>âš¡ Fast Preview</span>
                            <span className="xpress-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>ðŸ“ Smart Measure</span>
                            <span className="xpress-badge" style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6' }}>ðŸŽ¨ Auto Palette</span>
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
                            <div 
                                className="xpress-interactive-wrapper" 
                                style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '100%', cursor: toolMode === 'measure' ? 'crosshair' : 'default' }}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                <img 
                                    ref={imageRef}
                                    src={previewUrl} 
                                    alt="Preview" 
                                    className="xpress-preview-image" 
                                    onLoad={handleImageLoad}
                                    crossOrigin="anonymous"
                                    style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                />
                                
                                {/* Overlay Interactivo (Regla y GuÃ­as) */}
                                <svg 
                                    ref={svgRef}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                                >
                                    {toolMode === 'bleed' && (
                                        <>
                                            <rect 
                                                x="5%" y="5%" width="90%" height="90%" 
                                                fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" 
                                            />
                                            <text x="5%" y="4%" fill="#ef4444" fontSize="12" fontWeight="bold">Ãrea de Corte (Safe Area)</text>
                                            <rect 
                                                x="2%" y="2%" width="96%" height="96%" 
                                                fill="none" stroke="#3b82f6" strokeWidth="1" 
                                            />
                                            <text x="2%" y="1%" fill="#3b82f6" fontSize="12" fontWeight="bold">DemasÃ­a (Bleed)</text>
                                        </>
                                    )}

                                    {toolMode === 'measure' && measureStart && measureEnd && (
                                        <>
                                            <line 
                                                x1={measureStart.x} y1={measureStart.y} 
                                                x2={measureEnd.x} y2={measureEnd.y} 
                                                stroke="#3b82f6" strokeWidth="2" 
                                            />
                                            <circle cx={measureStart.x} cy={measureStart.y} r="4" fill="#3b82f6" />
                                            <circle cx={measureEnd.x} cy={measureEnd.y} r="4" fill="#3b82f6" />
                                            {measurement && (
                                                <g transform={`translate(${(measureStart.x + measureEnd.x) / 2}, ${(measureStart.y + measureEnd.y) / 2 - 10})`}>
                                                    <rect x="-30" y="-15" width="60" height="20" rx="4" fill="rgba(0,0,0,0.7)" />
                                                    <text x="0" y="0" fill="#fff" fontSize="12" textAnchor="middle" dominantBaseline="middle">
                                                        {measurement} cm
                                                    </text>
                                                </g>
                                            )}
                                        </>
                                    )}
                                </svg>
                            </div>
                        ) : (
                            <div style={{ color: '#ef4444' }}>
                                âš ï¸ No se pudo generar una vista previa para este archivo.
                            </div>
                        )}
                        
                        <div className="xpress-toolbar">
                            <button 
                                className={`xpress-tool-btn ${toolMode === 'measure' ? 'active' : ''}`} 
                                onClick={(e) => { e.stopPropagation(); setToolMode(toolMode === 'measure' ? 'none' : 'measure'); }} 
                                title="Regla / CintrÃ³n Digital"
                                style={toolMode === 'measure' ? { background: 'var(--accent)' } : {}}
                            >
                                ðŸ“
                            </button>
                            <button 
                                className={`xpress-tool-btn ${toolMode === 'bleed' ? 'active' : ''}`} 
                                onClick={(e) => { e.stopPropagation(); setToolMode(toolMode === 'bleed' ? 'none' : 'bleed'); }} 
                                title="GuÃ­as de Corte y DemasÃ­a"
                                style={toolMode === 'bleed' ? { background: 'var(--accent)' } : {}}
                            >
                                âœ‚ï¸
                            </button>
                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 8px' }}></div>
                            <button className="xpress-tool-btn" onClick={(e) => { e.stopPropagation(); handleClear(); }} title="Cerrar archivo">âŒ</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Metadata */}
            <div className="xpress-sidebar">
                <div className="xpress-sidebar-header">
                    <h2>ðŸ‘ï¸ Xpress Viewer</h2>
                </div>
                
                <div className="xpress-sidebar-content">
                    {metadata ? (
                        <>
                            <div className="xpress-card">
                                <h3>InformaciÃ³n del Archivo</h3>
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
                                        <span className="xpress-meta-label">VersiÃ³n</span>
                                        <span className="xpress-meta-value">{metadata.version}</span>
                                    </div>
                                )}
                            </div>

                            <div className="xpress-card">
                                <h3>Vista de ProducciÃ³n</h3>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">ResoluciÃ³n</span>
                                    <span className="xpress-meta-value">
                                        {metadata.width} Ã— {metadata.height} px
                                    </span>
                                </div>
                                
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">DPI (ResoluciÃ³n de ImpresiÃ³n)</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {(!metadata.dpi || metadata.dpi === 0) ? (
                                            <input 
                                                type="number" 
                                                value={assumedDpi} 
                                                onChange={(e) => setAssumedDpi(Number(e.target.value))}
                                                style={{ width: '60px', padding: '2px 4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
                                                title="Calibrar DPI manualmente"
                                            />
                                        ) : (
                                            <span className="xpress-meta-value">{metadata.dpi}</span>
                                        )}
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>ppp</span>
                                    </div>
                                </div>

                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Color Original</span>
                                    <span className="xpress-meta-value">{metadata.colorMode}</span>
                                </div>
                                {metadata.pages && (
                                    <div className="xpress-meta-row">
                                        <span className="xpress-meta-label">PÃ¡ginas</span>
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
                            
                            {/* Panel de Paleta de Colores (Sprint 3) */}
                            {metadata.colors && metadata.colors.length > 0 && (
                                <div className="xpress-card">
                                    <h3>Paleta de Color Estimada</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                        {metadata.colors.map((color: ColorSwatch, idx: number) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px' }}>
                                                <div 
                                                    style={{ 
                                                        width: '32px', height: '32px', borderRadius: '4px', 
                                                        backgroundColor: color.hex,
                                                        border: '1px solid rgba(255,255,255,0.1)'
                                                    }} 
                                                />
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#f8fafc' }}>
                                                        {color.hex}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                        C:{color.cmyk.c} M:{color.cmyk.m} Y:{color.cmyk.y} K:{color.cmyk.k}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '12px', textAlign: 'center' }}>
                                        *Valores CMYK calculados matemÃ¡ticamente desde previsualizaciÃ³n RGB. Solo para referencia tÃ©cnica.
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '40px 20px' }}>
                            Abre un archivo para ver su metadata tÃ©cnica.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default XpressViewer;


