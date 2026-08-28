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
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,

            clearStorage: () => {
                const keys = [
                    'luxius-auth-v2',
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
                    const res = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
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

                    // Fetch full user list for local cache (now requires auth)
                    try {
                        const usersRes = await fetch(`${API_URL}/usuarios`, {
                            headers: { 'Authorization': `Bearer ${token}` },
                            cache: 'no-store',
                        });
                        if (usersRes.ok) {
                            const serverUsers = await usersRes.json();
                            localStorage.setItem('luxius_session_usuarios', JSON.stringify(serverUsers));
                        }
                    } catch {
                        // Non-critical: local cache may be stale
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
                set({ user: null, isAuthenticated: false })
            },

            setUser: (user: User) => {
                set({ user })
            }
        }),
        {
            name: 'luxius-auth-v6', // Force cache invalidation to purge old users
        }
    )
)
