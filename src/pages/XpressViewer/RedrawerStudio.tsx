import React, { useState, useEffect, useRef, useCallback } from 'react';
import ImageTracer, { ImageTracerOptions } from 'imagetracerjs';
import { svgToDxf, triggerFileDownload } from '../../utils/vectorUtils';
import './RedrawerStudio.css';

export interface RedrawerStudioProps {
    initialImageUrl?: string | null;
    initialFileName?: string;
    onSendToViewer?: (svgUrl: string, fileName: string) => void;
    onClose?: () => void;
}

type ViewMode = 'split' | 'overlay' | 'vector' | 'draw';
type PresetType = 'cutline' | 'logo' | 'detailed' | 'silhouette' | 'custom';
type DrawTool = 'pan' | 'pen' | 'line' | 'eraser';

export const RedrawerStudio: React.FC<RedrawerStudioProps> = ({
    initialImageUrl,
    initialFileName = 'imagen_vectorizada',
    onSendToViewer,
    onClose
}) => {
    // Imagen y Vector
    const [currentImage, setCurrentImage] = useState<string | null>(initialImageUrl || null);
    const [fileName, setFileName] = useState<string>(initialFileName);
    const [vectorSvg, setVectorSvg] = useState<string | null>(null);
    const [isTracing, setIsTracing] = useState<boolean>(false);
    const [statusText, setStatusText] = useState<string>('');

    // Ajustes y Presets
    const [preset, setPreset] = useState<PresetType>('logo');
    const [numberOfColors, setNumberOfColors] = useState<number>(6);
    const [curveSmooth, setCurveSmooth] = useState<number>(6); // 1 = angular, 10 = muy suave
    const [pathOmit, setPathOmit] = useState<number>(8); // Despeckle / omitir ruido
    const [blurRadius, setBlurRadius] = useState<number>(1);
    const [removeWhiteBg, setRemoveWhiteBg] = useState<boolean>(true);
    const [invertBw, setInvertBw] = useState<boolean>(false);

    // Modos de Vista & Navegación
    const [viewMode, setViewMode] = useState<ViewMode>('split');
    const [splitPos, setSplitPos] = useState<number>(50); // Porcentaje 0 - 100
    const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
    const [overlayOpacity, setOverlayOpacity] = useState<number>(0.85);
    const [zoom, setZoom] = useState<number>(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState<boolean>(false);

    // Herramientas de Dibujo Libre / Retoque
    const [drawTool, setDrawTool] = useState<DrawTool>('pen');
    const [strokeColor, setStrokeColor] = useState<string>('#ff00ff'); // Magenta corte por defecto
    const [strokeWidth, setStrokeWidth] = useState<number>(3);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [contourAdded, setContourAdded] = useState<boolean>(false);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);

    // Métricas del Vector
    const [pathCount, setPathCount] = useState<number>(0);
    const [detectedColors, setDetectedColors] = useState<string[]>([]);
    const [svgSizeKb, setSvgSizeKb] = useState<number>(0);
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 600 });

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const drawCanvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Actualizar imagen si cambia la prop
    useEffect(() => {
        if (initialImageUrl) {
            setCurrentImage(initialImageUrl);
            if (initialFileName) setFileName(initialFileName);
        }
    }, [initialImageUrl, initialFileName]);

    // Calcular dimensiones de imagen al cargar
    const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setImageDimensions({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
        initDrawCanvas(img.naturalWidth || 800, img.naturalHeight || 600);
    };

    // Inicializar Canvas de Retoque
    const initDrawCanvas = (w: number, h: number) => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    };

    // Vectorizar Imagen usando ImageTracerJS
    const traceImage = useCallback(async (imgSrc?: string) => {
        const src = imgSrc || currentImage;
        if (!src) return;

        setIsTracing(true);
        setStatusText('Vectorizando contornos Bézier...');

        try {
            // Cargar imagen en canvas temporal para asegurar acceso a ImageData y filtros previos
            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise((resolve, reject) => {
                img.onload = () => resolve(true);
                img.onerror = (e) => reject(e);
                img.src = src;
            });

            const tempCanvas = document.createElement('canvas');
            const w = img.naturalWidth || 600;
            const h = img.naturalHeight || 400;
            tempCanvas.width = w;
            tempCanvas.height = h;
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) throw new Error('No se pudo inicializar contexto 2D');

            ctx.drawImage(img, 0, 0, w, h);
            const imgData = ctx.getImageData(0, 0, w, h);

            // Pre-procesamiento de píxeles: Invertir o Forzar Monocromo si es preset cutline/silhouette
            if (invertBw || preset === 'silhouette' || preset === 'cutline') {
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const avg = 0.299 * r + 0.587 * g + 0.114 * b;
                    
                    if (preset === 'cutline' || preset === 'silhouette') {
                        // Umbral de corte binario limpio
                        const val = avg < 160 ? (invertBw ? 255 : 0) : (invertBw ? 0 : 255);
                        data[i] = val;
                        data[i + 1] = val;
                        data[i + 2] = val;
                    } else if (invertBw) {
                        data[i] = 255 - r;
                        data[i + 1] = 255 - g;
                        data[i + 2] = 255 - b;
                    }
                }
            }

            // Opciones dinámicas para ImageTracer
            // curveSmooth: 1 (muy angular) a 10 (muy suave)
            const ltresVal = Math.max(0.2, (11 - curveSmooth) * 0.4);
            const qtresVal = Math.max(0.2, (11 - curveSmooth) * 0.5);

            const options: ImageTracerOptions = {
                corsenabled: true,
                ltres: ltresVal,
                qtres: qtresVal,
                pathomit: pathOmit,
                rightangleenhance: preset === 'cutline',
                colorsampling: 2,
                numberofcolors: (preset === 'cutline' || preset === 'silhouette') ? 2 : numberOfColors,
                mincolorratio: 0,
                colorquantcycles: 3,
                roundcoords: 1,
                viewbox: true,
                desc: false,
                lcpradius: 4,
                qcpradius: 4,
                blurradius: blurRadius,
                blurdelta: 20
            };

            let svgResult = ImageTracer.imagedataToSVG(imgData, options);

            // Filtro para remover fondo blanco si está activado
            if (removeWhiteBg && svgResult) {
                // Remover paths que tienen color blanco puro rgb(255,255,255) de fondo
                svgResult = svgResult.replace(/<path[^>]*fill="rgb\(255,255,255\)"[^>]*\/>/gi, '');
                svgResult = svgResult.replace(/<path[^>]*fill="#ffffff"[^>]*\/>/gi, '');
            }

            // Análisis de métricas del SVG
            const pCount = (svgResult.match(/<path/g) || []).length;
            const sizeKb = Math.round((svgResult.length / 1024) * 10) / 10;
            
            // Extraer colores HEX del SVG
            const colorMatches = svgResult.match(/fill="(rgb\([^)]+\)|#[0-9a-f]{6}|#[0-9a-f]{3})"/gi) || [];
            const uniqueColors = Array.from(new Set(colorMatches.map(m => m.replace(/fill="|"/gi, '')))).slice(0, 16);

            setVectorSvg(svgResult);
            setPathCount(pCount);
            setSvgSizeKb(sizeKb);
            setDetectedColors(uniqueColors);
            setStatusText('Vectorización completada');
        } catch (err) {
            console.error('Error en vectorización:', err);
            setStatusText('Error durante el trazado vectorial');
        } finally {
            setIsTracing(false);
        }
    }, [currentImage, preset, numberOfColors, curveSmooth, pathOmit, blurRadius, removeWhiteBg, invertBw]);

    // Ejecutar vectorización automáticamente cuando cambia la imagen o el preset
    useEffect(() => {
        if (currentImage) {
            traceImage();
        }
    }, [currentImage, preset]);

    // Aplicar Preset
    const handleSelectPreset = (p: PresetType) => {
        setPreset(p);
        if (p === 'cutline') {
            setNumberOfColors(2);
            setCurveSmooth(7);
            setPathOmit(12);
            setRemoveWhiteBg(true);
            setBlurRadius(1);
        } else if (p === 'logo') {
            setNumberOfColors(6);
            setCurveSmooth(8);
            setPathOmit(6);
            setRemoveWhiteBg(true);
            setBlurRadius(1);
        } else if (p === 'detailed') {
            setNumberOfColors(16);
            setCurveSmooth(5);
            setPathOmit(2);
            setRemoveWhiteBg(false);
            setBlurRadius(0);
        } else if (p === 'silhouette') {
            setNumberOfColors(2);
            setCurveSmooth(8);
            setPathOmit(15);
            setRemoveWhiteBg(true);
            setBlurRadius(1);
        }
    };

    // Subir Archivo Nuevo en Redrawer
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            setFileName(file.name.replace(/\.[^/.]+$/, ''));
            const url = URL.createObjectURL(file);
            setCurrentImage(url);
            setContourAdded(false);
            clearDrawCanvas();
        }
    };

    // Cargar Muestras Rápidas
    const loadSample = (type: 'logo' | 'corte' | 'sticker') => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (type === 'logo') {
            // Fondo oscuro y logo moderno geométrico
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 600, 400);
            
            // Diamante / Isotipo
            ctx.save();
            ctx.translate(300, 160);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#6366f1';
            ctx.fillRect(-50, -50, 100, 100);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(-30, -30, 60, 60);
            ctx.restore();

            // Texto XIGNUX
            ctx.font = 'bold 36px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('XIGNUX', 300, 270);
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('SIGN & PRINT DIGITAL', 300, 300);
            setFileName('muestra_logo_xignux');
        } else if (type === 'corte') {
            // Silueta monocromo para vinilo
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 600, 400);
            
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            // Estrella de corte de 8 puntas
            const cx = 300, cy = 200, outer = 110, inner = 50;
            for (let i = 0; i < 16; i++) {
                const r = i % 2 === 0 ? outer : inner;
                const angle = (i * Math.PI) / 8;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();

            // Círculo calado en el medio
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(300, 200, 28, 0, Math.PI * 2);
            ctx.fill();
            setFileName('muestra_silueta_corte');
        } else {
            // Sticker con marco de corte
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 600, 400);

            // Círculo principal naranja
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(300, 200, 110, 0, Math.PI * 2);
            ctx.fill();

            // Rayo amarillo centro
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.moveTo(310, 120);
            ctx.lineTo(260, 200);
            ctx.lineTo(295, 200);
            ctx.lineTo(280, 280);
            ctx.lineTo(340, 190);
            ctx.lineTo(305, 190);
            ctx.closePath();
            ctx.fill();
            setFileName('muestra_sticker_turbo');
        }

        const url = canvas.toDataURL('image/png');
        setCurrentImage(url);
        clearDrawCanvas();
    };

    // Control del Split Slider
    const handleSplitMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingSplit(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDraggingSplit && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
            setSplitPos(pct);
        }

        if (isPanning) {
            setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
        }

        if (viewMode === 'draw' && isDrawing && drawCanvasRef.current) {
            const canvas = drawCanvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            if (drawTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(x, y, strokeWidth * 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
    };

    const handleMouseUp = () => {
        setIsDraggingSplit(false);
        setIsPanning(false);
        if (isDrawing && drawCanvasRef.current) {
            setIsDrawing(false);
            const ctx = drawCanvasRef.current.getContext('2d');
            ctx?.closePath();
        }
    };

    // Inicio de Dibujo Libre
    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (drawTool === 'pan') {
            setIsPanning(true);
            return;
        }

        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    // Limpiar Canvas de Dibujo
    const clearDrawCanvas = () => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        setContourAdded(false);
    };

    // Generar Línea de Troquel / Contorno Perimetral Automático (Contour Cutline)
    const generateContourCutline = () => {
        const canvas = drawCanvasRef.current;
        if (!canvas || !currentImage) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const w = canvas.width;
            const h = canvas.height;

            // Canvas auxiliar para calcular silueta
            const auxCanvas = document.createElement('canvas');
            auxCanvas.width = w;
            auxCanvas.height = h;
            const auxCtx = auxCanvas.getContext('2d');
            if (!auxCtx) return;

            auxCtx.drawImage(img, 0, 0, w, h);
            const imgData = auxCtx.getImageData(0, 0, w, h);
            const data = imgData.data;

            // Dibujar línea de corte perimetral en magenta (#ff00ff)
            ctx.save();
            ctx.strokeStyle = '#ff00ff'; // Cutline spot color estándar
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 4]); // Guía segmentada de corte

            // Detectar límites exteriores (bounding perimeter)
            let minX = w, minY = h, maxX = 0, maxY = 0;
            for (let y = 0; y < h; y += 4) {
                for (let x = 0; x < w; x += 4) {
                    const idx = (y * w + x) * 4;
                    const a = data[idx + 3];
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    // Si no es transparente ni blanco puro
                    if (a > 30 && !(r > 240 && g > 240 && b > 240)) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            // Si se detectó objeto, trazar caja redondeada de troquel con demasía
            if (maxX > minX && maxY > minY) {
                const pad = 16; // 16px de demasía perimetral
                const bx = Math.max(4, minX - pad);
                const by = Math.max(4, minY - pad);
                const bw = Math.min(w - 8, maxX - minX + pad * 2);
                const bh = Math.min(h - 8, maxY - minY + pad * 2);

                ctx.beginPath();
                ctx.roundRect(bx, by, bw, bh, 14);
                ctx.stroke();

                // Marca de registro en esquina
                ctx.fillStyle = '#ff00ff';
                ctx.font = 'bold 12px monospace';
                ctx.fillText('✂️ LÍNEA DE TROQUEL (CUTLINE SPOT)', bx + 8, by - 6);
                setContourAdded(true);
            }
            ctx.restore();
        };
        img.src = currentImage;
    };

    // Combinar trazos del dibujo manual en el SVG para exportar
    const getFinalSvgWithStrokes = (): string => {
        if (!vectorSvg) return '';
        const canvas = drawCanvasRef.current;
        if (!canvas) return vectorSvg;

        // Si el usuario dibujó algo o agregó troquel, convertir canvas a dataURL embebido en SVG
        const dataUrl = canvas.toDataURL('image/png');
        const overlayTag = `<image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}" />`;
        return vectorSvg.replace('</svg>', `${overlayTag}</svg>`);
    };

    // Exportación 1: Descargar SVG
    const handleDownloadSvg = () => {
        const finalSvg = getFinalSvgWithStrokes();
        if (!finalSvg) return;
        triggerFileDownload(finalSvg, `${fileName}_vector.svg`, 'image/svg+xml');
    };

    // Exportación 2: Descargar DXF
    const handleDownloadDxf = () => {
        if (!vectorSvg) return;
        const dxf = svgToDxf(vectorSvg);
        triggerFileDownload(dxf, `${fileName}_corte.dxf`, 'application/dxf');
    };

    // Exportación 3: Copiar SVG al Portapapeles
    const handleCopySvg = async () => {
        const finalSvg = getFinalSvgWithStrokes();
        if (!finalSvg) return;
        try {
            await navigator.clipboard.writeText(finalSvg);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2500);
        } catch (e) {
            console.error('Error al copiar SVG:', e);
        }
    };

    // Exportación 4: Descargar PNG Alta Resolución
    const handleDownloadPng = () => {
        const finalSvg = getFinalSvgWithStrokes();
        if (!finalSvg) return;

        const img = new Image();
        const svgBlob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = imageDimensions.width * 2;
            canvas.height = imageDimensions.height * 2;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) triggerFileDownload(blob, `${fileName}_HQ.png`, 'image/png');
                });
            }
            URL.revokeObjectURL(url);
        };
        img.src = url;
    };

    // Exportación 5: Enviar de vuelta a XpressViewer
    const handleSendToViewer = () => {
        const finalSvg = getFinalSvgWithStrokes();
        if (!finalSvg) return;
        const blob = new Blob([finalSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        if (onSendToViewer) {
            onSendToViewer(url, `${fileName}_vector.svg`);
        }
    };

    return (
        <div 
            className="redrawer-container" 
            onMouseMove={handleMouseMove} 
            onMouseUp={handleMouseUp}
        >
            {/* Viewport Principal */}
            <div className="redrawer-viewport" ref={containerRef}>
                
                {/* Selector de Modo de Vista Flotante */}
                <div className="redrawer-view-mode-bar">
                    <button 
                        className={`redrawer-mode-pill ${viewMode === 'split' ? 'active' : ''}`}
                        onClick={() => setViewMode('split')}
                        title="Comparar con cortina deslizante Antes / Después"
                    >
                        🌓 Comparativa Split
                    </button>
                    <button 
                        className={`redrawer-mode-pill ${viewMode === 'overlay' ? 'active' : ''}`}
                        onClick={() => setViewMode('overlay')}
                        title="Superponer vector sobre imagen original"
                    >
                        👓 Superpuesto
                    </button>
                    <button 
                        className={`redrawer-mode-pill ${viewMode === 'vector' ? 'active' : ''}`}
                        onClick={() => setViewMode('vector')}
                        title="Ver únicamente el resultado vectorial limpio"
                    >
                        🖼️ Solo Vector
                    </button>
                    <button 
                        className={`redrawer-mode-pill ${viewMode === 'draw' ? 'active' : ''}`}
                        onClick={() => setViewMode('draw')}
                        title="Lienzo de redibujo asistido y líneas de troquel"
                    >
                        ✏️ Modo Retoque
                    </button>
                </div>

                {!currentImage ? (
                    // Dropzone inicial si no hay imagen cargada
                    <div className="redrawer-dropzone">
                        <div className="redrawer-dropzone-icon">✨</div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: '#fff' }}>
                            Redrawer & Vectorizer Studio
                        </h3>
                        <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '0.95rem' }}>
                            Convierte imágenes de baja resolución (JPG, PNG, WhatsApp) en curvas vectoriales limpias (SVG) para impresión en gran formato o plotter de corte.
                        </p>
                        <label className="redrawer-btn-primary" style={{ cursor: 'pointer' }}>
                            📁 Seleccionar Archivo
                            <input 
                                type="file" 
                                accept="image/*" 
                                style={{ display: 'none' }} 
                                onChange={handleFileUpload} 
                            />
                        </label>

                        <div style={{ marginTop: '24px', width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                O prueba inmediatamente con una muestra:
                            </span>
                            <div className="redrawer-samples-grid">
                                <button className="redrawer-sample-btn" onClick={() => loadSample('logo')}>
                                    💎 Logo XignuX
                                </button>
                                <button className="redrawer-sample-btn" onClick={() => loadSample('corte')}>
                                    ✂️ Silueta Vinilo
                                </button>
                                <button className="redrawer-sample-btn" onClick={() => loadSample('sticker')}>
                                    ⚡ Calcomanía / Sticker
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Espacio de Trabajo con Lienzo Interactivo
                    <div className="redrawer-workspace">
                        <div 
                            className={`redrawer-canvas-wrapper ${viewMode === 'vector' ? 'checkerboard-bg' : ''}`}
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                            }}
                        >
                            {/* 1. MODO COMPARATIVA SPLIT */}
                            {viewMode === 'split' && (
                                <div className="redrawer-split-container">
                                    {/* Capa Izquierda: Raster Original */}
                                    <img 
                                        ref={imgRef}
                                        src={currentImage} 
                                        alt="Original" 
                                        className="redrawer-raster-layer"
                                        onLoad={handleImageLoaded}
                                    />
                                    <span className="redrawer-split-label before">Original (JPG/PNG)</span>

                                    {/* Capa Derecha: Vector SVG Cortado por el Slider */}
                                    <div 
                                        className="redrawer-split-right checkerboard-bg"
                                        style={{ width: `${100 - splitPos}%`, left: `${splitPos}%` }}
                                    >
                                        <div 
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: `-${(splitPos / (100 - splitPos)) * 100}%`,
                                                width: `${(100 / (100 - splitPos)) * 100}%`,
                                                height: '100%'
                                            }}
                                            dangerouslySetInnerHTML={{ __html: vectorSvg || '' }}
                                        />
                                    </div>
                                    <span className="redrawer-split-label after">Vector SVG (Curvas)</span>

                                    {/* Barra Divisoria del Split */}
                                    <div 
                                        className="redrawer-split-divider"
                                        style={{ left: `${splitPos}%` }}
                                        onMouseDown={handleSplitMouseDown}
                                    >
                                        <div className="redrawer-split-handle">↔</div>
                                    </div>
                                </div>
                            )}

                            {/* 2. MODO SUPERPUESTO (OVERLAY) */}
                            {viewMode === 'overlay' && (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img 
                                        src={currentImage} 
                                        alt="Original" 
                                        className="redrawer-raster-layer"
                                    />
                                    <div 
                                        className="redrawer-vector-layer"
                                        style={{ opacity: overlayOpacity }}
                                        dangerouslySetInnerHTML={{ __html: vectorSvg || '' }}
                                    />
                                </div>
                            )}

                            {/* 3. MODO SOLO VECTOR (LIMPIO) */}
                            {viewMode === 'vector' && (
                                <div 
                                    style={{ width: imageDimensions.width, height: imageDimensions.height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    dangerouslySetInnerHTML={{ __html: vectorSvg || '' }}
                                />
                            )}

                            {/* 4. MODO RETOQUE / CALCO ASISTIDO */}
                            {viewMode === 'draw' && (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img 
                                        src={currentImage} 
                                        alt="Original" 
                                        className="redrawer-raster-layer"
                                        style={{ opacity: 0.35 }}
                                    />
                                    <div 
                                        className="redrawer-vector-layer"
                                        dangerouslySetInnerHTML={{ __html: vectorSvg || '' }}
                                    />
                                    <canvas 
                                        ref={drawCanvasRef}
                                        className="redrawer-draw-canvas"
                                        onMouseDown={handleCanvasMouseDown}
                                    />
                                </div>
                            )}

                            {/* Spinner de Procesamiento */}
                            {isTracing && (
                                <div className="redrawer-processing-overlay">
                                    <div className="redrawer-spinner" />
                                    <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>
                                        {statusText}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Barra Inferior de Zoom / Navegación */}
                {currentImage && (
                    <div className="redrawer-zoom-bar">
                        <button 
                            className="redrawer-ctrl-btn" 
                            onClick={() => setZoom(z => Math.max(0.15, z - 0.25))}
                            title="Alejar"
                        >
                            ➖
                        </button>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, minWidth: '45px', textAlign: 'center' }}>
                            {Math.round(zoom * 100)}%
                        </span>
                        <button 
                            className="redrawer-ctrl-btn" 
                            onClick={() => setZoom(z => Math.min(6, z + 0.25))}
                            title="Acercar"
                        >
                            ➕
                        </button>
                        <button 
                            className="redrawer-ctrl-btn" 
                            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                            title="Restablecer Escala (100%)"
                        >
                            🎯
                        </button>

                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

                        {viewMode === 'overlay' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                                <span>Opacidad Vector:</span>
                                <input 
                                    type="range" 
                                    min="0.1" 
                                    max="1" 
                                    step="0.05"
                                    value={overlayOpacity}
                                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                                    style={{ width: '80px', accentColor: '#818cf8' }}
                                />
                                <span style={{ fontFamily: 'monospace' }}>{Math.round(overlayOpacity * 100)}%</span>
                            </div>
                        )}

                        <label 
                            className="redrawer-ctrl-btn" 
                            style={{ cursor: 'pointer' }}
                            title="Cargar otra imagen"
                        >
                            📂
                            <input 
                                type="file" 
                                accept="image/*" 
                                style={{ display: 'none' }} 
                                onChange={handleFileUpload} 
                            />
                        </label>
                    </div>
                )}
            </div>

            {/* Barra Lateral Derecha de Controles y Herramientas */}
            <div className="redrawer-sidebar">
                <div className="redrawer-sidebar-header">
                    <h2>
                        <span>✏️</span> Redrawer Studio
                    </h2>
                    {onClose && (
                        <button 
                            onClick={onClose}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                            title="Cerrar Redrawer"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="redrawer-sidebar-content">
                    
                    {/* Tarjeta 1: Presets Rápidos */}
                    <div className="redrawer-card">
                        <div className="redrawer-card-title">
                            <span>Presets de Producción</span>
                            <span style={{ fontSize: '0.7rem', color: '#6366f1' }}>1-CLICK</span>
                        </div>
                        <div className="redrawer-presets-grid">
                            <div 
                                className={`redrawer-preset-card ${preset === 'cutline' ? 'active' : ''}`}
                                onClick={() => handleSelectPreset('cutline')}
                            >
                                <span className="redrawer-preset-icon">✂️</span>
                                <span className="redrawer-preset-label">Corte de Vinilo</span>
                                <span className="redrawer-preset-desc">B/N para plotter</span>
                            </div>
                            <div 
                                className={`redrawer-preset-card ${preset === 'logo' ? 'active' : ''}`}
                                onClick={() => handleSelectPreset('logo')}
                            >
                                <span className="redrawer-preset-icon">🏷️</span>
                                <span className="redrawer-preset-label">Logo / Sticker</span>
                                <span className="redrawer-preset-desc">Colores nítidos</span>
                            </div>
                            <div 
                                className={`redrawer-preset-card ${preset === 'detailed' ? 'active' : ''}`}
                                onClick={() => handleSelectPreset('detailed')}
                            >
                                <span className="redrawer-preset-icon">🎨</span>
                                <span className="redrawer-preset-label">Ilustración</span>
                                <span className="redrawer-preset-desc">Detalle cromático</span>
                            </div>
                            <div 
                                className={`redrawer-preset-card ${preset === 'silhouette' ? 'active' : ''}`}
                                onClick={() => handleSelectPreset('silhouette')}
                            >
                                <span className="redrawer-preset-icon">🖤</span>
                                <span className="redrawer-preset-label">Silueta Sólida</span>
                                <span className="redrawer-preset-desc">Forma pura</span>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta 2: Ajustes Paramétricos de Vectorización */}
                    <div className="redrawer-card">
                        <div className="redrawer-card-title">
                            <span>Ajustes Finos de Curvas</span>
                            <button 
                                onClick={() => traceImage()} 
                                disabled={isTracing || !currentImage}
                                style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                            >
                                🔄 Actualizar
                            </button>
                        </div>

                        {/* Cantidad de Colores */}
                        <div className="redrawer-slider-group">
                            <div className="redrawer-slider-header">
                                <span>Cantidad de Colores:</span>
                                <span className="redrawer-slider-val">{numberOfColors}</span>
                            </div>
                            <input 
                                type="range" 
                                min="2" 
                                max="32" 
                                step="1"
                                className="redrawer-range"
                                value={numberOfColors}
                                onChange={(e) => {
                                    setNumberOfColors(parseInt(e.target.value));
                                    setPreset('custom');
                                }}
                            />
                        </div>

                        {/* Suavizado Bézier */}
                        <div className="redrawer-slider-group">
                            <div className="redrawer-slider-header">
                                <span>Suavizado de Curvas (Smooth):</span>
                                <span className="redrawer-slider-val">{curveSmooth}/10</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1"
                                className="redrawer-range"
                                value={curveSmooth}
                                onChange={(e) => {
                                    setCurveSmooth(parseInt(e.target.value));
                                    setPreset('custom');
                                }}
                            />
                        </div>

                        {/* Filtro de Ruido (Despeckle) */}
                        <div className="redrawer-slider-group">
                            <div className="redrawer-slider-header">
                                <span>Filtro de Manchas (Omitir Ruido):</span>
                                <span className="redrawer-slider-val">{pathOmit} px</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="30" 
                                step="2"
                                className="redrawer-range"
                                value={pathOmit}
                                onChange={(e) => {
                                    setPathOmit(parseInt(e.target.value));
                                    setPreset('custom');
                                }}
                            />
                        </div>

                        {/* Opciones booleanas */}
                        <label className="redrawer-checkbox-row">
                            <input 
                                type="checkbox" 
                                checked={removeWhiteBg}
                                onChange={(e) => setRemoveWhiteBg(e.target.checked)}
                            />
                            <span>Quitar fondo blanco (Fondo Transparente)</span>
                        </label>

                        <label className="redrawer-checkbox-row">
                            <input 
                                type="checkbox" 
                                checked={invertBw}
                                onChange={(e) => setInvertBw(e.target.checked)}
                            />
                            <span>Invertir colores (Logo blanco sobre negro)</span>
                        </label>
                    </div>

                    {/* Tarjeta 3: Herramientas de Retoque / Dibujo Manual */}
                    <div className="redrawer-card">
                        <div className="redrawer-card-title">
                            <span>Retoque Asistido & Troquel</span>
                        </div>

                        <div className="redrawer-draw-tools">
                            <button 
                                className={`redrawer-tool-choice ${drawTool === 'pen' ? 'active' : ''}`}
                                onClick={() => { setDrawTool('pen'); setViewMode('draw'); }}
                                title="Pluma de dibujo libre"
                            >
                                <span>🖌️</span>
                                <span>Pluma</span>
                            </button>
                            <button 
                                className={`redrawer-tool-choice ${drawTool === 'eraser' ? 'active' : ''}`}
                                onClick={() => { setDrawTool('eraser'); setViewMode('draw'); }}
                                title="Borrador de trazos"
                            >
                                <span>🧹</span>
                                <span>Borrador</span>
                            </button>
                            <button 
                                className="redrawer-tool-choice"
                                onClick={clearDrawCanvas}
                                title="Borrar retoques"
                            >
                                <span>🗑️</span>
                                <span>Limpiar</span>
                            </button>
                        </div>

                        {/* Generador Automático de Línea de Corte */}
                        <button 
                            className={`redrawer-btn-secondary ${contourAdded ? 'active' : ''}`}
                            onClick={generateContourCutline}
                            style={{ width: '100%', marginBottom: '10px' }}
                            title="Calcula automáticamente el borde de corte exterior para stickers"
                        >
                            ✂️ Generar Contorno de Corte (Cutline)
                        </button>

                        {/* Selector de color y grosor de pincel */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Color:</span>
                            {['#ff00ff', '#000000', '#ffffff', '#00e5ff', '#22c55e'].map((c) => (
                                <div 
                                    key={c}
                                    onClick={() => setStrokeColor(c)}
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        backgroundColor: c,
                                        border: strokeColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                                        cursor: 'pointer',
                                        boxShadow: strokeColor === c ? '0 0 6px rgba(255,255,255,0.8)' : 'none'
                                    }}
                                />
                            ))}
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{strokeWidth}px</span>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="12" 
                                    value={strokeWidth} 
                                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                                    style={{ width: '50px', accentColor: '#ff00ff' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta 4: Métricas del Vector Generado */}
                    {vectorSvg && (
                        <div className="redrawer-card">
                            <div className="redrawer-card-title">
                                <span>Métricas Vectoriales</span>
                                <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>SVG OK</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                                <span style={{ color: '#94a3b8' }}>Trazos Bézier:</span>
                                <span style={{ fontWeight: 600, color: '#f8fafc' }}>{pathCount} paths</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                                <span style={{ color: '#94a3b8' }}>Peso del archivo:</span>
                                <span style={{ fontWeight: 600, color: '#f8fafc' }}>{svgSizeKb} KB</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
                                <span style={{ color: '#94a3b8' }}>Resolución base:</span>
                                <span style={{ fontWeight: 600, color: '#f8fafc' }}>{imageDimensions.width} × {imageDimensions.height} px</span>
                            </div>

                            {detectedColors.length > 0 && (
                                <div style={{ marginTop: '8px' }}>
                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                                        Paleta Vectorial ({detectedColors.length} colores):
                                    </span>
                                    <div className="redrawer-palette-grid">
                                        {detectedColors.map((c, i) => (
                                            <div 
                                                key={i} 
                                                className="redrawer-color-chip" 
                                                style={{ backgroundColor: c }}
                                                title={c}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tarjeta 5: Exportación y Acciones */}
                    <div className="redrawer-actions-container">
                        <button 
                            className="redrawer-btn-primary"
                            onClick={handleDownloadSvg}
                            disabled={!vectorSvg}
                        >
                            💾 Descargar SVG Vectorial
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button 
                                className="redrawer-btn-secondary"
                                onClick={handleDownloadDxf}
                                disabled={!vectorSvg}
                                title="Para Router CNC, Láser CO2 o Plotter de corte"
                            >
                                📐 Descargar DXF
                            </button>
                            <button 
                                className="redrawer-btn-secondary"
                                onClick={handleCopySvg}
                                disabled={!vectorSvg}
                                title="Copiar código SVG para Illustrator o Figma"
                            >
                                {copySuccess ? '✅ ¡Copiado!' : '📋 Copiar SVG'}
                            </button>
                        </div>

                        <button 
                            className="redrawer-btn-secondary"
                            onClick={handleDownloadPng}
                            disabled={!vectorSvg}
                            title="Descargar versión renderizada limpia a alta resolución"
                        >
                            🖼️ Exportar PNG 300 DPI
                        </button>

                        {onSendToViewer && (
                            <button 
                                className="redrawer-btn-success"
                                onClick={handleSendToViewer}
                                disabled={!vectorSvg}
                                title="Vuelve a la pestaña de medición con el vector generado"
                            >
                                👁️ Inspeccionar y Medir en Visor
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default RedrawerStudio;
