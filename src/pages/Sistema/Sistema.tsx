import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Header from '@components/layout/Header'
import Button from '@components/ui/Button'
import UsuariosView from './UsuariosView'
import './Sistema.css'


import { useState, useEffect } from 'react'
import { getRoles, deleteRole } from '@data/db'
import type { RoleConfig } from '@/types/auth'
import RolModal from './RolModal'
import LogViewerModal from './LogViewerModal'

function PermisosView() {
    const [roles, setRoles] = useState<RoleConfig[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLogModalOpen, setIsLogModalOpen] = useState(false)
    const [logFilter, setLogFilter] = useState<string | undefined>(undefined)
    const [editingRole, setEditingRole] = useState<RoleConfig | undefined>()

    useEffect(() => {
        loadRoles()
    }, [])

    const loadRoles = () => {
        setRoles(getRoles())
    }

    const handleEdit = (role: RoleConfig) => {
        setEditingRole(role)
        setIsModalOpen(true)
    }

    const handleAdd = () => {
        setEditingRole(undefined)
        setIsModalOpen(true)
    }

    const handleDelete = (id: number) => {
        if (confirm('¿Seguro que deseas eliminar este rol?')) {
            deleteRole(id)
            loadRoles()
        }
    }

    const openLogs = (filter?: string) => {
        setLogFilter(filter)
        setIsLogModalOpen(true)
    }

    return (
        <div className="sistema-view">
            <div className="view-header" style={{ justifyContent: 'space-between', display: 'flex' }}>
                <h3>Roles y Permisos</h3>
                <Button size="sm" onClick={handleAdd}>+ Nuevo Rol</Button>
            </div>

            <table className="abm-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Rol</th>
                        <th>Key</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {roles.map(role => (
                        <tr key={role.id}>
                            <td>{role.id}</td>
                            <td style={{ fontWeight: 600 }}>{role.name}</td>
                            <td><span className="code-badge">{role.key}</span></td>
                            <td>
                                <span className={`pill ${role.status === 'Activo' ? 'success' : 'muted'}`}>
                                    {role.status}
                                </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <div className="table-ops">
                                    <button
                                        className="op-btn-sm"
                                        onClick={() => handleEdit(role)}
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="op-btn-sm"
                                        onClick={() => handleDelete(role.id)}
                                        title="Eliminar"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="view-actions">
                <Button variant="outline" size="sm" onClick={() => openLogs()}>Ver Accesos Log</Button>
                <Button variant="outline" size="sm" onClick={() => openLogs('LOGIN')}>Ver Actividad Presencia</Button>
            </div>

            <RolModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                role={editingRole}
                onSave={loadRoles}
            />

            <LogViewerModal
                isOpen={isLogModalOpen}
                onClose={() => setIsLogModalOpen(false)}
                filterType={logFilter}
            />
        </div>
    )
}

function UtilidadesDB() {
    const [loading, setLoading] = useState<string | null>(null);

    const handleAction = async (endpoint: string, method = 'POST', download = false) => {
        setLoading(endpoint);
        try {
            if (download) {
                window.location.href = `/api/db/${endpoint}`;
                setLoading(null);
                return;
            }

            const res = await fetch(`/api/db/${endpoint}`, { method });
            const result = await res.json();

            if (res.ok) {
                alert(result.message || 'Operación completada con éxito.');
            } else {
                alert('Error: ' + (result.error || 'Ocurrió un problema.'));
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión con el servidor.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="sistema-view utilidades-view">
            <h3>Utilidades de Base de Datos</h3>
            <div className="db-tools-grid">
                <div className="tool-card">
                    <h4>Respaldo Full</h4>
                    <p>Genera un backup completo de la base de datos en formato JSON.</p>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAction('backup', 'GET', true)}
                        disabled={!!loading}
                    >
                        {loading === 'backup' ? 'Generando...' : 'Ejecutar Backup'}
                    </Button>
                </div>
                <div className="tool-card">
                    <h4>Limpiar Base</h4>
                    <p>Elimina registros históricos (más de 2 años) para optimizar el rendimiento.</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (confirm('¿Seguro? Esta acción eliminará registros de más de 2 años permanentemente.'))
                                handleAction('cleanup')
                        }}
                        disabled={!!loading}
                    >
                        {loading === 'cleanup' ? 'Limpiando...' : 'Iniciar Limpieza'}
                    </Button>
                </div>
                <div className="tool-card">
                    <h4>Reinicio de Saldos</h4>
                    <p>Resetea balances de clientes y deudas de cuenta corriente a cero.</p>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                            if (confirm('¿Seguro que deseas resetear todos los saldos?'))
                                handleAction('reset-balances')
                        }}
                        disabled={!!loading}
                    >
                        {loading === 'reset-balances' ? 'Reiniciando...' : 'Reiniciar'}
                    </Button>
                </div>
                <div className="tool-card">
                    <h4>Mayúsculas</h4>
                    <p>Normaliza nombres de clientes, materiales y máquinas a MAYÚSCULAS.</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction('normalize-case')}
                        disabled={!!loading}
                    >
                        {loading === 'normalize-case' ? 'Procesando...' : 'Procesar'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default function Sistema() {
    return (
        <div className="sistema-page page animate-fade-in">
            <Header title="Configuración de Sistema" subtitle="Administración avanzada y mantenimiento" />

            <nav className="abm-tabs">
                <NavLink to="/sistema/usuarios" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Usuarios</NavLink>
                <NavLink to="/sistema/permisos" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Permisos</NavLink>
                <NavLink to="/sistema/respaldo" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Respaldo Email</NavLink>
                <NavLink to="/sistema/db" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Utilidades DB</NavLink>
                <NavLink to="/sistema/mensajes" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Mensajes</NavLink>
            </nav>

            <div className="abm-content">
                <Routes>
                    <Route path="usuarios" element={<UsuariosView />} />
                    <Route path="permisos" element={<PermisosView />} />
                    <Route path="db" element={<UtilidadesDB />} />
                    <Route path="respaldo" element={<div className="p-40 text-muted">Configuración de emails...</div>} />
                    <Route path="*" element={<Navigate to="usuarios" replace />} />
                </Routes>
            </div>
        </div>
    )
}
