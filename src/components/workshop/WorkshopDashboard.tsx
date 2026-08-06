// WorkshopDashboard.tsx - Main Gamified Workshop View for Luxius
import React, { useState, useEffect } from 'react';
import { getOrdenes, saveOrden } from '@/data/db';
import { Order, OrderStatus } from '@/types/orden';
import { WorkshopCanvas } from './WorkshopCanvas';
import { PrintManagerHUD } from './PrintManagerHUD';
import { StationModal } from './StationModal';
import { StationId } from './types';
import { audioEngine } from './AudioEngine';
import SharedFileViewerModal from '@components/shared/SharedFileViewerModal';

export const WorkshopDashboard: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedStation, setSelectedStation] = useState<StationId | null>(null);
    const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

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
        // Poll orders every 3 seconds to keep workshop in sync with Luxius DB
        const interval = setInterval(fetchOrders, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleUpdateStatus = async (orderId: number, newStatus: OrderStatus) => {
        try {
            const targetOrder = orders.find(o => o.id === orderId);
            if (!targetOrder) return;

            const updated = {
                ...targetOrder,
                status: newStatus,
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
            backgroundColor: '#0f172a',
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
                color: '#f8fafc',
                fontFamily: 'sans-serif'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏭 XignuX Print Den <span style={{ fontSize: '12px', backgroundColor: '#0284c7', padding: '2px 8px', borderRadius: '10px' }}>Luxius Interactive Workshop</span>
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                        Haz clic en las estaciones del taller o en cualquier orden para ver detalles, archivos o navegar a cada área.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        onClick={toggleAudio}
                        style={{
                            backgroundColor: isMuted ? '#ef4444' : '#22c55e',
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

            {/* Main Interactive Workshop Canvas */}
            <div style={{ position: 'relative' }}>
                <PrintManagerHUD
                    orders={orders}
                    onSelectOrder={(order) => setPreviewOrder(order)}
                    onSimulateStatusChange={handleUpdateStatus}
                />

                <WorkshopCanvas
                    orders={orders}
                    onSelectStation={(stationId) => setSelectedStation(stationId)}
                    onSelectOrder={(order) => setPreviewOrder(order)}
                    selectedStation={selectedStation}
                />
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
