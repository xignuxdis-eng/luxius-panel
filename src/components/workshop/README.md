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
