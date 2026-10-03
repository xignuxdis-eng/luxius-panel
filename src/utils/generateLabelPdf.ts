import type { Order } from '@/types'
import { XIGNUX_LOGO_LIGHT } from './logoBase64Light'
import { ARTEGRA_BOLD_BASE64, ARTEGRA_SEMIBOLD_BASE64 } from './artegraFontsBase64'
import { resolveMediaUrl, getClientes } from '@/data/db'
import { batchOptimizePdfThumbnails } from './pdfImageOptimizer'

/**
 * Generador de Etiquetas de Producción para Rollos — Luxius System
 * 
 * Tipografía oficial de marca: Artegra Sans Bold y Artegra Sans Semibold (embebidas en Base64).
 * Formato alargado de alto impacto visual (105mm ancho).
 */

// ============================================================
// CONFIGURACIÓN (editable)
// ============================================================
export const LABEL_CONFIG = {
    whatsapp: '3517897667',
    website: 'XIGNUX.COM.AR',
    labelWidthMM: 105,   // Ancho estándar de etiqueta alargada para rollo
    thumbSize: 180,      // Altura máxima de miniatura
    thumbQuality: 0.85,
}

// ============================================================
// PANTALLA DE CARGA RÁPIDA (evita que el navegador diga "no responde")
// ============================================================
const LOADING_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Generando Etiqueta...</title>
    <style>
        body {
            margin: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #0f172a;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(255,255,255,0.15);
            border-top-color: #0d9488;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 18px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        h2 { font-size: 19px; font-weight: 700; margin: 0 0 6px 0; }
        p { font-size: 13px; color: #94a3b8; margin: 0; }
    </style>
</head>
<body>
    <div class="spinner"></div>
    <h2>🏷️ Armando Etiqueta de Producción</h2>
    <p>Preparando documento de impresión...</p>
</body>
</html>`

// ============================================================
// HELPERS
// ============================================================

/** Elimina la extensión de un nombre de archivo y decodifica caracteres URI */
function sanitizeFileName(rawName: string): string {
    const base = rawName.split(/[/\\]/).pop() || rawName
    const noExt = base.replace(/\.[^./\\]+$/, '')
    try {
        return decodeURIComponent(noExt)
    } catch {
        return noExt
    }
}

/** Formatea medidas en centímetros con x estándar, ej: "135 x 267 cm" (con x2 si copias > 1) */
function formatDimensions(ancho?: number, alto?: number, copias?: number): string {
    if (!ancho && !alto) return ''
    const w = ancho ? (ancho < 20 ? Math.round(ancho * 100) : Math.round(ancho)) : 0
    const h = alto ? (alto < 20 ? Math.round(alto * 100) : Math.round(alto)) : 0
    let text = ''
    if (w > 0 && h > 0) {
        text = `${w} x ${h} cm`
    } else if (w > 0) {
        text = `${w} cm`
    } else if (h > 0) {
        text = `${h} cm`
    }
    if (text && copias && copias > 1) {
        text += ` (x${copias})`
    }
    return text
}

/** Fecha de hoy formateada de forma segura */
function todayFormatted(): string {
    const d = new Date()
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
}

/**
 * Extrae EXCLUSIVAMENTE el nombre del Proyecto / Tarea,
 * limpiando nombres de archivo, sufijos de ítems o medidas concatenadas.
 */
function extractProjectName(orders: Order[]): string {
    // 1. Revisar loteNombre: si existe y no es un "Lote ..." por defecto
    for (const order of orders) {
        const lote = (order.loteNombre || '').trim()
        if (lote && !lote.toLowerCase().startsWith('lote ') && !lote.toLowerCase().startsWith('lote_')) {
            return lote
        }
    }

    // 2. Extraer desde nombreTarea (en pedidos por lote se guarda como "Proyecto - NombreArchivo")
    for (const order of orders) {
        const raw = (order.nombreTarea || '').trim()
        if (!raw) continue

        // Si tiene separador " - ", la primera parte es el proyecto y la segunda es el archivo
        if (raw.includes(' - ')) {
            const parts = raw.split(' - ')
            const firstPart = parts[0].trim()
            if (firstPart) {
                return firstPart
            }
        }

        // Si contiene el nombre de algún archivo del pedido, removerlo para dejar solo el proyecto
        let candidate = raw
        if (order.archivosOriginales?.length) {
            for (const f of order.archivosOriginales) {
                const fBase = f.replace(/\.[^/.]+$/, '').trim()
                if (fBase && candidate.toLowerCase().includes(fBase.toLowerCase())) {
                    candidate = candidate.replace(new RegExp(fBase, 'gi'), '').trim()
                    candidate = candidate.replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, '').trim()
                }
            }
        }
        if (candidate) return candidate
    }

    return ''
}

function escHtml(text: string): string {
    return (text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

// ============================================================
// TYPES
// ============================================================
interface LabelFileItem {
    name: string       // sin extensión
    dimensions: string // "135 × 267 cm"
    thumbUrl: string   // data URL optimizada o URL directa
}

// ============================================================
// CSS ESTILIZADO DE ALTO IMPACTO CON ARTEGRA SANS EMBEBIDA
// ============================================================
const LABEL_CSS = `
    @font-face {
        font-family: 'Artegra Sans';
        src: url(data:font/opentype;charset=utf-8;base64,${ARTEGRA_BOLD_BASE64}) format('opentype');
        font-weight: 700;
        font-style: normal;
        unicode-range: U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A;
    }
    @font-face {
        font-family: 'Artegra Sans';
        src: url(data:font/opentype;charset=utf-8;base64,${ARTEGRA_BOLD_BASE64}) format('opentype');
        font-weight: 800;
        font-style: normal;
        unicode-range: U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A;
    }
    @font-face {
        font-family: 'Artegra Sans';
        src: url(data:font/opentype;charset=utf-8;base64,${ARTEGRA_BOLD_BASE64}) format('opentype');
        font-weight: 900;
        font-style: normal;
        unicode-range: U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A;
    }
    @font-face {
        font-family: 'Artegra Sans';
        src: url(data:font/opentype;charset=utf-8;base64,${ARTEGRA_SEMIBOLD_BASE64}) format('opentype');
        font-weight: 600;
        font-style: normal;
        unicode-range: U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A;
    }
    @font-face {
        font-family: 'Artegra Sans';
        src: url(data:font/opentype;charset=utf-8;base64,${ARTEGRA_SEMIBOLD_BASE64}) format('opentype');
        font-weight: 400;
        font-style: normal;
        unicode-range: U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A;
    }
    @font-face {
        font-family: 'Artegra Sans';
        src: url(data:font/opentype;charset=utf-8;base64,${ARTEGRA_SEMIBOLD_BASE64}) format('opentype');
        font-weight: 500;
        font-style: normal;
        unicode-range: U+0020, U+002C, U+002E, U+0030-0033, U+0035-0039, U+003A-003B, U+003F, U+0041-005A, U+0061-007A;
    }

    @page {
        size: ${LABEL_CONFIG.labelWidthMM}mm auto;
        margin: 0;
    }

    * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    html, body {
        margin: 0;
        padding: 0;
        background: #cbd5e1;
        color: #0f172a;
        font-family: 'Artegra Sans', sans-serif;
        font-weight: 600;
        font-size: 13px;
        line-height: 1.35;
    }

    .no-print-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #0f172a;
        color: #fff;
        padding: 12px 20px;
        width: 100%;
        max-width: ${LABEL_CONFIG.labelWidthMM}mm;
        margin: 14px auto 8px auto;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .no-print-bar .title {
        font-family: 'Artegra Sans', sans-serif;
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .btn-print {
        background: #0d9488;
        color: #fff;
        border: none;
        padding: 9px 22px;
        border-radius: 6px;
        cursor: pointer;
        font-family: 'Artegra Sans', sans-serif;
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 8px rgba(13,148,136,0.5);
        transition: background 0.15s, transform 0.1s;
    }
    .btn-print:hover { background: #0f766e; }
    .btn-print:active { transform: scale(0.97); }

    @media print {
        .no-print-bar { display: none !important; }
        html, body { background: #fff !important; }
        .label-page {
            box-shadow: none !important;
            margin: 0 !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 8mm 6mm !important;
        }
    }

    .label-page {
        width: ${LABEL_CONFIG.labelWidthMM}mm;
        margin: 12px auto 40px auto;
        background: #fff;
        border: 2.5px solid #0f172a;
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        padding: 20px 18px;
    }

    /* Logo prominente y de impacto */
    .label-logo {
        text-align: center;
        padding: 6px 0 12px 0;
    }
    .label-logo img {
        width: 240px;
        max-width: 95%;
        height: auto;
        object-fit: contain;
        display: block;
        margin: 0 auto;
    }

    /* Separadores punteados de estilo técnico */
    .dotted-divider {
        border-top: 2.5px dotted #0f172a;
        margin: 14px 0;
    }

    /* Bloque Destacado de Proyecto / Fecha */
    .label-project-block {
        background: #f8fafc;
        border: 2px solid #0f172a;
        border-radius: 8px;
        padding: 12px 14px;
        text-align: center;
    }
    .label-project-block .project-title {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 19px;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 6px 0;
        line-height: 1.25;
        letter-spacing: 0.3px;
        word-break: break-word;
        text-transform: uppercase;
    }
    .label-project-block .project-meta {
        font-family: 'Artegra Sans', sans-serif;
        font-weight: 600;
        font-size: 12.5px;
        color: #475569;
    }
    .label-project-block .label-material {
        background: #0f172a;
        color: #fff;
        padding: 4px 10px;
        border-radius: 4px;
        font-family: 'Artegra Sans', sans-serif;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        margin-top: 8px;
        display: inline-block;
    }

    /* Secciones (Destinatario, Dirección) */
    .label-section {
        margin: 12px 0;
    }
    .label-section-header {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #64748b;
        margin: 0 0 4px 0;
    }
    .label-section-value {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 24px;
        font-weight: 700;
        color: #000000;
        margin: 0;
        line-height: 1.2;
        letter-spacing: 0.5px;
        word-break: break-word;
        text-transform: uppercase;
    }
    .label-section-address {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 15px;
        font-weight: 600;
        color: #1e293b;
        margin: 0;
        line-height: 1.35;
        word-break: break-word;
    }

    /* Detalle de Archivos */
    .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 14px 0 10px 0;
    }
    .detail-title {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #0f172a;
        margin: 0;
    }
    .detail-count {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 11.5px;
        font-weight: 700;
        background: #0f172a;
        color: #fff;
        padding: 2px 8px;
        border-radius: 12px;
    }

    /* Grilla de Miniaturas */
    .thumbs-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }
    .thumb-card {
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px;
        background: #fff;
        break-inside: avoid;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    }
    .thumb-card .img-container {
        width: 100%;
        height: 115px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        margin-bottom: 6px;
    }
    .thumb-card img {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        display: block;
    }
    .thumb-no-img {
        font-size: 26px;
        color: #94a3b8;
    }
    .thumb-card .thumb-name {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 11.5px;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 4px 0;
        word-break: break-word;
        line-height: 1.25;
        letter-spacing: -0.2px;
    }
    .thumb-card .thumb-dims-badge {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 11px;
        font-weight: 700;
        background: #0f172a;
        color: #ffffff;
        padding: 3px 8px;
        border-radius: 4px;
        display: inline-block;
        letter-spacing: 0.3px;
        white-space: nowrap;
    }

    /* Footer de Alto Impacto */
    .label-footer {
        margin-top: 18px;
        padding: 12px 0 4px 0;
        border-top: 3px solid #0f172a;
        text-align: center;
    }
    .label-footer .footer-whatsapp {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 17px;
        font-weight: 700;
        color: #15803d;
        margin: 0 0 3px 0;
        letter-spacing: 0.5px;
    }
    .label-footer .footer-web {
        font-family: 'Artegra Sans', sans-serif;
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: 2px;
        margin: 0;
    }
`

// ============================================================
// MAIN GENERATOR
// ============================================================

/**
 * Genera e imprime la Etiqueta de Producción para una o varias órdenes.
 * Optimizado para velocidad inmediata, tipografía oficial y máxima fidelidad visual.
 */
export async function generateProductionLabel(orders: Order[]): Promise<void> {
    if (!orders || orders.length === 0) return

    // 1. Abrir ventana de impresión INMEDIATAMENTE para respuesta visual instantánea
    const printWindow = window.open('', '_blank', 'width=580,height=880')
    if (!printWindow) {
        alert('Por favor permite las ventanas emergentes (popups) para abrir la etiqueta de impresión.')
        return
    }

    printWindow.document.open()
    printWindow.document.write(LOADING_HTML)

    try {
        const firstOrder = orders[0]

        // 2. Proyecto / Etiqueta / Nombre Trabajo (aislado de nombres de archivo y medidas)
        const projectName = extractProjectName(orders)

        // 3. Destinatario (Cliente)
        const clientName = (firstOrder.clienteNombre || firstOrder.clientName || '').trim()

        // 4. Dirección del cliente
        let address = ''
        try {
            const clients = getClientes()
            const client = clients.find(c =>
                (firstOrder.clientId && c.id === firstOrder.clientId) ||
                (clientName && c.nombre.trim().toLowerCase() === clientName.toLowerCase())
            )
            if (client?.direccion?.trim()) {
                address = client.direccion.trim()
            }
        } catch (e) {
            console.warn('[Label] Could not lookup client address in local DB:', e)
        }

        if (!address) {
            const orderWithObs = orders.find(o => o.observaciones2?.trim() || o.observaciones?.trim())
            if (orderWithObs) {
                const obs2 = (orderWithObs.observaciones2 || '').trim()
                const obs1 = (orderWithObs.observaciones || '').trim()
                if (obs2) {
                    address = obs2
                } else if (/calle|av\.|avenida|barrio|piso|depto|altura|entre|b°|direcci/i.test(obs1)) {
                    address = obs1
                }
            }
        }

        // 5. Material
        const materials = Array.from(new Set(orders.map(o => o.material).filter(Boolean)))
        const material = materials.join(' / ')

        // 6. Recopilar archivos REALES (usando order.archivos como URL y order.archivosOriginales como nombre)
        const allFiles: { name: string; url: string; ancho?: number; alto?: number; copias?: number }[] = []
        for (const order of orders) {
            const filesList = order.archivos && order.archivos.length > 0 ? order.archivos : []
            if (filesList.length > 0) {
                filesList.forEach((fileKey, idx) => {
                    const displayName = order.archivosOriginales?.[idx] || fileKey.split('/').pop() || `Archivo ${idx + 1}`
                    const url = resolveMediaUrl(fileKey)
                    allFiles.push({
                        name: sanitizeFileName(displayName),
                        url,
                        ancho: order.ancho,
                        alto: order.alto,
                        copias: order.copias,
                    })
                })
            } else if (order.imgMetadata?.thumbnailUrl) {
                const displayName = order.archivosOriginales?.[0] || order.nombreTarea || 'Archivo'
                allFiles.push({
                    name: sanitizeFileName(displayName),
                    url: resolveMediaUrl(order.imgMetadata.thumbnailUrl),
                    ancho: order.ancho,
                    alto: order.alto,
                    copias: order.copias,
                })
            } else if (order.ancho || order.alto || order.conceptoPersonalizado || order.descripcionItem) {
                allFiles.push({
                    name: order.descripcionItem || order.conceptoPersonalizado || order.nombreTarea || order.material || 'Trabajo sin archivo',
                    url: '',
                    ancho: order.ancho,
                    alto: order.alto,
                    copias: order.copias,
                })
            }
        }

        // 7. Optimizar miniaturas de forma asíncrona y rápida (timeout 3s)
        const uniqueUrls = Array.from(new Set(allFiles.map(f => f.url).filter(Boolean)))
        let urlMap = new Map<string, string>()

        if (uniqueUrls.length > 0) {
            try {
                const optimizedUrls = await batchOptimizePdfThumbnails(uniqueUrls, {
                    maxWidth: 320,
                    maxHeight: 320,
                    quality: LABEL_CONFIG.thumbQuality,
                    timeoutMs: 3000,
                })
                urlMap = new Map(uniqueUrls.map((u, i) => [u, optimizedUrls[i] || u]))
            } catch (e) {
                console.warn('[Label] Thumbnail optimization fallback:', e)
            }
        }

        // Preparar items con URLs optimizadas
        const items: LabelFileItem[] = allFiles.map(f => ({
            name: f.name,
            dimensions: formatDimensions(f.ancho, f.alto, f.copias),
            thumbUrl: f.url ? (urlMap.get(f.url) || f.url) : '',
        }))

        // 8. Generar HTML completo
        const html = buildLabelHtml({
            projectName,
            clientName,
            material,
            address,
            items,
        })

        // 9. Reemplazar contenido del loader con el HTML final
        printWindow.document.open()
        printWindow.document.write(html)
        printWindow.document.close()

    } catch (err) {
        console.error('[Label] Error generating production label:', err)
        printWindow.document.open()
        printWindow.document.write(`
            <div style="font-family:sans-serif;padding:30px;color:#ef4444;text-align:center;">
                <h3>Error al generar la etiqueta</h3>
                <p>${String(err)}</p>
                <button onclick="window.close()" style="padding:8px 16px;cursor:pointer;">Cerrar</button>
            </div>
        `)
        printWindow.document.close()
    }
}

// ============================================================
// HTML BUILDER
// ============================================================

interface LabelData {
    projectName: string
    clientName: string
    material: string
    address: string
    items: LabelFileItem[]
}

function buildLabelHtml(data: LabelData): string {
    const { projectName, clientName, material, address, items } = data

    // Secciones condicionales: se omiten por completo si no hay datos
    const clientSection = clientName ? `
        <div class="label-section">
            <p class="label-section-header">DESTINATARIO</p>
            <p class="label-section-value">${escHtml(clientName)}</p>
        </div>
    ` : ''

    const addressSection = address ? `
        <div class="label-section">
            <p class="label-section-header">DIRECCIÓN</p>
            <p class="label-section-address">${escHtml(address)}</p>
        </div>
    ` : ''

    const materialBadge = material ? `
        <div><span class="label-material">${escHtml(material)}</span></div>
    ` : ''

    // Bloque de Proyecto & Fecha
    const hasProjectHeader = Boolean(projectName || material)
    const projectBlockHtml = hasProjectHeader ? `
        <div class="label-project-block">
            ${projectName ? `<h1 class="project-title">${escHtml(projectName)}</h1>` : ''}
            <div class="project-meta">
                <span>Fecha: <strong>${todayFormatted()}</strong></span>
            </div>
            ${materialBadge}
        </div>
    ` : `
        <div style="text-align:center;font-weight:700;color:#64748b;font-size:12px;margin-bottom:6px;">
            Fecha: ${todayFormatted()}
        </div>
    `

    // Grilla de miniaturas
    const thumbsHtml = items.length > 0 ? `
        <div class="dotted-divider"></div>
        <div class="detail-header">
            <p class="detail-title">DETALLE DE ARCHIVOS</p>
            <span class="detail-count">${items.length} ${items.length === 1 ? 'ítem' : 'ítems'}</span>
        </div>
        <div class="thumbs-grid">
            ${items.map(item => `
                <div class="thumb-card">
                    <div class="img-container">
                        ${item.thumbUrl ? `
                            <img src="${item.thumbUrl}" alt="" loading="eager" />
                        ` : `
                            <div class="thumb-no-img">📄</div>
                        `}
                    </div>
                    <div>
                        <p class="thumb-name">${escHtml(item.name)}</p>
                        ${item.dimensions ? `<span class="thumb-dims-badge">${escHtml(item.dimensions)}</span>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    ` : ''

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Etiqueta — ${escHtml(projectName || clientName || 'Producción')}</title>
    <style>${LABEL_CSS}</style>
</head>
<body>
    <div class="no-print-bar">
        <span class="title">🏷️ Etiqueta de Producción</span>
        <div>
            <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
            <button class="btn-print" style="margin-left:8px;background:#475569" onclick="window.close()">✕ Cerrar</button>
        </div>
    </div>

    <div class="label-page">
        <!-- Logo Oficial XignuX Prominente -->
        <div class="label-logo">
            <img src="${XIGNUX_LOGO_LIGHT}" alt="XignuX — Graficamos Arte" />
        </div>

        <div class="dotted-divider"></div>

        <!-- Bloque de Proyecto & Fecha -->
        ${projectBlockHtml}

        <div class="dotted-divider"></div>

        <!-- Destinatario & Dirección -->
        ${clientSection}
        ${addressSection}

        <!-- Detalle de Archivos -->
        ${thumbsHtml}

        <!-- Footer Oficial -->
        <div class="label-footer">
            <p class="footer-whatsapp">
                <span>📱 WhatsApp: ${escHtml(LABEL_CONFIG.whatsapp)}</span>
            </p>
            <p class="footer-web">${escHtml(LABEL_CONFIG.website)}</p>
        </div>
    </div>
</body>
</html>`
}
