import React from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    className = ''
}: ModalProps) {
    if (!isOpen) return null

    return createPortal(
        <div className="modal-overlay">
            <div
                className={`modal-content size-${size} ${className} animate-fade-in`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}

