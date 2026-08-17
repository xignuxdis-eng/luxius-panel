import os

with open(r'F:\Sitio XignuX\src\utils\logoBase64.txt', 'r', encoding='utf-8') as f:
    logo_b64 = f.read().strip()

content = f"""import type {{ UnidadMedida }} from '@/types/orden';

export interface PresupuestoItem {{
    id: string;
    concepto: string;
    unidadMedida: UnidadMedida;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    isCustom?: boolean;
}}

export interface PresupuestoData {{
    numeroPresupuesto: string;
    fecha: string;
    validezDias: number;
    clienteNombre: string;
    clienteEmpresa?: string;
    clienteTelefono?: string;
    clienteEmail?: string;
    items: PresupuestoItem[];
    subtotal: number;
    descuento: number;
    total: number;
    observaciones?: string;
    vendedorNombre: string;
}}

const LOGO_BASE64 = "{logo_b64}";

export function generatePresupuestoHTML(data: PresupuestoData): string {{
    const unidadLabel = (u: UnidadMedida) => {{
        switch (u) {{
            case 'm2': return 'm²';
            case 'ml': return 'ml';
            case 'u': return 'Unid.';
            case 'global': return 'Global';
            case 'lote': return 'Lote';
            default: return u;
        }}
    }};

    const itemsRows = data.items.map((item, idx) => `
        <tr>
            <td style="padding: 10px 12px; text-align: left; color: #1e293b; font-weight: 500; border-bottom: 1px solid #e2e8f0;">\${item.concepto}</td>
            <td style="padding: 10px 12px; text-align: center; color: #334155; border-bottom: 1px solid #e2e8f0;">\${item.cantidad} \${unidadLabel(item.unidadMedida)}</td>
            <td style="padding: 10px 12px; text-align: right; color: #334155; border-bottom: 1px solid #e2e8f0;">$\${item.precioUnitario.toLocaleString('es-AR', {{ minimumFractionDigits: 2 }})}</td>
            <td style="padding: 10px 12px; text-align: right; color: #1e293b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">$\${item.subtotal.toLocaleString('es-AR', {{ minimumFractionDigits: 2 }})}</td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Presupuesto N° \${data.numeroPresupuesto}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background-color: #ffffff;
            position: relative;
        }}
        .watermark {{
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.05;
            width: 400px;
            z-index: -1;
            pointer-events: none;
        }}
        .header {{
            text-align: center;
            margin-bottom: 20px;
        }}
        .header img {{
            height: 120px;
            object-fit: contain;
            margin-bottom: 15px;
        }}
        .header h1 {{
            font-size: 20px;
            color: #1e293b;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
        }}
        .header p {{
            margin: 2px 0;
            font-size: 13px;
            color: #475569;
        }}
        .divider {{
            height: 2px;
            background-color: #1e293b;
            margin: 20px 0;
        }}
        .meta-container {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            font-size: 13px;
        }}
        .meta-left h3, .meta-right h3 {{
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0 0 8px 0;
        }}
        .meta-right {{
            text-align: right;
        }}
        .meta-right h2 {{
            font-size: 18px;
            margin: 0 0 4px 0;
            color: #1e293b;
            text-transform: uppercase;
            font-weight: 700;
        }}
        .meta-right .doc-name {{
            font-family: monospace;
            color: #475569;
            margin-bottom: 12px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }}
        th {{
            background-color: #1e293b;
            color: #ffffff;
            font-size: 11px;
            text-transform: uppercase;
            padding: 10px 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }}
        .totals-container {{
            width: 100%;
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
        }}
        .totals-box {{
            width: 400px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
        }}
        .totals-row {{
            display: flex;
            justify-content: space-between;
            padding: 12px 16px;
            font-size: 13px;
            color: #334155;
            background: #f8fafc;
        }}
        .totals-row:not(:last-child) {{
            border-bottom: 1px solid #e2e8f0;
        }}
        .total-row-bold {{
            font-weight: 700;
            color: #1e293b;
            background: #f1f5f9;
        }}
        .total-final {{
            background-color: #1e293b;
            color: #ffffff;
            font-weight: 700;
            font-size: 15px;
        }}
        .footer {{
            text-align: center;
            font-style: italic;
            color: #64748b;
            font-size: 11px;
            margin-top: 40px;
            line-height: 1.5;
        }}
    </style>
</head>
<body>
    <img src="\${LOGO_BASE64}" class="watermark" />

    <div class="header">
        <img src="\${LOGO_BASE64}" alt="XignuX Logo" />
        <h1>XIGNUX GRÁFICA</h1>
        <p>Jose V. Cardozo 912, Córdoba</p>
        <p>Tel: +54 9 3517897667 · xignux.dis@gmail.com</p>
    </div>

    <div class="divider"></div>

    <div class="meta-container">
        <div class="meta-left">
            <h3>Datos del Cliente</h3>
            <div style="margin-bottom: 4px;"><strong>Razón Social:</strong> \${data.clienteNombre}</div>
            \${data.clienteEmpresa ? `<div style="margin-bottom: 4px;"><strong>Empresa:</strong> \${data.clienteEmpresa}</div>` : ''}
            \${data.clienteEmail ? `<div style="margin-bottom: 4px;"><strong>Email:</strong> \${data.clienteEmail}</div>` : ''}
        </div>
        <div class="meta-right">
            <h2>PRESUPUESTO</h2>
            <div class="doc-name">Presupuesto_XignuX_\${data.numeroPresupuesto}_v1.pdf</div>
            <div style="margin-bottom: 12px;">Fecha: \${data.fecha}</div>
            <h3>Emitido Por</h3>
            <div style="font-weight: 700; font-size: 14px; text-transform: uppercase;">\${data.vendedorNombre}</div>
            <div style="color: #64748b; font-size: 11px;">principal</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="text-align: left;">Ítem</th>
                <th style="text-align: center;">Cant</th>
                <th style="text-align: right;">P. Unit</th>
                <th style="text-align: right;">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            \${itemsRows}
        </tbody>
    </table>

    <div class="totals-container">
        <div class="totals-box">
            <div class="totals-row">
                <span>Subtotal:</span>
                <span>$\${data.subtotal.toLocaleString('es-AR', {{ minimumFractionDigits: 2 }})}</span>
            </div>
            \${data.descuento > 0 ? `
            <div class="totals-row">
                <span>Bonificación:</span>
                <span>-$\${data.descuento.toLocaleString('es-AR', {{ minimumFractionDigits: 2 }})}</span>
            </div>
            ` : ''}
            <div class="totals-row total-row-bold">
                <span>TOTAL GENERAL:</span>
                <span>$\${data.total.toLocaleString('es-AR', {{ minimumFractionDigits: 2 }})}</span>
            </div>
            <div class="totals-row" style="color: #10b981;">
                <span>Seña Pactada (50%):</span>
                <span>$\${(data.total * 0.5).toLocaleString('es-AR', {{ minimumFractionDigits: 2 }})}</span>
            </div>
            <div class="totals-row total-final">
                <span>SALDO RESTANTE:</span>
                <span>$\${(data.total * 0.5).toLocaleString('es-AR', {{ minimumFractionDigits: 2 }})}</span>
            </div>
        </div>
    </div>

    \${data.observaciones ? `
    <div style="font-size: 12px; color: #334155; border-left: 3px solid #1e293b; padding-left: 12px; margin-bottom: 20px;">
        <strong>Observaciones:</strong><br/>\${data.observaciones}
    </div>
    ` : ''}

    <div class="footer">
        Condiciones comerciales: Presupuesto válido por \${data.validezDias} días a partir de la fecha de emisión. La producción inicia con la acreditación de la seña. Los tiempos de entrega son pactados con el cliente.
    </div>
</body>
</html>
    `;
}}

export function downloadPresupuestoPDF(data: PresupuestoData) {{
    const htmlContent = generatePresupuestoHTML(data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {{
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {{
            printWindow.print();
        }}, 500);
    }}
}}
"""

with open(r'F:\Sitio XignuX\src\utils\presupuestoPdf.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('PDF Generator updated successfully.')
