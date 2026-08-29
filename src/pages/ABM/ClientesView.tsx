import { useState, useEffect } from 'react'
import { getClientes, deleteCliente, refreshCollection } from '@data/db'
import Button from '@components/ui/Button'
import NuevoClienteModal from './NuevoClienteModal'
import ClienteReporteModal from './ClienteReporteModal'
import type { Cliente } from '@/types'
import './ABM.css'

export default function ClientesView() {
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)

    // Load clients
    const [clientes, setClientes] = useState<Cliente[]>(getClientes())

    const filteredClientes = clientes.filter(c => {
        if (!searchTerm.trim()) return true
        const q = searchTerm.toLowerCase()
        return (
            (c.nombre || '').toLowerCase().includes(q) ||
            (c.empresa || '').toLowerCase().includes(q) ||
            (c.cuit || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.telefono || '').toLowerCase().includes(q)
        )
    })

    const handleRefresh = (forceRemote = false) => {
        setClientes(getClientes())
        if (forceRemote) {
            refreshCollection('clientes').then(() => {
                setClientes(getClientes())
            })
        }
    }

    useEffect(() => {
        handleRefresh(true)
    }, [])

    const handleEdit = (cliente: Cliente) => {
        setSelectedCliente(cliente)
        setIsModalOpen(true)
    }

    const handleReport = (cliente: Cliente) => {
        setSelectedCliente(cliente)
        setIsReportModalOpen(true)
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
                    placeholder="Buscar clientes por nombre, empresa o CUIT..."
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
                                    <button className="op-btn-sm" title="Generar Reporte / Estado de Cuenta PDF" onClick={() => handleReport(c)} style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#60a5fa', border: '1px solid rgba(37, 99, 235, 0.3)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        📄 Reporte PDF
                                    </button>
                                    <button className="op-btn-sm" title="Editar" onClick={() => handleEdit(c)}>✏️</button>
                                    <button className="op-btn-sm" title="Eliminar" onClick={() => handleDelete(c.id)}>🗑️</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <NuevoClienteModal
                cliente={selectedCliente}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={() => handleRefresh(false)}
            />

            <ClienteReporteModal
                cliente={selectedCliente}
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
            />
        </div>
    )
}
