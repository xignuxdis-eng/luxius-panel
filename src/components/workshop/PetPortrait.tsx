import React from 'react';
import { PET_PROFILES, PetProfile } from './content/pets';

/**
 * Retrato pixel-art de una mascota, generado desde sus datos en content/pets.ts
 * (colores, chubby, bulgyEyes, collar, markings, markColor). Siempre coincide con el sprite del taller.
 * Dibujado en una grilla de 48x48 con fondo, sombreado, brillos en los ojos, bigotes (gatos) y detalles propios.
 */
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

/** Mezcla un color con blanco (t>0) o negro (t<0). */
const mix = (n: number, t: number) => {
    const c = (s: number) => {
        const v = (n >> s) & 255;
        return Math.max(0, Math.min(255, Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t))));
    };
    return hex((c(16) << 16) | (c(8) << 8) | c(0));
};

export const PetPortrait: React.FC<{ profile?: PetProfile; id?: string; size?: number }> = ({ profile, id, size = 40 }) => {
    const p = profile ?? PET_PROFILES.find((x) => x.id === id);
    if (!p) return null;
    const uid = `pp-${p.id}`;
    const body = hex(p.body), shade = hex(p.shade), belly = hex(p.belly), eye = hex(p.eye), nose = hex(p.nose);
    const light = mix(p.body, 0.18), dark = mix(p.body, -0.25);
    const wide = p.chubby ? 2 : 0;
    const L = 12 - wide, R = 36 + wide; // limites de la cara
    const isCat = p.species === 'gato';
    const mk = (m: string) => !!p.markings?.includes(m as never);
    const mark = hex(p.markColor ?? 0xf8fafc);
    const lum = 0.299 * ((p.body >> 16) & 255) + 0.587 * ((p.body >> 8) & 255) + 0.114 * (p.body & 255);
    const edge = p.outline === false ? undefined : typeof p.outline === 'number' ? hex(p.outline) : lum < 70 ? '#5f6f86' : undefined; // mismo criterio que el sprite del taller
    const sp = edge ? { stroke: edge, strokeWidth: 1 } : {};
    const eyeR = p.bulgyEyes ? 4 : 3;
    const eyeBg = p.bulgyEyes ? '#f8fafc' : eye;
    const pupil = '#0b0b10';
    const ex1 = 18 - Math.round(wide / 2), ex2 = 30 + Math.round(wide / 2), ey = 25;
    const bgA = mix(p.body, lum < 90 ? 0.45 : 0.55), bgB = mix(p.shade, lum < 90 ? 0.1 : 0.35);
    const patch = (cx: number) => mk('eyePatch') && <circle cx={cx} cy={ey} r={eyeR + 2.5} fill={mark} />;
    const eyeShape = (cx: number) => (
        <>
            {patch(cx)}
            <circle cx={cx} cy={ey} r={eyeR} fill={eyeBg} />
            {!p.bulgyEyes && isCat && <rect x={cx - 0.6} y={ey - eyeR} width={1.2} height={eyeR * 2} rx={0.6} fill={pupil} />}
            {!p.bulgyEyes && !isCat && <circle cx={cx} cy={ey} r={1.8} fill={p.eye === 0xf8fafc ? pupil : '#0b0b10'} />}
            {p.bulgyEyes && <circle cx={cx} cy={ey} r={2} fill={pupil} />}
            <circle cx={cx - 1} cy={ey - 1.2} r={0.9} fill="#ffffff" />
        </>
    );
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={p.name} style={{ borderRadius: 8, display: 'block' }}>
            <defs>
                <radialGradient id={`${uid}-bg`} cx="50%" cy="38%" r="75%">
                    <stop offset="0%" stopColor={bgA} />
                    <stop offset="100%" stopColor={bgB} />
                </radialGradient>
                <linearGradient id={`${uid}-fur`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={light} />
                    <stop offset="100%" stopColor={dark} />
                </linearGradient>
            </defs>
            <rect width="48" height="48" fill={`url(#${uid}-bg)`} />
            {/* hombros / cuerpo asomando */}
            <ellipse cx="24" cy="46" rx={14 + wide} ry="7" fill={dark} {...sp} />
            {mk('chest') && <ellipse cx="24" cy="45" rx="4" ry="4" fill={mark} />}
            {isCat ? (
                <>
                    {/* orejas puntiagudas con interior */}
                    <polygon points={`${L},21 ${L + 1},5 ${L + 9},15`} fill={body} {...sp} />
                    <polygon points={`${R},21 ${R - 1},5 ${R - 9},15`} fill={body} {...sp} />
                    <polygon points={`${L + 2},19 ${L + 2.5},9 ${L + 7},15`} fill={nose} opacity={0.75} />
                    <polygon points={`${R - 2},19 ${R - 2.5},9 ${R - 7},15`} fill={nose} opacity={0.75} />
                </>
            ) : (
                <>
                    {/* orejas caidas */}
                    <rect x={L - 4} y={12} width={8} height={18} rx={3} fill={shade} {...sp} />
                    <rect x={R - 4} y={12} width={8} height={18} rx={3} fill={shade} {...sp} />
                </>
            )}
            {/* cabeza con degradado */}
            <rect x={L} y={14} width={R - L} height={25} rx={isCat ? 8 : 9} fill={`url(#${uid}-fur)`} {...sp} />
            {/* mejillas claras */}
            <ellipse cx="24" cy="34" rx={9 + wide} ry="5.5" fill={belly} opacity={0.85} />
            {/* marcas */}
            {mk('tabby') && (
                <g fill={shade} opacity={0.85}>
                    <rect x="23" y="14" width="2" height="5" />
                    <rect x="19" y="15" width="2" height="4" />
                    <rect x="27" y="15" width="2" height="4" />
                    <rect x={L} y="26" width="4" height="2" />
                    <rect x={R - 4} y="26" width="4" height="2" />
                    <rect x={L} y="30" width="3" height="2" />
                    <rect x={R - 3} y="30" width="3" height="2" />
                </g>
            )}
            {mk('blaze') && <polygon points="24,14 21.5,26 24,29 26.5,26" fill={mark} />}
            {/* ojos */}
            {eyeShape(ex1)}
            {eyeShape(ex2)}
            {/* hocico */}
            <rect x="19" y="29" width="10" height="8" rx="3" fill={belly} />
            {isCat ? (
                <>
                    <polygon points="22,30 26,30 24,32.5" fill={nose} />
                    <rect x="23.4" y="32" width="1.2" height="2" fill="#111" opacity={0.6} />
                    <path d="M24 34 q-3 3 -5.5 0 M24 34 q3 3 5.5 0" stroke="#111" strokeWidth="0.9" fill="none" opacity={0.6} />
                    {/* bigotes */}
                    <g stroke="#e2e8f0" strokeWidth="0.7" opacity={0.85}>
                        <line x1="18" y1="31" x2="7" y2="29" />
                        <line x1="18" y1="33" x2="7" y2="34" />
                        <line x1="30" y1="31" x2="41" y2="29" />
                        <line x1="30" y1="33" x2="41" y2="34" />
                    </g>
                </>
            ) : (
                <>
                    <rect x="21.5" y="29.5" width="5" height="4" rx="1.5" fill="#111" />
                    <rect x="22.5" y="30" width="1.5" height="1" fill="#ffffff" opacity={0.7} />
                    <path d="M24 33.5 v1.5 M24 35 q-3 2.5 -5 0 M24 35 q3 2.5 5 0" stroke="#111" strokeWidth="0.9" fill="none" opacity={0.75} />
                    {/* lengüita */}
                    <rect x="23" y="36" width="2.5" height="3" rx="1" fill="#fb7185" />
                </>
            )}
            {/* collar */}
            {p.collar !== undefined && (
                <>
                    <rect x={L + 2} y="39" width={R - L - 4} height="3" rx="1.5" fill={hex(p.collar)} />
                    <circle cx="24" cy="43" r="2" fill={mix(p.collar, 0.35)} stroke={mix(p.collar, -0.35)} strokeWidth="0.6" />
                </>
            )}
        </svg>
    );
};
