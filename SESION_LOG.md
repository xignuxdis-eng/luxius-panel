# SESION_LOG — Print Den (Sesión A)

## [10 Oct 2026 16:50-17:05] Etapa 1 (cierre B0) + Etapa 2 (medición) + Etapa 3 (revisión) + plan Fase 3
- Hecho:
  - Etapa 1: marca `B0-r4`; una sola marca (la de React se quitó en 35a4718); badges 12 px / nombres 13 px; destello cuadrado 7 px (35a4718). Captura con marca: `b0_r4_map.png` / `b0_r4_full.png` (datos de prueba).
  - Etapa 2: 30 alternancias + 5 min de reposo en Pixi. Resultados en `scratch/stage2_results.json`.
  - Etapa 3: revisión de código (solo lectura). Hallazgo: gancho `window.__GET_TEXTURE_CACHE_SIZE__` en `workshopSprites.ts` (venía desde f94694c, ya subido a GitHub). Quitado en f419ba6.
  - Plan de Fase 3 en `PLAN_FASE3_PRINT_DEN.md`. **No se escribió código de personajes.**
- Commits locales y BUILD_TAG: `de04ea6` (B0-r4), `f419ba6` (sin cambio de marca, B0-r4).
- Verificado (con captura/medición): marca única `B0-r4`; FPS ~60; memoria estable en reposo; 0 errores de consola del taller.
- No verificado: sincronización real con el backend (apagado); hit-testing por clic real sobre los textos; comportamiento a 144 Hz; causa de la fuga lenta de fuentes de textura.
- Archivos tocados: `WorkshopCanvasPixi.tsx` (marca), `workshopSprites.ts` (quitar gancho). Nuevos sin commitear: `PLAN_FASE3_PRINT_DEN.md`, `SESION_LOG.md`, `ROADMAP_PRINT_DEN_PIXI.md`.
- Próximo paso exacto: esperar `APRUEBO FASE 3` y las decisiones D1/D2/D3 del plan; luego Etapa 4.1 (`F3-r1`).
- Decisiones pendientes del usuario: validar captura B0-r4 (B0.5), D1, D2, D3, y si autoriza arreglar los puntos de la lista de la Etapa 3.

## [10 Oct 2026 17:13] Etapa 4.1 (Fase 3, sprites)
- Hecho: aprobación de Fase 3 recibida (usuario acepta D1=A, D2=A, D3=A). Creado workshopCharacters.ts (sprites 16x24, caminata 4 dir x 4 cuadros, reposo/respiro, trabajo por rol con herramienta, sombra). No está conectado al mapa.
- Commit local (hash) y BUILD_TAG: 47d4f63 / F3-r1.
- Verificado: hoja de prueba en scratch (f3_r1_sheet.png); 15 texturas únicas por operario, todas válidas 16x24 (4 operarios = 60 + 1 sombra); mapa con marca F3-r1 (f3_r1_map.png); 0 errores de consola; tsc sin errores en mis archivos.
- No verificado: aspecto en movimiento (sin animación todavía); sombra aún no colocada en el mapa.
- Archivos tocados: workshopCharacters.ts (nuevo), WorkshopCanvasPixi.tsx (solo BUILD_TAG).
- Próximo paso exacto: 4.2 Movimiento (F3-r2): WorkshopWorker desde getUsuarios (máx 4), waypoints por pasillo, z-order por Y, deltaTime.
- Decisiones pendientes del usuario: aprobar paleta de piel (el legacy usa #fde047, amarillo fuerte).

## [10 Oct 2026 17:24] Etapa 4.2 (Fase 3, movimiento)
- Hecho: `workshopWorkers.ts` (equipo desde getUsuarios, máx. 4, clientes/deshabilitados excluidos; rutas por el pasillo; velocidad por deltaTime; z-order por Y) e integración en `WorkshopCanvasPixi.tsx` (capa WorkersLayer entre estaciones y partículas, update en ticker, destroy en cleanup). Los operarios aún NO reaccionan a órdenes (eso es 4.3).
- Commit local y BUILD_TAG: ver `git log` (mensaje "F3-r2 operarios en el mapa") / F3-r2.
- Verificado: equipo con usuarios por defecto = impresion/impresor, diseno/disenador, carlos/impresor, adrian/cortador (cliente excluido); 392 rutas estación→estación en ambos carriles, 0 inválidas; misma posición final ±0.6 px a 60 y 120 FPS simulados (a 30 FPS +2.3 px por redondeo del último paso); capturas `f3_r2_idle.png`, `f3_r2_walk1-3.png` con marca F3-r2; 12 alternancias Canvas↔Pixi: 1 WorkerCrew vivo, FPS ~60, heap 24.2→25.1 MB, 0 errores de consola. tsc: 0 errores en mis archivos.
- No verificado: objetos destruidos aún contados antes de recolección de basura (no se forzó GC en esta prueba); caminata a 144 Hz; aspecto de caminata en tiempo real (solo fotogramas sueltos).
- Archivos tocados: workshopWorkers.ts (nuevo), WorkshopCanvasPixi.tsx.
- Próximo paso exacto: 4.3 (F3-r3): resolver R1-R3 (línea base sin eventos, 'removed' sin animación, cola con tope) y luego eventos por cambio de estado.
- Decisiones pendientes del usuario: color de piel #fde047 (queda para después).

## [10 Oct 2026 17:28] Etapa 4.3 (Fase 3, eventos por cambio)
- Hecho: R1 primera lectura = línea base sin eventos; R2 'removed' ya no inventa `entregado` (nextStatus undefined); R3 cola de diffs acotada (20) y consumida. Solo los `status_change` mueven operarios: orden → diseñador a plotter; impreso → impresor a corte; rebotado/standby → impresor a diseño (decisión mía: el sistema viejo mandaba a puntos sueltos; aquí van a la estación equivalente). Viaje, 3 s en la estación, vuelta al puesto. Cola de encargos con tope 20, sin duplicados, descarta roles sin operario.
- Commit local y BUILD_TAG: ver `git log` ("F3-r3") / F3-r3.
- Verificado (datos de prueba): línea base con 5 órdenes → 0 movimientos y cola 0; tras cambiar 101→orden y 102→impreso: el diseñador fue al plotter (240,126), esperó y volvió a (59,126); el impresor fue a corte (306,134) y volvió; orden nueva (106) y orden eliminada (103) no movieron a nadie; ráfaga de 30 cambios: cola ≤ 20, sin errores; 0 errores de consola; tsc 0 errores en mis archivos. Capturas f3_r3_baseline/t4/t8.
- No verificado: tope de 20 alcanzado de verdad (con 3 tipos de encargo y sin duplicados la cola casi no crece); sonidos y globos (4.4/4.5); entrega real (el sistema viejo no tenía animación para 'completo'/'entregado' y no se agregó).
- Archivos tocados: workshopWorkers.ts, workshopPixiUtils.ts, WorkshopCanvasPixi.tsx.
- Próximo paso exacto: 4.4 (F3-r4) objetos en mano y globos de texto (D2: `OT #… EN COLA`).
- Decisiones pendientes del usuario: color de piel; confirmar destino de rebotado (hoy: diseño).

## [10 Oct 2026 17:54] Etapa 4.4 (Fase 3, globos y objetos en mano)
- Decisiones del usuario aplicadas: piel natural (3.er operario #c68642, 5.º #8d5524; antes amarillo/gris), rebotadas → diseño (ya estaba), impresas → despacho (antes corte).
- Hecho: `workshopBubbles.ts` (globos en UILayer, 12 px reales, borde verde/rojo/celeste por tono, anti-solape: se apilan hacia arriba). Textos D2: `OT #… EN COLA` (diseñador al plotter), `OT #… REBOTADA`, `OT #… A DESPACHO`. Objeto en la mano (carpeta amarilla, carpeta roja, rollo rosa) mientras dura el viaje + estadía; pose de trabajo cuando está de frente en la estación. Globo y objeto se quitan al volver.
- Commit local y BUILD_TAG: ver `git log` ("F3-r4") / F3-r4.
- Verificado (datos de prueba): capturas f3_r4_t1/t3/t5 con marca F3-r4: globos legibles, sin solaparse, objetos en mano; los globos desaparecen al volver (estado 6 s: sin globo); ráfaga de 30 cambios sin errores; 0 errores de consola; tsc 0 errores en mis archivos.
- No verificado: globos con textos muy largos (`ot` real puede ser más largo que el id de prueba); escala distinta de la actual en pantallas grandes; clic en operarios y sonidos (4.5).
- Archivos tocados: workshopBubbles.ts (nuevo), workshopWorkers.ts, WorkshopCanvasPixi.tsx.
- Próximo paso exacto: 4.5 (F3-r5) sonidos (una vez por evento: rebotada → playBounceWarning, impresa → playScissorsCut) y clic en operario (playClick + abrir su orden con `onSelectOrder`).
- Decisiones pendientes del usuario: ninguna.

## [10 Oct 2026 18:02] Etapa 4.5 (Fase 3, sonidos y clics)
- Hecho: hook `onErrandStart` en `WorkerCrew`: suena una vez cuando un viaje empieza (rebotada → `playBounceWarning`; impresa → `playScissorsCut`). Clic en operario (`WorkerHitLayer` por encima de las áreas de estación, R5): `playClick` + abre la orden del viaje actual con `onSelectOrder` (el Dashboard abre el visualizador de archivos); sin viaje, la primera orden del rol (reglas del sistema viejo). `onSelectOrder` ya no está sin usar.
- Commit local y BUILD_TAG: ver `git log` ("F3-r5") / F3-r5.
- Verificado (datos de prueba, sonidos contados con parche solo en la página de prueba, sin tocar el repo): al abrir 0 sonidos; tras 3 cambios bounce=1, scissors=1; clic en operario en reposo (w-1) abrió el visualizador y contó 1 clic; clic en w-5 durante su viaje (orden 101) contó 1 clic más (no se duplicó con la estación) y abrió el visualizador (`f3_r5_click_busy.png`); ráfaga de 30 cambios: bounce=2, scissors=2 (por viaje, no por poll); 0 errores de consola; tsc 0 errores.
- No verificado: que el sonido real se oiga (la prueba cuenta llamadas; no hay audio en Chrome headless); que el visualizador muestre exactamente la orden 101 (los datos de prueba no traen cliente/medidas); clic en pantallas táctiles.
- Archivos tocados: workshopWorkers.ts, WorkshopCanvasPixi.tsx.
- Próximo paso exacto: 4.6 pruebas finales (alternancias Canvas↔Pixi con operarios y globos, memoria, FPS) y Etapa 5 (cierre, informe de 9 puntos).

## 4.6a Charlas pop entre operarios (F3-r6)
- Decisiones del usuario: A1 uno camina hasta el otro y charlan en el pasillo y vuelven; A2 charla corta (2-3 frases) cada 12-20 s con operarios libres; A3 los viajes de órdenes tienen prioridad y cortan la charla.
- Hecho: workshopBanter.ts (30 guiones pop), charlas en workshopWorkers.ts, globos amarillos de altura variable en workshopBubbles.ts, BUILD_TAG F3-r6.
- Verificado (datos de prueba, scratch): 3 charlas completas, guiones sin repetir seguidos, ~26 s entre charlas, charla cortada limpiamente por viaje de orden, 0 errores de consola.
- No verificado: variedad con muchas horas de uso, globo grande tapando el plotter, con menos de 2 operarios no hay charla.
- Archivos: workshopBanter.ts (nuevo), workshopWorkers.ts, workshopBubbles.ts, WorkshopCanvasPixi.tsx.
- Próximo paso: 4.6 pruebas finales y Etapa 5.
- Decisiones pendientes del usuario: ninguna.





## 4.6b Frases Blizzard + pruebas finales (F3-r7)
- Hecho: +31 guiones de StarCraft, Warcraft y WoW en workshopBanter.ts (total 67). BUILD_TAG F3-r7.
- Pruebas finales (datos de prueba, scratch ev7_runner.cjs, GC forzado, 12 alternancias Canvas<->Pixi con charlas activas): 1 WorkerCrew vivo y FPS ~59.5-59.9 en todas las mediciones, 0 errores de consola, tsc 0 errores en mis archivos.
- Deuda sin causa determinada: objetos destruidos retenidos tras GC (crews/apps totales 1->5), TextureSource 93->99 y heap 24.7->26.3 MB tras 12 alternancias (crecimiento lento, ~0.13 MB por alternancia).
- No verificado: sonido audible, datos reales del taller, uso prolongado de horas.

## 4.6c Frases 1 s m�s en pantalla (F3-r8)
- Pedido del usuario: cada frase dura 1 s m�s (lineDurationMs: m�nimo 3600 ms, base 2400 + 55 ms por letra). BUILD_TAG F3-r8. Solo verificado con tipos; no se midi� en pantalla.

## 4.6d Paseo y pensamientos de operarios libres (F3-r9)
- Decisiones del usuario: pasean por todo el mapa esquivando estaciones; globito de nube con frase corta de una linea; piensan cada 8-14 s y las ordenes/charlas tienen prioridad. (Cambia D3=A: ahora los libres tambien salen del pasillo, nunca entran en estaciones.)
- Hecho: workshopWorkers.ts (fases rest/out/back, rutas validadas, vuelta por el mismo camino, velocidad 55%), workshopBanter.ts (36 pensamientos), workshopBubbles.ts (nube clara con puntitos). BUILD_TAG F3-r9.
- Verificado (datos de prueba, scratch ev8_runner.cjs, 75 s + orden): 600 posiciones, 0 dentro de estaciones; llegaron al borde inferior (y=263); 17 pensamientos distintos; 3 charlas; orden durante paseo: el disenador volvio por su camino, fue al plotter y regreso; 0 errores de consola; tsc 0 en mis archivos.
- No verificado: otros mapas (varias maquinas), pantallas pequenas, globos largos tapando estaciones.
