import type { Order } from '@/types'
import type { RipLog } from './ripLogParser'

export interface ReconciledItem {
    id: number
    cliente: string
    trabajo: string
    material: string
    teorico: { m2: number }
    real: { m2: number; totalInkMl: number; logsCount: number }
    efficiency: { m2: number; inkRatio: number }
    consumoEstimado: number
    stockWarning: boolean
    status: 'consolidated' | 'pending'
    matched?: boolean
}

const RIP_LOGS_KEY = 'luxius_rip_logs'

export function getRipLogs(): RipLog[] {
    const raw = localStorage.getItem(RIP_LOGS_KEY)
    if (!raw) return []
    try { return JSON.parse(raw) as RipLog[] } catch { return [] }
}

export function saveRipLogs(logs: RipLog[]): void {
    localStorage.setItem(RIP_LOGS_KEY, JSON.stringify(logs))
}

function normalizeName(name: string): string {
    return name.toLowerCase().replace(/\.[a-z0-9]+$/i, '').trim()
}

function orderFileNames(order: Order): string[] {
    const names: string[] = []
    ;(order.archivosOriginales || []).forEach(n => { if (n) names.push(normalizeName(n)) })
    ;(order.archivos || []).forEach(u => {
        const base = (u.split('/').pop() || '').split('?')[0]
        if (base) names.push(normalizeName(decodeURIComponent(base)))
    })
    return names.filter(Boolean)
}

export function reconcileRipLogs(orders: Order[], logs: RipLog[]): ReconciledItem[] {
    const printedStatuses = ['impreso', 'post', 'completo', 'entregado', 'finalizado']

    const logByJob = new Map<string, RipLog>()
    logs.forEach(l => {
        const key = normalizeName(l.jobName)
        if (!logByJob.has(key)) logByJob.set(key, l)
    })

    const usedLogs = new Set<string>()

    const items = orders.map(o => {
        const w = Number(o.ancho) || 0
        const h = Number(o.alto) || 0
        const c = Number(o.copias) || 1
        const teorico = Math.round(w * h * c * 1000) / 1000
        const cliente = o.clienteNombre || 'Cliente'
        const trabajo = o.ot || `OT-${o.id}`
        const material = o.material || 'Vinilo'

        let log: RipLog | undefined
        for (const fn of orderFileNames(o)) {
            if (logByJob.has(fn)) { log = logByJob.get(fn); break }
        }
        if (!log) {
            const ot = normalizeName(o.ot || '')
            for (const [name, l] of logByJob.entries()) {
                if (ot && (name.includes(ot) || ot.includes(name))) { log = l; break }
            }
        }

        if (log) {
            usedLogs.add(normalizeName(log.jobName))
            const eff = teorico > 0 ? log.m2 / teorico : 0
            const inkRatio = log.m2 > 0 ? log.totalInkMl / 1000 / log.m2 : 0
            return {
                id: Number(o.id) || 0,
                cliente,
                trabajo,
                material: log.mediaName || material,
                teorico: { m2: teorico },
                real: { m2: log.m2, totalInkMl: log.totalInkMl, logsCount: 1 },
                efficiency: { m2: Math.round(eff * 1000) / 1000, inkRatio: Math.round(inkRatio * 100000) / 100000 },
                consumoEstimado: teorico,
                stockWarning: false,
                status: 'consolidated' as const,
                matched: true
            }
        }

        const isPrinted = printedStatuses.includes(o.status)
        const totalInkMl = Math.round(teorico * 4 * 4 * 10) / 10
        return {
            id: Number(o.id) || 0,
            cliente,
            trabajo,
            material,
            teorico: { m2: teorico },
            real: isPrinted ? { m2: teorico, totalInkMl, logsCount: 0 } : { m2: 0, totalInkMl: 0, logsCount: 0 },
            efficiency: isPrinted ? { m2: 1, inkRatio: 0.016 } : { m2: 0, inkRatio: 0 },
            consumoEstimado: teorico,
            stockWarning: false,
            status: (isPrinted ? 'consolidated' : 'pending') as 'consolidated' | 'pending',
            matched: false
        }
    })

    return items
}
