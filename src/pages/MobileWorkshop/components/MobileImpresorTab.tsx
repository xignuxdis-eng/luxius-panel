import React, { useState, useMemo } from 'react'
import { Order } from '@/types'
import {
    Printer,
    Play,
    CheckCircle2,
    ExternalLink,
    Camera,
    AlertCircle,
    Maximize2,
    RotateCw,
    Sliders,
    Sparkles,
    Flame
} from 'lucide-react'

interface MobileImpresorTabProps {
    orders: Order[]
    onSaveOrder: (order: Partial<Order>) => Promise<Order>
    onUploadPhotoProof?: (orderId: number, file: File) => Promise<string>
}

export const MobileImpresorTab: React.FC<MobileImpresorTabProps> = ({
    orders,
    onSaveOrder,
    onUploadPhotoProof
}) => {
    const [filterState, setFilterState] = useState<'cola' | 'imprimiendo' | 'terminados'>('cola')
    const [selectedOrderForPhoto, setSelectedOrderForPhoto] = useState<Order | null>(null)
    const [uploadingOrderId, setUploadingOrderId] = useState<number | null>(null)

    // Filter queue orders
    const queueOrders = useMemo(() => {
        return orders.filter(o => {
            if (filterState === 'cola') {
                return o.status === 'orden' || o.status === 'preorden'
            }
            if (filterState === 'imprimiendo') {
                return (o as any).status === 'en_proceso' || (o as any).enMaquina === true
            }
            if (filterState === 'terminados') {
                return o.status === 'impreso' || o.status === 'post' || o.status === 'completo'
            }
            return true
        })
    }, [orders, filterState])

    // Workshop Metrics
    const workshopStats = useMemo(() => {
        const colaCount = orders.filter(o => o.status === 'orden' || o.status === 'preorden').length
        const totalM2Cola = orders
            .filter(o => o.status === 'orden')
            .reduce((sum, o) => sum + (Number(o.ancho || 0) * Number(o.alto || 0) * Number(o.copias || 1)), 0)

        const impresosHoy = orders
            .filter(o => o.status === 'impreso' || o.status === 'completo')
            .length

        return {
            colaCount,
            totalM2Cola: Math.round(totalM2Cola * 10) / 10,
            impresosHoy
        }
    }, [orders])

    // Status transitions
    const handleSetInMachine = async (order: Order) => {
        try {
            await onSaveOrder({
                id: order.id,
                ot: order.ot,
                observaciones: `${order.observaciones || ''}\n[${new Date().toLocaleTimeString('es-AR')}] Cargado en plotter por operario móvil`.trim()
            })
            alert(`Orden ${order.ot || order.id} puesta en proceso de impresión.`)
        } catch (err) {
            console.error('Error updating order:', err)
        }
    }

    const handleSetPrinted = async (order: Order) => {
        try {
            await onSaveOrder({
                id: order.id,
                ot: order.ot,
                status: 'impreso',
                observaciones: `${order.observaciones || ''}\n[${new Date().toLocaleTimeString('es-AR')}] Impresión finalizada OK`.trim()
            })
        } catch (err) {
            console.error('Error updating order to impreso:', err)
        }
    }

    // Photo color proof handling
    const handlePhotoCaptured = async (e: React.ChangeEvent<HTMLInputElement>, order: Order) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingOrderId(order.id)
        try {
            // Read as data URL or upload if backend handler provided
            const reader = new FileReader()
            reader.onload = async () => {
                const dataUrl = reader.result as string
                const existingFiles = order.archivos || []
                await onSaveOrder({
                    id: order.id,
                    ot: order.ot,
                    archivos: [...existingFiles, dataUrl],
                    observaciones: `${order.observaciones || ''}\n[Foto Prueba de Color subida desde móvil]`.trim()
                })
                setUploadingOrderId(null)
                alert('¡Foto de prueba de color adjuntada con éxito a la orden!')
            }
            reader.readAsDataURL(file)
        } catch (err) {
            console.error('Error uploading photo proof:', err)
            setUploadingOrderId(null)
        }
    }

    return (
        <div className="mobile-tab-content workshop-theme">
            {/* Header Workshop Banner */}
            <div className="workshop-hero-banner">
                <div className="hero-text">
                    <div className="pill-tag">
                        <Printer size={14} />
                        <span>Módulo Plotters & Taller</span>
                    </div>
                    <h2>Cola de Impresión</h2>
                </div>
                <div className="workshop-counters">
                    <div className="counter-chip">
                        <span className="count-num">{workshopStats.colaCount}</span>
                        <span className="count-lbl">En Espera</span>
                    </div>
                    <div className="counter-chip highlight">
                        <span className="count-num">{workshopStats.totalM2Cola} m²</span>
                        <span className="count-lbl">Metros Cola</span>
                    </div>
                </div>
            </div>

            {/* Filter Buttons */}
            <div className="workshop-filter-bar">
                <button
                    className={`workshop-filter-btn ${filterState === 'cola' ? 'active' : ''}`}
                    onClick={() => setFilterState('cola')}
                >
                    <Flame size={16} />
                    <span>Por Imprimir ({workshopStats.colaCount})</span>
                </button>
                <button
                    className={`workshop-filter-btn ${filterState === 'terminados' ? 'active' : ''}`}
                    onClick={() => setFilterState('terminados')}
                >
                    <CheckCircle2 size={16} />
                    <span>Terminados ({workshopStats.impresosHoy})</span>
                </button>
            </div>

            {/* Big Touch Order Cards */}
            <div className="workshop-orders-container">
                {queueOrders.length === 0 ? (
                    <div className="workshop-empty-state">
                        <Printer size={48} color="#475569" />
                        <h3>¡Sin órdenes pendientes!</h3>
                        <p>No hay trabajos en este estado de la cola.</p>
                    </div>
                ) : (
                    queueOrders.map(o => {
                        const m2Item = Math.round(Number(o.ancho || 0) * Number(o.alto || 0) * Number(o.copias || 1) * 100) / 100
                        const downloadUrl = (o.archivos && o.archivos[0]) || (o.archivosOriginales && o.archivosOriginales[0])

                        return (
                            <div
                                key={o.id}
                                className={`workshop-order-card ${o.emergencia ? 'emergency-card' : ''}`}
                            >
                                {/* Card Header */}
                                <div className="workshop-card-header">
                                    <div className="header-left">
                                        <span className="workshop-ot-title">{o.ot || `OT-${o.id}`}</span>
                                        {o.emergencia && (
                                            <span className="urgent-badge">
                                                <Flame size={12} /> URGENTE
                                            </span>
                                        )}
                                    </div>
                                    <span className={`status-pill status-${o.status}`}>
                                        {o.status === 'orden' ? 'Listo p/ Imprimir' : o.status}
                                    </span>
                                </div>

                                {/* Client and Task Title */}
                                <div className="workshop-card-client">{o.clienteNombre}</div>
                                <div className="workshop-card-task">{o.nombreTarea || o.material}</div>

                                {/* Big Dimension Callout */}
                                <div className="workshop-specs-box">
                                    <div className="spec-item big-dimension">
                                        <span className="spec-label">Dimensiones</span>
                                        <span className="spec-value">{o.ancho} x {o.alto} m</span>
                                    </div>
                                    <div className="spec-item">
                                        <span className="spec-label">Copias</span>
                                        <span className="spec-value">{o.copias || 1} u</span>
                                    </div>
                                    <div className="spec-item">
                                        <span className="spec-label">Superficie</span>
                                        <span className="spec-value">{m2Item} m²</span>
                                    </div>
                                </div>

                                {/* Material Details */}
                                <div className="workshop-material-tag">
                                    <span>Material: <strong>{o.material}</strong></span>
                                    <span>Calidad: <strong>{o.calidad || 'Standard'}</strong></span>
                                </div>

                                {/* Bleed / Notes */}
                                {(o.observaciones || o.demasias > 0) && (
                                    <div className="workshop-notes-box">
                                        {o.demasias > 0 && <span className="bleed-pill">+{o.demasias}cm demasía</span>}
                                        <p>{o.observaciones}</p>
                                    </div>
                                )}

                                {/* File link action */}
                                {downloadUrl && (
                                    <div className="workshop-file-link-row">
                                        <a
                                            href={downloadUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="open-file-btn"
                                        >
                                            <ExternalLink size={16} />
                                            <span>Abrir Archivo de Impresión</span>
                                        </a>
                                    </div>
                                )}

                                {/* Workshop Action Buttons */}
                                <div className="workshop-actions-row">
                                    {/* Photo Proof Capture */}
                                    <label className="photo-proof-btn" title="Sacar foto de prueba de color">
                                        <Camera size={18} />
                                        <span>{uploadingOrderId === o.id ? 'Subiendo...' : 'Foto Muestra'}</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            style={{ display: 'none' }}
                                            onChange={e => handlePhotoCaptured(e, o)}
                                        />
                                    </label>

                                    {o.status !== 'impreso' && o.status !== 'completo' ? (
                                        <button
                                            type="button"
                                            className="giant-workshop-btn finish-btn"
                                            onClick={() => handleSetPrinted(o)}
                                        >
                                            <CheckCircle2 size={22} />
                                            <span>✔ Marcar Impreso</span>
                                        </button>
                                    ) : (
                                        <div className="already-printed-badge">
                                            <CheckCircle2 size={18} color="#10b981" />
                                            <span>Trabajo Impreso</span>
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
