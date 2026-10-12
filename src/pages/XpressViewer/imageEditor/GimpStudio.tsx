import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    BlendMode,
    CropBox,
    EditorTool,
    HistoryStep,
    Layer,
    LevelsAdjustment,
    MirrorBleedParams,
    ToneAdjustments,
    UnsharpMaskParams
} from './types';
import {
    applyLevels,
    applyThreshold,
    applyToneAdjustments,
    applyUnsharpMask,
    buildLevelsLUT,
    computeHistogram,
    flattenLayers,
    flipCanvas,
    generateMirrorBleedCanvas,
    HistogramData,
    removeColorBackground
} from './imageProcessing';
import {
    ZoomIn,
    ZoomOut,
    Maximize,
    Undo2,
    Redo2,
    Crop,
    Wand2,
    Eraser,
    Pipette,
    Sliders,
    Layers,
    Sparkles,
    Download,
    Eye,
    EyeOff,
    Trash2,
    Copy,
    Plus,
    RotateCcw,
    FlipHorizontal,
    FlipVertical,
    Scissors,
    ShieldAlert,
    ExternalLink,
    Check,
    RefreshCw
} from 'lucide-react';
import './GimpStudio.css';

interface GimpStudioProps {
    initialImageUrl?: string;
    initialFile?: File;
    orderId?: number;
    onSendToRedrawer?: (dataUrl: string) => void;
    onSendToPrintSheeter?: (dataUrl: string, name?: string) => void;
    onSaveToOrder?: (dataUrl: string) => Promise<void>;
}

export const GimpStudio: React.FC<GimpStudioProps> = ({
    initialImageUrl,
    initialFile,
    orderId,
    onSendToRedrawer,
    onSendToPrintSheeter,
    onSaveToOrder
}) => {
    // Canvas dimensions
    const [canvasWidth, setCanvasWidth] = useState<number>(1200);
    const [canvasHeight, setCanvasHeight] = useState<number>(800);

    // Layers
    const [layers, setLayers] = useState<Layer[]>([]);
    const [activeLayerId, setActiveLayerId] = useState<string>('');

    // History (Undo / Redo)
    const [history, setHistory] = useState<HistoryStep[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    // Viewport Navigation
    const [zoom, setZoom] = useState<number>(1.0);
    const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState<boolean>(false);
    const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Active tool
    const [activeTool, setActiveTool] = useState<EditorTool>('select');
    const [activeTabSidebar, setActiveTabSidebar] = useState<'layers' | 'levels' | 'filters' | 'export'>('levels');

    // Tool params
    const [wandTolerance, setWandTolerance] = useState<number>(30);
    const [eraserSize, setEraserSize] = useState<number>(25);
    const [pickedColor, setPickedColor] = useState<{ rgb: [number, number, number]; hex: string; cmyk: string } | null>(null);

    // Crop box state
    const [cropBox, setCropBox] = useState<CropBox | null>(null);
    const [cropPreset, setCropPreset] = useState<'free' | '1:1' | '4:3' | '16:9' | 'banner' | 'lona2x1'>('free');

    // Levels Adjustments
    const [levels, setLevels] = useState<LevelsAdjustment>({
        inLow: 0,
        gamma: 1.0,
        inHigh: 255,
        outLow: 0,
        outHigh: 255
    });

    // Tone Adjustments
    const [tone, setTone] = useState<ToneAdjustments>({
        brightness: 0,
        contrast: 0,
        saturation: 0,
        vibrance: 0,
        exposure: 0,
        temperature: 0,
        tint: 0
    });

    // Filter params
    const [unsharpParams, setUnsharpParams] = useState<UnsharpMaskParams>({
        amount: 150,
        radius: 2.0,
        threshold: 2
    });
    const [thresholdVal, setThresholdVal] = useState<number>(128);

    // Bleed params
    const [bleedParams, setBleedParams] = useState<MirrorBleedParams>({
        topCm: 2.0,
        bottomCm: 2.0,
        leftCm: 2.0,
        rightCm: 2.0,
        dpi: 150,
        mode: 'mirror',
        solidColor: '#FFFFFF'
    });

    // Histogram state
    const [histogram, setHistogram] = useState<HistogramData | null>(null);
    const histogramCanvasRef = useRef<HTMLCanvasElement>(null);

    // DOM references
    const viewportRef = useRef<HTMLDivElement>(null);
    const renderCanvasRef = useRef<HTMLCanvasElement>(null);

    // Active layer reference helper
    const activeLayer = useMemo(() => {
        return layers.find(l => l.id === activeLayerId) || layers[0] || null;
    }, [layers, activeLayerId]);

    // Push history step
    const pushHistory = useCallback((desc: string, currentLayers: Layer[], w: number, h: number) => {
        const step: HistoryStep = {
            description: desc,
            canvasWidth: w,
            canvasHeight: h,
            layers: currentLayers.map(l => ({
                id: l.id,
                name: l.name,
                visible: l.visible,
                opacity: l.opacity,
                blendMode: l.blendMode,
                dataUrl: l.canvas.toDataURL(),
                x: l.x,
                y: l.y,
                width: l.width,
                height: l.height
            }))
        };

        setHistory(prev => {
            const trimmed = prev.slice(0, historyIndex + 1);
            return [...trimmed, step].slice(-25); // Limit to last 25 steps
        });
        setHistoryIndex(prev => Math.min(prev + 1, 24));
    }, [historyIndex]);

    // Initialize with image
    const initFromImage = useCallback((img: HTMLImageElement, name: string = 'Fondo Original') => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        setCanvasWidth(w);
        setCanvasHeight(h);

        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = w;
        layerCanvas.height = h;
        const ctx = layerCanvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const baseLayer: Layer = {
            id: 'layer_' + Date.now(),
            name,
            visible: true,
            opacity: 1.0,
            blendMode: 'normal',
            canvas: layerCanvas,
            x: 0,
            y: 0,
            width: w,
            height: h
        };

        const newLayers = [baseLayer];
        setLayers(newLayers);
        setActiveLayerId(baseLayer.id);

        // Initial crop box
        setCropBox({ x: 0, y: 0, width: w, height: h });

        // Update histogram
        const imgData = ctx.getImageData(0, 0, w, h);
        setHistogram(computeHistogram(imgData));

        // Center and fit zoom
        if (viewportRef.current) {
            const vpW = viewportRef.current.clientWidth - 40;
            const vpH = viewportRef.current.clientHeight - 40;
            const initialZoom = Math.min(1.0, Math.min(vpW / w, vpH / h));
            setZoom(Math.max(0.05, Math.round(initialZoom * 100) / 100));
            setPanOffset({ x: 0, y: 0 });
        }

        // Push initial history
        pushHistory('Imagen cargada', newLayers, w, h);
    }, [pushHistory]);

    // Load initial image or file
    useEffect(() => {
        if (initialFile) {
            const url = URL.createObjectURL(initialFile);
            const img = new Image();
            img.onload = () => {
                initFromImage(img, initialFile.name);
                URL.revokeObjectURL(url);
            };
            img.src = url;
        } else if (initialImageUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                initFromImage(img, 'Diseño Cargado');
            };
            img.src = initialImageUrl;
        } else {
            // Default blank HD canvas (1920x1080)
            const blank = document.createElement('canvas');
            blank.width = 1920;
            blank.height = 1080;
            const ctx = blank.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 1920, 1080);
            const img = new Image();
            img.onload = () => initFromImage(img, 'Lienzo Blanco');
            img.src = blank.toDataURL();
        }
    }, [initialFile, initialImageUrl, initFromImage]);

    // Render composited layers to renderCanvas
    const renderComposited = useCallback(() => {
        if (!renderCanvasRef.current) return;
        const mainCanvas = renderCanvasRef.current;
        mainCanvas.width = canvasWidth;
        mainCanvas.height = canvasHeight;
        const ctx = mainCanvas.getContext('2d')!;

        // Clear
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw each visible layer
        for (const layer of layers) {
            if (!layer.visible || layer.opacity <= 0) continue;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
            ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
            ctx.drawImage(layer.canvas, layer.x, layer.y, layer.width, layer.height);
            ctx.restore();
        }

        // Update histogram from composited view if in levels tab
        if (activeTabSidebar === 'levels') {
            const data = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
            setHistogram(computeHistogram(data));
        }
    }, [layers, canvasWidth, canvasHeight, activeTabSidebar]);

    useEffect(() => {
        renderComposited();
    }, [renderComposited]);

    // Draw Histogram in Sidebar
    useEffect(() => {
        if (!histogram || !histogramCanvasRef.current) return;
        const hCanvas = histogramCanvasRef.current;
        const ctx = hCanvas.getContext('2d')!;
        const w = hCanvas.width;
        const h = hCanvas.height;
        ctx.clearRect(0, 0, w, h);

        const maxVal = histogram.max || 1;

        ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let i = 0; i < 256; i++) {
            const x = (i / 255) * w;
            const y = h - (histogram.lum[i] / maxVal) * (h - 4);
            ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }, [histogram]);

    // Undo handler
    const handleUndo = () => {
        if (historyIndex <= 0) return;
        const targetStep = history[historyIndex - 1];
        restoreStep(targetStep);
        setHistoryIndex(prev => prev - 1);
    };

    // Redo handler
    const handleRedo = () => {
        if (historyIndex >= history.length - 1) return;
        const targetStep = history[historyIndex + 1];
        restoreStep(targetStep);
        setHistoryIndex(prev => prev + 1);
    };

    const restoreStep = (step: HistoryStep) => {
        setCanvasWidth(step.canvasWidth);
        setCanvasHeight(step.canvasHeight);

        const restoredLayers: Layer[] = [];
        let loaded = 0;

        step.layers.forEach(l => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = l.width;
                c.height = l.height;
                const ctx = c.getContext('2d')!;
                ctx.drawImage(img, 0, 0);

                restoredLayers.push({
                    id: l.id,
                    name: l.name,
                    visible: l.visible,
                    opacity: l.opacity,
                    blendMode: l.blendMode,
                    canvas: c,
                    x: l.x,
                    y: l.y,
                    width: l.width,
                    height: l.height
                });

                loaded++;
                if (loaded === step.layers.length) {
                    setLayers(restoredLayers);
                    if (restoredLayers[0]) setActiveLayerId(restoredLayers[0].id);
                }
            };
            img.src = l.dataUrl;
        });
    };

    // Apply Levels to Active Layer
    const handleApplyLevels = () => {
        if (!activeLayer) return;
        const c = activeLayer.canvas;
        const ctx = c.getContext('2d')!;
        const srcData = ctx.getImageData(0, 0, c.width, c.height);
        const dstData = ctx.createImageData(c.width, c.height);

        const lut = buildLevelsLUT(levels);
        applyLevels(srcData, dstData, lut);
        ctx.putImageData(dstData, 0, 0);

        setLayers([...layers]);
        pushHistory('Ajuste de Niveles', layers, canvasWidth, canvasHeight);
    };

    // Apply Tone (Brightness/Contrast/Sat) to Active Layer
    const handleApplyTone = () => {
        if (!activeLayer) return;
        const c = activeLayer.canvas;
        const ctx = c.getContext('2d')!;
        const srcData = ctx.getImageData(0, 0, c.width, c.height);
        const dstData = ctx.createImageData(c.width, c.height);

        applyToneAdjustments(srcData, dstData, tone);
        ctx.putImageData(dstData, 0, 0);

        // Reset tone sliders to 0 after applying
        setTone({
            brightness: 0,
            contrast: 0,
            saturation: 0,
            vibrance: 0,
            exposure: 0,
            temperature: 0,
            tint: 0
        });

        setLayers([...layers]);
        pushHistory('Ajuste de Color y Tono', layers, canvasWidth, canvasHeight);
    };

    // Apply Unsharp Mask (Plotter sharpening)
    const handleApplyUnsharpMask = () => {
        if (!activeLayer) return;
        const c = activeLayer.canvas;
        const ctx = c.getContext('2d')!;
        const srcData = ctx.getImageData(0, 0, c.width, c.height);
        const dstData = ctx.createImageData(c.width, c.height);

        applyUnsharpMask(srcData, dstData, unsharpParams);
        ctx.putImageData(dstData, 0, 0);

        setLayers([...layers]);
        pushHistory('Máscara de Enfoque Gran Formato', layers, canvasWidth, canvasHeight);
    };

    // Apply Threshold (1-bit cut vinyl)
    const handleApplyThreshold = () => {
        if (!activeLayer) return;
        const c = activeLayer.canvas;
        const ctx = c.getContext('2d')!;
        const srcData = ctx.getImageData(0, 0, c.width, c.height);
        const dstData = ctx.createImageData(c.width, c.height);

        applyThreshold(srcData, dstData, thresholdVal);
        ctx.putImageData(dstData, 0, 0);

        setLayers([...layers]);
        pushHistory('Binarización Umbral (Plotter de Corte)', layers, canvasWidth, canvasHeight);
    };

    // Apply Mirror Bleed
    const handleApplyMirrorBleed = () => {
        if (!activeLayer) return;
        const extendedCanvas = generateMirrorBleedCanvas(activeLayer.canvas, bleedParams);

        setCanvasWidth(extendedCanvas.width);
        setCanvasHeight(extendedCanvas.height);

        const updatedLayers = layers.map(l => {
            if (l.id === activeLayer.id) {
                return {
                    ...l,
                    canvas: extendedCanvas,
                    width: extendedCanvas.width,
                    height: extendedCanvas.height
                };
            }
            return l;
        });

        setLayers(updatedLayers);
        pushHistory('Demasías Perimetrales en Espejo', updatedLayers, extendedCanvas.width, extendedCanvas.height);
    };

    // Flip layer
    const handleFlip = (horiz: boolean, vert: boolean) => {
        if (!activeLayer) return;
        const flipped = flipCanvas(activeLayer.canvas, horiz, vert);
        const updated = layers.map(l => {
            if (l.id === activeLayer.id) {
                return { ...l, canvas: flipped };
            }
            return l;
        });
        setLayers(updated);
        pushHistory(`Volteo ${horiz ? 'Horizontal' : 'Vertical'}`, updated, canvasWidth, canvasHeight);
    };

    // Apply Crop
    const handleExecuteCrop = () => {
        if (!cropBox) return;
        const { x, y, width, height } = cropBox;
        if (width <= 10 || height <= 10) return;

        const croppedLayers = layers.map(l => {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = width;
            cropCanvas.height = height;
            const ctx = cropCanvas.getContext('2d')!;
            ctx.drawImage(l.canvas, x - l.x, y - l.y, width, height, 0, 0, width, height);

            return {
                ...l,
                canvas: cropCanvas,
                width,
                height,
                x: 0,
                y: 0
            };
        });

        setCanvasWidth(width);
        setCanvasHeight(height);
        setCropBox({ x: 0, y: 0, width, height });
        setLayers(croppedLayers);
        setActiveTool('select');
        pushHistory('Recorte de Lienzo', croppedLayers, width, height);
    };

    // Canvas click handling for Magic Wand & Pipette
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!renderCanvasRef.current || !activeLayer) return;
        const rect = renderCanvasRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const imgX = Math.floor((clientX / rect.width) * canvasWidth);
        const imgY = Math.floor((clientY / rect.height) * canvasHeight);

        if (imgX < 0 || imgX >= canvasWidth || imgY < 0 || imgY >= canvasHeight) return;

        const ctx = activeLayer.canvas.getContext('2d')!;
        const pixel = ctx.getImageData(imgX, imgY, 1, 1).data;
        const rgb: [number, number, number] = [pixel[0], pixel[1], pixel[2]];

        // Pipette Tool
        if (activeTool === 'picker') {
            const hex = '#' + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1).toUpperCase();
            // Estimate CMYK
            const k = 1 - Math.max(rgb[0], rgb[1], rgb[2]) / 255;
            const c = k === 1 ? 0 : Math.round((1 - rgb[0] / 255 - k) / (1 - k) * 100);
            const m = k === 1 ? 0 : Math.round((1 - rgb[1] / 255 - k) / (1 - k) * 100);
            const y = k === 1 ? 0 : Math.round((1 - rgb[2] / 255 - k) / (1 - k) * 100);
            const cmykStr = `C:${c}% M:${m}% Y:${y}% K:${Math.round(k * 100)}%`;

            setPickedColor({ rgb, hex, cmyk: cmykStr });
        }

        // Magic Wand Tool (Remove Background)
        if (activeTool === 'wand') {
            removeColorBackground(activeLayer.canvas, rgb, wandTolerance, 1);
            setLayers([...layers]);
            pushHistory('Quitar Fondo por Tolerancia', layers, canvasWidth, canvasHeight);
        }
    };

    // Layer Management
    const handleAddLayer = () => {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = canvasWidth;
        newCanvas.height = canvasHeight;

        const newLayer: Layer = {
            id: 'layer_' + Date.now(),
            name: `Capa ${layers.length + 1}`,
            visible: true,
            opacity: 1.0,
            blendMode: 'normal',
            canvas: newCanvas,
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight
        };

        const updated = [...layers, newLayer];
        setLayers(updated);
        setActiveLayerId(newLayer.id);
        pushHistory('Nueva Capa', updated, canvasWidth, canvasHeight);
    };

    const handleDuplicateLayer = (layerId: string) => {
        const target = layers.find(l => l.id === layerId);
        if (!target) return;

        const dupCanvas = document.createElement('canvas');
        dupCanvas.width = target.width;
        dupCanvas.height = target.height;
        const ctx = dupCanvas.getContext('2d')!;
        ctx.drawImage(target.canvas, 0, 0);

        const dup: Layer = {
            ...target,
            id: 'layer_' + Date.now(),
            name: `${target.name} (Copia)`,
            canvas: dupCanvas
        };

        const targetIdx = layers.findIndex(l => l.id === layerId);
        const updated = [...layers];
        updated.splice(targetIdx + 1, 0, dup);

        setLayers(updated);
        setActiveLayerId(dup.id);
        pushHistory('Duplicar Capa', updated, canvasWidth, canvasHeight);
    };

    const handleDeleteLayer = (layerId: string) => {
        if (layers.length <= 1) {
            alert('No se puede eliminar la única capa restante.');
            return;
        }
        const updated = layers.filter(l => l.id !== layerId);
        setLayers(updated);
        setActiveLayerId(updated[0].id);
        pushHistory('Eliminar Capa', updated, canvasWidth, canvasHeight);
    };

    const handleFlattenImage = () => {
        const flattened = flattenLayers(layers, canvasWidth, canvasHeight);
        const singleLayer: Layer = {
            id: 'layer_flat_' + Date.now(),
            name: 'Fondo Aplanado',
            visible: true,
            opacity: 1.0,
            blendMode: 'normal',
            canvas: flattened,
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight
        };
        const updated = [singleLayer];
        setLayers(updated);
        setActiveLayerId(singleLayer.id);
        pushHistory('Aplanar Imagen', updated, canvasWidth, canvasHeight);
    };

    // Export Handlers
    const getFlattenedDataUrl = (format: 'image/png' | 'image/jpeg' = 'image/png', quality: number = 0.95): string => {
        const flattened = flattenLayers(layers, canvasWidth, canvasHeight);
        return flattened.toDataURL(format, quality);
    };

    const handleDownloadPng = () => {
        const dataUrl = getFlattenedDataUrl('image/png');
        const link = document.createElement('a');
        link.download = `gimpstudio_export_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    };

    const handleDownloadJpeg = () => {
        const dataUrl = getFlattenedDataUrl('image/jpeg', 1.0);
        const link = document.createElement('a');
        link.download = `gimpstudio_export_${Date.now()}.jpg`;
        link.href = dataUrl;
        link.click();
    };

    return (
        <div className="gimp-studio-container">
            {/* TOP BAR */}
            <div className="gimp-top-toolbar">
                <div className="gimp-brand-badge">
                    <span className="sparkle-icon">✦</span>
                    <span className="gimp-title">GimpStudio Pre-Press HD</span>
                </div>

                <div className="gimp-tool-group">
                    <button
                        className="gimp-icon-btn"
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        title="Deshacer (Ctrl+Z)"
                    >
                        <Undo2 size={16} />
                    </button>
                    <button
                        className="gimp-icon-btn"
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                        title="Rehacer (Ctrl+Y)"
                    >
                        <Redo2 size={16} />
                    </button>
                </div>

                <div className="gimp-tool-group">
                    <button
                        className="gimp-icon-btn"
                        onClick={() => setZoom(z => Math.max(0.1, z - 0.15))}
                        title="Alejar Zoom"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <span className="gimp-zoom-label">{Math.round(zoom * 100)}%</span>
                    <button
                        className="gimp-icon-btn"
                        onClick={() => setZoom(z => Math.min(5.0, z + 0.15))}
                        title="Acercar Zoom"
                    >
                        <ZoomIn size={16} />
                    </button>
                    <button
                        className="gimp-icon-btn"
                        onClick={() => {
                            if (!viewportRef.current) return;
                            const vpW = viewportRef.current.clientWidth - 40;
                            const vpH = viewportRef.current.clientHeight - 40;
                            const fitZ = Math.min(vpW / canvasWidth, vpH / canvasHeight);
                            setZoom(Math.max(0.05, Math.round(fitZ * 100) / 100));
                            setPanOffset({ x: 0, y: 0 });
                        }}
                        title="Ajustar a la pantalla"
                    >
                        <Maximize size={16} />
                    </button>
                    <button
                        className="gimp-icon-btn"
                        onClick={() => { setZoom(1.0); setPanOffset({ x: 0, y: 0 }); }}
                        title="100% Tamaño Real"
                    >
                        1:1
                    </button>
                </div>

                <div className="gimp-dimensions-info">
                    <span>{canvasWidth} × {canvasHeight} px</span>
                    <span className="dpi-tag">@150 DPI: {(canvasWidth / 59).toFixed(1)} × {(canvasHeight / 59).toFixed(1)} cm</span>
                </div>
            </div>

            {/* MAIN WORKSPACE BODY */}
            <div className="gimp-workspace-body">
                {/* LEFT TOOLS DOCK */}
                <div className="gimp-left-toolbox">
                    <button
                        className={`gimp-tool-btn ${activeTool === 'select' ? 'active' : ''}`}
                        onClick={() => setActiveTool('select')}
                        title="Seleccionar y Mover Lienzo"
                    >
                        <Maximize size={18} />
                    </button>

                    <button
                        className={`gimp-tool-btn ${activeTool === 'crop' ? 'active' : ''}`}
                        onClick={() => setActiveTool('crop')}
                        title="Recorte por Medida / Proporción"
                    >
                        <Crop size={18} />
                    </button>

                    <button
                        className={`gimp-tool-btn ${activeTool === 'wand' ? 'active' : ''}`}
                        onClick={() => setActiveTool('wand')}
                        title="Varita Mágica (Eliminar Fondo por Tolerancia Alfa)"
                    >
                        <Wand2 size={18} />
                    </button>

                    <button
                        className={`gimp-tool-btn ${activeTool === 'picker' ? 'active' : ''}`}
                        onClick={() => setActiveTool('picker')}
                        title="Pipeta Gotero (Lectura RGB & CMYK)"
                    >
                        <Pipette size={18} />
                    </button>
                </div>

                {/* CENTER CANVAS VIEWPORT */}
                <div
                    className="gimp-canvas-viewport"
                    ref={viewportRef}
                    onMouseDown={e => {
                        if (e.button === 1 || activeTool === 'select') {
                            setIsPanning(true);
                            panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
                        }
                    }}
                    onMouseMove={e => {
                        if (isPanning) {
                            setPanOffset({
                                x: e.clientX - panStartRef.current.x,
                                y: e.clientY - panStartRef.current.y
                            });
                        }
                    }}
                    onMouseUp={() => setIsPanning(false)}
                    onMouseLeave={() => setIsPanning(false)}
                >
                    <div
                        className="gimp-canvas-board"
                        style={{
                            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                            width: canvasWidth,
                            height: canvasHeight
                        }}
                    >
                        {/* Checkerboard transparency background */}
                        <div className="gimp-transparency-grid" />

                        {/* Composited Canvas */}
                        <canvas
                            ref={renderCanvasRef}
                            className={`gimp-interactive-canvas tool-${activeTool}`}
                            onClick={handleCanvasClick}
                        />

                        {/* Interactive Crop Box Overlay */}
                        {activeTool === 'crop' && cropBox && (
                            <div
                                className="gimp-crop-overlay"
                                style={{
                                    left: cropBox.x,
                                    top: cropBox.y,
                                    width: cropBox.width,
                                    height: cropBox.height
                                }}
                            >
                                <div className="crop-guides-grid">
                                    <div className="crop-line-v1" />
                                    <div className="crop-line-v2" />
                                    <div className="crop-line-h1" />
                                    <div className="crop-line-h2" />
                                </div>
                                <div className="crop-toolbar-floating">
                                    <span>{cropBox.width} × {cropBox.height} px</span>
                                    <button
                                        type="button"
                                        className="crop-action-confirm"
                                        onClick={handleExecuteCrop}
                                    >
                                        <Check size={14} /> Aplicar Recorte
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pipette Floating Info Chip */}
                    {activeTool === 'picker' && pickedColor && (
                        <div className="gimp-pipette-floating-card">
                            <div className="pipette-color-swatch" style={{ backgroundColor: pickedColor.hex }} />
                            <div className="pipette-info-col">
                                <strong>{pickedColor.hex}</strong>
                                <span>RGB({pickedColor.rgb.join(', ')})</span>
                                <span className="cmyk-tag">{pickedColor.cmyk}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT SIDEBAR DOCK */}
                <div className="gimp-right-dock">
                    {/* SIDEBAR TABS HEADER */}
                    <div className="gimp-dock-tabs">
                        <button
                            className={`dock-tab-btn ${activeTabSidebar === 'levels' ? 'active' : ''}`}
                            onClick={() => setActiveTabSidebar('levels')}
                            title="Niveles, Curvas y Tono"
                        >
                            <Sliders size={15} />
                            <span>Ajustes</span>
                        </button>
                        <button
                            className={`dock-tab-btn ${activeTabSidebar === 'filters' ? 'active' : ''}`}
                            onClick={() => setActiveTabSidebar('filters')}
                            title="Filtros de Taller & Enfoque"
                        >
                            <Sparkles size={15} />
                            <span>Filtros</span>
                        </button>
                        <button
                            className={`dock-tab-btn ${activeTabSidebar === 'layers' ? 'active' : ''}`}
                            onClick={() => setActiveTabSidebar('layers')}
                            title="Gestor de Capas"
                        >
                            <Layers size={15} />
                            <span>Capas ({layers.length})</span>
                        </button>
                        <button
                            className={`dock-tab-btn ${activeTabSidebar === 'export' ? 'active' : ''}`}
                            onClick={() => setActiveTabSidebar('export')}
                            title="Exportación y Enlaces a Taller"
                        >
                            <Download size={15} />
                            <span>Exportar</span>
                        </button>
                    </div>

                    {/* TAB CONTENT: LEVELS & TONE */}
                    {activeTabSidebar === 'levels' && (
                        <div className="gimp-dock-scroll">
                            {/* Histogram Box */}
                            <div className="gimp-panel-section">
                                <div className="panel-title-sm">Histograma de Luminancia</div>
                                <canvas
                                    ref={histogramCanvasRef}
                                    width={256}
                                    height={80}
                                    className="gimp-histogram-canvas"
                                />
                            </div>

                            {/* GIMP Levels */}
                            <div className="gimp-panel-section">
                                <div className="panel-title-sm">Niveles de Entrada (GIMP Levels)</div>
                                <div className="gimp-slider-group">
                                    <div className="slider-label-row">
                                        <span>Sombras (Punto Negro):</span>
                                        <strong>{levels.inLow}</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="250"
                                        value={levels.inLow}
                                        onChange={e => setLevels({ ...levels, inLow: parseInt(e.target.value, 10) })}
                                    />
                                </div>

                                <div className="gimp-slider-group">
                                    <div className="slider-label-row">
                                        <span>Medios / Gamma:</span>
                                        <strong>{levels.gamma.toFixed(2)}</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.2"
                                        max="3.0"
                                        step="0.05"
                                        value={levels.gamma}
                                        onChange={e => setLevels({ ...levels, gamma: parseFloat(e.target.value) })}
                                    />
                                </div>

                                <div className="gimp-slider-group">
                                    <div className="slider-label-row">
                                        <span>Luces (Punto Blanco):</span>
                                        <strong>{levels.inHigh}</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="255"
                                        value={levels.inHigh}
                                        onChange={e => setLevels({ ...levels, inHigh: parseInt(e.target.value, 10) })}
                                    />
                                </div>

                                <div className="panel-actions-row mt-2">
                                    <button
                                        type="button"
                                        className="gimp-action-btn primary-action"
                                        onClick={handleApplyLevels}
                                    >
                                        Aplicar Niveles
                                    </button>
                                    <button
                                        type="button"
                                        className="gimp-action-btn ghost-action"
                                        onClick={() => setLevels({ inLow: 0, gamma: 1.0, inHigh: 255, outLow: 0, outHigh: 255 })}
                                    >
                                        Reiniciar
                                    </button>
                                </div>
                            </div>

                            {/* Tone & Color Adjustments */}
                            <div className="gimp-panel-section">
                                <div className="panel-title-sm">Brillo, Contraste y Saturación</div>

                                <div className="gimp-slider-group">
                                    <div className="slider-label-row">
                                        <span>Brillo:</span>
                                        <strong>{tone.brightness}</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="-100"
                                        max="100"
                                        value={tone.brightness}
                                        onChange={e => setTone({ ...tone, brightness: parseInt(e.target.value, 10) })}
                                    />
                                </div>

                                <div className="gimp-slider-group">
                                    <div className="slider-label-row">
                                        <span>Contraste:</span>
                                        <strong>{tone.contrast}</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="-100"
                                        max="100"
                                        value={tone.contrast}
                                        onChange={e => setTone({ ...tone, contrast: parseInt(e.target.value, 10) })}
                                    />
                                </div>

                                <div className="gimp-slider-group">
                                    <div className="slider-label-row">
                                        <span>Saturación:</span>
                                        <strong>{tone.saturation}</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="-100"
                                        max="100"
                                        value={tone.saturation}
                                        onChange={e => setTone({ ...tone, saturation: parseInt(e.target.value, 10) })}
                                    />
                                </div>

                                <div className="gimp-slider-group">
                                    <div className="slider-label-row">
                                        <span>Temperatura de Color (Virado):</span>
                                        <strong>{tone.temperature > 0 ? `+${tone.temperature} Cálido` : tone.temperature < 0 ? `${tone.temperature} Frío` : '0'}</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="-80"
                                        max="80"
                                        value={tone.temperature}
                                        onChange={e => setTone({ ...tone, temperature: parseInt(e.target.value, 10) })}
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="gimp-action-btn primary-action mt-2"
                                    onClick={handleApplyTone}
                                >
                                    Aplicar Color y Tono
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: FILTERS */}
                    {activeTabSidebar === 'filters' && (
                        <div className="gimp-dock-scroll">
                            {/* Magic Wand Background Removal Settings */}
                            <div className="gimp-panel-section">
                                <div className="panel-title-sm">Varita Mágica (Quitar Fondo Alfa)</div>
                                <p className="panel-desc-sm">
                                    Activa la herramienta Varita en el dock izquierdo y haz clic en el color de fondo para borrarlo a transparente.
                                </p>
                                <div className="gimp-slider-group">
                                    <div className="slider-label-row">
                                        <span>Tolerancia de Color:</span>
                                        <strong>{wandTolerance}</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="120"
                                        value={wandTolerance}
                                        onChange={e => setWandTolerance(parseInt(e.target.value, 10))}
                                    />
                                </div>
                            </div>

                            {/* Unsharp Mask (Gran Formato) */}
                            <div className="gimp-panel-section">
                                <div className="panel-title-sm">Máscara de Enfoque (Unsharp Mask)</div>
                                <p className="panel-desc-sm">
                                    Realce de bordes de alta nitidez para evitar que lonas y vinilos salgan blandos en plotters solventes/látex.
                                </p>
                                <div className="gimp-slider-group">
                                    <div className="slider-label-row">
                                        <span>Cantidad (%):</span>
                                        <strong>{unsharpParams.amount}%</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="20"
                                        max="400"
                                        value={unsharpParams.amount}
                                        onChange={e => setUnsharpParams({ ...unsharpParams, amount: parseInt(e.target.value, 10) })}
                                    />
                                </div>

                                <div className="gimp-slider-group">
                                    <div className="slider-label-row">
                                        <span>Radio (px):</span>
                                        <strong>{unsharpParams.radius} px</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="10"
                                        step="0.5"
                                        value={unsharpParams.radius}
                                        onChange={e => setUnsharpParams({ ...unsharpParams, radius: parseFloat(e.target.value) })}
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="gimp-action-btn primary-action mt-2"
                                    onClick={handleApplyUnsharpMask}
                                >
                                    Aplicar Enfoque
                                </button>
                            </div>

                            {/* Mirror Bleed (Demasías en Espejo para Bolsillos) */}
                            <div className="gimp-panel-section">
                                <div className="panel-title-sm">Demasías en Espejo (Mirror Bleed)</div>
                                <p className="panel-desc-sm">
                                    Refleja los bordes exteriores hacia afuera para confección de bolsillos en lonas o bastidores sin cortar texto.
                                </p>
                                <div className="input-grid-2">
                                    <div>
                                        <label className="input-lbl-sm">Arriba / Abajo (cm)</label>
                                        <input
                                            type="number"
                                            className="gimp-num-input"
                                            value={bleedParams.topCm}
                                            onChange={e => setBleedParams({
                                                ...bleedParams,
                                                topCm: parseFloat(e.target.value) || 0,
                                                bottomCm: parseFloat(e.target.value) || 0
                                            })}
                                        />
                                    </div>
                                    <div>
                                        <label className="input-lbl-sm">Laterales (cm)</label>
                                        <input
                                            type="number"
                                            className="gimp-num-input"
                                            value={bleedParams.leftCm}
                                            onChange={e => setBleedParams({
                                                ...bleedParams,
                                                leftCm: parseFloat(e.target.value) || 0,
                                                rightCm: parseFloat(e.target.value) || 0
                                            })}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="gimp-action-btn primary-action mt-2"
                                    onClick={handleApplyMirrorBleed}
                                >
                                    Generar Sangrado Reflejado
                                </button>
                            </div>

                            {/* Vinyl Cutting Threshold */}
                            <div className="gimp-panel-section">
                                <div className="panel-title-sm">Binarización para Plotter de Corte</div>
                                <div className="gimp-slider-group">
                                    <div className="slider-label-row">
                                        <span>Umbral 1-bit:</span>
                                        <strong>{thresholdVal}</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="254"
                                        value={thresholdVal}
                                        onChange={e => setThresholdVal(parseInt(e.target.value, 10))}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="gimp-action-btn secondary-action mt-2"
                                    onClick={handleApplyThreshold}
                                >
                                    Binarizar a Blanco y Negro Puro
                                </button>
                            </div>

                            {/* Flip & Inversion */}
                            <div className="gimp-panel-section">
                                <div className="panel-title-sm">Orientación y Espejado</div>
                                <div className="panel-actions-row">
                                    <button
                                        type="button"
                                        className="gimp-action-btn ghost-action"
                                        onClick={() => handleFlip(true, false)}
                                        title="Espejar para sublimación o backlights"
                                    >
                                        <FlipHorizontal size={14} /> Voltear H
                                    </button>
                                    <button
                                        type="button"
                                        className="gimp-action-btn ghost-action"
                                        onClick={() => handleFlip(false, true)}
                                    >
                                        <FlipVertical size={14} /> Voltear V
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: LAYERS */}
                    {activeTabSidebar === 'layers' && (
                        <div className="gimp-dock-scroll">
                            {/* Layer Actions */}
                            <div className="layers-header-actions">
                                <button
                                    type="button"
                                    className="layer-btn-icon"
                                    onClick={handleAddLayer}
                                    title="Nueva Capa Transparente"
                                >
                                    <Plus size={15} />
                                </button>
                                {activeLayer && (
                                    <button
                                        type="button"
                                        className="layer-btn-icon"
                                        onClick={() => handleDuplicateLayer(activeLayer.id)}
                                        title="Duplicar Capa"
                                    >
                                        <Copy size={15} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="layer-btn-icon text-danger"
                                    onClick={() => activeLayer && handleDeleteLayer(activeLayer.id)}
                                    title="Eliminar Capa Activa"
                                >
                                    <Trash2 size={15} />
                                </button>
                                <button
                                    type="button"
                                    className="flatten-btn-sm"
                                    onClick={handleFlattenImage}
                                    title="Aplanar todas las capas en una sola"
                                >
                                    Aplanar Imagen
                                </button>
                            </div>

                            {/* Active Layer Blend & Opacity */}
                            {activeLayer && (
                                <div className="gimp-panel-section mt-1">
                                    <div className="slider-label-row">
                                        <span className="lbl-xs">Modo de Fusión:</span>
                                        <select
                                            className="gimp-select-sm"
                                            value={activeLayer.blendMode}
                                            onChange={e => {
                                                const updated = layers.map(l => l.id === activeLayer.id ? { ...l, blendMode: e.target.value as BlendMode } : l);
                                                setLayers(updated);
                                            }}
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="multiply">Multiplicar</option>
                                            <option value="screen">Trama (Screen)</option>
                                            <option value="overlay">Superponer (Overlay)</option>
                                            <option value="soft-light">Luz Suave</option>
                                            <option value="hard-light">Luz Fuerte</option>
                                            <option value="difference">Diferencia</option>
                                        </select>
                                    </div>

                                    <div className="slider-label-row mt-2">
                                        <span className="lbl-xs">Opacidad:</span>
                                        <strong>{Math.round(activeLayer.opacity * 100)}%</strong>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={activeLayer.opacity}
                                        onChange={e => {
                                            const updated = layers.map(l => l.id === activeLayer.id ? { ...l, opacity: parseFloat(e.target.value) } : l);
                                            setLayers(updated);
                                        }}
                                    />
                                </div>
                            )}

                            {/* Layers Stack List */}
                            <div className="layers-stack-list">
                                {[...layers].reverse().map(l => (
                                    <div
                                        key={l.id}
                                        className={`layer-item-card ${l.id === activeLayerId ? 'active' : ''}`}
                                        onClick={() => setActiveLayerId(l.id)}
                                    >
                                        <button
                                            type="button"
                                            className="layer-eye-toggle"
                                            onClick={e => {
                                                e.stopPropagation();
                                                const updated = layers.map(item => item.id === l.id ? { ...item, visible: !item.visible } : item);
                                                setLayers(updated);
                                            }}
                                        >
                                            {l.visible ? <Eye size={15} color="#00e5ff" /> : <EyeOff size={15} color="#64748b" />}
                                        </button>

                                        <div className="layer-thumb-box">
                                            <img src={l.canvas.toDataURL()} alt="Layer thumb" />
                                        </div>

                                        <div className="layer-details-col">
                                            <span className="layer-name-txt">{l.name}</span>
                                            <span className="layer-meta-txt">{l.width}×{l.height} · {l.blendMode}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: EXPORT & PRODUCTION HUB */}
                    {activeTabSidebar === 'export' && (
                        <div className="gimp-dock-scroll">
                            <div className="gimp-panel-section">
                                <div className="panel-title-sm">Exportación en Alta Calidad</div>
                                <button
                                    type="button"
                                    className="gimp-hub-action-btn highlight"
                                    onClick={handleDownloadPng}
                                >
                                    <Download size={16} />
                                    <span>Descargar PNG con Alfa Transparente</span>
                                </button>

                                <button
                                    type="button"
                                    className="gimp-hub-action-btn"
                                    onClick={handleDownloadJpeg}
                                >
                                    <Download size={16} />
                                    <span>Descargar JPEG Máxima Calidad (100%)</span>
                                </button>
                            </div>

                            {/* Workshop Interoperability */}
                            <div className="gimp-panel-section">
                                <div className="panel-title-sm">Interoperabilidad LuXius</div>

                                {onSendToRedrawer && (
                                    <button
                                        type="button"
                                        className="gimp-hub-action-btn"
                                        onClick={() => onSendToRedrawer(getFlattenedDataUrl())}
                                    >
                                        <ExternalLink size={16} />
                                        <span>Enviar al Redrawer (Vectorizador)</span>
                                    </button>
                                )}

                                {onSendToPrintSheeter && (
                                    <button
                                        type="button"
                                        className="gimp-hub-action-btn"
                                        onClick={() => onSendToPrintSheeter(getFlattenedDataUrl(), 'Diseño Retocado')}
                                    >
                                        <ExternalLink size={16} />
                                        <span>Enviar a Mosaicos & Nesting HD</span>
                                    </button>
                                )}

                                {orderId && onSaveToOrder && (
                                    <button
                                        type="button"
                                        className="gimp-hub-action-btn success-hub"
                                        onClick={() => onSaveToOrder(getFlattenedDataUrl())}
                                    >
                                        <Check size={16} />
                                        <span>Guardar en Orden de Trabajo #{orderId}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
