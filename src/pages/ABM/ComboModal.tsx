import { useState, useEffect, useMemo } from 'react'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { getMateriales, getServiciosActivos, saveCombo, type ComboData, type ComboItemComponent } from '@data/db'
import './ABM.css'

interface ComboModalProps {
    combo: ComboData | null
    isOpen: boolean
    onClose: () => void
    onSave: () => void
}

export default function ComboModal({ combo, isOpen, onClose, onSave }: ComboModalProps) {
    const [nombre, setNombre] = useState('')
    const [codigo, setCodigo] = useState('')
    const [categoria, setCategoria] = useState('Cartelería Comercial')
    const [descripcion, setDescripcion] = useState('')
    const [materialCodigo, setMaterialCodigo] = useState('')
    const [ancho, setAncho] = useState<number | string>(1.0)
    const [alto, setAlto] = useState<number | string>(1.0)
    const [precioFinal, setPrecioFinal] = useState<number | string>(0)
    const [destacado, setDestacado] = useState(false)
    const [componentes, setComponentes] = useState<ComboItemComponent[]>([])

    // Catalog items
    const allMateriales = useMemo(() => getMateriales(), [])
    const allServicios = useMemo(() => getServiciosActivos(), [])

    useEffect(() => {
        if (isOpen) {
            if (combo) {
                setNombre(combo.nombre || '')
                setCodigo(combo.codigo || '')
                setCategoria(combo.categoria || 'Cartelería Comercial')
                setDescripcion(combo.descripcion || '')
                setMaterialCodigo(combo.materialCodigo || '')
                setAncho(combo.ancho || 1.0)
                setAlto(combo.alto || 1.0)
                setPrecioFinal(combo.precioFinal || 0)
                setDestacado(combo.destacado || false)
                setComponentes(combo.componentes || [])
            } else {
                const nextCode = `COMBO-${Math.floor(Math.random() * 900) + 100}`
                setNombre('')
                setCodigo(nextCode)
                setCategoria('Cartelería Comercial')
                setDescripcion('')
                setMaterialCodigo('')
                setAncho(1.0)
                setAlto(1.0)
                setPrecioFinal(0)
                setDestacado(false)
                setComponentes([])
            }
        }
    }, [isOpen, combo])

    // Calculate suggested total price from components
    const precioSugerido = useMemo(() => {
        return componentes.reduce((acc, comp) => acc + (comp.cantidad * comp.precioUnitario), 0)
    }, [componentes])

    // Add component helpers
    const addMaterialComponent = (mCodigo: string) => {
        if (!mCodigo) return
        const mat = allMateriales.find(m => m.codigo === mCodigo)
        if (!mat) return
        const w = Number(ancho) || 1.0
        const h = Number(alto) || 1.0
        const area = w * h
        const unitPrice = mat.precioM2 ? Math.round(area * mat.precioM2) : 10000

        setComponentes(prev => [
            ...prev,
            {
                tipo: 'material',
                nombre: `${mat.descripcion || mat.codigo} (${w}x${h}m)`,
                cantidad: 1,
                precioUnitario: unitPrice
            }
        ])
    }

    const addServicioComponent = (sId: number) => {
        const serv = allServicios.find(s => s.id === sId)
        if (!serv) return
        setComponentes(prev => [
            ...prev,
            {
                tipo: 'servicio',
                nombre: serv.nombre,
                cantidad: 1,
                precioUnitario: serv.precioBase || 5000
            }
        ])
    }

    const addCustomComponent = () => {
        setComponentes(prev => [
            ...prev,
            {
                tipo: 'producto',
                nombre: 'Nuevo Insumo / Componente',
                cantidad: 1,
                precioUnitario: 1000
            }
        ])
    }

    const removeComponent = (index: number) => {
        setComponentes(prev => prev.filter((_, i) => i !== index))
    }

    const updateComponent = (index: number, key: keyof ComboItemComponent, val: any) => {
        setComponentes(prev => {
            const next = [...prev]
            next[index] = { ...next[index], [key]: val }
            return next
        })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!nombre.trim()) {
            alert('Por favor ingrese un nombre para el combo / producto.')
            return
        }

        saveCombo({
            id: combo?.id,
            codigo,
            nombre,
            categoria,
            descripcion,
            materialCodigo,
            ancho: Number(ancho),
            alto: Number(alto),
            componentes,
            precioSugerido,
            precioFinal: Number(precioFinal) || precioSugerido,
            habilitado: true,
            destacado
        })

        onSave()
        onClose()
    }

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={combo ? `Editar Combo/Producto: ${combo.codigo}` : 'Nuevo Combo / Producto Tarifario'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="modal-form" style={{ gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                        <label>Código</label>
                        <input
                            type="text"
                            className="input-field"
                            value={codigo}
                            onChange={e => setCodigo(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Nombre del Combo / Producto</label>
                        <input
                            type="text"
                            className="input-field"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="ej. Cartel Completo Lona Front 2x1m"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Categoría</label>
                        <select
                            className="input-field"
                            value={categoria}
                            onChange={e => setCategoria(e.target.value)}
                        >
                            <option value="Cartelería Comercial">Cartelería Comercial</option>
                            <option value="Banners y Rollups">Banners y Rollups</option>
                            <option value="Vinilos y Películas">Vinilos y Películas</option>
                            <option value="Promocionales">Promocionales</option>
                            <option value="Servicios Combinados">Servicios Combinados</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                        className="input-field"
                        rows={2}
                        value={descripcion}
                        onChange={e => setDescripcion(e.target.value)}
                        placeholder="Descripción detallada de la combinación o producto..."
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px' }}>
                    <div className="form-group">
                        <label>Material Base (Opcional)</label>
                        <select
                            className="input-field"
                            value={materialCodigo}
                            onChange={e => {
                                setMaterialCodigo(e.target.value)
                                if (e.target.value) addMaterialComponent(e.target.value)
                            }}
                        >
                            <option value="">-- Ninguno / Personalizado --</option>
                            {allMateriales.map(m => (
                                <option key={m.id} value={m.codigo}>{m.descripcion || m.codigo}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Ancho Sugerido (m)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input-field"
                            value={ancho}
                            onChange={e => setAncho(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Alto Sugerido (m)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input-field"
                            value={alto}
                            onChange={e => setAlto(e.target.value)}
                        />
                    </div>
                </div>

                {/* Components Builder */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>🛠️ Componentes Incluidos en el Combo</h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                className="input-field sm"
                                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                onChange={e => {
                                    if (e.target.value) {
                                        addServicioComponent(Number(e.target.value))
                                        e.target.value = ''
                                    }
                                }}
                            >
                                <option value="">+ Agregar Servicio...</option>
                                {allServicios.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre} (${s.precioBase})</option>
                                ))}
                            </select>
                            <Button type="button" variant="secondary" size="sm" onClick={addCustomComponent}>
                                + Insumo / Producto Extra
                            </Button>
                        </div>
                    </div>

                    {componentes.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '16px' }}>
                            No hay componentes asignados. Selecciona servicios o insumos para armar la combinación.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {componentes.map((comp, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 120px 40px', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                                    <input
                                        type="text"
                                        className="input-field sm"
                                        value={comp.nombre}
                                        onChange={e => updateComponent(idx, 'nombre', e.target.value)}
                                        placeholder="Nombre componente"
                                    />
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="input-field sm"
                                        value={comp.cantidad}
                                        onChange={e => updateComponent(idx, 'cantidad', Number(e.target.value))}
                                        placeholder="Cant"
                                    />
                                    <input
                                        type="number"
                                        className="input-field sm"
                                        value={comp.precioUnitario}
                                        onChange={e => updateComponent(idx, 'precioUnitario', Number(e.target.value))}
                                        placeholder="Precio unitario"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeComponent(idx)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pricing & Tarifario Card */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.3)', padding: '16px', borderRadius: '8px' }}>
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>SUMA SUGERIDA (COSTO COMPONENTES)</span>
                        <strong style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
                            ${precioSugerido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </strong>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ color: '#60a5fa', fontWeight: 800 }}>PRECIO FINAL TARIFARIO ($)</label>
                        <input
                            type="number"
                            className="input-field"
                            style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', border: '1px solid #10b981' }}
                            value={precioFinal}
                            onChange={e => setPrecioFinal(e.target.value)}
                            placeholder={String(precioSugerido)}
                        />
                    </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '12px' }}>
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="primary">Guardar Combo / Tarifario</Button>
                </div>
            </form>
        </Modal>
    )
}
