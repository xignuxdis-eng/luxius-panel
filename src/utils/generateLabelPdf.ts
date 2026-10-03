import type { Order } from '@/types'
import { XIGNUX_LOGO_LIGHT } from './logoBase64Light'
import { resolveMediaUrl, getClientes } from '@/data/db'
import { batchOptimizePdfThumbnails } from './pdfImageOptimizer'

/**
 * Generador de Etiquetas de Producción para Rollos — Luxius System
 * 
 * Genera un PDF de etiqueta alargada (ancho configurable ~105mm, altura adaptativa)
 * para pegar a lo largo del rollo de material impreso.
 * 
 * Requisitos:
 * - Omitir títulos/secciones vacías para no dejar sensación de vacío (ej: si no hay dirección, no va "Dirección")
 * - Sin OT: en su lugar se coloca el Proyecto / Etiqueta / Nombre Trabajo (desde nombreTarea)
 * - Fecha de emisión de la etiqueta (hoy)
 * - Teléfono de WhatsApp configurable (default: 3517897667)
 * - Grilla de archivos con medidas, sin extensiones, con miniaturas
 * - Sin precios ni importes monetarios
 */

// ============================================================
// CONFIGURACIÓN (editable a futuro)
// ============================================================
export const LABEL_CONFIG = {
    whatsapp: '3517897667',
    website: 'XIGNUX.COM.AR',
    labelWidthMM: 105,   // Ancho alargado estándar para etiquetas de rollo
    thumbSize: 130,      // Altura máxima de cada miniatura
    thumbQuality: 0.75,
}

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

/** Formatea medidas en centímetros, ej: "135 × 267 cm" (con x2 si copias > 1) */
function formatDimensions(ancho?: number, alto?: number, copias?: number): string {
    if (!ancho && !alto) return ''
    const w = ancho ? (ancho < 20 ? Math.round(ancho * 100) : Math.round(ancho)) : 0
    const h = alto ? (alto < 20 ? Math.round(alto * 100) : Math.round(alto)) : 0
    let text = ''
    if (w > 0 && h > 0) {
        text = `${w} × ${h} cm`
    } else if (w > 0) {
        text = `${w} cm`
    } else if (h > 0) {
        text = `${h} cm`
    }
    if (text && copias && copias > 1) {
        text += ` (×${copias})`
    }
    return text
}

/** Fecha de hoy formateada para Argentina */
function todayFormatted(): string {
    const d = new Date()
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
// CSS ESTILIZADO DE LA ETIQUETA
// ============================================================
const LABEL_CSS = `
    @page {
        size: ${LABEL_CONFIG.labelWidthMM}mm auto;
        margin: 0;
    }

    * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    html, body {
        margin: 0;
        padding: 0;
        background: #f1f5f9;
        color: #0f172a;
        font-size: 12px;
        line-height: 1.35;
    }

    .no-print-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #0f172a;
        color: #fff;
        padding: 10px 16px;
        width: 100%;
        max-width: ${LABEL_CONFIG.labelWidthMM}mm;
        margin: 12px auto 8px auto;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .no-print-bar .title {
        font-weight: 700;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .btn-print {
        background: #0d9488;
        color: #fff;
        border: none;
        padding: 7px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 700;
        font-size: 13px;
        transition: background 0.15s;
    }
    .btn-print:hover { background: #0f766e; }

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
        margin: 10px auto 30px auto;
        background: #fff;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        padding: 16px 14px;
    }

    /* Logo & Header */
    .label-logo {
        text-align: center;
        padding-bottom: 10px;
    }
    .label-logo img {
        height: 44px;
        width: auto;
        object-fit: contain;
        margin-bottom: 2px;
    }
    .label-logo .brand-name {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 1.5px;
        color: #0f172a;
        margin: 0;
        line-height: 1.1;
    }
    .label-logo .brand-tagline {
        font-size: 10.5px;
        color: #64748b;
        letter-spacing: 0.5px;
        margin: 2px 0 0 0;
        font-style: italic;
    }

    /* Dotted line dividers */
    .dotted-divider {
        border-top: 2px dotted #94a3b8;
        margin: 10px 0;
    }

    /* Project & Date Block */
    .label-info {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 10px;
        text-align: center;
    }
    .label-info .project-name {
        font-size: 15px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 4px 0;
        line-height: 1.25;
        word-break: break-word;
    }
    .label-info .label-date {
        font-size: 11px;
        color: #64748b;
        margin: 0;
        font-weight: 500;
    }
    .label-info .label-material {
        font-size: 12px;
        color: #334155;
        margin: 4px 0 0 0;
        font-weight: 600;
    }

    /* Form Fields (Destinatario, Dirección) */
    .label-section {
        margin-bottom: 8px;
    }
    .label-section-title {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        color: #64748b;
        margin: 0 0 2px 0;
        border-bottom: 1.5px dotted #cbd5e1;
        padding-bottom: 2px;
    }
    .label-section-value {
        font-size: 13.5px;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
        padding: 2px 0;
        word-break: break-word;
    }

    /* Detail / Files Grid */
    .thumbs-title {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        color: #64748b;
        margin: 10px 0 6px 0;
        border-bottom: 1.5px dotted #cbd5e1;
        padding-bottom: 2px;
    }
    .thumbs-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
    }
    .thumb-card {
        text-align: center;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 5px;
        background: #fafbfc;
        break-inside: avoid;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .thumb-card img {
        width: 100%;
        max-height: ${LABEL_CONFIG.thumbSize}px;
        object-fit: contain;
        border-radius: 4px;
        background: #f8fafc;
        display: block;
        margin: 0 auto;
    }
    .thumb-no-img {
        width: 100%;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        border-radius: 4px;
        font-size: 20px;
    }
    .thumb-card .thumb-name {
        font-size: 9.5px;
        font-weight: 700;
        color: #1e293b;
        margin: 4px 0 1px 0;
        word-break: break-word;
        line-height: 1.2;
    }
    .thumb-card .thumb-dims {
        font-size: 9px;
        font-weight: 600;
        color: #0d9488;
        margin: 0;
    }

    /* Footer */
    .label-footer {
        margin-top: 12px;
        padding-top: 8px;
        border-top: 2px solid #0f172a;
        text-align: center;
    }
    .label-footer .footer-whatsapp {
        font-size: 14px;
        font-weight: 800;
        color: #15803d;
        margin: 0 0 2px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
    }
    .label-footer .footer-web {
        font-size: 12px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: 1px;
        margin: 0;
    }
`

// ============================================================
// MAIN GENERATOR
// ============================================================

/**
 * Genera e imprime la Etiqueta de Producción para una o varias órdenes.
 * Consolida archivos, medidas y miniaturas en un formato alargado para rollos.
 */
export async function generateProductionLabel(orders: Order[]): Promise<void> {
    if (!orders || orders.length === 0) return

    const firstOrder = orders[0]

    // 1. Proyecto / Etiqueta / Nombre Trabajo
    // Se toma desde nombreTarea o loteNombre. Si está vacío, queda vacío (sin título).
    const projectName = orders
        .map(o => (o.nombreTarea || o.loteNombre || '').trim())
        .find(n => n.length > 0) || ''

    // 2. Destinatario (Cliente)
    const clientName = (firstOrder.clienteNombre || firstOrder.clientName || '').trim()

    // 3. Dirección: buscar primero en ficha de clientes y luego en observaciones
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

    // 4. Material
    const materials = Array.from(new Set(orders.map(o => o.material).filter(Boolean)))
    const material = materials.join(' / ')

    // 5. Recopilar archivos de todas las órdenes seleccionadas
    const allFiles: { name: string; url: string; ancho?: number; alto?: number; copias?: number }[] = []
    for (const order of orders) {
        const archivos = order.archivosOriginales?.length ? order.archivosOriginales : (order.archivos || [])
        for (const archivo of archivos) {
            const url = resolveMediaUrl(archivo)
            allFiles.push({
                name: sanitizeFileName(archivo),
                url,
                ancho: order.ancho,
                alto: order.alto,
                copias: order.copias,
            })
        }
        // Si no tiene archivos adjuntos en el array pero tiene medidas o descripción
        if (archivos.length === 0 && (order.ancho || order.alto || order.conceptoPersonalizado || order.descripcionItem)) {
            allFiles.push({
                name: order.descripcionItem || order.conceptoPersonalizado || order.nombreTarea || order.material || 'Trabajo sin archivo',
                url: '',
                ancho: order.ancho,
                alto: order.alto,
                copias: order.copias,
            })
        }
    }

    // 6. Optimizar miniaturas para carga instantánea
    let thumbMap: Record<string, string> = {}
    const filesWithUrls = allFiles.filter(f => f.url)
    if (filesWithUrls.length > 0) {
        try {
            const urls = filesWithUrls.map(f => f.url)
            thumbMap = await batchOptimizePdfThumbnails(urls, {
                maxWidth: 240,
                maxHeight: 240,
                quality: LABEL_CONFIG.thumbQuality,
                timeoutMs: 5000,
            })
        } catch (e) {
            console.warn('[Label] Thumbnail optimization failed, using direct URLs:', e)
        }
    }

    // Preparar lista de items
    const items: LabelFileItem[] = allFiles.map(f => ({
        name: f.name,
        dimensions: formatDimensions(f.ancho, f.alto, f.copias),
        thumbUrl: f.url ? (thumbMap[f.url] || f.url) : '',
    }))

    // 7. Generar HTML
    const html = buildLabelHtml({
        projectName,
        clientName,
        material,
        address,
        items,
    })

    // 8. Abrir ventana de impresión
    const printWindow = window.open('', '_blank', 'width=550,height=850')
    if (!printWindow) {
        alert('No se pudo abrir la ventana de impresión. Por favor verificá que el navegador no bloquee pop-ups.')
        return
    }

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()

    // Autodisparo de impresión cuando las imágenes carguen
    printWindow.onload = () => {
        const images = printWindow.document.querySelectorAll('img')
        if (images.length === 0) {
            return
        }
        const decodePromises = Array.from(images).map(img =>
            img.decode().catch(() => { /* ignorar fallos de decode */ })
        )
        Promise.all(decodePromises).then(() => {
            // Imágenes cargadas y listas
        })
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
            <p class="label-section-title">Destinatario</p>
            <p class="label-section-value">${escHtml(clientName)}</p>
        </div>
    ` : ''

    const addressSection = address ? `
        <div class="label-section">
            <p class="label-section-title">Dirección</p>
            <p class="label-section-value">${escHtml(address)}</p>
        </div>
    ` : ''

    const materialText = material ? `
        <p class="label-material">${escHtml(material)}</p>
    ` : ''

    // Bloque de Proyecto & Fecha
    const infoHeaderHtml = `
        <div class="label-info">
            ${projectName ? `<p class="project-name">${escHtml(projectName)}</p>` : ''}
            <p class="label-date">Fecha: ${todayFormatted()}</p>
            ${materialText}
        </div>
    `

    // Grilla de miniaturas
    const thumbsHtml = items.length > 0 ? `
        <div class="dotted-divider"></div>
        <p class="thumbs-title">Detalle de Archivos</p>
        <div class="thumbs-grid">
            ${items.map(item => `
                <div class="thumb-card">
                    ${item.thumbUrl ? `
                        <img src="${item.thumbUrl}" alt="${escHtml(item.name)}" loading="eager" />
                    ` : `
                        <div class="thumb-no-img"><span>📄</span></div>
                    `}
                    <p class="thumb-name">${escHtml(item.name)}</p>
                    ${item.dimensions ? `<p class="thumb-dims">${escHtml(item.dimensions)}</p>` : ''}
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
        <!-- Logo XignuX -->
        <div class="label-logo">
            <img src="${XIGNUX_LOGO_LIGHT}" alt="XignuX" />
            <p class="brand-name">XignuX</p>
            <p class="brand-tagline">Graficamos Arte</p>
        </div>

        <div class="dotted-divider"></div>

        <!-- Info Header (Proyecto, Fecha, Material) -->
        ${infoHeaderHtml}

        <div class="dotted-divider"></div>

        <!-- Destinatario & Dirección (solo si existen) -->
        ${clientSection}
        ${addressSection}

        <!-- Detalle de Archivos -->
        ${thumbsHtml}

        <!-- Footer -->
        <div class="label-footer">
            <p class="footer-whatsapp">
                <span>📱 WhatsApp:</span>
                <span>${escHtml(LABEL_CONFIG.whatsapp)}</span>
            </p>
            <p class="footer-web">${escHtml(LABEL_CONFIG.website)}</p>
        </div>
    </div>
</body>
</html>`
}
