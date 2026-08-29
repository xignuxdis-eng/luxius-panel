import { useState, useEffect } from 'react'
import { getMonedas, saveMoneda, fetchLiveDolarRates } from '@data/db'
import type { MonedaConfig } from '@/types'
import Button from '@components/ui/Button'
import { RefreshCw, TrendingUp, DollarSign, ShieldAlert, ArrowRightLeft, Check, Edit2 } from 'lucide-react'
import './ABM.css'

export default function MonedasView() {
    const [monedas, setMonedas] = useState<MonedaConfig[]>(() => getMonedas())
    const [isSyncing, setIsSyncing] = useState(false)
    const [liveRates, setLiveRates] = useState<any>(null)
    const [syncSuccess, setSyncSuccess] = useState(false)
    
    // Quick Simulator state
    const [calcAmount, setCalcAmount] = useState<number>(100)
    const [calcSource, setCalcSource] = useState<string>('USD_BLUE')
    const [calcTarget, setCalcTarget] = useState<string>('ARS')

    // Editing modal state
    const [editingMoneda, setEditingMoneda] = useState<MonedaConfig | null>(null)
    const [editTallerRate, setEditTallerRate] = useState<string>('')
    const [editMargin, setEditMargin] = useState<string>('')

    useEffect(() => {
        handleFetchLiveRates()
    }, [])

    const handleFetchLiveRates = async () => {
        setIsSyncing(true)
        try {
            const rates = await fetchLiveDolarRates()
            setLiveRates(rates)
            if (rates.blue || rates.oficial) {
                // Apply to autoSync currencies
                const current = getMonedas()
                let changed = false
                current.forEach(m => {
                    if (m.id === 'USD_BLUE' && rates.blue?.venta) {
                        m.cotizacion = rates.blue.venta
                        if (m.autoSync) {
                            m.cotizacionTaller = Math.round(rates.blue.venta * (1 + (m.margenSeguridad || 0) / 100))
                        }
                        changed = true
                    } else if (m.id === 'USD_OFICIAL' && rates.oficial?.venta) {
                        m.cotizacion = rates.oficial.venta
                        if (m.autoSync) {
                            m.cotizacionTaller = Math.round(rates.oficial.venta * (1 + (m.margenSeguridad || 0) / 100))
                        }
                        changed = true
                    } else if (m.id === 'USDT' && rates.cripto?.venta) {
                        m.cotizacion = rates.cripto.venta
                        if (m.autoSync) {
                            m.cotizacionTaller = Math.round(rates.cripto.venta * (1 + (m.margenSeguridad || 0) / 100))
                        }
                        changed = true
                    }
                })
                if (changed) {
                    localStorage.setItem('luxius_monedas', JSON.stringify(current))
                    setMonedas([...current])
                    setSyncSuccess(true)
                    setTimeout(() => setSyncSuccess(false), 3000)
                }
            }
        } finally {
            setIsSyncing(false)
        }
    }

    const handleOpenEdit = (m: MonedaConfig) => {
        setEditingMoneda(m)
        setEditTallerRate(String(m.cotizacionTaller))
        setEditMargin(String(m.margenSeguridad || 0))
    }

    const handleSaveEdit = () => {
        if (!editingMoneda) return
        const tallerVal = parseFloat(editTallerRate) || editingMoneda.cotizacion
        const marginVal = parseFloat(editMargin) || 0
        const updated = saveMoneda({
            ...editingMoneda,
            cotizacionTaller: tallerVal,
            margenSeguridad: marginVal
        })
        setMonedas(updated)
        setEditingMoneda(null)
    }

    const handleToggleAutoSync = (m: MonedaConfig) => {
        const next = !m.autoSync
        const updated = saveMoneda({ ...m, autoSync: next })
        setMonedas(updated)
    }

    // Convert calc
    const sourceObj = monedas.find(m => m.id === calcSource) || monedas[0]
    const targetObj = monedas.find(m => m.id === calcTarget) || monedas[0]
    
    // Convert to ARS base then to target
    const amountInBase = (calcAmount * (sourceObj.cotizacionTaller || 1))
    const convertedAmount = targetObj.cotizacionTaller ? (amountInBase / targetObj.cotizacionTaller) : amountInBase

    return (
        <div className="abm-list-view animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Action Bar */}
            <div className="abm-actions-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={handleFetchLiveRates}
                        disabled={isSyncing}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <RefreshCw size={14} className={isSyncing ? 'spinning' : ''} />
                        <span>{isSyncing ? 'Consultando Dólar API...' : 'Sincronizar Cotizaciones en Vivo'}</span>
                    </Button>
                    {syncSuccess && (
                        <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={16} /> ¡Cotizaciones actualizadas!
                        </span>
                    )}
                </div>

                {liveRates && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {liveRates.blue && (
                            <span className="stat-pill" style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}>
                                💵 Blue: <strong>${liveRates.blue.venta}</strong>
                            </span>
                        )}
                        {liveRates.oficial && (
                            <span className="stat-pill" style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
                                🏛️ Oficial: <strong>${liveRates.oficial.venta}</strong>
                            </span>
                        )}
                        {liveRates.cripto && (
                            <span className="stat-pill" style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.3)', color: '#facc15' }}>
                                ⚡ Cripto: <strong>${liveRates.cripto.venta}</strong>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Currency Grid Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {monedas.map(m => {
                    const isBase = m.esBase
                    const diffPct = m.cotizacion > 0 ? (((m.cotizacionTaller - m.cotizacion) / m.cotizacion) * 100).toFixed(1) : '0'

                    return (
                        <div 
                            key={m.id} 
                            className="stock-card"
                            style={{ 
                                background: isBase ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-card) 50%)' : 'var(--bg-card)',
                                borderColor: isBase ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                                padding: '16px',
                                minHeight: 'auto'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {m.codigo}
                                    </span>
                                    <h4 style={{ margin: '2px 0 0 0', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                                        {m.nombre}
                                    </h4>
                                </div>
                                <span style={{ 
                                    background: isBase ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                    color: isBase ? '#34d399' : 'var(--text-primary)',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontWeight: 800,
                                    fontSize: '0.85rem'
                                }}>
                                    {m.simbolo}
                                </span>
                            </div>

                            {isBase ? (
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700 }}>
                                        ⭐ Moneda Base del Sistema
                                    </span>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        Todos los cobros y presupuestos se expresan en Pesos Argentinos por defecto.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* Rates Comparison */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>MERCADO (API)</span>
                                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                ${m.cotizacion.toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '8px' }}>
                                            <span style={{ fontSize: '0.65rem', color: '#fb923c', display: 'block', fontWeight: 700 }}>DÓLAR TALLER</span>
                                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fb923c' }}>
                                                ${m.cotizacionTaller.toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Security margin info */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <ShieldAlert size={12} color="#facc15" /> Margen de seguridad:
                                        </span>
                                        <strong style={{ color: '#facc15' }}>+{m.margenSeguridad || 0}% ({diffPct}%)</strong>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                        <Button 
                                            size="xs" 
                                            variant="secondary" 
                                            onClick={() => handleOpenEdit(m)}
                                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                        >
                                            <Edit2 size={12} /> Ajustar Cotización
                                        </Button>
                                        <Button 
                                            size="xs" 
                                            variant={m.autoSync ? 'ghost' : 'outline'}
                                            onClick={() => handleToggleAutoSync(m)}
                                            title="Auto-calcular Dólar Taller sumando el margen de seguridad automáticamente"
                                        >
                                            {m.autoSync ? '🔄 Auto-Sync ON' : '⏸️ Manual'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Live Converter Simulator */}
            <div style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '12px', 
                padding: '16px 20px',
                marginTop: '10px'
            }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowRightLeft size={16} color="var(--accent)" /> Conversor y Calculadora Rápida de Cotización de Taller
                </h4>
                
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Monto:</span>
                        <input 
                            type="number" 
                            className="input-field sm"
                            style={{ width: '120px', fontWeight: 700 }}
                            value={calcAmount}
                            onChange={e => setCalcAmount(parseFloat(e.target.value) || 0)}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>De:</span>
                        <select 
                            className="input-field sm"
                            value={calcSource}
                            onChange={e => setCalcSource(e.target.value)}
                            style={{ width: '180px' }}
                        >
                            {monedas.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre} ({m.simbolo})</option>
                            ))}
                        </select>
                    </div>

                    <span style={{ color: 'var(--text-muted)' }}>➔</span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>A:</span>
                        <select 
                            className="input-field sm"
                            value={calcTarget}
                            onChange={e => setCalcTarget(e.target.value)}
                            style={{ width: '180px' }}
                        >
                            {monedas.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre} ({m.simbolo})</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ 
                        marginLeft: 'auto', 
                        background: 'rgba(16, 185, 129, 0.15)', 
                        border: '1px solid rgba(16, 185, 129, 0.3)', 
                        borderRadius: '8px', 
                        padding: '6px 16px',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '6px'
                    }}>
                        <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>Resultado Taller:</span>
                        <strong style={{ fontSize: '1.2rem', color: '#34d399' }}>
                            {targetObj.simbolo} {convertedAmount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                        </strong>
                    </div>
                </div>
            </div>

            {/* Modal Edit Currency */}
            {editingMoneda && (
                <div className="modal-overlay">
                    <div className="modal-content stock-modal" style={{ maxWidth: '420px' }}>
                        <h3 style={{ margin: '0 0 4px 0' }}>Ajustar Cotización: {editingMoneda.nombre}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Cotización de mercado actual: <strong>${editingMoneda.cotizacion.toLocaleString('es-AR')}</strong>
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Dólar / Cotización Taller ($ ARS)
                                </label>
                                <input 
                                    type="number"
                                    className="input-field"
                                    value={editTallerRate}
                                    onChange={e => setEditTallerRate(e.target.value)}
                                    placeholder="Ej: 1420"
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Margen de Seguridad Inflacionaria (+%)
                                </label>
                                <input 
                                    type="number"
                                    step="0.5"
                                    className="input-field"
                                    value={editMargin}
                                    onChange={e => {
                                        setEditMargin(e.target.value)
                                        const margin = parseFloat(e.target.value) || 0
                                        if (editingMoneda.cotizacion) {
                                            setEditTallerRate(String(Math.round(editingMoneda.cotizacion * (1 + margin / 100))))
                                        }
                                    }}
                                    placeholder="Ej: 2.5"
                                />
                            </div>
                        </div>

                        <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Button variant="ghost" onClick={() => setEditingMoneda(null)}>Cancelar</Button>
                            <Button variant="primary" onClick={handleSaveEdit}>Guardar Cotización</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
