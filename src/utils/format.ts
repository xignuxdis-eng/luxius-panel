export const formatDate = (date: string | Date, locale = 'es-AR'): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(d);
};

export const formatCurrency = (amount: number, currency = 'ARS', locale = 'es-AR'): string => {
    if (amount === null || amount === undefined) return '';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
    }).format(amount);
};