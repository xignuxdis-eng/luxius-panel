export interface Cliente {
    id: number
    nombre: string
    cuit: string
    empresa: string
    categoria: string
    condVenta: string
    responsable: string
    email: string
    telefono: string
    direccion: string
    habilitado: boolean
    vip: boolean
    fechaInicio: string
    username?: string // Manual username for system user
    preciosEspeciales?: Record<string, number> // materialCode -> customPrice
}

export interface Material {
    id: number
    codigo: string
    calidad: string
    descripcion: string
    tipo: string
    unidad?: string
    color?: string
    tipoCobro?: 'm2' | 'ml'
    preciosPorAncho?: { maxAncho: number, precio: number }[] // Deprecated for ml, keep for legacy m2 tiered pricing
    bobinas?: { ancho: number, precioML: number }[] // New: Specific coils for ml pricing
    precioM2: number // Base price for m2 or fallback

    ancho: number // Default/Max width
    habilitado: boolean
    stockActual?: number // Meterage or units
    stockMinimo?: number // Alert threshold
}


export interface Calidad {
    id: number
    nombre: string
    descripcion: string
    orden: number
    habilitado: boolean
}

export interface Maquina {
    id: number
    nombre: string
    ancho?: number // max width in mm (deprecated, use anchoMaximo)
    anchoMaximo?: number
    tipo: string
    habilitada: boolean
    estado?: 'online' | 'offline' | 'mantenimiento'
}

export interface Producto {
    id: number
    codigo: string
    calidad: string
    descripcion: string
    tipo: 'producto' | 'rollo' | 'gasto' | 'materia_prima'
    existencia: number
    stockMinimo: number
    precio: number
    observaciones: string
}

export interface Combo {
    id: number
    nombre: string
    descripcion: string
    precio: number
    fechaVencimiento: string
    habilitado: boolean
    productos: number[] // product IDs
}

export interface Servicio {
    id: number
    codigo: string
    nombre: string
    descripcion: string
    precioBase: number
    unidad: 'm2' | 'unidad' | 'metro'
    habilitado: boolean
}

export interface Logistica {
    id: number
    nombre: string
    descripcion: string
    costo: number
    habilitado: boolean
}

export interface Proveedor {
    id: number
    nombre: string
    contacto: string
    telefono: string
    email: string
    direccion: string
    cuit: string
    cbu: string
    rubro: string
    saldo: number
    notas: string
    habilitado: boolean
}
