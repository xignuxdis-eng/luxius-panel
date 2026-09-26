import React, { useState, useEffect, useMemo } from 'react'
import Header from '@components/layout/Header'
import { getMateriales, saveMaterial, refreshCollection, getOrdenes, saveMovimientoStock } from '@data/db'
import type { Material, Order } from '@/types'
import Button from '@components/ui/Button'
import StockNewsFeed from '@components/StockNewsFeed'
import NuevoMaterialModal from '@pages/ABM/NuevoMaterialModal'
import { syncMaterialVariations } from '@/utils/materialAudit'
import { computeStockForecast, type ForecastItem } from '@/utils/stockForecast'
import { RefreshCw, PlusCircle, ShieldCheck } from 'lucide-react'
import './Stock.css'

export default function Stock() {
    const [materiales, setMateriales] = useState<Material[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
    const [isAdjustmentModalOpen, setAdjustmentModalOpen] = useState(false)
    const [adjustmentAmount, setAdjustmentAmount] = useState<string>('') // string to handle empty/decimals better
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add')
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isNewMaterialOpen, setIsNewMaterialOpen] = useState(false)
    const [auditSummary, setAuditSummary] = useState<string | null>(null)
    const [selectedBobinaAncho, setSelectedBobinaAncho] = useState<number | null>(null)
    const [orders, setOrders] = useState<Order[]>([])

    useEffect(() => {
        loadStock()
        // Sync with live server in background
        refreshCollection('materiales').then(() => loadStock())
        getOrdenes().then(setOrders).catch(() => setOrders([]))
    }, [])

    useEffect(() => {
        const onMaterialsUpdate = () => loadStock()
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'luxius_session_materiales') loadStock()
        }
        window.addEventListener('luxius-materials-updated', onMaterialsUpdate)
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener('luxius-materials-updated', onMaterialsUpdate)
            window.removeEventListener('storage', onStorage)
        }
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

    const handleAudit = async () => {
        const orders = await getOrdenes().catch(() => [] as Order[])
        const mats = getMateriales()
        const { added, audit } = syncMaterialVariations(orders, mats)
        loadStock()
        const unresolved = audit.missingVariations.length - added
        if (added > 0) {
            setAuditSummary(`✅ Auditoría: ${audit.totalMaterials} materiales revisados · se agregaron ${added} variación(es) de ancho faltantes${unresolved > 0 ? ` · ${unresolved} sin resolver` : ''}.`)
        } else if (audit.missingVariations.length === 0) {
            setAuditSummary(`✅ Auditoría: ${audit.totalMaterials} materiales revisados · sin variaciones faltantes.`)
        } else {
            setAuditSummary(`⚠️ Auditoría: ${audit.missingVariations.length} variación(es) detectadas pero sin resolver (material no mL o no encontrado).`)
        }
    }


    const handleOpenAdjustment = (material: Material, bobinaAncho?: number) => {
        setSelectedMaterial(material)
        setSelectedBobinaAncho(bobinaAncho ?? null)
        setAdjustmentAmount('')
        setAdjustmentType('add')
        setAdjustmentModalOpen(true)
    }

    const handleSaveAdjustment = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedMaterial) return

        const amount = parseFloat(adjustmentAmount) || 0
        let updated: Material

        if (selectedBobinaAncho !== null && selectedMaterial.bobinas && selectedMaterial.bobinas.length > 0) {
            // Ajuste independiente de una bobina/ancho específico (no comparte estado con las demás)
            const target = selectedMaterial.bobinas.find(b => Math.abs(Number(b.ancho) - selectedBobinaAncho) < 0.001)
            const current = target?.stockActual ?? selectedMaterial.stockActual ?? 0
            let newStock = current
            if (adjustmentType === 'add') newStock += amount
            if (adjustmentType === 'subtract') newStock -= amount
            if (adjustmentType === 'set') newStock = amount
            if (newStock < 0) newStock = 0

            updated = {
                ...selectedMaterial,
                bobinas: selectedMaterial.bobinas.map(b =>
                    Math.abs(Number(b.ancho) - selectedBobinaAncho) < 0.001 ? { ...b, stockActual: newStock } : b
                )
            }

            saveMovimientoStock({
                materialId: selectedMaterial.id,
                materialCodigo: selectedMaterial.codigo,
                materialDescripcion: `${selectedMaterial.descripcion} (${selectedBobinaAncho}m)`,
                tipo: adjustmentType === 'subtract' ? 'egreso' : adjustmentType === 'set' ? 'ajuste' : 'ingreso',
                cantidad: Math.abs(newStock - current),
                stockAnterior: current,
                stockNuevo: newStock
            })
        } else {
            const current = selectedMaterial.stockActual || 0
            let newStock = current
            if (adjustmentType === 'add') newStock += amount
            if (adjustmentType === 'subtract') newStock -= amount
            if (adjustmentType === 'set') newStock = amount
            if (newStock < 0) newStock = 0
            updated = { ...selectedMaterial, stockActual: newStock }
        }

        saveMaterial(updated)
        setAdjustmentModalOpen(false)
        setSelectedBobinaAncho(null)
        loadStock()
    }

    const forecast = useMemo(() => computeStockForecast(orders, materiales), [orders, materiales])

    const forecastByKey = useMemo(() => {
        const map = new Map<string, ForecastItem>()
        forecast.items.forEach(i => map.set(i.key, i))
        return map
    }, [forecast])

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
                                        {group.isSubstrate
                                            ? group.variants.flatMap((v: Material) => {
                                                const isMl = v.tipoCobro === 'ml' && !!v.bobinas && v.bobinas.length > 0
                                                if (isMl) {
                                                    return v.bobinas!.map((b, bi) => ({ key: `${v.id}-b${bi}`, v, width: b.ancho, bobina: b }))
                                                }
                                                return [{ key: String(v.id), v, width: v.ancho, bobina: null }]
                                            }).map(({ key, v, width, bobina }: { key: string; v: Material; width: number; bobina: { ancho: number; precioML: number; stockActual?: number } | null }) => {
                                                const current = bobina ? (bobina.stockActual ?? v.stockActual ?? 0) : (v.stockActual || 0)
                                                const min = v.stockMinimo || 10
                                                const vStatus = getStockStatus(current, min)
                                                const standardRoll = 50
                                                const fillPercent = Math.min(Math.round((current / standardRoll) * 100), 100)
                                                const fKey = bobina ? `mat:${v.id}:${bobina.ancho}` : `mat:${v.id}`
                                                const forecastItem = forecastByKey.get(fKey)

                                                return (
                                                    <div
                                                        key={key}
                                                        className={`roll-visual-wrapper status-${vStatus.level}`}
                                                        onClick={() => handleOpenAdjustment(v, bobina ? bobina.ancho : undefined)}
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
                                                            <span className="roll-width">{width ? `${width}m` : v.codigo}</span>
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
                                                        {forecastItem && forecastItem.severity !== 'ok' && (
                                                            <div
                                                                style={{
                                                                    fontSize: '0.6rem',
                                                                    fontWeight: 700,
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    background: forecastItem.severity === 'critical' ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.18)',
                                                                    color: forecastItem.severity === 'critical' ? '#f87171' : '#fbbf24',
                                                                    border: `1px solid ${forecastItem.severity === 'critical' ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.5)'}`,
                                                                    marginTop: '6px',
                                                                    textAlign: 'center'
                                                                }}
                                                                title={`Demanda proyectada: ${forecastItem.demanda.toLocaleString('es-AR', { maximumFractionDigits: 2 })} · Disponible: ${forecastItem.disponible.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`}
                                                            >
                                                                {forecastItem.severity === 'critical'
                                                                    ? `⚠ Faltante ${Math.abs(forecastItem.restante).toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${forecastItem.unidad}`
                                                                    : `◐ Bajo ${forecastItem.restante.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${forecastItem.unidad}`}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })
                                            : group.variants.map((v: Material) => {
                                                const current = v.stockActual || 0
                                                const min = v.stockMinimo || 10
                                                const vStatus = getStockStatus(current, min)
                                                const standardRoll = 50
                                                const fillPercent = Math.min(Math.round((current / standardRoll) * 100), 100)

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
                                            })
                                        }
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
                    <button
                        className="stat-pill"
                        style={{ cursor: 'pointer', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}
                        onClick={() => setIsNewMaterialOpen(true)}
                        title="Agregar nuevo material directamente"
                    >
                        <PlusCircle size={14} />
                        <span className="label">Nuevo Material</span>
                    </button>
                    <button
                        className="stat-pill"
                        style={{ cursor: 'pointer', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.4)', display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}
                        onClick={handleAudit}
                        title="Auditar y sincronizar variaciones con las Órdenes de Trabajo"
                    >
                        <ShieldCheck size={14} />
                        <span className="label">Auditar</span>
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

            {(forecast.criticalCount > 0 || forecast.lowCount > 0) && (
                <div className="forecast-panel" style={{ marginBottom: '18px', padding: '14px 16px', borderRadius: '10px', background: forecast.criticalCount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${forecast.criticalCount > 0 ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>📊 Proyección de faltantes</strong>
                        {forecast.criticalCount > 0 && <span className="stat-pill" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>🔴 {forecast.criticalCount} críticos</span>}
                        {forecast.lowCount > 0 && <span className="stat-pill" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>🟠 {forecast.lowCount} bajos</span>}
                        {forecast.groupsAtRisk.length > 0 && <span className="stat-pill" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>⚠ {forecast.groupsAtRisk.length} grupos en riesgo</span>}
                    </div>
                    {forecast.groupsAtRisk.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {forecast.groupsAtRisk.slice(0, 5).map(g => (
                                <div key={g.key} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <strong>{g.label}</strong> · {g.orderCount} OT · faltante: {g.shortfallCodigos.join(', ')}
                                </div>
                            ))}
                            {forecast.groupsAtRisk.length > 5 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+ {forecast.groupsAtRisk.length - 5} más</div>}
                        </div>
                    )}
                </div>
            )}

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

            <StockNewsFeed />

            {auditSummary && (
                <div className="audit-summary-banner" style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.35)', color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <span>{auditSummary}</span>
                    <button onClick={() => setAuditSummary(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                </div>
            )}

            {/* Adjustment Modal */}
            {isAdjustmentModalOpen && selectedMaterial && (
                <div className="modal-overlay">
                    <div className="modal-content stock-modal">
                        <h3>Ajustar Stock: {selectedMaterial.codigo}{selectedBobinaAncho !== null ? ` (${selectedBobinaAncho}m)` : ''}</h3>
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

            <NuevoMaterialModal
                isOpen={isNewMaterialOpen}
                onClose={() => setIsNewMaterialOpen(false)}
                onSave={() => {
                    setIsNewMaterialOpen(false)
                    loadStock()
                }}
            />
        </div>
    )
}
