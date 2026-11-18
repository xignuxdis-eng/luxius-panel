import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import MediaPlayer from '@components/ui/MediaPlayer'
import FloatingCalculator from '@components/ui/FloatingCalculator'
import FloatingAlarm from '@components/ui/FloatingAlarm'
import FloatingWhatsApp from '@components/ui/FloatingWhatsApp'
import XanaAssistant from '@components/XanaAssistant'
import FABMenu from '@components/ui/FABMenu'
import './MainLayout.css'

interface MainLayoutProps {
    children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        try {
            return localStorage.getItem('luxius_sidebar_collapsed') === 'true'
        } catch {
            return false
        }
    })
    const location = useLocation()

    const toggleSidebarCollapse = () => {
        setIsSidebarCollapsed(prev => {
            const next = !prev
            try {
                localStorage.setItem('luxius_sidebar_collapsed', String(next))
            } catch {}
            return next
        })
    }

    // Auto-close sidebar drawer on route change
    useEffect(() => {
        setIsSidebarOpen(false)
    }, [location.pathname])

    // FAB actions for desktop & mobile — dispatch clicks to toggle widgets
    const fabActions = [
        {
            id: 'xana',
            icon: '🤖',
            label: 'Xana IA',
            color: '#9333ea',
            onClick: () => {
                const el = document.querySelector('.xana-button, .xana-close-btn') as HTMLElement | null
                el?.click()
            },
        },
        {
            id: 'whatsapp',
            icon: '💬',
            label: 'WhatsApp',
            color: '#15803d',
            onClick: () => window.open('https://wa.me/5493518192655', '_blank'),
        },
        {
            id: 'alarm',
            icon: '⏰',
            label: 'Temporizador',
            color: '#8b5cf6',
            onClick: () => {
                const el = document.querySelector('.minimized-alarm, .alarm-minimize') as HTMLElement | null
                el?.click()
            },
        },
        {
            id: 'calculator',
            icon: '🧮',
            label: 'Calculadora',
            color: '#2563eb',
            onClick: () => {
                const el = document.querySelector('.minimized-calculator, .calc-minimize') as HTMLElement | null
                el?.click()
            },
        },
        {
            id: 'media',
            icon: '🎵',
            label: 'Reproductor',
            color: '#b45309',
            onClick: () => {
                const el = document.querySelector('.minimized-player, .minimize-btn') as HTMLElement | null
                el?.click()
            },
        },
    ]

    return (
        <div className={`main-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Top mobile navigation bar (visible only <= 1024px) */}
            <header className="mobile-topbar">
                <button
                    type="button"
                    className="mobile-hamburger-btn"
                    onClick={() => setIsSidebarOpen(prev => !prev)}
                    aria-label="Abrir menú de navegación"
                    aria-expanded={isSidebarOpen}
                >
                    <span className="hamburger-icon">☰</span>
                </button>
                <div className="mobile-topbar-brand">
                    <span className="mobile-topbar-icon">✦</span>
                    <span className="mobile-topbar-title">LuXius</span>
                </div>
                <div className="mobile-topbar-spacer" />
            </header>

            {/* Backdrop overlay for mobile drawer */}
            {isSidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={toggleSidebarCollapse}
            />

            <main className="main-content">
                {children}
            </main>

            <XanaAssistant />
            <FloatingWhatsApp />
            <FloatingAlarm />
            <FloatingCalculator />
            <MediaPlayer />

            {/* FAB unificado — visible solo en mobile (≤768px via CSS) */}
            <FABMenu actions={fabActions} />
        </div>
    )
}
