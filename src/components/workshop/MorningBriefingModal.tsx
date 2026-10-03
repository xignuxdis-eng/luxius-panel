import React, { useState, useEffect } from 'react';
import { API_URL, getAuthHeaders } from '@data/db';
import { 
    Sun, Send, CheckCircle2, AlertTriangle, Clock, 
    Layers, Truck, ShieldAlert, Sparkles, X, RefreshCw
} from 'lucide-react';
import './MorningBriefingModal.css';

interface MorningBriefingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface BriefingData {
    ok: boolean;
    date: string;
    time: string;
    total_orders: number;
    total_ml: number;
    urgent_count: number;
    deliveries_today_count: number;
    urgentes: Array<{
        id: number | string;
        ot: string;
        cliente: string;
        material: string;
        ml: number;
        estado: string;
    }>;
    entregas_hoy: Array<{
        id: number | string;
        ot: string;
        cliente: string;
        material: string;
        ml: number;
    }>;
    material_demands: Array<{
        label: string;
        ml: number;
        count: number;
    }>;
    stock_alerts: Array<{
        codigo: string;
        desc: string;
        stock: number;
        minimo: number;
        unidad: string;
    }>;
    recommendation: string;
    markdown: string;
}

export default function MorningBriefingModal({ isOpen, onClose }: MorningBriefingModalProps) {
    const [data, setData] = useState<BriefingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sendingTelegram, setSendingTelegram] = useState(false);
    const [telegramSent, setTelegramSent] = useState(false);

    const loadBriefing = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/production/briefing`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.ok) {
                setData(json);
            } else {
                throw new Error(json.error || 'Error al obtener briefing');
            }
        } catch (err: any) {
            console.error('[Briefing] Error cargando datos:', err);
            setError(err.message || 'No se pudo conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadBriefing();
            setTelegramSent(false);
        }
    }, [isOpen]);

    const handleSendTelegram = async () => {
        setSendingTelegram(true);
        try {
            const res = await fetch(`${API_URL}/telegram/briefing/trigger`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' })
            });
            if (res.ok) {
                setTelegramSent(true);
                setTimeout(() => setTelegramSent(false), 5000);
            } else {
                alert('No se pudo enviar el reporte por Telegram. Verifica que el bot esté configurado.');
            }
        } catch (err) {
            console.error('Error enviando a Telegram:', err);
            alert('Error al conectar con Telegram API');
        } finally {
            setSendingTelegram(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="briefing-modal-overlay" onClick={onClose}>
            <div className="briefing-modal-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="briefing-modal-header">
                    <div className="briefing-title-group">
                        <div className="briefing-sun-badge">
                            <Sun className="briefing-sun-icon" />
                        </div>
                        <div>
                            <h2>Briefing Matutino de Producción</h2>
                            <p className="briefing-subtitle">
                                <span>{data?.date || 'Hoy'}</span> · <span>{data?.time ? `${data.time} ART` : ''}</span> · 
                                <span className="briefing-ai-tag"><Sparkles className="briefing-sparkle" /> Xana Intelligence</span>
                            </p>
                        </div>
                    </div>
                    <div className="briefing-header-actions">
                        <button className="briefing-icon-btn" onClick={loadBriefing} title="Recargar">
                            <RefreshCw className={loading ? 'spin' : ''} size={18} />
                        </button>
                        <button className="briefing-close-btn" onClick={onClose} title="Cerrar">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="briefing-modal-body">
                    {loading && (
                        <div className="briefing-loading-state">
                            <RefreshCw className="spin" size={32} />
                            <p>Consultando base de datos de producción y analizando bobinas...</p>
                        </div>
                    )}

                    {error && (
                        <div className="briefing-error-state">
                            <AlertTriangle size={32} color="#ef4444" />
                            <p>{error}</p>
                            <button className="btn-retry" onClick={loadBriefing}>Reintentar</button>
                        </div>
                    )}

                    {!loading && data && (
                        <>
                            {/* KPI Grid */}
                            <div className="briefing-kpi-grid">
                                <div className="briefing-kpi-card">
                                    <span className="kpi-label">Metros Lineales</span>
                                    <span className="kpi-value text-emerald">{data.total_ml} <small>ml</small></span>
                                    <span className="kpi-sub">estimados en cola</span>
                                </div>
                                <div className="briefing-kpi-card">
                                    <span className="kpi-label">Órdenes Activas</span>
                                    <span className="kpi-value text-sky">{data.total_orders} <small>OTs</small></span>
                                    <span className="kpi-sub">en proceso de taller</span>
                                </div>
                                <div className={`briefing-kpi-card ${data.urgent_count > 0 ? 'is-urgent' : ''}`}>
                                    <span className="kpi-label">Urgencias / VIP</span>
                                    <span className="kpi-value text-rose">{data.urgent_count}</span>
                                    <span className="kpi-sub">{data.urgent_count > 0 ? 'prioridad máxima' : 'al día'}</span>
                                </div>
                                <div className="briefing-kpi-card">
                                    <span className="kpi-label">Entregas de Hoy</span>
                                    <span className="kpi-value text-amber">{data.deliveries_today_count}</span>
                                    <span className="kpi-sub">comprometidas</span>
                                </div>
                            </div>

                            {/* Recomendación Xana */}
                            <div className="briefing-recommendation-box">
                                <div className="recommendation-header">
                                    <Sparkles size={16} className="text-emerald" />
                                    <h4>Recomendación Operativa de Xana</h4>
                                </div>
                                <p className="recommendation-text">{data.recommendation}</p>
                            </div>

                            {/* Demanda de Bobinas */}
                            <div className="briefing-section">
                                <div className="section-title">
                                    <Layers size={18} />
                                    <h3>Demanda por Bobina / Material (Tandas Óptimas)</h3>
                                </div>
                                <div className="demands-list">
                                    {data.material_demands.map((m, idx) => (
                                        <div key={idx} className="demand-row">
                                            <div className="demand-info">
                                                <span className="demand-name">{m.label}</span>
                                                <span className="demand-count">{m.count} trabajo(s)</span>
                                            </div>
                                            <div className="demand-bar-wrap">
                                                <div 
                                                    className="demand-bar-fill" 
                                                    style={{ width: `${Math.min(100, (m.ml / (data.total_ml || 1)) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="demand-ml">{m.ml.toFixed(1)} ml</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Urgencias si las hay */}
                            {data.urgentes.length > 0 && (
                                <div className="briefing-section">
                                    <div className="section-title text-rose">
                                        <ShieldAlert size={18} />
                                        <h3>🔥 Órdenes Urgentes en Cola</h3>
                                    </div>
                                    <div className="urgent-cards-list">
                                        {data.urgentes.map((u, i) => (
                                            <div key={i} className="urgent-mini-card">
                                                <span className="urgent-badge">🚨 {u.ot}</span>
                                                <span className="urgent-client">{u.cliente}</span>
                                                <span className="urgent-mat">{u.material} ({u.ml} ml)</span>
                                                <span className="urgent-status">{u.estado}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stock bajo mínimo si hay */}
                            {data.stock_alerts.length > 0 && (
                                <div className="briefing-section">
                                    <div className="section-title text-amber">
                                        <AlertTriangle size={18} />
                                        <h3>⚠️ Insumos Críticos Bajo el Mínimo</h3>
                                    </div>
                                    <div className="stock-alert-pills">
                                        {data.stock_alerts.map((a, i) => (
                                            <span key={i} className="stock-pill">
                                                🔴 <strong>{a.codigo}</strong>: {a.stock} {a.unidad} (mín. {a.minimo})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="briefing-modal-footer">
                    <button
                        className={`btn-send-telegram ${telegramSent ? 'is-sent' : ''}`}
                        onClick={handleSendTelegram}
                        disabled={sendingTelegram || !data}
                    >
                        {sendingTelegram ? (
                            <>
                                <RefreshCw className="spin" size={16} /> Enviando a Telegram...
                            </>
                        ) : telegramSent ? (
                            <>
                                <CheckCircle2 size={16} /> ¡Enviado a tu Celular!
                            </>
                        ) : (
                            <>
                                <Send size={16} /> 📲 Enviar Reporte a Telegram
                            </>
                        )}
                    </button>
                    <button className="btn-close-briefing" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
