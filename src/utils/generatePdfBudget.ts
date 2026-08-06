import type { Order } from '@/types'
import { XIGNUX_LOGO_BASE64 } from './logoBase64'

export function generatePdfBudget(order: Order) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
        alert('Por favor permite las ventanas emergentes (popups) para abrir el PDF.')
        return
    }

    const operario = (order.operarioNombre || order.vendedorNombre || (order as any).vendedor?.nombre || (order as any).vendedorName || 'ADRIAN').toUpperCase()
    const operarioRol = (order as any).vendedorRol || (order as any).vendedor?.rol || 'principal'
    const clienteNombre = order.clienteNombre || (order as any).clientName || 'Cliente General'
    const direccionObra = (order as any).clienteDireccion || (order as any).direccion || '4438, Eduardo Secchi, Las Lilas'

    // Technical metadata from image analysis
    const meta = order.imgMetadata
    const dpi = meta?.dpi || 0
    const colorMode = meta?.colorMode || ''
    const fileFormat = meta?.format || ''
    const fileDimCm = (meta?.width && meta?.height) ? `${meta.width} × ${meta.height} cm` : ''
    const printDimM = (order.ancho && order.alto) ? `${Number(order.ancho).toFixed(2)} × ${Number(order.alto).toFixed(2)} m` : ''
    const hasMeta = dpi > 0 || colorMode || fileFormat

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

    const pdfFilename = `Presupuesto_XignuX_${strId(order.id)}_v1.pdf`
    const fecha = order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR')

    const totalNum = Number(order.total || order.subtotal || 0)
    const subtotalNum = Number(order.subtotal || order.total || 0)
    const senaNum = totalNum * 0.5
    const saldoNum = totalNum - senaNum

    const formatCurrency = (val: number) => {
        return `$${val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const items = (order as any).carteles || [
        {
            descripcion: `Cartel ${order.material || 'Lona Front_light_13oz'} ${order.ancho || 0}x${order.alto || 0}m`,
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
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

                @page {
                    size: A4 portrait;
                    margin: 0;
                }

                * { box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif; }

                html, body {
                    margin: 0;
                    padding: 0;
                    background: #525659;
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
                    padding: 18mm 20mm 15mm 20mm;
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
                    text-align: center;
                    margin-bottom: 20px;
                }
                .brand-logo-img {
                    width: 135px;
                    height: auto;
                    display: block;
                    margin: 0 auto 10px auto;
                }
                .brand-name {
                    font-size: 20px;
                    font-weight: 800;
                    color: #1e2433;
                    letter-spacing: 0.5px;
                    margin-bottom: 2px;
                }
                .brand-address {
                    font-size: 12.5px;
                    color: #475569;
                }
                .brand-contact {
                    font-size: 12.5px;
                    color: #475569;
                }
                .header-divider {
                    border: none;
                    border-top: 1.5px solid #1e2433;
                    margin-top: 15px;
                    margin-bottom: 22px;
                }

                /* Client & Metadata Section */
                .meta-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 25px;
                }
                .meta-left {
                    max-width: 58%;
                }
                .meta-right {
                    text-align: right;
                }
                .section-label {
                    font-size: 10.5px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    margin-bottom: 6px;
                }
                .meta-text {
                    font-size: 13px;
                    color: #1e2433;
                    margin-top: 3px;
                }
                .doc-title {
                    font-size: 19px;
                    font-weight: 800;
                    color: #1e2433;
                    letter-spacing: 0.5px;
                }
                .doc-filename {
                    font-size: 11.5px;
                    color: #64748b;
                    margin-top: 2px;
                }
                .doc-date {
                    font-size: 11.5px;
                    color: #475569;
                    margin-top: 3px;
                }
                .issuer-label {
                    font-size: 10px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    margin-top: 10px;
                }
                .issuer-name {
                    font-size: 15px;
                    font-weight: 800;
                    color: #1e2433;
                }
                .issuer-role {
                    font-size: 11.5px;
                    color: #64748b;
                }

                /* Items Table */
                .items-table-container {
                    position: relative;
                    margin-bottom: 25px;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    position: relative;
                    z-index: 2;
                    border: 1px solid #e2e8f0;
                }
                .items-table th {
                    background: #1e2433;
                    color: #ffffff;
                    font-size: 11.5px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    padding: 10px 14px;
                }
                .items-table td {
                    padding: 12px 14px;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 13px;
                    color: #1e2433;
                }
                .items-table tr:nth-child(even) td {
                    background: #f8fafc;
                }

                /* Watermark Image Background */
                .watermark-bg {
                    position: absolute;
                    top: 45%;
                    left: 50%;
                    transform: translate(-50%, -40%);
                    opacity: 0.06;
                    pointer-events: none;
                    text-align: center;
                    z-index: 1;
                }
                .watermark-img {
                    width: 280px;
                    height: auto;
                }

                /* Totals Section */
                .totals-section {
                    margin-top: 20px;
                    margin-bottom: 30px;
                    position: relative;
                    z-index: 2;
                }
                .totals-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 1px solid #cbd5e1;
                }
                .totals-table td {
                    padding: 10px 18px;
                    font-size: 13.5px;
                }
                .row-subtotal td {
                    background: #f8fafc;
                    color: #334155;
                }
                .row-total-general td {
                    background: #f1f5f9;
                    font-weight: 700;
                    color: #1e2433;
                }
                .row-sena td {
                    background: #f8fafc;
                    color: #15803d;
                    font-weight: 700;
                }
                .row-saldo td {
                    background: #1e2433;
                    color: #ffffff;
                    font-weight: 800;
                    font-size: 14.5px;
                }

                /* Technical Specs Section */
                .tech-specs {
                    margin: 18px 0;
                    padding: 14px 18px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    position: relative;
                    z-index: 2;
                }
                .tech-specs-title {
                    font-size: 10.5px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    margin-bottom: 10px;
                }
                .tech-specs-grid {
                    display: flex;
                    gap: 24px;
                    flex-wrap: wrap;
                }
                .tech-spec-item {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .tech-spec-label {
                    font-size: 10px;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .tech-spec-value {
                    font-size: 13.5px;
                    font-weight: 700;
                    color: #1e2433;
                }
                .dpi-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 800;
                    color: #ffffff;
                    margin-left: 6px;
                    vertical-align: middle;
                }

                /* Footer Fine Print */
                .fine-print {
                    text-align: center;
                    font-size: 11px;
                    font-style: italic;
                    color: #64748b;
                    margin-top: auto;
                    padding-top: 15px;
                    border-top: 1px dashed #cbd5e1;
                }

                @media print {
                    .no-print-bar { display: none !important; }
                    html, body { background: #ffffff !important; }
                    .a4-page {
                        width: 210mm !important;
                        height: 297mm !important;
                        min-height: 297mm !important;
                        margin: 0 !important;
                        padding: 15mm 15mm 15mm 15mm !important;
                        box-shadow: none !important;
                        page-break-after: avoid !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="no-print-bar">
                <span>Impresión Presupuesto A4 - XignuX Gráfica</span>
                <button onclick="window.print()" class="btn-print">
                    🖨️ Imprimir / Guardar como PDF
                </button>
            </div>

            <div class="a4-page">
                <div>
                    <!-- Header Center Logo -->
                    <div class="header-brand">
                        <img src="${XIGNUX_LOGO_BASE64}" class="brand-logo-img" alt="XignuX Logo" />
                        <div class="brand-name">XIGNUX GRÁFICA</div>
                        <div class="brand-address">Jose V. Cardozo 912, Córdoba</div>
                        <div class="brand-contact">Tel: +54 9 3517897667 · xignux.dis@gmail.com</div>
                        <hr class="header-divider" />
                    </div>

                    <!-- Metadata Row -->
                    <div class="meta-section">
                        <div class="meta-left">
                            <div class="section-label">DATOS DEL CLIENTE</div>
                            <div class="meta-text"><strong>Razón Social:</strong> ${clienteNombre}</div>
                            <div class="meta-text"><strong>Dirección de Obra:</strong> ${direccionObra}</div>
                        </div>

                        <div class="meta-right">
                            <div class="doc-title">PRESUPUESTO</div>
                            <div class="doc-filename">${pdfFilename}</div>
                            <div class="doc-date">Fecha: ${fecha}</div>

                            <div class="issuer-label">EMITIDO POR</div>
                            <div class="issuer-name">${operario}</div>
                            <div class="issuer-role">${operarioRol}</div>
                        </div>
                    </div>

                    <!-- Table of Items -->
                    <div class="items-table-container">
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th style="width: 52%; text-align: left;">ÍTEM</th>
                                    <th style="width: 12%; text-align: center;">CANT</th>
                                    <th style="width: 18%; text-align: right;">P. UNIT</th>
                                    <th style="width: 18%; text-align: right;">SUBTOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map((it: any) => `
                                    <tr>
                                        <td style="text-align: left;">${it.descripcion || `Cartel ${order.material || 'Lona Front_light_13oz'} ${order.ancho || 0}x${order.alto || 0}m`}</td>
                                        <td style="text-align: center;">${it.cant || order.copias || 1}</td>
                                        <td style="text-align: right;">${formatCurrency(it.unit || (totalNum / (order.copias || 1)))}</td>
                                        <td style="text-align: right;">${formatCurrency(it.subtotal || totalNum)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <!-- Background Watermark Image -->
                        <div class="watermark-bg">
                            <img src="${XIGNUX_LOGO_BASE64}" class="watermark-img" alt="Watermark Logo" />
                        </div>
                    </div>

                    <!-- Technical Specifications -->
                    ${hasMeta ? `
                    <div class="tech-specs">
                        <div class="tech-specs-title">📐 Especificaciones Técnicas del Archivo</div>
                        <div class="tech-specs-grid">
                            ${dpi > 0 ? `
                            <div class="tech-spec-item">
                                <span class="tech-spec-label">Resolución</span>
                                <span class="tech-spec-value">
                                    ${dpi} DPI
                                    <span class="dpi-badge" style="background: ${dpiQuality.color}">${dpiQuality.label}</span>
                                </span>
                            </div>` : ''}
                            ${colorMode ? `
                            <div class="tech-spec-item">
                                <span class="tech-spec-label">Modo Color</span>
                                <span class="tech-spec-value">${colorMode}</span>
                            </div>` : ''}
                            ${fileFormat ? `
                            <div class="tech-spec-item">
                                <span class="tech-spec-label">Formato</span>
                                <span class="tech-spec-value">${fileFormat}</span>
                            </div>` : ''}
                            ${fileDimCm ? `
                            <div class="tech-spec-item">
                                <span class="tech-spec-label">Dim. Archivo</span>
                                <span class="tech-spec-value">${fileDimCm}</span>
                            </div>` : ''}
                            ${printDimM ? `
                            <div class="tech-spec-item">
                                <span class="tech-spec-label">Medida Impresión</span>
                                <span class="tech-spec-value">${printDimM}</span>
                            </div>` : ''}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Totals Section -->
                    <div class="totals-section">
                        <table class="totals-table">
                            <tr class="row-subtotal">
                                <td style="text-align: left;">Subtotal:</td>
                                <td style="text-align: right;">${formatCurrency(subtotalNum)}</td>
                            </tr>
                            <tr class="row-total-general">
                                <td style="text-align: left;">TOTAL GENERAL:</td>
                                <td style="text-align: right;">${formatCurrency(totalNum)}</td>
                            </tr>
                            <tr class="row-sena">
                                <td style="text-align: left;">Seña Pactada (50%):</td>
                                <td style="text-align: right;">${formatCurrency(senaNum)}</td>
                            </tr>
                            <tr class="row-saldo">
                                <td style="text-align: left;">SALDO RESTANTE:</td>
                                <td style="text-align: right;">${formatCurrency(saldoNum)}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Fine Print Footer -->
                <div class="fine-print">
                    Condiciones comerciales: Presupuesto válido por 15 días a partir de la fecha de emisión. La producción inicia con la acreditación de la seña. Los tiempos de entrega son pactados con el cliente.
                </div>
            </div>
        </body>
        </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
}
