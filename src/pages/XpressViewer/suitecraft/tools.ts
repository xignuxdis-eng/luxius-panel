/**
 * SuiteCraft — Registro central de herramientas gráficas oficiales de Storytold:
 * - PhotoCraft (ráster / mapas de bits): https://github.com/storytold/photocraft
 * - VectorCraft (vectorial / SVG): https://github.com/storytold/vectorcraft
 *
 * Integradas como sub-aplicaciones estáticas aisladas en `public/suitecraft/{toolId}/index.html`
 * para garantizar cero conflictos de dependencias, estilos Vanilla y máxima estabilidad.
 * Las URLs pueden sobreescribirse opcionalmente por variables de entorno de Vite:
 *   VITE_PHOTOCRAFT_URL=https://...
 *   VITE_VECTORCRAFT_URL=https://...
 */

export type CraftToolId = 'photocraft' | 'vectorcraft';

export interface CraftToolConfig {
    id: CraftToolId;
    name: string;
    subtitle: string;
    badge: string;
    url: string;
}

/**
 * Resuelve la URL de la herramienta SuiteCraft.
 * Prioriza variable de entorno si existe; de lo contrario resuelve la ruta relativa
 * estática local en `suitecraft/{toolId}/index.html`.
 */
export const getSuitecraftToolUrl = (toolId: CraftToolId): string => {
    const envUrl = toolId === 'photocraft'
        ? import.meta.env.VITE_PHOTOCRAFT_URL
        : import.meta.env.VITE_VECTORCRAFT_URL;

    if (envUrl && envUrl.trim().length > 0) {
        return envUrl.trim();
    }

    if (typeof window === 'undefined') {
        return `./suitecraft/${toolId}/index.html`;
    }

    try {
        const basePath = window.location.pathname.replace(/\/[^/]*$/, '/');
        const resolved = new URL(`suitecraft/${toolId}/index.html`, `${window.location.origin}${basePath}`);
        return resolved.href;
    } catch {
        return `./suitecraft/${toolId}/index.html`;
    }
};

export const SUITE_CRAFT_TOOLS: Record<CraftToolId, CraftToolConfig> = {
    photocraft: {
        id: 'photocraft',
        name: 'PhotoCraft',
        subtitle: 'Editor ráster y mapas de bits (Storytold)',
        badge: 'RÁSTER',
        get url() {
            return getSuitecraftToolUrl('photocraft');
        },
    },
    vectorcraft: {
        id: 'vectorcraft',
        name: 'VectorCraft',
        subtitle: 'Editor vectorial, curvas Bézier y SVG (Storytold)',
        badge: 'VECTOR',
        get url() {
            return getSuitecraftToolUrl('vectorcraft');
        },
    },
};

/** Orden canónico de las herramientas SuiteCraft. */
export const CRAFT_TOOL_IDS: readonly CraftToolId[] = ['photocraft', 'vectorcraft'];

/** Esquemas que un editor remoto o sub-app no puede descargar directamente por red. */
const NON_FETCHABLE_URL = /^(blob|data|file|javascript|about):/i;

/**
 * Normaliza una referencia de archivo a una URL absoluta http(s) que un
 * tercero o sub-app pueda descargar. Devuelve `null` para blobs, data URIs y
 * esquemas no accesibles por red.
 */
export const toAbsoluteFileUrl = (value?: string | null): string | null => {
    if (!value) return null;

    const trimmed = value.trim();
    if (!trimmed || NON_FETCHABLE_URL.test(trimmed)) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (typeof window === 'undefined') return null;

    try {
        const resolved = new URL(trimmed, window.location.origin);
        return /^https?:$/.test(resolved.protocol) ? resolved.href : null;
    } catch {
        return null;
    }
};

/**
 * Construye la URL final del iframe. Si hay un archivo accesible por red se
 * entrega con el protocolo Live URL en el hash, permitiendo precarga inmediata.
 */
export const buildCraftToolUrl = (tool: CraftToolConfig, fileUrl?: string | null): string => {
    const base = tool.url.trim().split('#')[0];
    const file = toAbsoluteFileUrl(fileUrl);

    if (!file) return base;

    return `${base}#${encodeURIComponent(JSON.stringify({ files: [file] }))}`;
};
