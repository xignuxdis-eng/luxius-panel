// src/components/workshop/nesting/NestingConfigPanel.tsx
import React from 'react';
import type { NestingResult } from '@/utils/nestingEngine';

interface NestingConfigPanelProps {
    rollWidth: number;
    setRollWidth: (width: number) => void;
    isCustomRoll: boolean;
    setIsCustomRoll: (custom: boolean) => void;
    customRollInput: string;
    setCustomRollInput: (val: string) => void;
    gap: number;
    setGap: (gap: number) => void;
    allowRotation: boolean;
    setAllowRotation: (allow: boolean) => void;
    showCropMarks: boolean;
    setShowCropMarks: (show: boolean) => void;
    batchName: string;
    setBatchName: (name: string) => void;
    nestingResult: NestingResult;
}

export const NestingConfigPanel: React.FC<NestingConfigPanelProps> = ({
    rollWidth,
    setRollWidth,
    isCustomRoll,
    setIsCustomRoll,
    customRollInput,
    setCustomRollInput,
    gap,
    setGap,
    allowRotation,
    setAllowRotation,
    showCropMarks,
    setShowCropMarks,
    batchName,
    setBatchName,
    nestingResult
}) => {
    return (
        <>
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
        </>
    );
};
