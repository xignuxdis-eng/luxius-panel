import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Order } from '@/types';
import { runNesting, getBobinaUsefulWidth, BOBINA_SPECS, type NestingItem, type NestingResult } from '@/utils/nestingEngine';
import './NestingStudioModal.css';

interface NestingStudioModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: Order[];
    initialBatchName?: string;
    onSaveBatch?: (batchName: string, updatedConsumptionMl: number, updatedCopies?: Record<string | number, number>) => Promise<void>;
}

export const NestingStudioModal: React.FC<NestingStudioModalProps> = ({
    isOpen,
    onClose,
    orders,
    initialBatchName,
    onSaveBatch
}) => {
    // Detectar bobina por defecto según material o asignación de órdenes
    const defaultRollWidth = useMemo(() => {
        if (!orders || orders.length === 0) return 1.52;

        // 1. Si alguna pieza mide ~1.50m (entre 1.365m y 1.515m), debe ir a bobina 1.52m (1.50m comercial)
        const has150Piece = orders.some(o => {
            const w = Number(o.ancho) || 0;
            const h = Number(o.alto) || 0;
            const maxD = Math.max(w, h);
            return maxD > 1.365 && maxD <= 1.515;
        });
        if (has150Piece) return 1.52;

        // 2. Si alguna pieza supera 1.365m en ambas dimensiones, no cabe en 1.37m ni rotándola
        const cannotFit137 = orders.some(o => {
            const w = Number(o.ancho) || 0;
            const h = Number(o.alto) || 0;
            return Math.min(w, h) > 1.365;
        });
        if (cannotFit137) return 1.52;

        // 3. Comprobar bobina asignada en las órdenes (descartando anomalías de 1.37 en piezas de 1.50m)
        const b = orders[0].bobinaAsignada || orders[0].precioDetalle?.bobinaAncho || orders[0].precioDetalle?.bobinaUsada;
        if (b) {
            const bNum = Number(b);
            if (bNum >= 1.48 && bNum <= 1.53) return 1.52;
            if (bNum >= 1.35 && bNum <= 1.38) {
                const firstMaxD = Math.max(Number(orders[0].ancho) || 0, Number(orders[0].alto) || 0);
                if (firstMaxD > 1.365) return 1.52;
                return 1.37;
            }
            return bNum;
        }

        // 4. Si todas las piezas caben holgadamente en 1.37m
        const allFitIn137 = orders.every(o => {
            const w = Number(o.ancho) || 0;
            const h = Number(o.alto) || 0;
            return (w <= 1.365 || h <= 1.365);
        });
        if (allFitIn137) return 1.37;

        return 1.52;
    }, [orders]);

    const [rollWidth, setRollWidth] = useState<number>(defaultRollWidth);
    const [gap, setGap] = useState<number>(0.01); // 10mm
    const [allowRotation, setAllowRotation] = useState<boolean>(true);
    const [showCropMarks, setShowCropMarks] = useState<boolean>(true);
    const [showLabels, setShowLabels] = useState<boolean>(true);
    const [zoom, setZoom] = useState<number>(1);
    const [batchName, setBatchName] = useState<string>(initialBatchName || 'Lote Unificado');
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [selectedPieceId, setSelectedPieceId] = useState<string | number | null>(null);

    // Estado de copias interactivas por ítem
    const [copiesMap, setCopiesMap] = useState<Record<string | number, number>>({});
    const [isCustomRoll, setIsCustomRoll] = useState<boolean>(false);
    const [customRollInput, setCustomRollInput] = useState<string>('');

    // Sincronizar copias iniciales desde las órdenes
    useEffect(() => {
        if (isOpen && orders && orders.length > 0) {
            const initial: Record<string | number, number> = {};
            orders.forEach(o => {
                const key = o.id || o.ot || Math.random().toString();
                initial[key] = Math.max(1, Number(o.copias) || 1);
            });
            setCopiesMap(initial);
        }
    }, [isOpen, orders]);

    // Sincronizar bobina por defecto al abrir el modal
    useEffect(() => {
        if (isOpen) {
            setRollWidth(defaultRollWidth);
            setIsCustomRoll(false);
            setCustomRollInput('');
        }
    }, [isOpen, defaultRollWidth]);

    const handleUpdateCopies = (key: string | number, nextCount: number) => {
        const val = Math.max(1, Math.min(999, Math.round(nextCount) || 1));
        setCopiesMap(prev => ({
            ...prev,
            [key]: val
        }));
    };

    const rollContainerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);

    // Extrae un nombre de archivo limpio y amigable para humanos (priorizando archivo original sobre código OT)
    const getPieceDisplayName = (o: Order): string => {
        if (o.archivosOriginales && o.archivosOriginales.length > 0 && o.archivosOriginales[0]) {
            const raw = o.archivosOriginales[0].split(/[/\\]/).pop() || '';
            const cleaned = raw.replace(/\.[^/.]+$/, "");
            if (cleaned.trim()) return cleaned.trim();
        }
        if (o.archivos && o.archivos.length > 0 && o.archivos[0]) {
            const raw = o.archivos[0].split(/[/\\]/).pop() || '';
            const cleaned = raw.replace(/^\d+[-_]/, '').replace(/\.[^/.]+$/, "");
            if (cleaned.trim()) return cleaned.trim();
        }
        if (o.descripcionItem && o.descripcionItem.trim()) {
            return o.descripcionItem.trim();
        }
        if (o.nombreTarea && o.nombreTarea.trim()) {
            return o.nombreTarea.trim();
        }
        return o.ot || `Pieza ${o.id}`;
    };

    // Preparar ítems para el motor de Nesting reactivo a las copias
    const nestingItems = useMemo<NestingItem[]>(() => {
        return orders.map(o => {
            const key = o.id || o.ot || '';
            const c = copiesMap[key] !== undefined ? copiesMap[key] : (Math.max(1, Number(o.copias) || 1));
            const friendlyName = getPieceDisplayName(o);
            return {
                id: key,
                ot: o.ot || `OT-${o.id}`,
                label: friendlyName,
                width: Number(o.ancho) || 0,
                height: Number(o.alto) || 0,
                copies: c,
                cliente: o.clienteNombre,
                material: o.material,
                orderId: o.id
            };
        });
    }, [orders, copiesMap]);

    // Ejecutar motor de Nesting reactivamente
    const nestingResult = useMemo<NestingResult>(() => {
        const usefulW = getBobinaUsefulWidth(rollWidth);
        return runNesting(nestingItems, {
            rollWidth,
            usefulWidth: usefulW,
            gap,
            allowRotation
        });
    }, [nestingItems, rollWidth, gap, allowRotation]);

    const handleFitToScreen = () => {
        if (!viewportRef.current) return;
        const vpWidth = viewportRef.current.clientWidth - 80;
        const vpHeight = viewportRef.current.clientHeight - 80;
        if (vpWidth <= 0 || vpHeight <= 0) return;
        const scaleX = vpWidth / (rollWidth * 550);
        const scaleY = vpHeight / (Math.max(0.5, nestingResult.linearMeters) * 550);
        const fitZoom = Math.min(scaleX, scaleY, 1.15);
        setZoom(Math.max(0.25, Math.round(fitZoom * 100) / 100));
    };

    // Auto-ajustar plano al tamaño de pantalla cuando se abre el modal o cambia la bobina
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                handleFitToScreen();
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [isOpen, rollWidth, nestingResult.linearMeters]);

    if (!isOpen) return null;

    // Escala base: 600px por metro de rollo
    const baseScale = 550 * zoom;
    const rollWidthPx = rollWidth * baseScale;
    const rollHeightPx = Math.max(0.4, nestingResult.linearMeters) * baseScale;
    const usefulWidthPx = nestingResult.usefulWidth * baseScale;

    const handleSave = async () => {
        if (!onSaveBatch) return;
        try {
            setIsSaving(true);
            await onSaveBatch(batchName, nestingResult.linearMeters, copiesMap);
            onClose();
        } catch (e) {
            console.error('Error al guardar lote con nesting:', e);
            alert('No se pudo guardar el lote');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportCanvasImage = () => {
        const canvas = document.createElement('canvas');
        const exportScale = 1000; // 1000 px por metro para alta resolución
        canvas.width = Math.round(rollWidth * exportScale);
        canvas.height = Math.round(nestingResult.linearMeters * exportScale) + 120; // 120px para pie informativo
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fondo
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Zona útil de impresión
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, nestingResult.usefulWidth * exportScale, nestingResult.linearMeters * exportScale);

        // Línea límite de bobina útil
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(nestingResult.usefulWidth * exportScale, 0);
        ctx.lineTo(nestingResult.usefulWidth * exportScale, nestingResult.linearMeters * exportScale);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dibujar cada pieza
        nestingResult.pieces.forEach((p, idx) => {
            const px = p.x * exportScale;
            const py = p.y * exportScale;
            const pw = p.width * exportScale;
            const ph = p.height * exportScale;

            // Relleno de la pieza
            ctx.fillStyle = idx % 2 === 0 ? 'rgba(37, 99, 235, 0.45)' : 'rgba(147, 51, 234, 0.45)';
            ctx.fillRect(px, py, pw, ph);

            // Borde
            ctx.strokeStyle = idx % 2 === 0 ? '#60a5fa' : '#c084fc';
            ctx.lineWidth = 2;
            ctx.strokeRect(px, py, pw, ph);

            // Marcas de corte
            if (showCropMarks) {
                ctx.strokeStyle = '#f8fafc';
                ctx.lineWidth = 1.5;
                const mLen = 20;
                // Esquina sup izq
                ctx.beginPath(); ctx.moveTo(px, py - mLen); ctx.lineTo(px, py + mLen); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(px - mLen, py); ctx.lineTo(px + mLen, py); ctx.stroke();
                // Esquina sup der
                ctx.beginPath(); ctx.moveTo(px + pw, py - mLen); ctx.lineTo(px + pw, py + mLen); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(px + pw - mLen, py); ctx.lineTo(px + pw + mLen, py); ctx.stroke();
            }

            // Texto centrado en la pieza adaptativo (orientación + escala métrica)
            const cx = px + (pw / 2);
            const cy = py + (ph / 2);

            // Orientación adaptativa en canvas: rotar a lo largo del eje mayor si es vertical
            const isCanvasVertical = (ph > pw * 1.15 && pw < 500) || (ph > pw * 1.6);
            const canvasMajor = isCanvasVertical ? ph : pw;
            const canvasMinor = isCanvasVertical ? pw : ph;

            ctx.save();
            ctx.translate(cx, cy);

            if (isCanvasVertical) {
                // Rotar -90° (de abajo hacia arriba)
                ctx.rotate(-Math.PI / 2);
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const isCanvasCompact = canvasMajor < 260;
            const canvasDimsText = isCanvasCompact
                ? `${p.originalWidth.toFixed(2)}×${p.originalHeight.toFixed(2)}${p.rotated ? '↺' : ''}`
                : `${p.originalWidth.toFixed(2)} × ${p.originalHeight.toFixed(2)}m${p.rotated ? ' ↺90°' : ''}`;

            const canvasCopyBadge = p.totalCopies && p.totalCopies > 0
                ? (isCanvasCompact ? ` ${p.copyIndex || 1}/${p.totalCopies}` : ` (${p.copyIndex || 1}/${p.totalCopies})`)
                : '';

            let canvasTitleFont = Math.min(28, Math.max(12, Math.round(canvasMinor * 0.16)));
            if (canvasMajor < 200) canvasTitleFont = Math.min(canvasTitleFont, 14);

            let canvasDimsFont = Math.min(22, Math.max(10, Math.round(canvasTitleFont * 0.82)));
            const maxCanvasTextWidth = Math.max(50, canvasMajor - 24);

            const isCanvasSingleLine = canvasMinor < 85 && canvasMajor >= 180;

            if (isCanvasSingleLine) {
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${canvasTitleFont}px Arial, sans-serif`;
                ctx.fillText(`${p.label}${canvasCopyBadge}  •  ${canvasDimsText}`, 0, 0, maxCanvasTextWidth);
            } else if (canvasMinor < 55 && canvasMajor < 180) {
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${canvasTitleFont}px Arial, sans-serif`;
                ctx.fillText(`${p.label}${canvasCopyBadge}`, 0, 0, maxCanvasTextWidth);
            } else {
                const offset = Math.min(18, Math.max(8, Math.round(canvasMinor * 0.15)));
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${canvasTitleFont}px Arial, sans-serif`;
                ctx.fillText(`${p.label}${canvasCopyBadge}`, 0, -offset, maxCanvasTextWidth);

                ctx.fillStyle = '#38bdf8';
                ctx.font = `bold ${canvasDimsFont}px Arial, sans-serif`;
                ctx.fillText(canvasDimsText, 0, offset + 2, maxCanvasTextWidth);
            }

            ctx.restore();
        });

        // Pie informativo del pliego
        const footerY = canvas.height - 80;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, footerY, canvas.width, 80);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillText(`LUXIUS NESTING | ${batchName} | Bobina ${rollWidth.toFixed(2)}m (Útil ${nestingResult.usefulWidth.toFixed(3)}m) | Consumo: ${nestingResult.linearMeters.toFixed(2)} ml`, 20, footerY + 45);

        // Descargar PNG
        const link = document.createElement('a');
        link.download = `Nesting_${batchName.replace(/\s+/g, '_')}_${rollWidth}m_${nestingResult.linearMeters.toFixed(2)}ml.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="nesting-modal-overlay">
            <div className="nesting-modal-container">
                {/* Header */}
                <div className="nesting-header">
                    <div className="nesting-header-left">
                        <span style={{ fontSize: '1.5rem' }}>📐</span>
                        <div>
                            <div className="nesting-header-title">
                                Nesting Studio — Imposición 2D en Bobina
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                {orders.length} orden(es) · Cliente: {orders[0]?.clienteNombre || 'General'} · Material: {orders[0]?.material || 'VV'}
                            </span>
                        </div>
                    </div>
                    <button className="nesting-close-btn" onClick={onClose} title="Cerrar modal">✕</button>
                </div>

                {/* Body */}
                <div className="nesting-body">
                    {/* Sidebar / Controles */}
                    <div className="nesting-sidebar">
                        <div>
                            <div className="nesting-section-title">Aprovechamiento y Métricas</div>
                            <div className="nesting-kpi-card">
                                <div className="nesting-kpi-row">
                                    <span className="nesting-kpi-label">Consumo con Nesting:</span>
                                    <span className="nesting-kpi-val" style={{ color: '#38bdf8' }}>
                                        {nestingResult.linearMeters.toFixed(2)} ml
                                    </span>
                                </div>
                                <div className="nesting-kpi-row">
                                    <span className="nesting-kpi-label">Consumo sin Nesting:</span>
                                    <span className="nesting-kpi-val" style={{ color: '#94a3b8', textDecoration: 'line-through' }}>
                                        {nestingResult.rawLinearMeters.toFixed(2)} ml
                                    </span>
                                </div>
                                {nestingResult.savingsPercent > 0 && (
                                    <div className="nesting-kpi-row" style={{ marginTop: '4px' }}>
                                        <span className="nesting-badge-savings">
                                            ⚡ Ahorro: {nestingResult.savingsPercent}% ({nestingResult.savingsMeters.toFixed(2)} ml)
                                        </span>
                                    </div>
                                )}
                                <div className="nesting-kpi-row" style={{ marginTop: '6px' }}>
                                    <span className="nesting-kpi-label">Eficiencia de Área:</span>
                                    <span className="nesting-kpi-val" style={{ color: nestingResult.areaEfficiency > 75 ? '#34d399' : '#fbbf24' }}>
                                        {nestingResult.areaEfficiency}%
                                    </span>
                                </div>
                                <div className="nesting-kpi-row">
                                    <span className="nesting-kpi-label">Piezas en Pliego:</span>
                                    <span className="nesting-kpi-val">
                                        {nestingResult.totalPiecesPlaced} / {nestingResult.totalPiecesRequested}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Piezas y Asignación de Copias */}
                        <div>
                            <div className="nesting-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Piezas y Copias ({orders.length})</span>
                                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>
                                    {nestingResult.totalPiecesPlaced} en pliego
                                </span>
                            </div>
                            {/* Preset rápido de copias globales */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', fontSize: '0.72rem', color: '#94a3b8' }}>
                                <span>Todas a:</span>
                                {[1, 2, 3, 5, 10].map(cnt => (
                                    <button
                                        key={cnt}
                                        type="button"
                                        style={{
                                            padding: '2px 7px',
                                            fontSize: '0.72rem',
                                            cursor: 'pointer',
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            color: '#cbd5e1',
                                            borderRadius: '4px',
                                            fontWeight: 600
                                        }}
                                        onClick={() => {
                                            const next: Record<string | number, number> = {};
                                            orders.forEach(o => {
                                                const key = o.id || o.ot || '';
                                                next[key] = cnt;
                                            });
                                            setCopiesMap(next);
                                        }}
                                        title={`Establecer ${cnt} copia(s) para todas las piezas`}
                                    >
                                        {cnt}
                                    </button>
                                ))}
                            </div>
                            <div className="nesting-pieces-list">
                                {orders.map((o) => {
                                    const key = o.id || o.ot || '';
                                    const currentCopies = copiesMap[key] ?? (Number(o.copias) || 1);
                                    const w = Number(o.ancho) || 0;
                                    const h = Number(o.alto) || 0;
                                    const isSelected = selectedPieceId === key || String(selectedPieceId).startsWith(String(key));

                                    const friendlyName = getPieceDisplayName(o);

                                    return (
                                        <div
                                            key={key}
                                            className={`nesting-piece-item ${isSelected ? 'selected' : ''}`}
                                            onClick={() => setSelectedPieceId(key)}
                                        >
                                            <div className="nesting-piece-item-info">
                                                <div className="nesting-piece-item-ot">
                                                    <span style={{ fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={friendlyName}>
                                                        {friendlyName}
                                                    </span>
                                                    <span className="nesting-piece-item-dims">
                                                        {w.toFixed(2)} × {h.toFixed(2)}m
                                                    </span>
                                                </div>
                                                <div className="nesting-piece-item-label" title={`${o.ot || `OT-${o.id}`} · ${o.material || ''}`}>
                                                    {o.ot || `OT-${o.id}`} · {o.material || 'VV'}
                                                </div>
                                            </div>
                                            <div className="nesting-stepper" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    className="nesting-stepper-btn"
                                                    onClick={() => handleUpdateCopies(key, currentCopies - 1)}
                                                    disabled={currentCopies <= 1}
                                                    title="Disminuir copias de esta pieza"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    className="nesting-stepper-val"
                                                    value={currentCopies}
                                                    min={1}
                                                    max={999}
                                                    onChange={(e) => handleUpdateCopies(key, parseInt(e.target.value) || 1)}
                                                    title="Cantidad de copias"
                                                />
                                                <button
                                                    type="button"
                                                    className="nesting-stepper-btn"
                                                    onClick={() => handleUpdateCopies(key, currentCopies + 1)}
                                                    title="Aumentar copias de esta pieza"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Parámetros de Bobina y Taller */}
                        <div>
                            <div className="nesting-section-title">Parámetros de Taller</div>
                            <div className="nesting-control-group" style={{ marginBottom: '12px' }}>
                                <label className="nesting-label">Ancho de Bobina:</label>
                                <select
                                    className="nesting-select"
                                    value={isCustomRoll ? 'custom' : rollWidth}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') {
                                            setIsCustomRoll(true);
                                            setCustomRollInput(String(rollWidth));
                                        } else {
                                            setIsCustomRoll(false);
                                            setRollWidth(parseFloat(e.target.value));
                                        }
                                    }}
                                >
                                    <option value={1.52}>Bobina 1.50m (Real: 1.52m · Útil máx: 1.515m)</option>
                                    <option value={1.37}>Bobina 1.37m (Real: 1.37m · Útil máx: 1.365m)</option>
                                    <option value={1.60}>Bobina 1.60m (Real: 1.60m · Útil máx: 1.590m)</option>
                                    <option value={1.07}>Bobina 1.07m (Real: 1.07m · Útil máx: 1.050m)</option>
                                    <option value={0.91}>Bobina 0.91m (Real: 0.91m · Útil máx: 0.895m)</option>
                                    <option value={1.27}>Bobina 1.27m (Real: 1.27m · Útil máx: 1.255m)</option>
                                    <option value={1.80}>Bobina 1.80m (Real: 1.80m · Útil máx: 1.785m)</option>
                                    <option value={2.20}>Bobina 2.20m (Real: 2.20m · Útil máx: 2.185m)</option>
                                    <option value={3.20}>Bobina 3.20m (Real: 3.20m · Útil máx: 3.185m)</option>
                                    <option value="custom">⚙️ Ancho Personalizado / Retazo...</option>
                                </select>
                                {isCustomRoll && (
                                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.20"
                                            max="5.00"
                                            className="nesting-input"
                                            value={customRollInput}
                                            onChange={(e) => {
                                                setCustomRollInput(e.target.value);
                                                const parsed = parseFloat(e.target.value);
                                                if (!isNaN(parsed) && parsed >= 0.20 && parsed <= 5.0) {
                                                    setRollWidth(parsed);
                                                }
                                            }}
                                            placeholder="Ej: 1.45"
                                            style={{ flex: 1, padding: '6px 10px' }}
                                        />
                                        <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>metros</span>
                                    </div>
                                )}
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                                    {isCustomRoll
                                        ? `Bobina personalizada de ${rollWidth.toFixed(2)}m (Útil estimado: ${nestingResult.usefulWidth.toFixed(3)}m).`
                                        : 'Regla de taller: Bobina 1.50m mide 1.52m con tolerancia útil hasta 1.515m.'
                                    }
                                </span>
                            </div>

                            <div className="nesting-control-group" style={{ marginBottom: '12px' }}>
                                <label className="nesting-label">Separación de Corte (Gap):</label>
                                <select
                                    className="nesting-select"
                                    value={gap}
                                    onChange={(e) => setGap(parseFloat(e.target.value))}
                                >
                                    <option value={0}>0 mm (Al corte exacto sin sangría)</option>
                                    <option value={0.005}>5 mm (Tijera fina)</option>
                                    <option value={0.01}>10 mm (Cutter estándar taller)</option>
                                    <option value={0.015}>15 mm (Sangría amplia)</option>
                                </select>
                            </div>

                            <div className="nesting-toggle-row">
                                <span className="nesting-label">Permitir Rotación (90°):</span>
                                <input
                                    type="checkbox"
                                    checked={allowRotation}
                                    onChange={(e) => setAllowRotation(e.target.checked)}
                                    style={{ accentColor: '#38bdf8', transform: 'scale(1.2)', cursor: 'pointer' }}
                                />
                            </div>

                            <div className="nesting-toggle-row">
                                <span className="nesting-label">Marcas de Corte:</span>
                                <input
                                    type="checkbox"
                                    checked={showCropMarks}
                                    onChange={(e) => setShowCropMarks(e.target.checked)}
                                    style={{ accentColor: '#38bdf8', transform: 'scale(1.2)', cursor: 'pointer' }}
                                />
                            </div>
                        </div>

                        {/* Nombre del Lote */}
                        <div>
                            <div className="nesting-section-title">Nombre del Lote</div>
                            <input
                                type="text"
                                className="nesting-input"
                                value={batchName}
                                onChange={(e) => setBatchName(e.target.value)}
                                placeholder="Ej: Casi Todo, Campaña Octubre..."
                            />
                        </div>
                    </div>

                    {/* Canvas / Visor del Rollo */}
                    <div className="nesting-canvas-area">
                        {/* Toolbar de visualización */}
                        <div className="nesting-canvas-toolbar">
                            <div className="nesting-canvas-toolbar-left">
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>📐</span> Plano de Imposición en Rollo
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                                    Bobina {rollWidth.toFixed(2)}m · Útil máx {nestingResult.usefulWidth.toFixed(3)}m
                                </span>
                            </div>
                            <div className="nesting-canvas-toolbar-right">
                                <button className="nesting-tool-btn" onClick={() => setZoom(z => Math.max(0.2, Math.round((z - 0.15) * 100) / 100))} title="Alejar plano">
                                    🔍- Alejar
                                </button>
                                <span style={{ fontSize: '0.82rem', color: '#cbd5e1', alignSelf: 'center', padding: '0 6px', fontFamily: 'monospace', fontWeight: 700 }}>
                                    {Math.round(zoom * 100)}%
                                </span>
                                <button className="nesting-tool-btn" onClick={() => setZoom(z => Math.min(2.5, Math.round((z + 0.15) * 100) / 100))} title="Acercar plano">
                                    🔍+ Acercar
                                </button>
                                <button className="nesting-tool-btn" onClick={handleFitToScreen} title="Ajustar plano completo a la pantalla">
                                    📐 Ajustar
                                </button>
                                <button className="nesting-tool-btn" onClick={() => setZoom(1)} title="Zoom al 100%">
                                    ↺ 100%
                                </button>
                                <button
                                    className="nesting-tool-btn"
                                    onClick={handleExportCanvasImage}
                                    style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.1)' }}
                                    title="Exportar plano en alta resolución PNG"
                                >
                                    📥 Exportar Plano PNG
                                </button>
                            </div>
                        </div>

                        {/* Viewport scrolleable */}
                        <div ref={viewportRef} className="nesting-canvas-viewport">
                            <div
                                ref={rollContainerRef}
                                className="nesting-roll-visual"
                                style={{
                                    width: `${rollWidthPx}px`,
                                    height: `${rollHeightPx}px`
                                }}
                            >
                                {/* Regla superior de ancho */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-26px',
                                    left: 0,
                                    right: 0,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '11px',
                                    color: '#94a3b8',
                                    fontFamily: 'monospace'
                                }}>
                                    <span>0.00m</span>
                                    <span style={{ color: '#38bdf8' }}>Ancho Físico: {rollWidth.toFixed(2)}m</span>
                                </div>

                                {/* Línea límite de ancho útil */}
                                <div
                                    className="nesting-roll-limit-line"
                                    style={{ left: `${usefulWidthPx}px` }}
                                    title={`Límite útil de bobina: ${nestingResult.usefulWidth.toFixed(3)}m`}
                                />

                                {/* Indicador de ancho útil */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-18px',
                                    left: `${usefulWidthPx - 70}px`,
                                    fontSize: '10px',
                                    color: '#f87171',
                                    fontWeight: 700
                                }}>
                                    Útil {nestingResult.usefulWidth.toFixed(3)}m
                                </div>

                                {/* Piezas colocadas */}
                                {nestingResult.pieces.map((p) => {
                                    const isSelected = selectedPieceId === p.id;
                                    const pieceW = p.width * baseScale;
                                    const pieceH = p.height * baseScale;

                                    // Orientación adaptativa: vertical si la altura supera al ancho significativamente
                                    const isVertical = (pieceH > pieceW * 1.15 && pieceW < 150) || (pieceH > pieceW * 1.6);
                                    const majorAxis = isVertical ? pieceH : pieceW;
                                    const minorAxis = isVertical ? pieceW : pieceH;

                                    // Tipografía adaptativa calculada dinámicamente según espacio disponible
                                    let titleFontSize = Math.min(15, Math.max(8.5, Math.round(minorAxis * 0.22)));
                                    if (majorAxis < 80) {
                                        titleFontSize = Math.min(titleFontSize, 10);
                                    }
                                    const badgeFontSize = Math.min(11, Math.max(7.5, Math.round(titleFontSize * 0.82)));
                                    const dimsFontSize = Math.min(12, Math.max(7.5, Math.round(titleFontSize * 0.85)));

                                    // Adaptación compacta para evitar truncamiento
                                    const isCompact = majorAxis < 75;
                                    const isSingleLine = minorAxis < 38 && majorAxis >= 85;
                                    const showDims = showLabels && (minorAxis >= 26 || isSingleLine);

                                    const dimsText = isCompact
                                        ? `${p.originalWidth.toFixed(2)}×${p.originalHeight.toFixed(2)}${p.rotated ? '↺' : ''}`
                                        : `${p.originalWidth.toFixed(2)} × ${p.originalHeight.toFixed(2)}m${p.rotated ? ' ↺' : ''}`;

                                    const copyBadgeText = p.totalCopies && p.totalCopies > 0
                                        ? (isCompact ? `${p.copyIndex || 1}/${p.totalCopies}` : `(${p.copyIndex || 1}/${p.totalCopies})`)
                                        : '';

                                    return (
                                        <div
                                            key={p.id}
                                            className={`nesting-piece-card ${isVertical ? 'is-vertical-piece' : ''} ${isSelected ? 'selected' : ''}`}
                                            style={{
                                                left: `${p.x * baseScale}px`,
                                                top: `${p.y * baseScale}px`,
                                                width: `${pieceW}px`,
                                                height: `${pieceH}px`,
                                                borderColor: isSelected ? '#38bdf8' : undefined,
                                                background: isSelected ? 'rgba(56, 189, 248, 0.5)' : undefined
                                            }}
                                            onClick={() => setSelectedPieceId(p.id)}
                                            title={`${p.label} (Copia ${p.copyIndex || 1}/${p.totalCopies || 1})\nMedidas: ${p.originalWidth.toFixed(2)} × ${p.originalHeight.toFixed(2)}m ${p.rotated ? '(Rotado 90°)' : ''}\nOT: ${p.ot}\nPosición: X: ${p.x.toFixed(2)}m, Y: ${p.y.toFixed(2)}m`}
                                        >
                                            <div
                                                className="nesting-piece-center-content"
                                                style={isVertical ? {
                                                    position: 'absolute',
                                                    left: '50%',
                                                    top: '50%',
                                                    transform: 'translate(-50%, -50%) rotate(-90deg)',
                                                    width: `${Math.max(20, pieceH - 6)}px`,
                                                    height: `${Math.max(16, pieceW - 4)}px`,
                                                } : {
                                                    width: '100%',
                                                    height: '100%',
                                                }}
                                            >
                                                {isSingleLine ? (
                                                    <div className="nesting-piece-filename-row is-inline-compact" style={{ fontSize: `${titleFontSize}px` }}>
                                                        <span className="nesting-piece-filename" style={{ fontSize: `${titleFontSize}px` }} title={p.label}>
                                                            {p.label}
                                                        </span>
                                                        {copyBadgeText && (
                                                            <span className="nesting-piece-copy-badge" style={{ fontSize: `${badgeFontSize}px` }}>
                                                                {copyBadgeText}
                                                            </span>
                                                        )}
                                                        {showDims && (
                                                            <span className="nesting-piece-dims-inline" style={{ fontSize: `${dimsFontSize}px` }}>
                                                                • {dimsText}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="nesting-piece-filename-row" style={{ fontSize: `${titleFontSize}px` }}>
                                                            <span className="nesting-piece-filename" style={{ fontSize: `${titleFontSize}px` }} title={p.label}>
                                                                {p.label}
                                                            </span>
                                                            {copyBadgeText && (
                                                                <span className="nesting-piece-copy-badge" style={{ fontSize: `${badgeFontSize}px` }}>
                                                                    {copyBadgeText}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {showDims && (
                                                            <span className="nesting-piece-dims-centered" style={{ fontSize: `${dimsFontSize}px` }}>
                                                                {dimsText}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Regla lateral de avance de rollo */}
                                <div style={{
                                    position: 'absolute',
                                    left: '-55px',
                                    bottom: 0,
                                    fontSize: '11px',
                                    color: '#38bdf8',
                                    fontFamily: 'monospace',
                                    fontWeight: 700
                                }}>
                                    ▼ {nestingResult.linearMeters.toFixed(2)} ml
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="nesting-footer">
                    <button className="nesting-btn-secondary" onClick={onClose}>
                        Cerrar
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            className="nesting-btn-secondary"
                            onClick={handleExportCanvasImage}
                            title="Descargar diagrama de imposición en alta resolución PNG"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <span>📥</span> Descargar Plano PNG
                        </button>
                        {onSaveBatch && (
                            <button
                                className="nesting-btn-primary"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Guardando...' : '💾 Guardar Consumo de Nesting en el Lote'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NestingStudioModal;
