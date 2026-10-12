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
    ExternalLink
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
            `¡Hola ${clienteNombre}! Recibimos tu pedido exitosamente:\n\n` +
            `📋 *Orden:* #${savedOrder.ot || savedOrder.id}\n` +
            `📦 *Trabajo:* ${savedOrder.nombreTarea || materialSeleccionado}\n` +
            `📏 *Medidas:* ${ancho} x ${alto} m (${copias} copias - ${totalM2} m²)\n` +
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
            <div className="mobile-modal-container">
                {/* Header */}
                <div className="mobile-modal-header">
                    <div className="modal-title-wrap">
                        <div className="sparkle-badge">
                            <Sparkles size={16} />
                            <span>WhatsApp Link Receiver</span>
                        </div>
                        <h2>Nueva Orden Express</h2>
                    </div>
                    <button className="mobile-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Content */}
                <div className="mobile-modal-body">
                    {savedOrder ? (
                        /* SUCCESS SCREEN */
                        <div className="mobile-success-card">
                            <div className="success-icon-wrap">
                                <CheckCircle2 size={54} color="#10b981" />
                            </div>
                            <h3>¡Orden Creada con Éxito!</h3>
                            <div className="ot-badge-lg">
                                <span>{savedOrder.ot || `OT-${savedOrder.id}`}</span>
                            </div>
                            <p className="success-subtitle">
                                La orden fue enviada directamente a la cola del taller y ya está disponible para impresión.
                            </p>

                            <div className="summary-box">
                                <div className="summary-row">
                                    <span>Cliente:</span>
                                    <strong>{clienteNombre}</strong>
                                </div>
                                <div className="summary-row">
                                    <span>Material:</span>
                                    <strong>{materialSeleccionado} ({ancho}x{alto}m)</strong>
                                </div>
                                <div className="summary-row">
                                    <span>Total:</span>
                                    <strong>${subtotal.toLocaleString('es-AR')}</strong>
                                </div>
                                {saldoPendiente > 0 && (
                                    <div className="summary-row highlight-pending">
                                        <span>Saldo pendiente:</span>
                                        <strong>${saldoPendiente.toLocaleString('es-AR')}</strong>
                                    </div>
                                )}
                            </div>

                            <div className="success-actions">
                                <button
                                    className="mobile-btn whatsapp-cta-btn"
                                    onClick={handleSendWhatsAppConfirmation}
                                >
                                    <Send size={18} />
                                    <span>Enviar Confirmación por WhatsApp</span>
                                </button>
                                <button
                                    className="mobile-btn secondary-btn"
                                    onClick={() => {
                                        setSavedOrder(null)
                                        setRawInput('')
                                        onClose()
                                    }}
                                >
                                    Cerrar y Volver
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* FORM SCREEN */
                        <>
                            {/* Raw Text Input with Smart Paste */}
                            <div className="input-group">
                                <div className="input-label-row">
                                    <label>Mensaje de WhatsApp o Enlace</label>
                                    <button
                                        type="button"
                                        className="paste-clipboard-btn"
                                        onClick={handlePasteFromClipboard}
                                        title="Pegar lo último copiado"
                                    >
                                        <Copy size={13} />
                                        <span>Pegar</span>
                                    </button>
                                </div>
                                <textarea
                                    className="mobile-textarea"
                                    rows={3}
                                    placeholder="Pega aquí el mensaje con el link de WeTransfer/Drive y medidas (ej: 'Hola te paso el wetransfer https://we.tl/... para imprimir 2 lonas de 2.5x1.2')..."
                                    value={rawInput}
                                    onChange={handleTextChange}
                                />
                                {parsed?.primaryUrl && (
                                    <div className="detected-link-chip">
                                        <Link2 size={14} color="#00e5ff" />
                                        <span className="link-text">{parsed.primaryUrl}</span>
                                        <a
                                            href={parsed.primaryUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="test-link-btn"
                                            title="Abrir enlace para verificar archivo"
                                        >
                                            <ExternalLink size={12} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Client Section */}
                            <div className="mobile-section-card">
                                <div className="card-header-sm">
                                    <UserPlus size={15} color="#00e5ff" />
                                    <span>Cliente Destinatario</span>
                                </div>

                                {!showNewClientForm ? (
                                    <div className="client-select-wrap">
                                        <select
                                            className="mobile-select"
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

                                        <div className="client-manual-row">
                                            <input
                                                type="text"
                                                className="mobile-input"
                                                placeholder="O escribe nombre del cliente..."
                                                value={clienteNombre}
                                                onChange={e => setClienteNombre(e.target.value)}
                                            />
                                            {onSaveCliente && (
                                                <button
                                                    type="button"
                                                    className="mini-add-client-btn"
                                                    onClick={() => setShowNewClientForm(true)}
                                                    title="Crear cliente rápido"
                                                >
                                                    + Nuevo
                                                </button>
                                            )}
                                        </div>

                                        <input
                                            type="tel"
                                            className="mobile-input mt-2"
                                            placeholder="WhatsApp/Teléfono (ej: 3518192655)"
                                            value={clienteTelefono}
                                            onChange={e => setClienteTelefono(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <div className="quick-client-box">
                                        <h4>Nuevo Cliente Rápido</h4>
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
                                        <div className="form-actions-inline">
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

                            {/* Job Specifications */}
                            <div className="mobile-section-card">
                                <div className="card-header-sm">
                                    <Layers size={15} color="#10b981" />
                                    <span>Especificaciones Técnicas</span>
                                </div>

                                <div className="input-row-2">
                                    <div>
                                        <label className="field-lbl">Material</label>
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
                                        <label className="field-lbl">Calidad</label>
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

                                {/* Dimensions with Quick Presets */}
                                <div className="dimensions-grid mt-2">
                                    <div className="dim-col">
                                        <label className="field-lbl">Ancho (m)</label>
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
                                        <label className="field-lbl">Alto (m)</label>
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
                                        <label className="field-lbl">Copias</label>
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
                                <div className="preset-pills-row mt-2">
                                    <button
                                        type="button"
                                        className="preset-pill"
                                        onClick={() => { setAncho(1.0); setAlto(1.0); }}
                                    >1x1m</button>
                                    <button
                                        type="button"
                                        className="preset-pill"
                                        onClick={() => { setAncho(2.0); setAlto(1.0); }}
                                    >2x1m</button>
                                    <button
                                        type="button"
                                        className="preset-pill"
                                        onClick={() => { setAncho(1.9); setAlto(0.9); }}
                                    >1.9x0.9 (Banner)</button>
                                    <button
                                        type="button"
                                        className="preset-pill"
                                        onClick={() => { setAncho(2.5); setAlto(1.2); }}
                                    >2.5x1.2m</button>
                                    <button
                                        type="button"
                                        className="preset-pill"
                                        onClick={() => { setAncho(3.0); setAlto(1.5); }}
                                    >3x1.5m</button>
                                </div>

                                <div className="total-m2-badge mt-2">
                                    <span>Superficie total:</span>
                                    <strong>{totalM2} m²</strong>
                                </div>
                            </div>

                            {/* Financials & Payment */}
                            <div className="mobile-section-card">
                                <div className="card-header-sm">
                                    <DollarSign size={15} color="#f59e0b" />
                                    <span>Importes y Seña</span>
                                </div>

                                <div className="input-row-2">
                                    <div>
                                        <label className="field-lbl">Precio x m² ($)</label>
                                        <input
                                            type="number"
                                            className="mobile-input"
                                            value={precioM2}
                                            onChange={e => setPrecioM2(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="field-lbl">Subtotal Calculado</label>
                                        <div className="calculated-val-box">
                                            ${subtotal.toLocaleString('es-AR')}
                                        </div>
                                    </div>
                                </div>

                                <div className="input-row-2 mt-2">
                                    <div>
                                        <label className="field-lbl">Seña / Anticipo ($)</label>
                                        <input
                                            type="number"
                                            className="mobile-input"
                                            placeholder="$ 0"
                                            value={senaMonto || ''}
                                            onChange={e => setSenaMonto(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="field-lbl">Medio de Pago Seña</label>
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

                                <div className="balance-info-row mt-2">
                                    <span>Saldo pendiente a pagar:</span>
                                    <strong className={saldoPendiente > 0 ? 'text-amber' : 'text-emerald'}>
                                        ${saldoPendiente.toLocaleString('es-AR')}
                                    </strong>
                                </div>
                            </div>

                            {/* Enlace Directo y Notas */}
                            <div className="input-group">
                                <label className="field-lbl">Enlace al Archivo de Descarga</label>
                                <input
                                    type="url"
                                    className="mobile-input"
                                    placeholder="https://we.tl/... o https://drive.google.com/..."
                                    value={enlaceArchivo}
                                    onChange={e => setEnlaceArchivo(e.target.value)}
                                />
                            </div>

                            <div className="input-group">
                                <label className="field-lbl">Nombre del Proyecto / Tarea</label>
                                <input
                                    type="text"
                                    className="mobile-input"
                                    placeholder="Ej: Lonas Promoción Farmacia"
                                    value={nombreTarea}
                                    onChange={e => setNombreTarea(e.target.value)}
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="mobile-modal-footer">
                                <button
                                    type="button"
                                    className="mobile-btn ghost-btn"
                                    onClick={onClose}
                                    disabled={isSaving}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="mobile-btn primary-btn submit-btn"
                                    onClick={handleSaveOrder}
                                    disabled={isSaving}
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
