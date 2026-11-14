import React, { useState, useEffect, useMemo, useRef } from 'react'
import Modal from '@components/ui/Modal'
import type { Order, Cliente, Logistica, Material } from '@/types'
import { updateBatchGroup, getLogisticas, getMateriales } from '@data/db'
import {
    calculateItemPriceDetailed,
    applyCustomPriceOverride,
    resolveItemCustomSubtotal,
    round2,
    type CustomPriceOverrideMode,
    type PriceCalculationResult
} from '@/utils/pricingCalculator'
import { findMatchingMaterial } from '@/utils/stockForecast'
import { calculateOrderPrice } from './utils/entradaCalculations'
import './EditBatchModal.css'

interface EditBatchModalProps {
    isOpen: boolean
    onClose: (updated?: boolean) => void
    batchOrders: Order[]
    currentBatchName: string
    currentBatchId?: string
    clientes?: Cliente[]
    logisticas?: Logistica[]
    materiales?: Material[]
}

interface PieceState {
    id: number | string
    ot: string
    itemDesc: string
    material: string
    ancho: number
    alto: number
    copias: number
    subtotal: number
    customPriceInput: string
    isPiecePriceManual: boolean
    priceDirty: boolean
    unlinked: boolean
    orderRef: Order
}

interface ComputedPiece {
    piece: PieceState
    priceResult: PriceCalculationResult
    m2: number
    ml: number
    autoSubtotal: number
    effectiveSubtotal: number
    isCustom: boolean
    modalMode?: 'final' | 'm2' | 'ml'
    modalVal?: number
    hasPricingUpdate: boolean
}

function buildManualPrecioDetalle(
    base: PriceCalculationResult,
    effectiveSubtotal: number,
    ml: number,
    modalMode: 'final' | 'm2' | 'ml',
    modalVal: number | undefined
): Order['precioDetalle'] {
    const baseDetalle = base.precioDetalle
    return {
        ...(baseDetalle || { tipoCobro: modalMode === 'ml' ? 'ml' : 'm2' }),
        tipoCobro: modalMode === 'm2' ? 'm2' : (modalMode === 'ml' ? 'ml' : (baseDetalle?.tipoCobro || 'm2')),
        precioM2: modalMode === 'm2' ? modalVal : baseDetalle?.precioM2,
        precioML: modalMode === 'ml' ? modalVal : baseDetalle?.precioML,
        consumoML: modalMode === 'ml' ? ml : baseDetalle?.consumoML,
        costoBase: Math.max(0, Math.round(effectiveSubtotal - (base.servicesTotal ?? 0))),
        modalidadManual: modalMode,
        valorManual: modalVal,
    }
}

function toInputDateFormat(dateStr?: string): string {
    if (!dateStr) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split('/')
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0]
    }
    return ''
}

export default function EditBatchModal({
    isOpen,
    onClose,
    batchOrders,
    currentBatchName,
    currentBatchId,
    clientes = [],
    logisticas,
    materiales
}: EditBatchModalProps) {
    const [batchName, setBatchName] = useState<string>('')
    const [clientId, setClientId] = useState<string | number>('')
    const [fechaEntrega, setFechaEntrega] = useState<string>('')
    const [envio, setEnvio] = useState<string>('')
    const [observaciones, setObservaciones] = useState<string>('')
    const [batchMaterial, setBatchMaterial] = useState<string>('')
    const [priceOverrideMode, setPriceOverrideMode] = useState<CustomPriceOverrideMode>('auto')
    const [priceOverrideValue, setPriceOverrideValue] = useState<number | null>(null)
    const [isBatchPriceModified, setIsBatchPriceModified] = useState<boolean>(false)
    const [pieces, setPieces] = useState<PieceState[]>([])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const lastInitKeyRef = useRef<string | null>(null)

    const availableLogisticas = useMemo(() => {
        const list = (logisticas && logisticas.length > 0) ? logisticas : getLogisticas()
        return list.filter(l => l.habilitado !== false)
    }, [logisticas])

    const availableMaterials = useMemo(() => {
        const list = (materiales && materiales.length > 0) ? materiales : getMateriales()
        return list.filter(m => m.habilitado !== false)
    }, [materiales])

    // Reset solo cuando se abre el modal o cambia el lote seleccionado
    useEffect(() => {
        if (!isOpen) {
            lastInitKeyRef.current = null
            return
        }
        if (!batchOrders || batchOrders.length === 0) return

        const initKey = `${currentBatchId || ''}|${currentBatchName}|${batchOrders.map(o => o.id || o.ot).join(',')}`
        if (lastInitKeyRef.current === initKey) return
        lastInitKeyRef.current = initKey

        const first = batchOrders[0]
            setBatchName(currentBatchName || first.loteNombre || '')
            setClientId(first.clientId || '')
            setFechaEntrega(toInputDateFormat(first.fechaEntrega))
            setEnvio(first.envio || '')
            setObservaciones(first.observaciones || first.comments || '')
            setError(null)
            setIsBatchPriceModified(false)

            const distinctMats = Array.from(new Set(batchOrders.map(o => (o.material || '').trim()).filter(Boolean)))
            setBatchMaterial(distinctMats.length === 1 ? distinctMats[0] : '')

            // Detectar si todo el lote comparte una modalidad manual ($/m², $/ml o $ Final)
            const manualModes = batchOrders
                .map(o => o.precioDetalle?.modalidadManual)
                .filter((m): m is 'final' | 'm2' | 'ml' => m === 'final' || m === 'm2' || m === 'ml')
            const manualValues = batchOrders
                .map(o => o.precioDetalle?.valorManual)
                .filter((v): v is number => typeof v === 'number' && v > 0)

            const hasSharedRateMode =
                manualModes.length === batchOrders.length &&
                new Set(manualModes).size === 1 &&
                manualValues.length === batchOrders.length &&
                new Set(manualValues).size === 1

            if (hasSharedRateMode) {
                setPriceOverrideMode(manualModes[0])
                setPriceOverrideValue(manualValues[0])
            } else {
                setPriceOverrideMode('auto')
                setPriceOverrideValue(null)
            }

            const initialPieces: PieceState[] = batchOrders.map(order => {
                let pieceName = order.descripcionItem || ''
                if (!pieceName && order.nombreTarea && order.nombreTarea.includes(' - ')) {
                    pieceName = order.nombreTarea.split(' - ').slice(1).join(' - ').trim()
                }
                if (!pieceName) {
                    pieceName = order.archivosOriginales?.[0] || order.archivos?.[0] || ''
                }
                const initialSubtotal = calculateOrderPrice(order, availableMaterials, clientes)
                const manualPrice = order.precioUnitarioManual ?? (order as any).precio_manual ?? (order as any).precioManual
                const hasManualPiece = Boolean(!hasSharedRateMode && manualPrice !== undefined && manualPrice !== null && Number(manualPrice) > 0)

                return {
                    id: (order as any).uuid || order.id || order.ot,
                    ot: order.ot || `OT-${order.id}`,
                    itemDesc: pieceName,
                    material: order.material || '',
                    ancho: Number(order.ancho) || 0,
                    alto: Number(order.alto) || 0,
                    copias: Number(order.copias) || 1,
                    subtotal: initialSubtotal,
                    customPriceInput: String(initialSubtotal),
                    isPiecePriceManual: hasManualPiece,
                    priceDirty: false,
                    unlinked: false,
                    orderRef: order
                }
            })
            setPieces(initialPieces)
    }, [isOpen, batchOrders, currentBatchName, currentBatchId, availableMaterials, clientes])

    const { computedPieces, totalCopies, totalM2, totalMl, autoBatchTotal, activeBatchTotal, pricingSummary } = useMemo(() => {
        const baseCalcs = pieces.map(piece => {
            const matchedMat = findMatchingMaterial(piece.material, availableMaterials)
            const matCode = matchedMat?.codigo || piece.material || ''
            const effectiveClientId = clientId || piece.orderRef.clientId
            const priceResult = calculateItemPriceDetailed(
                matCode,
                piece.ancho,
                piece.alto,
                piece.copias,
                piece.orderRef.servicios,
                effectiveClientId,
                piece.orderRef.demasiasConfig,
                Boolean(piece.orderRef.esParticular)
            )
            const w = round2(piece.ancho > 20 ? piece.ancho / 100 : piece.ancho)
            const h = round2(piece.alto > 20 ? piece.alto / 100 : piece.alto)
            const c = Math.max(1, piece.copias || 1)
            const m2 = (priceResult.consumoM2 && priceResult.consumoM2 > 0) ? priceResult.consumoM2 : round2(w * h * c)
            const ml = (priceResult.consumoML && priceResult.consumoML > 0) ? priceResult.consumoML : round2(h * c)

            return {
                piece,
                priceResult,
                m2,
                ml,
                autoSubtotal: priceResult.subtotal > 0 ? priceResult.subtotal : piece.subtotal,
                servicesTotal: priceResult.servicesTotal ?? 0
            }
        })

        const activeBase = baseCalcs.filter(c => !c.piece.unlinked)
        const poolAutoTotal = activeBase
            .filter(c => !c.piece.isPiecePriceManual)
            .reduce((acc, c) => acc + c.autoSubtotal, 0)
        const activeNonManualCount = activeBase.filter(c => !c.piece.isPiecePriceManual).length
        const manualPoolSum = activeBase
            .filter(c => c.piece.isPiecePriceManual)
            .reduce((acc, c) => acc + Math.max(0, Math.round(Number(c.piece.customPriceInput) || 0)), 0)

        const targetFinalForAutoPool = priceOverrideMode === 'final' && priceOverrideValue !== null
            ? Math.max(0, Math.round(priceOverrideValue) - manualPoolSum)
            : 0

        let allocatedFinal = 0
        let seenAutoPoolIdx = 0

        const computed: ComputedPiece[] = baseCalcs.map(entry => {
            const { piece, priceResult, m2, ml, autoSubtotal, servicesTotal } = entry
            const materialChanged = (piece.material || '') !== (piece.orderRef.material || '')
            const clientChanged = String(clientId || '') !== String(piece.orderRef.clientId || '')

            let effectiveSubtotal = piece.subtotal
            let isCustom = false
            let modalMode: 'final' | 'm2' | 'ml' | undefined
            let modalVal: number | undefined

            if (piece.isPiecePriceManual) {
                effectiveSubtotal = Math.max(0, Math.round(Number(piece.customPriceInput) || 0))
                isCustom = true
                modalMode = 'final'
                modalVal = effectiveSubtotal
            } else if (piece.unlinked) {
                effectiveSubtotal = (materialChanged || clientChanged) ? autoSubtotal : piece.subtotal
            } else if (priceOverrideMode !== 'auto' && priceOverrideValue !== null && priceOverrideValue >= 0) {
                isCustom = true
                modalMode = priceOverrideMode
                modalVal = priceOverrideValue
                if (priceOverrideMode === 'final') {
                    seenAutoPoolIdx += 1
                    if (seenAutoPoolIdx === activeNonManualCount) {
                        effectiveSubtotal = Math.max(0, Math.round(targetFinalForAutoPool - allocatedFinal))
                    } else {
                        effectiveSubtotal = resolveItemCustomSubtotal(
                            'final',
                            targetFinalForAutoPool,
                            { m2, ml, autoSubtotal, servicesTotal },
                            poolAutoTotal,
                            activeNonManualCount
                        )
                    }
                    allocatedFinal += effectiveSubtotal
                } else {
                    effectiveSubtotal = resolveItemCustomSubtotal(
                        priceOverrideMode,
                        priceOverrideValue,
                        { m2, ml, autoSubtotal, servicesTotal },
                        poolAutoTotal,
                        activeNonManualCount
                    )
                }
            } else if (isBatchPriceModified || materialChanged || clientChanged) {
                effectiveSubtotal = autoSubtotal
            } else {
                effectiveSubtotal = piece.subtotal
            }

            const hasPricingUpdate = Boolean(
                piece.isPiecePriceManual ||
                piece.priceDirty ||
                (!piece.unlinked && isBatchPriceModified) ||
                materialChanged ||
                clientChanged
            )

            return {
                piece,
                priceResult,
                m2,
                ml,
                autoSubtotal,
                effectiveSubtotal,
                isCustom,
                modalMode,
                modalVal,
                hasPricingUpdate
            }
        })

        const activeComputed = computed.filter(c => !c.piece.unlinked)
        const copiesSum = activeComputed.reduce((acc, c) => acc + c.piece.copias, 0)
        const m2Sum = round2(activeComputed.reduce((acc, c) => acc + c.m2, 0))
        const mlSum = round2(activeComputed.reduce((acc, c) => acc + c.ml, 0))
        const autoSum = Math.round(activeComputed.reduce((acc, c) => acc + c.autoSubtotal, 0))
        const totalSum = Math.round(activeComputed.reduce((acc, c) => acc + c.effectiveSubtotal, 0))

        const summary = applyCustomPriceOverride(
            priceOverrideMode,
            priceOverrideValue,
            activeComputed.map(c => ({
                m2: c.m2,
                ml: c.ml,
                autoSubtotal: c.autoSubtotal,
                servicesTotal: c.priceResult.servicesTotal ?? 0
            }))
        )

        return {
            computedPieces: computed,
            totalCopies: copiesSum,
            totalM2: m2Sum,
            totalMl: mlSum,
            autoBatchTotal: autoSum,
            activeBatchTotal: totalSum,
            pricingSummary: summary
        }
    }, [pieces, availableMaterials, clientId, priceOverrideMode, priceOverrideValue, isBatchPriceModified])

    const activeCount = pieces.filter(p => !p.unlinked).length

    const handlePieceDescChange = (id: number | string, val: string) => {
        setPieces(prev => prev.map(p => p.id === id ? { ...p, itemDesc: val } : p))
    }

    const handleBatchMaterialChange = (matCode: string) => {
        setBatchMaterial(matCode)
        if (!matCode) return
        setPieces(prev => prev.map(p =>
            p.unlinked ? p : { ...p, material: matCode, priceDirty: true }
        ))
    }

    const handlePieceMaterialChange = (id: number | string, matCode: string) => {
        setBatchMaterial('')
        setPieces(prev => prev.map(p =>
            p.id === id ? { ...p, material: matCode, priceDirty: true } : p
        ))
    }

    const handlePiecePriceChange = (id: number | string, rawValue: string) => {
        const numVal = Math.max(0, Math.round(parseFloat(rawValue) || 0))
        const snapshotMap = new Map(computedPieces.map(cp => [cp.piece.id, cp.effectiveSubtotal]))
        const transitioningFromBatchMode = priceOverrideMode !== 'auto'
        if (transitioningFromBatchMode) {
            setPriceOverrideMode('auto')
            setPriceOverrideValue(null)
            setIsBatchPriceModified(false)
        }
        setPieces(prev => prev.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    subtotal: numVal,
                    customPriceInput: rawValue,
                    isPiecePriceManual: true,
                    priceDirty: true,
                }
            }
            const currentVal = snapshotMap.get(p.id) ?? p.subtotal
            return {
                ...p,
                subtotal: currentVal,
                customPriceInput: String(currentVal),
                priceDirty: p.priceDirty || (transitioningFromBatchMode && !p.unlinked),
            }
        }))
    }

    const handleSelectPriceMode = (mode: CustomPriceOverrideMode) => {
        setIsBatchPriceModified(true)
        setPieces(prev => prev.map(p =>
            p.unlinked ? p : { ...p, isPiecePriceManual: false, priceDirty: true }
        ))

        if (mode === 'auto') {
            setPriceOverrideMode('auto')
            setPriceOverrideValue(null)
            return
        }

        if (priceOverrideMode === mode && priceOverrideValue !== null) return

        const firstActiveMatCode = pieces.find(p => !p.unlinked)?.material || batchMaterial
        const mat = findMatchingMaterial(firstActiveMatCode, availableMaterials)
        let initialVal = 0
        if (mode === 'm2') {
            initialVal = pricingSummary.effectiveRateM2 || mat?.precioM2 || 0
        } else if (mode === 'ml') {
            initialVal = pricingSummary.effectiveRateML || mat?.bobinas?.[0]?.precioML || 0
        } else {
            initialVal = activeBatchTotal || autoBatchTotal || 0
        }
        setPriceOverrideMode(mode)
        setPriceOverrideValue(initialVal)
    }

    const handleToggleUnlink = (id: number | string) => {
        setPieces(prev => prev.map(p => p.id === id ? { ...p, unlinked: !p.unlinked } : p))
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmedName = batchName.trim()
        if (!trimmedName) {
            setError('Por favor ingrese un nombre para el proyecto / lote.')
            return
        }

        if (activeCount === 0) {
            setError('No puede desvincular todas las órdenes del lote a la vez. Al menos una debe permanecer.')
            return
        }

        setSaving(true)
        setError(null)

        try {
            const selectedClient = clientes.find(c => String(c.id) === String(clientId))

            await updateBatchGroup(batchOrders, {
                batchId: currentBatchId,
                batchName: trimmedName,
                clientId: clientId ? Number(clientId) : undefined,
                clienteNombre: selectedClient?.nombre,
                fechaEntrega: fechaEntrega || undefined,
                envio: envio.trim() || undefined,
                observaciones: observaciones.trim() || undefined,
                items: computedPieces.map(cp => {
                    const baseItem = {
                        id: cp.piece.id,
                        itemDesc: cp.piece.itemDesc,
                        unlinked: cp.piece.unlinked,
                        material: cp.piece.material,
                    }

                    if (!cp.hasPricingUpdate) {
                        return baseItem
                    }

                    const paid = Number(cp.piece.orderRef.montoPagado ?? cp.piece.orderRef.sena ?? cp.piece.orderRef.senaMonto ?? 0)
                    const saldo = Math.max(0, Math.round((cp.effectiveSubtotal - paid) * 100) / 100)
                    const precioDetalle = (cp.isCustom && cp.modalMode)
                        ? buildManualPrecioDetalle(cp.priceResult, cp.effectiveSubtotal, cp.ml, cp.modalMode, cp.modalVal)
                        : cp.priceResult.precioDetalle

                    return {
                        ...baseItem,
                        subtotal: cp.effectiveSubtotal,
                        total: cp.effectiveSubtotal,
                        precioUnitarioManual: cp.isCustom ? cp.effectiveSubtotal : null,
                        precioMl: (cp.modalMode === 'ml' && cp.modalVal !== undefined) ? cp.modalVal : cp.priceResult.precioMl,
                        bobinaAsignada: cp.priceResult.bobinaAsignada,
                        consumoEstimado: cp.priceResult.consumoEstimado,
                        precioDetalle,
                        saldoPendiente: saldo,
                    }
                })
            })

            onClose(true)
        } catch (err: any) {
            console.error('Error al actualizar el grupo:', err)
            setError(err?.message || 'Error al guardar los cambios del grupo en el servidor.')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    const effectiveRateM2 = totalM2 > 0 ? Math.round(Math.max(0, activeBatchTotal - pricingSummary.servicesTotal) / totalM2) : 0
    const effectiveRateML = totalMl > 0 ? Math.round(Math.max(0, activeBatchTotal - pricingSummary.servicesTotal) / totalMl) : 0

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => onClose(false)}
            title="✏️ Editar Grupo / Material y Precios"
            size="xl"
        >
            <form onSubmit={handleSave} className="edit-batch-modal">
                {/* Header Information Strip */}
                <div className="edit-batch-header-strip">
                    <div className="edit-batch-header-left">
                        <span className="edit-batch-title-tag">
                            🏷️ {currentBatchName || 'Lote de Producción'}
                        </span>
                        <div className="edit-batch-pills">
                            <span className="edit-batch-pill">
                                📦 {activeCount} {activeCount === 1 ? 'orden' : 'órdenes'}
                            </span>
                            <span className="edit-batch-pill highlight">
                                📐 {totalM2.toFixed(2)} m² · {totalMl.toFixed(2)} ml
                            </span>
                            <span className="edit-batch-pill">
                                📄 {totalCopies} {totalCopies === 1 ? 'copia' : 'copias'}
                            </span>
                            <span className="edit-batch-pill price-total">
                                💰 ${activeBatchTotal.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>
                    {batchOrders[0]?.clienteNombre && (
                        <div className="edit-batch-pill" style={{ color: '#93c5fd', borderColor: 'rgba(96, 165, 250, 0.3)' }}>
                            🏢 {batchOrders[0].clienteNombre}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="edit-batch-error">
                        ⚠️ {error}
                    </div>
                )}

                {/* Form Fields Grid */}
                <div className="edit-batch-form-grid">
                    {/* Project Name (Full Width) */}
                    <div className="edit-batch-field full-width">
                        <label>
                            🏷️ Nombre del Proyecto / Lote <span style={{ color: '#f87171' }}>*</span>
                            <span className="field-hint">(Modifica la identificación del grupo y el encabezado de todas sus órdenes)</span>
                        </label>
                        <input
                            type="text"
                            className="edit-batch-input"
                            value={batchName}
                            onChange={(e) => setBatchName(e.target.value)}
                            placeholder="Ej. Cartelería Local Mosto / Campaña Promocional"
                            autoFocus
                            required
                        />
                    </div>

                    {/* Cliente */}
                    <div className="edit-batch-field">
                        <label>
                            🏢 Cliente Asociado
                            <span className="field-hint">(Afecta a todo el lote)</span>
                        </label>
                        <select
                            className="edit-batch-select"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                        >
                            <option value="">-- Seleccionar Cliente --</option>
                            {clientes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre} {c.empresa ? `(${c.empresa})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Material Global del Grupo */}
                    <div className="edit-batch-field">
                        <label>
                            🎨 Cambiar Material a Todo el Grupo
                            <span className="field-hint">(Opcional: actualiza piezas activas)</span>
                        </label>
                        <select
                            className="edit-batch-select"
                            value={batchMaterial}
                            onChange={(e) => handleBatchMaterialChange(e.target.value)}
                        >
                            <option value="">-- Mantener material por pieza / Mixto --</option>
                            {availableMaterials.map(m => (
                                <option key={m.codigo} value={m.codigo}>
                                    {m.codigo} — {m.descripcion || m.codigo}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Fecha de Entrega */}
                    <div className="edit-batch-field">
                        <label>
                            📅 Fecha de Entrega Estimada
                        </label>
                        <input
                            type="date"
                            className="edit-batch-input"
                            value={fechaEntrega}
                            onChange={(e) => setFechaEntrega(e.target.value)}
                        />
                    </div>

                    {/* Forma de Envío */}
                    <div className="edit-batch-field">
                        <label>
                            🚚 Forma de Envío / Logística
                        </label>
                        <select
                            className="edit-batch-select"
                            value={envio}
                            onChange={(e) => setEnvio(e.target.value)}
                        >
                            <option value="">-- Retiro en Local / Sin especificar --</option>
                            {availableLogisticas.map(l => (
                                <option key={l.id} value={l.nombre}>
                                    {l.nombre}
                                </option>
                            ))}
                            {envio && !availableLogisticas.some(l => l.nombre.trim().toLowerCase() === envio.trim().toLowerCase()) && (
                                <option value={envio}>
                                    {envio} (Personalizado)
                                </option>
                            )}
                        </select>
                    </div>

                    {/* Observaciones Generales */}
                    <div className="edit-batch-field full-width">
                        <label>
                            📝 Observaciones Generales
                        </label>
                        <input
                            type="text"
                            className="edit-batch-input"
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            placeholder="Notas o especificaciones para el taller..."
                        />
                    </div>
                </div>

                {/* Personalización de Precio del Grupo / Órdenes */}
                <div className="edit-batch-pricing-box">
                    <div className="edit-batch-pricing-header">
                        <div>
                            <div className="edit-batch-pricing-title">
                                💰 Personalización de Precio del Grupo / Órdenes
                            </div>
                            <div className="edit-batch-pricing-subtitle">
                                Elegí recalcular por tarifario, fijar precio por m², m lineal, monto final del lote o editar cada orden abajo
                            </div>
                        </div>
                        <div className="edit-batch-pricing-total-display">
                            <span className="total-label">Total del Grupo</span>
                            <span className="total-value">
                                ${activeBatchTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {autoBatchTotal > 0 && Math.abs(activeBatchTotal - autoBatchTotal) >= 1 && (
                                <span className="auto-compare" title="Total calculado automáticamente por tarifario">
                                    Tarifario: ${autoBatchTotal.toLocaleString('es-AR')}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="edit-batch-price-modes">
                        {([
                            { id: 'auto', label: '⚡ Tarifario Auto', title: 'Calcular automáticamente según tarifario y precios especiales del cliente' },
                            { id: 'm2', label: '📐 Por m² ($/m²)', title: 'Fijar tarifa única por metro cuadrado para todas las piezas activas' },
                            { id: 'ml', label: '📏 Por m Lineal ($/ml)', title: 'Fijar tarifa única por metro lineal para todas las piezas activas' },
                            { id: 'final', label: '💰 Precio Final ($)', title: 'Fijar monto total final acordado y distribuirlo entre las piezas activas' },
                        ] as const).map(opt => {
                            const isActive = priceOverrideMode === opt.id
                            const isAutoActive = opt.id === 'auto' && isActive
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleSelectPriceMode(opt.id)}
                                    title={opt.title}
                                    className={`edit-batch-price-mode-btn ${isActive ? (isAutoActive ? 'active-auto' : 'active-manual') : ''}`}
                                >
                                    {opt.label}
                                </button>
                            )
                        })}
                    </div>

                    {priceOverrideMode !== 'auto' ? (
                        <div className="edit-batch-price-input-row">
                            <span className="currency-prefix">$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="edit-batch-price-rate-input"
                                value={priceOverrideValue === null ? '' : priceOverrideValue}
                                onChange={(e) => {
                                    const val = e.target.value === '' ? null : parseFloat(e.target.value)
                                    setIsBatchPriceModified(true)
                                    setPriceOverrideValue(val)
                                    setPieces(prev => prev.map(p =>
                                        p.unlinked ? p : { ...p, isPiecePriceManual: false, priceDirty: true }
                                    ))
                                }}
                                placeholder="0.00"
                            />
                            <span className="rate-unit">
                                {priceOverrideMode === 'm2' ? '/ m²' : priceOverrideMode === 'ml' ? '/ ml' : 'Total Final'}
                            </span>
                            {priceOverrideMode !== 'final' ? (
                                <span className="rate-breakdown">
                                    × {priceOverrideMode === 'm2' ? `${totalM2.toFixed(2)} m²` : `${totalMl.toFixed(2)} ml`}
                                    {pricingSummary.servicesTotal > 0 ? ` + $${pricingSummary.servicesTotal.toLocaleString('es-AR')} serv.` : ''}
                                    {` = $${activeBatchTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </span>
                            ) : (
                                (totalM2 > 0 || totalMl > 0) && (
                                    <span className="rate-breakdown">
                                        Equivale a ~${effectiveRateM2.toLocaleString('es-AR')}/m² · ~${effectiveRateML.toLocaleString('es-AR')}/ml
                                    </span>
                                )
                            )}
                        </div>
                    ) : (
                        (totalM2 > 0 || totalMl > 0) && (
                            <div className="edit-batch-auto-hint">
                                {totalM2.toFixed(2)} m² · {totalMl.toFixed(2)} ml · Promedio efectivo: ~${effectiveRateM2.toLocaleString('es-AR')}/m² · ~${effectiveRateML.toLocaleString('es-AR')}/ml
                            </div>
                        )
                    )}
                </div>

                {/* Subtasks / Pieces included in this batch */}
                <div className="edit-batch-items-section">
                    <div className="edit-batch-items-header">
                        <span className="edit-batch-items-title">
                            🧩 Piezas y Órdenes Incluidas ({activeCount} de {pieces.length})
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Editá nombre, material o precio individual por orden, o desvinculá una pieza del grupo
                        </span>
                    </div>

                    <div className="edit-batch-items-list">
                        {computedPieces.map(({ piece, effectiveSubtotal, isCustom }) => {
                            const hasDirectMatOption = availableMaterials.some(m => m.codigo === piece.material)
                            const displayedPriceVal = piece.isPiecePriceManual ? piece.customPriceInput : String(effectiveSubtotal)

                            return (
                                <div key={piece.id} className={`edit-batch-item-row ${piece.unlinked ? 'unlinked' : ''}`}>
                                    <span className="edit-batch-item-ot">
                                        {piece.ot}
                                    </span>

                                    <input
                                        type="text"
                                        className="edit-batch-item-input"
                                        value={piece.itemDesc}
                                        disabled={piece.unlinked}
                                        onChange={(e) => handlePieceDescChange(piece.id, e.target.value)}
                                        placeholder="Nombre / Descripción de la pieza (ej. Lateral, Frente)"
                                        title="Nombre individual de esta pieza dentro del proyecto"
                                    />

                                    <select
                                        className="edit-batch-item-material-select"
                                        value={piece.material}
                                        disabled={piece.unlinked}
                                        onChange={(e) => handlePieceMaterialChange(piece.id, e.target.value)}
                                        title="Material de esta pieza"
                                    >
                                        {!hasDirectMatOption && piece.material && (
                                            <option value={piece.material}>{piece.material}</option>
                                        )}
                                        {!piece.material && <option value="">Material...</option>}
                                        {availableMaterials.map(m => (
                                            <option key={m.codigo} value={m.codigo}>
                                                {m.codigo} — {m.descripcion || m.codigo}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="edit-batch-item-meta">
                                        <span>
                                            {piece.ancho}×{piece.alto}m ({piece.copias} cop)
                                        </span>
                                    </div>

                                    <div className="edit-batch-item-price-wrap" title="Precio individual de esta orden">
                                        <span className="currency">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            disabled={piece.unlinked}
                                            className={`edit-batch-item-price-input ${(piece.isPiecePriceManual || isCustom) ? 'is-custom' : ''}`}
                                            value={displayedPriceVal}
                                            onChange={(e) => handlePiecePriceChange(piece.id, e.target.value)}
                                        />
                                    </div>

                                    {piece.unlinked ? (
                                        <button
                                            type="button"
                                            className="edit-batch-item-relink-btn"
                                            onClick={() => handleToggleUnlink(piece.id)}
                                            title="Reincorporar esta orden al grupo"
                                        >
                                            ↩ Reincorporar
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="edit-batch-item-unlink-btn"
                                            onClick={() => handleToggleUnlink(piece.id)}
                                            title="Desvincular esta orden del lote para gestionarla de forma individual"
                                        >
                                            ✕ Desvincular
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="edit-batch-footer">
                    <button
                        type="button"
                        className="edit-batch-btn-cancel"
                        onClick={() => onClose(false)}
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="edit-batch-btn-save"
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin">⏳</span> Guardando...
                            </>
                        ) : (
                            <>
                                <span>💾</span> Guardar Cambios del Grupo
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
