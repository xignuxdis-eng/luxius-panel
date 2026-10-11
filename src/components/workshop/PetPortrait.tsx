import React from 'react';
import { PET_PROFILES, PetProfile } from './content/pets';

/**
 * Retrato pixel-art de una mascota, generado desde sus colores en content/pets.ts
 * (body, belly, eye, nose, chubby, bulgyEyes). Siempre coincide con el sprite del taller.
 */
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

export const PetPortrait: React.FC<{ profile?: PetProfile; id?: string; size?: number }> = ({ profile, id, size = 40 }) => {
    const p = profile ?? PET_PROFILES.find((x) => x.id === id);
    if (!p) return null;
    const body = hex(p.body), shade = hex(p.shade), belly = hex(p.belly), eye = hex(p.eye), nose = hex(p.nose);
    const wide = p.chubby ? 2 : 0; // cara mas ancha
    const eyeR = p.bulgyEyes ? 3 : 2;
    const L = 8 - wide, R = 24 + wide; // limites de la cara
    const isCat = p.species === 'gato';
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" shapeRendering="crispEdges" role="img" aria-label={p.name}>
            {isCat ? (
                <>
                    {/* orejas puntiagudas */}
                    <polygon points={`${L},14 ${L},4 ${L + 6},10`} fill={body} />
                    <polygon points={`${R},14 ${R},4 ${R - 6},10`} fill={body} />
                    <polygon points={`${L + 1},12 ${L + 1},7 ${L + 4},10`} fill={nose} opacity={0.6} />
                    <polygon points={`${R - 1},12 ${R - 1},7 ${R - 4},10`} fill={nose} opacity={0.6} />
                </>
            ) : (
                <>
                    {/* orejas caidas */}
                    <rect x={L - 3} y={8} width={5} height={11} fill={shade} />
                    <rect x={R - 2} y={8} width={5} height={11} fill={shade} />
                </>
            )}
            {/* cabeza */}
            <rect x={L} y={9} width={R - L} height={17} rx={3} fill={body} />
            {/* hocico */}
            <rect x={12} y={18} width={8} height={7} rx={2} fill={belly} />
            {/* ojos */}
            <circle cx={12} cy={16} r={eyeR} fill={p.bulgyEyes ? '#f8fafc' : eye} />
            <circle cx={20} cy={16} r={eyeR} fill={p.bulgyEyes ? '#f8fafc' : eye} />
            <circle cx={12} cy={16} r={p.bulgyEyes ? 1.5 : 1} fill="#0b0b10" />
            <circle cx={20} cy={16} r={p.bulgyEyes ? 1.5 : 1} fill="#0b0b10" />
            {/* nariz y boca */}
            <rect x={15} y={19} width={2} height={2} fill={isCat ? nose : '#111'} />
            <rect x={16} y={21} width={1} height={2} fill="#111" opacity={0.7} />
        </svg>
    );
};
