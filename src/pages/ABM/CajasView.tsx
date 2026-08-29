import { useState } from 'react'
import { getCajas, saveCaja, deleteCaja, getMovimientosCaja, saveMovimientoCaja } from '@data/db'
import type { Caja, MovimientoCaja } from '@/types'
import Button from '@components/ui/Button'
import { Wallet, PlusCircle, MinusCircle, CheckCircle2, DollarSign, History, AlertCircle, ArrowUpRight, ArrowDownLeft, Lock } from 'lucide-react'
import './ABM.css'

export default function CajasView() {
    const [cajas, setCajas] = useState<Caja[]>(() => getCajas())
    const [movimientos, setMovimientos] = useState<MovimientoCaja[]>(() => getMovimientosCaja())
    const [selectedCajaId, setSelectedCajaId] = useState<number | 'all'>('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Modal state
    const [isMovModalOpen, setIsMovModalOpen] = useState(false)
    const [movType, setMovType] = useState<'ingreso' | 'egreso'>('ingreso')
    const [targetCajaId, setTargetCajaId] = useState<number>(1)
    const [movMonto, setMovMonto] = useState('')
    const [movCategoria, setMovCategoria] = useState('Cobro Pedido')
    const [movConcepto, setMovConcepto] = useState('')
    const [movComprobante, setMovComprobante] = useState('')

    // Arqueo Modal state
    const [isArqueoOpen, setIsArqueoOpen] = useState(false)
    const [arqueoCaja, setArqueoCaja] = useState<Caja | null>(null)
    const [contadoReal, setContadoReal] = useState('')

    // Nueva Caja Modal state
    const [isCajaModalOpen, setIsCajaModalOpen] = useState(false)
    const [editingCaja, setEditingCaja] = useState<Caja | null>(null)
    const [cajaNombre, setCajaNombre] = useState('')
    const [cajaTipo, setCajaTipo] = useState<'efectivo' | 'banco' | 'digital' | 'dolares'>('efectivo')
    const [cajaMoneda, setCajaMoneda] = useState('ARS')
    const [cajaResponsable, setCajaResponsable] = useState('')
    const [cajaDesc, setCajaDesc] = useState('')

    const refreshData = () => {
        setCajas(getCajas())
        setMovimientos(getMovimientosCaja())
    }

    const handleOpenMov = (type: 'ingreso' | 'egreso', defaultCajaId?: number) => {
        setMovType(type)
        setTargetCajaId(defaultCajaId || (cajas[0]?.id || 1))
        setMovMonto('')
        setMovCategoria(type === 'ingreso' ? 'Cobro Pedido' : 'Insumos Taller')
        setMovConcepto('')
        setMovComprobante('')
        setIsMovModalOpen(true)
    }

    const handleSaveMov = (e: React.FormEvent) => {
        e.preventDefault()
        const monto = parseFloat(movMonto) || 0
        if (monto <= 0) return

        const targetBox = cajas.find(c => c.id === targetCajaId)

        saveMovimientoCaja({
            cajaId: targetCajaId,
            tipo: movType,
            categoria: movCategoria,
            concepto: movConcepto || (movType === 'ingreso' ? 'Ingreso a caja' : 'Egreso de caja'),
            monto: monto,
            moneda: targetBox?.moneda || 'ARS',
            comprobante: movComprobante,
            usuario: 'Administración'
        })

        setIsMovModalOpen(false)
        refreshData()
    }

    const handleOpenArqueo = (caja: Caja) => {
        setArqueoCaja(caja)
        setContadoReal('')
        setIsArqueoOpen(true)
    }

    const handleConfirmArqueo = () => {
        if (!arqueoCaja) return
        const real = parseFloat(contadoReal)
        if (isNaN(real)) return

        const diferencia = real - arqueoCaja.saldoActual

        saveMovimientoCaja({
            cajaId: arqueoCaja.id,
            tipo: 'ajuste',
            categoria: 'Arqueo de Caja',
            concepto: `Arqueo y Cierre Diario. Saldo contado: $${real}. ${diferencia === 0 ? 'Sin diferencias' : diferencia > 0 ? `Sobrante: +$${diferencia}` : `Faltante: -$${Math.abs(diferencia)}`}`,
            monto: real,
            moneda: arqueoCaja.moneda,
            usuario: 'Administración'
        })

        setIsArqueoOpen(false)
        refreshData()
    }

    const handleOpenCajaModal = (caja?: Caja) => {
        if (caja) {
            setEditingCaja(caja)
            setCajaNombre(caja.nombre)
            setCajaTipo(caja.tipo)
            setCajaMoneda(caja.moneda)
            setCajaResponsable(caja.responsable)
            setCajaDesc(caja.descripcion || '')
        } else {
            setEditingCaja(null)
            setCajaNombre('')
            setCajaTipo('efectivo')
            setCajaMoneda('ARS')
            setCajaResponsable('General')
            setCajaDesc('')
        }
        setIsCajaModalOpen(true)
    }

    const handleSaveCaja = (e: React.FormEvent) => {
        e.preventDefault()
        saveCaja({
            id: editingCaja?.id,
            nombre: cajaNombre,
            tipo: cajaTipo,
            moneda: cajaMoneda,
            responsable: cajaResponsable,
            descripcion: cajaDesc,
            saldoActual: editingCaja ? editingCaja.saldoActual : 0,
            estado: 'abierta',
            habilitada: true
        })
        setIsCajaModalOpen(false)
        refreshData()
    }

    const filteredMovs = movimientos.filter(m => {
        if (selectedCajaId !== 'all' && m.cajaId !== selectedCajaId) return false
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase()
            return (
                m.concepto.toLowerCase().includes(q) ||
                m.categoria.toLowerCase().includes(q) ||
                (m.comprobante || '').toLowerCase().includes(q) ||
                m.usuario.toLowerCase().includes(q)
            )
        }
        return true
    })

    const totalEfectivoARS = cajas
        .filter(c => c.moneda === 'ARS' && c.tipo === 'efectivo')
        .reduce((sum, c) => sum + c.saldoActual, 0)

    const totalDigitalARS = cajas
        .filter(c => c.moneda === 'ARS' && c.tipo === 'digital')
        .reduce((sum, c) => sum + c.saldoActual, 0)

    const totalUSD = cajas
        .filter(c => c.moneda === 'USD')
        .reduce((sum, c) => sum + c.saldoActual, 0)

    return (
        <div className="abm-list-view animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Summary and Action Buttons */}
            <div className="abm-actions-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleOpenMov('ingreso')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <PlusCircle size={15} /> + Registrar Ingreso / Seña
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleOpenMov('egreso')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f87171' }}
                    >
                        <MinusCircle size={15} /> - Registrar Gasto / Retiro
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleOpenCajaModal()}
                    >
                        + Nueva Caja
                    </Button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div className="stat-pill" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
                        <span className="label">💵 Efectivo ARS:</span>
                        <span className="value">${totalEfectivoARS.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="stat-pill" style={{ borderColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}>
                        <span className="label">📱 Digital / MP:</span>
                        <span className="value">${totalDigitalARS.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="stat-pill" style={{ borderColor: 'rgba(234, 179, 8, 0.3)', color: '#facc15' }}>
                        <span className="label">🇺🇸 Caja USD:</span>
                        <span className="value">US${totalUSD.toLocaleString('es-AR')}</span>
                    </div>
                </div>
            </div>

            {/* Boxes Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                {cajas.map(c => {
                    const isUSD = c.moneda === 'USD'
                    const isDigital = c.tipo === 'digital'

                    return (
                        <div 
                            key={c.id} 
                            className="stock-card"
                            style={{ 
                                padding: '16px',
                                minHeight: 'auto',
                                borderColor: selectedCajaId === c.id ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)',
                                background: selectedCajaId === c.id ? 'rgba(255, 255, 255, 0.05)' : 'var(--bg-card)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                        {c.tipo} • {c.moneda}
                                    </span>
                                    <h4 style={{ margin: '2px 0 0 0', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                                        {c.nombre}
                                    </h4>
                                </div>
                                <span className={`stock-level-badge ${c.estado === 'abierta' ? 'level-optimal' : 'level-out'}`}>
                                    {c.estado === 'abierta' ? '🟢 Abierta' : '🔴 Cerrada'}
                                </span>
                            </div>

                            <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                                {c.descripcion || `Responsable: ${c.responsable}`}
                            </p>

                            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Actual:</span>
                                <strong style={{ fontSize: '1.25rem', color: isUSD ? '#facc15' : isDigital ? '#60a5fa' : '#34d399', fontWeight: 900 }}>
                                    {isUSD ? 'US$' : '$'} {c.saldoActual.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                                </strong>
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                                <Button 
                                    size="xs" 
                                    variant="secondary" 
                                    onClick={() => handleOpenMov('ingreso', c.id)}
                                    style={{ flex: 1 }}
                                >
                                    + Ingreso
                                </Button>
                                <Button 
                                    size="xs" 
                                    variant="secondary" 
                                    onClick={() => handleOpenMov('egreso', c.id)}
                                    style={{ flex: 1 }}
                                >
                                    - Gasto
                                </Button>
                                <Button 
                                    size="xs" 
                                    variant="outline" 
                                    onClick={() => handleOpenArqueo(c)}
                                    title="Arqueo y Cierre de Caja"
                                >
                                    ⚖️ Arqueo
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Movements Section & Filter Header */}
            <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <History size={16} color="var(--text-primary)" />
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
                            Libro Diario y Movimientos de Caja
                        </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select 
                            className="input-field sm"
                            value={String(selectedCajaId)}
                            onChange={e => setSelectedCajaId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            style={{ width: '200px' }}
                        >
                            <option value="all">📂 Todas las cajas</option>
                            {cajas.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>

                        <input 
                            type="text" 
                            className="input-field sm"
                            placeholder="Buscar movimiento..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '180px' }}
                        />
                    </div>
                </div>

                <table className="abm-table">
                    <thead>
                        <tr>
                            <th>Fecha y Hora</th>
                            <th>Caja</th>
                            <th>Tipo / Categoría</th>
                            <th>Concepto</th>
                            <th>Comprobante</th>
                            <th>Usuario</th>
                            <th style={{ textAlign: 'right' }}>Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMovs.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    No hay movimientos registrados para la selección.
                                </td>
                            </tr>
                        ) : (
                            filteredMovs.map(m => {
                                const isPositive = m.tipo === 'ingreso' || m.tipo === 'apertura'
                                const isAjuste = m.tipo === 'ajuste'
                                const box = cajas.find(c => c.id === m.cajaId)

                                return (
                                    <tr key={m.id}>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {new Date(m.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                {box?.nombre || `Caja #${m.cajaId}`}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`stock-level-badge ${isAjuste ? 'level-medium' : isPositive ? 'level-optimal' : 'level-out'}`}>
                                                {isAjuste ? '⚖️ Ajuste' : isPositive ? '↗️ ' + m.categoria : '↘️ ' + m.categoria}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ color: 'var(--text-primary)' }}>{m.concepto}</span>
                                            {m.pedidoId && (
                                                <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>
                                                    (Orden #{m.pedidoId})
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {m.comprobante || '-'}
                                        </td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {m.usuario}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <strong style={{ 
                                                fontSize: '0.95rem',
                                                color: isAjuste ? '#facc15' : isPositive ? '#34d399' : '#f87171' 
                                            }}>
                                                {isAjuste ? '' : isPositive ? '+' : '-'} {m.moneda === 'USD' ? 'US$' : '$'} {m.monto.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                                            </strong>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Movement Modal (Ingreso / Egreso) */}
            {isMovModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content stock-modal" style={{ maxWidth: '440px' }}>
                        <h3 style={{ margin: '0 0 4px 0', color: movType === 'ingreso' ? '#34d399' : '#f87171' }}>
                            {movType === 'ingreso' ? '➕ Registrar Ingreso de Dinero' : '➖ Registrar Gasto / Egreso de Caja'}
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Impacta directamente en el saldo de la caja seleccionada.
                        </p>

                        <form onSubmit={handleSaveMov} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Caja de Destino
                                </label>
                                <select 
                                    className="input-field"
                                    value={targetCajaId}
                                    onChange={e => setTargetCajaId(Number(e.target.value))}
                                >
                                    {cajas.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre} (Saldo: ${c.saldoActual.toLocaleString('es-AR')})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Monto
                                </label>
                                <input 
                                    type="number"
                                    step="any"
                                    className="input-field"
                                    required
                                    placeholder="0.00"
                                    value={movMonto}
                                    onChange={e => setMovMonto(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Categoría
                                </label>
                                <select 
                                    className="input-field"
                                    value={movCategoria}
                                    onChange={e => setMovCategoria(e.target.value)}
                                >
                                    {movType === 'ingreso' ? (
                                        <>
                                            <option value="Cobro Pedido">Cobro Pedido / Entrega</option>
                                            <option value="Seña">Seña de Pedido (50%)</option>
                                            <option value="Aporte Capital">Aporte de Capital</option>
                                            <option value="Cobro Cuenta Corriente">Cobro Cuenta Corriente</option>
                                            <option value="Otro">Otro Ingreso</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="Insumos Taller">Insumos Taller / Ferretería</option>
                                            <option value="Viáticos">Viáticos / Comida</option>
                                            <option value="Flete">Pago Fletero / Envíos</option>
                                            <option value="Retiro Socios">Retiro de Socios</option>
                                            <option value="Limpieza">Artículos de Limpieza</option>
                                            <option value="Mantenimiento">Mantenimiento de Máquinas</option>
                                            <option value="Otro">Otro Gasto</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Concepto / Detalle
                                </label>
                                <input 
                                    type="text"
                                    className="input-field"
                                    placeholder="Ej: Compra de cinta bifaz en ferretería central"
                                    value={movConcepto}
                                    onChange={e => setMovConcepto(e.target.value)}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    N° Comprobante / Ticket (Opcional)
                                </label>
                                <input 
                                    type="text"
                                    className="input-field"
                                    placeholder="Ej: Factura B #10293"
                                    value={movComprobante}
                                    onChange={e => setMovComprobante(e.target.value)}
                                />
                            </div>

                            <div className="modal-actions" style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button type="button" variant="ghost" onClick={() => setIsMovModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" variant="primary">Guardar Movimiento</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Arqueo Modal */}
            {isArqueoOpen && arqueoCaja && (
                <div className="modal-overlay">
                    <div className="modal-content stock-modal" style={{ maxWidth: '420px' }}>
                        <h3 style={{ margin: '0 0 4px 0' }}>⚖️ Arqueo y Cierre: {arqueoCaja.nombre}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Ingresa el dinero físico real que tienes en mano para comparar contra el sistema.
                        </p>

                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Saldo Teórico Sistema:</span>
                                <strong style={{ color: 'var(--text-primary)' }}>
                                    ${arqueoCaja.saldoActual.toLocaleString('es-AR')}
                                </strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Diferencia:</span>
                                <strong style={{ 
                                    color: (parseFloat(contadoReal) || 0) - arqueoCaja.saldoActual === 0 ? '#34d399' : (parseFloat(contadoReal) || 0) - arqueoCaja.saldoActual > 0 ? '#60a5fa' : '#f87171' 
                                }}>
                                    {contadoReal ? `$${((parseFloat(contadoReal) || 0) - arqueoCaja.saldoActual).toLocaleString('es-AR')}` : '$0'}
                                </strong>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                Efectivo Real Contado ($)
                            </label>
                            <input 
                                type="number"
                                className="input-field"
                                autoFocus
                                placeholder="0.00"
                                value={contadoReal}
                                onChange={e => setContadoReal(e.target.value)}
                            />
                        </div>

                        <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Button variant="ghost" onClick={() => setIsArqueoOpen(false)}>Cancelar</Button>
                            <Button variant="primary" onClick={handleConfirmArqueo}>Ajustar y Cerrar Caja</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Crear/Editar Caja Modal */}
            {isCajaModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content stock-modal" style={{ maxWidth: '420px' }}>
                        <h3 style={{ margin: '0 0 4px 0' }}>{editingCaja ? 'Editar Caja' : '➕ Nueva Caja'}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Configura un nuevo punto de cobranza o fondo de efectivo.
                        </p>

                        <form onSubmit={handleSaveCaja} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Nombre de la Caja
                                </label>
                                <input 
                                    type="text" 
                                    className="input-field"
                                    required
                                    placeholder="Ej: Caja Sucursal Centro"
                                    value={cajaNombre}
                                    onChange={e => setCajaNombre(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        Tipo
                                    </label>
                                    <select 
                                        className="input-field"
                                        value={cajaTipo}
                                        onChange={e => setCajaTipo(e.target.value as any)}
                                    >
                                        <option value="efectivo">Efectivo</option>
                                        <option value="digital">Digital / MP</option>
                                        <option value="dolares">Dólares</option>
                                        <option value="banco">Banco</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        Moneda
                                    </label>
                                    <select 
                                        className="input-field"
                                        value={cajaMoneda}
                                        onChange={e => setCajaMoneda(e.target.value)}
                                    >
                                        <option value="ARS">ARS ($)</option>
                                        <option value="USD">USD (US$)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Responsable
                                </label>
                                <input 
                                    type="text" 
                                    className="input-field"
                                    placeholder="Ej: Recepción / Juan Pérez"
                                    value={cajaResponsable}
                                    onChange={e => setCajaResponsable(e.target.value)}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Descripción / Notas
                                </label>
                                <input 
                                    type="text" 
                                    className="input-field"
                                    placeholder="Uso previsto para esta caja"
                                    value={cajaDesc}
                                    onChange={e => setCajaDesc(e.target.value)}
                                />
                            </div>

                            <div className="modal-actions" style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button type="button" variant="ghost" onClick={() => setIsCajaModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" variant="primary">Guardar Caja</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
