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
    /** Descripción corta de la orden. El backend la expone como
     *  `descripcion`; es el mismo texto que `nombreTarea`. */
    descripcion?: string;
    batchId?: string; // ID único del lote para agrupar
    loteNombre?: string; // Nombre del lote (ej. "Hilux Dixtron")
    descripcionItem?: string; // Sub-descripción del archivo (ej. "Lateral Izquierdo")
    /** Vendedor asignado. El backend lo devuelve en el listado de órdenes
     *  (`vendedorId`); se usa al reabrir una orden en el modal. */
    vendedorId?: number;
    /** Identificador externo heredado. Hoy el backend emite `id` numérico,
     *  por eso todo el código cae a `o.id` cuando `uuid` no está. */
    uuid?: string;
    origen?: 'mobile' | 'web' | string; // 'mobile' (App Móvil) vs 'web' (Luxius Web)
    operarioNombre?: string;
    vendedorNombre?: string;
    creadoPor?: string;
    usuarioId?: number | string;
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

    // Financials & Payment Tracking
    subtotal: number
    total?: number // Optional for legacy
    sena?: number // Monto entregado como seña / anticipo
    senaMonto?: number // Alias compatible backend
    senaPorcentaje?: number // Porcentaje de seña (0-100)
    senaMetodo?: string // 'efectivo' | 'transferencia' | 'tarjeta' | 'mercadopago' | 'ctacte' | 'pendiente'
    saldoPendiente?: number // Saldo restante por pagar (total - sena)
    montoPagado?: number // Total abonado
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
    stockDescontado?: boolean // Bandera para deducción automática en stock (impreso / entregado)

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
    maquinaId?: number // Plotter de impresión asignado (RS640 / SolJet Pro III)
    /** Servicio de corte (plotter de corte: Medio corte o Corte completo). `estado` pendiente hasta que se marca cortado. */
    corte?: {
        tipo: 'completo' | 'medio'
        estado?: 'pendiente' | 'cortado'
        maquinaId?: number
    }
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

    // Operational Tags
    tags?: string[];
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
    tag?: string
}

export interface OrderTagDef {
    id: string;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: string;
}

export const PRESET_ORDER_TAGS: OrderTagDef[] = [
    { id: 'urgente', label: 'URGENTE', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', icon: '🚨' },
    { id: 'reimpresion', label: 'REIMPRESIÓN', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', icon: '🔄' },
    { id: 'muestra', label: 'MUESTRA', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.4)', icon: '🧪' },
    { id: 'vip', label: 'VIP', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.15)', borderColor: 'rgba(236, 72, 153, 0.4)', icon: '⭐' },
    { id: 'espera_pago', label: 'ESPERA PAGO', color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.15)', borderColor: 'rgba(234, 179, 8, 0.4)', icon: '⏳' },
    { id: 'stock', label: 'STOCK', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.15)', borderColor: 'rgba(6, 182, 212, 0.4)', icon: '📦' },
];

export function getOrderTag(tagId: string): OrderTagDef | undefined {
    return PRESET_ORDER_TAGS.find(t => t.id === tagId || t.label.toLowerCase() === tagId.toLowerCase());
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

/**
 * Determina si una orden pertenece o fue creada/publicada/asignada a un diseñador específico.
 * Garantiza que el rol de diseño únicamente visualice y dé seguimiento a sus propios trabajos,
 * ocultando completamente las órdenes publicadas por otros diseñadores o por el sistema/administración.
 */
export function isDesignerOwner(
    order: Partial<Order> | null | undefined,
    user: { id?: number | string; username?: string; name?: string; role?: string } | null | undefined
): boolean {
    if (!order || !user) return false;

    const userIdStr = user.id !== undefined && user.id !== null ? String(user.id).trim() : '';
    const username = (user.username || '').toLowerCase().trim();
    const userName = (user.name || '').toLowerCase().trim();

    // 1. Asignación directa por artistaId
    if (order.artistaId !== undefined && order.artistaId !== null && String(order.artistaId).trim() !== '') {
        if (userIdStr && String(order.artistaId).trim() === userIdStr) return true;
    }

    // 2. Creado por (creadoPor / creado_por) o usuarioId
    const anyOrder = order as any;
    const creadoPor = String(anyOrder.creadoPor || anyOrder.creado_por || '').toLowerCase().trim();
    if (creadoPor) {
        if (userIdStr && (creadoPor === userIdStr || creadoPor === `user_${userIdStr}`)) return true;
        if (username && (creadoPor === username || creadoPor.includes(username))) return true;
        if (userName && (creadoPor === userName || userName.includes(creadoPor))) return true;
    }

    const usuarioId = anyOrder.usuarioId || anyOrder.usuario_id;
    if (usuarioId !== undefined && usuarioId !== null && String(usuarioId).trim() !== '') {
        if (userIdStr && String(usuarioId).trim() === userIdStr) return true;
    }

    // 3. Operario / Diseñador que intervino en la orden
    const operario = (order.operarioNombre || '').toLowerCase().trim();
    const vendedor = (order.vendedorNombre || '').toLowerCase().trim();
    if (userName) {
        if (operario && (operario === userName || operario.includes(userName) || userName.includes(operario))) return true;
        if (vendedor && (vendedor === userName || vendedor.includes(userName) || userName.includes(vendedor))) return true;
    }
    if (username) {
        if (operario && (operario === username || operario.includes(username))) return true;
        if (vendedor && (vendedor === username || vendedor.includes(username))) return true;
    }

    return false;
}

