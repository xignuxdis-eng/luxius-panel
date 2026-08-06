import { useState, useEffect, useMemo } from 'react'
import Button from '@components/ui/Button'
import { getOrdenes } from '@data/db'
import { generatePdfClientReport } from '@/utils/generatePdfClientReport'
import type { Cliente, Order } from '@/types'
import './ABM.css'

interface ClienteReporteModalProps {
    cliente: Cliente | null
    isOpen: boolean
    onClose: () => void
}

export default function ClienteReporteModal({ cliente, isOpen, onClose }: ClienteReporteModalProps) {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(false)
    const [dateFrom, setDateFrom] = useState<string>('')
    const [dateTo, setDateTo] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('todos')

    useEffect(() => {
        if (isOpen) {
            const load = async () => {
                setLoading(true)
                try {
                    const allOrders = await getOrdenes()
                    setOrders(allOrders)
                } catch (e) {
                    console.error('[ClienteReporteModal] Error:', e)
                } finally {
                    setLoading(false)
                }
            }
            load()
        }
    }, [isOpen])

    // Filter orders matching this client
    const clientOrders = useMemo(() => {
        if (!cliente) return []
        return orders.filter(o => {
            const matchesId = o.clientId === cliente.id || (o as any).clienteId === cliente.id
            const matchesName = o.clienteNombre && o.clienteNombre.toLowerCase().includes(cliente.nombre.toLowerCase())
            if (!matchesId && !matchesName) return false

            // Status filter
            if (statusFilter !== 'todos') {
                if (statusFilter === 'pendientes_cobro') {
                    if (['entregado', 'finalizado'].includes(o.status)) return false
                } else if (o.status !== statusFilter) {
                    return false
                }
            }

            // Date filter
            if (dateFrom && o.createdAt) {
                const d = new Date(o.createdAt).toISOString().split('T')[0]
                if (d < dateFrom) return false
            }
            if (dateTo && o.createdAt) {
                const d = new Date(o.createdAt).toISOString().split('T')[0]
                if (d > dateTo) return false
            }

            return true
        })
    }, [orders, cliente, statusFilter, dateFrom, dateTo])

    // Totals
    const totals = useMemo(() => {
        let total = 0
        let sena = 0
        let saldo = 0

        clientOrders.forEach(o => {
            const tot = Number(o.total || o.subtotal || 0)
            const sn = (o as any).sena !== undefined ? Number((o as any).sena) : (['entregado', 'finalizado'].includes(o.status) ? tot : tot * 0.5)
            const sld = Math.max(0, tot - sn)

            total += tot
            sena += sn
            saldo += sld
        })

        return { total, sena, saldo }
    }, [clientOrders])

    const applyDatePreset = (preset: 'month' | '30days' | 'year' | 'all') => {
        const now = new Date()
        if (preset === 'all') {
            setDateFrom('')
            setDateTo('')
            return
        }
        if (preset === 'month') {
            const first = new Date(now.getFullYear(), now.getMonth(), 1)
            setDateFrom(first.toISOString().split('T')[0])
            setDateTo(now.toISOString().split('T')[0])
            return
        }
        if (preset === '30days') {
            const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            setDateFrom(d30.toISOString().split('T')[0])
            setDateTo(now.toISOString().split('T')[0])
            return
        }
        if (preset === 'year') {
            const firstYear = new Date(now.getFullYear(), 0, 1)
            setDateFrom(firstYear.toISOString().split('T')[0])
            setDateTo(now.toISOString().split('T')[0])
            return
        }
    }

    const handleGeneratePdf = () => {
        if (!cliente) return
        if (clientOrders.length === 0) {
            alert('No se encontraron órdenes para este cliente con los filtros seleccionados.')
            return
        }

        generatePdfClientReport(clientOrders, {
            clienteNombre: cliente.nombre,
            clienteEmpresa: cliente.empresa,
            clienteTelefono: cliente.telefono,
            clienteEmail: cliente.email,
            fechaDesde: dateFrom ? new Date(dateFrom).toLocaleDateString('es-AR') : 'Inicio',
            fechaHasta: dateTo ? new Date(dateTo).toLocaleDateString('es-AR') : 'Hoy',
            estadoFiltro: statusFilter !== 'todos' ? statusFilter : undefined
        })
    }

    if (!isOpen || !cliente) return null

    return (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1100 }}>
            <div className="modal-container glass-panel animate-scale-up" style={{ maxWidth: '780px', width: '95%', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                            📄 Reporte y Estado de Cuenta: <span style={{ color: 'var(--primary-color)' }}>{cliente.nombre}</span>
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {cliente.empresa ? `Empresa: ${cliente.empresa} | ` : ''} CUIT: {cliente.cuit || 'S/D'} | Tel: {cliente.telefono || 'S/D'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                {/* Filters */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>DESDE</label>
                        <input
                            type="date"
                            className="input-field sm"
                            style={{ width: '100%' }}
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>HASTA</label>
                        <input
                            type="date"
                            className="input-field sm"
                            style={{ width: '100%' }}
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>ESTADO</label>
                        <select
                            className="input-field sm"
                            style={{ width: '100%' }}
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="todos">Todos los Estados</option>
                            <option value="diseno">En Diseño</option>
                            <option value="orden">En Impresión</option>
                            <option value="impreso">Impreso</option>
                            <option value="entregado">Entregado</option>
                            <option value="pendientes_cobro">Pendientes de Cobro</option>
                        </select>
                    </div>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                    <button className="preset-btn" onClick={() => applyDatePreset('month')}>Este Mes</button>
                    <button className="preset-btn" onClick={() => applyDatePreset('30days')}>Últimos 30 días</button>
                    <button className="preset-btn" onClick={() => applyDatePreset('year')}>Este Año</button>
                    <button className="preset-btn active" onClick={() => applyDatePreset('all')}>Todo</button>
                </div>

                {/* Summary Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                    <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>ÓRDENES</span>
                        <strong style={{ fontSize: '1.2rem', color: '#2563eb' }}>{clientOrders.length} OTs</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>TOTAL CONTRATADO</span>
                        <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>${totals.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>SEÑAS / ABONADO</span>
                        <strong style={{ fontSize: '1.1rem', color: '#c084fc' }}>${totals.sena.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>SALDO PENDIENTE</span>
                        <strong style={{ fontSize: '1.1rem', color: totals.saldo > 0 ? '#ef4444' : '#10b981' }}>
                            ${totals.saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </strong>
                    </div>
                </div>

                {/* Orders Preview Table */}
                <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '24px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    {loading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando órdenes del cliente...</div>
                    ) : clientOrders.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay órdenes registradas para este cliente en el período seleccionado.</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px 12px' }}>OT</th>
                                    <th style={{ padding: '8px 12px' }}>Fecha</th>
                                    <th style={{ padding: '8px 12px' }}>Trabajo</th>
                                    <th style={{ padding: '8px 12px' }}>Estado</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientOrders.map(o => {
                                    const tot = Number(o.total || o.subtotal || 0)
                                    const sn = (o as any).sena !== undefined ? Number((o as any).sena) : (['entregado', 'finalizado'].includes(o.status) ? tot : tot * 0.5)
                                    const sld = Math.max(0, tot - sn)

                                    return (
                                        <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '8px 12px', fontWeight: 800, color: '#ff9800' }}>{o.ot || `OT-${o.id}`}</td>
                                            <td style={{ padding: '8px 12px' }}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('es-AR') : '-'}</td>
                                            <td style={{ padding: '8px 12px' }}>{o.nombreTarea || o.material}</td>
                                            <td style={{ padding: '8px 12px' }}>{o.status}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>${tot.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: sld > 0 ? '#ef4444' : '#10b981' }}>
                                                ${sld.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" onClick={handleGeneratePdf} style={{ background: '#2563eb', borderColor: '#2563eb' }}>
                        📄 Generar Estado de Cuenta PDF
                    </Button>
                </div>
            </div>
        </div>
    )
}
