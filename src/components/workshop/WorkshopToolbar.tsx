// WorkshopToolbar.tsx - Barra del Print Den (Bloque F12/F13): atajos a cada estación, logros, modo TV
// y botones para encender/apagar por separado las extras decorativas (mascota, eventos, clima, alertas).

import { PetPortrait } from './PetPortrait';
import React, { useState } from 'react';
import { RADIO_STATIONS } from './workshopRadio';

export interface FxToggles {
    pet: boolean;
    events: boolean;
    weather: boolean;
    alerts: boolean;
    petSound: boolean;
    sndAmbient: boolean;
    sndMachines: boolean;
    sndAlerts: boolean;
    sndAchv: boolean;
    sndVoices: boolean;
    sndUi: boolean;
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
    /** Radio del taller: 0 = apagada, 1..N = emisora. */
    radio?: number;
    onRadio?: () => void;
}

const chip = (active: boolean, accent = '#0284c7'): React.CSSProperties => ({
    background: active ? accent : 'var(--bg-main)',
    color: active ? '#ffffff' : 'var(--text-primary)',
    border: `1px solid ${active ? accent : 'var(--border)'}`,
    borderRadius: 6,
    padding: '4px 9px',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s'
});

const FX_LABEL: Record<keyof FxToggles, { icon: string; label: string; title: string }> = {
    pet: { icon: '🐾', label: 'Mascotas', title: 'Mostrar/ocultar a las mascotas del taller: Frijol, Jaina, Muchi, Teo y Borry (decorativas)' },
    events: { icon: '🎲', label: 'Eventos', title: 'Eventos y visitas aleatorias (decorativas): apagón, café, hora feliz, repartidor, técnico' },
    weather: { icon: '🌦️', label: 'Clima', title: 'Clima real por las ventanas (Open-Meteo)' },
    alerts: { icon: '🔔', label: 'Alertas', title: 'Íconos de alerta sobre las estaciones (stock bajo, máquina offline, atrasos)' },
    petSound: { icon: '🔊', label: 'Animales', title: 'Sonido de las mascotas al hacer clic en ellas' },
    sndAmbient: { icon: '🎵', label: 'Ambiente', title: 'Sonido de fondo del taller' },
    sndMachines: { icon: '🖨️', label: 'Máquinas', title: 'Sonido de la impresora y de la tijera de corte' },
    sndAlerts: { icon: '🚨', label: 'Avisos', title: 'Sonido de aviso cuando una orden rebota' },
    sndAchv: { icon: '🎉', label: 'Festejos', title: 'Sonido al entregar una orden y al desbloquear un logro' },
    sndVoices: { icon: '🗣️', label: 'Voces', title: 'Voces de los operarios al hablar o al hacerles clic (sintetizadas, estilo consola)' },
    sndUi: { icon: '🔔', label: 'Interfaz', title: 'Tilín al abrir y cerrar fichas y paneles' }
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
    onOpenPet,
    radio = 0,
    onRadio
}) => {
    const [fxOpen, setFxOpen] = useState(false);
    const fxKeys = Object.keys(FX_LABEL) as Array<keyof FxToggles>;
    const fxActiveCount = fxKeys.filter((k) => fx[k]).length;

    return (
        <div
            id="workshop-toolbar"
            style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', width: '100%', maxWidth: 1400 }}
        >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <button type="button" style={chip(focusedId === null)} aria-pressed={focusedId === null} onClick={() => onFocus(null)} title="Ver todo el taller">
                    🗺️ Vista general
                </button>
                {stations.map((s) => (
                    <button key={s.id} type="button" style={chip(focusedId === s.id)} aria-pressed={focusedId === s.id} onClick={() => onFocus(s.id)} title={`Ir a ${s.title}`}>
                        {s.icon} {s.title}
                    </button>
                ))}
                <span style={{ width: 1, height: 18, background: '#1e293b', margin: '0 2px' }} />
                <button
                    type="button"
                    data-achievements-toggle="1"
                    style={chip(achievementsOpen, '#c8a24a')}
                    aria-pressed={achievementsOpen}
                    onClick={onToggleAchievements}
                    title="Logros del taller (calculados con órdenes reales)"
                >
                    🏆 Logros {achievementsUnlocked}/{achievementsTotal}
                </button>
                <button type="button" style={chip(isFullscreen, '#22c55e')} aria-pressed={isFullscreen} onClick={onToggleFullscreen} title="Modo TV / pantalla completa (Esc para salir)">
                    {isFullscreen ? '🗗 Salir de pantalla completa' : '📺 Modo TV'}
                </button>
                {onRadio && (
                    <button
                        type="button"
                        style={chip(radio > 0, '#f472b6')}
                        onClick={onRadio}
                        title="Radio del taller (sintetizada): tocá para cambiar de emisora o apagarla"
                        aria-pressed={radio > 0}
                    >
                        📻 Radio: {radio > 0 ? `${RADIO_STATIONS[radio - 1].emoji} ${RADIO_STATIONS[radio - 1].name}` : 'apagada'}
                    </button>
                )}
                <button
                    type="button"
                    style={chip(fxOpen, '#a78bfa')}
                    aria-expanded={fxOpen}
                    onClick={() => setFxOpen((v) => !v)}
                    title="Mostrar u ocultar controles de efectos y audio del taller"
                >
                    ⚙️ Efectos y Audio ({fxActiveCount}/{fxKeys.length})
                </button>
                {fx.pet &&
                    pets.map((p) => (
                        <button key={p.id} type="button" style={chip(false, '#c084fc')} onClick={() => onOpenPet?.(p.id)} title={`Ver la ficha de ${p.name}`}>
                            <PetPortrait id={p.id} size={16} /> {p.name}
                        </button>
                    ))}
                {fx.weather && weatherText && (
                    <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} title="Clima real por las ventanas">
                        {weatherText}
                    </span>
                )}
            </div>
            {fxOpen && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'center', padding: '6px 10px', background: 'var(--bg-main)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {fxKeys.map((k) => (
                        <button key={k} type="button" style={chip(fx[k], '#a78bfa')} onClick={() => onToggleFx(k)} title={FX_LABEL[k].title} aria-pressed={fx[k]}>
                            {FX_LABEL[k].icon} {FX_LABEL[k].label} {fx[k] ? 'ON' : 'OFF'}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WorkshopToolbar;
