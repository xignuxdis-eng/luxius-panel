// src/pages/Presupuestador/subcomponents/QuoteForm.tsx
import React from 'react';
import type { ComboData } from '@/data/db';
import type { UnidadMedida } from '@/types/orden';

interface QuoteFormProps {
    activeTab: 'catalog' | 'combos' | 'custom';
    setActiveTab: (tab: 'catalog' | 'combos' | 'custom') => void;
    combos: ComboData[];
    printMaterials: any[];
    printCalidades: any[];
    // Catalog Form
    catMaterial: string;
    setCatMaterial: (val: string) => void;
    catCalidad: string;
    setCatCalidad: (val: string) => void;
    catAncho: number;
    setCatAncho: (val: number) => void;
    catAlto: number;
    setCatAlto: (val: number) => void;
    catCopias: number;
    setCatCopias: (val: number) => void;
    catPrecioM2: number;
    setCatPrecioM2: (val: number) => void;
    handleAddCatalogItem: (e: React.FormEvent) => void;
    // Combos Form
    comboSearch: string;
    setComboSearch: (val: string) => void;
    comboCategories: string[];
    comboCategoria: string;
    setComboCategoria: (cat: string) => void;
    filteredCombos: ComboData[];
    selectedComboId: number | null;
    handleSelectCombo: (combo: ComboData) => void;
    comboPrecio: (combo: ComboData) => number;
    comboMaterial: (combo: ComboData) => string;
    comboServicios: (combo: ComboData) => string[];
    comboCopias: number;
    setComboCopias: (val: number) => void;
    comboCustomPrecio: number | '';
    setComboCustomPrecio: (val: number | '') => void;
    handleAddComboItem: (e: React.FormEvent) => void;
    // Custom Form
    customConcepto: string;
    setCustomConcepto: (val: string) => void;
    customUnidad: UnidadMedida;
    setCustomUnidad: (val: UnidadMedida) => void;
    customCantidad: number;
    setCustomCantidad: (val: number) => void;
    customPrecioUnitario: number;
    setCustomPrecioUnitario: (val: number) => void;
    handleAddCustomItem: (e: React.FormEvent) => void;
}

export const QuoteForm: React.FC<QuoteFormProps> = ({
    activeTab,
    setActiveTab,
    combos,
    printMaterials,
    printCalidades,
    catMaterial,
    setCatMaterial,
    catCalidad,
    setCatCalidad,
    catAncho,
    setCatAncho,
    catAlto,
    setCatAlto,
    catCopias,
    setCatCopias,
    catPrecioM2,
    setCatPrecioM2,
    handleAddCatalogItem,
    comboSearch,
    setComboSearch,
    comboCategories,
    comboCategoria,
    setComboCategoria,
    filteredCombos,
    selectedComboId,
    handleSelectCombo,
    comboPrecio,
    comboMaterial,
    comboServicios,
    comboCopias,
    setComboCopias,
    comboCustomPrecio,
    setComboCustomPrecio,
    handleAddComboItem,
    customConcepto,
    setCustomConcepto,
    customUnidad,
    setCustomUnidad,
    customCantidad,
    setCustomCantidad,
    customPrecioUnitario,
    setCustomPrecioUnitario,
    handleAddCustomItem
}) => {
    return (
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
                                {printMaterials.map(m => (
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
                                {printCalidades.map(c => (
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
                                                🎁 {combo.nombre}
                                            </h3>
                                            {combo.categoria && (
                                                <span className="presupuesto-combo-badge">{combo.categoria}</span>
                                            )}
                                        </div>

                                        <div className="presupuesto-combo-details">
                                            <div>📐 <strong>Medida:</strong> {combo.ancho}m x {combo.alto}m</div>
                                            <div>🎨 <strong>Material:</strong> {comboMaterial(combo) || '—'}</div>
                                            {comboServicios(combo).length > 0 && (
                                                <div>⚙️ <strong>Incluye:</strong> {comboServicios(combo).join(', ')}</div>
                                            )}
                                            {combo.descripcion && (
                                                <div style={{ fontStyle: 'italic', opacity: 0.8 }}>{combo.descripcion}</div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                            <span className="presupuesto-combo-price">
                                                ${comboPrecio(combo).toLocaleString('es-AR')}
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
                        const effectivePrice = typeof comboCustomPrecio === 'number' ? comboCustomPrecio : comboPrecio(currentCombo);
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
    );
};
