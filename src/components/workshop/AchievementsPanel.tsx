// AchievementsPanel.tsx - Panel de logros "estilo WoW" del Print Den (Bloque F5)
// Muestra logros calculados con datos REALES de las órdenes. Se cierra con la X, Escape o clic fuera.

import React, { useEffect, useRef } from 'react';
import { TIER_COLOR, type Achievement } from './workshopAchievements';

export interface AchievementsPanelProps {
    list: Achievement[];
    onClose: () => void;
}

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ list, onClose }) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            const el = ref.current;
            if (el && e.target instanceof Node && el.contains(e.target)) return;
            // el clic en el botón 🏆 de la barra no cuenta como "fuera" (lo maneja el propio botón)
            if (e.target instanceof Element && e.target.closest('[data-achievements-toggle]')) return;
            closeRef.current();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeRef.current();
        };
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown, true);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    const done = list.filter((a) => a.unlocked).length;
    const sorted = [...list].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));

    return (
        <div
            ref={ref}
            id="achievements-panel"
            role="dialog"
            aria-label="Logros del taller"
            style={{
                position: 'absolute',
                top: 14,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'min(520px, calc(100% - 28px))',
                maxHeight: 'calc(100% - 28px)',
                overflowY: 'auto',
                zIndex: 25,
                background: 'linear-gradient(180deg, #1b1410 0%, #120d09 100%)',
                border: '2px solid #c8a24a',
                borderRadius: 8,
                boxShadow: '0 12px 36px rgba(0,0,0,0.8), inset 0 0 0 1px #3b2a14',
                color: '#f1e4c3',
                fontFamily: 'monospace',
                fontSize: 12,
                padding: 12,
                boxSizing: 'border-box'
            }}
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar logros"
                style={{ position: 'absolute', top: 6, right: 8, background: 'transparent', border: 'none', color: '#c8a24a', fontSize: 16, cursor: 'pointer' }}
            >
                ✕
            </button>
            <div style={{ color: '#ffd100', fontWeight: 800, fontSize: 15 }}>🏆 Logros del taller</div>
            <div style={{ color: '#9ca3af', margin: '2px 0 8px' }}>
                {done} de {list.length} desbloqueados · calculados con las órdenes reales del sistema
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 6 }}>
                {sorted.map((a) => {
                    const color = TIER_COLOR[a.tier];
                    const pct = Math.round((a.progress / a.target) * 100);
                    return (
                        <div
                            key={a.id}
                            style={{
                                border: `1px solid ${a.unlocked ? color : '#3b2a14'}`,
                                borderRadius: 6,
                                padding: 8,
                                background: a.unlocked ? '#1a130c' : '#0c0805',
                                opacity: a.unlocked ? 1 : 0.7,
                                boxShadow: a.unlocked ? `0 0 8px ${color}55` : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ fontSize: 22, filter: a.unlocked ? 'none' : 'grayscale(1)' }}>{a.icon}</div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ color, fontWeight: 800 }}>{a.title}</div>
                                    <div style={{ color: '#cbd5e1' }}>{a.description}</div>
                                </div>
                            </div>
                            <div style={{ marginTop: 6, height: 5, background: '#2a1f12', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: a.unlocked ? color : '#6b7280' }} />
                            </div>
                            <div style={{ marginTop: 2, display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: 10 }}>
                                <span>{a.tier}</span>
                                <span>{a.unlocked ? '✔ desbloqueado' : `${a.progress} / ${a.target}`}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AchievementsPanel;
