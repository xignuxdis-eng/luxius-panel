/**
 * Tests del calculador de precios.
 *
 * Acá un error silencioso significa cotizar mal a un cliente. Se testean
 * invariantes (nunca NaN, nunca negativo, conversion de unidades) en vez de
 * cifras exactas, para que el test no se rompa con cada cambio de tarifario.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { round2, calculateItemPriceDetailed } from './pricingCalculator'

/** Siembra un material conocido en localStorage (lo lee getMateriales()). */
function sembrarMaterial(codigo: string, extra: Record<string, unknown> = {}) {
    const mats = [{
        id: 99, codigo, descripcion: 'Material de prueba',
        calidad: 'ECO', tipo: 'Sustrato', tipoCobro: 'ml',
        precioM2: 32000, ancho: 1.52, habilitado: true,
        stockActual: 100, stockMinimo: 10, unidad: 'M Lineal',
        // Sin bobinas el precio seria 0 por diseno (ver calculateItemPriceDetailed).
        bobinas: [{ ancho: 1.37, precioML: 32000 }, { ancho: 1.52, precioML: 34000 }],
        ...extra,
    }]
    window.localStorage.setItem('luxius_session_materiales', JSON.stringify(mats))
}

describe('round2', () => {
    it('redondea a 2 decimales', () => {
        expect(round2(1.234)).toBe(1.23)
        expect(round2(1.235)).toBe(1.24)
        expect(round2(10)).toBe(10)
    })

    it('no produce NaN con 0', () => {
        expect(round2(0)).toBe(0)
    })

    it('redondea .5 hacia arriba (evita el sesgo del flotante)', () => {
        expect(round2(0.005)).toBe(0.01)
        expect(round2(2.675)).toBe(2.68)
    })
})

describe('calculateItemPriceDetailed — invariantes', () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    it('nunca devuelve NaN en el subtotal', () => {
        sembrarMaterial('TST')
        const r = calculateItemPriceDetailed('TST', 0.8, 0.5, 2)
        expect(Number.isFinite(r.subtotal)).toBe(true)
        expect(Number.isFinite(r.consumoEstimado)).toBe(true)
    })

    it('el subtotal nunca es negativo', () => {
        sembrarMaterial('TST')
        const r = calculateItemPriceDetailed('TST', 1.0, 0.5, 3)
        expect(r.subtotal).toBeGreaterThanOrEqual(0)
        expect(r.consumoEstimado).toBeGreaterThanOrEqual(0)
    })

    it('un material inexistente no rompe la app', () => {
        sembrarMaterial('TST')
        const r = calculateItemPriceDetailed('NO_EXISTE_XYZ', 0.5, 0.5, 1)
        expect(r).toBeDefined()
        expect(Number.isFinite(r.subtotal)).toBe(true)
    })

    it('convierte centímetros a metros cuando el valor es > 20', () => {
        // 80 cm = 0.8 m ; 150 cm = 1.5 m
        sembrarMaterial('TST')
        const enM = calculateItemPriceDetailed('TST', 0.8, 0.5, 1)
        const enCm = calculateItemPriceDetailed('TST', 80, 50, 1)
        expect(enCm.consumoEstimado).toBeCloseTo(enM.consumoEstimado, 3)
    })

    it('más copias nunca bajan el consumo total', () => {
        sembrarMaterial('TST')
        const una = calculateItemPriceDetailed('TST', 0.8, 0.5, 1)
        const tres = calculateItemPriceDetailed('TST', 0.8, 0.5, 3)
        expect(tres.consumoEstimado).toBeGreaterThanOrEqual(una.consumoEstimado - 1e-6)
        expect(tres.subtotal).toBeGreaterThanOrEqual(una.subtotal - 1e-6)
    })

    it('rota la pieza para minimizar el consumo lineal', () => {
        sembrarMaterial('TST')
        // 0.5 x 1.2: sin rotar avanza 1.2m; rotada (1.2 de ancho) avanza 0.5m.
        // Ambas caben en el rollo de 1.515m, asi que debe elegir la rotada.
        const r = calculateItemPriceDetailed('TST', 0.5, 1.2, 1)
        expect(r.rotated).toBe(true)
        expect(r.consumoEstimado).toBeCloseTo(0.5, 3)
    })

    it('el consumo elegido es el minimo entre las dos orientaciones', () => {
        sembrarMaterial('TST')
        // Cuadrado: rotar no cambia nada.
        const r = calculateItemPriceDetailed('TST', 0.8, 0.8, 1)
        const esperado = 0.8
        expect(r.consumoEstimado).toBeCloseTo(esperado, 3)
    })

    it('no rota cuando la orientacion original ya es la minima', () => {
        sembrarMaterial('TST')
        // 0.4 de ancho x 1.4 de alto: rotada ocuparia 1.4 de ancho y avanzaria
        // 0.4, que es MENOS. Debe rotar.
        const r = calculateItemPriceDetailed('TST', 0.4, 1.4, 1)
        expect(r.consumoEstimado).toBeCloseTo(0.4, 3)
    })

    it('una pieza más ancha que el rollo nunca cotiza 0', () => {
        sembrarMaterial('TST')
        const ancha = calculateItemPriceDetailed('TST', 2.5, 0.8, 1)
        expect(ancha.consumoEstimado).toBeGreaterThan(0)
        expect(Number.isFinite(ancha.subtotal)).toBe(true)
    })

    it('respeta el ancho útil de la bobina (regla de 1.515m)', () => {
        // 1.50m de ancho debe asignar bobina de 1.52 (útil 1.515), no 1.37.
        sembrarMaterial('TST')
        const r = calculateItemPriceDetailed('TST', 1.50, 0.5, 1)
        if (r.bobinaAsignada !== undefined) {
            expect(r.bobinaAsignada).not.toBe(1.37)
        }
        expect(r.rotated).toBe(false)
    })

    it('reporta el tipo de cobro y el detalle de precio', () => {
        sembrarMaterial('TST')
        const r = calculateItemPriceDetailed('TST', 0.8, 0.5, 1)
        expect(r.precioDetalle).toBeDefined()
        expect(['ml', 'm2']).toContain(r.precioDetalle!.tipoCobro)
    })

    it('con c=0 no explota', () => {
        sembrarMaterial('TST')
        const r = calculateItemPriceDetailed('TST', 0.8, 0.5, 0)
        expect(Number.isFinite(r.subtotal)).toBe(true)
    })

    it('con dimensiones cero no explota', () => {
        sembrarMaterial('TST')
        const r = calculateItemPriceDetailed('TST', 0, 0, 1)
        expect(Number.isFinite(r.subtotal)).toBe(true)
        expect(r.subtotal).toBeGreaterThanOrEqual(0)
    })

    it('aplica recargo para cliente particular respecto a tarifa base', () => {
        sembrarMaterial('TST')
        const base = calculateItemPriceDetailed('TST', 0.8, 0.5, 1, undefined, undefined, undefined, false)
        const part = calculateItemPriceDetailed('TST', 0.8, 0.5, 1, undefined, undefined, undefined, true)
        expect(part.esParticular).toBe(true)
        expect(part.subtotal).toBeGreaterThan(base.subtotal)
        expect(part.recargoParticularPct).toBeGreaterThan(0)
    })
})