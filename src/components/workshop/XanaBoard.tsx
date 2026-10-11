import React, { useEffect, useMemo, useRef, useState } from 'react';
import { XANA_CATEGORIES, XANA_TIPS, XanaCategory } from './content/xanaTips';

/** Tablón de Xana: feed de consejos curados a mano (contenido en content/xanaTips.ts). No son datos del sistema. */
const STORAGE_KEY = 'luxius_xana_board';
const ROTATE_MS = 20000;
type Filter = 'all' | 'favs' | XanaCategory;

const loadState = (): { favs: string[]; cat: Filter } => {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return { favs: Array.isArray(raw.favs) ? raw.favs : [], cat: raw.cat || 'all' };
    } catch {
        return { favs: [], cat: 'all' };
    }
};

export const XanaBoard: React.FC = () => {
    const initial = useRef(loadState()).current;
    const [favs, setFavs] = useState<string[]>(initial.favs);
    const [filter, setFilter] = useState<Filter>(initial.cat);
    const [idx, setIdx] = useState(() => Math.floor(Date.now() / 86400000));
    const [fade, setFade] = useState(true);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ favs, cat: filter })); } catch { /* sin storage */ }
    }, [favs, filter]);

    const toggleFav = (id: string) => setFavs(f => (f.includes(id) ? f.filter(x => x !== id) : [...f, id]));

    /** Consejos del ciclo actual (segun el filtro elegido). */
    const list = useMemo(() => XANA_TIPS.filter(t =>
        filter === 'all' ? true : filter === 'favs' ? favs.includes(t.id) : t.category === filter), [filter, favs]);

    const pos = list.length ? ((idx % list.length) + list.length) % list.length : 0;
    const tip = list[pos];
    const cat = tip ? XANA_CATEGORIES[tip.category] : null;

    const goTo = (next: number) => {
        setFade(false);
        setTimeout(() => { setIdx(next); setFade(true); }, 220);
    };
    const randomTip = () => {
        if (list.length < 2) return;
        let n = Math.floor(Math.random() * list.length);
        if (n === pos) n = (n + 1) % list.length;
        goTo(n);
    };

    useEffect(() => {
        if (paused || list.length < 2) return;
        const t = setInterval(() => goTo(pos + 1), ROTATE_MS);
        return () => clearInterval(t);
    }, [paused, pos, list.length]);

    const chip = (key: Filter, label: string, color: string) => (
        <button key={key} onClick={() => setFilter(key)} title={label}
            style={{
                background: filter === key ? color : '#0f172a', color: filter === key ? '#000' : '#cbd5e1',
                border: '2px solid #000', padding: '2px 5px', fontSize: 10, cursor: 'pointer',
                fontFamily: 'var(--font-pixel-ui)'
            }}>{label}</button>
    );

    return (
        <section aria-label="Tablón de Xana" style={{
            background: 'var(--pixel-bg-card)', border: '3px solid #000', fontFamily: 'var(--font-pixel-ui)',
            color: '#e2e8f0', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)', boxSizing: 'border-box'
        }}>
            <header style={{
                background: 'linear-gradient(90deg,#a78bfa,#f472b6)', color: '#0b0620', padding: '6px 8px',
                borderBottom: '3px solid #000', fontSize: 12, fontWeight: 700, letterSpacing: 1
            }}>✨ TABLÓN DE XANA</header>

            <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
                style={{ padding: 8, borderBottom: '2px solid #000', background: '#1e293b', minHeight: 170 }}>
                {tip && cat ? (
                    <>
                        <div style={{ fontSize: 10, color: cat.color, marginBottom: 4 }}>{cat.icon} {cat.label.toUpperCase()} · {pos + 1}/{list.length}</div>
                        <div style={{ opacity: fade ? 1 : 0, transform: fade ? 'translateY(0)' : 'translateY(-6px)', transition: 'opacity .22s, transform .22s' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{tip.title}</div>
                            <div style={{ fontSize: 11, lineHeight: 1.45, color: '#cbd5e1' }}>{tip.text}</div>
                            {tip.link && (
                                <a href={tip.link.url} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'inline-block', marginTop: 6, fontSize: 11, color: '#38bdf8' }}>
                                    🔗 {tip.link.label}
                                </a>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                            <button onClick={() => goTo(pos - 1)} title="Anterior" style={{ background: '#0f172a', color: '#e2e8f0', border: '2px solid #000', cursor: 'pointer', fontSize: 11, padding: '0 8px' }}>◀</button>
                            <button onClick={randomTip} style={{ flex: 1, background: '#a78bfa', color: '#000', border: '2px solid #000', cursor: 'pointer', fontSize: 10, padding: 3, fontFamily: 'inherit' }}>🎲 Otro consejo</button>
                            <button onClick={() => goTo(pos + 1)} title="Siguiente" style={{ background: '#0f172a', color: '#e2e8f0', border: '2px solid #000', cursor: 'pointer', fontSize: 11, padding: '0 8px' }}>▶</button>
                            <button onClick={() => toggleFav(tip.id)} title="Guardar" style={{ background: '#0f172a', border: '2px solid #000', cursor: 'pointer', fontSize: 12, padding: '0 6px' }}>{favs.includes(tip.id) ? '⭐' : '☆'}</button>
                        </div>
                    </>
                ) : (
                    <div style={{ fontSize: 11, color: '#94a3b8', padding: 6 }}>Todavía no guardaste consejos. Tocá ☆ en un consejo para guardarlo.</div>
                )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: 6, borderBottom: '2px solid #000' }}>
                {chip('all', 'Todo', '#e2e8f0')}
                {chip('favs', `⭐ ${favs.length}`, '#fbbf24')}
                {(Object.keys(XANA_CATEGORIES) as XanaCategory[]).map(k => chip(k, XANA_CATEGORIES[k].icon, XANA_CATEGORIES[k].color))}
            </div>
            <footer style={{ fontSize: 9, color: '#64748b', padding: '4px 8px', borderTop: '2px solid #000' }}>
                Selección curada por el equipo · no son datos del sistema
            </footer>
        </section>
    );
};
