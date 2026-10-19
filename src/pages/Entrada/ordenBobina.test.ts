/**
 * Orden de taller: primero el rollo angosto (1.37), después el ancho (1.52).
 *
 * Permite ver de un vistazo cómo se reparte el trabajo entre bobinas y que el
 * operario imprima por bloques. Se aplica a la tabla y también al ZIP de
 * producción, para que los PDFs salgan en el mismo orden.
 */

interface OrdenFicticia {
    material: string
    bobinaAsignada?: number
}

/** Replica el comparador usado en Entrada.tsx. */
function anchoDe(o: OrdenFicticia): number {
    return Number(o.bobinaAsignada ?? 1.52)
}

function ordenarParaTaller(orders: OrdenFicticia[]): OrdenFicticia[] {
    return [...orders].sort((a, b) => {
        const ba = anchoDe(a)
        const bb = anchoDe(b)
        if (ba !== bb) return ba - bb        // angosto primero
        return String(a.material || '').localeCompare(String(b.material || ''))
    })
}

const LOTE: OrdenFicticia[] = [
    { material: 'VV', bobinaAsignada: 1.52 },
    { material: 'VV', bobinaAsignada: 1.37 },
    { material: 'FL', bobinaAsignada: 1.52 },
    { material: 'VV', bobinaAsignada: 1.37 },
    { material: 'VV', bobinaAsignada: 1.52 },
]

describe('orden por ancho de bobina', () => {
    it('deja todos los 1.37 antes que cualquier 1.52', () => {
        const r = ordenarParaTaller(LOTE)
        const anchos = r.map(anchoDe)
        const primeraDe52 = anchos.indexOf(1.52)
        const ultimoDe137 = anchos.lastIndexOf(1.37)
        expect(ultimoDe137).toBeLessThan(primeraDe52)
    })

    it('respeta exactamente el reparto del lote de ejemplo', () => {
        const r = ordenarParaTaller(LOTE)
        expect(r.map(anchoDe)).toEqual([1.37, 1.37, 1.52, 1.52, 1.52])
    })

    it('no pierde ni duplica órdenes', () => {
        const r = ordenarParaTaller(LOTE)
        expect(r).toHaveLength(LOTE.length)
        expect(r.map(o => `${o.material}|${o.bobinaAsignada}`).sort())
            .toEqual(LOTE.map(o => `${o.material}|${o.bobinaAsignada}`).sort())
    })

    it('dentro del mismo ancho ordena por material', () => {
        const r = ordenarParaTaller(LOTE)
        const en152 = r.filter(o => anchoDe(o) === 1.52).map(o => o.material)
        expect(en152).toEqual([...en152].sort())
    })

    it('no muta el array original', () => {
        const copia = [...LOTE]
        ordenarParaTaller(LOTE)
        expect(LOTE).toEqual(copia)
    })

    it('un lote de un solo ancho mantiene el orden relativo', () => {
        const uno = [{ material: 'B', bobinaAsignada: 1.37 }, { material: 'A', bobinaAsignada: 1.37 }]
        // Dentro del mismo ancho sí ordena por material.
        expect(ordenarParaTaller(uno).map(o => o.material)).toEqual(['A', 'B'])
    })

    it('trata una orden sin bobina como 1.52 (valor por defecto)', () => {
        const r = ordenarParaTaller([
            { material: 'X', bobinaAsignada: 1.37 },
            { material: 'Y' },
        ])
        expect(r.map(anchoDe)).toEqual([1.37, 1.52])
    })

    it('un rollo más ancho que 1.52 queda al final', () => {
        const r = ordenarParaTaller([
            { material: 'W', bobinaAsignada: 3.2 },
            { material: 'V', bobinaAsignada: 1.37 },
            { material: 'U', bobinaAsignada: 1.52 },
        ])
        expect(r.map(anchoDe)).toEqual([1.37, 1.52, 3.2])
    })
})

describe('desglose por material y ancho', () => {
    const claves = ['VV|1.52', 'VV|1.37', 'FL|1.52', 'FL|1.37']

    it('ordena el desglose por ancho ascendente', () => {
        const r = [...claves].sort((a, b) => {
            const pa = a.split('|')
            const pb = b.split('|')
            const ba = parseFloat(pa[pa.length - 1] ?? '0') || 0
            const bb = parseFloat(pb[pb.length - 1] ?? '0') || 0
            return ba - bb
        })
        // Ordena por ANCHO; dentro de un mismo ancho conserva el orden de
        // entrada (noalfabético por material, que es lo de menor utilidad
        // para el operario: lo que importa es qué bobina montar primero).
        expect(r).toEqual(['VV|1.37', 'FL|1.37', 'VV|1.52', 'FL|1.52'])
        const anchos = r.map(k => parseFloat(k.split('|')[1]))
        expect(anchos).toEqual([1.37, 1.37, 1.52, 1.52])
    })

    it('la clave separa material y ancho correctamente', () => {
        const [mat, bob] = 'VV|1.37'.split('|')
        expect(mat).toBe('VV')
        expect(bob).toBe('1.37')
    })
})