// workshopSprites.ts - Procedural Pixel Art Generator for PixiJS (XignuX Print Den)
// Generates nearest-neighbor pixel art textures via offscreen HTML5 canvas.
// Architecture is 100% prepared to swap or supplement textures with external PNG spritesheets later.

import { Texture } from 'pixi.js';

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
    const matrix = [
        'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
        'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'
    ];
    const palette = {
        'F': '#475569',
        'W': '#1e293b',
        'G': '#0f172a',
        'L': '#38bdf8'
    };
    return createPixelTexture('window_32x11', matrix, palette);
}

export function getSignDenTexture(): Texture {
    const matrix = [
        '####################',
        '#RRRRRRRRRRRRRRRRRR#',
        '#R.DD..EEE.N...N..R#',
        '#R.D.D.E...NN..N..R#',
        '#R.D.D.EE..N.N.N..R#',
        '#R.D.D.E...N..NN..R#',
        '#R.DD..EEE.N...N..R#',
        '#RRRRRRRRRRRRRRRRRR#',
        '####################'
    ];
    const palette = {
        '#': '#0f172a',
        'R': '#ef4444',
        'D': '#ffffff',
        'E': '#ffffff',
        'N': '#ffffff',
        '.': '#ef4444'
    };
    return createPixelTexture('sign_den', matrix, palette);
}

/* ==========================================================================
   TEXTURE BUILDERS: Professional Grand-Format Plotter Sprites (Fase 2)
   ========================================================================== */

/**
 * Plotter Chassis / Frame (110x48 px pixel art)
 * Features dual stand legs with wheels, rear roll-feed bracket, main Roland chassis,
 * front drop guide, and top cover.
 */
export function getPlotterChassisTexture(isOffline = false): Texture {
    const key = isOffline ? 'plotter_chassis_offline' : 'plotter_chassis_online';
    const cached = textureCache.get(key);
    if (isTextureValid(cached)) return cached!;

    const W = 110;
    const H = 48;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const cBody = isOffline ? '#475569' : '#1e293b';
    const cSteel = isOffline ? '#334155' : '#334155';
    const cHighlight = isOffline ? '#64748b' : '#64748b';
    const cTrim = isOffline ? '#334155' : '#38bdf8';
    const cDark = '#090d16';

    // 1. Legs & Feet with Castors (Left & Right)
    // Left leg
    ctx.fillStyle = cDark;
    ctx.fillRect(10, 24, 6, 20);
    ctx.fillRect(6, 42, 14, 4); // foot
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(5, 44, 4, 3); // wheels
    ctx.fillRect(17, 44, 4, 3);

    // Right leg
    ctx.fillStyle = cDark;
    ctx.fillRect(W - 16, 24, 6, 20);
    ctx.fillRect(W - 20, 42, 14, 4); // foot
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(W - 21, 44, 4, 3);
    ctx.fillRect(W - 9, 44, 4, 3);

    // Crossbar between legs
    ctx.fillStyle = cDark;
    ctx.fillRect(16, 34, W - 32, 3);

    // 2. Main Machine Housing
    // Main upper box
    ctx.fillStyle = cBody;
    ctx.fillRect(4, 6, W - 8, 22);

    // Top hood highlight bevel
    ctx.fillStyle = cHighlight;
    ctx.fillRect(6, 6, W - 12, 2);

    // Front horizontal Roland color accent line
    ctx.fillStyle = cTrim;
    ctx.fillRect(6, 9, W - 12, 2);

    // 3. Central Print Bed / Guide Bar Slot
    ctx.fillStyle = '#000000';
    ctx.fillRect(14, 13, W - 28, 12);

    // Steel printhead rail guide
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(14, 15, W - 28, 2);

    // 4. Control Panel on Right Wing
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(W - 24, 9, 16, 16);
    ctx.fillStyle = isOffline ? '#334155' : '#0284c7';
    ctx.fillRect(W - 22, 11, 12, 6); // LCD Screen
    // Status button LEDs
    ctx.fillStyle = isOffline ? '#ef4444' : '#22c55e';
    ctx.fillRect(W - 22, 19, 3, 3);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(W - 17, 19, 3, 3);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(W - 12, 19, 3, 3);

    // 5. Front Catch Basket / Collection Tray Frame
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(12, 26, W - 24, 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(16, 28, W - 32, 10);

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
 * Vinyl Roll on Feed Core (Loaded on the back)
 */
export function getPlotterVinylRollTexture(): Texture {
    const key = 'plotter_vinyl_roll';
    const cached = textureCache.get(key);
    if (isTextureValid(cached)) return cached!;

    const W = 76;
    const H = 8;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Roll cylinder
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 1, W, 4);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 5, W, 3);

    // Roll side caps
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 3, H);
    ctx.fillRect(W - 3, 0, 3, H);

    const texture = Texture.from(canvas, true);
    if (texture.source) {
        texture.source.scaleMode = 'nearest';
    }
    textureCache.set(key, texture);
    return texture;
}
