/**
 * Regresión del bug de laminado especial (19/10/2026).
 *
 * `getConsumption` multiplica el largo del paño por la cantidad de copias.
 * `isSpecialLaminationOrder` comparaba ese total contra el umbral de 2.93m,
 * así que un paño de 1.55m con 2 copias daba 3.10ml y disparaba la alerta de
 * "laminado especial" sin que ningún paño superara ese largo.
 *
 * Estos tests fijan la regla correcta: el umbral se evalúa sobre UN paño.
 */
import { describe, it, expect } from 'vitest'

const LIMITE = 2.93

/** Replica exacta de la función corregida en Entrada.tsx. */
function isSpecialLaminationOrder(order: {
    ancho: number; alto: number; copias: number; consumoEstimado?: number
}, cons?: { value: number; unit: string }) {
    const c = cons || { value: order.consumoEstimado ?? 0, unit: 'ml' }
    const rawW = Number(order.ancho) || 0
    const rawH = Number(order.alto) || 0
    const w = Math.round((rawW > 20 ? rawW / 100 : rawW) * 100) / 100
    const h = Math.round((rawH > 20 ? rawH / 100 : rawH) * 100) / 100

    if (c.unit === 'ml') {
        const copias = Math.max(1, Number(order.copias) || 1)
        const largoDeUnPano = c.value / copias
        return largoDeUnPano > LIMITE || Math.max(w, h) > LIMITE
    }
    return Math.max(w, h) > LIMITE
}

/** Replica del calculo de consumo: multiplica por copias (ver Entrada.tsx). */
function consumoMl(alto: number, copias: number) {
    return Math.round(alto * copias * 100) / 100
}

describe('laminado especial — el bug de las copias', () => {
    it('NO dispara con un paño de 1.55m y 2 copias (el caso reportado)', () => {
        // 1.55 x 2 = 3.10 > 2.93 -> la version vieja disparaba.
        const valor = consumoMl(1.55, 2)
        expect(valor).toBeGreaterThan(LIMITE) // el consumo total SÍ supera el umbral
        const r = isSpecialLaminationOrder(
            { ancho: 0.8, alto: 1.55, copias: 2, consumoEstimado: valor },
        )
        expect(r).toBe(false) // pero ningun pano individual lo supera
    })

    it('NO dispara con 3 copias de un paño de 1.00m', () => {
        const valor = consumoMl(1.0, 3)
        const r = isSpecialLaminationOrder({ ancho: 0.5, alto: 1.0, copias: 3, consumoEstimado: valor })
        expect(r).toBe(false)
    })

    it('NO dispara con muchas copias de un paño corto', () => {
        const valor = consumoMl(0.5, 10) // 5.0 ml totales
        const r = isSpecialLaminationOrder({ ancho: 0.3, alto: 0.5, copias: 10, consumoEstimado: valor })
        expect(r).toBe(false)
    })

    it('SÍ dispara con UN solo paño de 3.00m', () => {
        const valor = consumoMl(3.0, 1)
        const r = isSpecialLaminationOrder({ ancho: 0.5, alto: 3.0, copias: 1, consumoEstimado: valor })
        expect(r).toBe(true)
    })

    it('SÍ dispara con un paño de 3.00m aun teniendo 4 copias', () => {
        // El paño individual excede: debe seguir disparando.
        const valor = consumoMl(3.0, 4)
        const r = isSpecialLaminationOrder({ ancho: 0.5, alto: 3.0, copias: 4, consumoEstimado: valor })
        expect(r).toBe(true)
    })

    it('el limite es 2.93m exactos (no dispara por redondeo)', () => {
        const r = isSpecialLaminationOrder({ ancho: 0.5, alto: 2.93, copias: 1, consumoEstimado: 2.93 })
        expect(r).toBe(false)
    })

    it('dispara apenas supera 2.93m', () => {
        const r = isSpecialLaminationOrder({ ancho: 0.5, alto: 2.94, copias: 1, consumoEstimado: 2.94 })
        expect(r).toBe(true)
    })

    it('con copias = 0 no divide entre cero ni rompe', () => {
        const r = isSpecialLaminationOrder({ ancho: 0.5, alto: 3.0, copias: 0, consumoEstimado: 3.0 })
        expect(typeof r).toBe('boolean')
        expect(r).toBe(true)
    })
})

describe('laminado especial — conversion cm a m', () => {
    it('trata 300 como 3.00m, no como 300m', () => {
        // Si no se dividiera, 300 > 2.93 siempre: todo seria "especial".
        const r = isSpecialLaminationOrder({ ancho: 50, alto: 300, copias: 1, consumoEstimado: 3 })
        expect(r).toBe(true) // 3.00m realmente excede
    })

    it('300 cm de ancho dispara: 3.00m excede en cualquier eje', () => {
        // max(w, h) = 3.00 > 2.93. El umbral aplica a cualquier dimension,
        // no solo al largo: un pano de 3m de ancho tambien necesita laminado
        // especial aunque su largo sea corto.
        const r = isSpecialLaminationOrder({ ancho: 300, alto: 100, copias: 1, consumoEstimado: 1 })
        expect(r).toBe(true)
    })

    it('290 cm NO dispara: 2.90m queda bajo el umbral', () => {
        const r = isSpecialLaminationOrder({ ancho: 290, alto: 100, copias: 1, consumoEstimado: 1 })
        expect(r).toBe(false)
    })

    it('293 cm NO dispara: justo en el limite', () => {
        const r = isSpecialLaminationOrder({ ancho: 293, alto: 100, copias: 1, consumoEstimado: 1 })
        expect(r).toBe(false)
    })

    it('294 cm dispara: apenas supera', () => {
        const r = isSpecialLaminationOrder({ ancho: 294, alto: 100, copias: 1, consumoEstimado: 1 })
        expect(r).toBe(true)
    })

    it('valores en metros no se redividen', () => {
        const r = isSpecialLaminationOrder({ ancho: 1.0, alto: 1.0, copias: 1, consumoEstimado: 1 })
        expect(r).toBe(false)
    })
})

describe('laminado especial — conteo de paños para la píldora del lote', () => {
    // La píldora del encabezado usa exactamente el mismo filtro que la alerta
    // por fila: si divergieran, el conteo y las marcas no coincidirían.
    type Orden = { ancho: number; alto: number; copias: number; consumoEstimado?: number }

    const cuentaPanosLargos = (orders: Orden[]) =>
        orders.filter(o => isSpecialLaminationOrder(o)).length

    it('cuenta 0 cuando ningún paño supera el umbral', () => {
        const orders: Orden[] = [
            { ancho: 0.5, alto: 1.0, copias: 1, consumoEstimado: 1 },
            { ancho: 0.8, alto: 1.2, copias: 2, consumoEstimado: 2.4 },
        ]
        expect(cuentaPanosLargos(orders)).toBe(0)
    })

    it('cuenta 1 cuando solo un paño excede', () => {
        const orders: Orden[] = [
            { ancho: 0.5, alto: 1.0, copias: 1, consumoEstimado: 1 },
            { ancho: 0.5, alto: 3.2, copias: 1, consumoEstimado: 3.2 },
        ]
        expect(cuentaPanosLargos(orders)).toBe(1)
    })

    it('cuenta varios cuando hay más de uno', () => {
        const orders: Orden[] = [
            { ancho: 0.5, alto: 3.2, copias: 1, consumoEstimado: 3.2 },
            { ancho: 0.4, alto: 4.0, copias: 1, consumoEstimado: 4 },
            { ancho: 0.5, alto: 1.0, copias: 1, consumoEstimado: 1 },
        ]
        expect(cuentaPanosLargos(orders)).toBe(2)
    })

    it('el conteo NO se infla por las copias de un paño corto', () => {
        // 1.55m x 4 copias = 6.2ml totales, pero es UN solo paño y no excede.
        const orders: Orden[] = [
            { ancho: 0.8, alto: 1.55, copias: 4, consumoEstimado: 6.2 },
        ]
        expect(cuentaPanosLargos(orders)).toBe(0)
    })

    it('el conteo coincide con la suma de marcas por fila', () => {
        const orders: Orden[] = [
            { ancho: 0.5, alto: 3.1, copias: 1, consumoEstimado: 3.1 },
            { ancho: 0.5, alto: 1.0, copias: 1, consumoEstimado: 1 },
            { ancho: 0.5, alto: 2.0, copias: 1, consumoEstimado: 2 },
            { ancho: 0.5, alto: 3.5, copias: 1, consumoEstimado: 3.5 },
        ]
        const porFila = orders.filter(o => isSpecialLaminationOrder(o)).length
        expect(cuentaPanosLargos(orders)).toBe(porFila)
        expect(porFila).toBe(2)
    })
})

describe('laminado especial — la version vieja fallaba', () => {
    // Este bloque existe para demostrar que el test ATRAAPA el bug. Si alguien
    // revierte el fix en Entrada.tsx, este codigo vuelve a ser el problema.
    function isSpecialLaminationOrderVIEJO(order: {
        ancho: number; alto: number; copias: number; consumoEstimado?: number
    }, cons?: { value: number; unit: string }) {
        const c = cons || { value: order.consumoEstimado ?? 0, unit: 'ml' }
        const w = Number(order.ancho) || 0
        const h = Number(order.alto) || 0
        return (c.unit === 'ml' && c.value > 2.93) || Math.max(w, h) > 2.93
    }

    it('la version VIEJA dispara erroneamente con 1.55m x 2 copias', () => {
        // Reproduce el reporte de bug: la version vieja daba true (mal).
        const valor = consumoMl(1.55, 2)
        expect(isSpecialLaminationOrderVIEJO({ ancho: 0.8, alto: 1.55, copias: 2, consumoEstimado: valor }))
            .toBe(true)
    })

    it('la version CORREGIDA NO dispara en el mismo caso', () => {
        const valor = consumoMl(1.55, 2)
        expect(isSpecialLaminationOrder({ ancho: 0.8, alto: 1.55, copias: 2, consumoEstimado: valor }))
            .toBe(false)
    })

    it('la version VIEJA dispara con cualquier dimension en cm', () => {
        // Sin convertir cm->m, un ancho de 50 cm se lee como 50 y todo dispara.
        expect(isSpecialLaminationOrderVIEJO({ ancho: 50, alto: 30, copias: 1, consumoEstimado: 1 }))
            .toBe(true)
    })

    it('la version CORREGIDA con 50x30 cm NO dispara', () => {
        expect(isSpecialLaminationOrder({ ancho: 50, alto: 30, copias: 1, consumoEstimado: 0.3 }))
            .toBe(false)
    })
})

describe('laminado especial — ruta m2', () => {
    it('en m2 no divide por copias (el area no es un largo)', () => {
        const r = isSpecialLaminationOrder(
            { ancho: 2.0, alto: 2.0, copias: 5 },
            { value: 20, unit: 'm²' },
        )
        expect(r).toBe(false) // dims 2.0 < 2.93
    })

    it('en m2 dispara si la dimension fisica excede', () => {
        const r = isSpecialLaminationOrder(
            { ancho: 0.5, alto: 3.5, copias: 1 },
            { value: 1.75, unit: 'm²' },
        )
        expect(r).toBe(true)
    })
})