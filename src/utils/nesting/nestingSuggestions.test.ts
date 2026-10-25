import { describe, it, expect } from 'vitest';
import {
    detectVehicularNestingSuggestions,
    isVehicularVinyl,
    type NestingCandidateItem
} from './nestingSuggestions';

describe('nestingSuggestions - Vinilo Vehicular y Ahorro de Laminado', () => {
    describe('isVehicularVinyl', () => {
        it('debe identificar códigos y descripciones de vinilo vehicular', () => {
            expect(isVehicularVinyl('VV')).toBe(true);
            expect(isVehicularVinyl('vv')).toBe(true);
            expect(isVehicularVinyl('VVP')).toBe(true);
            expect(isVehicularVinyl('Vinilo Vehicular')).toBe(true);
            expect(isVehicularVinyl('Vinilo Orajet 3651')).toBe(true);
            expect(isVehicularVinyl('Vinilo Fundición')).toBe(true);
            expect(isVehicularVinyl('Wrapping vehicular')).toBe(true);
            expect(isVehicularVinyl('Polimerico')).toBe(true);
        });

        it('debe descartar materiales no vehiculares', () => {
            expect(isVehicularVinyl('FL')).toBe(false);
            expect(isVehicularVinyl('BL')).toBe(false);
            expect(isVehicularVinyl('VBB')).toBe(false);
            expect(isVehicularVinyl('Lona Front Light')).toBe(false);
            expect(isVehicularVinyl('')).toBe(false);
            expect(isVehicularVinyl(null)).toBe(false);
            expect(isVehicularVinyl(undefined)).toBe(false);
        });
    });

    describe('detectVehicularNestingSuggestions', () => {
        it('debe retornar vacío si hay menos de 2 ítems', () => {
            const single: NestingCandidateItem[] = [
                { id: 1, ancho: 1.30, alto: 1.00, copias: 1, material: 'VV' }
            ];
            expect(detectVehicularNestingSuggestions(single)).toEqual([]);
            expect(detectVehicularNestingSuggestions([])).toEqual([]);
        });

        it('debe retornar vacío si las piezas no son de vinilo vehicular', () => {
            const items: NestingCandidateItem[] = [
                { id: 1, ancho: 1.30, alto: 1.00, copias: 1, material: 'FL' },
                { id: 2, ancho: 1.30, alto: 1.20, copias: 1, material: 'FL' }
            ];
            expect(detectVehicularNestingSuggestions(items)).toEqual([]);
        });

        it('debe sugerir anidado si 2 piezas de VV tienen el mismo ancho y suma <= 2.90m', () => {
            const items: NestingCandidateItem[] = [
                { id: 'a', fileName: 'lateral_izq.pdf', ancho: 1.30, alto: 1.00, copias: 1, material: 'VV' },
                { id: 'b', fileName: 'lateral_der.pdf', ancho: 1.30, alto: 1.40, copias: 1, material: 'VV' }
            ];
            const suggestions = detectVehicularNestingSuggestions(items);
            expect(suggestions.length).toBe(1);
            expect(suggestions[0].matchingWidth).toBe(1.30);
            expect(suggestions[0].totalLinearMeters).toBe(2.40);
            expect(suggestions[0].itemCount).toBe(2);
            expect(suggestions[0].itemIds).toEqual(['a', 'b']);
        });

        it('no debe sugerir si la suma de metros lineales supera 2.90m', () => {
            const items: NestingCandidateItem[] = [
                { id: 1, ancho: 1.30, alto: 1.50, copias: 1, material: 'VV' },
                { id: 2, ancho: 1.30, alto: 1.60, copias: 1, material: 'VV' }
            ];
            // 1.50 + 1.60 = 3.10m > 2.90m
            const suggestions = detectVehicularNestingSuggestions(items);
            expect(suggestions.length).toBe(0);
        });

        it('debe calcular correctamente las copias al sumar metros lineales', () => {
            const items: NestingCandidateItem[] = [
                { id: 1, ancho: 1.20, alto: 0.60, copias: 2, material: 'VV' }, // 1.20 ml
                { id: 2, ancho: 1.20, alto: 0.50, copias: 3, material: 'VV' }  // 1.50 ml
            ];
            // Total = 1.20 + 1.50 = 2.70 ml <= 2.90m
            const suggestions = detectVehicularNestingSuggestions(items);
            expect(suggestions.length).toBe(1);
            expect(suggestions[0].totalLinearMeters).toBe(2.70);
            expect(suggestions[0].totalCopies).toBe(5);
        });

        it('debe sugerir si una pieza rota para coincidir en ancho y suma <= 2.90m', () => {
            const items: NestingCandidateItem[] = [
                { id: 1, ancho: 1.30, alto: 0.80, copias: 1, material: 'VV' },
                { id: 2, ancho: 0.70, alto: 1.30, copias: 1, material: 'VV' } // rotada queda 1.30 ancho x 0.70 alto
            ];
            // Total = 0.80 + 0.70 = 1.50 ml <= 2.90m
            const suggestions = detectVehicularNestingSuggestions(items);
            expect(suggestions.length).toBe(1);
            expect(suggestions[0].matchingWidth).toBe(1.30);
            expect(suggestions[0].totalLinearMeters).toBe(1.50);
        });

        it('debe manejar dimensiones en centímetros (> 20)', () => {
            const items: NestingCandidateItem[] = [
                { id: 1, ancho: 130, alto: 100, copias: 1, material: 'VV' }, // 1.30m x 1.00m
                { id: 2, ancho: 130, alto: 120, copias: 1, material: 'VV' }  // 1.30m x 1.20m
            ];
            // Total = 1.00 + 1.20 = 2.20m <= 2.90m
            const suggestions = detectVehicularNestingSuggestions(items);
            expect(suggestions.length).toBe(1);
            expect(suggestions[0].matchingWidth).toBe(1.30);
            expect(suggestions[0].totalLinearMeters).toBe(2.20);
        });

        it('NO debe sugerir si las piezas miden 1.23 x 1.91m porque 1.91m no entra como ancho y el largo real es 3.82m > 2.90m', () => {
            const items: NestingCandidateItem[] = [
                { id: 'p1', ancho: 1.23, alto: 1.91, copias: 1, material: 'VV' },
                { id: 'p2', ancho: 1.23, alto: 1.91, copias: 1, material: 'VV' }
            ];
            // 1.91m no entra en la bobina de 1.52m como ancho; en sentido directo el largo es 1.91 + 1.91 = 3.82m > 2.90m
            const suggestions = detectVehicularNestingSuggestions(items);
            expect(suggestions.length).toBe(0);
        });

        it('NO debe considerar dimensiones > 1.515m como anchos válidos de bobina para vinilo vehicular', () => {
            const items: NestingCandidateItem[] = [
                { id: 'a', ancho: 1.80, alto: 1.00, copias: 1, material: 'VV' },
                { id: 'b', ancho: 1.80, alto: 1.20, copias: 1, material: 'VV' }
            ];
            // Ancho 1.80m excede la bobina máxima de 1.52m; rotadas miden 1.00m y 1.20m (distinto ancho)
            const suggestions = detectVehicularNestingSuggestions(items);
            expect(suggestions.length).toBe(0);
        });
    });
});
