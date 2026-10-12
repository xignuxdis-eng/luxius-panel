// src/pages/XpressViewer/printsheeter/PrintSheeterStudio.tsx
// Estudio Interactivo de Mosaicos, Nesting de Bobinas y Análisis de Materiales (PrintSheeter HD)

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './PrintSheeterStudio.css';
import { ImageDataItem, MosaicPattern, LayoutResult, Placement } from './types';
import { MosaicEngine } from './mosaicEngine';
import { NestingEngine } from './nestingEngine';
import { Order } from '@/types/orden';

export interface PrintSheeterStudioProps {
    initialImageUrl?: string;
    initialFileName?: string;
    order?: Order | null;
    onSendToViewer?: (imageUrl: string, fileName: string) => void;
    onClose?: () => void;
}

const PRESET_ROLLS = [
    { label: 'Bobina 1.07m (107 cm)', value: 1070 },
    { label: 'Bobina 1.27m (127 cm)', value: 1270 },
    { label: 'Bobina 1.37m (137 cm) - Estándar', value: 1370 },
    { label: 'Bobina 1.52m (152 cm)', value: 1520 },
    { label: 'Bobina 1.60m (160 cm)', value: 1600 },
    { label: 'Bobina 2.00m (200 cm)', value: 2000 },
    { label: 'Bobina 3.20m (320 cm) - Gran Formato', value: 3200 }
];

const PRESET_CANVAS_SIZES = [
    { label: '50 x 70 cm (Póster)', w: 50, h: 70 },
    { label: '70 x 100 cm (Medio pliego)', w: 70, h: 100 },
    { label: '100 x 100 cm (Cuadrado 1m)', w: 100, h: 100 },
    { label: '150 x 100 cm (Vidriera)', w: 150, h: 100 },
    { label: '200 x 100 cm (Lona 2m)', w: 200, h: 100 },
    { label: '300 x 150 cm (Cartel 3x1.5m)', w: 300, h: 150 }
];

export const PrintSheeterStudio: React.FC<PrintSheeterStudioProps> = ({
    initialImageUrl,
    initialFileName,
    order,
    onSendToViewer,
    onClose
}) => {
    // Modo de trabajo
    const [mode, setMode] = useState<'mosaic' | 'nesting' | 'analysis'>('mosaic');

    // Galería de Assets / Diseños
    const [images, setImages] = useState<ImageDataItem[]>([]);
    const [centerpieceId, setCenterpieceId] = useState<string | null>(null);

    // Parámetros de Mosaicos
    const [pattern, setPattern] = useState<MosaicPattern>('spiral');
    const [canvasWidthCm, setCanvasWidthCm] = useState<number>(100);
    const [canvasHeightCm, setCanvasHeightCm] = useState<number>(100);
    const [copies, setCopies] = useState<number>(40);
    const [mosaicSpacingMm, setMosaicSpacingMm] = useState<number>(12);
    const [evadeCenter, setEvadeCenter] = useState<boolean>(true);
    const [fadeBorders, setFadeBorders] = useState<boolean>(false);
    const [bgColor, setBgColor] = useState<string>('#ffffff');

    // Parámetros de Nesting
    const [rollWidthMm, setRollWidthMm] = useState<number>(1370);
    const [nestingSpacingMm, setNestingSpacingMm] = useState<number>(10);
    const [allowRotation, setAllowRotation] = useState<boolean>(true);
    const [copiesPerAsset, setCopiesPerAsset] = useState<number>(1);

    // Canvas & Viewport (Zoom y Paneo)
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [zoom, setZoom] = useState<number>(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Estado de procesamiento y exportación
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [exportProgressText, setExportProgressText] = useState<string>('');
    const [cachedImgElements, setCachedImgElements] = useState<Map<string, HTMLImageElement>>(new Map());

    // Cargar imagen inicial de la OT si existe
    useEffect(() => {
        if (initialImageUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = initialImageUrl;
            img.onload = () => {
                const item: ImageDataItem = {
                    id: 'init-1',
                    url: initialImageUrl,
                    filename: initialFileName || 'diseno_ot.png',
                    widthPx: img.naturalWidth || 800,
                    heightPx: img.naturalHeight || 800,
                    dpiX: 300,
                    dpiY: 300,
                    isCenterpiece: false
                };
                setImages([item]);
                setCenterpieceId(item.id);
            };
        }
    }, [initialImageUrl, initialFileName]);

    // Pre-cargar imágenes para el canvas 2D
    useEffect(() => {
        const newMap = new Map(cachedImgElements);
        let updated = false;

        images.forEach((item) => {
            if (!newMap.has(item.url)) {
                const htmlImg = new Image();
                htmlImg.crossOrigin = 'anonymous';
                htmlImg.src = item.url;
                htmlImg.onload = () => {
                    // Extraer color promedio si no lo tiene
                    if (!item.avgColor) {
                        try {
                            const sampleCanvas = document.createElement('canvas');
                            sampleCanvas.width = 1;
                            sampleCanvas.height = 1;
                            const sCtx = sampleCanvas.getContext('2d');
                            if (sCtx) {
                                sCtx.drawImage(htmlImg, 0, 0, 1, 1);
                                const p = sCtx.getImageData(0, 0, 1, 1).data;
                                item.avgColor = [p[0], p[1], p[2]];
                            }
                        } catch (_) {}
                    }
                    setCachedImgElements(new Map(newMap.set(item.url, htmlImg)));
                };
                newMap.set(item.url, htmlImg);
                updated = true;
            }
        });

        if (updated) setCachedImgElements(newMap);
    }, [images]);

    // Subida múltiple de archivos locales (PNG, JPG, SVG)
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newItems: ImageDataItem[] = [];
        Array.from(files).forEach((file, idx) => {
            const url = URL.createObjectURL(file);
            const htmlImg = new Image();
            htmlImg.crossOrigin = 'anonymous';
            htmlImg.src = url;
            htmlImg.onload = () => {
                const item: ImageDataItem = {
                    id: `upload-${Date.now()}-${idx}`,
                    url,
                    filename: file.name,
                    widthPx: htmlImg.naturalWidth || 600,
                    heightPx: htmlImg.naturalHeight || 600,
                    dpiX: 300,
                    dpiY: 300
                };
                setImages((prev) => [...prev, item]);
                if (!centerpieceId) setCenterpieceId(item.id);
            };
        });
        e.target.value = '';
    };

    // Centro activo para el patrón
    const centerpieceItem = useMemo(() => {
        return images.find((img) => img.id === centerpieceId) || images[0] || null;
    }, [images, centerpieceId]);

    // Cálculo del Layout según el Modo Activo
    const layoutResult: LayoutResult | null = useMemo(() => {
        if (!images.length) return null;

        if (mode === 'mosaic') {
            const engine = new MosaicEngine(canvasWidthCm * 10, canvasHeightCm * 10);
            const masterDpi = 72; // Vista previa ágil en pantalla

            switch (pattern) {
                case 'spiral':
                    return engine.generateSpiral(images, copies, mosaicSpacingMm, masterDpi, centerpieceItem, evadeCenter, fadeBorders);
                case 'frame':
                    return engine.generateFrame(images, copies, mosaicSpacingMm, masterDpi, centerpieceItem, evadeCenter, fadeBorders);
                case 'waves':
                    return engine.generateWaves(images, copies, mosaicSpacingMm, masterDpi, centerpieceItem, evadeCenter, fadeBorders);
                case 'halftone':
                    return engine.generateHalftone(images, copies, mosaicSpacingMm, masterDpi, centerpieceItem, evadeCenter, fadeBorders);
                case 'diagonals':
                    return engine.generateDiagonals(images, copies, mosaicSpacingMm, masterDpi, centerpieceItem, evadeCenter, fadeBorders);
                case 'spiral_lines':
                    return engine.generateSpiralLines(images, copies, mosaicSpacingMm, masterDpi, centerpieceItem, evadeCenter, fadeBorders);
                case 'photo_mosaic': {
                    if (!centerpieceItem) return null;
                    const cols = Math.max(10, Math.min(60, Math.round(Math.sqrt(copies) * 1.5)));
                    const rows = cols;
                    // Muestrear píxeles del centerpiece en canvas auxiliar
                    const sampleC = document.createElement('canvas');
                    sampleC.width = cols;
                    sampleC.height = rows;
                    const sCtx = sampleC.getContext('2d');
                    const cpImg = cachedImgElements.get(centerpieceItem.url);
                    if (sCtx && cpImg) {
                        sCtx.drawImage(cpImg, 0, 0, cols, rows);
                        const imgData = sCtx.getImageData(0, 0, cols, rows).data;
                        return engine.generatePhotoMosaic(images, copies, centerpieceItem, imgData, cols, rows, masterDpi);
                    }
                    return engine.generateFrame(images, copies, mosaicSpacingMm, masterDpi, centerpieceItem, false, false);
                }
                default:
                    return engine.generateSpiral(images, copies, mosaicSpacingMm, masterDpi, centerpieceItem, evadeCenter, fadeBorders);
            }
        } else if (mode === 'nesting') {
            // Expandir imágenes según copias por asset
            const expandedList: ImageDataItem[] = [];
            images.forEach((img) => {
                for (let k = 0; k < copiesPerAsset; k++) {
                    expandedList.push(img);
                }
            });

            const engine = new NestingEngine(rollWidthMm, nestingSpacingMm, allowRotation);
            return engine.calculateLayout(expandedList, 72);
        }

        return null;
    }, [
        mode,
        images,
        pattern,
        canvasWidthCm,
        canvasHeightCm,
        copies,
        mosaicSpacingMm,
        centerpieceItem,
        evadeCenter,
        fadeBorders,
        rollWidthMm,
        nestingSpacingMm,
        allowRotation,
        copiesPerAsset,
        cachedImgElements
    ]);

    // Análisis de Comparación de Bobinas
    const materialAnalysis = useMemo(() => {
        if (!images.length) return null;
        const expandedList: ImageDataItem[] = [];
        images.forEach((img) => {
            for (let k = 0; k < copiesPerAsset; k++) expandedList.push(img);
        });
        return NestingEngine.compareRolls(expandedList, nestingSpacingMm, allowRotation);
    }, [images, copiesPerAsset, nestingSpacingMm, allowRotation]);

    // Render loop del canvas interactivo
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !layoutResult) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = layoutResult.canvasWidthPx;
        const h = layoutResult.canvasHeightPx;
        canvas.width = w;
        canvas.height = h;

        // Fondo
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);

        // Guías de cuadrícula de taller
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        const gridStep = Math.round((50 / 25.4) * layoutResult.masterDpi); // 50 mm
        for (let x = 0; x < w; x += gridStep) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridStep) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Dibujar colocaciones (Placements)
        layoutResult.placements.forEach((p) => {
            const htmlImg = cachedImgElements.get(p.url);
            ctx.save();
            ctx.globalAlpha = p.opacity;

            if (htmlImg && htmlImg.complete && htmlImg.naturalWidth > 0) {
                if (p.rot90) {
                    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
                    ctx.rotate(Math.PI / 2);
                    ctx.drawImage(htmlImg, -p.h / 2, -p.w / 2, p.h, p.w);
                } else {
                    ctx.drawImage(htmlImg, p.x, p.y, p.w, p.h);
                }
            } else {
                // Placeholder si la imagen aún carga
                ctx.fillStyle = p.isCenterpiece ? '#f59e0b' : '#38bdf8';
                ctx.fillRect(p.x, p.y, p.w, p.h);
            }

            // Borde sutil del tile
            ctx.strokeStyle = p.isCenterpiece ? '#f59e0b' : 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = p.isCenterpiece ? 2 : 1;
            ctx.strokeRect(p.x, p.y, p.w, p.h);

            ctx.restore();
        });
    }, [layoutResult, bgColor, cachedImgElements]);

    // Zoom y Paneo con Mouse
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        setZoom((prev) => Math.max(0.08, Math.min(5, prev * factor)));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const resetView = () => {
        setZoom(0.65);
        setPan({ x: 0, y: 0 });
    };

    // Exportación Rápida Web (JPG / PNG en alta definición)
    const handleQuickExport = (format: 'png' | 'jpeg') => {
        if (!canvasRef.current) return;
        setIsExporting(true);
        setExportProgressText('Generando imagen de alta resolución...');

        setTimeout(() => {
            try {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const mime = format === 'png' ? 'image/png' : 'image/jpeg';
                const quality = format === 'jpeg' ? 0.95 : undefined;
                const dataUrl = canvas.toDataURL(mime, quality);

                const link = document.createElement('a');
                link.download = `printsheeter_${mode}_${Date.now()}.${format === 'png' ? 'png' : 'jpg'}`;
                link.href = dataUrl;
                link.click();
                setExportProgressText('¡Descarga completada!');
            } catch (err: any) {
                alert(`Error al exportar: ${err?.message || err}`);
            } finally {
                setIsExporting(false);
            }
        }, 300);
    };

    // Enviar composición de regreso al Visor Xpress
    const handleSendBackToViewer = () => {
        if (!canvasRef.current || !onSendToViewer) return;
        setIsExporting(true);
        setExportProgressText('Enviando resultado a Xpress Viewer...');

        setTimeout(() => {
            try {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
                const title = `printsheeter_${mode}_${pattern}_${Date.now()}.jpg`;
                onSendToViewer(dataUrl, title);
            } catch (err: any) {
                alert(`Error: ${err?.message}`);
            } finally {
                setIsExporting(false);
            }
        }, 200);
    };

    return (
        <div className="ps-studio-container" id="printsheeter-studio">
            {/* Barra Superior */}
            <div className="ps-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.4rem' }}>🧩</span>
                        <div>
                            <span style={{ fontWeight: 800, fontSize: '0.96rem', letterSpacing: 0.5, color: '#f8fafc' }}>
                                PrintSheeter HD
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#38bdf8', marginLeft: 8, fontWeight: 600 }}>
                                v2.0 Web Studio
                            </span>
                        </div>
                    </div>

                    {/* Selector de Modo */}
                    <div className="ps-mode-selector">
                        <button
                            type="button"
                            className={`ps-mode-btn ${mode === 'mosaic' ? 'active' : ''}`}
                            onClick={() => setMode('mosaic')}
                        >
                            🎨 Mosaicos & Deco
                        </button>
                        <button
                            type="button"
                            className={`ps-mode-btn ${mode === 'nesting' ? 'active' : ''}`}
                            onClick={() => setMode('nesting')}
                        >
                            📐 Nesting de Bobina
                        </button>
                        <button
                            type="button"
                            className={`ps-mode-btn ${mode === 'analysis' ? 'active' : ''}`}
                            onClick={() => setMode('analysis')}
                        >
                            📊 Análisis de Material
                        </button>
                    </div>
                </div>

                {/* Acciones principales */}
                <div className="ps-topbar-actions">
                    <button
                        type="button"
                        className="ps-btn ps-btn-secondary"
                        onClick={() => handleQuickExport('png')}
                        disabled={!layoutResult || isExporting}
                        title="Descargar imagen PNG con transparencia o fondo sólido"
                    >
                        💾 Exportar PNG
                    </button>
                    <button
                        type="button"
                        className="ps-btn ps-btn-secondary"
                        onClick={() => handleQuickExport('jpeg')}
                        disabled={!layoutResult || isExporting}
                        title="Descargar JPEG de alta calidad listo para imprimir"
                    >
                        📸 Exportar JPG (Q=95)
                    </button>
                    {onSendToViewer && (
                        <button
                            type="button"
                            className="ps-btn ps-btn-primary"
                            onClick={handleSendBackToViewer}
                            disabled={!layoutResult || isExporting}
                            title="Llevar la composición a Xpress Viewer para medición, demasías o aprobación"
                        >
                            👁️ Enviar a Visor Xpress
                        </button>
                    )}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '0 6px' }}
                            title="Cerrar estudio"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Layout Principal: Panel de Control + Visor Interactivo */}
            <div className="ps-main-layout">
                {/* Panel Lateral de Parámetros */}
                <div className="ps-sidebar">
                    {/* Sección 1: Diseños y Assets */}
                    <div className="ps-sidebar-section">
                        <div className="ps-section-title">
                            <span>🖼️ Diseños cargados ({images.length})</span>
                        </div>

                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                padding: '8px 12px',
                                background: '#1e293b',
                                border: '1px dashed #38bdf8',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                color: '#38bdf8',
                                fontWeight: 600
                            }}
                        >
                            <span>➕ Subir diseños o patrones</span>
                            <input
                                type="file"
                                multiple
                                accept="image/png,image/jpeg,image/svg+xml"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                        </label>

                        {images.length > 0 && (
                            <div className="ps-assets-tray">
                                {images.map((img) => (
                                    <div
                                        key={img.id}
                                        className={`ps-asset-thumb ${centerpieceId === img.id ? 'centerpiece' : ''}`}
                                        title={`${img.filename} (${img.widthPx}x${img.heightPx} px) - Clic para marcar como Centro`}
                                        onClick={() => setCenterpieceId(img.id)}
                                    >
                                        <img src={img.url} alt={img.filename} />
                                        {centerpieceId === img.id && (
                                            <span className="ps-asset-badge" style={{ color: '#f59e0b' }}>
                                                CENTRO
                                            </span>
                                        )}
                                        {images.length > 1 && (
                                            <button
                                                type="button"
                                                className="ps-asset-remove"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setImages((prev) => prev.filter((i) => i.id !== img.id));
                                                    if (centerpieceId === img.id) {
                                                        const remaining = images.filter((i) => i.id !== img.id);
                                                        setCenterpieceId(remaining[0]?.id || null);
                                                    }
                                                }}
                                                title="Eliminar diseño"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 6 }}>
                            * Haz clic en una miniatura para fijarla como diseño central (Centerpiece).
                        </p>
                    </div>

                    {/* MODO 1: Parámetros de Mosaicos */}
                    {mode === 'mosaic' && (
                        <div className="ps-sidebar-section">
                            <div className="ps-section-title">
                                <span>🎨 Algoritmo de Mosaico</span>
                            </div>

                            <div className="ps-patterns-grid">
                                <div
                                    className={`ps-pattern-card ${pattern === 'spiral' ? 'active' : ''}`}
                                    onClick={() => setPattern('spiral')}
                                >
                                    <span className="ps-pattern-icon">🌀</span>
                                    <span className="ps-pattern-name">Espiral Áurea</span>
                                </div>
                                <div
                                    className={`ps-pattern-card ${pattern === 'frame' ? 'active' : ''}`}
                                    onClick={() => setPattern('frame')}
                                >
                                    <span className="ps-pattern-icon">📐</span>
                                    <span className="ps-pattern-name">Matriz / Marco</span>
                                </div>
                                <div
                                    className={`ps-pattern-card ${pattern === 'waves' ? 'active' : ''}`}
                                    onClick={() => setPattern('waves')}
                                >
                                    <span className="ps-pattern-icon">🌊</span>
                                    <span className="ps-pattern-name">Ondas Senoidales</span>
                                </div>
                                <div
                                    className={`ps-pattern-card ${pattern === 'halftone' ? 'active' : ''}`}
                                    onClick={() => setPattern('halftone')}
                                >
                                    <span className="ps-pattern-icon">🔘</span>
                                    <span className="ps-pattern-name">Halftone Radial</span>
                                </div>
                                <div
                                    className={`ps-pattern-card ${pattern === 'diagonals' ? 'active' : ''}`}
                                    onClick={() => setPattern('diagonals')}
                                >
                                    <span className="ps-pattern-icon">🧱</span>
                                    <span className="ps-pattern-name">Ladrillo / Diagonal</span>
                                </div>
                                <div
                                    className={`ps-pattern-card ${pattern === 'spiral_lines' ? 'active' : ''}`}
                                    onClick={() => setPattern('spiral_lines')}
                                >
                                    <span className="ps-pattern-icon">🌌</span>
                                    <span className="ps-pattern-name">Brazos Espirales</span>
                                </div>
                                <div
                                    className={`ps-pattern-card ${pattern === 'photo_mosaic' ? 'active' : ''}`}
                                    onClick={() => setPattern('photo_mosaic')}
                                >
                                    <span className="ps-pattern-icon">🖼️</span>
                                    <span className="ps-pattern-name">Foto-Mosaico RGB</span>
                                </div>
                            </div>

                            {/* Dimensiones del Lienzo */}
                            <div className="ps-form-group">
                                <label className="ps-label">Tamaño predefinido:</label>
                                <select
                                    className="ps-select"
                                    onChange={(e) => {
                                        const found = PRESET_CANVAS_SIZES.find((s) => s.label === e.target.value);
                                        if (found) {
                                            setCanvasWidthCm(found.w);
                                            setCanvasHeightCm(found.h);
                                        }
                                    }}
                                >
                                    <option value="">Personalizado...</option>
                                    {PRESET_CANVAS_SIZES.map((s) => (
                                        <option key={s.label} value={s.label}>
                                            {s.label} ({s.w}x{s.h} cm)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="ps-input-row">
                                <div className="ps-form-group" style={{ flex: 1 }}>
                                    <label className="ps-label">Ancho (cm):</label>
                                    <input
                                        type="number"
                                        className="ps-input"
                                        value={canvasWidthCm}
                                        min={10}
                                        max={1000}
                                        onChange={(e) => setCanvasWidthCm(Math.max(5, Number(e.target.value)))}
                                    />
                                </div>
                                <div className="ps-form-group" style={{ flex: 1 }}>
                                    <label className="ps-label">Alto (cm):</label>
                                    <input
                                        type="number"
                                        className="ps-input"
                                        value={canvasHeightCm}
                                        min={10}
                                        max={1000}
                                        onChange={(e) => setCanvasHeightCm(Math.max(5, Number(e.target.value)))}
                                    />
                                </div>
                            </div>

                            {/* Cantidad de Copias */}
                            <div className="ps-form-group">
                                <label className="ps-label">
                                    <span>Copias / Tiles:</span>
                                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>{copies}</span>
                                </label>
                                <input
                                    type="range"
                                    min={4}
                                    max={250}
                                    value={copies}
                                    onChange={(e) => setCopies(Number(e.target.value))}
                                    style={{ accentColor: '#0284c7' }}
                                />
                            </div>

                            {/* Espaciado en mm */}
                            <div className="ps-form-group">
                                <label className="ps-label">
                                    <span>Espaciado entre piezas:</span>
                                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>{mosaicSpacingMm} mm</span>
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={mosaicSpacingMm}
                                    onChange={(e) => setMosaicSpacingMm(Number(e.target.value))}
                                    style={{ accentColor: '#0284c7' }}
                                />
                            </div>

                            {/* Opciones Avanzadas */}
                            <div style={{ marginTop: 10 }}>
                                <label className="ps-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={evadeCenter}
                                        onChange={(e) => setEvadeCenter(e.target.checked)}
                                    />
                                    <span>Evadir Centro (No solapar con el diseño principal)</span>
                                </label>

                                <label className="ps-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={fadeBorders}
                                        onChange={(e) => setFadeBorders(e.target.checked)}
                                    />
                                    <span>Desvanecer Bordes (Gradiente radial de opacidad)</span>
                                </label>
                            </div>

                            {/* Color de Fondo */}
                            <div className="ps-form-group" style={{ marginTop: 8 }}>
                                <label className="ps-label">Color de Fondo del Lienzo:</label>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={bgColor}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        style={{ width: 42, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                        {bgColor.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODO 2: Parámetros de Nesting */}
                    {mode === 'nesting' && (
                        <div className="ps-sidebar-section">
                            <div className="ps-section-title">
                                <span>📐 Parámetros de Bobina</span>
                            </div>

                            <div className="ps-form-group">
                                <label className="ps-label">Ancho de Rollo / Bobina:</label>
                                <select
                                    className="ps-select"
                                    value={rollWidthMm}
                                    onChange={(e) => setRollWidthMm(Number(e.target.value))}
                                >
                                    {PRESET_ROLLS.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="ps-form-group">
                                <label className="ps-label">
                                    <span>Espaciado de corte (demasía):</span>
                                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>{nestingSpacingMm} mm</span>
                                </label>
                                <input
                                    type="range"
                                    min={2}
                                    max={50}
                                    value={nestingSpacingMm}
                                    onChange={(e) => setNestingSpacingMm(Number(e.target.value))}
                                    style={{ accentColor: '#0284c7' }}
                                />
                            </div>

                            <div className="ps-form-group">
                                <label className="ps-label">
                                    <span>Copias por cada diseño:</span>
                                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>{copiesPerAsset}x</span>
                                </label>
                                <input
                                    type="number"
                                    className="ps-input"
                                    value={copiesPerAsset}
                                    min={1}
                                    max={100}
                                    onChange={(e) => setCopiesPerAsset(Math.max(1, Number(e.target.value)))}
                                />
                            </div>

                            <label className="ps-checkbox-row" style={{ marginTop: 10 }}>
                                <input
                                    type="checkbox"
                                    checked={allowRotation}
                                    onChange={(e) => setAllowRotation(e.target.checked)}
                                />
                                <span>Permitir rotación a 90° (Optimización de ancho)</span>
                            </label>
                        </div>
                    )}

                    {/* MODO 3: Análisis de Material */}
                    {mode === 'analysis' && materialAnalysis && (
                        <div className="ps-sidebar-section">
                            <div className="ps-section-title">
                                <span>📊 Comparador de Rendimiento</span>
                            </div>

                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 12 }}>
                                Total a imprimir: <strong style={{ color: '#38bdf8' }}>{materialAnalysis.totalAreaM2} m²</strong> en{' '}
                                <strong style={{ color: '#f1f5f9' }}>{materialAnalysis.totalFiles} piezas</strong>.
                                <br />
                                Bobina sugerida por menor merma:{' '}
                                <strong style={{ color: '#10b981' }}>{materialAnalysis.recommendedRoll}</strong>
                            </div>

                            <div className="ps-analysis-cards">
                                {materialAnalysis.estimates.map((est) => (
                                    <div
                                        key={est.rollWidthCm}
                                        className={`ps-analysis-card ${est.isRecommended ? 'recommended' : ''}`}
                                    >
                                        <div>
                                            <div className="ps-roll-title">
                                                Rollo {est.rollWidthCm} cm
                                                {est.isRecommended && (
                                                    <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#34d399', fontWeight: 800 }}>
                                                        ★ RECOMENDADO
                                                    </span>
                                                )}
                                            </div>
                                            <div className="ps-roll-details">
                                                Largo: <strong>{est.linearMeters} m lin.</strong> · Consumo: {est.areaM2} m²
                                            </div>
                                        </div>
                                        <div>
                                            <span className={`ps-efficiency-pill ${est.wastePercent <= 18 ? 'good' : ''}`}>
                                                Merma: {est.wastePercent}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Viewport del Canvas Interactivo con Zoom y Paneo */}
                <div
                    className="ps-canvas-viewport"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Badge flotante de estadísticas */}
                    {layoutResult && (
                        <div className="ps-stats-floating-badge">
                            <div>
                                Dimensiones:{' '}
                                <span className="ps-badge-value">
                                    {(layoutResult.canvasWidthMm / 10).toFixed(1)} x {(layoutResult.canvasHeightMm / 10).toFixed(1)} cm
                                </span>
                            </div>
                            <div>
                                Piezas ubicadas:{' '}
                                <span className="ps-badge-value">{layoutResult.placements.length}</span>
                            </div>
                            {layoutResult.totalLinearMeters != null && (
                                <div>
                                    Metros lineales:{' '}
                                    <span className="ps-badge-value">{layoutResult.totalLinearMeters} m</span> (Eficiencia:{' '}
                                    <span style={{ color: '#34d399', fontWeight: 700 }}>{layoutResult.efficiencyPercent}%</span>)
                                </div>
                            )}
                            <div>
                                Zoom:{' '}
                                <span className="ps-badge-value">{Math.round(zoom * 100)}%</span>
                            </div>
                        </div>
                    )}

                    {/* Canvas principal renderizado */}
                    <canvas
                        ref={canvasRef}
                        className="ps-canvas-element"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
                        }}
                    />

                    {/* Controles de vista flotantes */}
                    <div className="ps-canvas-overlay-controls">
                        <button
                            type="button"
                            className="ps-overlay-btn"
                            onClick={() => setZoom((z) => Math.min(5, z * 1.2))}
                            title="Acercar (+)"
                        >
                            ➕
                        </button>
                        <button
                            type="button"
                            className="ps-overlay-btn"
                            onClick={() => setZoom((z) => Math.max(0.08, z * 0.8))}
                            title="Alejar (-)"
                        >
                            ➖
                        </button>
                        <button
                            type="button"
                            className="ps-overlay-btn"
                            onClick={resetView}
                            title="Ajustar a pantalla"
                        >
                            🎯 Centrar
                        </button>
                        <button
                            type="button"
                            className="ps-overlay-btn"
                            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                            title="Tamaño 1:1"
                        >
                            1:1
                        </button>
                    </div>
                </div>
            </div>

            {/* Banner de exportación si está procesando */}
            {isExporting && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        background: '#0284c7',
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: 8,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontWeight: 600,
                        fontSize: '0.85rem'
                    }}
                >
                    <div className="ps-spinner" style={{ width: 18, height: 18, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span>{exportProgressText}</span>
                </div>
            )}
        </div>
    );
};

export default PrintSheeterStudio;
