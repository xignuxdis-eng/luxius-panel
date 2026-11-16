// src/pages/Presupuestador/subcomponents/QuoteForm.tsx
import React from 'react';
import type { ComboData } from '@/data/db';
import type { UnidadMedida } from '@/types/orden';
import type { CalcosQuoteResult, TipoCorteCalco } from '../utils/calcosCalculator';

interface QuoteFormProps {
    activeTab: 'catalog' | 'calcos' | 'combos' | 'custom';
    setActiveTab: (tab: 'catalog' | 'calcos' | 'combos' | 'custom') => void;
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
    // Calcos (Mimaki CG-60SR) Form
    calcoMaterial: string;
    setCalcoMaterial: (val: string) => void;
    calcoCalidad: string;
    setCalcoCalidad: (val: string) => void;
    calcoTipoCorte: TipoCorteCalco;
    setCalcoTipoCorte: (val: TipoCorteCalco) => void;
    calcoAnchoCm: number;
    setCalcoAnchoCm: (val: number) => void;
    calcoAltoCm: number;
    setCalcoAltoCm: (val: number) => void;
    calcoCantidad: number;
    setCalcoCantidad: (val: number) => void;
    calcoGapMm: number;
    setCalcoGapMm: (val: number) => void;
    calcoUsableWidthCm: number;
    setCalcoUsableWidthCm: (val: number) => void;
    calcoPrecioImpresionM2: number;
    setCalcoPrecioImpresionM2: (val: number) => void;
    calcoPrecioCorteM2: number;
    setCalcoPrecioCorteM2: (val: number) => void;
    calcoQuote: CalcosQuoteResult;
    handleAddCalcoItem: (e: React.FormEvent) => void;
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
    calcoMaterial,
    setCalcoMaterial,
    calcoCalidad,
    setCalcoCalidad,
    calcoTipoCorte,
    setCalcoTipoCorte,
    calcoAnchoCm,
    setCalcoAltoCm,
    calcoAltoCm,
    setCalcoAnchoCm,
    calcoCantidad,
    setCalcoCantidad,
    calcoGapMm,
    setCalcoGapMm,
    calcoUsableWidthCm,
    setCalcoUsableWidthCm,
    calcoPrecioImpresionM2,
    setCalcoPrecioImpresionM2,
    calcoPrecioCorteM2,
    setCalcoPrecioCorteM2,
    calcoQuote,
    handleAddCalcoItem,
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
                    className={`item-tab-btn ${activeTab === 'calcos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('calcos')}
                >
                    🏷️ Calcos (Mimaki)
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
            ) : activeTab === 'calcos' ? (
                <form onSubmit={handleAddCalcoItem}>
                    <div className="form-grid-2">
                        <div className="form-group">
                            <label>Vinilo / Material</label>
                            <select
                                className="form-select"
                                value={calcoMaterial}
                                onChange={(e) => setCalcoMaterial(e.target.value)}
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
                                value={calcoCalidad}
                                onChange={(e) => setCalcoCalidad(e.target.value)}
                            >
                                {printCalidades.map(c => (
                                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Tipo de Corte (Plotter Mimaki CG-60SR · 0.60 m)</label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => setCalcoTipoCorte('medio')}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: calcoTipoCorte === 'medio' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                                    background: calcoTipoCorte === 'medio' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(15, 23, 42, 0.5)',
                                    color: calcoTipoCorte === 'medio' ? '#7dd3fc' : '#cbd5e1',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                ✂️ Medio Corte (pliego / rollo)
                            </button>
                            <button
                                type="button"
                                onClick={() => setCalcoTipoCorte('completo')}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: calcoTipoCorte === 'completo' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.12)',
                                    background: calcoTipoCorte === 'completo' ? 'rgba(245, 158, 11, 0.16)' : 'rgba(15, 23, 42, 0.5)',
                                    color: calcoTipoCorte === 'completo' ? '#fcd34d' : '#cbd5e1',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                🔪 Corte Completo (individuales)
                            </button>
                        </div>
                    </div>

                    <div className="form-grid-3">
                        <div className="form-group">
                            <label>Ancho Calco (cm)</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0.5"
                                className="form-input"
                                value={calcoAnchoCm}
                                onChange={(e) => setCalcoAnchoCm(Number(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Alto Calco (cm)</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0.5"
                                className="form-input"
                                value={calcoAltoCm}
                                onChange={(e) => setCalcoAltoCm(Number(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Cantidad (unid.)</label>
                            <input
                                type="number"
                                min="1"
                                className="form-input"
                                value={calcoCantidad}
                                onChange={(e) => setCalcoCantidad(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group">
                            <label>Separación entre calcos (mm)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                className="form-input"
                                value={calcoGapMm}
                                onChange={(e) => setCalcoGapMm(Number(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Ancho útil Mimaki (cm, máx 60)</label>
                            <input
                                type="number"
                                min="10"
                                max="60"
                                step="1"
                                className="form-input"
                                value={calcoUsableWidthCm}
                                onChange={(e) => setCalcoUsableWidthCm(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group">
                            <label>Precio Impresión / m² ($)</label>
                            <input
                                type="number"
                                min="0"
                                className="form-input"
                                value={calcoPrecioImpresionM2}
                                onChange={(e) => setCalcoPrecioImpresionM2(Number(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Precio {calcoTipoCorte === 'medio' ? 'Medio Corte' : 'Corte Completo'} / m² ($)</label>
                            <input
                                type="number"
                                min="0"
                                className="form-input"
                                value={calcoPrecioCorteM2}
                                onChange={(e) => setCalcoPrecioCorteM2(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Panel de Aprovechamiento Mimaki en Vivo */}
                    <div style={{
                        padding: '12px 14px',
                        marginBottom: '14px',
                        borderRadius: '10px',
                        background: calcoQuote.valido ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.1)',
                        border: calcoQuote.valido ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(239, 68, 68, 0.4)',
                        fontSize: '0.85rem',
                        color: '#e2e8f0'
                    }}>
                        {calcoQuote.excedeAnchoMimaki ? (
                            <div style={{ color: '#fca5a5', fontWeight: 700 }}>
                                ⚠️ El calco supera el ancho útil del plotter Mimaki ({calcoUsableWidthCm} cm).
                            </div>
                        ) : !calcoQuote.valido ? (
                            <div style={{ color: '#cbd5e1' }}>Ingresá medidas válidas para calcular el aprovechamiento.</div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                                    <strong style={{ color: '#6ee7b7' }}>
                                        📐 Aprovechamiento Mimaki CG-60SR (0.60 m)
                                    </strong>
                                    <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.2)', color: '#a7f3d0', fontWeight: 700 }}>
                                        {calcoQuote.aprovechamientoPct}% aprovechamiento {calcoQuote.rotado ? '· Rotado 90°' : ''}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', color: '#cbd5e1' }}>
                                    <div>Entran: <strong>{calcoQuote.calcosPorFila}</strong>/fila × <strong>{calcoQuote.filas}</strong> filas</div>
                                    <div>Largo rollo: <strong>{calcoQuote.largoNecesarioM.toFixed(2)} m</strong> ({calcoQuote.areaRolloM2.toFixed(2)} m²)</div>
                                    <div>Impresión: <strong>${calcoQuote.costoImpresion.toLocaleString('es-AR')}</strong></div>
                                    <div>Corte: <strong>${calcoQuote.costoCorte.toLocaleString('es-AR')}</strong></div>
                                </div>
                                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                    <span>Unitario: ${calcoQuote.precioUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })} / calco</span>
                                    <span style={{ color: '#34d399', fontSize: '0.95rem' }}>Subtotal: ${calcoQuote.total.toLocaleString('es-AR')}</span>
                                </div>
                            </>
                        )}
                    </div>

                    <button type="submit" className="btn-add" disabled={!calcoQuote.valido}>
                        ➕ Agregar Calcos al Presupuesto
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
