import type { Material, Order } from '@/types'
import { saveMaterial } from '@/data/db'

export interface MissingVariation {
    codigo: string
    descripcion: string
    ancho: number
    fromOrden: string
}

export interface MaterialAuditResult {
    totalOrders: number
    totalMaterials: number
    missingVariations: MissingVariation[]
}

function findMaterial(materials: Material[], matCode: string): Material | undefined {
    const lower = matCode.toLowerCase()
    return materials.find(m =>
        String(m.codigo).toLowerCase() === lower ||
        String(m.descripcion || '').toLowerCase() === lower
    )
}

/**
 * Audita las órdenes de trabajo contra el catálogo de materiales para detectar
 * variaciones de ancho/bobina que existen en las órdenes pero no están
 * registradas en el material correspondiente.
 */
export function auditMaterials(orders: Order[], materials: Material[]): MaterialAuditResult {
    const missingVariations: MissingVariation[] = []
    const seen = new Set<string>()

    orders.forEach(order => {
        const matCode = (order.material || '').toString().trim()
        if (!matCode) return

        const width = Number(order.bobinaAsignada ?? order.precioDetalle?.bobinaAncho ?? order.precioDetalle?.bobinaUsada)
        if (!width || width <= 0) return

        const mat = findMaterial(materials, matCode)
        if (!mat) return

        const isMl = mat.tipoCobro === 'ml'
        const hasWidth = isMl
            ? (mat.bobinas || []).some(b => Math.abs(Number(b.ancho) - width) < 0.001)
            : Math.abs(Number(mat.ancho || 0) - width) < 0.001

        if (!hasWidth) {
            const key = `${String(mat.codigo).toLowerCase()}:${width}`
            if (!seen.has(key)) {
                seen.add(key)
                missingVariations.push({
                    codigo: String(mat.codigo),
                    descripcion: mat.descripcion,
                    ancho: width,
                    fromOrden: order.ot || String(order.id)
                })
            }
        }
    })

    return {
        totalOrders: orders.length,
        totalMaterials: materials.length,
        missingVariations
    }
}

/**
 * Sincroniza el catálogo de materiales con las variaciones detectadas en las
 * órdenes: agrega al material (tipoCobro 'ml') las bobinas/anchos faltantes.
 * Devuelve cuántas variaciones se agregaron y el detalle de la auditoría.
 */
export function syncMaterialVariations(orders: Order[], materials: Material[]): { added: number; audit: MaterialAuditResult } {
    const audit = auditMaterials(orders, materials)

    // Agrupar anchos faltantes por código de material
    const byCodigo = new Map<string, number[]>()
    audit.missingVariations.forEach(v => {
        const key = v.codigo.toLowerCase()
        const list = byCodigo.get(key) || []
        if (!list.some(w => Math.abs(w - v.ancho) < 0.001)) {
            list.push(v.ancho)
        }
        byCodigo.set(key, list)
    })

    let added = 0
    byCodigo.forEach((widths, codigo) => {
        const mat = findMaterial(materials, codigo)
        if (!mat || mat.tipoCobro !== 'ml') return

        const existing = mat.bobinas || []
        const defaultPrice = existing.length > 0
            ? existing.reduce((sum, b) => sum + Number(b.precioML || 0), 0) / existing.length
            : 0

        const merged = [...existing]
        widths.forEach(w => {
            if (!merged.some(b => Math.abs(Number(b.ancho) - w) < 0.001)) {
                merged.push({ ancho: w, precioML: defaultPrice })
                added++
            }
        })

        if (merged.length !== existing.length) {
            merged.sort((a, b) => Number(a.ancho) - Number(b.ancho))
            saveMaterial({ ...mat, bobinas: merged })
        }
    })

    return { added, audit }
}
