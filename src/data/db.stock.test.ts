import { describe, it, expect, beforeEach } from 'vitest'
import { saveMaterial, getMateriales, reconcilePendingStockDeductions } from './db'
import type { Material, Order } from '@/types'

describe('Persistencia de Materiales y Rollos/Bobinas', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('guarda un nuevo material de tipo rollo (ml) conservando sus bobinas y stock', () => {
        const nuevoRollo: Partial<Material> = {
            codigo: 'VIN-TEST-01',
            descripcion: 'Vinilo Impresion Test',
            calidad: 'ECO',
            tipo: 'Sustrato',
            tipoCobro: 'ml',
            bobinas: [
                { ancho: 1.05, precioML: 25000, stockActual: 50 },
                { ancho: 1.52, precioML: 35000, stockActual: 100 }
            ],
            habilitado: true
        }

        const saved = saveMaterial(nuevoRollo)
        expect(saved.id).toBeDefined()
        expect(saved.bobinas).toHaveLength(2)
        expect(saved.bobinas![0].ancho).toBe(1.05)
        expect(saved.bobinas![1].ancho).toBe(1.52)
        // El stock general debe sincronizarse con la suma de las bobinas (50 + 100 = 150)
        expect(saved.stockActual).toBe(150)

        // Verificar que persiste al recargar de memoria
        const mats = getMateriales()
        const found = mats.find(m => m.codigo === 'VIN-TEST-01')
        expect(found).toBeDefined()
        expect(found!.bobinas).toHaveLength(2)
        expect(found!.stockActual).toBe(150)
    })

    it('actualiza el stock de una bobina y recalcula el stock total del material', () => {
        const rollo = saveMaterial({
            codigo: 'VIN-BOB-02',
            descripcion: 'Vinilo Bobinas Test',
            tipoCobro: 'ml',
            bobinas: [
                { ancho: 1.37, precioML: 30000, stockActual: 30 },
                { ancho: 1.52, precioML: 34000, stockActual: 40 }
            ]
        })

        // Modificar una bobina
        const updated = saveMaterial({
            ...rollo,
            bobinas: [
                { ancho: 1.37, precioML: 30000, stockActual: 20 },
                { ancho: 1.52, precioML: 34000, stockActual: 40 }
            ]
        })

        expect(updated.stockActual).toBe(60)
        expect(updated.bobinas![0].stockActual).toBe(20)
    })
})

describe('Reconciliación y Protección de Deducción de Stock', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('no vuelve a descontar órdenes que ya fueron conciliadas o con stockDescontado: true', () => {
        // Crear material con 100m
        saveMaterial({
            id: 13,
            codigo: 'VV',
            descripcion: 'Vinilo Orajet 3651',
            tipoCobro: 'ml',
            stockActual: 100,
            bobinas: [{ ancho: 1.52, precioML: 34000, stockActual: 100 }]
        })

        const orderTest: Order = {
            id: 8888,
            ot: 'OT-8888',
            status: 'impreso',
            clientId: 1,
            clienteNombre: 'Cliente Test',
            material: 'VV',
            calidad: 'ECO',
            alto: 10,
            ancho: 1.5,
            copias: 1,
            subtotal: 1000,
            archivos: [],
            accesorios: [],
            laminado: false,
            bordado: false,
            panelizado: false,
            portabanners: 0,
            demasias: 0,
            envio: '',
            emergencia: false,
            fechaCreacion: '2026-10-31',
            fechaEntrega: '2026-11-01',
            observaciones: '',
            observaciones2: '',
            stockDescontado: false
        }

        // Primera reconciliación
        const res1 = reconcilePendingStockDeductions([orderTest])
        expect(res1.processedOrders).toBe(1)

        // El stock debe haber bajado
        const matsPost = getMateriales()
        const matPost = matsPost.find(m => m.codigo === 'VV')
        expect(matPost!.stockActual).toBeLessThan(100)
        const stockAfterFirst = matPost!.stockActual

        // Segunda reconciliación: NO debe volver a descontar
        const res2 = reconcilePendingStockDeductions([orderTest])
        expect(res2.processedOrders).toBe(0)

        const matsPost2 = getMateriales()
        const matPost2 = matsPost2.find(m => m.codigo === 'VV')
        expect(matPost2!.stockActual).toBe(stockAfterFirst)
    })
})
