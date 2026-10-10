// WorkerSheetCard.tsx - Ficha técnica "estilo WoW" del operario (se abre al hacer clic en el personaje)
// Muestra lo que está haciendo en este momento (datos reales del taller) y una ficha de FANTASÍA
// con estadísticas, fortalezas y debilidades (se aclara en pantalla).

import React, { useEffect, useMemo, useState } from 'react';
import type { WorkerSnapshot } from './workshopWorkers';
import { ROLE_LABEL, buildWorkerSheet, describeActivity } from './workshopSheets';

export interface WorkerSheetCardProps {
    workerId: string;
    /** Devuelve la foto actual del operario (se consulta periódicamente para mantener la actividad al día). */
    getSnapshot: (workerId: string) => WorkerSnapshot | undefined;
    /** Cantidad REAL de órdenes del sistema esperando a este rol. */
    waitingOrders: number;
    /** Si hay una orden asociada (la del viaje o la primera de su rol), permite abrirla. */
    onOpenOrder?: () => void;
    onClose: () => void;
}

const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 310,
    maxHeight: 'calc(100% - 28px)',
    overflowY: 'auto',
    zIndex: 20,
    background: 'linear-gradient(180deg, #1b1410 0%, #120d09 100%)',
    border: '2px solid #c8a24a',
    borderRadius: 8,
    boxShadow: '0 12px 36px rgba(0,0,0,0.75), inset 0 0 0 1px #3b2a14',
    color: '#f1e4c3',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: 12,
    boxSizing: 'border-box'
};

const sectionTitle: React.CSSProperties = {
    color: '#ffd100',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    margin: '10px 0 4px'
};

export const WorkerSheetCard: React.FC<WorkerSheetCardProps> = ({ workerId, getSnapshot, waitingOrders, onOpenOrder, onClose }) => {
    const [snap, setSnap] = useState<WorkerSnapshot | undefined>(() => getSnapshot(workerId));

    useEffect(() => {
        setSnap(getSnapshot(workerId));
        const t = window.setInterval(() => setSnap(getSnapshot(workerId)), 400);
        return () => window.clearInterval(t);
    }, [workerId, getSnapshot]);

    const sheet = useMemo(() => (snap ? buildWorkerSheet(snap) : null), [snap?.id, snap?.name, snap?.role]);

    if (!snap || !sheet) return null;

    return (
        <div style={panelStyle} role="dialog" aria-label={`Ficha técnica de ${snap.name}`} id="worker-sheet-card">
            <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar ficha"
                style={{
                    position: 'absolute',
                    top: 6,
                    right: 8,
                    background: 'transparent',
                    border: 'none',
                    color: '#c8a24a',
                    fontSize: 16,
                    cursor: 'pointer'
                }}
            >
                ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        border: `2px solid ${sheet.rarityColor}`,
                        background: `radial-gradient(circle at 50% 35%, ${snap.skinColor} 0 28%, ${snap.shirtColor} 29% 100%)`,
                        boxShadow: `0 0 10px ${sheet.rarityColor}88`,
                        flexShrink: 0
                    }}
                />
                <div style={{ minWidth: 0 }}>
                    <div style={{ color: sheet.rarityColor, fontWeight: 800, fontSize: 15, wordBreak: 'break-word' }}>{snap.name}</div>
                    <div style={{ color: '#ffd100' }}>{sheet.title}</div>
                    <div style={{ opacity: 0.85 }}>
                        Nivel {sheet.level} · {sheet.className}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ border: `1px solid ${sheet.rarityColor}`, color: sheet.rarityColor, borderRadius: 4, padding: '1px 6px' }}>
                    {sheet.rarity}
                </span>
                <span style={{ border: '1px solid #475569', color: '#cbd5e1', borderRadius: 4, padding: '1px 6px' }}>
                    Rol: {ROLE_LABEL[snap.role]}
                    {snap.roleFromUser ? '' : ' (asignado)'}
                </span>
            </div>

            <div style={sectionTitle}>Ahora mismo</div>
            <div style={{ background: '#0c0805', border: '1px solid #3b2a14', borderRadius: 4, padding: 6, lineHeight: 1.45 }}>
                {describeActivity(snap)}
                <div style={{ marginTop: 4, color: '#9ca3af' }}>
                    Órdenes esperando a su rol: <strong style={{ color: '#f8fafc' }}>{waitingOrders}</strong>
                </div>
            </div>

            <div style={sectionTitle}>Estadísticas</div>
            <div style={{ display: 'grid', gap: 4 }}>
                {sheet.stats.map((s) => (
                    <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '96px 1fr 26px', alignItems: 'center', gap: 6 }}>
                        <span>
                            {s.icon} {s.label}
                        </span>
                        <div style={{ background: '#0c0805', border: '1px solid #3b2a14', height: 9, borderRadius: 2 }}>
                            <div style={{ width: `${s.value}%`, height: '100%', background: s.color, borderRadius: 1 }} />
                        </div>
                        <span style={{ textAlign: 'right', color: s.color, fontWeight: 700 }}>{s.value}</span>
                    </div>
                ))}
            </div>

            <div style={sectionTitle}>Fortalezas</div>
            <ul style={{ margin: 0, paddingLeft: 16, color: '#86efac', lineHeight: 1.4 }}>
                {sheet.strengths.map((t) => (
                    <li key={t}>{t}</li>
                ))}
            </ul>

            <div style={sectionTitle}>Debilidades</div>
            <ul style={{ margin: 0, paddingLeft: 16, color: '#fca5a5', lineHeight: 1.4 }}>
                {sheet.weaknesses.map((t) => (
                    <li key={t}>{t}</li>
                ))}
            </ul>

            <div style={sectionTitle}>Equipo</div>
            <div style={{ color: sheet.rarityColor }}>⚔️ {sheet.gear}</div>

            <div style={{ marginTop: 10, fontStyle: 'italic', color: '#e5d3a1', borderTop: '1px solid #3b2a14', paddingTop: 6 }}>
                “{sheet.quote}”
            </div>

            {onOpenOrder && (
                <button
                    type="button"
                    onClick={onOpenOrder}
                    style={{
                        marginTop: 10,
                        width: '100%',
                        background: '#7c2d12',
                        color: '#fde68a',
                        border: '1px solid #c8a24a',
                        borderRadius: 4,
                        padding: '6px 8px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontWeight: 700
                    }}
                >
                    📜 Abrir su orden
                </button>
            )}

            <div style={{ marginTop: 8, fontSize: 10, color: '#7c7467', lineHeight: 1.35 }}>
                Las estadísticas, fortalezas y debilidades son de fantasía (divertidas, no reflejan el desempeño real). Lo que hace ahora y las órdenes en
                espera sí son datos del taller.
            </div>
        </div>
    );
};

export default WorkerSheetCard;
