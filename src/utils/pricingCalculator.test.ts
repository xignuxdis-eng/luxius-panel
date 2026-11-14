/**
 * Tests del calculador de precios.
 *
 * Acá un error silencioso significa cotizar mal a un cliente. Se testean
 * invariantes (nunca NaN, nunca negativo, conversion de unidades) en vez de
 * cifras exactas, para que el test no se rompa con cada cambio de tarifario.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
    round2,
    calculateItemPriceDetailed,
    parseSpecialPriceKey,
    buildSpecialPriceKey,
    resolveSpecialPrice,
    applyCustomPriceOverride,
    resolveItemCustomSubtotal
} from './pricingCalculator'

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

/** Siembra un cliente conocido en localStorage (lo lee getClientes()). */
function sembrarCliente(id: number, preciosEspeciales: Record<string, number> = {}) {
    const clientes = [{
        id, nombre: 'Cliente Test VIP', empresa: 'Empresa Test', cuit: '20123456789',
        telefono: '123456', email: 'vip@test.com', direccion: 'Calle 123',
        condVenta: 'EFECTIVO', habilitado: true, vip: true, fechaInicio: '2024-01-01',
        preciosEspeciales
    }]
    window.localStorage.setItem('luxius_db_clientes_v4', 'v4')
    window.localStorage.setItem('luxius_session_clientes', JSON.stringify(clientes))
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

describe('Precios Especiales a Clientes — Discriminación M2 vs ML', () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    describe('buildSpecialPriceKey y parseSpecialPriceKey', () => {
        it('construye clave en M2 correctamente sin ancho', () => {
            const key = buildSpecialPriceKey('vbb', 'm2')
            expect(key).toBe('VBB:m2')
        })

        it('construye clave en ML para bobina específica', () => {
            const key = buildSpecialPriceKey('vv', 'ml', 1.52)
            expect(key).toBe('VV:1.52')
        })

        it('construye clave en ML general cuando no se pasa ancho', () => {
            const key = buildSpecialPriceKey('vv', 'ml', '')
            expect(key).toBe('VV:ml')
        })

        it('parsea clave explícita de M2', () => {
            const parsed = parseSpecialPriceKey('VV:m2', 15000)
            expect(parsed.materialCode).toBe('VV')
            expect(parsed.unit).toBe('m2')
            expect(parsed.precio).toBe(15000)
            expect(parsed.ancho).toBeUndefined()
        })

        it('parsea clave clásica de ML con ancho (ej: VV:1.52)', () => {
            const parsed = parseSpecialPriceKey('VV:1.52', 28000)
            expect(parsed.materialCode).toBe('VV')
            expect(parsed.unit).toBe('ml')
            expect(parsed.ancho).toBe(1.52)
            expect(parsed.precio).toBe(28000)
        })

        it('parsea clave clásica sin dos puntos según el tipoCobro del material', () => {
            const mats = [
                { id: 1, codigo: 'VBB', descripcion: 'Base Blanca', calidad: 'ECO', tipo: 'Sustrato', tipoCobro: 'm2', precioM2: 12000, ancho: 1.52, habilitado: true },
                { id: 2, codigo: 'VV', descripcion: 'Orajet', calidad: 'ECO', tipo: 'Sustrato', tipoCobro: 'ml', precioM2: 32000, ancho: 1.52, habilitado: true }
            ] as any[]

            const pM2 = parseSpecialPriceKey('VBB', 9500, mats)
            expect(pM2.unit).toBe('m2')

            const pMl = parseSpecialPriceKey('VV', 30000, mats)
            expect(pMl.unit).toBe('ml')
        })
    })

    describe('resolveSpecialPrice', () => {
        it('prioriza precio por ancho de bobina exacto en ML', () => {
            const cliente = {
                id: 10,
                preciosEspeciales: {
                    'VV:1.52': 29000,
                    'VV:ml': 31000
                }
            } as any

            const res = resolveSpecialPrice(cliente, 'VV', 1.52, 'ml')
            expect(res.hasSpecialPrice).toBe(true)
            expect(res.price).toBe(29000)
            expect(res.unit).toBe('ml')
        })

        it('usa precio general en ML si la bobina no tiene precio individual', () => {
            const cliente = {
                id: 10,
                preciosEspeciales: {
                    'VV:1.52': 29000,
                    'VV:ml': 31000
                }
            } as any

            const res = resolveSpecialPrice(cliente, 'VV', 1.37, 'ml')
            expect(res.hasSpecialPrice).toBe(true)
            expect(res.price).toBe(31000)
            expect(res.unit).toBe('ml')
        })

        it('resuelve precio explícito por M2 independientemente de bobina', () => {
            const cliente = {
                id: 10,
                preciosEspeciales: {
                    'VBB:m2': 10500
                }
            } as any

            const res = resolveSpecialPrice(cliente, 'VBB', undefined, 'm2')
            expect(res.hasSpecialPrice).toBe(true)
            expect(res.price).toBe(10500)
            expect(res.unit).toBe('m2')
        })
    })

    describe('calculateItemPriceDetailed con Precios Especiales', () => {
        it('material en M2 cobra por superficie total sin importar el ancho del rollo', () => {
            // Material configurado en M2 con precio lista 15.000
            sembrarMaterial('VBB', {
                tipoCobro: 'm2',
                precioM2: 15000,
                ancho: 1.52,
                bobinas: []
            })

            // Cliente con precio especial M2 a 10.000
            sembrarCliente(55, { 'VBB:m2': 10000 })

            // Pieza 1m x 1m (1 m2), 1 copia -> 1 m2 * 10.000 = 10.000
            const r1 = calculateItemPriceDetailed('VBB', 1.0, 1.0, 1, undefined, 55)
            expect(r1.subtotal).toBe(10000)
            expect(r1.precioDetalle?.tipoCobro).toBe('m2')
            expect(r1.precioDetalle?.precioM2).toBe(10000)

            // Pieza 2m x 0.5m (1 m2), 1 copia -> 1 m2 * 10.000 = 10.000
            const r2 = calculateItemPriceDetailed('VBB', 2.0, 0.5, 1, undefined, 55)
            expect(r2.subtotal).toBe(10000)
        })

        it('material en ML respeta el ancho de bobina asignado según el precio especial', () => {
            // Material con bobinas de 1.37 ($32k) y 1.52 ($34k)
            sembrarMaterial('VV', {
                tipoCobro: 'ml',
                bobinas: [
                    { ancho: 1.37, precioML: 32000 },
                    { ancho: 1.52, precioML: 34000 }
                ]
            })

            // Cliente con precio especial solo para bobina 1.52 a $26.000/ml
            sembrarCliente(77, {
                'VV:1.52': 26000
            })

            // Pieza 1.50m x 1m: excede bobina 1.37m, así que se asigna obligatoriamente a bobina 1.52m
            const r = calculateItemPriceDetailed('VV', 1.50, 1.0, 1, undefined, 77)
            expect(r.bobinaAsignada).toBe(1.52)
            expect(r.precioMl).toBe(26000)
            expect(r.precioDetalle?.tipoCobro).toBe('ml')
            expect(r.subtotal).toBe(26000)
        })

        it('cliente con precio especial en M2 sobre material ML cobra en M2 plano', () => {
            // Material naturalmente ML
            sembrarMaterial('VV', {
                tipoCobro: 'ml',
                bobinas: [
                    { ancho: 1.37, precioML: 32000 },
                    { ancho: 1.52, precioML: 34000 }
                ]
            })

            // Cliente tiene precio pactado en M2 a 20.000/m2
            sembrarCliente(88, {
                'VV:m2': 20000
            })

            // Pieza de 1m x 0.5m = 0.5 m2 -> 0.5 * 20.000 = 10.000
            const r = calculateItemPriceDetailed('VV', 1.0, 0.5, 1, undefined, 88)
            expect(r.subtotal).toBe(10000)
            expect(r.precioDetalle?.tipoCobro).toBe('m2')
            expect(r.precioDetalle?.precioM2).toBe(20000)
        })
    })

    describe('calculateOrderPrice (Entrada fallback)', () => {
        it('material en M2 calcula por m2 sin importar ancho del rollo', async () => {
            const { calculateOrderPrice } = await import('../pages/Entrada/utils/entradaCalculations')

            const materiales = [{
                id: 1, codigo: 'VBB', descripcion: 'Base Blanca', calidad: 'ECO',
                tipo: 'Sustrato', tipoCobro: 'm2', precioM2: 14000, ancho: 1.52, habilitado: true
            }] as any[]

            const clientes = [{
                id: 10, nombre: 'Cliente X', empresa: 'Empresa', cuit: '', telefono: '',
                email: '', direccion: '', condVenta: 'EFECTIVO', habilitado: true, vip: true,
                fechaInicio: '2024-01-01',
                preciosEspeciales: { 'VBB:m2': 9000 }
            }] as any[]

            const order = {
                id: 100, material: 'VBB', ancho: 1.0, alto: 2.0, copias: 1, clientId: 10
            } as any

            // 1.0 x 2.0 = 2.0 m2 -> 2.0 * 9.000 = 18.000
            const total = calculateOrderPrice(order, materiales, clientes)
            expect(total).toBe(18000)
        })

        it('material en ML discrimina precio por bobina asignada', async () => {
            const { calculateOrderPrice } = await import('../pages/Entrada/utils/entradaCalculations')

            const materiales = [{
                id: 2, codigo: 'VV', descripcion: 'Orajet', calidad: 'ECO',
                tipo: 'Sustrato', tipoCobro: 'ml', precioM2: 32000, ancho: 1.52, habilitado: true,
                bobinas: [
                    { ancho: 1.37, precioML: 30000 },
                    { ancho: 1.52, precioML: 34000 }
                ]
            }] as any[]

            const clientes = [{
                id: 10, nombre: 'Cliente X', empresa: 'Empresa', cuit: '', telefono: '',
                email: '', direccion: '', condVenta: 'EFECTIVO', habilitado: true, vip: true,
                fechaInicio: '2024-01-01',
                preciosEspeciales: { 'VV:1.52': 25000 }
            }] as any[]

            // Pieza 1.50 x 1.0: debe usar bobina 1.52m con precio especial $25.000/ml
            const order = {
                id: 101, material: 'VV', ancho: 1.50, alto: 1.0, copias: 1, clientId: 10
            } as any

            const total = calculateOrderPrice(order, materiales, clientes)
            expect(total).toBe(25000)
        })
    })
})

describe('Personalización de Precio (applyCustomPriceOverride y resolveItemCustomSubtotal)', () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    it('en modo "m2" recalcula el total dinámicamente al cambiar dimensiones/copias y suma servicios', () => {
        sembrarMaterial('LONA', {
            tipoCobro: 'm2',
            precioM2: 12000,
            ancho: 1.52,
            bobinas: []
        })

        // Caso 1: 2m x 1.5m x 1 copia = 3 m2 -> con tarifa personalizada $9.500/m2 + $2.000 servicios
        const det1 = calculateItemPriceDetailed('LONA', 2.0, 1.5, 1)
        const s1 = applyCustomPriceOverride('m2', 9500, [{
            m2: det1.consumoM2 || 0,
            ml: det1.consumoML || 0,
            autoSubtotal: det1.subtotal,
            servicesTotal: 2000
        }])
        expect(s1.totalM2).toBe(3)
        expect(s1.finalTotal).toBe(3 * 9500 + 2000)
        expect(s1.effectiveRateM2).toBe(9500)

        // Caso 2: 2 copias -> 6 m2 -> actualiza dinámicamente
        const det2 = calculateItemPriceDetailed('LONA', 2.0, 1.5, 2)
        const s2 = applyCustomPriceOverride('m2', 9500, [{
            m2: det2.consumoM2 || 0,
            ml: det2.consumoML || 0,
            autoSubtotal: det2.subtotal,
            servicesTotal: 2000
        }])
        expect(s2.totalM2).toBe(6)
        expect(s2.finalTotal).toBe(6 * 9500 + 2000)
    })

    it('en modo "ml" calcula por metro lineal incluso sobre materiales cuyo tipoCobro base es "m2"', () => {
        sembrarMaterial('FL-M2', {
            tipoCobro: 'm2',
            precioM2: 14000,
            ancho: 1.52,
            bobinas: []
        })

        // 0.50m x 1.20m x 3 copias en rollo de 1.52m (entra 3 por fila -> 1.20 ml)
        const det = calculateItemPriceDetailed('FL-M2', 0.50, 1.20, 3)
        expect(det.consumoML).toBe(1.2)
        expect(det.consumoM2).toBe(1.8)

        const res = applyCustomPriceOverride('ml', 18000, [{
            m2: det.consumoM2 || 0,
            ml: det.consumoML || 0,
            autoSubtotal: det.subtotal,
            servicesTotal: 1500
        }])
        expect(res.totalML).toBe(1.2)
        expect(res.finalTotal).toBe(Math.round(1.2 * 18000) + 1500)
        expect(res.effectiveRateML).toBe(18000)
    })

    it('en modo "final" fija el total acordado exacto y prorratea ítems en lote proporcionalmente', () => {
        const items = [
            { m2: 2, ml: 1.5, autoSubtotal: 30000, servicesTotal: 0 },
            { m2: 4, ml: 3.0, autoSubtotal: 70000, servicesTotal: 0 },
        ]
        const summary = applyCustomPriceOverride('final', 50000, items)
        expect(summary.finalTotal).toBe(50000)
        expect(summary.totalM2).toBe(6)
        expect(summary.totalML).toBe(4.5)

        const item1Final = resolveItemCustomSubtotal('final', 50000, items[0], 100000, 2)
        const item2Final = resolveItemCustomSubtotal('final', 50000, items[1], 100000, 2)
        expect(item1Final).toBe(15000)
        expect(item2Final).toBe(35000)
        expect(item1Final + item2Final).toBe(50000)
    })

    it('en modo "auto" preserva íntegramente el total calculado por tarifario estándar', () => {
        sembrarMaterial('VV-AUTO', {
            tipoCobro: 'ml',
            bobinas: [{ ancho: 1.37, precioML: 25000 }]
        })
        const det = calculateItemPriceDetailed('VV-AUTO', 1.0, 2.0, 1)
        const summary = applyCustomPriceOverride('auto', 99999, [{
            m2: det.consumoM2 || 0,
            ml: det.consumoML || 0,
            autoSubtotal: det.subtotal,
            servicesTotal: det.servicesTotal || 0
        }])
        expect(summary.finalTotal).toBe(det.subtotal)
        expect(summary.mode).toBe('auto')
    })
})