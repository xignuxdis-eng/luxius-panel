import JSZip from 'jszip'
import { API_URL, resolveMediaUrl, getAuthHeaders, getMateriales, getServicios } from '@data/db'
import type { Order } from '@/types'
import { calculateItemPriceDetailed } from './pricingCalculator'

/**
 * Sanitiza nombres de archivo eliminando caracteres ilegales en Windows/Linux/macOS
 */
export function sanitizeFileName(name: string): string {
    return name
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Determina el código corto limpio de material para nombrar carpetas y archivos
 */
export function resolveMaterialCode(order: Partial<Order>): string {
    const rawMat = (order.material || 'MAT').trim()
    let materialCode = rawMat
    try {
        const allMaterials = getMateriales()
        const foundMat = allMaterials.find(m =>
            (m.codigo && m.codigo.toLowerCase() === rawMat.toLowerCase()) ||
            (m.descripcion && m.descripcion.toLowerCase() === rawMat.toLowerCase())
        )
        if (foundMat && foundMat.codigo) {
            materialCode = foundMat.codigo.trim()
        }
    } catch { }
    return materialCode.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '') || 'MAT'
}

/**
 * Determina el ancho numérico de bobina asignado o deducido para una orden
 */
export function resolveOrderBobina(order: Partial<Order>): number | null {
    // 1. Directamente asignada en la orden o en precioDetalle
    const rawBobina = order.bobinaAsignada ?? (order.precioDetalle as any)?.bobinaAncho ?? (order.precioDetalle as any)?.bobinaUsada
    const num = parseFloat(String(rawBobina))
    if (!isNaN(num) && num > 0) {
        return num
    }

    // 2. Intentar calcular vía motor unificado de precios
    try {
        const calc = calculateItemPriceDetailed(
            order.material || '',
            Number(order.ancho) || 0,
            Number(order.alto) || 0,
            Number(order.copias) || 1,
            order.servicios as any,
            order.clientId || order.clienteNombre
        )
        if (calc.bobinaAsignada && !isNaN(Number(calc.bobinaAsignada)) && Number(calc.bobinaAsignada) > 0) {
            return Number(calc.bobinaAsignada)
        }
    } catch { }

    // 3. Fallback evaluando bobinas configuradas en el material
    try {
        const allMaterials = getMateriales()
        const mat = allMaterials.find(m =>
            (m.codigo && m.codigo.toLowerCase() === String(order.material || '').toLowerCase()) ||
            (m.descripcion && m.descripcion.toLowerCase() === String(order.material || '').toLowerCase())
        )
        if (mat?.bobinas && mat.bobinas.length > 0) {
            const rawW = Number(order.ancho) || 0
            const rawH = Number(order.alto) || 0
            const w = rawW > 20 ? rawW / 100 : rawW
            const h = rawH > 20 ? rawH / 100 : rawH
            const available = mat.bobinas
                .map((b: any) => ({ ancho: Number(b.ancho) || 0 }))
                .filter((b: any) => b.ancho > 0)
                .sort((a: any, b: any) => a.ancho - b.ancho)

            for (const b of available) {
                if (w <= b.ancho || h <= b.ancho) {
                    return b.ancho
                }
            }
            if (available.length > 0) {
                return available[available.length - 1].ancho
            }
        }
    } catch { }

    // 4. Default estándar para vinilos conocidos (VV, VVP)
    const matUpper = String(order.material || '').toUpperCase()
    if (matUpper === 'VV' || matUpper === 'VVP') {
        const rawW = Number(order.ancho) || 0
        const rawH = Number(order.alto) || 0
        const w = rawW > 20 ? rawW / 100 : rawW
        const h = rawH > 20 ? rawH / 100 : rawH
        return (w <= 1.365 || h <= 1.365) ? 1.37 : 1.52
    }

    return null
}

/**
 * Evalúa si una orden excede el umbral de 2.93m (paño individual > 2.93m en cualquier eje o por consumo/copias)
 */
export function isOrderExceedingThreshold(
    order: Partial<Order>,
    threshold = 2.93,
    consumoVal?: number,
    consumoUnit?: string
): boolean {
    const rawW = Number(order.ancho) || 0
    const rawH = Number(order.alto) || 0
    const w = Math.round((rawW > 20 ? rawW / 100 : rawW) * 100) / 100
    const h = Math.round((rawH > 20 ? rawH / 100 : rawH) * 100) / 100

    if (Math.max(w, h) > threshold) {
        return true
    }

    const copias = Math.max(1, Number(order.copias) || 1)
    const val = consumoVal !== undefined ? consumoVal : order.consumoEstimado
    const unit = consumoUnit || (order.precioDetalle?.tipoCobro === 'm2' ? 'm2' : 'ml')

    if (unit === 'ml' && val !== undefined && val > 0) {
        const largoDeUnPano = val / copias
        if (largoDeUnPano > threshold) {
            return true
        }
    }

    return false
}

/**
 * Determina la carpeta dentro del ZIP para una orden de lote/grupo:
 * - Carpeta nivel 1: [CodigoMaterial] [AnchoBobina] (ej: "VV 1.52", "VIN-BRI 1.37")
 *   Si el material no utiliza bobina (m² / rígido), se usa solo el [CodigoMaterial].
 * - Subcarpeta nivel 2: Si el archivo supera 2.93m (largo de paño > 2.93m o cualquier dimensión > 2.93m),
 *   se ubica dentro de la subcarpeta "Mayores a 2.93m" dentro de la carpeta del material/ancho correspondiente.
 */
export function getBatchOrderFolderPath(order: Partial<Order>): string {
    const matCode = resolveMaterialCode(order)
    const bobina = resolveOrderBobina(order)

    const folderName = bobina !== null
        ? `${matCode} ${bobina.toFixed(2)}`
        : matCode

    const isSpecial = isOrderExceedingThreshold(order, 2.93)
    if (isSpecial) {
        return `${folderName}/Mayores a 2.93m`
    }

    return folderName
}

/**
 * Genera el nombre estandarizado de producción para un archivo de una orden
 * Formato: OT-{otNumber}_x{copias}_{material}_{servicios}_{ancho}x{alto} --- {nombreOriginal}
 */
export function buildProductionFilename(order: Order, _index: number, originalName: string): string {
    let otRaw = String(order.ot || order.id || '0').trim()
    if (otRaw.toUpperCase().startsWith('OT-')) {
        otRaw = otRaw.slice(3).trim()
    } else if (otRaw.toUpperCase().startsWith('OT')) {
        otRaw = otRaw.slice(2).trim()
    }
    const otNumber = otRaw || '0'
    const copias = order.copias || 1

    // 1. Resolver código corto de material
    const materialCode = resolveMaterialCode(order)

    // 2. Resolver códigos cortos de servicios/acabados
    const serviceCodes: string[] = []
    if (order.servicios && typeof order.servicios === 'object') {
        try {
            const allServices = getServicios()
            Object.entries(order.servicios).forEach(([sId, active]) => {
                if (active) {
                    const s = allServices.find((serv) =>
                        String(serv.id) === String(sId) ||
                        (serv.codigo && serv.codigo.toLowerCase() === String(sId).toLowerCase()) ||
                        (serv.nombre && serv.nombre.toLowerCase() === String(sId).toLowerCase())
                    )
                    if (s && s.codigo) {
                        serviceCodes.push(s.codigo.trim().replace(/[^a-zA-Z0-9_-]/g, ''))
                    } else if (s && s.nombre) {
                        serviceCodes.push(s.nombre.substring(0, 4).toUpperCase().trim().replace(/[^a-zA-Z0-9_-]/g, ''))
                    } else if (typeof sId === 'string' && isNaN(Number(sId))) {
                        serviceCodes.push(sId.substring(0, 4).toUpperCase().trim().replace(/[^a-zA-Z0-9_-]/g, ''))
                    }
                }
            })
        } catch { }
    }

    const hasDimensionsRegex = /\d+[.,]?\d*\s*[xX]\s*\d+[.,]?\d*/
    const alreadyHasDimensions = hasDimensionsRegex.test(originalName)

    let dimString = ''
    if (!alreadyHasDimensions && order.ancho && order.alto) {
        dimString = `_${Number(order.ancho).toFixed(2)}x${Number(order.alto).toFixed(2)}`
    }

    // Ancho de bobina asignado o deducido
    const bobinaAsig = resolveOrderBobina(order)
    const bobinaStr = bobinaAsig ? `_bob${Number(bobinaAsig).toFixed(2).replace('.', '')}` : ''

    const servicesStr = serviceCodes.length > 0 ? `_${serviceCodes.join('_')}` : ''
    const prefix = `OT-${otNumber}_x${copias}_${materialCode}${servicesStr}${dimString}${bobinaStr}`

    if (originalName.startsWith(`OT-${otNumber}`) || originalName.startsWith('OT-')) {
        return sanitizeFileName(originalName)
    }

    return sanitizeFileName(`${prefix} --- ${originalName}`)
}

/**
 * Fallback para descargar imágenes vía Canvas en caso de restricciones CORS
 */
function downloadImageViaCanvas(imageUrl: string): Promise<Blob | null> {
    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth || img.width
                canvas.height = img.naturalHeight || img.height
                const ctx = canvas.getContext('2d')
                if (!ctx) return resolve(null)
                ctx.drawImage(img, 0, 0)
                canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95)
            } catch (e) {
                console.warn('[Canvas Download] Fallback error:', e)
                resolve(null)
            }
        }
        img.onerror = () => resolve(null)
        img.src = imageUrl
    })
}

/**
 * Descarga el contenido binario (Blob) de cualquier archivo remoto, local o base64
 */
export async function fetchFileBlob(rawUrl: string, filename: string): Promise<Blob | null> {
    const url = resolveMediaUrl(rawUrl)

    // Data URLs
    if (url.startsWith('data:')) {
        try {
            const res = await fetch(url)
            return await res.blob()
        } catch {
            return null
        }
    }

    // Detectar almacenamiento externo (R2 / S3)
    const isExternalStorage = url.includes('r2.cloudflarestorage.com') ||
        url.includes('s3.amazonaws.com') ||
        url.includes('.r2.dev') ||
        (url.includes('X-Amz-Signature') && url.includes('X-Amz-Credential'))

    const token = localStorage.getItem('luxius_auth_token') || ''
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''

    if (isExternalStorage) {
        const proxyUrl = `${API_URL}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}${tokenParam}`
        try {
            const proxyResp = await fetch(proxyUrl, { headers: getAuthHeaders() })
            if (proxyResp.ok) {
                return await proxyResp.blob()
            }
        } catch (e) {
            console.warn('[fetchFileBlob] Proxy fetch failed:', e)
        }
    }

    // Descarga directa con headers de autenticación
    try {
        const res = await fetch(url, { headers: getAuthHeaders() })
        if (res.ok) {
            return await res.blob()
        }
    } catch (e) {
        console.warn('[fetchFileBlob] Direct fetch failed, trying canvas fallback:', e)
    }

    // Fallback Canvas para imágenes
    if (url.match(/\.(jpg|jpeg|png|webp|bmp|gif)$/i)) {
        const canvasBlob = await downloadImageViaCanvas(url)
        if (canvasBlob) return canvasBlob
    }

    // Fallback final mediante el endpoint proxy del backend
    try {
        const proxyUrl = `${API_URL}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}${tokenParam}`
        const proxyResp = await fetch(proxyUrl, { headers: getAuthHeaders() })
        if (proxyResp.ok) {
            return await proxyResp.blob()
        }
    } catch (e) {
        console.warn('[fetchFileBlob] Proxy fallback failed:', e)
    }

    return null
}

/**
 * Dispara la descarga de un Blob en el navegador
 */
export function triggerBlobDownload(blob: Blob, filename: string) {
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = sanitizeFileName(filename)
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
        URL.revokeObjectURL(blobUrl)
        try { document.body.removeChild(a) } catch (e) { }
    }, 1200)
}

/**
 * Asegura nombres y rutas únicas dentro de un archivo ZIP para que no colisionen
 */
export function getUniqueZipFileName(existingNames: Set<string>, desiredPath: string): string {
    const lower = desiredPath.toLowerCase()
    if (!existingNames.has(lower)) {
        existingNames.add(lower)
        return desiredPath
    }
    const lastSlash = desiredPath.lastIndexOf('/')
    const dir = lastSlash >= 0 ? desiredPath.slice(0, lastSlash + 1) : ''
    const filename = lastSlash >= 0 ? desiredPath.slice(lastSlash + 1) : desiredPath

    const lastDot = filename.lastIndexOf('.')
    const base = lastDot > 0 ? filename.slice(0, lastDot) : filename
    const ext = lastDot > 0 ? filename.slice(lastDot) : ''

    let counter = 2
    while (existingNames.has(`${dir}${base} (${counter})${ext}`.toLowerCase())) {
        counter++
    }
    const finalPath = `${dir}${base} (${counter})${ext}`
    existingNames.add(finalPath.toLowerCase())
    return finalPath
}

/**
 * Genera el nombre del ZIP según el contexto:
 * - Grupo con lote: Lote_[NombreLote]_[Fecha]_[Cantidad]OTs.zip
 * - Mismo cliente: Imagenes_[Cliente]_[Fecha]_[Cantidad]OTs.zip
 * - Mixto / general: Ordenes_Seleccionadas_[Fecha]_[Cantidad]OTs.zip
 */
export function generateZipFilename({ batchName, orders }: { batchName?: string; orders: Order[] }): string {
    const dateStr = new Date().toISOString().slice(0, 10)
    const orderCount = orders.length

    if (batchName && batchName.trim()) {
        const clean = sanitizeFileName(batchName.trim())
        return `${clean.startsWith('Lote') ? clean : `Lote_${clean}`}_${dateStr}_${orderCount}OTs.zip`
    }

    const distinctBatches = Array.from(new Set(orders.map(o => o.loteNombre).filter(Boolean)))
    if (distinctBatches.length === 1 && distinctBatches[0]) {
        const clean = sanitizeFileName(distinctBatches[0])
        return `${clean.startsWith('Lote') ? clean : `Lote_${clean}`}_${dateStr}_${orderCount}OTs.zip`
    }

    const distinctClients = Array.from(new Set(orders.map(o => (o.clienteNombre || '').trim()).filter(Boolean)))
    if (distinctClients.length === 1 && distinctClients[0]) {
        return `Imagenes_${sanitizeFileName(distinctClients[0])}_${dateStr}_${orderCount}OTs.zip`
    }

    return `Ordenes_Seleccionadas_${dateStr}_${orderCount}OTs.zip`
}

/**
 * Genera el nombre del ZIP para una sola orden con múltiples archivos
 */
export function generateSingleOrderZipFilename(order: Order): string {
    const otRaw = String(order.ot || order.id || '0').trim()
    const otStr = otRaw.toUpperCase().startsWith('OT') ? otRaw : `OT-${otRaw}`
    const clientStr = sanitizeFileName(order.clienteNombre || 'Cliente')
    const dateStr = new Date().toISOString().slice(0, 10)
    const count = order.archivos?.length || 0
    return `${otStr}_${clientStr}_${dateStr}_${count}archivos.zip`
}

export interface DownloadProgressState {
    active: boolean
    current: number
    total: number
    percent: number
    message: string
}

/**
 * Descarga individual de archivos de una orden.
 * - Si tiene 1 archivo: descarga directa con nombre estandarizado de producción.
 * - Si tiene 2+ archivos: los empaqueta en un ZIP específico de la orden.
 */
export async function downloadSingleOrderFiles(
    order: Order,
    onProgress?: (progress: DownloadProgressState) => void
): Promise<boolean> {
    if (!order.archivos || order.archivos.length === 0) {
        alert(`La orden ${order.ot || order.id} no posee archivos adjuntos.`)
        return false
    }

    // 1 archivo: Descarga directa
    if (order.archivos.length === 1) {
        onProgress?.({ active: true, current: 0, total: 1, percent: 10, message: 'Descargando archivo...' })
        const file = order.archivos[0]
        const origName = order.archivosOriginales?.[0] || file.split('/').pop()?.split('?')[0] || `archivo_${order.id}`
        const prodName = buildProductionFilename(order, 0, origName)
        const blob = await fetchFileBlob(file, prodName)

        if (blob) {
            triggerBlobDownload(blob, prodName)
            onProgress?.({ active: false, current: 1, total: 1, percent: 100, message: '¡Descarga completada!' })
            return true
        } else {
            // Fallback proxy en pestaña
            const url = resolveMediaUrl(file)
            const token = localStorage.getItem('luxius_auth_token') || ''
            const proxyUrl = `${API_URL}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(prodName)}&token=${encodeURIComponent(token)}`
            window.open(proxyUrl, '_blank')
            onProgress?.({ active: false, current: 1, total: 1, percent: 100, message: 'Abierto en navegador' })
            return true
        }
    }

    // Múltiples archivos: Generar ZIP de la orden
    onProgress?.({ active: true, current: 0, total: order.archivos.length, percent: 5, message: 'Preparando ZIP de la orden...' })
    const zip = new JSZip()
    const existingNames = new Set<string>()

    for (let i = 0; i < order.archivos.length; i++) {
        const file = order.archivos[i]
        const origName = order.archivosOriginales?.[i] || file.split('/').pop()?.split('?')[0] || `archivo_${i + 1}`
        const prodName = buildProductionFilename(order, i, origName)
        const uniqueName = getUniqueZipFileName(existingNames, prodName)

        const pct = Math.round(((i) / order.archivos.length) * 80) + 10
        onProgress?.({ active: true, current: i, total: order.archivos.length, percent: pct, message: `Descargando archivo ${i + 1} de ${order.archivos.length}...` })

        const blob = await fetchFileBlob(file, uniqueName)
        if (blob) {
            zip.file(uniqueName, blob)
        }
    }

    onProgress?.({ active: true, current: order.archivos.length, total: order.archivos.length, percent: 90, message: 'Comprimiendo ZIP...' })
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipName = generateSingleOrderZipFilename(order)
    triggerBlobDownload(zipBlob, zipName)

    onProgress?.({ active: false, current: order.archivos.length, total: order.archivos.length, percent: 100, message: '¡Descarga completada!' })
    return true
}

/**
 * Descarga por lotes (grupo o seleccionadas) reuniendo todas las imágenes en un ZIP.
 * Maneja cola con concurrencia controlada (3 simultáneos) y reporta progreso.
 */
export async function downloadBatchOrdersZip(
    orders: Order[],
    batchName?: string,
    onProgress?: (progress: DownloadProgressState) => void
): Promise<boolean> {
    const ordersWithFiles = orders.filter(o => o.archivos && o.archivos.length > 0)
    if (ordersWithFiles.length === 0) {
        alert('Ninguna de las órdenes seleccionadas posee archivos adjuntos.')
        return false
    }

    interface QueueItem {
        order: Order
        fileIndex: number
        fileUrl: string
        originalName: string
        targetName: string
    }

    const queue: QueueItem[] = []
    const existingNames = new Set<string>()

    for (const order of ordersWithFiles) {
        const folderPath = getBatchOrderFolderPath(order)
        for (let i = 0; i < order.archivos!.length; i++) {
            const file = order.archivos![i]
            const orig = order.archivosOriginales?.[i] || file.split('/').pop()?.split('?')[0] || `archivo_${order.id}_${i + 1}`
            const prodName = buildProductionFilename(order, i, orig)
            const targetPath = `${folderPath}/${prodName}`
            const uniqueName = getUniqueZipFileName(existingNames, targetPath)
            queue.push({
                order,
                fileIndex: i,
                fileUrl: file,
                originalName: orig,
                targetName: uniqueName
            })
        }
    }

    const totalFiles = queue.length
    const zip = new JSZip()
    let completedCount = 0
    const failedFiles: string[] = []

    onProgress?.({ active: true, current: 0, total: totalFiles, percent: 2, message: `Iniciando descarga de ${totalFiles} archivo(s)...` })

    // Descarga en bloques de 3 concurrentes
    const CHUNK_SIZE = 3
    for (let i = 0; i < queue.length; i += CHUNK_SIZE) {
        const chunk = queue.slice(i, i + CHUNK_SIZE)
        await Promise.all(chunk.map(async (item) => {
            try {
                const blob = await fetchFileBlob(item.fileUrl, item.targetName)
                if (blob) {
                    zip.file(item.targetName, blob)
                } else {
                    failedFiles.push(`${item.targetName} (${item.fileUrl})`)
                }
            } catch (err) {
                console.warn(`[BatchZip] Error fetching ${item.targetName}:`, err)
                failedFiles.push(`${item.targetName} (${item.fileUrl})`)
            } finally {
                completedCount++
                const pct = Math.round((completedCount / totalFiles) * 85)
                onProgress?.({
                    active: true,
                    current: completedCount,
                    total: totalFiles,
                    percent: Math.max(5, pct),
                    message: `Descargando archivo ${completedCount} de ${totalFiles}...`
                })
            }
        }))
    }

    if (failedFiles.length > 0) {
        zip.file('archivos_no_descargados.txt', `Los siguientes archivos no pudieron ser descargados del servidor:\n\n${failedFiles.join('\n')}`)
    }

    onProgress?.({ active: true, current: totalFiles, total: totalFiles, percent: 90, message: 'Comprimiendo archivo ZIP...' })
    const zipBlob = await zip.generateAsync({ type: 'blob' }, (meta) => {
        const zipPct = 90 + Math.round((meta.percent / 100) * 9)
        onProgress?.({ active: true, current: totalFiles, total: totalFiles, percent: zipPct, message: `Empaquetando ZIP: ${meta.percent.toFixed(0)}%` })
    })

    const zipFilename = generateZipFilename({ batchName, orders: ordersWithFiles })
    triggerBlobDownload(zipBlob, zipFilename)

    onProgress?.({ active: false, current: totalFiles, total: totalFiles, percent: 100, message: '¡Descarga completada!' })
    return true
}
