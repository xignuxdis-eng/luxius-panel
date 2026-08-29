import { useState } from 'react'
import { getBancos, saveBanco, deleteBanco } from '@data/db'
import type { Banco } from '@/types'
import Button from '@components/ui/Button'
import { Landmark, Plus, Copy, Check, Edit2, Trash2 } from 'lucide-react'
import './ABM.css'

export default function BancosView() {
    const [bancos, setBancos] = useState<Banco[]>(() => getBancos())
    const [searchTerm, setSearchTerm] = useState('')
    const [copiedField, setCopiedField] = useState<string | null>(null)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingBanco, setEditingBanco] = useState<Banco | null>(null)
    const [nombre, setNombre] = useState('')
    const [tipoCuenta, setTipoCuenta] = useState<'corriente' | 'caja_ahorro' | 'virtual'>('corriente')
    const [numeroCuenta, setNumeroCuenta] = useState('')
    const [cbu, setCbu] = useState('')
    const [alias, setAlias] = useState('')
    const [titular, setTitular] = useState('')
    const [cuitTitular, setCuitTitular] = useState('')
    const [saldoActual, setSaldoActual] = useState('')

    const refreshData = () => {
        setBancos(getBancos())
    }

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        setCopiedField(label)
        setTimeout(() => setCopiedField(null), 2000)
    }

    const handleOpenModal = (banco?: Banco) => {
        if (banco) {
            setEditingBanco(banco)
            setNombre(banco.nombre)
            setTipoCuenta(banco.tipoCuenta)
            setNumeroCuenta(banco.numeroCuenta)
            setCbu(banco.cbu)
            setAlias(banco.alias)
            setTitular(banco.titular)
            setCuitTitular(banco.cuitTitular)
            setSaldoActual(String(banco.saldoActual || 0))
        } else {
            setEditingBanco(null)
            setNombre('')
            setTipoCuenta('corriente')
            setNumeroCuenta('')
            setCbu('')
            setAlias('')
            setTitular('Xignux Gráfica S.A.')
            setCuitTitular('30-71234567-8')
            setSaldoActual('0')
        }
        setIsModalOpen(true)
    }

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault()
        saveBanco({
            id: editingBanco?.id,
            nombre,
            tipoCuenta,
            numeroCuenta,
            cbu,
            alias,
            titular,
            cuitTitular,
            saldoActual: parseFloat(saldoActual) || 0,
            moneda: 'ARS',
            habilitado: true
        })
        setIsModalOpen(false)
        refreshData()
    }

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de eliminar esta cuenta bancaria?')) {
            deleteBanco(id)
            refreshData()
        }
    }

    const filteredBancos = bancos.filter(b => {
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase()
            return (
                b.nombre.toLowerCase().includes(q) ||
                b.alias.toLowerCase().includes(q) ||
                b.cbu.toLowerCase().includes(q) ||
                b.titular.toLowerCase().includes(q)
            )
        }
        return true
    })

    const totalSaldoBancos = bancos.reduce((acc, b) => acc + (b.saldoActual || 0), 0)

    return (
        <div className="abm-list-view animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="abm-actions-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleOpenModal()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Plus size={15} /> + Nueva Cuenta Bancaria
                    </Button>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="stat-pill" style={{ borderColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}>
                        <span className="label">🏦 Saldo Total en Bancos:</span>
                        <span className="value">${totalSaldoBancos.toLocaleString('es-AR')}</span>
                    </div>

                    <input 
                        type="text" 
                        className="input-field sm"
                        placeholder="Buscar banco, CBU o alias..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '220px' }}
                    />
                </div>
            </div>

            {/* Banks Grid Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {filteredBancos.map(b => (
                    <div 
                        key={b.id} 
                        className="stock-card"
                        style={{ padding: '18px', minHeight: 'auto' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '8px', borderRadius: '8px' }}>
                                    <Landmark size={20} />
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                        {b.tipoCuenta === 'corriente' ? 'Cuenta Corriente' : b.tipoCuenta === 'caja_ahorro' ? 'Caja de Ahorro' : 'Billetera Virtual'}
                                    </span>
                                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                                        {b.nombre}
                                    </h4>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="op-btn-sm" onClick={() => handleOpenModal(b)} title="Editar">
                                    <Edit2 size={13} />
                                </button>
                                <button className="op-btn-sm" onClick={() => handleDelete(b.id)} title="Eliminar">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>

                        {/* Account Details Box */}
                        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alias:</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <code style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem' }}>{b.alias || '-'}</code>
                                    {b.alias && (
                                        <button 
                                            className="op-btn-sm" 
                                            onClick={() => handleCopy(b.alias, `alias-${b.id}`)}
                                            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                        >
                                            {copiedField === `alias-${b.id}` ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CBU:</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.cbu || '-'}</code>
                                    {b.cbu && (
                                        <button 
                                            className="op-btn-sm" 
                                            onClick={() => handleCopy(b.cbu, `cbu-${b.id}`)}
                                            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                        >
                                            {copiedField === `cbu-${b.id}` ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Titular:</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{b.titular} ({b.cuitTitular})</span>
                            </div>
                        </div>

                        {/* Balance */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Contable:</span>
                            <strong style={{ fontSize: '1.2rem', color: '#60a5fa', fontWeight: 900 }}>
                                ${b.saldoActual.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                            </strong>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Crear/Editar Banco */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content stock-modal" style={{ maxWidth: '440px' }}>
                        <h3 style={{ margin: '0 0 4px 0' }}>{editingBanco ? 'Editar Cuenta Bancaria' : '➕ Nueva Cuenta Bancaria'}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Datos de cuenta para transferencias y conciliación.
                        </p>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    Nombre del Banco / Entidad
                                </label>
                                <input 
                                    type="text" 
                                    className="input-field"
                                    required
                                    placeholder="Ej: Banco Santander / Mercado Pago"
                                    value={nombre}
                                    onChange={e => setNombre(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        Tipo de Cuenta
                                    </label>
                                    <select 
                                        className="input-field"
                                        value={tipoCuenta}
                                        onChange={e => setTipoCuenta(e.target.value as any)}
                                    >
                                        <option value="corriente">Cuenta Corriente</option>
                                        <option value="caja_ahorro">Caja de Ahorro</option>
                                        <option value="virtual">Billetera Virtual</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        N° Cuenta
                                    </label>
                                    <input 
                                        type="text" 
                                        className="input-field"
                                        placeholder="Ej: 072-123456/7"
                                        value={numeroCuenta}
                                        onChange={e => setNumeroCuenta(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        Alias
                                    </label>
                                    <input 
                                        type="text" 
                                        className="input-field"
                                        placeholder="Ej: XIGNUX.PRODUCCION"
                                        value={alias}
                                        onChange={e => setAlias(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        Saldo Actual ($)
                                    </label>
                                    <input 
                                        type="number" 
                                        className="input-field"
                                        placeholder="0.00"
                                        value={saldoActual}
                                        onChange={e => setSaldoActual(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                    CBU / CVU (22 dígitos)
                                </label>
                                <input 
                                    type="text" 
                                    className="input-field"
                                    placeholder="0720072020000012345678"
                                    value={cbu}
                                    onChange={e => setCbu(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        Titular de Cuenta
                                    </label>
                                    <input 
                                        type="text" 
                                        className="input-field"
                                        value={titular}
                                        onChange={e => setTitular(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        CUIT Titular
                                    </label>
                                    <input 
                                        type="text" 
                                        className="input-field"
                                        value={cuitTitular}
                                        onChange={e => setCuitTitular(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="modal-actions" style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" variant="primary">Guardar Cuenta</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
