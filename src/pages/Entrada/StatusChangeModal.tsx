import Modal from '@components/ui/Modal'
import { statusColors, statusLabels, type OrderStatus } from '../../types/orden'
import type { Order } from '@/types'
import { saveOrden, getUsuarios, deleteOrden, saveBatchOrders } from '@data/db'
import { useState, useMemo } from 'react'
import { useAuthStore } from '@store/authStore'

interface StatusChangeModalProps {
    isOpen: boolean
    onClose: (updated?: boolean) => void
    order: Order | null
    batchOrders?: Order[]
}

const statusOptions = [
    { value: 'relevamiento', label: 'Relevamiento' },
    { value: 'diseno', label: 'Diseño' },
    { value: 'orden', label: 'Para Imprimir' },
    { value: 'impreso', label: 'Impreso' },
    { value: 'post', label: 'Terminaciones' },
    { value: 'completo', label: 'Para Entregar' },
    { value: 'entregado', label: 'Entregado' },
    { value: 'anulado', label: 'Anulado' }
]

export default function StatusChangeModal({ isOpen, onClose, order, batchOrders }: StatusChangeModalProps) {
    const [selectedArtistaId, setSelectedArtistaId] = useState<number | undefined>(order?.artistaId)
    const [selectedCategory, setSelectedCategory] = useState<'diseno' | 'impresion' | undefined>(order?.category)
    const [selectedFechaEntrega, setSelectedFechaEntrega] = useState<string>(order?.fechaEntrega || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    const { user } = useAuthStore()

    if (!order) return null

    const isBatch = Array.isArray(batchOrders) && batchOrders.length > 1
    const isAdmin = user?.role === 'principal' || (user?.role as string) === 'administrador' || (user?.role as string) === 'admin' || (user?.role as string) === 'sistema'
    const canBounce = user?.role === 'artista' || user?.role === 'impresion' || isAdmin

    const artistas = useMemo(() => {
        return getUsuarios().filter(u => u.rol === 'disenador' || u.rol === 'artista')
    }, [])

    const handleStatusChange = async (newStatus: string) => {
        try {
            if (isBatch && batchOrders) {
                const ids = batchOrders.map(o => (o as any).uuid || o.id || o.ot);
                await saveBatchOrders('update', ids, {
                    status: newStatus as any,
                    artistaId: selectedArtistaId,
                    category: selectedCategory,
                    fechaEntrega: selectedFechaEntrega
                });
            } else {
                await saveOrden({
                    ...order,
                    status: newStatus as any,
                    artistaId: selectedArtistaId,
                    category: selectedCategory,
                    fechaEntrega: selectedFechaEntrega
                });
            }
            onClose(true)
        } catch (e) {
            console.error('Error changing status:', e)
            alert('Error al actualizar el estado del pedido')
        }
    }

    const handleBounce = async () => {
        let targetStatus: OrderStatus = 'relevamiento'
        if (order.status === 'orden' || order.status === 'impreso' || order.status === 'post') {
            targetStatus = 'diseno'
        } else if (order.status === 'diseno') {
            targetStatus = 'relevamiento'
        }
        await handleStatusChange(targetStatus)
    }

    const handleDelete = async () => {
        try {
            if (isBatch && batchOrders) {
                const ids = batchOrders.map(o => (o as any).uuid || o.id || o.ot);
                await saveBatchOrders('delete', ids);
            } else {
                await deleteOrden((order as any).uuid || order.id)
            }
            onClose(true)
        } catch (e) {
            console.error('Error deleting order:', e)
            alert('Error al eliminar el pedido')
        }
    }

    const modalTitle = isBatch && batchOrders
        ? `Operaciones del Lote: ${batchOrders[0]?.loteNombre || 'Lote'} (${batchOrders.length} piezas)`
        : `Operaciones del Pedido - ${order.ot || `#${order.id}`}`;

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => onClose(false)}
            title={modalTitle}
            size="md"
        >
            {isBatch && batchOrders && (
                <div style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '16px',
                    fontSize: '0.85rem',
                    color: '#93c5fd',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>📦</span>
                    <span>Modificando simultáneamente las <strong>{batchOrders.length}</strong> órdenes agrupadas en este lote.</span>
                </div>
            )}

            <div className="modal-section">
                <h4>Cambiar Estado</h4>
                <div className="status-options-grid">
                    {statusOptions.map(option => (
                        <button
                            key={option.value}
                            className={`status-option-btn ${order.status === option.value ? 'active' : ''}`}
                            style={{
                                borderColor: statusColors[option.value as OrderStatus],
                                color: order.status === option.value ? 'white' : 'inherit',
                                backgroundColor: order.status === option.value ? statusColors[option.value as OrderStatus] : 'transparent'
                            } as any}
                            onClick={() => handleStatusChange(option.value)}
                        >
                            {statusLabels[option.value as OrderStatus] || option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="modal-section" style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <h4>Categoría</h4>
                        <select
                            className="input-field"
                            value={selectedCategory || ''}
                            onChange={(e) => setSelectedCategory(e.target.value as any)}
                        >
                            <option value="">Sin definir</option>
                            <option value="impresion">🖨️ Impresión</option>
                            <option value="diseno">🎨 Diseño</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4>Asignar Artista</h4>
                        <select
                            className="input-field"
                            value={selectedArtistaId || ''}
                            onChange={(e) => setSelectedArtistaId(Number(e.target.value) || undefined)}
                        >
                            <option value="">Sin asignar</option>
                            {artistas.map(u => (
                                <option key={u.id} value={u.id}>{u.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div style={{ marginTop: '15px' }}>
                    <h4>Fecha de Entrega Pactada</h4>
                    <input
                        type="date"
                        className="input-field"
                        value={selectedFechaEntrega}
                        onChange={(e) => setSelectedFechaEntrega(e.target.value)}
                    />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Las categorías ayudan a filtrar los pedidos en la entrada y asignar el flujo correcto.
                </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {isAdmin && (
                        <button
                            className="btn-op btn-delete"
                            onClick={handleDelete}
                        >
                            🗑️ Eliminar
                        </button>
                    )}
                    {canBounce && (
                        <button
                            className="btn-op btn-bounce"
                            onClick={handleBounce}
                        >
                            ↩️ Rebotar
                        </button>
                    )}
                </div>
                <button
                    className="btn-save"
                    onClick={() => handleStatusChange(order.status)}
                >
                    Guardar Cambios
                </button>
            </div>

            <style>{`
                .status-options-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    padding: 10px 0;
                }
                .status-option-btn {
                    padding: 10px;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--border);
                    background: var(--bg-input);
                    color: var(--text-primary);
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: center;
                }
                .status-option-btn:hover {
                    background: var(--status-color);
                    color: white;
                    border-color: transparent;
                }
                .status-option-btn.active {
                    background: var(--status-color);
                    color: white;
                    border-color: transparent;
                    box-shadow: 0 0 10px var(--status-color);
                }
                .btn-op {
                    padding: 8px 16px;
                    border-radius: var(--radius-md);
                    border: none;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                }
                .btn-delete {
                    background: #fee2e2;
                    color: #dc2626;
                }
                .btn-delete:hover {
                    background: #fecaca;
                }
                .btn-bounce {
                    background: #ffedd5;
                    color: #ea580c;
                }
                .btn-bounce:hover {
                    background: #fed7aa;
                }
            `}</style>
        </Modal>
    )
}
