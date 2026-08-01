import { useState } from 'react'
import { getMateriales, deleteMaterial } from '@data/db'
import Button from '@components/ui/Button'
import NuevoMaterialModal from './NuevoMaterialModal'
import type { Material } from '@/types'
import './ABM.css'

export default function MaterialesView() {
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedMaterial, setSelectedMaterial] = useState<Material | undefined>()

    // Load materials
    const [materiales, setMateriales] = useState(getMateriales())

    const filteredMateriales = materiales.filter(m =>
        m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleRefresh = () => {
        setMateriales(getMateriales())
    }

    const handleEdit = (material: Material) => {
        setSelectedMaterial(material)
        setIsModalOpen(true)
    }

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de eliminar este material?')) {
            deleteMaterial(id)
            handleRefresh()
        }
    }

    const handleAdd = () => {
        setSelectedMaterial(undefined)
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
                    + Agregar Material
                </Button>
                <input
                    className="input-field sm"
                    type="text"
                    placeholder="Buscar materiales..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <table className="abm-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Calidad</th>
                        <th>Ancho (m)</th>
                        <th>Precio m²</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th className="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredMateriales.map(m => (
                        <tr key={m.id}>
                            <td><span className="code-badge">{m.codigo}</span></td>
                            <td>{m.descripcion}</td>
                            <td>{m.calidad}</td>
                            <td>
                                {m.tipoCobro === 'ml' && m.bobinas && m.bobinas.length > 0
                                    ? `${m.bobinas.length} bobinas`
                                    : m.ancho}
                            </td>
                            <td>
                                {m.tipoCobro === 'ml' && m.bobinas && m.bobinas.length > 0
                                    ? `$${Math.min(...m.bobinas.map(b => b.precioML))} - $${Math.max(...m.bobinas.map(b => b.precioML))}`
                                    : `$${m.precioM2}`}
                            </td>
                            <td>{m.tipo}</td>
                            <td>
                                <span className={`pill ${m.habilitado ? 'success' : 'muted'}`}>
                                    {m.habilitado ? 'Habilitado' : 'Inactivo'}
                                </span>
                            </td>
                            <td className="text-right">
                                <div className="table-ops">
                                    <button className="op-btn-sm" title="Editar" onClick={() => handleEdit(m)}>✏️</button>
                                    <button className="op-btn-sm" title="Eliminar" onClick={() => handleDelete(m.id)}>🗑️</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {isModalOpen && (
                <NuevoMaterialModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setSelectedMaterial(undefined); }}
                    onSave={() => {
                        handleRefresh()
                        setIsModalOpen(false)
                        setSelectedMaterial(undefined)
                    }}
                    material={selectedMaterial}
                />
            )}
        </div>
    )
}
