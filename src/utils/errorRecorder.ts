/**
 * LuXius Error & Diagnostic Recorder
 * Captura silenciosamente errores del navegador, advertencias, fallos de red y excepciones
 * para que Xana AI pueda analizarlos y diagnosticarlos bajo demanda.
 */

export interface RecordedError {
    timestamp: string;
    type: 'error' | 'warn' | 'unhandled_promise' | 'network_error';
    message: string;
    source?: string;
    stack?: string;
    url?: string;
}

const MAX_LOGS = 30;
const logBuffer: RecordedError[] = [];
let isInitialized = false;

export function initErrorRecorder(): void {
    if (isInitialized || typeof window === 'undefined') return;
    isInitialized = true;

    // 1. Interceptar window.onerror
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
        addLog({
            timestamp: new Date().toISOString(),
            type: 'error',
            message: String(message),
            source: source ? `${source}:${lineno}:${colno}` : undefined,
            stack: error?.stack,
            url: window.location.pathname
        });
        if (typeof originalOnError === 'function') {
            return originalOnError(message, source, lineno, colno, error);
        }
        return false;
    };

    // 2. Interceptar promesas no capturadas
    window.addEventListener('unhandledrejection', (event) => {
        addLog({
            timestamp: new Date().toISOString(),
            type: 'unhandled_promise',
            message: event.reason?.message || String(event.reason) || 'Promesa rechazada no capturada',
            stack: event.reason?.stack,
            url: window.location.pathname
        });
    });

    // 3. Interceptar console.error
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
        try {
            const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            // Evitar recursión o logs ruidosos de extensiones
            if (!message.includes('[Xana AI]') && !message.includes('Download the React DevTools')) {
                addLog({
                    timestamp: new Date().toISOString(),
                    type: 'error',
                    message: message.substring(0, 500),
                    url: window.location.pathname
                });
            }
        } catch (_) {}
        originalConsoleError.apply(console, args);
    };

    // 4. Interceptar console.warn
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
        try {
            const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            if (message.includes('API') || message.includes('falló') || message.includes('failed') || message.includes('timeout')) {
                addLog({
                    timestamp: new Date().toISOString(),
                    type: 'warn',
                    message: message.substring(0, 500),
                    url: window.location.pathname
                });
            }
        } catch (_) {}
        originalConsoleWarn.apply(console, args);
    };

    console.log('🩺 [Xana Diagnostic] Recolector de errores de consola inicializado.');
}

export function addLog(log: RecordedError): void {
    if (logBuffer.length >= MAX_LOGS) {
        logBuffer.shift(); // Eliminar el más antiguo
    }
    logBuffer.push(log);
}

export function recordNetworkError(url: string, status: number, statusText: string, errorDetails?: string): void {
    addLog({
        timestamp: new Date().toISOString(),
        type: 'network_error',
        message: `HTTP ${status} ${statusText} al llamar a ${url}. ${errorDetails || ''}`.trim(),
        url: window.location.pathname
    });
}

export function getRecentLogs(): RecordedError[] {
    return [...logBuffer];
}

export function clearLogs(): void {
    logBuffer.length = 0;
}
