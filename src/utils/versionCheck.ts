/**
 * Luxius System - Auto-Version & Cache Invalidation Engine
 * 
 * Garantiza que cualquier actualización en el código o despliegue en la nube
 * se refleje de manera inmediata e inequívoca en todos los navegadores,
 * eliminando problemas de caché residual, Service Workers y estados congelados.
 */

declare const __BUILD_TIMESTAMP__: string;

const CURRENT_BUILD = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : String(Date.now());
const VERSION_KEY = 'luxius_app_version';

/**
 * Desregistra Service Workers y purga CacheStorage para evitar que el navegador
 * sirva bundles antiguos en SPAs.
 */
export async function purgeServiceWorkersAndCaches(): Promise<void> {
    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
                console.log('[VersionEngine] ServiceWorker desregistrado:', registration);
            }
        }
    } catch (e) {
        console.warn('[VersionEngine] Error al desregistrar ServiceWorker:', e);
    }

    try {
        if ('caches' in window) {
            const cacheNames = await window.caches.keys();
            for (const name of cacheNames) {
                await window.caches.delete(name);
                console.log('[VersionEngine] CacheStorage purgado:', name);
            }
        }
    } catch (e) {
        console.warn('[VersionEngine] Error al purgar CacheStorage:', e);
    }
}

/**
 * Fuerza una limpieza total de caché de datos volátiles y recarga el sistema desde el servidor.
 */
export async function forceCleanCacheAndReload(preserveAuth = true): Promise<void> {
    console.log('[VersionEngine] Forzando limpieza profunda de caché y recarga...');
    
    await purgeServiceWorkersAndCaches();

    // Guardar credenciales de auth si se desea preservar la sesión activa
    const authToken = preserveAuth ? localStorage.getItem('luxius_auth_token') : null;
    const authState = preserveAuth ? localStorage.getItem('luxius-auth-v6') : null;
    const theme = localStorage.getItem('theme') || 'pixel';

    // Purgar claves de caché de datos en localStorage
    const dataKeys = [
        'luxius_session_ordenes',
        'luxius_deleted_ordenes',
        'luxius_session_clientes',
        'luxius_session_materiales',
        'luxius_session_calidades',
        'luxius_session_maquinas',
        'luxius_session_usuarios',
        'luxius_session_proveedores',
        'luxius_session_servicios',
        'luxius_session_logisticas',
        'luxius_session_calendar',
        'luxius_session_roles',
        'luxius_ordenes_last_save'
    ];

    dataKeys.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();

    if (preserveAuth) {
        if (authToken) localStorage.setItem('luxius_auth_token', authToken);
        if (authState) localStorage.setItem('luxius-auth-v6', authState);
    }
    localStorage.setItem('theme', theme);
    localStorage.setItem(VERSION_KEY, CURRENT_BUILD);

    // Recargar con bypass de caché
    const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
    window.location.replace(cleanUrl);
}

/**
 * Consulta la versión remota en version.json. Si difiere de la actual,
 * actualiza automáticamente el sistema.
 */
export async function checkServerVersion(): Promise<boolean> {
    try {
        const res = await fetch(`./version.json?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
            }
        });

        if (!res.ok) return false;

        const data = await res.json();
        const serverBuild = String(data.buildTime || data.version || '');

        if (!serverBuild) return false;

        const installedVersion = localStorage.getItem(VERSION_KEY);

        if (!installedVersion) {
            localStorage.setItem(VERSION_KEY, serverBuild);
            return false;
        }

        if (installedVersion !== serverBuild && CURRENT_BUILD !== serverBuild) {
            console.log(`[VersionEngine] Nueva versión detectada: Server=${serverBuild}, Local=${installedVersion}. Actualizando...`);
            localStorage.setItem(VERSION_KEY, serverBuild);
            await purgeServiceWorkersAndCaches();
            window.location.reload();
            return true;
        }
    } catch (e) {
        // Fallo silencioso en caso de estar offline
    }
    return false;
}

/**
 * Inicializador global del motor de versiones.
 */
export function initVersionEngine(): void {
    // 1. Limpieza preventiva de ServiceWorkers
    purgeServiceWorkersAndCaches();

    // 2. Registrar versión local
    localStorage.setItem(VERSION_KEY, CURRENT_BUILD);

    // 3. Verificar versión remota de inmediato
    checkServerVersion();

    // 4. Verificar al re-enfocar la pestaña o regresar a la ventana
    if (typeof window !== 'undefined') {
        window.addEventListener('focus', () => {
            checkServerVersion();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkServerVersion();
            }
        });

        // Verificación periódica cada 3 minutos
        setInterval(() => {
            checkServerVersion();
        }, 3 * 60 * 1000);
    }
}
