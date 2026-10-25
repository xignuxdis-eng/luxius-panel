import Button from '@components/ui/Button'
import { statusColors, PRESET_ORDER_TAGS, type OrderTagDef } from '@/types/orden'

export interface FloatingBatchDockProps {
    selectedIds: Set<string>;
    setSelectedIds: (s: Set<string>) => void;
    selectedTotals: { m2: number; ml: number; price: number };
    isAdmin: boolean;
    onBulkApplyTag: (tagId: string) => void;
    onOpenNesting: () => void;
    onMergeBatch: () => void;
    onDownloadSelected: () => void;
    downloadProgressActive: boolean;
    onExportClientReportPdf: () => void;
    onBatchPdf: () => void;
    onBatchLabel: () => void;
    viewTab: 'active' | 'history' | 'trash';
    onBatchStatus: (status: 'impreso' | 'entregado') => void;
    onBatchRestore: () => void;
    onBatchDelete: () => void;
    vehicularSuggestion?: import('@/utils/nesting').VehicularNestingSuggestion;
    onOpenNestingSuggestion?: () => void;
}

export function FloatingBatchDock({
    selectedIds,
    setSelectedIds,
    selectedTotals,
    isAdmin,
    onBulkApplyTag,
    onOpenNesting,
    onMergeBatch,
    onDownloadSelected,
    downloadProgressActive,
    onExportClientReportPdf,
    onBatchPdf,
    onBatchLabel,
    viewTab,
    onBatchStatus,
    onBatchRestore,
    onBatchDelete,
    vehicularSuggestion,
    onOpenNestingSuggestion
}: FloatingBatchDockProps) {
    if (selectedIds.size === 0) return null;

    return (
        <div className="batch-actions-dock glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary-color)', whiteSpace: 'nowrap' }}>{selectedIds.size} seleccionados</span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} style={{ fontSize: '0.8rem', padding: '2px 8px' }}>✕</Button>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-color)', display: 'flex', gap: '0.75rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '0.75rem', whiteSpace: 'nowrap', alignItems: 'center' }}>
                    {selectedTotals.m2 > 0 && <span>m²: <strong>{selectedTotals.m2.toFixed(2)}</strong></span>}
                    {selectedTotals.ml > 0 && <span>ml: <strong>{selectedTotals.ml.toFixed(2)}</strong></span>}
                    {isAdmin && (
                        <span>$: <strong>{selectedTotals.price.toLocaleString()}</strong></span>
                    )}
                    {vehicularSuggestion && (
                        <button
                            type="button"
                            onClick={onOpenNestingSuggestion}
                            style={{
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#fbbf24',
                                background: 'rgba(245, 158, 11, 0.22)',
                                border: '1px solid rgba(245, 158, 11, 0.6)',
                                boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            title={`💡 ${vehicularSuggestion.message}\n${vehicularSuggestion.benefitText}\nClic para anidar únicamente los ${vehicularSuggestion.items.length} paños sugeridos.`}
                        >
                            💡 Sugerencia: Anidar {vehicularSuggestion.items.length} paños ({vehicularSuggestion.totalLinearMeters.toFixed(2)} ml)
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-color)', paddingLeft: '0.75rem', flexWrap: 'nowrap' }}>
                    {PRESET_ORDER_TAGS.map((pt: OrderTagDef) => (
                        <button
                            key={pt.id}
                            type="button"
                            className="btn-batch-tag"
                            style={{ borderColor: pt.borderColor, color: pt.color, background: pt.bgColor, padding: '3px 8px', fontSize: '0.75rem' }}
                            onClick={() => onBulkApplyTag(pt.id)}
                            title={`Aplicar ${pt.label} a ${selectedIds.size} órdenes`}
                        >
                            {pt.icon} {pt.label}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'nowrap', alignItems: 'center' }}>
                {selectedIds.size >= 2 && (
                    <>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={onOpenNesting}
                            style={{
                                background: vehicularSuggestion
                                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                    : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                                color: vehicularSuggestion ? '#000' : '#fff',
                                border: vehicularSuggestion ? '1px solid #fef08a' : 'none',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                boxShadow: vehicularSuggestion ? '0 0 14px rgba(245, 158, 11, 0.55)' : 'none'
                            }}
                            title={vehicularSuggestion
                                ? `💡 Sugerencia de Anidado (Ahorro de Laminado):\n${vehicularSuggestion.message}\n${vehicularSuggestion.benefitText}`
                                : "Optimizar acomodo e imposición 2D en bobina para las órdenes seleccionadas"}
                        >
                            {vehicularSuggestion ? '💡' : '📐'} Nesting ({selectedIds.size})
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onMergeBatch}
                            style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                            title="Unificar órdenes seleccionadas en un mismo Lote para calcular consumo conjunto"
                        >
                            🔗 Unificar
                        </Button>
                    </>
                )}
                <Button
                    variant="primary"
                    size="sm"
                    onClick={onDownloadSelected}
                    disabled={downloadProgressActive}
                    style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                    title="Descargar paquete ZIP con todos los archivos de las órdenes seleccionadas"
                >
                    <span>📥</span> Descargar ({selectedIds.size})
                </Button>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={onExportClientReportPdf}
                    style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', fontSize: '0.8rem' }}
                    title="Exportar Reporte PDF para el Cliente"
                >
                    📄 PDF Cliente
                </Button>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={onBatchPdf}
                    style={{ backgroundColor: '#059669', color: '#fff', border: 'none', fontSize: '0.8rem' }}
                    title="PDF Masivo"
                >
                    📚 PDF Masivo
                </Button>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={onBatchLabel}
                    style={{ backgroundColor: '#0d9488', color: '#fff', border: 'none', fontSize: '0.8rem' }}
                    title="Etiqueta Rollo"
                >
                    🏷️ Etiqueta
                </Button>
                {viewTab !== 'trash' ? (
                    <>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onBatchStatus('impreso')}
                            style={{ backgroundColor: statusColors['impreso'], color: '#fff', border: 'none', fontSize: '0.8rem' }}
                        >
                            Impreso
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onBatchStatus('entregado')}
                            style={{ backgroundColor: statusColors['entregado'], color: '#fff', border: 'none', fontSize: '0.8rem' }}
                        >
                            Entregado
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onBatchRestore}
                        style={{ backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none', fontSize: '0.8rem' }}
                    >
                        Restaurar
                    </Button>
                )}
                <Button
                    variant="danger"
                    size="sm"
                    onClick={onBatchDelete}
                    style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', fontSize: '0.8rem' }}
                >
                    {viewTab === 'trash' ? 'Borrar Definitivo' : 'Eliminar'}
                </Button>
            </div>
        </div>
    );
}
