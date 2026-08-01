import { useState } from 'react'
import { getClientes, deleteCliente } from '@data/db'
import Button from '@components/ui/Button'
import NuevoClienteModal from './NuevoClienteModal'
import type { Cliente } from '@/types'
import './ABM.css'

export default function ClientesView() {
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)

    // Load clients
    const [clientes, setClientes] = useState(getClientes())

    const filteredClientes = clientes.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cuit?.includes(searchTerm)
    )

    const handleRefresh = () => {
        setClientes(getClientes())
    }

    const handleEdit = (cliente: Cliente) => {
        setSelectedCliente(cliente)
        setIsModalOpen(true)
    }

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de eliminar este cliente?')) {
            deleteCliente(id)
            handleRefresh()
        }
    }

    const handleAdd = () => {
        setSelectedCliente(null)
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
                    + Agregar Cliente
                </Button>
                <input
                    className="input-field sm"
                    type="text"
                    placeholder="Buscar clientes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <table className="abm-table">
                <thead>
                    <tr>
                        <th>Nombre / Empresa</th>
                        <th>CUIT</th>
                        <th>Email / Tel</th>
                        <th>Cond. Vta</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredClientes.map(c => (
                        <tr key={c.id}>
                            <td>
                                <div className="name-cell">
                                    <span className="name">{c.nombre}</span>
                                    <span className="sub">{c.empresa} {(c.vip || (c.preciosEspeciales && Object.keys(c.preciosEspeciales).length > 0)) && <span className="vip-badge">VIP</span>}</span>
                                </div>
                            </td>
                            <td>{c.cuit}</td>
                            <td>
                                <div className="contact-cell">
                                    <span>{c.email}</span>
                                    <span className="sub">{c.telefono}</span>
                                </div>
                            </td>
                            <td>{c.condVenta}</td>
                            <td>
                                <span className={`pill ${c.habilitado ? 'success' : 'muted'}`}>
                                    {c.habilitado ? 'Habilitado' : 'Inactivo'}
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
                <NuevoClienteModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setSelectedCliente(null); }}
                    onSave={() => {
                        handleRefresh()
                        setIsModalOpen(false)
                        setSelectedCliente(null)
                    }}
                    cliente={selectedCliente}
                />
            )}
        </div>
    )
}
