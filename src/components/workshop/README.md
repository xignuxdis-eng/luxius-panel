# Print Den (taller Pixi) - Guía para ampliar y editar

Todo lo que se puede cambiar **sin tocar lógica** vive en la carpeta [`content/`](./content). Son archivos de datos con comentarios.

| Quiero... | Archivo | Qué hacer |
|---|---|---|
| Agregar/editar una **mascota** (nombre, colores, carácter, ficha, sonido) | `content/pets.ts` | Copiar un bloque de `PET_PROFILES` y cambiar valores. Aparece sola en rotación, reunión tras apagón, ficha y chip de la barra. |
| Cambiar **frases de eventos** (apagón, café, hora feliz) | `content/texts.ts` | Editar/agregar frases en las listas. |
| Editar **visitas** (repartidor, técnico: ropa, velocidad, frases) | `content/guests.ts` | Editar su bloque en `GUEST_KINDS`. |
| Ajustar **tiempos y números** (cada cuánto hay eventos/rotación, ciudad del clima, posición de pizarra/reloj/ventanas, extras encendidos por defecto) | `content/config.ts` | Cambiar valores de `WORKSHOP_CONFIG` / `DEFAULT_FX`. |
| Cambiar **diálogos de operarios** | `workshopBanter.ts` | Ya era un archivo de datos. |
| Cambiar **aspecto/estadísticas de operarios** | `workshopCharacters.ts`, `workshopSheets.ts` | Datos de personajes y fichas. |
| Cambiar **logros** | `workshopAchievements.ts` (`DEFS`) | Cada logro es un bloque con su regla sobre órdenes reales. |
| Cambiar **alertas reales** | `workshopAlerts.ts` | Reglas de stock/máquinas/atrasos/rebotes. |

## Reglas de oro
- **Nada de datos inventados** en lo que representa el sistema (alertas, pizarra, logros, estadísticas de estaciones). Lo decorativo (mascotas, eventos, visitas, fichas de operarios) se rotula como decorativo.
- Sin chistes sobre clientes.
- Cada extra tiene su botón ON/OFF en la barra superior (se guarda en `localStorage` `luxius_print_den_fx`).

## Cómo agregar una mascota (ejemplo)
1. Abrir `content/pets.ts`.
2. Copiar el bloque de "Frijol" al final de `PET_PROFILES`, cambiar `id` (único), `name`, `emoji`, colores, `petChance`, `sound` y la ficha.
3. Guardar. Listo.

`sound` describe la voz: `{ type: 'meow', pitch: 600 }` o `{ type: 'bark', pitch: 300, count: 2, gap: 0.2 }` (ver `PetSound` en `workshopAnimalSound.ts`).

## Modo prueba
- `localStorage.setItem('luxius_print_den_events_fast','1')` acelera eventos y rotación de mascotas.
- `localStorage.setItem('luxius_print_den_hour','23')` fuerza la hora del taller (día/noche).
- `localStorage.setItem('luxius_print_den_geo','lat,lon,Nombre')` cambia la ubicación del clima.
- En desarrollo: `window.__printDen.trigger('blackout')`, `.spawn('repartidor')`, `.celebrate()`, `.reunion()`.

## Ideas para extender (próximos pasos)
- Mover más contenido a `content/` (logros, banter) y permitir cargarlo desde un JSON editable en la nube.
- Nuevo tipo de visita: agregar bloque en `content/guests.ts` y dispararlo desde `workshopEvents.ts`.
- Nuevo toggle de extra: sumarlo en `DEFAULT_FX` (`content/config.ts`) y en `FX_LABEL` (`WorkshopToolbar.tsx`).

## Cambiar sprites (operarios, plotter, estaciones)
Todo se dibuja por codigo por defecto; para reemplazar con PNG propios: copiar el archivo a `public/workshop-sprites/` y agregar una linea en `content/sprites.ts` (hay ejemplos comentados). Si falta el archivo o falla, se usa el dibujo original y se avisa en consola.

| Que | Clave en content/sprites.ts | Notas |
|---|---|---|
| Plotter (cuerpo, desconectado, cabezal, rollo) | `textures`: plotter_chassis, plotter_chassis_offline, plotter_printhead, plotter_vinyl_roll | Mismo tamano que el original (la consola avisa si no coincide) |
| Cartel DEN, ventana, baldosas de pared y piso | `textures`: sign_den, window, wall_tile, tile_concrete_a, tile_concrete_b | Idem |
| Operarios | `characters`: disenador, impresor, cortador, empaquetador, default, guest_repartidor, guest_tecnico | Hoja de 64x120 px: 4 columnas x 5 filas de cuadros 16x24 (filas: abajo, arriba, izquierda, derecha, respiro+trabajo). Detalle en CHARACTER_SHEET_LAYOUT |
| Objetos de estacion (escritorio, estanteria, mesa de corte...) | `stationProps`: diseno, insumos, corte, empaque, despacho, caja | Imagen estatica: pierde animaciones y pilas de cajas |

Colores de camisa por rol, piel y colores del sprite procedural: `content/characters.ts`. Las mascotas se dibujan por codigo con los colores de su perfil (`content/pets.ts`); para PNG propios de mascotas ver la seccion "Novedades 11/10/2026" mas abajo.


## Tablon de Xana (consejos)
Los consejos viven en `content/xanaTips.ts` (array `XANA_TIPS`). Para agregar uno: sumar un objeto con `id` unico, `category` (ver `XANA_CATEGORIES`), `title`, `text` y opcional `link`. Las categorias tambien se editan ahi. Son consejos curados a mano, no datos del sistema.


## Voces de los personajes y sonidos de interfaz
Todo se edita en `content/voices.ts` (sin archivos de audio, se sintetiza en el navegador): el timbre y tono base de cada rol (`ROLE_VOICES`), ajustes por operario con su nombre en minusculas (`VOICE_OVERRIDES`), cuanto varia el tono entre operarios (`VOICE_SPREAD`), los saludos al hacer clic (`VOICE_GREETINGS`) y los tilines de abrir/cerrar fichas (`UI_SOUNDS`). Se activan con los botones Voces e Interfaz de la barra. El motor esta en `workshopVoice.ts`.

### Rasgos individuales (retratos y personajes)
- **Mascotas**: en content/pets.ts cada perfil puede tener collar (color), markings (laze, chest, eyePatch, socks, 	abby) y markColor. Se ven en el sprite y en el retrato (PetPortrait.tsx).
- **Operarios**: content/characters.ts reparte color de pelo, peinado (short, 	uft, long, cap) y accesorio (glasses, eard, headband, mustache) de forma estable segun el id. Para forzar los de alguien, usar LOOK_OVERRIDES por nombre en minusculas. El retrato de la ficha es WorkerPortrait.tsx. Si hay hoja PNG para el rol, el PNG manda en el sprite.

### Refrigerios (zona de descanso) y escala de estaciones
- Estacion efrigerios (heladera, cafetera, cocina) definida en workshopPixiUtils.ts y dibujada en workshopStationProps.ts (uildBreakRoom). Los operarios libres la visitan de vez en cuando (BREAK_CHANCE en workshopWorkers.ts): piensan frases de descanso y, si coinciden dos, charlan. Las frases se editan en workshopBanter.ts (BREAK_THOUGHTS, BREAK_CHATS).
- propsScale en StationConfig reduce los dibujos de una estacion (Diseno e Insumos usan 0.5); con los botones de la barra se hace zoom a cada una.

- Los sectores no tienen recuadro ni barra de color: solo un cartelito con el nombre y un resplandor del color del sector al pasar el mouse. computeLanes devuelve `rows` (carriles del pasillo) y cada operario usa uno distinto.

- Nuevos: workshopRadio.ts (melodias como datos), TvTicker.tsx (franja del Modo TV), config.dailyGoal / activity / tv, visitas cliente y pizzero (content/guests.ts), evento birthday (content/texts.ts), WorkshopLighting.setStationPools (luces de noche).

## Novedades 11/10/2026 (temporadas, gotera, charla con datos, mascotas con personalidad, PNG de mascotas, contenido desde la nube)
- **Temporadas** (workshopSeason.ts): diciembre = guirnalda; 5 al 12 de julio = banderines celestes y blancos; 20 al 31 de octubre = zapallos de Halloween. Fechas en WORKSHOP_CONFIG.seasons. Probar sin esperar: `localStorage.setItem('luxius_print_den_season','navidad'|'julio'|'halloween'|'none')`.
- **Gotera** (WorkshopFx.setRain): con lluvia o tormenta reales (y Clima encendido) aparece un balde con goteo y alguien lo comenta. Posicion en WORKSHOP_CONFIG.rainLeak. Probar: `localStorage.setItem('luxius_print_den_rain','1')` (y quitarlo para apagar).
- **Operario con sueno**: evento yawn, solo de 19 a 6 hs. Frases en EVENT_TEXTS.yawn. (No hay guardia nocturno: se quito a pedido.)
- **Charla con datos reales**: evento ordertalk (workshopOrderTalk.ts): cola, atrasadas, m2 del dia y antiguedad de la orden mas vieja. Plantillas en ORDER_TALK (content/texts.ts). Nunca nombra clientes.
- **Mascotas con personalidad** (workshopPet.ts): de noche (21 a 6 hs) duermen mas y mas tiempo; si se dejan acariciar a veces se quedan sentadas junto al operario; de vez en cuando van a la cafetera y, si coinciden dos, la segunda se acomoda al lado y aparece un aviso (onCoffeeSpat).
- **PNG de mascotas**: en content/sprites.ts, dentro de characters, clave pet_<id> (ej. pet_frijol: spriteUrl('frijol.png')). Hoja de 96x16 px: 6 cuadros de 16x16 mirando a la derecha: sit, walk0, walk1, sleep, scratch0, scratch1 (PET_SHEET_LAYOUT). Sin contorno automatico.
- **Contenido desde la nube** (content/remote.ts + public/workshop-content.json): al abrir el taller se lee ese JSON y pisa config, frases, visitas, mascotas (por id), camisas por rol y rasgos por nombre; lo que falta queda de fabrica; claves o tipos desconocidos se ignoran. La ultima version buena se guarda en el navegador y se aplica al instante la proxima vez (por eso los valores que se leen al arrancar, como el tamano del plotter, se ven a la segunda recarga). Otra direccion: `localStorage 'luxius_print_den_content_url'`. Para editar sin recompilar en produccion hay que reemplazar el archivo publicado workshop-content.json.