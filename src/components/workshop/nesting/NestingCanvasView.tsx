// src/components/workshop/nesting/NestingCanvasView.tsx
import React from 'react';
import type { NestingResult } from '@/utils/nestingEngine';

interface NestingCanvasViewProps {
    viewportRef: React.RefObject<HTMLDivElement>;
    rollContainerRef: React.RefObject<HTMLDivElement>;
    rollWidth: number;
    nestingResult: NestingResult;
    zoom: number;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    handleFitToScreen: () => void;
    handleExportCanvasImage: () => void;
    baseScale: number;
    rollWidthPx: number;
    rollHeightPx: number;
    usefulWidthPx: number;
    selectedPieceId: string | number | null;
    setSelectedPieceId: (id: string | number | null) => void;
    showLabels: boolean;
}

export const NestingCanvasView: React.FC<NestingCanvasViewProps> = ({
    viewportRef,
    rollContainerRef,
    rollWidth,
    nestingResult,
    zoom,
    setZoom,
    handleFitToScreen,
    handleExportCanvasImage,
    baseScale,
    rollWidthPx,
    rollHeightPx,
    usefulWidthPx,
    selectedPieceId,
    setSelectedPieceId,
    showLabels
}) => {
    return (
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

                        const isVertical = (pieceH > pieceW * 1.15 && pieceW < 150) || (pieceH > pieceW * 1.6);
                        const majorAxis = isVertical ? pieceH : pieceW;
                        const minorAxis = isVertical ? pieceW : pieceH;

                        let titleFontSize = Math.min(15, Math.max(8.5, Math.round(minorAxis * 0.22)));
                        if (majorAxis < 80) {
                            titleFontSize = Math.min(titleFontSize, 10);
                        }
                        const badgeFontSize = Math.min(11, Math.max(7.5, Math.round(titleFontSize * 0.82)));
                        const dimsFontSize = Math.min(12, Math.max(7.5, Math.round(titleFontSize * 0.85)));

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
    );
};
