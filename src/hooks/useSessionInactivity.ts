import { useEffect, useRef } from 'react';
import { useAuthStore } from '@store/authStore';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos exactos

/**
 * Hook de protección de sesión activa por inactividad (15 min).
 * Desconecta automáticamente al operador tras 15 minutos sin interacción física.
 */
export function useSessionInactivity() {
    const { isAuthenticated, user, logout } = useAuthStore();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !user || user.role === 'visitante') {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        const handleTimeout = () => {
            console.warn('[SessionInactivity] 15 minutos sin interacción detectados. Cerrando sesión preventivamente...');
            sessionStorage.setItem('luxius_session_expired_reason', 'inactivity');
            logout();
        };

        const resetTimer = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(handleTimeout, INACTIVITY_TIMEOUT_MS);
        };

        // Iniciar temporizador inicial
        resetTimer();

        // Eventos globales de interacción del operador
        const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        let lastActivity = Date.now();

        const throttledListener = () => {
            const now = Date.now();
            if (now - lastActivity > 1000) {
                lastActivity = now;
                resetTimer();
            }
        };

        events.forEach(event => {
            window.addEventListener(event, throttledListener, { passive: true });
        });

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            events.forEach(event => {
                window.removeEventListener(event, throttledListener);
            });
        };
    }, [isAuthenticated, user, logout]);
}
