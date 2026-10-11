// content/config.ts - AJUSTES CENTRALES del Print Den (solo números y opciones, nada de lógica).
// Si querés que algo pase más seguido, más lento, en otra ciudad o en otro lugar de la pared, se cambia acá.
// Los tiempos están en milisegundos (ms) salvo que diga otra cosa. Los rangos son [mínimo, máximo].

/** Qué extras están encendidos la primera vez (después cada usuario los cambia con los botones de la barra). */
export const DEFAULT_FX = {
    pet: true,
    events: true,
    weather: true,
    alerts: true,
    petSound: true,
    sndAmbient: true,
    sndMachines: true,
    sndAlerts: true,
    sndAchv: true
};

export const WORKSHOP_CONFIG = {
    /** Pizarra "HOY EN EL TALLER" en la pared (coordenadas del mapa lógico 480×270). */
    board: { x: 108, y: 10, w: 100, h: 23 },
    /** Reloj de pared (centro y radio, en coordenadas del mapa). */
    clock: { cx: 292, cy: 20 },
    /** Ventanas con cielo: posiciones X (izquierda de cada vidrio) e Y. */
    windows: { xs: [32, 396], y: 9 },

    weather: {
        /** Ubicación por defecto: Córdoba (donde está el taller). Se puede cambiar por usuario en localStorage 'luxius_print_den_geo'. */
        defaultGeo: { lat: -31.4201, lon: -64.1888, name: 'Córdoba' },
        refreshMs: 30 * 60 * 1000
    },

    pets: {
        /** Cada cuánto se turnan las mascotas. */
        rotationMs: [150000, 270000] as [number, number],
        /** Igual, pero en modo rápido de pruebas (localStorage 'luxius_print_den_events_fast' = '1'). */
        rotationFastMs: [18000, 28000] as [number, number],
        /** Tras un apagón: cuánto se quedan todas juntas antes de empezar a irse. */
        gatherHoldMs: 14000,
        /** Tras la reunión: cada cuánto se va una. */
        leaveIntervalMs: [9000, 14000] as [number, number],
        /** Operarios que acarician: cada cuánto se revisa quién pasa cerca, a qué distancia (px) y cuánto espera cada mascota. */
        careCheckMs: 1500,
        careRadius: 16,
        careCooldownMs: [22000, 34000] as [number, number]
    },

    events: {
        /** Pausa entre eventos aleatorios. */
        intervalMs: [55000, 120000] as [number, number],
        intervalFastMs: [5000, 9000] as [number, number],
        coffeeMs: 6000,
        happyHourMs: 11000,
        /** Apagón: duración total y momentos (ms desde el inicio). */
        blackout: { darkUntilMs: 3600, endMs: 4400 },
        /** Horario del guardia nocturno (hora decimal, 0-24). */
        nightGuard: { fromHour: 22, toHour: 6 }
    }
};

/** Elige un valor al azar dentro de un rango [min, max]. */
export const randomIn = (range: [number, number], rng: () => number = Math.random): number => range[0] + rng() * (range[1] - range[0]);
