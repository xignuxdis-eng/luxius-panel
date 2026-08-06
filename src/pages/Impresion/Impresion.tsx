import { useState, useEffect } from 'react'
import Header from '@components/layout/Header'
import { getMaquinas, getOrdenes, saveOrden } from '@data/db'
import { useAuthStore } from '@store/authStore'
import type { Order } from '@/types'
import { statusColors, statusLabels } from '@/types'
import SharedFileViewerModal from '@components/shared/SharedFileViewerModal'
import './Impresion.css'

export default function Impresion() {
    const { user } = useAuthStore()
    const [maquinas] = useState(() => getMaquinas())
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'cola' | 'historial'>('cola')
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null)

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
            if (user?.role === 'artista') {
                filtered = filtered.filter(o => o.artistaId === user.id)
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
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'impreso' } : o))

        try {
            await saveOrden({ id: order.id, status: 'impreso' })
            console.log(`Orden ${order.id} marcada como IMPRESA`)
        } catch (e) {
            console.error("Error updating status", e)
            alert("Error al actualizar estado")
            loadOrders()
        }
    }

    const handleRevert = async (order: Order) => {
        try {
            await saveOrden({ id: order.id, status: 'orden' })
            loadOrders()
        } catch (e) {
            console.error("Error reverting", e)
            alert("No se pudo revertir la acción")
        }
    }

    const handleBounce = async (order: Order) => {
        const reason = window.prompt("Ingrese el motivo del rebote (volverá a Diseño):", "Error en archivo") || "Rebotado a Diseño"

        try {
            await saveOrden({ id: order.id, status: 'preorden', comments: reason })
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
                subtitle={user?.role === 'artista' ? "Mis diseños en cola de impresión" : "Gestión de producción"}
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

            {user?.role !== 'artista' && (
                <div className="machines-status-bar">
                    {maquinas.map((m) => (
                        <div key={m.id} className="machine-badge animate-fade-in">
                            <span className={`status-indicator ${m.habilitada ? 'online' : 'offline'}`} />
                            <div className="machine-info">
                                <span className="m-name">{m.nombre}</span>
                                <span className="m-capacity">Ancho: {m.ancho}mm</span>
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
                                <th>Material</th>
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
                                        <span className="material-tag-sm">{order.material}</span>
                                    </td>
                                    <td>
                                        <span className="dims-text">{Number(order.ancho).toFixed(2)} x {Number(order.alto).toFixed(2)} m</span>
                                    </td>
                                    <td>
                                        <span className="copies-badge">{order.copias}</span>
                                    </td>
                                    <td>
                                        <span className="m2-text font-mono text-muted">
                                            {(Number(order.ancho) * Number(order.alto) * Number(order.copias)).toFixed(2)}
                                        </span>
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
        </div>
    )
}

