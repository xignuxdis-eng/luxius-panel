# ROADMAP EJECUTABLE: XignuX Print Den (migración a PixiJS)

> **Este archivo es para el agente que trabaja en el proyecto (Antigravity).**
> Léelo completo antes de hacer nada. Es la fuente de verdad del estado del trabajo.
> Última actualización del documento: 9 Oct 2026.
> Rama: `feature/print-den-pixi` · Proyecto: `F:\Sitio XignuX`

---

## 0. Cómo trabajar con este archivo

1. **El usuario no es técnico.** Explica todo en español simple. Sin jerga innecesaria. Si usas un término técnico, explícalo en una frase.
2. **Trabaja por bloques, en orden.** Cada bloque tiene tareas con casilla `[ ]`. Al terminar una tarea, marca `[x]` en este archivo y añade una línea en la sección 11 (Registro de avance) con fecha, qué hiciste y qué archivos tocaste.
3. **Respeta los PUNTOS DE PARADA (🛑).** Ahí te detienes, resumes en lenguaje simple y esperas la aprobación del usuario.
4. **Pide aprobación explícita** para cualquier tarea marcada 🔐. No la ejecutes con aprobaciones implícitas.
5. **Punto de partida (actualizado):** hacer en este orden **A1 → A3 → A5 → B0**, y luego **preparar** A2 (sin ejecutarlo). A4 y la ejecución de A2 esperan aprobación del usuario.
6. Este archivo vive en la raíz del proyecto. **No lo incluyas en commits** salvo que el usuario lo pida.

---

## 1. Objetivo del proyecto

Mejorar mucho los gráficos del taller interactivo del Dashboard ("XignuX Print Den"), manteniéndolo animado, interactivo y sincronizado con el sistema.

- **Estilo:** pixel art top-down con leve inclinación (tipo Stardew Valley / Game Dev Tycoon), paleta limitada. Sin isométrico real, sin 3D.
- **Motor:** PixiJS v8 montado en un `useEffect` (sin `@pixi/react`).
- **Sprites:** generados por código (matrices/paletas → canvas offscreen → textura con `scaleMode = 'nearest'`) en `workshopSprites.ts`, fáciles de reemplazar por PNG.
- **Resolución lógica:** 480×270, escalado fraccionario con texturas `nearest`, llenando ≥95 % del ancho del contenedor.
- **Principio central:** solo se reemplaza el render. La sincronización, los modales, el HUD y el audio no se tocan.

---

## 2. REGLAS INNEGOCIABLES

El agente anterior incumplió varias de estas. No se repite.

1. **NO `git push`** sin aprobación explícita del usuario en ese momento.
2. **NO `npm run build`.** Para verificar tipos: `npx tsc --noEmit`. Si un build es imprescindible, restaurar `public/version.json` desde `origin/master` después.
3. **NO copiar builds ni desplegar** a ninguna carpeta (en especial `D:\XignuX\luxius-panel\dist`) salvo en la tarea A2 y con aprobación.
4. **NO tocar** `XANA_MEMORIA_SISTEMA.md`, ni archivos fuera del taller, salvo que una tarea lo indique.
5. **NO modificar** el polling de `WorkshopDashboard`, `db.ts`, `StationModal`, `PrintManagerHUD`, `AudioEngine`, `logParser`.
6. **Flag del renderer:** `luxius_print_den_renderer` debe quedar en `'legacy'` por defecto en el código. Solo el usuario lo cambia a `'pixi'` desde el selector.
7. **Cero datos inventados.** Nada de porcentajes fijos o simulados, ni valores que no salgan del sistema. Si algo es estimación, debe marcarse como tal ("~").
8. **Commits separados y claros:** cambios del taller en commits del taller; cambios de producción (`sw.js`, `versionCheck.ts`) en commits aparte.
9. **No declarar "arreglado" solo porque compila.** Verificar con el navegador (ver sección 9) y reportar lo observado.
10. **No diagnosticar a ciegas.** Si hay un error, pedir/leer el mensaje real de la consola antes de proponer causas.

---

## 3. Contexto técnico confirmado

### Arquitectura del taller
- `WorkshopDashboard.tsx`: polling cada 3 s con `getOrdenes()`; elige renderer (`legacy` / `pixi`); contiene `WorkshopPixiErrorBoundary` que cae al canvas 2D si falla WebGL.
- `WorkshopCanvas.tsx`: render legacy (canvas 2D). Props: `orders`, `onSelectStation`, `onSelectOrder?`, `selectedStation`.
- `WorkshopCanvasPixi.tsx`: render nuevo (mismos props + `onError`).
- `workshopSprites.ts`: sprites procedurales. `workshopPixiUtils.ts`: layout/estaciones (`getPixiStations`, alias `getDynamicStations`) y `diffOrders`.
- `PrintManagerHUD.tsx`, `StationModal.tsx`, `AudioEngine.ts` (se reutilizan tal cual).
- Estados de orden → estación: `diseno`/`rebotado` → diseño · `orden` → plotter · `impreso`/`post` → corte · `completo` → empaque · `entregado` → despacho.
- **`orden` significa "en cola", NO "imprimiendo".** El HUD marca `[Printing]` a todas; es una simplificación del sistema.

### Datos del plotter
- El modelo `Order` **no tiene campo de progreso**. El 0.65 del legacy era falso y ya se eliminó (commit `a2c3605` en el legacy).
- **Los logs de Roland VersaWorks se cargan a mano** (`ConciliationTable`). No hay datos en vivo del plotter. Tema cerrado hasta que el usuario cree un script de subida automática. No investigar más.
- Hoy el plotter muestra: barra indeterminada animada, "SIGUIENTE EN COLA: OT #…", cliente, medidas, material y cola.

### Infraestructura local
- Vite dev: `http://localhost:3005/#/taller`. Backend Flask local: puerto 5000 (suele estar apagado → el frontend usa copia offline y la consola se llena de `ERR_CONNECTION_REFUSED`; **con el backend apagado las pruebas de sincronización no valen**).
- **Nginx** instalado en `D:\XignuX\nginx` (config `conf\nginx.conf`, escucha puerto 80, `root "D:/XignuX/luxius-panel/dist"`). **Está apagado.** Si el usuario lo enciende, sirve lo que haya en `dist`.
- **GitHub Actions:** `deploy.yml` se dispara **solo** con push a `master`/`main` (o manual). Pushear la rama NO despliega. **Mergear a `master` SÍ despliega a producción.**
- Producción pública (GitHub Pages): deploy de hoy 02:57 AM, commit `1c74b185` (rama `gh-pages`) generado desde `master@15358d0`.
- `public/version.json` lo regenera el build; no debe quedar modificado en los commits de la rama. El chequeo de versión (`versionCheck.ts`) fuerza recargas si el `buildTime` del servidor cambia.

### Diagnóstico de cuelgues y reinicios (9 Oct, confirmado con evidencia)
Hubo **tres causas distintas**, probablemente mezcladas:
1. **Recargas automáticas por builds (hasta las 13:20).** `vite.config.ts` (`versionGeneratorPlugin`) reescribe `public/version.json` en cada `npm run build`; Vite dev lo sirve; `versionCheck.ts` lo consultaba cada 3 min y al cambiar foco, y recargaba la pestaña y purgaba cachés. Builds registrados: 12:46, 14:42, 14:55, 15:02 (la lista sale de la sesión actual del IDE; puede haber builds anteriores no listados). El reinicio de las 12:46 coincide con el build de las 12:46:41. Desde el commit `1861edd` (13:20) `versionCheck` no corre en modo DEV.
2. **Bugs reales de Pixi** (doble destrucción del stage, `statusLed` sin `fill`, ticker sobre objetos destruidos): corregidos hasta el commit `f94694c` (15:04).
3. **Vite caído por archivos temporales de Chrome** (15:46:34): `Error: EBUSY ... watch 'F:\Sitio XignuX\Sin confirmar 418166.crdownload'`. Chrome estaba descargando algo **dentro de la carpeta del proyecto**. Vite se reinició a las 15:46:46.
- Lo que sigue sin demostrarse: que el taller se mantenga estable sin builds ni descargas de por medio. Se prueba en B2.

### Incidente de `dist` (resumen)
- A las 12:46 del 9 Oct el agente anterior sobrescribió `index.html`, `404.html`, `sw.js` y `version.json` en `D:\XignuX\luxius-panel\dist` con un build de la rama de pruebas, y borró dos archivos viejos rastreados.
- El git interno de `dist` está anclado a `ff3c02b` (6 Ago, muy viejo). **No sirve como referencia de "cómo estaba".**
- Existe `D:\XignuX\luxius-panel\dist_respaldo`: es una copia hecha **después** de la sobrescritura (no es el estado original).
- Objetivo realista: dejar `dist` **igual a producción** (build de las 02:57, commit `1c74b185`), no "como estaba exactamente".
- **Comandos PROHIBIDOS** (propuestos antes, defectuosos): `git --work-tree=... checkout ...` desde la raíz (ensucia el repo principal) y `git clean -fd` / `restore .` sobre el git viejo de `dist` (borra o revierte a agosto).

### Cambios de producción pendientes de decidir (están en la rama)
- `src/utils/versionCheck.ts`: guarda de modo DEV (inocua) + guarda de 15 s contra recargas (**cambia producción, debe salir de la rama**).
- `public/sw.js`: arreglo propuesto (ver A4), aún no aplicado.

---

## 4. Estado actual

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Auditoría de `WorkshopCanvas.tsx` | ✅ |
| 1 | Pixi, renderer flag, canvas responsivo HiDPI, hit areas desacopladas, `diffOrders()` | ✅ |
| 2 | Plotter animado, estados (imprimiendo/espera/offline), partículas pool de 40, tooltip en canvas, estaciones dinámicas, sonido con cooldown | 🟡 Implementado; **falta verificación visual por el usuario** |
| Extra | Fixes de crashes + error boundary + fallback a legacy | ✅ |
| Extra | Cierre visual: plotter 43 % del ancho, carteles separados, destellos 1-2 px, pasillo compacto, DEN/ventanas más grandes | 🟡 Informado por el agente, sin confirmar con captura |

### Decisiones del usuario (9 Oct 2026)
- **Estilo del plotter APROBADO.** Se mantiene tal como está (chasis ancho, riel, carro, panel azul) y se extenderá al resto de estaciones en la Fase 4.
- **Se mantiene la animación del cabezal** cuando hay órdenes en cola (opción A). El cartel dice "SIGUIENTE EN COLA" y no debe afirmar que está imprimiendo.
- **Restaurar la hoja que se va imprimiendo con bandas de color CMYK (cian, magenta, amarillo, negro).** Existía en una versión anterior del plotter (bobina trasera + pliego que cae a la bandeja con bandas CMYK) y se perdió al redibujar el chasis ancho. Ver tarea B0.4.
- **A5 (vite.config.ts) APROBADO.**
- **A4 (sw.js) y la ejecución de A2 (restaurar dist) siguen SIN aprobar.**
- **La Fase 3 (personajes) NO empieza** hasta cerrar los Bloques A y B.

---

## 5. BLOQUE A: Higiene y seguridad (EMPEZAR AQUÍ)

### A1. Estado del repositorio (solo lectura)
- [x] Mostrar `git status`, `git branch --show-current` y `git log master..HEAD --oneline`.
- [x] Indicar qué commits ya están en `origin/feature/print-den-pixi` y cuáles son solo locales.
- [x] Confirmar que `public/version.json` y `.gitignore` son idénticos a `origin/master`.
- Resumir en lenguaje simple.

### A2. Restaurar `dist` a producción ✅ EJECUTADO (Alternativa B: copia sin borrar nada)
Preparar sin tocar nada:
- [x] Extraer el commit `1c74b185` (rama `gh-pages`) a `D:\XignuX\temp_dist_prod` usando `git archive` (o equivalente que **no** cambie ningún repositorio).
- [x] Verificar y mostrar: `index.html` apunta a `index-Bay1jYAL-1791525401998.js` y ese archivo existe; contenido de `version.json` (≈ 02:56); existen `sw.js`, `manifest.json` y `fonts/`.
- [x] Preparar el comando `robocopy` de **simulacro** (`/L`, solo lista) y el **real**, que copie `temp_dist_prod` → `dist` **sin tocar** la carpeta `.git` de `dist` (`/XD .git`). Mostrar qué reemplazaría o borraría.
- [x] **Ejecución aprobada (10 Oct 2026):** Copia ejecutada con `robocopy "D:\XignuX\temp_dist_prod" "D:\XignuX\luxius-panel\dist" /E /XD .git` (SIN `/PURGE`). Verificado: `index.html` apunta a `index-Bay1jYAL-1791525401998.js` (150.006 bytes en `dist\assets`), `version.json` tiene `buildTime: 2026-10-09T05:56:41.997Z`, conteo total: 764 archivos en `dist`. Carpetas `dist_respaldo` (764 archivos) y `temp_dist_prod` (61 archivos) preservadas intactas. Nginx apagado.
- ⚠️ **ADVERTENCIA DE ENRUTAMIENTO DE API (dist vs producción):** Tanto el build público de producción (`1c74b185`) como los builds locales de master compilan la misma detección dinámica en runtime: `(hostname === 'localhost' || hostname === '127.0.0.1') ? 'http://localhost:5000/api' : 'https://luxius-backend.onrender.com/api'`. Si Nginx sirve `dist` y el usuario ingresa desde `http://localhost`, el frontend hablará con el Flask local (puerto 5000). Sin embargo, si se accede mediante IP de red local (ej. `192.168.1.x`), el frontend intentará conectarse a Render en la nube a menos que se configure una ruta relativa `/api` o un proxy específico.
- ⚠️ **Service worker en desarrollo (Decisión de diseño):** NO modificar `index.html` para no afectar el acceso local en producción del taller (`http://localhost`). En desarrollo: usar "Bypass for network" en DevTools; evaluar una condición mejor (por ejemplo el puerto 3005) en la Fase 6, sin afectar a localhost del taller.

### A3. Higiene de `versionCheck.ts`
- [x] Quitar de la rama la guarda de 15 segundos. Dejar solo la guarda de modo DEV, en un **commit aparte**.
- [x] No afirmar la causa de "Sincronizando Sistema" como hecho: es una hipótesis (también pudo ser el servidor Vite caído).
- [x] Verificar `public/version.json` igual a `origin/master` tras el cambio.
- No hacer push.

### A4. Arreglo de `public/sw.js` 🔐 (requiere aprobación; hoy está **pendiente de que el usuario decida**)
- Problema: en `sw.js` (≈ líneas 48-54), las llamadas `/api` hacen `fetch(...).catch(() => caches.match(request))`. Cuando el backend está apagado, `caches.match` devuelve `undefined` y el navegador lanza `Failed to convert value to 'Response'`.
- Arreglo propuesto: no interceptar llamadas a la API:
  ```js
  if (url.pathname.startsWith('/api') || url.port === '5000') { return; }
  ```
- [ ] Si el usuario aprueba: aplicar en **commit aparte**, subir la versión de caché del service worker si existe, y explicar cómo verificar que el error desapareció.
- Aclarar al usuario: es un archivo de **producción** y probablemente **no** es la causa de los cuelgues.

### A5. Vite no debe caerse con descargas temporales ✅ APROBADO por el usuario (archivo fuera del taller: commit aparte)
- Cambio propuesto en `vite.config.ts`, sección `server` (≈ línea 98), solo afecta a desarrollo y no al build de producción:
  ```ts
  watch: {
      ignored: ['**/*.crdownload', '**/*.tmp']
  },
  ```
- [x] Si el usuario aprueba: aplicarlo en **commit aparte**, sin tocar `versionGeneratorPlugin` ni nada más del archivo. Verificar que `npx tsc --noEmit` sigue sin errores y que Vite arranca.
- [x] Recordar al usuario cambiar la carpeta de descargas de Chrome fuera de `F:\Sitio XignuX` (esa es la causa raíz).
- [x] Al hacer A3, comprobar si la guarda de 15 s estaba dentro del commit `1861edd` (DEV) o en otro, para quitar solo esa.

🛑 **PARADA al terminar el Bloque A.** Resumen simple + esperar aprobación para el Bloque B.

---

## 6. BLOQUE B: Verificación de la Fase 2 (con ojos y con datos vivos)

### B0. Cierre visual del plotter y el mapa (hacer antes de B1)
Basado en la captura del 9 Oct: el estilo gusta, pero hay detalles.
- [x] **B0.1 Bordes inferiores:** las estaciones de la fila de abajo (Despacho, Empaque, Refilado, Caja) aparecen cortadas, sin borde inferior; Diseño e Insumos sí lo tienen. Averiguar la causa (recorte, altura mal calculada, algo encima) y corregir. Informar la causa.
- [x] **B0.2 Barra de estado:** la luz celeste en movimiento pasa por detrás del texto "SIGUIENTE EN COLA" y lo tapa; el texto se ve algo borroso. Hacer la luz una línea fina bajo el texto o dibujar el texto encima con contorno oscuro; texto nítido en escalado fraccionario.
- [x] **B0.3 Print Manager y layout sin solapamiento:** Panel `PrintManagerHUD` reubicado en su propia columna lateral izquierda (flex), con ancho fijo de 250 px, y el mapa del taller a la derecha ocupando el resto sin solaparse (`flex: 1`). En pantallas angostas (< 900 px), el panel pasa arriba del mapa apilándose verticalmente mediante `@media (max-width: 900px) { flex-direction: column }`. Solo cambios de layout/estilos, sin alterar lógica ni polling.
- [x] **B0.4 Hoja CMYK restaurada:** buscar en el historial de git (`workshopSprites.ts` y `WorkshopCanvasPixi.tsx`, commits de Fase 2 como `f9cc9a9`, `cf063d3`) cómo se dibujaba el pliego con bandas CMYK y recuperarlo adaptado al chasis ancho actual. Comportamiento: el pliego sale por la bandeja y las bandas de cian, magenta, amarillo y negro van apareciendo a medida que el cabezal avanza; al llegar al largo máximo, el ciclo se reinicia con suave fade. Es **decorativo**: sin número, sin porcentaje, sin etiqueta que diga que es progreso real. Con 0 órdenes en cola o máquina offline, el pliego no aparece (o queda apagado en gris). Colores vivos pero dentro de la paleta existente; sin romper el límite de 40 partículas.
- [ ] **B0.5** Captura final y registro en la sección 11. Marca temporal activa: `BUILD_TAG = 'B0-r3'` (TEMPORAL: se retira en la Fase 6). 🛑 Parada: el usuario valida la captura.

### B1. Preparar el entorno de prueba
- [ ] Preguntar al usuario si puede arrancar el backend (`run_project.bat` o el comando de Flask). Si no está disponible, avisar que se prueba con copia offline y que la sincronización no queda validada.
- [ ] Dejar Vite corriendo en `http://localhost:3005/#/taller`.
- [ ] Confirmar con el usuario que Chrome ya no descarga dentro del proyecto. Dejar el taller en Pixi HD **15 min** sin builds ni descargas, con F12 abierto: si no hay recargas ni cuelgues, la explicación de la sección 3 queda confirmada.

### B2. Verificación en el navegador
- [ ] Abrir el taller, activar **⚡ Pixi HD**, esperar 2-3 min y tomar captura. Describir lo que se ve (no lo que debería verse).
- [ ] Revisar consola (F12): anotar errores reales textuales. Separar los del taller de los ajenos (service worker, backend apagado).
- [ ] Casos del plotter, uno por uno: 0 órdenes en `orden`; 1 orden; varias en cola; máquina offline; cambio de estado de una orden durante el polling (sin reinicio de animación).
- [ ] Confirmar: cabezal quieto en reposo (LED verde), gris sin luz si offline; destellos nunca lejos de la máquina; ningún porcentaje en barra ni tooltip; textos sin pisarse; hit area cubre el plotter completo.
- [ ] Confirmar que las estaciones salen de `getDynamicStations()` (aparece plotter2 o máquina nueva).

### B3. Mediciones reales
- [ ] Alternar Canvas 2D ↔ Pixi HD **30 veces**, 2 s entre cambios, más **5 min** en reposo en Pixi.
- [ ] Reportar memoria (heap con GC forzado si es posible), cantidad de texturas vivas y **FPS reales** (`app.ticker.FPS`). No asumir ningún valor.

🛑 **PARADA:** mostrar capturas y resultados. Pedir al usuario que **apruebe el estilo del plotter**. Si no le convence, ajustar aquí (es lo más barato de corregir) antes de seguir.

---

## 7. BLOQUE C: Fase 3 (personajes y lógica de diff)

Solo empezar con aprobación explícita del Bloque B.

- [ ] Portar la generación de `WorkshopWorker` desde `getUsuarios()` (hasta 4 operarios, roles `disenador`/`impresor`/`cortador`/`empaquetador`, colores `#8b5cf6`/`#22c55e`/`#ec4899`/`#0284c7`, velocidades `2.1 + idx*0.1`).
- [ ] Sprites procedurales ~16×24 px en `workshopSprites.ts`: caminata en 4 direcciones (≥4 frames), idle y "trabajando" según rol, camisa con color del operario, sombra elíptica.
- [ ] Waypoints por pasillos (no atravesar máquinas).
- [ ] Objetos en mano y globos de diálogo pixel art con fade (portar textos del legacy: "⚠️ OT REBOTADA", "OT #… [Printing]", "✂️ [Trillar / Refilar]").
- [ ] **Animaciones por cambio, no por estado:** usar `diffOrders(prev, next)`. Una orden que cambia de estado dispara una animación **una vez**. Prohibido repetir recorridos en cada poll de 3 s.
- [ ] Cola de eventos: con muchos cambios juntos (p. ej. reconexión) encolar y reconciliar sin teletransportes ni acumulación infinita de animaciones.
- [ ] Sonidos del `AudioEngine` en los mismos eventos que el legacy (`playBounceWarning`, `playScissorsCut`, `playClick`).
- [ ] Click en operario → `onSelectOrder` con la misma lógica que el legacy.
- [ ] Probar y reportar: cambio de estado único, varios cambios simultáneos, operario sin órdenes, usuario nuevo en el sistema.

🛑 **PARADA:** captura + resultados. Esperar aprobación.

---

## 8. BLOQUE D y siguientes

### Bloque D: Fase 4, resto de estaciones (sin marco de tarjeta)
Cada estación como objeto reconocible, con cartel pequeño de nombre y badge de contador. Proporcionadas al plotter.
- [x] **Diseño:** escritorio con monitor que emite resplandor y miniatura animada.
- [x] **Insumos:** estantes con botellas CMYK y bobinas.
- [x] **Refilado:** tabla de corte verde, guillotina/cutter, virutas al cortar.
- [x] **Empaque:** cajas, cinta, pila de paquetes que crece según el contador.
- [x] **Despacho:** portón, pallets/camioneta, cajas apiladas según el contador (hoy vacío).
- [x] **Caja y Mostrador:** caja registradora y cliente ocasional (hoy vacío).
- [x] Hit areas rectangulares independientes del sprite (ya existen). Contador con "pop" al cambiar.
🛑 PARADA tras la fase.

### Bloque E: Fase 5, acabado global
- [ ] Iluminación: conos de luz de lámparas (`blendMode = 'add'`), máquinas activas que emiten luz, capa de oscurecimiento suave.
- [ ] Cámara: zoom con rueda, pan con límites, doble clic para resetear.
- [ ] Ciclo día/noche leve según hora real (opcional).
- [ ] Pausar el ticker con la pestaña oculta (`document.visibilityState`); `cacheAsTexture` para el fondo estático.
- [ ] Repetir mediciones de B3.
🛑 PARADA tras la fase.

### Bloque F: Fase 6, salida a producción
- [ ] Todo el Bloque A resuelto y `dist` restaurado.
- [ ] Rama limpia: sin `version.json`, sin la guarda de 15 s, sin cambios ajenos.
- [ ] Decidir con el usuario el flag por defecto (recomendado: `'legacy'` por defecto y Pixi opt-in un tiempo).
- [ ] Redactar resumen: cómo alternar renderers, cómo reemplazar sprites procedurales por PNG.
- [ ] Retirar marca temporal `BUILD_TAG = 'B0-r3'` de `WorkshopCanvasPixi.tsx`.
- [ ] **Merge a `master` y push: SOLO con aprobación explícita del usuario** (despliega a producción).

### Ideas futuras (no hacer sin que el usuario lo pida)
- Cuando el usuario cree el script que sube el log del plotter automáticamente: mostrar en el plotter "Última impresión: OT #X hace N min" con datos reales (o estimar progreso por m² marcado como "~").
- Panel Print Manager que no tape estaciones en pantallas angostas.
- Reemplazar sprites procedurales por arte propio (spritesheet PNG).

---

## 9. Verificación mínima antes de decir "listo" en cualquier tarea

- [ ] `npx tsc --noEmit` sin errores en archivos del taller.
- [ ] Abrir `http://localhost:3005/#/taller` y comprobar visualmente (captura).
- [ ] Consola sin errores rojos del taller tras 2-3 min.
- [ ] Alternar `workshop`/`standard` unas veces: sin errores ni crecimiento anormal de memoria.
- [ ] `git status` limpio de archivos ajenos; `version.json` sin modificar.
- [ ] Informe al usuario en español simple: qué cambió, qué archivos, cómo verlo, qué **no** pudo verificar.

---

## 10. Riesgos conocidos (aprender de lo ocurrido)

- Hubo 3 rondas de "causas raíz" de crashes deducidas sin reproducir y con el build como única prueba. Cada ronda trajo un bug nuevo (p. ej. `statusLed` sin `fill`). **Reproducir antes de arreglar.**
- El agente anterior tocó cosas fuera de alcance (`dist`, `versionCheck`, memoria del sistema) y pusheó contra lo pedido. Ceñirse a la sección 2.
- Un dato falso en pantalla es peor que no mostrar nada.
- Hasta la Fase 4 el plotter se verá más detallado que el resto; no juzgar el estilo global antes.

---

## 11. Registro de avance (el agente añade líneas aquí)

| Fecha | Tarea | Qué se hizo / observado | Archivos |
|---|---|---|---|
| 9 Oct 2026 | (histórico) Fases 0-2 + fixes | Ver sección 4. Falta verificación visual del plotter y cierre del Bloque A. | — |
| 9 Oct 2026 | Diagnóstico de cuelgues | Confirmadas 3 causas (builds + versionCheck, bugs de Pixi, Vite caído por .crdownload). Pendiente de aprobar A5. | — |
| 9 Oct 2026 | A1, A3, A5 | Verificado repo limpio; confirmado commit 1861edd retiró guarda 15s dejando solo DEV; A5 aplicado en commit 68bea72 (`watch.ignored`). | `vite.config.ts`, `src/utils/versionCheck.ts` |
| 9 Oct 2026 | B0.1, B0.2, B0.4 | Corregido borde inferior (trazo 1.5px dentro de límites); barra con haz fino inferior y texto con contorno oscuro; pliego CMYK restaurado con ciclo suave decorativo. | `WorkshopCanvasPixi.tsx` |
| 9 Oct 2026 | Preparación A2 | Commit 1c74b185 extraído a `D:\XignuX\temp_dist_prod` con git archive, 61 archivos verificados; comandos robocopy preparados sin ejecutar. | — |
| 10 Oct 2026 | A2 (dist prod) | Ejecutado `robocopy "D:\XignuX\temp_dist_prod" "D:\XignuX\luxius-panel\dist" /E /XD .git` (SIN `/PURGE`). Verificado: `index.html` apunta a `index-Bay1jYAL-1791525401998.js` (150.006 B), `version.json` buildTime `2026-10-09T05:56:41.997Z`, conteo 764 archivos. `dist_respaldo` (764) y `temp_dist_prod` (61) intactos. Nginx apagado. | `D:\XignuX\luxius-panel\dist` |
| 10 Oct 2026 | B0.3 (Layout HUD) | `PrintManagerHUD` en columna flex lateral izquierda (250px) y mapa a la derecha (`flex: 1`) sin solaparse. En pantallas <900px, el panel pasa arriba del mapa apilándose verticalmente. | `WorkshopDashboard.tsx`, `PrintManagerHUD.tsx` |
| 10 Oct 2026 | SW Dev & Verificación | Documentada directiva SW en roadmap ("Service worker en desarrollo: usar Bypass for network; evaluar una condición mejor (por ejemplo el puerto 3005) en la Fase 6, sin afectar a localhost del taller."). Reportada limitación del navegador de pruebas automático (sin acceso a GUI DevTools para bypass de caché `luxius-v1`). | `ROADMAP_PRINT_DEN_PIXI.md` |
| 10 Oct 2026 | Diagnóstico versión vieja & Esfera azul | Puerto 3005 verificado (PID 12700, único Vite en `F:\Sitio XignuX`). Identificada causa raíz de la esfera azul en commit `6f3b619`: doble offset en `glowGfx` (+24px X, +20px Y) que proyectaba el resplandor en el piso bajo el plotter. Plan B0.2 de legibilidad en capa HiDPI redactado a la espera de OK. | `ROADMAP_PRINT_DEN_PIXI.md` |
| 10 Oct 2026 | Commit local B0 | Commit local `4502611`: `wip(workshop): B0 cierre visual del plotter y layout` (PrintManagerHUD, WorkshopCanvasPixi, WorkshopDashboard, workshopPixiUtils, workshopSprites). Sin push. | `src/components/workshop/*` |
| 10 Oct 2026 | BUILD_TAG 'B0-r3' & Verificación 3006 | Incorporada constante temporal `BUILD_TAG = 'B0-r3'` en `WorkshopCanvasPixi.tsx` (console.log y badge inferior derecho). **TEMPORAL: se retira en la Fase 6.** Verificación en puerto 3006 con Chrome limpio: URL confirmada `http://localhost:3006/#/`, Service Worker registrado para scope `http://localhost:3006/`, `BUILD_TAG` visible en DOM y pantalla. | `WorkshopCanvasPixi.tsx` |
| 10 Oct 2026 | B0.2 Legibilidad & Commit 70605e2 | `uiLayer` desacoplado a resolución nativa 1:1 (`scale = 1`), con coordenadas escaladas (`layoutUI(scale)`). Textos nítidos a 11-12px reales sobre carteles con fondo oscuro sólido opaco (`#090d16`, alpha 1.0) y borde de 1px (`#334155`). Haz animado en la base (y=17). Commit local `70605e2`: `feat(workshop): B0.2 legibilidad en capa HiDPI y marca BUILD_TAG B0-r3`. Revertido `authStore.ts` y eliminados todos los ganchos de depuración (`window.__`) del repositorio. Puerto 3006 cerrado y perfiles temporales eliminados. | `WorkshopCanvasPixi.tsx`, `ROADMAP_PRINT_DEN_PIXI.md` |
| 10 Oct 2026 | B0.2 Ajustes & Commit 35a4718 | Badges agrandados a 12px con forma de píldora para 2 dígitos (13, 14); nombres de estación a 13px bold. Destello del cabezal reemplazado por un cuadrado de 7px centrado sobre el carro con baja opacidad (0.22) sin sobreexposición. Retirada la marca duplicada en JSX dejando solo la integrada en el canvas. Commit local `35a4718`: `feat(workshop): B0.2 agrandar badges y títulos, destello cuadrado sutil y retiro de marca duplicada`. Verificado en puerto 3007 con Chrome limpio y captura `b0_2_badges_test.png` con datos de prueba marcados. Sin push. | `WorkshopCanvasPixi.tsx`, `ROADMAP_PRINT_DEN_PIXI.md` |



| 10 Oct 2026 | Sesión A: Etapas 1-3 + plan Fase 3 | Marca B0-r4 (commit de04ea6), captura con marca única. Medición: 30 alternancias + 5 min, FPS ~60, heap 14,24 -> 15,88 MB (+11,5 %), texturas de Pixi estables (24), fuentes de textura 30 -> 37 (fuga lenta, causa no determinada), 0 errores. Quitado gancho window.__GET_TEXTURE_CACHE_SIZE__ (f419ba6, venia de f94694c). Revisión de código y plan de Fase 3 en PLAN_FASE3_PRINT_DEN.md. B0.5 sigue pendiente de validación del usuario. Sin push. | WorkshopCanvasPixi.tsx, workshopSprites.ts |
| 10 Oct 2026 | Fase 3 aprobada. 4.1 Sprites | Usuario aprueba Fase 3 con D1=A (rol real, respaldo orden legacy), D2=A (globo OT #... EN COLA), D3=A (operarios en el pasillo). Creado workshopCharacters.ts: 15 texturas por operario (caminata 4 dir, reposo/respiro, trabajo por rol) + sombra. Marca F3-r1, commit local 47d4f63. Sin push. | workshopCharacters.ts, WorkshopCanvasPixi.tsx |
| 10 Oct 2026 | 4.2 Movimiento | workshopWorkers.ts: equipo desde getUsuarios (máx 4), rutas por pasillo (392 rutas, 0 inválidas), velocidad por deltaTime, z-order por Y. Marca F3-r2. 12 alternancias: 1 equipo vivo, ~60 FPS, 0 errores. Sin push. | workshopWorkers.ts, WorkshopCanvasPixi.tsx |
| 10 Oct 2026 | 4.3 Eventos por cambio | Primera lectura = línea base sin eventos; 'new' y 'removed' no disparan nada ('removed' ya no inventa estado); solo status_change: orden -> diseñador a plotter, impreso -> impresor a corte, rebotado/standby -> impresor a diseño; viaje + 3 s en estación + vuelta; cola con tope 20 y sin duplicados. Marca F3-r3. Sin push. | workshopWorkers.ts, workshopPixiUtils.ts, WorkshopCanvasPixi.tsx |
| 10 Oct 2026 | 4.4 Globos y objetos | Decisiones del usuario: piel natural (#c68642 / #8d5524 en lugar del amarillo y el gris), rebotadas a diseño, impresas a despacho. Globos `OT #… EN COLA / REBOTADA / A DESPACHO` en la capa de interfaz (12 px reales, borde por color, anti-solape), objeto en la mano (carpeta, carpeta roja, rollo) y pose de trabajo en estación. Marca F3-r4. Sin push. | workshopBubbles.ts (nuevo), workshopWorkers.ts, WorkshopCanvasPixi.tsx |
| 10 Oct 2026 | 4.5 Sonidos y clics | Sonidos una vez por viaje que empieza (rebotada: playBounceWarning, impresa: playScissorsCut), nunca al abrir ni en cada poll. Clic en operario: playClick + abre la orden de su viaje (o la primera de su rol). Capa de clic de operarios por encima de las áreas de estación (R5). Marca F3-r5. Sin push. | workshopWorkers.ts, WorkshopCanvasPixi.tsx |
| 10 Oct 2026 | 4.6a Charlas pop (pedido del usuario) | Los operarios libres charlan entre ellos: uno camina hasta el otro, intercambian 2 frases por turnos (cultura pop y videojuegos, siempre elogiando la calidad de impresión y de los diseños; 30 guiones en workshopBanter.ts), y vuelve a su puesto. Una charla cada 12-20 s tras la anterior (la primera a los 6 s). Los viajes de órdenes tienen prioridad: cortan la charla. Globos amarillos, varias líneas. Marca F3-r6. Sin push. | workshopBanter.ts (nuevo), workshopWorkers.ts, workshopBubbles.ts, WorkshopCanvasPixi.tsx |
| 10 Oct 2026 | 4.6b Caminata más lenta | Pedido del usuario: multiplicador global `WALK_SLOWDOWN = 0.75` sobre la velocidad de todas las caminatas (viajes, paseos y charlas). Commit dc9b643 llegó por error a `master` (rama completa); el usuario decidió dejarlo y actualizar la nube después. | workshopWorkers.ts |
| 10 Oct 2026 | 4.6c Conversación sin solapes + Bloque D | Nadie piensa ni habla a la vez (un solo globo de conversación o nube activo; al empezar una charla se apagan todas las nubes). Saludos temáticos (22 pares) a veces (40 %) al cruzarse, sin detener la marcha, con enfriamiento por pareja de 18 s. Los paseantes a veces (50 %) se detienen 4,5-8 s en una estación en pose de trabajo y siguen. 28 charlas nuevas (total 58), 14 pensamientos nuevos. Bloque D: workshopStationProps.ts con objetos de Diseño, Insumos, Refilado, Empaque, Despacho y Caja; pilas de cajas con el contador real (tope 12); pop del contador al cambiar. Verificado en navegador (captura): se ven las seis estaciones. Marca D-r1. Sin push a la nube hasta que el usuario lo pida. | workshopWorkers.ts, workshopBanter.ts, workshopStationProps.ts (nuevo), WorkshopCanvasPixi.tsx |
| 10 Oct 2026 | Ficha de operarios + Bloque E | Clic en operario abre ficha técnica estilo WoW (WorkerSheetCard.tsx + workshopSheets.ts): actividad real, órdenes esperando a su rol (real) y estadísticas/fortalezas/debilidades de FANTASÍA (deterministas por operario, aclarado en pantalla). Bloque E: iluminación (workshopLighting.ts: velo día/noche por hora real con máximo 0.30, conos de lámparas aditivos, luz cian bajo plotters con cola), cámara (workshopCamera.ts: Ctrl+rueda zoom 1x-3x, arrastre con zoom, doble clic restablece; arrastres no disparan clics). Ya existía pausa del ticker con pestaña oculta. NO hecho: cacheAsTexture del fondo (riesgo de borroneo con zoom) y mediciones B3. Verificado en navegador: ficha y luces; zoom NO verificado (el navegador automático no puede usar Ctrl+rueda). Marca E-r1. Sin push. | WorkshopCanvasPixi.tsx, workshopWorkers.ts, workshopLighting.ts, workshopCamera.ts, WorkerSheetCard.tsx, workshopSheets.ts |

- Estaciones v2 (calidad de dibujo) + cierre de ficha por clic fuera: hecho, verificado en navegador (local, sin push).

- Bloque F (F-r1, local): alertas reales, fichas de estacion, pizarra y reloj, eventos, mascota, visitas, clima (Buenos Aires por defecto), dia/noche, confeti, atajos, Modo TV, logros. Cajas llevadas por operarios (post->empaque, completo->despacho). Sonido diferido (botones de apagado individuales). Sin subir a la nube.

- Bloque F (F-r2, local): 5 mascotas con rotacion de residente y reunion tras apagon, fichas de fantasia, sonidos WebAudio con boton Animales ON/OFF, caricias de operarios; pizarra y reloj clicables (resumen del dia / alarmas = alertas reales); clima por defecto Cordoba.

- Bloque F (F-r2): sonido con botones individuales ON/OFF: Animales, Ambiente, Maquinas, Avisos, Festejos (persisten en localStorage luxius_print_den_fx).

- Bloque F (F-r3): contenido y ajustes movidos a src/components/workshop/content/ (pets, guests, texts, config) + README.md de extension. Sonido de mascotas ahora descrito por datos (PetSound).

- Bloque F (F-r4): sistema de reemplazo de sprites por PNG (content/sprites.ts, workshopSpriteOverrides.ts): texturas sueltas (plotter, cartel, ventana, baldosas), hojas de operarios (16x24, 64x120) y objetos de estacion; colores de operarios en content/characters.ts; public/workshop-sprites/. Verificado con PNG de prueba (revertido).

- [x] 11/10/2026 Tablon de Xana (F-r5) + merge a master (8e15fcf) + gh-pages (9fdab08). Flag renderer sigue legacy.

- [x] 11/10/2026 PetPortrait (retratos desde content/pets.ts) + Pixi HD por defecto. Commit local, SIN push (pendiente verificar visualmente).

- [x] 11/10/2026 Tablon de Xana: un solo consejo rotando cada 20s. Commit local, sin push.

- [x] 11/10/2026 Subido: master 90da796 + gh-pages (retratos, Pixi HD por defecto, tablon con un consejo).

- [x] 11/10/2026 Contorno de mascotas oscuras (auto por luminancia, PetProfile.outline). Commit local, sin push, sin verificar visualmente.

- [x] 11/10/2026 Voces de operarios (content/voices.ts + workshopVoice.ts) y tilines de interfaz. Botones Voces/Interfaz. Commit local, sin push, sin escuchar/verificar en navegador.

- [x] 11/10/2026 Quitado el guardia nocturno (visita azul sin ficha). Quedan repartidor y tecnico (decorativos). Commit local, sin push.
- [x] 11/10/2026 Retratos detallados de mascotas (collar, marcas, sombreado, bigotes) y rasgos individuales en operarios (pelo, peinado, accesorio) + WorkerPortrait en la ficha. Commit local, sin push.
- [x] 11/10/2026 Ventanas mas grandes (64x24, 3 paneles) con cielo, sol/luna, nubes y lluvia escalados. Commit local, sin push.
- [x] 11/10/2026 Logo XignuX en pixel art junto al reloj (getLogoXignuxTexture, reemplazable por PNG 'logo_xignux'). Commit local, sin push.
- [x] 11/10/2026 Diseno e Insumos al 50% (propsScale) y nueva zona Refrigerios (heladera, cafetera, cocina) con descansos de operarios (pensar/charlar). Commit local, sin push.
- [x] 11/10/2026 Empaque (80%), Refilado (70%) y Caja (75%) mas chicos y con tamanos distintos para romper la simetria. Commit local, sin push.
- [x] 11/10/2026 Contorno de mascotas oscuras menos claro (0xcbd5e1 -> 0x5f6f86) en sprite y retrato. Commit local, sin push.
- [x] 11/10/2026 Clima: migracion unica para encender el toggle si habia un OFF viejo guardado. Commit local, sin push.
- [x] 11/10/2026 Sectores mas chicos, pasillo ancho con 5 carriles, cartelitos en vez de recuadros, resplandor al pasar el mouse; migracion del clima a prueba de StrictMode (flag v4). Commit local, sin push.
- [x] 11/10/2026 Visitas (repartidor, tecnico) tocables: muestran nombre y frase. Commit local, sin push.
- [x] 11/10/2026 Luces nocturnas calidas, chispas de trabajo por estacion, radio (3 emisoras), meta diaria con festejo, eventos cumple/cliente/pizza, franja del Modo TV, etiqueta F-r1 oculta. Commit local, sin push.
- [x] 11/10/2026 Plotter mas chico (WORKSHOP_CONFIG.plotterScale = 0.72). Commit local, sin push.
- [x] 11/10/2026 Temporadas (Navidad/9 de Julio/Halloween), gotera con balde, evento bostezo, charla con datos reales, mascotas con personalidad (dormir de noche, compania, cafetera), PNG de mascotas y contenido remoto JSON.
- [x] 11/10/2026 Sonido normalizado: bus unico con limitador, niveles en content/audio.ts, alarma flotante suavizada.
