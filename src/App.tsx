import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { hasRolePermission } from '@/types/auth'
import { initializeData } from '@/data/db'

// Layouts (static — always needed)
import MainLayout from '@components/layout/MainLayout'
import XanaAssistant from '@components/XanaAssistant'

// Pages (lazy-loaded — code splitting per route)
const Login = lazy(() => import('@pages/Login/Login'))
const Dashboard = lazy(() => import('@pages/Dashboard/Dashboard'))
const Entrada = lazy(() => import('@pages/Entrada/Entrada'))
const Diseno = lazy(() => import('@pages/Diseno/Diseno'))
const Impresion = lazy(() => import('@pages/Impresion/Impresion'))
const ABM = lazy(() => import('@pages/ABM/ABM'))
const Reportes = lazy(() => import('@pages/Reportes/Reportes'))
const Sistema = lazy(() => import('@pages/Sistema/Sistema'))
const Analytics = lazy(() => import('@pages/Analytics/Analytics'))
const Utilidades = lazy(() => import('@pages/Utilidades/Utilidades'))
const Stock = lazy(() => import('@pages/Stock/Stock'))
const Presupuestador = lazy(() => import('@/pages/Presupuestador/Presupuestador'))
const XpressViewer = lazy(() => import('@/pages/XpressViewer/XpressViewer'))
const XanaDashboard = lazy(() => import('@/pages/Xana/XanaDashboard'))

// Route loading fallback
function RouteFallback() {
    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            height: '60vh', color: 'var(--text-muted)'
        }}>
            <div className="loader" style={{
                width: '32px', height: '32px',
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'rotation 0.8s linear infinite',
            }} />
        </div>
    )
}

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


function App() {
    const [isInitializing, setIsInitializing] = useState(true)

    useEffect(() => {
        const init = async () => {
            const currentTheme = localStorage.getItem('theme') || 'pixel'
            document.documentElement.setAttribute('data-theme', currentTheme)
            if (currentTheme === 'pixel') {
                document.body.classList.add('pixel-theme')
            }

            // Validar sesión activa contra el servidor y sincronizar datos
            const authCheck = useAuthStore.getState().validateSession();
            const minTime = new Promise(resolve => setTimeout(resolve, 600));
            const dataLoad = initializeData();
            await Promise.all([authCheck, dataLoad, minTime]);
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
        <Suspense fallback={<RouteFallback />}>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <Suspense fallback={<RouteFallback />}>
                                    <Routes>
                                        <Route path="/" element={<Dashboard />} />
                                        <Route path="/entrada" element={<Entrada />} />
                                        <Route path="/presupuestador" element={<Presupuestador />} />
                                        <Route path="/xpress-viewer" element={<XpressViewer />} />
                                        <Route path="/diseno" element={<Diseno />} />
                                        <Route path="/impresion" element={<Impresion />} />
                                        <Route path="/stock" element={<Stock />} />
                                        <Route path="/analiticas" element={<Analytics />} />
                                        <Route path="/utilidades" element={<Utilidades />} />
                                        <Route path="/xana" element={<ProtectedRoute><XanaDashboard /></ProtectedRoute>} />
                                        <Route path="/abm/*" element={<ABM />} />
                                        <Route path="/reportes" element={<Reportes />} />
                                        <Route path="/sistema/*" element={<Sistema />} />
                                        <Route path="*" element={<Navigate to="/" replace />} />
                                    </Routes>
                                </Suspense>
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
            </Routes>
            <XanaAssistant />
        </Suspense>
    )
}

export default App
