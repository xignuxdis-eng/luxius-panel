import React, { useState, useMemo } from 'react'
import { Order, Cliente } from '@/types'
import {
    PackageCheck,
    Truck,
    Scissors,
    Send,
    Search,
    CheckCircle2,
    Clock,
    PhoneCall,
    Sparkles
} from 'lucide-react'

interface MobileDespachoTabProps {
    orders: Order[]
    clientes: Cliente[]
    onSaveOrder: (order: Partial<Order>) => Promise<Order>
}

export const MobileDespachoTab: React.FC<MobileDespachoTabProps> = ({
    orders,
    clientes,
    onSaveOrder
}) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [subTab, setSubTab] = useState<'para_refilar' | 'listos_retirar' | 'entregados'>('para_refilar')

    // Filter orders by delivery flow
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch =
                (o.clienteNombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.ot || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.nombreTarea || '').toLowerCase().includes(searchTerm.toLowerCase())

            if (!matchesSearch) return false

            if (subTab === 'para_refilar') {
                return o.status === 'impreso' || o.status === 'post'
            }
            if (subTab === 'listos_retirar') {
                return o.status === 'completo'
            }
            if (subTab === 'entregados') {
                return o.status === 'entregado' || o.status === 'finalizado'
            }
            return true
        })
    }, [orders, searchTerm, subTab])

    const counts = useMemo(() => {
        return {
            para_refilar: orders.filter(o => o.status === 'impreso' || o.status === 'post').length,
            listos_retirar: orders.filter(o => o.status === 'completo').length,
            entregados: orders.filter(o => o.status === 'entregado').length,
        }
    }, [orders])

    // Update to 'completo' (Listo para Retirar)
    const handleSetReady = async (order: Order) => {
        try {
            await onSaveOrder({
                id: order.id,
                ot: order.ot,
                status: 'completo',
                observaciones: `${order.observaciones || ''}\n[Terminado y refilado en taller. Listo para entrega]`.trim()
            })
        } catch (err) {
            console.error('Error updating to completo:', err)
        }
    }

    // Update to 'entregado'
    const handleSetDelivered = async (order: Order) => {
        try {
            await onSaveOrder({
                id: order.id,
                ot: order.ot,
                status: 'entregado',
                observaciones: `${order.observaciones || ''}\n[Entregado al cliente el ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}]`.trim()
            })
            alert(`Orden ${order.ot || order.id} registrada como entregada.`)
        } catch (err) {
            console.error('Error updating to entregado:', err)
        }
    }

    // 1-Tap WhatsApp "Listo para retirar"
    const handleSendReadyNotification = (order: Order) => {
        const cliente = clientes.find(c => String(c.id) === String(order.clientId))
        const phone = (cliente?.celular || cliente?.telefono || '').replace(/[^0-9]/g, '')
        const saldo = Number(order.saldoPendiente || 0)

        const msg = `*LuXius / XignuX - Pedido Listo para Retirar*\n\n` +
            `¡Hola ${order.clienteNombre}! Tu trabajo ya está impreso, confeccionado y *listo para retirar* en el taller:\n\n` +
            `📋 *Orden:* #${order.ot || order.id}\n` +
            `📦 *Detalle:* ${order.nombreTarea || order.material} (${order.ancho}x${order.alto}m)\n` +
            (saldo > 0 ? `💰 *Saldo restante a abonar:* $${saldo.toLocaleString('es-AR')}\n` : `✅ *Abonado Total*\n`) +
            `\n📍 Te esperamos de Lunes a Viernes de 9 a 18 hs. ¡Muchas gracias!`

        const targetUrl = phone
            ? `https://wa.me/${phone.startsWith('54') ? phone : '549' + phone}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`

        window.open(targetUrl, '_blank')
    }

    return (
        <div className="mobile-tab-content delivery-theme">
            {/* Header Banner */}
            <div className="delivery-hero-banner">
                <div className="hero-text">
                    <div className="pill-tag">
                        <PackageCheck size={14} />
                        <span>Módulo Refilado & Entrega</span>
                    </div>
                    <h2>Despacho y Retiro</h2>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="delivery-subtabs-row">
                <button
                    className={`delivery-subtab ${subTab === 'para_refilar' ? 'active' : ''}`}
                    onClick={() => setSubTab('para_refilar')}
                >
                    <Scissors size={15} />
                    <span>Por Refilar ({counts.para_refilar})</span>
                </button>
                <button
                    className={`delivery-subtab ${subTab === 'listos_retirar' ? 'active' : ''}`}
                    onClick={() => setSubTab('listos_retirar')}
                >
                    <CheckCircle2 size={15} />
                    <span>Listos ({counts.listos_retirar})</span>
                </button>
                <button
                    className={`delivery-subtab ${subTab === 'entregados' ? 'active' : ''}`}
                    onClick={() => setSubTab('entregados')}
                >
                    <Truck size={15} />
                    <span>Entregados</span>
                </button>
            </div>

            {/* Quick Search */}
            <div className="delivery-search-bar">
                <Search size={16} color="var(--text-muted)" />
                <input
                    type="text"
                    placeholder="Buscar OT o cliente..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Orders Feed */}
            <div className="delivery-orders-list">
                {filteredOrders.length === 0 ? (
                    <div className="workshop-empty-state">
                        <PackageCheck size={48} color="#475569" />
                        <h3>¡Sin órdenes en esta etapa!</h3>
                        <p>No se encontraron trabajos para el filtro seleccionado.</p>
                    </div>
                ) : (
                    filteredOrders.map(o => {
                        const saldo = Number(o.saldoPendiente || 0)

                        return (
                            <div key={o.id} className="delivery-order-card">
                                <div className="delivery-card-header">
                                    <span className="delivery-ot-title">{o.ot || `OT-${o.id}`}</span>
                                    <span className={`status-pill status-${o.status}`}>
                                        {o.status === 'impreso' ? 'Impreso (Falta Refilar)' : o.status === 'completo' ? 'Listo en Taller' : o.status}
                                    </span>
                                </div>

                                <div className="delivery-card-client">{o.clienteNombre}</div>
                                <div className="delivery-card-task">{o.nombreTarea || o.material}</div>
                                <div className="delivery-card-details">
                                    {o.ancho}x{o.alto} m · {o.copias || 1} copias · {o.material}
                                </div>

                                {saldo > 0 && (
                                    <div className="delivery-debt-notice">
                                        ⚠️ Saldo pendiente a cobrar al entregar: <strong>${saldo.toLocaleString('es-AR')}</strong>
                                    </div>
                                )}

                                {/* Delivery Actions */}
                                <div className="delivery-actions-grid">
                                    {subTab === 'para_refilar' && (
                                        <button
                                            type="button"
                                            className="mobile-btn delivery-primary-btn"
                                            onClick={() => handleSetReady(o)}
                                        >
                                            <Scissors size={16} />
                                            <span>✔ Refilado Terminado</span>
                                        </button>
                                    )}

                                    {subTab === 'listos_retirar' && (
                                        <>
                                            <button
                                                type="button"
                                                className="mobile-btn whatsapp-cta-btn"
                                                onClick={() => handleSendReadyNotification(o)}
                                            >
                                                <Send size={16} />
                                                <span>Avisar x WhatsApp</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="mobile-btn delivery-primary-btn"
                                                onClick={() => handleSetDelivered(o)}
                                            >
                                                <Truck size={16} />
                                                <span>Marcar Entregado</span>
                                            </button>
                                        </>
                                    )}

                                    {subTab === 'entregados' && (
                                        <div className="delivered-badge">
                                            <CheckCircle2 size={16} color="#10b981" />
                                            <span>Entregado</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
