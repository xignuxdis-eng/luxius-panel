import { useState, useEffect } from 'react'
import Header from '@components/layout/Header'
import Button from '@components/ui/Button'
import { statusColors, statusLabels } from '../../types/orden'
import { getOrdenes, getMateriales, saveOrden, deleteOrden, getClientes, saveBatchOrders } from '@data/db'
import { useAuthStore } from '@store/authStore'
import NuevoPedidoModal from './NuevoPedidoModal'
import StatusChangeModal from './StatusChangeModal'
import SharedFileViewerModal from '@components/shared/SharedFileViewerModal'
import OrderChatModal from '@components/shared/OrderChatModal'
import type { Order } from '@/types'
import { generatePdfBudget } from '@/utils/generatePdfBudget'
import { generatePdfClientReport } from '@/utils/generatePdfClientReport'
import './Entrada.css'

export default function Entrada() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
    const [isChatModalOpen, setIsChatModalOpen] = useState(false)

    // Separate states for EACH activity to prevent crosstalk/crashes
    const [editingOrder, setEditingOrder] = useState<Order | null>(null)
    const [statusOrder, setStatusOrder] = useState<Order | null>(null)
    const [previewOrder, setPreviewOrder] = useState<Order | null>(null)
    const [chatOrder, setChatOrder] = useState<Order | null>(null)

    const [defaultStatus, setDefaultStatus] = useState<string>('orden')

    // ASYNC STATE
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    // BATCH SELECTION STATE
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // VIEW TAB: 'active' (current OTs), 'history' (completed), or 'trash' (soft-deleted)
    const [viewTab, setViewTab] = useState<'active' | 'history' | 'trash'>('active')

    const loadOrders = async () => {
        try {
            setLoading(true)
            const data = await getOrdenes()
            setOrders(data)
        } catch (error) {
            console.error("Failed to load orders", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOrders()
    }, [])

    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [calidadFilter] = useState('')
    const [materialFilter, setMaterialFilter] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')

    // Clear selection when switching tabs or changing filters
    useEffect(() => {
        setSelectedIds(new Set())
    }, [viewTab, searchTerm, statusFilter, materialFilter, categoryFilter])

    const { user } = useAuthStore()
    const allClientes = useState(() => getClientes())[0]
    const allMateriales = useState(() => getMateriales())[0]

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            (order.clienteNombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (order.ot?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (order.id?.toString() || '').includes(searchTerm) ||
            (order.material?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === '' || order.status === statusFilter;
        const matchesCalidad = calidadFilter === '' || order.calidad === calidadFilter;
        const matchesMaterial = materialFilter === '' || order.material === materialFilter;
        const matchesCategory = categoryFilter === '' || order.category === categoryFilter;

        const isArtista = user?.role === 'artista';
        const isImpresor = user?.role === 'impresion';
        const isRelevantForArtista = order.status === 'diseno' || order.status === 'rebotado';
        const isRelevantForImpresor = ['orden', 'impreso', 'post', 'completo'].includes(order.status);

        if (user?.role === 'vendedor' && order.status !== 'relevamiento') return false;

        if (user?.role === 'cliente') {
            const linkedClient = allClientes.find(c =>
                c.nombre.toLowerCase().includes(user.name.toLowerCase()) ||
                user.name.toLowerCase().includes(c.nombre.toLowerCase())
            );

            const orderClientId = order.clientId || (order as any).clienteId;
            const matchesLinked = linkedClient && (orderClientId === linkedClient.id);
            const matchesUser = orderClientId === user.id;

            if (!matchesLinked && !matchesUser) return false;
        }

        if (isArtista && !isRelevantForArtista) return false;
        if (isImpresor && !isRelevantForImpresor) return false;

        return matchesSearch && matchesStatus && matchesCalidad && matchesMaterial && matchesCategory;
    })

    const displayedOrders = viewTab === 'trash'
        ? filteredOrders.filter(o => o.status === 'eliminado')
        : viewTab === 'history'
            ? filteredOrders.filter(o => ['impreso', 'entregado', 'finalizado', 'completo'].includes(o.status))
            : filteredOrders.filter(o => !['entregado', 'finalizado', 'eliminado'].includes(o.status));


    const calculateOrderPrice = (order: Order) => {
        const price = order.subtotal || order.total || 0;
        if (price > 0) return price;

        const matData = allMateriales.find(m => m.codigo === order.material);
        if (matData) {
            if (matData.tipoCobro === 'ml' && matData.bobinas && matData.bobinas.length > 0) {
                return 0;
            }
            if (matData.precioM2) {
                return Math.round(Number(order.ancho) * Number(order.alto) * Number(order.copias) * matData.precioM2);
            }
        }
        return 0;
    }

    const getConsumption = (order: Order) => {
        const matData = allMateriales.find(m => m.codigo === order.material);

        const w = Number(order.ancho) || 0;
        const h = Number(order.alto) || 0;
        const c = Number(order.copias) || 1;

        if (matData?.tipoCobro === 'ml') {
            let val = order.consumoEstimado;
            if (val === undefined) {
                const isRotated = order.precioDetalle?.rotated;
                val = isRotated ? (w * c) : (h * c);
            }
            return {
                value: val,
                unit: 'ml'
            };
        }
        return {
            value: w * h * c,
            unit: 'm²'
        };
    }

    const selectedTotals = {
        m2: Array.from(selectedIds).reduce((acc, id) => {
            const o = orders.find(x => String(x.id) === String(id));
            if (!o) return acc;
            const cons = getConsumption(o);
            return cons.unit === 'm²' ? acc + cons.value : acc;
        }, 0),
        ml: Array.from(selectedIds).reduce((acc, id) => {
            const o = orders.find(x => String(x.id) === String(id));
            if (!o) return acc;
            const cons = getConsumption(o);
            return cons.unit === 'ml' ? acc + cons.value : acc;
        }, 0),
        price: Array.from(selectedIds).reduce((acc, id) => {
            const o = orders.find(x => String(x.id) === String(id));
            return acc + (o ? calculateOrderPrice(o) : 0);
        }, 0)
    };

    const refreshOrders = async () => {
        await loadOrders()
    }

    const handleNewOrder = () => {
        setEditingOrder(null)
        setDefaultStatus('orden')
        setIsModalOpen(true)
    }

    const handleEditOrder = (order: Order) => {
        setEditingOrder(order)
        setIsModalOpen(true)
    }

    const handleRestoreOrder = async (order: Order) => {
        try {
            setLoading(true)
            const newStatus = order.category === 'diseno' ? 'preorden' : 'orden'
            await saveOrden({ ...order, status: newStatus })
            await loadOrders()
        } catch (error) {
            console.error('Restore error:', error)
            alert('Error al restaurar la orden')
        } finally {
            setLoading(false)
        }
    }

    const handlePermanentDelete = async (order: Order) => {
        try {
            setLoading(true)
            await deleteOrden(order.id)
            await loadOrders()
        } catch (error) {
            console.error('Permanent delete error:', error)
            alert('Error al eliminar permanentemente')
        } finally {
            setLoading(false)
        }
    }

    const handleSoftDeleteOrder = async (order: Order) => {
        try {
            setLoading(true)
            await saveBatchOrders('update', [String(order.id)], { status: 'eliminado' })
            await loadOrders()
        } catch (error) {
            console.error('Soft delete error:', error)
            alert('Error al mover la orden a la papelera')
        } finally {
            setLoading(false)
        }
    }

    const handlePreview = (order: Order) => {
        setPreviewOrder(order)
        setIsPreviewModalOpen(true)
    }

    const handleClearFilters = () => {
        setSearchTerm('')
        setStatusFilter('')
        setMaterialFilter('')
        setCategoryFilter('')
    }

    // BATCH ACTIONS
    const toggleSelection = (id: number | string) => {
        const strId = String(id);
        const newSet = new Set(selectedIds);
        if (newSet.has(strId)) {
            newSet.delete(strId);
        } else {
            newSet.add(strId);
        }
        setSelectedIds(newSet);
    }

    const toggleSelectAll = () => {
        const displayedIds = displayedOrders.map(o => String(o.id));
        const currentSelected = new Set(selectedIds);
        const allSelected = displayedIds.length > 0 && displayedIds.every(id => currentSelected.has(id));

        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(displayedIds));
        }
    }

    const handleBatchStatus = async (status: 'impreso' | 'entregado') => {
        try {
            setLoading(true);
            const finalIds = Array.from(selectedIds);

            await saveBatchOrders('update', finalIds.map(String), { status });

            setSelectedIds(new Set());
            await loadOrders();
        } catch (error) {
            console.error('Batch error:', error);
            alert('Hubo un error al procesar las órdenes');
        } finally {
            setLoading(false);
        }
    }

    const handleExportClientReportPdf = () => {
        const selectedList = displayedOrders.filter(o => selectedIds.has(String(o.id)));
        const ordersToExport = selectedList.length > 0 ? selectedList : displayedOrders;

        if (ordersToExport.length === 0) {
            alert('No hay órdenes disponibles para generar el reporte PDF.');
            return;
        }

        const firstClient = ordersToExport[0]?.clienteNombre || 'Cliente';
        generatePdfClientReport(ordersToExport, {
            clienteNombre: selectedList.length > 0 && selectedList.every(o => o.clienteNombre === firstClient) ? firstClient : 'Resumen de Clientes',
        });
    }

    const handleBatchDelete = async () => {
        const isTrash = viewTab === 'trash';

        try {
            setLoading(true);
            const finalIds = Array.from(selectedIds);

            if (isTrash) {
                await saveBatchOrders('delete', finalIds.map(String));
            } else {
                await saveBatchOrders('update', finalIds.map(String), { status: 'eliminado' });
            }

            setSelectedIds(new Set());
            await loadOrders();
        } catch (error) {
            console.error('Batch delete error:', error);
            alert('Hubo un error al procesar la eliminación masiva.');
        } finally {
            setLoading(false);
        }
    }

    const handleBatchRestore = async () => {
        if (!confirm(`¿Restaurar ${selectedIds.size} órdenes?`)) return

        try {
            setLoading(true)
            const validIds = Array.from(selectedIds)

            const designIds: string[] = []
            const productionIds: string[] = []

            validIds.forEach(id => {
                const o = orders.find(x => Number(x.id) === id)
                if (o) {
                    if (o.category === 'diseno') designIds.push(String(id))
                    else productionIds.push(String(id))
                }
            })

            const promises = []
            if (designIds.length > 0) promises.push(saveBatchOrders('update', designIds, { status: 'preorden' }))
            if (productionIds.length > 0) promises.push(saveBatchOrders('update', productionIds, { status: 'orden' }))

            await Promise.all(promises)

            setSelectedIds(new Set())
            await loadOrders()
        } catch (error) {
            console.error('Batch restore error:', error)
            alert('Hubo un error al restaurar las órdenes')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="entrada-page page animate-fade-in">
            <Header title="Entrada / Ordenes" subtitle="Gestión general de pedidos" />

            {/* ACTION BAR */}
            <div className="filters-bar animate-slide-down">
                <div className="filter-group">
                    <div className="search-wrapper">
                        <input
                            type="text"
                            placeholder="Buscar por Cliente, OT, ID..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">Todos los Estados</option>
                        <option value="preorden">Pre-Orden (Diseño)</option>
                        <option value="orden">Para Imprimir</option>
                        <option value="impreso">Impreso</option>
                        <option value="entregado">Entregado</option>
                    </select>

                    <Button variant="ghost" onClick={handleClearFilters} size="sm">Limpiar</Button>
                </div>

                <div className="filter-actions">
                    <span className="results-count">
                        {filteredOrders.length} ordenes
                    </span>
                    <Button variant="primary" onClick={handleNewOrder} size="sm" className="btn-glow">
                        + Nuevo Pedido
                    </Button>
                </div>
            </div>

            {/* VIEW TABS */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                    onClick={() => setViewTab('active')}
                    style={{
                        padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: viewTab === 'active' ? '700' : '400',
                        background: viewTab === 'active' ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                        color: viewTab === 'active' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    📋 OTs Activas ({filteredOrders.filter(o => !['entregado', 'finalizado'].includes(o.status)).length})
                </button>
                <button
                    onClick={() => setViewTab('history')}
                    style={{
                        padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: viewTab === 'history' ? '700' : '400',
                        background: viewTab === 'history' ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                        color: viewTab === 'history' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    📜 Historial ({filteredOrders.filter(o => ['impreso', 'entregado', 'finalizado', 'completo'].includes(o.status)).length})
                </button>
                <button
                    onClick={() => setViewTab('trash')}
                    style={{
                        padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: viewTab === 'trash' ? '700' : '400',
                        background: viewTab === 'trash' ? '#475569' : 'var(--bg-tertiary)',
                        color: viewTab === 'trash' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    🗑️ Papelera ({filteredOrders.filter(o => o.status === 'eliminado').length})
                </button>
            </div>

            {/* BATCH ACTIONS BAR */}
            {selectedIds.size > 0 && (
                <div className="batch-actions-bar glass-panel animate-slide-down" style={{ marginBottom: '1rem', padding: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--primary-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{selectedIds.size} seleccionados</span>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} style={{ fontSize: '0.8rem' }}>Cancelar</Button>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-color)', display: 'flex', gap: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                            {selectedTotals.m2 > 0 && <span>Total m²: <strong>{selectedTotals.m2.toFixed(2)}</strong></span>}
                            {selectedTotals.ml > 0 && <span>Total ml: <strong>{selectedTotals.ml.toFixed(2)}</strong></span>}
                            {((user?.role as string) === 'administrador' || (user?.role as string) === 'principal' || (user?.role as string) === 'sistema') && (
                                <span>Total $: <strong>{selectedTotals.price.toLocaleString()}</strong></span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleExportClientReportPdf}
                            style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none' }}
                        >
                            📄 Exportar PDF Cliente
                        </Button>
                        {viewTab !== 'trash' ? (
                            <>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleBatchStatus('impreso')}
                                    style={{ backgroundColor: statusColors['impreso'], color: '#fff', border: 'none' }}
                                >
                                    Marcar como Impresos
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleBatchStatus('entregado')}
                                    style={{ backgroundColor: statusColors['entregado'], color: '#fff', border: 'none' }}
                                >
                                    Marcar como Entregados
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleBatchRestore}
                                style={{ backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none' }}
                            >
                                Restaurar Seleccionados
                            </Button>
                        )}
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleBatchDelete}
                            style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', marginLeft: '0.5rem' }}
                        >
                            {viewTab === 'trash' ? 'Borrar Definitivamente' : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            )}

            {/* TABLE */}
            <div className="orders-table-container glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Cargando órdenes...</p>
                    </div>
                ) : (
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={displayedOrders.length > 0 && selectedIds.size === displayedOrders.length}
                                        onChange={toggleSelectAll}
                                        style={{ accentColor: 'var(--primary-color)', cursor: 'pointer', transform: 'scale(1.2)' }}
                                    />
                                </th>
                                <th style={{ width: '60px' }}>Tipo</th>
                                <th>N° OT</th>
                                <th>Origen</th>
                                <th>Descripción del Trabajo</th>
                                <th>Creación</th>
                                <th>Estado</th>
                                <th>Cliente</th>
                                <th>Material</th>
                                <th>Medidas</th>
                                <th>Copias</th>
                                <th>Demasías</th>
                                <th>Consumo</th>
                                {((user?.role as string) === 'administrador' || (user?.role as string) === 'principal' || (user?.role as string) === 'sistema') && (
                                    <th>Importe</th>
                                )}
                                <th>Entrega</th>
                                <th style={{ textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedOrders.map(order => {
                                const consumption = getConsumption(order);
                                const isMobile = order.origen === 'mobile';
                                const operarioNombre = order.operarioNombre || order.vendedorNombre || (order as any).vendedor?.nombre || (order as any).vendedorName || '';
                                const otDisplay = order.ot || `OT-${order.id}`;
                                let cleanDesc = (order.nombreTarea || order.observaciones || '').trim();
                                if (!cleanDesc || cleanDesc.startsWith('Proyecto #') || cleanDesc.startsWith('Proyecto OT-')) {
                                    cleanDesc = order.observaciones || order.material || 'Trabajo de Impresión';
                                }

                                return (
                                    <tr key={order.id || order.ot} className={`fade-in hover-row ${selectedIds.has(String(order.id)) ? 'selected-row' : ''}`} style={selectedIds.has(String(order.id)) ? { background: 'rgba(var(--primary-rgb), 0.05)' } : {}}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(String(order.id))}
                                                onChange={() => toggleSelection(order.id || order.ot || '')}
                                                style={{ accentColor: 'var(--primary-color)', cursor: 'pointer', transform: 'scale(1.2)' }}
                                            />
                                        </td>
                                        <td>
                                            <div className="type-icon" title={statusLabels[order.status] || order.status}>
                                                {['preorden', 'diseno'].includes(order.status) ? '🎨' :
                                                    ['orden', 'impreso', 'post'].includes(order.status) ? '🖨️' :
                                                        ['entregado', 'finalizado'].includes(order.status) ? '📦' :
                                                            ['standby', 'anulado', 'rebotado'].includes(order.status) ? '⚠️' : '📄'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="order-id">
                                                <span className="ot-text" style={{ fontWeight: 800, color: '#ff9800', fontSize: '0.95rem' }}>{otDisplay}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {isMobile ? (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: 'rgba(0, 218, 243, 0.15)',
                                                    color: '#00daf3',
                                                    border: '1px solid rgba(0, 218, 243, 0.4)'
                                                }} title={`Enviado por: ${operarioNombre || 'Operario Móvil'}`}>
                                                    📱 App {operarioNombre ? operarioNombre : 'Móvil'}
                                                </span>
                                            ) : (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: 'rgba(147, 51, 234, 0.15)',
                                                    color: '#c084fc',
                                                    border: '1px solid rgba(147, 51, 234, 0.3)'
                                                }}>
                                                    💻 Sistema Web
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ maxWidth: '220px' }} title={cleanDesc}>
                                                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {cleanDesc}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                {order.createdAt ? new Date(order.createdAt).toLocaleString('es-AR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                }) : '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="status-badge" style={{
                                                backgroundColor: statusColors[order.status],
                                                boxShadow: `0 0 8px ${statusColors[order.status]}40`
                                            }}>
                                                {statusLabels[order.status]}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="client-cell">
                                                <span style={{ fontWeight: 600 }}>{order.clienteNombre}</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                <span className="material-tag-sm">{order.material}</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="dims-text">{Number(order.ancho).toFixed(2)} x {Number(order.alto).toFixed(2)} m</span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="copies-badge">{order.copias}</span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {order.demasiasConfig && Object.values(order.demasiasConfig).some(v => v === true) ? (
                                                <div className="demasia-indicator-group" style={{ margin: '0 auto', width: 'fit-content' }}>
                                                    <span className="demasia-arrows">
                                                        {order.demasiasConfig.top ? '↑' : ''}
                                                        {order.demasiasConfig.bottom ? '↓' : ''}
                                                        {order.demasiasConfig.left ? '←' : ''}
                                                        {order.demasiasConfig.right ? '→' : ''}
                                                    </span>
                                                    <span className="demasia-target">🎯</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="m2-text font-mono text-muted">
                                                {consumption.value.toFixed(2)} <small>{consumption.unit}</small>
                                            </span>
                                        </td>
                                        {((user?.role as string) === 'administrador' || (user?.role as string) === 'principal' || (user?.role as string) === 'sistema') && (
                                            <td>
                                                <div className="price-cell">
                                                    <span className="currency">$</span>
                                                    <span className="amount">
                                                        {calculateOrderPrice(order).toLocaleString()}
                                                    </span>
                                                </div>
                                            </td>
                                        )}
                                        <td>
                                            <div className="date-cell" style={{ fontWeight: '600', color: 'var(--accent)' }}>
                                                {order.fechaEntrega ? (() => {
                                                    const d = new Date(order.fechaEntrega + 'T12:00:00');
                                                    const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase().replace('.', '');
                                                    return `${dayName} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                                                })() : <span className="text-muted italic">--</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="order-actions-row">
                                                {order.status === 'eliminado' ? (
                                                    <>
                                                        <button
                                                            className="btn-icon-action"
                                                            onClick={(e) => { e.stopPropagation(); handleRestoreOrder(order); }}
                                                            title="Restaurar Orden"
                                                            style={{ filter: 'grayscale(0)' }}
                                                        >
                                                            <span style={{ pointerEvents: 'none', fontSize: '1.2rem' }}>🔁</span>
                                                        </button>
                                                        <button
                                                            className="btn-icon-action btn-danger-action"
                                                            onClick={(e) => { e.stopPropagation(); handlePermanentDelete(order); }}
                                                            title="Eliminar Definitivamente"
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>🗑️</span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="btn-icon-action"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setChatOrder(order);
                                                                setIsChatModalOpen(true);
                                                            }}
                                                            title="Mensajería / Chat con Operario"
                                                            style={{ background: 'rgba(37, 99, 235, 0.25)', border: '1px solid rgba(37, 99, 235, 0.6)' }}
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>💬</span>
                                                        </button>
                                                        <button
                                                            className="btn-icon-action"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                generatePdfBudget(order);
                                                            }}
                                                            title="Imprimir / Ver Presupuesto PDF"
                                                            style={{ background: 'rgba(249, 115, 22, 0.25)', border: '1px solid rgba(249, 115, 22, 0.6)' }}
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>📄</span>
                                                        </button>
                                                        <button
                                                            className="btn-icon-action"
                                                            onClick={(e) => { e.stopPropagation(); handlePreview(order); }}
                                                            title="Ver Detalle / Previsualizar"
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>👁️</span>
                                                        </button>
                                                        <button
                                                            className="btn-icon-action"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setStatusOrder(order);
                                                                setIsStatusModalOpen(true);
                                                            }}
                                                            title="Operaciones / Estado"
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>⚙️</span>
                                                        </button>
                                                        <button
                                                            className="btn-icon-action"
                                                            onClick={(e) => { e.stopPropagation(); handleEditOrder(order); }}
                                                            title="Editar Pedido"
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>✏️</span>
                                                        </button>
                                                        <button
                                                            className="btn-icon-action btn-danger-action"
                                                            onClick={(e) => { e.stopPropagation(); handleSoftDeleteOrder(order); }}
                                                            title="Enviar a Papelera"
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>🗑️</span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODALS */}
            {
                isModalOpen && (
                    <NuevoPedidoModal
                        isOpen={isModalOpen}
                        order={editingOrder}
                        defaultStatus={defaultStatus}
                        onClose={(created) => {
                            setIsModalOpen(false)
                            setEditingOrder(null)
                            if (created) loadOrders()
                        }}
                    />
                )
            }
            {
                isStatusModalOpen && statusOrder && (
                    <StatusChangeModal
                        isOpen={isStatusModalOpen}
                        order={statusOrder}
                        onClose={(updated) => {
                            setIsStatusModalOpen(false)
                            setStatusOrder(null)
                            if (updated) refreshOrders()
                        }}
                    />
                )
            }
            {
                isPreviewModalOpen && previewOrder && (
                    <SharedFileViewerModal
                        isOpen={isPreviewModalOpen}
                        onClose={() => {
                            setIsPreviewModalOpen(false)
                            setPreviewOrder(null)
                        }}
                        order={previewOrder}
                        showStandardize={user?.role === 'impresion' || user?.role === 'administrador' || user?.role === 'principal'}
                        onUpdate={() => refreshOrders()}
                    />
                )
            }
            {
                isChatModalOpen && chatOrder && (
                    <OrderChatModal
                        isOpen={isChatModalOpen}
                        onClose={() => {
                            setIsChatModalOpen(false)
                            setChatOrder(null)
                        }}
                        order={chatOrder}
                    />
                )
            }
        </div>
    )
}
