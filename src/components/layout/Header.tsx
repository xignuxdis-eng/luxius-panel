import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { getUsuarios, initializeData, getMateriales, getOrdenes } from '@data/db'
import { computeStockForecast, canViewStockAlerts } from '@/utils/stockForecast'
import PerfilModal from '../../pages/Sistema/PerfilModal'
import { ArcadeModal } from '@components/arcade/ArcadeModal'
import './Header.css'

interface HeaderProps {
    title: string
    subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
    const user = useAuthStore((state) => state.user)
    const navigate = useNavigate()
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isArcadeOpen, setIsArcadeOpen] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [stockAlertCount, setStockAlertCount] = useState(0)
    const canViewAlerts = canViewStockAlerts(user?.role)

    useEffect(() => {
        if (!canViewAlerts) return
        let active = true
        getOrdenes().then(orders => {
            if (!active) return
            const forecast = computeStockForecast(orders, getMateriales())
            setStockAlertCount(forecast.groupsAtRisk.length)
        }).catch(() => {})
        return () => { active = false }
    }, [])

    const handleQuickSync = async () => {
        setIsSyncing(true)
        try {
            await initializeData()
            window.location.reload()
        } catch {
            setIsSyncing(false)
        }
    }

    // Get live Avatar from DB if possible
    const dbUser = user ? getUsuarios().find(u => u.id === user.id) : null
    const avatarUrl = dbUser?.avatar

    const now = new Date()
    const timeString = now.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' })
    const dateString = now.toLocaleDateString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })

    return (
        <header className="header">
            <div className="header-left">
                <h1 className="header-title">{title}</h1>
                {subtitle && <p className="header-subtitle">{subtitle}</p>}
            </div>

            <div className="header-right">
                {canViewAlerts && (
                    <button
                        className="header-action-btn header-stock-btn"
                        onClick={() => navigate('/stock')}
                        title={`${stockAlertCount} grupo(s) en riesgo de faltante de stock`}
                    >
                        <span>🔔</span>
                        <span>STOCK</span>
                        {stockAlertCount > 0 && (
                            <span className="header-stock-badge">
                                {stockAlertCount}
                            </span>
                        )}
                    </button>
                )}

                <button
                    className="header-action-btn header-sync-btn"
                    onClick={handleQuickSync}
                    disabled={isSyncing}
                    title="Sincronizar datos de la base de datos y forzar actualización de versión"
                >
                    <span className={`header-sync-icon ${isSyncing ? 'spinning' : ''}`}>🔄</span>
                    <span>{isSyncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR'}</span>
                </button>

                <button
                    className="header-action-btn header-arcade-btn"
                    onClick={() => setIsArcadeOpen(true)}
                    title="Abrir Arcade Center de Minijuegos"
                >
                    <span>🕹️</span>
                    <span>ARCADE</span>
                </button>

                <div className="header-datetime">
                    <span className="header-time">{timeString}</span>
                    <span className="header-date">{dateString}</span>
                </div>

                <div className="header-user" onClick={() => setIsProfileOpen(true)} style={{ cursor: 'pointer' }}>
                    <div className="header-avatar">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : null}
                    </div>
                    <span className="header-username">{user?.name || 'Usuario'}</span>
                </div>
            </div>

            <PerfilModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
            <ArcadeModal isOpen={isArcadeOpen} onClose={() => setIsArcadeOpen(false)} />
        </header>
    )
}
