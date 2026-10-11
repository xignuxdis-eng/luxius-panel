# Print Den (taller Pixi) - Guía para ampliar y editar

Todo lo que se puede cambiar **sin tocar lógica** vive en la carpeta [`content/`](./content). Son archivos de datos con comentarios.

| Quiero... | Archivo | Qué hacer |
|---|---|---|
| Agregar/editar una **mascota** (nombre, colores, carácter, ficha, sonido) | `content/pets.ts` | Copiar un bloque de `PET_PROFILES` y cambiar valores. Aparece sola en rotación, reunión tras apagón, ficha y chip de la barra. |
| Cambiar **frases de eventos** (apagón, café, hora feliz) | `content/texts.ts` | Editar/agregar frases en las listas. |
| Editar **visitas** (repartidor, técnico, guardia: ropa, velocidad, frases) | `content/guests.ts` | Editar su bloque en `GUEST_KINDS`. |
| Ajustar **tiempos y números** (cada cuánto hay eventos/rotación, horario del guardia, ciudad del clima, posición de pizarra/reloj/ventanas, extras encendidos por defecto) | `content/config.ts` | Cambiar valores de `WORKSHOP_CONFIG` / `DEFAULT_FX`. |
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
- En desarrollo: `window.__printDen.trigger('blackout')`, `.spawn('guardia')`, `.celebrate()`, `.reunion()`.

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
| Operarios | `characters`: disenador, impresor, cortador, empaquetador, default, guest_repartidor, guest_tecnico, guest_guardia | Hoja de 64x120 px: 4 columnas x 5 filas de cuadros 16x24 (filas: abajo, arriba, izquierda, derecha, respiro+trabajo). Detalle en CHARACTER_SHEET_LAYOUT |
| Objetos de estacion (escritorio, estanteria, mesa de corte...) | `stationProps`: diseno, insumos, corte, empaque, despacho, caja | Imagen estatica: pierde animaciones y pilas de cajas |

Colores de camisa por rol, piel y colores del sprite procedural: `content/characters.ts`. Las mascotas se dibujan por codigo con los colores de su perfil (`content/pets.ts`); soporte de PNG para mascotas queda como mejora futura.


## Tablon de Xana (consejos)
Los consejos viven en `content/xanaTips.ts` (array `XANA_TIPS`). Para agregar uno: sumar un objeto con `id` unico, `category` (ver `XANA_CATEGORIES`), `title`, `text` y opcional `link`. Las categorias tambien se editan ahi. Son consejos curados a mano, no datos del sistema.

