import { useState, useEffect } from 'react'
import Button from '@components/ui/Button'
import { getMaquinas, saveMaquina, deleteMaquina, refreshCollection } from '@data/db'
import type { Maquina } from '@/types'
import NuevaMaquinaModal from './NuevaMaquinaModal'

export default function MaquinasView() {
    const [maquinas, setMaquinas] = useState<Maquina[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingMaquina, setEditingMaquina] = useState<Maquina | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        loadMaquinas()
    }, [])

    const loadMaquinas = async (forceRemote = true) => {
        setMaquinas([...getMaquinas()])
        if (forceRemote) {
            await refreshCollection('maquinas')
            setMaquinas([...getMaquinas()])
        }
    }

    const handleDelete = async (id: number) => {
        deleteMaquina(id)
        await loadMaquinas(false)
    }

    const handleSave = async (maquina: Partial<Maquina>) => {
        saveMaquina(maquina)
        setIsModalOpen(false)
        setEditingMaquina(null)
        await loadMaquinas(false)
    }

    const filteredMaquinas = maquinas.filter(m =>
        m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="abm-view animate-fade-in">
            <div className="view-header">
                <div className="search-bar">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar máquinas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => {
                    setEditingMaquina(null)
                    setIsModalOpen(true)
                }}>
                    + Nueva Máquina
                </Button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th>Ancho Max.</th>
                            <th>Estado</th>
                            <th>Status</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMaquinas.map(m => (
                            <tr key={m.id}>
                                <td className="font-mono text-muted">#{m.id}</td>
                                <td className="font-bold">{m.nombre}</td>
                                <td>{m.tipo}</td>
                                <td>{m.anchoMaximo} m</td>
                                <td>
                                    <span className={`pill ${m.estado === 'online' ? 'success' : 'danger'}`}>
                                        {(m.estado || '').toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    {m.habilitada ? '✅' : '❌'}
                                </td>
                                <td>
                                    <div className="flex gap-2">
                                        <button
                                            className="btn-icon-action"
                                            onClick={() => {
                                                setEditingMaquina(m)
                                                setIsModalOpen(true)
                                            }}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn-icon-action delete"
                                            onClick={() => handleDelete(m.id)}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredMaquinas.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-muted">
                                    No se encontraron máquinas
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <NuevaMaquinaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                maquinaToEdit={editingMaquina}
            />
        </div>
    )
}
