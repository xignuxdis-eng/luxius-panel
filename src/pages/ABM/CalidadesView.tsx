import { useState } from 'react'
import { getCalidades, deleteCalidad } from '@data/db'
import Button from '@components/ui/Button'
import NuevaCalidadModal from './NuevaCalidadModal'
import type { Calidad } from '@/types'
import './ABM.css'

export default function CalidadesView() {
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedCalidad, setSelectedCalidad] = useState<Calidad | undefined>()

    // Load calidades
    const [calidades, setCalidades] = useState(getCalidades())

    const filteredCalidades = calidades.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleRefresh = () => {
        setCalidades(getCalidades())
    }

    const handleEdit = (calidad: Calidad) => {
        setSelectedCalidad(calidad)
        setIsModalOpen(true)
    }

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de eliminar esta calidad?')) {
            deleteCalidad(id)
            handleRefresh()
        }
    }

    const handleAdd = () => {
        setSelectedCalidad(undefined)
        setIsModalOpen(true)
    }

    return (
        <div className="abm-list-view">
            <div className="abm-actions-header">
                <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAdd}
                >
                    + Agregar Calidad
                </Button>
                <input
                    className="input-field sm"
                    type="text"
                    placeholder="Buscar calidades..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <table className="abm-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredCalidades.map(c => (
                        <tr key={c.id}>
                            <td>{c.id}</td>
                            <td><strong>{c.nombre}</strong></td>
                            <td>{c.descripcion || '-'}</td>
                            <td>
                                <span className={`pill ${c.habilitado !== false ? 'success' : 'muted'}`}>
                                    {c.habilitado !== false ? 'Habilitada' : 'Inactiva'}
                                </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <div className="table-ops">
                                    <button className="op-btn-sm" title="Editar" onClick={() => handleEdit(c)}>✏️</button>
                                    <button className="op-btn-sm" title="Eliminar" onClick={() => handleDelete(c.id)}>🗑️</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {isModalOpen && (
                <NuevaCalidadModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setSelectedCalidad(undefined); }}
                    onSave={() => {
                        handleRefresh()
                        setIsModalOpen(false)
                        setSelectedCalidad(undefined)
                    }}
                    calidad={selectedCalidad}
                />
            )}
        </div>
    )
}
