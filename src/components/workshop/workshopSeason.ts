// workshopSeason.ts - Decoración de fechas especiales del Print Den (solo decorativa, sin datos del sistema).
//   navidad:   diciembre            -> guirnalda con luces en la pared
//   julio:     5 al 12 de julio     -> banderines celestes y blancos (9 de Julio)
//   halloween: 20 al 31 de octubre  -> zapallos con carita en el borde de la pared
// Para probar cualquiera sin esperar la fecha:  localStorage.setItem('luxius_print_den_season', 'navidad' | 'julio' | 'halloween' | 'none')
// Las fechas se cambian en WORKSHOP_CONFIG.seasons (content/config.ts).

import { Container, Graphics } from 'pixi.js';
import { WORKSHOP_CONFIG } from './content/config';

export type SeasonName = 'navidad' | 'julio' | 'halloween';

/** Qué temporada corresponde a una fecha (o null si ninguna). Respeta el forzado de pruebas en localStorage. */
export function currentSeason(date: Date = new Date()): SeasonName | null {
    try {
        const forced = localStorage.getItem('luxius_print_den_season');
        if (forced === 'none') return null;
        if (forced === 'navidad' || forced === 'julio' || forced === 'halloween') return forced;
    } catch (_) {}
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const S = WORKSHOP_CONFIG.seasons;
    const inRange = (r: { month: number; from: number; to: number }) => m === r.month && d >= r.from && d <= r.to;
    if (m === S.navidad.month && d >= S.navidad.from) return 'navidad';
    if (inRange(S.julio)) return 'julio';
    if (inRange(S.halloween)) return 'halloween';
    return null;
}

/** Banderines celestes y blancos colgados de punta a punta. */
function bunting(w: number): Graphics {
    const g = new Graphics();
    const y0 = 3;
    const sag = (x: number) => y0 + Math.sin((x / w) * Math.PI) * 5;
    g.moveTo(0, y0);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, sag(x));
    g.stroke({ width: 1, color: 0x475569 });
    let i = 0;
    for (let x = 6; x < w - 4; x += 12) {
        const y = sag(x);
        const color = i % 2 === 0 ? 0x75aadb : 0xf8fafc;
        g.poly([x, y, x + 8, y, x + 4, y + 8]).fill({ color });
        g.poly([x, y, x + 8, y, x + 4, y + 8]).stroke({ width: 0.5, color: 0x334155, alpha: 0.5 });
        i++;
    }
    return g;
}

/** Guirnalda verde con luces rojas y doradas. */
function garland(w: number): Graphics {
    const g = new Graphics();
    const y0 = 2;
    const sag = (x: number) => y0 + Math.abs(Math.sin((x / w) * Math.PI * 4)) * 5;
    g.moveTo(0, y0);
    for (let x = 0; x <= w; x += 3) g.lineTo(x, sag(x));
    g.stroke({ width: 2, color: 0x15803d });
    g.moveTo(0, y0 + 1);
    for (let x = 0; x <= w; x += 3) g.lineTo(x, sag(x) + 1);
    g.stroke({ width: 1, color: 0x166534 });
    const cols = [0xef4444, 0xfacc15, 0x38bdf8, 0xf8fafc];
    let i = 0;
    for (let x = 5; x < w; x += 10) {
        g.rect(Math.round(x), Math.round(sag(x)) + 1, 2, 2).fill({ color: cols[i % cols.length] });
        i++;
    }
    return g;
}

/** Zapallo de Halloween con carita (x, y = base). */
function pumpkin(g: Graphics, x: number, y: number) {
    g.ellipse(x, y - 4, 6, 5).fill({ color: 0xea580c });
    g.ellipse(x - 3, y - 4, 2.4, 5).fill({ color: 0xf97316 });
    g.rect(x - 1, y - 10, 2, 3).fill({ color: 0x166534 });
    g.rect(x - 3, y - 6, 1, 2).rect(x + 2, y - 6, 1, 2).fill({ color: 0x1c1917 });
    g.rect(x - 2, y - 2, 4, 1).fill({ color: 0x1c1917 });
}

/** Arma la decoración de la temporada (un Container vacío si no corresponde ninguna). */
export function buildSeasonDecor(season: SeasonName | null, mapW: number): Container {
    const c = new Container();
    c.label = 'SeasonDecor';
    c.eventMode = 'none';
    if (!season) return c;
    if (season === 'julio') c.addChild(bunting(mapW));
    else if (season === 'navidad') c.addChild(garland(mapW));
    else if (season === 'halloween') {
        const g = new Graphics();
        for (const x of [16, 238, 462]) pumpkin(g, x, 36);
        c.addChild(g);
    }
    return c;
}
