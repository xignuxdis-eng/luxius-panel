import type { Order, Cliente, Material } from '@/types'
import { runNesting, type NestingItem } from '@/utils/nestingEngine'
import type { GroupedItem } from '../types/entrada.types'
import { calculateOrderPrice, getConsumption } from './entradaCalculations'

export function getBatchInfo(order: Order): { key: string; name: string } | null {
    if (order.batchId) {
        return {
            key: order.batchId,
            name: order.loteNombre || order.nombreTarea || 'Lote de Impresión'
        }
    }

    if (order.loteNombre && order.loteNombre.trim().length > 0) {
        return {
            key: `lote_${order.clientId || '0'}_${order.loteNombre.trim().toLowerCase()}`,
            name: order.loteNombre.trim()
        }
    }

    const text = (order.nombreTarea || order.observaciones || '').trim()
    if (text && text.includes(' - ')) {
        const prefix = text.split(' - ')[0].trim()
        if (prefix.length > 2 && !prefix.startsWith('Proyecto #') && !prefix.startsWith('Proyecto OT-')) {
            return {
                key: `lote_${order.clientId || '0'}_${prefix.toLowerCase()}`,
                name: prefix
            }
        }
    }

    return null
}

/**
 * Agrupa un listado plano de órdenes en lotes (`GroupedBatch`) y filas individuales,
 * calculando consumo de bobinas con Nesting 2D y ordenando por bobina/material.
 */
export function groupOrdersIntoBatches(
    displayedOrders: Order[],
    selectedIds: Set<string>,
    allMateriales: Material[],
    allClientes: Cliente[]
): GroupedItem[] {
    const batchesMap = new Map<string, { name: string; orders: Order[] }>()

    displayedOrders.forEach(order => {
        const bInfo = getBatchInfo(order)
        if (bInfo) {
            if (!batchesMap.has(bInfo.key)) {
                batchesMap.set(bInfo.key, { name: bInfo.name, orders: [] })
            }
            batchesMap.get(bInfo.key)!.orders.push(order)
        }
    })

    const result: GroupedItem[] = []
    const processedBatches = new Set<string>()

    displayedOrders.forEach(order => {
        const bInfo = getBatchInfo(order)

        if (bInfo && (batchesMap.get(bInfo.key)?.orders.length || 0) > 1) {
            if (processedBatches.has(bInfo.key)) return
            processedBatches.add(bInfo.key)

            const batchData = batchesMap.get(bInfo.key)!
            const batchList = batchData.orders
            let totalPrice = 0
            let totalM2 = 0
            let totalMl = 0
            let rawTotalMl = 0
            let totalCopies = 0
            let selectedCount = 0
            const mlByBobina: Record<string, number> = {}

            const mlOrders: Order[] = []
            batchList.forEach(o => {
                totalPrice += calculateOrderPrice(o, allMateriales, allClientes)
                totalCopies += (o.copias || 1)
                if (selectedIds.has(String(o.id || o.ot))) selectedCount++

                const cons = getConsumption(o, allMateriales)
                if (cons.unit === 'ml') {
                    mlOrders.push(o)
                } else {
                    totalM2 += cons.value
                }
            })

            if (mlOrders.length > 0) {
                const ordersByGroup = new Map<string, { bNum: number; orders: Order[] }>()
                mlOrders.forEach(o => {
                    const cons = getConsumption(o, allMateriales)
                    const bNum = Number(cons.bobina) || 1.52
                    const matCode = o.material || 'SIN_MAT'
                    const key = `${matCode}|${bNum}`
                    if (!ordersByGroup.has(key)) {
                        ordersByGroup.set(key, { bNum, orders: [] })
                    }
                    ordersByGroup.get(key)!.orders.push(o)
                })

                ordersByGroup.forEach((group, key) => {
                    const bobinaNum = group.bNum
                    const bOrders = group.orders
                    if (bOrders.length > 1) {
                        const nestingItems: NestingItem[] = bOrders.map(o => ({
                            id: o.id || o.ot,
                            ot: o.ot,
                            label: o.descripcionItem || o.nombreTarea || `OT-${o.id}`,
                            width: Number(o.ancho) || 0,
                            height: Number(o.alto) || 0,
                            copies: Number(o.copias) || 1,
                            orderId: o.id
                        }))

                        const nResult = runNesting(nestingItems, { rollWidth: bobinaNum })
                        totalMl += nResult.linearMeters
                        rawTotalMl += nResult.rawLinearMeters
                        mlByBobina[key] = (mlByBobina[key] || 0) + nResult.linearMeters
                    } else {
                        const singleCons = getConsumption(bOrders[0], allMateriales)
                        totalMl += singleCons.value
                        rawTotalMl += singleCons.value
                        mlByBobina[key] = (mlByBobina[key] || 0) + singleCons.value
                    }
                })
            }

            const savingsMeters = Math.max(0, rawTotalMl - totalMl)
            const savingsPercent = rawTotalMl > 0 ? Math.round((savingsMeters / rawTotalMl) * 100) : 0

            const batchListOrdenada = [...batchList].sort((a, b) => {
                const ba = parseFloat(String(getConsumption(a, allMateriales).bobina)) || 1.52
                const bb = parseFloat(String(getConsumption(b, allMateriales).bobina)) || 1.52
                if (ba !== bb) return ba - bb
                const ma = String(a.material || '')
                const mb = String(b.material || '')
                if (ma !== mb) return ma.localeCompare(mb)
                return 0
            })

            result.push({
                isBatch: true,
                batchId: bInfo.key,
                batchName: batchData.name,
                orders: batchListOrdenada,
                primaryOrder: batchListOrdenada[0],
                totalPrice,
                totalConsumption: {
                    m2: totalM2,
                    ml: totalMl,
                    mlByBobina,
                    rawMl: rawTotalMl,
                    savingsPercent,
                    savingsMeters
                },
                totalCopies,
                allSelected: selectedCount === batchList.length && batchList.length > 0,
                someSelected: selectedCount > 0 && selectedCount < batchList.length
            })
        } else if (!bInfo || (batchesMap.get(bInfo.key)?.orders.length || 0) <= 1) {
            result.push({ isBatch: false, order })
        }
    })

    return result
}
