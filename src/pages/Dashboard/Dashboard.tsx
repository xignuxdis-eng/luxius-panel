
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@components/layout/Header'
import { useAuthStore } from '@store/authStore'
import { getStats, getOrdenes, getMateriales, saveOrden, getAuthHeaders, API_URL } from '@data/db'
import CalendarView from './CalendarView'
import QuickNotes from './QuickNotes'
import { Order, isDesignerRole, isDesignerOwner } from '@/types'
import './Dashboard.css'

import WorkshopDashboard from '@components/workshop/WorkshopDashboard'
import MorningBriefingModal from '@components/workshop/MorningBriefingModal'

export default function Dashboard() {
    const navigate = useNavigate()
    const user = useAuthStore((state) => state.user)
    const isVisitor = user?.role === 'visitante'
    const isClient = user?.role === 'cliente'
    const [viewMode, setViewMode] = useState<'workshop' | 'standard'>(() => (isVisitor || isClient) ? 'standard' : 'workshop')
    const [showBriefing, setShowBriefing] = useState(false)

    // States for async data
    const [dbStats, setDbStats] = useState<any>({
        ordenesHoy: 0,
        pendientesImpresion: 0,
        trabajosCompletados: 0,
        entregasHoy: 0,
        ordenesPendientes: 0,
        clientesActivos: 0,
        totalClientes: 0,
        maquinasOnline: 0,
        totalMateriales: 0
    })
    const [myOrdersCount, setMyOrdersCount] = useState(0)
    const [myPendingCount, setMyPendingCount] = useState(0)

    // Client specific stats (Constant since unused logic removed)
    const clientStats = { activos: 0, finalizados: 0, historico: 0 }



    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true)

                // 1. Load Global Stats
                const stats = await getStats()
                setDbStats(stats)

                // 2. Load Artist specific stats
                if (isDesignerRole(user?.role) && user) {
                    const allOrders = await getOrdenes()
                    const myOrders = allOrders.filter(o => isDesignerOwner(o, user))
                    setMyOrdersCount(myOrders.filter(o => o.status !== 'entregado').length)
                    setMyPendingCount(myOrders.filter(o => ['preorden', 'diseno', 'rebotado'].includes(o.status)).length)
                }

                // 4. Load Printer specific stats
                if (user?.role === 'impresion') {
                    const allOrders = await getOrdenes()
                    const today = new Date().toISOString().split('T')[0]

                    // Filter for Printer:
                    // 1. Pending to print (status: 'orden')
                    // 2. Printed TODAY (status: 'impreso' && updatedAt_is_today)
                    // Note: using createdAt as proxy if updatedAt missing, or just status if simplifying


                    // "Disponibles" (Pending) + "Impresos Hoy" (Done Today)
                    const pending = allOrders.filter(o => o.status === 'orden').length
                    const printedToday = allOrders.filter(o => {
                        const date = o.updatedAt ? o.updatedAt.split('T')[0] : (o.createdAt ? o.createdAt.split('T')[0] : '');
                        return o.status === 'impreso' && date === today;
                    }).length

                    setDbStats((prev: any) => ({
                        ...prev,
                        printerActivity: pending + printedToday,
                        printerPending: pending
                    }))
                }

            } catch (error) {
                console.error("Failed to load dashboard data", error)
            } finally {
                setLoading(false)
            }
        }

        loadDashboardData()
    }, [user])

    const isAdmin = user?.role === 'administrador' || user?.role === 'principal'

    let stats = []

    if (user?.role === 'cliente') {
        stats = [
            { label: 'Pedidos En Curso', value: clientStats.activos, color: 'accent', path: '/entrada' },
            { label: 'Listos para Retirar', value: clientStats.finalizados, color: 'default', path: '/entrada' },
            { label: 'Historial Total', value: clientStats.historico, color: 'default', path: '/entrada' },
        ]
    } else if (isDesignerRole(user?.role)) {
        stats = [
            { label: 'Mis Trabajos', value: myOrdersCount, color: 'accent', path: '/diseno' },
            { label: 'Pendientes', value: myPendingCount, color: 'default', path: '/diseno' },
            { label: 'Trabajos Completados', value: dbStats.trabajosCompletados, color: 'default', path: '/reportes' }
        ]
    } else if (user?.role === 'impresion') {
        stats = [
            { label: 'Actividad del Día', value: dbStats.printerActivity || 0, color: 'default', path: '/impresion' },
            { label: 'Disponibles para Imprimir', value: dbStats.printerPending || 0, color: 'accent', path: '/impresion' },
            // Removing 'Trabajos Completados' global metric to avoid confusion, or keeping it?
            // User wants to see THEIR assignments. keeping it simple.
        ]
    } else {
        stats = [
            { label: 'Ordenes del Día', value: dbStats.ordenesHoy, color: 'default', path: '/entrada' },
            { label: 'Pendientes Impresión', value: dbStats.pendientesImpresion, color: 'accent', path: '/impresion' },
            { label: 'Trabajos Completados', value: dbStats.trabajosCompletados, color: 'default', path: '/reportes' },
            { label: 'Entregas Hoy', value: dbStats.entregasHoy, color: 'default', path: '/entrada' },
        ]
    }

    const quickStats = [
        ...(isDesignerRole(user?.role) && user?.id
            ? [{
                label: 'Mis Pendientes',
                value: myPendingCount,
                path: '/diseno'
            }]
            : (user?.role !== 'cliente' ? [{ label: 'Ordenes Pendientes', value: dbStats.ordenesPendientes, path: '/entrada' }] : [])
        ),
        ...(isAdmin ? [
            { label: 'Clientes Activos', value: dbStats.clientesActivos, path: '/abm/clientes' },
            { label: 'Total Clientes', value: dbStats.totalClientes, path: '/abm/clientes' },
            { label: 'Maquinas Online', value: dbStats.maquinasOnline, path: '/sistema' },
            { label: 'Total Materiales', value: dbStats.totalMateriales, path: '/abm/insumos' },
        ] : []),
        // Client quick stats
        ...(user?.role === 'cliente' ? [
            { label: 'En Proceso', value: clientStats.activos, path: '/entrada' },
        ] : [])
    ]

    if (loading) {
        return <div className="dashboard-loading">Cargando Panel de Control...</div>
    }

    return (
        <div className="dashboard">
            <div className="dashboard-topbar">
                <Header
                    title="Panel de Control Luxius"
                    subtitle={`Bienvenido de nuevo, ${user?.name?.split(' ')[0] || 'Usuario'}.`}
                />
                {!isClient && (
                <div className="dashboard-topbar-actions">
                    <button
                        type="button"
                        className="dashboard-briefing-btn"
                        onClick={() => setShowBriefing(true)}
                        title="Ver resumen matutino de taller y secuencia recomendada"
                    >
                        ☀️ Briefing del Día
                    </button>
                    <button
                        type="button"
                        className={`dashboard-mode-btn ${viewMode === 'workshop' ? 'is-active' : ''}`}
                        aria-pressed={viewMode === 'workshop'}
                        onClick={() => setViewMode('workshop')}
                    >
                        🎮 Taller Pixel Art
                    </button>
                    <button
                        type="button"
                        className={`dashboard-mode-btn ${viewMode === 'standard' ? 'is-active' : ''}`}
                        aria-pressed={viewMode === 'standard'}
                        onClick={() => setViewMode('standard')}
                    >
                        📊 Vista Estándar
                    </button>
                </div>
                )}
            </div>

            {viewMode === 'workshop' && !isClient ? (
                <div style={{ marginBottom: '24px' }}>
                    {isVisitor ? (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            borderRadius: '16px',
                            padding: '36px 24px',
                            textAlign: 'center',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                            color: '#f8fafc'
                        }}>
                            <div style={{ fontSize: '44px', marginBottom: '12px' }}>🏭 🎮</div>
                            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '10px' }}>
                                Módulo Taller Gamificado en Pixel Art (PixiJS v8)
                            </h2>
                            <p style={{ maxWidth: '640px', margin: '0 auto 18px auto', color: '#94a3b8', lineHeight: '1.6', fontSize: '14px' }}>
                                Este módulo visualiza la distribución física exacta del taller, máquinas en línea, colas de impresión y operarios activos con sonido e interactividad en tiempo real.
                            </p>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                                border: '1px dashed #38bdf8',
                                borderRadius: '8px',
                                color: '#38bdf8',
                                fontSize: '13px',
                                fontWeight: 600
                            }}>
                                🔒 En la versión comercial, este plano interactivo se customiza con las máquinas y puestos de cada taller cliente.
                            </div>
                            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => navigate('/entrada')}
                                    style={{
                                        padding: '10px 18px',
                                        backgroundColor: '#38bdf8',
                                        color: '#0f172a',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Explorar Flujo de Pedidos 📥
                                </button>
                                <button
                                    onClick={() => navigate('/presupuestador')}
                                    style={{
                                        padding: '10px 18px',
                                        backgroundColor: 'rgba(255,255,255,0.08)',
                                        color: '#f8fafc',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Probar Presupuestador y Anidado 💰
                                </button>
                            </div>
                        </div>
                    ) : (
                        <WorkshopDashboard />
                    )}
                </div>
            ) : null}

            <section className="stats-grid">

                {stats.map((stat, index) => (
                    <div
                        key={stat.label}
                        className="stat-card animate-fade-in clickable"
                        style={{ animationDelay: `${index * 0.1} s` }}
                        onClick={() => navigate(stat.path)}
                    >
                        <div className={`stat - value ${stat.color === 'accent' ? 'text-accent' : ''} `}>
                            {stat.value}
                        </div>
                        <div className="stat-label">{stat.label}</div>
                    </div>
                ))}
            </section>

            <div className="dashboard-content">
                <div className="main-panel animate-slide-up">
                    <div className="calendar-section">
                        <CalendarView isWidget={true} />
                    </div>
                    {/* Visual Stock Alerts Widget for Admins */}
                    {isAdmin && (
                        <StockAlertsWidget />
                    )}
                    {/* System Access Log Feed for Admins */}
                    {isAdmin && (
                        <AccessLogFeedWidget />
                    )}
                    {/* Ink Coverage Analytics Widget */}
                    {user?.role !== 'cliente' && (
                        <InkCoverageWidget />
                    )}
                </div>

                <aside className="side-panel animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <div className="quick-stats-card">
                        <h3>Resumen General</h3>
                        <div className="quick-stats-list">
                            {quickStats.map((stat, i) => (
                                <div key={i} className="quick-stat-item clickable" onClick={() => navigate(stat.path)}>
                                    <span>{stat.label}</span>
                                    <span className="font-mono font-bold">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {isVisitor ? (
                        <div className="quick-notes-card" style={{
                            padding: '16px',
                            background: 'rgba(30, 41, 59, 0.7)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            marginBottom: '16px'
                        }}>
                            <h3 style={{ fontSize: '13px', color: '#38bdf8', marginBottom: '8px', fontWeight: 600 }}>
                                📝 Bloc de Turno del Taller
                            </h3>
                            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
                                Espacio colaborativo rápido para que operarios, diseñadores y encargados coordinen prioridades diarias de producción.
                            </p>
                        </div>
                    ) : (
                        <QuickNotes />
                    )}

                    {/* System Status - Discreet & Elegant */}
                    <div className="system-status-compact animate-fade-in" style={{ marginTop: 'auto' }}>
                        <div className="status-pill">
                            <span className="status-dot-pulse"></span>
                            <span className="status-label">Servidor</span>
                        </div>
                        <div className="status-divider"></div>
                        <div className="status-pill">
                            <span className="status-dot-pulse"></span>
                            <span className="status-label">DB</span>
                        </div>
                        <div className="status-divider"></div>
                        <div className="status-pill" style={{ opacity: 0.7 }}>
                            <span className="status-label">v2.4</span>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Morning Briefing Modal */}
            <MorningBriefingModal isOpen={showBriefing} onClose={() => setShowBriefing(false)} />
        </div>
    )
}

// Internal Component for Ink Coverage
function InkCoverageWidget() {
    const [coverage, setCoverage] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const calculateCoverage = async () => {
            try {
                // Default standard ink usage per m2 for eco-solvent/UV large format printing (in mL/m2)
                let avgUsage: { [key: string]: number } = { c: 2.8, m: 3.2, y: 2.5, k: 3.5 }

                // 1. Fetch Printer Stats for actual usage calculation if available
                try {
                    const res = await fetch(`${API_URL}/analytics/stats`)
                    if (res.ok) {
                        const jobs = await res.json()
                        if (Array.isArray(jobs) && jobs.length > 0) {
                            let totalM2 = 0
                            const totalInk = { c: 0, m: 0, y: 0, k: 0 }

                            jobs.forEach((job: any) => {
                                if (job && job.sizeM2 > 0 && job.ink) {
                                    totalM2 += Number(job.sizeM2) || 0
                                    totalInk.c += Number(job.ink.c) || 0
                                    totalInk.m += Number(job.ink.m) || 0
                                    totalInk.y += Number(job.ink.y) || 0
                                    totalInk.k += Number(job.ink.k) || 0
                                }
                            })

                            if (totalM2 > 0) {
                                avgUsage = {
                                    c: (totalInk.c / totalM2) || 2.8,
                                    m: (totalInk.m / totalM2) || 3.2,
                                    y: (totalInk.y / totalM2) || 2.5,
                                    k: (totalInk.k / totalM2) || 3.5
                                }
                            }
                        }
                    }
                } catch {
                    // Use default standard usage if stats endpoint is unavailable
                }

                // 2. Fetch Current Stock
                const materiales = getMateriales() || []
                const inks = [
                    { code: 'C', name: 'Cyan', color: '#00ffff', matcher: ['cyan', 'cian', 'ink-c'] },
                    { code: 'M', name: 'Magenta', color: '#ff00ff', matcher: ['magenta', 'ink-m'] },
                    { code: 'Y', name: 'Yellow', color: '#ffff00', matcher: ['yellow', 'amarillo', 'ink-y'] },
                    { code: 'K', name: 'Black', color: '#dddddd', matcher: ['black', 'negro', 'ink-k'] }
                ]

                const estimates = inks.map(inkType => {
                    let totalStockMl = 0

                    ;(materiales as any[])
                        .filter((m: any) => {
                            if (!m) return false
                            const desc = `${m.descripcion || ''} ${m.codigo || ''}`.toLowerCase()
                            const isInk = m.tipo === 'tinta' || desc.includes('tinta') || desc.includes('ink')
                            if (!isInk) return false

                            return inkType.matcher.some(term => desc.includes(term))
                        })
                        .forEach((m: any) => {
                            const rawStock = Number(m.stockActual) || 0
                            // En Stock.tsx los tanques se manejan en ml (capacidad 2000ml, alerta 300ml).
                            // Si el valor ingresado es > 20, ya viene en mililitros (ej: 500 ml).
                            // Si es <= 20, representa litros directos (ej: 2 L = 2000 ml).
                            const tankMl = rawStock > 20 ? rawStock : rawStock * 1000
                            const sealedMl = (Number(m.botellasCerradas) || 0) * 1000 + (Number(m.botellasMl) || 0)
                            totalStockMl += (tankMl + sealedMl)
                        })

                    const usagePerM2 = avgUsage[inkType.code.toLowerCase()] || 3.0
                    const capacityM2 = usagePerM2 > 0 ? totalStockMl / usagePerM2 : 0
                    const stockLiters = totalStockMl / 1000

                    return {
                        ...inkType,
                        stockLiters,
                        totalStockMl,
                        avgUsage,
                        capacityM2
                    }
                })

                setCoverage(estimates)
            } catch (e) {
                console.warn("[Ink Coverage] No se pudo calcular la cobertura de tintas:", e)
            } finally {
                setLoading(false)
            }
        }

        calculateCoverage()
    }, [])

    if (loading || coverage.length === 0) return null

    // Find limiting factor
    const minmetrics = coverage.reduce((min, curr) => (curr.capacityM2 < (min?.capacityM2 ?? Infinity) ? curr : min), coverage[0])

    return (
        <div className="ink-coverage-card animate-slide-up" style={{ marginTop: '1rem', background: 'var(--bg-mid)', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Autonomía Estimada de Tinta</h3>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    Limita: <strong style={{ color: minmetrics?.color === '#dddddd' ? '#fff' : minmetrics?.color }}>{minmetrics?.name}</strong> (~{Math.round(minmetrics?.capacityM2 || 0).toLocaleString('es-AR')} m²)
                </div>
            </div>

            <div className="ink-bars" style={{ display: 'flex', gap: '1rem', height: '120px', alignItems: 'flex-end', justifyContent: 'space-around' }}>
                {coverage.map(ink => {
                    // Scale height relative to the max capacity or a fixed reliable max to visualize
                    const maxInSet = Math.max(...coverage.map(c => c.capacityM2))
                    const heightPercent = maxInSet > 0 ? (ink.capacityM2 / maxInSet) * 100 : 0

                    return (
                        <div key={ink.code} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%' }}>
                            <div style={{
                                position: 'relative',
                                flex: 1,
                                width: '100%',
                                display: 'flex',
                                alignItems: 'flex-end',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px 8px 0 0',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: '100%',
                                    height: `${heightPercent}%`,
                                    background: ink.color,
                                    opacity: 0.8,
                                    boxShadow: `0 0 10px ${ink.color}`,
                                    transition: 'height 1s ease-out'
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '4px',
                                    width: '100%',
                                    textAlign: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    color: '#000',
                                    textShadow: '0 0 2px rgba(255,255,255,0.8)'
                                }}>
                                    {Math.round(ink.capacityM2).toLocaleString('es-AR')} m²
                                </div>
                            </div>
                            <div style={{ marginTop: '6px', fontSize: '0.8rem', fontWeight: 600 }}>{ink.name}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                {ink.stockLiters < 1 ? `${Math.round(ink.totalStockMl)} ml` : `${ink.stockLiters.toFixed(2)} L`}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}


// Visual Stock Alerts Widget
function StockAlertsWidget() {
    const [alerts, setAlerts] = useState<Order[]>([])
    const [snoozedIds, setSnoozedIds] = useState<number[]>([])
    const [loading, setLoading] = useState(true)

    const fetchAlerts = async () => {
        try {
            const allOrders = await getOrdenes()
            // Filter orders with stockWarning: true AND NOT dismissedStockWarning
            const stockAlerts = allOrders.filter(o => o.stockWarning && !o.dismissedStockWarning)
            setAlerts(stockAlerts)
        } catch (e) {
            console.error("Error fetching stock alerts", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAlerts()
        const onStockUpdate = () => fetchAlerts()
        window.addEventListener("luxius-materials-updated", onStockUpdate)
        window.addEventListener("luxius-stock-updated", onStockUpdate)
        return () => {
            window.removeEventListener("luxius-materials-updated", onStockUpdate)
            window.removeEventListener("luxius-stock-updated", onStockUpdate)
        }
    }, [])

    const handleDismiss = async (order: Order) => {
        try {
            // Permanent dismissal via Backend
            await saveOrden({ ...order, dismissedStockWarning: true })
            setAlerts(prev => prev.filter(a => a.id !== order.id))
        } catch (e) {
            alert("Error al descartar la alerta")
        }
    }

    const handleSnooze = (id: number) => {
        // Session-only snooze
        setSnoozedIds(prev => [...prev, id])
    }

    const visibleAlerts = alerts.filter(a => !snoozedIds.includes(a.id))

    if (loading || visibleAlerts.length === 0) return null

    return (
        <div className="stock-alerts-widget animate-slide-up">
            <div className="alerts-header">
                <div className="header-title">
                    <span className="alert-icon">⚠️</span>
                    <h3>Alertas de Insumos</h3>
                </div>
                <span className="alert-count">{visibleAlerts.length} pendientes</span>
            </div>

            <div className="alerts-list">
                {visibleAlerts.map(alert => (
                    <div key={alert.id} className="alert-item">
                        <div className="alert-info">
                            <span className="order-ot">{alert.ot}</span>
                            <span className="order-material">{alert.material}</span>
                            <p className="alert-msg">Stock insuficiente para este pedido.</p>
                        </div>
                        <div className="alert-actions">
                            <button
                                className="btn-snooze"
                                onClick={() => handleSnooze(alert.id)}
                                title="Recordar más tarde"
                            >
                                ⏳
                            </button>
                            <button
                                className="btn-dismiss"
                                onClick={() => handleDismiss(alert)}
                                title="Descartar permanentemente"
                            >
                                Descartar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}


interface AccessLogEntry {
    id: number
    user_id: number | null
    username: string | null
    nombre?: string
    user_rol: string | null
    action: string
    details?: { reason?: string; email?: string; nombre?: string }
    ip_address?: string | null
    created_at?: string | null
}

interface AccessLogsResponse {
    total: number
    success_count: number
    failure_count: number
    unique_users: number
    logs: AccessLogEntry[]
}

const PERIOD_OPTIONS: Array<{ id: 'day' | 'week' | 'month'; label: string }> = [
    { id: 'day', label: 'Hoy (24h)' },
    { id: 'week', label: 'Semana (7d)' },
    { id: 'month', label: 'Mes (30d)' },
]

function AccessLogFeedWidget() {
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
    const [data, setData] = useState<AccessLogsResponse>({
        total: 0,
        success_count: 0,
        failure_count: 0,
        unique_users: 0,
        logs: [],
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [refreshTick, setRefreshTick] = useState(0)

    useEffect(() => {
        let active = true
        const loadLogs = async () => {
            setLoading(true)
            setError('')
            try {
                const res = await fetch(`${API_URL}/auth/access-logs?period=${period}`, {
                    headers: getAuthHeaders(),
                    cache: 'no-store',
                })
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`)
                }
                const json = (await res.json()) as AccessLogsResponse
                if (active) {
                    setData({
                        total: json.total || 0,
                        success_count: json.success_count || 0,
                        failure_count: json.failure_count || 0,
                        unique_users: json.unique_users || 0,
                        logs: Array.isArray(json.logs) ? json.logs : [],
                    })
                }
            } catch {
                if (active) {
                    setError('No se pudo cargar el registro de accesos.')
                }
            } finally {
                if (active) setLoading(false)
            }
        }
        loadLogs()
        return () => { active = false }
    }, [period, refreshTick])

    const formatAccessTime = (iso?: string | null) => {
        if (!iso) return '—'
        try {
            return new Intl.DateTimeFormat('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }).format(new Date(iso))
        } catch {
            return iso
        }
    }

    return (
        <div
            className="animate-slide-up"
            style={{
                marginTop: '1rem',
                background: 'var(--bg-mid)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid rgba(148, 163, 184, 0.14)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🔐</span>
                    <span>Registro de Accesos al Sistema</span>
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {PERIOD_OPTIONS.map(opt => {
                        const active = period === opt.id
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setPeriod(opt.id)}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    border: active ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.25)',
                                    background: active ? 'rgba(56, 189, 248, 0.18)' : 'rgba(15, 23, 42, 0.45)',
                                    color: active ? '#7dd3fc' : '#cbd5e1',
                                }}
                            >
                                {opt.label}
                            </button>
                        )
                    })}
                    <button
                        type="button"
                        onClick={() => setRefreshTick(t => t + 1)}
                        title="Actualizar registro de accesos"
                        style={{
                            padding: '5px 9px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            border: '1px solid rgba(148, 163, 184, 0.25)',
                            background: 'rgba(15, 23, 42, 0.45)',
                            color: '#cbd5e1',
                        }}
                    >
                        🔄
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.45)', borderRadius: '8px', padding: '8px 10px', border: '1px solid rgba(148,163,184,0.12)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Total Accesos</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>{data.total}</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', padding: '8px 10px', border: '1px solid rgba(16,185,129,0.22)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>✅ Exitosos</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399' }}>{data.success_count}</div>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', padding: '8px 10px', border: '1px solid rgba(239,68,68,0.22)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>🚫 Fallidos</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171' }}>{data.failure_count}</div>
                </div>
                <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', padding: '8px 10px', border: '1px solid rgba(56,189,248,0.22)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#7dd3fc' }}>👥 Usuarios Únicos</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8' }}>{data.unique_users}</div>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>
                    Cargando historial de accesos...
                </div>
            ) : error ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.82rem', color: '#fca5a5' }}>
                    {error}
                </div>
            ) : data.logs.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>
                    Sin registros de acceso para este período.
                </div>
            ) : (
                <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                    {data.logs.map(entry => {
                        const isSuccess = entry.action === 'LOGIN_SUCCESS'
                        return (
                            <div
                                key={entry.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    background: isSuccess ? 'rgba(15, 23, 42, 0.45)' : 'rgba(239, 68, 68, 0.08)',
                                    border: isSuccess ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid rgba(239, 68, 68, 0.25)',
                                    fontSize: '0.8rem',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, color: isSuccess ? '#34d399' : '#f87171', whiteSpace: 'nowrap' }}>
                                        {isSuccess ? '✅ Ingreso' : '🚫 Fallido'}
                                    </span>
                                    <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                                        {entry.nombre || entry.username || 'Desconocido'}
                                    </span>
                                    {entry.username && (
                                        <span style={{ color: '#94a3b8' }}>@{entry.username}</span>
                                    )}
                                    {entry.user_rol && (
                                        <span style={{
                                            fontSize: '0.7rem',
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            background: 'rgba(99, 102, 241, 0.2)',
                                            color: '#c7d2fe',
                                            fontWeight: 600,
                                        }}>
                                            {entry.user_rol}
                                        </span>
                                    )}
                                    {!isSuccess && entry.details?.reason && (
                                        <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>
                                            · {entry.details.reason}
                                        </span>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0, color: '#94a3b8', fontSize: '0.74rem' }}>
                                    <div style={{ color: '#cbd5e1', fontWeight: 600 }}>{formatAccessTime(entry.created_at)}</div>
                                    {entry.ip_address && <div>IP: {entry.ip_address}</div>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
