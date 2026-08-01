import { useState, useEffect } from 'react'
import { getLogisticas, deleteLogistica } from '@data/db'
import Button from '@components/ui/Button'
import LogisticsModal from './LogisticsModal'
import type { Logistica } from '@/types'

export default function LogisticsView() {
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedLogistica, setSelectedLogistica] = useState<Logistica | undefined>()
    const [logisticas, setLogisticas] = useState<Logistica[]>([])

    useEffect(() => {
        handleRefresh()
    }, [])

    const handleRefresh = () => {
        setLogisticas(getLogisticas())
    }

    const filteredLogisticas = logisticas.filter(l =>
        l.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleEdit = (logistica: Logistica) => {
        setSelectedLogistica(logistica)
        setIsModalOpen(true)
    }

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de eliminar esta opción de logística?')) {
            deleteLogistica(id)
            handleRefresh()
        }
    }

    const handleAdd = () => {
        setSelectedLogistica(undefined)
        setIsModalOpen(true)
    }

    return (
        <div className="abm-list-view">
            <div className="abm-actions-header">
                <Button variant="primary" size="sm" onClick={handleAdd}>
                    + Agregar Logística
                </Button>
                <input
                    className="input-field sm"
                    type="text"
                    placeholder="Buscar logística..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <table className="abm-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Costo</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredLogisticas.map(l => (
                        <tr key={l.id}>
                            <td style={{ fontWeight: 600 }}>{l.nombre}</td>
                            <td>{l.descripcion}</td>
                            <td>${l.costo}</td>
                            <td>
                                <span className={`pill ${l.habilitado ? 'success' : 'muted'}`}>
                                    {l.habilitado ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <div className="table-ops">
                                    <button
                                        className="op-btn-sm"
                                        title="Editar"
                                        onClick={() => handleEdit(l)}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="op-btn-sm"
                                        title="Eliminar"
                                        onClick={() => handleDelete(l.id)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {isModalOpen && (
                <LogisticsModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setSelectedLogistica(undefined); }}
                    onSave={() => {
                        handleRefresh()
                        setIsModalOpen(false)
                        setSelectedLogistica(undefined)
                    }}
                    logistica={selectedLogistica}
                />
            )}
        </div>
    )
}
