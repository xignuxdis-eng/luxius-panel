import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@components/layout/Header'
import { getOrderTag, isDesignerOwner } from '@/types/orden'
import { isDesignerRole } from '../../types/auth'
import { getOrdenes, getMateriales, saveOrden, deleteOrden, getClientes, saveBatchOrders, mergeOrdersIntoBatch, resolveMediaUrl, matchesOrderId } from '@data/db'
import { useAuthStore } from '@store/authStore'
import NuevoPedidoModal from './NuevoPedidoModal'
import StatusChangeModal from './StatusChangeModal'
import EditBatchModal from './EditBatchModal'
import SharedFileViewerModal from '@components/shared/SharedFileViewerModal'
import OrderChatModal from '@components/shared/OrderChatModal'
import type { Order, Cliente, Material } from '@/types'
import { generatePdfBudget, generatePdfBatch, type BudgetPdfMode } from '@/utils/generatePdfBudget'
import { generateProductionLabel } from '@/utils/generateLabelPdf'
import { computeStockForecast, canViewStockAlerts } from '@/utils/stockForecast'
import { generatePdfClientReport } from '@/utils/generatePdfClientReport'
import PdfModeModal from '@components/PdfModeModal'
import NestingStudioModal from '@components/workshop/NestingStudioModal'
import { runNesting, type NestingItem } from '@/utils/nestingEngine'
import { downloadSingleOrderFiles, downloadBatchOrdersZip, buildProductionFilename, type DownloadProgressState } from '@/utils/orderFileDownloader'
import './Entrada.css'
import { FloatingBatchDock } from './components/FloatingBatchDock'
import { EntradaToolbar } from './components/EntradaToolbar'
import { BatchRowMaster } from './components/BatchRowMaster'
import { SingleOrderRow } from './components/SingleOrderRow'
import type { GroupedItem } from './types/entrada.types'
import {
    calculateOrderPrice as calcOrderPriceUtil,
    getConsumption as getConsumptionUtil
} from './utils/entradaCalculations'

export default function Entrada() {
    const navigate = useNavigate()
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

    // NESTING STUDIO MODAL STATE
    const [isNestingModalOpen, setIsNestingModalOpen] = useState(false)
    const [nestingModalOrders, setNestingModalOrders] = useState<Order[]>([])
    const [nestingModalBatchName, setNestingModalBatchName] = useState<string>('')

    // EDIT BATCH MODAL STATE
    const [isEditBatchModalOpen, setIsEditBatchModalOpen] = useState(false)
    const [editBatchOrders, setEditBatchOrders] = useState<Order[]>([])
    const [editBatchName, setEditBatchName] = useState<string>('')
    const [editBatchId, setEditBatchId] = useState<string>('')

    const [defaultStatus, setDefaultStatus] = useState<string>('orden')

    // ASYNC STATE
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    // BATCH SELECTION STATE & ACCORDION EXPANSION STATE
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())

    // PDF mode selector target (single order or batch)
    const [pdfModeTarget, setPdfModeTarget] = useState<{ orders: Order[]; label: string } | null>(null)

    // VIEW TAB: 'active' (current OTs), 'history' (completed), or 'trash' (soft-deleted)
    const [viewTab, setViewTab] = useState<'active' | 'history' | 'trash'>('active')

    // DOWNLOAD PROGRESS STATE
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgressState | null>(null)

    const loadOrders = async (forceRefresh = false) => {
        try {
            setLoading(true)
            const data = await getOrdenes(forceRefresh)
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
    const [statusFilter, setStatusFilter] = useState('orden')
    const [calidadFilter] = useState('')
    const [materialFilter, setMaterialFilter] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [tagFilter, setTagFilter] = useState<string>('')
    const [tagPopoverOrderId, setTagPopoverOrderId] = useState<number | string | null>(null)
    const [actionMenuOrderId, setActionMenuOrderId] = useState<number | string | null>(null)

    // Close popovers on outside click
    useEffect(() => {
        const handleDocClick = () => {
            setTagPopoverOrderId(null);
            setActionMenuOrderId(null);
        };
        window.addEventListener('click', handleDocClick);
        return () => window.removeEventListener('click', handleDocClick);
    }, []);

    // Clear selection when switching tabs or changing filters
    useEffect(() => {
        setSelectedIds(new Set())
    }, [viewTab, searchTerm, statusFilter, materialFilter, categoryFilter, tagFilter])

    const { user } = useAuthStore()
    const isAdmin = (user?.role as string) === 'administrador' || (user?.role as string) === 'principal' || (user?.role as string) === 'sistema'
    const [allClientes, setAllClientes] = useState<Cliente[]>(getClientes())
    const [allMateriales, setAllMateriales] = useState<Material[]>(getMateriales())

    useEffect(() => {
        setAllClientes(getClientes())
        setAllMateriales(getMateriales())
    }, [orders])

    const handleToggleOrderTag = async (targetOrder: Order, tagId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const currentTags = targetOrder.tags || [];
        const newTags = currentTags.includes(tagId)
            ? currentTags.filter(t => t !== tagId)
            : [...currentTags, tagId];

        setOrders(prev => prev.map(o => (o.id === targetOrder.id || (o.ot && o.ot === targetOrder.ot)) ? { ...o, tags: newTags } : o));

        try {
            await saveOrden({ id: targetOrder.id, ot: targetOrder.ot, tags: newTags });
        } catch (err) {
            console.error('Error guardando tag:', err);
        }
    };

    const handleBulkApplyTag = async (tagId: string) => {
        if (selectedIds.size === 0) return;
        const selectedOrders = orders.filter(o => selectedIds.has(String(o.id || o.ot)));
        if (selectedOrders.length === 0) return;

        setOrders(prev => prev.map(o => {
            if (selectedIds.has(String(o.id || o.ot))) {
                const cur = o.tags || [];
                const updated = cur.includes(tagId) ? cur : [...cur, tagId];
                return { ...o, tags: updated };
            }
            return o;
        }));

        for (const order of selectedOrders) {
            const cur = order.tags || [];
            if (!cur.includes(tagId)) {
                try {
                    await saveOrden({ id: order.id, ot: order.ot, tags: [...cur, tagId] });
                } catch (err) {
                    console.error(`Error aplicando etiqueta a ${order.ot}:`, err);
                }
            }
        }
    };

    const baseOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch =
                (order.clienteNombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (order.ot?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (order.id?.toString() || '').includes(searchTerm) ||
                (order.material?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (order.nombreTarea?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (order.loteNombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (order.descripcionItem?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (order.observaciones?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (order.tags && order.tags.some(t => {
                    const def = getOrderTag(t);
                    return t.toLowerCase().includes(searchTerm.toLowerCase()) || (def && def.label.toLowerCase().includes(searchTerm.toLowerCase()));
                }));

            const matchesCalidad = calidadFilter === '' || order.calidad === calidadFilter;
            const matchesMaterial = materialFilter === '' || order.material === materialFilter;
            const matchesCategory = categoryFilter === '' || order.category === categoryFilter;
            const matchesTag = !tagFilter || (order.tags && order.tags.includes(tagFilter));

            const isArtista = isDesignerRole(user?.role);
            const isImpresor = user?.role === 'impresion';
            const isRelevantForImpresor = ['orden', 'impreso', 'post', 'completo', 'entregado'].includes(order.status);

            if (user?.role === 'vendedor' && order.status !== 'relevamiento') return false;

            if (user?.role === 'cliente') {
                const linkedClient = allClientes.find(c =>
                    c.nombre.toLowerCase().includes(user.name.toLowerCase()) ||
                    user.name.toLowerCase().includes(c.nombre.toLowerCase())
                );

                const orderClientId = order.clientId || (order as any).clienteId;
                const matchesLinked = linkedClient && (String(orderClientId) === String(linkedClient.id));
                const matchesUser = String(orderClientId) === String(user.id);

                if (!matchesLinked && !matchesUser) return false;
            }

            // Regla de Oro para Diseñadores:
            // Solo pueden visualizar y dar seguimiento a sus propios trabajos publicados en todas las etapas.
            if (isArtista) {
                if (!isDesignerOwner(order, user)) return false;
            }

            if (isImpresor && !isRelevantForImpresor) return false;

            return matchesSearch && matchesCalidad && matchesMaterial && matchesCategory && matchesTag;
        });
    }, [orders, searchTerm, calidadFilter, materialFilter, categoryFilter, tagFilter, user, allClientes]);

    const filteredOrders = useMemo(() => {
        if (!statusFilter) return baseOrders;
        return baseOrders.filter(order => order.status === statusFilter);
    }, [baseOrders, statusFilter]);

    const displayedOrders = useMemo(() => {
        if (viewTab === 'trash') {
            return baseOrders.filter(o => o.status === 'eliminado');
        }
        if (statusFilter !== '') {
            // Si el usuario especificó un estado (ej. "orden", "impreso", "entregado", "preorden"),
            // se muestran inmediatamente las órdenes que coinciden con dicho filtro
            return filteredOrders.filter(o => o.status !== 'eliminado');
        }
        if (viewTab === 'history') {
            return baseOrders.filter(o => ['impreso', 'entregado', 'finalizado', 'completo'].includes(o.status));
        }
        // viewTab === 'active' por defecto
        return baseOrders.filter(o => !['entregado', 'finalizado', 'eliminado'].includes(o.status));
    }, [viewTab, statusFilter, filteredOrders, baseOrders]);

    const forecast = useMemo(() => computeStockForecast(orders, allMateriales), [orders, allMateriales])
    const canViewAlerts = canViewStockAlerts(user?.role)
    const forecastGroupByKey = useMemo(() => {
        const map = new Map<string, string>()
        forecast.groups.forEach(g => map.set(g.key, g.riskLevel))
        return map
    }, [forecast])


    const calculateOrderPrice = (order: Order) => calcOrderPriceUtil(order, allMateriales, allClientes);
    const getConsumption = (order: Order) => getConsumptionUtil(order, allMateriales);

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
                let rawTotalMl = 0;
                let totalCopies = 0;
                let selectedCount = 0;
                const mlByBobina: Record<string, number> = {};

                // Separar órdenes según su tipo de consumo (ml o m2)
                const mlOrders: Order[] = [];
                batchList.forEach(o => {
                    totalPrice += calculateOrderPrice(o);
                    totalCopies += (o.copias || 1);
                    if (selectedIds.has(String(o.id || o.ot))) selectedCount++;

                    const cons = getConsumption(o);
                    if (cons.unit === 'ml') {
                        mlOrders.push(o);
                    } else {
                        totalM2 += cons.value;
                    }
                });

                // Si hay órdenes con consumo de bobina (ml), aplicar el Motor de Nesting 2D
                if (mlOrders.length > 0) {
                    // Se agrupa por MATERIAL + ancho de bobina, no solo por bobina.
                    // Dos sustratos distintos no se anidan juntos aunque midan
                    // lo mismo: además de físicamente inválido, mezclaría los
                    // metros de un material con los del otro.
                    const ordersByGroup = new Map<string, { bNum: number; orders: Order[] }>();
                    mlOrders.forEach(o => {
                        const cons = getConsumption(o);
                        const bNum = Number(cons.bobina) || 1.52;
                        const matCode = o.material || 'SIN_MAT';
                        const key = `${matCode}|${bNum}`;
                        if (!ordersByGroup.has(key)) {
                            ordersByGroup.set(key, { bNum, orders: [] });
                        }
                        ordersByGroup.get(key)!.orders.push(o);
                    });

                    ordersByGroup.forEach((group, key) => {
                        const bobinaNum = group.bNum;
                        const bOrders = group.orders;
                        if (bOrders.length > 1) {
                            const nestingItems: NestingItem[] = bOrders.map(o => ({
                                id: o.id || o.ot,
                                ot: o.ot,
                                label: o.descripcionItem || o.nombreTarea || `OT-${o.id}`,
                                width: Number(o.ancho) || 0,
                                height: Number(o.alto) || 0,
                                copies: Number(o.copias) || 1,
                                orderId: o.id
                            }));

                            const nResult = runNesting(nestingItems, { rollWidth: bobinaNum });
                            totalMl += nResult.linearMeters;
                            rawTotalMl += nResult.rawLinearMeters;
                            mlByBobina[key] = (mlByBobina[key] || 0) + nResult.linearMeters;
                        } else {
                            const singleCons = getConsumption(bOrders[0]);
                            totalMl += singleCons.value;
                            rawTotalMl += singleCons.value;
                            mlByBobina[key] = (mlByBobina[key] || 0) + singleCons.value;
                        }
                    });
                }

                const savingsMeters = Math.max(0, rawTotalMl - totalMl);
                const savingsPercent = rawTotalMl > 0 ? Math.round((savingsMeters / rawTotalMl) * 100) : 0;

                // Orden de taller: primero las órdenes que entran en el rollo
                // angosto (1.37 m), después las que exigen el ancho (1.52 m).
                // Permite ver de un vistazo cómo se reparte el trabajo entre
                // bobinas y facilita la impresión por bloques.
                const batchListOrdenada = [...batchList].sort((a, b) => {
                    const ba = parseFloat(String(getConsumption(a).bobina)) || 1.52;
                    const bb = parseFloat(String(getConsumption(b).bobina)) || 1.52;
                    if (ba !== bb) return ba - bb;                 // angosto primero
                    const ma = String(a.material || '');
                    const mb = String(b.material || '');
                    if (ma !== mb) return ma.localeCompare(mb);   // luego por material
                    return 0;                                      // preserva el orden original
                });

                result.push({
                    isBatch: true,
                    batchId: bInfo.key,
                    batchName: batchData.name,
                    orders: batchListOrdenada,
                    primaryOrder: batchListOrdenada[0],
                    totalPrice,
                    totalConsumption: {
                        m2: totalM2,
                        ml: totalMl,
                        mlByBobina,
                        rawMl: rawTotalMl,
                        savingsPercent,
                        savingsMeters
                    },
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
        await loadOrders(true)
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

    // NESTING & MERGE HANDLERS
    const handleOpenNestingModal = (batchOrders: Order[], batchName?: string) => {
        setNestingModalOrders(batchOrders);
        setNestingModalBatchName(batchName || 'Lote Unificado');
        setIsNestingModalOpen(true);
    };

    const handleOpenEditBatchModal = (batchOrders: Order[], batchName?: string, batchId?: string) => {
        setEditBatchOrders(batchOrders);
        setEditBatchName(batchName || 'Lote de Producción');
        setEditBatchId(batchId || '');
        setIsEditBatchModalOpen(true);
    };

    const handleOpenNestingForSelected = () => {
        const selectedOrders = displayedOrders.filter(o => selectedIds.has(String(o.id || o.ot)));
        if (selectedOrders.length === 0) return;
        const firstClient = selectedOrders[0].clienteNombre || '';
        handleOpenNestingModal(selectedOrders, `Lote ${firstClient || 'Unificado'}`);
    };

    const handleMergeSelectedIntoBatch = async () => {
        const selectedOrders = displayedOrders.filter(o => selectedIds.has(String(o.id || o.ot)));
        if (selectedOrders.length < 2) {
            alert('Seleccione al menos 2 órdenes para unificar en un lote.');
            return;
        }
        const defaultName = selectedOrders[0].loteNombre || selectedOrders[0].clienteNombre || 'Lote Producción';
        const batchName = prompt('Ingrese el nombre para el lote unificado:', defaultName);
        if (!batchName || !batchName.trim()) return;

        try {
            setLoading(true);
            await mergeOrdersIntoBatch(selectedOrders.map(o => o.id || o.ot || ''), batchName.trim());
            await loadOrders();
        } catch (e: any) {
            console.error('Error al unificar lote:', e);
            alert(e.message || 'Error al unificar lote');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNestingBatch = async (batchName: string, updatedConsumptionMl: number, updatedCopies?: Record<string | number, number>) => {
        if (nestingModalOrders.length === 0) return;
        const ids = nestingModalOrders.map(o => o.id || o.ot || '');
        const perOrderMl = updatedConsumptionMl / nestingModalOrders.length;

        // Si se modificaron copias dentro de Nesting Studio, actualizar cada orden
        if (updatedCopies) {
            for (const o of nestingModalOrders) {
                const key = o.id || o.ot || '';
                const newCopies = updatedCopies[key];
                if (newCopies !== undefined && newCopies !== o.copias) {
                    try {
                        await saveOrden({ ...o, copias: newCopies });
                    } catch (err) {
                        console.error(`Error actualizando copias de OT ${o.ot || o.id}:`, err);
                    }
                }
            }
        }

        await saveBatchOrders('update', ids, {
            loteNombre: batchName,
            consumoEstimado: perOrderMl
        });
        await loadOrders();
    };

    const handleClearFilters = () => {
        setSearchTerm('')
        setStatusFilter('')
        setMaterialFilter('')
        setCategoryFilter('')
        setTagFilter('')
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

            // Actualización optimista en memoria para feedback instantáneo en vivo
            setOrders(prev => prev.map(o => finalIds.some(id => matchesOrderId(o, id)) ? { ...o, status } : o));

            await saveBatchOrders('update', finalIds.map(String), { status });

            setSelectedIds(new Set());
            await loadOrders(true);
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

    const openPdfModeModal = (orders: Order[], label: string) => {
        setPdfModeTarget({ orders, label })
    }

    const handlePdfModeSelect = (mode: BudgetPdfMode) => {
        if (!pdfModeTarget) return
        const target = pdfModeTarget
        setPdfModeTarget(null)
        if (target.orders.length === 1) {
            generatePdfBudget(target.orders[0], { mode })
        } else {
            generatePdfBatch(target.orders, { mode })
        }
    }

    const handleBatchPdf = () => {
        const selectedList = displayedOrders.filter(o => selectedIds.has(String(o.id || o.ot)))
        if (selectedList.length === 0) {
            alert('Seleccioná al menos una orden para generar el PDF masivo.')
            return
        }
        openPdfModeModal(selectedList, `Consolidado de ${selectedList.length} órdenes`)
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

    const handleDownloadBatch = async (batchOrders: Order[], batchName?: string) => {
        try {
            // Mismo criterio que la tabla: primero el rollo angosto (1.37),
            // después el ancho (1.52). Así los PDFs salen del ZIP agrupados por
            // bobina y el operario imprime por bloques sin tener que clasificar.
            const paraImprimir = [...batchOrders].map(o => {
                const cons = getConsumption(o);
                const assigned = cons.bobina ? parseFloat(cons.bobina) : undefined;
                return {
                    ...o,
                    bobinaAsignada: o.bobinaAsignada ?? assigned,
                    consumoEstimado: o.consumoEstimado ?? cons.value,
                };
            }).sort((a, b) => {
                const ba = parseFloat(String(getConsumption(a).bobina)) || 1.52;
                const bb = parseFloat(String(getConsumption(b).bobina)) || 1.52;
                if (ba !== bb) return ba - bb;
                const ma = String(a.material || '');
                const mb = String(b.material || '');
                return ma.localeCompare(mb);
            });
            await downloadBatchOrdersZip(paraImprimir, batchName, (p) => {
                setDownloadProgress(p)
                if (!p.active) {
                    setTimeout(() => setDownloadProgress(null), 3500)
                }
            })
        } catch (e) {
            console.error('Error al descargar lote ZIP:', e)
            setDownloadProgress(null)
        }
    }

    const handleDownloadSelectedOrders = async () => {
        const selectedOrders = displayedOrders.filter(o => selectedIds.has(String(o.id || o.ot)))
        if (selectedOrders.length === 0) return
        await handleDownloadBatch(selectedOrders)
    }

    const handleBatchLabel = () => {
        const selectedList = displayedOrders.filter(o => selectedIds.has(String(o.id || o.ot)))
        if (selectedList.length === 0) {
            alert('Seleccioná al menos una orden para generar la etiqueta.')
            return
        }
        generateProductionLabel(selectedList)
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

            <EntradaToolbar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onClearFilters={handleClearFilters}
                displayedOrdersCount={displayedOrders.length}
                onNewOrder={handleNewOrder}
                tagFilter={tagFilter}
                setTagFilter={setTagFilter}
                orders={orders}
                baseOrders={baseOrders}
                viewTab={viewTab}
                setViewTab={setViewTab}
            />

            <FloatingBatchDock
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                selectedTotals={selectedTotals}
                isAdmin={isAdmin}
                onBulkApplyTag={handleBulkApplyTag}
                onOpenNesting={handleOpenNestingForSelected}
                onMergeBatch={handleMergeSelectedIntoBatch}
                onDownloadSelected={handleDownloadSelectedOrders}
                downloadProgressActive={!!downloadProgress?.active}
                onExportClientReportPdf={handleExportClientReportPdf}
                onBatchPdf={handleBatchPdf}
                onBatchLabel={handleBatchLabel}
                viewTab={viewTab}
                onBatchStatus={handleBatchStatus}
                onBatchRestore={handleBatchRestore}
                onBatchDelete={handleBatchDelete}
            />

            {/* TABLE */}
            {canViewAlerts && forecast.groupsAtRisk.length > 0 && (
                <div className="forecast-banner" style={{ marginBottom: '12px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    <strong>⚠ {forecast.groupsAtRisk.length} grupo(s) en riesgo de entrega integral por faltante de stock</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {forecast.groupsAtRisk.slice(0, 3).map(g => `${g.label} (${g.shortfallCodigos.join(', ')})`).join(' · ')}
                        {forecast.groupsAtRisk.length > 3 ? ' …' : ''}
                    </span>
                </div>
            )}
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
                                <th style={{ width: '42px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={displayedOrders.length > 0 && selectedIds.size === displayedOrders.length}
                                        onChange={toggleSelectAll}
                                        style={{ accentColor: 'var(--primary-color)', cursor: 'pointer', transform: 'scale(1.2)' }}
                                    />
                                </th>
                                <th style={{ minWidth: '220px' }}>Trabajo &amp; Cliente</th>
                                <th style={{ minWidth: '230px' }}>Especificaciones Técnicas</th>
                                <th style={{ minWidth: '170px' }}>Estado &amp; Entrega</th>
                                {isAdmin && (
                                    <th style={{ width: '100px', textAlign: 'right' }}>Importe</th>
                                )}
                                <th style={{ width: '130px', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedOrders.map(item => {
                                if (item.isBatch) {
                                    return (
                                        <BatchRowMaster
                                            key={item.batchId}
                                            item={item}
                                            isExpanded={expandedBatches.has(item.batchId)}
                                            onToggleExpand={toggleExpandBatch}
                                            onToggleSelectBatch={toggleSelectBatch}
                                            onOpenEditBatchModal={handleOpenEditBatchModal}
                                            canViewAlerts={canViewAlerts}
                                            forecastStatus={forecastGroupByKey.get(`batch:${item.batchId}`) as any}
                                            allMateriales={allMateriales}
                                            allClientes={allClientes}
                                            isAdmin={isAdmin}
                                            onDownloadBatch={handleDownloadBatch}
                                            actionMenuOrderId={actionMenuOrderId}
                                            setActionMenuOrderId={setActionMenuOrderId}
                                            onOpenNestingModal={handleOpenNestingModal}
                                            onSetStatusBatch={(primaryOrder, batchOrders) => {
                                                setStatusOrder(primaryOrder);
                                                setStatusBatchOrders(batchOrders);
                                                setIsStatusModalOpen(true);
                                            }}
                                            onSoftDeleteBatch={async (batchOrders, batchName) => {
                                                if (confirm(`¿Mover las ${batchOrders.length} órdenes del lote "${batchName}" a la papelera?`)) {
                                                    for (const o of batchOrders) {
                                                        await handleSoftDeleteOrder(o);
                                                    }
                                                }
                                            }}
                                            selectedIds={selectedIds}
                                            onToggleSelection={toggleSelection}
                                            onPreview={handlePreview}
                                            tagPopoverOrderId={tagPopoverOrderId}
                                            setTagPopoverOrderId={setTagPopoverOrderId}
                                            onToggleTag={handleToggleOrderTag}
                                            onDownloadSingle={handleDownloadSingle}
                                            onOpenChat={(o) => {
                                                setChatOrder(o);
                                                setIsChatModalOpen(true);
                                            }}
                                            onOpenSuiteCraft={(o) => {
                                                const firstFile = resolveMediaUrl(o.archivos![0]);
                                                const orig = o.archivosOriginales?.[0] || o.archivos![0].split('/').pop()?.split('?')[0] || 'diseno';
                                                const prod = buildProductionFilename(o, 0, orig);
                                                navigate(`/xpress-viewer?fileUrl=${encodeURIComponent(firstFile)}&fileName=${encodeURIComponent(prod)}&orderId=${o.id}&tab=suitecraft`);
                                            }}
                                            onOpenPdfMode={(o) => openPdfModeModal([o], `Presupuesto ${o.ot || o.id}`)}
                                            onGenerateLabel={(o) => generateProductionLabel([o])}
                                            onEditOrder={handleEditOrder}
                                            onStatusSingle={(o) => {
                                                setStatusOrder(o);
                                                setStatusBatchOrders(undefined);
                                                setIsStatusModalOpen(true);
                                            }}
                                            onSoftDeleteSingle={handleSoftDeleteOrder}
                                        />
                                    );
                                }

                                const order = item.order;
                                return (
                                    <SingleOrderRow
                                        key={order.id || order.ot}
                                        order={order}
                                        isSelected={selectedIds.has(String(order.id || order.ot))}
                                        onToggleSelect={toggleSelection}
                                        onPreview={handlePreview}
                                        tagPopoverOrderId={tagPopoverOrderId}
                                        setTagPopoverOrderId={setTagPopoverOrderId}
                                        onToggleTag={handleToggleOrderTag}
                                        allMateriales={allMateriales}
                                        allClientes={allClientes}
                                        isAdmin={isAdmin}
                                        onStatusClick={(o) => {
                                            setStatusOrder(o);
                                            setStatusBatchOrders(undefined);
                                            setIsStatusModalOpen(true);
                                        }}
                                        actionMenuOrderId={actionMenuOrderId}
                                        setActionMenuOrderId={setActionMenuOrderId}
                                        onRestoreOrder={handleRestoreOrder}
                                        onPermanentDelete={handlePermanentDelete}
                                        onDownloadSingle={handleDownloadSingle}
                                        onOpenChat={(o) => {
                                            setChatOrder(o);
                                            setIsChatModalOpen(true);
                                        }}
                                        onOpenSuiteCraft={(o) => {
                                            const firstFile = resolveMediaUrl(o.archivos![0]);
                                            const orig = o.archivosOriginales?.[0] || o.archivos![0].split('/').pop()?.split('?')[0] || 'diseno';
                                            const prod = buildProductionFilename(o, 0, orig);
                                            navigate(`/xpress-viewer?fileUrl=${encodeURIComponent(firstFile)}&fileName=${encodeURIComponent(prod)}&orderId=${o.id}&tab=suitecraft`);
                                        }}
                                        onOpenPdfMode={(o) => openPdfModeModal([o], `Presupuesto ${o.ot || o.id}`)}
                                        onGenerateLabel={(o) => generateProductionLabel([o])}
                                        onEditOrder={handleEditOrder}
                                        onSoftDelete={handleSoftDeleteOrder}
                                    />
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
            <PdfModeModal
                isOpen={!!pdfModeTarget}
                title="Generar PDF"
                subtitle={pdfModeTarget?.label}
                onClose={() => setPdfModeTarget(null)}
                onSelect={handlePdfModeSelect}
            />
            {isNestingModalOpen && (
                <NestingStudioModal
                    isOpen={isNestingModalOpen}
                    orders={nestingModalOrders}
                    initialBatchName={nestingModalBatchName}
                    onClose={() => {
                        setIsNestingModalOpen(false);
                        setNestingModalOrders([]);
                    }}
                    onSaveBatch={handleSaveNestingBatch}
                />
            )}
            {isEditBatchModalOpen && (
                <EditBatchModal
                    isOpen={isEditBatchModalOpen}
                    onClose={async (updated) => {
                        setIsEditBatchModalOpen(false);
                        if (updated) {
                            await loadOrders();
                        }
                    }}
                    batchOrders={editBatchOrders}
                    currentBatchName={editBatchName}
                    currentBatchId={editBatchId}
                    clientes={allClientes}
                />
            )}
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
        </div>
    )
}
