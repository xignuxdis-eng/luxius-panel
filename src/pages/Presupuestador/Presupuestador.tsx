import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientes, getMateriales, getCalidades, saveOrden, getCombos, type ComboData } from '@/data/db';
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
    const combos = getCombos().filter(c => c.activo !== false);

    // Presupuesto Meta State
    const [selectedClientId, setSelectedClientId] = useState<number | ''>(clientes[0]?.id || '');

    // --- Searchable Client Dropdown State ---
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const clientDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
                setShowClientDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    // ----------------------------------------
    const [validezDias, setValidezDias] = useState<number>(15);
    const [descuento, setDescuento] = useState<number>(0);
    const [observaciones, setObservaciones] = useState<string>('');
    const [numeroPresupuesto, setNumeroPresupuesto] = useState<string>(`P-${Math.floor(1000 + Math.random() * 9000)}`);

    // Item List
    const [items, setItems] = useState<PresupuestoItem[]>([]);

    // Form Tab State: 'catalog' | 'combos' | 'custom'
    const [activeTab, setActiveTab] = useState<'catalog' | 'combos' | 'custom'>('catalog');

    // Combos Form State
    const [selectedComboId, setSelectedComboId] = useState<number | null>(null);
    const [comboSearch, setComboSearch] = useState('');
    const [comboCategoria, setComboCategoria] = useState('Todas');
    const [comboCopias, setComboCopias] = useState<number>(1);
    const [comboCustomPrecio, setComboCustomPrecio] = useState<number | ''>('');

    const comboCategories = useMemo(() => {
        const cats = new Set<string>();
        combos.forEach(c => {
            if (c.categoria) cats.add(c.categoria);
        });
        return ['Todas', ...Array.from(cats)];
    }, [combos]);

    const filteredCombos = useMemo(() => {
        return combos.filter(c => {
            const matchesCat = comboCategoria === 'Todas' || c.categoria === comboCategoria;
            const matchesSearch = !comboSearch || 
                c.nombre.toLowerCase().includes(comboSearch.toLowerCase()) || 
                (c.descripcion || '').toLowerCase().includes(comboSearch.toLowerCase()) ||
                (c.material || '').toLowerCase().includes(comboSearch.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [combos, comboCategoria, comboSearch]);

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

    const handleSelectCombo = (combo: ComboData) => {
        setSelectedComboId(combo.id);
        setComboCustomPrecio(combo.precio);
    };

    const handleAddComboItem = (e: React.FormEvent) => {
        e.preventDefault();
        const combo = combos.find(c => c.id === selectedComboId);
        if (!combo) {
            alert('Por favor seleccione una promo o combo de la lista.');
            return;
        }

        const unitPrice = typeof comboCustomPrecio === 'number' ? comboCustomPrecio : combo.precio;
        const qty = comboCopias > 0 ? comboCopias : 1;
        const subtotal = qty * unitPrice;

        const newItem: PresupuestoItem = {
            id: `item-combo-${Date.now()}`,
            concepto: `[PROMO] ${combo.nombre} (${combo.ancho}x${combo.alto}m - ${combo.material}${combo.servicios && combo.servicios.length > 0 ? ' + ' + combo.servicios.join(', ') : ''})`,
            unidadMedida: 'u',
            cantidad: qty,
            precioUnitario: unitPrice,
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
                                <div className="relative" ref={clientDropdownRef}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Buscar cliente por nombre o empresa..."
                                        value={showClientDropdown ? clientSearch : (() => {
                                            const c = clientes.find(cl => String(cl.id) === String(selectedClientId));
                                            return c ? `${c.nombre} (${c.empresa || 'Particular'})` : '';
                                        })()}
                                        onChange={(e) => {
                                            setClientSearch(e.target.value);
                                            if (!showClientDropdown) setShowClientDropdown(true);
                                        }}
                                        onFocus={() => {
                                            setClientSearch('');
                                            setShowClientDropdown(true);
                                        }}
                                    />
                                    {showClientDropdown && (
                                        <div className="absolute z-50 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto" style={{ zIndex: 9999 }}>
                                            {clientes
                                                .filter(c => 
                                                    c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                                    (c.empresa || '').toLowerCase().includes(clientSearch.toLowerCase())
                                                )
                                                .map(c => (
                                                    <div 
                                                        key={c.id} 
                                                        className="px-3 py-2 cursor-pointer hover:bg-[var(--primary-color)] hover:text-white border-b border-[var(--border-color)] last:border-0"
                                                        onClick={() => {
                                                            setSelectedClientId(Number(c.id));
                                                            setShowClientDropdown(false);
                                                        }}
                                                    >
                                                        <div style={{ fontWeight: 'bold' }}>{c.nombre}</div>
                                                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{c.empresa || 'Particular'}</div>
                                                    </div>
                                                ))}
                                            {clientes.filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) || (c.empresa || '').toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                                                <div className="px-3 py-2 text-sm opacity-50">No se encontraron clientes</div>
                                            )}
                                        </div>
                                    )}
                                </div>
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
                                className={`item-tab-btn ${activeTab === 'combos' ? 'active' : ''}`}
                                onClick={() => setActiveTab('combos')}
                            >
                                🎁 Promos y Combos ({combos.length})
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
                        ) : activeTab === 'combos' ? (
                            <div className="presupuesto-combos-container">
                                <div className="presupuesto-combos-search-bar">
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="🔍 Buscar combo o promo por nombre o material..."
                                        value={comboSearch}
                                        onChange={(e) => setComboSearch(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                </div>

                                <div className="presupuesto-combos-categories">
                                    {comboCategories.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            className={`presupuesto-cat-pill ${comboCategoria === cat ? 'active' : ''}`}
                                            onClick={() => setComboCategoria(cat)}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {filteredCombos.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                                        No se encontraron combos o promociones con ese criterio.
                                    </p>
                                ) : (
                                    <div className="presupuesto-combos-grid">
                                        {filteredCombos.map(combo => {
                                            const isSelected = selectedComboId === combo.id;
                                            return (
                                                <div
                                                    key={combo.id}
                                                    className={`presupuesto-combo-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => handleSelectCombo(combo)}
                                                >
                                                    <div className="presupuesto-combo-header">
                                                        <h3 className="presupuesto-combo-name">
                                                            {combo.icono || '🎁'} {combo.nombre}
                                                        </h3>
                                                        {combo.categoria && (
                                                            <span className="presupuesto-combo-badge">{combo.categoria}</span>
                                                        )}
                                                    </div>

                                                    <div className="presupuesto-combo-details">
                                                        <div>📐 <strong>Medida:</strong> {combo.ancho}m x {combo.alto}m</div>
                                                        <div>🎨 <strong>Material:</strong> {combo.material}</div>
                                                        {combo.servicios && combo.servicios.length > 0 && (
                                                            <div>⚙️ <strong>Incluye:</strong> {combo.servicios.join(', ')}</div>
                                                        )}
                                                        {combo.descripcion && (
                                                            <div style={{ fontStyle: 'italic', opacity: 0.8 }}>{combo.descripcion}</div>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                                        <span className="presupuesto-combo-price">
                                                            ${combo.precio.toLocaleString('es-AR')}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: isSelected ? 'var(--primary-color, #6366f1)' : 'var(--text-secondary)', fontWeight: 600 }}>
                                                            {isSelected ? '✓ Seleccionado' : 'Seleccionar'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {selectedComboId && (() => {
                                    const currentCombo = combos.find(c => c.id === selectedComboId);
                                    if (!currentCombo) return null;
                                    const effectivePrice = typeof comboCustomPrecio === 'number' ? comboCustomPrecio : currentCombo.precio;
                                    const totalCombo = (comboCopias || 1) * effectivePrice;
                                    return (
                                        <form onSubmit={handleAddComboItem} className="presupuesto-combo-action-box">
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                                                Configurar Combo: <span style={{ color: 'var(--accent-color, #818cf8)' }}>{currentCombo.nombre}</span>
                                            </div>
                                            <div className="form-grid-2">
                                                <div className="form-group">
                                                    <label>Cantidad de Packs / Combos</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="form-input"
                                                        value={comboCopias}
                                                        onChange={(e) => setComboCopias(Math.max(1, Number(e.target.value)))}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Precio Unitario Cotizado ($)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={comboCustomPrecio}
                                                        onChange={(e) => setComboCustomPrecio(e.target.value === '' ? '' : Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                className="btn-add"
                                                style={{ background: 'linear-gradient(135deg, #db2777, #ec4899)', marginTop: '8px' }}
                                            >
                                                🎁 Agregar Combo al Presupuesto (${totalCombo.toLocaleString('es-AR')})
                                            </button>
                                        </form>
                                    );
                                })()}
                            </div>
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
                                                {item.concepto.startsWith('[PROMO]') ? (
                                                    <span style={{ background: '#ec4899', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>PROMO</span>
                                                ) : item.isCustom ? (
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
