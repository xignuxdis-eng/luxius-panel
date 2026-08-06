import { useState, useEffect, useMemo } from 'react'
import Header from '@components/layout/Header'
import Button from '@components/ui/Button'
import { getOrdenes, getClientes, getMateriales } from '@data/db'
import { generatePdfClientReport } from '@/utils/generatePdfClientReport'
import type { Order } from '@/types'
import './Reportes.css'

export default function Reportes() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    // FILTERS STATE
    const [selectedClientId, setSelectedClientId] = useState<string>('todos')
    const [dateFrom, setDateFrom] = useState<string>('')
    const [dateTo, setDateTo] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('todos')
    const [categoryFilter, setCategoryFilter] = useState<string>('todos')
    const [materialFilter, setMaterialFilter] = useState<string>('todos')
    const [searchTerm, setSearchTerm] = useState<string>('')

    // SELECTION STATE (Individual checkmark selection)
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number | string>>(new Set())

    // LOAD DATA
    const allClientes = useMemo(() => getClientes(), [])
    const allMateriales = useMemo(() => getMateriales(), [])

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                const data = await getOrdenes()
                setOrders(data)
            } catch (e) {
                console.error('[Reportes] Error al cargar órdenes:', e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    // QUICK PRESETS FOR DATE
    const applyDatePreset = (preset: 'month' | '30days' | 'year' | 'all') => {
        const now = new Date()
        if (preset === 'all') {
            setDateFrom('')
            setDateTo('')
            return
        }
        if (preset === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
            setDateFrom(firstDay.toISOString().split('T')[0])
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

    // FILTERED ORDERS COMPUTATION
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            // Client filter
            if (selectedClientId !== 'todos') {
                const targetClientId = Number(selectedClientId)
                if (order.clientId !== targetClientId && (order as any).clienteId !== targetClientId) {
                    // Also check string match by client name if ID doesn't match
                    const selectedClient = allClientes.find(c => String(c.id) === selectedClientId)
                    if (selectedClient && !order.clienteNombre?.toLowerCase().includes(selectedClient.nombre.toLowerCase())) {
                        return false
                    }
                }
            }

            // Status filter
            if (statusFilter !== 'todos') {
                if (statusFilter === 'pendientes_cobro') {
                    if (['entregado', 'finalizado'].includes(order.status)) return false
                } else if (order.status !== statusFilter) {
                    return false
                }
            }

            // Category filter
            if (categoryFilter !== 'todos' && order.category !== categoryFilter) {
                return false
            }

            // Material filter
            if (materialFilter !== 'todos' && order.material !== materialFilter) {
                return false
            }

            // Date range filter
            if (dateFrom && order.createdAt) {
                const orderDate = new Date(order.createdAt).toISOString().split('T')[0]
                if (orderDate < dateFrom) return false
            }
            if (dateTo && order.createdAt) {
                const orderDate = new Date(order.createdAt).toISOString().split('T')[0]
                if (orderDate > dateTo) return false
            }

            // Text search
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase()
                const matches = (order.ot?.toLowerCase() || '').includes(q) ||
                                (order.clienteNombre?.toLowerCase() || '').includes(q) ||
                                (order.material?.toLowerCase() || '').includes(q) ||
                                (order.nombreTarea?.toLowerCase() || '').includes(q) ||
                                (order.observaciones?.toLowerCase() || '').includes(q)
                if (!matches) return false
            }

            return true
        })
    }, [orders, selectedClientId, statusFilter, categoryFilter, materialFilter, dateFrom, dateTo, searchTerm, allClientes])

    // Orders that are currently selected (or all filtered if none selectively unchecked)
    const effectiveOrdersToExport = useMemo(() => {
        if (selectedOrderIds.size === 0) return filteredOrders
        return filteredOrders.filter(o => selectedOrderIds.has(o.id) || (o.ot && selectedOrderIds.has(o.ot)))
    }, [filteredOrders, selectedOrderIds])

    // KPIS CALCULATIONS
    const kpis = useMemo(() => {
        let totalFacturado = 0
        let totalSena = 0
        let totalSaldo = 0
        let totalM2 = 0

        filteredOrders.forEach(o => {
            const tot = Number(o.total || o.subtotal || 0)
            const sena = (o as any).sena !== undefined ? Number((o as any).sena) : (['entregado', 'finalizado'].includes(o.status) ? tot : tot * 0.5)
            const saldo = Math.max(0, tot - sena)

            totalFacturado += tot
            totalSena += sena
            totalSaldo += saldo

            const w = Number(o.ancho) || 0
            const h = Number(o.alto) || 0
            const c = Number(o.copias) || 1
            totalM2 += (w * h * c)
        })

        return {
            count: filteredOrders.length,
            totalFacturado,
            totalSena,
            totalSaldo,
            totalM2
        }
    }, [filteredOrders])

    // SELECTION HANDLERS
    const toggleSelectOrder = (id: number | string) => {
        const newSet = new Set(selectedOrderIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedOrderIds(newSet)
    }

    const toggleSelectAll = () => {
        if (selectedOrderIds.size === filteredOrders.length) {
            setSelectedOrderIds(new Set())
        } else {
            setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)))
        }
    }

    // GENERATE CLIENT PDF
    const handleGeneratePdf = () => {
        if (effectiveOrdersToExport.length === 0) {
            alert('No hay órdenes para incluir en el reporte PDF.')
            return
        }

        const selectedClientObj = allClientes.find(c => String(c.id) === selectedClientId)
        const clienteNombre = selectedClientObj ? selectedClientObj.nombre : (selectedClientId !== 'todos' ? selectedClientId : 'Resumen General de Clientes')
        
        generatePdfClientReport(effectiveOrdersToExport, {
            clienteNombre,
            clienteEmpresa: selectedClientObj?.empresa,
            clienteTelefono: selectedClientObj?.telefono,
            clienteEmail: selectedClientObj?.email,
            fechaDesde: dateFrom ? new Date(dateFrom).toLocaleDateString('es-AR') : 'Inicio',
            fechaHasta: dateTo ? new Date(dateTo).toLocaleDateString('es-AR') : 'Hoy',
            estadoFiltro: statusFilter !== 'todos' ? statusFilter : undefined,
            categoriaFiltro: categoryFilter !== 'todos' ? categoryFilter : undefined,
            materialFiltro: materialFilter !== 'todos' ? materialFilter : undefined,
        })
    }

    // EXPORT TO CSV
    const handleExportCSV = () => {
        if (effectiveOrdersToExport.length === 0) {
            alert('No hay órdenes para exportar a CSV.')
            return
        }

        const headers = ['OT', 'Fecha', 'Cliente', 'Material', 'Ancho(m)', 'Alto(m)', 'Copias', 'Estado', 'Total($)', 'Seña($)', 'Saldo($)']
        const csvRows = [headers.join(',')]

        effectiveOrdersToExport.forEach(o => {
            const tot = Number(o.total || o.subtotal || 0)
            const sena = (o as any).sena !== undefined ? Number((o as any).sena) : (['entregado', 'finalizado'].includes(o.status) ? tot : tot * 0.5)
            const saldo = Math.max(0, tot - sena)
            const fecha = o.createdAt ? new Date(o.createdAt).toLocaleDateString('es-AR') : '-'

            const row = [
                `"${o.ot || `OT-${o.id}`}"`,
                `"${fecha}"`,
                `"${(o.clienteNombre || '').replace(/"/g, '""')}"`,
                `"${(o.material || '').replace(/"/g, '""')}"`,
                o.ancho || 0,
                o.alto || 0,
                o.copias || 1,
                `"${o.status}"`,
                tot.toFixed(2),
                sena.toFixed(2),
                saldo.toFixed(2)
            ]
            csvRows.push(row.join(','))
        })

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `Reporte_XignuX_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="reportes-page page animate-fade-in">
            <Header
                title="Generador de Reportes y PDF para Clientes"
                subtitle="Filtre y genere estados de cuenta y reportes personalizados en PDF"
            />

            <div className="reportes-container">
                {/* Filter Control Panel */}
                <div className="reports-filter-card">
                    <div className="filter-card-header">
                        <div className="filter-card-title">
                            <h3>🔍 Filtros de Consulta y Reporte</h3>
                            <p>Ajuste los parámetros para personalizar la lista de órdenes</p>
                        </div>
                        <div className="filter-presets">
                            <button className="preset-btn" onClick={() => applyDatePreset('month')}>Este Mes</button>
                            <button className="preset-btn" onClick={() => applyDatePreset('30days')}>Últimos 30 días</button>
                            <button className="preset-btn" onClick={() => applyDatePreset('year')}>Este Año</button>
                            <button className="preset-btn active" onClick={() => applyDatePreset('all')}>Todo el Historial</button>
                        </div>
                    </div>

                    <div className="filter-grid">
                        <div className="filter-field">
                            <label>Cliente</label>
                            <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                                <option value="todos">👥 Todos los Clientes</option>
                                {allClientes.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre} {c.empresa ? `(${c.empresa})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-field">
                            <label>Estado de Orden</label>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="todos">Todos los Estados</option>
                                <option value="diseno">🎨 En Diseño</option>
                                <option value="orden">🖨️ En Impresión</option>
                                <option value="impreso">✅ Impreso / Terminado</option>
                                <option value="entregado">📦 Entregado / Finalizado</option>
                                <option value="pendientes_cobro">💰 Pendientes de Cobro</option>
                            </select>
                        </div>

                        <div className="filter-field">
                            <label>Material</label>
                            <select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}>
                                <option value="todos">Todos los Materiales</option>
                                {allMateriales.map(m => (
                                    <option key={m.id} value={m.codigo}>{m.descripcion || m.codigo}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-field">
                            <label>Categoría</label>
                            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                                <option value="todos">Todas las Categorías</option>
                                <option value="impresion">🖨️ Impresión</option>
                                <option value="diseno">🎨 Diseño</option>
                            </select>
                        </div>

                        <div className="filter-field">
                            <label>Desde</label>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>

                        <div className="filter-field">
                            <label>Hasta</label>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Buscar por N° OT, Nombre de Cliente, Material u Observación..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--border)',
                                padding: '12px 16px',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-main)',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-icon-box" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                            📄
                        </div>
                        <div className="kpi-content">
                            <span className="kpi-label">Trabajos Encontrados</span>
                            <span className="kpi-value">{kpis.count} OTs</span>
                            <span className="kpi-sub">{kpis.totalM2.toFixed(2)} m² impresos</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            💵
                        </div>
                        <div className="kpi-content">
                            <span className="kpi-label">Total Contratado</span>
                            <span className="kpi-value" style={{ color: '#10b981' }}>${kpis.totalFacturado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                            <span className="kpi-sub">Suma de subtotales</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon-box" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                            💳
                        </div>
                        <div className="kpi-content">
                            <span className="kpi-label">Total Abonado / Señas</span>
                            <span className="kpi-value" style={{ color: '#c084fc' }}>${kpis.totalSena.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                            <span className="kpi-sub">Cobros registrados</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon-box" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            ⚠️
                        </div>
                        <div className="kpi-content">
                            <span className="kpi-label">Saldo Pendiente</span>
                            <span className="kpi-value" style={{ color: '#f87171' }}>${kpis.totalSaldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                            <span className="kpi-sub">Por cobrar al cliente</span>
                        </div>
                    </div>
                </div>

                {/* Export Action Bar */}
                <div className="reports-actions-bar">
                    <div className="actions-left">
                        <span>Listado de Resultados ({effectiveOrdersToExport.length} seleccionadas)</span>
                    </div>
                    <div className="actions-right">
                        <Button variant="secondary" onClick={handleExportCSV}>
                            📊 Exportar a Excel (CSV)
                        </Button>
                        <Button variant="primary" onClick={handleGeneratePdf} style={{ background: '#2563eb', borderColor: '#2563eb' }}>
                            📄 Generar PDF para Cliente
                        </Button>
                    </div>
                </div>

                {/* Preview Table */}
                <div className="report-table-card">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Cargando datos del informe...
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No se encontraron órdenes que coincidan con los filtros seleccionados.
                        </div>
                    ) : (
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th>N° OT</th>
                                    <th>Fecha</th>
                                    <th>Cliente</th>
                                    <th>Trabajo / Material</th>
                                    <th>Medidas</th>
                                    <th>Estado</th>
                                    <th style={{ textAlign: 'right' }}>Total ($)</th>
                                    <th style={{ textAlign: 'right' }}>Abonado ($)</th>
                                    <th style={{ textAlign: 'right' }}>Saldo ($)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(order => {
                                    const tot = Number(order.total || order.subtotal || 0)
                                    const sena = (order as any).sena !== undefined ? Number((order as any).sena) : (['entregado', 'finalizado'].includes(order.status) ? tot : tot * 0.5)
                                    const saldo = Math.max(0, tot - sena)
                                    const isSelected = selectedOrderIds.size === 0 || selectedOrderIds.has(order.id)

                                    let cleanDesc = (order.nombreTarea || order.observaciones || '').trim()
                                    if (!cleanDesc || cleanDesc.startsWith('Proyecto #') || cleanDesc.startsWith('Proyecto OT-')) {
                                        cleanDesc = order.material || 'Trabajo de Impresión'
                                    }

                                    return (
                                        <tr key={order.id} style={{ opacity: isSelected ? 1 : 0.4 }}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectOrder(order.id)}
                                                />
                                            </td>
                                            <td style={{ fontWeight: 800, color: '#ff9800' }}>
                                                {order.ot || `OT-${order.id}`}
                                            </td>
                                            <td>
                                                {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-AR') : '-'}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                {order.clienteNombre}
                                            </td>
                                            <td>
                                                {cleanDesc}
                                            </td>
                                            <td>
                                                {Number(order.ancho).toFixed(2)} x {Number(order.alto).toFixed(2)} m ({order.copias} cop)
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                    color: 'var(--text-main)'
                                                }}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                ${tot.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ textAlign: 'right', color: '#10b981' }}>
                                                ${sena.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: saldo > 0 ? '#ef4444' : '#10b981' }}>
                                                ${saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
