// User roles matching IMPGESV2 system
export type UserRole = 'principal' | 'administrador' | 'vendedor' | 'cliente' | 'impresion' | 'artista'

export interface User {
    id: number
    username: string
    name: string
    role: UserRole
    level: number // 1-6 matching IMPGESV2 levels
    clientId?: number // Reference for client users
    avatar?: string
    bio?: string
    phone?: string
}

export interface LoginCredentials {
    username: string
    password: string
}

// Role permissions for route access
export const rolePermissions: Record<string, string[]> = {
    principal: ['*'],
    administrador: ['*'],
    vendedor: ['/', '/entrada', '/presupuestador', '/abm/clientes', '/utilidades'],
    impresion: ['/', '/impresion', '/stock', '/utilidades'],
    artista: ['/', '/diseno', '/impresion', '/presupuestador', '/utilidades'],
    cliente: ['/', '/entrada', '/utilidades'],
}

export function hasRolePermission(role: string | undefined, path: string): boolean {
    if (!role) return false;
    const normalizedRole = role.toLowerCase().trim();
    if (['principal', 'administrador', 'admin', 'sistema', 'master'].includes(normalizedRole)) {
        return true;
    }
    const permissions = rolePermissions[normalizedRole] || [];
    if (permissions.includes('*')) return true;
    return permissions.some(p => {
        if (p === '/') return path === '/';
        return path === p || path.startsWith(p + '/');
    });
}

export interface RoleConfig {
    id: number
    name: string
    key: string
    status: 'Activo' | 'Inactivo'
    permissions?: string[]
}

export interface SystemLog {
    id: number
    timestamp: string
    action: string
    user: string
    details: string
}
