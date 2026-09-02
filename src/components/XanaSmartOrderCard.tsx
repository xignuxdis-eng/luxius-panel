import React, { useState, useMemo } from 'react';
import { 
    CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, 
    Layers, Image as ImageIcon, Sparkles, Edit3, ShieldCheck, DollarSign 
} from 'lucide-react';
import { API_URL, getMateriales, getCalidades } from '../data/db';
import { calculateItemPriceDetailed, round2 } from '@/utils/pricingCalculator';
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

export const XanaSmartOrderCard: React.FC<XanaSmartOrderCardProps> = ({ 
    initialDraft, 
    onOrderConfirmed 
}) => {
    const availableMaterials = useMemo(() => {
        return getMateriales().filter(m => m.habilitado !== false && !['tinta', 'solvente'].includes((m.tipo || '').toLowerCase()));
    }, []);

    const availableCalidades = useMemo(() => {
        return getCalidades().filter(c => c.habilitado !== false);
    }, []);

    // Inicializar y recalcular con el motor oficial de NuevoPedidoModal
    const [draft, setDraft] = useState<SmartDraftOrder>(() => {
        const matCode = initialDraft.material || 'VV';
        let totalCost = 0;
        let totalML = 0;
        let totalM2 = 0;

        const recalculatedCarteles = (initialDraft.carteles || []).map(item => {
            const calc = calculateItemPriceDetailed(
                matCode,
                item.medidas.ancho,
                item.medidas.alto,
                item.copias || 1,
                {},
                initialDraft.cliente_id || undefined
            );

            const itemM2 = round2(item.medidas.ancho * item.medidas.alto * (item.copias || 1));
            totalCost += calc.subtotal;
            totalML += calc.consumoEstimado;
            totalM2 += itemM2;

            return {
                ...item,
                bobinaAsignada: calc.bobinaAsignada || item.bobinaAsignada,
                consumoEstimado: calc.consumoEstimado,
                m2Estimado: itemM2,
                precioCalculado: calc.subtotal,
                rotated: calc.rotated
            };
        });

        return {
            ...initialDraft,
            carteles: recalculatedCarteles,
            bobinaAsignada: recalculatedCarteles[0]?.bobinaAsignada || initialDraft.bobinaAsignada,
            consumoEstimado: round2(totalML),
            totalM2: round2(totalM2),
            total: totalCost > 0 ? totalCost : initialDraft.total
        };
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Recalcular todo ante cambio de material
    const handleMaterialChange = (newMatCode: string) => {
        setDraft(prev => {
            let totalCost = 0;
            let totalML = 0;
            let totalM2 = 0;

            const updatedCarteles = (prev.carteles || []).map(item => {
                const calc = calculateItemPriceDetailed(
                    newMatCode,
                    item.medidas.ancho,
                    item.medidas.alto,
                    item.copias || 1,
                    {},
                    prev.cliente_id || undefined
                );

                const itemM2 = round2(item.medidas.ancho * item.medidas.alto * (item.copias || 1));
                totalCost += calc.subtotal;
                totalML += calc.consumoEstimado;
                totalM2 += itemM2;

                return {
                    ...item,
                    tipo: newMatCode,
                    bobinaAsignada: calc.bobinaAsignada || item.bobinaAsignada,
                    consumoEstimado: calc.consumoEstimado,
                    m2Estimado: itemM2,
                    precioCalculado: calc.subtotal,
                    rotated: calc.rotated
                };
            });

            return {
                ...prev,
                material: newMatCode,
                carteles: updatedCarteles,
                bobinaAsignada: updatedCarteles[0]?.bobinaAsignada || prev.bobinaAsignada,
                consumoEstimado: round2(totalML),
                totalM2: round2(totalM2),
                total: totalCost
            };
        });
    };

    // Actualiza la escala de una pieza especifica y recalcula totales con el motor oficial
    const handleScaleChange = (index: number, newScale: number) => {
        setDraft(prev => {
            const matCode = prev.material || 'VV';
            const updatedCarteles = [...prev.carteles];
            const item = { ...updatedCarteles[index] };
            
            item.scaleFactor = newScale;
            item.medidas = {
                ancho: round2(item.raw_medidas.ancho * newScale),
                alto: round2(item.raw_medidas.alto * newScale)
            };
            
            const calc = calculateItemPriceDetailed(
                matCode,
                item.medidas.ancho,
                item.medidas.alto,
                item.copias || 1,
                {},
                prev.cliente_id || undefined
            );
            
            item.bobinaAsignada = calc.bobinaAsignada || item.bobinaAsignada;
            item.consumoEstimado = calc.consumoEstimado;
            item.m2Estimado = round2(item.medidas.ancho * item.medidas.alto * (item.copias || 1));
            item.precioCalculado = calc.subtotal;
            item.rotated = calc.rotated;
            
            updatedCarteles[index] = item;
            
            let totalCost = 0;
            let totalML = 0;
            let totalM2 = 0;

            updatedCarteles.forEach(c => {
                const cCalc = calculateItemPriceDetailed(
                    matCode,
                    c.medidas.ancho,
                    c.medidas.alto,
                    c.copias || 1,
                    {},
                    prev.cliente_id || undefined
                );
                totalCost += cCalc.subtotal;
                totalML += cCalc.consumoEstimado;
                totalM2 += c.m2Estimado;
            });

            return {
                ...prev,
                carteles: updatedCarteles,
                ancho: updatedCarteles[0]?.medidas.ancho || prev.ancho,
                alto: updatedCarteles[0]?.medidas.alto || prev.alto,
                bobinaAsignada: updatedCarteles[0]?.bobinaAsignada || prev.bobinaAsignada,
                consumoEstimado: round2(totalML),
                totalM2: round2(totalM2),
                total: totalCost
            };
        });
    };

    // Desglose de consumo por bobina
    const bobinasBreakdown = useMemo(() => {
        const map = new Map<number, number>();
        (draft.carteles || []).forEach(c => {
            const b = c.bobinaAsignada || 1.37;
            const current = map.get(b) || 0;
            map.set(b, round2(current + c.consumoEstimado));
        });
        return Array.from(map.entries()).map(([bobina, ml]) => ({ bobina, ml }));
    }, [draft.carteles]);

    const handleConfirmOrder = async () => {
        setIsSubmitting(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('luxius_token') || '';
            const res = await fetch(`${API_URL}/xana/smart-order/confirm`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(draft)
            });
            
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al confirmar la orden');
            }
            
            setConfirmedOrder(data.order);
            if (onOrderConfirmed) {
                onOrderConfirmed(data.order);
            }
            
            // Disparar evento global para actualizar tableros
            window.dispatchEvent(new CustomEvent('luxius:order-created', { detail: data.order }));
        } catch (err: any) {
            setError(err.message || 'Error inesperado al crear la orden.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenInModal = () => {
        window.dispatchEvent(new CustomEvent('luxius:open-order-modal', { detail: draft }));
    };

    if (confirmedOrder) {
        return (
            <div className="xana-order-card confirmed animate-scale-up">
                <div className="order-card-header success">
                    <CheckCircle2 size={24} className="icon-success" />
                    <div>
                        <h4>¡Orden Creada Exitosamente!</h4>
                        <span className="order-number">
                            N° {confirmedOrder.numero_presupuesto || confirmedOrder.id?.slice(0, 8)}
                        </span>
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
                            <span className="stat-val">{draft.consumoEstimado} ml</span>
                        </div>
                    </div>
                </div>
                <div className="order-card-footer">
                    <button 
                        className="btn-view-order"
                        onClick={() => window.location.href = '#/entrada'}
                    >
                        <ExternalLink size={16} /> Ver en Entrada
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="xana-order-card animate-fade-in">
            <div className="order-card-header">
                <div className="header-title-box">
                    <Sparkles size={18} className="icon-sparkle" />
                    <h4>Borrador Inteligente Xana</h4>
                </div>
                
                {/* Selector rápido de material */}
                <div className="material-selector-box">
                    <select 
                        value={draft.material} 
                        onChange={(e) => handleMaterialChange(e.target.value)}
                        className="select-material-badge"
                    >
                        {availableMaterials.map(m => (
                            <option key={m.codigo} value={m.codigo}>
                                {m.descripcion || m.codigo}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="order-card-body">
                <div className="client-badge-bar">
                    <span className="client-name">{draft.cliente_nombre}</span>
                    <span className="item-count">{draft.carteles?.length || 1} pieza(s)</span>
                </div>

                {/* Lista de Piezas / Archivos con Selector de Escala */}
                <div className="carteles-scroll-list">
                    {draft.carteles?.map((item, idx) => (
                        <div key={idx} className="cartel-item-card">
                            <div className="cartel-preview-box">
                                {item.thumbnailUrl ? (
                                    <img 
                                        src={item.thumbnailUrl.startsWith('http') ? item.thumbnailUrl : `${API_URL.replace('/api', '')}${item.thumbnailUrl}`} 
                                        alt={item.originalName} 
                                        className="cartel-thumb-img"
                                    />
                                ) : (
                                    <div className="cartel-thumb-placeholder">
                                        <ImageIcon size={28} />
                                        <span>{item.format}</span>
                                    </div>
                                )}
                            </div>

                            <div className="cartel-details-box">
                                <div className="cartel-filename-row" title={item.originalName}>
                                    <span className="cartel-name">{item.originalName}</span>
                                    <span className="cartel-tech-badges">
                                        <span className="badge-tech">{item.dpi} DPI</span>
                                        <span className="badge-tech">{item.colorMode}</span>
                                    </span>
                                </div>

                                {/* ALERTA DE ESCALA HEURÍSTICA 3D */}
                                {item.scaleAlert && (
                                    <div className="scale-alert-badge" title={item.scaleReason}>
                                        <AlertTriangle size={14} />
                                        <span>Posible Escala 1:10 detectada</span>
                                    </div>
                                )}

                                {/* SELECTOR DE ESCALA HUMAN-IN-THE-LOOP */}
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
                                            1:10 {item.scaleAlert && '⭐'}
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

                                <div className="cartel-calc-row">
                                    <span className="measure-tag">
                                        📐 {item.medidas.ancho} x {item.medidas.alto} m {item.rotated ? '(Rotado 90°)' : ''}
                                    </span>
                                    <span className="bobina-tag">
                                        🔄 Bobina: {item.bobinaAsignada}m
                                    </span>
                                </div>

                                <div className="sha256-row" title={`Hash SHA-256 Original: ${item.sha256}`}>
                                    <ShieldCheck size={12} className="icon-sha" />
                                    <code>{item.sha256 ? `${item.sha256.slice(0, 16)}...` : 'Verificando hash'}</code>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Resumen de Costo y Consumo con Desglose de Bobinas */}
                <div className="order-summary-box">
                    <div className="summary-row">
                        <span>Desglose por Bobina:</span>
                        <div className="bobinas-chips-list">
                            {bobinasBreakdown.map((b, bi) => (
                                <span key={bi} className="bobina-chip">
                                    {b.ml} ml en Bobina {b.bobina}m
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="summary-row">
                        <span>Consumo Lineal Total:</span>
                        <strong>{draft.consumoEstimado} ml</strong>
                    </div>
                    <div className="summary-row">
                        <span>Superficie Total:</span>
                        <span>{draft.totalM2} m²</span>
                    </div>
                    <div className="summary-row total-highlight">
                        <span>Precio Total Cotizado:</span>
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
                        <AlertTriangle size={16} />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            <div className="order-card-actions">
                <button 
                    type="button"
                    className="btn-open-modal"
                    onClick={handleOpenInModal}
                    title="Editar detalles minuciosos en el modal de carga"
                >
                    <Edit3 size={15} /> Abrir en Modal
                </button>
                <button 
                    type="button"
                    className="btn-confirm-order"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <RefreshCw size={16} className="icon-spin" /> Creando...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={16} /> Confirmar y Crear Orden
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
export default XanaSmartOrderCard;
