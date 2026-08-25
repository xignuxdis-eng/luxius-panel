
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@components/layout/Header'
import { useAuthStore } from '@store/authStore'
import { getStats, getOrdenes, getMateriales, saveOrden, API_URL } from '@data/db'
import CalendarView from './CalendarView'
import QuickNotes from './QuickNotes'
import { Order } from '@/types'
import './Dashboard.css'

import WorkshopDashboard from '@components/workshop/WorkshopDashboard'

export default function Dashboard() {
    const navigate = useNavigate()
    const user = useAuthStore((state) => state.user)
    const [viewMode, setViewMode] = useState<'workshop' | 'standard'>('workshop')

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
                if (user?.role === 'artista' && user.id) {
                    const allOrders = await getOrdenes()
                    const myOrders = allOrders.filter(o => o.artistaId === user.id)
                    setMyOrdersCount(myOrders.filter(o => o.status !== 'entregado').length)
                    setMyPendingCount(myOrders.filter(o => o.status !== 'entregado' && o.status !== 'finalizado').length)
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
    } else if (user?.role === 'artista') {
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
        ...(user?.role === 'artista' && user.id
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Header
                    title="Panel de Control Luxius"
                    subtitle={`Bienvenido de nuevo, ${user?.name?.split(' ')[0] || 'Usuario'}.`}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setViewMode('workshop')}
                        style={{
                            backgroundColor: viewMode === 'workshop' ? '#38bdf8' : '#1e293b',
                            color: viewMode === 'workshop' ? '#0f172a' : '#94a3b8',
                            border: '1px solid #38bdf8',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        🎮 Taller Pixel Art
                    </button>
                    <button
                        onClick={() => setViewMode('standard')}
                        style={{
                            backgroundColor: viewMode === 'standard' ? '#38bdf8' : '#1e293b',
                            color: viewMode === 'standard' ? '#0f172a' : '#94a3b8',
                            border: '1px solid #38bdf8',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        📊 Vista Estándar
                    </button>
                </div>
            </div>

            {viewMode === 'workshop' ? (
                <div style={{ marginBottom: '24px' }}>
                    <WorkshopDashboard />
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

                    <QuickNotes />

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
                // 1. Fetch Printer Stats for Usage Calculation
                const res = await fetch(`${API_URL}/analytics/stats`)
                if (!res.ok) return
                const jobs = await res.json()

                // Calculate Totals
                let totalM2 = 0
                let totalInk = { c: 0, m: 0, y: 0, k: 0 }

                jobs.forEach((job: any) => {
                    if (job.sizeM2 > 0 && job.ink) {
                        totalM2 += job.sizeM2
                        totalInk.c += job.ink.c || 0
                        totalInk.m += job.ink.m || 0
                        totalInk.y += job.ink.y || 0
                        totalInk.k += job.ink.k || 0
                    }
                })

                if (totalM2 === 0) return

                // Average mL per m2
                const avgUsage = {
                    c: totalInk.c / totalM2,
                    m: totalInk.m / totalM2,
                    y: totalInk.y / totalM2,
                    k: totalInk.k / totalM2
                }

                // 2. Fetch Current Stock
                const materiales = getMateriales()
                const inks = [
                    { code: 'C', name: 'Cyan', color: '#00ffff', matcher: ['cyan', 'cian', 'ink-c'] },
                    { code: 'M', name: 'Magenta', color: '#ff00ff', matcher: ['magenta', 'ink-m'] },
                    { code: 'Y', name: 'Yellow', color: '#ffff00', matcher: ['yellow', 'amarillo', 'ink-y'] },
                    { code: 'K', name: 'Black', color: '#dddddd', matcher: ['black', 'negro', 'ink-k'] } // Using light gray for visibility in dark mode or border it
                ]

                const estimates = inks.map(inkType => {
                    // Sum stock for this color (in Liters)
                    const stockLiters = (materiales as any[])
                        .filter((m: any) => {
                            const desc = (m.descripcion + ' ' + m.codigo).toLowerCase()
                            // Ensure it's ink
                            const isInk = m.tipo === 'tinta' || desc.includes('tinta') || desc.includes('ink')
                            if (!isInk) return false

                            return inkType.matcher.some(term => desc.includes(term))
                        })
                        .reduce((sum: number, m: any) => sum + (m.stockActual || 0), 0)

                    const stockmL = stockLiters * 1000
                    const usagePerM2 = (avgUsage as any)[inkType.code.toLowerCase()] || 0.1 // avoid division by zero
                    const capacityM2 = usagePerM2 > 0 ? stockmL / usagePerM2 : 0

                    return {
                        ...inkType,
                        stockLiters,
                        avgUsage,
                        capacityM2
                    }
                })

                setCoverage(estimates)

            } catch (e) {
                console.error("Error calculating ink coverage", e)
            } finally {
                setLoading(false)
            }
        }

        calculateCoverage()
    }, [])

    if (loading) return null

    // Find limiting factor
    const minmetrics = coverage.reduce((min, curr) => curr.capacityM2 < min.capacityM2 ? curr : min, coverage[0])

    return (
        <div className="ink-coverage-card animate-slide-up" style={{ marginTop: '1rem', background: 'var(--bg-mid)', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Autonomía Estimada de Tinta</h3>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    Limita: <strong style={{ color: minmetrics?.color === '#dddddd' ? '#fff' : minmetrics?.color }}>{minmetrics?.name}</strong> (~{Math.floor(minmetrics?.capacityM2).toLocaleString()} m²)
                </div>
            </div>

            <div className="ink-bars" style={{ display: 'flex', gap: '1rem', height: '120px', alignItems: 'flex-end', justifyContent: 'space-around' }}>
                {coverage.map(ink => {
                    // Scale height relative to the max capacity or a fixed reliable max (e.g. 2000 m2) to visualize
                    // Or just relative to each other. Let's do relative to max in set.
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
                                    {Math.floor(ink.capacityM2).toLocaleString()} m²
                                </div>
                            </div>
                            <div style={{ marginTop: '6px', fontSize: '0.8rem', fontWeight: 600 }}>{ink.name}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{ink.stockLiters.toFixed(1)} L</div>
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
