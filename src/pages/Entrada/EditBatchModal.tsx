import React, { useState, useEffect, useMemo } from 'react'
import Modal from '@components/ui/Modal'
import type { Order, Cliente, Logistica } from '@/types'
import { updateBatchGroup, getLogisticas } from '@data/db'
import './EditBatchModal.css'

interface EditBatchModalProps {
    isOpen: boolean
    onClose: (updated?: boolean) => void
    batchOrders: Order[]
    currentBatchName: string
    currentBatchId?: string
    clientes?: Cliente[]
    logisticas?: Logistica[]
}

interface PieceState {
    id: number | string
    ot: string
    itemDesc: string
    material?: string
    ancho?: number
    alto?: number
    copias?: number
    unlinked: boolean
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
    logisticas
}: EditBatchModalProps) {
    const [batchName, setBatchName] = useState<string>('')
    const [clientId, setClientId] = useState<string | number>('')
    const [fechaEntrega, setFechaEntrega] = useState<string>('')
    const [envio, setEnvio] = useState<string>('')
    const [observaciones, setObservaciones] = useState<string>('')
    const [pieces, setPieces] = useState<PieceState[]>([])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const availableLogisticas = useMemo(() => {
        const list = (logisticas && logisticas.length > 0) ? logisticas : getLogisticas()
        return list.filter(l => l.habilitado !== false)
    }, [logisticas])

    // Reset when modal opens or batch orders change
    useEffect(() => {
        if (isOpen && batchOrders && batchOrders.length > 0) {
            const first = batchOrders[0]
            setBatchName(currentBatchName || first.loteNombre || '')
            setClientId(first.clientId || '')
            setFechaEntrega(toInputDateFormat(first.fechaEntrega))
            setEnvio(first.envio || '')
            setObservaciones(first.observaciones || first.comments || '')
            setError(null)

            const initialPieces: PieceState[] = batchOrders.map(order => {
                let pieceName = order.descripcionItem || ''
                if (!pieceName && order.nombreTarea && order.nombreTarea.includes(' - ')) {
                    pieceName = order.nombreTarea.split(' - ').slice(1).join(' - ').trim()
                }
                if (!pieceName) {
                    pieceName = order.archivosOriginales?.[0] || order.archivos?.[0] || ''
                }
                return {
                    id: (order as any).uuid || order.id || order.ot,
                    ot: order.ot || `OT-${order.id}`,
                    itemDesc: pieceName,
                    material: order.material,
                    ancho: order.ancho,
                    alto: order.alto,
                    copias: order.copias || 1,
                    unlinked: false
                }
            })
            setPieces(initialPieces)
        }
    }, [isOpen, batchOrders, currentBatchName])

    const totalCopies = useMemo(() => {
        return batchOrders.reduce((acc, o) => acc + (Number(o.copias) || 1), 0)
    }, [batchOrders])

    const totalM2 = useMemo(() => {
        return batchOrders.reduce((acc, o) => {
            const a = Number(o.ancho) || 0
            const h = Number(o.alto) || 0
            const c = Number(o.copias) || 1
            return acc + (a * h * c)
        }, 0)
    }, [batchOrders])

    const activeCount = pieces.filter(p => !p.unlinked).length

    const handlePieceDescChange = (id: number | string, val: string) => {
        setPieces(prev => prev.map(p => p.id === id ? { ...p, itemDesc: val } : p))
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
                items: pieces.map(p => ({
                    id: p.id,
                    itemDesc: p.itemDesc,
                    unlinked: p.unlinked
                }))
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => onClose(false)}
            title="✏️ Editar Grupo / Proyecto"
            size="lg"
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
                                📦 {batchOrders.length} {batchOrders.length === 1 ? 'orden' : 'órdenes'}
                            </span>
                            <span className="edit-batch-pill highlight">
                                📐 {totalM2.toFixed(2)} m²
                            </span>
                            <span className="edit-batch-pill">
                                📄 {totalCopies} {totalCopies === 1 ? 'copia' : 'copias'}
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
                    <div className="edit-batch-field">
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

                {/* Subtasks / Pieces included in this batch */}
                <div className="edit-batch-items-section">
                    <div className="edit-batch-items-header">
                        <span className="edit-batch-items-title">
                            🧩 Piezas y Órdenes Incluidas ({activeCount} de {pieces.length})
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Podes ajustar el nombre de cada pieza o desvincularla si pertenece a otro trabajo
                        </span>
                    </div>

                    <div className="edit-batch-items-list">
                        {pieces.map((piece) => (
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

                                <div className="edit-batch-item-meta">
                                    {piece.material && (
                                        <span className="material-tag-sm" style={{ fontSize: '0.72rem' }}>
                                            {piece.material}
                                        </span>
                                    )}
                                    <span>
                                        {piece.ancho}×{piece.alto}m ({piece.copias} cop)
                                    </span>
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
                        ))}
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
