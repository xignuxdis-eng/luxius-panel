import React, { useState, useMemo } from 'react'
import { Order, Cliente } from '@/types'
import {
    TrendingUp,
    Clock,
    CheckCircle,
    AlertTriangle,
    DollarSign,
    PhoneCall,
    Search,
    PlusCircle,
    Send,
    Filter,
    ArrowUpRight,
    Users
} from 'lucide-react'

interface MobileAdminTabProps {
    orders: Order[]
    clientes: Cliente[]
    onOpenQuickOrder: () => void
    onSaveOrder: (order: Partial<Order>) => Promise<Order>
}

export const MobileAdminTab: React.FC<MobileAdminTabProps> = ({
    orders,
    clientes,
    onOpenQuickOrder,
    onSaveOrder
}) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterSection, setFilterSection] = useState<'todos' | 'pendientes' | 'hoy'>('todos')

    // Today's date in YYYY-MM-DD
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

    // Metrics
    const metrics = useMemo(() => {
        let totalFacturadoHoy = 0
        let totalCobradoHoy = 0
        let totalDeudaPendiente = 0
        let enCola = 0
        let listos = 0

        orders.forEach(o => {
            const isToday = o.fechaCreacion?.startsWith(todayStr) || (o as any).createdAt?.startsWith(todayStr)
            if (isToday) {
                totalFacturadoHoy += Number(o.subtotal || o.total || 0)
                totalCobradoHoy += Number(o.senaMonto || o.sena || o.montoPagado || 0)
            }
            const saldo = Number(o.saldoPendiente || 0)
            if (saldo > 0 && o.status !== 'anulado' && o.status !== 'eliminado') {
                totalDeudaPendiente += saldo
            }
            if (o.status === 'orden') enCola++
            if (o.status === 'completo') listos++
        })

        return {
            totalFacturadoHoy,
            totalCobradoHoy,
            totalDeudaPendiente,
            enCola,
            listos,
            totalOrdersCount: orders.length
        }
    }, [orders, todayStr])

    // Orders with pending balance for 1-Tap WhatsApp debt collection
    const pendingBalanceOrders = useMemo(() => {
        return orders
            .filter(o => Number(o.saldoPendiente || 0) > 0 && o.status !== 'anulado' && o.status !== 'eliminado')
            .sort((a, b) => Number(b.saldoPendiente || 0) - Number(a.saldoPendiente || 0))
    }, [orders])

    // Filtered orders list
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch =
                (o.clienteNombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.ot || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.nombreTarea || '').toLowerCase().includes(searchTerm.toLowerCase())

            if (!matchesSearch) return false

            if (filterSection === 'pendientes') {
                return Number(o.saldoPendiente || 0) > 0
            }
            if (filterSection === 'hoy') {
                return o.fechaCreacion?.startsWith(todayStr) || (o as any).createdAt?.startsWith(todayStr)
            }
            return true
        })
    }, [orders, searchTerm, filterSection, todayStr])

    const handleSendDebtReminder = (order: Order) => {
        // Find client phone
        const cliente = clientes.find(c => String(c.id) === String(order.clientId))
        const phone = (cliente?.celular || cliente?.telefono || '').replace(/[^0-9]/g, '')
        const saldo = Number(order.saldoPendiente || 0).toLocaleString('es-AR')

        const msg = `*LuXius / XignuX - Notificación de Saldo*\n\n` +
            `¡Hola ${order.clienteNombre}! Esperamos que estés muy bien.\n` +
            `Te recordamos el saldo pendiente de *$${saldo}* de la orden *#${order.ot || order.id}* (${order.nombreTarea || order.material}).\n\n` +
            `Si ya realizaste la transferencia o necesitas nuestro CBU/Alias, por favor avísanos por este medio. ¡Muchas gracias!`

        const targetUrl = phone
            ? `https://wa.me/${phone.startsWith('54') ? phone : '549' + phone}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`

        window.open(targetUrl, '_blank')
    }

    return (
        <div className="mobile-tab-content">
            {/* Quick Hero Banner */}
            <div className="mobile-hero-banner">
                <div className="hero-text">
                    <h2>Panel Administrativo</h2>
                    <p>Caja del día, cobranzas y órdenes comerciales</p>
                </div>
                <button
                    className="hero-action-btn"
                    onClick={onOpenQuickOrder}
                    title="Crear orden express desde link de WhatsApp"
                >
                    <PlusCircle size={18} />
                    <span>+ Orden Link</span>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="kpi-cards-grid">
                <div className="mobile-kpi-card accent-emerald">
                    <div className="kpi-icon-row">
                        <TrendingUp size={18} color="#10b981" />
                        <span className="kpi-badge">Hoy</span>
                    </div>
                    <div className="kpi-number">${metrics.totalCobradoHoy.toLocaleString('es-AR')}</div>
                    <div className="kpi-label">Cobrado en Caja</div>
                </div>

                <div className="mobile-kpi-card accent-amber">
                    <div className="kpi-icon-row">
                        <AlertTriangle size={18} color="#f59e0b" />
                        <span className="kpi-badge">Por Cobrar</span>
                    </div>
                    <div className="kpi-number">${metrics.totalDeudaPendiente.toLocaleString('es-AR')}</div>
                    <div className="kpi-label">Saldos Clientes</div>
                </div>

                <div className="mobile-kpi-card accent-cyan">
                    <div className="kpi-icon-row">
                        <Clock size={18} color="#00e5ff" />
                        <span className="kpi-badge">Taller</span>
                    </div>
                    <div className="kpi-number">{metrics.enCola}</div>
                    <div className="kpi-label">En Cola Impresión</div>
                </div>

                <div className="mobile-kpi-card accent-purple">
                    <div className="kpi-icon-row">
                        <CheckCircle size={18} color="#a855f7" />
                        <span className="kpi-badge">Listo</span>
                    </div>
                    <div className="kpi-number">{metrics.listos}</div>
                    <div className="kpi-label">Listos para Despacho</div>
                </div>
            </div>

            {/* 1-TAP WHATSAPP DEBT COLLECTION SECTION */}
            {pendingBalanceOrders.length > 0 && (
                <div className="mobile-card-section">
                    <div className="section-title-row">
                        <div className="title-with-icon">
                            <PhoneCall size={18} color="#25d366" />
                            <h3>Cobranzas Express con WhatsApp</h3>
                        </div>
                        <span className="count-pill">{pendingBalanceOrders.length}</span>
                    </div>

                    <div className="pending-debts-scroll">
                        {pendingBalanceOrders.slice(0, 5).map(o => (
                            <div key={o.id} className="debt-item-card">
                                <div className="debt-card-header">
                                    <span className="debt-ot">{o.ot || `OT-${o.id}`}</span>
                                    <span className="debt-amount">${Number(o.saldoPendiente).toLocaleString('es-AR')}</span>
                                </div>
                                <div className="debt-client-name">{o.clienteNombre}</div>
                                <div className="debt-task-info">{o.nombreTarea || `${o.material} (${o.ancho}x${o.alto}m)`}</div>
                                <button
                                    className="whatsapp-debt-btn"
                                    onClick={() => handleSendDebtReminder(o)}
                                >
                                    <Send size={14} />
                                    <span>Cobrar por WhatsApp</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ORDERS FEED WITH SEARCH */}
            <div className="mobile-card-section">
                <div className="section-title-row">
                    <div className="title-with-icon">
                        <Filter size={18} color="#00e5ff" />
                        <h3>Órdenes Recientes</h3>
                    </div>
                </div>

                {/* Search & Filter pills */}
                <div className="search-filter-wrap">
                    <div className="search-input-box">
                        <Search size={16} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Buscar OT o cliente..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>✕</button>
                        )}
                    </div>

                    <div className="filter-pills-row">
                        <button
                            className={`filter-pill ${filterSection === 'todos' ? 'active' : ''}`}
                            onClick={() => setFilterSection('todos')}
                        >
                            Todos ({orders.length})
                        </button>
                        <button
                            className={`filter-pill ${filterSection === 'pendientes' ? 'active' : ''}`}
                            onClick={() => setFilterSection('pendientes')}
                        >
                            Con Saldo ({pendingBalanceOrders.length})
                        </button>
                        <button
                            className={`filter-pill ${filterSection === 'hoy' ? 'active' : ''}`}
                            onClick={() => setFilterSection('hoy')}
                        >
                            Hoy
                        </button>
                    </div>
                </div>

                {/* Orders List */}
                <div className="mobile-orders-list">
                    {filteredOrders.length === 0 ? (
                        <div className="empty-state-card">
                            <p>No se encontraron órdenes con este criterio.</p>
                        </div>
                    ) : (
                        filteredOrders.slice(0, 20).map(o => (
                            <div key={o.id} className="mobile-order-row">
                                <div className="order-left-col">
                                    <div className="order-ot-chip">{o.ot || `OT-${o.id}`}</div>
                                    <div className="order-client-bold">{o.clienteNombre}</div>
                                    <div className="order-task-muted">
                                        {o.material} · {o.ancho}x{o.alto}m · {o.copias} cop.
                                    </div>
                                </div>

                                <div className="order-right-col">
                                    <div className="order-price-val">
                                        ${Number(o.subtotal || o.total || 0).toLocaleString('es-AR')}
                                    </div>
                                    <span className={`status-badge-sm status-${o.status}`}>
                                        {o.status}
                                    </span>
                                    {Number(o.saldoPendiente || 0) > 0 && (
                                        <span className="debt-indicator-sm">
                                            Resta ${Number(o.saldoPendiente).toLocaleString('es-AR')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
