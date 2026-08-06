import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Header from '@components/layout/Header'
import Button from '@components/ui/Button'
import UsuariosView from './UsuariosView'
import './Sistema.css'


import { useState, useEffect } from 'react'
import { getRoles, deleteRole, HIDDEN_ORDENES_KEY } from '@data/db'
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

    // Client-side full backup export (does NOT navigate away or crash SPA)
    const handleExportBackup = () => {
        setLoading('backup');
        try {
            const backupData = {
                version: '1.0',
                createdAt: new Date().toISOString(),
                ordenes: JSON.parse(localStorage.getItem('luxius_session_ordenes') || '[]'),
                deletedOrdenes: JSON.parse(localStorage.getItem(HIDDEN_ORDENES_KEY) || '[]'),
                materiales: JSON.parse(localStorage.getItem('luxius_session_materiales') || '[]'),
                servicios: JSON.parse(localStorage.getItem('luxius_session_servicios') || '[]'),
            };

            const jsonStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const dateStr = new Date().toISOString().split('T')[0];
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_luxius_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert('Respaldo descargado con éxito.');
        } catch (err) {
            console.error('Error al exportar respaldo:', err);
            alert('Hubo un problema al generar la copia de respaldo.');
        } finally {
            setLoading(null);
        }
    };

    // Client-side backup import / restore
    const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                if (data.ordenes && Array.isArray(data.ordenes)) {
                    localStorage.setItem('luxius_session_ordenes', JSON.stringify(data.ordenes));
                }
                if (data.deletedOrdenes && Array.isArray(data.deletedOrdenes)) {
                    localStorage.setItem(HIDDEN_ORDENES_KEY, JSON.stringify(data.deletedOrdenes));
                }
                if (data.materiales && Array.isArray(data.materiales)) {
                    localStorage.setItem('luxius_session_materiales', JSON.stringify(data.materiales));
                }
                if (data.servicios && Array.isArray(data.servicios)) {
                    localStorage.setItem('luxius_session_servicios', JSON.stringify(data.servicios));
                }

                localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
                alert('¡Respaldo restaurado con éxito! Se recargará la aplicación.');
                window.location.reload();
            } catch (err) {
                console.error('Error al importar archivo de respaldo:', err);
                alert('El archivo seleccionado no tiene un formato de respaldo válido.');
            }
        };
        reader.readAsText(file);
    };

    // Safe client-side cleanup of historical orders (> 2 years old)
    const handleCleanup = () => {
        if (!confirm('¿Seguro? Esta acción eliminará registros de más de 2 años permanentemente.')) return;
        setLoading('cleanup');
        try {
            const now = new Date();
            const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()).getTime();

            const localOrders: any[] = JSON.parse(localStorage.getItem('luxius_session_ordenes') || '[]');
            const filtered = localOrders.filter(o => {
                const created = o.fechaCreacion ? new Date(o.fechaCreacion).getTime() : Date.now();
                return created >= twoYearsAgo;
            });

            localStorage.setItem('luxius_session_ordenes', JSON.stringify(filtered));
            localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
            alert(`Limpieza completada. Se conservaron ${filtered.length} órdenes recientes.`);
        } catch (err) {
            console.error('Error en limpieza:', err);
        } finally {
            setLoading(null);
        }
    };

    // Safe normalize case
    const handleNormalizeCase = () => {
        setLoading('normalize-case');
        try {
            const localOrders: any[] = JSON.parse(localStorage.getItem('luxius_session_ordenes') || '[]');
            const normalized = localOrders.map(o => ({
                ...o,
                clienteNombre: (o.clienteNombre || '').toUpperCase(),
                material: (o.material || '').toUpperCase(),
            }));
            localStorage.setItem('luxius_session_ordenes', JSON.stringify(normalized));
            localStorage.setItem('luxius_ordenes_last_save', String(Date.now()));
            alert('Textos de órdenes normalizados a MAYÚSCULAS.');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="sistema-view utilidades-view">
            <h3>Utilidades de Base de Datos y Respaldo</h3>
            <div className="db-tools-grid">
                <div className="tool-card">
                    <h4>Respaldo Full (Exportar)</h4>
                    <p>Genera y descarga una copia completa de seguridad de tus órdenes, materiales y servicios en formato JSON.</p>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleExportBackup}
                        disabled={!!loading}
                    >
                        {loading === 'backup' ? 'Generando...' : '📥 Descargar Backup'}
                    </Button>
                </div>
                <div className="tool-card">
                    <h4>Restaurar Respaldo (Importar)</h4>
                    <p>Carga un archivo de copia de seguridad (JSON) previamente exportado para recuperar todos tus datos.</p>
                    <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', display: 'inline-block', marginTop: '6px' }}>
                        📂 Cargar Backup JSON
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImportBackup}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>
                <div className="tool-card">
                    <h4>Limpiar Registros Antiguos</h4>
                    <p>Elimina registros históricos locales de más de 2 años para optimizar el rendimiento del sistema.</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCleanup}
                        disabled={!!loading}
                    >
                        {loading === 'cleanup' ? 'Limpiando...' : 'Iniciar Limpieza'}
                    </Button>
                </div>
                <div className="tool-card">
                    <h4>Normalizar Textos</h4>
                    <p>Normaliza nombres de clientes y materiales de las órdenes a MAYÚSCULAS para mayor consistencia.</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNormalizeCase}
                        disabled={!!loading}
                    >
                        {loading === 'normalize-case' ? 'Procesando...' : 'Procesar Textos'}
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
