/**
 * SuiteCraft — Registro central de herramientas gráficas.
 *
 * Photocraft (raster) y Vectorcraft (vectorial) son aplicaciones externas que
 * se embeben con `<iframe>`. La URL de cada una puede sobreescribirse por
 * variables de entorno de Vite para apuntar a instancias propias:
 *
 *   VITE_PHOTOCRAFT_URL=https://photocraft.luxius.app
 *   VITE_VECTORCRAFT_URL=https://vectorcraft.luxius.app
 *
 * Los valores por defecto son Photopea y Vectorpea, que comparten el mismo
 * motor y entienden el protocolo de "Live URL": la lista de archivos a abrir
 * viaja en el hash del iframe (`#{"files":["<url>"]}`). Cualquier otro host
 * simplemente ignora ese hash, por lo que el fallback es seguro.
 */

export type CraftToolId = 'photocraft' | 'vectorcraft';

export interface CraftToolConfig {
    id: CraftToolId;
    name: string;
    subtitle: string;
    url: string;
    badge: string;
}

export const SUITE_CRAFT_TOOLS: Record<CraftToolId, CraftToolConfig> = {
    photocraft: {
        id: 'photocraft',
        name: 'Photocraft',
        subtitle: 'Edición de imágenes, retoque y mapas de bits',
        url: import.meta.env.VITE_PHOTOCRAFT_URL || 'https://www.photopea.com',
        badge: 'RASTER',
    },
    vectorcraft: {
        id: 'vectorcraft',
        name: 'Vectorcraft',
        subtitle: 'Diseño vectorial, trazados y curvas de corte',
        url: import.meta.env.VITE_VECTORCRAFT_URL || 'https://www.vectorpea.com',
        badge: 'VECTOR',
    },
};

/** Orden de aparición de las herramientas en el conmutador superior. */
export const CRAFT_TOOL_IDS: readonly CraftToolId[] = ['photocraft', 'vectorcraft'];

/** Esquemas que un editor remoto no puede descargar por sí mismo. */
const NON_FETCHABLE_URL = /^(blob|data|file|javascript|about):/i;

/**
 * Normaliza una referencia de archivo a una URL absoluta http(s) que un
 * tercero pueda descargar. Devuelve `null` para blobs, data URIs y cualquier
 * valor que no represente un recurso accesible por red.
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
 * entrega al editor mediante el protocolo Live URL, de modo que el operador
 * no tenga que volver a buscarlo a mano (los archivos de la OT viven detrás
 * de autenticación y no son navegables desde el disco del editor).
 */
export const buildCraftToolUrl = (tool: CraftToolConfig, fileUrl?: string | null): string => {
    const base = tool.url.trim().split('#')[0];
    const file = toAbsoluteFileUrl(fileUrl);

    if (!file) return base;

    return `${base}#${encodeURIComponent(JSON.stringify({ files: [file] }))}`;
};
