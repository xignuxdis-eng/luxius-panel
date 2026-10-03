/**
 * Interceptor global de fetch: agrega automáticamente el token JWT
 * (Authorization: Bearer) a TODAS las llamadas dirigidas al backend LuXius
 * que no lo incluyan explícitamente. Así ningún endpoint protegido queda
 * sin credenciales por olvido en un componente.
 */
const BACKEND_PREFIXES = [
    'https://luxius-backend.onrender.com',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
]

function isBackendUrl(url: string): boolean {
    return BACKEND_PREFIXES.some(prefix => url.startsWith(prefix))
}

function resolveUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input
    if (input instanceof URL) return input.href
    return (input as Request).url
}

export function initAuthFetch(): void {
    if (typeof window === 'undefined' || (window as any).__luxiusAuthFetch) return
    const originalFetch = window.fetch.bind(window)
    ;(window as any).__luxiusAuthFetch = true

    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        try {
            const url = resolveUrl(input)
            if (isBackendUrl(url)) {
                const token = localStorage.getItem('luxius_auth_token')
                if (token) {
                    const baseHeaders = init?.headers ?? (input instanceof Request ? input.headers : undefined)
                    const headers = new Headers(baseHeaders)
                    if (!headers.has('Authorization')) {
                        headers.set('Authorization', `Bearer ${token}`)
                        return originalFetch(input, { ...init, headers })
                    }
                }
            }
        } catch (_) {
            // Nunca romper la petición por el interceptor
        }
        return originalFetch(input, init)
    }
}
