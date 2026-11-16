import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@components/layout/Header'
import {
    getMaquinas,
    getOrdenes,
    getMateriales,
    getClientes,
    saveOrden,
    mergeOrdersIntoBatch,
    deleteOrden,
    deductStockForOrder,
    resolveMediaUrl,
    fetchPrinterLiveStatus,
    type PrinterLiveStatus
} from '@data/db'
import { useAuthStore } from '@store/authStore'
import type { Order, Cliente, Material } from '@/types'
import { isDesignerRole, isDesignerOwner, getOrderTag } from '@/types'
import SharedFileViewerModal from '@components/shared/SharedFileViewerModal'
import OrderChatModal from '@components/shared/OrderChatModal'
import NestingStudioModal from '@components/workshop/NestingStudioModal'
import StatusChangeModal from '../Entrada/StatusChangeModal'
import EditBatchModal from '../Entrada/EditBatchModal'
import NuevoPedidoModal from '../Entrada/NuevoPedidoModal'
import PdfModeModal from '@components/PdfModeModal'
import { BatchRowMaster } from '../Entrada/components/BatchRowMaster'
import { SingleOrderRow } from '../Entrada/components/SingleOrderRow'
import { FloatingBatchDock } from '../Entrada/components/FloatingBatchDock'
import type { GroupedItem } from '../Entrada/types/entrada.types'
import { groupOrdersIntoBatches } from '../Entrada/utils/batchGrouping'
import { calculateOrderPrice, getConsumption } from '../Entrada/utils/entradaCalculations'
import { computeStockForecast, canViewStockAlerts } from '@/utils/stockForecast'
import { generateProductionLabel } from '@/utils/generateLabelPdf'
import { generatePdfBudget, generatePdfBatch, type BudgetPdfMode } from '@/utils/generatePdfBudget'
import { generatePdfClientReport } from '@/utils/generatePdfClientReport'
import {
    downloadSingleOrderFiles,
    downloadBatchOrdersZip,
    buildProductionFilename,
    type DownloadProgressState
} from '@/utils/orderFileDownloader'
import '../Entrada/Entrada.css'
import './Impresion.css'

export default function Impresion() {
    const navigate = useNavigate()
    const { user } = useAuthStore()

    const isAdmin =
        (user?.role as string) === 'administrador' ||
        (user?.role as string) === 'principal' ||
        (user?.role as string) === 'sistema'

    const [maquinas] = useState(() => getMaquinas())
    const [allClientes, setAllClientes] = useState<Cliente[]>(getClientes())
    const [allMateriales, setAllMateriales] = useState<Material[]>(getMateriales())
    const [livePrinters, setLivePrinters] = useState<PrinterLiveStatus[]>([])
    const [selectedPrinterTelemetry, setSelectedPrinterTelemetry] = useState<PrinterLiveStatus | null>(null)

    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'cola' | 'historial'>('cola')

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [plotterFilter, setPlotterFilter] = useState<'' | 'rs640' | 'soljet'>('')
    const [corteFilter, setCorteFilter] = useState<'' | 'con_corte' | 'sin_corte'>('')
    const [materialFilter, setMaterialFilter] = useState('')

    // Batch & selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
    const [actionMenuOrderId, setActionMenuOrderId] = useState<number | string | null>(null)
    const [tagPopoverOrderId, setTagPopoverOrderId] = useState<number | string | null>(null)

    // Modals
    const [previewOrder, setPreviewOrder] = useState<Order | null>(null)
    const [chatOrder, setChatOrder] = useState<Order | null>(null)
    const [statusOrder, setStatusOrder] = useState<Order | null>(null)
    const [statusBatchOrders, setStatusBatchOrders] = useState<Order[] | undefined>(undefined)
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)

    const [isNestingModalOpen, setIsNestingModalOpen] = useState(false)
    const [nestingModalOrders, setNestingModalOrders] = useState<Order[]>([])
    const [nestingModalBatchName, setNestingModalBatchName] = useState('')

    const [isEditBatchModalOpen, setIsEditBatchModalOpen] = useState(false)
    const [editBatchOrders, setEditBatchOrders] = useState<Order[]>([])
    const [editBatchName, setEditBatchName] = useState('')
    const [editBatchId, setEditBatchId] = useState('')

    const [editingOrder, setEditingOrder] = useState<Order | null>(null)
    const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false)
    const [pdfModeTarget, setPdfModeTarget] = useState<{ orders: Order[]; label: string } | null>(null)
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgressState | null>(null)

    // Close popovers on outside click
    useEffect(() => {
        const handleOutsideClick = () => {
            setActionMenuOrderId(null)
            setTagPopoverOrderId(null)
        }
        window.addEventListener('click', handleOutsideClick)
        return () => window.removeEventListener('click', handleOutsideClick)
    }, [])

    // Polling de telemetría de impresoras en tiempo real (cada 4s)
    useEffect(() => {
        let mounted = true
        const updateTelemetry = async () => {
            try {
                const data = await fetchPrinterLiveStatus()
                if (mounted && data.length > 0) {
                    setLivePrinters(data)
                }
            } catch {
                // Silencioso
            }
        }
        updateTelemetry()
        const interval = setInterval(updateTelemetry, 4000)
        return () => {
            mounted = false
            clearInterval(interval)
        }
    }, [])

    const loadOrders = async (forceRefresh = false) => {
        try {
            setLoading(true)
            const allOrders = await getOrdenes(forceRefresh)
            const statuses = ['orden', 'impreso']
            let filtered = allOrders.filter(o =>
                statuses.includes(o.status) || o.category === 'impresion'
            )

            if (isDesignerRole(user?.role)) {
                filtered = filtered.filter(o => isDesignerOwner(o, user))
            }

            setOrders(filtered)
            setAllClientes(getClientes())
            setAllMateriales(getMateriales())
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOrders()
    }, [user])

    useEffect(() => {
        const onStockUpdate = () => loadOrders()
        window.addEventListener('luxius-materials-updated', onStockUpdate)
        window.addEventListener('luxius-stock-updated', onStockUpdate)
        return () => {
            window.removeEventListener('luxius-materials-updated', onStockUpdate)
            window.removeEventListener('luxius-stock-updated', onStockUpdate)
        }
    }, [])

    const availableMaterials = useMemo(() => {
        const set = new Set<string>()
        orders.forEach(o => {
            if (o.material) set.add(o.material)
        })
        return Array.from(set).sort()
    }, [orders])

    const displayedOrders = useMemo(() => {
        const targetStatus = activeTab === 'cola' ? 'orden' : 'impreso'
        const q = searchTerm.trim().toLowerCase()

        return orders.filter(order => {
            if (order.status !== targetStatus) return false

            if (q) {
                const matchesSearch =
                    (order.clienteNombre?.toLowerCase() || '').includes(q) ||
                    (order.ot?.toLowerCase() || '').includes(q) ||
                    (order.id?.toString() || '').includes(q) ||
                    (order.material?.toLowerCase() || '').includes(q) ||
                    (order.nombreTarea?.toLowerCase() || '').includes(q) ||
                    (order.loteNombre?.toLowerCase() || '').includes(q) ||
                    (order.descripcionItem?.toLowerCase() || '').includes(q) ||
                    (order.observaciones?.toLowerCase() || '').includes(q) ||
                    (order.tags && order.tags.some(t => {
                        const def = getOrderTag(t)
                        return t.toLowerCase().includes(q) || (def && def.label.toLowerCase().includes(q))
                    }))
                if (!matchesSearch) return false
            }

            if (materialFilter && order.material !== materialFilter) return false

            if (plotterFilter) {
                const isSoljet = order.maquinaId === 2 || (order.ancho && Number(order.ancho) > 1.60)
                if (plotterFilter === 'soljet' && !isSoljet) return false
                if (plotterFilter === 'rs640' && isSoljet) return false
            }

            if (corteFilter === 'con_corte' && !order.corte) return false
            if (corteFilter === 'sin_corte' && order.corte) return false

            return true
        })
    }, [orders, activeTab, searchTerm, materialFilter, plotterFilter, corteFilter])

    const groupedOrders = useMemo<GroupedItem[]>(() => {
        return groupOrdersIntoBatches(displayedOrders, selectedIds, allMateriales, allClientes)
    }, [displayedOrders, selectedIds, allMateriales, allClientes])

    const forecast = useMemo(() => computeStockForecast(orders, allMateriales), [orders, allMateriales])
    const canViewAlerts = canViewStockAlerts(user?.role)
    const forecastGroupByKey = useMemo(() => {
        const map = new Map<string, string>()
        forecast.groups.forEach(g => map.set(g.key, g.riskLevel))
        return map
    }, [forecast])

    const toggleExpandBatch = (batchId: string) => {
        setExpandedBatches(prev => {
            const next = new Set(prev)
            if (next.has(batchId)) next.delete(batchId)
            else next.add(batchId)
            return next
        })
    }

    const toggleSelection = (id: string | number) => {
        const sid = String(id)
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(sid)) next.delete(sid)
            else next.add(sid)
            return next
        })
    }

    const toggleSelectBatch = (batchOrders: Order[]) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            const batchIds = batchOrders.map(o => String(o.id || o.ot))
            const allChecked = batchIds.every(id => next.has(id))
            if (allChecked) batchIds.forEach(id => next.delete(id))
            else batchIds.forEach(id => next.add(id))
            return next
        })
    }

    const selectedOrdersList = useMemo(
        () => orders.filter(o => selectedIds.has(String(o.id || o.ot))),
        [orders, selectedIds]
    )

    const selectedTotals = useMemo(() => {
        let m2 = 0
        let ml = 0
        let price = 0
        selectedOrdersList.forEach(o => {
            const cons = getConsumption(o, allMateriales)
            if (cons.unit === 'ml') ml += cons.value
            else m2 += cons.value
            price += calculateOrderPrice(o, allMateriales, allClientes)
        })
        return { m2, ml, price }
    }, [selectedOrdersList, allMateriales, allClientes])

    const handleToggleTag = async (order: Order, tagId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        const currentTags = order.tags || []
        const newTags = currentTags.includes(tagId)
            ? currentTags.filter(t => t !== tagId)
            : [...currentTags, tagId]
        setOrders(prev => prev.map(o => (o.id === order.id ? { ...o, tags: newTags } : o)))
        try {
            await saveOrden({ id: order.id, ot: order.ot, tags: newTags })
        } catch (err) {
            console.error('Error guardando etiqueta:', err)
        }
    }

    const handleBulkApplyTag = async (tagId: string) => {
        if (selectedOrdersList.length === 0) return
        setOrders(prev => prev.map(o => {
            if (selectedIds.has(String(o.id || o.ot))) {
                const cur = o.tags || []
                return { ...o, tags: cur.includes(tagId) ? cur : [...cur, tagId] }
            }
            return o
        }))
        for (const order of selectedOrdersList) {
            const cur = order.tags || []
            if (!cur.includes(tagId)) {
                try {
                    await saveOrden({ id: order.id, ot: order.ot, tags: [...cur, tagId] })
                } catch (err) {
                    console.error(`Error aplicando etiqueta a ${order.ot}:`, err)
                }
            }
        }
    }

    const handleDownloadSingle = async (order: Order) => {
        try {
            await downloadSingleOrderFiles(order, (p) => {
                setDownloadProgress(p)
                if (!p.active) {
                    setTimeout(() => setDownloadProgress(null), 3000)
                }
            })
        } catch (e) {
            console.error('Error al descargar orden:', e)
            setDownloadProgress(null)
        }
    }

    const handleDownloadBatch = async (batchOrders: Order[], batchName: string) => {
        try {
            await downloadBatchOrdersZip(batchOrders, batchName, (p) => {
                setDownloadProgress(p)
                if (!p.active) {
                    setTimeout(() => setDownloadProgress(null), 3000)
                }
            })
        } catch (e) {
            console.error('Error al descargar lote:', e)
            setDownloadProgress(null)
        }
    }

    const handleDownloadSelected = async () => {
        if (selectedOrdersList.length === 0) return
        await handleDownloadBatch(selectedOrdersList, `Impresion_Seleccion_${selectedOrdersList.length}`)
    }

    const handleOpenNestingModal = (targetOrders: Order[], batchName: string) => {
        setNestingModalOrders(targetOrders)
        setNestingModalBatchName(batchName)
        setIsNestingModalOpen(true)
    }

    const handleOpenNestingForSelected = () => {
        if (selectedOrdersList.length === 0) return
        handleOpenNestingModal(selectedOrdersList, `Impresión (${selectedOrdersList.length} órdenes)`)
    }

    const handleMergeSelectedIntoBatch = async () => {
        if (selectedOrdersList.length < 2) {
            alert('Seleccioná al menos 2 órdenes para agruparlas en un lote.')
            return
        }
        const loteName = window.prompt('Nombre del grupo/lote de impresión:', selectedOrdersList[0].clienteNombre || 'Lote Impresión')
        if (!loteName) return
        try {
            await mergeOrdersIntoBatch(selectedOrdersList.map(o => o.id), loteName.trim())
            setSelectedIds(new Set())
            await loadOrders(true)
        } catch (err) {
            console.error('Error agrupando órdenes:', err)
            alert('No se pudo agrupar las órdenes.')
        }
    }

    const handleBatchStatus = async (targetStatus: 'impreso' | 'entregado') => {
        if (selectedOrdersList.length === 0) return
        for (const order of selectedOrdersList) {
            let stockDescontado = order.stockDescontado || false
            if (targetStatus === 'impreso' && !stockDescontado) {
                stockDescontado = deductStockForOrder(order, 'impreso')
            }
            await saveOrden({ ...order, status: targetStatus, stockDescontado })
        }
        setSelectedIds(new Set())
        await loadOrders(true)
    }

    const handleSoftDelete = async (order: Order) => {
        if (!isAdmin) return
        if (!window.confirm(`¿Enviar la orden ${order.ot || order.id} a la papelera?`)) return
        await deleteOrden(order.id)
        await loadOrders(true)
    }

    const handleSoftDeleteBatch = async (batchOrders: Order[], batchName: string) => {
        if (!isAdmin) return
        if (!window.confirm(`¿Enviar el lote "${batchName}" (${batchOrders.length} órdenes) a la papelera?`)) return
        for (const o of batchOrders) {
            await deleteOrden(o.id)
        }
        await loadOrders(true)
    }

    const handleOpenSuiteCraft = (o: Order) => {
        if (!o.archivos?.length) return
        const firstFile = resolveMediaUrl(o.archivos[0])
        const orig = o.archivosOriginales?.[0] || o.archivos[0].split('/').pop()?.split('?')[0] || 'diseno'
        const prod = buildProductionFilename(o, 0, orig)
        navigate(`/xpress-viewer?fileUrl=${encodeURIComponent(firstFile)}&fileName=${encodeURIComponent(prod)}&orderId=${o.id}&tab=suitecraft`)
    }

    const handleConfirmPdfMode = async (mode: BudgetPdfMode) => {
        if (!pdfModeTarget) return
        const { orders: targetOrders } = pdfModeTarget
        setPdfModeTarget(null)
        if (targetOrders.length === 1) {
            generatePdfBudget(targetOrders[0], { mode })
        } else {
            generatePdfBatch(targetOrders, { mode })
        }
    }

    const colaCount = useMemo(() => orders.filter(o => o.status === 'orden').length, [orders])
    const histCount = useMemo(() => orders.filter(o => o.status === 'impreso').length, [orders])

    return (
        <div className="impresion-page">
            <Header
                title="Impresión"
                subtitle={isDesignerRole(user?.role) ? 'Mis diseños en cola de impresión' : 'Gestión de producción y lotes'}
            />

            <div className="impresion-tabs">
                <button
                    className={`tab-btn ${activeTab === 'cola' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('cola'); setSelectedIds(new Set()) }}
                >
                    Cola de Impresión ({colaCount})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('historial'); setSelectedIds(new Set()) }}
                >
                    Historial Reciente ({histCount})
                </button>
            </div>

            {!isDesignerRole(user?.role) && (
                <div className="machines-status-bar">
                    {/* Impresoras con Telemetría en Vivo Roland / VersaWorks */}
                    {livePrinters.map((lp) => (
                        <div key={lp.machine_id} className={`machine-badge is-live animate-fade-in ${lp.status === 'printing' ? 'is-printing' : ''}`}>
                            <span className={`status-indicator ${lp.is_online ? 'online' : 'offline'}`} />
                            <div className="machine-info">
                                <span className="m-name">
                                    🖨️ {lp.machine_name}
                                    <span style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        backgroundColor: lp.is_online ? (lp.status === 'printing' ? '#10b981' : '#3b82f6') : '#475569',
                                        color: '#fff'
                                    }}>
                                        {lp.is_online ? (lp.status === 'printing' ? 'Imprimiendo' : 'Online / Listo') : 'Offline'}
                                    </span>
                                </span>
                                <span className="m-capacity">
                                    {lp.current_job ? `En curso: ${lp.current_job.job_name}` : (lp.last_completed_job ? `Último: ${lp.last_completed_job.job_name}` : 'En espera')}
                                </span>
                                {lp.current_job && (
                                    <span className="m-job-current">
                                        ⚡ {lp.current_job.size_str} | {lp.current_job.speed_str || 'Calculando...'}
                                    </span>
                                )}
                            </div>
                            <button
                                className="btn-telemetry-toggle"
                                onClick={() => setSelectedPrinterTelemetry(lp)}
                                title="Ver eventos y telemetría de VersaWorks en tiempo real"
                            >
                                📡 Log en Vivo
                            </button>
                        </div>
                    ))}

                    {/* Máquinas Estáticas Registradas */}
                    {maquinas.map((m) => (
                        <div key={m.id} className="machine-badge animate-fade-in">
                            <span className={`status-indicator ${m.habilitada ? 'online' : 'offline'}`} />
                            <div className="machine-info">
                                <span className="m-name">{m.categoria === 'corte' ? '📐' : '🖨️'} {m.nombre}</span>
                                <span className="m-capacity">Ancho: {m.anchoMaximo ? `${m.anchoMaximo}m` : `${m.ancho}mm`} ({m.categoria === 'corte' ? 'Corte' : 'Impresión'})</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Barra de búsqueda y herramientas de taller */}
            <div className="filters-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
                <input
                    className="input-field"
                    type="text"
                    placeholder="Buscar por Cliente, OT, Material, Lote..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: '1 1 240px', maxWidth: '360px' }}
                />
                <select
                    className="input-field"
                    value={materialFilter}
                    onChange={(e) => setMaterialFilter(e.target.value)}
                    title="Filtrar por Material"
                >
                    <option value="">Todos los Materiales</option>
                    {availableMaterials.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <select
                    className="input-field"
                    value={plotterFilter}
                    onChange={(e) => setPlotterFilter(e.target.value as '' | 'rs640' | 'soljet')}
                    title="Filtrar por Plotter"
                >
                    <option value="">Todos los Plotters</option>
                    <option value="rs640">RS-640 (≤ 1.6m)</option>
                    <option value="soljet">SolJet (1.9m)</option>
                </select>
                <select
                    className="input-field"
                    value={corteFilter}
                    onChange={(e) => setCorteFilter(e.target.value as '' | 'con_corte' | 'sin_corte')}
                    title="Filtrar por Corte"
                >
                    <option value="">Con y Sin Corte</option>
                    <option value="con_corte">📐 Solo con Corte</option>
                    <option value="sin_corte">Sin Corte</option>
                </select>
                {(searchTerm || materialFilter || plotterFilter || corteFilter) && (
                    <button
                        type="button"
                        className="btn-telemetry-toggle"
                        onClick={() => {
                            setSearchTerm('')
                            setMaterialFilter('')
                            setPlotterFilter('')
                            setCorteFilter('')
                        }}
                    >
                        Limpiar filtros
                    </button>
                )}
                <button
                    type="button"
                    className="btn-telemetry-toggle"
                    onClick={() => loadOrders(true)}
                    title="Recargar órdenes"
                    style={{ marginLeft: 'auto' }}
                >
                    🔄 Actualizar ({displayedOrders.length})
                </button>
            </div>

            {downloadProgress && (
                <div className="download-progress-toast">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {downloadProgress.active ? '⏳ Descargando Archivos' : '✅ Descarga Lista'}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                            {downloadProgress.percent}%
                        </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '8px', wordBreak: 'break-all' }}>
                        {downloadProgress.message}
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${downloadProgress.percent}%`,
                            height: '100%',
                            background: downloadProgress.active ? 'linear-gradient(90deg, #10b981, #06b6d4)' : '#10b981',
                            transition: 'width 0.2s ease',
                            borderRadius: '3px'
                        }} />
                    </div>
                </div>
            )}

            <div className="orders-table-container animate-fade-in">
                {loading ? (
                    <div className="loading-state">Cargando...</div>
                ) : groupedOrders.length === 0 ? (
                    <div className="empty-state">No hay órdenes en {activeTab === 'cola' ? 'la cola' : 'el historial reciente'}</div>
                ) : (
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th style={{ width: '42px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={displayedOrders.length > 0 && displayedOrders.every(o => selectedIds.has(String(o.id || o.ot)))}
                                        onChange={() => {
                                            if (displayedOrders.every(o => selectedIds.has(String(o.id || o.ot)))) {
                                                setSelectedIds(new Set())
                                            } else {
                                                setSelectedIds(new Set(displayedOrders.map(o => String(o.id || o.ot))))
                                            }
                                        }}
                                        style={{ accentColor: 'var(--primary-color)', cursor: 'pointer', transform: 'scale(1.2)' }}
                                    />
                                </th>
                                <th style={{ minWidth: '220px' }}>Trabajo &amp; Cliente</th>
                                <th style={{ minWidth: '230px' }}>Especificaciones Técnicas</th>
                                <th style={{ minWidth: '170px' }}>Estado &amp; Entrega</th>
                                <th style={{ width: '130px', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedOrders.map(item => {
                                if (item.isBatch) {
                                    const matKey = `${(item.primaryOrder.material || '').trim()}|${getConsumption(item.primaryOrder, allMateriales).bobina || '1.52'}`
                                    const fLevel = forecastGroupByKey.get(matKey)
                                    const forecastStatus = fLevel === 'critical' ? 'critical' : fLevel === 'low' ? 'low' : undefined

                                    return (
                                        <BatchRowMaster
                                            key={item.batchId}
                                            item={item}
                                            isExpanded={expandedBatches.has(item.batchId)}
                                            onToggleExpand={toggleExpandBatch}
                                            onToggleSelectBatch={toggleSelectBatch}
                                            onOpenEditBatchModal={(ords, bName, bId) => {
                                                if (!isAdmin) return
                                                setEditBatchOrders(ords)
                                                setEditBatchName(bName)
                                                setEditBatchId(bId)
                                                setIsEditBatchModalOpen(true)
                                            }}
                                            canViewAlerts={canViewAlerts}
                                            forecastStatus={forecastStatus}
                                            allMateriales={allMateriales}
                                            allClientes={allClientes}
                                            isAdmin={false}
                                            restrictToProduction={true}
                                            onDownloadBatch={handleDownloadBatch}
                                            actionMenuOrderId={actionMenuOrderId}
                                            setActionMenuOrderId={setActionMenuOrderId}
                                            onOpenNestingModal={handleOpenNestingModal}
                                            onSetStatusBatch={(primary, ords) => {
                                                setStatusOrder(primary)
                                                setStatusBatchOrders(ords)
                                                setIsStatusModalOpen(true)
                                            }}
                                            onSoftDeleteBatch={handleSoftDeleteBatch}
                                            selectedIds={selectedIds}
                                            onToggleSelection={toggleSelection}
                                            onPreview={(o) => setPreviewOrder(o)}
                                            tagPopoverOrderId={tagPopoverOrderId}
                                            setTagPopoverOrderId={setTagPopoverOrderId}
                                            onToggleTag={handleToggleTag}
                                            onDownloadSingle={handleDownloadSingle}
                                            onOpenChat={(o) => setChatOrder(o)}
                                            onOpenSuiteCraft={handleOpenSuiteCraft}
                                            onOpenPdfMode={(o) => setPdfModeTarget({ orders: [o], label: o.ot || `OT-${o.id}` })}
                                            onGenerateLabel={(o) => generateProductionLabel([o])}
                                            onEditOrder={(o) => {
                                                if (!isAdmin) return
                                                setEditingOrder(o)
                                                setIsEditOrderModalOpen(true)
                                            }}
                                            onStatusSingle={(o) => {
                                                setStatusOrder(o)
                                                setStatusBatchOrders(undefined)
                                                setIsStatusModalOpen(true)
                                            }}
                                            onSoftDeleteSingle={handleSoftDelete}
                                        />
                                    )
                                }

                                const order = item.order
                                return (
                                    <SingleOrderRow
                                        key={String(order.id || order.ot)}
                                        order={order}
                                        isSelected={selectedIds.has(String(order.id || order.ot))}
                                        onToggleSelect={toggleSelection}
                                        onPreview={(o) => setPreviewOrder(o)}
                                        tagPopoverOrderId={tagPopoverOrderId}
                                        setTagPopoverOrderId={setTagPopoverOrderId}
                                        onToggleTag={handleToggleTag}
                                        allMateriales={allMateriales}
                                        allClientes={allClientes}
                                        isAdmin={false}
                                        restrictToProduction={true}
                                        canViewAlerts={canViewAlerts}
                                        onStatusClick={(o) => {
                                            setStatusOrder(o)
                                            setStatusBatchOrders(undefined)
                                            setIsStatusModalOpen(true)
                                        }}
                                        actionMenuOrderId={actionMenuOrderId}
                                        setActionMenuOrderId={setActionMenuOrderId}
                                        onRestoreOrder={() => {}}
                                        onPermanentDelete={() => {}}
                                        onDownloadSingle={handleDownloadSingle}
                                        onOpenChat={(o) => setChatOrder(o)}
                                        onOpenSuiteCraft={handleOpenSuiteCraft}
                                        onOpenPdfMode={(o) => setPdfModeTarget({ orders: [o], label: o.ot || `OT-${o.id}` })}
                                        onGenerateLabel={(o) => generateProductionLabel([o])}
                                        onEditOrder={(o) => {
                                            if (!isAdmin) return
                                            setEditingOrder(o)
                                            setIsEditOrderModalOpen(true)
                                        }}
                                        onSoftDelete={handleSoftDelete}
                                    />
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <FloatingBatchDock
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                selectedTotals={selectedTotals}
                isAdmin={false}
                onBulkApplyTag={handleBulkApplyTag}
                onOpenNesting={handleOpenNestingForSelected}
                onMergeBatch={handleMergeSelectedIntoBatch}
                onDownloadSelected={handleDownloadSelected}
                downloadProgressActive={!!downloadProgress?.active}
                onExportClientReportPdf={() => {
                    if (selectedOrdersList.length === 0) return
                    const first = selectedOrdersList[0]
                    const clientObj = allClientes.find(c => String(c.id) === String(first.clientId))
                    generatePdfClientReport(selectedOrdersList, {
                        clienteNombre: first.clienteNombre,
                        clienteEmpresa: clientObj?.empresa,
                        clienteTelefono: clientObj?.telefono,
                        clienteEmail: clientObj?.email
                    })
                }}
                onBatchPdf={() => {
                    if (!isAdmin || selectedOrdersList.length === 0) return
                    setPdfModeTarget({ orders: selectedOrdersList, label: `${selectedOrdersList.length} órdenes` })
                }}
                onBatchLabel={() => generateProductionLabel(selectedOrdersList)}
                viewTab={activeTab === 'cola' ? 'active' : 'history'}
                onBatchStatus={handleBatchStatus}
                onBatchRestore={() => {}}
                onBatchDelete={async () => {
                    if (!isAdmin || selectedOrdersList.length === 0) return
                    if (!window.confirm(`¿Enviar ${selectedOrdersList.length} órdenes seleccionadas a la papelera?`)) return
                    for (const o of selectedOrdersList) {
                        await deleteOrden(o.id)
                    }
                    setSelectedIds(new Set())
                    await loadOrders(true)
                }}
            />

            {/* File Viewer Modal */}
            {previewOrder && (
                <SharedFileViewerModal
                    isOpen={!!previewOrder}
                    onClose={() => setPreviewOrder(null)}
                    order={previewOrder}
                    showStandardize={true}
                    hidePrices={true}
                    onUpdate={() => {
                        loadOrders(true)
                        setPreviewOrder(null)
                    }}
                />
            )}

            {/* Chat Modal */}
            {chatOrder && (
                <OrderChatModal
                    isOpen={!!chatOrder}
                    onClose={() => setChatOrder(null)}
                    order={chatOrder}
                />
            )}

            {/* Status Change Modal */}
            {isStatusModalOpen && statusOrder && (
                <StatusChangeModal
                    isOpen={isStatusModalOpen}
                    onClose={(updated) => {
                        setIsStatusModalOpen(false)
                        setStatusOrder(null)
                        setStatusBatchOrders(undefined)
                        if (updated) void loadOrders(true)
                    }}
                    order={statusOrder}
                    batchOrders={statusBatchOrders}
                />
            )}

            {/* Nesting Studio Modal */}
            {isNestingModalOpen && (
                <NestingStudioModal
                    isOpen={isNestingModalOpen}
                    orders={nestingModalOrders}
                    initialBatchName={nestingModalBatchName}
                    onClose={() => {
                        setIsNestingModalOpen(false)
                        setNestingModalOrders([])
                    }}
                    onSaveBatch={async (batchName, _updatedConsumptionMl, updatedCopies) => {
                        if (updatedCopies) {
                            for (const o of nestingModalOrders) {
                                const key = o.id || o.ot || ''
                                const newCopies = updatedCopies[key]
                                if (newCopies !== undefined && newCopies !== o.copias) {
                                    await saveOrden({ ...o, copias: newCopies })
                                }
                            }
                        }
                        if (nestingModalOrders.length > 1 && batchName) {
                            await mergeOrdersIntoBatch(nestingModalOrders.map(o => o.id), batchName.trim())
                        }
                        await loadOrders(true)
                        setIsNestingModalOpen(false)
                    }}
                />
            )}

            {/* Admin-only Edit Modals */}
            {isAdmin && isEditBatchModalOpen && (
                <EditBatchModal
                    isOpen={isEditBatchModalOpen}
                    onClose={async (updated) => {
                        setIsEditBatchModalOpen(false)
                        if (updated) {
                            await loadOrders(true)
                        }
                    }}
                    batchOrders={editBatchOrders}
                    currentBatchName={editBatchName}
                    currentBatchId={editBatchId}
                    clientes={allClientes}
                    materiales={allMateriales}
                />
            )}

            {isAdmin && isEditOrderModalOpen && (
                <NuevoPedidoModal
                    isOpen={isEditOrderModalOpen}
                    order={editingOrder}
                    defaultStatus="orden"
                    onClose={(created) => {
                        setIsEditOrderModalOpen(false)
                        setEditingOrder(null)
                        if (created) {
                            void loadOrders(true)
                        }
                    }}
                />
            )}

            {isAdmin && (
                <PdfModeModal
                    isOpen={!!pdfModeTarget}
                    title="Generar PDF"
                    subtitle={pdfModeTarget?.label}
                    onClose={() => setPdfModeTarget(null)}
                    onSelect={handleConfirmPdfMode}
                />
            )}

            {/* Modal Telemetría Roland VersaWorks */}
            {selectedPrinterTelemetry && (
                <div className="telemetry-modal-overlay" onClick={() => setSelectedPrinterTelemetry(null)}>
                    <div className="telemetry-modal animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="telemetry-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                                    Telemetría en Vivo — {selectedPrinterTelemetry.machine_name}
                                </h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {selectedPrinterTelemetry.is_online ? '🟢 Conectado a LuXius Cloud vía Xignux Monitor' : '⚪ Desconectado / Sin señal reciente de la PC de impresora'}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedPrinterTelemetry(null)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="telemetry-body">
                            {selectedPrinterTelemetry.current_job && (
                                <div className="telemetry-event-card" style={{ borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.08)' }}>
                                    <div className="telemetry-event-header">
                                        <span style={{ color: '#10b981', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
                                            ⚡ Imprimiendo en este momento
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{selectedPrinterTelemetry.current_job.time_str}</span>
                                    </div>
                                    <div className="telemetry-event-job">{selectedPrinterTelemetry.current_job.job_name}</div>
                                    <div className="telemetry-stats-row">
                                        <span>📐 Medidas: {selectedPrinterTelemetry.current_job.size_str}</span>
                                        <span>⚡ Velocidad: {selectedPrinterTelemetry.current_job.speed_str || 'Calculando...'}</span>
                                    </div>
                                </div>
                            )}

                            <h4 style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#cbd5e1' }}>Últimos Trabajos Registrados en VersaWorks:</h4>
                            {(!selectedPrinterTelemetry.recent_events || selectedPrinterTelemetry.recent_events.length === 0) ? (
                                <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', padding: '12px 0' }}>
                                    No hay eventos registrados recientemente. Inicie el monitor en la PC de la impresora para comenzar la sincronización en vivo.
                                </p>
                            ) : (
                                selectedPrinterTelemetry.recent_events.map((ev, idx) => (
                                    <div key={idx} className="telemetry-event-card">
                                        <div className="telemetry-event-header">
                                            <span className="telemetry-event-job">{ev.job_name}</span>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                                            </span>
                                        </div>
                                        <div className="telemetry-stats-row">
                                            <span>📐 {ev.size_str}</span>
                                            {ev.time_str && <span>⏱️ {ev.time_str}</span>}
                                            {ev.speed_str && <span>🚀 {ev.speed_str}</span>}
                                            {ev.ink_ml && (
                                                <span style={{ color: '#38bdf8' }}>💧 {ev.ink_ml}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
