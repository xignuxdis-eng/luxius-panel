// Order status flow V2 (Simplified)
export type OrderStatus =
    | 'relevamiento' // Relevamiento de campo (Móvil)
    | 'diseno'       // Diseño en proceso (Luxius Web)
    | 'preorden'     // Legacy fallback
    | 'orden'        // Impresión: Listo para imprimir
    | 'impreso'     // Taller: Terminado
    | 'post'        // Taller: Post-impresión / Terminaciones
    | 'completo'    // Taller: Listo para entregar
    | 'entregado'   // Admin: Entregado al cliente
    | 'finalizado'  // Admin: Archivado / Cerrado
    | 'standby'     // Admin: En pausa / Problema
    | 'anulado'     // Admin: Cancelado
    | 'rebotado'    // Admin: Rechazado pararehacer
    | 'eliminado'   // Admin: Papelera / Borrado suave

export interface DemasiasConfig {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
}

export type UnidadMedida = 'u' | 'm2' | 'ml' | 'global' | 'lote';

export interface Order {
    id: number
    ot: string // Orden de Trabajo
    status: OrderStatus
    clientId: number
    clienteNombre: string
    clientName?: string // Optional for legacy
    nombreTarea?: string; // Nombre del proyecto o tarea relevada
    batchId?: string; // ID único del lote para agrupar
    loteNombre?: string; // Nombre del lote (ej. "Hilux Dixtron")
    descripcionItem?: string; // Sub-descripción del archivo (ej. "Lateral Izquierdo")
    origen?: 'mobile' | 'web' | string; // 'mobile' (App Móvil) vs 'web' (Luxius Web)
    operarioNombre?: string;
    vendedorNombre?: string;
    createdAt?: string; // ISO Date String
    updatedAt?: string; // ISO Date String

    // Custom / Outsourced items spec
    isCustom?: boolean;
    conceptoPersonalizado?: string;
    unidadMedida?: UnidadMedida;
    precioUnitarioManual?: number;

    // Material specs
    material: string
    calidad: string
    alto: number    // meters
    ancho: number   // meters
    copias: number

    // Financials
    subtotal: number
    total?: number // Optional for legacy
    demasias: number // legacy numeric bleed
    demasiasConfig?: DemasiasConfig; // directional bleed
    servicios?: Record<string, boolean>; // dynamic services selection

    // Extras
    accesorios: string[]
    laminado: boolean
    bordado: boolean
    panelizado: boolean
    portabanners: number

    // Logistics
    envio: string
    emergencia: boolean

    // Dates
    fechaCreacion: string
    fechaEntrega: string

    // Notes
    observaciones: string
    observaciones2: string
    comments?: string // Optional comments for status changes (e.g. bounce reason)

    // Files
    archivos: string[]
    archivosOriginales?: string[]
    imgMetadata?: {
        width: number
        height: number
        dpi: number
        format: string
        colorMode: string
        thumbnailUrl?: string
        pageCount?: number
    }

    // Production
    maquinaId?: number
    artistaId?: number // Assigned artist ID
    fechaOK?: string
    aprobadoPor?: string

    // Category
    category?: 'diseno' | 'impresion'

    // Security & Stock
    stockWarning?: boolean;
    dismissedStockWarning?: boolean;
    consumoEstimado?: number;
    bobinaAsignada?: number | string;
    precioUnitarioUsado?: number;
    precioMl?: number;
    precioDetalle?: {
        bobinaUsada?: number;
        bobinaAncho?: number;
        precioML?: number;
        costoBase?: number;
        rotated?: boolean;
        tipoCobro?: 'ml' | 'm2';
        consumoML?: number;
    };
}


export interface OrderFilters {
    general?: string
    estado?: OrderStatus | ''
    habilitado?: boolean
    calidad?: string
    material?: string
    alto?: number
    ancho?: number
    accesorios?: string
    emergencia?: boolean
}

// Status labels for UI
export const statusLabels: Record<OrderStatus, string> = {
    relevamiento: 'Relevamiento',
    diseno: 'Diseño',
    preorden: 'Diseño (Legacy)',
    orden: 'Para Imprimir',
    impreso: 'Impreso',
    post: 'Terminaciones',
    completo: 'Para Entregar',
    entregado: 'Entregado',
    finalizado: 'Archivado',
    standby: 'Stand By',
    anulado: 'Anulado',
    rebotado: 'Rechazado',
    eliminado: 'Papelera'
}

export const statusColors: Record<OrderStatus, string> = {
    relevamiento: '#0ea5e9', // cyan
    diseno: '#e879a8',       // soft magenta/pink
    preorden: '#c084fc',     // soft purple
    orden: '#f97316',        // orange (vivid)
    impreso: '#4ade80',      // soft green
    post: '#a855f7',         // purple
    completo: '#22c55e',     // green
    entregado: '#64748b',     // slate
    finalizado: '#94a3b8',    // slate-light
    standby: '#fca5a5',      // red-light
    anulado: '#ef4444',      // red
    rebotado: '#be123c',      // rose
    eliminado: '#475569'      // slate-dark
}
