// workshopSeason.ts - Decoración de fechas especiales del Print Den (solo decorativa, sin datos del sistema).
//   navidad:   diciembre            -> guirnalda con luces en la pared
//   julio:     5 al 12 de julio     -> banderines celestes y blancos (9 de Julio)
//   halloween: 20 al 31 de octubre  -> zapallos con carita en el borde de la pared
//   Fechas patrias argentinas:
//   malvinas:  1 al 3 de abril      -> banderas, cartelitos de las islas y lazo de luto (2 de abril)
//   mayo:      18 al 25 de mayo     -> escarapelas (25 de mayo)
//   bandera:   14 al 20 de junio    -> dos banderas grandes con Sol de Mayo (20 de junio)
//   sanmartin: 12 al 17 de agosto   -> coronas de laurel con sable corbo (17 de agosto)
//   tradicion: 6 al 10 de noviembre -> mates y sombreros gauchos (10 de noviembre)
// Para probarlas sin esperar la fecha:  localStorage.setItem('luxius_print_den_season', 'navidad' | 'julio' | 'halloween' | 'malvinas' | 'mayo' | 'bandera' | 'sanmartin' | 'tradicion' | 'none')
// Las fechas se cambian en WORKSHOP_CONFIG.seasons (content/config.ts).

import { Container, Graphics } from 'pixi.js';
import { WORKSHOP_CONFIG } from './content/config';

export type SeasonName = 'navidad' | 'julio' | 'halloween' | 'malvinas' | 'mayo' | 'bandera' | 'sanmartin' | 'tradicion';

const SEASON_NAMES: SeasonName[] = ['navidad', 'julio', 'halloween', 'malvinas', 'mayo', 'bandera', 'sanmartin', 'tradicion'];

/** Qué temporada corresponde a una fecha (o null si ninguna). Respeta el forzado de pruebas en localStorage. */
export function currentSeason(date: Date = new Date()): SeasonName | null {
    try {
        const forced = localStorage.getItem('luxius_print_den_season');
        if (forced === 'none') return null;
        if (forced && (SEASON_NAMES as string[]).includes(forced)) return forced as SeasonName;
    } catch (_) {}
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const S = WORKSHOP_CONFIG.seasons;
    const inRange = (r: { month: number; from: number; to: number }) => m === r.month && d >= r.from && d <= r.to;
    if (m === S.navidad.month && d >= S.navidad.from) return 'navidad';
    if (inRange(S.julio)) return 'julio';
    if (inRange(S.halloween)) return 'halloween';
    if (inRange(S.malvinas)) return 'malvinas';
    if (inRange(S.mayo)) return 'mayo';
    if (inRange(S.bandera)) return 'bandera';
    if (inRange(S.sanmartin)) return 'sanmartin';
    if (inRange(S.tradicion)) return 'tradicion';
    return null;
}

const CELESTE = 0x75aadb;
const BLANCO = 0xf8fafc;
const SOL = 0xf6b40e;

/** Escarapela celeste y blanca con sus cintas (x, y = centro). */
function escarapela(g: Graphics, x: number, y: number) {
    g.poly([x - 3, y + 3, x - 1, y + 3, x - 3, y + 10]).fill({ color: CELESTE });
    g.poly([x + 1, y + 3, x + 3, y + 3, x + 3, y + 10]).fill({ color: BLANCO });
    g.circle(x, y, 5).fill({ color: CELESTE });
    g.circle(x, y, 3.4).fill({ color: BLANCO });
    g.circle(x, y, 1.8).fill({ color: CELESTE });
    g.rect(x - 0.5, y - 0.5, 1, 1).fill({ color: BLANCO });
}

/** Bandera argentina con Sol de Mayo en un asta (x, y = punta del asta; w x h = paño). */
function banderaConSol(g: Graphics, x: number, y: number, w: number, h: number, poleH: number) {
    g.rect(x - 1, y, 1, poleH).fill({ color: 0x64748b });
    g.circle(x - 0.5, y, 1.2).fill({ color: SOL });
    const t = h / 3;
    g.rect(x, y + 1, w, t).fill({ color: CELESTE });
    g.rect(x, y + 1 + t, w, t).fill({ color: BLANCO });
    g.rect(x, y + 1 + t * 2, w, t).fill({ color: CELESTE });
    g.circle(x + w / 2, y + 1 + h / 2, Math.max(1.4, h / 7)).fill({ color: SOL });
    g.rect(x, y + 1, w, h).stroke({ width: 0.5, color: 0x334155, alpha: 0.5 });
}

/** Cartelito de las Islas Malvinas: mar celeste con las dos islas en gris. */
function mapaMalvinas(g: Graphics, x: number, y: number) {
    g.rect(x, y, 22, 14).fill({ color: CELESTE });
    g.rect(x, y, 22, 14).stroke({ width: 1, color: 0x1e3a5f });
    g.ellipse(x + 7, y + 7, 5, 3).fill({ color: 0xcbd5e1 });
    g.ellipse(x + 15, y + 8, 4, 2.5).fill({ color: 0xcbd5e1 });
    g.ellipse(x + 7, y + 6.5, 3, 1.6).fill({ color: 0x94a3b8 });
    // lazo negro de luto
    g.rect(x + 9, y - 3, 4, 2).fill({ color: 0x0f172a });
    g.rect(x + 10, y - 2, 2, 5).fill({ color: 0x0f172a });
}

/** Corona de laurel con sable corbo cruzado (San Martín). */
function laurelYSable(g: Graphics, x: number, y: number) {
    const n = 14;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const px = x + Math.cos(a) * 9;
        const py = y + Math.sin(a) * 9;
        g.ellipse(px, py, 2.2, 1.3).fill({ color: i % 2 ? 0x15803d : 0x22c55e });
        if (i % 4 === 0) g.circle(px, py, 0.9).fill({ color: 0xdc2626 });
    }
    g.moveTo(x - 6, y + 6).lineTo(x + 6, y - 6).stroke({ width: 1.3, color: 0xcbd5e1 });
    g.moveTo(x + 6, y + 6).lineTo(x - 6, y - 6).stroke({ width: 1.3, color: 0xe2e8f0 });
    g.rect(x - 8, y + 5, 3, 2).rect(x + 5, y + 5, 3, 2).fill({ color: SOL });
    g.circle(x, y, 1.6).fill({ color: SOL });
}

/** Mate con bombilla (x, y = base). */
function mate(g: Graphics, x: number, y: number) {
    g.ellipse(x, y - 4, 4, 4.4).fill({ color: 0x8a5a2b });
    g.ellipse(x - 1.5, y - 5, 1.4, 2.2).fill({ color: 0xb07a45 });
    g.ellipse(x, y - 8, 3.2, 1.1).fill({ color: 0x4d7c0f });
    g.moveTo(x + 1, y - 8).lineTo(x + 5, y - 13).stroke({ width: 0.9, color: 0xcbd5e1 });
    g.rect(x + 4, y - 14, 3, 1).fill({ color: 0xcbd5e1 });
    g.rect(x - 3, y - 2, 6, 1).fill({ color: 0xd1d5db });
}

/** Sombrero gaucho de ala ancha con barbijo (x, y = base). */
function sombreroGaucho(g: Graphics, x: number, y: number) {
    g.ellipse(x, y - 2, 9, 2.4).fill({ color: 0x1c1917 });
    g.rect(x - 4, y - 8, 8, 6).fill({ color: 0x292524 });
    g.rect(x - 4, y - 5, 8, 1.4).fill({ color: 0xb91c1c });
    g.ellipse(x, y - 8, 4, 1.2).fill({ color: 0x3f3a36 });
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
    } else if (season === 'mayo') {
        // 25 de Mayo: escarapelas repartidas por la pared (sin tapar el cartel central)
        const g = new Graphics();
        for (const x of [16, 72, 128, 184, 296, 352, 408, 464]) escarapela(g, x, 7);
        c.addChild(g);
    } else if (season === 'bandera') {
        // 20 de Junio: dos banderas grandes con Sol de Mayo
        const g = new Graphics();
        banderaConSol(g, 40, 2, 38, 24, 34);
        banderaConSol(g, mapW - 78, 2, 38, 24, 34);
        c.addChild(g);
    } else if (season === 'malvinas') {
        // 2 de Abril: banderas celestes y blancas y cartelitos de las islas con lazo de luto
        const g = new Graphics();
        banderaConSol(g, 16, 4, 20, 13, 30);
        banderaConSol(g, mapW - 36, 4, 20, 13, 30);
        mapaMalvinas(g, 118, 12);
        mapaMalvinas(g, mapW - 140, 12);
        c.addChild(g);
    } else if (season === 'sanmartin') {
        // 17 de Agosto: coronas de laurel con sable corbo y banderines celestes y blancos
        const g = new Graphics();
        laurelYSable(g, 120, 20);
        laurelYSable(g, mapW - 120, 20);
        for (const x of [20, 60, 180, 300, 420, 460]) escarapela(g, x, 7);
        c.addChild(g);
    } else if (season === 'tradicion') {
        // 10 de Noviembre: mates con bombilla y sombreros gauchos
        const g = new Graphics();
        for (const x of [60, 130, 350, 420]) mate(g, x, 36);
        for (const x of [16, 462]) sombreroGaucho(g, x, 36);
        c.addChild(g);
    }
    return c;
}
