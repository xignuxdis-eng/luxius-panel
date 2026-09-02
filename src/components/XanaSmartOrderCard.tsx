import React, { useState } from 'react';
import { 
    CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, 
    Layers, Image as ImageIcon, Sparkles, Edit3, ShieldCheck 
} from 'lucide-react';
import { API_URL } from '../data/db';
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
    const [draft, setDraft] = useState<SmartDraftOrder>(initialDraft);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Actualiza la escala de una pieza especifica y recalcula totales
    const handleScaleChange = (index: number, newScale: number) => {
        setDraft(prev => {
            const updatedCarteles = [...prev.carteles];
            const item = { ...updatedCarteles[index] };
            
            item.scaleFactor = newScale;
            item.medidas = {
                ancho: Number((item.raw_medidas.ancho * newScale).toFixed(3)),
                alto: Number((item.raw_medidas.alto * newScale).toFixed(3))
            };
            
            // Recalcular bobina optima
            const minDim = Math.min(item.medidas.ancho, item.medidas.alto);
            const maxDim = Math.max(item.medidas.ancho, item.medidas.alto);
            
            const rolls = [1.00, 1.05, 1.27, 1.37, 1.52, 1.60, 1.80, 2.20, 3.20];
            let assigned = 1.37;
            for (const r of rolls) {
                if (r >= minDim) {
                    assigned = r;
                    break;
                }
            }
            item.bobinaAsignada = assigned;
            item.consumoEstimado = Number((maxDim * item.copias).toFixed(2));
            item.m2Estimado = Number((item.medidas.ancho * item.medidas.alto * item.copias).toFixed(2));
            
            updatedCarteles[index] = item;
            
            // Recalcular consumo total y precio
            const totalConsumo = updatedCarteles.reduce((acc, c) => acc + c.consumoEstimado, 0);
            const totalM2 = updatedCarteles.reduce((acc, c) => acc + c.m2Estimado, 0);
            const newTotal = Number((totalConsumo * prev.precioMl).toFixed(2));
            
            return {
                ...prev,
                carteles: updatedCarteles,
                ancho: updatedCarteles[0]?.medidas.ancho || prev.ancho,
                alto: updatedCarteles[0]?.medidas.alto || prev.alto,
                bobinaAsignada: updatedCarteles[0]?.bobinaAsignada || prev.bobinaAsignada,
                consumoEstimado: Number(totalConsumo.toFixed(2)),
                totalM2: Number(totalM2.toFixed(2)),
                total: newTotal
            };
        });
    };

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
                <span className="badge-material">{draft.material} · {draft.calidad}</span>
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
                                        📐 {item.medidas.ancho} x {item.medidas.alto} m
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

                {/* Resumen de Costo y Consumo */}
                <div className="order-summary-box">
                    <div className="summary-row">
                        <span>Consumo Lineal:</span>
                        <strong>{draft.consumoEstimado} ml</strong>
                    </div>
                    <div className="summary-row">
                        <span>Superficie Total:</span>
                        <span>{draft.totalM2} m²</span>
                    </div>
                    <div className="summary-row total-highlight">
                        <span>Precio Total Cotizado:</span>
                        <span className="price-tag">${draft.total?.toLocaleString('es-AR')}</span>
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
