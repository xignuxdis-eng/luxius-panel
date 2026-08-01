import type { UnidadMedida } from '@/types/orden';

export interface PresupuestoItem {
    id: string;
    concepto: string;
    unidadMedida: UnidadMedida;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    isCustom?: boolean;
}

export interface PresupuestoData {
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
}

export function generatePresupuestoHTML(data: PresupuestoData): string {
    const unidadLabel = (u: UnidadMedida) => {
        switch (u) {
            case 'm2': return 'm²';
            case 'ml': return 'ml';
            case 'u': return 'Unid.';
            case 'global': return 'Global';
            case 'lote': return 'Lote';
            default: return u;
        }
    };

    const itemsRows = data.items.map((item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 12px; text-align: center; color: #64748b; font-weight: 500;">${idx + 1}</td>
            <td style="padding: 10px 12px; text-align: left; color: #1e293b; font-weight: 600;">${item.concepto}</td>
            <td style="padding: 10px 12px; text-align: center; color: #334155;">${item.cantidad}</td>
            <td style="padding: 10px 12px; text-align: center; color: #475569; font-weight: 500;">${unidadLabel(item.unidadMedida)}</td>
            <td style="padding: 10px 12px; text-align: right; color: #334155;">$${item.precioUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td style="padding: 10px 12px; text-align: right; color: #0f172a; font-weight: 700;">$${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Presupuesto N° ${data.numeroPresupuesto} - XignuX Print Den</title>
    <style>
        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background-color: #ffffff;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .brand-title {
            font-size: 28px;
            font-weight: 800;
            color: #4f46e5;
            letter-spacing: -0.5px;
        }
        .brand-subtitle {
            font-size: 13px;
            color: #64748b;
            margin-top: 4px;
        }
        .doc-title {
            text-align: right;
        }
        .doc-title h1 {
            font-size: 24px;
            margin: 0;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .doc-number {
            font-size: 14px;
            color: #6366f1;
            font-weight: 700;
            margin-top: 4px;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 18px;
            margin-bottom: 30px;
            border: 1px solid #e2e8f0;
        }
        .meta-card h3 {
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
            margin: 0 0 6px 0;
            letter-spacing: 0.5px;
        }
        .meta-card p {
            margin: 2px 0;
            font-size: 14px;
            color: #1e293b;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        th {
            background-color: #4f46e5;
            color: #ffffff;
            font-size: 12px;
            text-transform: uppercase;
            padding: 12px;
            letter-spacing: 0.5px;
        }
        .totals-container {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        .totals-table {
            width: 300px;
        }
        .totals-table td {
            padding: 6px 12px;
            font-size: 14px;
        }
        .totals-table .total-row {
            font-size: 18px;
            font-weight: 800;
            color: #4f46e5;
            border-top: 2px solid #cbd5e1;
            padding-top: 10px;
        }
        .footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 12px;
            color: #64748b;
            line-height: 1.6;
        }
        @media print {
            body { padding: 20px; }
            button { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="brand-title">XignuX Print Den</div>
            <div class="brand-subtitle">Imprenta Digital & Soluciones Gráficas de Alto Nivel</div>
        </div>
        <div class="doc-title">
            <h1>Presupuesto</h1>
            <div class="doc-number">N° ${data.numeroPresupuesto}</div>
        </div>
    </div>

    <div class="meta-grid">
        <div class="meta-card">
            <h3>Cliente</h3>
            <p><strong>${data.clienteNombre}</strong></p>
            ${data.clienteEmpresa ? `<p>${data.clienteEmpresa}</p>` : ''}
            ${data.clienteTelefono ? `<p>Tel: ${data.clienteTelefono}</p>` : ''}
            ${data.clienteEmail ? `<p>Email: ${data.clienteEmail}</p>` : ''}
        </div>
        <div class="meta-card" style="text-align: right;">
            <h3>Detalles de Emisión</h3>
            <p><strong>Fecha:</strong> ${data.fecha}</p>
            <p><strong>Validez:</strong> ${data.validezDias} días hábiles</p>
            <p><strong>Atendido por:</strong> ${data.vendedorNombre}</p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="border-radius: 6px 0 0 6px;">#</th>
                <th style="text-align: left;">Descripción / Concepto</th>
                <th style="text-align: center;">Cant.</th>
                <th style="text-align: center;">Unidad</th>
                <th style="text-align: right;">P. Unitario</th>
                <th style="border-radius: 0 6px 6px 0; text-align: right;">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            ${itemsRows}
        </tbody>
    </table>

    <div class="totals-container">
        <table class="totals-table">
            <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">$${data.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            </tr>
            ${data.descuento > 0 ? `
            <tr style="color: #16a34a;">
                <td>Bonificación:</td>
                <td style="text-align: right;">-$${data.descuento.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
                <td>Total Neto:</td>
                <td style="text-align: right;">$${data.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            </tr>
        </table>
    </div>

    ${data.observaciones ? `
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px; margin-bottom: 30px; font-size: 13px; color: #92400e;">
        <strong>Observaciones / Notas:</strong> ${data.observaciones}
    </div>
    ` : ''}

    <div class="footer">
        <p>• Los precios expresados incluyen impuestos salvo indicación contraria.</p>
        <p>• Presupuesto válido por ${data.validezDias} días a partir de la fecha de emisión.</p>
        <p>• Para confirmar el pedido se requiere el 50% de seña inicial.</p>
    </div>
</body>
</html>
    `;
}

export function downloadPresupuestoPDF(data: PresupuestoData) {
    const htmlContent = generatePresupuestoHTML(data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }
}
