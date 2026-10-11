// workshopSpriteOverrides.ts - Carga de imágenes PNG que reemplazan los dibujos procedurales del Print Den.
// Se configura en content/sprites.ts. Todo es opcional y a prueba de errores: si una imagen no carga, se usa el dibujo original.

import { Texture } from 'pixi.js';
import { SPRITE_OVERRIDES, type StationImage } from './content/sprites';

const textures = new Map<string, Texture>();
const sheets = new Map<string, Texture>();
const stationImages = new Map<string, { tex: Texture; def: StationImage }>();
let loaded = false;

function loadImage(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn(`[sprites] No se pudo cargar ${url}; se usa el dibujo original.`);
            resolve(null);
        };
        img.src = url;
    });
}

/** Copia la imagen a un canvas y la convierte en textura nítida (sin suavizado). */
function toTexture(img: HTMLImageElement): Texture | null {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);
        const tex = Texture.from(canvas, true);
        if (tex.source) tex.source.scaleMode = 'nearest';
        return tex;
    } catch (_) {
        return null;
    }
}

/** Carga todas las imágenes configuradas en content/sprites.ts. Llamar una vez antes de armar el taller. */
export async function preloadSpriteOverrides(): Promise<void> {
    if (loaded) return;
    loaded = true;
    const jobs: Promise<void>[] = [];
    const add = (url: string | undefined, onTex: (t: Texture) => void) => {
        if (!url) return;
        jobs.push(
            loadImage(url).then((img) => {
                const t = img ? toTexture(img) : null;
                if (t) onTex(t);
            })
        );
    };
    Object.entries(SPRITE_OVERRIDES.textures).forEach(([name, url]) => add(url, (t) => textures.set(name, t)));
    Object.entries(SPRITE_OVERRIDES.characters).forEach(([key, url]) => add(url, (t) => sheets.set(key, t)));
    Object.entries(SPRITE_OVERRIDES.stationProps).forEach(([id, def]) => add(def.url, (t) => stationImages.set(id, { tex: t, def })));
    await Promise.all(jobs);
}

/** Textura de reemplazo para un dibujo suelto, o null si no hay. */
export function getTextureOverride(name: string): Texture | null {
    const t = textures.get(name);
    return t && !t.destroyed ? t : null;
}

/**
 * Devuelve la imagen de reemplazo si existe (avisando por consola si su tamaño no coincide con el original);
 * si no, el dibujo procedural.
 */
export function withOverride(name: string, make: () => Texture): Texture {
    const o = getTextureOverride(name);
    if (!o) return make();
    try {
        const d = make();
        if (d.width !== o.width || d.height !== o.height) {
            console.warn(`[sprites] '${name}' mide ${o.width}x${o.height}; el original mide ${d.width}x${d.height}. Se muestra igual, pero puede verse desfasado.`);
        }
    } catch (_) {}
    return o;
}

/** Hoja completa de un operario (clave: rol, 'default' o 'guest_*'), o null. */
export function getCharacterSheet(key: string): Texture | null {
    const t = sheets.get(key);
    return t && !t.destroyed ? t : null;
}

/** Imagen de reemplazo de los objetos de una estación, o null. */
export function getStationImage(id: string): { tex: Texture; def: StationImage } | null {
    return stationImages.get(id) ?? null;
}
