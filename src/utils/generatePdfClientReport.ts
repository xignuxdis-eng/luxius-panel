import type { Order } from '@/types'
import { XIGNUX_LOGO_BASE64 } from './logoBase64'

export interface ClientReportOptions {
    clienteNombre: string;
    clienteEmpresa?: string;
    clienteTelefono?: string;
    clienteEmail?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    estadoFiltro?: string;
    categoriaFiltro?: string;
    materialFiltro?: string;
    tituloReporte?: string;
}

export function generatePdfClientReport(orders: Order[], options: ClientReportOptions) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
        alert('Por favor permite las ventanas emergentes (popups) para generar el PDF del reporte.')
        return
    }

    const fechaEmision = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })

    const clienteNombre = options.clienteNombre || 'Todos los Clientes'
    const tituloReporte = options.tituloReporte || 'ESTADO DE CUENTA Y REPORTES DE TRABAJOS'
    const pdfFilename = `Reporte_Cliente_${clienteNombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`

    const formatCurrency = (val: number) => {
        return `$${val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    // Financial calculations
    let totalGeneral = 0
    let totalSena = 0
    let totalSaldo = 0

    const mappedRows = orders.map(order => {
        const total = Number(order.total || order.subtotal || 0)
        // Assume 50% deposit unless specified
        const sena = (order as any).sena !== undefined ? Number((order as any).sena) : (order.status === 'entregado' || order.status === 'finalizado' ? total : total * 0.5)
        const saldo = Math.max(0, total - sena)

        totalGeneral += total
        totalSena += sena
        totalSaldo += saldo

        const otDisplay = order.ot || `OT-${order.id}`
        const fecha = order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-AR') : '-'
        
        let desc = (order.nombreTarea || order.observaciones || '').trim()
        if (!desc || desc.startsWith('Proyecto #') || desc.startsWith('Proyecto OT-')) {
            desc = order.material || 'Trabajo de Impresión'
        }
        if (order.ancho && order.alto) {
            desc += ` (${Number(order.ancho).toFixed(2)}x${Number(order.alto).toFixed(2)}m)`
        }

        const statusLabel = order.status === 'diseno' || order.status === 'preorden' ? 'Diseño' :
                           order.status === 'orden' ? 'En Impresión' :
                           order.status === 'impreso' || order.status === 'post' ? 'Impreso' :
                           order.status === 'entregado' || order.status === 'finalizado' ? 'Entregado' : order.status

        return {
            ot: otDisplay,
            fecha,
            desc,
            material: order.material || '-',
            copias: order.copias || 1,
            status: statusLabel,
            total,
            sena,
            saldo
        }
    })

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
                    font-size: 12px;
                    line-height: 1.4;
                }

                /* Floating Top Action Bar */
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
                    padding: 16mm 18mm 14mm 18mm;
                    margin: 0 auto 30px auto;
                    background: #ffffff;
                    position: relative;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.25);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                /* Header Brand */
                .header-brand {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #1e2433;
                    padding-bottom: 12px;
                    margin-bottom: 18px;
                }
                .brand-left {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .brand-logo-img {
                    width: 110px;
                    height: auto;
                }
                .brand-info {
                    display: flex;
                    flex-direction: column;
                }
                .brand-title {
                    font-size: 18px;
                    font-weight: 800;
                    color: #1e2433;
                    letter-spacing: 0.5px;
                }
                .brand-sub {
                    font-size: 11px;
                    color: #475569;
                    font-weight: 500;
                }
                .header-doc-info {
                    text-align: right;
                }
                .doc-type {
                    font-size: 14px;
                    font-weight: 800;
                    color: #2563eb;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .doc-date {
                    font-size: 11px;
                    color: #64748b;
                    margin-top: 3px;
                }

                /* Client Info Box */
                .client-box {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 12px 16px;
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .box-field-label {
                    font-size: 9.5px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .box-field-val {
                    font-size: 13px;
                    font-weight: 700;
                    color: #1e2433;
                    margin-top: 2px;
                }

                /* Items Table */
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 1px solid #cbd5e1;
                    margin-bottom: 20px;
                }
                .items-table th {
                    background: #1e2433;
                    color: #ffffff;
                    font-size: 10.5px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    padding: 8px 10px;
                    text-align: left;
                }
                .items-table td {
                    padding: 9px 10px;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 11.5px;
                    color: #1e2433;
                }
                .items-table tr:nth-child(even) td {
                    background: #f8fafc;
                }
                .text-right { text-align: right; }
                .text-center { text-align: center; }

                .badge-status {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    background: #e2e8f0;
                    color: #334155;
                }

                /* Summary Totals Box */
                .summary-card {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 20px;
                }
                .totals-table {
                    width: 280px;
                    border-collapse: collapse;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .totals-table td {
                    padding: 8px 14px;
                    font-size: 12px;
                }
                .row-sub td { background: #f8fafc; color: #475569; }
                .row-sena td { background: #f0fdf4; color: #166534; font-weight: 600; }
                .row-saldo td { background: #1e2433; color: #ffffff; font-weight: 800; font-size: 13.5px; }

                /* Footer */
                .footer-box {
                    border-top: 1px dashed #cbd5e1;
                    padding-top: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 10.5px;
                    color: #64748b;
                }

                @media print {
                    .no-print-bar { display: none !important; }
                    html, body { background: #ffffff !important; }
                    .a4-page {
                        box-shadow: none !important;
                        margin: 0 !important;
                        width: 100% !important;
                        min-height: auto !important;
                        padding: 10mm 15mm !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="no-print-bar">
                <div>
                    <strong>Reporte de Cliente XignuX</strong> — Listo para guardar o imprimir en PDF
                </div>
                <button class="btn-print" onclick="window.print()">
                    🖨️ Imprimir / Guardar en PDF
                </button>
            </div>

            <div class="a4-page">
                <div>
                    <!-- Header Brand -->
                    <div class="header-brand">
                        <div class="brand-left">
                            <img src="${XIGNUX_LOGO_BASE64}" alt="XignuX Logo" class="brand-logo-img">
                            <div class="brand-info">
                                <span class="brand-title">XIGNUX PRINT DEN</span>
                                <span class="brand-sub">Soluciones Gráficas e Impresión Digital</span>
                                <span class="brand-sub">Eduardo Secchi 4438 | Tel: +54 9 351 234-5678</span>
                            </div>
                        </div>
                        <div class="header-doc-info">
                            <div class="doc-type">${tituloReporte}</div>
                            <div class="doc-date">Fecha de emisión: ${fechaEmision}</div>
                        </div>
                    </div>

                    <!-- Client & Filter Metadata -->
                    <div class="client-box">
                        <div>
                            <div class="box-field-label">Cliente</div>
                            <div class="box-field-val">${clienteNombre}</div>
                        </div>
                        <div>
                            <div class="box-field-label">Período / Filtro</div>
                            <div class="box-field-val" style="font-size: 11px;">
                                ${options.fechaDesde || 'Inicio'} a ${options.fechaHasta || 'Hoy'}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div class="box-field-label">Total Trabajos</div>
                            <div class="box-field-val" style="color: #2563eb;">${orders.length} OTs</div>
                        </div>
                    </div>

                    <!-- Orders Table -->
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 10%;">N° OT</th>
                                <th style="width: 11%;">Fecha</th>
                                <th style="width: 35%;">Descripción del Trabajo</th>
                                <th style="width: 14%;">Estado</th>
                                <th class="text-right" style="width: 10%;">Importe</th>
                                <th class="text-right" style="width: 10%;">Entregado</th>
                                <th class="text-right" style="width: 10%;">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${mappedRows.map(row => `
                                <tr>
                                    <td style="font-weight: 700; color: #2563eb;">${row.ot}</td>
                                    <td>${row.fecha}</td>
                                    <td>${row.desc}</td>
                                    <td><span class="badge-status">${row.status}</span></td>
                                    <td class="text-right" style="font-weight: 600;">${formatCurrency(row.total)}</td>
                                    <td class="text-right" style="color: #166534;">${formatCurrency(row.sena)}</td>
                                    <td class="text-right" style="font-weight: 700; color: ${row.saldo > 0 ? '#dc2626' : '#166534'};">
                                        ${formatCurrency(row.saldo)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <!-- Totals Summary Card -->
                    <div class="summary-card">
                        <table class="totals-table">
                            <tr class="row-sub">
                                <td>Total Contratado:</td>
                                <td class="text-right" style="font-weight: 700;">${formatCurrency(totalGeneral)}</td>
                            </tr>
                            <tr class="row-sena">
                                <td>Total Entregado / Señas:</td>
                                <td class="text-right">${formatCurrency(totalSena)}</td>
                            </tr>
                            <tr class="row-saldo">
                                <td>SALDO PENDIENTE:</td>
                                <td class="text-right">${formatCurrency(totalSaldo)}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer-box">
                    <div>XignuX System — Documento de estado de cuenta emitido electrónicamente.</div>
                    <div>Página 1 de 1</div>
                </div>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 600);
                }
            </script>
        </body>
        </html>
    `

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
}
