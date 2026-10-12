# PLAN DETALLADO — Fase 3 (personajes y animaciones por cambio de estado)

> Estado: **SOLO PLAN. No se escribió código de personajes.** Falta que el usuario escriba literalmente `APRUEBO FASE 3`.
> Archivo local, sin commitear. Basado en lectura de `WorkshopCanvas.tsx` (legacy), `WorkshopCanvasPixi.tsx`, `workshopPixiUtils.ts` y `AudioEngine.ts`.

## 1. Qué hace hoy el legacy (hechos leídos del código)

| Hecho | Dónde |
|---|---|
| Operarios salen de `getUsuarios()` (solo `habilitado !== false`), máx. 4, roles asignados por posición (no por el rol real del usuario) | `WorkshopCanvas.tsx` L157-192 |
| Colores camisa `#8b5cf6 / #22c55e / #ec4899 / #0284c7`, velocidad `2.1 + idx*0.1` | L161-186 |
| Eventos se calculan en un `useEffect([orders])` con `orders.find(...)`: **se repiten en cada poll de 3 s** mientras exista una orden en ese estado (y repiten sonido) | L195-263 |
| Además `stopAmbient()` se ejecuta en el cleanup de ese mismo efecto, o sea en cada poll | L196, L260-262 |
| Textos de globos: `⚠️ OT REBOTADA`, `OT #… [Printing]`, `✂️ [Trillar / Refilar]` | L209, L229, L250 |
| Sonidos: `playBounceWarning` (rebotado/standby), `playScissorsCut` (impreso) | L200, L241 |
| Clic en operario → `playClick()` + `onSelectOrder(orden)` | L606-607 |
| Coordenadas del legacy son de otro lienzo; **no sirven tal cual** en el mapa Pixi de 480×270 | L162-165 |

## 2. Lo que NO se debe copiar del legacy
1. Repetir el recorrido y el sonido en cada poll. Regla: **una animación por cambio**, usando `diffOrders`.
2. Asignar el rol por posición en la lista de usuarios. Propuesta: usar el rol real del usuario si existe; si no, el orden actual del legacy (decisión D1).

## 3. Riesgos hallados en el código actual que la Fase 3 debe resolver primero
| # | Riesgo | Archivo y línea | Qué hacer |
|---|---|---|---|
| R1 | `diffOrders` devuelve `'new'` para TODAS las órdenes al montar (snapshot inicial vacío). Cada vez que se alterna Canvas↔Pixi o se recarga, dispararía una animación por orden | `workshopPixiUtils.ts` L36-43; `WorkshopCanvasPixi.tsx` L74 | La primera lectura es **línea base**: no genera eventos |
| R2 | `'removed'` inventa `nextStatus: 'entregado'` aunque la orden solo haya desaparecido de la lista (por ejemplo, el backend devuelve lista vacía al reconectar) | `workshopPixiUtils.ts` L56-66 | Tratar `removed` como "sin animación"; nunca como entrega |
| R3 | `pendingDiffsRef` se llena y **nunca se consume** | `WorkshopCanvasPixi.tsx` L75, L156 | Reemplazar por cola con tope (ej. 20) y consumo en el ticker |
| R4 | Animaciones atadas a cuadros (`frameCount`), no a tiempo: en pantallas de 144 Hz todo va ~2,4× más rápido | `WorkshopCanvasPixi.tsx` L1038, L1075, L1100, L1143 | Personajes usan `ticker.deltaTime`; no tocar el plotter ya aprobado |
| R5 | La capa de áreas de clic cubre cada estación completa y está **arriba** de todo en el mundo: un operario clicable quedaría tapado | `WorkshopCanvasPixi.tsx` L904-952 | Operarios con su propia área de clic por encima de `hitAreasLayer` |
| R6 | Pool de partículas: el código crea 18, el roadmap dice 40 | L321 vs roadmap | Solo documentar; no tocar |

## 4. Sub-etapas (cada una = 1 commit local + captura con marca + `SESION_LOG.md`)

### 4.1 Sprites — marca `F3-r1`
- **Archivo nuevo:** `src/components/workshop/workshopCharacters.ts` (no se toca `workshopSprites.ts` salvo exportar helpers si hace falta).
- ~16×24 px, matrices + paleta, `scaleMode='nearest'`, cache propia reutilizando `createPixelTexture`.
- Caminata 4 direcciones × ≥4 cuadros, idle y "trabajando" por rol, camisa con color del operario, sombra elíptica.
- Prueba: hoja de sprites renderizada **solo en scratch** (no en el mapa).
- Riesgo: cantidad de texturas. Mitigación: ≤ ~60 texturas en total, medidas con la misma técnica de la Etapa 2.

### 4.2 Movimiento — marca `F3-r2`
- `WorkshopWorker` desde `getUsuarios()` (máx. 4), velocidad `2.1 + idx*0.1` convertida a px/seg con `deltaTime`.
- Mapa 480×270. Pasillos libres (de `getPixiStations`): horizontal y≈110-140 (32 px de alto), verticales en x≈102-136 (junto a Diseño/plotter), x≈234-246 y x≈366-378 (12 px, **más angostos que un sprite de 16 px**: solo se usan los pasillos horizontales y el hueco izquierdo).
- Waypoints fijos por pasillo; los operarios se detienen al borde de la estación, **nunca dentro de la máquina**.
- z-order por `y` (`sortableChildren`/`zIndex`), capa propia entre `stationsLayer` y `particlesLayer`.
- Sin eventos de órdenes todavía.

### 4.3 Eventos por cambio — marca `F3-r3`
- Resolver R1, R2, R3 primero (cambios mínimos en `workshopPixiUtils.ts` y en el consumo de la cola).
- Mapeo de eventos: `→rebotado` (impresor lleva carpeta), `→orden` (diseñador lleva OT), `→impreso` (impresor lleva rollo a corte).
- Cola con tope de 20; si llegan más, se descartan las más antiguas y se **reconcilia** (el operario va a su puesto, sin teletransporte).
- Un operario ocupado encola el evento; no se acumulan recorridos.

### 4.4 Objetos en mano y globos — marca `F3-r4`
- Globos en `uiLayer` (resolución real, 12-13 px), fade, siguen al operario cada cuadro.
- Textos del legacy, pero **sin inventar datos**: solo número de OT real.
- Nota: el texto legacy `[Printing]` contradice la regla "orden = en cola". Propuesta: `OT #… EN COLA` (decisión D2).

### 4.5 Sonidos y clics — marca `F3-r5`
- Reutilizar `playBounceWarning`, `playScissorsCut`, `playClick` (existen, `AudioEngine.ts` L90, L123, L180). **No se modifica AudioEngine.**
- Sonido solo cuando se **dispara** el evento (una vez), nunca en cada poll.
- Clic en operario → `onSelectOrder(orden)` (hoy el prop está sin usar en Pixi: `_onSelectOrder`).

### 4.6 Pruebas (scratch, datos marcados)
1. Un cambio de estado → una animación.
2. Varios cambios simultáneos → cola con tope, sin teletransporte.
3. Operario sin órdenes → idle.
4. Usuario nuevo (5.º usuario) → ignorado (máx. 4).
5. Cambio durante el poll → sin reinicio de animación en curso.
6. Alternar Canvas↔Pixi 30 veces → memoria, texturas y FPS (misma técnica de la Etapa 2).
7. Recarga / reconexión (lista vacía y luego completa) → **cero** animaciones espurias (cubre R1 y R2).

## 5. Decisiones que necesito del usuario antes de 4.2
- **D1 — Rol de cada operario:** (A) por el rol real del usuario si existe, con el orden del legacy como respaldo; (B) igual que el legacy (por posición). *A es más fiel pero depende de que los usuarios tengan rol cargado; B es idéntico al legacy pero puede mostrar al "impresor" como diseñador.*
- **D2 — Texto del globo de impresión:** (A) `OT #… EN COLA` (coherente con la decisión del cartel); (B) `OT #… [Printing]` como el legacy (contradice "en cola").
- **D3 — Dónde se paran los operarios:** (A) en el pasillo, al borde de la estación (seguro, no pisa máquinas); (B) dentro del área de la estación (más "vivo", riesgo de tapar contadores y nombres).

## 6. Qué no se podrá verificar
- Con el backend apagado, los cambios de estado son simulados en scratch. La sincronización real contra el sistema **no queda validada**.
- No se puede validar a ojo humano la fluidez en un monitor de 144 Hz; solo se mide con `deltaTime`.
