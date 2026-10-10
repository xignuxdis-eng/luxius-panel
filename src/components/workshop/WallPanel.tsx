// WallPanel.tsx - Paneles que se abren al hacer clic en la pizarra "HOY EN EL TALLER" y en el reloj de pared.
// Pizarra: resumen real del día y lista de órdenes atrasadas. Reloj: hora y fecha reales, con acceso rápido a las
// alarmas (las mismas alertas reales de las estaciones: stock bajo, máquina offline, atrasos, rebotadas).
// Se cierra con la X, con Escape o con un clic fuera.

import React, { useEffect, useRef, useState } from 'react';
import type { Order } from '@/types/orden';
import { computeDaySummary, fmtM2, isOverdue, orderM2, type StationAlert } from './workshopAlerts';

export interface WallPanelProps {
    mode: 'board' | 'clock';
    orders: Order[];
    alerts: StationAlert[];
    stationTitle: (id: string) => string;
    getNow: () => Date;
    onOpenOrder?: (o: Order) => void;
    onFocusStation: (stationId: string) => void;
    onClose: () => void;
    onOutsideClose?: () => void;
}

const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 320,
    maxHeight: 'calc(100% - 28px)',
    overflowY: 'auto',
    zIndex: 20,
    background: 'linear-gradient(180deg, #10241d 0%, #0a1612 100%)',
    border: '2px solid #5b9e82',
    borderRadius: 8,
    boxShadow: '0 12px 36px rgba(0,0,0,0.75), inset 0 0 0 1px #1d4033',
    color: '#e2f5ec',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: 12,
    boxSizing: 'border-box'
};

const title: React.CSSProperties = { color: '#86efac', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', margin: '10px 0 4px' };
const box: React.CSSProperties = { background: '#060e0b', border: '1px solid #1d4033', borderRadius: 4, padding: 6, lineHeight: 1.45 };
const ALERT_ICON: Record<string, string> = { stock: '📉', offline: '🔌', mantenimiento: '🛠️', atraso: '⏰', rebote: '↩️' };

export const WallPanel: React.FC<WallPanelProps> = ({ mode, orders, alerts, stationTitle, getNow, onOpenOrder, onFocusStation, onClose, onOutsideClose }) => {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const closeRef = useRef({ onClose, onOutsideClose });
    closeRef.current = { onClose, onOutsideClose };
    const [now, setNow] = useState(getNow());

    useEffect(() => {
        const iv = window.setInterval(() => setNow(getNow()), 1000);
        return () => window.clearInterval(iv);
    }, [getNow]);

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
    }, [mode]);

    const summary = computeDaySummary(orders, now);
    const late = orders.filter((o) => isOverdue(o, now));
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateText = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div ref={panelRef} style={panelStyle} role="dialog" aria-label={mode === 'board' ? 'Hoy en el taller' : 'Reloj y alarmas'} id="wall-panel">
            <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                style={{ position: 'absolute', top: 6, right: 8, background: 'transparent', border: 'none', color: '#86efac', fontSize: 16, cursor: 'pointer' }}
            >
                ✕
            </button>

            {mode === 'board' ? (
                <>
                    <div style={{ color: '#f0fdf4', fontWeight: 800, fontSize: 15 }}>📋 Hoy en el taller</div>
                    <div style={{ color: '#7fb49c' }}>Datos reales del sistema</div>
                    <div style={title}>Resumen</div>
                    <div style={box}>
                        <div>
                            ✔ Entregadas hoy: <b>{summary.entregadasHoy}</b>
                        </div>
                        <div>
                            ▣ Producidos hoy: <b>{fmtM2(summary.m2Hoy)} m²</b>
                        </div>
                        <div>
                            ⏳ En cola de impresión: <b>{summary.enCola}</b>
                        </div>
                        <div style={{ color: summary.atrasadas > 0 ? '#fca5a5' : '#86efac' }}>
                            {summary.atrasadas > 0 ? '⚠' : '✔'} Atrasadas: <b>{summary.atrasadas}</b>
                        </div>
                    </div>
                    {late.length > 0 && (
                        <>
                            <div style={{ ...title, color: '#fca5a5' }}>Órdenes atrasadas</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {late.slice(0, 8).map((o) => (
                                    <button
                                        key={o.id}
                                        type="button"
                                        onClick={() => onOpenOrder?.(o)}
                                        disabled={!onOpenOrder}
                                        style={{ ...box, textAlign: 'left', cursor: onOpenOrder ? 'pointer' : 'default', color: '#e2f5ec', font: 'inherit', borderColor: '#7f1d1d' }}
                                    >
                                        <div style={{ fontWeight: 700 }}>OT #{o.ot || o.id}</div>
                                        <div style={{ color: '#9fc3b2' }}>
                                            {o.clienteNombre || 'Sin cliente'} · {fmtM2(orderM2(o))} m² · entrega {o.fechaEntrega}
                                        </div>
                                    </button>
                                ))}
                                {late.length > 8 && <div style={{ color: '#9fc3b2' }}>…y {late.length - 8} más</div>}
                            </div>
                        </>
                    )}
                    <div style={{ marginTop: 8, fontSize: 10, color: '#6b9a86' }}>
                        “Hoy” se calcula con la última actualización de cada orden.
                    </div>
                </>
            ) : (
                <>
                    <div style={{ color: '#f0fdf4', fontWeight: 800, fontSize: 28, letterSpacing: 2 }}>
                        {pad(now.getHours())}:{pad(now.getMinutes())}
                        <span style={{ fontSize: 16, color: '#7fb49c' }}>:{pad(now.getSeconds())}</span>
                    </div>
                    <div style={{ color: '#9fc3b2', textTransform: 'capitalize' }}>{dateText}</div>
                    <div style={{ ...title, color: alerts.length ? '#fbbf24' : '#86efac' }}>⏰ Alarmas ({alerts.length})</div>
                    {alerts.length === 0 ? (
                        <div style={box}>✔ Sin alarmas: stock, máquinas y entregas en orden.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {alerts.map((a, i) => (
                                <button
                                    key={`${a.stationId}-${a.kind}-${i}`}
                                    type="button"
                                    onClick={() => onFocusStation(a.stationId)}
                                    title={`Ir a ${stationTitle(a.stationId)}`}
                                    style={{
                                        ...box,
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        font: 'inherit',
                                        color: '#e2f5ec',
                                        borderColor: a.severity === 'danger' ? '#7f1d1d' : '#78350f',
                                        background: a.severity === 'danger' ? '#1c0a0a' : '#1a1206'
                                    }}
                                >
                                    <div style={{ color: a.severity === 'danger' ? '#fca5a5' : '#fcd34d', fontWeight: 700 }}>
                                        {ALERT_ICON[a.kind] ?? '⚠️'} {a.title}
                                    </div>
                                    <div style={{ color: '#cbd5e1' }}>{a.detail}</div>
                                    <div style={{ color: '#7fb49c', fontSize: 10 }}>→ {stationTitle(a.stationId)}</div>
                                </button>
                            ))}
                        </div>
                    )}
                    <div style={{ marginTop: 8, fontSize: 10, color: '#6b9a86' }}>Las alarmas son las alertas reales de las estaciones.</div>
                </>
            )}
        </div>
    );
};

export default WallPanel;
