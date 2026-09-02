import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginCredentials, UserRole } from '@/types'
import { getUsuarios, getClientes, API_URL } from '@/data/db'


interface AuthState {
    user: User | null
    isAuthenticated: boolean
    login: (credentials: LoginCredentials) => Promise<{ success: boolean; message?: string }>
    logout: () => void
    setUser: (user: User) => void
    clearStorage: () => void
    validateSession: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,

            validateSession: async () => {
                const token = localStorage.getItem('luxius_auth_token');
                if (!token) {
                    if (get().isAuthenticated) {
                        set({ user: null, isAuthenticated: false });
                    }
                    return false;
                }

                try {
                    const res = await fetch(`${API_URL}/usuarios?_t=${Date.now()}`, {
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Cache-Control': 'no-cache'
                        },
                        cache: 'no-store',
                    });

                    if (res.status === 401 || res.status === 403) {
                        console.warn('[authStore] Token expirado o inválido en el servidor. Cerrando sesión...');
                        localStorage.removeItem('luxius_auth_token');
                        set({ user: null, isAuthenticated: false });
                        return false;
                    }
                    return true;
                } catch {
                    // Si el servidor está temporalmente offline, preservar sesión para permitir modo offline
                    return get().isAuthenticated;
                }
            },

            clearStorage: () => {
                const keys = [
                    'luxius-auth-v6',
                    'luxius_auth_token',
                    'luxius_session_ordenes',
                    'luxius_session_usuarios',
                    'luxius_session_roles',
                    'luxius_session_clientes',
                    'luxius_session_materiales'
                ];
                keys.forEach(k => localStorage.removeItem(k));
                window.location.reload();
            },

            login: async (credentials: LoginCredentials) => {
                // Authenticate via secure backend API only
                try {
                    const res = await fetch(`${API_URL}/auth/login?_t=${Date.now()}`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        },
                        cache: 'no-store',
                        body: JSON.stringify({
                            username: credentials.username,
                            password: credentials.password,
                        }),
                    });

                    if (!res.ok) {
                        const err = await res.json().catch(() => ({ error: 'Error de conexión' }));
                        return { success: false, message: err.error || 'Credenciales inválidas' };
                    }

                    const data = await res.json();
                    const token = data.token;
                    const serverUser = data.user;

                    if (!token || !serverUser) {
                        return { success: false, message: 'Respuesta de login incompleta' };
                    }

                    // Store token securely
                    localStorage.setItem('luxius_auth_token', token);

                    // Fetch full user list for local cache
                    try {
                        const usersRes = await fetch(`${API_URL}/usuarios?_t=${Date.now()}`, {
                            headers: { 
                                'Authorization': `Bearer ${token}`,
                                'Cache-Control': 'no-cache'
                            },
                            cache: 'no-store',
                        });
                        if (usersRes.ok) {
                            const serverUsers = await usersRes.json();
                            localStorage.setItem('luxius_session_usuarios', JSON.stringify(serverUsers));
                        }
                    } catch {
                        // Non-critical
                    }

                    // Map server user to local User type
                    const mappedUser: User = {
                        id: serverUser.id,
                        username: serverUser.username,
                        name: serverUser.nombre || serverUser.name || serverUser.username,
                        role: (serverUser.rol || serverUser.role || 'vendedor') as UserRole,
                        level: serverUser.level || 1,
                        clientId: serverUser.clientId,
                    };

                    set({ user: mappedUser, isAuthenticated: true });
                    return { success: true };

                } catch (e: any) {
                    console.error('Login error:', e.message);
                    return { success: false, message: 'Error de conexión con el servidor' };
                }
            },

            logout: () => {
                localStorage.removeItem('luxius_auth_token');
                set({ user: null, isAuthenticated: false });
            },

            setUser: (user: User) => {
                set({ user });
            }
        }),
        {
            name: 'luxius-auth-v6',
        }
    )
)
