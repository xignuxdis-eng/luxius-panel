// PetSheetCard.tsx - Ficha técnica de una mascota del Print Den (estilo WoW). TODO es de fantasía/decorativo.
// Se cierra con la X, con Escape o con un clic fuera. Muestra lo que está haciendo ahora y permite oír su sonido.

import React, { useEffect, useRef, useState } from 'react';
import type { PetProfile } from './workshopPet';

export interface PetSheetCardProps {
    profile: PetProfile;
    getActivity: () => string;
    onPlaySound: () => void;
    soundOn: boolean;
    onClose: () => void;
    onOutsideClose?: () => void;
}

const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 300,
    maxHeight: 'calc(100% - 28px)',
    overflowY: 'auto',
    zIndex: 20,
    background: 'linear-gradient(180deg, #1c1530 0%, #0f0b1c 100%)',
    border: '2px solid #a78bfa',
    borderRadius: 8,
    boxShadow: '0 12px 36px rgba(0,0,0,0.75), inset 0 0 0 1px #3b2a66',
    color: '#ede9fe',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: 12,
    boxSizing: 'border-box'
};

const sectionTitle: React.CSSProperties = {
    color: '#c4b5fd',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    margin: '10px 0 4px'
};

export const PetSheetCard: React.FC<PetSheetCardProps> = ({ profile, getActivity, onPlaySound, soundOn, onClose, onOutsideClose }) => {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const closeRef = useRef({ onClose, onOutsideClose });
    closeRef.current = { onClose, onOutsideClose };
    const [activity, setActivity] = useState(getActivity());

    useEffect(() => {
        const iv = window.setInterval(() => setActivity(getActivity()), 500);
        return () => window.clearInterval(iv);
    }, [getActivity]);

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
    }, [profile.id]);

    return (
        <div ref={panelRef} style={panelStyle} role="dialog" aria-label={`Ficha de ${profile.name}`} id="pet-sheet-card">
            <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar ficha"
                style={{ position: 'absolute', top: 6, right: 8, background: 'transparent', border: 'none', color: '#c4b5fd', fontSize: 16, cursor: 'pointer' }}
            >
                ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        border: '2px solid #a78bfa',
                        boxShadow: '0 0 10px #a78bfa66',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        flexShrink: 0,
                        background: '#120d22'
                    }}
                >
                    {profile.emoji}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#f5f3ff', fontWeight: 800, fontSize: 16 }}>{profile.name}</div>
                    <div style={{ color: '#c4b5fd' }}>
                        {profile.title} · Nivel {profile.level}
                    </div>
                    <div style={{ color: '#8b7fb0', fontSize: 11 }}>Mascota del taller · {profile.species === 'gato' ? 'Felino' : 'Canino'}</div>
                </div>
            </div>

            <div style={sectionTitle}>Ahora mismo</div>
            <div style={{ background: '#0a0715', border: '1px solid #3b2a66', borderRadius: 4, padding: 6 }}>{activity}</div>

            <div style={sectionTitle}>Estadísticas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {profile.stats.map((s) => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 82, color: '#ddd6fe' }}>{s.label}</span>
                        <div style={{ flex: 1, height: 8, background: '#0a0715', borderRadius: 3, border: '1px solid #3b2a66', overflow: 'hidden' }}>
                            <div style={{ width: `${s.value}%`, height: '100%', background: s.color }} />
                        </div>
                        <span style={{ width: 24, textAlign: 'right', color: '#f5f3ff', fontWeight: 700 }}>{s.value}</span>
                    </div>
                ))}
            </div>

            <div style={{ ...sectionTitle, color: '#86efac' }}>Fortalezas</div>
            <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.45 }}>
                {profile.strengths.map((t) => (
                    <li key={t}>{t}</li>
                ))}
            </ul>
            <div style={{ ...sectionTitle, color: '#fca5a5' }}>Debilidades</div>
            <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.45 }}>
                {profile.weaknesses.map((t) => (
                    <li key={t}>{t}</li>
                ))}
            </ul>

            <button
                type="button"
                onClick={onPlaySound}
                disabled={!soundOn}
                title={soundOn ? 'Escuchar a ' + profile.name : 'El sonido de animales está en OFF (botón de la barra superior)'}
                style={{
                    marginTop: 12,
                    width: '100%',
                    padding: '7px 10px',
                    background: soundOn ? '#6d28d9' : '#1f1a33',
                    color: soundOn ? '#fff' : '#7c6fa3',
                    border: '1px solid #a78bfa',
                    borderRadius: 6,
                    fontWeight: 700,
                    cursor: soundOn ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit'
                }}
            >
                {soundOn ? `🔊 Escuchar a ${profile.name}` : '🔇 Sonido de animales en OFF'}
            </button>
            <div style={{ marginTop: 8, fontSize: 10, color: '#7c6fa3' }}>Ficha de fantasía: las estadísticas son decorativas y no representan datos del sistema.</div>
        </div>
    );
};

export default PetSheetCard;
