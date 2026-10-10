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
    ['Encontré una gema en el diseño: es perfecto.', 'Epic gem, epic print. Todo en su lugar.'],
    // --- Más clásicos y cultura pop ---
    ['Hey, listen! Este diseño quedó increíble.', 'Navi tiene razón: la impresión es de otro mundo.'],
    ['Es peligroso ir solo, pero este pedido va seguro.', 'Con esta calidad, hasta Link se queda a mirarlo.'],
    ['¡Kamehameha de color! Qué saturación.', 'Y el nivel de detalle supera los nueve mil.'],
    ['Un gran poder conlleva una gran impresión.', 'Spider-Man firmaría esta lona sin dudarlo.'],
    ['Que la Fuerza te acompañe en el refilado.', 'Y que los bordes queden más rectos que un sable.'],
    ['Yo soy Groot... y también fan de este diseño.', 'Groot dice que los colores están espectaculares.'],
    ['Houston, no tenemos problemas: salió perfecto.', 'Alunizaje impecable de tinta sobre la lona.'],
    ['Tomá el anillo, pero dejame este diseño.', 'Mi tesssoro... digo, mi lona. Qué belleza.'],
    ['Winter is coming, pero esta lona es eterna.', 'Y el diseño no se olvida ni en Poniente.'],
    ['Este diseño tiene más estilo que Mario Kart.', 'Y llegó primero: ni un caparazón azul lo frenó.'],
    ['¡Combo x10! Pedido, impresión y corte perfectos.', 'Perfect! Ranking S en el tablero del taller.'],
    ['Necesito una hoguera: este diseño me tiene fascinado.', 'Alabado sea el sol... y este degradé perfecto.'],
    ['Este trabajo merece un trofeo de platino.', 'Y una mención especial por el acabado.'],
    ['Rayman perdió los brazos, pero este diseño no pierde nada.', 'Ni un píxel fuera de lugar. Qué prolijidad.'],
    ['¿Viste ese negro? Parece un agujero negro.', 'Interstellar queda corto frente a esta profundidad.'],
    ['Pasaste de nivel con ese diseño.', 'Y el plotter te da bonus de calidad extra.'],
    ['Dice Mario que este pedido es una estrella.', 'Invencibles por diez segundos... y por siempre en calidad.'],
    ['Este corte quedó más limpio que un headshot.', 'Cero rebabas. Boom, headshot de precisión.'],
    ['El diseñador entró en modo Super Saiyajin.', 'Se nota: el arte tiene aura dorada.'],
    ['Aquí no hay glitches, solo calidad de impresión.', 'Speedrun perfecto: sin errores y a tiempo.'],
    ['Cada tinta cuenta, como cada vida en Contra.', 'Arriba, arriba, abajo, abajo... ¡y a imprimir!'],
    ['Frodo llevó el anillo; nosotros llevamos el rollo.', 'Y sin perderlo en el camino. Misión cumplida.'],
    ['Los Minions dirían: ¡banana! Qué colorido.', 'Bello, bello, bello. Impresión de 10.'],
    ['Este plotter tiene más precisión que un Zerg.', 'Y es mucho más amigable. Hasta da gusto verlo.'],
    ['Estoy a punto de terminar esta pasada.', 'Yo me ocupo del refilado. Equipo ganador.'],
    ['Mirá este acabado, parece de museo.', 'Ni el Louvre tiene tanta nitidez en sus obras.'],
    ['Pocos saben imprimir como vos.', 'Y menos aún diseñar tan lindo. Somos un gran equipo.'],
    // --- Guardias de las capitales de WoW ---
    ['Movete, ciudadano. Nada que ver por aquí.', 'Solo una lona perfecta. Sigan circulando.'],
    ["Cuidado, viajero: el plotter muerde si lo apurás.", "Gracias, guardia. Voy con calma y calidad."],
    ['¿Buscas la casa de subastas? Esto es un taller.', 'Aquí el mejor loot es una impresión sin banding.'],
    ["Alto ahí. Documentación del pedido, por favor.", "OT en regla, guardia. Todo sellado y aprobado."],
    ['Que la luz te guarde. Y el refilado, derecho.', 'Y que tus tintas nunca se agoten.'],
    ['Los murlocs andan cerca del depósito otra vez.', 'Mrglgl... digo, ¡qué mal momento para el vinilo!'],
    ['Vigilo estas calles desde hace años, y nunca vi un corte así.', 'Es que el cutter está en modo legendario.'],
    ['¿Necesitas una ruta hacia Despacho, forastero?', 'Siempre derecho, luego a la izquierda, y sin perder el rollo.'],
    ['Por la Alianza, qué acabado tan pulido.', 'Por la Horda, también. Hoy hay paz en el taller.'],
    ['Mantengan la calma: es solo un pedido urgente.', 'Los urgentes son nuestra especialidad.'],
    // --- Series y películas (Marvel, DC y más) ---
    ['¿Viste Deadpool y Wolverine? Qué dupla.', 'Imprimen menos chistes, pero igual de buenos. ¡Gran pelí!'],
    ['Estoy esperando la próxima de los Vengadores.', 'Ensamblados estamos: el equipo del taller no falla.'],
    ['Los Cuatro Fantásticos tienen estilo retrofuturista.', 'Como nuestras lonas: color y detalle por todos lados.'],
    ['Agatha All Along tiene una banda sonora tremenda.', 'Igual que el plotter a esta hora: puro ritmo.'],
    ['Daredevil Born Again no suelta ni un minuto.', 'Ver sin ver: así imprimo yo en la madrugada.'],
    ['Superman de Gunn me dejó de buen humor.', 'A mí Krypto me ganó el corazón. Y la lona queda divina.'],
    ['El Pingüino fue una joyita de serie.', 'Gotham tiene mala fama, pero nuestro taller es seguro.'],
    ['Peacemaker: ¿la viste? Música y caos puro.', 'Mejor que cualquier casco: este diseño es el protagonista.'],
    ['Loki, la serie: múltiples líneas de tiempo.', 'Lo mismo pasa con nuestras OT: múltiples versiones.'],
    ['Thunderbolts* juntó a lo mejor de los descartados.', 'Como los restos de vinilo: reciclados y útiles.'],
    ['¿Viste lo nuevo de Star Wars, Andor incluido?', 'Rebeldes del taller: imprimir sin imperio de errores.'],
    ['The Last of Us está imperdible en pantalla.', 'Como esta impresión: sobrevive a cualquier clima.'],
    ['Arcane me dejó pensando en el arte pixelado.', 'Y en cuánta tinta se usa para tanto color.'],
    // --- Recomendaciones útiles para el equipo y para quien mira el sistema ---
    ['Recordá: guardá el archivo original antes de enviar a imprimir.', 'Y revisá el sangrado: dos milímetros salvan el corte.'],
    ['Tip: calibrá el color al empezar el día.', 'Así las lonas salen iguales de la primera a la última.'],
    ['¿Revisaste las medidas antes de imprimir?', 'Siempre. Un cero de más cuesta mucho material.'],
    ['No te olvides de tomar agua y estirar los brazos.', 'Gracias. El taller rinde más con operarios cuidados.'],
    ['Mirá el stock de tintas antes de arrancar un lote grande.', 'Ya lo vi en Insumos: alcanza para el turno.'],
    ['Subí siempre la OT al sistema antes de cortar.', 'Así el cliente ve el estado en tiempo real.'],
    ['Regla 20-20-20: cada 20 minutos, mirá lejos 20 segundos.', 'Mis ojos agradecen. Los píxeles también.'],
    ['Si la lona se ve rara, revisá el perfil de color.', 'Casi siempre es el perfil, no la máquina.'],
    ['Hacé una copia de respaldo del trabajo del día.', 'Ya la subí. Un buen taller nunca pierde un diseño.']
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
    'La calidad hoy está en modo Mythic.',
    'Presioná start para iniciar otro pedido.',
    'Este taller es mi base de operaciones.',
    'Cada lona es una nueva misión.',
    'Hoy me siento nivel Ultra Instinto.',
    'Un plotter bien calibrado vale más que una espada legendaria.',
    'Me quedan dos vidas... y una buena racha de pedidos.',
    'El café es mi poción de maná.',
    'Si imprimo bien, subo de rango.',
    'Siempre hay un pedido más antes del jefe final.',
    'Esta tinta huele a victoria.',
    'Hoy me toca ser el héroe del refilado.',
    'Un píxel a la vez, así se construyen imperios.',
    'Quién diría que el CMYK era tan épico.',
    'Más calidad que un Mario dorado.',
    // Guardias de las capitales de WoW
    'Mantengo el orden en el taller, ciudadano.',
    'Sigue tu camino, viajero.',
    'Que la luz te acompañe en el turno.',
    'Nada que reportar: todo en calma.',
    '¿Alguien vio mis llaves del depósito?',
    'Esta guardia es larga, pero la lona luce genial.',
    'Ciudadano, no corras con el rollo.',
    'Por el honor del taller.',
    'Un murloc sospechoso en el almacén...',
    'Cuiden el taller, que es nuestro hogar.',
    // Series y películas
    'Tengo que ver lo nuevo de Marvel este finde.',
    'Daredevil Born Again, qué ritmo.',
    'Deadpool y Wolverine: la dupla perfecta.',
    'El Superman de Gunn tiene mucho corazón.',
    'Peacemaker: música y caos en partes iguales.',
    'Mañana maratón de Loki, lo juro.',
    'Agatha All Along, ¡qué temazo!',
    'Los Cuatro Fantásticos tienen estilo retro.',
    'Andor es de lo mejor de Star Wars.',
    'Ya quiero ver la próxima de DC.',
    // Recomendaciones útiles
    'Tip: guardá siempre el archivo original.',
    'Revisá el sangrado antes de imprimir.',
    'Calibrar el color cada mañana evita problemas.',
    'Tomar agua también es parte del trabajo.',
    'Hacé una pausa: 20 segundos mirando lejos.',
    'Perfil de color correcto, lona perfecta.',
    'Antes del lote grande, chequear tintas.',
    'Una copia de respaldo vale oro.',
    'Subir la OT al sistema es el primer paso.'
];

/**
 * Saludos al cruzarse por el taller. Cada par es [saludo de quien saluda, respuesta del otro].
 * Son cortos y temáticos (videojuegos, Blizzard, cultura pop); los operarios siguen su camino.
 */
export const GREETINGS: [string, string][] = [
    ['¡Lok\'tar ogar!', '¡Por la Horda!'],
    ['¡Por Aiur!', 'En nombre de Aiur, hola.'],
    ['¡Que la Fuerza te acompañe!', 'Y a vos también.'],
    ['¡Hey, listen!', '¡Ya te escuché, Navi!'],
    ['¡Hola, aventurero!', 'Que tu camino sea épico.'],
    ['Stay a while and listen.', '¡Otro día, estoy apurado!'],
    ['¡Zug zug!', '¡Trabajo completado!'],
    ['Es hora de la acción.', 'Siempre, jefe.'],
    ['Buenas, comandante.', 'En posición, ya voy.'],
    ['¡Excelsior!', '¡Nos vemos, compañero!'],
    ['Un gran poder conlleva...', '...una gran lona. ¡Hola!'],
    ['¡Mrglglgl!', '¡Mrglgl! Hasta luego.'],
    ['¡Wassup, campeón!', 'Todo bien, seguimos.'],
    ['¡Logro desbloqueado: amigos!', 'Bonus de equipo activado.'],
    ['¡It\'s a-me!', '¡Mamma mia, hola!'],
    ['¡Hola, mi precioso!', 'Que no te vea Sauron. ¡Chau!'],
    ['¡Buen día, jefe del taller!', 'Buen día. ¡A darle!'],
    ['¡Pika pika!', '¡Chuuu! Hasta luego.'],
    ['Choca esos cinco.', '¡Top-secret high five!'],
    ['A tus órdenes, Hokage.', 'Dattebayo. Nos vemos.'],
    ['¡Hola! Todo perfecto por acá.', 'Por acá también. ¡Seguimos!'],
    ['Ding! Nivel de amistad +1.', 'Combo de saludos x2.'],
    ['Movete, ciudadano.', 'Sigo mi camino, guardia.'],
    ['Que la luz te guarde.', 'Y a vos también, amigo.'],
    ['Alto ahí... ah, sos vos. Pasá.', 'Gracias, guardia del taller.'],
    ['¿Necesitas indicaciones, forastero?', 'Todo bajo control, gracias.'],
    ['Por el honor del taller.', 'Y por la calidad de impresión.'],
    ['¿Viste la última de Marvel?', 'Todavía no. ¡Sin spoilers!'],
    ['¿Maratón de series esta noche?', 'Obvio. Y a dormir tarde.'],
    ['Hoy hay que revisar el sangrado.', 'Ya lo tenía anotado, jefe.']
];

/** Elige un saludo distinto del anterior. */
export function pickGreetingIndex(rng: () => number, last: number): number {
    if (GREETINGS.length <= 1) return 0;
    let idx = Math.floor(rng() * GREETINGS.length);
    if (idx === last) idx = (idx + 1) % GREETINGS.length;
    return idx;
}

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
