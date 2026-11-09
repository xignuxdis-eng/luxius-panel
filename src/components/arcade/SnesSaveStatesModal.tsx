import React, { useState, useEffect, useRef } from 'react'
import {
    SnesSaveSlot,
    listGameStates,
    saveGameState,
    loadGameState,
    deleteGameState,
    downloadGameStateFile,
} from './snesSavesStore'

interface SnesSaveStatesModalProps {
    isOpen: boolean
    onClose: () => void
    gameId: string
    gameTitle: string
    onSaveStateAction: (slot: number) => Promise<void>
    onLoadStateAction: (stateBlob: Blob) => Promise<void>
}

export const SnesSaveStatesModal: React.FC<SnesSaveStatesModalProps> = ({
    isOpen,
    onClose,
    gameId,
    gameTitle,
    onSaveStateAction,
    onLoadStateAction,
}) => {
    const [slots, setSlots] = useState<SnesSaveSlot[]>([])
    const [loadingSlot, setLoadingSlot] = useState<number | null>(null)
    const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const refreshSlots = async () => {
        try {
            const list = await listGameStates(gameId)
            setSlots(list)
        } catch (err) {
            console.error('Error cargando slots:', err)
        }
    }

    useEffect(() => {
        if (isOpen && gameId) {
            refreshSlots()
            setStatusMsg(null)
        }
    }, [isOpen, gameId])

    if (!isOpen) return null

    const handleSave = async (slotNumber: number) => {
        setLoadingSlot(slotNumber)
        setStatusMsg(null)
        try {
            await onSaveStateAction(slotNumber)
            await refreshSlots()
            setStatusMsg({ text: `💾 ¡Partida guardada con éxito en el Slot ${slotNumber}!` })
        } catch (err: unknown) {
            setStatusMsg({
                text: err instanceof Error ? err.message : 'Error al guardar partida.',
                isError: true,
            })
        } finally {
            setLoadingSlot(null)
        }
    }

    const handleLoad = async (slotNumber: number) => {
        setLoadingSlot(slotNumber)
        setStatusMsg(null)
        try {
            const stateBlob = await loadGameState(gameId, slotNumber)
            if (!stateBlob) {
                throw new Error('No se encontró el estado guardado.')
            }
            await onLoadStateAction(stateBlob)
            setStatusMsg({ text: `⚡ ¡Partida cargada desde el Slot ${slotNumber}!` })
            setTimeout(() => {
                onClose()
            }, 1200)
        } catch (err: unknown) {
            setStatusMsg({
                text: err instanceof Error ? err.message : 'Error al cargar partida.',
                isError: true,
            })
        } finally {
            setLoadingSlot(null)
        }
    }

    const handleDelete = async (slotNumber: number) => {
        try {
            await deleteGameState(gameId, slotNumber)
            await refreshSlots()
            setStatusMsg({ text: `🗑️ Slot ${slotNumber} eliminado.` })
        } catch (err) {
            console.error(err)
        }
    }

    const handleExternalStateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return

        try {
            // Importar directamente al Slot 1 o al primer slot disponible
            await saveGameState(gameId, gameTitle, 1, file)
            await refreshSlots()
            setStatusMsg({ text: '📁 Archivo de guardado externo importado en el Slot 1.' })
        } catch (err: unknown) {
            setStatusMsg({
                text: err instanceof Error ? err.message : 'Error al importar archivo de guardado.',
                isError: true,
            })
        }
    }

    const availableSlots = [1, 2, 3]

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999999,
                background: 'rgba(5, 4, 12, 0.85)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
            onClick={onClose}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept=".state,.sav,.srm,.bin"
                style={{ display: 'none' }}
                onChange={handleExternalStateUpload}
            />

            <div
                className="pixel-box"
                style={{
                    background: '#0d1117',
                    border: '2px solid var(--pixel-gold-coin)',
                    maxWidth: '720px',
                    width: '100%',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 0 30px rgba(255, 199, 0, 0.25)',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>💾</span>
                        <div>
                            <h3
                                style={{
                                    margin: 0,
                                    fontFamily: 'var(--font-pixel-title)',
                                    fontSize: '14px',
                                    color: 'var(--pixel-gold-coin)',
                                }}
                            >
                                ADMINISTRAR PARTIDAS GUARDADAS
                            </h3>
                            <span style={{ fontFamily: 'var(--font-pixel-ui)', fontSize: '11px', color: '#94a3b8' }}>
                                Juego: <b style={{ color: '#fff' }}>{gameTitle}</b> (Guardado instantáneo en tu navegador)
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="pixel-btn"
                        onClick={onClose}
                        style={{ fontSize: '11px' }}
                    >
                        ✕ Cerrar
                    </button>
                </div>

                {/* Mensaje de estado */}
                {statusMsg && (
                    <div
                        style={{
                            padding: '8px 12px',
                            background: statusMsg.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            border: `1px solid ${statusMsg.isError ? '#ef4444' : '#22c55e'}`,
                            color: statusMsg.isError ? '#fca5a5' : '#86efac',
                            fontFamily: 'var(--font-pixel-ui)',
                            fontSize: '12px',
                            textAlign: 'center',
                        }}
                    >
                        {statusMsg.text}
                    </div>
                )}

                {/* Lista de Slots */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {availableSlots.map((slotNum) => {
                        const existingSlot = slots.find((s) => s.slot === slotNum)
                        const isLoading = loadingSlot === slotNum
                        return (
                            <div
                                key={slotNum}
                                style={{
                                    background: '#161f2e',
                                    border: `1px solid ${existingSlot ? 'var(--pixel-gold-coin)' : '#273548'}`,
                                    borderRadius: '6px',
                                    padding: '12px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                }}
                            >
                                {/* Miniatura / Icono */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div
                                        style={{
                                            width: '80px',
                                            height: '60px',
                                            background: '#090d16',
                                            border: '1px solid #334155',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {existingSlot?.thumbnailDataUrl ? (
                                            <img
                                                src={existingSlot.thumbnailDataUrl}
                                                alt={`Slot ${slotNum}`}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '24px', opacity: 0.4 }}>
                                                {existingSlot ? '🎮' : '📁'}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <div
                                            style={{
                                                fontFamily: 'var(--font-pixel-title)',
                                                fontSize: '12px',
                                                color: existingSlot ? 'var(--pixel-gold-coin)' : '#94a3b8',
                                            }}
                                        >
                                            SLOT {slotNum} {existingSlot ? '• GUARDADO' : '• VACÍO'}
                                        </div>
                                        <div
                                            style={{
                                                fontFamily: 'var(--font-pixel-ui)',
                                                fontSize: '11px',
                                                color: '#64748b',
                                                marginTop: '2px',
                                            }}
                                        >
                                            {existingSlot
                                                ? new Date(existingSlot.timestamp).toLocaleString('es-AR', {
                                                      day: '2-digit',
                                                      month: '2-digit',
                                                      year: 'numeric',
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                      second: '2-digit',
                                                  })
                                                : 'No hay datos guardados'}
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones del Slot */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {existingSlot ? (
                                        <>
                                            <button
                                                type="button"
                                                className="pixel-btn pixel-btn-primary"
                                                style={{ fontSize: '11px' }}
                                                onClick={() => handleLoad(slotNum)}
                                                disabled={isLoading}
                                            >
                                                ⚡ Cargar
                                            </button>
                                            <button
                                                type="button"
                                                className="pixel-btn"
                                                style={{ fontSize: '11px' }}
                                                onClick={() => handleSave(slotNum)}
                                                disabled={isLoading}
                                            >
                                                💾 Sobrescribir
                                            </button>
                                            <button
                                                type="button"
                                                className="pixel-btn"
                                                style={{ fontSize: '11px' }}
                                                onClick={() => downloadGameStateFile(existingSlot)}
                                                title="Descargar archivo .state a tu PC"
                                            >
                                                ⬇ Backup .state
                                            </button>
                                            <button
                                                type="button"
                                                className="pixel-btn"
                                                style={{ fontSize: '11px', color: '#ff4444', borderColor: '#ff4444' }}
                                                onClick={() => handleDelete(slotNum)}
                                                disabled={isLoading}
                                            >
                                                🗑️
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            className="pixel-btn pixel-btn-primary"
                                            style={{ fontSize: '11px' }}
                                            onClick={() => handleSave(slotNum)}
                                            disabled={isLoading}
                                        >
                                            💾 Guardar en Slot {slotNum}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer y Carga de Archivo Externo */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid #1e293b',
                    }}
                >
                    <button
                        type="button"
                        className="pixel-btn"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ fontSize: '11px', borderColor: '#38bdf8', color: '#38bdf8' }}
                    >
                        📂 Importar Archivo .state desde tu PC
                    </button>
                    <button
                        type="button"
                        className="pixel-btn pixel-btn-primary"
                        onClick={onClose}
                        style={{ fontSize: '11px' }}
                    >
                        Volver al Juego
                    </button>
                </div>
            </div>
        </div>
    )
}

