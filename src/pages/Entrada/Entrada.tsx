import { useState, useEffect, useMemo } from 'react'
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
    const [statusBatchOrders, setStatusBatchOrders] = useState<Order[] | undefined>(undefined)
    const [previewOrder, setPreviewOrder] = useState<Order | null>(null)
    const [chatOrder, setChatOrder] = useState<Order | null>(null)

    const [defaultStatus, setDefaultStatus] = useState<string>('orden')

    // ASYNC STATE
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    // BATCH SELECTION STATE & ACCORDION EXPANSION STATE
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())

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
            (order.material?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (order.nombreTarea?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (order.loteNombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (order.descripcionItem?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (order.observaciones?.toLowerCase() || '').includes(searchTerm.toLowerCase());

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


    const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

    const calculateOrderPrice = (order: Order) => {
        const matData = allMateriales.find(m => m.codigo === order.material);
        const w = round2(Number(order.ancho) || 0);
        const h = round2(Number(order.alto) || 0);
        const c = Number(order.copias) || 1;

        if (matData) {
            if (matData.tipoCobro === 'ml' && matData.bobinas && matData.bobinas.length > 0) {
                const safetyMargin = 0.01;
                const availableWidths = matData.bobinas
                    .map((b: any) => ({ ...b, usefulWidth: round2(b.ancho - safetyMargin) }))
                    .filter((b: any) => b.usefulWidth > 0)
                    .sort((a: any, b: any) => a.usefulWidth - b.usefulWidth);

                const cliente = allClientes.find(cl => cl.id === order.clientId);
                const specialPrice = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[order.material] : null;

                // Collect ALL valid bobina+orientation combos
                type Candidate = { bobina: number; ml: number; cost: number };
                const candidates: Candidate[] = [];

                for (const b of availableWidths) {
                    const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${order.material}:${b.ancho}`] : null;
                    const priceToUse = specialPriceWidth || specialPrice || b.precioML;

                    if (w <= b.usefulWidth) {
                        const ml = round2(h * c);
                        candidates.push({ bobina: b.ancho, ml, cost: Math.round(priceToUse * ml) });
                    }
                    if (h <= b.usefulWidth) {
                        const ml = round2(w * c);
                        candidates.push({ bobina: b.ancho, ml, cost: Math.round(priceToUse * ml) });
                    }
                }

                // Minimize waste: smallest bobina first, then fewest ML
                candidates.sort((a, b) => a.bobina - b.bobina || a.ml - b.ml);

                if (candidates.length > 0) return candidates[0].cost;

                // Fallback: widest bobina
                if (availableWidths.length > 0) {
                    const widest = availableWidths[availableWidths.length - 1];
                    const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${order.material}:${widest.ancho}`] : null;
                    const priceToUse = specialPriceWidth || specialPrice || widest.precioML;
                    const ml = round2(h * c);
                    return Math.round(priceToUse * ml);
                }
            }

            if (matData.precioM2) {
                const cliente = allClientes.find(cl => cl.id === order.clientId);
                const specialPrice = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[order.material] : null;
                const priceToUse = specialPrice || matData.precioM2 || 0;
                const m2 = round2(w * h * c);
                return Math.round(m2 * priceToUse);
            }
        }

        const price = order.subtotal || order.total || 0;
        return price > 0 ? Math.round(price) : 0;
    }

    const getConsumption = (order: Order) => {
        const matData = allMateriales.find(m => m.codigo === order.material);

        const w = round2(Number(order.ancho) || 0);
        const h = round2(Number(order.alto) || 0);
        const c = Number(order.copias) || 1;

        const isMl = matData?.tipoCobro === 'ml' || (matData?.bobinas && matData.bobinas.length > 0) || order.material === 'VV' || order.material === 'VVP';

        if (isMl) {
            let val = order.consumoEstimado !== undefined ? round2(order.consumoEstimado) : undefined;
            let assignedBobina = order.bobinaAsignada || order.precioDetalle?.bobinaAncho || order.precioDetalle?.bobinaUsada;

            if (val === undefined || !assignedBobina) {
                if (matData?.bobinas && matData.bobinas.length > 0) {
                    const safetyMargin = 0.01;
                    const availableWidths = matData.bobinas
                        .map((b: any) => ({ ...b, usefulWidth: round2(b.ancho - safetyMargin) }))
                        .filter((b: any) => b.usefulWidth > 0)
                        .sort((a: any, b: any) => a.usefulWidth - b.usefulWidth);

                    // Collect ALL valid bobina+orientation combos
                    type Candidate = { bobina: number; ml: number };
                    const candidates: Candidate[] = [];

                    for (const b of availableWidths) {
                        if (w <= b.usefulWidth) {
                            candidates.push({ bobina: b.ancho, ml: round2(h * c) });
                        }
                        if (h <= b.usefulWidth) {
                            candidates.push({ bobina: b.ancho, ml: round2(w * c) });
                        }
                    }

                    // Minimize waste: smallest bobina first, then fewest ML
                    candidates.sort((a, b) => a.bobina - b.bobina || a.ml - b.ml);

                    if (candidates.length > 0) {
                        val = candidates[0].ml;
                        assignedBobina = candidates[0].bobina;
                    } else {
                        val = round2(h * c);
                        assignedBobina = availableWidths[availableWidths.length - 1]?.ancho;
                    }
                } else {
                    // Standard Vehicular Vinyl roll sizes: 1.37m & 1.52m
                    if (w <= 1.36) {
                        assignedBobina = 1.37;
                        val = round2(h * c);
                    } else if (h <= 1.36 && round2(w * c) <= round2(h * c)) {
                        assignedBobina = 1.37;
                        val = round2(w * c);
                    } else if (w <= 1.51 || h <= 1.51) {
                        assignedBobina = 1.52;
                        val = (h <= 1.51 && round2(w * c) < round2(h * c)) ? round2(w * c) : round2(h * c);
                    } else {
                        assignedBobina = 1.52;
                        val = round2(h * c);
                    }
                }
            }
            return {
                value: round2(val),
                unit: 'ml',
                bobina: assignedBobina ? `${assignedBobina}` : null
            };
        }
        return {
            value: round2(w * h * c),
            unit: 'm²',
            bobina: null
        };
    }

    // ACCORDION / BATCH GROUPING TYPES & COMPUTATION
    interface GroupedBatch {
        isBatch: true;
        batchId: string;
        batchName: string;
        orders: Order[];
        primaryOrder: Order;
        totalPrice: number;
        totalConsumption: {
            m2: number;
            ml: number;
            mlByBobina: Record<string, number>;
        };
        totalCopies: number;
        allSelected: boolean;
        someSelected: boolean;
    }

    interface GroupedSingle {
        isBatch: false;
        order: Order;
    }

    type GroupedItem = GroupedBatch | GroupedSingle;

    const toggleExpandBatch = (batchId: string) => {
        setExpandedBatches(prev => {
            const next = new Set(prev);
            if (next.has(batchId)) {
                next.delete(batchId);
            } else {
                next.add(batchId);
            }
            return next;
        });
    }

    const toggleSelectBatch = (batchOrders: Order[]) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            const batchIds = batchOrders.map(o => String(o.id || o.ot));
            const allChecked = batchIds.every(id => next.has(id));
            if (allChecked) {
                batchIds.forEach(id => next.delete(id));
            } else {
                batchIds.forEach(id => next.add(id));
            }
            return next;
        });
    }

    const getBatchInfo = (order: Order) => {
        if (order.batchId) {
            return {
                key: order.batchId,
                name: order.loteNombre || order.nombreTarea || 'Lote de Impresión'
            };
        }

        if (order.loteNombre && order.loteNombre.trim().length > 0) {
            return {
                key: `lote_${order.clientId || '0'}_${order.loteNombre.trim().toLowerCase()}`,
                name: order.loteNombre.trim()
            };
        }

        // Infer from nombreTarea / observaciones / description if it contains " - "
        const text = (order.nombreTarea || order.observaciones || '').trim();
        if (text && text.includes(' - ')) {
            const prefix = text.split(' - ')[0].trim();
            if (prefix.length > 2 && !prefix.startsWith('Proyecto #') && !prefix.startsWith('Proyecto OT-')) {
                return {
                    key: `lote_${order.clientId || '0'}_${prefix.toLowerCase()}`,
                    name: prefix
                };
            }
        }

        return null;
    };

    const groupedOrders = useMemo<GroupedItem[]>(() => {
        const batchesMap = new Map<string, { name: string; orders: Order[] }>();

        displayedOrders.forEach(order => {
            const bInfo = getBatchInfo(order);
            if (bInfo) {
                if (!batchesMap.has(bInfo.key)) {
                    batchesMap.set(bInfo.key, { name: bInfo.name, orders: [] });
                }
                batchesMap.get(bInfo.key)!.orders.push(order);
            }
        });

        const result: GroupedItem[] = [];
        const processedBatches = new Set<string>();

        displayedOrders.forEach(order => {
            const bInfo = getBatchInfo(order);

            if (bInfo && (batchesMap.get(bInfo.key)?.orders.length || 0) > 1) {
                if (processedBatches.has(bInfo.key)) return;
                processedBatches.add(bInfo.key);

                const batchData = batchesMap.get(bInfo.key)!;
                const batchList = batchData.orders;
                let totalPrice = 0;
                let totalM2 = 0;
                let totalMl = 0;
                let totalCopies = 0;
                let selectedCount = 0;
                const mlByBobina: Record<string, number> = {};

                batchList.forEach(o => {
                    totalPrice += calculateOrderPrice(o);
                    const cons = getConsumption(o);
                    if (cons.unit === 'ml') {
                        totalMl += cons.value;
                        const bKey = cons.bobina ? `${cons.bobina}m` : 'Estándar';
                        mlByBobina[bKey] = (mlByBobina[bKey] || 0) + cons.value;
                    } else {
                        totalM2 += cons.value;
                    }
                    totalCopies += (o.copias || 1);
                    if (selectedIds.has(String(o.id || o.ot))) selectedCount++;
                });

                result.push({
                    isBatch: true,
                    batchId: bInfo.key,
                    batchName: batchData.name,
                    orders: batchList,
                    primaryOrder: batchList[0],
                    totalPrice,
                    totalConsumption: { m2: totalM2, ml: totalMl, mlByBobina },
                    totalCopies,
                    allSelected: selectedCount === batchList.length && batchList.length > 0,
                    someSelected: selectedCount > 0 && selectedCount < batchList.length
                });
            } else if (!bInfo || (batchesMap.get(bInfo.key)?.orders.length || 0) <= 1) {
                result.push({ isBatch: false, order });
            }
        });

        return result;
    }, [displayedOrders, selectedIds]);




    const selectedTotals = {
        m2: Array.from(selectedIds).reduce((acc, id) => {
            const o = orders.find(x => String(x.id || x.ot) === String(id));
            if (!o) return acc;
            const cons = getConsumption(o);
            return cons.unit === 'm²' ? acc + cons.value : acc;
        }, 0),
        ml: Array.from(selectedIds).reduce((acc, id) => {
            const o = orders.find(x => String(x.id || x.ot) === String(id));
            if (!o) return acc;
            const cons = getConsumption(o);
            return cons.unit === 'ml' ? acc + cons.value : acc;
        }, 0),
        price: Array.from(selectedIds).reduce((acc, id) => {
            const o = orders.find(x => String(x.id || x.ot) === String(id));
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
        const displayedIds = displayedOrders.map(o => String(o.id || o.ot));
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
        const selectedList = displayedOrders.filter(o => selectedIds.has(String(o.id || o.ot)));
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
        const count = selectedIds.size;

        if (!confirm(`¿${isTrash ? 'Borrar definitivamente' : 'Enviar a papelera'} ${count} orden${count > 1 ? 'es' : ''}?`)) return;

        const finalIds = Array.from(selectedIds).map(String);
        setSelectedIds(new Set());

        try {
            setLoading(true);

            if (isTrash) {
                await saveBatchOrders('delete', finalIds);
            } else {
                await saveBatchOrders('update', finalIds, { status: 'eliminado' });
            }

            await loadOrders();
        } catch (error) {
            console.error('Batch delete error:', error);
            alert('Hubo un error al procesar la eliminación masiva.');
            await loadOrders();
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
                const o = orders.find(x => String(x.id || x.ot) === String(id))
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
                                <th>N° OT / Trabajo</th>
                                <th>Origen</th>
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
                            {groupedOrders.map(item => {
                                if (item.isBatch) {
                                    const isExpanded = expandedBatches.has(item.batchId);
                                    return (
                                        <>
                                            {/* MASTER BATCH ROW */}
                                            <tr
                                                key={item.batchId}
                                                className={`batch-row-master ${isExpanded ? 'is-expanded' : ''} ${item.allSelected ? 'selected-row' : ''}`}
                                            >
                                                <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <button
                                                            type="button"
                                                            className="batch-expand-btn"
                                                            onClick={() => toggleExpandBatch(item.batchId)}
                                                            title={isExpanded ? "Contraer lote" : "Desplegar órdenes del lote"}
                                                        >
                                                            {isExpanded ? '▼' : '▶'}
                                                        </button>
                                                        <input
                                                            type="checkbox"
                                                            checked={item.allSelected}
                                                            ref={el => { if (el) el.indeterminate = item.someSelected; }}
                                                            onChange={() => toggleSelectBatch(item.orders)}
                                                            style={{ accentColor: 'var(--primary-color)', cursor: 'pointer', transform: 'scale(1.2)' }}
                                                            title="Seleccionar todas las OTs del lote"
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="order-id" style={{ cursor: 'pointer' }} onClick={() => toggleExpandBatch(item.batchId)}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                            <span className="batch-badge-pill">🏷️ {item.batchName}</span>
                                                            <span className="batch-count-pill">📦 {item.orders.length} OTs</span>
                                                        </div>
                                                        <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            {isExpanded ? '▼ Clic para contraer' : '▶ Clic para ver los archivos'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {item.primaryOrder.origen === 'mobile' ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(0, 218, 243, 0.15)', color: '#00daf3', border: '1px solid rgba(0, 218, 243, 0.4)' }}>
                                                            📱 App Móvil
                                                        </span>
                                                    ) : (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: 'rgba(147, 51, 234, 0.15)', color: '#c084fc', border: '1px solid rgba(147, 51, 234, 0.3)' }}>
                                                            💻 Sistema Web
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                        {item.primaryOrder.createdAt ? new Date(item.primaryOrder.createdAt).toLocaleString('es-AR', {
                                                            timeZone: 'America/Argentina/Buenos_Aires',
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            hour12: false
                                                        }) : (item.primaryOrder.fechaCreacion || '-')}
                                                    </span>
                                                </td>
                                                <td
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setStatusOrder(item.primaryOrder);
                                                        setStatusBatchOrders(item.orders);
                                                        setIsStatusModalOpen(true);
                                                    }}
                                                    title="Click para cambiar el estado de todo el lote"
                                                >
                                                    {(() => {
                                                        const distinct = Array.from(new Set(item.orders.map(o => o.status)));
                                                        if (distinct.length === 1) {
                                                            const st = distinct[0];
                                                            return (
                                                                <span className="status-badge" style={{ backgroundColor: statusColors[st], boxShadow: `0 0 8px ${statusColors[st]}40`, cursor: 'pointer' }}>
                                                                    {statusLabels[st]}
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span className="status-badge" style={{ backgroundColor: '#64748b', fontSize: '0.72rem', cursor: 'pointer' }}>
                                                                Mixto ({distinct.length})
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td>
                                                    <div className="client-cell">
                                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.primaryOrder.clienteNombre}</span>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {(() => {
                                                        const mats = Array.from(new Set(item.orders.map(o => o.material)));
                                                        if (mats.length === 1) {
                                                            return <span className="material-tag-sm">{mats[0]}</span>;
                                                        }
                                                        return <span className="material-tag-sm" style={{ background: 'rgba(255,255,255,0.1)' }}>{mats.length} mats</span>;
                                                    })()}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.85rem' }}>{item.orders.length} piezas</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="copies-badge" style={{ background: 'rgba(37, 99, 235, 0.2)', color: '#93c5fd' }}>{item.totalCopies}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {item.totalConsumption.ml > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                            <span className="m2-text font-mono" style={{ fontWeight: 800, color: '#00daf3', fontSize: '0.92rem' }}>
                                                                {item.totalConsumption.ml.toFixed(2)} <small>ml</small>
                                                            </span>
                                                            {item.totalConsumption.mlByBobina && Object.keys(item.totalConsumption.mlByBobina).length > 0 && (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '3px', marginTop: '2px' }}>
                                                                    {Object.entries(item.totalConsumption.mlByBobina).map(([bLabel, bVal]) => (
                                                                        <span key={bLabel} style={{
                                                                            fontSize: '0.72rem',
                                                                            fontWeight: 700,
                                                                            padding: '1px 6px',
                                                                            borderRadius: '6px',
                                                                            background: 'rgba(0, 218, 243, 0.12)',
                                                                            color: '#67e8f9',
                                                                            border: '1px solid rgba(0, 218, 243, 0.3)',
                                                                            whiteSpace: 'nowrap'
                                                                        }}>
                                                                            {bVal.toFixed(2)} ml <span style={{ opacity: 0.8, fontSize: '0.68rem' }}>({bLabel})</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="m2-text font-mono text-muted" style={{ fontWeight: 700, color: '#e2e8f0' }}>
                                                            {item.totalConsumption.m2.toFixed(2)} <small>m²</small>
                                                        </span>
                                                    )}
                                                </td>
                                                {((user?.role as string) === 'administrador' || (user?.role as string) === 'principal' || (user?.role as string) === 'sistema') && (
                                                    <td>
                                                        <div className="price-cell" style={{ fontWeight: 800, color: '#10b981' }}>
                                                            <span className="currency">$</span>
                                                            <span className="amount">{item.totalPrice.toLocaleString()}</span>
                                                        </div>
                                                    </td>
                                                )}
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                        <div className="date-cell" style={{ fontWeight: '700', color: 'var(--accent)', fontSize: '0.85rem' }}>
                                                            {item.primaryOrder.fechaEntrega ? (() => {
                                                                const d = new Date(item.primaryOrder.fechaEntrega + 'T12:00:00');
                                                                if (!isNaN(d.getTime())) {
                                                                    const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase().replace('.', '');
                                                                    return `${dayName} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                                                                }
                                                                return item.primaryOrder.fechaEntrega;
                                                            })() : <span className="text-muted italic">--</span>}
                                                        </div>
                                                        {(() => {
                                                            const envios = Array.from(new Set(item.orders.map(o => o.envio).filter(Boolean)));
                                                            if (envios.length > 0) {
                                                                return (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px' }}>
                                                                        {envios.map(env => (
                                                                            <span key={env} style={{
                                                                                fontSize: '0.7rem',
                                                                                fontWeight: 700,
                                                                                padding: '1px 6px',
                                                                                borderRadius: '4px',
                                                                                background: 'rgba(245, 158, 11, 0.15)',
                                                                                color: '#fbbf24',
                                                                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                                                                whiteSpace: 'nowrap'
                                                                            }}>
                                                                                🚚 {env}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="order-actions-row">
                                                        <button
                                                            type="button"
                                                            className="btn-icon-action"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const clientObj = allClientes.find(c => c.id === item.primaryOrder.clientId);
                                                                generatePdfClientReport(item.orders, {
                                                                    clienteNombre: item.primaryOrder.clienteNombre,
                                                                    clienteEmpresa: clientObj?.empresa,
                                                                    clienteTelefono: clientObj?.telefono,
                                                                    clienteEmail: clientObj?.email
                                                                });
                                                            }}
                                                            title="Exportar Reporte PDF del Lote para el Cliente"
                                                            style={{ background: 'rgba(37, 99, 235, 0.25)', border: '1px solid rgba(37, 99, 235, 0.6)' }}
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>📄</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-icon-action"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setStatusOrder(item.primaryOrder);
                                                                setStatusBatchOrders(item.orders);
                                                                setIsStatusModalOpen(true);
                                                            }}
                                                            title="Cambiar Estado al Lote"
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>⚙️</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-icon-action btn-danger-action"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`¿Mover las ${item.orders.length} órdenes del lote "${item.batchName}" a la papelera?`)) {
                                                                    for (const o of item.orders) {
                                                                        await handleSoftDeleteOrder(o);
                                                                    }
                                                                }
                                                            }}
                                                            title="Enviar todo el Lote a Papelera"
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>🗑️</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* EXPANDED CHILD ROWS */}
                                            {isExpanded && item.orders.map(order => {
                                                const consumption = getConsumption(order);
                                                const otDisplay = order.ot || `OT-${order.id}`;
                                                let childLabel = order.descripcionItem;
                                                if (!childLabel && order.nombreTarea && order.nombreTarea.includes(' - ')) {
                                                    childLabel = order.nombreTarea.split(' - ').slice(1).join(' - ').trim();
                                                }
                                                if (!childLabel) {
                                                    childLabel = order.archivosOriginales?.[0] || order.archivos?.[0] || order.nombreTarea || '';
                                                }


                                                return (
                                                    <tr key={order.id || order.ot} className={`batch-child-row fade-in ${selectedIds.has(String(order.id || order.ot)) ? 'selected-row' : ''}`}>
                                                        <td style={{ verticalAlign: 'middle' }}>
                                                            <div className="batch-child-indent">
                                                                <span className="batch-child-connector">↳</span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedIds.has(String(order.id || order.ot))}
                                                                    onChange={() => toggleSelection(order.id || order.ot || '')}
                                                                    style={{ accentColor: 'var(--primary-color)', cursor: 'pointer', transform: 'scale(1.1)' }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="order-id" style={{ paddingLeft: '8px' }}>
                                                                <span className="ot-text" style={{ fontWeight: 800, color: '#ff9800', fontSize: '0.9rem' }}>{otDisplay}</span>
                                                                {childLabel && (
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={childLabel}>
                                                                        {childLabel}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>—</span>
                                                        </td>
                                                        <td>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                            </span>
                                                        </td>
                                                        <td
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setStatusOrder(order);
                                                                setStatusBatchOrders(undefined);
                                                                setIsStatusModalOpen(true);
                                                            }}
                                                            title="Click para cambiar el estado de este ítem"
                                                        >
                                                            <span className="status-badge" style={{
                                                                backgroundColor: statusColors[order.status],
                                                                boxShadow: `0 0 6px ${statusColors[order.status]}30`,
                                                                fontSize: '0.72rem',
                                                                padding: '2px 6px',
                                                                cursor: 'pointer'
                                                            }}>
                                                                {statusLabels[order.status]}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>↳ {order.clienteNombre}</span>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className="material-tag-sm">{order.material}</span>
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
                                                            {consumption.unit === 'ml' ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                                    <span className="m2-text font-mono" style={{ fontWeight: 700, color: '#00daf3', fontSize: '0.85rem' }}>
                                                                        {consumption.value.toFixed(2)} <small>ml</small>
                                                                    </span>
                                                                    {consumption.bobina && (
                                                                        <span style={{
                                                                            fontSize: '0.68rem',
                                                                            fontWeight: 700,
                                                                            padding: '1px 5px',
                                                                            borderRadius: '4px',
                                                                            background: 'rgba(59, 130, 246, 0.18)',
                                                                            color: '#93c5fd',
                                                                            border: '1px solid rgba(59, 130, 246, 0.35)',
                                                                            whiteSpace: 'nowrap'
                                                                        }}>
                                                                            Rollo {consumption.bobina}m
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="m2-text font-mono text-muted">
                                                                    {consumption.value.toFixed(2)} <small>{consumption.unit}</small>
                                                                </span>
                                                            )}
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
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    {order.fechaEntrega ? (() => {
                                                                        const d = new Date(order.fechaEntrega + 'T12:00:00');
                                                                        if (!isNaN(d.getTime())) {
                                                                            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                                                                        }
                                                                        return order.fechaEntrega;
                                                                    })() : '--'}
                                                                </span>
                                                                {order.envio && (
                                                                    <span style={{
                                                                        fontSize: '0.68rem',
                                                                        fontWeight: 700,
                                                                        padding: '1px 5px',
                                                                        borderRadius: '4px',
                                                                        background: 'rgba(245, 158, 11, 0.15)',
                                                                        color: '#fbbf24',
                                                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                                                        whiteSpace: 'nowrap'
                                                                    }}>
                                                                        🚚 {order.envio}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="order-actions-row">
                                                                <button
                                                                    className="btn-icon-action"
                                                                    onClick={(e) => { e.stopPropagation(); setChatOrder(order); setIsChatModalOpen(true); }}
                                                                    title="Mensajería / Chat"
                                                                >
                                                                    <span style={{ pointerEvents: 'none' }}>💬</span>
                                                                </button>
                                                                <button
                                                                    className="btn-icon-action"
                                                                    onClick={(e) => { e.stopPropagation(); generatePdfBudget(order); }}
                                                                    title="Presupuesto PDF"
                                                                >
                                                                    <span style={{ pointerEvents: 'none' }}>📄</span>
                                                                </button>
                                                                <button
                                                                    className="btn-icon-action"
                                                                    onClick={(e) => { e.stopPropagation(); handlePreview(order); }}
                                                                    title="Ver Detalle"
                                                                >
                                                                    <span style={{ pointerEvents: 'none' }}>👁️</span>
                                                                </button>
                                                                <button
                                                                    className="btn-icon-action"
                                                                    onClick={(e) => { e.stopPropagation(); setStatusOrder(order); setStatusBatchOrders(undefined); setIsStatusModalOpen(true); }}
                                                                    title="Estado"
                                                                >
                                                                    <span style={{ pointerEvents: 'none' }}>⚙️</span>
                                                                </button>
                                                                <button
                                                                    className="btn-icon-action"
                                                                    onClick={(e) => { e.stopPropagation(); handleEditOrder(order); }}
                                                                    title="Editar"
                                                                >
                                                                    <span style={{ pointerEvents: 'none' }}>✏️</span>
                                                                </button>
                                                                <button
                                                                    className="btn-icon-action btn-danger-action"
                                                                    onClick={(e) => { e.stopPropagation(); handleSoftDeleteOrder(order); }}
                                                                    title="Papelera"
                                                                >
                                                                    <span style={{ pointerEvents: 'none' }}>🗑️</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </>
                                    );
                                }

                                // SINGLE NON-BATCH ORDER
                                const order = item.order;
                                const consumption = getConsumption(order);
                                const isMobile = order.origen === 'mobile';
                                const operarioNombre = order.operarioNombre || order.vendedorNombre || (order as any).vendedor?.nombre || (order as any).vendedorName || '';
                                const otDisplay = order.ot || `OT-${order.id}`;
                                let cleanDesc = (order.nombreTarea || order.observaciones || '').trim();
                                if (cleanDesc.startsWith('Proyecto #') || cleanDesc.startsWith('Proyecto OT-') || cleanDesc === 'Nuevo Pedido' || cleanDesc === 'Trabajo de Impresión') {
                                    cleanDesc = '';
                                }

                                return (
                                    <tr key={order.id || order.ot} className={`fade-in hover-row ${selectedIds.has(String(order.id || order.ot)) ? 'selected-row' : ''}`} style={selectedIds.has(String(order.id || order.ot)) ? { background: 'rgba(var(--primary-rgb), 0.05)' } : {}}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(String(order.id || order.ot))}
                                                onChange={() => toggleSelection(order.id || order.ot || '')}
                                                style={{ accentColor: 'var(--primary-color)', cursor: 'pointer', transform: 'scale(1.2)' }}
                                            />
                                        </td>
                                        <td>
                                            <div className="order-id">
                                                <span className="ot-text" style={{ fontWeight: 800, color: '#ff9800', fontSize: '0.95rem' }}>{otDisplay}</span>
                                                {cleanDesc && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cleanDesc}>
                                                        {cleanDesc}
                                                    </span>
                                                )}
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
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                {order.createdAt ? new Date(order.createdAt).toLocaleString('es-AR', {
                                                    timeZone: 'America/Argentina/Buenos_Aires',
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                }) : (order.fechaCreacion || '-')}
                                            </span>
                                        </td>
                                        <td
                                            style={{ cursor: 'pointer' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setStatusOrder(order);
                                                setStatusBatchOrders(undefined);
                                                setIsStatusModalOpen(true);
                                            }}
                                            title="Click para cambiar el estado del pedido"
                                        >
                                            <span className="status-badge" style={{
                                                backgroundColor: statusColors[order.status],
                                                boxShadow: `0 0 8px ${statusColors[order.status]}40`,
                                                cursor: 'pointer'
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
                                            {consumption.unit === 'ml' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                    <span className="m2-text font-mono" style={{ fontWeight: 700, color: '#00daf3', fontSize: '0.85rem' }}>
                                                        {consumption.value.toFixed(2)} <small>ml</small>
                                                    </span>
                                                    {consumption.bobina && (
                                                        <span style={{
                                                            fontSize: '0.68rem',
                                                            fontWeight: 700,
                                                            padding: '1px 5px',
                                                            borderRadius: '4px',
                                                            background: 'rgba(59, 130, 246, 0.18)',
                                                            color: '#93c5fd',
                                                            border: '1px solid rgba(59, 130, 246, 0.35)',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            Rollo {consumption.bobina}m
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="m2-text font-mono text-muted">
                                                    {consumption.value.toFixed(2)} <small>{consumption.unit}</small>
                                                </span>
                                            )}
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
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                <div className="date-cell" style={{ fontWeight: '600', color: 'var(--accent)' }}>
                                                    {order.fechaEntrega ? (() => {
                                                        const d = new Date(order.fechaEntrega + 'T12:00:00');
                                                        if (!isNaN(d.getTime())) {
                                                            const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase().replace('.', '');
                                                            return `${dayName} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                                                        }
                                                        return order.fechaEntrega;
                                                    })() : <span className="text-muted italic">--</span>}
                                                </div>
                                                {order.envio && (
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        padding: '1px 6px',
                                                        borderRadius: '4px',
                                                        background: 'rgba(245, 158, 11, 0.15)',
                                                        color: '#fbbf24',
                                                        border: '1px solid rgba(245, 158, 11, 0.35)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        🚚 {order.envio}
                                                    </span>
                                                )}
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
                                                                setStatusBatchOrders(undefined);
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
                        batchOrders={statusBatchOrders}
                        onClose={(updated) => {
                            setIsStatusModalOpen(false)
                            setStatusOrder(null)
                            setStatusBatchOrders(undefined)
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
