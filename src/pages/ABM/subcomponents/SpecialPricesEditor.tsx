import { useState, useMemo } from 'react';
import { getMateriales } from '@data/db';
import Button from '@components/ui/Button';
import { Plus, Trash2, Info, CheckCircle2 } from 'lucide-react';
import { parseSpecialPriceKey, buildSpecialPriceKey, type ParsedSpecialPrice } from '@/utils/pricing/specialPricing';
import type { Material } from '@/types';

interface SpecialPricesEditorProps {
    preciosEspeciales: Record<string, number>;
    onChange: (next: Record<string, number>) => void;
}

export default function SpecialPricesEditor({ preciosEspeciales, onChange }: SpecialPricesEditorProps) {
    const allMateriales = useMemo(() => {
        return getMateriales().filter(m => m.habilitado !== false);
    }, []);

    const [selectedMatCode, setSelectedMatCode] = useState<string>('');
    const [unit, setUnit] = useState<'m2' | 'ml'>('m2');
    const [selectedAncho, setSelectedAncho] = useState<string>('');
    const [customAncho, setCustomAncho] = useState<string>('');
    const [priceInput, setPriceInput] = useState<string>('');
    const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Material seleccionado actualmente
    const currentMat: Material | undefined = useMemo(() => {
        return allMateriales.find(m => m.codigo === selectedMatCode);
    }, [allMateriales, selectedMatCode]);

    // Bobinas y anchos disponibles para el material actual
    const availableWidths = useMemo(() => {
        if (!currentMat) return [];
        const setW = new Set<number>();
        if (Array.isArray(currentMat.bobinas)) {
            currentMat.bobinas.forEach(b => {
                if (b && typeof b.ancho === 'number' && b.ancho > 0) {
                    setW.add(b.ancho);
                }
            });
        }
        if (typeof currentMat.ancho === 'number' && currentMat.ancho > 0) {
            setW.add(currentMat.ancho);
        }
        return Array.from(setW).sort((a, b) => a - b);
    }, [currentMat]);

    // Al cambiar de material, sincronizar la unidad predeterminada según la ficha técnica
    const handleMaterialChange = (matCode: string) => {
        setSelectedMatCode(matCode);
        setFeedbackMsg(null);
        const mat = allMateriales.find(m => m.codigo === matCode);
        if (mat) {
            const defUnit = mat.tipoCobro === 'ml' ? 'ml' : 'm2';
            setUnit(defUnit);
            setSelectedAncho('');
            setCustomAncho('');
        }
    };

    // Agregar o actualizar un precio especial
    const handleAddPrice = () => {
        setFeedbackMsg(null);
        if (!selectedMatCode) {
            setFeedbackMsg({ text: 'Por favor, seleccioná un material.', type: 'error' });
            return;
        }

        const parsedPrice = parseFloat(priceInput);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            setFeedbackMsg({ text: 'Ingresá un precio válido mayor a 0.', type: 'error' });
            return;
        }

        let effectiveAncho: number | string | null = null;
        if (unit === 'ml') {
            if (selectedAncho === 'custom') {
                const parsedCustom = parseFloat(customAncho);
                if (isNaN(parsedCustom) || parsedCustom <= 0) {
                    setFeedbackMsg({ text: 'Ingresá un ancho de bobina válido (en metros).', type: 'error' });
                    return;
                }
                effectiveAncho = parsedCustom;
            } else if (selectedAncho) {
                effectiveAncho = parseFloat(selectedAncho);
            }
        }

        const newKey = buildSpecialPriceKey(selectedMatCode, unit, effectiveAncho);

        // Limpiar versiones anteriores del mismo material en caso de conflicto exacto
        const nextPrecios = { ...preciosEspeciales };
        nextPrecios[newKey] = parsedPrice;

        onChange(nextPrecios);
        setPriceInput('');
        setFeedbackMsg({
            text: `Precio guardado: ${selectedMatCode} a $${parsedPrice.toLocaleString()} / ${unit === 'm2' ? 'm²' : 'ml'}`,
            type: 'success'
        });
    };

    // Eliminar precio especial
    const handleRemoveKey = (keyToRemove: string) => {
        const nextPrecios = { ...preciosEspeciales };
        delete nextPrecios[keyToRemove];
        onChange(nextPrecios);
    };

    // Parsear lista actual de precios especiales
    const parsedList: ParsedSpecialPrice[] = useMemo(() => {
        return Object.entries(preciosEspeciales || {}).map(([key, val]) => {
            return parseSpecialPriceKey(key, Number(val), allMateriales);
        });
    }, [preciosEspeciales, allMateriales]);

    return (
        <div className="special-prices-editor-card">
            <div className="spe-header">
                <div>
                    <h4 className="spe-title">Precios Especiales a Clientes</h4>
                    <p className="spe-subtitle">
                        Discriminá si el precio es por <b>Metro Cuadrado (m²)</b> o <b>Metro Lineal (ml)</b>.
                        Para materiales en m² aplica a cualquier rollo; en ml podés seleccionar el ancho exacto.
                    </p>
                </div>
            </div>

            {/* Formulario de carga */}
            <div className="spe-form-grid">
                {/* 1. Selección de Material */}
                <div className="spe-field">
                    <label className="spe-label">Material</label>
                    <select
                        className="input-field spe-select"
                        value={selectedMatCode}
                        onChange={(e) => handleMaterialChange(e.target.value)}
                    >
                        <option value="">Seleccionar material...</option>
                        {allMateriales.map((m) => (
                            <option key={m.id} value={m.codigo}>
                                {m.descripcion} ({m.codigo}) — Base: {m.tipoCobro === 'ml' ? 'Metro Lineal' : 'Metro Cuadrado'}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 2. Discriminación de Unidad: M2 vs ML */}
                <div className="spe-field">
                    <label className="spe-label">Modalidad de Cobro</label>
                    <div className="spe-unit-toggle">
                        <button
                            type="button"
                            className={`spe-unit-btn ${unit === 'm2' ? 'active-m2' : ''}`}
                            onClick={() => {
                                setUnit('m2');
                                setSelectedAncho('');
                                setCustomAncho('');
                            }}
                        >
                            📐 Metro Cuadrado (m²)
                        </button>
                        <button
                            type="button"
                            className={`spe-unit-btn ${unit === 'ml' ? 'active-ml' : ''}`}
                            onClick={() => setUnit('ml')}
                        >
                            📏 Metro Lineal (ml)
                        </button>
                    </div>
                </div>

                {/* 3. Selección de Ancho de Bobina */}
                <div className="spe-field">
                    <label className="spe-label">
                        {unit === 'm2' ? 'Ancho de Rollo' : 'Ancho de Bobina (ml)'}
                    </label>
                    {unit === 'm2' ? (
                        <div className="spe-m2-info-box">
                            <CheckCircle2 size={15} color="#22c55e" />
                            <span>Aplica a cualquier ancho (precio por m²)</span>
                        </div>
                    ) : (
                        <div className="spe-ancho-selector-group">
                            <select
                                className="input-field spe-select"
                                value={selectedAncho}
                                onChange={(e) => setSelectedAncho(e.target.value)}
                            >
                                <option value="">Todos los anchos (general por ml)</option>
                                {availableWidths.map((w) => {
                                    const bobinaMatch = currentMat?.bobinas?.find(b => b.ancho === w);
                                    const precioInfo = bobinaMatch?.precioML ? ` ($${bobinaMatch.precioML.toLocaleString()} lista)` : '';
                                    return (
                                        <option key={w} value={w.toString()}>
                                            Bobina {w}m{precioInfo}
                                        </option>
                                    );
                                })}
                                <option value="custom">Otro ancho personalizado...</option>
                            </select>

                            {selectedAncho === 'custom' && (
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.1"
                                    placeholder="Ej: 1.60"
                                    className="input-field spe-custom-ancho-input"
                                    value={customAncho}
                                    onChange={(e) => setCustomAncho(e.target.value)}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* 4. Precio Especial */}
                <div className="spe-field">
                    <label className="spe-label">
                        Precio Especial ({unit === 'm2' ? '$/m²' : '$/ml'})
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="number"
                            min="0"
                            step="100"
                            placeholder={unit === 'm2' ? 'Ej: 12000' : 'Ej: 28000'}
                            className="input-field"
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddPrice();
                                }
                            }}
                        />
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleAddPrice}
                            disabled={!selectedMatCode || !priceInput}
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <Plus size={16} /> Agregar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mensaje de ayuda contextual dinámico */}
            <div className="spe-help-banner">
                <Info size={15} className="spe-help-icon" />
                <span className="spe-help-text">
                    {unit === 'm2'
                        ? '📐 Cobro en m²: el total se calcula por superficie de la pieza (ancho × alto × copias). No importa el ancho del rollo donde se imprima.'
                        : '📏 Cobro en ml: el total se calcula por avance lineal consumido en la bobina seleccionada. Podés fijar precios distintos según el ancho de rollo.'}
                </span>
            </div>

            {feedbackMsg && (
                <div className={`spe-feedback-msg ${feedbackMsg.type}`}>
                    {feedbackMsg.text}
                </div>
            )}

            {/* Lista de precios especiales configurados */}
            <div className="spe-list-section">
                <div className="spe-list-header">
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>
                        Precios Especiales Guardados ({parsedList.length})
                    </span>
                    {parsedList.length > 0 && (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            Prioridad automática sobre el tarifario general
                        </span>
                    )}
                </div>

                {parsedList.length === 0 ? (
                    <div className="spe-empty-state">
                        Sin precios especiales configurados. Este cliente facturará con las tarifas estándar de lista.
                    </div>
                ) : (
                    <div className="spe-cards-grid">
                        {parsedList.map((item) => {
                            const matObj = allMateriales.find(m => m.codigo.toLowerCase() === item.materialCode.toLowerCase());
                            const matName = matObj?.descripcion || item.materialCode;
                            const isM2 = item.unit === 'm2';

                            return (
                                <div key={item.rawKey} className={`spe-card ${isM2 ? 'border-m2' : 'border-ml'}`}>
                                    <div className="spe-card-info">
                                        <div className="spe-card-title-row">
                                            <span className="spe-card-name">{matName}</span>
                                            <span className="spe-card-code">({item.materialCode})</span>
                                        </div>
                                        <div className="spe-card-badge-row">
                                            {isM2 ? (
                                                <span className="spe-badge badge-m2">
                                                    📐 Metro Cuadrado (m²) • Cualquier ancho
                                                </span>
                                            ) : (
                                                <span className="spe-badge badge-ml">
                                                    📏 Metro Lineal (ml) • {item.ancho ? `Bobina ${item.ancho}m` : 'Todos los anchos'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="spe-card-price-row">
                                        <div className="spe-price-val">
                                            ${item.precio.toLocaleString()}
                                            <span className="spe-price-unit">/{isM2 ? 'm²' : 'ml'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="spe-delete-btn"
                                            onClick={() => handleRemoveKey(item.rawKey)}
                                            title="Eliminar este precio especial"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

