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

const ACTIVE_STATUSES = new Set([
    'relevamiento', 'diseno', 'preorden', 'orden', 'impreso', 'post', 'completo', 'standby'
])

const SEVERITY_RANK: Record<ForecastSeverity, number> = { ok: 1, low: 2, critical: 3 }

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
        return toNum(order.consumoEstimado ?? order.precioDetalle?.consumoML)
    }
    if (mat && (mat.unidad === 'un' || mat.unidad === 'plancha' || mat.unidad === 'Litros')) {
        return toNum(order.copias || 1)
    }
    return toNum(order.ancho) * toNum(order.alto) * toNum(order.copias || 1)
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
    const activeOrders = orders.filter(o => ACTIVE_STATUSES.has(o.status))

    activeOrders.forEach(order => {
        const code = String(order.material || '').trim()
        if (!code) return
        const mat = matByCodigo.get(code.toLowerCase())
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
        g.shortfallCodigos = g.codigos.filter(c => {
            const sev = codigoSeverity.get(c.toLowerCase())
            return sev === 'critical' || sev === 'low'
        })
        const hasCritical = g.codigos.some(c => codigoSeverity.get(c.toLowerCase()) === 'critical')
        const hasLow = g.codigos.some(c => codigoSeverity.get(c.toLowerCase()) === 'low')
        g.riskLevel = hasCritical ? 'critical' : hasLow ? 'low' : 'ok'
        groups.push(g)
    })

    const criticalCount = items.filter(u => u.severity === 'critical').length
    const lowCount = items.filter(u => u.severity === 'low').length
    const groupsAtRisk = groups.filter(g => g.riskLevel === 'critical')

    return { items, groups, criticalCount, lowCount, groupsAtRisk }
}
