import { describe, it, expect } from 'vitest'
import { formatOTNumber, extractOTRaw, cleanOriginalFilename } from './orderNumber'

describe('orderNumber utils - Formateo canónico y prevención de redundancia', () => {
    describe('formatOTNumber', () => {
        it('normaliza strings con doble prefijo OT-OT- a un único OT-', () => {
            expect(formatOTNumber('OT-OT-FDC3D915')).toBe('OT-FDC3D915')
            expect(formatOTNumber('OT-OT-OT-1234')).toBe('OT-1234')
        })

        it('normaliza prefijos con espacios como "OT 5521" o "OT - 5521"', () => {
            expect(formatOTNumber('OT 5521')).toBe('OT-5521')
            expect(formatOTNumber('OT - 5521')).toBe('OT-5521')
            expect(formatOTNumber('ot-5521')).toBe('OT-5521')
            expect(formatOTNumber('  ot -  OT - 987 ')).toBe('OT-987')
        })

        it('antepone OT- si solo viene el número o ID puro', () => {
            expect(formatOTNumber('5521')).toBe('OT-5521')
            expect(formatOTNumber(1234)).toBe('OT-1234')
            expect(formatOTNumber('FDC3D915')).toBe('OT-FDC3D915')
        })

        it('mantiene intacto un código ya canónico', () => {
            expect(formatOTNumber('OT-FDC3D915')).toBe('OT-FDC3D915')
            expect(formatOTNumber('OT-99')).toBe('OT-99')
        })

        it('gestiona valores vacíos o nulos sin romper', () => {
            expect(formatOTNumber(null)).toBe('OT-0')
            expect(formatOTNumber(undefined)).toBe('OT-0')
            expect(formatOTNumber('')).toBe('OT-0')
            expect(formatOTNumber('   ')).toBe('OT-0')
            expect(formatOTNumber('OT-')).toBe('OT-0')
        })
    })

    describe('extractOTRaw', () => {
        it('extrae el identificador puro sin el prefijo OT-', () => {
            expect(extractOTRaw('OT-OT-FDC3D915')).toBe('FDC3D915')
            expect(extractOTRaw('OT-1234')).toBe('1234')
            expect(extractOTRaw('1234')).toBe('1234')
            expect(extractOTRaw(99)).toBe('99')
        })

        it('fallback seguro en null/vacío', () => {
            expect(extractOTRaw(null)).toBe('0')
            expect(extractOTRaw('')).toBe('0')
        })
    })

    describe('cleanOriginalFilename', () => {
        it('remueve el prefijo redundante de OT cuando el archivo ya lo incluía', () => {
            expect(cleanOriginalFilename('OT 1234 Banner.jpg', 'OT-1234')).toBe('Banner.jpg')
            expect(cleanOriginalFilename('OT-1234-Lona.pdf', 'OT-1234')).toBe('Lona.pdf')
            expect(cleanOriginalFilename('OT-OT-999 Foto.tif', 'OT-999')).toBe('Foto.tif')
        })

        it('extrae la parte derecha si el archivo ya pasó por ensamblado con "---"', () => {
            expect(cleanOriginalFilename('OT-1234_x1_LONA --- Cartel.png', 'OT-1234')).toBe('Cartel.png')
            expect(cleanOriginalFilename('OT-55_x2_VV_bob137 --- OT 55 Cartel.png', 'OT-55')).toBe('Cartel.png')
        })

        it('preserva el nombre original si no tiene prefijo redundante', () => {
            expect(cleanOriginalFilename('Afiche_Campaña.png', 'OT-1234')).toBe('Afiche_Campaña.png')
        })
    })
})

