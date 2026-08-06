import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StationId } from './types';
import { Order } from '@/types/orden';
import { audioEngine } from './AudioEngine';
import { getMaquinas, getMateriales } from '@/data/db';
import SharedFileViewerModal from '@components/shared/SharedFileViewerModal';

interface StationModalProps {
    stationId: StationId | null;
    orders: Order[];
    onClose: () => void;
    onUpdateOrderStatus?: (orderId: number, newStatus: any) => void;
    onViewOrder?: (order: Order) => void;
}

export const StationModal: React.FC<StationModalProps> = ({
    stationId,
    orders,
    onClose,
    onUpdateOrderStatus,
    onViewOrder
}) => {
    const navigate = useNavigate();
    const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

    if (!stationId) return null;

    const getStationRoute = (id: StationId): { path: string; label: string } => {
        if (id === 'diseno') return { path: '/diseno', label: 'Área de Diseño' };
        if (id === 'plotter1' || id === 'plotter2' || id.startsWith('maquina_')) return { path: '/impresion', label: 'Listado de Impresión' };
        if (id === 'insumos') return { path: '/stock', label: 'Stock & Materiales' };
        if (id === 'corte') return { path: '/impresion', label: 'Refilado / Impresión' };
        if (id === 'empaque') return { path: '/entrada', label: 'Empaque / Órdenes' };
        if (id === 'despacho') return { path: '/entrada', label: 'Despacho / Órdenes' };
        if (id === 'caja') return { path: '/abm/tarifas', label: 'Caja & Tarifas' };
        return { path: '/entrada', label: 'Órdenes de Trabajo' };
    };

    const routeInfo = getStationRoute(stationId);

    const getStationTitle = () => {
        const maquinas = getMaquinas();

        if (stationId.startsWith('maquina_')) {
            const mId = parseInt(stationId.replace('maquina_', ''), 10);
            const m = maquinas.find(x => x.id === mId);
            if (m) return `🖨️ ${m.nombre.toUpperCase()}`;
        }

        const m1 = (maquinas[0]?.nombre || 'PLOTTER PRINCIPAL').toUpperCase();
        const m2 = (maquinas[1]?.nombre || 'PLOTTER SECUNDARIO').toUpperCase();

        switch (stationId) {
            case 'diseno': return '🖥️ ÁREA DE DISEÑO & PRE-PRENSA';
            case 'plotter1': return `🖨️ ${m1}`;
            case 'plotter2': return `🖨️ ${m2}`;
            case 'insumos': return '🎨 STOCK DE INSUMOS & MATERIALES';
            case 'corte': return '✂️ MESA DE REFILADO & CORTE';
            case 'empaque': return '📦 MESA DE EMPAQUETADO';
            case 'despacho': return '🚚 MUELLE DE DESPACHO';
            case 'caja': return '🪙 CAJA REGISTRADORA & VENTAS';
            default: return 'ESTACIÓN DE TRABAJO';
        }
    };

    const getStationOrders = () => {
        if (stationId.startsWith('maquina_')) {
            return orders.filter(o => o.status === 'orden');
        }

        switch (stationId) {
            case 'diseno':
                return orders.filter(o => o.status === 'diseno' || o.status === 'rebotado' || o.status === 'relevamiento');
            case 'plotter1':
            case 'plotter2':
                return orders.filter(o => o.status === 'orden');
            case 'corte':
                return orders.filter(o => o.status === 'impreso' || o.status === 'post');
            case 'empaque':
                return orders.filter(o => o.status === 'completo');
            case 'despacho':
                return orders.filter(o => o.status === 'entregado');
            default:
                return orders;
        }
    };

    const stationOrders = getStationOrders();
    const materiales = getMateriales();

    // Calculate real sales metrics from actual system orders
    const isToday = (dateStr?: string) => {
        if (!dateStr) return false;
        try {
            const d = new Date(dateStr);
            const now = new Date();
            return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        } catch (e) { return false; }
    };

    const todayOrders = orders.filter(o => isToday(o.createdAt || (o as any).fechaCreacion));
    const targetOrdersForStats = todayOrders.length > 0 ? todayOrders : orders;
    const totalVentasHoy = targetOrdersForStats.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const entregasCount = orders.filter(o => o.status === 'entregado').length;
    const ticketPromedio = Math.round(totalVentasHoy / Math.max(1, targetOrdersForStats.length));

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: '#0f172a',
                border: '4px solid #fbbf24',
                borderRadius: '8px',
                width: '660px',
                maxWidth: '92vw',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0,0,0,0.9)',
                color: '#f8fafc',
                fontFamily: '"Silkscreen", "Press Start 2P", monospace'
            }}>
                {/* Modal Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderBottom: '2px solid #334155',
                    backgroundColor: '#1e293b'
                }}>
                    <h3 style={{ margin: 0, fontSize: '12px', color: '#fbbf24' }}>
                        {getStationTitle()}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={() => {
                                audioEngine.playClick();
                                onClose();
                                navigate(routeInfo.path);
                            }}
                            style={{
                                backgroundColor: '#0284c7',
                                border: '1px solid #38bdf8',
                                color: '#ffffff',
                                fontWeight: 'bold',
                                fontSize: '9px',
                                padding: '5px 10px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            title={`Ir a la sección ${routeInfo.label}`}
                        >
                            🚀 Ir a {routeInfo.label} ➔
                        </button>
                        <button
                            onClick={() => {
                                audioEngine.playClick();
                                onClose();
                            }}
                            style={{
                                backgroundColor: '#ef4444',
                                border: '1px solid #ffffff',
                                color: '#ffffff',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                lineHeight: 1
                            }}
                        >
                            ✖
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '18px', overflowY: 'auto', flex: 1 }}>
                    {stationId === 'insumos' && (
                        <div>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '10px', color: '#10b981' }}>NIVELES REALES DE INSUMOS & STOCK</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                {materiales.length === 0 ? (
                                    <div style={{ color: '#94a3b8', fontSize: '9px', gridColumn: 'span 2' }}>Sin materiales registrados</div>
                                ) : (
                                    materiales.map(m => {
                                        const stockAct = m.stockActual || 0;
                                        const stockMin = m.stockMinimo || 1;
                                        const pct = Math.min(100, Math.round((stockAct / Math.max(1, stockMin * 2)) * 100));
                                        const isLow = stockAct <= stockMin;
                                        const color = isLow ? '#ef4444' : pct < 50 ? '#f59e0b' : '#22c55e';
                                        return (
                                            <div
                                                key={m.id}
                                                onClick={() => {
                                                    audioEngine.playClick();
                                                    onClose();
                                                    navigate('/stock');
                                                }}
                                                style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '4px', border: `1px solid ${color}`, cursor: 'pointer' }}
                                                title="Hacer clic para ir al control de Stock"
                                            >
                                                <div style={{ fontSize: '9px', color: '#f8fafc', fontWeight: 'bold' }}>{m.descripcion}</div>
                                                <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '2px' }}>
                                                    Stock: {stockAct} | Mín: {stockMin} {isLow ? '⚠️ [BAJO]' : '✅ [OK]'}
                                                </div>
                                                <div style={{ height: '8px', backgroundColor: '#0f172a', borderRadius: '2px', marginTop: '6px', border: `1px solid ${color}` }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color }}></div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {stationId === 'caja' && (
                        <div>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '10px', color: '#fbbf24' }}>RESUMEN FINANCIERO EN TIEMPO REAL 🪙</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                                <div
                                    onClick={() => { audioEngine.playClick(); onClose(); navigate('/abm/tarifas'); }}
                                    style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '4px', border: '1px solid #22c55e', textAlign: 'center', cursor: 'pointer' }}
                                    title="Ir a Tarifas"
                                >
                                    <div style={{ fontSize: '8px', color: '#94a3b8' }}>Ventas ({todayOrders.length > 0 ? 'Hoy' : 'Total'})</div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#22c55e', marginTop: '4px' }}>
                                        ${totalVentasHoy.toLocaleString('es-AR')}
                                    </div>
                                </div>
                                <div
                                    onClick={() => { audioEngine.playClick(); onClose(); navigate('/entrada'); }}
                                    style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '4px', border: '1px solid #38bdf8', textAlign: 'center', cursor: 'pointer' }}
                                    title="Ir a Órdenes"
                                >
                                    <div style={{ fontSize: '8px', color: '#94a3b8' }}>Entregas</div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>
                                        {entregasCount} OT
                                    </div>
                                </div>
                                <div
                                    onClick={() => { audioEngine.playClick(); onClose(); navigate('/abm/tarifas'); }}
                                    style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '4px', border: '1px solid #f59e0b', textAlign: 'center', cursor: 'pointer' }}
                                    title="Ir a Tarifas"
                                >
                                    <div style={{ fontSize: '8px', color: '#94a3b8' }}>Ticket Prom.</div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b', marginTop: '4px' }}>
                                        ${ticketPromedio.toLocaleString('es-AR')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <h4 style={{ margin: '14px 0 8px 0', fontSize: '10px', color: '#38bdf8' }}>
                        ÓRDENES EN ESTACIÓN [{stationOrders.length}]
                    </h4>

                    {stationOrders.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#1e293b', borderRadius: '4px', color: '#64748b', fontSize: '9px' }}>
                            Sin órdenes activas en esta estación.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {stationOrders.map(order => (
                                <div
                                    key={order.id}
                                    style={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '4px',
                                        padding: '10px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div
                                        onClick={() => {
                                            audioEngine.playClick();
                                            if (onViewOrder) onViewOrder(order);
                                            else setPreviewOrder(order as any);
                                        }}
                                        style={{ cursor: 'pointer', flex: 1, marginRight: '10px' }}
                                        title="Hacer clic para ver detalles y archivos de esta orden"
                                    >
                                        <div style={{ fontWeight: 'bold', color: '#fbbf24', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            OT #{order.ot || order.id} - {order.clienteNombre} <span style={{ fontSize: '9px', opacity: 0.8 }}>👁️</span>
                                        </div>
                                        <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '4px' }}>
                                            {order.material} ({order.ancho}x{order.alto}m) | Copias: {order.copias}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            onClick={() => {
                                                audioEngine.playClick();
                                                if (onViewOrder) onViewOrder(order);
                                                else setPreviewOrder(order as any);
                                            }}
                                            style={{
                                                backgroundColor: '#0284c7',
                                                color: '#fff',
                                                border: '1px solid #38bdf8',
                                                padding: '6px 8px',
                                                borderRadius: '3px',
                                                fontSize: '8px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                            title="Ver archivos y previsualizar orden"
                                        >
                                            👁️ Detalle
                                        </button>

                                        {stationId === 'diseno' && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        audioEngine.playClick();
                                                        onUpdateOrderStatus && onUpdateOrderStatus(order.id, 'orden');
                                                    }}
                                                    style={{
                                                        backgroundColor: '#22c55e',
                                                        color: '#fff',
                                                        border: '1px solid #ffffff',
                                                        padding: '6px 8px',
                                                        borderRadius: '3px',
                                                        fontSize: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✨ Aprobar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        audioEngine.playBounceWarning();
                                                        onUpdateOrderStatus && onUpdateOrderStatus(order.id, 'rebotado');
                                                    }}
                                                    style={{
                                                        backgroundColor: '#ef4444',
                                                        color: '#fff',
                                                        border: '1px solid #ffffff',
                                                        padding: '6px 8px',
                                                        borderRadius: '3px',
                                                        fontSize: '8px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ⚠️ Rebotar
                                                </button>
                                            </>
                                        )}

                                        {(stationId === 'plotter1' || stationId === 'plotter2') && (
                                            <button
                                                onClick={() => {
                                                    audioEngine.playPrintSweep();
                                                    onUpdateOrderStatus && onUpdateOrderStatus(order.id, 'impreso');
                                                }}
                                                style={{
                                                    backgroundColor: '#3b82f6',
                                                    color: '#fff',
                                                    border: '1px solid #ffffff',
                                                    padding: '6px 8px',
                                                    borderRadius: '3px',
                                                    fontSize: '8px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🖨️ Imprimir
                                            </button>
                                        )}

                                        {stationId === 'corte' && (
                                            <button
                                                onClick={() => {
                                                    audioEngine.playScissorsCut();
                                                    onUpdateOrderStatus && onUpdateOrderStatus(order.id, 'completo');
                                                }}
                                                style={{
                                                    backgroundColor: '#ec4899',
                                                    color: '#fff',
                                                    border: '1px solid #ffffff',
                                                    padding: '6px 8px',
                                                    borderRadius: '3px',
                                                    fontSize: '8px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✂️ Refilar
                                            </button>
                                        )}

                                        {stationId === 'empaque' && (
                                            <button
                                                onClick={() => {
                                                    audioEngine.playOrderComplete();
                                                    onUpdateOrderStatus && onUpdateOrderStatus(order.id, 'entregado');
                                                }}
                                                style={{
                                                    backgroundColor: '#84cc16',
                                                    color: '#fff',
                                                    border: '1px solid #ffffff',
                                                    padding: '6px 8px',
                                                    borderRadius: '3px',
                                                    fontSize: '8px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                📦 Despachar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div style={{
                    padding: '10px 18px',
                    borderTop: '2px solid #334155',
                    backgroundColor: '#1e293b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={() => {
                            audioEngine.playClick();
                            onClose();
                            navigate(routeInfo.path);
                        }}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: '#ffffff',
                            border: '1px solid #60a5fa',
                            padding: '6px 14px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '9px',
                            cursor: 'pointer'
                        }}
                    >
                        🚀 IR A SECCIÓN [{routeInfo.label.toUpperCase()}]
                    </button>

                    <button
                        onClick={() => {
                            audioEngine.playClick();
                            onClose();
                        }}
                        style={{
                            backgroundColor: '#fbbf24',
                            color: '#0f172a',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '9px',
                            cursor: 'pointer'
                        }}
                    >
                        VOLVER AL TALLER
                    </button>
                </div>
            </div>

            {previewOrder && (
                <SharedFileViewerModal
                    isOpen={!!previewOrder}
                    onClose={() => setPreviewOrder(null)}
                    order={previewOrder as any}
                    showStandardize={true}
                />
            )}
        </div>
    );
};
