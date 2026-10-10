// StationSheetCard.tsx - Ficha de una estación o máquina del Print Den (Bloque F2)
// Se abre al hacer clic en una estación/plotter. Muestra datos REALES: estado de la máquina, cola, m², próximas
// órdenes, alertas y producción de hoy. Se cierra con la X, con Escape o con un clic fuera.

import React, { useEffect, useRef } from 'react';
import type { Order } from '@/types/orden';
import type { StationConfig } from './types';
import { fmtM2, orderM2, type StationAlert, type StationStats } from './workshopAlerts';

export interface StationSheetCardProps {
    station: StationConfig;
    stats: StationStats;
    alerts: StationAlert[];
    isMachine: boolean;
    /** Si es false (p. ej. pantalla completa), se oculta el botón que abre el detalle completo. */
    canOpenDetail: boolean;
    onOpenDetail: () => void;
    onOpenOrder?: (order: Order) => void;
    onClose: () => void;
    /** Se llama cuando se cierra por un clic fuera (o Escape), antes de `onClose`. */
    onOutsideClose?: () => void;
}

const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 310,
    maxHeight: 'calc(100% - 28px)',
    overflowY: 'auto',
    zIndex: 20,
    background: 'linear-gradient(180deg, #0f1c2b 0%, #0a121c 100%)',
    border: '2px solid #38bdf8',
    borderRadius: 8,
    boxShadow: '0 12px 36px rgba(0,0,0,0.75), inset 0 0 0 1px #12354f',
    color: '#e2f1fb',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: 12,
    boxSizing: 'border-box'
};

const sectionTitle: React.CSSProperties = {
    color: '#7dd3fc',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    margin: '10px 0 4px'
};

const box: React.CSSProperties = {
    background: '#060b12',
    border: '1px solid #12354f',
    borderRadius: 4,
    padding: 6,
    lineHeight: 1.45
};

const ALERT_ICON: Record<string, string> = { stock: '📉', offline: '🔌', mantenimiento: '🛠️', atraso: '⏰', rebote: '↩️' };

export const StationSheetCard: React.FC<StationSheetCardProps> = ({
    station,
    stats,
    alerts,
    isMachine,
    canOpenDetail,
    onOpenDetail,
    onOpenOrder,
    onClose,
    onOutsideClose
}) => {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const closeRef = useRef({ onClose, onOutsideClose });
    closeRef.current = { onClose, onOutsideClose };

    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            const el = panelRef.current;
            if (el && e.target instanceof Node && el.contains(e.target)) return;
            closeRef.current.onOutsideClose?.();
            closeRef.current.onClose();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeRef.current.onClose();
        };
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown, true);
            document.removeEventListener('keydown', onKey);
        };
    }, [station.id]);

    const estado = station.estado || 'online';
    const stateLabel = estado === 'offline' ? 'DESCONECTADA' : estado === 'mantenimiento' ? 'EN MANTENIMIENTO' : 'EN LÍNEA';
    const stateColor = estado === 'offline' ? '#ef4444' : estado === 'mantenimiento' ? '#f59e0b' : '#22c55e';

    return (
        <div ref={panelRef} style={panelStyle} role="dialog" aria-label={`Ficha de ${station.title}`} id="station-sheet-card">
            <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar ficha"
                style={{ position: 'absolute', top: 6, right: 8, background: 'transparent', border: 'none', color: '#7dd3fc', fontSize: 16, cursor: 'pointer' }}
            >
                ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        border: `2px solid ${station.color}`,
                        boxShadow: `0 0 10px ${station.color}66`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        flexShrink: 0,
                        background: '#0a121c'
                    }}
                >
                    {station.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: 15, wordBreak: 'break-word' }}>{station.title}</div>
                    <div style={{ color: '#94a3b8' }}>{station.description}</div>
                </div>
            </div>

            {isMachine && (
                <div style={{ marginTop: 8 }}>
                    <span style={{ border: `1px solid ${stateColor}`, color: stateColor, borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>● {stateLabel}</span>
                </div>
            )}

            {alerts.length > 0 && (
                <>
                    <div style={{ ...sectionTitle, color: '#fbbf24' }}>Alertas ({alerts.length})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {alerts.map((a, i) => (
                            <div
                                key={`${a.kind}-${i}`}
                                style={{
                                    ...box,
                                    borderColor: a.severity === 'danger' ? '#7f1d1d' : '#78350f',
                                    background: a.severity === 'danger' ? '#1c0a0a' : '#1a1206'
                                }}
                            >
                                <div style={{ color: a.severity === 'danger' ? '#fca5a5' : '#fcd34d', fontWeight: 700 }}>
                                    {ALERT_ICON[a.kind] ?? '⚠️'} {a.title}
                                </div>
                                <div style={{ color: '#cbd5e1' }}>{a.detail}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div style={sectionTitle}>Ahora mismo</div>
            <div style={box}>
                <div>
                    Órdenes en esta estación: <b>{stats.queue}</b>
                </div>
                {stats.queue > 0 && (
                    <div>
                        Superficie pendiente: <b>{fmtM2(stats.queueM2)} m²</b>
                    </div>
                )}
                {stats.todayCount !== null && stats.todayM2 !== null && (
                    <div style={{ marginTop: 4, color: '#9ca3af' }}>
                        Hoy en esta máquina: {stats.todayCount} {stats.todayCount === 1 ? 'orden' : 'órdenes'} · {fmtM2(stats.todayM2)} m²
                        <div style={{ fontSize: 10, opacity: 0.8 }}>(órdenes pasadas a impreso o más, con última actualización hoy)</div>
                    </div>
                )}
            </div>

            {stats.next.length > 0 && (
                <>
                    <div style={sectionTitle}>Próximas órdenes</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {stats.next.map((o) => (
                            <button
                                key={o.id}
                                type="button"
                                onClick={() => onOpenOrder?.(o)}
                                disabled={!onOpenOrder}
                                style={{ ...box, textAlign: 'left', cursor: onOpenOrder ? 'pointer' : 'default', color: '#e2f1fb', font: 'inherit' }}
                            >
                                <div style={{ fontWeight: 700 }}>OT #{o.ot || o.id}</div>
                                <div style={{ color: '#94a3b8' }}>
                                    {o.clienteNombre || 'Sin cliente'} · {o.ancho}x{o.alto} m ({fmtM2(orderM2(o))} m²)
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {canOpenDetail && (
                <button
                    type="button"
                    onClick={onOpenDetail}
                    style={{
                        marginTop: 12,
                        width: '100%',
                        padding: '8px 10px',
                        background: '#0369a1',
                        color: '#fff',
                        border: '1px solid #38bdf8',
                        borderRadius: 6,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                    }}
                >
                    Abrir detalle completo
                </button>
            )}
        </div>
    );
};

export default StationSheetCard;
