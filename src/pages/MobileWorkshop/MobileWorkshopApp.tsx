import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import {
    getOrdenes,
    getClientes,
    getMateriales,
    getCalidades,
    saveOrden,
    saveCliente,
    initializeData
} from '@/data/db'
import { Order, Cliente, Material, Calidad } from '@/types'
import { MobileTab } from './types'
import { MobileAdminTab } from './components/MobileAdminTab'
import { MobileImpresorTab } from './components/MobileImpresorTab'
import { MobileDisenoTab } from './components/MobileDisenoTab'
import { MobileDespachoTab } from './components/MobileDespachoTab'
import { QuickOrderModal } from './components/QuickOrderModal'
import {
    Briefcase,
    Printer,
    Palette,
    PackageCheck,
    Plus,
    RotateCw,
    ArrowLeft
} from 'lucide-react'
import './MobileWorkshop.css'

export default function MobileWorkshopApp() {
    const { user } = useAuthStore()
    const location = useLocation()
    const navigate = useNavigate()

    // Determine default tab based on user role
    const defaultTab: MobileTab = useMemo(() => {
        const role = (user?.role || '').toLowerCase()
        if (role === 'impresion') return 'impresor'
        if (role === 'artista' || role.includes('disen') || role.includes('diseñ')) return 'diseno'
        return 'admin'
    }, [user?.role])

    const [activeTab, setActiveTab] = useState<MobileTab>(defaultTab)
    const [orders, setOrders] = useState<Order[]>([])
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [materiales, setMateriales] = useState<Material[]>([])
    const [calidades, setCalidades] = useState<Calidad[]>([])
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Quick Order Modal state
    const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false)
    const [quickOrderInitialText, setQuickOrderInitialText] = useState('')
    const [quickOrderInitialUrl, setQuickOrderInitialUrl] = useState('')

    // Check if user is Super-Admin (can toggle freely across all workshop roles)
    const isSuperAdmin = useMemo(() => {
        const role = (user?.role || '').toLowerCase()
        return ['principal', 'administrador', 'admin', 'sistema', 'master'].includes(role)
    }, [user?.role])

    // Load data from DB
    const loadSystemData = useCallback(async () => {
        try {
            setIsRefreshing(true)
            const [ordersList] = await Promise.all([
                getOrdenes(),
                initializeData()
            ])
            setOrders(ordersList || [])
            setClientes(getClientes() || [])
            setMateriales(getMateriales() || [])
            setCalidades(getCalidades() || [])
        } catch (err) {
            console.error('[MobileWorkshop] Error fetching data:', err)
        } finally {
            setIsRefreshing(false)
        }
    }, [])

    useEffect(() => {
        loadSystemData()
    }, [loadSystemData])

    // Intercept Web Share Target query params (?text=...&url=...&title=...)
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const sharedText = params.get('text') || params.get('title') || ''
        const sharedUrl = params.get('url') || ''

        if (sharedText || sharedUrl) {
            setQuickOrderInitialText(sharedText)
            setQuickOrderInitialUrl(sharedUrl)
            setIsQuickOrderOpen(true)

            // Clean URL query to prevent re-opening on reload
            window.history.replaceState({}, document.title, window.location.pathname)
        }
    }, [location.search])

    const handleSaveOrder = async (orderPayload: Partial<Order>): Promise<Order> => {
        const saved = await saveOrden(orderPayload)
        // Refresh local orders list
        await loadSystemData()
        return saved
    }

    const handleSaveCliente = async (clientePayload: Partial<Cliente>): Promise<Cliente> => {
        const saved = await saveCliente(clientePayload)
        setClientes(getClientes())
        return saved
    }

    const handleOpenQuickOrder = (text: string = '', url: string = '') => {
        setQuickOrderInitialText(text)
        setQuickOrderInitialUrl(url)
        setIsQuickOrderOpen(true)
    }

    // Role-adaptive badge label
    const userRoleLabel = useMemo(() => {
        const role = (user?.role || '').toLowerCase()
        if (role === 'impresion') return 'Impresor / Taller'
        if (role === 'artista' || role.includes('disen') || role.includes('diseñ')) return 'Diseñador'
        if (role === 'vendedor') return 'Ventas'
        return 'Administrador'
    }, [user?.role])

    return (
        <div className="mobile-workshop-shell">
            {/* Top Bar */}
            <header className="mobile-top-bar">
                <div className="top-bar-brand">
                    <button
                        className="refresh-icon-btn"
                        onClick={() => navigate('/')}
                        title="Ir al Panel de Escritorio"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <span className="brand-icon-chip">✦</span>
                    <span className="brand-text">LuXius Móvil</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="top-bar-user-badge">
                        <span>{user?.name || user?.username || 'Usuario'}</span>
                        <strong>({userRoleLabel})</strong>
                    </div>

                    <button
                        className={`refresh-icon-btn ${isRefreshing ? 'spinning' : ''}`}
                        onClick={loadSystemData}
                        title="Actualizar datos"
                    >
                        <RotateCw size={17} />
                    </button>
                </div>
            </header>

            {/* Super-Admin Multi-Workspace Switcher Bar */}
            {isSuperAdmin && (
                <div className="superadmin-switcher-container">
                    <button
                        className={`role-switcher-pill ${activeTab === 'admin' ? 'active' : ''}`}
                        onClick={() => setActiveTab('admin')}
                    >
                        <Briefcase size={13} />
                        <span>Administración</span>
                    </button>

                    <button
                        className={`role-switcher-pill ${activeTab === 'impresor' ? 'active' : ''}`}
                        onClick={() => setActiveTab('impresor')}
                    >
                        <Printer size={13} />
                        <span>Plotters</span>
                    </button>

                    <button
                        className={`role-switcher-pill ${activeTab === 'diseno' ? 'active' : ''}`}
                        onClick={() => setActiveTab('diseno')}
                    >
                        <Palette size={13} />
                        <span>Pre-flight</span>
                    </button>

                    <button
                        className={`role-switcher-pill ${activeTab === 'despacho' ? 'active' : ''}`}
                        onClick={() => setActiveTab('despacho')}
                    >
                        <PackageCheck size={13} />
                        <span>Despacho</span>
                    </button>
                </div>
            )}

            {/* Active Workspace View */}
            <main className="mobile-workshop-main">
                {activeTab === 'admin' && (
                    <MobileAdminTab
                        orders={orders}
                        clientes={clientes}
                        onOpenQuickOrder={() => handleOpenQuickOrder()}
                        onSaveOrder={handleSaveOrder}
                    />
                )}

                {activeTab === 'impresor' && (
                    <MobileImpresorTab
                        orders={orders}
                        onSaveOrder={handleSaveOrder}
                    />
                )}

                {activeTab === 'diseno' && (
                    <MobileDisenoTab
                        orders={orders}
                        clientes={clientes}
                        onSaveOrder={handleSaveOrder}
                    />
                )}

                {activeTab === 'despacho' && (
                    <MobileDespachoTab
                        orders={orders}
                        clientes={clientes}
                        onSaveOrder={handleSaveOrder}
                    />
                )}
            </main>

            {/* Ergonomic Bottom Navigation Bar */}
            <nav className="mobile-bottom-nav">
                <button
                    className={`bottom-nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                    onClick={() => setActiveTab('admin')}
                >
                    <Briefcase size={20} />
                    <span>Admin</span>
                </button>

                <button
                    className={`bottom-nav-item ${activeTab === 'impresor' ? 'active' : ''}`}
                    onClick={() => setActiveTab('impresor')}
                >
                    <Printer size={20} />
                    <span>Taller</span>
                </button>

                {/* Central Floating Quick Action for WhatsApp Links */}
                <div className="center-quick-action">
                    <button
                        className="center-fab-btn"
                        onClick={() => handleOpenQuickOrder()}
                        title="Crear orden desde link de WhatsApp"
                    >
                        <Plus size={26} strokeWidth={2.6} />
                    </button>
                </div>

                <button
                    className={`bottom-nav-item ${activeTab === 'diseno' ? 'active' : ''}`}
                    onClick={() => setActiveTab('diseno')}
                >
                    <Palette size={20} />
                    <span>Diseño</span>
                </button>

                <button
                    className={`bottom-nav-item ${activeTab === 'despacho' ? 'active' : ''}`}
                    onClick={() => setActiveTab('despacho')}
                >
                    <PackageCheck size={20} />
                    <span>Despacho</span>
                </button>
            </nav>

            {/* Quick Order from WhatsApp / Link Modal */}
            <QuickOrderModal
                isOpen={isQuickOrderOpen}
                onClose={() => setIsQuickOrderOpen(false)}
                initialText={quickOrderInitialText}
                initialUrl={quickOrderInitialUrl}
                clientes={clientes}
                materiales={materiales}
                calidades={calidades}
                onSaveOrder={handleSaveOrder}
                onSaveCliente={handleSaveCliente}
            />
        </div>
    )
}
