import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'

// Layouts
import MainLayout from '@components/layout/MainLayout'
import XanaAssistant from '@components/XanaAssistant'

// Pages
import Login from '@pages/Login/Login'
import Dashboard from '@pages/Dashboard/Dashboard'
import Entrada from '@pages/Entrada/Entrada'
import Diseno from '@pages/Diseno/Diseno'
import Impresion from '@pages/Impresion/Impresion'
import ABM from '@pages/ABM/ABM'
import Reportes from '@pages/Reportes/Reportes'
import Sistema from '@pages/Sistema/Sistema'
import Analytics from '@pages/Analytics/Analytics'

import { useLocation } from 'react-router-dom'
import { hasRolePermission } from '@/types/auth'

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuthStore()
    const location = useLocation()

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />
    }

    const currentPath = location.pathname
    const allowed = hasRolePermission(user.role, currentPath)

    if (!allowed) {
        console.warn(`User ${user.username} (role: ${user.role}) denied access to ${currentPath}`)
        return <Navigate to="/" replace />
    }

    return <>{children}</>
}

import Utilidades from '@pages/Utilidades/Utilidades'
import Stock from '@pages/Stock/Stock'
import Presupuestador from '@/pages/Presupuestador/Presupuestador'

import { useEffect, useState } from 'react'
import { initializeData } from '@/data/db'

function App() {
    const [isInitializing, setIsInitializing] = useState(true)

    useEffect(() => {
        const init = async () => {
            const currentTheme = localStorage.getItem('theme') || 'pixel'
            document.documentElement.setAttribute('data-theme', currentTheme)
            if (currentTheme === 'pixel') {
                document.body.classList.add('pixel-theme')
            }

            // Force a minimum loading time to prevent flicker and ensure storage is ready
            const minTime = new Promise(resolve => setTimeout(resolve, 800));
            const dataLoad = initializeData();
            await Promise.all([dataLoad, minTime]);
            setIsInitializing(false);
        }
        init();
    }, []);

    if (isInitializing) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#1a1b1e',
                color: '#e0e0e0',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div className="loader" style={{
                    width: '48px',
                    height: '48px',
                    border: '5px solid #FFF',
                    borderBottomColor: 'transparent',
                    borderRadius: '50%',
                    display: 'inline-block',
                    boxSizing: 'border-box',
                    animation: 'rotation 1s linear infinite',
                }}></div>
                <style>{`
                    @keyframes rotation {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
                <p>Sincronizando Sistema...</p>
            </div>
        )
    }

    return (
        <>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/entrada" element={<Entrada />} />
                                    <Route path="/presupuestador" element={<Presupuestador />} />
                                    <Route path="/diseno" element={<Diseno />} />
                                    <Route path="/impresion" element={<Impresion />} />
                                    <Route path="/stock" element={<Stock />} />
                                    <Route path="/analiticas" element={<Analytics />} />
                                    <Route path="/utilidades" element={<Utilidades />} />
                                    <Route path="/abm/*" element={<ABM />} />
                                    <Route path="/reportes" element={<Reportes />} />
                                    <Route path="/sistema/*" element={<Sistema />} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
            </Routes>
            <XanaAssistant />
        </>
    )
}

export default App
