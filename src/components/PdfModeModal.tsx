import { useState } from 'react'
import type { BudgetPdfMode } from '@/utils/generatePdfBudget'
import { FileText, Eye } from 'lucide-react'

interface PdfModeModalProps {
    isOpen: boolean
    title: string
    subtitle?: string
    onClose: () => void
    onSelect: (mode: BudgetPdfMode) => void
}

export default function PdfModeModal({ isOpen, title, subtitle, onClose, onSelect }: PdfModeModalProps) {
    const [pendingMode, setPendingMode] = useState<BudgetPdfMode | null>(null)

    if (!isOpen) return null

    const handleChoose = (mode: BudgetPdfMode) => {
        setPendingMode(mode)
        // Pequeño delay visual antes de generar
        setTimeout(() => {
            setPendingMode(null)
            onSelect(mode)
        }, 150)
    }

    return (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
            <div
                className="modal-content glass-panel animate-scale-up"
                style={{ maxWidth: '520px', width: '95%', padding: '24px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{title}</h2>
                        {subtitle && (
                            <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{subtitle}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                    Elegí el formato del documento a generar:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                        onClick={() => handleChoose('detallado')}
                        disabled={pendingMode !== null}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                            padding: '18px 14px', borderRadius: '10px', cursor: 'pointer',
                            background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.5)',
                            color: 'var(--text-primary)', transition: 'all 0.2s ease'
                        }}
                    >
                        <FileText size={26} color="#60a5fa" />
                        <strong style={{ fontSize: '0.95rem' }}>Detallado</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.4 }}>
                            Incluye precios, montos, seña y totales
                        </span>
                    </button>

                    <button
                        onClick={() => handleChoose('simplificado')}
                        disabled={pendingMode !== null}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                            padding: '18px 14px', borderRadius: '10px', cursor: 'pointer',
                            background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.5)',
                            color: 'var(--text-primary)', transition: 'all 0.2s ease'
                        }}
                    >
                        <Eye size={26} color="#34d399" />
                        <strong style={{ fontSize: '0.95rem' }}>Simplificado</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.4 }}>
                            Solo materiales y medidas, sin valores monetarios
                        </span>
                    </button>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        className="btn btn-ghost btn-sm"
                        style={{ cursor: 'pointer' }}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    )
}
