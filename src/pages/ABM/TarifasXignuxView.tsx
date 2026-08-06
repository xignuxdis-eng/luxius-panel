import { useState, useEffect } from 'react'
import { getTarifasXignux, saveTarifasXignux, getServicios, getMateriales } from '@data/db'
import type { TarifasXignux, TarifaEntry } from '@data/db'
import type { Servicio, Material } from '@/types'
import Button from '@components/ui/Button'
import './ABM.css'

export default function TarifasXignuxView() {
    const [tarifas, setTarifas] = useState<TarifasXignux>({})
    const [materialesAbm, setMaterialesAbm] = useState<Material[]>([])
    const [serviciosAbm, setServiciosAbm] = useState<Servicio[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [dirty, setDirty] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const [t, s, m] = await Promise.all([
            getTarifasXignux(),
            Promise.resolve(getServicios()),
            Promise.resolve(getMateriales())
        ])

        m.forEach(mat => {
            const key = mat.codigo?.toLowerCase() || mat.descripcion.toLowerCase().replace(/[^a-z0-9]+/g, '_')
            if (!t[key]) {
                t[key] = { precio: mat.precioM2 || 0, rebajaMaxPct: 15 }
            }
        })

        s.forEach(serv => {
            const key = (serv as any).codigo?.toLowerCase() || serv.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_')
            if (!t[key]) {
                t[key] = { precio: serv.precioBase || 0, rebajaMaxPct: 20 }
            }
        })

        setTarifas(t)
        setMaterialesAbm(m.filter(mat => mat.habilitado !== false))
        setServiciosAbm(s.filter(serv => serv.habilitado !== false))
        setLoading(false)
    }

    const handlePrecioChange = (key: string, value: string) => {
        const num = parseFloat(value) || 0
        setTarifas(prev => ({
            ...prev,
            [key]: { ...getEntry(prev, key), precio: num }
        }))
        setDirty(true)
        setSaved(false)
    }

    const handleRebajaChange = (key: string, value: string) => {
        const num = Math.min(100, Math.max(0, parseFloat(value) || 0))
        setTarifas(prev => ({
            ...prev,
            [key]: { ...getEntry(prev, key), rebajaMaxPct: num }
        }))
        setDirty(true)
        setSaved(false)
    }

    const getEntry = (t: TarifasXignux, key: string): TarifaEntry => {
        const e = t[key]
        if (e && typeof e === 'object' && 'precio' in e) return e
        // Legacy fallback: plain number
        if (typeof e === 'number') return { precio: e, rebajaMaxPct: 0 }
        return { precio: 0, rebajaMaxPct: 0 }
    }

    const handleSave = async () => {
        setSaving(true)
        const ok = await saveTarifasXignux(tarifas)
        setSaving(false)
        if (ok) {
            setSaved(true)
            setDirty(false)
            setTimeout(() => setSaved(false), 3000)
        }
    }

    const calcPiso = (precio: number, pct: number) => {
        if (pct <= 0) return 0
        return Math.round(precio * (1 - pct / 100))
    }

    const tarifaGroups = [
        {
            title: '📦 Materiales Base (ABM Insumos)',
            subtitle: 'Precios por m² sincronizados con ABM Materiales y la App Móvil',
            items: materialesAbm.map(m => ({
                key: m.codigo?.toLowerCase() || m.descripcion.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                label: m.descripcion,
                unit: `/${m.tipoCobro || 'm²'}`
            }))
        },
        {
            title: '🔧 Servicios de Campo (ABM Servicios)',
            subtitle: 'Costos de servicios sincronizados con ABM Servicios',
            items: serviciosAbm.map(s => ({
                key: s.codigo?.toLowerCase() || s.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                label: s.nombre,
                unit: `/${s.unidad || 'unidad'}`
            }))
        },
        {
            title: '🏗️ Infraestructura y Adicionales',
            subtitle: 'Postes, columnas, luminarias y cableado',
            items: [
                { key: 'costo_poste_metal', label: 'Poste de Soporte (Metal)', unit: '/m' },
                { key: 'costo_poste_madera', label: 'Poste de Soporte (Madera)', unit: '/m' },
                { key: 'costo_poste_hormigon', label: 'Poste de Soporte (Hormigón)', unit: '/m' },
                { key: 'costo_columna_m', label: 'Columna / Pilar (Ancho)', unit: '/m' },
                { key: 'costo_luminaria_unidad', label: 'Luminaria / Foco', unit: '/unidad' },
                { key: 'costo_cableado_m', label: 'Cableado / Obstáculo', unit: '/m' },
            ]
        }
    ]

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>Cargando tarifario...</p>
            </div>
        )
    }

    return (
        <div className="abm-list-view" style={{ padding: 0 }}>
            {/* Header */}
            <div className="abm-actions-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSave}
                        disabled={saving || !dirty}
                    >
                        {saving ? '⏳ Guardando...' : saved ? '✅ Guardado' : '💾 Guardar Tarifario'}
                    </Button>
                    {dirty && (
                        <span style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: 600 }}>
                            ⚠ Cambios sin guardar
                        </span>
                    )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Estos precios se sincronizan automáticamente con la app móvil
                </span>
            </div>

            {/* Groups */}
            {tarifaGroups.map((group: any) => (
                <div key={group.title}>
                    {/* Group header */}
                    <div style={{
                        padding: '12px 16px 4px',
                        borderBottom: '1px solid var(--border)',
                        background: 'rgba(255,255,255,0.02)'
                    }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            {group.title}
                        </h3>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 6px' }}>
                            {group.subtitle}
                        </p>
                    </div>

                    {/* Column headers */}
                    <table className="abm-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40%' }}>Concepto</th>
                                <th style={{ width: '20%' }}>Precio Base ($)</th>
                                <th style={{ width: '15%' }}>Rebaja Máx (%)</th>
                                <th style={{ width: '15%' }}>Piso Vendedor</th>
                                <th style={{ width: '10%' }}>Unidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {group.items.map((item: any) => {
                                const entry = getEntry(tarifas, item.key)
                                const piso = calcPiso(entry.precio, entry.rebajaMaxPct)
                                return (
                                    <tr key={item.key}>
                                        <td>
                                            <div className="name-cell">
                                                <span className="name">{item.label}</span>
                                                <span className="sub" style={{ fontFamily: 'monospace', fontSize: '10px' }}>{item.key}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="input-field sm"
                                                    style={{ maxWidth: '130px', padding: '6px 8px', fontFamily: 'monospace', fontSize: '13px' }}
                                                    value={entry.precio}
                                                    onChange={(e) => handlePrecioChange(item.key, e.target.value)}
                                                />
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="0"
                                                    max="100"
                                                    className="input-field sm"
                                                    style={{ maxWidth: '70px', padding: '6px 8px', fontFamily: 'monospace', fontSize: '13px' }}
                                                    value={entry.rebajaMaxPct}
                                                    onChange={(e) => handleRebajaChange(item.key, e.target.value)}
                                                />
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>%</span>
                                            </div>
                                        </td>
                                        <td>
                                            {entry.rebajaMaxPct > 0 ? (
                                                <span style={{
                                                    fontFamily: 'monospace',
                                                    fontSize: '13px',
                                                    color: 'var(--warning)',
                                                    fontWeight: 600
                                                }}>
                                                    ${piso.toLocaleString('es-AR')}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Sin límite</span>
                                            )}
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.unit}</span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ))}

            {/* Services from ABM */}
            {serviciosAbm.length > 0 && (
                <div>
                    <div style={{
                        padding: '12px 16px 4px',
                        borderBottom: '1px solid var(--border)',
                        background: 'rgba(255,255,255,0.02)'
                    }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            🛠️ Servicios del ABM
                        </h3>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 6px' }}>
                            Estos servicios se gestionan desde la pestaña "Servicios" del ABM y se incluyen en el tarifario del vendedor
                        </p>
                    </div>
                    <table className="abm-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40%' }}>Servicio</th>
                                <th style={{ width: '20%' }}>Precio Base ($)</th>
                                <th style={{ width: '15%' }}>Unidad</th>
                                <th style={{ width: '15%' }}>Estado</th>
                                <th style={{ width: '10%' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {serviciosAbm.map(s => (
                                <tr key={s.id}>
                                    <td>
                                        <div className="name-cell">
                                            <span className="name">
                                                {s.codigo && <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent)', marginRight: '6px', letterSpacing: '1px' }}>[{s.codigo}]</span>}
                                                {s.nombre}
                                            </span>
                                            <span className="sub">{s.descripcion}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                                            ${s.precioBase}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {s.unidad === 'm2' ? '/m²' : s.unidad === 'metro' ? '/ml' : '/unidad'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="pill success">Habilitado</span>
                                    </td>
                                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Editar en Servicios →
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer info */}
            <div style={{
                padding: '16px',
                borderTop: '1px solid var(--border)',
                background: 'rgba(0, 229, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '12px',
                color: 'var(--text-muted)'
            }}>
                <span style={{ fontSize: '20px' }}>ℹ️</span>
                <div>
                    <strong style={{ color: 'var(--accent)' }}>Sincronización:</strong> Al guardar, estos precios se propagarán automáticamente a todos los vendedores de campo al iniciar sesión en la app XignuX.
                    El <strong>piso</strong> es el precio mínimo que un vendedor puede establecer (Precio Base × (1 − Rebaja Máx %)).
                </div>
            </div>
        </div>
    )
}
