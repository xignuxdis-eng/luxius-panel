import { useState } from 'react'
import { getServicios, deleteServicio } from '@data/db'
import Button from '@components/ui/Button'
import ServiceModal from './ServiceModal'
import type { Servicio } from '@/types'

export default function ServicesView() {
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedService, setSelectedService] = useState<Servicio | undefined>()

    // Load services
    const [servicios, setServicios] = useState(getServicios())

    const filteredServicios = servicios.filter(s =>
        s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleRefresh = () => {
        setServicios(getServicios())
    }

    const handleEdit = (service: Servicio) => {
        setSelectedService(service)
        setIsModalOpen(true)
    }

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de eliminar este servicio?')) {
            deleteServicio(id)
            handleRefresh()
        }
    }

    const handleAdd = () => {
        setSelectedService(undefined)
        setIsModalOpen(true)
    }

    return (
        <div className="abm-list-view">
            <div className="abm-actions-header">
                <Button variant="primary" size="sm" onClick={handleAdd}>
                    + Agregar Servicio
                </Button>
                <input
                    className="input-field sm"
                    type="text"
                    placeholder="Buscar servicios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <table className="abm-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Precio Base</th>
                        <th>Unidad</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredServicios.map(s => (
                        <tr key={s.id}>
                            <td style={{ fontWeight: 600 }}>{s.nombre}</td>
                            <td>{s.descripcion}</td>
                            <td>${s.precioBase}</td>
                            <td>{s.unidad}</td>
                            <td>
                                <span className={`pill ${s.habilitado ? 'success' : 'muted'}`}>
                                    {s.habilitado ? 'Habilitado' : 'Inactivo'}
                                </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <div className="table-ops">
                                    <button
                                        className="op-btn-sm"
                                        title="Editar"
                                        onClick={() => handleEdit(s)}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="op-btn-sm"
                                        title="Eliminar"
                                        onClick={() => handleDelete(s.id)}
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
                <ServiceModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setSelectedService(undefined); }}
                    onSave={() => {
                        handleRefresh()
                        setIsModalOpen(false)
                        setSelectedService(undefined)
                    }}
                    service={selectedService}
                />
            )}
        </div>
    )
}
