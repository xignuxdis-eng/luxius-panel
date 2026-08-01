// PrintManagerHUD.tsx - Styled Order Tracker HUD matching xignux print den.mp4
import React from 'react';
import { Order, statusLabels } from '@/types/orden';

interface PrintManagerHUDProps {
    orders: Order[];
    onSelectOrder?: (order: Order) => void;
    onSimulateStatusChange?: (orderId: number, nextStatus: any) => void;
    _onSimulateStatusChange?: (orderId: number, nextStatus: any) => void;
}

export const PrintManagerHUD: React.FC<PrintManagerHUDProps> = ({
    orders,
    onSelectOrder
}) => {
    const activeOrders = orders.slice(0, 4);

    const getStatusTag = (status: string) => {
        switch (status) {
            case 'orden': return { label: '[Printing]', color: '#22c55e' };
            case 'diseno': return { label: '[Waiting]', color: '#eab308' };
            case 'rebotado': return { label: '[REBOTADO]', color: '#ef4444' };
            case 'impreso': return { label: '[Trillar]', color: '#ec4899' };
            case 'post': return { label: '[Empaqueta]', color: '#3b82f6' };
            case 'entregado': return { label: '[Shipped]', color: '#10b981' };
            default: return { label: `[${statusLabels[status as keyof typeof statusLabels] || status}]`, color: '#38bdf8' };
        }
    };

    return (
        <div className="hud-container pixel-box-cyan" style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            width: '270px',
            backgroundColor: 'var(--pixel-bg-card)',
            border: '3px solid #000',
            padding: '10px',
            color: '#f8fafc',
            fontFamily: 'var(--font-pixel-ui)',
            zIndex: 10
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #334155',
                paddingBottom: '6px',
                marginBottom: '8px'
            }}>
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📋 Print Manager
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {orders.length} Órdenes
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeOrders.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                        Sin órdenes activas en cola
                    </div>
                ) : (
                    activeOrders.map((order, idx) => {
                        const tag = getStatusTag(order.status);

                        return (
                            <div
                                key={order.id}
                                onClick={() => onSelectOrder && onSelectOrder(order)}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    backgroundColor: '#1e293b',
                                    borderLeft: `4px solid ${tag.color}`,
                                    padding: '6px 8px',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>
                                        {idx + 1}. {order.clienteNombre || 'Orden'}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                        OT #{order.ot || order.id} ({order.ancho}x{order.alto}m)
                                    </div>
                                </div>
                                <span style={{
                                    backgroundColor: `${tag.color}33`,
                                    color: tag.color,
                                    border: `1px solid ${tag.color}`,
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    fontWeight: 'bold',
                                    fontSize: '10px'
                                }}>
                                    {tag.label}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
