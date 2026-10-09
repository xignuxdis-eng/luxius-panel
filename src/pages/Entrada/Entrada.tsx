import { useState, useEffect, useMemo } from 'react'
import Header from '@components/layout/Header'
import Button from '@components/ui/Button'
import { statusColors, statusLabels, PRESET_ORDER_TAGS, getOrderTag } from '../../types/orden'
import { getOrdenes, getMateriales, saveOrden, deleteOrden, getClientes, saveBatchOrders, mergeOrdersIntoBatch } from '@data/db'
import { useAuthStore } from '@store/authStore'
import NuevoPedidoModal from './NuevoPedidoModal'
import StatusChangeModal from './StatusChangeModal'
import SharedFileViewerModal from '@components/shared/SharedFileViewerModal'
import OrderChatModal from '@components/shared/OrderChatModal'
import type { Order, Cliente, Material } from '@/types'
import { generatePdfBudget, generatePdfBatch, type BudgetPdfMode } from '@/utils/generatePdfBudget'
import { generateProductionLabel } from '@/utils/generateLabelPdf'
import { computeStockForecast, canViewStockAlerts } from '@/utils/stockForecast'
import { generatePdfClientReport } from '@/utils/generatePdfClientReport'
import PdfModeModal from '@components/PdfModeModal'
import NestingStudioModal from '@components/workshop/NestingStudioModal'
import { runNesting, getBobinaUsefulWidth, type NestingItem } from '@/utils/nestingEngine'
import { downloadSingleOrderFiles, downloadBatchOrdersZip, type DownloadProgressState } from '@/utils/orderFileDownloader'
import './Entrada.css'

interface OrderTagBadgesProps {
    order: Order;
    tagPopoverOrderId: number | string | null;
    setTagPopoverOrderId: (id: number | string | null) => void;
    onToggleTag: (order: Order, tagId: string, e?: React.MouseEvent) => void;
}

function OrderTagBadges({ order, tagPopoverOrderId, setTagPopoverOrderId, onToggleTag }: OrderTagBadgesProps) {
    const orderKey = order.id || order.ot;
    const isPopoverOpen = tagPopoverOrderId === orderKey;
    const tags = order.tags || [];

    return (
        <div className="order-tags-container" onClick={(e) => e.stopPropagation()}>
            <div className="order-tags-list">
                {tags.map(tId => {
                    const tag = getOrderTag(tId);
                    if (!tag) return null;
                    return (
                        <span
                            key={tId}
                            className="order-tag-badge"
                            style={{
                                color: tag.color,
                                backgroundColor: tag.bgColor,
                                borderColor: tag.borderColor
                            }}
                            title={`Etiqueta: ${tag.label}. Clic para editar`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setTagPopoverOrderId(isPopoverOpen ? null : orderKey);
                            }}
                        >
                            <span className="tag-icon">{tag.icon}</span>
                            <span className="tag-label">{tag.label}</span>
                        </span>
                    );
                })}
                <button
                    type="button"
                    className="order-tag-add-btn"
                    title="Asignar o editar etiquetas operativas"
                    onClick={(e) => {
                        e.stopPropagation();
                        setTagPopoverOrderId(isPopoverOpen ? null : orderKey);
                    }}
                >
                    🏷️{tags.length === 0 ? ' +' : ''}
                </button>
            </div>

            {isPopoverOpen && (
                <div className="tag-picker-popover animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="tag-picker-header">
                        <span>🏷️ Etiquetas ({order.ot || `OT-${order.id}`})</span>
                        <button type="button" className="tag-picker-close" onClick={() => setTagPopoverOrderId(null)}>×</button>
                    </div>
                    <div className="tag-picker-grid">
                        {PRESET_ORDER_TAGS.map(pt => {
                            const isSelected = tags.includes(pt.id);
                            return (
                                <button
                                    key={pt.id}
                                    type="button"
                                    className={`tag-picker-option ${isSelected ? 'is-selected' : ''}`}
                                    style={isSelected ? { borderColor: pt.color, backgroundColor: pt.bgColor, color: pt.color } : {}}
                                    onClick={(e) => onToggleTag(order, pt.id, e)}
                                >
                                    <span className="option-icon">{pt.icon}</span>
                                    <span className="option-label">{pt.label}</span>
                                    <span className="option-check">{isSelected ? '✓' : '+'}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

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

    // NESTING STUDIO MODAL STATE
    const [isNestingModalOpen, setIsNestingModalOpen] = useState(false)
    const [nestingModalOrders, setNestingModalOrders] = useState<Order[]>([])
    const [nestingModalBatchName, setNestingModalBatchName] = useState<string>('')

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

    const filteredOrders = orders.filter(order => {
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

        const matchesStatus = statusFilter === '' || order.status === statusFilter;
        const matchesCalidad = calidadFilter === '' || order.calidad === calidadFilter;
        const matchesMaterial = materialFilter === '' || order.material === materialFilter;
        const matchesCategory = categoryFilter === '' || order.category === categoryFilter;
        const matchesTag = !tagFilter || (order.tags && order.tags.includes(tagFilter));

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
            const matchesLinked = linkedClient && (String(orderClientId) === String(linkedClient.id));
            const matchesUser = String(orderClientId) === String(user.id);

            if (!matchesLinked && !matchesUser) return false;
        }

        if (isArtista && !isRelevantForArtista) return false;
        if (isImpresor && !isRelevantForImpresor) return false;

        return matchesSearch && matchesStatus && matchesCalidad && matchesMaterial && matchesCategory && matchesTag;
    })

    const displayedOrders = viewTab === 'trash'
        ? filteredOrders.filter(o => o.status === 'eliminado')
        : viewTab === 'history'
            ? filteredOrders.filter(o => ['impreso', 'entregado', 'finalizado', 'completo'].includes(o.status))
            : filteredOrders.filter(o => !['entregado', 'finalizado', 'eliminado'].includes(o.status));

    const forecast = useMemo(() => computeStockForecast(orders, allMateriales), [orders, allMateriales])
    const canViewAlerts = canViewStockAlerts(user?.role)
    const forecastGroupByKey = useMemo(() => {
        const map = new Map<string, string>()
        forecast.groups.forEach(g => map.set(g.key, g.riskLevel))
        return map
    }, [forecast])


    const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

    const calculateOrderPrice = (order: Order) => {
        // 1. Precio manual (monto acordado personalizado) → máxima prioridad
        const manualPrice = (order as any).precioUnitarioManual
            ?? (order as any).precio_manual
            ?? (order as any).precioManual;
        if (manualPrice !== undefined && manualPrice !== null && Number(manualPrice) > 0) {
            return Math.round(Number(manualPrice));
        }

        // 2. Total/subtotal ya persistido (incluye precio especial, servicios, demasías)
        const storedTotal = Number(order.total || 0);
        const storedSubtotal = Number(order.subtotal || 0);
        if (storedTotal > 0) return Math.round(storedTotal);
        if (storedSubtotal > 0) return Math.round(storedSubtotal);

        // 3. Fallback: recalcular desde materiales (solo para órdenes sin total guardado)
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

                const cliente = allClientes.find(cl => String(cl.id) === String(order.clientId));
                const specialPrice = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[order.material] : null;

                type Candidate = { bobina: number; ml: number; cost: number; rotated: boolean };
                const candidates: Candidate[] = [];

                for (const b of availableWidths) {
                    const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${order.material}:${b.ancho}`] : null;
                    const priceToUse = specialPriceWidth || specialPrice || b.precioML;

                    if (w <= b.usefulWidth) {
                        const ml = round2(h * c);
                        candidates.push({ bobina: b.ancho, ml, cost: Math.round(priceToUse * ml), rotated: false });
                    }
                    if (h <= b.usefulWidth) {
                        const ml = round2(w * c);
                        candidates.push({ bobina: b.ancho, ml, cost: Math.round(priceToUse * ml), rotated: true });
                    }
                }

                const maxDim = Math.max(w, h);
                const is150Piece = maxDim > 1.365 && maxDim <= 1.515;

                candidates.sort((a, b) => {
                    if (is150Piece) {
                        const aIs152 = a.bobina >= 1.48 && a.bobina <= 1.53;
                        const bIs152 = b.bobina >= 1.48 && b.bobina <= 1.53;
                        if (aIs152 && !bIs152) return -1;
                        if (!aIs152 && bIs152) return 1;
                    }
                    const areaA = a.bobina * a.ml;
                    const areaB = b.bobina * b.ml;
                    if (Math.abs(areaA - areaB) > 0.05) return areaA - areaB;
                    if (Math.abs(a.cost - b.cost) > 1) return a.cost - b.cost;
                    if (Math.abs(a.ml - b.ml) > 0.01) return a.ml - b.ml;
                    if (a.rotated !== b.rotated) return a.rotated ? 1 : -1;
                    return a.bobina - b.bobina;
                });

                if (candidates.length > 0) return candidates[0].cost;

                if (availableWidths.length > 0) {
                    const widest = availableWidths[availableWidths.length - 1];
                    const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${order.material}:${widest.ancho}`] : null;
                    const priceToUse = specialPriceWidth || specialPrice || widest.precioML;
                    const ml = round2(h * c);
                    return Math.round(priceToUse * ml);
                }
            }

            if (matData.precioM2) {
                const cliente = allClientes.find(cl => String(cl.id) === String(order.clientId));
                const specialPrice = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[order.material] : null;
                const priceToUse = specialPrice || matData.precioM2 || 0;
                const m2 = round2(w * h * c);
                return Math.round(m2 * priceToUse);
            }
        }

        return 0;
    }

    const getConsumption = (order: Order) => {
        const matData = allMateriales.find(m => m.codigo === order.material);

        const rawW = Number(order.ancho) || 0;
        const rawH = Number(order.alto) || 0;
        const w = round2(rawW > 20 ? rawW / 100 : rawW);
        const h = round2(rawH > 20 ? rawH / 100 : rawH);
        const c = Number(order.copias) || 1;

        const isMl = matData?.tipoCobro === 'ml' || (matData?.bobinas && matData.bobinas.length > 0) || order.material === 'VV' || order.material === 'VVP';

        if (isMl) {
            let val = order.consumoEstimado !== undefined ? round2(order.consumoEstimado) : undefined;
            let assignedBobina = order.bobinaAsignada || order.precioDetalle?.bobinaAncho || order.precioDetalle?.bobinaUsada;

            const maxDim = Math.max(w, h);
            const is150Piece = maxDim > 1.365 && maxDim <= 1.515;
            // Corrección reactiva si una pieza de 1.50m tenía erróneamente guardada bobina 1.37m o consumo de 1.50ml
            const isAnomaly137 = is150Piece && (Number(assignedBobina) === 1.37 || String(assignedBobina).includes('1.37'));

            if (val === undefined || !assignedBobina || isAnomaly137) {
                if (matData?.bobinas && matData.bobinas.length > 0) {
                    const availableWidths = matData.bobinas
                        .map((b: any) => {
                            const nominal = Number(b.ancho) || 0;
                            const realAncho = (Math.abs(nominal - 1.50) < 0.03) ? 1.52 : nominal;
                            const usefulWidth = getBobinaUsefulWidth(realAncho);
                            return { ...b, ancho: realAncho, usefulWidth };
                        })
                        .filter((b: any) => b.usefulWidth > 0)
                        .sort((a: any, b: any) => a.usefulWidth - b.usefulWidth);

                    type Candidate = { bobina: number; ml: number; rotated: boolean };
                    const candidates: Candidate[] = [];

                    for (const b of availableWidths) {
                        if (w <= b.usefulWidth) {
                            candidates.push({ bobina: b.ancho, ml: round2(h * c), rotated: false });
                        }
                        if (h <= b.usefulWidth) {
                            candidates.push({ bobina: b.ancho, ml: round2(w * c), rotated: true });
                        }
                    }

                    candidates.sort((a, b) => {
                        if (is150Piece) {
                            const aIs152 = a.bobina >= 1.48 && a.bobina <= 1.53;
                            const bIs152 = b.bobina >= 1.48 && b.bobina <= 1.53;
                            if (aIs152 && !bIs152) return -1;
                            if (!aIs152 && bIs152) return 1;
                        }
                        const areaA = a.bobina * a.ml;
                        const areaB = b.bobina * b.ml;
                        if (Math.abs(areaA - areaB) > 0.05) return areaA - areaB;
                        if (Math.abs(a.ml - b.ml) > 0.01) return a.ml - b.ml;
                        if (a.rotated !== b.rotated) return a.rotated ? 1 : -1;
                        return a.bobina - b.bobina;
                    });

                    if (candidates.length > 0) {
                        val = candidates[0].ml;
                        assignedBobina = candidates[0].bobina;
                    } else {
                        val = round2(h * c);
                        assignedBobina = availableWidths[availableWidths.length - 1]?.ancho;
                    }
                } else {
                    // Standard Vehicular Vinyl roll sizes: 1.37m & 1.52m
                    if (is150Piece) {
                        assignedBobina = 1.52;
                        val = (w <= 1.515) ? round2(h * c) : round2(w * c);
                    } else if (w <= 1.365) {
                        assignedBobina = 1.37;
                        val = round2(h * c);
                    } else if (h <= 1.365 && round2(w * c) <= round2(h * c)) {
                        assignedBobina = 1.37;
                        val = round2(w * c);
                    } else if (w <= 1.515 || h <= 1.515) {
                        assignedBobina = 1.52;
                        val = (h <= 1.515 && round2(w * c) < round2(h * c)) ? round2(w * c) : round2(h * c);
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

    const isSpecialLaminationOrder = (order: Order, cons?: { value: number; unit: string; bobina: string | null }) => {
        const c = cons || getConsumption(order);
        const w = Number(order.ancho) || 0;
        const h = Number(order.alto) || 0;
        return (c.unit === 'ml' && c.value > 2.93) || Math.max(w, h) > 2.93;
    };

    const renderConsumptionBadge = (order: Order, cons: { value: number; unit: string; bobina: string | null }) => {
        const isSpecial = isSpecialLaminationOrder(order, cons);

        if (cons.unit === 'ml') {
            if (isSpecial) {
                return (
                    <div
                        className="special-lamination-box"
                        title="⚠️ Paño mayor a 2.93m: Requiere proceso de laminado especial en producción"
                    >
                        <div className="special-lamination-val font-mono">
                            <span style={{ fontSize: '0.8rem' }}>⚡</span>
                            <span>{cons.value.toFixed(2)}</span>
                            <small style={{ color: 'var(--badge-purple-text)', fontWeight: 800 }}>ml</small>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {cons.bobina && (
                                <span className="special-lamination-bobina">
                                    Rollo {cons.bobina}m
                                </span>
                            )}
                            <span className="special-lamination-pill">
                                LAMINADO ESP.
                            </span>
                        </div>
                    </div>
                );
            }

            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span className="m2-text font-mono" style={{ fontWeight: 700, color: 'var(--metric-cyan)', fontSize: '0.85rem' }}>
                        {cons.value.toFixed(2)} <small>ml</small>
                    </span>
                    {cons.bobina && (
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
                            Rollo {cons.bobina}m
                        </span>
                    )}
                </div>
            );
        }

        if (isSpecial) {
            return (
                <div
                    className="special-lamination-box"
                    title="⚠️ Paño mayor a 2.93m: Requiere proceso de laminado especial en producción"
                >
                    <div className="special-lamination-val font-mono">
                        <span style={{ fontSize: '0.8rem' }}>⚡</span>
                        <span>{cons.value.toFixed(2)}</span>
                        <small style={{ color: 'var(--badge-purple-text)', fontWeight: 800 }}>{cons.unit}</small>
                    </div>
                    <span className="special-lamination-pill">
                        LAMINADO ESP.
                    </span>
                </div>
            );
        }

        return (
            <span className="m2-text font-mono text-muted">
                {cons.value.toFixed(2)} <small>{cons.unit}</small>
            </span>
        );
    };

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
            rawMl?: number;
            savingsPercent?: number;
            savingsMeters?: number;
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
                    const ordersByBobina = new Map<number, Order[]>();
                    mlOrders.forEach(o => {
                        const cons = getConsumption(o);
                        const bNum = Number(cons.bobina) || 1.52;
                        if (!ordersByBobina.has(bNum)) {
                            ordersByBobina.set(bNum, []);
                        }
                        ordersByBobina.get(bNum)!.push(o);
                    });

                    ordersByBobina.forEach((bOrders, bobinaNum) => {
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
                            mlByBobina[`${bobinaNum}m`] = (mlByBobina[`${bobinaNum}m`] || 0) + nResult.linearMeters;
                        } else {
                            const singleCons = getConsumption(bOrders[0]);
                            totalMl += singleCons.value;
                            rawTotalMl += singleCons.value;
                            mlByBobina[`${bobinaNum}m`] = (mlByBobina[`${bobinaNum}m`] || 0) + singleCons.value;
                        }
                    });
                }

                const savingsMeters = Math.max(0, rawTotalMl - totalMl);
                const savingsPercent = rawTotalMl > 0 ? Math.round((savingsMeters / rawTotalMl) * 100) : 0;

                result.push({
                    isBatch: true,
                    batchId: bInfo.key,
                    batchName: batchData.name,
                    orders: batchList,
                    primaryOrder: batchList[0],
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

    // NESTING & MERGE HANDLERS
    const handleOpenNestingModal = (batchOrders: Order[], batchName?: string) => {
        setNestingModalOrders(batchOrders);
        setNestingModalBatchName(batchName || 'Lote Unificado');
        setIsNestingModalOpen(true);
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
            await downloadBatchOrdersZip(batchOrders, batchName, (p) => {
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

            {/* ACTION BAR */}
            <div className="filters-bar animate-slide-down" style={{ flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="filter-group">
                        <div className="search-wrapper">
                            <input
                                type="text"
                                placeholder="Buscar por Cliente, OT, ID, Etiqueta..."
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

                {/* TAG FILTER CHIPS */}
                <div className="tag-filter-chips">
                    <button
                        type="button"
                        className={`tag-chip ${tagFilter === '' ? 'is-active' : ''}`}
                        onClick={() => setTagFilter('')}
                    >
                        🏷️ Todas ({orders.length})
                    </button>
                    {PRESET_ORDER_TAGS.map(tag => {
                        const count = orders.filter(o => o.tags && o.tags.includes(tag.id)).length;
                        const isActive = tagFilter === tag.id;
                        return (
                            <button
                                key={tag.id}
                                type="button"
                                className={`tag-chip ${isActive ? 'is-active' : ''}`}
                                style={isActive ? { background: tag.bgColor, borderColor: tag.color, color: tag.color } : {}}
                                onClick={() => setTagFilter(isActive ? '' : tag.id)}
                            >
                                <span>{tag.icon}</span> {tag.label} {count > 0 && <span style={{ opacity: 0.85, fontSize: '0.65rem' }}>({count})</span>}
                            </button>
                        );
                    })}
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

            {/* FLOATING BATCH ACTIONS DOCK */}
            {selectedIds.size > 0 && (
                <div className="batch-actions-dock glass-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 800, color: 'var(--primary-color)', whiteSpace: 'nowrap' }}>{selectedIds.size} seleccionados</span>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} style={{ fontSize: '0.8rem', padding: '2px 8px' }}>✕</Button>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-color)', display: 'flex', gap: '0.75rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '0.75rem', whiteSpace: 'nowrap' }}>
                            {selectedTotals.m2 > 0 && <span>m²: <strong>{selectedTotals.m2.toFixed(2)}</strong></span>}
                            {selectedTotals.ml > 0 && <span>ml: <strong>{selectedTotals.ml.toFixed(2)}</strong></span>}
                            {isAdmin && (
                                <span>$: <strong>{selectedTotals.price.toLocaleString()}</strong></span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-color)', paddingLeft: '0.75rem', flexWrap: 'nowrap' }}>
                            {PRESET_ORDER_TAGS.map(pt => (
                                <button
                                    key={pt.id}
                                    type="button"
                                    className="btn-batch-tag"
                                    style={{ borderColor: pt.borderColor, color: pt.color, background: pt.bgColor, padding: '3px 8px', fontSize: '0.75rem' }}
                                    onClick={() => handleBulkApplyTag(pt.id)}
                                    title={`Aplicar ${pt.label} a ${selectedIds.size} órdenes`}
                                >
                                    {pt.icon} {pt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'nowrap', alignItems: 'center' }}>
                        {selectedIds.size >= 2 && (
                            <>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleOpenNestingForSelected}
                                    style={{ background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.8rem' }}
                                    title="Optimizar acomodo e imposición 2D en bobina para las órdenes seleccionadas"
                                >
                                    📐 Nesting ({selectedIds.size})
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleMergeSelectedIntoBatch}
                                    style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                                    title="Unificar órdenes seleccionadas en un mismo Lote para calcular consumo conjunto"
                                >
                                    🔗 Unificar
                                </Button>
                            </>
                        )}
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleDownloadSelectedOrders}
                            disabled={!!downloadProgress?.active}
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            title="Descargar paquete ZIP con todos los archivos de las órdenes seleccionadas"
                        >
                            <span>📥</span> Descargar ({selectedIds.size})
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleExportClientReportPdf}
                            style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', fontSize: '0.8rem' }}
                            title="Exportar Reporte PDF para el Cliente"
                        >
                            📄 PDF Cliente
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleBatchPdf}
                            style={{ backgroundColor: '#059669', color: '#fff', border: 'none', fontSize: '0.8rem' }}
                            title="PDF Masivo"
                        >
                            📚 PDF Masivo
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleBatchLabel}
                            style={{ backgroundColor: '#0d9488', color: '#fff', border: 'none', fontSize: '0.8rem' }}
                            title="Etiqueta Rollo"
                        >
                            🏷️ Etiqueta
                        </Button>
                        {viewTab !== 'trash' ? (
                            <>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleBatchStatus('impreso')}
                                    style={{ backgroundColor: statusColors['impreso'], color: '#fff', border: 'none', fontSize: '0.8rem' }}
                                >
                                    Impreso
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleBatchStatus('entregado')}
                                    style={{ backgroundColor: statusColors['entregado'], color: '#fff', border: 'none', fontSize: '0.8rem' }}
                                >
                                    Entregado
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleBatchRestore}
                                style={{ backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none', fontSize: '0.8rem' }}
                            >
                                Restaurar
                            </Button>
                        )}
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleBatchDelete}
                            style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', fontSize: '0.8rem' }}
                        >
                            {viewTab === 'trash' ? 'Borrar Definitivo' : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            )}

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
                                    const isExpanded = expandedBatches.has(item.batchId);
                                    return (
                                        <>
                                            {/* MASTER BATCH ROW */}
                                            <tr
                                                key={item.batchId}
                                                className={`batch-row-master ${isExpanded ? 'is-expanded' : ''} ${item.allSelected ? 'selected-row' : ''}`}
                                            >
                                                <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
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
                                                    <div className="composite-cell-primary" style={{ cursor: 'pointer' }} onClick={() => toggleExpandBatch(item.batchId)}>
                                                        <div className="composite-top-row">
                                                            <span className="batch-badge-pill">🏷️ {item.batchName}</span>
                                                            <span className="batch-count-pill">📦 {item.orders.length} OTs</span>
                                                            {item.primaryOrder.origen === 'mobile' ? (
                                                                <span className="origin-badge origin-badge-mobile">📱 Móvil</span>
                                                            ) : (
                                                                <span className="origin-badge origin-badge-web">💻 Web</span>
                                                            )}
                                                            {canViewAlerts && forecastGroupByKey.get(`batch:${item.batchId}`) === 'critical' && (
                                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }}>⚠ Faltante stock</span>
                                                            )}
                                                            {canViewAlerts && forecastGroupByKey.get(`batch:${item.batchId}`) === 'low' && (
                                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }}>◐ Stock bajo</span>
                                                            )}
                                                        </div>
                                                        <div className="composite-bottom-row">
                                                            <span className="composite-client">🏢 {item.primaryOrder.clienteNombre}</span>
                                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                                {isExpanded ? '▼ Clic para contraer' : '▶ Clic para ver órdenes'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="composite-cell-tech">
                                                        <div className="composite-top-row">
                                                            {(() => {
                                                                const mats = Array.from(new Set(item.orders.map(o => o.material)));
                                                                if (mats.length === 1) {
                                                                    return <span className="material-tag-sm">{mats[0]}</span>;
                                                                }
                                                                return <span className="material-tag-sm" style={{ background: 'rgba(255,255,255,0.1)' }}>{mats.length} materiales</span>;
                                                            })()}
                                                            <span style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.82rem' }}>
                                                                {item.orders.length} piezas · {item.totalCopies} cop.
                                                            </span>
                                                        </div>
                                                        <div className="composite-bottom-row">
                                                            {item.totalConsumption.ml > 0 ? (
                                                                <span className="m2-text font-mono" style={{ fontWeight: 800, color: 'var(--metric-cyan)', fontSize: '0.88rem' }}>
                                                                    {item.totalConsumption.ml.toFixed(2)} ml
                                                                </span>
                                                            ) : (
                                                                <span className="m2-text font-mono" style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                                                                    {item.totalConsumption.m2.toFixed(2)} m²
                                                                </span>
                                                            )}
                                                            {item.totalConsumption.savingsPercent !== undefined && item.totalConsumption.savingsPercent > 0 && (
                                                                <span style={{
                                                                    fontSize: '0.68rem',
                                                                    fontWeight: 700,
                                                                    color: '#10b981',
                                                                    background: 'rgba(16, 185, 129, 0.12)',
                                                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                                                    padding: '1px 6px',
                                                                    borderRadius: '4px',
                                                                    whiteSpace: 'nowrap'
                                                                }} title={`Consumo teórico sin nesting: ${item.totalConsumption.rawMl?.toFixed(2)} ml`}>
                                                                    ⚡ {item.totalConsumption.savingsPercent}% ahorro
                                                                </span>
                                                            )}
                                                            {item.orders.some(o => isSpecialLaminationOrder(o)) && (
                                                                <span className="batch-special-lamination-pill" title="Este lote incluye paños > 2.93m con laminado especial">
                                                                    ⚡ Paños &gt; 2.93m
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="composite-cell-status">
                                                        <div className="composite-top-row">
                                                            <div
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
                                                            </div>
                                                            {(() => {
                                                                const envios = Array.from(new Set(item.orders.map(o => o.envio).filter(Boolean)));
                                                                if (envios.length > 0) {
                                                                    return (
                                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                                                            {envios.map(env => (
                                                                                <span key={env} className="shipping-pill">
                                                                                    🚚 {env}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                        </div>
                                                        <div className="composite-bottom-row">
                                                            <span style={{ fontWeight: '700', color: 'var(--accent)', fontSize: '0.8rem' }}>
                                                                📅 {item.primaryOrder.fechaEntrega ? (() => {
                                                                    const d = new Date(item.primaryOrder.fechaEntrega + 'T12:00:00');
                                                                    if (!isNaN(d.getTime())) {
                                                                        const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase().replace('.', '');
                                                                        return `${dayName} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                                                                    }
                                                                    return item.primaryOrder.fechaEntrega;
                                                                })() : '--'}
                                                            </span>
                                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                                Ingreso: {item.primaryOrder.createdAt ? new Date(item.primaryOrder.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : (item.primaryOrder.fechaCreacion || '-')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                {isAdmin && (
                                                    <td>
                                                        <div className="price-cell" style={{ fontWeight: 800, color: '#10b981' }}>
                                                            <span className="currency">$</span>
                                                            <span className="amount">{item.totalPrice.toLocaleString()}</span>
                                                        </div>
                                                    </td>
                                                )}
                                                <td>
                                                    <div className="order-actions-compact">
                                                        <button
                                                            type="button"
                                                            className="btn-icon-action"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadBatch(item.orders, item.batchName);
                                                            }}
                                                            title={`Descargar todas las imágenes de este lote (${item.orders.length} OTs en ZIP)`}
                                                            style={{ background: 'rgba(16, 185, 129, 0.25)', border: '1px solid rgba(16, 185, 129, 0.6)' }}
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>📥</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-icon-action"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenNestingModal(item.orders, item.batchName);
                                                            }}
                                                            title="Abrir Nesting Studio 2D para este Lote"
                                                            style={{ background: 'rgba(56, 189, 248, 0.25)', border: '1px solid rgba(56, 189, 248, 0.6)' }}
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>📐</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-icon-action"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const clientObj = allClientes.find(c => String(c.id) === String(item.primaryOrder.clientId));
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
                                                    <tr
                                                        key={order.id || order.ot}
                                                        className={`batch-child-row fade-in ${selectedIds.has(String(order.id || order.ot)) ? 'selected-row' : ''} ${isSpecialLaminationOrder(order, consumption) ? 'is-special-lamination' : ''}`}
                                                        onDoubleClick={() => handlePreview(order)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
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
                                                            <div className="composite-cell-primary" style={{ paddingLeft: '8px' }}>
                                                                <div className="composite-top-row">
                                                                    <span className="ot-text" style={{ fontWeight: 800, color: 'var(--ot-color)', fontSize: '0.9rem' }}>{otDisplay}</span>
                                                                    {childLabel && (
                                                                        <span className="composite-work-title" title={childLabel}>
                                                                            {childLabel}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="composite-bottom-row">
                                                                    <span className="composite-client">↳ {order.clienteNombre}</span>
                                                                    <OrderTagBadges
                                                                        order={order}
                                                                        tagPopoverOrderId={tagPopoverOrderId}
                                                                        setTagPopoverOrderId={setTagPopoverOrderId}
                                                                        onToggleTag={handleToggleOrderTag}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="composite-cell-tech">
                                                                <div className="composite-top-row">
                                                                    <span className="material-tag-sm">{order.material}</span>
                                                                    {(() => {
                                                                        const w = Number(order.ancho) || 0;
                                                                        const h = Number(order.alto) || 0;
                                                                        const isSpecial = isSpecialLaminationOrder(order, consumption);
                                                                        return (
                                                                            <span className="dims-text">
                                                                                <span style={w > 2.93 ? { color: 'var(--badge-purple-text)', fontWeight: 800 } : undefined}>{w.toFixed(2)}</span>
                                                                                {' × '}
                                                                                <span style={h > 2.93 ? { color: 'var(--badge-purple-text)', fontWeight: 800 } : undefined}>{h.toFixed(2)}</span>
                                                                                {' m'}
                                                                                {isSpecial && <span style={{ marginLeft: '3px', fontSize: '0.72rem', color: 'var(--badge-purple-text)' }} title="Paño > 2.93m: Requiere laminado especial">⚡</span>}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                    <span className="copies-badge">{order.copias} cop.</span>
                                                                    {order.demasiasConfig && Object.values(order.demasiasConfig).some(v => v === true) && (
                                                                        <span className="demasia-indicator" title={`Demasías: ${[order.demasiasConfig.top?'Arriba':'', order.demasiasConfig.bottom?'Abajo':'', order.demasiasConfig.left?'Izq':'', order.demasiasConfig.right?'Der':''].filter(Boolean).join(', ')}`}>
                                                                            🎯 Demasías
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="composite-bottom-row">
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Consumo:</span>
                                                                    {renderConsumptionBadge(order, consumption)}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="composite-cell-status">
                                                                <div className="composite-top-row">
                                                                    <div
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
                                                                    </div>
                                                                    {order.envio && (
                                                                        <span className="shipping-pill">
                                                                            🚚 {order.envio}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="composite-bottom-row">
                                                                    <span style={{ fontWeight: '600', color: 'var(--accent)', fontSize: '0.8rem' }}>
                                                                        📅 {order.fechaEntrega ? (() => {
                                                                            const d = new Date(order.fechaEntrega + 'T12:00:00');
                                                                            if (!isNaN(d.getTime())) {
                                                                                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                                                                            }
                                                                            return order.fechaEntrega;
                                                                        })() : '--'}
                                                                    </span>
                                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                                        Hora: {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {isAdmin && (
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
                                                            <div className="order-actions-compact">
                                                                <button
                                                                    type="button"
                                                                    className="btn-icon-action"
                                                                    onClick={(e) => { e.stopPropagation(); handlePreview(order); }}
                                                                    title="Ver Detalle"
                                                                    style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.5)' }}
                                                                >
                                                                    <span style={{ pointerEvents: 'none' }}>👁️</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn-icon-action"
                                                                    onClick={(e) => { e.stopPropagation(); handleDownloadSingle(order); }}
                                                                    title={order.archivos?.length ? `Descargar archivo(s) (${order.archivos.length})` : 'Sin archivos adjuntos'}
                                                                    disabled={!order.archivos?.length}
                                                                    style={{
                                                                        background: order.archivos?.length ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.1)',
                                                                        border: order.archivos?.length ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(100, 116, 139, 0.2)',
                                                                        opacity: order.archivos?.length ? 1 : 0.4,
                                                                        cursor: order.archivos?.length ? 'pointer' : 'not-allowed'
                                                                    }}
                                                                >
                                                                    <span style={{ pointerEvents: 'none' }}>📥</span>
                                                                </button>
                                                                <div className="action-menu-container">
                                                                    <button
                                                                        type="button"
                                                                        className={`btn-icon-action action-menu-trigger ${actionMenuOrderId === String(order.id || order.ot) ? 'active' : ''}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const oid = String(order.id || order.ot);
                                                                            setActionMenuOrderId(prev => prev === oid ? null : oid);
                                                                        }}
                                                                        title="Más opciones de orden"
                                                                    >
                                                                        <span style={{ pointerEvents: 'none', letterSpacing: '-1px', fontWeight: 900 }}>•••</span>
                                                                    </button>
                                                                    {actionMenuOrderId === String(order.id || order.ot) && (
                                                                        <div className="action-menu-popover" onClick={(e) => e.stopPropagation()}>
                                                                            <button
                                                                                type="button"
                                                                                className="action-menu-item"
                                                                                onClick={() => {
                                                                                    setActionMenuOrderId(null);
                                                                                    setChatOrder(order);
                                                                                    setIsChatModalOpen(true);
                                                                                }}
                                                                            >
                                                                                <span>💬</span> Chat / Mensajes
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="action-menu-item"
                                                                                onClick={() => {
                                                                                    setActionMenuOrderId(null);
                                                                                    openPdfModeModal([order], `Presupuesto ${order.ot || order.id}`);
                                                                                }}
                                                                            >
                                                                                <span>📄</span> Presupuesto PDF
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="action-menu-item"
                                                                                onClick={() => {
                                                                                    setActionMenuOrderId(null);
                                                                                    generateProductionLabel([order]);
                                                                                }}
                                                                            >
                                                                                <span>🏷️</span> Etiqueta Rollo
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="action-menu-item"
                                                                                onClick={() => {
                                                                                    setActionMenuOrderId(null);
                                                                                    setStatusOrder(order);
                                                                                    setStatusBatchOrders(undefined);
                                                                                    setIsStatusModalOpen(true);
                                                                                }}
                                                                            >
                                                                                <span>⚙️</span> Cambiar Estado
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="action-menu-item"
                                                                                onClick={() => {
                                                                                    setActionMenuOrderId(null);
                                                                                    handleEditOrder(order);
                                                                                }}
                                                                            >
                                                                                <span>✏️</span> Editar Pedido
                                                                            </button>
                                                                            <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                                                                            <button
                                                                                type="button"
                                                                                className="action-menu-item danger"
                                                                                onClick={() => {
                                                                                    setActionMenuOrderId(null);
                                                                                    handleSoftDeleteOrder(order);
                                                                                }}
                                                                            >
                                                                                <span>🗑️</span> Enviar a Papelera
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
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
                                    <tr
                                        key={order.id || order.ot}
                                        className={`fade-in hover-row ${selectedIds.has(String(order.id || order.ot)) ? 'selected-row' : ''} ${isSpecialLaminationOrder(order, consumption) ? 'is-special-lamination' : ''}`}
                                        onDoubleClick={() => handlePreview(order)}
                                        style={selectedIds.has(String(order.id || order.ot)) ? { background: 'rgba(var(--primary-rgb), 0.05)', cursor: 'pointer' } : { cursor: 'pointer' }}
                                    >
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(String(order.id || order.ot))}
                                                onChange={() => toggleSelection(order.id || order.ot || '')}
                                                style={{ accentColor: 'var(--primary-color)', cursor: 'pointer', transform: 'scale(1.2)' }}
                                            />
                                        </td>
                                        <td>
                                            <div className="composite-cell-primary">
                                                <div className="composite-top-row">
                                                    <span className="ot-text" style={{ fontWeight: 800, color: 'var(--ot-color)', fontSize: '0.95rem' }}>{otDisplay}</span>
                                                    {isMobile ? (
                                                        <span className="origin-badge origin-badge-mobile" title={`Enviado por: ${operarioNombre || 'Operario Móvil'}`}>
                                                            📱 App {operarioNombre ? operarioNombre : 'Móvil'}
                                                        </span>
                                                    ) : (
                                                        <span className="origin-badge origin-badge-web">
                                                            💻 Web
                                                        </span>
                                                    )}
                                                    {cleanDesc && (
                                                        <span className="composite-work-title" title={cleanDesc}>
                                                            {cleanDesc}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="composite-bottom-row">
                                                    <span className="composite-client">🏢 {order.clienteNombre}</span>
                                                    <OrderTagBadges
                                                        order={order}
                                                        tagPopoverOrderId={tagPopoverOrderId}
                                                        setTagPopoverOrderId={setTagPopoverOrderId}
                                                        onToggleTag={handleToggleOrderTag}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="composite-cell-tech">
                                                <div className="composite-top-row">
                                                    <span className="material-tag-sm">{order.material}</span>
                                                    {(() => {
                                                        const w = Number(order.ancho) || 0;
                                                        const h = Number(order.alto) || 0;
                                                        const isSpecial = isSpecialLaminationOrder(order, consumption);
                                                        return (
                                                            <span className="dims-text">
                                                                <span style={w > 2.93 ? { color: 'var(--badge-purple-text)', fontWeight: 800 } : undefined}>{w.toFixed(2)}</span>
                                                                {' × '}
                                                                <span style={h > 2.93 ? { color: 'var(--badge-purple-text)', fontWeight: 800 } : undefined}>{h.toFixed(2)}</span>
                                                                {' m'}
                                                                {isSpecial && <span style={{ marginLeft: '3px', fontSize: '0.72rem', color: 'var(--badge-purple-text)' }} title="Paño > 2.93m: Requiere laminado especial">⚡</span>}
                                                            </span>
                                                        );
                                                    })()}
                                                    <span className="copies-badge">{order.copias} cop.</span>
                                                    {order.demasiasConfig && Object.values(order.demasiasConfig).some(v => v === true) && (
                                                        <span className="demasia-indicator" title={`Demasías: ${[order.demasiasConfig.top?'Arriba':'', order.demasiasConfig.bottom?'Abajo':'', order.demasiasConfig.left?'Izq':'', order.demasiasConfig.right?'Der':''].filter(Boolean).join(', ')}`}>
                                                            🎯 Demasías
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="composite-bottom-row">
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Consumo:</span>
                                                    {renderConsumptionBadge(order, consumption)}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="composite-cell-status">
                                                <div className="composite-top-row">
                                                    <div
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setStatusOrder(order);
                                                            setStatusBatchOrders(undefined);
                                                            setIsStatusModalOpen(true);
                                                        }}
                                                        title="Click para cambiar el estado"
                                                    >
                                                        <span className="status-badge" style={{
                                                            backgroundColor: statusColors[order.status],
                                                            boxShadow: `0 0 8px ${statusColors[order.status]}40`,
                                                            cursor: 'pointer'
                                                        }}>
                                                            {statusLabels[order.status]}
                                                        </span>
                                                    </div>
                                                    {order.envio && (
                                                        <span className="shipping-pill">
                                                            🚚 {order.envio}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="composite-bottom-row">
                                                    <span style={{ fontWeight: '600', color: 'var(--accent)', fontSize: '0.8rem' }}>
                                                        📅 {order.fechaEntrega ? (() => {
                                                            const d = new Date(order.fechaEntrega + 'T12:00:00');
                                                            if (!isNaN(d.getTime())) {
                                                                const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase().replace('.', '');
                                                                return `${dayName} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                                                            }
                                                            return order.fechaEntrega;
                                                        })() : '--'}
                                                    </span>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                        Ingreso: {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : (order.fechaCreacion || '-')}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        {isAdmin && (
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
                                            <div className="order-actions-compact">
                                                {order.status === 'eliminado' ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn-icon-action"
                                                            onClick={(e) => { e.stopPropagation(); handleRestoreOrder(order); }}
                                                            title="Restaurar Orden"
                                                            style={{ filter: 'grayscale(0)' }}
                                                        >
                                                            <span style={{ pointerEvents: 'none', fontSize: '1.1rem' }}>🔁</span>
                                                        </button>
                                                        <button
                                                            type="button"
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
                                                            type="button"
                                                            className="btn-icon-action"
                                                            onClick={(e) => { e.stopPropagation(); handlePreview(order); }}
                                                            title="Ver Detalle (Doble clic en fila también abre)"
                                                            style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.5)' }}
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>👁️</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-icon-action"
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadSingle(order); }}
                                                            title={order.archivos?.length ? `Descargar archivo(s) (${order.archivos.length})` : 'Sin archivos adjuntos'}
                                                            disabled={!order.archivos?.length}
                                                            style={{
                                                                background: order.archivos?.length ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.1)',
                                                                border: order.archivos?.length ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(100, 116, 139, 0.2)',
                                                                opacity: order.archivos?.length ? 1 : 0.4,
                                                                cursor: order.archivos?.length ? 'pointer' : 'not-allowed'
                                                            }}
                                                        >
                                                            <span style={{ pointerEvents: 'none' }}>📥</span>
                                                        </button>
                                                        <div className="action-menu-container">
                                                            <button
                                                                type="button"
                                                                className={`btn-icon-action action-menu-trigger ${actionMenuOrderId === String(order.id || order.ot) ? 'active' : ''}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const oid = String(order.id || order.ot);
                                                                    setActionMenuOrderId(prev => prev === oid ? null : oid);
                                                                }}
                                                                title="Más opciones de orden"
                                                            >
                                                                <span style={{ pointerEvents: 'none', letterSpacing: '-1px', fontWeight: 900 }}>•••</span>
                                                            </button>
                                                            {actionMenuOrderId === String(order.id || order.ot) && (
                                                                <div className="action-menu-popover" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        type="button"
                                                                        className="action-menu-item"
                                                                        onClick={() => {
                                                                            setActionMenuOrderId(null);
                                                                            setChatOrder(order);
                                                                            setIsChatModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <span>💬</span> Chat / Mensajes
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="action-menu-item"
                                                                        onClick={() => {
                                                                            setActionMenuOrderId(null);
                                                                            openPdfModeModal([order], `Presupuesto ${order.ot || order.id}`);
                                                                        }}
                                                                    >
                                                                        <span>📄</span> Presupuesto PDF
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="action-menu-item"
                                                                        onClick={() => {
                                                                            setActionMenuOrderId(null);
                                                                            generateProductionLabel([order]);
                                                                        }}
                                                                    >
                                                                        <span>🏷️</span> Etiqueta Rollo
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="action-menu-item"
                                                                        onClick={() => {
                                                                            setActionMenuOrderId(null);
                                                                            setStatusOrder(order);
                                                                            setStatusBatchOrders(undefined);
                                                                            setIsStatusModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <span>⚙️</span> Cambiar Estado
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="action-menu-item"
                                                                        onClick={() => {
                                                                            setActionMenuOrderId(null);
                                                                            handleEditOrder(order);
                                                                        }}
                                                                    >
                                                                        <span>✏️</span> Editar Pedido
                                                                    </button>
                                                                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                                                                    <button
                                                                        type="button"
                                                                        className="action-menu-item danger"
                                                                        onClick={() => {
                                                                            setActionMenuOrderId(null);
                                                                            handleSoftDeleteOrder(order);
                                                                        }}
                                                                    >
                                                                        <span>🗑️</span> Enviar a Papelera
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
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
