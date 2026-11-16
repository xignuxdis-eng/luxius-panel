import { describe, it, expect } from 'vitest';
import { calculateCalcosMimakiQuote } from './calcosCalculator';

describe('calculateCalcosMimakiQuote (Mimaki CG-60SR 60cm)', () => {
    it('calcula disposición óptima, consumo en m² y costos de impresión + corte', () => {
        const res = calculateCalcosMimakiQuote({
            anchoCm: 7,
            altoCm: 7,
            cantidad: 100,
            gapMm: 3,
            usableWidthCm: 56,
            rollWidthCm: 60,
            precioImpresionM2: 12000,
            precioCorteM2: 4000,
        });

        expect(res.valido).toBe(true);
        expect(res.excedeAnchoMimaki).toBe(false);
        expect(res.calcosPorFila).toBeGreaterThanOrEqual(7);
        expect(res.filas).toBe(Math.ceil(100 / res.calcosPorFila));
        expect(res.largoNecesarioM).toBeGreaterThan(0);
        expect(res.areaRolloM2).toBeGreaterThan(0);
        expect(res.aprovechamientoPct).toBeGreaterThan(0);
        expect(res.aprovechamientoPct).toBeLessThanOrEqual(100);
        expect(res.total).toBe(res.costoImpresion + res.costoCorte);
        expect(Number.isFinite(res.precioUnitario)).toBe(true);
    });

    it('elige automáticamente rotación 90° cuando reduce el largo consumido en Mimaki', () => {
        // Calco de 25 x 8 cm en ancho útil 56 cm:
        // Normal (25cm ancho): entran 2 por fila -> 5 filas para 10 calcos -> ~41.5 cm largo
        // Rotado (8cm ancho): entran 6 por fila -> 2 filas para 10 calcos -> ~50.6 cm largo (aquí normal gana)
        // Probemos 12 x 25 cm:
        // Normal (12cm ancho): 4 por fila -> 3 filas (75.9 cm)
        // Rotado (25cm ancho): 2 por fila -> 5 filas (61.5 cm) -> rotado usa menos largo!
        const res = calculateCalcosMimakiQuote({
            anchoCm: 12,
            altoCm: 25,
            cantidad: 10,
            gapMm: 3,
            usableWidthCm: 56,
            rollWidthCm: 60,
            precioImpresionM2: 10000,
            precioCorteM2: 3000,
        });

        expect(res.valido).toBe(true);
        expect(res.rotado).toBe(true);
        expect(res.largoNecesarioM).toBeLessThan(0.7);
    });

    it('marca excedeAnchoMimaki si el calco no entra en ninguna orientación dentro del ancho útil', () => {
        const res = calculateCalcosMimakiQuote({
            anchoCm: 65,
            altoCm: 65,
            cantidad: 10,
            usableWidthCm: 56,
            rollWidthCm: 60,
            precioImpresionM2: 10000,
            precioCorteM2: 3000,
        });

        expect(res.valido).toBe(false);
        expect(res.excedeAnchoMimaki).toBe(true);
        expect(res.total).toBe(0);
    });
});
