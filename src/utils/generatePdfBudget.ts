import type { Order } from '@/types'
import { XIGNUX_LOGO_BASE64 } from './logoBase64'
import { resolveMediaUrl } from '@/data/db'

export function generatePdfBudget(order: Order) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
        alert('Por favor permite las ventanas emergentes (popups) para abrir el PDF.')
        return
    }

    const isPrintedOrFinished = ['impreso', 'post', 'completo', 'entregado', 'finalizado'].includes(order.status)
    const docTitle = isPrintedOrFinished ? 'DETALLE DE IMPRESIÓN' : 'PRESUPUESTO COMERCIAL'
    const docBadge = isPrintedOrFinished ? 'ORDEN DE TRABAJO IMPRESA' : 'COTIZACIÓN'

    const operario = (order.operarioNombre || order.vendedorNombre || (order as any).vendedor?.nombre || (order as any).vendedorName || 'ADRIAN').toUpperCase()
    const operarioRol = (order as any).vendedorRol || (order as any).vendedor?.rol || 'Administración'
    const clienteNombre = order.clienteNombre || (order as any).clientName || 'Cliente General'
    const direccionObra = (order as any).clienteDireccion || (order as any).direccion || 'Jose V. Cardozo 912, Córdoba'

    // Technical metadata from image analysis
    const meta = order.imgMetadata
    const dpi = meta?.dpi || 0
    const colorMode = meta?.colorMode || ''
    const fileFormat = meta?.format || ''
    const fileDimCm = (meta?.width && meta?.height) ? `${meta.width} × ${meta.height} cm` : ''
    const printDimM = (order.ancho && order.alto) ? `${Number(order.ancho).toFixed(2)} × ${Number(order.alto).toFixed(2)} m` : ''
    const hasMeta = dpi > 0 || colorMode || fileFormat

    // Preview artwork URL
    let previewImgUrl = ''
    if (meta?.thumbnailUrl) {
        previewImgUrl = resolveMediaUrl(meta.thumbnailUrl)
    } else if (order.archivos && order.archivos.length > 0) {
        const firstFile = order.archivos[0]
        const ext = firstFile.split('.').pop()?.toLowerCase() || ''
        if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(ext)) {
            previewImgUrl = resolveMediaUrl(firstFile)
        }
    }

    const getDpiQuality = (d: number) => {
        if (d <= 0) return { label: 'Sin datos', color: '#94a3b8' }
        if (d >= 300) return { label: 'Alta Calidad', color: '#16a34a' }
        if (d >= 150) return { label: 'Estándar', color: '#2563eb' }
        if (d >= 72) return { label: 'Media', color: '#d97706' }
        return { label: 'Baja Resolución', color: '#dc2626' }
    }
    const dpiQuality = getDpiQuality(dpi)

    function strId(id: any) {
        if (!id) return '00000'
        return String(id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
    }

    const otDisplay = order.ot || `OT-${strId(order.id)}`
    const pdfFilename = `${docTitle.replace(/\s+/g, '_')}_XignuX_${otDisplay}.pdf`
    const fecha = order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR')

    const totalNum = Number(order.total || order.subtotal || 0)
    const subtotalNum = Number(order.subtotal || order.total || 0)
    const senaSugerida = totalNum * 0.5

    const formatCurrency = (val: number) => {
        return `$${val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const items = (order as any).carteles || [
        {
            descripcion: (order.nombreTarea && !order.nombreTarea.startsWith('Proyecto')) 
                ? order.nombreTarea 
                : `Cartel ${order.material || 'Lona Front'} ${order.ancho || 0}x${order.alto || 0}m`,
            cant: order.copias || 1,
            unit: totalNum / (order.copias || 1),
            subtotal: totalNum
        }
    ]

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>${pdfFilename}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

                @page {
                    size: A4 portrait;
                    margin: 0;
                }

                * { box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif; }

                html, body {
                    margin: 0;
                    padding: 0;
                    background: #334155;
                    color: #1e2433;
                    font-size: 13px;
                    line-height: 1.4;
                }

                /* Floating Top Action Bar (Hidden when printing) */
                .no-print-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #1e2433;
                    color: #ffffff;
                    padding: 12px 24px;
                    width: 100%;
                    max-width: 210mm;
                    margin: 20px auto 10px auto;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }
                .btn-print {
                    background: #2563eb;
                    color: #ffffff;
                    border: none;
                    padding: 9px 22px;
                    font-size: 13px;
                    font-weight: 700;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 2px 8px rgba(37,99,235,0.4);
                }
                .btn-print:hover { background: #1d4ed8; }

                /* Strict A4 Sheet Container */
                .a4-page {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 14mm 18mm 12mm 18mm;
                    margin: 0 auto 30px auto;
                    background: #ffffff;
                    position: relative;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.25);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                /* Header Brand Center */
                .header-brand {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #1e2433;
                }
                .brand-left {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .brand-logo-img {
                    height: 52px;
                    width: auto;
                    display: block;
                }
                .brand-name {
                    font-size: 20px;
                    font-weight: 900;
                    color: #1e2433;
                    letter-spacing: -0.5px;
                }
                .brand-sub {
                    font-size: 11.5px;
                    color: #64748b;
                    font-weight: 500;
                }
                .brand-right {
                    text-align: right;
                }
                .badge-doc-type {
                    display: inline-block;
                    background: ${isPrintedOrFinished ? '#15803d' : '#2563eb'};
                    color: #ffffff;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.8px;
                    padding: 4px 10px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }
                .ot-label {
                    font-size: 15px;
                    font-weight: 800;
                    color: #1e2433;
                }

                /* Client & Metadata Section */
                .meta-section {
                    display: grid;
                    grid-template-columns: 1.4fr 1fr;
                    gap: 16px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 12px 16px;
                    margin-bottom: 18px;
                }
                .section-label {
                    font-size: 10px;
                    font-weight: 800;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    margin-bottom: 4px;
                }
                .meta-text {
                    font-size: 12.5px;
                    color: #1e2433;
                    margin-top: 2px;
                }

                /* Artwork & Items Container */
                .artwork-and-items {
                    display: grid;
                    grid-template-columns: ${previewImgUrl ? '150px 1fr' : '1fr'};
                    gap: 16px;
                    margin-bottom: 18px;
                }

                .artwork-card {
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    padding: 8px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .artwork-img {
                    max-width: 100%;
                    max-height: 120px;
                    object-fit: contain;
                    border-radius: 4px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    margin-bottom: 6px;
                }
                .artwork-caption {
                    font-size: 9.5px;
                    font-weight: 700;
                    color: #64748b;
                    word-break: break-all;
                }

                /* Items Table */
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .items-table th {
                    background: #1e2433;
                    color: #ffffff;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    padding: 8px 12px;
                }
                .items-table td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 12.5px;
                    color: #1e2433;
                }
                .items-table tr:nth-child(even) td {
                    background: #f8fafc;
                }

                /* Technical Specs Section */
                .tech-specs {
                    margin: 14px 0;
                    padding: 10px 14px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                }
                .tech-specs-title {
                    font-size: 10px;
                    font-weight: 800;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    margin-bottom: 6px;
                }
                .tech-specs-grid {
                    display: flex;
                    gap: 18px;
                    flex-wrap: wrap;
                }
                .tech-spec-item {
                    display: flex;
                    flex-direction: column;
                }
                .tech-spec-label {
                    font-size: 9.5px;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                }
                .tech-spec-value {
                    font-size: 12.5px;
                    font-weight: 700;
                    color: #1e2433;
                }

                /* Totals & Commercial Condition */
                .bottom-blocks {
                    display: grid;
                    grid-template-columns: 1.2fr 1fr;
                    gap: 16px;
                    margin-top: 14px;
                }

                .commercial-notice {
                    background: ${isPrintedOrFinished ? '#f0fdf4' : '#eff6ff'};
                    border: 1px solid ${isPrintedOrFinished ? '#bbf7d0' : '#bfdbfe'};
                    border-radius: 6px;
                    padding: 12px;
                    font-size: 11.5px;
                    color: ${isPrintedOrFinished ? '#166534' : '#1e40af'};
                    line-height: 1.45;
                }
                .commercial-title {
                    font-weight: 800;
                    margin-bottom: 4px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .totals-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .totals-table td {
                    padding: 8px 14px;
                    font-size: 12.5px;
                }
                .row-subtotal td {
                    background: #f8fafc;
                    color: #334155;
                }
                .row-total-general td {
                    background: #1e2433;
                    color: #ffffff;
                    font-weight: 800;
                    font-size: 14px;
                }

                /* Bank Details Box */
                .bank-box {
                    margin-top: 12px;
                    padding: 10px 14px;
                    background: #f1f5f9;
                    border: 1px dashed #cbd5e1;
                    border-radius: 6px;
                    font-size: 11px;
                    color: #334155;
                }

                /* Footer Fine Print */
                .fine-print {
                    text-align: center;
                    font-size: 10px;
                    color: #94a3b8;
                    margin-top: auto;
                    padding-top: 10px;
                    border-top: 1px solid #e2e8f0;
                }

                @media print {
                    .no-print-bar { display: none !important; }
                    html, body { background: #ffffff !important; }
                    .a4-page {
                        width: 210mm !important;
                        height: 297mm !important;
                        min-height: 297mm !important;
                        margin: 0 !important;
                        padding: 12mm 15mm 10mm 15mm !important;
                        box-shadow: none !important;
                        page-break-after: avoid !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="no-print-bar">
                <span><strong>${docTitle}</strong> — XignuX Gráfica (${otDisplay})</span>
                <button onclick="window.print()" class="btn-print">
                    🖨️ Imprimir / Guardar como PDF
                </button>
            </div>

            <div class="a4-page">
                <div>
                    <!-- Header Brand -->
                    <div class="header-brand">
                        <div class="brand-left">
                            <img src="${XIGNUX_LOGO_BASE64}" class="brand-logo-img" alt="XignuX Logo" />
                            <div>
                                <div class="brand-name">XIGNUX GRÁFICA</div>
                                <div class="brand-sub">Jose V. Cardozo 912, Córdoba · Tel: +54 9 3517897667</div>
                            </div>
                        </div>
                        <div class="brand-right">
                            <div class="badge-doc-type">${docBadge}</div>
                            <div class="ot-label">${otDisplay}</div>
                            <div style="font-size: 11px; color: #64748b;">Fecha: ${fecha}</div>
                        </div>
                    </div>

                    <!-- Client & Issuer Metadata -->
                    <div class="meta-section">
                        <div>
                            <div class="section-label">DATOS DEL CLIENTE</div>
                            <div class="meta-text"><strong>Razón Social:</strong> ${clienteNombre}</div>
                            <div class="meta-text"><strong>Dirección / Obra:</strong> ${direccionObra}</div>
                            ${order.envio ? `<div class="meta-text"><strong>Logística / Envío:</strong> ${order.envio}</div>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <div class="section-label">RESPONSABLE DE ATENCIÓN</div>
                            <div class="meta-text"><strong>${operario}</strong></div>
                            <div style="font-size: 11px; color: #64748b;">${operarioRol}</div>
                        </div>
                    </div>

                    <!-- Artwork Preview + Items Table -->
                    <div class="artwork-and-items">
                        ${previewImgUrl ? `
                            <div class="artwork-card">
                                <div class="section-label" style="font-size: 8.5px; margin-bottom: 4px;">ARTE A IMPRIMIR</div>
                                <img src="${previewImgUrl}" class="artwork-img" alt="Arte Gráfico" />
                                <div class="artwork-caption">${order.archivosOriginales?.[0] || 'Archivo cargado'}</div>
                            </div>
                        ` : ''}

                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th style="text-align: left;">DESCRIPCIÓN DEL TRABAJO</th>
                                    <th style="width: 12%; text-align: center;">CANT</th>
                                    <th style="width: 20%; text-align: right;">P. UNIT</th>
                                    <th style="width: 22%; text-align: right;">SUBTOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map((it: any) => `
                                    <tr>
                                        <td style="vertical-align: top;">
                                            <strong>${it.descripcion || `Cartel ${order.material || 'Lona Front'} ${order.ancho || 0}x${order.alto || 0}m`}</strong>
                                            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                                                Material: ${order.material || 'Lona'} · Medida: ${order.ancho || 0}x${order.alto || 0}m
                                                ${order.bobinaAsignada ? ` · Bobina: <strong>${order.bobinaAsignada}m</strong>` : ''}
                                                ${order.consumoEstimado ? ` · Consumo: <strong>${Number(order.consumoEstimado).toFixed(2)} ml</strong>` : ''}
                                            </div>
                                        </td>
                                        <td style="text-align: center; font-weight: 700;">${it.cant || order.copias || 1}</td>
                                        <td style="text-align: right;">${formatCurrency(it.unit || (totalNum / (order.copias || 1)))}</td>
                                        <td style="text-align: right; font-weight: 700;">${formatCurrency(it.subtotal || totalNum)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Technical Specifications -->
                    ${(hasMeta || order.bobinaAsignada || order.consumoEstimado) ? `
                    <div class="tech-specs">
                        <div class="tech-specs-title">📐 Especificaciones Técnicas de Impresión</div>
                        <div class="tech-specs-grid">
                            ${dpi > 0 ? `
                            <div class="tech-spec-item">
                                <span class="tech-spec-label">Resolución</span>
                                <span class="tech-spec-value">${dpi} DPI (${dpiQuality.label})</span>
                            </div>` : ''}
                            ${colorMode ? `
                            <div class="tech-spec-item">
                                <span class="tech-spec-label">Modo Color</span>
                                <span class="tech-spec-value">${colorMode}</span>
                            </div>` : ''}
                            ${fileFormat ? `
                            <div class="tech-spec-item">
                                <span class="tech-spec-label">Formato</span>
                                <span class="tech-spec-value">${fileFormat.toUpperCase()}</span>
                            </div>` : ''}
                            ${printDimM ? `
                            <div class="tech-spec-item">
                                <span class="tech-spec-label">Medida Final</span>
                                <span class="tech-spec-value">${printDimM}</span>
                            </div>` : ''}
                            ${order.bobinaAsignada ? `
                            <div class="tech-spec-item">
                                <span class="tech-spec-label">Bobina Asignada</span>
                                <span class="tech-spec-value" style="color: #2563eb;">Rollo ${order.bobinaAsignada}m</span>
                            </div>` : ''}
                            ${order.consumoEstimado ? `
                            <div class="tech-spec-item">
                                <span class="tech-spec-label">Consumo Lineal</span>
                                <span class="tech-spec-value" style="color: #0284c7;">${Number(order.consumoEstimado).toFixed(2)} ml</span>
                            </div>` : ''}
                            <div class="tech-spec-item">
                                <span class="tech-spec-label">Copias</span>
                                <span class="tech-spec-value">${order.copias || 1} un</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Bottom Section: Commercial Notice & Totals -->
                    <div class="bottom-blocks">
                        <div>
                            ${isPrintedOrFinished ? `
                                <div class="commercial-notice">
                                    <div class="commercial-title">✔ Orden de Impresión Finalizada</div>
                                    Trabajo procesado y controlado según especificaciones técnicas de taller. Válido como comprobante y detalle de entrega.
                                </div>
                            ` : `
                                <div class="commercial-notice">
                                    <div class="commercial-title">💡 Condición Comercial</div>
                                    Se sugiere una <strong>seña del 50% (${formatCurrency(senaSugerida)})</strong> para confirmar la orden e iniciar la impresión en taller.
                                </div>
                                <div class="bank-box">
                                    <strong>Datos para Transferencia:</strong><br>
                                    Alias: <code>XIGNUX.GRAFICA</code> · CBU: <code>0000003100010000000000</code><br>
                                    Titular: XignuX Gráfica SRL · Banco Santander
                                </div>
                            `}
                        </div>

                        <div>
                            <table class="totals-table">
                                <tr class="row-subtotal">
                                    <td style="text-align: left;">Subtotal:</td>
                                    <td style="text-align: right; font-weight: 600;">${formatCurrency(subtotalNum)}</td>
                                </tr>
                                <tr class="row-total-general">
                                    <td style="text-align: left;">TOTAL:</td>
                                    <td style="text-align: right; font-weight: 800;">${formatCurrency(totalNum)}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Fine Print Footer -->
                <div class="fine-print">
                    XignuX Soluciones Gráficas · Jose V. Cardozo 912, Córdoba · Presupuesto sujeto a confirmación técnica de archivos.
                </div>
            </div>
        </body>
        </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
}
