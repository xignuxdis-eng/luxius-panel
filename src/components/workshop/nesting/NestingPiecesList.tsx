// src/components/workshop/nesting/NestingPiecesList.tsx
import React from 'react';
import type { Order } from '@/types';
import type { NestingResult } from '@/utils/nestingEngine';

interface NestingPiecesListProps {
    orders: Order[];
    nestingResult: NestingResult;
    copiesMap: Record<string | number, number>;
    setCopiesMap: React.Dispatch<React.SetStateAction<Record<string | number, number>>>;
    selectedPieceId: string | number | null;
    setSelectedPieceId: (id: string | number | null) => void;
    handleUpdateCopies: (key: string | number, nextCount: number) => void;
    getPieceDisplayName: (o: Order) => string;
}

export const NestingPiecesList: React.FC<NestingPiecesListProps> = ({
    orders,
    nestingResult,
    copiesMap,
    setCopiesMap,
    selectedPieceId,
    setSelectedPieceId,
    handleUpdateCopies,
    getPieceDisplayName
}) => {
    return (
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
    );
};
