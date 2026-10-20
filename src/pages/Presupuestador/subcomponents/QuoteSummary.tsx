// src/pages/Presupuestador/subcomponents/QuoteSummary.tsx
import React from 'react';

interface QuoteSummaryProps {
    rawSubtotal: number;
    descuento: number;
    setDescuento: (val: number) => void;
    finalTotal: number;
    observaciones: string;
    setObservaciones: (val: string) => void;
    handleExportPDF: () => void;
    handleConvertToOrders: () => void;
}

export const QuoteSummary: React.FC<QuoteSummaryProps> = ({
    rawSubtotal,
    descuento,
    setDescuento,
    finalTotal,
    observaciones,
    setObservaciones,
    handleExportPDF,
    handleConvertToOrders
}) => {
    return (
        <div className="card-panel summary-card">
            <h2>💰 Resumen de Cotización</h2>

            <div className="summary-row">
                <span>Subtotal:</span>
                <span>${rawSubtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
                <label>Bonificación / Descuento ($)</label>
                <input
                    type="number"
                    className="form-input"
                    value={descuento}
                    onChange={(e) => setDescuento(Number(e.target.value))}
                />
            </div>

            <div className="summary-total">
                <span>Total Neto:</span>
                <span>${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Observaciones / Notas para Cliente</label>
                <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Aclaraciones comerciales o plazos de entrega..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                />
            </div>

            <div className="summary-actions">
                <button
                    type="button"
                    className="btn-pdf"
                    onClick={handleExportPDF}
                >
                    📄 Generar PDF Presupuesto
                </button>

                <button
                    type="button"
                    className="btn-convert"
                    onClick={handleConvertToOrders}
                >
                    🚀 Convertir a Orden de Trabajo
                </button>
            </div>
        </div>
    );
};
