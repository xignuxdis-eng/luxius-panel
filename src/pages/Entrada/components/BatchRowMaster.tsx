import React from 'react'
import type { Order, Cliente, Material } from '@/types'
import { statusColors, statusLabels } from '@/types/orden'
import type { GroupedBatch } from '../types/entrada.types'
import { OrderTagBadges } from './OrderTagBadges'
import { OrderConsumptionBadge } from './OrderConsumptionBadge'
import { calculateOrderPrice, getConsumption, isSpecialLaminationOrder } from '../utils/entradaCalculations'
import { generatePdfClientReport } from '@/utils/generatePdfClientReport'
import { detectVehicularNestingSuggestions, type NestingCandidateItem } from '@/utils/nesting'

export interface BatchRowMasterProps {
    item: GroupedBatch;
    isExpanded: boolean;
    onToggleExpand: (batchId: string) => void;
    onToggleSelectBatch: (orders: Order[]) => void;
    onOpenEditBatchModal: (orders: Order[], batchName: string, batchId: string) => void;
    canViewAlerts: boolean;
    forecastStatus?: 'critical' | 'low';
    allMateriales: Material[];
    allClientes: Cliente[];
    isAdmin: boolean;
    onDownloadBatch: (orders: Order[], batchName: string) => void;
    actionMenuOrderId: number | string | null;
    setActionMenuOrderId: React.Dispatch<React.SetStateAction<number | string | null>>;
    onOpenNestingModal: (orders: Order[], batchName: string) => void;
    onSetStatusBatch: (primaryOrder: Order, orders: Order[]) => void;
    onSoftDeleteBatch: (orders: Order[], batchName: string) => void;
    // Child row props
    selectedIds: Set<string>;
    onToggleSelection: (id: string | number) => void;
    onPreview: (order: Order) => void;
    tagPopoverOrderId: number | string | null;
    setTagPopoverOrderId: (id: number | string | null) => void;
    onToggleTag: (order: Order, tagId: string, e?: React.MouseEvent) => void;
    onDownloadSingle: (order: Order) => void;
    onOpenChat: (order: Order) => void;
    onOpenSuiteCraft: (order: Order) => void;
    onOpenPdfMode: (order: Order) => void;
    onGenerateLabel: (order: Order) => void;
    onEditOrder: (order: Order) => void;
    onStatusSingle: (order: Order) => void;
    onSoftDeleteSingle: (order: Order) => void;
}

export const BatchRowMaster = React.memo(function BatchRowMaster({
    item,
    isExpanded,
    onToggleExpand,
    onToggleSelectBatch,
    onOpenEditBatchModal,
    canViewAlerts,
    forecastStatus,
    allMateriales,
    allClientes,
    isAdmin,
    onDownloadBatch,
    actionMenuOrderId,
    setActionMenuOrderId,
    onOpenNestingModal,
    onSetStatusBatch,
    onSoftDeleteBatch,
    selectedIds,
    onToggleSelection,
    onPreview,
    tagPopoverOrderId,
    setTagPopoverOrderId,
    onToggleTag,
    onDownloadSingle,
    onOpenChat,
    onOpenSuiteCraft,
    onOpenPdfMode,
    onGenerateLabel,
    onEditOrder,
    onStatusSingle,
    onSoftDeleteSingle
}: BatchRowMasterProps) {
    const batchMenuId = `batch:${item.batchId}`;

    const vehicularSuggestions = React.useMemo(() => {
        if (!item.orders || item.orders.length < 2) return [];
        const candidates: NestingCandidateItem[] = item.orders.map(o => ({
            id: o.id,
            fileName: o.nombreArchivo || (o.archivos && o.archivos[0]) || o.nombreTarea || `OT-${o.id}`,
            ancho: Number(o.ancho) || 0,
            alto: Number(o.alto) || 0,
            copias: Number(o.copias) || 1,
            material: o.material
        }));
        return detectVehicularNestingSuggestions(candidates, 2.90);
    }, [item.orders]);

    return (
        <>
            {/* MASTER BATCH ROW */}
            <tr
                key={item.batchId}
                className={`batch-row-master ${isExpanded ? 'is-expanded' : ''} ${item.allSelected ? 'selected-row' : ''}`}
            >
                <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <button
                            type="button"
                            className="batch-expand-btn"
                            onClick={() => onToggleExpand(item.batchId)}
                            title={isExpanded ? "Contraer lote" : "Desplegar órdenes del lote"}
                        >
                            {isExpanded ? '▼' : '▶'}
                        </button>
                        <input
                            type="checkbox"
                            checked={item.allSelected}
                            ref={el => { if (el) el.indeterminate = item.someSelected; }}
                            onChange={() => onToggleSelectBatch(item.orders)}
                            style={{ accentColor: 'var(--primary-color)', cursor: 'pointer', transform: 'scale(1.2)' }}
                            title="Seleccionar todas las OTs del lote"
                        />
                    </div>
                </td>
                <td>
                    <div className="composite-cell-primary" style={{ cursor: 'pointer' }} onClick={() => onToggleExpand(item.batchId)}>
                        <div className="composite-top-row">
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span className="batch-badge-pill">🏷️ {item.batchName}</span>
                                <button
                                    type="button"
                                    className="btn-edit-batch-inline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenEditBatchModal(item.orders, item.batchName, item.batchId);
                                    }}
                                    title="Editar grupo / cambiar nombre del proyecto"
                                >
                                    ✏️
                                </button>
                            </div>
                            <span className="batch-count-pill">📦 {item.orders.length} OTs</span>
                            {item.primaryOrder.origen === 'mobile' ? (
                                <span className="origin-badge origin-badge-mobile">📱 Móvil</span>
                            ) : (
                                <span className="origin-badge origin-badge-web">💻 Web</span>
                            )}
                            {canViewAlerts && forecastStatus === 'critical' && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }}>⚠ Faltante stock</span>
                            )}
                            {canViewAlerts && forecastStatus === 'low' && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }}>◐ Stock bajo</span>
                            )}
                        </div>
                        <div className="composite-bottom-row">
                            <span className="composite-client">🏢 {item.primaryOrder.clienteNombre}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {isExpanded ? '▼ Clic para contraer' : '▶ Clic para ver órdenes'}
                            </span>
                        </div>
                    </div>
                </td>
                <td>
                    <div className="composite-cell-tech">
                        <div className="composite-top-row">
                            {(() => {
                                const mats = Array.from(new Set(item.orders.map(o => o.material)));
                                if (mats.length === 1) {
                                    return <span className="material-tag-sm">{mats[0]}</span>;
                                }
                                return <span className="material-tag-sm" style={{ background: 'rgba(255,255,255,0.1)' }}>{mats.length} materiales</span>;
                            })()}
                            <span style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.82rem' }}>
                                {item.orders.length} piezas · {item.totalCopies} cop.
                            </span>
                        </div>
                        <div className="composite-bottom-row">
                            {(() => {
                                const desglose = Object.entries(item.totalConsumption.mlByBobina || {})
                                    .filter(([, v]) => v > 0)
                                    .sort((a, b) => {
                                        const pa = a[0].split('|');
                                        const pb = b[0].split('|');
                                        const ba = parseFloat(pa[pa.length - 1] ?? '0') || 0;
                                        const bb = parseFloat(pb[pb.length - 1] ?? '0') || 0;
                                        return ba - bb;
                                    });
                                if (desglose.length === 0) {
                                    return item.totalConsumption.ml > 0 ? (
                                        <span className="m2-text font-mono" style={{ fontWeight: 800, color: 'var(--metric-cyan)', fontSize: '0.88rem' }}>
                                            {item.totalConsumption.ml.toFixed(2)} ml
                                        </span>
                                    ) : (
                                        <span className="m2-text font-mono" style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                                            {item.totalConsumption.m2.toFixed(2)} m²
                                        </span>
                                    );
                                }
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                                        {desglose.map(([key, mlVal]) => {
                                            const [matCode, bobinaLabel] = key.includes('|') ? key.split('|') : ['', key];
                                            const largosAqui = item.orders.filter((o: Order) => {
                                                if ((o.material || 'SIN_MAT') !== matCode) return false;
                                                const bc = parseFloat(bobinaLabel);
                                                if (!isNaN(bc) && Math.abs((parseFloat(String(getConsumption(o, allMateriales).bobina)) || 0) - bc) > 0.001) return false;
                                                return isSpecialLaminationOrder(o, undefined, allMateriales);
                                            }).length;
                                            return (
                                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                                    {matCode && (
                                                        <span className="material-tag-sm" style={{ fontSize: '0.68rem' }}>{matCode}</span>
                                                    )}
                                                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>⌀ {bobinaLabel}</span>
                                                    <span className="m2-text font-mono" style={{ fontWeight: 800, color: 'var(--metric-cyan)', fontSize: '0.82rem' }}>
                                                        {mlVal.toFixed(2)} ml
                                                    </span>
                                                    {largosAqui > 0 && (
                                                        <span className="batch-special-lamination-pill" style={{ fontSize: '0.62rem', padding: '0 4px' }} title={`${largosAqui} paños > 2.93m en ${matCode} a ${bobinaLabel}`}>
                                                            ⚡ {largosAqui}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {desglose.length > 1 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '2px', marginTop: '1px' }}>
                                                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>TOTAL</span>
                                                <span className="m2-text font-mono" style={{ fontWeight: 800, color: 'var(--metric-cyan)', fontSize: '0.88rem' }}>
                                                    {item.totalConsumption.ml.toFixed(2)} ml
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                            {item.totalConsumption.savingsPercent !== undefined && item.totalConsumption.savingsPercent > 0 && (
                                <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    color: '#10b981',
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap'
                                }} title={`Consumo teórico sin nesting: ${item.totalConsumption.rawMl?.toFixed(2)} ml`}>
                                    ⚡ {item.totalConsumption.savingsPercent}% ahorro
                                </span>
                            )}
                            {(() => {
                                const panosLargos = item.orders.filter(o => isSpecialLaminationOrder(o, undefined, allMateriales));
                                if (panosLargos.length === 0) return null;
                                const n = panosLargos.length;
                                const lista = panosLargos
                                    .map(o => `${o.material || '?'} ${Number(o.ancho) || 0}x${Number(o.alto) || 0}m (${o.copias || 1} cop.)`)
                                    .join('\n');
                                return (
                                    <span
                                        className="batch-special-lamination-pill"
                                        title={`${n} de ${item.orders.length} paños > 2.93m — requiere laminado especial:\n${lista}`}
                                    >
                                        ⚡ {n === 1 ? '1 paño' : `${n} paños`} &gt; 2.93m
                                    </span>
                                );
                            })()}
                            {vehicularSuggestions.length > 0 && (
                                <span
                                    className="batch-vehicular-nesting-pill"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenNestingModal(item.orders, item.batchName);
                                    }}
                                    title={`💡 Sugerencia de Anidado (Ahorro de Laminado):\n${vehicularSuggestions.map(s => s.message).join('\n')}\n${vehicularSuggestions.map(s => s.benefitText).join('\n')}\nClic para anidar en Nesting Studio.`}
                                >
                                    💡 Sugerencia: Laminar juntos (≤ 2.90m)
                                </span>
                            )}
                        </div>
                    </div>
                </td>
                <td>
                    <div className="composite-cell-status">
                        <div className="composite-top-row">
                            <div
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSetStatusBatch(item.primaryOrder, item.orders);
                                }}
                                title="Click para cambiar el estado de todo el lote"
                            >
                                {(() => {
                                    const distinct = Array.from(new Set(item.orders.map(o => o.status)));
                                    if (distinct.length === 1) {
                                        const st = distinct[0];
                                        return (
                                            <span className="status-badge" style={{ backgroundColor: statusColors[st], boxShadow: `0 0 8px ${statusColors[st]}40`, cursor: 'pointer' }}>
                                                {statusLabels[st]}
                                            </span>
                                        );
                                    }
                                    return (
                                        <span className="status-badge" style={{ backgroundColor: '#64748b', fontSize: '0.72rem', cursor: 'pointer' }}>
                                            Mixto ({distinct.length})
                                        </span>
                                    );
                                })()}
                            </div>
                            {(() => {
                                const envios = Array.from(new Set(item.orders.map(o => o.envio).filter(Boolean)));
                                if (envios.length > 0) {
                                    return (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                            {envios.map(env => (
                                                <span key={env} className="shipping-pill">
                                                    🚚 {env}
                                                </span>
                                            ))}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                        <div className="composite-bottom-row">
                            <span style={{ fontWeight: '700', color: 'var(--accent)', fontSize: '0.8rem' }}>
                                📅 {item.primaryOrder.fechaEntrega ? (() => {
                                    const d = new Date(item.primaryOrder.fechaEntrega + 'T12:00:00');
                                    if (!isNaN(d.getTime())) {
                                        const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase().replace('.', '');
                                        return `${dayName} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                                    }
                                    return item.primaryOrder.fechaEntrega;
                                })() : '--'}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Ingreso: {item.primaryOrder.createdAt ? new Date(item.primaryOrder.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : (item.primaryOrder.fechaCreacion || '-')}
                            </span>
                        </div>
                    </div>
                </td>
                {isAdmin && (
                    <td>
                        <div className="price-cell" style={{ fontWeight: 800, color: '#10b981' }}>
                            <span className="currency">$</span>
                            <span className="amount">{item.totalPrice.toLocaleString()}</span>
                        </div>
                    </td>
                )}
                <td>
                    <div className="order-actions-compact">
                        <button
                            type="button"
                            className="btn-icon-action"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDownloadBatch(item.orders, item.batchName);
                            }}
                            title={`Descargar todas las imágenes de este lote (${item.orders.length} OTs en ZIP)`}
                            style={{ background: 'rgba(16, 185, 129, 0.25)', border: '1px solid rgba(16, 185, 129, 0.6)' }}
                        >
                            <span style={{ pointerEvents: 'none' }}>📥</span>
                        </button>
                        <div className="action-menu-container">
                            <button
                                type="button"
                                className={`btn-icon-action action-menu-trigger ${actionMenuOrderId === batchMenuId ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuOrderId(prev => prev === batchMenuId ? null : batchMenuId);
                                }}
                                title="Más opciones del lote"
                            >
                                <span style={{ pointerEvents: 'none', letterSpacing: '-1px', fontWeight: 900 }}>•••</span>
                            </button>
                            {actionMenuOrderId === batchMenuId && (
                                <div className="action-menu-popover" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        className="action-menu-item"
                                        onClick={() => {
                                            setActionMenuOrderId(null);
                                            onOpenEditBatchModal(item.orders, item.batchName, item.batchId);
                                        }}
                                    >
                                        <span>✏️</span> Editar Grupo / Proyecto
                                    </button>
                                    <button
                                        type="button"
                                        className="action-menu-item"
                                        onClick={() => {
                                            setActionMenuOrderId(null);
                                            onOpenNestingModal(item.orders, item.batchName);
                                        }}
                                    >
                                        <span>📐</span> Nesting Studio 2D
                                    </button>
                                    <button
                                        type="button"
                                        className="action-menu-item"
                                        onClick={() => {
                                            setActionMenuOrderId(null);
                                            const clientObj = allClientes.find(c => String(c.id) === String(item.primaryOrder.clientId));
                                            generatePdfClientReport(item.orders, {
                                                clienteNombre: item.primaryOrder.clienteNombre,
                                                clienteEmpresa: clientObj?.empresa,
                                                clienteTelefono: clientObj?.telefono,
                                                clienteEmail: clientObj?.email
                                            });
                                        }}
                                    >
                                        <span>📄</span> Reporte PDF para el cliente
                                    </button>
                                    <button
                                        type="button"
                                        className="action-menu-item"
                                        onClick={() => {
                                            setActionMenuOrderId(null);
                                            onSetStatusBatch(item.primaryOrder, item.orders);
                                        }}
                                    >
                                        <span>⚙️</span> Cambiar estado del lote
                                    </button>
                                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                                    <button
                                        type="button"
                                        className="action-menu-item danger"
                                        onClick={() => {
                                            setActionMenuOrderId(null);
                                            onSoftDeleteBatch(item.orders, item.batchName);
                                        }}
                                    >
                                        <span>🗑️</span> Enviar lote a Papelera
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </td>
            </tr>

            {/* EXPANDED VEHICULAR NESTING SUGGESTION BANNER */}
            {isExpanded && vehicularSuggestions.length > 0 && (
                <tr className="batch-vehicular-nesting-row">
                    <td colSpan={5}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.35rem', filter: 'drop-shadow(0 0 5px #f59e0b)' }}>💡</span>
                                <div>
                                    <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>Sugerencia de Anidado — Ahorro en Tiempo de Laminado</span>
                                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.25)', color: '#fef3c7' }}>
                                            ≤ 2.90 ml
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px' }}>
                                        {vehicularSuggestions[0].message} {vehicularSuggestions[0].benefitText}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onOpenNestingModal(item.orders, item.batchName)}
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: '#000',
                                    fontWeight: 800,
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 0 10px rgba(245, 158, 11, 0.35)',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span>📐</span> Anidar en Nesting Studio
                            </button>
                        </div>
                    </td>
                </tr>
            )}

            {/* EXPANDED CHILD ROWS */}
            {isExpanded && item.orders.map(order => {
                const consumption = getConsumption(order, allMateriales);
                const otDisplay = order.ot || `OT-${order.id}`;
                let childLabel = order.descripcionItem;
                if (!childLabel && order.nombreTarea && order.nombreTarea.includes(' - ')) {
                    childLabel = order.nombreTarea.split(' - ').slice(1).join(' - ').trim();
                }
                if (!childLabel) {
                    childLabel = order.archivosOriginales?.[0] || order.archivos?.[0] || order.nombreTarea || '';
                }

                const isChildSelected = selectedIds.has(String(order.id || order.ot));
                const isSpecial = isSpecialLaminationOrder(order, consumption, allMateriales);
                const orderKey = String(order.id || order.ot);

                return (
                    <tr
                        key={order.id || order.ot}
                        className={`batch-child-row fade-in ${isChildSelected ? 'selected-row' : ''} ${isSpecial ? 'is-special-lamination' : ''}`}
                        onDoubleClick={() => onPreview(order)}
                        style={{ cursor: 'pointer' }}
                    >
                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                            <div className="batch-child-indent">
                                <span className="batch-child-connector">↳</span>
                                <input
                                    type="checkbox"
                                    checked={isChildSelected}
                                    onChange={() => onToggleSelection(order.id || order.ot || '')}
                                    style={{ accentColor: 'var(--primary-color)', cursor: 'pointer', transform: 'scale(1.1)' }}
                                />
                            </div>
                        </td>
                        <td>
                            <div className="composite-cell-primary" style={{ paddingLeft: '8px' }}>
                                <div className="composite-top-row">
                                    <span className="ot-text" style={{ fontWeight: 800, color: 'var(--ot-color)', fontSize: '0.9rem' }}>{otDisplay}</span>
                                    {childLabel && (
                                        <span className="composite-work-title" title={childLabel}>
                                            {childLabel}
                                        </span>
                                    )}
                                </div>
                                <div className="composite-bottom-row">
                                    <span className="composite-client">↳ {order.clienteNombre}</span>
                                    <OrderTagBadges
                                        order={order}
                                        tagPopoverOrderId={tagPopoverOrderId}
                                        setTagPopoverOrderId={setTagPopoverOrderId}
                                        onToggleTag={onToggleTag}
                                    />
                                </div>
                            </div>
                        </td>
                        <td>
                            <div className="composite-cell-tech">
                                <div className="composite-top-row">
                                    <span className="material-tag-sm">{order.material}</span>
                                    {(() => {
                                        const w = Number(order.ancho) || 0;
                                        const h = Number(order.alto) || 0;
                                        return (
                                            <span className="dims-text">
                                                <span style={w > 2.93 ? { color: 'var(--badge-purple-text)', fontWeight: 800 } : undefined}>{w.toFixed(2)}</span>
                                                {' × '}
                                                <span style={h > 2.93 ? { color: 'var(--badge-purple-text)', fontWeight: 800 } : undefined}>{h.toFixed(2)}</span>
                                                {' m'}
                                                {isSpecial && <span style={{ marginLeft: '3px', fontSize: '0.72rem', color: 'var(--badge-purple-text)' }} title="Paño > 2.93m: Requiere laminado especial">⚡</span>}
                                            </span>
                                        );
                                    })()}
                                    <span className="copies-badge">{order.copias} cop.</span>
                                    {order.demasiasConfig && Object.values(order.demasiasConfig).some(v => v === true) && (
                                        <span className="demasia-indicator" title={`Demasías: ${[order.demasiasConfig.top?'Arriba':'', order.demasiasConfig.bottom?'Abajo':'', order.demasiasConfig.left?'Izq':'', order.demasiasConfig.right?'Der':''].filter(Boolean).join(', ')}`}>
                                            🎯 Demasías
                                        </span>
                                    )}
                                </div>
                                <div className="composite-bottom-row">
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Consumo:</span>
                                    <OrderConsumptionBadge order={order} consumption={consumption} />
                                </div>
                            </div>
                        </td>
                        <td>
                            <div className="composite-cell-status">
                                <div className="composite-top-row">
                                    <div
                                        style={{ cursor: 'pointer' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onStatusSingle(order);
                                        }}
                                        title="Click para cambiar el estado de este ítem"
                                    >
                                        <span className="status-badge" style={{
                                            backgroundColor: statusColors[order.status],
                                            boxShadow: `0 0 6px ${statusColors[order.status]}30`,
                                            fontSize: '0.72rem',
                                            padding: '2px 6px',
                                            cursor: 'pointer'
                                        }}>
                                            {statusLabels[order.status]}
                                        </span>
                                    </div>
                                    {order.envio && (
                                        <span className="shipping-pill">
                                            🚚 {order.envio}
                                        </span>
                                    )}
                                </div>
                                <div className="composite-bottom-row">
                                    <span style={{ fontWeight: '600', color: 'var(--accent)', fontSize: '0.8rem' }}>
                                        📅 {order.fechaEntrega ? (() => {
                                            const d = new Date(order.fechaEntrega + 'T12:00:00');
                                            if (!isNaN(d.getTime())) {
                                                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                                            }
                                            return order.fechaEntrega;
                                        })() : '--'}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        Hora: {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </span>
                                </div>
                            </div>
                        </td>
                        {isAdmin && (
                            <td>
                                <div className="price-cell">
                                    <span className="currency">$</span>
                                    <span className="amount">
                                        {calculateOrderPrice(order, allMateriales, allClientes).toLocaleString()}
                                    </span>
                                </div>
                            </td>
                        )}
                        <td>
                            <div className="order-actions-compact">
                                <button
                                    type="button"
                                    className="btn-icon-action"
                                    onClick={(e) => { e.stopPropagation(); onPreview(order); }}
                                    title="Ver Detalle"
                                    style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.5)' }}
                                >
                                    <span style={{ pointerEvents: 'none' }}>👁️</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn-icon-action"
                                    onClick={(e) => { e.stopPropagation(); onDownloadSingle(order); }}
                                    title={order.archivos?.length ? `Descargar archivo(s) (${order.archivos.length})` : 'Sin archivos adjuntos'}
                                    disabled={!order.archivos?.length}
                                    style={{
                                        background: order.archivos?.length ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.1)',
                                        border: order.archivos?.length ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(100, 116, 139, 0.2)',
                                        opacity: order.archivos?.length ? 1 : 0.4,
                                        cursor: order.archivos?.length ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    <span style={{ pointerEvents: 'none' }}>📥</span>
                                </button>
                                <div className="action-menu-container">
                                    <button
                                        type="button"
                                        className={`btn-icon-action action-menu-trigger ${actionMenuOrderId === orderKey ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActionMenuOrderId(prev => prev === orderKey ? null : orderKey);
                                        }}
                                        title="Más opciones de orden"
                                    >
                                        <span style={{ pointerEvents: 'none', letterSpacing: '-1px', fontWeight: 900 }}>•••</span>
                                    </button>
                                    {actionMenuOrderId === orderKey && (
                                        <div className="action-menu-popover" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                className="action-menu-item"
                                                onClick={() => {
                                                    setActionMenuOrderId(null);
                                                    onOpenChat(order);
                                                }}
                                            >
                                                <span>💬</span> Chat / Mensajes
                                            </button>
                                            {order.archivos && order.archivos.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="action-menu-item"
                                                    onClick={() => {
                                                        setActionMenuOrderId(null);
                                                        onOpenSuiteCraft(order);
                                                    }}
                                                    style={{ color: '#c084fc', fontWeight: 600 }}
                                                >
                                                    <span>🎨</span> SuiteCraft
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="action-menu-item"
                                                onClick={() => {
                                                    setActionMenuOrderId(null);
                                                    onOpenPdfMode(order);
                                                }}
                                            >
                                                <span>📄</span> Presupuesto PDF
                                            </button>
                                            <button
                                                type="button"
                                                className="action-menu-item"
                                                onClick={() => {
                                                    setActionMenuOrderId(null);
                                                    onGenerateLabel(order);
                                                }}
                                            >
                                                <span>🏷️</span> Etiqueta Rollo
                                            </button>
                                            <button
                                                type="button"
                                                className="action-menu-item"
                                                onClick={() => {
                                                    setActionMenuOrderId(null);
                                                    onStatusSingle(order);
                                                }}
                                            >
                                                <span>⚙️</span> Cambiar Estado
                                            </button>
                                            <button
                                                type="button"
                                                className="action-menu-item"
                                                onClick={() => {
                                                    setActionMenuOrderId(null);
                                                    onEditOrder(order);
                                                }}
                                            >
                                                <span>✏️</span> Editar Pedido
                                            </button>
                                            <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                                            <button
                                                type="button"
                                                className="action-menu-item danger"
                                                onClick={() => {
                                                    setActionMenuOrderId(null);
                                                    onSoftDeleteSingle(order);
                                                }}
                                            >
                                                <span>🗑️</span> Enviar a Papelera
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </td>
                    </tr>
                );
            })}
        </>
    );
});
