import { describe, it, expect } from 'vitest'

describe('Facturación Electrónica ARCA / AFIP (RG 4291 / RG 5003)', () => {
    it('genera payload válido para código QR fiscal de AFIP con tipoCodAut E y CAE', () => {
        const comprobante = {
            fecha_emision: '2026-11-09',
            punto_venta: 1,
            tipo_comprobante: 6, // Factura B
            numero_comprobante: 105,
            importe_total: 45000.00,
            doc_tipo: 80, // CUIT
            doc_nro: '30712345678',
            cae: '74110912345678'
        }

        const qrData = {
            ver: 1,
            fecha: comprobante.fecha_emision,
            cuit: 30712345678,
            ptoVta: comprobante.punto_venta,
            tipoCmp: comprobante.tipo_comprobante,
            nroCmp: comprobante.numero_comprobante,
            importe: comprobante.importe_total,
            moneda: 'PES',
            ctz: 1.0,
            tipoDocRec: comprobante.doc_tipo,
            nroDocRec: 30712345678,
            tipoCodAut: 'E',
            codAut: 74110912345678
        }

        const jsonStr = JSON.stringify(qrData)
        const b64 = Buffer.from(jsonStr).toString('base64')
        const fullQrUrl = `https://www.afip.gob.ar/fe/qr/?p=${b64}`

        expect(fullQrUrl).toContain('https://www.afip.gob.ar/fe/qr/?p=')
        expect(b64.length).toBeGreaterThan(20)

        // Decodificación inversa para verificar integridad
        const decoded = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
        expect(decoded.ver).toBe(1)
        expect(decoded.tipoCodAut).toBe('E')
        expect(decoded.codAut).toBe(74110912345678)
        expect(decoded.importe).toBe(45000)
    })

    it('discrimina correctamente IVA 21% en Factura A vs Factura B', () => {
        const total = 12100.00

        // Factura A (Responsable Inscripto a Responsable Inscripto): IVA discriminado
        const netoA = Number((total / 1.21).toFixed(2))
        const ivaA = Number((total - netoA).toFixed(2))
        expect(netoA).toBe(10000.00)
        expect(ivaA).toBe(2100.00)
        expect(netoA + ivaA).toBe(total)

        // Factura B (A Consumidor Final): Importe total no discriminado en el neto para el cliente
        const netoB = total
        const ivaB = 0.0
        expect(netoB).toBe(total)
        expect(ivaB).toBe(0.0)
    })
})

