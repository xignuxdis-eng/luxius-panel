import React, { useState, useMemo } from 'react'
import { Order, Cliente } from '@/types'
import { deductStockForOrder } from '@data/db'
import {
    PackageCheck,
    Truck,
    Scissors,
    Send,
    Search,
    CheckCircle2,
    PhoneCall,
    QrCode,
    Archive,
    Check,
    AlertCircle
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
    const [subTab, setSubTab] = useState<'para_refilar' | 'listos_retirar' | 'entregados'>('listos_retirar')

    // Filter orders by delivery flow
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch =
                (o.clienteNombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.ot || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.nombreTarea || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.material || '').toLowerCase().includes(searchTerm.toLowerCase())

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
            entregados: orders.filter(o => o.status === 'entregado' || o.status === 'finalizado').length,
        }
    }, [orders])

    // Update to 'completo' (Listo para Retirar)
    const handleSetReady = async (order: Order) => {
        try {
            await onSaveOrder({
                id: order.id,
                ot: order.ot,
                status: 'completo',
                observaciones: `${order.observaciones || ''}\n[Terminado y refilado en taller. Listo para retiro en estantería]`.trim()
            })
        } catch (err) {
            console.error('Error updating to completo:', err)
        }
    }

    // Update to 'entregado'
    const handleSetDelivered = async (order: Order) => {
        try {
            let stockDescontado = order.stockDescontado || false
            if (!stockDescontado) {
                stockDescontado = deductStockForOrder(order, 'entregado')
            }

            await onSaveOrder({
                id: order.id,
                ot: order.ot,
                status: 'entregado',
                stockDescontado,
                observaciones: `${order.observaciones || ''}\n[Entregado al cliente el ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}]`.trim()
            })
            alert(`¡Orden ${order.ot || order.id} registrada como entregada!`)
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
            `¡Hola ${order.clienteNombre}! 👋 Tu trabajo ya está terminado, confeccionado y *listo para retirar* en el taller:\n\n` +
            `📋 *Orden:* #${order.ot || order.id}\n` +
            `📦 *Detalle:* ${order.nombreTarea || order.material} (${order.ancho}x${order.alto}m)\n` +
            (saldo > 0 ? `💰 *Saldo pendiente a abonar al retirar:* $${saldo.toLocaleString('es-AR')}\n` : `✅ *Abonado Total*\n`) +
            `\n📍 Te esperamos en el taller de Lunes a Viernes de 9 a 18 hs. ¡Muchas gracias!`

        const targetUrl = phone
            ? `https://wa.me/${phone.startsWith('54') ? phone : '549' + phone}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`

        window.open(targetUrl, '_blank')
    }

    return (
        <div className="mobile-tab-content delivery-theme">
            {/* Quick Telemetry & Scanner Search Row (Stitch Style) */}
            <div className="stitch-dispatch-bar">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4cd7f6', display: 'inline-block' }}></span>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 800, color: '#4cd7f6' }}>
                            Despacho & Logística
                        </span>
                    </div>
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#869397',
                        textTransform: 'uppercase'
                    }}>
                        Flota Activa
                    </span>
                </div>

                {/* Search Bar + Scanner Icon */}
                <div className="stitch-search-row">
                    <div className="stitch-search-input-wrap">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Buscar OT, cliente, estantería..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className="stitch-qr-scan-btn"
                        title="Escanear remito o QR"
                        onClick={() => alert('Escáner de código de barras / QR de remito activado')}
                    >
                        <QrCode size={20} />
                    </button>
                </div>
            </div>

            {/* Operational Metric Ticker (Stitch 3-Col KPI Grid) */}
            <div className="stitch-metric-ticker">
                <div className="stitch-ticker-col">
                    <span className="ticker-lbl">Tiempo Taller</span>
                    <span className="ticker-val">3h 15m</span>
                    <span className="ticker-sub">Promedio actual</span>
                </div>
                <div className="stitch-ticker-col">
                    <span className="ticker-lbl">Por Entregar</span>
                    <span className="ticker-val" style={{ color: '#ffb95f' }}>
                        {counts.listos_retirar} OTs
                    </span>
                    <span className="ticker-sub">En estantería</span>
                </div>
                <div className="stitch-ticker-col">
                    <span className="ticker-lbl">Entregadas</span>
                    <span className="ticker-val" style={{ color: '#34d399' }}>
                        {counts.entregados} OTs
                    </span>
                    <span className="ticker-sub">Hoy finalizadas</span>
                </div>
            </div>

            {/* 3-Phase Stepper Pipeline (Google Stitch 3-Step Segments) */}
            <div className="stitch-pipeline-steps">
                <button
                    type="button"
                    className={`stitch-step-btn ${subTab === 'para_refilar' ? 'active' : ''}`}
                    onClick={() => setSubTab('para_refilar')}
                >
                    <Scissors size={15} />
                    <span>Refilar ({counts.para_refilar})</span>
                </button>
                <button
                    type="button"
                    className={`stitch-step-btn ${subTab === 'listos_retirar' ? 'active' : ''}`}
                    onClick={() => setSubTab('listos_retirar')}
                    style={subTab === 'listos_retirar' ? {
                        background: 'var(--stitch-primary-container)',
                        color: '#003640',
                        boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)'
                    } : {}}
                >
                    <PackageCheck size={15} />
                    <span>Retiro ({counts.listos_retirar})</span>
                </button>
                <button
                    type="button"
                    className={`stitch-step-btn ${subTab === 'entregados' ? 'active' : ''}`}
                    onClick={() => setSubTab('entregados')}
                >
                    <Truck size={15} />
                    <span>Entregados ({counts.entregados})</span>
                </button>
            </div>

            {/* Dispatch Cards Feed */}
            <div className="delivery-orders-list">
                {filteredOrders.length === 0 ? (
                    <div className="workshop-empty-state" style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        background: 'var(--stitch-surface-container)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <PackageCheck size={48} color="#4cd7f6" style={{ margin: '0 auto 12px' }} />
                        <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#dfe2f1', fontSize: '18px' }}>
                            ¡Sin órdenes en esta etapa!
                        </h3>
                        <p style={{ color: '#869397', fontSize: '13px' }}>
                            No hay trabajos en el pipeline de despacho para este filtro.
                        </p>
                    </div>
                ) : (
                    filteredOrders.map(o => {
                        const cliente = clientes.find(c => String(c.id) === String(o.clientId))
                        const phone = cliente?.celular || cliente?.telefono || ''
                        const saldo = Number(o.saldoPendiente || 0)
                        const shelfId = `Estantería ${(o.id % 6) + 1}-${String.fromCharCode(65 + (o.id % 4))}`

                        return (
                            <div key={o.id} className="stitch-dispatch-card">
                                {/* Top Row */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                fontFamily: 'JetBrains Mono, monospace',
                                                fontSize: '13px',
                                                fontWeight: 800,
                                                color: '#4cd7f6'
                                            }}>
                                                {o.ot || `OT #${o.id}`}
                                            </span>
                                            {o.emergencia && (
                                                <span style={{
                                                    fontSize: '9px',
                                                    fontFamily: 'JetBrains Mono, monospace',
                                                    background: 'rgba(239, 68, 68, 0.2)',
                                                    color: '#f87171',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: 700
                                                }}>
                                                    URGENTE
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                                            {o.clienteNombre}
                                        </div>
                                    </div>

                                    {/* Shelf or Mesa Location Badge */}
                                    <span className="stitch-shelf-badge">
                                        {subTab === 'para_refilar' ? (
                                            <>
                                                <Scissors size={12} /> Mesa de Corte 1
                                            </>
                                        ) : subTab === 'listos_retirar' ? (
                                            <>
                                                <Archive size={12} /> {shelfId}
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={12} /> Finalizado
                                            </>
                                        )}
                                    </span>
                                </div>

                                {/* Specs Box */}
                                <div className="stitch-dispatch-specs">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#869397' }}>
                                        <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>Pieza & Medidas</span>
                                        <span style={{ color: '#4cd7f6', fontWeight: 700 }}>
                                            {o.copias || 1} {Number(o.copias || 1) > 1 ? 'copias' : 'copia'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#dfe2f1' }}>
                                        {o.nombreTarea || o.material} ({o.ancho} × {o.alto} m)
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                        <span style={{
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: '#869397'
                                        }}>
                                            {o.material}
                                        </span>
                                        <span style={{
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: '#869397'
                                        }}>
                                            {o.envio === 'flete' ? 'Envío a Domicilio' : 'Retiro en Taller'}
                                        </span>
                                    </div>
                                </div>

                                {/* Financial notice if pending */}
                                {saldo > 0 && subTab !== 'entregados' && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        background: 'rgba(238, 152, 0, 0.12)',
                                        border: '1px solid rgba(238, 152, 0, 0.25)',
                                        fontSize: '11px',
                                        color: '#ffb95f'
                                    }}>
                                        <AlertCircle size={14} />
                                        <span>Cobrar al entregar: <strong>${saldo.toLocaleString('es-AR')}</strong></span>
                                    </div>
                                )}

                                {/* Action Buttons depending on phase */}
                                {subTab === 'para_refilar' && (
                                    <button
                                        type="button"
                                        className="stitch-btn-approve"
                                        onClick={() => handleSetReady(o)}
                                    >
                                        <Check size={18} />
                                        <span>Refilado Completo ➔ Marcar Listo</span>
                                    </button>
                                )}

                                {subTab === 'listos_retirar' && (
                                    <>
                                        {/* Call + WhatsApp Notification Row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: phone ? '1fr 1fr' : '1fr', gap: '8px' }}>
                                            {phone && (
                                                <a
                                                    href={`tel:${phone}`}
                                                    style={{
                                                        height: '42px',
                                                        borderRadius: '10px',
                                                        background: 'var(--stitch-surface-high)',
                                                        color: '#dfe2f1',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        textDecoration: 'none'
                                                    }}
                                                >
                                                    <PhoneCall size={14} color="#4cd7f6" />
                                                    <span>Llamar</span>
                                                </a>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => handleSendReadyNotification(o)}
                                                style={{
                                                    height: '42px',
                                                    borderRadius: '10px',
                                                    background: 'rgba(6, 182, 212, 0.2)',
                                                    border: '1px solid rgba(6, 182, 212, 0.4)',
                                                    color: '#4cd7f6',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Send size={14} />
                                                <span>Avisar x WhatsApp</span>
                                            </button>
                                        </div>

                                        {/* Deliver Handover Execution Button */}
                                        <button
                                            type="button"
                                            className="stitch-btn-whatsapp-notify"
                                            style={{
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                color: '#fff',
                                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                                            }}
                                            onClick={() => handleSetDelivered(o)}
                                        >
                                            <CheckCircle2 size={18} />
                                            <span>Entregar OT al Cliente</span>
                                        </button>
                                    </>
                                )}

                                {subTab === 'entregados' && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        background: 'rgba(16, 185, 129, 0.12)',
                                        color: '#34d399',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        fontFamily: 'Outfit, sans-serif'
                                    }}>
                                        <CheckCircle2 size={16} />
                                        <span>Orden Entregada con Éxito</span>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
