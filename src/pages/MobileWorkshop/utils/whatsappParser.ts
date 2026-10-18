/**
 * LuXius WhatsApp & Webhook Smart Parser
 * 
 * Extracts download links (WeTransfer, Google Drive, Dropbox, OneDrive),
 * dimensions, copies, materials, and clients from raw text messages received via WhatsApp or Share Target.
 */

import { Cliente, Material } from '@/types'

export interface ParsedWhatsAppOrder {
    rawText: string
    detectedUrls: string[]
    primaryUrl?: string
    urlProvider?: 'wetransfer' | 'gdrive' | 'dropbox' | 'onedrive' | 'mega' | 'otro'
    ancho: number // en metros
    alto: number // en metros
    copias: number
    materialNombre?: string
    matchedCliente?: Cliente
    detectedClientName?: string
    observaciones: string
    confianza: {
        url: boolean
        medidas: boolean
        material: boolean
        cliente: boolean
    }
}

/**
 * Identify provider from link
 */
export function identifyUrlProvider(url: string): 'wetransfer' | 'gdrive' | 'dropbox' | 'onedrive' | 'mega' | 'otro' {
    const lower = url.toLowerCase()
    if (lower.includes('we.tl') || lower.includes('wetransfer.com')) return 'wetransfer'
    if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) return 'gdrive'
    if (lower.includes('dropbox.com')) return 'dropbox'
    if (lower.includes('1drv.ms') || lower.includes('onedrive.live.com')) return 'onedrive'
    if (lower.includes('mega.nz')) return 'mega'
    return 'otro'
}

/**
 * Smart parsing function
 */
export function parseWhatsAppMessage(
    text: string,
    clientesDisponibles: Cliente[] = [],
    materialesDisponibles: Material[] = []
): ParsedWhatsAppOrder {
    const cleanText = text.trim()
    const result: ParsedWhatsAppOrder = {
        rawText: cleanText,
        detectedUrls: [],
        ancho: 1.0,
        alto: 1.0,
        copias: 1,
        observaciones: cleanText,
        confianza: {
            url: false,
            medidas: false,
            material: false,
            cliente: false,
        }
    }

    if (!cleanText) return result

    // 1. Extraer URLs
    const urlRegex = /(https?:\/\/[^\s]+)/gi
    const foundUrls = cleanText.match(urlRegex) || []
    if (foundUrls.length > 0) {
        // Limpiar puntuación final si la URL termina en punto, coma o paréntesis
        result.detectedUrls = foundUrls.map(u => u.replace(/[.,;!?)]+$/, ''))
        result.primaryUrl = result.detectedUrls[0]
        result.urlProvider = identifyUrlProvider(result.primaryUrl)
        result.confianza.url = true
    }

    // 2. Extraer Medidas (Ancho x Alto)
    // Ejemplos: "2.5 x 1.20", "2x1", "200x100 cm", "150 x 80 mts", "medidas 3 x 1.5"
    const dimensionRegex = /(?:medidas?|tam[aã]ño)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:x|\*|por)\s*(\d+(?:[.,]\d+)?)\s*(cm|cms|m|mt|mts|mm)?\b/i
    const dimMatch = cleanText.match(dimensionRegex)

    if (dimMatch) {
        let val1 = parseFloat(dimMatch[1].replace(',', '.'))
        let val2 = parseFloat(dimMatch[2].replace(',', '.'))
        const unit = (dimMatch[3] || '').toLowerCase()

        if (unit.startsWith('cm')) {
            val1 = val1 / 100
            val2 = val2 / 100
        } else if (unit === 'mm') {
            val1 = val1 / 1000
            val2 = val2 / 1000
        } else if (!unit) {
            // Heurística: si es mayor a 15, es casi seguro cm (ej: 150x80 = 1.5x0.8)
            if (val1 >= 15 || val2 >= 15) {
                val1 = val1 / 100
                val2 = val2 / 100
            }
        }

        // Redondear a 2 decimales
        result.ancho = Math.round(val1 * 100) / 100
        result.alto = Math.round(val2 * 100) / 100
        result.confianza.medidas = true
    }

    // 3. Extraer Copias / Cantidad
    const copiasRegex = /(?:(\d+)\s*(?:u|unid|unidades|copias|cant|cantidad|lonas|vinilos|banners|carteles|placas)\b)|(?:(?:cant|cantidad|copias)\s*[:=]?\s*(\d+))/i
    const copiasMatch = cleanText.match(copiasRegex)
    if (copiasMatch) {
        const qty = parseInt(copiasMatch[1] || copiasMatch[2], 10)
        if (!isNaN(qty) && qty > 0) {
            result.copias = qty
        }
    }

    // 4. Extraer Material
    const lowerText = cleanText.toLowerCase()
    const materialKeywords: Record<string, string> = {
        'lona front': 'Lona Front',
        'frontlight': 'Lona Front',
        'front': 'Lona Front',
        'lona back': 'Lona Backlight',
        'backlight': 'Lona Backlight',
        'lona blackout': 'Lona Blackout',
        'blackout': 'Lona Blackout',
        'vinilo mate': 'Vinilo Mate',
        'vinilo brillante': 'Vinilo Brillante',
        'microperforado': 'Microperforado',
        'vinilo': 'Vinilo',
        'lienzo': 'Lienzo Canvas',
        'canvas': 'Lienzo Canvas',
        'banner': 'Lona Front',
        'corrugado': 'Corrugado Plástico',
        'alto impacto': 'Alto Impacto',
        'pvc espumado': 'PVC Espumado',
        'foamboard': 'Foamboard',
    }

    // Nombre legible de un material. `descripcion` es el campo canónico; `nombre`
    // y `codigo` son fallbacks para registros viejos o incompletos. Antes se
    // llamaba directo a `m.nombre.toLowerCase()`, que rompía con materiales
    // guardados sin ese campo.
    const materialLabel = (m: Material): string =>
        (m.descripcion || m.nombre || m.codigo || '')

    for (const [kw, matName] of Object.entries(materialKeywords)) {
        if (lowerText.includes(kw)) {
            // Verificar si el material existe en materialesDisponibles
            const foundMat = materialesDisponibles.find(m => materialLabel(m).toLowerCase().includes(matName.toLowerCase()))
            result.materialNombre = foundMat ? materialLabel(foundMat) : matName
            result.confianza.material = true
            break
        }
    }

    // Si no encontró por palabra clave, chequear directamente con nombres de materiales cargados
    if (!result.materialNombre && materialesDisponibles.length > 0) {
        const found = materialesDisponibles.find(m => lowerText.includes(materialLabel(m).toLowerCase()))
        if (found) {
            result.materialNombre = materialLabel(found)
            result.confianza.material = true
        }
    }

    // 5. Detectar Cliente
    // A) Buscar coincidencias con clientes existentes
    if (clientesDisponibles.length > 0) {
        // Ordenar por longitud de nombre descendente para matchear los más específicos primero
        const sortedClientes = [...clientesDisponibles].sort((a, b) => (b.nombre?.length || 0) - (a.nombre?.length || 0))
        for (const cliente of sortedClientes) {
            const nombreClean = (cliente.nombre || '').trim().toLowerCase()
            const fantasiaClean = (cliente.nombreFantasia || '').trim().toLowerCase()

            if (nombreClean.length >= 3 && lowerText.includes(nombreClean)) {
                result.matchedCliente = cliente
                result.detectedClientName = cliente.nombre
                result.confianza.cliente = true
                break
            }
            if (fantasiaClean.length >= 3 && lowerText.includes(fantasiaClean)) {
                result.matchedCliente = cliente
                result.detectedClientName = cliente.nombreFantasia || cliente.nombre
                result.confianza.cliente = true
                break
            }
        }
    }

    // B) Si no hay match exacto, buscar sintaxis típica: "para [Nombre Cliente]", "cliente: [Nombre]"
    if (!result.matchedCliente) {
        const clientPattern = /(?:para|cliente|de)\s*[:=]?\s*([A-Za-z0-9ÁÉÍÓÚáéíóúñÑ\s]{3,25})(?:\s*[-,\n]|\s+te\s|\s+para\s|$)/i
        const clientMatch = cleanText.match(clientPattern)
        if (clientMatch) {
            const candidate = clientMatch[1].trim()
            // Evitar palabras comunes
            const forbidden = ['imprimir', 'el', 'la', 'un', 'una', 'hacer', 'armar', 'revisar']
            if (!forbidden.includes(candidate.toLowerCase())) {
                result.detectedClientName = candidate
            }
        }
    }

    return result
}
