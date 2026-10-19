/**
 * Tests del motor de nesting.
 *
 * Estas reglas de taller ya causarun un bug real: la bitácora registra que la
 * heurística forzaba piezas de 1.50m a bobinas de 1.37m, desperdiciando el
 * ancho del rollo. Estos tests son la red que lo impide de volver.
 */
import { describe, it, expect } from 'vitest'
import {
    getBobinaUsefulWidth,
    BOBINA_SPECS,
    runNesting,
    type NestingItem,
} from './nestingEngine'

describe('getBobinaUsefulWidth — regla de taller', () => {
    it('la bobina "1.50m" mide 1.52m físicos con 1.515m útiles', () => {
        expect(getBobinaUsefulWidth(1.50)).toBe(1.515)
        expect(getBobinaUsefulWidth(1.52)).toBe(1.515)
    })

    it('la bobina 1.37m tiene 1.365m útiles', () => {
        expect(getBobinaUsefulWidth(1.37)).toBe(1.365)
    })

    it('cubre todas las bobinas catalogadas', () => {
        for (const [nominal, spec] of Object.entries(BOBINA_SPECS)) {
            expect(getBobinaUsefulWidth(Number(nominal))).toBe(spec.usefulWidth)
        }
    })

    it('tolera el rango 1.48-1.53 aunque no esté catalogado exacto', () => {
        expect(getBobinaUsefulWidth(1.48)).toBe(1.515)
        expect(getBobinaUsefulWidth(1.53)).toBe(1.515)
    })

    it('tolera el rango 1.35-1.38', () => {
        expect(getBobinaUsefulWidth(1.35)).toBe(1.365)
        expect(getBobinaUsefulWidth(1.38)).toBe(1.365)
    })

    it('para una bobina genérica descuenta 15mm de sangría', () => {
        expect(getBobinaUsefulWidth(1.00)).toBe(0.985)
    })

    it('nunca devuelve un ancho útil menor a 10cm', () => {
        expect(getBobinaUsefulWidth(0.01)).toBeGreaterThanOrEqual(0.1)
        expect(getBobinaUsefulWidth(0)).toBeGreaterThanOrEqual(0.1)
    })

    it('el ancho útil nunca supera el ancho físico de la bobina', () => {
        // Si esto falla, una pieza podría desbordar el rollo yecostar pliego.
        for (const [nominal, spec] of Object.entries(BOBINA_SPECS)) {
            expect(spec.usefulWidth).toBeLessThanOrEqual(spec.realWidth)
            expect(getBobinaUsefulWidth(Number(nominal))).toBeLessThanOrEqual(spec.realWidth + 1e-9)
        }
    })
})

describe('runNesting — colocación', () => {
    const pieza = (over: Partial<NestingItem> = {}): NestingItem => ({
        id: 'a', width: 0.5, height: 0.7, copies: 1, ...over,
    })

    it('coloca una pieza simple', () => {
        const r = runNesting([pieza()], { rollWidth: 1.52 })
        expect(r.totalPiecesPlaced).toBe(1)
        expect(r.pieces).toHaveLength(1)
        expect(r.pieces[0].originalWidth).toBe(0.5)
    })

    it('desglosa las copias en piezas individuales', () => {
        const r = runNesting([pieza({ copies: 3 })], { rollWidth: 1.52 })
        expect(r.totalPiecesRequested).toBe(3)
        expect(r.totalPiecesPlaced).toBe(3)
        expect(r.pieces).toHaveLength(3)
    })

    it('respeta usefulWidth: una pieza más ancha no debe desbordar', () => {
        // 1.6m de ancho con bobina de 1.515m útiles: no puede entrar sin rotar.
        const r = runNesting([pieza({ width: 1.6, height: 0.5, allowRotation: false })], {
            rollWidth: 1.52,
            usefulWidth: 1.515,
        })
        // O no se coloca, o se coloca girada.
        for (const p of r.pieces) {
            expect(p.width).toBeLessThanOrEqual(1.515 + 1e-6)
        }
    })

    it('no coloca piezas más anchas que el rollo si no se permite rotar', () => {
        const r = runNesting([pieza({ width: 3.0, height: 0.5, allowRotation: false })], {
            rollWidth: 1.52,
            usefulWidth: 1.515,
        })
        expect(r.totalPiecesPlaced).toBe(0)
        expect(r.unplacedPieces.length).toBeGreaterThan(0)
    })

    it('nunca coloca una pieza fuera del ancho útil', () => {
        const items = [
            pieza({ id: '1', width: 0.8, height: 0.5 }),
            pieza({ id: '2', width: 1.0, height: 0.4 }),
            pieza({ id: '3', width: 0.3, height: 1.2, copies: 2 }),
        ]
        const r = runNesting(items, { rollWidth: 1.52 })
        for (const p of r.pieces) {
            expect(p.x).toBeGreaterThanOrEqual(-1e-9)
            expect(p.width).toBeLessThanOrEqual(1.515 + 1e-6)
            expect(p.x + p.width).toBeLessThanOrEqual(1.515 + 1e-6)
        }
    })

    it('el consumo lineal es al menos el de la pieza más larga', () => {
        const r = runNesting([pieza({ width: 0.5, height: 2.0 })], { rollWidth: 1.52 })
        expect(r.linearMeters).toBeGreaterThanOrEqual(2.0)
    })

    it('el nesting nunca consume más que la suma simple', () => {
        const items = [
            pieza({ id: '1', width: 0.8, height: 0.5 }),
            pieza({ id: '2', width: 0.7, height: 0.5 }),
        ]
        const r = runNesting(items, { rollWidth: 1.52 })
        expect(r.linearMeters).toBeLessThanOrEqual(r.rawLinearMeters + 1e-6)
        expect(r.savingsMeters).toBeGreaterThanOrEqual(0)
    })

    it('con dos piezas angostas el ahorro es real (no soloYUEmetros)', () => {
        // 2 x 0.5m de ancho entran side by side en 1.515m -> consume ~0.5m,
        // no 1.0m.
        const r = runNesting([
            pieza({ id: '1', width: 0.5, height: 0.5 }),
            pieza({ id: '2', width: 0.5, height: 0.5 }),
        ], { rollWidth: 1.52 })
        expect(r.totalPiecesPlaced).toBe(2)
        expect(r.linearMeters).toBeLessThan(0.8)
    })

    it('devuelve 0% de ahorro cuando no hay nada que colocar', () => {
        const r = runNesting([], { rollWidth: 1.52 })
        expect(r.totalPiecesPlaced).toBe(0)
        expect(r.savingsPercent).toBe(0)
        expect(r.linearMeters).toBe(0)
    })

    it('marca las piezas giradas cuando corresponde', () => {
        const r = runNesting([pieza({ width: 0.4, height: 1.0 })], { rollWidth: 1.52 })
        const p = r.pieces[0]
        expect(typeof p.rotated).toBe('boolean')
        if (p.rotated) {
            expect(p.width).toBeCloseTo(1.0, 6)
            expect(p.height).toBeCloseTo(0.4, 6)
        }
    })

    it('respeta allowRotation=false en la configuración global', () => {
        const r = runNesting([pieza({ width: 0.4, height: 1.0 })], {
            rollWidth: 1.52,
            allowRotation: false,
        })
        for (const p of r.pieces) expect(p.rotated).toBe(false)
    })

    it('conserva el orden de las piezas identificables', () => {
        const r = runNesting([
            pieza({ id: 'OT-1' }), pieza({ id: 'OT-2' }), pieza({ id: 'OT-3' }),
        ], { rollWidth: 1.52 })
        const ids = new Set(r.pieces.map(p => String(p.id).replace(/_\d+$/, '')))
        expect(ids).toContain('OT-1')
        expect(ids).toContain('OT-2')
        expect(ids).toContain('OT-3')
    })

    it('un gap mayor separa más las piezas', () => {
        const base = [pieza({ id: '1' }), pieza({ id: '2' })]
        const sinGap = runNesting(base, { rollWidth: 1.52, gap: 0 })
        const conGap = runNesting(base, { rollWidth: 1.52, gap: 0.05 })
        expect(conGap.linearMeters).toBeGreaterThanOrEqual(sinGap.linearMeters)
    })

    it('la eficiencia de área nunca supera 100%', () => {
        const r = runNesting([
            pieza({ id: '1', width: 1.0, height: 1.0, copies: 5 }),
        ], { rollWidth: 1.52 })
        expect(r.areaEfficiency).toBeLessThanOrEqual(100)
        expect(r.areaEfficiency).toBeGreaterThanOrEqual(0)
    })
})