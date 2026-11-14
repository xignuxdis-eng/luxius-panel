export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/**
 * Parsea fechas provenientes del backend o locales.
 * Si un string ISO con hora no incluye sufijo de zona horaria (`Z` o `±HH:MM`),
 * se asume UTC (como serializa PostgreSQL/SQLAlchemy `TIMESTAMP WITHOUT TIME ZONE`).
 */
export function parseServerDate(input?: string | number | Date | null): Date | null {
    if (input === null || input === undefined || input === '') return null;
    if (input instanceof Date) {
        return Number.isNaN(input.getTime()) ? null : input;
    }
    if (typeof input === 'number') {
        const d = new Date(input);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    let raw = String(input).trim();
    if (!raw) return null;

    // Formato ISO con hora (YYYY-MM-DDTHH:mm... o YYYY-MM-DD HH:mm...) sin Z ni offset
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(raw)) {
        raw = raw.replace(' ', 'T');
        const hasTz = /[zZ]$/.test(raw) || /[+-]\d{2}:?\d{2}$/.test(raw);
        if (!hasTz) {
            raw += 'Z';
        }
    }

    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Formatea una hora siempre en zona horaria de Argentina (UTC-3, formato 24h).
 */
export function formatArgTime(
    input?: string | number | Date | null,
    options?: { showSeconds?: boolean; fallback?: string }
): string {
    const fallback = options?.fallback ?? '-';
    const d = parseServerDate(input);
    if (!d) return fallback;

    return d.toLocaleTimeString('es-AR', {
        timeZone: ARGENTINA_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        ...(options?.showSeconds ? { second: '2-digit' } : {}),
        hour12: false,
    });
}

/**
 * Formatea una fecha siempre en zona horaria de Argentina.
 */
export function formatArgDate(
    input?: string | number | Date | null,
    options?: Intl.DateTimeFormatOptions & { fallback?: string }
): string {
    const { fallback = '-', ...intlOptions } = options ?? {};
    const d = parseServerDate(input);
    if (!d) return fallback;

    const hasCustomFields = Boolean(
        intlOptions.year ||
        intlOptions.month ||
        intlOptions.day ||
        intlOptions.weekday ||
        intlOptions.dateStyle
    );

    return d.toLocaleDateString('es-AR', {
        ...(hasCustomFields ? {} : { day: '2-digit', month: '2-digit', year: 'numeric' }),
        ...intlOptions,
        timeZone: ARGENTINA_TIME_ZONE,
    });
}

/**
 * Formatea fecha y hora siempre en zona horaria de Argentina (formato 24h).
 */
export function formatArgDateTime(
    input?: string | number | Date | null,
    options?: { showSeconds?: boolean; shortYear?: boolean; fallback?: string }
): string {
    const fallback = options?.fallback ?? '-';
    const d = parseServerDate(input);
    if (!d) return fallback;

    return d.toLocaleString('es-AR', {
        timeZone: ARGENTINA_TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        year: options?.shortYear ? '2-digit' : 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...(options?.showSeconds ? { second: '2-digit' } : {}),
        hour12: false,
    });
}
