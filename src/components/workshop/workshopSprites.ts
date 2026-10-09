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
 * Renders a character matrix into an offscreen canvas and returns a Pixi Texture with scaleMode = 'nearest'.
 */
export function createPixelTexture(
    cacheKey: string,
    matrix: string[],
    palette: Record<string, string>,
    pixelScale = 1
): Texture {
    if (textureCache.has(cacheKey)) {
        return textureCache.get(cacheKey)!;
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

    // Pixi v8 Texture.from with nearest scale mode
    const texture = Texture.from(canvas, {
        scaleMode: 'nearest'
    });

    textureCache.set(cacheKey, texture);
    return texture;
}

/**
 * Clears the texture cache on unmount to prevent GPU memory leaks
 */
export function destroyTextureCache(): void {
    textureCache.forEach(tex => tex.destroy(true));
    textureCache.clear();
}

/* ==========================================================================
   PALETTES: Limited, Cohesive 16-Bit Industrial & Workshop Palette
   ========================================================================== */
export const PALETTE = {
    // Concrete & Steels
    floorDark: '#23201d',
    floorMid: '#2d2825',
    floorLight: '#39332f',
    floorRivet: '#1d1a18',
    grout: '#181614',

    // Wall & Wood
    wallBase: '#3c302a',
    wallShadow: '#2c221d',
    wallHighlight: '#4e3f37',
    girderSteel: '#475569',
    girderDark: '#334155',

    // Industrial Safety
    hazardYellow: '#f59e0b',
    hazardBlack: '#18181b',

    // Metals & Machinery
    machineBody: '#334155',
    machineDark: '#1e293b',
    machineLight: '#64748b',
    machineHighlight: '#94a3b8',

    // Neons & Accents
    neonCyan: '#38bdf8',
    neonGreen: '#22c55e',
    neonPink: '#ec4899',
    neonRed: '#ef4444',
    neonOrange: '#f97316',
    white: '#ffffff',
    black: '#000000'
};

/* ==========================================================================
   TEXTURE BUILDERS: Floor Tiles (16x16 px)
   ========================================================================== */
export function getTileTextureConcreteA(): Texture {
    const matrix = [
        '###############.',
        '#..............#',
        '#..X...........#',
        '#..............#',
        '#..........X...#',
        '#..............#',
        '#..............#',
        '#..............#',
        '#.....X........#',
        '#..............#',
        '#..............#',
        '#..........X...#',
        '#..............#',
        '#..X...........#',
        '#..............#',
        '.###############'
    ];
    const palette = {
        '#': PALETTE.grout,
        '.': PALETTE.floorMid,
        'X': PALETTE.floorLight
    };
    return createPixelTexture('tile_concrete_a', matrix, palette);
}

export function getTileTextureConcreteB(): Texture {
    const matrix = [
        '###############.',
        '#R............R#',
        '#..............#',
        '#....XXXXX.....#',
        '#....X...X.....#',
        '#....X...X.....#',
        '#....XXXXX.....#',
        '#..............#',
        '#..............#',
        '#....XXXXX.....#',
        '#....X...X.....#',
        '#....X...X.....#',
        '#....XXXXX.....#',
        '#..............#',
        '#R............R#',
        '.###############'
    ];
    const palette = {
        '#': PALETTE.grout,
        '.': PALETTE.floorDark,
        'X': PALETTE.floorMid,
        'R': PALETTE.floorRivet
    };
    return createPixelTexture('tile_concrete_b', matrix, palette);
}

export function getTileTextureHazard(): Texture {
    const matrix = [
        'YY..YY..YY..YY..',
        '.YY..YY..YY..YY.',
        '..YY..YY..YY..YY',
        'Y..YY..YY..YY..Y',
        'YY..YY..YY..YY..',
        '.YY..YY..YY..YY.',
        '..YY..YY..YY..YY',
        'Y..YY..YY..YY..Y',
        'YY..YY..YY..YY..',
        '.YY..YY..YY..YY.',
        '..YY..YY..YY..YY',
        'Y..YY..YY..YY..Y',
        'YY..YY..YY..YY..',
        '.YY..YY..YY..YY.',
        '..YY..YY..YY..YY',
        'Y..YY..YY..YY..Y'
    ];
    const palette = {
        'Y': PALETTE.hazardYellow,
        '.': PALETTE.hazardBlack
    };
    return createPixelTexture('tile_hazard', matrix, palette);
}

/* ==========================================================================
   TEXTURE BUILDERS: Wall & Window Elements
   ========================================================================== */
export function getWallTileTexture(): Texture {
    const matrix = [
        '................',
        '################',
        '#...#...#...#...',
        '#...#...#...#...',
        '################',
        '..#...#...#...#.',
        '..#...#...#...#.',
        '################',
        '#...#...#...#...',
        '#...#...#...#...',
        '################',
        '..#...#...#...#.',
        '..#...#...#...#.',
        '################',
        'SSSSSSSSSSSSSSSS',
        'ZZZZZZZZZZZZZZZZ'
    ];
    const palette = {
        '.': PALETTE.wallHighlight,
        '#': PALETTE.wallShadow,
        'S': PALETTE.girderDark,
        'Z': PALETTE.hazardBlack
    };
    return createPixelTexture('wall_brick_tile', matrix, palette);
}

export function getWindowTexture(): Texture {
    const matrix = [
        'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
        'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
        'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGLLLLLLLLGGGGGGGGGGLLLLLLLLGGW',
        'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
        'FGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
        'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'
    ];
    const palette = {
        'F': '#64748b',
        'W': '#334155',
        'G': '#0f172a',
        'L': '#38bdf8'
    };
    return createPixelTexture('window_32x16', matrix, palette);
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
