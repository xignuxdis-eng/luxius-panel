import { useState, useEffect, useMemo, useCallback } from 'react'
import { getMovimientosStock } from '@data/db'
import type { MovimientoStock } from '@/types'
import { generateStockReportPdf } from '@/utils/generateStockReportPdf'
import { FileDown } from 'lucide-react'
import './StockNewsFeed.css'

type PeriodFilter = 'semana' | 'mes' | 'dias'

const TIPO_META: Record<MovimientoStock['tipo'], { label: string; icon: string; className: string }> = {
    ingreso: { label: 'Ingreso', icon: '↗️', className: 'tipo-ingreso' },
    egreso: { label: 'Egreso', icon: '↘️', className: 'tipo-egreso' },
    ajuste: { label: 'Ajuste', icon: '⚖️', className: 'tipo-ajuste' },
    inicial: { label: 'Inicial', icon: '📦', className: 'tipo-inicial' }
}

function startOfWeek(d: Date): Date {
    const day = (d.getDay() + 6) % 7 // Monday = 0
    const result = new Date(d)
    result.setHours(0, 0, 0, 0)
    result.setDate(d.getDate() - day)
    return result
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1)
}

function computeDesde(filter: PeriodFilter, days: number): Date {
    const now = new Date()
    if (filter === 'semana') return startOfWeek(now)
    if (filter === 'mes') return startOfMonth(now)
    const safeDays = Math.max(1, days)
    return new Date(now.getTime() - safeDays * 24 * 60 * 60 * 1000)
}

function computeLabel(filter: PeriodFilter, days: number, desde: Date): string {
    if (filter === 'semana') {
        const fin = new Date(desde.getTime() + 6 * 24 * 60 * 60 * 1000)
        return `Semana actual (${desde.toLocaleDateString('es-AR')} - ${fin.toLocaleDateString('es-AR')})`
    }
    if (filter === 'mes') {
        return `Mes actual (${desde.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })})`
    }
    return `Últimos ${Math.max(1, days)} días`
}

export default function StockNewsFeed() {
    const [movimientos, setMovimientos] = useState<MovimientoStock[]>(() => getMovimientosStock())
    const [filter, setFilter] = useState<PeriodFilter>('dias')
    const [days, setDays] = useState<number>(7)

    const refresh = useCallback(() => setMovimientos(getMovimientosStock()), [])

    useEffect(() => {
        refresh()
        const interval = setInterval(refresh, 3000)
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'luxius_movimientos_stock') refresh()
        }
        const onStockUpdate = () => refresh()
        window.addEventListener('storage', onStorage)
        window.addEventListener('luxius-stock-updated', onStockUpdate)
        return () => {
            clearInterval(interval)
            window.removeEventListener('storage', onStorage)
            window.removeEventListener('luxius-stock-updated', onStockUpdate)
        }
    }, [refresh])

    const filtered = useMemo(() => {
        const desde = computeDesde(filter, days).getTime()
        return movimientos.filter(m => new Date(m.fecha).getTime() >= desde)
    }, [movimientos, filter, days])

    const desde = computeDesde(filter, days)
    const label = computeLabel(filter, days, desde)

    const totalIngresos = filtered
        .filter(m => m.tipo === 'ingreso' || m.tipo === 'inicial')
        .reduce((sum, m) => sum + m.cantidad, 0)
    const totalEgresos = filtered
        .filter(m => m.tipo === 'egreso')
        .reduce((sum, m) => sum + m.cantidad, 0)

    const animationDuration = Math.max(14, filtered.length * 2.5)
    const trackItems = filtered.length > 0 ? [...filtered, ...filtered] : []

    const handleExport = () => {
        if (filtered.length === 0) {
            alert('No hay movimientos de stock en el período seleccionado.')
            return
        }
        generateStockReportPdf(filtered, { periodo: label })
    }

    const formatCantidad = (m: MovimientoStock) => {
        const sign = m.tipo === 'ingreso' || m.tipo === 'inicial' ? '+' : m.tipo === 'egreso' ? '-' : ''
        return `${sign}${m.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
    }

    return (
        <div className="stock-news-feed glass-panel">
            <div className="stock-news-header">
                <div className="stock-news-title">
                    <span className="live-dot" />
                    <h3>📰 Entradas de Stock en Tiempo Real</h3>
                </div>
                <div className="stock-news-controls">
                    <div className="filter-group-btns">
                        <button
                            className={`filter-chip ${filter === 'semana' ? 'active' : ''}`}
                            onClick={() => setFilter('semana')}
                        >
                            Semana
                        </button>
                        <button
                            className={`filter-chip ${filter === 'mes' ? 'active' : ''}`}
                            onClick={() => setFilter('mes')}
                        >
                            Mes
                        </button>
                        <button
                            className={`filter-chip ${filter === 'dias' ? 'active' : ''}`}
                            onClick={() => setFilter('dias')}
                        >
                            Días
                        </button>
                    </div>
                    {filter === 'dias' && (
                        <input
                            type="number"
                            min={1}
                            max={365}
                            className="days-input"
                            value={days}
                            onChange={e => setDays(Number(e.target.value) || 7)}
                            title="Cantidad de días a incluir"
                        />
                    )}
                    <button className="export-btn" onClick={handleExport} title="Exportar historial a PDF">
                        <FileDown size={15} /> Exportar PDF
                    </button>
                </div>
            </div>

            <div className="stock-news-meta">
                <span>Período: <strong>{label}</strong></span>
                <span className="meta-sep">·</span>
                <span>{filtered.length} movimientos</span>
                <span className="meta-sep">·</span>
                <span className="meta-ing">Ingresos: +{totalIngresos.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                <span className="meta-sep">·</span>
                <span className="meta-egr">Egresos: -{totalEgresos.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
            </div>

            {filtered.length === 0 ? (
                <div className="stock-news-empty">
                    📭 No hay entradas de stock registradas para el período seleccionado.
                    <br />
                    <small>Los ajustes de stock (ingreso / egreso / fijar) aparecerán aquí automáticamente.</small>
                </div>
            ) : (
                <div className="stock-feed-viewport">
                    <div className="stock-feed-track" style={{ animationDuration: `${animationDuration}s` }}>
                        {trackItems.map((m, i) => {
                            const meta = TIPO_META[m.tipo]
                            const fecha = m.fecha
                                ? new Date(m.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                                : '-'
                            return (
                                <div className="stock-feed-item" key={`${m.id}-${i}`}>
                                    <div className={`feed-badge ${meta.className}`} title={meta.label}>
                                        <span>{meta.icon}</span>
                                    </div>
                                    <div className="feed-body">
                                        <div className="feed-line1">
                                            <strong className="feed-code">{m.materialCodigo || 'S/C'}</strong>
                                            <span className="feed-desc">{m.materialDescripcion || 'Material'}</span>
                                        </div>
                                        <div className="feed-line2">
                                            <span className="feed-stock">
                                                {m.stockAnterior.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                                                <span className="feed-arrow"> → </span>
                                                {m.stockNuevo.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                                            </span>
                                            <span className="feed-user">👤 {m.usuario}</span>
                                        </div>
                                    </div>
                                    <div className="feed-right">
                                        <span className={`feed-cantidad ${meta.className}`}>{formatCantidad(m)}</span>
                                        <span className="feed-fecha">{fecha}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
