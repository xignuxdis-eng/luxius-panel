import React, { useState, useEffect } from 'react'
import Header from '@components/layout/Header'
import { getMateriales, saveMaterial, refreshCollection } from '@data/db'
import type { Material } from '@/types'
import Button from '@components/ui/Button'
import { RefreshCw } from 'lucide-react'
import './Stock.css'

export default function Stock() {
    const [materiales, setMateriales] = useState<Material[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
    const [isAdjustmentModalOpen, setAdjustmentModalOpen] = useState(false)
    const [adjustmentAmount, setAdjustmentAmount] = useState<string>('') // string to handle empty/decimals better
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add')
    const [isRefreshing, setIsRefreshing] = useState(false)

    useEffect(() => {
        loadStock()
        // Sync with live server in background
        refreshCollection('materiales').then(() => loadStock())
    }, [])

    const loadStock = () => {
        let allMaterials = getMateriales()
        // Filter only enabled ones
        allMaterials = allMaterials.filter(m => m.habilitado !== false)
        setMateriales(allMaterials)
    }

    const handleManualRefresh = async () => {
        setIsRefreshing(true)
        try {
            await refreshCollection('materiales')
            loadStock()
        } finally {
            setIsRefreshing(false)
        }
    }


    const handleOpenAdjustment = (material: Material) => {
        setSelectedMaterial(material)
        setAdjustmentAmount('')
        setAdjustmentType('add')
        setAdjustmentModalOpen(true)
    }

    const handleSaveAdjustment = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedMaterial) return

        const current = selectedMaterial.stockActual || 0
        const amount = parseFloat(adjustmentAmount) || 0
        let newStock = current

        if (adjustmentType === 'add') newStock += amount
        if (adjustmentType === 'subtract') newStock -= amount
        if (adjustmentType === 'set') newStock = amount

        if (newStock < 0) newStock = 0

        saveMaterial({ ...selectedMaterial, stockActual: newStock })
        setAdjustmentModalOpen(false)
        loadStock()
    }



    const filteredMaterials = materiales.filter(m =>
        m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const groupedMaterials = filteredMaterials.reduce((acc: { produccion: Material[], liquidos: Material[] }, m: Material) => {
        const type = m.tipo?.toLowerCase()
        if (type === 'tinta' || type === 'solvente') {
            acc.liquidos.push(m)
        } else {
            acc.produccion.push(m)
        }
        return acc
    }, { produccion: [], liquidos: [] })

    const DropIcon = ({ color }: { color?: string }) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.5C15.5899 21.5 18.5 18.5899 18.5 15C18.5 11.4101 12 3 12 3C12 3 5.5 11.4101 5.5 15C5.5 18.5899 8.41015 21.5 12 21.5Z"
                fill={color || 'currentColor'}
                stroke="white"
                strokeWidth="1"
                style={{ filter: `drop-shadow(0 0 4px ${color || 'transparent'})` }}
            />
        </svg>
    )

    const RollIcon = ({ color }: { color?: string }) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="12" cy="7" rx="5" ry="3" stroke={color || 'currentColor'} strokeWidth="2" />
            <ellipse cx="12" cy="7" rx="2" ry="1.2" stroke={color || 'currentColor'} strokeWidth="1.5" />
            <path d="M7 7V20C7 21.6569 9.23858 23 12 23C14.7614 23 17 21.6569 17 20" stroke={color || 'currentColor'} strokeWidth="2" />
            <path d="M17 7V20" stroke={color || 'currentColor'} strokeWidth="2" />
            <path d="M17 7H21V20H17" stroke={color || 'currentColor'} strokeWidth="2" strokeLinejoin="round" />
        </svg>
    )

    const getStockStatus = (current: number, min: number = 10) => {
        if (current <= 0) {
            return {
                level: 'out',
                color: '#ef4444', // Red
                bgColor: 'rgba(239, 68, 68, 0.10)',
                borderColor: 'rgba(239, 68, 68, 0.40)',
                label: 'Sin Stock',
                icon: '🔴',
                percent: 0,
                desc: 'Agotado'
            }
        }
        if (current <= Math.max(min, 15)) {
            return {
                level: 'low',
                color: '#f97316', // Orange
                bgColor: 'rgba(249, 115, 22, 0.10)',
                borderColor: 'rgba(249, 115, 22, 0.40)',
                label: 'Stock Crítico',
                icon: '🟠',
                percent: Math.min(Math.round((current / 50) * 100), 30),
                desc: 'Resto'
            }
        }
        if (current < 40) {
            return {
                level: 'medium',
                color: '#eab308', // Yellow
                bgColor: 'rgba(234, 179, 8, 0.08)',
                borderColor: 'rgba(234, 179, 8, 0.35)',
                label: 'Medio Rollo',
                icon: '🟡',
                percent: Math.min(Math.round((current / 50) * 100), 79),
                desc: 'Medio'
            }
        }
        return {
            level: 'optimal',
            color: '#10b981', // Emerald Green
            bgColor: 'rgba(16, 185, 129, 0.08)',
            borderColor: 'rgba(16, 185, 129, 0.35)',
            label: 'Disponible',
            icon: '🟢',
            percent: Math.min(Math.round((current / 50) * 100), 100),
            desc: 'Completo'
        }
    }

    const renderGrid = (items: Material[], title: string) => {
        const grouped = items.reduce((acc: any[], m) => {
            const lowTipo = m.tipo?.toLowerCase();
            const isLiquid = lowTipo === 'tinta' || lowTipo === 'solvente';
            const isRigid = lowTipo === 'plancha';
            const isSubstrate = !isLiquid && !isRigid;

            if (!isSubstrate && !isLiquid) {
                acc.push({
                    ...m,
                    groupKey: `item-${m.id}`,
                    barcode: m.codigo,
                    variants: [m],
                    isGroup: false
                })
                return acc
            }

            const groupKey = `${m.descripcion}-${m.calidad}`
            const existing = acc.find(g => g.groupKey === groupKey)

            if (existing) {
                existing.variants.push(m)
                if (isSubstrate) {
                    existing.variants.sort((a: any, b: any) => (a.ancho || 0) - (b.ancho || 0))
                }
            } else {
                acc.push({
                    groupKey,
                    id: m.id,
                    codigo: m.codigo,
                    barcode: m.codigo,
                    descripcion: m.descripcion,
                    calidad: m.calidad,
                    tipo: m.tipo,
                    color: m.color,
                    variants: [m],
                    isGroup: true,
                    isSubstrate
                })
            }
            return acc
        }, [])

        // If it's NOT the liquids section, sort out-of-stock and low stock first
        if (title.includes('Producción')) {
            grouped.sort((a, b) => {
                const getScore = (g: any) => {
                    const maxStock = Math.max(...g.variants.map((v: Material) => v.stockActual || 0), 0)
                    if (maxStock <= 0) return 0 // Most critical
                    if (maxStock <= 15) return 1
                    if (maxStock < 40) return 2
                    return 3
                }
                return getScore(a) - getScore(b)
            })
        }

        return (
            <div className="stock-section">
                <h2 className="section-title">{title}</h2>
                <div className="stock-grid">
                    {grouped.map(group => {
                        const isLiquid = group.tipo?.toLowerCase() === 'tinta' || group.tipo?.toLowerCase() === 'solvente'
                        const icon = isLiquid ? (
                            <DropIcon color={group.color || (group.tipo?.toLowerCase() === 'solvente' ? '#e0e0e0' : undefined)} />
                        ) : (
                            group.tipo?.toLowerCase() === 'plancha' ? '⬛' : <RollIcon color={group.color} />
                        )

                        // Calculate overall group health
                        const groupMaxStock = Math.max(...group.variants.map((v: Material) => v.stockActual || 0), 0)
                        const groupStatus = getStockStatus(groupMaxStock)

                        return (
                            <div
                                key={group.groupKey || group.id}
                                className={`stock-card type-${group.tipo?.toLowerCase()} stock-status-${groupStatus.level} ${group.variants.length > 1 ? 'is-grouped' : ''}`}
                                style={{ '--item-color': group.color } as React.CSSProperties}
                            >
                                <div className="stock-header">
                                    <div className="stock-identity">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <span className="stock-code">{group.variants.length > 1 ? group.calidad : group.barcode || group.codigo}</span>
                                            <span className={`stock-level-badge level-${groupStatus.level}`}>
                                                {groupStatus.icon} {groupStatus.label}
                                            </span>
                                        </div>
                                        <span className="stock-name-header" title={group.descripcion}>{group.descripcion}</span>
                                    </div>
                                    <span className="stock-type-icon" title={group.tipo}>
                                        {icon}
                                    </span>
                                </div>

                                {isLiquid ? (
                                    <div className="liquid-tank-container">
                                        {group.variants.map((v: Material) => {
                                            const current = v.stockActual || 0
                                            const fillPercent = Math.min((current / 5) * 100, 100)

                                            return (
                                                <div key={v.id} className="tank-3d-wrapper" onClick={() => handleOpenAdjustment(v)}>
                                                    <div className="tank-3d" style={{ '--liquid-color': v.color } as React.CSSProperties}>
                                                        <div className="tank-cap top" />
                                                        <div className="tank-glass">
                                                            <div className="tank-liquid" style={{ height: `${fillPercent}%` }}>
                                                                <div className="liquid-surface" />
                                                            </div>
                                                            <div className="tank-reflections" />
                                                        </div>
                                                        <div className="tank-cap bottom">
                                                            <span className="tank-percentage">{Math.round(fillPercent)}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="tank-info">
                                                        <span className="tank-liters">{current.toFixed(current % 1 === 0 ? 0 : 2)} L</span>
                                                        <span className="tank-unit-label">Stock Actual</span>
                                                    </div>
                                                    <Button size="xs" variant="secondary" className="adjust-btn-overlay">
                                                        ⚡ Ajustar
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className={group.isSubstrate ? "substrate-gallery" : "variants-list"}>
                                        {group.variants.map((v: Material) => {
                                            const current = v.stockActual || 0
                                            const min = v.stockMinimo || 10
                                            const vStatus = getStockStatus(current, min)
                                            const standardRoll = 50
                                            const fillPercent = Math.min(Math.round((current / standardRoll) * 100), 100)

                                            if (group.isSubstrate) {
                                                return (
                                                    <div 
                                                        key={v.id} 
                                                        className={`roll-visual-wrapper status-${vStatus.level}`} 
                                                        onClick={() => handleOpenAdjustment(v)}
                                                        style={{
                                                            borderColor: vStatus.borderColor,
                                                            background: vStatus.bgColor
                                                        }}
                                                    >
                                                        <div 
                                                            className="roll-progress-bar"
                                                            style={{
                                                                width: `${fillPercent}%`,
                                                                backgroundColor: vStatus.color,
                                                                opacity: 0.18
                                                            }}
                                                        />

                                                        <div className="roll-info">
                                                            <span className="roll-width">{v.ancho ? `${v.ancho}m` : v.codigo}</span>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                <span className="roll-stock" style={{ color: vStatus.color }}>
                                                                    {current % 1 === 0 ? current : current.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                                                                    <small> {v.unidad || 'M Lineal'}</small>
                                                                </span>
                                                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: vStatus.color, opacity: 0.9 }}>
                                                                    {fillPercent}% ({vStatus.desc})
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }

                                            return (
                                                <div 
                                                    key={v.id} 
                                                    className="variant-row" 
                                                    onClick={() => handleOpenAdjustment(v)}
                                                    style={{ borderColor: vStatus.borderColor }}
                                                >
                                                    <div className="variant-info">
                                                        <span className="variant-width">
                                                            {v.codigo}
                                                        </span>
                                                        <div className="variant-meter">
                                                            <div className="variant-progress" style={{ width: `${fillPercent}%`, backgroundColor: vStatus.color }} />
                                                        </div>
                                                    </div>
                                                    <div className="variant-values">
                                                        <span className="variant-number" style={{ color: vStatus.color }}>
                                                            {current % 1 === 0 ? current : current.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                                                            <span className="variant-unit"> {v.unidad}</span>
                                                        </span>
                                                        <Button size="xs" variant="ghost" className="mini-adjust">
                                                            ⚡
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    const optimalCount = materiales.filter(m => (m.stockActual || 0) >= 40).length
    const mediumCount = materiales.filter(m => (m.stockActual || 0) > 15 && (m.stockActual || 0) < 40).length
    const lowCount = materiales.filter(m => (m.stockActual || 0) > 0 && (m.stockActual || 0) <= 15).length
    const outCount = materiales.filter(m => (m.stockActual || 0) <= 0).length

    return (
        <div className="stock-page page animate-fade-in">
            <Header title="Gestión de Stock" subtitle="Control de inventario de materiales" />

            <div className="stock-controls">
                <div className="search-bar">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar material..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="stock-stats">
                    <button 
                        className="stat-pill" 
                        style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        title="Sincronizar stock con la base de datos"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'spinning' : ''} />
                        <span className="label">{isRefreshing ? 'Sincronizando...' : 'Sincronizar'}</span>
                    </button>
                    <div className="stat-pill">
                        <span className="label">Total:</span>
                        <span className="value">{materiales.length}</span>
                    </div>
                    <div className="stat-pill pill-optimal" title="Stock completo (40m+)">
                        <span className="label">🟢 Disponibles:</span>
                        <span className="value">{optimalCount}</span>
                    </div>
                    <div className="stat-pill pill-medium" title="Medio rollo (16m - 39m)">
                        <span className="label">🟡 Medio:</span>
                        <span className="value">{mediumCount}</span>
                    </div>
                    <div className="stat-pill pill-low" title="Stock crítico (1m - 15m)">
                        <span className="label">🟠 Bajo:</span>
                        <span className="value">{lowCount}</span>
                    </div>
                    <div className="stat-pill pill-out" title="Sin stock (0m)">
                        <span className="label">🔴 Agotados:</span>
                        <span className="value">{outCount}</span>
                    </div>
                </div>
            </div>

            {renderGrid(groupedMaterials.produccion, '📜 Producción / Sustratos')}

            {(() => {
                const liquidPriority: Record<string, number> = {
                    'cyan': 1,
                    'cian': 1,
                    'yellow': 2,
                    'amarillo': 2,
                    'magenta': 3,
                    'black': 4,
                    'negro': 4,
                    'solvente': 5,
                    'flushing': 5
                }
                const sortedLiquids = [...groupedMaterials.liquidos].sort((a, b) => {
                    const getPrio = (m: Material) => {
                        const desc = m.descripcion.toLowerCase()
                        if (m.tipo?.toLowerCase() === 'solvente') return 5
                        for (const [key, p] of Object.entries(liquidPriority)) {
                            if (desc.includes(key)) return p
                        }
                        return 10
                    }
                    return getPrio(a) - getPrio(b)
                })
                return renderGrid(sortedLiquids, '💧 Insumos Líquidos')
            })()}

            {/* Adjustment Modal */}
            {isAdjustmentModalOpen && selectedMaterial && (
                <div className="modal-overlay">
                    <div className="modal-content stock-modal">
                        <h3>Ajustar Stock: {selectedMaterial.codigo}</h3>
                        <p>{selectedMaterial.descripcion}</p>

                        <form onSubmit={handleSaveAdjustment}>
                            <div className="adjustment-type-selector">
                                <button
                                    type="button"
                                    className={`type-btn ${adjustmentType === 'add' ? 'active' : ''}`}
                                    onClick={() => setAdjustmentType('add')}
                                >
                                    Ingreso (+)
                                </button>
                                <button
                                    type="button"
                                    className={`type-btn ${adjustmentType === 'subtract' ? 'active' : ''}`}
                                    onClick={() => setAdjustmentType('subtract')}
                                >
                                    Egreso (-)
                                </button>
                                <button
                                    type="button"
                                    className={`type-btn ${adjustmentType === 'set' ? 'active' : ''}`}
                                    onClick={() => setAdjustmentType('set')}
                                >
                                    Fijar (=)
                                </button>
                            </div>

                            <div className="form-group">
                                <label>Cantidad ({selectedMaterial.unidad})</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="input-field big-input"
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="modal-actions">
                                <Button type="button" variant="secondary" onClick={() => setAdjustmentModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" variant="primary">Guardar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
