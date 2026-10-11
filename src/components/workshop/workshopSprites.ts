// workshopSprites.ts - Procedural Pixel Art Generator for PixiJS (XignuX Print Den)
// Generates nearest-neighbor pixel art textures via offscreen HTML5 canvas.
// Architecture is 100% prepared to swap or supplement textures with external PNG spritesheets later.

import { Texture } from 'pixi.js';
import { withOverride } from './workshopSpriteOverrides';

export interface PixelArtDef {
    matrix: string[];
    palette: Record<string, string>;
    pixelScale?: number;
}

const textureCache = new Map<string, Texture>();

/**
 * Checks if a texture and its underlying source are still valid and usable.
 */
function isTextureValid(tex: Texture | undefined): boolean {
    return !!(tex && !tex.destroyed && tex.source && !tex.source.destroyed);
}

/**
 * Renders a character matrix into an offscreen canvas and returns a Pixi Texture with scaleMode = 'nearest'.
 */
export function createPixelTexture(
    cacheKey: string,
    matrix: string[],
    palette: Record<string, string>,
    pixelScale = 1
): Texture {
    const cached = textureCache.get(cacheKey);
    if (isTextureValid(cached)) {
        return cached!;
    }

    const height = matrix.length;
    const width = matrix[0] ? matrix[0].length : 0;

    const canvas = document.createElement('canvas');
    canvas.width = width * pixelScale;
    canvas.height = height * pixelScale;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get 2D context for pixel art texture');
    }

    // Disable image smoothing for pure razor-sharp pixel art
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < height; y++) {
        const row = matrix[y];
        for (let x = 0; x < width; x++) {
            const char = row[x];
            if (char === '.' || char === ' ') continue; // Transparent pixel

            const color = palette[char];
            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(x * pixelScale, y * pixelScale, pixelScale, pixelScale);
            }
        }
    }

    // Pixi v8 Texture.from with skipCache=true to avoid stale cache issues
    const texture = Texture.from(canvas, true);
    if (texture.source) {
        texture.source.scaleMode = 'nearest';
    }

    textureCache.set(cacheKey, texture);
    return texture;
}

/**
 * Safely clears the texture cache if explicit memory reclamation is requested.
 */
export function destroyTextureCache(): void {
    textureCache.forEach(tex => {
        try {
            if (tex && !tex.destroyed) {
                tex.destroy(true);
            }
        } catch (_) {}
    });
    textureCache.clear();
}

export function getTextureCacheSize(): number {
    let count = 0;
    textureCache.forEach(tex => {
        if (tex && !tex.destroyed) count++;
    });
    return count;
}


/* ==========================================================================
   PALETTES: Refined, Low-Contrast Slate-Blue Workshop Palette
   ========================================================================== */
export const PALETTE = {
    // Large Concrete Slabs (Low contrast, bluish-slate shades)
    floorBase: '#1c222b',
    floorAlt1: '#1f2530',
    floorAlt2: '#222834',
    floorGrout: '#171c24', // Subtle 1px seam
    floorGuide: '#334155', // Muted guideline strip

    // Wall & Roof Structure
    wallDark: '#28303e',
    wallMid: '#313a4b',
    wallLight: '#3d485c',
    wallSeam: '#1e2430',
    girderSteel: '#475569',
    girderDark: '#334155',

    // Machinery & Steels (Roland style)
    machineChassis: '#1e293b',
    machineSteel: '#334155',
    machineLight: '#475569',
    machineTrim: '#64748b',
    machineWhite: '#f8fafc',
    machineGlass: '#0ea5e9',

    // Plotter Vinyl & Inks
    vinylRoll: '#e2e8f0',
    vinylShadow: '#94a3b8',
    vinylPrintedCyan: '#06b6d4',
    vinylPrintedMagenta: '#ec4899',
    vinylPrintedYellow: '#eab308',
    vinylPrintedBlack: '#0f172a',

    // Status & Accents
    neonCyan: '#38bdf8',
    neonGreen: '#22c55e',
    neonPink: '#ec4899',
    neonRed: '#ef4444',
    neonAmber: '#f59e0b',
    white: '#ffffff',
    black: '#000000'
};

/* ==========================================================================
   TEXTURE BUILDERS: Large Concrete Slabs (32x32 px) - Low Contrast
   ========================================================================== */
export function getTileLargeConcreteA(): Texture {
    return withOverride('tile_concrete_a', buildTileLargeConcreteA);
}
function buildTileLargeConcreteA(): Texture {
    const rowTop = 'G' + 'A'.repeat(30) + 'G';
    const rowMid = 'G' + 'B'.repeat(30) + 'G';
    const rowAlt = 'G' + 'A'.repeat(15) + 'B'.repeat(15) + 'G';
    const rowBot = 'G'.repeat(32);

    const matrix: string[] = [rowTop];
    for (let i = 0; i < 30; i++) {
        matrix.push(i % 5 === 0 ? rowAlt : rowMid);
    }
    matrix.push(rowBot);

    const palette = {
        'G': PALETTE.floorGrout,
        'A': PALETTE.floorBase,
        'B': PALETTE.floorAlt1
    };
    return createPixelTexture('tile_large_concrete_a', matrix, palette);
}

export function getTileLargeConcreteB(): Texture {
    return withOverride('tile_concrete_b', buildTileLargeConcreteB);
}
function buildTileLargeConcreteB(): Texture {
    const rowTop = 'G' + 'B'.repeat(30) + 'G';
    const rowMid = 'G' + 'C'.repeat(30) + 'G';
    const rowAlt = 'G' + 'C'.repeat(10) + 'B'.repeat(20) + 'G';
    const rowBot = 'G'.repeat(32);

    const matrix: string[] = [rowTop];
    for (let i = 0; i < 30; i++) {
        matrix.push(i % 4 === 0 ? rowAlt : rowMid);
    }
    matrix.push(rowBot);

    const palette = {
        'G': PALETTE.floorGrout,
        'B': PALETTE.floorAlt1,
        'C': PALETTE.floorAlt2
    };
    return createPixelTexture('tile_large_concrete_b', matrix, palette);
}

/* ==========================================================================
   TEXTURE BUILDERS: Wall, Windows & Signs
   ========================================================================== */
export function getWallTileTexture(): Texture {
    return withOverride('wall_tile', buildWallTileTexture);
}
function buildWallTileTexture(): Texture {
    const matrix = [
        'LLLLLLLLLLLLLLLL',
        'MMMMMMMMMMMMMMMM',
        'MDDDMDDDMDDDMDDD',
        'MDDDMDDDMDDDMDDD',
        'MMMMMMMMMMMMMMMM',
        'DDMDDDMDDDMDDDMD',
        'DDMDDDMDDDMDDDMD',
        'MMMMMMMMMMMMMMMM',
        'MDDDMDDDMDDDMDDD',
        'MDDDMDDDMDDDMDDD',
        'MMMMMMMMMMMMMMMM',
        'DDMDDDMDDDMDDDMD',
        'DDMDDDMDDDMDDDMD',
        'MMMMMMMMMMMMMMMM',
        'SSSSSSSSSSSSSSSS',
        'ZZZZZZZZZZZZZZZZ'
    ];
    const palette = {
        'L': PALETTE.wallLight,
        'M': PALETTE.wallMid,
        'D': PALETTE.wallDark,
        'S': PALETTE.girderDark,
        'Z': PALETTE.floorGrout
    };
    return createPixelTexture('wall_brick_tile_v2', matrix, palette);
}

export function getWindowTexture(): Texture {
    return withOverride('window', buildWindowTexture);
}
function buildWindowTexture(): Texture {
    // Ventana industrial ampliada (52x18 px) con marco metálico y 4 paneles translúcidos
    const matrix = [
        'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
        'FGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGW',
        'FGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGW',
        'FGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGW',
        'FGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGW',
        'FGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGW',
        'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
        'FGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGW',
        'FGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGW',
        'FGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGW',
        'FGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGW',
        'FGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGW',
        'FGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGLLLLLLLLGGGGW',
        'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
        'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'
    ];
    const palette = {
        'F': '#475569',
        'W': '#1e293b',
        'G': '#0f172a',
        'L': '#38bdf8'
    };
    return createPixelTexture('window_industrial_large_v3', matrix, palette);
}

export function getSignDenTexture(): Texture {
    return withOverride('sign_den', buildSignDenTexture);
}
function buildSignDenTexture(): Texture {
    // Cartel "DEN" ampliado (46x16 px) estilo placa industrial de esmalte rojo y tornillos
    const matrix = [
        '##############################################',
        '#O..........................................O#',
        '#.RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR.#',
        '#.RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR.#',
        '#.RR..DDDDD....EEEEEEE..NN.....NN...RRRRRRRR.#',
        '#.RR..DD..DD...EE.......NNN....NN...RRRRRRRR.#',
        '#.RR..DD...DD..EE.......NNNN...NN...RRRRRRRR.#',
        '#.RR..DD...DD..EEEEE....NN.NN..NN...RRRRRRRR.#',
        '#.RR..DD...DD..EEEEE....NN..NN.NN...RRRRRRRR.#',
        '#.RR..DD...DD..EE.......NN...NNNN...RRRRRRRR.#',
        '#.RR..DD..DD...EE.......NN....NNN...RRRRRRRR.#',
        '#.RR..DDDDD....EEEEEEE..NN.....NN...RRRRRRRR.#',
        '#.RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR.#',
        '#.RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR.#',
        '#O..........................................O#',
        '##############################################'
    ];
    const palette = {
        '#': '#090d16',
        'O': '#94a3b8', // Tornillos esquineros
        '.': '#991b1b', // Borde bisel rojo oscuro
        'R': '#dc2626', // Fondo rojo vivo
        'D': '#ffffff',
        'E': '#ffffff',
        'N': '#ffffff'
    };
    return createPixelTexture('sign_den_expanded_v3', matrix, palette);
}

/* ==========================================================================
   TEXTURE BUILDERS: Professional Grand-Format Plotter Sprites (Fase 2)
   ========================================================================== */

/**
 * Plotter Chassis / Frame (204x48 px pixel art)
 * Proporción 40-45% del ancho de taller, Roland VG2 gran formato.
 */
export function getPlotterChassisTexture(isOffline = false): Texture {
    return withOverride(isOffline ? 'plotter_chassis_offline' : 'plotter_chassis', () => buildPlotterChassisTexture(isOffline));
}
function buildPlotterChassisTexture(isOffline = false): Texture {
    const key = isOffline ? 'plotter_chassis_204_offline' : 'plotter_chassis_204_online';
    const cached = textureCache.get(key);
    if (isTextureValid(cached)) return cached!;

    const W = 204;
    const H = 48;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const cBody = isOffline ? '#475569' : '#1e293b';
    const cHighlight = isOffline ? '#64748b' : '#64748b';
    const cTrim = isOffline ? '#334155' : '#38bdf8';
    const cDark = '#090d16';

    // 1. Patas dobles reforzadas y ruedas de soporte
    // Pata izquierda
    ctx.fillStyle = cDark;
    ctx.fillRect(16, 22, 8, 22);
    ctx.fillRect(10, 40, 20, 5); // Base del pie
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(9, 44, 5, 4);   // Rueda izq
    ctx.fillRect(24, 44, 5, 4);  // Rueda der

    // Pata derecha
    ctx.fillStyle = cDark;
    ctx.fillRect(W - 24, 22, 8, 22);
    ctx.fillRect(W - 30, 40, 20, 5); // Base del pie
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(W - 31, 44, 5, 4);  // Rueda izq
    ctx.fillRect(W - 16, 44, 5, 4);  // Rueda der

    // Travesaño central inferior entre patas
    ctx.fillStyle = cDark;
    ctx.fillRect(24, 32, W - 48, 3);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(24, 33, W - 48, 1);

    // 2. Chasis Superior de la Máquina Roland
    ctx.fillStyle = cBody;
    ctx.fillRect(6, 4, W - 12, 22);

    // Bisel superior de la tapa
    ctx.fillStyle = cHighlight;
    ctx.fillRect(8, 4, W - 16, 2);

    // Franja Roland cyan de acento
    ctx.fillStyle = cTrim;
    ctx.fillRect(8, 7, W - 16, 2);

    // 3. Ranura central de impresión / Carro de cabezal
    const bedLeft = 24;
    const bedRight = W - 38;
    const bedW = bedRight - bedLeft;
    ctx.fillStyle = '#000000';
    ctx.fillRect(bedLeft, 11, bedW, 14);

    // Riel metálico del carro
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(bedLeft, 13, bedW, 2);

    // 4. Panel de Control y Pantalla LCD en ala derecha
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(W - 34, 7, 24, 17);
    ctx.fillStyle = isOffline ? '#1e293b' : '#0284c7';
    ctx.fillRect(W - 32, 9, 20, 6); // Pantalla LCD
    // LEDs de estado en el panel
    if (isOffline) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(W - 32, 17, 4, 4);
        ctx.fillRect(W - 25, 17, 4, 4);
        ctx.fillRect(W - 18, 17, 4, 4);
    } else {
        ctx.fillStyle = '#22c55e'; // LED verde activo
        ctx.fillRect(W - 32, 17, 4, 4);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(W - 25, 17, 4, 4);
        ctx.fillRect(W - 18, 17, 4, 4);
    }

    // 5. Bandeja de recepción de vinilo frontal (canasto de caída)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, 24, bedW + 8, 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(24, 26, bedW, 12);

    const texture = Texture.from(canvas, true);
    if (texture.source) {
        texture.source.scaleMode = 'nearest';
    }
    textureCache.set(key, texture);
    return texture;
}

/**
 * Printhead Carriage (Carro de cabezales móvil)
 */
export function getPlotterPrintheadTexture(): Texture {
    return withOverride('plotter_printhead', buildPlotterPrintheadTexture);
}
function buildPlotterPrintheadTexture(): Texture {
    const matrix = [
        '..KKKKKKKK..',
        '.KCCCCCCCCK.',
        'KCCCCCCCCCCK',
        'KCGGGGGGGGKK',
        'KCLLLLLLLLCK',
        'KCLLLLLLLLCK',
        'KCCCCCCCCCCK',
        '.KKKKKKKKKK.'
    ];
    const palette = {
        'K': '#0f172a',
        'C': '#334155',
        'G': '#64748b',
        'L': '#38bdf8'
    };
    return createPixelTexture('plotter_printhead', matrix, palette);
}

/**
 * Vinyl Roll on Feed Core (Bobina ancha de vinilo)
 */
export function getPlotterVinylRollTexture(): Texture {
    return withOverride('plotter_vinyl_roll', buildPlotterVinylRollTexture);
}
function buildPlotterVinylRollTexture(): Texture {
    const key = 'plotter_vinyl_roll_wide_204';
    const cached = textureCache.get(key);
    if (isTextureValid(cached)) return cached!;

    const W = 146;
    const H = 8;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Cuerpo de la bobina
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 1, W, 4);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 5, W, 3);

    // Tapas laterales de anclaje
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 4, H);
    ctx.fillRect(W - 4, 0, 4, H);

    const texture = Texture.from(canvas, true);
    if (texture.source) {
        texture.source.scaleMode = 'nearest';
    }
    textureCache.set(key, texture);
    return texture;
}
