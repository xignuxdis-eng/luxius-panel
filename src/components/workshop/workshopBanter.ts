// workshopBanter.ts - Charlas de los operarios (Fase 3, sub-etapa 4.6: "banter")
// Cultura pop y videojuegos (clásicos y actuales), siempre con humor y elogiando la calidad de
// impresión y de los diseños. Cada charla es una lista de frases: la 1.ª la dice quien se acerca,
// la 2.ª quien lo espera, la 3.ª otra vez quien se acercó, y así. Frases cortas (se muestran en un globo).

export const BANTER_SCRIPTS: string[][] = [
    ['¡Che, qué calidad de impresión! Parece 4K.', 'Es peligroso ir solo... llevate este vinilo.'],
    ['Ese diseño es nivel Final Boss.', 'Y la impresión... ¡FINISH HIM! Perfecta.'],
    ['¿Viste los colores? ¡Hadouken de calidad!', 'Shoryuken en cada pasada del plotter.'],
    ['La torta es mentira, pero esta lona es real.', 'Y se ve mejor que cualquier remaster.'],
    ['War never changes... pero este diseño lo cambió todo.', 'El cliente va a quedar maravillado.'],
    ['¡It\'s a-me! Vengo a admirar este diseño.', '¡Gracias! Pero la entrega es en otro castillo.'],
    ['Estos negros son más profundos que Dark Souls.', 'Y sin morir ni una vez. Impresión 10/10.'],
    ['¡Do a barrel roll! ...del rollo de lona.', 'Peppy estaría orgulloso de este acabado.'],
    ['¿Querés una misión? Entregar este diseño.', 'Would you kindly... revisar el refilado.'],
    ['Presioná F por las tintas que dieron todo.', 'F. Y el resultado quedó de otro nivel.'],
    ['Ese arte tiene más detalle que Elden Ring.', 'Y lo entregamos sin pelear con Malenia.'],
    ['Sonic correría rápido, pero este plotter es imparable.', 'Y la calidad no pierde ni un anillo.'],
    ['Pac-Man se comió la cola de impresión.', 'Waka waka... ¡qué colores!'],
    ['Este diseño encaja perfecto, como en Tetris.', 'Línea completa. ¡Cero desperdicio de material!'],
    ['Creeper... aw man. Esta impresión no explota.', 'Solo explota de calidad.'],
    ['¡El Jefe Maestro aprobaría este acabado!', 'Terminemos la pelea... digo, el pedido.'],
    ['Este es el camino: tinta, calidad y cero banding.', 'Qué lindo quedó. Digno de Beskar.'],
    ['Estos colores son más vivos que la Matrix.', 'Tomé la pastilla roja: ¡y es CMYK!'],
    ['¡Atrapalos a todos! Pero primero este pedido.', 'Pikachu dice que la impresión es superefectiva.'],
    ['Avengers, a ensamblar... las piezas del diseño.', 'Y que ninguna se pierda en el refilado.'],
    ['Volver al futuro: 88 millas por hora y tinta seca.', 'Great Scott, ¡qué calidad de impresión!'],
    ['¡El diseñador se pasó! Ese arte es legendario.', 'Digno de la Trifuerza. ¡Directo a producción!'],
    ['Misión: que no quede ni una raya.', 'Misión cumplida, soldado. Impresión impecable.'],
    ['Hay un impostor... pero no en este diseño.', 'Todo auténtico: tintas, lona y creatividad.'],
    ['Stay a while and listen: esta lona quedó genial.', 'Lo dice el que nunca se queja de nada.'],
    ['Este degradé es más suave que un Pokémon dormido.', 'Y más nítido que el HUD de Cyberpunk.'],
    ['Skyrim tiene dragones, nosotros tenemos plotters.', 'Y los nuestros sí entregan a tiempo.'],
    ['¿Tendrá un Easter egg este diseño?', 'Sí: la calidad con la que salió.'],
    ['¡Minecraft de calidad! Cada píxel en su lugar.', 'Y sin picar ni un solo bloque de tinta.'],
    ['Nuevo récord: cero errores de color hoy.', 'Logro desbloqueado: Impresor Maestro.']
];

/** Elige el índice de una charla distinta de la anterior. `rng` devuelve un número entre 0 y 1. */
export function pickBanterIndex(rng: () => number, last: number): number {
    if (BANTER_SCRIPTS.length <= 1) return 0;
    let idx = Math.floor(rng() * BANTER_SCRIPTS.length);
    if (idx === last) idx = (idx + 1) % BANTER_SCRIPTS.length;
    return idx;
}

/** Cuánto tiempo se muestra una frase: base + tiempo de lectura según el largo. */
export function lineDurationMs(text: string): number {
    return Math.max(2600, 1400 + text.length * 55);
}

/** Pausa entre una charla y la siguiente (12 a 20 s). */
export function nextBanterDelayMs(rng: () => number): number {
    return 12000 + Math.floor(rng() * 8000);
}
