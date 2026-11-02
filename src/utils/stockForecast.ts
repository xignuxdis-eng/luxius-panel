import type { Material, Order } from '@/types'

export type ForecastSeverity = 'critical' | 'low' | 'ok'

export interface ForecastItem {
    key: string
    materialId: number
    codigo: string
    descripcion: string
    tipoCobro: string
    unidad: string
    bobinaAncho: number | null
    disponible: number
    demanda: number
    restante: number
    stockMinimo: number
    severity: ForecastSeverity
    groups: string[]
}

export interface GroupForecast {
    key: string
    label: string
    orderCount: number
    codigos: string[]
    shortfallCodigos: string[]
    riskLevel: 'critical' | 'low' | 'ok'
}

export interface StockForecast {
    items: ForecastItem[]
    groups: GroupForecast[]
    criticalCount: number
    lowCount: number
    groupsAtRisk: GroupForecast[]
}

const ACTIVE_STATUSES = new Set(['relevamiento', 'diseno', 'orden', 'impresion'])

const SEVERITY_RANK: Record<ForecastSeverity, number> = { ok: 1, low: 2, critical: 3 }

export const STOCK_ALERT_ROLES = ['administrador', 'principal', 'sistema', 'impresion', 'vendedor', 'artista', 'operario']

export function canViewStockAlerts(role?: string): boolean {
    if (!role) return true // En entorno local o sin rol explícito permitir visualizar alertas
    const r = role.toLowerCase().trim()
    return STOCK_ALERT_ROLES.includes(r)
}

/**
 * Busca un material por coincidencia exacta, parcial o alias industriales gráficos.
 */
export function findMatchingMaterial(materialQuery: string | undefined | null, materials: Material[]): Material | undefined {
    if (!materialQuery || !Array.isArray(materials)) return undefined
    const matName = String(materialQuery).trim().toLowerCase()
    if (!matName) return undefined

    // 1. Coincidencia exacta o por descripción / código
    let mat = materials.find(m =>
        (m.descripcion && m.descripcion.trim().toLowerCase() === matName) ||
        (m.codigo && m.codigo.trim().toLowerCase() === matName) ||
        (m.descripcion && matName.includes(m.descripcion.trim().toLowerCase())) ||
        (m.codigo && matName.includes(m.codigo.trim().toLowerCase()))
    )

    // 2. Búsqueda por alias industriales comunes en taller
    if (!mat) {
        if (matName.includes('vehicular') || matName.includes('3651') || matName.includes('orajet') || matName === 'vv' || matName === 'vvp') {
            mat = materials.find(m => m.codigo === 'VV') || materials.find(m => m.descripcion?.toLowerCase().includes('3651'))
        } else if (matName.includes('micro') || matName === 'vm') {
            mat = materials.find(m => m.codigo === 'VM') || materials.find(m => m.descripcion?.toLowerCase().includes('micro'))
        } else if (matName.includes('front') || matName === 'fl' || matName.includes('frontlight')) {
            mat = materials.find(m => m.codigo === 'FL') || materials.find(m => m.descripcion?.toLowerCase().includes('front'))
        } else if (matName.includes('back') || matName === 'bl' || matName.includes('backlight')) {
            mat = materials.find(m => m.codigo === 'BL') || materials.find(m => m.descripcion?.toLowerCase().includes('back'))
        } else if (matName.includes('base blanca') || matName === 'vbb') {
            mat = materials.find(m => m.codigo === 'VBB') || materials.find(m => m.descripcion?.toLowerCase().includes('base blanca'))
        } else if (matName.includes('transparente') || matName === 'vt') {
            mat = materials.find(m => m.codigo === 'VT') || materials.find(m => m.descripcion?.toLowerCase().includes('transparente'))
        } else if (matName.includes('blackout') || matName === 'bo') {
            mat = materials.find(m => m.codigo === 'BO') || materials.find(m => m.descripcion?.toLowerCase().includes('blackout'))
        }
    }

    return mat
}

function toNum(v: unknown): number {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
}

function severityOf(restante: number, minimo: number): ForecastSeverity {
    if (restante < 0) return 'critical'
    if (restante <= minimo) return 'low'
    return 'ok'
}

function orderConsumption(order: Order, mat: Material | undefined): number {
    if (mat && mat.tipoCobro === 'ml') {
        const mlVal = toNum(order.consumoEstimado ?? order.precioDetalle?.consumoML)
        if (mlVal > 0) return mlVal
        const h = toNum(order.alto)
        const realH = h > 20 ? h / 100 : h
        return realH * toNum(order.copias || 1)
    }
    if (mat && (mat.unidad === 'un' || mat.unidad === 'plancha' || mat.unidad === 'Litros')) {
        return toNum(order.copias || 1)
    }
    const w = toNum(order.ancho)
    const h = toNum(order.alto)
    const realW = w > 20 ? w / 100 : w
    const realH = h > 20 ? h / 100 : h
    return realW * realH * toNum(order.copias || 1)
}

export function computeStockForecast(orders: Order[], materials: Material[]): StockForecast {
    const matByCodigo = new Map<string, Material>()
    materials.forEach(m => {
        if (m.codigo) matByCodigo.set(String(m.codigo).toLowerCase(), m)
        if (m.descripcion) matByCodigo.set(m.descripcion.toLowerCase(), m)
    })

    const units = new Map<string, ForecastItem>()
    const ensureUnit = (mat: Material, bobinaAncho: number | null): ForecastItem => {
        const key = bobinaAncho !== null ? `mat:${mat.id}:${bobinaAncho}` : `mat:${mat.id}`
        let u = units.get(key)
        if (!u) {
            u = {
                key,
                materialId: mat.id,
                codigo: mat.codigo,
                descripcion: mat.descripcion,
                tipoCobro: mat.tipoCobro || 'm2',
                unidad: mat.unidad || (mat.tipoCobro === 'ml' ? 'M Lineal' : 'm²'),
                bobinaAncho,
                disponible: 0,
                demanda: 0,
                restante: 0,
                stockMinimo: mat.stockMinimo || 10,
                severity: 'ok',
                groups: []
            }
            units.set(key, u)
        }
        return u
    }

    const groupMap = new Map<string, GroupForecast>()
    const activeOrders = orders.filter(o => ACTIVE_STATUSES.has(o.status) && !o.stockDescontado)

    activeOrders.forEach(order => {
        const code = String(order.material || '').trim()
        if (!code) return
        const mat = matByCodigo.get(code.toLowerCase()) || findMatchingMaterial(code, materials)
        if (!mat) return
        const consumo = orderConsumption(order, mat)
        if (consumo <= 0) return

        let bobinaAncho: number | null = null
        if (mat.tipoCobro === 'ml' && mat.bobinas && mat.bobinas.length > 0) {
            const w = toNum(order.bobinaAsignada ?? order.precioDetalle?.bobinaAncho ?? order.precioDetalle?.bobinaUsada)
            const match = mat.bobinas.find(b => Math.abs(toNum(b.ancho) - w) < 0.001)
            if (match) {
                bobinaAncho = toNum(match.ancho)
            } else {
                const sorted = [...mat.bobinas].sort((a, b) => toNum(a.ancho) - toNum(b.ancho))
                bobinaAncho = toNum(sorted[sorted.length - 1]?.ancho ?? 0)
            }
        }

        const unit = ensureUnit(mat, bobinaAncho)
        if (mat.tipoCobro === 'ml') {
            const b = mat.bobinas?.find(x => Math.abs(toNum(x.ancho) - (bobinaAncho ?? -1)) < 0.001)
            unit.disponible = b?.stockActual ?? mat.stockActual ?? 0
        } else {
            unit.disponible = mat.stockActual ?? 0
        }
        unit.demanda += consumo

        const groupKey = order.batchId ? `batch:${order.batchId}` : `order:${order.id}`
        let g = groupMap.get(groupKey)
        if (!g) {
            g = {
                key: groupKey,
                label: order.loteNombre || order.ot || `OT-${order.id}`,
                orderCount: 0,
                codigos: [],
                shortfallCodigos: [],
                riskLevel: 'ok'
            }
            groupMap.set(groupKey, g)
        }
        g.orderCount += 1
        if (!g.codigos.includes(mat.codigo)) g.codigos.push(mat.codigo)
        if (!unit.groups.includes(g.key)) unit.groups.push(g.key)
    })

    const items: ForecastItem[] = []
    units.forEach(u => {
        u.restante = u.disponible - u.demanda
        u.severity = severityOf(u.restante, u.stockMinimo)
        items.push(u)
    })

    const codigoSeverity = new Map<string, ForecastSeverity>()
    items.forEach(u => {
        const c = u.codigo.toLowerCase()
        const prev = codigoSeverity.get(c)
        if (!prev || SEVERITY_RANK[u.severity] > SEVERITY_RANK[prev]) {
            codigoSeverity.set(c, u.severity)
        }
    })

    const groups: GroupForecast[] = []
    groupMap.forEach(g => {
        // Un grupo solo tiene faltante si los materiales que necesita no tienen stock suficiente en taller para cubrir ESE grupo
        g.shortfallCodigos = g.codigos.filter(c => {
            const mat = findMatchingMaterial(c, materials)
            if (!mat) return true
            const disp = toNum(mat.stockActual)
            return disp <= 0
        })
        const hasShortfall = g.shortfallCodigos.length > 0
        const hasLowStock = g.codigos.some(c => {
            const mat = findMatchingMaterial(c, materials)
            if (!mat) return false
            const disp = toNum(mat.stockActual)
            return disp > 0 && disp <= (mat.stockMinimo || 10)
        })
        g.riskLevel = hasShortfall ? 'critical' : (hasLowStock ? 'low' : 'ok')
        groups.push(g)
    })

    const criticalCount = items.filter(u => u.severity === 'critical').length
    const lowCount = items.filter(u => u.severity === 'low').length
    const groupsAtRisk = groups.filter(g => g.riskLevel === 'critical')

    return { items, groups, criticalCount, lowCount, groupsAtRisk }
}

/**
 * Resuelve la bobina óptima y disponible para una orden frente al stock actual del material.
 */
export function resolveBestBobinaForOrder(order: Order, mat: Material | undefined): {
    bobina: number | null
    consumo: number
    hasStock: boolean
    availableStock: number
} {
    if (!mat) {
        return { bobina: null, consumo: 0, hasStock: false, availableStock: 0 }
    }

    const rawW = Number(order.ancho) || 0
    const rawH = Number(order.alto) || 0
    const w = Math.round((rawW > 20 ? rawW / 100 : rawW) * 100) / 100
    const h = Math.round((rawH > 20 ? rawH / 100 : rawH) * 100) / 100
    const c = Math.max(1, Number(order.copias) || 1)

    // Si el material no tiene bobinas desglosadas
    if (!mat.bobinas || mat.bobinas.length === 0) {
        const required = (mat.unidad === 'un' || mat.unidad === 'plancha' || mat.unidad === 'Litros')
            ? c
            : Math.round(w * h * c * 100) / 100
        const stock = toNum(mat.stockActual)
        return {
            bobina: null,
            consumo: required,
            hasStock: stock >= required && stock > 0,
            availableStock: stock
        }
    }

    const is150Piece = Math.max(w, h) > 1.365 && Math.max(w, h) <= 1.515
    const availableWidths = mat.bobinas
        .map(b => {
            const nominal = Number(b.ancho) || 0
            const realAncho = Math.abs(nominal - 1.50) < 0.03 ? 1.52 : nominal
            const usefulWidth = realAncho <= 1.37 ? 1.36 : (realAncho <= 1.52 ? 1.515 : realAncho - 0.02)
            const stock = toNum(b.stockActual)
            return { ancho: realAncho, usefulWidth, stock }
        })
        .filter(b => b.usefulWidth > 0)
        .sort((a, b) => a.usefulWidth - b.usefulWidth)

    type Cand = { bobina: number; ml: number; rotated: boolean; hasStock: boolean; stock: number }
    const candidates: Cand[] = []

    for (const b of availableWidths) {
        if (w <= b.usefulWidth) {
            const fits = Math.max(1, Math.floor(b.usefulWidth / (w || 1)))
            const rows = Math.ceil(c / fits)
            const ml = Math.round(rows * h * 100) / 100
            candidates.push({ bobina: b.ancho, ml, rotated: false, hasStock: b.stock >= ml && b.stock > 0, stock: b.stock })
        }
        if (h <= b.usefulWidth) {
            const fits = Math.max(1, Math.floor(b.usefulWidth / (h || 1)))
            const rows = Math.ceil(c / fits)
            const ml = Math.round(rows * w * 100) / 100
            candidates.push({ bobina: b.ancho, ml, rotated: true, hasStock: b.stock >= ml && b.stock > 0, stock: b.stock })
        }
    }

    if (candidates.length === 0) {
        const widest = availableWidths[availableWidths.length - 1]
        const fits = Math.max(1, Math.floor((widest?.usefulWidth || 1.36) / (w || 1)))
        const rows = Math.ceil(c / fits)
        const ml = Math.round(rows * h * 100) / 100
        const stock = widest ? widest.stock : toNum(mat.stockActual)
        return {
            bobina: widest ? widest.ancho : null,
            consumo: ml,
            hasStock: stock >= ml && stock > 0,
            availableStock: stock
        }
    }

    // Ordenar: primero los que tienen stock suficiente en taller
    candidates.sort((a, b) => {
        if (a.hasStock !== b.hasStock) return a.hasStock ? -1 : 1
        if (is150Piece) {
            const a152 = a.bobina >= 1.48 && a.bobina <= 1.53
            const b152 = b.bobina >= 1.48 && b.bobina <= 1.53
            if (a152 && !b152) return -1
            if (!a152 && b152) return 1
        }
        const areaA = a.bobina * a.ml
        const areaB = b.bobina * b.ml
        if (Math.abs(areaA - areaB) > 0.05) return areaA - areaB
        if (Math.abs(a.ml - b.ml) > 0.01) return a.ml - b.ml
        if (a.rotated !== b.rotated) return a.rotated ? 1 : -1
        return a.bobina - b.bobina
    })

    const best = candidates[0]
    return {
        bobina: best.bobina,
        consumo: best.ml,
        hasStock: best.hasStock,
        availableStock: best.stock
    }
}

export interface OrderStockEvaluation {
    hasStock: boolean
    availableStock: number
    requiredStock: number
    suggestedBobina: number | null
    warningReason?: string
}

/**
 * Evalúa la disponibilidad de stock para una orden específica frente al stock actual de materiales.
 */
export function evaluateOrderStock(order: Order, materials: Material[]): OrderStockEvaluation {
    // Si la orden ya descontó stock o está terminada/anulada/eliminada, no requiere stock adicional
    if (order.stockDescontado || order.status === 'finalizado' || order.status === 'anulado' || order.status === 'eliminado') {
        return { hasStock: true, availableStock: 0, requiredStock: 0, suggestedBobina: null }
    }

    const code = String(order.material || '').trim().toLowerCase()
    if (!code) {
        return { hasStock: true, availableStock: 0, requiredStock: 0, suggestedBobina: null }
    }

    const mat = findMatchingMaterial(code, materials)
    if (!mat) {
        return { hasStock: false, availableStock: 0, requiredStock: 0, suggestedBobina: null, warningReason: 'Material no encontrado' }
    }

    const res = resolveBestBobinaForOrder(order, mat)
    return {
        hasStock: res.hasStock,
        availableStock: res.availableStock,
        requiredStock: res.consumo,
        suggestedBobina: res.bobina,
        warningReason: res.hasStock ? undefined : (res.availableStock <= 0 ? 'Sin stock disponible' : 'Stock insuficiente')
    }
}

/**
 * Enriquece y sincroniza reactivamente las órdenes con el stock actual de materiales.
 * - Si el usuario agregó stock del material, el stockWarning se desactiva (false).
 * - Sincroniza la bobina óptima con stock asignada (bobinaAsignada).
 */
export function enrichOrdersWithCurrentStock(orders: Order[], materials: Material[]): Order[] {
    if (!Array.isArray(orders)) return []
    if (!Array.isArray(materials) || materials.length === 0) return orders

    return orders.map(order => {
        // No tocar órdenes ya finalizadas, anuladas o eliminadas
        if (order.status === 'finalizado' || order.status === 'anulado' || order.status === 'eliminado') {
            if (order.stockWarning) {
                return { ...order, stockWarning: false }
            }
            return order
        }

        const evaluation = evaluateOrderStock(order, materials)
        const newStockWarning = !evaluation.hasStock

        let updatedOrder = order
        if (order.stockWarning !== newStockWarning) {
            updatedOrder = { ...updatedOrder, stockWarning: newStockWarning }
        }

        // Si la orden aún no fue descontada y hay una bobina óptima resuelta, sincronizarla
        if (!order.stockDescontado && evaluation.suggestedBobina !== null) {
            const currentBobina = order.bobinaAsignada ? Number(order.bobinaAsignada) : null
            if (currentBobina !== evaluation.suggestedBobina || (order.consumoEstimado !== evaluation.requiredStock && evaluation.requiredStock > 0)) {
                updatedOrder = {
                    ...updatedOrder,
                    bobinaAsignada: evaluation.suggestedBobina,
                    consumoEstimado: evaluation.requiredStock
                }
            }
        }

        return updatedOrder
    })
}
