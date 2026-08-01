import { useState, useEffect } from 'react'
import Modal from '@components/ui/Modal'
import { getLogs } from '@data/db'
import type { SystemLog } from '@/types/auth'

interface LogViewerModalProps {
    isOpen: boolean
    onClose: () => void
    filterType?: string // Optional filter (e.g., 'LOGIN')
}

export default function LogViewerModal({ isOpen, onClose, filterType }: LogViewerModalProps) {
    const [logs, setLogs] = useState<SystemLog[]>([])

    useEffect(() => {
        if (isOpen) {
            const allLogs = getLogs()
            if (filterType) {
                setLogs(allLogs.filter(l => l.action.includes(filterType)))
            } else {
                setLogs(allLogs)
            }
        }
    }, [isOpen, filterType])

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={filterType ? `Registro de Actividad: ${filterType}` : "Registro del Sistema"}
        >
            <div className="logs-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="abm-table">
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Acción</th>
                            <th>Usuario</th>
                            <th>Detalle</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td style={{ fontSize: '0.85em', whiteSpace: 'nowrap' }}>
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td>
                                    <span className="code-badge">{log.action}</span>
                                </td>
                                <td>{log.user}</td>
                                <td style={{ fontSize: '0.9em' }}>{log.details}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-4 text-muted">
                                    No hay registros disponibles.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="modal-actions">
                <button onClick={onClose} className="btn-secondary">Cerrar</button>
            </div>
        </Modal>
    )
}
