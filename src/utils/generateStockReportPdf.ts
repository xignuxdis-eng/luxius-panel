import type { MovimientoStock } from '@/types'
import { XIGNUX_LOGO_LIGHT } from './logoBase64Light'

export interface StockReportOptions {
    periodo: string
}

const escapeHtml = (s: string) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const TIPO_LABEL: Record<MovimientoStock['tipo'], string> = {
    ingreso: 'Ingreso',
    egreso: 'Egreso',
    ajuste: 'Ajuste',
    inicial: 'Inicial'
}

const TIPO_COLOR: Record<MovimientoStock['tipo'], string> = {
    ingreso: '#16a34a',
    egreso: '#dc2626',
    ajuste: '#d97706',
    inicial: '#2563eb'
}

export function generateStockReportPdf(movimientos: MovimientoStock[], options: StockReportOptions) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
        alert('Por favor permite las ventanas emergentes (popups) para generar el PDF.')
        return
    }

    const fechaEmision = new Date().toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    const pdfFilename = `Historial_Stock_XignuX_${new Date().toISOString().split('T')[0]}.pdf`

    const totalIngresos = movimientos
        .filter(m => m.tipo === 'ingreso' || m.tipo === 'inicial')
        .reduce((sum, m) => sum + m.cantidad, 0)
    const totalEgresos = movimientos
        .filter(m => m.tipo === 'egreso')
        .reduce((sum, m) => sum + m.cantidad, 0)

    const rows = movimientos.map(m => {
        const sign = m.tipo === 'ingreso' || m.tipo === 'inicial' ? '+' : m.tipo === 'egreso' ? '-' : ''
        const fecha = m.fecha ? new Date(m.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '-'
        return `
            <tr>
                <td style="white-space: nowrap;">${fecha}</td>
                <td><strong>${escapeHtml(m.materialCodigo)}</strong><br><span style="font-size: 10px; color: #64748b;">${escapeHtml(m.materialDescripcion)}</span></td>
                <td style="text-align: center;"><span class="badge" style="background: ${TIPO_COLOR[m.tipo]}1a; color: ${TIPO_COLOR[m.tipo]}; border: 1px solid ${TIPO_COLOR[m.tipo]}55;">${TIPO_LABEL[m.tipo]}</span></td>
                <td style="text-align: right; font-weight: 700; color: ${TIPO_COLOR[m.tipo]};">${sign}${m.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
                <td style="text-align: right;">${m.stockAnterior.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
                <td style="text-align: right; font-weight: 700;">${m.stockNuevo.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
                <td style="text-align: center; font-size: 11px; color: #64748b;">${escapeHtml(m.usuario)}</td>
            </tr>
        `
    }).join('')

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>${pdfFilename}</title>
            <style>
                @page { size: A4 portrait; margin: 0; }
                * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
                html, body { margin: 0; padding: 0; background: #525659; color: #1e2433; font-size: 12px; line-height: 1.4; }

                .no-print-bar {
                    display: flex; justify-content: space-between; align-items: center;
                    background: #1e2433; color: #ffffff; padding: 12px 24px; width: 100%;
                    max-width: 210mm; margin: 20px auto 10px auto; border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }
                .btn-print {
                    background: #2563eb; color: #ffffff; border: none; padding: 9px 22px;
                    font-size: 13px; font-weight: 700; border-radius: 6px; cursor: pointer;
                }

                .a4-page {
                    width: 210mm; min-height: 297mm; padding: 14mm 16mm 12mm 16mm;
                    margin: 0 auto 30px auto; background: #ffffff; position: relative;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.25);
                }

                .header-brand {
                    display: flex; justify-content: space-between; align-items: center;
                    border-bottom: 2px solid #1e2433; padding-bottom: 12px; margin-bottom: 18px;
                }
                .brand-logo-img { height: 52px; width: auto; display: block; }
                .doc-type { font-size: 15px; font-weight: 800; color: #2563eb; text-transform: uppercase; text-align: right; }
                .doc-date { font-size: 11px; color: #64748b; text-align: right; margin-top: 3px; }

                .summary-strip {
                    display: flex; gap: 16px; margin-bottom: 18px;
                }
                .summary-box {
                    flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px;
                }
                .summary-box .label { font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                .summary-box .value { font-size: 15px; font-weight: 800; margin-top: 2px; }
                .value.pos { color: #16a34a; }
                .value.neg { color: #dc2626; }

                table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; }
                th {
                    background: #1e2433; color: #ffffff; font-size: 10.5px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left;
                }
                td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; }
                tr:nth-child(even) td { background: #f8fafc; }
                .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
                tr { page-break-inside: avoid; break-inside: avoid; }

                .fine-print {
                    text-align: center; font-size: 10px; color: #94a3b8; margin-top: 24px;
                    border-top: 1px solid #e2e8f0; padding-top: 10px;
                }

                @media print {
                    .no-print-bar { display: none !important; }
                    html, body { background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .a4-page {
                        width: 100% !important; min-height: auto !important; height: auto !important;
                        margin: 0 !important; padding: 10mm 15mm !important; box-shadow: none !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="no-print-bar">
                <span><strong>Historial de Entradas de Stock</strong> — XignuX Gráfica</span>
                <button onclick="window.print()" class="btn-print">🖨️ Imprimir / Guardar como PDF</button>
            </div>

            <div class="a4-page">
                <div class="header-brand">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <img src="${XIGNUX_LOGO_LIGHT}" class="brand-logo-img" alt="XignuX Logo" />
                        <div>
                            <div style="font-size: 15px; font-weight: 800; color: #1e2433;">Servicios Gráficos e Impresión Digital Profesional</div>
                            <div style="font-size: 11px; color: #64748b;">José V. Cardozo 912, Córdoba · Tel: 3517897667/3517717071</div>
                        </div>
                    </div>
                    <div>
                        <div class="doc-type">Historial de Entradas de Stock</div>
                        <div class="doc-date">Emitido: ${fechaEmision}</div>
                        <div class="doc-date">Período: ${escapeHtml(options.periodo)}</div>
                    </div>
                </div>

                <div class="summary-strip">
                    <div class="summary-box">
                        <div class="label">Movimientos</div>
                        <div class="value">${movimientos.length}</div>
                    </div>
                    <div class="summary-box">
                        <div class="label">Total Ingresos</div>
                        <div class="value pos">+${totalIngresos.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</div>
                    </div>
                    <div class="summary-box">
                        <div class="label">Total Egresos</div>
                        <div class="value neg">-${totalEgresos.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%;">Fecha y Hora</th>
                            <th style="width: 30%;">Material</th>
                            <th style="width: 12%; text-align: center;">Tipo</th>
                            <th style="width: 12%; text-align: right;">Cantidad</th>
                            <th style="width: 11%; text-align: right;">Stock Ant.</th>
                            <th style="width: 11%; text-align: right;">Stock Nuevo</th>
                            <th style="width: 9%; text-align: center;">Usuario</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>

                <div class="fine-print">
                    XignuX Servicios Gráficos e Impresión Digital Profesional · Documento generado electrónicamente con el historial completo de entradas y ajustes de stock.
                </div>
            </div>

            <script>
                (function() {
                    function printWhenReady() {
                        var images = Array.from(document.images);
                        var promises = images.map(function(img) {
                            if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                            return new Promise(function(resolve) {
                                img.onload = function() { resolve(); };
                                img.onerror = function() { resolve(); };
                            });
                        });
                        var timeoutPromise = new Promise(function(resolve) { setTimeout(resolve, 2000); });
                        Promise.race([Promise.all(promises), timeoutPromise]).then(function() {
                            setTimeout(function() { window.print(); }, 200);
                        });
                    }
                    if (document.readyState === 'complete') printWhenReady();
                    else window.addEventListener('load', printWhenReady);
                })();
            </script>
        </body>
        </html>
    `

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
}
