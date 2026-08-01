import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientes, getMateriales, getCalidades, saveOrden } from '@/data/db';
import { useAuthStore } from '@/store/authStore';
import { downloadPresupuestoPDF, type PresupuestoItem, type PresupuestoData } from '@/utils/presupuestoPdf';
import type { UnidadMedida } from '@/types/orden';
import './Presupuestador.css';

export default function Presupuestador() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Data lists
    const clientes = getClientes();
    const materiales = getMateriales();
    const calidades = getCalidades();

    // Presupuesto Meta State
    const [selectedClientId, setSelectedClientId] = useState<number | ''>(clientes[0]?.id || '');
    const [validezDias, setValidezDias] = useState<number>(15);
    const [descuento, setDescuento] = useState<number>(0);
    const [observaciones, setObservaciones] = useState<string>('');
    const [numeroPresupuesto, setNumeroPresupuesto] = useState<string>(`P-${Math.floor(1000 + Math.random() * 9000)}`);

    // Item List
    const [items, setItems] = useState<PresupuestoItem[]>([]);

    // Form Tab State: 'catalog' | 'custom'
    const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');

    // Catalog Form State
    const [catMaterial, setCatMaterial] = useState<string>(materiales[0]?.descripcion || materiales[0]?.codigo || 'Lona Front 13oz');
    const [catCalidad, setCatCalidad] = useState<string>(calidades[0]?.nombre || 'Estándar 720DPI');
    const [catAncho, setCatAncho] = useState<number>(1);
    const [catAlto, setCatAlto] = useState<number>(1);
    const [catCopias, setCatCopias] = useState<number>(1);
    const [catPrecioM2, setCatPrecioM2] = useState<number>(12000);

    // Custom Item Form State
    const [customConcepto, setCustomConcepto] = useState<string>('');
    const [customUnidad, setCustomUnidad] = useState<UnidadMedida>('u');
    const [customCantidad, setCustomCantidad] = useState<number>(1);
    const [customPrecioUnitario, setCustomPrecioUnitario] = useState<number>(15000);

    // Auto-update Catalog M2 Price based on material selection
    useEffect(() => {
        const mat = materiales.find(m => (m.descripcion || m.codigo) === catMaterial);
        if (mat && mat.precioM2) {
            setCatPrecioM2(mat.precioM2);
        }
    }, [catMaterial]);

    const handleAddCatalogItem = (e: React.FormEvent) => {
        e.preventDefault();
        const areaM2 = (catAncho || 1) * (catAlto || 1);
        const subtotal = areaM2 * catCopias * catPrecioM2;

        const newItem: PresupuestoItem = {
            id: `item-${Date.now()}`,
            concepto: `${catMaterial} (${catCalidad}) - ${catAncho}x${catAlto}m`,
            unidadMedida: 'm2',
            cantidad: Math.round(areaM2 * catCopias * 100) / 100,
            precioUnitario: catPrecioM2,
            subtotal: subtotal,
            isCustom: false
        };

        setItems([...items, newItem]);
    };

    const handleAddCustomItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customConcepto.trim()) {
            alert('Por favor ingrese una descripción para el trabajo especial.');
            return;
        }

        const subtotal = (customCantidad || 1) * (customPrecioUnitario || 0);

        const newItem: PresupuestoItem = {
            id: `item-${Date.now()}`,
            concepto: customConcepto.trim(),
            unidadMedida: customUnidad,
            cantidad: customCantidad,
            precioUnitario: customPrecioUnitario,
            subtotal: subtotal,
            isCustom: true
        };

        setItems([...items, newItem]);
        setCustomConcepto('');
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    // Calculation Totals
    const rawSubtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
    const finalTotal = Math.max(0, rawSubtotal - descuento);

    // PDF Export
    const handleExportPDF = () => {
        if (items.length === 0) {
            alert('Agregue al menos un ítem al presupuesto para generar el PDF.');
            return;
        }

        const selectedClient = clientes.find(c => c.id === Number(selectedClientId));

        const data: PresupuestoData = {
            numeroPresupuesto,
            fecha: new Date().toLocaleDateString('es-AR'),
            validezDias,
            clienteNombre: selectedClient?.nombre || 'Cliente General',
            clienteEmpresa: selectedClient?.empresa || '',
            clienteTelefono: selectedClient?.telefono || '',
            clienteEmail: selectedClient?.email || '',
            items,
            subtotal: rawSubtotal,
            descuento,
            total: finalTotal,
            observaciones,
            vendedorNombre: user?.name || 'Ventas'
        };

        downloadPresupuestoPDF(data);
    };

    // Convert to Order (OT)
    const handleConvertToOrders = () => {
        if (items.length === 0) {
            alert('No hay ítems para convertir a Orden de Trabajo.');
            return;
        }

        const selectedClient = clientes.find(c => c.id === Number(selectedClientId));
        const clienteNombre = selectedClient?.nombre || 'Cliente General';

        let createdCount = 0;
        items.forEach((item) => {
            saveOrden({
                clientId: Number(selectedClientId) || 1,
                clienteNombre: clienteNombre,
                status: 'diseno',
                nombreTarea: item.concepto,
                origen: 'web',
                material: item.isCustom ? 'TRABAJO ESPECIAL' : item.concepto.split(' - ')[0],
                calidad: 'Estándar',
                alto: 1,
                ancho: 1,
                copias: item.cantidad,
                subtotal: item.subtotal,
                demasias: 0,
                accesorios: [],
                laminado: false,
                bordado: false,
                panelizado: false,
                portabanners: 0,
                envio: 'retiro',
                emergencia: false,
                fechaCreacion: new Date().toISOString(),
                fechaEntrega: new Date(Date.now() + 86400000 * 3).toISOString(),
                observaciones: `${observaciones} [Cotización: ${numeroPresupuesto}]`,
                observaciones2: '',
                archivos: [],
                vendedorNombre: user?.name || 'Ventas',
                isCustom: item.isCustom,
                conceptoPersonalizado: item.isCustom ? item.concepto : undefined,
                unidadMedida: item.unidadMedida,
                precioUnitarioManual: item.precioUnitario
            });
            createdCount++;
        });

        alert(`✅ ¡Éxito! Se han generado ${createdCount} Órdenes de Trabajo en el sistema.`);
        navigate('/entrada');
    };

    return (
        <div className="presupuestador-page">
            <div className="presupuestador-header">
                <div className="presupuestador-title">
                    <h1>🧮 Presupuestador & Cotizador de Trabajos</h1>
                    <p>Genere cotizaciones formales para clientes incluyendo ítems de imprenta e ítems especiales / tercerizados.</p>
                </div>
            </div>

            <div className="presupuestador-grid">
                {/* Main Panel */}
                <div>
                    {/* Client & Metadata Panel */}
                    <div className="card-panel">
                        <h2>👤 Datos del Cliente y Presupuesto</h2>
                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Cliente</label>
                                <select
                                    className="form-select"
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(Number(e.target.value))}
                                >
                                    {clientes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.nombre} {c.empresa ? `(${c.empresa})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>N° Presupuesto</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={numeroPresupuesto}
                                        onChange={(e) => setNumeroPresupuesto(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Validez (Días)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={validezDias}
                                        onChange={(e) => setValidezDias(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Add Item Panel */}
                    <div className="card-panel">
                        <h2>➕ Agregar Ítem al Presupuesto</h2>

                        <div className="item-tabs">
                            <button
                                type="button"
                                className={`item-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
                                onClick={() => setActiveTab('catalog')}
                            >
                                🖨️ Impresión de Catálogo
                            </button>
                            <button
                                type="button"
                                className={`item-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
                                onClick={() => setActiveTab('custom')}
                            >
                                📦 Trabajo Especial / Tercerizado
                            </button>
                        </div>

                        {activeTab === 'catalog' ? (
                            <form onSubmit={handleAddCatalogItem}>
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>Material</label>
                                        <select
                                            className="form-select"
                                            value={catMaterial}
                                            onChange={(e) => setCatMaterial(e.target.value)}
                                        >
                                            {materiales.map(m => (
                                                <option key={m.id} value={m.descripcion || m.codigo}>{m.descripcion || m.codigo}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Calidad de Impresión</label>
                                        <select
                                            className="form-select"
                                            value={catCalidad}
                                            onChange={(e) => setCatCalidad(e.target.value)}
                                        >
                                            {calidades.map(c => (
                                                <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-grid-3">
                                    <div className="form-group">
                                        <label>Ancho (m)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={catAncho}
                                            onChange={(e) => setCatAncho(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Alto (m)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={catAlto}
                                            onChange={(e) => setCatAlto(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Cantidad / Copias</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="form-input"
                                            value={catCopias}
                                            onChange={(e) => setCatCopias(Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Precio m² ($)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={catPrecioM2}
                                        onChange={(e) => setCatPrecioM2(Number(e.target.value))}
                                    />
                                </div>

                                <button type="submit" className="btn-add">
                                    ➕ Agregar Ítem de Imprenta
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleAddCustomItem}>
                                <div className="form-group">
                                    <label>Descripción / Concepto del Trabajo Especial</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Ej: Cartel Letras Corpóreas en Polifan con Luz LED"
                                        value={customConcepto}
                                        onChange={(e) => setCustomConcepto(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-grid-3">
                                    <div className="form-group">
                                        <label>Unidad de Medida</label>
                                        <select
                                            className="form-select"
                                            value={customUnidad}
                                            onChange={(e) => setCustomUnidad(e.target.value as UnidadMedida)}
                                        >
                                            <option value="u">Unidades (u)</option>
                                            <option value="m2">Metros Cuadrados (m²)</option>
                                            <option value="ml">Metros Lineales (ml)</option>
                                            <option value="global">Trabajo Global</option>
                                            <option value="lote">Lote Completo</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Cantidad</label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.1"
                                            className="form-input"
                                            value={customCantidad}
                                            onChange={(e) => setCustomCantidad(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Precio Unitario ($)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={customPrecioUnitario}
                                            onChange={(e) => setCustomPrecioUnitario(Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="btn-add">
                                    📦 Agregar Ítem Especial / Tercerizado
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Table of Items */}
                    <div className="card-panel">
                        <h2>📋 Renglones del Presupuesto ({items.length})</h2>
                        {items.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                                No hay ítems agregados a la cotización todavía. Use el formulario superior para añadir productos.
                            </p>
                        ) : (
                            <table className="items-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Tipo</th>
                                        <th>Concepto</th>
                                        <th>Cant. / Unidad</th>
                                        <th>P. Unitario</th>
                                        <th>Subtotal</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id}>
                                            <td>{index + 1}</td>
                                            <td>
                                                {item.isCustom ? (
                                                    <span style={{ background: '#f59e0b', color: '#000', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>ESPECIAL</span>
                                                ) : (
                                                    <span style={{ background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>CATÁLOGO</span>
                                                )}
                                            </td>
                                            <td><strong>{item.concepto}</strong></td>
                                            <td>{item.cantidad} {item.unidadMedida}</td>
                                            <td>${item.precioUnitario.toLocaleString('es-AR')}</td>
                                            <td><strong>${item.subtotal.toLocaleString('es-AR')}</strong></td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn-danger-outline"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                >
                                                    ✕ Quitar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Sidebar Summary Panel */}
                <div>
                    <div className="card-panel summary-card">
                        <h2>💰 Resumen de Cotización</h2>

                        <div className="summary-row">
                            <span>Subtotal:</span>
                            <span>${rawSubtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="form-group" style={{ marginTop: '12px' }}>
                            <label>Bonificación / Descuento ($)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={descuento}
                                onChange={(e) => setDescuento(Number(e.target.value))}
                            />
                        </div>

                        <div className="summary-total">
                            <span>Total Neto:</span>
                            <span>${finalTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="form-group" style={{ marginTop: '16px' }}>
                            <label>Observaciones / Notas para Cliente</label>
                            <textarea
                                className="form-textarea"
                                rows={3}
                                placeholder="Aclaraciones comerciales o plazos de entrega..."
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                            />
                        </div>

                        <div className="summary-actions">
                            <button
                                type="button"
                                className="btn-pdf"
                                onClick={handleExportPDF}
                            >
                                📄 Generar PDF Presupuesto
                            </button>

                            <button
                                type="button"
                                className="btn-convert"
                                onClick={handleConvertToOrders}
                            >
                                🚀 Convertir a Orden de Trabajo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
