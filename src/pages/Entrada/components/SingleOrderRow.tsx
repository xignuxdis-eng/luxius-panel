import React from 'react'
import type { Order, Cliente, Material } from '@/types'
import { statusColors, statusLabels } from '@/types/orden'
import { OrderTagBadges } from './OrderTagBadges'
import { OrderConsumptionBadge } from './OrderConsumptionBadge'
import { calculateOrderPrice, getConsumption, isSpecialLaminationOrder } from '../utils/entradaCalculations'

export interface SingleOrderRowProps {
    order: Order;
    isSelected: boolean;
    onToggleSelect: (id: string | number) => void;
    onPreview: (order: Order) => void;
    tagPopoverOrderId: number | string | null;
    setTagPopoverOrderId: (id: number | string | null) => void;
    onToggleTag: (order: Order, tagId: string, e?: React.MouseEvent) => void;
    allMateriales: Material[];
    allClientes: Cliente[];
    isAdmin: boolean;
    onStatusClick: (order: Order) => void;
    actionMenuOrderId: number | string | null;
    setActionMenuOrderId: React.Dispatch<React.SetStateAction<number | string | null>>;
    onRestoreOrder: (order: Order) => void;
    onPermanentDelete: (order: Order) => void;
    onDownloadSingle: (order: Order) => void;
    onOpenChat: (order: Order) => void;
    onOpenSuiteCraft: (order: Order) => void;
    onOpenPdfMode: (order: Order) => void;
    onGenerateLabel: (order: Order) => void;
    onEditOrder: (order: Order) => void;
    onSoftDelete: (order: Order) => void;
}

export const SingleOrderRow = React.memo(function SingleOrderRow({
    order,
    isSelected,
    onToggleSelect,
    onPreview,
    tagPopoverOrderId,
    setTagPopoverOrderId,
    onToggleTag,
    allMateriales,
    allClientes,
    isAdmin,
    onStatusClick,
    actionMenuOrderId,
    setActionMenuOrderId,
    onRestoreOrder,
    onPermanentDelete,
    onDownloadSingle,
    onOpenChat,
    onOpenSuiteCraft,
    onOpenPdfMode,
    onGenerateLabel,
    onEditOrder,
    onSoftDelete
}: SingleOrderRowProps) {
    const consumption = getConsumption(order, allMateriales);
    const isMobile = order.origen === 'mobile';
    const operarioNombre = order.operarioNombre || order.vendedorNombre || (order as any).vendedor?.nombre || (order as any).vendedorName || '';
    const otDisplay = order.ot || `OT-${order.id}`;
    const [openUpwards, setOpenUpwards] = React.useState(false);
    let cleanDesc = (order.nombreTarea || order.observaciones || '').trim();
    if (cleanDesc.startsWith('Proyecto #') || cleanDesc.startsWith('Proyecto OT-') || cleanDesc === 'Nuevo Pedido' || cleanDesc === 'Trabajo de Impresión') {
        cleanDesc = '';
    }

    const orderIdKey = String(order.id || order.ot);
    const isSpecial = isSpecialLaminationOrder(order, consumption, allMateriales);

    return (
        <tr
            key={order.id || order.ot}
            className={`fade-in hover-row ${isSelected ? 'selected-row' : ''} ${isSpecial ? 'is-special-lamination' : ''}`}
            onDoubleClick={() => onPreview(order)}
            style={isSelected ? { background: 'rgba(var(--primary-rgb), 0.05)', cursor: 'pointer' } : { cursor: 'pointer' }}
        >
            <td style={{ textAlign: 'center' }}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(order.id || order.ot || '')}
                    style={{ accentColor: 'var(--primary-color)', cursor: 'pointer', transform: 'scale(1.2)' }}
                />
            </td>
            <td>
                <div className="composite-cell-primary">
                    <div className="composite-top-row">
                        <span className="ot-text" style={{ fontWeight: 800, color: 'var(--ot-color)', fontSize: '0.95rem' }}>{otDisplay}</span>
                        {isMobile ? (
                            <span className="origin-badge origin-badge-mobile" title={`Enviado por: ${operarioNombre || 'Operario Móvil'}`}>
                                📱 App {operarioNombre ? operarioNombre : 'Móvil'}
                            </span>
                        ) : (
                            <span className="origin-badge origin-badge-web">
                                💻 Web
                            </span>
                        )}
                        {cleanDesc && (
                            <span className="composite-work-title" title={cleanDesc}>
                                {cleanDesc}
                            </span>
                        )}
                    </div>
                    <div className="composite-bottom-row">
                        <span className="composite-client">🏢 {order.clienteNombre}</span>
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
                                onStatusClick(order);
                            }}
                            title="Click para cambiar el estado"
                        >
                            <span className="status-badge" style={{
                                backgroundColor: statusColors[order.status],
                                boxShadow: `0 0 8px ${statusColors[order.status]}40`,
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
                                    const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase().replace('.', '');
                                    return `${dayName} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                                }
                                return order.fechaEntrega;
                            })() : '--'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Ingreso: {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : (order.fechaCreacion || '-')}
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
                    {order.status === 'eliminado' ? (
                        <>
                            <button
                                type="button"
                                className="btn-icon-action"
                                onClick={(e) => { e.stopPropagation(); onRestoreOrder(order); }}
                                title="Restaurar Orden"
                                style={{ filter: 'grayscale(0)' }}
                            >
                                <span style={{ pointerEvents: 'none', fontSize: '1.1rem' }}>🔁</span>
                            </button>
                            <button
                                type="button"
                                className="btn-icon-action btn-danger-action"
                                onClick={(e) => { e.stopPropagation(); onPermanentDelete(order); }}
                                title="Eliminar Definitivamente"
                            >
                                <span style={{ pointerEvents: 'none' }}>🗑️</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="btn-icon-action"
                                onClick={(e) => { e.stopPropagation(); onPreview(order); }}
                                title="Ver Detalle (Doble clic en fila también abre)"
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
                                    className={`btn-icon-action action-menu-trigger ${actionMenuOrderId === orderIdKey ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const btnRect = e.currentTarget.getBoundingClientRect();
                                        const spaceBelow = window.innerHeight - btnRect.bottom;
                                        setOpenUpwards(spaceBelow < 280);
                                        setActionMenuOrderId(prev => prev === orderIdKey ? null : orderIdKey);
                                    }}
                                    title="Más opciones de orden"
                                >
                                    <span style={{ pointerEvents: 'none', letterSpacing: '-1px', fontWeight: 900 }}>•••</span>
                                </button>
                                {actionMenuOrderId === orderIdKey && (
                                    <div className={`action-menu-popover ${openUpwards ? 'open-upwards' : ''}`} onClick={(e) => e.stopPropagation()}>
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
                                                onStatusClick(order);
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
                                                onSoftDelete(order);
                                            }}
                                        >
                                            <span>🗑️</span> Enviar a Papelera
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
});
