import { useState, useEffect } from 'react'
import Button from '@components/ui/Button'
import { getProveedores, saveProveedor, deleteProveedor } from '@data/db'
import type { Proveedor } from '@/types'
import NuevoProveedorModal from './NuevoProveedorModal'

export default function ProveedoresView() {
    const [proveedores, setProveedores] = useState<Proveedor[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        loadProveedores()
    }, [])

    const loadProveedores = () => {
        setProveedores(getProveedores())
    }

    const handleDelete = (id: number) => {
        if (confirm('¿Seguro que deseas eliminar este proveedor?')) {
            deleteProveedor(id)
            loadProveedores()
        }
    }

    const handleSave = (proveedor: Partial<Proveedor>) => {
        saveProveedor(proveedor)
        loadProveedores()
        setIsModalOpen(false)
        setEditingProveedor(null)
    }

    const filteredProveedores = proveedores.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.rubro.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contacto.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="abm-view animate-fade-in">
            <div className="view-header">
                <div className="search-bar">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar proveedor, rubro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => {
                    setEditingProveedor(null)
                    setIsModalOpen(true)
                }}>
                    + Nuevo Proveedor
                </Button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Rubro</th>
                            <th>Contacto</th>
                            <th>Tel / Email</th>
                            <th>CBU / Alias</th>
                            <th>Saldo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProveedores.map(p => (
                            <tr key={p.id}>
                                <td className="font-bold">{p.nombre}</td>
                                <td><span className="code-badge">{p.rubro}</span></td>
                                <td>{p.contacto}</td>
                                <td>
                                    <div className="text-xs">
                                        <div>📞 {p.telefono}</div>
                                        <div>📧 {p.email}</div>
                                    </div>
                                </td>
                                <td className="font-mono text-xs text-muted">{p.cbu}</td>
                                <td>
                                    <span className={`font-bold ${p.saldo < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        $ {p.saldo?.toLocaleString()}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex gap-2">
                                        <button
                                            className="btn-icon-action"
                                            onClick={() => {
                                                setEditingProveedor(p)
                                                setIsModalOpen(true)
                                            }}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn-icon-action delete"
                                            onClick={() => handleDelete(p.id)}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredProveedores.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-muted">
                                    No se encontraron proveedores
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <NuevoProveedorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                proveedorToEdit={editingProveedor}
            />
        </div>
    )
}
