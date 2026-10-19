import { describe, it, expect } from 'vitest'
import {
    resolveMaterialCode,
    resolveOrderBobina,
    isOrderExceedingThreshold,
    getBatchOrderFolderPath,
    getUniqueZipFileName,
} from './orderFileDownloader'

describe('orderFileDownloader - resolución de carpetas y empaquetado de lotes', () => {
    describe('resolveMaterialCode', () => {
        it('resuelve código de material estándar', () => {
            expect(resolveMaterialCode({ material: 'VV' })).toBe('VV')
        })

        it('fallback a MAT o sanitizado si no hay material', () => {
            expect(resolveMaterialCode({})).toBe('MAT')
            expect(resolveMaterialCode({ material: '' })).toBe('MAT')
        })
    })

    describe('resolveOrderBobina', () => {
        it('usa bobinaAsignada si está presente', () => {
            expect(resolveOrderBobina({ bobinaAsignada: 1.37 })).toBe(1.37)
            expect(resolveOrderBobina({ bobinaAsignada: 1.52 })).toBe(1.52)
        })

        it('usa precioDetalle.bobinaAncho o bobinaUsada si no hay bobinaAsignada directa', () => {
            expect(resolveOrderBobina({ precioDetalle: { bobinaAncho: 1.37 } as any })).toBe(1.37)
            expect(resolveOrderBobina({ precioDetalle: { bobinaUsada: 1.52 } as any })).toBe(1.52)
        })

        it('asigna bobina estándar para vinilos (VV / VVP) según dimensiones', () => {
            // Ancho que cabe en 1.37 (ancho útil <= 1.365)
            expect(resolveOrderBobina({ material: 'VV', ancho: 1.0, alto: 1.0 })).toBe(1.37)
            // Pieza más ancha que 1.365
            expect(resolveOrderBobina({ material: 'VV', ancho: 1.45, alto: 1.0 })).toBe(1.52)
        })

        it('retorna null para materiales sin bobina', () => {
            expect(resolveOrderBobina({ material: 'POLYFAN' })).toBeNull()
        })
    })

    describe('isOrderExceedingThreshold (> 2.93m)', () => {
        it('detecta paño individual mayor a 2.93m por ancho o alto', () => {
            expect(isOrderExceedingThreshold({ ancho: 1.0, alto: 3.1, copias: 1 })).toBe(true)
            expect(isOrderExceedingThreshold({ ancho: 3.2, alto: 1.0, copias: 1 })).toBe(true)
        })

        it('convierte cm a m correctamente (ej. 300cm = 3.00m)', () => {
            expect(isOrderExceedingThreshold({ ancho: 100, alto: 300, copias: 1 })).toBe(true)
            expect(isOrderExceedingThreshold({ ancho: 100, alto: 200, copias: 1 })).toBe(false)
        })

        it('respeta el umbral exacto de 2.93m', () => {
            expect(isOrderExceedingThreshold({ ancho: 1.0, alto: 2.93, copias: 1 })).toBe(false)
            expect(isOrderExceedingThreshold({ ancho: 1.0, alto: 2.94, copias: 1 })).toBe(true)
        })

        it('NO dispara si el consumo total supera 2.93m debido a múltiples copias de paños cortos', () => {
            // 2 copias de 1.55m = 3.10ml total, pero cada paño mide 1.55m <= 2.93m
            expect(isOrderExceedingThreshold({ ancho: 0.8, alto: 1.55, copias: 2, consumoEstimado: 3.10 })).toBe(false)
        })

        it('SÍ dispara si el paño individual supera 2.93m aun teniendo múltiples copias', () => {
            // 3 copias de 3.00m
            expect(isOrderExceedingThreshold({ ancho: 0.8, alto: 3.0, copias: 3, consumoEstimado: 9.0 })).toBe(true)
        })
    })

    describe('getBatchOrderFolderPath', () => {
        it('crea carpeta [CodigoMaterial] [Ancho] para orden normal', () => {
            const folder = getBatchOrderFolderPath({
                material: 'VV',
                bobinaAsignada: 1.52,
                ancho: 1.4,
                alto: 2.0,
                copias: 1,
            })
            expect(folder).toBe('VV 1.52')
        })

        it('crea subcarpeta "Mayores a 2.93m" si el archivo supera los 2.93m', () => {
            const folder = getBatchOrderFolderPath({
                material: 'VV',
                bobinaAsignada: 1.52,
                ancho: 1.4,
                alto: 3.5,
                copias: 1,
            })
            expect(folder).toBe('VV 1.52/Mayores a 2.93m')
        })

        it('aplica correctamente a bobina 1.37 con archivo > 2.93m', () => {
            const folder = getBatchOrderFolderPath({
                material: 'VV',
                bobinaAsignada: 1.37,
                ancho: 1.0,
                alto: 3.1,
                copias: 1,
            })
            expect(folder).toBe('VV 1.37/Mayores a 2.93m')
        })

        it('aplica a materiales sin bobina (rígidos/placas)', () => {
            const normal = getBatchOrderFolderPath({
                material: 'POLYFAN',
                ancho: 1.0,
                alto: 1.0,
                copias: 1,
            })
            expect(normal).toBe('POLYFAN')

            const largo = getBatchOrderFolderPath({
                material: 'POLYFAN',
                ancho: 1.0,
                alto: 3.5,
                copias: 1,
            })
            expect(largo).toBe('POLYFAN/Mayores a 2.93m')
        })
    })

    describe('getUniqueZipFileName', () => {
        it('mantiene la ruta si es única', () => {
            const existing = new Set<string>()
            const r = getUniqueZipFileName(existing, 'VV 1.52/OT-100_x1.pdf')
            expect(r).toBe('VV 1.52/OT-100_x1.pdf')
            expect(existing.has('vv 1.52/ot-100_x1.pdf')).toBe(true)
        })

        it('desambigua colisiones dentro de la misma carpeta agregando (2)', () => {
            const existing = new Set<string>(['vv 1.52/ot-100_x1.pdf'])
            const r = getUniqueZipFileName(existing, 'VV 1.52/OT-100_x1.pdf')
            expect(r).toBe('VV 1.52/OT-100_x1 (2).pdf')
            expect(existing.has('vv 1.52/ot-100_x1 (2).pdf')).toBe(true)
        })

        it('desambigua colisiones dentro de la subcarpeta Mayores a 2.93m', () => {
            const existing = new Set<string>(['vv 1.52/mayores a 2.93m/ot-100_x1.pdf'])
            const r = getUniqueZipFileName(existing, 'VV 1.52/Mayores a 2.93m/OT-100_x1.pdf')
            expect(r).toBe('VV 1.52/Mayores a 2.93m/OT-100_x1 (2).pdf')
        })

        it('no colisiona entre carpetas distintas que tengan el mismo nombre de archivo', () => {
            const existing = new Set<string>(['vv 1.37/ot-100_x1.pdf'])
            const r = getUniqueZipFileName(existing, 'VV 1.52/OT-100_x1.pdf')
            expect(r).toBe('VV 1.52/OT-100_x1.pdf')
        })
    })
})
