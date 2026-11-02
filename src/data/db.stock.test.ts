import { describe, it, expect, beforeEach } from 'vitest'
import { saveMaterial, getMateriales, reconcilePendingStockDeductions } from './db'
import { evaluateOrderStock, enrichOrdersWithCurrentStock } from '@/utils/stockForecast'
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

describe('Actualización Reactiva de Órdenes según Stock de Materiales', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('marca stockWarning: true cuando el stock disponible es insuficiente', () => {
        const materialSinStock: Partial<Material> = {
            id: 99,
            codigo: 'LONA-FRONT',
            descripcion: 'Lona Front 13oz',
            tipoCobro: 'm2',
            stockActual: 0,
            habilitado: true
        }
        saveMaterial(materialSinStock)

        const ordenTest: Order = {
            id: 101,
            ot: 'OT-101',
            status: 'orden',
            clientId: 1,
            clienteNombre: 'Cliente 1',
            material: 'LONA-FRONT',
            calidad: 'ECO',
            alto: 2,
            ancho: 1,
            copias: 1,
            subtotal: 5000,
            archivos: [],
            accesorios: [],
            laminado: false,
            bordado: false,
            panelizado: false,
            portabanners: 0,
            demasias: 0,
            envio: '',
            emergencia: false,
            fechaCreacion: '2026-11-01',
            fechaEntrega: '2026-11-02',
            observaciones: '',
            observaciones2: '',
            stockDescontado: false,
            stockWarning: false
        }

        const mats = getMateriales()
        const evalRes = evaluateOrderStock(ordenTest, mats)
        expect(evalRes.hasStock).toBe(false)
        expect(evalRes.warningReason).toBe('Sin stock disponible')

        const [enriched] = enrichOrdersWithCurrentStock([ordenTest], mats)
        expect(enriched.stockWarning).toBe(true)
    })

    it('actualiza la orden a stockWarning: false automáticamente al cargar/agregar nuevo stock', () => {
        // Inicialmente con stock 0
        const mat = saveMaterial({
            id: 100,
            codigo: 'VIN-PROD',
            descripcion: 'Vinilo Produccion',
            tipoCobro: 'ml',
            stockActual: 0,
            bobinas: [{ ancho: 1.52, precioML: 10000, stockActual: 0 }],
            habilitado: true
        })

        const orden: Order = {
            id: 202,
            ot: 'OT-202',
            status: 'orden',
            clientId: 1,
            clienteNombre: 'Cliente 2',
            material: 'VIN-PROD',
            calidad: 'ECO',
            bobinaAsignada: 1.52,
            alto: 1.5,
            ancho: 1,
            copias: 1,
            subtotal: 10000,
            archivos: [],
            accesorios: [],
            laminado: false,
            bordado: false,
            panelizado: false,
            portabanners: 0,
            demasias: 0,
            envio: '',
            emergencia: false,
            fechaCreacion: '2026-11-01',
            fechaEntrega: '2026-11-02',
            observaciones: '',
            observaciones2: '',
            stockDescontado: false,
            stockWarning: true // venía con advertencia
        }

        // Antes de agregar stock
        const mats1 = getMateriales()
        const [ordenSinStock] = enrichOrdersWithCurrentStock([orden], mats1)
        expect(ordenSinStock.stockWarning).toBe(true)

        // El usuario agrega 50 metros de bobina al stock
        saveMaterial({
            ...mat,
            bobinas: [{ ancho: 1.52, precioML: 10000, stockActual: 50 }]
        })

        // Al recargar/sincronizar el listado de órdenes con el nuevo stock
        const mats2 = getMateriales()
        const [ordenConStock] = enrichOrdersWithCurrentStock([ordenSinStock], mats2)

        // ¡La orden se actualizó y la advertencia se apagó!
        expect(ordenConStock.stockWarning).toBe(false)
    })

    it('no marca stockWarning si la orden ya tiene stockDescontado: true', () => {
        const mats = getMateriales()
        const ordenDescontada: Order = {
            id: 303,
            ot: 'OT-303',
            status: 'impreso',
            clientId: 1,
            clienteNombre: 'Cliente 3',
            material: 'MATERIAL-INEXISTENTE',
            calidad: 'ECO',
            alto: 1,
            ancho: 1,
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
            fechaCreacion: '2026-11-01',
            fechaEntrega: '2026-11-02',
            observaciones: '',
            observaciones2: '',
            stockDescontado: true,
            stockWarning: true
        }

        const [enriched] = enrichOrdersWithCurrentStock([ordenDescontada], mats)
        expect(enriched.stockWarning).toBe(false)
    })
})
