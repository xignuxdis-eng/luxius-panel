// workshopCamera.ts - Cámara del Print Den (Bloque E): zoom y desplazamiento con límites.
// Funciones puras (sin Pixi) para poder probarlas fácilmente.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
export const MAP_W_LOGICAL = 480;
export const MAP_H_LOGICAL = 270;

export interface Camera {
    zoom: number;
    /** Desplazamiento en píxeles de pantalla (<= 0 cuando hay zoom). */
    panX: number;
    panY: number;
}

export const DEFAULT_CAMERA: Camera = { zoom: 1, panX: 0, panY: 0 };

/** Mantiene el mapa cubriendo toda la vista (sin bordes vacíos). */
export function clampCamera(cam: Camera, viewW: number, viewH: number, baseScale: number): Camera {
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom));
    const total = baseScale * zoom;
    const minPanX = Math.min(0, viewW - MAP_W_LOGICAL * total);
    const minPanY = Math.min(0, viewH - MAP_H_LOGICAL * total);
    return {
        zoom,
        panX: Math.max(minPanX, Math.min(0, cam.panX)),
        panY: Math.max(minPanY, Math.min(0, cam.panY))
    };
}

/** Cambia el zoom manteniendo fijo el punto del mapa que está bajo el puntero (px, py en píxeles de pantalla). */
export function zoomAt(cam: Camera, factor: number, px: number, py: number, viewW: number, viewH: number, baseScale: number): Camera {
    const oldTotal = baseScale * cam.zoom;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom * factor));
    const newTotal = baseScale * newZoom;
    const wx = (px - cam.panX) / oldTotal;
    const wy = (py - cam.panY) / oldTotal;
    return clampCamera({ zoom: newZoom, panX: px - wx * newTotal, panY: py - wy * newTotal }, viewW, viewH, baseScale);
}
