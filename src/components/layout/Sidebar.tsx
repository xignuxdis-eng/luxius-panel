import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { hasRolePermission } from '@/types/auth'
import ThemeToggle from '@components/ui/ThemeToggle'
import { ArcadeModal } from '@components/arcade/ArcadeModal'
import './Sidebar.css'

interface NavItem {
    path: string
    label: string
    icon: string
}

const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/', icon: '📊' },
    { label: 'Entrada', path: '/entrada', icon: '📝' },
    { label: 'Presupuestador', path: '/presupuestador', icon: '🧮' },
    { label: 'Diseño', path: '/diseno', icon: '🎨' },
    { label: 'Impresión', path: '/impresion', icon: '🖨️' },
    { label: 'Stock', path: '/stock', icon: '📦' },
    { label: 'Analíticas', path: '/analiticas', icon: '📈' },
    { label: 'Administración', path: '/abm', icon: '💼' },
    { label: 'Utilidades', path: '/utilidades', icon: '🛠️' },
    { label: 'Reportes', path: '/reportes', icon: '📊' },
    { label: 'Sistema', path: '/sistema', icon: '⚙️' },
]

export default function Sidebar() {
    const navigate = useNavigate()
    const { user, logout } = useAuthStore()
    const [isArcadeOpen, setIsArcadeOpen] = useState(false)

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    // Filter items based on user role using standardized permission helper
    const filteredItems = navItems.filter(item => {
        if (!user) return false;
        return hasRolePermission(user.role, item.path);
    });

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-brand">
                    <span className="logo-icon">✦</span>
                    <span className="logo-text">LuXius</span>
                </div>
                <span className="logo-subtitle">...núcleo operativo de XignuX</span>
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
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <ThemeToggle />
                    <button
                        className="pixel-btn pixel-btn-warning"
                        onClick={() => setIsArcadeOpen(true)}
                        title="Abrir Arcade Center de Minijuegos"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                        🕹️ ARCADE
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        Salir
                    </button>
                </div>
            </div>

            <ArcadeModal isOpen={isArcadeOpen} onClose={() => setIsArcadeOpen(false)} />
        </aside>
    )
}

