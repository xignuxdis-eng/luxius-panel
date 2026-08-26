import { useState, useEffect } from 'react'
import { getMateriales, deleteMaterial, refreshCollection } from '@data/db'
import Button from '@components/ui/Button'
import NuevoMaterialModal from './NuevoMaterialModal'
import type { Material } from '@/types'
import { RefreshCw } from 'lucide-react'
import './ABM.css'

export default function MaterialesView() {
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedMaterial, setSelectedMaterial] = useState<Material | undefined>()
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Load materials
    const [materiales, setMateriales] = useState(getMateriales())

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            await refreshCollection('materiales')
            setMateriales(getMateriales())
        } finally {
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        handleRefresh()
    }, [])

    const filteredMateriales = materiales.filter(m =>
        m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleEdit = (material: Material) => {
        setSelectedMaterial(material)
        setIsModalOpen(true)
    }

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de eliminar este material?')) {
            deleteMaterial(id)
            setMateriales(getMateriales())
        }
    }

    const handleAdd = () => {
        setSelectedMaterial(undefined)
        setIsModalOpen(true)
    }

    return (
        <div className="abm-list-view">
            <div className="abm-actions-header">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAdd}
                    >
                        + Agregar Material
                    </Button>
                    <button 
                        className="op-btn-sm" 
                        style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        title="Sincronizar con base de datos"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'spinning' : ''} />
                        <span>{isRefreshing ? 'Sincronizando...' : 'Actualizar'}</span>
                    </button>
                </div>
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
                        <th>Precio</th>
                        <th>Stock Actual</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th className="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredMateriales.map(m => {
                        const stockAct = m.stockActual || 0;
                        const stockMin = m.stockMinimo || 10;
                        const isLow = stockAct <= stockMin;
                        return (
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
                                <td>
                                    <span style={{ 
                                        fontWeight: 'bold', 
                                        color: isLow ? '#f87171' : '#4ade80',
                                        backgroundColor: isLow ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem'
                                    }}>
                                        {stockAct} {m.unidad || (m.tipo?.toLowerCase() === 'tinta' ? 'L' : 'm²')}
                                        {isLow && ' ⚠️'}
                                    </span>
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
                        );
                    })}
                </tbody>
            </table>

            {isModalOpen && (
                <NuevoMaterialModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setSelectedMaterial(undefined); }}
                    onSave={() => {
                        setMateriales(getMateriales())
                        setIsModalOpen(false)
                        setSelectedMaterial(undefined)
                    }}
                    material={selectedMaterial}
                />
            )}
        </div>
    )
}
