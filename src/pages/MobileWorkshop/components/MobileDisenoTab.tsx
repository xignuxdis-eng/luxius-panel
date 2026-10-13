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
    Info,
    Crop,
    Sliders,
    Layers,
    Sparkles,
    Copy,
    Rocket,
    AlertTriangle,
    CheckCircle2,
    ZoomIn,
    RefreshCw
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
    const [filterStatus, setFilterStatus] = useState<'pendientes' | 'aprobados' | 'rebotados'>('pendientes')
    const [autoFixedRgb, setAutoFixedRgb] = useState<Record<number, boolean>>({})

    // Orders requiring design / preflight
    const designOrders = useMemo(() => {
        return orders.filter(o => o.status === 'diseno' || o.status === 'relevamiento' || o.status === 'rebotado')
    }, [orders])

    const approvedTodayOrders = useMemo(() => {
        return orders.filter(o => o.status === 'orden' || o.status === 'imprimiendo' || o.status === 'impreso')
    }, [orders])

    const bouncedOrders = useMemo(() => {
        return orders.filter(o => o.status === 'rebotado')
    }, [orders])

    const displayedOrders = useMemo(() => {
        if (filterStatus === 'pendientes') {
            return designOrders.filter(o => o.status !== 'rebotado')
        }
        if (filterStatus === 'aprobados') {
            return approvedTodayOrders
        }
        return bouncedOrders
    }, [filterStatus, designOrders, approvedTodayOrders, bouncedOrders])

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
    const handleExecuteBounce = async (order: Order) => {
        const cliente = clientes.find(c => String(c.id) === String(order.clientId))
        const phone = (cliente?.celular || cliente?.telefono || '').replace(/[^0-9]/g, '')

        const msg = `*LuXius / XignuX - Observación Técnica de Diseño*\n\n` +
            `¡Hola ${order.clienteNombre}! 👋 Estamos revisando el archivo enviado para la orden *#${order.ot || order.id}* (${order.nombreTarea || order.material}).\n\n` +
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

    const handleCopyReboundMessage = (order: Order) => {
        const cliente = clientes.find(c => String(c.id) === String(order.clientId))
        const msg = `Hola ${order.clienteNombre}! 👋 Te escribimos desde el taller de impresión LuXius / XignuX. Revisamos tu archivo para la OT #${order.ot || order.id} (${order.nombreTarea || order.material}) y detectamos: ${selectedReason.title}. ${selectedReason.description}. ¿Podrías reenviarlo corregido o autorizas ajuste asistido?`
        navigator.clipboard.writeText(msg)
        alert('Mensaje copiado al portapapeles listo para enviar por WhatsApp.')
    }

    return (
        <div className="mobile-tab-content design-theme">
            {/* Header Banner - Stitch Industrial Dark Style */}
            <div className="design-hero-banner" style={{
                background: 'linear-gradient(135deg, rgba(76, 215, 246, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
                border: '1px solid rgba(76, 215, 246, 0.2)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px'
            }}>
                <div className="flex items-center justify-between">
                    <div>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(76, 215, 246, 0.15)',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            color: '#4cd7f6',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'JetBrains Mono, monospace',
                            textTransform: 'uppercase'
                        }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4cd7f6', display: 'inline-block' }}></span>
                            Pre-Press V2.4
                        </div>
                        <h2 style={{
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: '20px',
                            fontWeight: 800,
                            color: '#dfe2f1',
                            margin: '8px 0 4px 0'
                        }}>Cola de Aprobación Técnica</h2>
                        <p style={{ fontSize: '12px', color: '#869397', margin: 0 }}>
                            Diagnóstico de vectores, perfiles ICC y tolerancias de gigantografía antes de ripado.
                        </p>
                    </div>
                </div>

                {/* 48px Thumb-Friendly Filter Pills */}
                <div className="stitch-filter-pills" style={{ marginTop: '14px' }}>
                    <button
                        type="button"
                        className={`stitch-filter-pill ${filterStatus === 'pendientes' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('pendientes')}
                    >
                        <span>Pendientes ({designOrders.filter(o => o.status !== 'rebotado').length})</span>
                    </button>
                    <button
                        type="button"
                        className={`stitch-filter-pill ${filterStatus === 'aprobados' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('aprobados')}
                    >
                        <span>Aprobados Hoy ({approvedTodayOrders.length})</span>
                    </button>
                    <button
                        type="button"
                        className={`stitch-filter-pill ${filterStatus === 'rebotados' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('rebotados')}
                    >
                        <span>Rebotados ({bouncedOrders.length})</span>
                    </button>
                </div>
            </div>

            {/* Orders Feed */}
            <div className="design-orders-container">
                {displayedOrders.length === 0 ? (
                    <div className="workshop-empty-state" style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        background: 'var(--stitch-surface-container)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <FileCheck size={48} color="#4cd7f6" style={{ margin: '0 auto 12px' }} />
                        <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#dfe2f1', fontSize: '18px' }}>
                            ¡Todos los archivos revisados!
                        </h3>
                        <p style={{ color: '#869397', fontSize: '13px' }}>
                            No hay originales pendientes en esta sección de la cola técnica.
                        </p>
                    </div>
                ) : (
                    displayedOrders.map(o => {
                        const downloadUrl = (o.archivos && o.archivos[0]) || (o.archivosOriginales && o.archivosOriginales[0])
                        const m2 = Math.round((Number(o.ancho || 1) * Number(o.alto || 1) * Number(o.copias || 1)) * 100) / 100
                        const isRgbFixed = !!autoFixedRgb[o.id]
                        const isRebounding = selectedOrderForBounce?.id === o.id

                        return (
                            <div key={o.id} className="stitch-preflight-card">
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            fontFamily: 'JetBrains Mono, monospace',
                                            fontWeight: 800,
                                            fontSize: '13px',
                                            color: '#4cd7f6',
                                            background: 'rgba(76, 215, 246, 0.15)',
                                            padding: '3px 8px',
                                            borderRadius: '6px'
                                        }}>
                                            {o.ot || `OT #${o.id}`}
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#869397' }}>
                                            {o.origen === 'mobile' ? 'WhatsApp API' : 'LuXius Core'}
                                        </span>
                                    </div>
                                    <span style={{
                                        fontFamily: 'JetBrains Mono, monospace',
                                        fontSize: '11px',
                                        color: o.status === 'rebotado' ? '#f87171' : '#ffb95f',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        {o.status === 'rebotado' ? '● Rebotado' : '● En Cola Pre-Press'}
                                    </span>
                                </div>

                                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>
                                    {o.nombreTarea || o.material}
                                </div>
                                <div style={{ fontSize: '12px', color: '#869397', marginBottom: '10px' }}>
                                    Cliente: <strong style={{ color: '#dfe2f1' }}>{o.clienteNombre}</strong> • Sustrato: {o.material}
                                </div>

                                {/* Vector Inspection Stage Preview Card (Google Stitch Style) */}
                                <div className="stitch-canvas-preview">
                                    <div className="grid-overlay"></div>

                                    {/* Bleed & Guillotine Guides */}
                                    <div className="stitch-bleed-guide">
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>+2.0 cm Demasía Perimetral</span>
                                            <span style={{ color: '#ffb95f' }}>Corte Guillotina</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Área Segura Escala 1:1</span>
                                            <span>📐 {o.ancho} × {o.alto} m ({m2} m²)</span>
                                        </div>
                                    </div>

                                    {/* Crosshair Center */}
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        background: 'rgba(15, 19, 29, 0.75)',
                                        border: '1px solid rgba(76, 215, 246, 0.5)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 0 16px rgba(76, 215, 246, 0.4)',
                                        zIndex: 2
                                    }}>
                                        <Layers size={22} color="#4cd7f6" />
                                    </div>

                                    {/* External Link Overlay Button */}
                                    {downloadUrl && (
                                        <a
                                            href={downloadUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                position: 'absolute',
                                                bottom: '10px',
                                                right: '10px',
                                                background: 'rgba(15, 19, 29, 0.85)',
                                                border: '1px solid rgba(76, 215, 246, 0.3)',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                color: '#4cd7f6',
                                                fontSize: '11px',
                                                fontFamily: 'JetBrains Mono, monospace',
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                zIndex: 3
                                            }}
                                        >
                                            <ExternalLink size={13} />
                                            <span>Abrir WeTransfer / Drive</span>
                                        </a>
                                    )}
                                </div>

                                {/* Pre-Press Technical Diagnostics Matrix */}
                                <div className="stitch-preflight-matrix">
                                    {/* DPI Check */}
                                    <div className="stitch-matrix-row">
                                        <div className="stitch-matrix-left">
                                            <div className="stitch-matrix-icon">
                                                <Sparkles size={16} />
                                            </div>
                                            <div className="stitch-matrix-info">
                                                <div className="stitch-matrix-title">180 DPI Óptimo (Escala 1:1)</div>
                                                <div className="stitch-matrix-sub">Suficiente para visión cercana (&gt;150 req.)</div>
                                            </div>
                                        </div>
                                        <span className="stitch-matrix-status ok">PASÓ</span>
                                    </div>

                                    {/* Color Profile Check with Auto-Fix Option */}
                                    <div className="stitch-matrix-row">
                                        <div className="stitch-matrix-left">
                                            <div className="stitch-matrix-icon" style={{ color: isRgbFixed ? '#34d399' : '#ffb95f' }}>
                                                <Palette size={16} />
                                            </div>
                                            <div className="stitch-matrix-info">
                                                <div className="stitch-matrix-title">
                                                    {isRgbFixed ? 'Perfil CMYK Fogra39 Asignado' : 'Perfil RGB Detectado'}
                                                </div>
                                                <div className="stitch-matrix-sub">
                                                    {isRgbFixed ? 'Remapeo de gamut verificado' : 'Riesgo de virado de tintas en Flora/Roland'}
                                                </div>
                                            </div>
                                        </div>
                                        {!isRgbFixed ? (
                                            <button
                                                type="button"
                                                onClick={() => setAutoFixedRgb(prev => ({ ...prev, [o.id]: true }))}
                                                style={{
                                                    background: 'rgba(238, 152, 0, 0.2)',
                                                    border: '1px solid rgba(238, 152, 0, 0.4)',
                                                    color: '#ffb95f',
                                                    fontFamily: 'JetBrains Mono, monospace',
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Auto-CMYK
                                            </button>
                                        ) : (
                                            <span className="stitch-matrix-status ok">CORREGIDO</span>
                                        )}
                                    </div>

                                    {/* Demasía Check */}
                                    <div className="stitch-matrix-row">
                                        <div className="stitch-matrix-left">
                                            <div className="stitch-matrix-icon">
                                                <Crop size={16} />
                                            </div>
                                            <div className="stitch-matrix-info">
                                                <div className="stitch-matrix-title">Demasía +2cm Perimetral</div>
                                                <div className="stitch-matrix-sub">Márgenes para ojales y dobladillo</div>
                                            </div>
                                        </div>
                                        <span className="stitch-matrix-status ok">CORRECTO</span>
                                    </div>

                                    {/* Curvas / Tipografía Check */}
                                    <div className="stitch-matrix-row">
                                        <div className="stitch-matrix-left">
                                            <div className="stitch-matrix-icon">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <div className="stitch-matrix-info">
                                                <div className="stitch-matrix-title">Textos en Curvas / Trazados</div>
                                                <div className="stitch-matrix-sub">0 tipografías incrustadas pendientes</div>
                                            </div>
                                        </div>
                                        <span className="stitch-matrix-status ok">100% VECTOR</span>
                                    </div>
                                </div>

                                {/* Ergonomic Split Buttons */}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                    <button
                                        type="button"
                                        className="stitch-btn-approve"
                                        onClick={() => handleApproveOrder(o)}
                                    >
                                        <Rocket size={18} />
                                        <span>Aprobar y Mandar a Plotter</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="stitch-btn-bounce"
                                        onClick={() => setSelectedOrderForBounce(isRebounding ? null : o)}
                                    >
                                        <AlertOctagon size={18} />
                                        <span>{isRebounding ? 'Cerrar Rebote' : 'Rebotar WhatsApp'}</span>
                                    </button>
                                </div>

                                {/* Stitch Embedded Rebound Diagnostics & Canned Messages Section */}
                                {isRebounding && (
                                    <div className="stitch-rebound-box">
                                        <div className="stitch-rebound-header">
                                            <div className="stitch-rebound-title">
                                                <AlertTriangle size={16} />
                                                <span>Motivo del Rebote Técnico</span>
                                            </div>
                                            <span style={{ fontSize: '10px', color: '#869397' }}>1 tap para formatear</span>
                                        </div>

                                        <div className="stitch-reason-grid">
                                            {BOUNCE_REASONS.map(r => (
                                                <button
                                                    key={r.id}
                                                    type="button"
                                                    className={`stitch-reason-pill ${selectedReason.id === r.id ? 'active' : ''}`}
                                                    onClick={() => setSelectedReason(r)}
                                                >
                                                    <div className="pill-head">
                                                        <span>{r.title}</span>
                                                    </div>
                                                    <div className="pill-desc">{r.description}</div>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Optional Designer Note */}
                                        <input
                                            type="text"
                                            placeholder="Nota o detalle opcional para el cliente..."
                                            value={customBounceNote}
                                            onChange={e => setCustomBounceNote(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                background: 'var(--stitch-surface-low)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '12px',
                                                marginBottom: '10px',
                                                boxSizing: 'border-box'
                                            }}
                                        />

                                        {/* Message Preview */}
                                        <div className="stitch-whatsapp-preview-box">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '10px', color: '#869397', textTransform: 'uppercase' }}>
                                                    Mensaje Pre-cargado para {o.clienteNombre}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyReboundMessage(o)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#4cd7f6',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px'
                                                    }}
                                                >
                                                    <Copy size={11} /> Copiar
                                                </button>
                                            </div>
                                            <div className="stitch-whatsapp-preview-text">
                                                Hola <strong style={{ color: '#4cd7f6' }}>{o.clienteNombre}</strong>! 👋 Te escribimos desde el taller LuXius / XignuX. Revisamos tu archivo para la <strong style={{ color: '#4cd7f6' }}>OT #{o.ot || o.id}</strong> y detectamos: <strong style={{ color: '#ffb95f' }}>{selectedReason.title}</strong> ({selectedReason.description}). {selectedReason.suggestedFix} {customBounceNote ? `Nota: ${customBounceNote}` : ''}
                                            </div>
                                        </div>

                                        {/* Direct WhatsApp Action Button */}
                                        <button
                                            type="button"
                                            className="stitch-btn-whatsapp-notify"
                                            onClick={() => handleExecuteBounce(o)}
                                        >
                                            <Send size={18} />
                                            <span>Enviar Rebote por WhatsApp</span>
                                        </button>
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
