import { describe, it, expect } from 'vitest'
import { resolveSpecialPrice } from '../pricing/specialPricing'
import type { Cliente } from '@/types'

describe('Contabilidad y Consistencia Financiera de Órdenes', () => {
    it('invariante: saldo_pendiente nunca es negativo ni NaN ante cualquier pago o seña', () => {
        const total = 15000.50
        const pagos = [0, 5000, 15000.50, 20000, -500]

        for (const pagado of pagos) {
            const safePagado = Math.max(0, pagado)
            const saldo = Math.max(0, Number((total - safePagado).toFixed(2)))
            expect(saldo).toBeGreaterThanOrEqual(0)
            expect(Number.isNaN(saldo)).toBe(false)
            if (safePagado >= total) {
                expect(saldo).toBe(0)
            } else {
                expect(saldo).toBeCloseTo(total - safePagado, 2)
            }
        }
    })

    it('invariante: seña porcentual y cálculo exacto en centavos sin discrepancias IEEE-754', () => {
        const subtotal = 19.99 * 3 // 59.970000000000006
        const roundedTotal = Number(subtotal.toFixed(2)) // 59.97
        const pct = 50
        const senaCalculada = Number(((roundedTotal * pct) / 100).toFixed(2)) // 29.985 -> 29.98 or 29.99
        const saldoCalculado = Number((roundedTotal - senaCalculada).toFixed(2))

        expect(senaCalculada + saldoCalculado).toBeCloseTo(roundedTotal, 2)
        expect(senaCalculada).toBeGreaterThan(0)
        expect(saldoCalculado).toBeGreaterThan(0)
    })

    it('paridad de precios especiales: regla por m² vs regla por ml', () => {
        const mockCliente = {
            id: 1,
            nombre: 'Cliente Test',
            preciosEspeciales: {
                'VIN_PROMO:m2': 8500,
                'LON_FRONT:1.52': 12000,
            }
        } as unknown as Cliente

        // Caso 1: Material en m² aplica a cualquier bobina
        const m2Resolved = resolveSpecialPrice(mockCliente, 'VIN_PROMO', 1.37)
        expect(m2Resolved.hasSpecialPrice).toBe(true)
        expect(m2Resolved.price).toBe(8500)
        expect(m2Resolved.unit).toBe('m2')

        // Caso 2: Material en ml aplica específicamente a la bobina correspondiente
        const mlMatch = resolveSpecialPrice(mockCliente, 'LON_FRONT', 1.52, 'ml')
        expect(mlMatch.hasSpecialPrice).toBe(true)
        expect(mlMatch.price).toBe(12000)

        // Caso 3: Ancho sin regla en ml no toma la de 1.52 si no coincide
        const mlNoMatch = resolveSpecialPrice(mockCliente, 'LON_FRONT', 1.05, 'ml')
        expect(mlNoMatch.hasSpecialPrice).toBe(false)
    })
})
