import React, { useState, useEffect, useMemo } from 'react'
import { Cliente, Material, Calidad, Order } from '@/types'
import { parseWhatsAppMessage, ParsedWhatsAppOrder } from '../utils/whatsappParser'
import {
    Link2,
    Copy,
    CheckCircle2,
    AlertCircle,
    UserPlus,
    Send,
    Sparkles,
    Trash2,
    DollarSign,
    Layers,
    FileText,
    ExternalLink,
    Zap,
    DownloadCloud,
    Check,
    MessageSquare,
    Store
} from 'lucide-react'

interface QuickOrderModalProps {
    isOpen: boolean
    onClose: () => void
    initialText?: string
    initialUrl?: string
    clientes: Cliente[]
    materiales: Material[]
    calidades: Calidad[]
    onSaveOrder: (order: Partial<Order>) => Promise<Order>
    onSaveCliente?: (cliente: Partial<Cliente>) => Promise<Cliente>
}

export const QuickOrderModal: React.FC<QuickOrderModalProps> = ({
    isOpen,
    onClose,
    initialText = '',
    initialUrl = '',
    clientes,
    materiales,
    calidades,
    onSaveOrder,
    onSaveCliente
}) => {
    const [rawInput, setRawInput] = useState('')
    const [parsed, setParsed] = useState<ParsedWhatsAppOrder | null>(null)

    // Form states
    const [selectedClienteId, setSelectedClienteId] = useState<number | string>('')
    const [clienteNombre, setClienteNombre] = useState('')
    const [clienteTelefono, setClienteTelefono] = useState('')
    const [nombreTarea, setNombreTarea] = useState('')
    const [enlaceArchivo, setEnlaceArchivo] = useState('')
    const [materialSeleccionado, setMaterialSeleccionado] = useState('Lona Front')
    const [calidadSeleccionada, setCalidadSeleccionada] = useState('Standard')
    const [ancho, setAncho] = useState(1.0)
    const [alto, setAlto] = useState(1.0)
    const [copias, setCopias] = useState(1)
    const [precioM2, setPrecioM2] = useState(8500)
    const [senaMonto, setSenaMonto] = useState(0)
    const [senaMetodo, setSenaMetodo] = useState('efectivo')
    const [observaciones, setObservaciones] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [savedOrder, setSavedOrder] = useState<Order | null>(null)
    const [showNewClientForm, setShowNewClientForm] = useState(false)

    // Quick client creation
    const [newClientName, setNewClientName] = useState('')
    const [newClientPhone, setNewClientPhone] = useState('')

    // Initialize from props
    useEffect(() => {
        if (isOpen) {
            const combined = [initialUrl, initialText].filter(Boolean).join('\n')
            setRawInput(combined)
            setSavedOrder(null)
            if (combined) {
                applyParsedData(combined)
            } else {
                // Reset defaults
                setAncho(1.0)
                setAlto(1.0)
                setCopias(1)
                setEnlaceArchivo('')
                setNombreTarea('')
                setObservaciones('')
                setSelectedClienteId('')
                setClienteNombre('')
                setClienteTelefono('')
                setSenaMonto(0)
            }
        }
    }, [isOpen, initialText, initialUrl])

    // Apply smart parser to text
    const applyParsedData = (text: string) => {
        const result = parseWhatsAppMessage(text, clientes, materiales)
        setParsed(result)

        if (result.primaryUrl) {
            setEnlaceArchivo(result.primaryUrl)
        }
        if (result.confianza.medidas) {
            setAncho(result.ancho)
            setAlto(result.alto)
        }
        if (result.copias > 1) {
            setCopias(result.copias)
        }
        if (result.materialNombre) {
            setMaterialSeleccionado(result.materialNombre)
        }
        if (result.matchedCliente) {
            setSelectedClienteId(result.matchedCliente.id)
            setClienteNombre(result.matchedCliente.nombre)
            setClienteTelefono(result.matchedCliente.telefono || result.matchedCliente.celular || '')
        } else if (result.detectedClientName) {
            setClienteNombre(result.detectedClientName)
        }
        setObservaciones(text)
    }

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setRawInput(val)
        applyParsedData(val)
    }

    const handlePasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (text) {
                setRawInput(text)
                applyParsedData(text)
            }
        } catch (err) {
            console.warn('Clipboard read error:', err)
        }
    }

    // Calculations
    const totalM2 = useMemo(() => {
        return Math.round(ancho * alto * copias * 100) / 100
    }, [ancho, alto, copias])

    const subtotal = useMemo(() => {
        return Math.round(totalM2 * precioM2)
    }, [totalM2, precioM2])

    const saldoPendiente = useMemo(() => {
        return Math.max(0, subtotal - senaMonto)
    }, [subtotal, senaMonto])

    const detectedCount = useMemo(() => {
        let count = 0
        if (parsed?.primaryUrl) count++
        if (parsed?.confianza?.medidas) count++
        if (parsed?.copias && parsed.copias > 1) count++
        if (parsed?.matchedCliente || parsed?.detectedClientName) count++
        if (parsed?.materialNombre) count++
        return count
    }, [parsed])

    const handleClienteSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value
        setSelectedClienteId(id)
        if (id) {
            const found = clientes.find(c => String(c.id) === String(id))
            if (found) {
                setClienteNombre(found.nombre)
                setClienteTelefono(found.telefono || found.celular || '')
            }
        }
    }

    const handleCreateQuickClient = async () => {
        if (!newClientName.trim() || !onSaveCliente) return
        try {
            const created = await onSaveCliente({
                nombre: newClientName.trim(),
                telefono: newClientPhone.trim(),
                celular: newClientPhone.trim(),
                habilitado: true,
                categoria: 'Minorista'
            })
            setSelectedClienteId(created.id)
            setClienteNombre(created.nombre)
            setClienteTelefono(created.telefono || created.celular || '')
            setShowNewClientForm(false)
            setNewClientName('')
            setNewClientPhone('')
        } catch (err) {
            console.error('Error creating quick client:', err)
        }
    }

    const handleSaveOrder = async () => {
        if (!clienteNombre.trim()) {
            alert('Por favor especifica o selecciona un cliente para la orden.')
            return
        }

        setIsSaving(true)
        try {
            const orderPayload: Partial<Order> = {
                clienteNombre: clienteNombre.trim(),
                clientId: Number(selectedClienteId) || 1,
                nombreTarea: nombreTarea.trim() || `Impresión ${materialSeleccionado} (${ancho}x${alto}m)`,
                material: materialSeleccionado,
                calidad: calidadSeleccionada,
                ancho: Number(ancho),
                alto: Number(alto),
                copias: Number(copias),
                subtotal: subtotal,
                sena: senaMonto,
                senaMonto: senaMonto,
                senaMetodo: senaMonto > 0 ? senaMetodo : 'pendiente',
                saldoPendiente: saldoPendiente,
                status: 'orden',
                category: 'impresion',
                origen: 'mobile',
                observaciones: observaciones,
                archivos: enlaceArchivo ? [enlaceArchivo] : [],
                archivosOriginales: enlaceArchivo ? [enlaceArchivo] : [],
                fechaCreacion: new Date().toISOString(),
                fechaEntrega: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                accesorios: [],
                laminado: false,
                bordado: false,
                panelizado: false,
                portabanners: 0,
                demasias: 0,
                emergencia: false,
                envio: 'retiro',
                observaciones2: rawInput ? `Texto original WhatsApp:\n${rawInput}` : ''
            }

            const created = await onSaveOrder(orderPayload)
            setSavedOrder(created)
        } catch (error) {
            console.error('Error saving mobile quick order:', error)
            alert('Error al guardar la orden. Por favor intenta de nuevo.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleSendWhatsAppConfirmation = () => {
        if (!savedOrder) return
        const phone = clienteTelefono.replace(/[^0-9]/g, '')
        const msg = `*LuXius / XignuX - Comprobante de Orden*\n\n` +
            `¡Hola ${clienteNombre}! 👋 Recibimos tu pedido exitosamente:\n\n` +
            `📋 *Orden:* #${savedOrder.ot || savedOrder.id}\n` +
            `📦 *Trabajo:* ${savedOrder.nombreTarea || materialSeleccionado}\n` +
            `📏 *Medidas:* ${ancho} x ${alto} m (${copias} ${copias > 1 ? 'copias' : 'copia'} - ${totalM2} m²)\n` +
            `🏷️ *Material:* ${materialSeleccionado}\n` +
            `💰 *Total:* $${subtotal.toLocaleString('es-AR')}\n` +
            (senaMonto > 0 ? `💵 *Seña abonada:* $${senaMonto.toLocaleString('es-AR')} (${senaMetodo})\n` : '') +
            (saldoPendiente > 0 ? `⚖️ *Saldo a la entrega:* $${saldoPendiente.toLocaleString('es-AR')}\n` : `✅ *Abonado Total*\n`) +
            `\nTe avisaremos en cuanto esté impreso y listo para retirar. ¡Muchas gracias!`

        const targetUrl = phone
            ? `https://wa.me/${phone.startsWith('54') ? phone : '549' + phone}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`

        window.open(targetUrl, '_blank')
    }

    if (!isOpen) return null

    return (
        <div className="mobile-modal-overlay">
            <div className="mobile-modal-container" style={{
                background: 'var(--stitch-surface)',
                border: '1px solid rgba(76, 215, 246, 0.25)',
                boxShadow: '0 0 32px rgba(0, 0, 0, 0.85)'
            }}>
                {/* Header (Stitch Interceptor Style) */}
                <div className="mobile-modal-header" style={{
                    background: 'var(--stitch-surface-container)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    <div className="modal-title-wrap">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(76, 215, 246, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#4cd7f6'
                            }}>
                                <Zap size={18} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                                        Captura Rápida de Orden
                                    </h2>
                                    <span style={{
                                        fontFamily: 'JetBrains Mono, monospace',
                                        fontSize: '9px',
                                        fontWeight: 800,
                                        background: 'rgba(76, 215, 246, 0.2)',
                                        color: '#4cd7f6',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        textTransform: 'uppercase'
                                    }}>
                                        INTERCEPT
                                    </span>
                                </div>
                                <p style={{ fontSize: '11px', color: '#869397', margin: 0 }}>
                                    Copia el mensaje de WhatsApp y LuXius extrae cliente, link y medidas automáticamente.
                                </p>
                            </div>
                        </div>
                    </div>
                    <button className="mobile-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Content */}
                <div className="mobile-modal-body" style={{ padding: '14px' }}>
                    {savedOrder ? (
                        /* SUCCESS SCREEN */
                        <div className="mobile-success-card" style={{
                            textAlign: 'center',
                            padding: '24px 14px',
                            background: 'var(--stitch-surface-container)',
                            borderRadius: '16px',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(16, 185, 129, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 14px',
                                color: '#34d399'
                            }}>
                                <CheckCircle2 size={40} />
                            </div>
                            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                                ¡Orden Creada con Éxito!
                            </h3>
                            <div style={{
                                display: 'inline-block',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '16px',
                                fontWeight: 800,
                                color: '#4cd7f6',
                                background: 'rgba(76, 215, 246, 0.15)',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                margin: '8px 0'
                            }}>
                                {savedOrder.ot || `OT #${savedOrder.id}`}
                            </div>
                            <p style={{ fontSize: '12px', color: '#869397', maxWidth: '320px', margin: '0 auto 16px' }}>
                                La orden fue enviada directamente a la cola de taller y ya está disponible para revisión y corte.
                            </p>

                            <div style={{
                                background: 'var(--stitch-surface-low)',
                                borderRadius: '12px',
                                padding: '12px',
                                textAlign: 'left',
                                fontSize: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                marginBottom: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#869397' }}>Cliente:</span>
                                    <strong style={{ color: '#fff' }}>{clienteNombre}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#869397' }}>Trabajo:</span>
                                    <strong style={{ color: '#fff' }}>{materialSeleccionado} ({ancho}x{alto}m)</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#869397' }}>Total:</span>
                                    <strong style={{ color: '#4cd7f6' }}>${subtotal.toLocaleString('es-AR')}</strong>
                                </div>
                                {saldoPendiente > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffb95f' }}>
                                        <span>Saldo pendiente:</span>
                                        <strong>${saldoPendiente.toLocaleString('es-AR')}</strong>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button
                                    type="button"
                                    className="stitch-btn-whatsapp-notify"
                                    onClick={handleSendWhatsAppConfirmation}
                                >
                                    <Send size={18} />
                                    <span>Enviar Confirmación por WhatsApp</span>
                                </button>
                                <button
                                    type="button"
                                    className="mobile-btn ghost-btn"
                                    onClick={() => {
                                        setSavedOrder(null)
                                        setRawInput('')
                                        onClose()
                                    }}
                                >
                                    Cerrar y Volver al Taller
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* FORM SCREEN */
                        <>
                            {/* 1-Tap Paste Trigger Button (Google Stitch Style) */}
                            <div className="stitch-intercept-card">
                                <button
                                    type="button"
                                    className="stitch-paste-trigger-btn"
                                    onClick={handlePasteFromClipboard}
                                >
                                    <Copy size={18} />
                                    <span>Pegar desde Portapapeles (1-Tap)</span>
                                </button>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#869397' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4cd7f6' }}></span>
                                        Interceptor de WhatsApp Activo
                                    </span>
                                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4cd7f6' }}>
                                        Buffer: {rawInput.length} caracteres
                                    </span>
                                </div>

                                {/* Raw Text Input */}
                                <textarea
                                    className="mobile-textarea"
                                    rows={3}
                                    style={{
                                        marginTop: '8px',
                                        background: 'var(--stitch-surface-low)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        fontSize: '12px'
                                    }}
                                    placeholder="O escribe/pega el mensaje de WhatsApp aquí..."
                                    value={rawInput}
                                    onChange={handleTextChange}
                                />

                                {/* AI Parser Feedback Tag */}
                                {detectedCount > 0 && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'rgba(76, 215, 246, 0.1)',
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        marginTop: '8px',
                                        fontSize: '11px',
                                        color: '#4cd7f6'
                                    }}>
                                        <Sparkles size={14} />
                                        <span>
                                            <strong>{detectedCount} datos detectados:</strong> {parsed?.detectedClientName ? `Cliente (${parsed.detectedClientName}), ` : ''} {parsed?.confianza?.medidas ? `Medidas (${ancho}×${alto}m), ` : ''} {parsed?.primaryUrl ? 'Link de archivo' : ''}
                                        </span>
                                    </div>
                                )}

                                {/* Detected Cloud Link Card */}
                                {enlaceArchivo && (
                                    <div className="stitch-cloud-transfer">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                            <Link2 size={16} color="#4cd7f6" style={{ shrink: 0 }} />
                                            <a
                                                href={enlaceArchivo}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="stitch-cloud-link"
                                            >
                                                {enlaceArchivo}
                                            </a>
                                        </div>
                                        <span style={{
                                            fontSize: '9px',
                                            fontFamily: 'JetBrains Mono, monospace',
                                            background: 'rgba(76, 215, 246, 0.2)',
                                            color: '#4cd7f6',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontWeight: 700
                                        }}>
                                            LINK OK
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Client Identification Field */}
                            <div className="stitch-intercept-card">
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: '#869397',
                                    marginBottom: '8px'
                                }}>
                                    <Store size={14} color="#4cd7f6" />
                                    <span>Cliente Destinatario</span>
                                </label>

                                {!showNewClientForm ? (
                                    <>
                                        <select
                                            className="mobile-select"
                                            style={{
                                                background: 'var(--stitch-surface-low)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '13px',
                                                marginBottom: '8px'
                                            }}
                                            value={selectedClienteId}
                                            onChange={handleClienteSelect}
                                        >
                                            <option value="">-- Seleccionar de la Agenda --</option>
                                            {clientes.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.nombre} {c.nombreFantasia ? `(${c.nombreFantasia})` : ''}
                                                </option>
                                            ))}
                                        </select>

                                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                            <input
                                                type="text"
                                                className="mobile-input"
                                                placeholder="O nombre del cliente..."
                                                value={clienteNombre}
                                                onChange={e => setClienteNombre(e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    background: 'var(--stitch-surface-low)',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    borderRadius: '8px',
                                                    color: '#fff'
                                                }}
                                            />
                                            {onSaveCliente && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewClientForm(true)}
                                                    style={{
                                                        padding: '0 12px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(76, 215, 246, 0.15)',
                                                        border: '1px solid rgba(76, 215, 246, 0.3)',
                                                        color: '#4cd7f6',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    + Nuevo
                                                </button>
                                            )}
                                        </div>

                                        <input
                                            type="tel"
                                            className="mobile-input"
                                            placeholder="WhatsApp/Teléfono (ej: 3518192655)"
                                            value={clienteTelefono}
                                            onChange={e => setClienteTelefono(e.target.value)}
                                            style={{
                                                background: 'var(--stitch-surface-low)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                borderRadius: '8px',
                                                color: '#fff'
                                            }}
                                        />
                                    </>
                                ) : (
                                    <div style={{
                                        background: 'var(--stitch-surface-low)',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        border: '1px solid rgba(76, 215, 246, 0.2)'
                                    }}>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#4cd7f6' }}>Nuevo Cliente Rápido</h4>
                                        <input
                                            type="text"
                                            className="mobile-input mb-2"
                                            placeholder="Nombre o Razón Social *"
                                            value={newClientName}
                                            onChange={e => setNewClientName(e.target.value)}
                                        />
                                        <input
                                            type="tel"
                                            className="mobile-input mb-2"
                                            placeholder="Teléfono / WhatsApp"
                                            value={newClientPhone}
                                            onChange={e => setNewClientPhone(e.target.value)}
                                        />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                className="mobile-btn primary-btn btn-sm"
                                                onClick={handleCreateQuickClient}
                                            >
                                                Guardar Cliente
                                            </button>
                                            <button
                                                type="button"
                                                className="mobile-btn ghost-btn btn-sm"
                                                onClick={() => setShowNewClientForm(false)}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Technical Specifications */}
                            <div className="stitch-intercept-card">
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: '#869397',
                                    marginBottom: '8px'
                                }}>
                                    <Layers size={14} color="#4cd7f6" />
                                    <span>Sustrato y Bobina Asignada</span>
                                </label>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                                    <div>
                                        <span style={{ fontSize: '10px', color: '#869397', display: 'block', marginBottom: '2px' }}>Material</span>
                                        <select
                                            className="mobile-select"
                                            value={materialSeleccionado}
                                            onChange={e => setMaterialSeleccionado(e.target.value)}
                                        >
                                            <option value="Lona Front">Lona Front 13oz</option>
                                            <option value="Lona Backlight">Lona Backlight</option>
                                            <option value="Lona Blackout">Lona Blackout</option>
                                            <option value="Vinilo Mate">Vinilo Mate</option>
                                            <option value="Vinilo Brillante">Vinilo Brillante</option>
                                            <option value="Microperforado">Microperforado</option>
                                            <option value="Lienzo Canvas">Lienzo Canvas</option>
                                            <option value="Corrugado Plástico">Corrugado Plástico</option>
                                            {materiales.map(m => (
                                                <option key={m.id} value={m.nombre}>{m.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '10px', color: '#869397', display: 'block', marginBottom: '2px' }}>Calidad</span>
                                        <select
                                            className="mobile-select"
                                            value={calidadSeleccionada}
                                            onChange={e => setCalidadSeleccionada(e.target.value)}
                                        >
                                            <option value="Standard">Standard (720 DPI)</option>
                                            <option value="Alta">Alta Calidad (1440 DPI)</option>
                                            <option value="Fotográfica">Fotográfica FineArt</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Dimensions Steppers */}
                                <div className="dimensions-grid" style={{ marginBottom: '8px' }}>
                                    <div className="dim-col">
                                        <span style={{ fontSize: '10px', color: '#869397', display: 'block', marginBottom: '2px' }}>Ancho (m)</span>
                                        <div className="stepper-input">
                                            <button
                                                type="button"
                                                onClick={() => setAncho(prev => Math.max(0.1, Math.round((prev - 0.1) * 10) / 10))}
                                            >-</button>
                                            <input
                                                type="number"
                                                step="0.05"
                                                value={ancho}
                                                onChange={e => setAncho(parseFloat(e.target.value) || 0)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setAncho(prev => Math.round((prev + 0.1) * 10) / 10)}
                                            >+</button>
                                        </div>
                                    </div>

                                    <div className="dim-col">
                                        <span style={{ fontSize: '10px', color: '#869397', display: 'block', marginBottom: '2px' }}>Alto (m)</span>
                                        <div className="stepper-input">
                                            <button
                                                type="button"
                                                onClick={() => setAlto(prev => Math.max(0.1, Math.round((prev - 0.1) * 10) / 10))}
                                            >-</button>
                                            <input
                                                type="number"
                                                step="0.05"
                                                value={alto}
                                                onChange={e => setAlto(parseFloat(e.target.value) || 0)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setAlto(prev => Math.round((prev + 0.1) * 10) / 10)}
                                            >+</button>
                                        </div>
                                    </div>

                                    <div className="dim-col">
                                        <span style={{ fontSize: '10px', color: '#869397', display: 'block', marginBottom: '2px' }}>Copias</span>
                                        <div className="stepper-input">
                                            <button
                                                type="button"
                                                onClick={() => setCopias(prev => Math.max(1, prev - 1))}
                                            >-</button>
                                            <input
                                                type="number"
                                                min="1"
                                                value={copias}
                                                onChange={e => setCopias(parseInt(e.target.value, 10) || 1)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setCopias(prev => prev + 1)}
                                            >+</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Preset Pills */}
                                <div className="preset-pills-row" style={{ marginBottom: '8px' }}>
                                    <button type="button" className="preset-pill" onClick={() => { setAncho(1.0); setAlto(1.0); }}>1x1m</button>
                                    <button type="button" className="preset-pill" onClick={() => { setAncho(2.0); setAlto(1.0); }}>2x1m</button>
                                    <button type="button" className="preset-pill" onClick={() => { setAncho(1.9); setAlto(0.9); }}>1.9x0.9</button>
                                    <button type="button" className="preset-pill" onClick={() => { setAncho(2.5); setAlto(1.2); }}>2.5x1.2</button>
                                    <button type="button" className="preset-pill" onClick={() => { setAncho(3.0); setAlto(1.5); }}>3x1.5</button>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '6px 10px',
                                    background: 'var(--stitch-surface-low)',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontFamily: 'JetBrains Mono, monospace'
                                }}>
                                    <span style={{ color: '#869397' }}>Superficie calculada:</span>
                                    <strong style={{ color: '#4cd7f6' }}>{totalM2} m²</strong>
                                </div>
                            </div>

                            {/* Financials & Deposit */}
                            <div className="stitch-intercept-card">
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: '#869397',
                                    marginBottom: '8px'
                                }}>
                                    <DollarSign size={14} color="#ffb95f" />
                                    <span>Importes y Seña</span>
                                </label>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                    <div>
                                        <span style={{ fontSize: '10px', color: '#869397', display: 'block', marginBottom: '2px' }}>Precio x m² ($)</span>
                                        <input
                                            type="number"
                                            className="mobile-input"
                                            value={precioM2}
                                            onChange={e => setPrecioM2(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '10px', color: '#869397', display: 'block', marginBottom: '2px' }}>Subtotal Calculado</span>
                                        <div style={{
                                            height: '38px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '0 10px',
                                            background: 'var(--stitch-surface-low)',
                                            borderRadius: '8px',
                                            fontFamily: 'Outfit, sans-serif',
                                            fontSize: '16px',
                                            fontWeight: 800,
                                            color: '#fff'
                                        }}>
                                            ${subtotal.toLocaleString('es-AR')}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                    <div>
                                        <span style={{ fontSize: '10px', color: '#869397', display: 'block', marginBottom: '2px' }}>Seña / Anticipo ($)</span>
                                        <input
                                            type="number"
                                            className="mobile-input"
                                            placeholder="$ 0"
                                            value={senaMonto || ''}
                                            onChange={e => setSenaMonto(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '10px', color: '#869397', display: 'block', marginBottom: '2px' }}>Medio de Pago</span>
                                        <select
                                            className="mobile-select"
                                            value={senaMetodo}
                                            onChange={e => setSenaMetodo(e.target.value)}
                                        >
                                            <option value="efectivo">Efectivo Taller</option>
                                            <option value="transferencia">Transferencia Bancaria</option>
                                            <option value="mercadopago">Mercado Pago</option>
                                            <option value="ctacte">Cuenta Corriente</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    background: 'var(--stitch-surface-low)',
                                    fontSize: '11px'
                                }}>
                                    <span style={{ color: '#869397' }}>Saldo pendiente a pagar:</span>
                                    <strong style={{
                                        fontFamily: 'Outfit, sans-serif',
                                        fontSize: '14px',
                                        color: saldoPendiente > 0 ? '#ffb95f' : '#34d399'
                                    }}>
                                        ${saldoPendiente.toLocaleString('es-AR')}
                                    </strong>
                                </div>
                            </div>

                            {/* Task Name Field */}
                            <div className="stitch-intercept-card">
                                <span style={{ fontSize: '10px', color: '#869397', display: 'block', marginBottom: '2px' }}>Nombre del Proyecto / Tarea</span>
                                <input
                                    type="text"
                                    className="mobile-input"
                                    placeholder="Ej: Lonas Promoción Farmacia"
                                    value={nombreTarea}
                                    onChange={e => setNombreTarea(e.target.value)}
                                    style={{
                                        background: 'var(--stitch-surface-low)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                />
                            </div>

                            {/* Submit & Cancel Buttons */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                                <button
                                    type="button"
                                    className="mobile-btn ghost-btn"
                                    onClick={onClose}
                                    disabled={isSaving}
                                    style={{ flex: 1 }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="stitch-btn-approve"
                                    onClick={handleSaveOrder}
                                    disabled={isSaving}
                                    style={{ flex: 2 }}
                                >
                                    {isSaving ? 'Creando Orden...' : '🚀 Crear Orden de Trabajo'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
