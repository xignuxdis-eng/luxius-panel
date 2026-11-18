// WorkshopDashboard.tsx - Main Gamified Workshop View for Luxius
import React, { useState, useEffect } from 'react';
import { getOrdenes, saveOrden, deductStockForOrder, revertStockForOrder } from '@/data/db';
import { Order, OrderStatus } from '@/types/orden';
import { WorkshopCanvasPixi } from './WorkshopCanvasPixi';
import { PrintManagerHUD } from './PrintManagerHUD';
import { XanaBoard } from './XanaBoard';
import { StationModal } from './StationModal';
import { StationId } from './types';
import { audioEngine } from './AudioEngine';
import SharedFileViewerModal from '@components/shared/SharedFileViewerModal';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback: (retry: () => void) => React.ReactNode;
    onCatch?: (err: Error) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class WorkshopPixiErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.warn('🩺 [Workshop ErrorBoundary] Interceptado fallo en motor PixiJS:', error, errorInfo);
        this.props.onCatch?.(error);
    }

    retry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return this.props.fallback(this.retry);
        }
        return this.props.children;
    }
}

export const WorkshopDashboard: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedStation, setSelectedStation] = useState<StationId | null>(null);
    const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [pixiAsyncError, setPixiAsyncError] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            const allOrders = await getOrdenes();
            setOrders(allOrders);
        } catch (err) {
            console.error('Error loading Luxius orders into workshop:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        // Polling cada 30 segundos sólo si la pestaña está visible para evitar egress innecesario
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchOrders();
            }
        }, 30000);

        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === 'visible') {
                fetchOrders();
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('focus', handleVisibilityOrFocus);
        };
    }, []);

    const handleUpdateStatus = async (orderId: number, newStatus: OrderStatus) => {
        try {
            const targetOrder = orders.find(o => o.id === orderId);
            if (!targetOrder) return;

            let stockDescontado = targetOrder.stockDescontado || false;

            // 1. Si pasa a impreso o entregado y no estaba descontado, descontamos
            if ((newStatus === 'impreso' || newStatus === 'entregado') && !stockDescontado) {
                stockDescontado = deductStockForOrder(targetOrder, newStatus);
            }
            // 2. Si se cancela o rebota y ya estaba descontado, revertimos
            else if ((newStatus === 'rebotado' || newStatus === 'anulado' || newStatus === 'diseno' || newStatus === 'preorden') && stockDescontado) {
                revertStockForOrder(targetOrder);
                stockDescontado = false;
            }

            const updated: Order = {
                ...targetOrder,
                status: newStatus,
                stockDescontado,
                updatedAt: new Date().toISOString()
            };

            await saveOrden(updated);
            await fetchOrders();
        } catch (e) {
            console.error('Failed to update order status:', e);
        }
    };

    const toggleAudio = () => {
        const muted = audioEngine.toggleMute();
        setIsMuted(muted);
    };

    if (loading) {
        return (
            <div style={{
                height: '400px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#38bdf8',
                fontFamily: 'monospace'
            }}>
                🎮 Cargando Taller Pixel Art de Luxius...
            </div>
        );
    }

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            borderRadius: '12px',
            padding: '16px',
            boxSizing: 'border-box'
        }}>
            {/* Top Toolbar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                color: 'var(--text-primary)',
                flexWrap: 'wrap',
                gap: '8px'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--metric-cyan, #0369a1)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        🏭 XignuX Print Den <span style={{ fontSize: '12px', backgroundColor: '#0369a1', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>Luxius Interactive Workshop</span>
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Haz clic en las estaciones del taller o en cualquier orden para ver detalles, archivos o navegar a cada área.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={toggleAudio}
                        aria-pressed={!isMuted}
                        style={{
                            backgroundColor: isMuted ? '#dc2626' : '#15803d',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {isMuted ? '🔇 Audio Silenciado' : '🔊 Ambiente Activo'}
                    </button>
                </div>
            </div>

            {/* Main Interactive Workshop Layout */}
            <style>{`
                .workshop-layout-container {
                    display: flex;
                    flex-direction: row;
                    gap: 16px;
                    align-items: flex-start;
                    width: 100%;
                    box-sizing: border-box;
                }
                .workshop-sidebar-column {
                    width: 250px;
                    flex-shrink: 0;
                    box-sizing: border-box;
                }
                .workshop-map-column {
                    flex: 1;
                    min-width: 0;
                    position: relative;
                    box-sizing: border-box;
                }
                @media (max-width: 900px) {
                    .workshop-layout-container {
                        flex-direction: column;
                    }
                    .workshop-sidebar-column {
                        width: 100%;
                    }
                }
            `}</style>

            <div className="workshop-layout-container">
                <aside className="workshop-sidebar-column" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <PrintManagerHUD
                        orders={orders}
                        onSelectOrder={(order) => setPreviewOrder(order)}
                        onSimulateStatusChange={handleUpdateStatus}
                    />
                    <XanaBoard />
                </aside>

                <main className="workshop-map-column">
                    {!pixiAsyncError ? (
                        <WorkshopPixiErrorBoundary
                            onCatch={(err) => {
                                console.error('Pixi Workshop Error caught by boundary:', err);
                                setPixiAsyncError(err.message);
                            }}
                            fallback={(retry) => (
                                <div style={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #f59e0b',
                                    borderRadius: '6px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    color: '#f8fafc',
                                    fontSize: '12px'
                                }}>
                                    <span>⚠️ El motor PixiJS HD experimentó un reinicio.</span>
                                    <button
                                        onClick={() => {
                                            setPixiAsyncError(null);
                                            retry();
                                        }}
                                        style={{
                                            backgroundColor: '#38bdf8',
                                            color: '#0f172a',
                                            border: 'none',
                                            padding: '4px 10px',
                                            borderRadius: '4px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🔄 Reintentar Pixi HD
                                    </button>
                                </div>
                            )}
                        >
                            <WorkshopCanvasPixi
                                orders={orders}
                                onSelectStation={(stationId) => setSelectedStation(stationId)}
                                onSelectOrder={(order) => setPreviewOrder(order)}
                                selectedStation={selectedStation}
                                onError={(err) => setPixiAsyncError(err.message)}
                            />
                        </WorkshopPixiErrorBoundary>
                    ) : (
                        <div style={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #f59e0b',
                            borderRadius: '6px',
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: '#f8fafc',
                            fontSize: '12px'
                        }}>
                            <span>⚠️ Fallo WebGL en PixiJS HD ({pixiAsyncError}).</span>
                            <button
                                onClick={() => setPixiAsyncError(null)}
                                style={{
                                    backgroundColor: '#38bdf8',
                                    color: '#0f172a',
                                    border: 'none',
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Reintentar Pixi HD
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {/* Station Data Modal */}
            <StationModal
                stationId={selectedStation}
                orders={orders}
                onClose={() => setSelectedStation(null)}
                onUpdateOrderStatus={handleUpdateStatus}
                onViewOrder={(order) => setPreviewOrder(order)}
            />

            {/* Order Detail & Files Viewer Modal */}
            {previewOrder && (
                <SharedFileViewerModal
                    isOpen={!!previewOrder}
                    onClose={() => setPreviewOrder(null)}
                    order={previewOrder}
                    showStandardize={true}
                    onUpdate={fetchOrders}
                />
            )}
        </div>
    );
};
export default WorkshopDashboard;
