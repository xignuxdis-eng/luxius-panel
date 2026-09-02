import { useState } from 'react'
import { useAuthStore } from '@store/authStore'
import { getUsuarios, initializeData } from '@data/db'
import PerfilModal from '../../pages/Sistema/PerfilModal'
import { ArcadeModal } from '@components/arcade/ArcadeModal'
import './Header.css'

interface HeaderProps {
    title: string
    subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
    const user = useAuthStore((state) => state.user)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isArcadeOpen, setIsArcadeOpen] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)

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
                <button
                    className="pixel-btn pixel-btn-info"
                    onClick={handleQuickSync}
                    disabled={isSyncing}
                    title="Sincronizar datos y actualizar versión en vivo"
                    style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <span style={{ display: 'inline-block', animation: isSyncing ? 'rotation 1s linear infinite' : 'none' }}>🔄</span>
                    <span>{isSyncing ? 'SYNC...' : 'SYNC'}</span>
                </button>

                <button
                    className="pixel-btn pixel-btn-warning"
                    onClick={() => setIsArcadeOpen(true)}
                    title="Abrir Arcade Center de Minijuegos"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                    🕹️ ARCADE
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
