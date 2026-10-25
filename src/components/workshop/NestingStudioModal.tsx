// src/components/workshop/NestingStudioModal.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Order } from '@/types';
import { runNesting, getBobinaUsefulWidth, type NestingItem, type NestingResult, detectVehicularNestingSuggestions, type NestingCandidateItem } from '@/utils/nestingEngine';
import './NestingStudioModal.css';
import { NestingMetricsBar } from './nesting/NestingMetricsBar';
import { NestingPiecesList } from './nesting/NestingPiecesList';
import { NestingConfigPanel } from './nesting/NestingConfigPanel';
import { NestingCanvasView } from './nesting/NestingCanvasView';

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

        const has150Piece = orders.some(o => {
            const w = Number(o.ancho) || 0;
            const h = Number(o.alto) || 0;
            const maxD = Math.max(w, h);
            return maxD > 1.365 && maxD <= 1.515;
        });
        if (has150Piece) return 1.52;

        const cannotFit137 = orders.some(o => {
            const w = Number(o.ancho) || 0;
            const h = Number(o.alto) || 0;
            return Math.min(w, h) > 1.365;
        });
        if (cannotFit137) return 1.52;

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

        const allFitIn137 = orders.every(o => {
            const w = Number(o.ancho) || 0;
            const h = Number(o.alto) || 0;
            return (w <= 1.365 || h <= 1.365);
        });
        if (allFitIn137) return 1.37;

        return 1.52;
    }, [orders]);

    const vehicularSuggestions = useMemo(() => {
        if (!orders || orders.length < 2) return [];
        const candidates: NestingCandidateItem[] = orders.map(o => ({
            id: o.id,
            fileName: o.nombreArchivo || (o.archivos && o.archivos[0]) || o.descripcionItem || o.nombreTarea || `OT-${o.id}`,
            ancho: Number(o.ancho) || 0,
            alto: Number(o.alto) || 0,
            copias: Number(o.copias) || 1,
            material: o.material
        }));
        return detectVehicularNestingSuggestions(candidates, 2.90);
    }, [orders]);

    const [rollWidth, setRollWidth] = useState<number>(defaultRollWidth);
    const [gap, setGap] = useState<number>(0.01); // 10mm
    const [allowRotation, setAllowRotation] = useState<boolean>(true);
    const [showCropMarks, setShowCropMarks] = useState<boolean>(true);
    const [showLabels] = useState<boolean>(true);
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

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                handleFitToScreen();
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [isOpen, rollWidth, nestingResult.linearMeters]);

    if (!isOpen) return null;

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
        const exportScale = 1000;
        canvas.width = Math.round(rollWidth * exportScale);
        canvas.height = Math.round(nestingResult.linearMeters * exportScale) + 120;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, nestingResult.usefulWidth * exportScale, nestingResult.linearMeters * exportScale);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(nestingResult.usefulWidth * exportScale, 0);
        ctx.lineTo(nestingResult.usefulWidth * exportScale, nestingResult.linearMeters * exportScale);
        ctx.stroke();
        ctx.setLineDash([]);

        nestingResult.pieces.forEach((p, idx) => {
            const px = p.x * exportScale;
            const py = p.y * exportScale;
            const pw = p.width * exportScale;
            const ph = p.height * exportScale;

            ctx.fillStyle = idx % 2 === 0 ? 'rgba(37, 99, 235, 0.45)' : 'rgba(147, 51, 234, 0.45)';
            ctx.fillRect(px, py, pw, ph);

            ctx.strokeStyle = idx % 2 === 0 ? '#60a5fa' : '#c084fc';
            ctx.lineWidth = 2;
            ctx.strokeRect(px, py, pw, ph);

            if (showCropMarks) {
                const markLen = 14;
                ctx.strokeStyle = '#f8fafc';
                ctx.lineWidth = 1.5;

                ctx.beginPath();
                ctx.moveTo(px, py); ctx.lineTo(px + markLen, py);
                ctx.moveTo(px, py); ctx.lineTo(px, py + markLen);

                ctx.moveTo(px + pw, py); ctx.lineTo(px + pw - markLen, py);
                ctx.moveTo(px + pw, py); ctx.lineTo(px + pw, py + markLen);

                ctx.moveTo(px, py + ph); ctx.lineTo(px + markLen, py + ph);
                ctx.moveTo(px, py + ph); ctx.lineTo(px, py + ph - markLen);

                ctx.moveTo(px + pw, py + ph); ctx.lineTo(px + pw - markLen, py + ph);
                ctx.moveTo(px + pw, py + ph); ctx.lineTo(px + pw, py + ph - markLen);
                ctx.stroke();
            }

            ctx.save();
            ctx.translate(px + pw / 2, py + ph / 2);

            const isCanvasVertical = (ph > pw * 1.15 && pw < 180) || (ph > pw * 1.6);
            if (isCanvasVertical) {
                ctx.rotate(-Math.PI / 2);
            }

            const canvasMajor = isCanvasVertical ? ph : pw;
            const canvasMinor = isCanvasVertical ? pw : ph;

            let canvasTitleFont = Math.min(24, Math.max(12, Math.round(canvasMinor * 0.18)));
            if (canvasMajor < 120) {
                canvasTitleFont = Math.min(canvasTitleFont, 14);
            }
            const canvasDimsFont = Math.min(18, Math.max(10, Math.round(canvasTitleFont * 0.85)));

            const canvasCompact = canvasMajor < 100;
            const isCanvasSingleLine = canvasMinor < 50 && canvasMajor >= 110;

            const canvasDimsText = canvasCompact
                ? `${p.originalWidth.toFixed(2)}×${p.originalHeight.toFixed(2)}${p.rotated ? '↺' : ''}`
                : `${p.originalWidth.toFixed(2)} × ${p.originalHeight.toFixed(2)}m${p.rotated ? ' ↺' : ''}`;

            const canvasCopyBadge = p.totalCopies && p.totalCopies > 0
                ? (canvasCompact ? ` ${p.copyIndex || 1}/${p.totalCopies}` : ` (${p.copyIndex || 1}/${p.totalCopies})`)
                : '';

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const maxCanvasTextWidth = Math.max(30, canvasMajor - 16);

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

        const footerY = canvas.height - 80;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, footerY, canvas.width, 80);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillText(`LUXIUS NESTING | ${batchName} | Bobina ${rollWidth.toFixed(2)}m (Útil ${nestingResult.usefulWidth.toFixed(3)}m) | Consumo: ${nestingResult.linearMeters.toFixed(2)} ml`, 20, footerY + 45);

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

                {/* Banner de Sugerencia para Laminado */}
                {vehicularSuggestions.length > 0 && (
                    <div style={{
                        background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.16) 0%, rgba(6, 182, 212, 0.12) 100%)',
                        borderBottom: '1px solid rgba(245, 158, 11, 0.45)',
                        padding: '8px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                        color: '#fde68a',
                        flexWrap: 'wrap',
                        gap: '8px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 0 4px #f59e0b)' }}>💡</span>
                            <span>
                                <strong>Sugerencia de Producción:</strong> {vehicularSuggestions[0].message} Se laminarán juntas en un solo paso continuo de laminadora (≤ 2.90m).
                            </span>
                        </div>
                        <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: 'rgba(245, 158, 11, 0.25)',
                            border: '1px solid rgba(245, 158, 11, 0.5)',
                            color: '#fef3c7'
                        }}>
                            ⚡ Ahorro de Laminado
                        </span>
                    </div>
                )}

                {/* Body */}
                <div className="nesting-body">
                    {/* Sidebar / Controles */}
                    <div className="nesting-sidebar">
                        <NestingMetricsBar nestingResult={nestingResult} />

                        <NestingPiecesList
                            orders={orders}
                            nestingResult={nestingResult}
                            copiesMap={copiesMap}
                            setCopiesMap={setCopiesMap}
                            selectedPieceId={selectedPieceId}
                            setSelectedPieceId={setSelectedPieceId}
                            handleUpdateCopies={handleUpdateCopies}
                            getPieceDisplayName={getPieceDisplayName}
                        />

                        <NestingConfigPanel
                            rollWidth={rollWidth}
                            setRollWidth={setRollWidth}
                            isCustomRoll={isCustomRoll}
                            setIsCustomRoll={setIsCustomRoll}
                            customRollInput={customRollInput}
                            setCustomRollInput={setCustomRollInput}
                            gap={gap}
                            setGap={setGap}
                            allowRotation={allowRotation}
                            setAllowRotation={setAllowRotation}
                            showCropMarks={showCropMarks}
                            setShowCropMarks={setShowCropMarks}
                            batchName={batchName}
                            setBatchName={setBatchName}
                            nestingResult={nestingResult}
                        />
                    </div>

                    {/* Canvas / Visor del Rollo */}
                    <NestingCanvasView
                        viewportRef={viewportRef}
                        rollContainerRef={rollContainerRef}
                        rollWidth={rollWidth}
                        nestingResult={nestingResult}
                        zoom={zoom}
                        setZoom={setZoom}
                        handleFitToScreen={handleFitToScreen}
                        handleExportCanvasImage={handleExportCanvasImage}
                        baseScale={baseScale}
                        rollWidthPx={rollWidthPx}
                        rollHeightPx={rollHeightPx}
                        usefulWidthPx={usefulWidthPx}
                        selectedPieceId={selectedPieceId}
                        setSelectedPieceId={setSelectedPieceId}
                        showLabels={showLabels}
                    />
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
