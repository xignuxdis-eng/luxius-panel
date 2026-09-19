import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@components/layout/Header'
import Button from '@components/ui/Button'
import { statusColors, statusLabels } from '@/types'
import { getOrdenes, resolveMediaUrl } from '@data/db'

import NuevoPedidoModal from '../Entrada/NuevoPedidoModal'
import StatusChangeModal from '../Entrada/StatusChangeModal'
import SharedFileViewerModal from '@components/shared/SharedFileViewerModal'
import type { Order } from '@/types'
import './Diseno.css'

export default function Diseno() {
    const navigate = useNavigate()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)

    const [editingOrder, setEditingOrder] = useState<Order | null>(null)
    const [statusOrder, setStatusOrder] = useState<Order | null>(null)
    const [previewOrder, setPreviewOrder] = useState<Order | null>(null)

    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    // Load all orders but filter for Design relevant ones
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    const loadOrders = async () => {
        try {
            setLoading(true)
            const data = await getOrdenes()
            setOrders(data)
        } catch (error) {
            console.error("Failed to load orders", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOrders()
    }, [])

    const filteredOrders = orders.filter(order => {
        // Core filter for Artist View (V2)
        const isRelevant = ['preorden', 'diseno', 'rebotado'].includes(order.status) || order.category === 'diseno';
        if (!isRelevant) return false

        const matchesSearch =
            (order.clienteNombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (order.ot?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (order.id?.toString() || '').includes(searchTerm);

        const matchesStatus = statusFilter === '' || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    })

    const handleOpenStatusModal = (order: Order) => {
        setStatusOrder(order)
        setIsStatusModalOpen(true)
    }

    const handleOpenPreview = (order: Order) => {
        setPreviewOrder(order)
        setIsPreviewModalOpen(true)
    }

    const handleEditOrder = (order: Order) => {
        setEditingOrder(order)
        setIsModalOpen(true)
    }

    const handleAddOrder = () => {
        setEditingOrder(null)
        // Default status 'preorden' implies it's ready for checking/authorization in design
        setIsModalOpen(true)
    }

    const refreshOrders = () => {
        loadOrders()
    }

    return (
        <div className="diseno-page">
            <Header title="Artista" subtitle="Cola de trabajos y gestión de previews" />

            {/* Quick Studio Bar for Artist */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '10px',
                padding: '12px 18px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.8rem' }}>👁️</span>
                    <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Xpress Studio & Vectorizador AI
                            <span style={{ fontSize: '0.7rem', background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>ROL ARTISTA</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                            Visor HD de archivos pesados, calibrador de demasías/sangrado, paleta de colores CMYK y vectorizador ImageTracer.
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => navigate('/xpress-viewer')}
                        style={{
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '7px 14px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                        }}
                    >
                        👁️ Abrir Visor HD
                    </button>
                    <button
                        onClick={() => navigate('/xpress-viewer?tab=redrawer')}
                        style={{
                            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '7px 14px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
                        }}
                    >
                        ✨ Redrawer Studio
                    </button>
                </div>
            </div>

            <div className="filters-bar">
                <div className="filter-group">
                    <input
                        className="input-field"
                        type="text"
                        placeholder="Buscar por Cliente, OT, ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="input-field"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        title="Filtrar por Estado"
                    >
                        <option value="">Todos los Estados</option>
                        <option value="orden">Pendiente (Orden)</option>
                        <option value="diseno">En Diseño</option>
                        <option value="previa">En Previa</option>
                    </select>
                </div>
                <div className="filter-actions">
                    <span className="results-count">{filteredOrders.length} trabajos</span>
                    <Button variant="ghost" onClick={() => { setSearchTerm(''); setStatusFilter('') }}>Limpiar</Button>
                    <Button variant="primary" onClick={handleAddOrder}>+ Nuevo Trabajo</Button>
                </div>
            </div>

            <div className="orders-table-container">
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Cargando trabajos...</div>
                ) : filteredOrders.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No hay trabajos en diseño.</div>
                ) : (
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>OT / ID</th>
                                <th>Estado</th>
                                <th>Cliente</th>
                                <th>Trabajo</th>
                                <th>Archivos</th>
                                <th>Demasías</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="fade-in">
                                    <td>
                                        <span className="ot-badge">{order.ot || `OT-${order.id}`}</span>
                                        <div className="text-xs text-muted" style={{ marginTop: '4px' }}>#{order.id}</div>
                                    </td>
                                    <td>
                                        <span
                                            className="status-badge"
                                            style={{
                                                backgroundColor: statusColors[order.status] || '#ccc',
                                                color: '#fff'
                                            }}
                                            onClick={() => handleOpenStatusModal(order)}
                                        >
                                            {statusLabels[order.status] || order.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="font-medium">{order.clienteNombre}</div>
                                    </td>
                                    <td>
                                        <div>{order.material}</div>
                                        <div className="text-xs text-muted">
                                            {Number(order.ancho).toFixed(2)} x {Number(order.alto).toFixed(2)} m | {order.copias > 1 ? `${order.copias} copias` : '1 copia'}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <button
                                                className="file-preview-btn"
                                                onClick={() => handleOpenPreview(order)}
                                                style={{
                                                    border: '1px solid #333',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    background: '#1a1a1a',
                                                    color: '#ccc',
                                                    fontSize: '0.8rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {order.archivos && order.archivos.length > 0 ? '📄 Ver Archivos' : '⚠️ Sin Archivos'}
                                            </button>
                                            {order.archivos && order.archivos.length > 0 && (
                                                <button
                                                    onClick={() => {
                                                        const firstFile = order.archivos![0]
                                                        const url = resolveMediaUrl(firstFile)
                                                        const name = order.archivosOriginales?.[0] || firstFile.split('/').pop()?.split('?')[0] || 'arte'
                                                        navigate(`/xpress-viewer?fileUrl=${encodeURIComponent(url)}&fileName=${encodeURIComponent(name)}`)
                                                    }}
                                                    title="Inspeccionar directamente en Xpress Studio (DPI, medidas, demasías, vectorizar)"
                                                    style={{
                                                        border: '1px solid #0284c7',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        background: 'rgba(2, 132, 199, 0.15)',
                                                        color: '#38bdf8',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    👁️ Xpress
                                                </button>
                                            )}
                                        </div>
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
                                        <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleEditOrder(order)}
                                            >
                                                Editar
                                            </Button>
                                            {order.status === 'preorden' && (
                                                <Button
                                                    size="sm"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                                                        border: 'none',
                                                        color: 'white',
                                                        fontWeight: 600
                                                    }}
                                                    onClick={() => handleOpenStatusModal(order)}
                                                >
                                                    Pasar a Impresión ➔
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODALS */}
            {isModalOpen && (
                <NuevoPedidoModal
                    isOpen={isModalOpen}
                    order={editingOrder}
                    defaultStatus="preorden" // Force 'preorden' for new orders from Artist
                    onClose={(created) => {
                        setIsModalOpen(false)
                        setEditingOrder(null)
                        if (created) refreshOrders()
                    }}
                />
            )}

            {isStatusModalOpen && statusOrder && (
                <StatusChangeModal
                    isOpen={isStatusModalOpen}
                    order={statusOrder}
                    onClose={(updated) => {
                        setIsStatusModalOpen(false)
                        setStatusOrder(null)
                        if (updated) refreshOrders()
                    }}
                />
            )}

            {isPreviewModalOpen && previewOrder && (
                <SharedFileViewerModal
                    isOpen={isPreviewModalOpen}
                    order={previewOrder}
                    onClose={() => {
                        setIsPreviewModalOpen(false)
                        setPreviewOrder(null)
                    }}
                    onUpdate={refreshOrders}
                />
            )}
        </div>
    )
}
