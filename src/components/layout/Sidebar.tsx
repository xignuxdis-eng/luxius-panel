import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { hasRolePermission } from '@/types/auth'
import ThemeToggle from '@components/ui/ThemeToggle'
import ServerStatusLed from '@components/ui/ServerStatusLed'
import { ArcadeModal } from '@components/arcade/ArcadeModal'
import './Sidebar.css'

interface NavItem {
    path: string
    label: string
    icon: string
}

const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/', icon: '📊' },
    { label: 'Entrada', path: '/entrada', icon: '📥' },
    { label: 'Presupuestador', path: '/presupuestador', icon: '💰' },
    { label: 'Xpress Viewer', path: '/xpress-viewer', icon: '👁️' },
    { label: 'Diseño', path: '/diseno', icon: '🎨' },
    { label: 'Impresión', path: '/impresion', icon: '🖨️' },
    { label: 'Stock', path: '/stock', icon: '📦' },
    { label: 'Analíticas', path: '/analiticas', icon: '📈' },
    { label: 'Administración', path: '/abm', icon: '💼' },
    { label: 'Utilidades', path: '/utilidades', icon: '🛠️' },
    { label: 'Reportes', path: '/reportes', icon: '📊' },
    { label: 'Sistema', path: '/sistema', icon: '⚙️' },
    { label: 'Xana Memoria', path: '/xana', icon: '🧠' },
]

interface SidebarProps {
    isOpen?: boolean
    onClose?: () => void
    isCollapsed?: boolean
    onToggleCollapse?: () => void
}

export default function Sidebar({ isOpen = false, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
    const navigate = useNavigate()
    const { user, logout } = useAuthStore()
    const [isArcadeOpen, setIsArcadeOpen] = useState(false)

    const handleLogout = () => {
        onClose?.()
        logout()
        navigate('/login')
    }

    // Filter items based on user role using standardized permission helper
    const filteredItems = navItems.filter(item => {
        if (!user) return false;
        return hasRolePermission(user.role, item.path);
    });

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="logo-brand">
                        <span className="logo-icon" title="LuXius">✦</span>
                        {!isCollapsed && <span className="logo-text">LuXius</span>}
                    </div>
                    {!isCollapsed && <span className="logo-subtitle">...núcleo operativo de XignuX</span>}
                </div>
                {onToggleCollapse && (
                    <button
                        type="button"
                        className="sidebar-collapse-btn"
                        onClick={onToggleCollapse}
                        title={isCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral (Modo Taller)"}
                        aria-label="Colapsar menú lateral"
                    >
                        {isCollapsed ? '▶' : '◀'}
                    </button>
                )}
                {onClose && (
                    <button
                        type="button"
                        className="sidebar-close-btn"
                        onClick={onClose}
                        aria-label="Cerrar navegación"
                        title="Cerrar menú"
                    >
                        ✕
                    </button>
                )}
            </div>

            <nav className="sidebar-nav">
                <ul className="nav-links">
                    {filteredItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `nav-item ${isActive ? 'active' : ''}`
                                }
                                end={item.path === '/'}
                                onClick={() => onClose?.()}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {!isCollapsed && <span className="nav-label">{item.label}</span>}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="sidebar-footer">
                {!isCollapsed ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                            <ServerStatusLed />
                            <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                letterSpacing: '0.5px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255, 107, 0, 0.12)',
                                color: 'var(--accent)',
                                border: '1px solid rgba(255, 107, 0, 0.25)',
                                fontFamily: 'monospace'
                            }} title="Versión del Sistema LuXius">
                                v1.1.0
                            </span>
                        </div>
                        <div className="sidebar-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <ThemeToggle />
                            <button
                                className="sidebar-arcade-btn"
                                onClick={() => setIsArcadeOpen(true)}
                                title="Abrir Arcade Center de Minijuegos"
                            >
                                🕹️ Arcade
                            </button>
                            <button className="logout-btn" onClick={handleLogout}>
                                Salir
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <ServerStatusLed />
                        <ThemeToggle />
                        <button
                            className="sidebar-arcade-btn"
                            onClick={() => setIsArcadeOpen(true)}
                            title="Abrir Arcade"
                            style={{ padding: '6px', minWidth: '32px' }}
                        >
                            🕹️
                        </button>
                        <button
                            className="logout-btn"
                            onClick={handleLogout}
                            title="Cerrar Sesión"
                            style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                        >
                            🚪
                        </button>
                        <span style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: '4px',
                            background: 'rgba(255, 107, 0, 0.12)',
                            color: 'var(--accent)',
                            fontFamily: 'monospace'
                        }}>
                            1.1
                        </span>
                    </div>
                )}
            </div>

            <ArcadeModal isOpen={isArcadeOpen} onClose={() => setIsArcadeOpen(false)} />
        </aside>
    )
}

