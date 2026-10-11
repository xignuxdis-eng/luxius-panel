// TvTicker.tsx - Franja rotativa del Modo TV (pantalla completa) del Print Den.
// Muestra, una por una, tarjetas con el resumen real del día (entregas y meta, cola, producción, atrasos),
// el clima y un consejo de Xana. Solo informa: no recibe clics. Los tiempos están en content/config.ts.

import React, { useEffect, useMemo, useState } from 'react';
import type { Order } from '@/types/orden';
import { computeDaySummary, fmtM2 } from './workshopAlerts';
import { WORKSHOP_CONFIG } from './content/config';
import { XANA_TIPS } from './content/xanaTips';

interface TvTickerProps {
    orders: Order[];
    weatherText: string | null;
    getNow: () => Date;
}

interface Slide {
    icon: string;
    title: string;
    text: string;
    accent: string;
}

export const TvTicker: React.FC<TvTickerProps> = ({ orders, weatherText, getNow }) => {
    const [idx, setIdx] = useState(0);
    const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * Math.max(1, XANA_TIPS.length)));

    const slides = useMemo<Slide[]>(() => {
        const s = computeDaySummary(orders, getNow());
        const goal = WORKSHOP_CONFIG.dailyGoal.deliveries;
        const list: Slide[] = [
            {
                icon: '🏁',
                title: 'Meta del día',
                text: s.entregadasHoy >= goal ? `¡Meta cumplida! ${s.entregadasHoy} entregadas hoy` : `${s.entregadasHoy} de ${goal} entregas hoy`,
                accent: '#22c55e'
            },
            { icon: '🖨️', title: 'En cola de impresión', text: `${s.enCola} ${s.enCola === 1 ? 'orden' : 'órdenes'}`, accent: '#38bdf8' },
            { icon: '▣', title: 'Producción de hoy', text: `${fmtM2(s.m2Hoy)} m² producidos`, accent: '#a78bfa' },
            s.atrasadas > 0
                ? { icon: '⚠️', title: 'Atención', text: `${s.atrasadas} ${s.atrasadas === 1 ? 'orden atrasada' : 'órdenes atrasadas'}`, accent: '#f87171' }
                : { icon: '✔', title: 'Atrasos', text: 'Sin atrasos, ¡bien ahí!', accent: '#86efac' }
        ];
        if (weatherText) list.push({ icon: '🌦️', title: 'Afuera', text: weatherText, accent: '#fbbf24' });
        const tip = XANA_TIPS[tipIdx % Math.max(1, XANA_TIPS.length)];
        if (tip) list.push({ icon: '💡', title: `Xana: ${tip.title}`, text: tip.text.length > 140 ? `${tip.text.slice(0, 137)}...` : tip.text, accent: '#c8a24a' });
        return list;
    }, [orders, weatherText, tipIdx, getNow]);

    useEffect(() => {
        const t = window.setInterval(() => {
            setIdx((i) => {
                const next = i + 1;
                if (next >= slides.length) {
                    setTipIdx((k) => k + 1);
                    return 0;
                }
                return next;
            });
        }, WORKSHOP_CONFIG.tv.slideMs);
        return () => window.clearInterval(t);
    }, [slides.length]);

    const slide = slides[idx % slides.length];
    if (!slide) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: 'absolute',
                left: '50%',
                bottom: 16,
                transform: 'translateX(-50%)',
                zIndex: 25,
                maxWidth: '80%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(9,13,22,0.88)',
                border: `1px solid ${slide.accent}`,
                borderRadius: 10,
                padding: '10px 18px',
                fontFamily: 'monospace',
                color: '#f1f5f9',
                boxShadow: `0 0 18px ${slide.accent}55`,
                pointerEvents: 'none',
                transition: 'border-color 0.4s, box-shadow 0.4s'
            }}
        >
            <span style={{ fontSize: 26 }}>{slide.icon}</span>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 11, color: slide.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{slide.title}</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{slide.text}</span>
            </span>
        </div>
    );
};

export default TvTicker;
