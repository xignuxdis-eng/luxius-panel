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
    const location = useLocation()

    // Auto-close sidebar drawer on route change
    useEffect(() => {
        setIsSidebarOpen(false)
    }, [location.pathname])

    // FAB actions for mobile — dispatch custom events to toggle widgets
    const fabActions = [
        {
            id: 'xana',
            icon: '🤖',
            label: 'Xana IA',
            color: '#9333ea',
            onClick: () => {
                // Toggle Xana assistant by simulating click on its button
                const xanaBtn = document.querySelector('.xana-button') as HTMLButtonElement
                if (xanaBtn) xanaBtn.click()
            },
        },
        {
            id: 'whatsapp',
            icon: '💬',
            label: 'WhatsApp',
            color: '#25d366',
            onClick: () => window.open('https://wa.me/5493518192655', '_blank'),
        },
        {
            id: 'calculator',
            icon: '🧮',
            label: 'Calculadora',
            color: '#3b82f6',
            onClick: () => {
                const calcBtn = document.querySelector('.calc-toggle-btn') as HTMLButtonElement
                if (calcBtn) calcBtn.click()
            },
        },
        {
            id: 'media',
            icon: '🎵',
            label: 'Reproductor',
            color: '#f59e0b',
            onClick: () => {
                const mediaBtn = document.querySelector('.media-player-toggle') as HTMLButtonElement
                if (mediaBtn) mediaBtn.click()
            },
        },
    ]

    return (
        <div className="main-layout">
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
