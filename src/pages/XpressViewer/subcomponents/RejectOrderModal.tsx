// src/pages/XpressViewer/subcomponents/RejectOrderModal.tsx
import React from 'react';
import { Order } from '../../../types/orden';

interface RejectOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    rejectReason: string;
    setRejectReason: (reason: string) => void;
    isUpdatingOrder: boolean;
    onConfirmReject: () => void;
    calculatedDpi: number;
}

export const RejectOrderModal: React.FC<RejectOrderModalProps> = ({
    isOpen,
    onClose,
    order,
    rejectReason,
    setRejectReason,
    isUpdatingOrder,
    onConfirmReject,
    calculatedDpi
}) => {
    if (!isOpen) return null;

    return (
        <div className="xpress-modal-overlay" onClick={onClose}>
            <div className="xpress-reject-modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>↩️</span> Rebote Técnico de OT-{order?.ot}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '14px' }}>
                    Selecciona un motivo común o escribe la causa técnica por la cual este archivo no puede ser enviado a taller:
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    {[
                        `Baja resolución (${calculatedDpi} DPI < 72 DPI, pixelado severo)`,
                        'Tipografías no convertidas a curvas',
                        'Medidas no proporcionales a las solicitadas',
                        'Falta sangrado/demasía para confección de bolsillos',
                        'Requiere vectorización en curvas (Logo ilegible)'
                    ].map((presetText) => (
                        <button
                            key={presetText}
                            type="button"
                            className="xpress-reject-preset-chip"
                            onClick={() => setRejectReason(presetText)}
                        >
                            {presetText}
                        </button>
                    ))}
                </div>

                <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Escribe las especificaciones que el vendedor o cliente deben corregir..."
                    rows={4}
                    style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        color: '#fff',
                        padding: '10px',
                        fontSize: '0.88rem',
                        marginBottom: '18px',
                        resize: 'vertical'
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#cbd5e1',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmReject}
                        disabled={!rejectReason.trim() || isUpdatingOrder}
                        style={{
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 18px',
                            borderRadius: '6px',
                            cursor: (!rejectReason.trim() || isUpdatingOrder) ? 'not-allowed' : 'pointer',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            opacity: (!rejectReason.trim() || isUpdatingOrder) ? 0.6 : 1
                        }}
                    >
                        {isUpdatingOrder ? 'Guardando...' : 'Confirmar Rebote Técnico'}
                    </button>
                </div>
            </div>
        </div>
    );
};
