import React from 'react';
import type { HairStyle, Accessory } from './content/characters';
import { CHARACTER_PALETTE } from './content/characters';

/**
 * Retrato del operario para su ficha: cabeza y hombros dibujados con los mismos rasgos que el sprite del taller
 * (color de piel, camisa, pelo, peinado y accesorio de content/characters.ts).
 */
export interface WorkerPortraitProps {
    skinColor: string;
    shirtColor: string;
    hairColor?: string;
    hairStyle?: HairStyle;
    accessory?: Accessory;
    gender?: 'f' | 'm';
    size?: number;
    name?: string;
}

const mix = (hex: string | undefined | null, t: number) => {
    if (!hex || typeof hex !== 'string') return '#888888';
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const c = (s: number) => {
        const v = (n >> s) & 255;
        return Math.max(0, Math.min(255, Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t))));
    };
    return '#' + [c(16), c(8), c(0)].map((v) => v.toString(16).padStart(2, '0')).join('');
};

let uidCounter = 0;

export const WorkerPortrait: React.FC<WorkerPortraitProps> = ({ 
    skinColor = '#fcd34d', 
    shirtColor = '#3b82f6', 
    hairColor, 
    hairStyle = 'short', 
    accessory = 'none', 
    gender = 'm', 
    size = 56, 
    name 
}) => {
    const uid = React.useMemo(() => `wp-${++uidCounter}`, []);
    const hair = hairColor || CHARACTER_PALETTE.hairDefault;
    const hairDark = mix(hair, -0.3);
    const hairLight = mix(hair, 0.2);
    const skinLight = mix(skinColor, 0.12), skinDark = mix(skinColor, -0.2);
    const shirtDark = mix(shirtColor, -0.35);
    const beard = mix(hair, -0.2);
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={name ? `Retrato de ${name}` : 'Retrato'} style={{ display: 'block' }}>
            <defs>
                <radialGradient id={`${uid}-bg`} cx="50%" cy="35%" r="80%">
                    <stop offset="0%" stopColor={mix(shirtColor, 0.55)} />
                    <stop offset="100%" stopColor={mix(shirtColor, -0.55)} />
                </radialGradient>
                <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={skinLight} />
                    <stop offset="100%" stopColor={skinDark} />
                </linearGradient>
            </defs>
            <rect width="48" height="48" fill={`url(#${uid}-bg)`} />

            {/* pelo de atras (largo) */}
            {hairStyle === 'long' && <rect x="9" y="10" width="30" height="27" rx="9" fill={hairDark} />}

            {/* hombros y camisa */}
            <path d="M4 48 Q5 36 17 34 L31 34 Q43 36 44 48 Z" fill={shirtColor} />
            <path d="M31 34 Q43 36 44 48 L38 48 Q38 40 31 36 Z" fill={shirtDark} opacity={0.6} />
            {/* cuello */}
            <rect x="20" y="30" width="8" height="7" fill={skinDark} />
            <path d="M19 34 L24 40 L29 34 Z" fill={skinDark} />
            <path d="M17 34 L24 41 L31 34 L28 33 L24 37 L20 33 Z" fill={mix(shirtColor, 0.25)} />

            {/* orejas */}
            <rect x="11" y="21" width="3" height="6" rx="1.5" fill={skinDark} />
            <rect x="34" y="21" width="3" height="6" rx="1.5" fill={skinDark} />
            {/* cara */}
            <rect x="13" y="12" width="22" height="22" rx="8" fill={`url(#${uid}-skin)`} />
            {/* mejillas */}
            <ellipse cx="17.5" cy="27" rx={gender === 'f' ? 3.0 : 2.2} ry={gender === 'f' ? 1.8 : 1.4} fill={gender === 'f' ? '#f472b6' : '#f87171'} opacity={gender === 'f' ? 0.45 : 0.28} />
            <ellipse cx="30.5" cy="27" rx={gender === 'f' ? 3.0 : 2.2} ry={gender === 'f' ? 1.8 : 1.4} fill={gender === 'f' ? '#f472b6' : '#f87171'} opacity={gender === 'f' ? 0.45 : 0.28} />

            {/* pelo */}
            {hairStyle !== 'cap' && (
                <>
                    <path d="M12 21 Q11 9 24 8 Q37 9 36 21 Q34 15 30 14 Q24 17 18 14 Q14 15 12 21 Z" fill={hair} />
                    <path d="M16 11 Q24 7 32 11" stroke={hairLight} strokeWidth="1.4" fill="none" opacity={0.7} />
                </>
            )}
            {hairStyle === 'tuft' && <path d="M21 9 Q22 3 26 4 Q25 7 28 9 Z" fill={hair} />}
            {hairStyle === 'bun' && (
                <>
                    <circle cx="24" cy="5" r="5" fill={hair} />
                    <circle cx="24" cy="5" r="4.2" fill={hairLight} opacity={0.6} />
                    <path d="M12 18 Q12 11 24 9 Q36 11 36 18 Z" fill={hair} />
                </>
            )}
            {hairStyle === 'long' && (
                <>
                    <rect x="9" y="16" width="5" height="22" rx="2.5" fill={hair} />
                    <rect x="34" y="16" width="5" height="22" rx="2.5" fill={hair} />
                </>
            )}
            {hairStyle === 'cap' && (
                <>
                    <path d="M12 19 Q12 7 24 7 Q36 7 36 19 Z" fill={mix(shirtColor, -0.1)} />
                    <path d="M16 10 Q24 6 32 10" stroke={mix(shirtColor, 0.35)} strokeWidth="1.4" fill="none" opacity={0.8} />
                    <rect x="12" y="18" width="26" height="3.5" rx="1.5" fill={mix(shirtColor, -0.45)} />
                    <circle cx="24" cy="7.5" r="1.4" fill={mix(shirtColor, -0.45)} />
                </>
            )}
            {accessory === 'headband' && (
                <>
                    <rect x="12" y="15" width="24" height="3.2" rx="1" fill={CHARACTER_PALETTE.headband} />
                    {gender === 'f' && <circle cx="34" cy="14" r="2.2" fill={CHARACTER_PALETTE.headband} />}
                </>
            )}

            {/* ojos */}
            <ellipse cx="19" cy="24" rx="2.4" ry="2.8" fill="#f8fafc" />
            <ellipse cx="29" cy="24" rx="2.4" ry="2.8" fill="#f8fafc" />
            <circle cx="19.3" cy="24.3" r="1.6" fill={CHARACTER_PALETTE.eye} />
            <circle cx="29.3" cy="24.3" r="1.6" fill={CHARACTER_PALETTE.eye} />
            <circle cx="19.8" cy="23.6" r="0.55" fill="#ffffff" />
            <circle cx="29.8" cy="23.6" r="0.55" fill="#ffffff" />

            {/* pestañas femeninas */}
            {gender === 'f' && (
                <>
                    <path d="M16 22 Q18.5 20.8 21.5 22.4" stroke={hairDark} strokeWidth="1.3" fill="none" strokeLinecap="round" />
                    <path d="M26.5 22.4 Q29.5 20.8 32 22" stroke={hairDark} strokeWidth="1.3" fill="none" strokeLinecap="round" />
                    <line x1="21.5" y1="22.4" x2="22.8" y2="21" stroke={hairDark} strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="26.5" y1="22.4" x2="25.2" y2="21" stroke={hairDark} strokeWidth="1.2" strokeLinecap="round" />
                </>
            )}

            {/* cejas */}
            <rect x="16.5" y="20" width="5" height="1.3" rx="0.6" fill={hairDark} />
            <rect x="26.5" y="20" width="5" height="1.3" rx="0.6" fill={hairDark} />
            {/* nariz y boca */}
            <path d="M24 25 L22.8 29 L25.2 29 Z" fill={skinDark} opacity={0.55} />
            <path d="M20.5 31.5 Q24 34 27.5 31.5" stroke="#7f1d1d" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity={0.8} />

            {/* accesorios */}
            {accessory === 'glasses' && (
                <g fill="none" stroke={CHARACTER_PALETTE.glasses} strokeWidth="1.4">
                    <rect x="15.2" y="21" width="7.6" height="6.4" rx="2" />
                    <rect x="25.2" y="21" width="7.6" height="6.4" rx="2" />
                    <line x1="22.8" y1="24" x2="25.2" y2="24" />
                    <line x1="15.2" y1="23.5" x2="12.5" y2="22.5" />
                    <line x1="32.8" y1="23.5" x2="35.5" y2="22.5" />
                </g>
            )}
            {gender !== 'f' && accessory === 'mustache' && <path d="M19 30 Q21.5 28.2 24 29.8 Q26.5 28.2 29 30 Q26 31.8 24 30.8 Q22 31.8 19 30 Z" fill={beard} />}
            {gender !== 'f' && accessory === 'beard' && (
                <>
                    <path d="M13 26 Q14 36 24 37 Q34 36 35 26 L33 28 Q31 33 24 33 Q17 33 15 28 Z" fill={beard} />
                    <path d="M19 30 Q21.5 28.5 24 30 Q26.5 28.5 29 30 Q27 31.5 24 31 Q21 31.5 19 30 Z" fill={beard} />
                    <path d="M21 32.6 Q24 34.2 27 32.6" stroke="#7f1d1d" strokeWidth="0.9" fill="none" opacity={0.75} />
                </>
            )}
        </svg>
    );
};
