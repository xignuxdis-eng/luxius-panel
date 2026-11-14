import { describe, it, expect } from 'vitest';
import {
    ARGENTINA_TIME_ZONE,
    parseServerDate,
    formatArgTime,
    formatArgDate,
    formatArgDateTime,
} from './dateTime';

describe('dateTime (hora fija de Argentina America/Argentina/Buenos_Aires)', () => {
    it('usa la zona horaria oficial de Argentina', () => {
        expect(ARGENTINA_TIME_ZONE).toBe('America/Argentina/Buenos_Aires');
    });

    it('interpreta strings ISO naive del backend como UTC y los convierte a hora Argentina (-03:00)', () => {
        // 22:30 UTC === 19:30 en Argentina (UTC-3)
        expect(formatArgTime('2026-11-14T22:30:00')).toBe('19:30');
        expect(formatArgTime('2026-11-14 22:30:00')).toBe('19:30');
        expect(formatArgTime('2026-11-14T22:30:00Z')).toBe('19:30');
        expect(formatArgTime('2026-11-14T22:30:00+00:00')).toBe('19:30');
    });

    it('respeta offsets explícitos distintos de UTC (ej. -03:00 desde orders.py)', () => {
        expect(formatArgTime('2026-11-14T19:30:00-03:00')).toBe('19:30');
        expect(formatArgDateTime('2026-11-15T01:15:00Z')).toBe('14/11/2026, 22:15');
    });

    it('maneja valores vacíos o inválidos devolviendo el fallback', () => {
        expect(parseServerDate(null)).toBeNull();
        expect(parseServerDate('')).toBeNull();
        expect(parseServerDate('fecha-invalida')).toBeNull();
        expect(formatArgTime(undefined)).toBe('-');
        expect(formatArgDate(null, { fallback: '--' })).toBe('--');
    });

    it('formatea fechas en zona horaria de Argentina cuando en UTC ya cambió el día', () => {
        // 2026-11-15 01:00 UTC es todavía 14/11/2026 22:00 en Argentina
        expect(formatArgDate('2026-11-15T01:00:00Z', { day: '2-digit', month: '2-digit' })).toBe('14/11');
    });
});
