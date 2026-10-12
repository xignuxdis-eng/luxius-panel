// content/texts.ts - FRASES de los eventos del Print Den (solo texto). Editá o agregá frases libremente.
// Todo es decorativo. No hacer chistes sobre clientes.

export const EVENT_TEXTS = {
    blackout: ['¡Se fue la luz! 🔦', '¿Alguien tocó el térmico?', 'Tranquilos, tranquilos...'],
    blackoutBack: ['¡Volvió la luz! 💡', 'Menos mal, no se perdió ningún archivo.'],
    coffee: ['¡Mi café! ☕', 'Cuidado: piso mojado.', 'Alguien traiga el secador...'],
    happyHour: ['¡Hora feliz en el Den! 🎶', '¡Música, maestro! 🎵', 'Y encima los impresos salen bárbaros.'],
    birthday: ['¡Que cumplas muchos más! 🎉', '¡A soplar las velitas! 🕯️', '¡Torta para todo el equipo!'],
    /** Al final del día (de noche) alguien bosteza. */
    yawn: ['Aaaah... qué sueño 🥱', 'Ya casi es hora de irse... 🥱', 'Un cafecito más y sigo ☕'],
    /** Cuando llueve y aparece una gotera con su balde. */
    rainBucket: ['¡Gotera! Traigan un balde 🪣', 'Otra vez la gotera del techo...', 'Plic, plic, plic... 💧'],
    /** Salida de la lluvia fuerte. */
    rainStop: ['Ya paró la lluvia ☀️', 'Listo, se terminó la gotera.'],
    /** El operario que lleva el balde hasta la gotera. */
    rainBucketGo: 'Ya llevo el balde 🪣',
    /** El operario que retira el balde cuando deja de llover. */
    rainBucketTake: 'Guardo el balde 🪣',
    /** Cuando Teo o Muchi hacen pis en el taller. */
    petPeeWarn: ['¡Nooo! ¡Teo / Muchi otra vez en el piso! 🐾💦', '¡Cuidado con el pis! ¡No lo pisen! 🐕💦', '¡Teo! ¡Muchi! ¡Al patio se va! 🐾'],
    mirtaMopGo: '¡Ya voy con el balde y la mopa! 🪣🧹',
    mirtaMopDone: 'Listo... ¡quedó impecable y desinfectado! ✨'
};

/**
 * Charlas con datos reales del día (sin nombres de clientes). Los marcadores entre llaves se reemplazan:
 *   {n} cantidad, {m2} m² producidos hoy, {dias} antigüedad. Cada lista se usa solo si hay datos para completarla.
 */
export const ORDER_TALK = {
    /** Hay órdenes en cola ({n}). */
    queue: ['Tenemos {n} órdenes en cola, ¡a darle! 💪', 'Quedan {n} trabajos por imprimir.', '{n} en cola... y seguimos.'],
    /** Hay una sola orden en cola. */
    queueOne: ['Queda una sola orden en cola. ¡Casi!', 'Solo una en cola, tranquilos.'],
    /** Cola vacía. */
    queueEmpty: ['Cola vacía: ¡todo al día! ✨', 'No queda nada en cola. ¡Buen ritmo!'],
    /** Hay atrasadas ({n}). */
    overdue: ['Ojo: {n} órdenes atrasadas ⚠️', 'Hay que apurar las {n} atrasadas.'],
    overdueOne: ['Ojo con la orden atrasada ⚠️', 'Queda una atrasada, hay que sacarla hoy.'],
    /** Hoy se produjeron {m2} m². */
    m2: ['Llevamos {m2} m² producidos hoy 📏', '¡{m2} m² hoy y contando!'],
    /** Hay una orden esperando hace {dias} días. */
    oldest: ['La orden más vieja en cola lleva {dias} días esperando.', 'Hay una esperando hace {dias} días, ¡a priorizarla!']
};
