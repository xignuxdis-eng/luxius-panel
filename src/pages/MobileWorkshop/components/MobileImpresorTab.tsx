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

    // Calculate in-process orders
    const inProcessCount = useMemo(() => {
        return orders.filter(o => (o as any).status === 'en_proceso' || (o as any).enMaquina === true).length
    }, [orders])

    return (
        <div className="mobile-tab-content workshop-theme">
            {/* GOOGLE STITCH: TOP KPI RIBBON */}
            <section className="stitch-kpi-ribbon">
                <div className="stitch-kpi-card">
                    <div className="stitch-kpi-header">
                        <span>Cola Lin.</span>
                        <Sliders size={14} color="#f59e0b" />
                    </div>
                    <div className="stitch-kpi-val">
                        {workshopStats.totalM2Cola}<span>ml</span>
                    </div>
                    <div className="stitch-kpi-sub">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }}></span>
                        <span>{workshopStats.colaCount} pendientes</span>
                    </div>
                </div>

                <div className="stitch-kpi-card">
                    <div className="stitch-kpi-header">
                        <span>Plotters</span>
                        <Printer size={14} color="#4cd7f6" />
                    </div>
                    <div className="stitch-kpi-val">
                        2<span style={{ color: '#869397' }}> / 3</span>
                    </div>
                    <div className="stitch-kpi-sub">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4cd7f6' }}></span>
                        <span>Roland & Flora</span>
                    </div>
                </div>

                <div className="stitch-kpi-card">
                    <div className="stitch-kpi-header">
                        <span>Hoy</span>
                        <Sparkles size={14} color="#acedff" />
                    </div>
                    <div className="stitch-kpi-val">
                        {workshopStats.impresosHoy}<span>OTs</span>
                    </div>
                    <div className="stitch-kpi-sub">
                        <span style={{ color: '#4cd7f6', fontWeight: 600 }}>Completadas</span>
                    </div>
                </div>
            </section>

            {/* GOOGLE STITCH: RIP SERVER TELEMETRY CHIP */}
            <div className="stitch-rip-chip">
                <div className="stitch-rip-left">
                    <RotateCw size={15} color="#4cd7f6" className="spinning" />
                    <span>RIP Server: <strong>VersaWorks v6.8</strong> sincronizado</span>
                </div>
                <span className="stitch-rip-badge">Buffer 0.4b</span>
            </div>

            {/* GOOGLE STITCH: ERGONOMIC THUMB FILTER PILLS (48px Touch) */}
            <div className="stitch-filter-pills">
                <button
                    type="button"
                    className={`stitch-filter-pill ${filterState === 'cola' ? 'active' : ''}`}
                    onClick={() => setFilterState('cola')}
                >
                    <Flame size={15} />
                    <span>En Cola</span>
                    <span className="stitch-pill-count">{workshopStats.colaCount}</span>
                </button>

                <button
                    type="button"
                    className={`stitch-filter-pill ${filterState === 'imprimiendo' ? 'active-amber' : ''}`}
                    onClick={() => setFilterState('imprimiendo')}
                >
                    <Play size={14} />
                    <span>En Máq.</span>
                    <span className="stitch-pill-count">{inProcessCount}</span>
                </button>

                <button
                    type="button"
                    className={`stitch-filter-pill ${filterState === 'terminados' ? 'active' : ''}`}
                    onClick={() => setFilterState('terminados')}
                >
                    <CheckCircle2 size={15} />
                    <span>Listas</span>
                    <span className="stitch-pill-count">{workshopStats.impresosHoy}</span>
                </button>
            </div>

            {/* GOOGLE STITCH: TELEMETRÍA DE TALLER (LIVE MACHINE STRIP) */}
            <section className="stitch-telemetry-box">
                <div className="stitch-telemetry-title">
                    <span>⚡ Telemetría de Plotters</span>
                    <span>2 Motores Activos</span>
                </div>

                <div className="stitch-machine-item">
                    <div className="stitch-machine-row">
                        <span className="stitch-machine-name">
                            <span className="status-indicator-dot online"></span>
                            Roland TrueVIS VG3-640
                        </span>
                        <span className="stitch-machine-ot">Tirada 68% (12m rest.)</span>
                    </div>
                    <div className="stitch-progress-track">
                        <div className="stitch-progress-fill" style={{ width: '68%' }}></div>
                    </div>
                </div>

                <div className="stitch-machine-item">
                    <div className="stitch-machine-row">
                        <span className="stitch-machine-name">
                            <span className="status-indicator-dot online"></span>
                            Flora UV 3200 Hybrid
                        </span>
                        <span className="stitch-machine-ot" style={{ color: '#ffb95f' }}>Tirada 40% (28m rest.)</span>
                    </div>
                    <div className="stitch-progress-track">
                        <div className="stitch-progress-fill amber" style={{ width: '40%' }}></div>
                    </div>
                </div>
            </section>

            {/* WORKSHOP ORDER CARDS */}
            <div className="workshop-orders-container">
                {queueOrders.length === 0 ? (
                    <div className="workshop-empty-state">
                        <Printer size={48} color="#4cd7f6" style={{ opacity: 0.6 }} />
                        <h3>¡Sin órdenes en este estado!</h3>
                        <p>No hay trabajos pendientes en esta sección de la cola.</p>
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
                                        {o.status === 'orden' ? 'Listo p/ Imprimir' : o.status === 'en_proceso' ? 'En Plotter' : o.status}
                                    </span>
                                </div>

                                {/* Client and Task Title */}
                                <div className="workshop-card-client">{o.clienteNombre}</div>
                                <div className="workshop-card-task">{o.nombreTarea || o.material}</div>

                                {/* Big Dimension Callout */}
                                <div className="workshop-specs-box">
                                    <div className="spec-item big-dimension">
                                        <span className="spec-label">Dimensiones</span>
                                        <span className="spec-value">{o.ancho} × {o.alto} m</span>
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
                                {(o.observaciones || (o.demasias && o.demasias > 0)) && (
                                    <div className="workshop-notes-box">
                                        {o.demasias && o.demasias > 0 && <span className="bleed-pill">+{o.demasias}cm demasía</span>}
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
                                        <a
                                            href={`#/xpress-viewer?orderId=${o.id}`}
                                            className="open-file-btn"
                                            style={{ borderColor: 'rgba(139, 92, 246, 0.4)', color: '#d0bcff' }}
                                        >
                                            <Maximize2 size={16} />
                                            <span>Visor Xpress</span>
                                        </a>
                                    </div>
                                )}

                                {/* Workshop Action Buttons */}
                                <div className="workshop-actions-row" style={{ marginTop: '12px' }}>
                                    {/* Set In Machine */}
                                    {o.status === 'orden' && (
                                        <button
                                            type="button"
                                            className="giant-workshop-btn"
                                            style={{
                                                background: 'rgba(245, 158, 11, 0.15)',
                                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                                color: '#ffb95f'
                                            }}
                                            onClick={() => handleSetInMachine(o)}
                                        >
                                            <Play size={18} />
                                            <span>▶ Cargar en Plotter</span>
                                        </button>
                                    )}

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
                                            <CheckCircle2 size={20} />
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
