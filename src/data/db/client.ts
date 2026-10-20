/**
 * Luxius System - HTTP, API & Client Transport Layer
 */

import { Capacitor } from '@capacitor/core';

/**
 * Detects if app is executing inside a native mobile wrapper (Android / iOS via Capacitor)
 */
export function isCapacitorNative(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        if (Capacitor.isNativePlatform()) return true;
    } catch {}
    const win = window as any;
    return !!(
        win.Capacitor?.isNativePlatform?.() ||
        window.location.protocol === 'capacitor:' ||
        navigator.userAgent.includes('Capacitor') ||
        (window.location.hostname === 'localhost' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
    );
}

/**
 * Resolves current active backend API base URL:
 * 1. User manual override from localStorage ('luxius_api_url')
 * 2. Capacitor Android / iOS native wrapper -> always production cloud ('https://luxius-backend.onrender.com/api')
 * 3. Local desktop browser development -> 'http://localhost:5000/api'
 * 4. Production Web (GitHub Pages / custom domain) -> 'https://luxius-backend.onrender.com/api'
 */
export function getApiBaseUrl(): string {
    if (typeof window === 'undefined') return 'https://luxius-backend.onrender.com/api';
    
    // Check manual override
    try {
        const custom = localStorage.getItem('luxius_api_url');
        if (custom && custom.trim().startsWith('http')) {
            return custom.trim().replace(/\/+$/, '');
        }
    } catch {}

    // Capacitor Native Android / iOS app
    if (isCapacitorNative()) {
        return 'https://luxius-backend.onrender.com/api';
    }

    // Local PC browser development
    const isLocalBrowser = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocalBrowser ? 'http://localhost:5000/api' : 'https://luxius-backend.onrender.com/api';
}

export function setCustomApiUrl(url: string | null): void {
    if (typeof window === 'undefined') return;
    if (!url || !url.trim()) {
        localStorage.removeItem('luxius_api_url');
    } else {
        localStorage.setItem('luxius_api_url', url.trim().replace(/\/+$/, ''));
    }
    window.location.reload();
}

// API Configuration: dynamic between local server and Render cloud
export const API_URL = getApiBaseUrl();

export function resolveMediaUrl(fileStr: string): string {
    if (!fileStr) return '';
    const trimmed = fileStr.trim();

    if (trimmed.startsWith('data:')) return trimmed;

    const baseUrl = API_URL.replace(/\/api\/?$/, '');

    // Helper: appendea ?token= al final de una URL de /uploads/ para que
    // <img src>, window.open() y links directos pasen autenticación.
    const withToken = (url: string): string => {
        const jwt = localStorage.getItem('luxius_auth_token');
        if (!jwt) return url;
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}token=${encodeURIComponent(jwt)}`;
    };

    // Normalize localhost / 127.0.0.1 or cloud URLs to the active baseUrl
    if (trimmed.includes('localhost:5000/uploads/') || trimmed.includes('127.0.0.1:5000/uploads/')) {
        const parts = trimmed.split('/uploads/');
        const filename = parts[parts.length - 1];
        return withToken(`${baseUrl}/uploads/${filename}`);
    }

    if (trimmed.includes('luxius-backend.onrender.com/uploads/')) {
        const parts = trimmed.split('/uploads/');
        const filename = parts[parts.length - 1];
        return withToken(`${baseUrl}/uploads/${filename}`);
    }

    const httpIdx = trimmed.indexOf('http://');
    const httpsIdx = trimmed.indexOf('https://');
    const firstHttp = httpIdx !== -1 ? httpIdx : httpsIdx;
    if (firstHttp !== -1) {
        const url = trimmed.substring(firstHttp);
        // Solo appendear token si es una URL de /uploads/ de nuestro propio backend
        if (url.includes('/uploads/') && url.includes(baseUrl.replace(/^https?:\/\//, ''))) {
            return withToken(url);
        }
        return url;
    }

    let cleanPath = trimmed.replace(/^\/+/, '');
    if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.replace(/^uploads\//, '');
    }

    return withToken(`${baseUrl}/uploads/${cleanPath}`);
}

export function getAuthHeaders(baseHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...baseHeaders
    };
    try {
        const token = localStorage.getItem('luxius_auth_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    } catch (_) { }
    return headers;
}

export const syncSave = (collection: string, data: any) => {
    console.log(`[Sync] Saving to ${collection}`, data);
    fetch(`${API_URL}/${collection}?_t=${Date.now()}`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
        keepalive: true,
        cache: 'no-store'
    }).then(res => {
        if (!res.ok) console.warn(`[Sync] Save failed ${collection}: ${res.status}`);
    }).catch(e => console.error(`[Sync] Network error [${collection}]:`, e));
};

export const syncDelete = (collection: string, id: number) => {
    console.log(`[Sync] Deleting from ${collection} ID: ${id}`);
    fetch(`${API_URL}/${collection}/${id}?_t=${Date.now()}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        keepalive: true,
        cache: 'no-store'
    }).then(res => {
        if (!res.ok) console.warn(`[Sync] Delete failed ${collection}: ${res.status}`);
    }).catch(e => console.error(`[Sync] Network error delete [${collection}]:`, e));
};

export const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 45000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const headers = getAuthHeaders(options.headers || {});
        const separator = url.includes('?') ? '&' : '?';
        const cacheBustedUrl = `${url}${separator}_t=${Date.now()}`;

        const response = await fetch(cacheBustedUrl, {
            ...options,
            cache: 'no-store',
            headers,
            signal: controller.signal
        });
        clearTimeout(id);

        // Si la sesión expiró en el servidor (401 / 403), limpiar token y disparar evento de logout
        if (response.status === 401 || response.status === 403) {
            console.warn(`[Auth] Sesión no autorizada o expirada (${response.status}) en ${url}`);
            if (localStorage.getItem('luxius_auth_token')) {
                localStorage.removeItem('luxius_auth_token');
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('luxius-auth-expired'));
                }
            }
        }

        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

export async function uploadFile(
    file: File,
    onProgress?: (percent: number, loaded: number, total: number) => void
): Promise<{ filename: string, path: string, originalName: string, size: number, thumbnailUrl?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    // Timeout dinámico: mínimo 120s, +30s por cada 10MB adicional, máximo 600s
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.min(600000, Math.max(120000, 120000 + Math.ceil(fileSizeMB / 10) * 30000));

    // Get auth token
    let authToken = '';
    try {
        authToken = localStorage.getItem('luxius_auth_token') || '';
        if (!authToken) {
            const stored = localStorage.getItem('luxius_auth');
            if (stored) {
                const parsed = JSON.parse(stored);
                authToken = parsed?.state?.token || '';
            }
        }
    } catch (_) { /* no-op */ }

    console.log(`[Upload] Iniciando subida: ${file.name} (${fileSizeMB.toFixed(1)} MB) timeout: ${timeoutMs / 1000}s`);

    const uploadResult = await new Promise<{ filename: string, path: string, originalName: string, size: number, thumbnailUrl?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/upload`, true);
        xhr.timeout = timeoutMs;

        // Auth header
        if (authToken) {
            xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        }

        // Progress tracking
        if (xhr.upload && onProgress) {
            let lastReported = 0;
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && e.total > 0) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    // Debounce: solo reportar cada 2% o cuando llegue a 100%
                    if (percent >= lastReported + 2 || percent === 100) {
                        lastReported = percent;
                        onProgress(percent, e.loaded, e.total);
                    }
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    if (res.success || res.filename) {
                        console.log(`[Upload] ✅ Subida exitosa: ${file.name} -> ${res.filename}`);
                        resolve({
                            filename: res.filename || res.path,
                            path: res.path || res.filename,
                            originalName: res.originalName || file.name,
                            size: res.size || file.size,
                            thumbnailUrl: res.thumbnailUrl
                        });
                    } else {
                        reject(new Error(res.error || 'Upload failed'));
                    }
                } catch (e) {
                    reject(new Error('Respuesta inválida del servidor'));
                }
            } else if (xhr.status === 413) {
                reject(new Error(`Archivo demasiado grande (${fileSizeMB.toFixed(1)} MB). El servidor rechazó la subida.`));
            } else {
                let errorMsg = `Error del servidor (HTTP ${xhr.status})`;
                try {
                    const errRes = JSON.parse(xhr.responseText);
                    errorMsg = errRes.error || errorMsg;
                } catch (_) { /* no-op */ }
                reject(new Error(errorMsg));
            }
        };

        xhr.onerror = () => reject(new Error(`Error de red al subir ${file.name}. Verifique su conexión.`));
        xhr.ontimeout = () => reject(new Error(`Timeout al subir ${file.name} (${fileSizeMB.toFixed(1)} MB). El archivo es muy grande o la conexión es lenta.`));

        xhr.send(formData);
    });

    return uploadResult;
}

export async function fetchLiveDolarRates(): Promise<{ blue?: { venta: number, compra: number }, oficial?: { venta: number, compra: number }, cripto?: { venta: number, compra: number } }> {
    try {
        const res = await fetch('https://dolarapi.com/v1/dolares');
        if (!res.ok) return {};
        const data = await res.json();
        const result: any = {};
        data.forEach((item: any) => {
            if (item.casa === 'blue') result.blue = { venta: item.venta, compra: item.compra };
            if (item.casa === 'oficial') result.oficial = { venta: item.venta, compra: item.compra };
            if (item.casa === 'cripto') result.cripto = { venta: item.venta, compra: item.compra };
        });
        return result;
    } catch {
        return {};
    }
}
