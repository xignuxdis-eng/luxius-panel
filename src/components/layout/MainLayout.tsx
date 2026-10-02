import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import MediaPlayer from '@components/ui/MediaPlayer'
import FloatingCalculator from '@components/ui/FloatingCalculator'
import FloatingAlarm from '@components/ui/FloatingAlarm'
import FloatingWhatsApp from '@components/ui/FloatingWhatsApp'
import XanaAssistant from '@components/XanaAssistant'
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
        </div>
    )
}



