import { useState, useEffect } from 'react'
import { getUsuarios, deleteUsuario, refreshCollection } from '@data/db'
import Button from '@components/ui/Button'
import UsuarioModal from './UsuarioModal'

export default function UsuariosView() {
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any | undefined>()
    const [usuarios, setUsuarios] = useState(getUsuarios())

    const refreshUsers = async (forceRemote = true) => {
        setUsuarios([...getUsuarios()])
        if (forceRemote) {
            await refreshCollection('usuarios')
            setUsuarios([...getUsuarios()])
        }
    }

    useEffect(() => {
        refreshUsers()
    }, [])

    const filteredUsers = usuarios.filter(u =>
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleEdit = (user: any) => {
        setSelectedUser(user)
        setIsModalOpen(true)
    }

    const handleAdd = () => {
        setSelectedUser(undefined)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
            await deleteUsuario(id)
            await refreshUsers(true)
        }
    }


    return (
        <div className="abm-list-view">
            <div className="abm-actions-header">
                <Button variant="primary" size="sm" onClick={handleAdd}>
                    + Agregar Usuario
                </Button>
                <input
                    className="input-field sm"
                    type="text"
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <table className="abm-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Email</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.map(u => (
                        <tr key={u.id}>
                            <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                            <td><span className="code-badge">{u.username}</span></td>
                            <td>{u.rol}</td>
                            <td>{u.email}</td>
                            <td>
                                <span className={`pill ${u.habilitado ? 'success' : 'muted'}`}>
                                    {u.habilitado ? 'Habilitado' : 'Inactivo'}
                                </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <div className="table-ops">
                                    <button
                                        className="op-btn-sm"
                                        title="Editar"
                                        onClick={() => handleEdit(u)}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="op-btn-sm"
                                        title="Eliminar"
                                        onClick={() => handleDelete(u.id)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <UsuarioModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    refreshUsers(true)
                }}
                user={selectedUser}
            />

        </div>
    )
}
