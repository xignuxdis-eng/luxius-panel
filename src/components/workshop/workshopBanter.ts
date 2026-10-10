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
    ['Nuevo récord: cero errores de color hoy.', 'Logro desbloqueado: Impresor Maestro.'],
    // --- Universo Blizzard: StarCraft ---
    ['Necesitamos más gas vespeno... de tinta.', 'Y más minerales. Pero la impresión salió perfecta.'],
    ['¡Hay que construir más pilones de lona!', 'Con esta calidad, ni los zerg nos frenan.'],
    ['Zerg rush de pedidos y todo salió impecable.', 'Es que el plotter juega en nivel Protoss.'],
    ['En posición, comandante. Esta impresión está lista.', 'Marine aprobado: colores de otro nivel.'],
    ['Tu diseño es como Jim Raynor: un héroe.', 'Y la impresión, digna de Terran Dominion.'],
    ['¡En nombre de Aiur! Qué diseño más pulido.', 'El Khala lo aprueba: calidad perfecta.'],
    ['Kerrigan quedaría fascinada con estos rojos.', 'Hasta la Reina de Espadas aplaude el acabado.'],
    ['Sin dinero suficiente... ¡pero esta lona vale oro!', 'Y la tinta nunca falta con vos a cargo.'],
    ['Tanque de asedio listo: este corte es de precisión.', 'Ni un milímetro de error. Siege mode ON.'],
    // --- Warcraft ---
    ['¡Trabajo completado! La lona quedó genial.', 'Los peones estarían orgullosos de este acabado.'],
    ['Lok\'tar ogar! Qué colores más vibrantes.', 'Por la Horda, es la mejor impresión del año.'],
    ['Por el Rey Exánime... qué diseño más frío y nítido.', 'Y sin una sola mancha. Digno de Arthas.'],
    ['Jaina diría que este azul es mágico.', 'Y Thrall, que la impresión tiene espíritu.'],
    ['Es hora de la acción: a imprimir se ha dicho.', 'Zug zug. Todo quedó listo, jefe.'],
    ['Lordaeron nunca vio una impresión tan nítida.', 'Ni Stratholme. Y eso que es zona de purga.'],
    // --- World of Warcraft ---
    ['Este diseño es épico, drop garantizado.', 'Y la impresión, al menos un ítem legendario.'],
    ['Lok\'tar! Tanque, healer y diseño, trío ganador.', 'Con esta lona hacemos raid sin wipear.'],
    ['Ya van tres pedidos y ni un solo wipe.', 'Es que el plotter tiene el equipo full BiS.'],
    ['Me debés una montura por este diseño.', 'Te la pago en tinta: calidad Mythic.'],
    ['Esto es más épico que Wrath of the Lich King.', 'Y más pulido que el parche de Dragonflight.'],
    ['Los colores de esta lona parecen de Pandaria.', 'Mists of Pandaria: ¡el mejor diseño de la expansión!'],
    ['El diseño parece sacado de Shadowlands...', 'Pero este sí que no necesita parche de balance.'],
    ['Gnomos, ingeniería y esta impresión: caos perfecto.', 'Mientras nada explote, la calidad es de Legion.'],
    ['Tu arte vale más que el Cataclismo entero.', 'Deathwing se retiraría ante esta calidad.'],
    ['Ding! Subimos de nivel 60 en calidad de impresión.', 'Ahora a por la montura de la entrega rápida.'],
    ['Este vinilo tiene más brillo que la Espada Sulfuras.', 'Si Ragnaros lo viera, pediría una copia.'],
    ['Pedido listo: no hace falta ni la Piedra de Hogar.', 'Estoy en Orgrimmar y ya llegó, qué velocidad.'],
    ['Las tintas de hoy son nivel Burning Crusade.', 'Outland quedó chico, qué impresión.'],
    ['Hordas y Alianzas: todos aprueban este diseño.', 'Ni los murlocs se atreven a criticar. Mrglglgl.'],
    ['Encontré una gema en el diseño: es perfecto.', 'Epic gem, epic print. Todo en su lugar.']

];

/**
 * Pensamientos de los operarios que pasean sin tareas (globito de nube). Frases cortas de una sola línea,
 * en el mismo universo que las charlas: cultura pop, videojuegos y Blizzard, siempre elogiando el trabajo.
 */
export const THOUGHTS: string[] = [
    'Qué buena quedó esa lona...',
    'Ese diseño es nivel Final Boss.',
    'Ojalá hoy no haya wipe de pedidos.',
    'Necesito más gas vespeno... de tinta.',
    'Impresión 4K, cero banding.',
    'Mmm, ¿y si le pongo música de Zelda al plotter?',
    'Logro desbloqueado: impresión perfecta.',
    'Todavía pienso en Wrath of the Lich King...',
    'Esos negros son más profundos que Dark Souls.',
    'Me debo una partida de Diablo esta noche.',
    'Hay que construir más pilones... digo, estantes.',
    'Qué colores: CMYK nivel legendario.',
    'Me pregunto qué dropeará el próximo pedido.',
    'Los diseñadores se pasaron hoy.',
    'Pac-Man también necesitaría una pausa.',
    'Este lugar es más épico que Orgrimmar.',
    'El Jefe Maestro aprobaría este acabado.',
    'Mejor que cualquier remaster, esta impresión.',
    'Zug zug... qué buen día de trabajo.',
    'Mi nivel de orgullo: 60.',
    'Tomaría un café... y una montura nueva.',
    'Cuando termine, a jugar un rato de StarCraft.',
    'Esa gráfica quedó como de Pixar.',
    'Nadie imprime como nosotros. Nadie.',
    'Si Kerrigan viera estos rojos...',
    'Ding! Otro pedido sin errores.',
    'Pensando en el próximo parche de WoW...',
    'Este taller merece un logro propio.',
    'Un Hadouken de calidad en cada lona.',
    'Los murlocs no entenderían tanta nitidez. Mrglgl.',
    'Qué lindo es ver los diseños salir del plotter.',
    'Todo en su lugar, como en Tetris.',
    'Hoy el cliente se va a ir feliz.',
    'Estoy en modo Protoss: todo perfecto.',
    '¿Será que Thrall pediría una copia?',
    'La calidad hoy está en modo Mythic.'
];

/** Elige un pensamiento distinto del anterior. */
export function pickThoughtIndex(rng: () => number, last: number): number {
    if (THOUGHTS.length <= 1) return 0;
    let idx = Math.floor(rng() * THOUGHTS.length);
    if (idx === last) idx = (idx + 1) % THOUGHTS.length;
    return idx;
}

/** Pausa entre un pensamiento y el siguiente (8 a 14 s, cuenta desde que el globo desaparece). */
export function nextThoughtDelayMs(rng: () => number): number {
    return 8000 + Math.floor(rng() * 6000);
}

/** Elige el índice de una charla distinta de la anterior. `rng` devuelve un número entre 0 y 1. */
export function pickBanterIndex(rng: () => number, last: number): number {
    if (BANTER_SCRIPTS.length <= 1) return 0;
    let idx = Math.floor(rng() * BANTER_SCRIPTS.length);
    if (idx === last) idx = (idx + 1) % BANTER_SCRIPTS.length;
    return idx;
}

/** Cuánto tiempo se muestra una frase: base + tiempo de lectura según el largo. */
export function lineDurationMs(text: string): number {
    return Math.max(3600, 2400 + text.length * 55);
}

/** Pausa entre una charla y la siguiente (12 a 20 s). */
export function nextBanterDelayMs(rng: () => number): number {
    return 12000 + Math.floor(rng() * 8000);
}
