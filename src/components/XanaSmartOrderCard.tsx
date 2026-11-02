import React, { useState, useMemo } from 'react';
import {
    CheckCircle2, AlertTriangle, ExternalLink, RefreshCw,
    Image as ImageIcon, Sparkles, Edit3, ShieldCheck, Layers, List, Grid, ChevronDown, ChevronUp
} from 'lucide-react';
import { API_URL, getMateriales, saveOrden } from '../data/db';
import { calculateItemPriceDetailed, round2 } from '@/utils/pricingCalculator';
import { formatOTNumber } from '@/utils/orderNumber';
import './XanaSmartOrderCard.css';

export interface SmartCartelItem {
    tipo: string;
    copias: number;
    medidas: { ancho: number; alto: number };
    raw_medidas: { ancho: number; alto: number };
    bobinaAsignada: number;
    consumoEstimado: number;
    m2Estimado: number;
    originalName: string;
    fileName: string;
    fileUrl: string;
    thumbnailUrl?: string;
    dpi: number;
    colorMode: string;
    format: string;
    scaleFactor: number;
    scaleAlert: boolean;
    scaleReason: string;
    sha256: string;
    precioCalculado?: number;
    rotated?: boolean;
}

export interface SmartDraftOrder {
    cliente_id?: number | null;
    cliente_nombre: string;
    descripcion: string;
    material: string;
    calidad: string;
    copias: number;
    ancho: number;
    alto: number;
    archivos: string[];
    archivosOriginales: string[];
    carteles: SmartCartelItem[];
    bobinaAsignada: number;
    consumoEstimado: number;
    totalM2: number;
    precioMl: number;
    total: number;
    observaciones?: string;
    imgMetadata?: {
        dpi: number;
        colorMode: string;
        format: string;
        thumbnailUrl?: string;
    };
}

interface XanaSmartOrderCardProps {
    initialDraft: SmartDraftOrder;
    onOrderConfirmed?: (createdOrder: any) => void;
}

function recalculateAllItems(
    items: SmartCartelItem[],
    matCode: string,
    clienteId?: number | null
) {
    let totalCost = 0;
    let totalML = 0;
    let totalM2 = 0;

    const updated = items.map(item => {
        const w = Number(item.medidas?.ancho) || 0;
        const h = Number(item.medidas?.alto) || 0;
        const copies = Math.max(1, Number(item.copias) || 1);

        if (w <= 0 || h <= 0) {
            return {
                ...item,
                tipo: matCode,
                copias: copies,
                consumoEstimado: 0,
                m2Estimado: 0,
                precioCalculado: 0,
                rotated: false
            };
        }

        const calc = calculateItemPriceDetailed(
            matCode,
            w,
            h,
            copies,
            {},
            clienteId || undefined
        );

        const itemM2 = round2(w * h * copies);
        totalCost += calc.subtotal;
        totalML += calc.consumoEstimado;
        totalM2 += itemM2;

        return {
            ...item,
            tipo: matCode,
            copias: copies,
            bobinaAsignada: calc.bobinaAsignada || item.bobinaAsignada || 1.37,
            consumoEstimado: round2(calc.consumoEstimado),
            m2Estimado: itemM2,
            precioCalculado: Math.round(calc.subtotal),
            rotated: calc.rotated
        };
    });

    return {
        carteles: updated,
        totalCost: Math.round(totalCost),
        totalML: round2(totalML),
        totalM2: round2(totalM2)
    };
}

export const XanaSmartOrderCard: React.FC<XanaSmartOrderCardProps> = ({
    initialDraft,
    onOrderConfirmed
}) => {
    const availableMaterials = useMemo(() => {
        return getMateriales().filter(
            m => m.habilitado !== false && !['tinta', 'solvente'].includes((m.tipo || '').toLowerCase())
        );
    }, []);

    const [draft, setDraft] = useState<SmartDraftOrder>(() => {
        const matCode = initialDraft.material || 'VV';
        const { carteles, totalCost, totalML, totalM2 } = recalculateAllItems(
            initialDraft.carteles || [],
            matCode,
            initialDraft.cliente_id
        );

        return {
            ...initialDraft,
            material: matCode,
            carteles,
            ancho: carteles[0]?.medidas.ancho || initialDraft.ancho || 0,
            alto: carteles[0]?.medidas.alto || initialDraft.alto || 0,
            bobinaAsignada: carteles[0]?.bobinaAsignada || initialDraft.bobinaAsignada || 1.37,
            consumoEstimado: totalML,
            totalM2: totalM2,
            total: totalCost > 0 ? totalCost : Math.round(initialDraft.total || 0)
        };
    });

    const isMultiItem = (draft.carteles?.length || 0) > 1;
    const [compactMode, setCompactMode] = useState<boolean>(() => (initialDraft.carteles?.length || 0) > 3);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
    const [brokenThumbs, setBrokenThumbs] = useState<Record<number, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const resolveThumbSrc = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')) {
            return url;
        }
        return `${API_URL.replace(/\/api\/?$/, '')}${url}`;
    };

    const handleMaterialChange = (newMatCode: string) => {
        setDraft(prev => {
            const { carteles, totalCost, totalML, totalM2 } = recalculateAllItems(
                prev.carteles || [],
                newMatCode,
                prev.cliente_id
            );
            return {
                ...prev,
                material: newMatCode,
                carteles,
                bobinaAsignada: carteles[0]?.bobinaAsignada || prev.bobinaAsignada,
                consumoEstimado: totalML,
                totalM2,
                total: totalCost
            };
        });
    };

    const handleScaleChange = (index: number, newScale: number) => {
        setDraft(prev => {
            const matCode = prev.material || 'VV';
            const nextItems = prev.carteles.map((item, idx) => {
                if (idx !== index) return item;
                const baseW = item.raw_medidas?.ancho > 0 ? item.raw_medidas.ancho : item.medidas.ancho;
                const baseH = item.raw_medidas?.alto > 0 ? item.raw_medidas.alto : item.medidas.alto;
                return {
                    ...item,
                    scaleFactor: newScale,
                    medidas: {
                        ancho: round2(baseW * newScale),
                        alto: round2(baseH * newScale)
                    }
                };
            });

            const { carteles, totalCost, totalML, totalM2 } = recalculateAllItems(nextItems, matCode, prev.cliente_id);
            return {
                ...prev,
                carteles,
                ancho: carteles[0]?.medidas.ancho || prev.ancho,
                alto: carteles[0]?.medidas.alto || prev.alto,
                bobinaAsignada: carteles[0]?.bobinaAsignada || prev.bobinaAsignada,
                consumoEstimado: totalML,
                totalM2,
                total: totalCost
            };
        });
    };

    const handleGlobalScaleChange = (newScale: number) => {
        setDraft(prev => {
            const matCode = prev.material || 'VV';
            const nextItems = prev.carteles.map(item => {
                const baseW = item.raw_medidas?.ancho > 0 ? item.raw_medidas.ancho : item.medidas.ancho;
                const baseH = item.raw_medidas?.alto > 0 ? item.raw_medidas.alto : item.medidas.alto;
                return {
                    ...item,
                    scaleFactor: newScale,
                    medidas: {
                        ancho: round2(baseW * newScale),
                        alto: round2(baseH * newScale)
                    }
                };
            });

            const { carteles, totalCost, totalML, totalM2 } = recalculateAllItems(nextItems, matCode, prev.cliente_id);
            return {
                ...prev,
                carteles,
                ancho: carteles[0]?.medidas.ancho || prev.ancho,
                alto: carteles[0]?.medidas.alto || prev.alto,
                bobinaAsignada: carteles[0]?.bobinaAsignada || prev.bobinaAsignada,
                consumoEstimado: totalML,
                totalM2,
                total: totalCost
            };
        });
    };

    const handleCopiesChange = (index: number, delta: number) => {
        setDraft(prev => {
            const matCode = prev.material || 'VV';
            const nextItems = prev.carteles.map((item, idx) => {
                if (idx !== index) return item;
                return {
                    ...item,
                    copias: Math.max(1, (item.copias || 1) + delta)
                };
            });
            const { carteles, totalCost, totalML, totalM2 } = recalculateAllItems(nextItems, matCode, prev.cliente_id);
            return {
                ...prev,
                carteles,
                consumoEstimado: totalML,
                totalM2,
                total: totalCost
            };
        });
    };

    const handleManualDimensionChange = (index: number, field: 'ancho' | 'alto', rawVal: string) => {
        const val = Math.max(0, parseFloat(rawVal) || 0);
        setDraft(prev => {
            const matCode = prev.material || 'VV';
            const nextItems = prev.carteles.map((item, idx) => {
                if (idx !== index) return item;
                const newMedidas = { ...item.medidas, [field]: val };
                const newRaw = {
                    ancho: item.raw_medidas?.ancho > 0 ? item.raw_medidas.ancho : newMedidas.ancho,
                    alto: item.raw_medidas?.alto > 0 ? item.raw_medidas.alto : newMedidas.alto
                };
                return {
                    ...item,
                    medidas: newMedidas,
                    raw_medidas: newRaw
                };
            });
            const { carteles, totalCost, totalML, totalM2 } = recalculateAllItems(nextItems, matCode, prev.cliente_id);
            return {
                ...prev,
                carteles,
                ancho: carteles[0]?.medidas.ancho || prev.ancho,
                alto: carteles[0]?.medidas.alto || prev.alto,
                bobinaAsignada: carteles[0]?.bobinaAsignada || prev.bobinaAsignada,
                consumoEstimado: totalML,
                totalM2,
                total: totalCost
            };
        });
    };

    const bobinasBreakdown = useMemo(() => {
        const map = new Map<number, number>();
        (draft.carteles || []).forEach(c => {
            const b = c.bobinaAsignada || 1.37;
            const current = map.get(b) || 0;
            map.set(b, round2(current + (c.consumoEstimado || 0)));
        });
        return Array.from(map.entries()).map(([bobina, ml]) => ({ bobina, ml }));
    }, [draft.carteles]);

    const handleConfirmOrder = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const firstItem = draft.carteles?.[0];
            if (!firstItem || firstItem.medidas.ancho <= 0 || firstItem.medidas.alto <= 0) {
                throw new Error('Ingresá medidas válidas (mayores a 0 m) antes de confirmar el pedido.');
            }

            // Guardar usando el flujo oficial saveOrden de LuXius (sincroniza localStorage + Supabase /api/orders)
            const orderPayload: any = {
                clienteId: draft.cliente_id || 1,
                clienteNombre: draft.cliente_nombre || 'CLIENTE GENERAL',
                vendedorId: 1,
                descripcion: draft.descripcion || `Pedido Xana (${draft.carteles.length} pzs)`,
                status: 'orden',
                material: draft.material || 'VV',
                calidad: draft.calidad || 'ECO',
                ancho: firstItem.medidas.ancho,
                alto: firstItem.medidas.alto,
                copias: firstItem.copias || 1,
                bobinaAsignada: draft.bobinaAsignada || 1.37,
                consumoEstimado: draft.consumoEstimado,
                m2: draft.totalM2,
                subtotal: draft.total,
                total: draft.total,
                restante: draft.total,
                sena: 0,
                archivos: draft.archivosOriginales?.length ? draft.archivosOriginales : draft.archivos,
                archivosOriginales: draft.archivosOriginales,
                carteles: draft.carteles.map(c => ({
                    tipo: c.tipo || draft.material || 'VV',
                    copias: c.copias || 1,
                    medidas: c.medidas,
                    bobinaAsignada: c.bobinaAsignada,
                    consumoEstimado: c.consumoEstimado,
                    originalName: c.originalName,
                    fileName: c.fileName || c.originalName,
                    thumbnailUrl: c.thumbnailUrl,
                    dpi: c.dpi,
                    colorMode: c.colorMode,
                    format: c.format
                })),
                imgMetadata: {
                    width: Math.round(firstItem.medidas.ancho * 100),
                    height: Math.round(firstItem.medidas.alto * 100),
                    dpi: firstItem.dpi || 150,
                    format: firstItem.format || 'JPG',
                    colorMode: firstItem.colorMode || 'CMYK',
                    thumbnailUrl: firstItem.thumbnailUrl
                },
                fechaCreacion: new Date().toISOString(),
                fechaEntrega: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
                notas: draft.observaciones || ''
            };

            const created = await saveOrden(orderPayload);
            setConfirmedOrder(created);
            if (onOrderConfirmed) {
                onOrderConfirmed(created);
            }
            window.dispatchEvent(new CustomEvent('luxius:order-created', { detail: created }));
        } catch (err: any) {
            setError(err.message || 'Error inesperado al crear la orden.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenInModal = () => {
        sessionStorage.setItem('luxius_xana_draft_order', JSON.stringify(draft));
        window.dispatchEvent(new CustomEvent('luxius:open-order-modal', { detail: draft }));
        if (!window.location.hash.includes('/entrada') && !window.location.pathname.includes('/entrada')) {
            window.location.href = '#/entrada';
        }
    };

    if (confirmedOrder) {
        const otLabel = formatOTNumber(confirmedOrder.ot || confirmedOrder.numero_presupuesto || confirmedOrder.id);
        return (
            <div className="xana-order-card confirmed animate-scale-up">
                <div className="order-card-header success">
                    <CheckCircle2 size={22} className="icon-success" />
                    <div>
                        <h4>¡Orden Creada Exitosamente!</h4>
                        <span className="order-number">{otLabel}</span>
                    </div>
                </div>
                <div className="order-card-body">
                    <p className="order-client"><strong>Cliente:</strong> {draft.cliente_nombre}</p>
                    <p className="order-desc">{draft.descripcion}</p>
                    <div className="order-stats-grid">
                        <div className="stat-box">
                            <span className="stat-label">Total</span>
                            <span className="stat-val highlight">${draft.total?.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">Consumo</span>
                            <span className="stat-val">{draft.consumoEstimado} ml ({draft.totalM2} m²)</span>
                        </div>
                    </div>
                </div>
                <div className="order-card-footer">
                    <button
                        className="btn-view-order"
                        onClick={() => { window.location.href = '#/entrada'; }}
                    >
                        <ExternalLink size={15} /> Ver en Entrada
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="xana-order-card animate-fade-in">
            {/* Encabezado Principal */}
            <div className="order-card-header">
                <div className="header-title-box">
                    <Sparkles size={15} className="icon-sparkle" />
                    <h4 title="Cotizador & Borrador Inteligente Xana">Cotizador Xana</h4>
                </div>

                <div className="material-selector-box">
                    <select
                        value={draft.material}
                        onChange={(e) => handleMaterialChange(e.target.value)}
                        className="select-material-badge"
                        title="Cambiar material de impresión"
                    >
                        {availableMaterials.map(m => (
                            <option key={m.codigo} value={m.codigo}>
                                {m.codigo} — {m.descripcion || m.codigo}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="order-card-body">
                {/* Barra de Cliente y Contador de Piezas */}
                <div className="client-badge-bar">
                    <span className="client-name" title={draft.cliente_nombre}>🏢 {draft.cliente_nombre}</span>
                    <span className="item-count">
                        <Layers size={12} /> {draft.carteles?.length || 1} {draft.carteles?.length === 1 ? 'imagen' : 'imágenes'}
                    </span>
                </div>

                {/* Barra de Acciones en Lote (cuando hay múltiples imágenes) */}
                {isMultiItem && (
                    <div className="batch-controls-bar">
                        <div className="batch-scale-group">
                            <span className="batch-label">Escala global:</span>
                            <button type="button" className="btn-scale-mini" onClick={() => handleGlobalScaleChange(1)}>1:1</button>
                            <button type="button" className="btn-scale-mini" onClick={() => handleGlobalScaleChange(10)}>1:10</button>
                            <button type="button" className="btn-scale-mini" onClick={() => handleGlobalScaleChange(20)}>1:20</button>
                        </div>
                        <button
                            type="button"
                            className="btn-toggle-view"
                            onClick={() => setCompactMode(v => !v)}
                            title={compactMode ? 'Cambiar a vista detallada' : 'Cambiar a tabla compacta'}
                        >
                            {compactMode ? <><Grid size={12} /> Detalle</> : <><List size={12} /> Compacta</>}
                        </button>
                    </div>
                )}

                {/* Listado de Imágenes / Piezas */}
                <div className="carteles-scroll-list">
                    {draft.carteles?.map((item, idx) => {
                        const thumbSrc = resolveThumbSrc(item.thumbnailUrl);
                        const hasValidThumb = Boolean(thumbSrc && !brokenThumbs[idx]);
                        const isZeroSize = (item.medidas?.ancho || 0) <= 0 || (item.medidas?.alto || 0) <= 0;
                        const isExpanded = !compactMode || expandedIdx === idx;

                        if (compactMode && !isExpanded) {
                            return (
                                <div
                                    key={idx}
                                    className="cartel-compact-row"
                                    onClick={() => setExpandedIdx(idx)}
                                    title="Clic para desplegar controles de escala y copias"
                                >
                                    <div className="compact-thumb">
                                        {hasValidThumb ? (
                                            <img
                                                src={thumbSrc}
                                                alt=""
                                                onError={() => setBrokenThumbs(p => ({ ...p, [idx]: true }))}
                                            />
                                        ) : (
                                            <span>{item.format || 'IMG'}</span>
                                        )}
                                    </div>
                                    <span className="compact-idx">#{idx + 1}</span>
                                    <span className="compact-name" title={item.originalName}>{item.originalName}</span>
                                    <span className="compact-dims">
                                        {item.medidas.ancho}×{item.medidas.alto}m
                                    </span>
                                    <span className="compact-Copies">x{item.copias || 1}</span>
                                    <span className="compact-price">
                                        ${(item.precioCalculado || 0).toLocaleString('es-AR')}
                                    </span>
                                    <ChevronDown size={14} className="compact-chevron" />
                                </div>
                            );
                        }

                        return (
                            <div key={idx} className="cartel-item-card">
                                {compactMode && (
                                    <div className="cartel-collapse-header" onClick={() => setExpandedIdx(null)}>
                                        <span>Pieza #{idx + 1} seleccionada</span>
                                        <ChevronUp size={14} />
                                    </div>
                                )}

                                {/* Parte Superior: Miniatura + Información Principal */}
                                <div className="cartel-top-main">
                                    <div className="cartel-preview-box">
                                        {hasValidThumb ? (
                                            <img
                                                src={thumbSrc}
                                                alt=""
                                                className="cartel-thumb-img"
                                                onError={() => setBrokenThumbs(p => ({ ...p, [idx]: true }))}
                                            />
                                        ) : (
                                            <div className="cartel-thumb-placeholder">
                                                <ImageIcon size={22} />
                                                <span>{item.format || 'IMG'}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="cartel-details-box">
                                        {/* Fila 1: Índice + Nombre de Archivo */}
                                        <div className="cartel-filename-row" title={item.originalName}>
                                            <span className="cartel-index-badge">#{idx + 1}</span>
                                            <span className="cartel-name">{item.originalName}</span>
                                        </div>

                                        {/* Fila 2: Medidas y Precio Individual */}
                                        <div className="cartel-primary-metrics">
                                            {!isZeroSize ? (
                                                <span className="measure-tag">
                                                    📐 {item.medidas.ancho} × {item.medidas.alto} m
                                                    {item.rotated ? ' (90°)' : ''}
                                                </span>
                                            ) : (
                                                <div className="manual-dims-inline">
                                                    <span>📐</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Ancho m"
                                                        value={item.medidas.ancho || ''}
                                                        onChange={(e) => handleManualDimensionChange(idx, 'ancho', e.target.value)}
                                                        className="input-dim-mini"
                                                    />
                                                    <span>×</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Alto m"
                                                        value={item.medidas.alto || ''}
                                                        onChange={(e) => handleManualDimensionChange(idx, 'alto', e.target.value)}
                                                        className="input-dim-mini"
                                                    />
                                                    <span>m</span>
                                                </div>
                                            )}

                                            <span className="item-price-tag">
                                                ${(item.precioCalculado || 0).toLocaleString('es-AR')}
                                            </span>
                                        </div>

                                        {/* Fila 3: Píldoras Técnicas Horizontales (Nunca se parten verticalmente) */}
                                        <div className="cartel-tech-pills">
                                            <span className="badge-tech">{item.dpi || 72} DPI</span>
                                            <span className="badge-tech">{item.colorMode || 'CMYK'}</span>
                                            <span className="badge-tech badge-bobina">
                                                Bobina {item.bobinaAsignada || 1.37}m
                                            </span>
                                            <span className="badge-tech badge-ml">
                                                {item.consumoEstimado || 0} ml ({item.m2Estimado || 0} m²)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Alerta de Escala 1:10 si corresponde */}
                                {item.scaleAlert && (
                                    <div className="scale-alert-badge" title={item.scaleReason}>
                                        <AlertTriangle size={13} />
                                        <span>Posible diseño en escala 1:10 ({item.dpi} DPI)</span>
                                    </div>
                                )}

                                {/* Barra Inferior Completa: Escala + Copias */}
                                <div className="cartel-bottom-controls">
                                    <div className="scale-selector-bar">
                                        <span className="scale-label">Escala:</span>
                                        <div className="scale-btn-group">
                                            <button
                                                type="button"
                                                className={`btn-scale ${item.scaleFactor === 1 ? 'active' : ''}`}
                                                onClick={() => handleScaleChange(idx, 1)}
                                            >
                                                1:1
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn-scale ${item.scaleFactor === 10 ? 'active highlight-rec' : ''}`}
                                                onClick={() => handleScaleChange(idx, 10)}
                                            >
                                                1:10{item.scaleAlert ? ' ⭐' : ''}
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn-scale ${item.scaleFactor === 20 ? 'active' : ''}`}
                                                onClick={() => handleScaleChange(idx, 20)}
                                            >
                                                1:20
                                            </button>
                                        </div>
                                    </div>

                                    <div className="copies-selector-bar">
                                        <span className="scale-label">Copias:</span>
                                        <div className="copies-stepper">
                                            <button
                                                type="button"
                                                className="btn-copy-step"
                                                onClick={() => handleCopiesChange(idx, -1)}
                                            >
                                                −
                                            </button>
                                            <span className="copies-val">{item.copias || 1}</span>
                                            <button
                                                type="button"
                                                className="btn-copy-step"
                                                onClick={() => handleCopiesChange(idx, 1)}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {item.sha256 && (
                                    <div className="sha256-row" title={`Hash SHA-256 Original: ${item.sha256}`}>
                                        <ShieldCheck size={11} className="icon-sha" />
                                        <code>SHA-256: {item.sha256.slice(0, 14)}…</code>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Resumen de Costo y Consumo con Desglose de Bobinas */}
                <div className="order-summary-box">
                    <div className="summary-row">
                        <span className="summary-label">Desglose por Bobina:</span>
                        <div className="bobinas-chips-list">
                            {bobinasBreakdown.map((b, bi) => (
                                <span key={bi} className="bobina-chip">
                                    {b.ml} ml en Bobina {b.bobina}m
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="summary-row">
                        <span className="summary-label">Consumo Lineal Total:</span>
                        <strong className="summary-val">{draft.consumoEstimado} ml</strong>
                    </div>
                    <div className="summary-row">
                        <span className="summary-label">Superficie Total:</span>
                        <span className="summary-val">{draft.totalM2} m²</span>
                    </div>
                    <div className="summary-row total-highlight">
                        <span className="summary-label">Precio Total Cotizado:</span>
                        <div className="price-edit-box">
                            <span className="currency-symbol">$</span>
                            <input
                                type="number"
                                value={draft.total}
                                onChange={(e) => setDraft(prev => ({ ...prev, total: parseFloat(e.target.value) || 0 }))}
                                className="input-price-edit"
                                title="Precio editable antes de confirmar"
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="card-error-banner">
                        <AlertTriangle size={15} />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            <div className="order-card-actions">
                <button
                    type="button"
                    className="btn-open-modal"
                    onClick={handleOpenInModal}
                    title="Abrir este borrador en el modal completo de Nuevo Pedido"
                >
                    <Edit3 size={14} /> Abrir en Modal
                </button>
                <button
                    type="button"
                    className="btn-confirm-order"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <RefreshCw size={15} className="icon-spin" /> Creando...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={15} /> Confirmar Orden
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default XanaSmartOrderCard;
