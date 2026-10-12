import React, { useState, useMemo } from 'react'
import { Order, Cliente } from '@/types'
import { BOUNCE_REASONS, WhatsAppBounceReason } from '../types'
import {
    Palette,
    CheckSquare,
    AlertOctagon,
    ExternalLink,
    Send,
    ThumbsUp,
    FileCheck,
    MessageCircle,
    Info
} from 'lucide-react'

interface MobileDisenoTabProps {
    orders: Order[]
    clientes: Cliente[]
    onSaveOrder: (order: Partial<Order>) => Promise<Order>
}

export const MobileDisenoTab: React.FC<MobileDisenoTabProps> = ({
    orders,
    clientes,
    onSaveOrder
}) => {
    const [selectedOrderForBounce, setSelectedOrderForBounce] = useState<Order | null>(null)
    const [selectedReason, setSelectedReason] = useState<WhatsAppBounceReason>(BOUNCE_REASONS[0])
    const [customBounceNote, setCustomBounceNote] = useState('')
    const [activePreflightCheck, setActivePreflightCheck] = useState<Record<string, Record<string, boolean>>>({})

    // Orders requiring design / preflight
    const designOrders = useMemo(() => {
        return orders.filter(o => o.status === 'diseno' || o.status === 'relevamiento' || o.status === 'rebotado')
    }, [orders])

    const togglePreflightItem = (orderId: number, itemKey: string) => {
        setActivePreflightCheck(prev => ({
            ...prev,
            [orderId]: {
                ...(prev[orderId] || {}),
                [itemKey]: !(prev[orderId]?.[itemKey])
            }
        }))
    }

    // Approve order to print queue
    const handleApproveOrder = async (order: Order) => {
        try {
            await onSaveOrder({
                id: order.id,
                ot: order.ot,
                status: 'orden',
                observaciones: `${order.observaciones || ''}\n[Pre-flight Técnico APROBADO por Diseñador Móvil]`.trim()
            })
            alert(`¡Orden ${order.ot || order.id} aprobada y enviada a la cola de impresión!`)
        } catch (err) {
            console.error('Error approving order:', err)
        }
    }

    // Execute bounce and open WhatsApp
    const handleExecuteBounce = async () => {
        if (!selectedOrderForBounce) return

        const order = selectedOrderForBounce
        const cliente = clientes.find(c => String(c.id) === String(order.clientId))
        const phone = (cliente?.celular || cliente?.telefono || '').replace(/[^0-9]/g, '')

        const msg = `*LuXius / XignuX - Observación Técnica de Diseño*\n\n` +
            `¡Hola ${order.clienteNombre}! Estamos revisando el archivo enviado para la orden *#${order.ot || order.id}* (${order.nombreTarea || order.material}).\n\n` +
            `⚠️ *Motivo:* ${selectedReason.title}\n` +
            `📝 *Detalle:* ${selectedReason.description}\n` +
            `💡 *Sugerencia:* ${selectedReason.suggestedFix}\n` +
            (customBounceNote ? `\n💬 *Nota adicional del diseñador:* ${customBounceNote}\n` : '') +
            `\nPor favor, reenvíanos el archivo corregido para que podamos continuar con la producción. ¡Muchas gracias!`

        // Update status in system to 'rebotado'
        try {
            await onSaveOrder({
                id: order.id,
                ot: order.ot,
                status: 'rebotado',
                comments: `${selectedReason.title}: ${customBounceNote || selectedReason.description}`,
                observaciones: `${order.observaciones || ''}\n[Rebotado a cliente: ${selectedReason.title}]`.trim()
            })
        } catch (err) {
            console.error('Error updating order to rebotado:', err)
        }

        // Open WhatsApp
        const targetUrl = phone
            ? `https://wa.me/${phone.startsWith('54') ? phone : '549' + phone}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`

        window.open(targetUrl, '_blank')
        setSelectedOrderForBounce(null)
        setCustomBounceNote('')
    }

    return (
        <div className="mobile-tab-content design-theme">
            {/* Header Banner */}
            <div className="design-hero-banner">
                <div className="hero-text">
                    <div className="pill-tag">
                        <Palette size={14} />
                        <span>Pre-flight & Originales</span>
                    </div>
                    <h2>Revisión de Originales</h2>
                </div>
                <div className="counter-chip">
                    <span className="count-num">{designOrders.length}</span>
                    <span className="count-lbl">En Revisión</span>
                </div>
            </div>

            {/* Design Orders Feed */}
            <div className="design-orders-container">
                {designOrders.length === 0 ? (
                    <div className="workshop-empty-state">
                        <FileCheck size={48} color="#475569" />
                        <h3>¡Todos los archivos revisados!</h3>
                        <p>No hay originales pendientes de aprobación en la cola técnica.</p>
                    </div>
                ) : (
                    designOrders.map(o => {
                        const downloadUrl = (o.archivos && o.archivos[0]) || (o.archivosOriginales && o.archivosOriginales[0])
                        const checks = activePreflightCheck[o.id] || {}

                        return (
                            <div key={o.id} className="design-order-card">
                                <div className="design-card-header">
                                    <span className="design-ot-title">{o.ot || `OT-${o.id}`}</span>
                                    <span className={`status-pill status-${o.status}`}>
                                        {o.status === 'rebotado' ? 'Rebotado al Cliente' : 'Pendiente Revisión'}
                                    </span>
                                </div>

                                <div className="design-card-client">{o.clienteNombre}</div>
                                <div className="design-card-task">{o.nombreTarea || o.material}</div>
                                <div className="design-card-specs">
                                    {o.ancho}x{o.alto} m · {o.copias || 1} copias · {o.material}
                                </div>

                                {/* External File link */}
                                {downloadUrl && (
                                    <div className="original-file-box">
                                        <div className="file-info-col">
                                            <span className="file-lbl">Enlace al Original:</span>
                                            <span className="file-url-truncate">{downloadUrl}</span>
                                        </div>
                                        <a
                                            href={downloadUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="open-original-btn"
                                            title="Abrir WeTransfer / Drive"
                                        >
                                            <ExternalLink size={16} />
                                            <span>Abrir</span>
                                        </a>
                                    </div>
                                )}

                                {/* Interactive Pre-flight Checklist */}
                                <div className="preflight-checklist-box">
                                    <div className="checklist-title">Checklist Pre-flight</div>
                                    <div className="checklist-items-grid">
                                        <label className={`check-chip ${checks['cmyk'] ? 'checked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={!!checks['cmyk']}
                                                onChange={() => togglePreflightItem(o.id, 'cmyk')}
                                            />
                                            <span>Modo CMYK</span>
                                        </label>

                                        <label className={`check-chip ${checks['dpi'] ? 'checked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={!!checks['dpi']}
                                                onChange={() => togglePreflightItem(o.id, 'dpi')}
                                            />
                                            <span>DPI &gt;= 150</span>
                                        </label>

                                        <label className={`check-chip ${checks['curves'] ? 'checked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={!!checks['curves']}
                                                onChange={() => togglePreflightItem(o.id, 'curves')}
                                            />
                                            <span>Curvas OK</span>
                                        </label>

                                        <label className={`check-chip ${checks['bleed'] ? 'checked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={!!checks['bleed']}
                                                onChange={() => togglePreflightItem(o.id, 'bleed')}
                                            />
                                            <span>Demasía OK</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="design-actions-row">
                                    <button
                                        type="button"
                                        className="bounce-action-btn"
                                        onClick={() => setSelectedOrderForBounce(o)}
                                    >
                                        <AlertOctagon size={16} />
                                        <span>Rebotar x WhatsApp</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="approve-action-btn"
                                        onClick={() => handleApproveOrder(o)}
                                    >
                                        <ThumbsUp size={16} />
                                        <span>Aprobar p/ Impresión</span>
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Bounce Modal */}
            {selectedOrderForBounce && (
                <div className="mobile-modal-overlay">
                    <div className="mobile-modal-container">
                        <div className="mobile-modal-header">
                            <div className="modal-title-wrap">
                                <h3>Rebotar Original por WhatsApp</h3>
                                <p className="subtitle-sm">
                                    Orden #{selectedOrderForBounce.ot || selectedOrderForBounce.id} · {selectedOrderForBounce.clienteNombre}
                                </p>
                            </div>
                            <button className="mobile-modal-close" onClick={() => setSelectedOrderForBounce(null)}>✕</button>
                        </div>

                        <div className="mobile-modal-body">
                            <label className="field-lbl">Selecciona el Motivo del Rebote:</label>
                            <div className="bounce-reasons-list">
                                {BOUNCE_REASONS.map(r => (
                                    <div
                                        key={r.id}
                                        className={`bounce-reason-card ${selectedReason.id === r.id ? 'active' : ''}`}
                                        onClick={() => setSelectedReason(r)}
                                    >
                                        <div className="reason-title">{r.title}</div>
                                        <div className="reason-desc">{r.description}</div>
                                    </div>
                                ))}
                            </div>

                            <label className="field-lbl mt-3">Nota o Aclaración Adicional (Opcional):</label>
                            <textarea
                                className="mobile-textarea"
                                rows={2}
                                placeholder="Ej: Faltan 5cm de fondo arriba para confeccionar el bolsillo..."
                                value={customBounceNote}
                                onChange={e => setCustomBounceNote(e.target.value)}
                            />

                            <div className="mobile-modal-footer">
                                <button
                                    type="button"
                                    className="mobile-btn ghost-btn"
                                    onClick={() => setSelectedOrderForBounce(null)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="mobile-btn whatsapp-cta-btn"
                                    onClick={handleExecuteBounce}
                                >
                                    <Send size={16} />
                                    <span>Rebotar y Abrir WhatsApp</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
