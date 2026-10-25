import { useState, useEffect } from 'react'
import Header from '@components/layout/Header'
import { getMaquinas, getOrdenes, saveOrden, deductStockForOrder, revertStockForOrder, fetchPrinterLiveStatus, type PrinterLiveStatus } from '@data/db'
import { useAuthStore } from '@store/authStore'
import type { Order } from '@/types'
import { statusColors, statusLabels, isDesignerRole, isDesignerOwner } from '@/types'
import SharedFileViewerModal from '@components/shared/SharedFileViewerModal'
import { downloadSingleOrderFiles } from '@/utils/orderFileDownloader'
import './Impresion.css'

export default function Impresion() {
    const { user } = useAuthStore()
    const [maquinas] = useState(() => getMaquinas())
    const [livePrinters, setLivePrinters] = useState<PrinterLiveStatus[]>([])
    const [selectedPrinterTelemetry, setSelectedPrinterTelemetry] = useState<PrinterLiveStatus | null>(null)
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'cola' | 'historial'>('cola')
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null)

    // Polling de telemetría de impresoras en tiempo real (cada 4s)
    useEffect(() => {
        let mounted = true
        const updateTelemetry = async () => {
            try {
                const data = await fetchPrinterLiveStatus()
                if (mounted && data.length > 0) {
                    setLivePrinters(data)
                }
            } catch {
                // Silencioso
            }
        }
        updateTelemetry()
        const interval = setInterval(updateTelemetry, 4000)
        return () => {
            mounted = false
            clearInterval(interval)
        }
    }, [])

    const loadOrders = async () => {
        try {
            setLoading(true)
            const allOrders = await getOrdenes()

            // Filter logic inside the effect
            // We fetch everything and then filter in render or here?
            // Let's filter here for the active view to avoid huge lists
            // Actually, better to fetch all relevant to printing (both pending and done)
            // For now, let's keep fetching "active" ones for queue, but we need history.
            // Simplified: Fetch all that are printed OR pending
            const statuses = ['orden', 'impreso']
            let filtered = allOrders.filter(o =>
                statuses.includes(o.status) || o.category === 'impresion'
            )

            // Filter for Artist: only show prints originating from their designs
            if (isDesignerRole(user?.role)) {
                filtered = filtered.filter(o => isDesignerOwner(o, user))
            }

            setOrders(filtered)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOrders()
    }, [user])

    const handleMarkAsPrinted = async (order: Order) => {
        setOrders(prev => prev.map(o => (o.uuid || o.id) === (order.uuid || order.id) ? { ...o, status: 'impreso', stockDescontado: true } : o))

        try {
            // Descontar automáticamente del stock si no fue descontado
            let stockDescontado = order.stockDescontado || false
            if (!stockDescontado) {
                stockDescontado = deductStockForOrder(order, 'impreso')
            }

            await saveOrden({ ...order, status: 'impreso', stockDescontado })
            console.log(`Orden ${order.ot || order.id} marcada como IMPRESA (Stock descontado: ${stockDescontado})`)
        } catch (e) {
            console.error("Error updating status", e)
            alert("Error al actualizar estado")
            loadOrders()
        }
    }

    const handleRevert = async (order: Order) => {
        try {
            // Revertir deducción de stock si estaba descontado
            if (order.stockDescontado) {
                revertStockForOrder(order)
            }
            await saveOrden({ ...order, status: 'orden', stockDescontado: false })
            loadOrders()
        } catch (e) {
            console.error("Error reverting", e)
            alert("No se pudo revertir la acción")
        }
    }

    const handleBounce = async (order: Order) => {
        const reason = window.prompt("Ingrese el motivo del rebote (volverá a Diseño):", "Error en archivo") || "Rebotado a Diseño"

        try {
            if (order.stockDescontado) {
                revertStockForOrder(order)
            }
            await saveOrden({ ...order, status: 'preorden', comments: reason, stockDescontado: false })
            loadOrders()
        } catch (e) {
            console.error("Error bouncing", e)
            alert("No se pudo rebotar la orden")
        }
    }

    const displayedOrders = orders.filter(o => {
        if (activeTab === 'cola') return o.status === 'orden'
        if (activeTab === 'historial') return o.status === 'impreso'
        return false
    })

    return (
        <div className="impresion-page">
            <Header
                title="Impresión"
                subtitle={isDesignerRole(user?.role) ? "Mis diseños en cola de impresión" : "Gestión de producción"}
            />

            <div className="impresion-tabs">
                <button
                    className={`tab-btn ${activeTab === 'cola' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cola')}
                >
                    Cola de Impresión
                </button>
                <button
                    className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
                    onClick={() => setActiveTab('historial')}
                >
                    Historial Reciente
                </button>
            </div>

            {!isDesignerRole(user?.role) && (
                <div className="machines-status-bar">
                    {/* Impresoras con Telemetría en Vivo Roland / VersaWorks */}
                    {livePrinters.map((lp) => (
                        <div key={lp.machine_id} className={`machine-badge is-live animate-fade-in ${lp.status === 'printing' ? 'is-printing' : ''}`}>
                            <span className={`status-indicator ${lp.is_online ? 'online' : 'offline'}`} />
                            <div className="machine-info">
                                <span className="m-name">
                                    🖨️ {lp.machine_name}
                                    <span style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        backgroundColor: lp.is_online ? (lp.status === 'printing' ? '#10b981' : '#3b82f6') : '#475569',
                                        color: '#fff'
                                    }}>
                                        {lp.is_online ? (lp.status === 'printing' ? 'Imprimiendo' : 'Online / Listo') : 'Offline'}
                                    </span>
                                </span>
                                <span className="m-capacity">
                                    {lp.current_job ? `En curso: ${lp.current_job.job_name}` : (lp.last_completed_job ? `Último: ${lp.last_completed_job.job_name}` : 'En espera')}
                                </span>
                                {lp.current_job && (
                                    <span className="m-job-current">
                                        ⚡ {lp.current_job.size_str} | {lp.current_job.speed_str || 'Calculando...'}
                                    </span>
                                )}
                            </div>
                            <button
                                className="btn-telemetry-toggle"
                                onClick={() => setSelectedPrinterTelemetry(lp)}
                                title="Ver eventos y telemetría de VersaWorks en tiempo real"
                            >
                                📡 Log en Vivo
                            </button>
                        </div>
                    ))}

                    {/* Máquinas Estáticas Registradas */}
                    {maquinas.map((m) => (
                        <div key={m.id} className="machine-badge animate-fade-in">
                            <span className={`status-indicator ${m.habilitada ? 'online' : 'offline'}`} />
                            <div className="machine-info">
                                <span className="m-name">{m.categoria === 'corte' ? '📐' : '🖨️'} {m.nombre}</span>
                                <span className="m-capacity">Ancho: {m.anchoMaximo ? `${m.anchoMaximo}m` : `${m.ancho}mm`} ({m.categoria === 'corte' ? 'Corte' : 'Impresión'})</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="orders-table-container animate-fade-in">
                {loading ? (
                    <div className="loading-state">Cargando...</div>
                ) : displayedOrders.length === 0 ? (
                    <div className="empty-state">No hay órdenes en {activeTab === 'cola' ? 'la cola' : 'el historial reciente'}</div>
                ) : (
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>OT / ID</th>
                                <th>Estado</th>
                                <th>Cliente</th>
                                <th>Material / Plotter</th>
                                <th>Medidas</th>
                                <th>Cant.</th>
                                <th>m²</th>
                                <th>Demasías</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedOrders.map(order => (
                                <tr key={order.id} className="hover-row">
                                    <td>
                                        <div className="order-id">
                                            <span className="ot-text" style={{ fontWeight: 800, color: '#ff9800', fontSize: '0.95rem' }}>{order.ot || `OT-${order.id}`}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="status-badge" style={{
                                            backgroundColor: statusColors[order.status],
                                            boxShadow: `0 0 8px ${statusColors[order.status]}40`
                                        }}>
                                            {statusLabels[order.status]}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="client-cell">
                                            <span className="font-medium">{order.clienteNombre}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            <span className="material-tag-sm">{order.material}</span>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    fontSize: '9px',
                                                    padding: '1px 5px',
                                                    borderRadius: '3px',
                                                    backgroundColor: (order.maquinaId === 2 || (order.ancho && Number(order.ancho) > 1.60)) ? '#0284c7' : '#166534',
                                                    color: '#fff',
                                                    fontWeight: 700
                                                }}>
                                                    {(order.maquinaId === 2 || (order.ancho && Number(order.ancho) > 1.60)) ? 'SolJet 1.9m' : 'RS-640 1.6m'}
                                                </span>
                                                {order.corte && (
                                                    <span style={{
                                                        fontSize: '9px',
                                                        padding: '1px 5px',
                                                        borderRadius: '3px',
                                                        backgroundColor: order.corte.estado === 'cortado' ? '#059669' : '#0369a1',
                                                        color: '#fff',
                                                        fontWeight: 700
                                                    }}>
                                                        📐 {order.corte.tipo === 'medio' ? 'Medio Corte' : 'Corte Completo'}{order.corte.estado === 'cortado' ? ' ✓' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {(() => {
                                            const rawW = Number(order.ancho) || 0;
                                            const rawH = Number(order.alto) || 0;
                                            const realW = rawW > 20 ? rawW / 100 : rawW;
                                            const realH = rawH > 20 ? rawH / 100 : rawH;
                                            return <span className="dims-text">{realW.toFixed(2)} x {realH.toFixed(2)} m</span>;
                                        })()}
                                    </td>
                                    <td>
                                        <span className="copies-badge">{order.copias}</span>
                                    </td>
                                    <td>
                                        {(() => {
                                            const rawW = Number(order.ancho) || 0;
                                            const rawH = Number(order.alto) || 0;
                                            const realW = rawW > 20 ? rawW / 100 : rawW;
                                            const realH = rawH > 20 ? rawH / 100 : rawH;
                                            const c = Number(order.copias) || 1;
                                            const m2 = realW * realH * c;
                                            return (
                                                <span className="m2-text font-mono text-muted">
                                                    {m2.toFixed(2)}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td>
                                        {order.demasiasConfig && Object.values(order.demasiasConfig).some(v => v === true) ? (
                                            <div className="demasia-indicator-group">
                                                <span className="demasia-arrows">
                                                    {order.demasiasConfig.top ? '↑' : ''}
                                                    {order.demasiasConfig.bottom ? '↓' : ''}
                                                    {order.demasiasConfig.left ? '←' : ''}
                                                    {order.demasiasConfig.right ? '→' : ''}
                                                </span>
                                                <span className="demasia-target">🎯</span>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="order-actions-row">
                                            {activeTab === 'cola' ? (
                                                <>
                                                    <button
                                                        className="btn-icon-action"
                                                        title={`Archivos (${order.archivos?.length || 0})`}
                                                        onClick={() => setViewingOrder(order)}
                                                    >
                                                        📄
                                                    </button>
                                                    <button
                                                        className="btn-icon-action"
                                                        title={order.archivos?.length ? `Descargar archivo(s) (${order.archivos.length})` : 'Sin archivos adjuntos'}
                                                        disabled={!order.archivos?.length}
                                                        onClick={() => downloadSingleOrderFiles(order)}
                                                        style={{
                                                            color: order.archivos?.length ? '#10b981' : 'var(--text-muted)',
                                                            opacity: order.archivos?.length ? 1 : 0.4,
                                                            cursor: order.archivos?.length ? 'pointer' : 'not-allowed'
                                                        }}
                                                    >
                                                        📥
                                                    </button>
                                                    <button
                                                        className="btn-icon-action"
                                                        onClick={() => handleBounce(order)}
                                                        title="Rebotar a Diseño (Error)"
                                                        style={{ color: 'var(--destructive)' }}
                                                    >
                                                        🚫
                                                    </button>
                                                    <button
                                                        className="btn-icon-action"
                                                        onClick={() => handleMarkAsPrinted(order)}
                                                        title="Marcar como Impreso"
                                                        style={{ color: 'var(--success)' }}
                                                    >
                                                        🖨️
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    className="btn-icon-action"
                                                    onClick={() => handleRevert(order)}
                                                    title="Devolver a Cola (Deshacer)"
                                                    style={{ color: 'var(--accent)' }}
                                                >
                                                    ↩️
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* File Viewer Modal */}
            {viewingOrder && (
                <SharedFileViewerModal
                    isOpen={!!viewingOrder}
                    onClose={() => setViewingOrder(null)}
                    order={viewingOrder}
                    showStandardize={true}
                    onUpdate={() => {
                        loadOrders()
                        setViewingOrder(null)
                    }}
                />
            )}

            {/* Modal Telemetría Roland VersaWorks */}
            {selectedPrinterTelemetry && (
                <div className="telemetry-modal-overlay" onClick={() => setSelectedPrinterTelemetry(null)}>
                    <div className="telemetry-modal animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="telemetry-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                                    Telemetría en Vivo — {selectedPrinterTelemetry.machine_name}
                                </h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {selectedPrinterTelemetry.is_online ? '🟢 Conectado a LuXius Cloud vía Xignux Monitor' : '⚪ Desconectado / Sin señal reciente de la PC de impresora'}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedPrinterTelemetry(null)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="telemetry-body">
                            {selectedPrinterTelemetry.current_job && (
                                <div className="telemetry-event-card" style={{ borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.08)' }}>
                                    <div className="telemetry-event-header">
                                        <span style={{ color: '#10b981', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
                                            ⚡ Imprimiendo en este momento
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{selectedPrinterTelemetry.current_job.time_str}</span>
                                    </div>
                                    <div className="telemetry-event-job">{selectedPrinterTelemetry.current_job.job_name}</div>
                                    <div className="telemetry-stats-row">
                                        <span>📐 Medidas: {selectedPrinterTelemetry.current_job.size_str}</span>
                                        <span>⚡ Velocidad: {selectedPrinterTelemetry.current_job.speed_str || 'Calculando...'}</span>
                                    </div>
                                </div>
                            )}

                            <h4 style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#cbd5e1' }}>Últimos Trabajos Registrados en VersaWorks:</h4>
                            {(!selectedPrinterTelemetry.recent_events || selectedPrinterTelemetry.recent_events.length === 0) ? (
                                <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', padding: '12px 0' }}>
                                    No hay eventos registrados recientemente. Inicie el monitor en la PC de la impresora para comenzar la sincronización en vivo.
                                </p>
                            ) : (
                                selectedPrinterTelemetry.recent_events.map((ev, idx) => (
                                    <div key={idx} className="telemetry-event-card">
                                        <div className="telemetry-event-header">
                                            <span className="telemetry-event-job">{ev.job_name}</span>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                                            </span>
                                        </div>
                                        <div className="telemetry-stats-row">
                                            <span>📐 {ev.size_str}</span>
                                            {ev.time_str && <span>⏱️ {ev.time_str}</span>}
                                            {ev.speed_str && <span>🚀 {ev.speed_str}</span>}
                                            {ev.ink_ml && (
                                                <span style={{ color: '#38bdf8' }} dangerouslySetInnerHTML={{ __html: `💧 ${ev.ink_ml}` }} />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

