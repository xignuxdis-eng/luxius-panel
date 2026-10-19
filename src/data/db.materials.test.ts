/**
 * Tests de caracterización de `deduplicateMaterials`.
 *
 * Esta función decide qué material sobrevive cuando hay duplicados, y en el
 * camino decide el stock real. Un error acá no rompe la app: cobra de más o
 * de menos. La bitácora registra que ya se corrigió un bug de duplicados en
 * el modal de pedidos, y esta función es parte de esa defensa.
 *
 * Reglas que se fijan aquí:
 *  - La clave de deduplicación es el `codigo` (normalizado), con fallback a
 *    `descripcion` normalizada.
 *  - Se conserva el que tenga `precioM2 > 0`.
 *  - Se prefiere el ID "oficial" (< 100000) sobre los altos.
 *  - El stock de los duplicados se SUMA.
 *  - El `stockMinimo` resultante es el MAYOR de los dos.
 *  - `habilitado` es la conjunción: si alguno está deshabilitado, queda deshabilitado.
 */
import { describe, it, expect } from 'vitest'
import { deduplicateMaterials } from './db'
import type { Material } from '@/types'

const mat = (over: Partial<Material> & { id: number; codigo: string }): Material => ({
    descripcion: over.codigo,
    calidad: 'ECO',
    tipo: 'Sustrato',
    precioM2: 10000,
    ancho: 1.52,
    habilitado: true,
    stockActual: 0,
    stockMinimo: 0,
    ...over,
} as Material)

describe('deduplicateMaterials — entradas vacías', () => {
    it('array vacío devuelve vacío', () => {
        expect(deduplicateMaterials([])).toEqual([])
    })

    it('entrada no-array devuelve vacío (no rompe)', () => {
        expect(deduplicateMaterials(null as unknown as Material[])).toEqual([])
        expect(deduplicateMaterials(undefined as unknown as Material[])).toEqual([])
    })
})

describe('deduplicateMaterials — sin duplicados', () => {
    it('un solo material pasa intacto', () => {
        const r = deduplicateMaterials([mat({ id: 1, codigo: 'VV' })])
        expect(r).toHaveLength(1)
        expect(r[0].codigo).toBe('VV')
    })

    it('materiales distintos se conservan todos', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'A' }),
            mat({ id: 2, codigo: 'B' }),
            mat({ id: 3, codigo: 'C' }),
        ])
        expect(r).toHaveLength(3)
    })
})

describe('deduplicateMaterials — detección de duplicados', () => {
    it('detecta por codigo ignorando mayúsculas', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'vv' }),
            mat({ id: 2, codigo: 'VV' }),
        ])
        expect(r).toHaveLength(1)
    })

    it('detecta por codigo ignorando espacios', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: ' VV ' }),
            mat({ id: 2, codigo: 'VV' }),
        ])
        expect(r).toHaveLength(1)
    })

    it('usa descripcion como clave secundaria si no hay codigo', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: '', descripcion: 'Lona Front Light' }),
            mat({ id: 2, codigo: '', descripcion: 'lona front light' }),
        ])
        expect(r).toHaveLength(1)
    })

    it('CAE a descripcion cuando el codigo no coincide: fusiona igual', () => {
        // Comportamiento actual y algo contraintuitivo: si el codigo no
        // matchea, la función NO da por buena la diferencia y reintenta por
        // descripcion. Dos materiales con codigos distintos pero la misma
        // descripcion terminan fusionados (y con el stock summed).
        // Razon probable: codigos viejos que se migraron con otro código para
        // el mismo producto. Si algún día se decide que son productos
        // distintos, hay que sacar este fallback y actualizar el test.
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'A', descripcion: 'Lona', stockActual: 10 }),
            mat({ id: 2, codigo: 'B', descripcion: 'Lona', stockActual: 15 }),
        ])
        expect(r).toHaveLength(1)
        expect(r[0].stockActual).toBe(25)
    })

    it('NO deduplica si ni codigo ni descripcion coinciden', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'A', descripcion: 'Lona' }),
            mat({ id: 2, codigo: 'B', descripcion: 'Vinilo' }),
        ])
        expect(r).toHaveLength(2)
    })

    it('descarta entradas nulas sin romper', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'A' }),
            null as unknown as Material,
            mat({ id: 2, codigo: 'B' }),
        ])
        expect(r).toHaveLength(2)
    })
})

describe('deduplicateMaterials — stock (lo que más cuesta plata si se rompe)', () => {
    it('SUMA el stock de los duplicados', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'VV', stockActual: 30 }),
            mat({ id: 2, codigo: 'VV', stockActual: 45 }),
        ])
        expect(r).toHaveLength(1)
        expect(r[0].stockActual).toBe(75)
    })

    it('suma stock con más de dos duplicados', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'VV', stockActual: 10 }),
            mat({ id: 2, codigo: 'VV', stockActual: 20 }),
            mat({ id: 3, codigo: 'VV', stockActual: 30 }),
        ])
        expect(r).toHaveLength(1)
        expect(r[0].stockActual).toBe(60)
    })

    it('toma el stockMinimo MÁS ALTO como umbral de alerta', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'VV', stockMinimo: 5 }),
            mat({ id: 2, codigo: 'VV', stockMinimo: 25 }),
        ])
        expect(r[0].stockMinimo).toBe(25)
    })

    it('trata stock ausente como 0 (no como NaN)', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'VV', stockActual: 10 }),
            mat({ id: 2, codigo: 'VV', stockActual: undefined as unknown as number }),
        ])
        expect(r[0].stockActual).toBe(10)
    })
})

describe('deduplicateMaterials — desempate de precio e ID', () => {
    it('conserva el material con precio > 0', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'VV', precioM2: 0 }),
            mat({ id: 2, codigo: 'VV', precioM2: 32000 }),
        ])
        expect(r[0].precioM2).toBe(32000)
    })

    it('no pierde el precio si el winning lo tiene en 0', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'VV', precioM2: 0 }),
            mat({ id: 2, codigo: 'VV', precioM2: 0 }),
        ])
        expect(r[0].precioM2).toBe(0)
    })

    it('prefiere el ID oficial (< 100000) sobre el alto', () => {
        const r = deduplicateMaterials([
            mat({ id: 200001, codigo: 'VV' }),
            mat({ id: 13, codigo: 'VV' }),
        ])
        expect(r[0].id).toBe(13)
    })

    it('mantiene un ID alto si ambos son altos', () => {
        const r = deduplicateMaterials([
            mat({ id: 200001, codigo: 'VV' }),
            mat({ id: 200002, codigo: 'VV' }),
        ])
        expect(Number.isFinite(r[0].id)).toBe(true)
    })
})

describe('deduplicateMaterials — estado habilitado', () => {
    it('resulta deshabilitado si CUALQUIER duplicado está deshabilitado', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'VV', habilitado: true }),
            mat({ id: 2, codigo: 'VV', habilitado: false }),
        ])
        expect(r[0].habilitado).toBe(false)
    })

    it('queda habilitado si todos están habilitados', () => {
        const r = deduplicateMaterials([
            mat({ id: 1, codigo: 'VV', habilitado: true }),
            mat({ id: 2, codigo: 'VV', habilitado: true }),
        ])
        expect(r[0].habilitado).toBe(true)
    })
})

describe('deduplicateMaterials — no muta la entrada', () => {
    it('no modifica los objetos originales', () => {
        const original = mat({ id: 1, codigo: 'VV', stockActual: 10 })
        const copia = { ...original }
        deduplicateMaterials([original, mat({ id: 2, codigo: 'VV', stockActual: 5 })])
        expect(original).toEqual(copia)
        expect(original.stockActual).toBe(10)
    })

    it('siempre devuelve un array', () => {
        const r = deduplicateMaterials([mat({ id: 1, codigo: 'A' })])
        expect(Array.isArray(r)).toBe(true)
    })

    it('es idempotente: deduplicar dos veces da el mismo stock', () => {
        const lista = [
            mat({ id: 1, codigo: 'VV', stockActual: 10 }),
            mat({ id: 2, codigo: 'VV', stockActual: 20 }),
        ]
        const una = deduplicateMaterials(lista)
        const dos = deduplicateMaterials(una)
        expect(dos[0].stockActual).toBe(una[0].stockActual)
    })
})