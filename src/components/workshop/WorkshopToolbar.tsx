// WorkshopToolbar.tsx - Barra del Print Den (Bloque F12/F13): atajos a cada estación, logros, modo TV
// y botones para encender/apagar por separado las extras decorativas (mascota, eventos, clima, alertas).

import React from 'react';

export interface FxToggles {
    pet: boolean;
    events: boolean;
    weather: boolean;
    alerts: boolean;
    petSound: boolean;
}

export interface ToolbarStation {
    id: string;
    title: string;
    icon: string;
}

export interface WorkshopToolbarProps {
    stations: ToolbarStation[];
    focusedId: string | null;
    onFocus: (id: string | null) => void;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    fx: FxToggles;
    onToggleFx: (key: keyof FxToggles) => void;
    achievementsUnlocked: number;
    achievementsTotal: number;
    achievementsOpen: boolean;
    onToggleAchievements: () => void;
    weatherText: string | null;
    /** Mascotas que están ahora en el taller (clic = abrir su ficha). */
    pets?: { id: string; name: string; emoji: string }[];
    onOpenPet?: (id: string) => void;
}

const chip = (active: boolean, accent = '#38bdf8'): React.CSSProperties => ({
    background: active ? `${accent}26` : '#0b1220',
    color: active ? '#f8fafc' : '#94a3b8',
    border: `1px solid ${active ? accent : '#1e293b'}`,
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s'
});

const FX_LABEL: Record<keyof FxToggles, { icon: string; label: string; title: string }> = {
    pet: { icon: '🐾', label: 'Mascotas', title: 'Mostrar/ocultar a las mascotas del taller: Frijol, Jaina, Muchi, Teo y Borry (decorativas)' },
    events: { icon: '🎲', label: 'Eventos', title: 'Eventos y visitas aleatorias (decorativas): apagón, café, hora feliz, repartidor, técnico, guardia nocturno' },
    weather: { icon: '🌦️', label: 'Clima', title: 'Clima real por las ventanas (Open-Meteo)' },
    alerts: { icon: '🔔', label: 'Alertas', title: 'Íconos de alerta sobre las estaciones (stock bajo, máquina offline, atrasos)' },
    petSound: { icon: '🔊', label: 'Animales', title: 'Sonido de las mascotas al hacer clic en ellas' }
};

export const WorkshopToolbar: React.FC<WorkshopToolbarProps> = ({
    stations,
    focusedId,
    onFocus,
    isFullscreen,
    onToggleFullscreen,
    fx,
    onToggleFx,
    achievementsUnlocked,
    achievementsTotal,
    achievementsOpen,
    onToggleAchievements,
    weatherText,
    pets = [],
    onOpenPet
}) => (
    <div
        id="workshop-toolbar"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 1400 }}
    >
        <button type="button" style={chip(focusedId === null)} onClick={() => onFocus(null)} title="Ver todo el taller">
            🗺️ Vista general
        </button>
        {stations.map((s) => (
            <button key={s.id} type="button" style={chip(focusedId === s.id)} onClick={() => onFocus(s.id)} title={`Ir a ${s.title}`}>
                {s.icon} {s.title}
            </button>
        ))}
        <span style={{ width: 1, height: 18, background: '#1e293b', margin: '0 2px' }} />
        <button
            type="button"
            data-achievements-toggle="1"
            style={chip(achievementsOpen, '#c8a24a')}
            onClick={onToggleAchievements}
            title="Logros del taller (calculados con órdenes reales)"
        >
            🏆 Logros {achievementsUnlocked}/{achievementsTotal}
        </button>
        <button type="button" style={chip(isFullscreen, '#22c55e')} onClick={onToggleFullscreen} title="Modo TV / pantalla completa (Esc para salir)">
            {isFullscreen ? '🗗 Salir de pantalla completa' : '📺 Modo TV'}
        </button>
        <span style={{ width: 1, height: 18, background: '#1e293b', margin: '0 2px' }} />
        {(Object.keys(FX_LABEL) as Array<keyof FxToggles>).map((k) => (
            <button key={k} type="button" style={chip(fx[k], '#a78bfa')} onClick={() => onToggleFx(k)} title={FX_LABEL[k].title} aria-pressed={fx[k]}>
                {FX_LABEL[k].icon} {FX_LABEL[k].label} {fx[k] ? 'ON' : 'OFF'}
            </button>
        ))}
        {fx.pet &&
            pets.map((p) => (
                <button key={p.id} type="button" style={chip(false, '#c084fc')} onClick={() => onOpenPet?.(p.id)} title={`Ver la ficha de ${p.name}`}>
                    {p.emoji} {p.name}
                </button>
            ))}
        {fx.weather && weatherText && (
            <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} title="Clima real por las ventanas">
                {weatherText}
            </span>
        )}
    </div>
);

export default WorkshopToolbar;
