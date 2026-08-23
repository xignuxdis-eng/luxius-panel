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
    { label: 'Dashboard', path: '/', icon: 'ðŸ“Š' },
    { label: 'Entrada', path: '/entrada', icon: 'ðŸ“' },
    { label: 'Presupuestador', path: '/presupuestador', icon: 'ðŸ§®' },
    { label: 'Xpress Viewer', path: '/xpress-viewer', icon: '👁️' },
    { label: 'DiseÃ±o', path: '/diseno', icon: 'ðŸŽ¨' },
    { label: 'ImpresiÃ³n', path: '/impresion', icon: 'ðŸ–¨ï¸' },
    { label: 'Stock', path: '/stock', icon: 'ðŸ“¦' },
    { label: 'AnalÃ­ticas', path: '/analiticas', icon: 'ðŸ“ˆ' },
    { label: 'AdministraciÃ³n', path: '/abm', icon: 'ðŸ’¼' },
    { label: 'Utilidades', path: '/utilidades', icon: 'ðŸ› ï¸' },
    { label: 'Reportes', path: '/reportes', icon: 'ðŸ“Š' },
    { label: 'Sistema', path: '/sistema', icon: 'âš™ï¸' },
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
                    <span className="logo-icon">âœ¦</span>
                    <span className="logo-text">LuXius</span>
                </div>
                <span className="logo-subtitle">...nÃºcleo operativo de XignuX</span>
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
                        ðŸ•¹ï¸ ARCADE
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

