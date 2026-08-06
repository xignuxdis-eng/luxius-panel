import { useState, useMemo } from 'react'
import Button from '@components/ui/Button'
import { getCombos, deleteCombo, saveCombo, type ComboData } from '@data/db'
import ComboModal from './ComboModal'
import './ABM.css'

export default function CombosView() {
    const [combos, setCombos] = useState<ComboData[]>(() => getCombos())
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('todas')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedCombo, setSelectedCombo] = useState<ComboData | null>(null)

    const refreshData = () => {
        setCombos(getCombos())
    }

    const filteredCombos = useMemo(() => {
        return combos.filter(c => {
            if (categoryFilter !== 'todas' && c.categoria !== categoryFilter) return false
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase()
                const matches = (c.nombre?.toLowerCase() || '').includes(q) ||
                                (c.codigo?.toLowerCase() || '').includes(q) ||
                                (c.descripcion?.toLowerCase() || '').includes(q) ||
                                (c.categoria?.toLowerCase() || '').includes(q)
                if (!matches) return false
            }
            return true
        })
    }, [combos, categoryFilter, searchTerm])

    const handleAdd = () => {
        setSelectedCombo(null)
        setIsModalOpen(true)
    }

    const handleEdit = (combo: ComboData) => {
        setSelectedCombo(combo)
        setIsModalOpen(true)
    }

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de eliminar este combo / producto del tarifario?')) {
            deleteCombo(id)
            refreshData()
        }
    }

    const toggleHabilitado = (combo: ComboData) => {
        saveCombo({
            ...combo,
            habilitado: !combo.habilitado
        })
        refreshData()
    }

    return (
        <div className="abm-list-view">
            <div className="abm-actions-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <Button variant="primary" size="sm" onClick={handleAdd}>
                    + Nuevo Combo / Producto Tarifario
                </Button>

                <div style={{ display: 'flex', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
                    <select
                        className="input-field sm"
                        style={{ maxWidth: '200px' }}
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                    >
                        <option value="todas">Todas las Categorías</option>
                        <option value="Cartelería Comercial">Cartelería Comercial</option>
                        <option value="Banners y Rollups">Banners y Rollups</option>
                        <option value="Vinilos y Películas">Vinilos y Películas</option>
                        <option value="Servicios Combinados">Servicios Combinados</option>
                    </select>

                    <input
                        className="input-field sm"
                        type="text"
                        placeholder="Buscar por código, nombre o descripción..."
                        style={{ maxWidth: '300px' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <table className="abm-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Combo / Producto</th>
                        <th>Categoría</th>
                        <th>Componentes Incluidos</th>
                        <th style={{ textAlign: 'right' }}>Suma Costos</th>
                        <th style={{ textAlign: 'right' }}>Precio Tarifario ($)</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredCombos.length === 0 ? (
                        <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                No se encontraron combos o productos tarifarios. Haga click en "+ Nuevo Combo" para agregar uno.
                            </td>
                        </tr>
                    ) : (
                        filteredCombos.map(c => (
                            <tr key={c.id} style={{ opacity: c.habilitado ? 1 : 0.5 }}>
                                <td style={{ fontWeight: 800, color: '#ff9800' }}>
                                    {c.codigo}
                                </td>
                                <td>
                                    <div className="name-cell">
                                        <span className="name" style={{ fontWeight: 700 }}>{c.nombre}</span>
                                        <span className="sub">{c.descripcion}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className="pill muted" style={{ fontSize: '0.75rem' }}>{c.categoria}</span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' }}>
                                        {c.componentes && c.componentes.length > 0 ? (
                                            c.componentes.map((comp, idx) => (
                                                <span key={idx} style={{ color: 'var(--text-secondary)' }}>
                                                    • {comp.nombre} ({comp.cantidad}x ${comp.precioUnitario.toLocaleString()})
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', italic: 'true' }}>Sin componentes detallados</span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    ${(c.precioSugerido || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>
                                    ${(c.precioFinal || c.precioSugerido || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                                <td>
                                    <button
                                        onClick={() => toggleHabilitado(c)}
                                        className={`pill ${c.habilitado ? 'success' : 'muted'}`}
                                        style={{ border: 'none', cursor: 'pointer' }}
                                    >
                                        {c.habilitado ? 'Habilitado' : 'Inactivo'}
                                    </button>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div className="table-ops">
                                        <button className="op-btn-sm" title="Editar" onClick={() => handleEdit(c)}>✏️</button>
                                        <button className="op-btn-sm" title="Eliminar" onClick={() => handleDelete(c.id)}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            <ComboModal
                combo={selectedCombo}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={refreshData}
            />
        </div>
    )
}
