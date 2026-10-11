// content/audio.ts - NIVELES DE SONIDO del sistema (solo números). Todo el audio sintetizado pasa por workshopAudioBus.ts.
// Los volúmenes van de 0 a 1 y son de PICO por sonido; están calibrados para que ningún efecto destaque sobre las voces
// (referencia: una voz de operario ≈ 0.035). Si algo suena fuerte o flojo, se ajusta acá y no en el código.

/** Volumen general y limitador (compresor) que frena los picos. */
export const AUDIO_BUS = {
    /** Volumen general (0 a 1). */
    master: 0.9,
    /** A partir de cuántos dB empieza a comprimir (más negativo = más parejo). */
    threshold: -26,
    knee: 20,
    ratio: 10,
    attack: 0.003,
    release: 0.2
};

/** Efectos del taller (AudioEngine). */
export const SFX_LEVELS = {
    printSweep: 0.03,
    scissors: 0.05,
    bounceWarning: 0.035,
    /** Cada una de las 4 notas del "pedido completo". */
    orderComplete: 0.04,
    click: 0.045
};

/** Mascotas: se multiplica el volumen de cada receta de content/pets.ts por este factor. */
export const ANIMAL_TRIM = 0.4;

/** Alarma / temporizador flotante (FloatingAlarm). */
export const ALARM_LEVEL = 0.06;
