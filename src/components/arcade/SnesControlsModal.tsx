import React, { useState, useEffect } from 'react'
import {
    SnesKeybindings,
    DEFAULT_SNES_KEYBINDINGS,
    getFriendlyKeyName,
    eventKeyToRetroArch,
    saveSnesKeybindings,
} from './snesControlsConfig'

interface SnesControlsModalProps {
    isOpen: boolean
    onClose: () => void
    bindings: SnesKeybindings
    onSaveBindings: (newBindings: SnesKeybindings) => void
}

type RebindingButton = keyof SnesKeybindings | null

export const SnesControlsModal: React.FC<SnesControlsModalProps> = ({
    isOpen,
    onClose,
    bindings,
    onSaveBindings,
}) => {
    const [currentBindings, setCurrentBindings] = useState<SnesKeybindings>(bindings)
    const [activeRebinding, setActiveRebinding] = useState<RebindingButton>(null)
    const [hasGamepad, setHasGamepad] = useState<boolean>(false)

    useEffect(() => {
        setCurrentBindings(bindings)
    }, [bindings, isOpen])

    // Detectar si hay un gamepad conectado vía Web Gamepad API
    useEffect(() => {
        const checkGamepad = () => {
            const gps = navigator.getGamepads ? navigator.getGamepads() : []
            const connected = Array.from(gps).some((gp) => gp !== null && gp.connected)
            setHasGamepad(connected)
        }
        checkGamepad()
        window.addEventListener('gamepadconnected', checkGamepad)
        window.addEventListener('gamepaddisconnected', checkGamepad)
        return () => {
            window.removeEventListener('gamepadconnected', checkGamepad)
            window.removeEventListener('gamepaddisconnected', checkGamepad)
        }
    }, [])

    // Capturar tecla cuando un botón está esperando reasignación
    useEffect(() => {
        if (!activeRebinding) return

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault()
            e.stopPropagation()

            if (e.code === 'Escape') {
                setActiveRebinding(null)
                return
            }

            const retroKey = eventKeyToRetroArch(e)
            const updated = {
                ...currentBindings,
                [activeRebinding]: retroKey,
            }
            setCurrentBindings(updated)
            saveSnesKeybindings(updated)
            onSaveBindings(updated)
            setActiveRebinding(null)
        }

        window.addEventListener('keydown', handleKeyDown, { capture: true })
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }, [activeRebinding, currentBindings, onSaveBindings])

    if (!isOpen) return null

    const handleResetDefaults = () => {
        setCurrentBindings(DEFAULT_SNES_KEYBINDINGS)
        saveSnesKeybindings(DEFAULT_SNES_KEYBINDINGS)
        onSaveBindings(DEFAULT_SNES_KEYBINDINGS)
        setActiveRebinding(null)
    }

    const buttonDefinitions: { id: keyof SnesKeybindings; label: string; desc: string; color: string }[] = [
        { id: 'up', label: 'D-Pad Arriba', desc: 'Mover arriba / Mirar', color: '#38bdf8' },
        { id: 'down', label: 'D-Pad Abajo', desc: 'Agacharse / Caer', color: '#38bdf8' },
        { id: 'left', label: 'D-Pad Izquierda', desc: 'Mover izquierda', color: '#38bdf8' },
        { id: 'right', label: 'D-Pad Derecha', desc: 'Mover derecha', color: '#38bdf8' },
        { id: 'b', label: 'Botón B (Inferior)', desc: 'Salto primario / Acción', color: '#ef4444' },
        { id: 'a', label: 'Botón A (Derecho)', desc: 'Salto con giro / Ataque', color: '#eab308' },
        { id: 'y', label: 'Botón Y (Izquierdo)', desc: 'Correr / Agarrar', color: '#22c55e' },
        { id: 'x', label: 'Botón X (Superior)', desc: 'Poder especial / Fuego', color: '#3b82f6' },
        { id: 'l', label: 'Gatillo L (Izquierdo)', desc: 'Gatillo lateral izquierdo', color: '#a855f7' },
        { id: 'r', label: 'Gatillo R (Derecho)', desc: 'Gatillo lateral derecho', color: '#a855f7' },
        { id: 'start', label: 'Start', desc: 'Pausa / Confirmar', color: '#f59e0b' },
        { id: 'select', label: 'Select', desc: 'Seleccionar / Soltar ítem', color: '#94a3b8' },
    ]

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
            <div
                className="pixel-box"
                style={{
                    background: '#0d1117',
                    border: '2px solid var(--pixel-gold-coin)',
                    maxWidth: '680px',
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
                        <span style={{ fontSize: '24px' }}>🎮</span>
                        <div>
                            <h3
                                style={{
                                    margin: 0,
                                    fontFamily: 'var(--font-pixel-title)',
                                    fontSize: '14px',
                                    color: 'var(--pixel-gold-coin)',
                                }}
                            >
                                CONFIGURACIÓN DE CONTROLES (SNES)
                            </h3>
                            <span style={{ fontFamily: 'var(--font-pixel-ui)', fontSize: '11px', color: '#94a3b8' }}>
                                Hace clic en cualquier botón para cambiar su tecla en el teclado.
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

                {/* Banner de Gamepad */}
                <div
                    style={{
                        padding: '8px 12px',
                        background: hasGamepad ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.1)',
                        border: `1px solid ${hasGamepad ? '#22c55e' : '#38bdf8'}`,
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'var(--font-pixel-ui)',
                        fontSize: '11px',
                    }}
                >
                    <span style={{ color: hasGamepad ? '#86efac' : '#bae6fd' }}>
                        {hasGamepad
                            ? '✅ Joystick / Gamepad USB detectado: compatible directamente sin configuración adicional.'
                            : 'ℹ️ Podés conectar cualquier Gamepad USB o Bluetooth (Xbox, PS4/5, Switch, 8BitDo) y funcionará al instante.'}
                    </span>
                </div>

                {/* Aviso interactivo si se está esperando tecla */}
                {activeRebinding && (
                    <div
                        style={{
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px dashed #ef4444',
                            color: '#fca5a5',
                            fontFamily: 'var(--font-pixel-title)',
                            fontSize: '12px',
                            textAlign: 'center',
                            animation: 'pulse 1.5s infinite',
                        }}
                    >
                        ⚡ PRESIONÁ CUALQUIER TECLA PARA ASIGNAR A{' '}
                        <b style={{ color: '#fff' }}>
                            {buttonDefinitions.find((b) => b.id === activeRebinding)?.label.toUpperCase()}
                        </b>{' '}
                        (o presiona ESC para cancelar)
                    </div>
                )}

                {/* Grilla de Asignación de Teclas */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '10px',
                    }}
                >
                    {buttonDefinitions.map((btn) => {
                        const isWaiting = activeRebinding === btn.id
                        const assignedKey = currentBindings[btn.id]
                        return (
                            <div
                                key={btn.id}
                                onClick={() => setActiveRebinding(btn.id)}
                                style={{
                                    background: isWaiting ? 'rgba(239, 68, 68, 0.25)' : '#161f2e',
                                    border: `1px solid ${isWaiting ? '#ef4444' : '#273548'}`,
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontFamily: 'var(--font-pixel-title)',
                                            fontSize: '11px',
                                            color: btn.color,
                                        }}
                                    >
                                        {btn.label}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: 'var(--font-pixel-ui)',
                                            fontSize: '10px',
                                            color: '#64748b',
                                        }}
                                    >
                                        {btn.desc}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        background: isWaiting ? '#ef4444' : '#0f172a',
                                        border: `1px solid ${isWaiting ? '#fff' : btn.color}`,
                                        padding: '4px 10px',
                                        borderRadius: '4px',
                                        fontFamily: 'monospace',
                                        fontWeight: 700,
                                        fontSize: '11px',
                                        color: isWaiting ? '#fff' : '#f8fafc',
                                        minWidth: '60px',
                                        textAlign: 'center',
                                    }}
                                >
                                    {isWaiting ? '...' : getFriendlyKeyName(assignedKey)}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer y Acciones */}
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
                        onClick={handleResetDefaults}
                        style={{ fontSize: '11px', borderColor: '#f59e0b', color: '#f59e0b' }}
                    >
                        🔄 Restablecer Predeterminados
                    </button>
                    <button
                        type="button"
                        className="pixel-btn pixel-btn-primary"
                        onClick={onClose}
                        style={{ fontSize: '11px' }}
                    >
                        Listo / Guardar
                    </button>
                </div>
            </div>
        </div>
    )
}

