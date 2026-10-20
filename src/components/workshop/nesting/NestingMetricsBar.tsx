// src/components/workshop/nesting/NestingMetricsBar.tsx
import React from 'react';
import type { NestingResult } from '@/utils/nestingEngine';

interface NestingMetricsBarProps {
    nestingResult: NestingResult;
}

export const NestingMetricsBar: React.FC<NestingMetricsBarProps> = ({ nestingResult }) => {
    return (
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
    );
};
