// content/sprites.ts - CAMBIAR / MEJORAR SPRITES (solo datos). Por defecto TODO se dibuja por código (procedural).
// Para reemplazar un dibujo por una imagen PNG tuya:
//   1. Copiá el PNG a la carpeta  public/workshop-sprites/
//   2. Agregá una línea acá abajo con el nombre del archivo (usá spriteUrl('archivo.png')).
//   3. Recargá la página. Si el archivo falta o falla, el taller usa el dibujo original (nunca se rompe) y avisa en consola.
// Para volver al dibujo original, borrá la línea.
//
// Los PNG se muestran SIN suavizado (pixel art nítido). Mantené el mismo tamaño que el dibujo original: si no coincide,
// la consola del navegador avisa con el tamaño esperado ("[sprites] ... mide 100x40; el original mide 204x56").

const base: string = (import.meta as any).env?.BASE_URL ?? '/';

/** Ruta pública de un archivo de public/workshop-sprites/. Funciona también en la versión publicada (GitHub Pages). */
export const spriteUrl = (file: string): string => `${base}workshop-sprites/${file}`;

/** Nombres de dibujos sueltos que se pueden reemplazar. */
export type TextureName =
    | 'plotter_chassis' //          cuerpo del plotter (en línea)
    | 'plotter_chassis_offline' //  cuerpo del plotter (desconectado)
    | 'plotter_printhead' //        cabezal que se mueve
    | 'plotter_vinyl_roll' //       rollo de vinilo
    | 'sign_den' //                 cartel "DEN"
    | 'window' //                   ventana
    | 'wall_tile' //                baldosa de la pared
    | 'tile_concrete_a' //          baldosa del piso A
    | 'tile_concrete_b'; //         baldosa del piso B

export interface StationImage {
    url: string;
    /** Posición relativa a la esquina de la estación (por defecto 0, 16: debajo del título). */
    x?: number;
    y?: number;
    /** Tamaño en píxeles del mapa (por defecto: todo el espacio de la estación bajo el título). */
    w?: number;
    h?: number;
}

export const SPRITE_OVERRIDES = {
    /**
     * Dibujos sueltos (plotter, ventana, cartel, baldosas...).
     * Ejemplo:  plotter_chassis: spriteUrl('plotter.png'),
     */
    textures: {} as Partial<Record<TextureName, string>>,

    /**
     * Operarios: una hoja de sprites PNG por rol ('disenador' | 'impresor' | 'cortador' | 'empaquetador'),
     * o 'default' para todos los que no tengan hoja propia. Las visitas usan 'guest_repartidor', 'guest_tecnico', 'guest_guardia'.
     * Diseño de la hoja (cada cuadro 16×24 px, hoja de 64×120 px = 4 columnas × 5 filas), ver CHARACTER_SHEET_LAYOUT.
     * Ejemplo:  disenador: spriteUrl('operario-diseno.png'),
     */
    characters: {} as Record<string, string>,

    /**
     * Objetos de las estaciones (escritorio, estantería, mesa de corte, etc.): una imagen estática por estación
     * ('diseno', 'insumos', 'corte', 'empaque', 'despacho', 'caja') que REEMPLAZA el dibujo procedural.
     * Nota: una imagen estática no tiene animaciones ni pilas de cajas con el contador de órdenes.
     * Ejemplo:  corte: { url: spriteUrl('mesa-corte.png') },
     */
    stationProps: {} as Record<string, StationImage>
};

/**
 * Diseño de la hoja de un operario (cuadros de 16×24 px; hoja de 64×120 px):
 *   fila 0: caminar hacia ABAJO (frente)   4 cuadros: paso neutro, paso A, paso neutro, paso B
 *   fila 1: caminar hacia ARRIBA (espalda) 4 cuadros
 *   fila 2: caminar a la IZQUIERDA         4 cuadros
 *   fila 3: caminar a la DERECHA           4 cuadros
 *   fila 4: col 0 = (reservada) · col 1 = respiro (de frente) · col 2 y 3 = trabajando (2 cuadros)
 */
export const CHARACTER_SHEET_LAYOUT = {
    walkRows: { down: 0, up: 1, left: 2, right: 3 } as Record<'down' | 'up' | 'left' | 'right', number>,
    walkCols: 4,
    idleRow: 4,
    idleBreathCol: 1,
    workRow: 4,
    workCols: [2, 3] as [number, number]
};
