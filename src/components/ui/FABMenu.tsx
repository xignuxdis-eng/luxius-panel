import { useState, useEffect } from 'react'
import './FABMenu.css'

/**
 * FABMenu — Floating Action Button unificado (Mobile-First Fase 2)
 * 
 * En viewports ≤768px, colapsa los 5 widgets flotantes individuales
 * (Xana, WhatsApp, Alarm, Calculator, MediaPlayer) en un único FAB
 * expandible. Los widgets originales se ocultan vía CSS y sus toggle
 * functions se pasan como callbacks.
 */

interface FABAction {
    id: string
    icon: string
    label: string
    color: string
    onClick: () => void
}

interface FABMenuProps {
    actions: FABAction[]
}

export default function FABMenu({ actions }: FABMenuProps) {
    const [isOpen, setIsOpen] = useState(false)

    // Close FAB when clicking outside
    useEffect(() => {
        if (!isOpen) return
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('.fab-menu')) {
                setIsOpen(false)
            }
        }
        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [isOpen])

    return (
        <div className={`fab-menu ${isOpen ? 'fab-open' : ''}`}>
            {/* Action items (visible when expanded) */}
            <div className="fab-actions" aria-hidden={!isOpen}>
                {actions.map((action, index) => (
                    <button
                        key={action.id}
                        className="fab-action-item"
                        onClick={() => {
                            action.onClick()
                            setIsOpen(false)
                        }}
                        aria-label={action.label}
                        title={action.label}
                        style={{
                            '--fab-color': action.color,
                            '--fab-delay': `${index * 40}ms`,
                        } as React.CSSProperties}
                    >
                        <span className="fab-action-icon">{action.icon}</span>
                        <span className="fab-action-label">{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Main FAB trigger */}
            <button
                className="fab-trigger"
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(prev => !prev)
                }}
                aria-label={isOpen ? 'Cerrar menú rápido' : 'Abrir menú rápido'}
                aria-expanded={isOpen}
            >
                <span className="fab-trigger-icon">
                    {isOpen ? '✕' : '⚡'}
                </span>
            </button>
        </div>
    )
}
