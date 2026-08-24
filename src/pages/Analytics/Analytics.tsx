import { useState, useEffect } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
    TrendingUp, Users, DollarSign, AlertTriangle, FileText, BarChart2, Download, Search,
    RefreshCcw, Printer, Maximize, Brain, Activity, Target
} from 'lucide-react';
import './Analytics.css';
import ConciliationTable from './ConciliationTable';
import { getMateriales, API_URL } from '@data/db';
import type { Material } from '@/types';
import { useAuthStore } from '@/store/authStore';
import Modal from '@/components/ui/Modal';
import { exportToCSV } from '@/utils/csvExport';

interface PrinterStat {
    jobName: string;
    machine: string;
    material: string;
    sizeM2: number;
    ink: { c: number; m: number; y: number; k: number };
    startTime: string;
    endTime: string;
    durationMinutes: number;
}

const COLORS = ['#3b82f6', '#ff6b00', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
const INK_COLORS = {
    c: '#00d4ff',
    m: '#ff4da6',
    y: '#ffe100',
    k: '#71717a'
};

export default function Analytics() {
    const [stats, setStats] = useState<PrinterStat[]>([]);
    const [_materiales, setMateriales] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        search: '',
        machine: 'all',
        material: 'all',
        dateFrom: '',
        dateTo: ''
    });
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'administrador' || user?.role === 'principal';

    const fetchData = async () => {
        try {
            // Fetch Stats
            const resStats = await fetch(`${API_URL}/analytics/stats`);
            if (!resStats.ok) throw new Error(`HTTP error! status: ${resStats.status}`);
            const dataStats = await resStats.json();
            setStats(dataStats);

            // Fetch Materials (Stock)
            const rawMateriales = await getMateriales();
            setMateriales(rawMateriales);

            // Fetch Dashboard Data (Admin Only)
            if (isAdmin) {
                const resDash = await fetch(`${API_URL}/analytics/dashboard`);
                if (resDash.ok) {
                    const dataDash = await resDash.json();
                    setDashboardData(dataDash);
                }
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch(`${API_URL}/analytics/process-logs`, { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const result = await res.json();
            alert(result.message);
            fetchData();
        } catch (err) {
            console.error('Error syncing logs:', err);
        } finally {
            setSyncing(false);
        }
    };

    const aggregatedByDay = () => {
        const aggregated: Record<string, { date: string; m2: number; count: number }> = {};
        stats.forEach((item) => {
            const timestamp = item.startTime || item.endTime;
            if (!timestamp) return;
            const date = timestamp.split('T')[0];
            if (!aggregated[date]) aggregated[date] = { date, m2: 0, count: 0 };
            aggregated[date].m2 += item.sizeM2;
            aggregated[date].count += 1;
        });
        return Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date));
    };

    const materialDistribution = () => {
        const aggregated: Record<string, number> = {};
        stats.forEach((item) => {
            aggregated[item.material] = (aggregated[item.material] || 0) + item.sizeM2;
        });
        return Object.entries(aggregated)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    };

    const inkConsumption = () => {
        const totals = { c: 0, m: 0, y: 0, k: 0 };
        stats.forEach((item) => {
            totals.c += item.ink.c;
            totals.m += item.ink.m;
            totals.y += item.ink.y;
            totals.k += item.ink.k;
        });
        return [
            { name: 'C', value: totals.c, color: INK_COLORS.c },
            { name: 'M', value: totals.m, color: INK_COLORS.m },
            { name: 'Y', value: totals.y, color: INK_COLORS.y },
            { name: 'K', value: totals.k, color: INK_COLORS.k },
        ];
    };

    const dailyData = aggregatedByDay();
    const materialData = materialDistribution();
    const inkData = inkConsumption();

    const totalM2 = stats.reduce((acc, curr) => acc + curr.sizeM2, 0);

    // Efficiency Calculations
    const efficiencyData = inkData.map(ink => ({
        name: ink.name,
        value: totalM2 > 0 ? ink.value / totalM2 : 0,
        color: ink.color
    }));

    if (loading) return <div className="analytics-loading">Cargando analíticas...</div>;

    return (
        <div className="analytics-container animate-fade-in">
            <header className="analytics-header">
                <div className="header-info">
                    <h1>Analíticas de Producción & Negocio v2.1</h1>
                    <p>Monitoreo en tiempo real de eficiencia, stock y rentabilidad.</p>
                </div>
                <button
                    className={`btn-sync ${syncing ? 'syncing' : ''}`}
                    onClick={handleSync}
                    disabled={syncing}
                >
                    <RefreshCcw size={16} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar Logs'}
                </button>
            </header>

            {isAdmin && dashboardData && (
                <section className="executive-section mb-12">
                    <div className="section-header-alt">
                        <TrendingUp size={20} className="text-accent" />
                        <h2>Resumen Ejecutivo</h2>
                    </div>
                    <div className="stats-grid">
                        <div className="stat-card business clickable" onClick={() => setActiveModal('billing')}>
                            <div className="stat-icon"><DollarSign size={18} /></div>
                            <span className="stat-label">Facturación Mensual</span>
                            <span className="stat-value">${dashboardData.summary.billing.toLocaleString()}</span>
                            <div className="card-hint">Click para ver detalle</div>
                        </div>
                        <div className="stat-card business clickable" onClick={() => setActiveModal('m2sold')}>
                            <div className="stat-icon"><Maximize size={18} /></div>
                            <span className="stat-label">m² Vendidos</span>
                            <span className="stat-value">{dashboardData.summary.billing > 0 ? dashboardData.summary.m2Sold.toFixed(1) : 0} <small>m²</small></span>
                            <div className="card-hint">Click para ver detalle</div>
                        </div>
                        <div className="stat-card business clickable" onClick={() => setActiveModal('m2printed')}>
                            <div className="stat-icon"><Printer size={18} /></div>
                            <span className="stat-label">m² Impresos ( logs )</span>
                            <span className="stat-value">{dashboardData.summary.m2Printed.toFixed(1)} <small>m²</small></span>
                            <div className="card-hint">Click para ver detalle</div>
                        </div>
                        <div className="stat-card business alert clickable" onClick={() => setActiveModal('stock')}>
                            <div className="stat-icon"><AlertTriangle size={18} /></div>
                            <span className="stat-label">Stock Warnings</span>
                            <span className="stat-value">{dashboardData.summary.stockWarnings}</span>
                            <div className="card-hint">Click para ver detalle</div>
                        </div>
                        <div className="stat-card business highlight clickable" onClick={() => setActiveModal('topclient')}>
                            <div className="stat-icon"><Users size={18} /></div>
                            <span className="stat-label">Top Cliente</span>
                            <span className="stat-value fs-v-small">{dashboardData.summary.topClient.name}</span>
                            <span className="stat-sub-value">${dashboardData.summary.topClient.value.toLocaleString()}</span>
                            <div className="card-hint">Click para ver detalle</div>
                        </div>
                    </div>

                    <div className="charts-main-grid business-charts">
                        <div className="chart-wrapper billing-chart main-line clickable" onClick={() => setActiveModal('billing')}>
                            <div className="chart-header">
                                <h3>Facturación vs. Producción (6 meses)</h3>
                                <div className="card-hint">Click para ver detalle mensual</div>
                            </div>
                            <div className="chart-container large">
                                <ResponsiveContainer>
                                    <AreaChart data={dashboardData.charts.billingByMonth}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Area yAxisId="left" type="monotone" dataKey="billing" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.1} strokeWidth={3} name="Facturación ($)" />
                                        <Area yAxisId="right" type="monotone" dataKey="sold" stroke="#ff6b00" fill="#ff6b00" fillOpacity={0.1} strokeWidth={2} name="M2 Vendidos" />
                                        <Area yAxisId="right" type="monotone" dataKey="printed" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} name="M2 Impresos" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="chart-wrapper distribution clickable" onClick={() => setActiveModal('prod_comparison')}>
                            <div className="chart-header">
                                <h3>Facturación por Material</h3>
                                <div className="card-hint">Ver desperdicio</div>
                            </div>
                            <div className="chart-container medium">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={dashboardData.charts.materialData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {dashboardData.charts.materialData.map((_item: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: number | undefined) => `$${(val || 0).toLocaleString()}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="chart-wrapper distribution clickable" onClick={() => setActiveModal('prod_time')}>
                            <div className="chart-header">
                                <h3 className="flex items-center gap-2"><FileText size={16} /> Servicios más Vendidos</h3>
                                <div className="card-hint">Ver tiempos</div>
                            </div>
                            <div className="chart-container medium">
                                <ResponsiveContainer>
                                    <BarChart data={dashboardData.charts.serviceData} layout="vertical" margin={{ left: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <div className="section-header-alt mt-8">
                <BarChart2 size={20} className="text-secondary" />
                <h2>Métricas de Producción</h2>
            </div>

            {isAdmin && dashboardData?.intelligence && (
                <section className="intelligence-section animate-fade-in">
                    <div className="intelligence-title-flex">
                        <Brain size={24} className="text-accent" />
                        <h2>Inteligencia Predictiva e Insights</h2>
                    </div>

                    <div className="intelligence-grid">
                        {/* 1. Efficiency Indicators */}
                        <div className="intelligence-card third">
                            <h4><Activity size={16} /> Eficiencia por Material</h4>
                            <div className="efficiency-mini-grid">
                                {dashboardData.intelligence.efficiencyByMaterial.slice(0, 4).map((eff: any) => (
                                    <div key={eff.name} className="efficiency-item">
                                        <span className="eff-label">{eff.name}</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`status-dot dot-${eff.status}`} />
                                            <span className="eff-value">{eff.efficiency}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Stock Forecasting */}
                        <div className="intelligence-card third">
                            <h4><TrendingUp size={16} /> Predicción de Quiebre</h4>
                            <div className="leakage-list">
                                {dashboardData.intelligence.stockForecast.slice(0, 5).map((m: any) => (
                                    <div key={m.material} className="leakage-item">
                                        <div className="leakage-info">
                                            <span className="leakage-ot">{m.material}</span>
                                            <span className="leakage-client">Consumo diario: {m.avgDaily} m²</span>
                                        </div>
                                        <span className={`prediction-tag ${m.status}`}>
                                            {m.daysRemaining > 30 ? '+30 días' : `${m.daysRemaining} días`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Reprint Leakage Detection */}
                        <div className="intelligence-card third">
                            <h4><RefreshCcw size={16} /> Fugas por Reimpresión</h4>
                            <div className="leakage-list">
                                {dashboardData.intelligence.leakage.length > 0 ? (
                                    dashboardData.intelligence.leakage.slice(0, 5).map((l: any) => (
                                        <div key={l.ot} className="leakage-item">
                                            <div className="leakage-info">
                                                <span className="leakage-ot">{l.ot}</span>
                                                <span className="leakage-client">{l.cliente}</span>
                                            </div>
                                            <span className="prediction-tag danger">
                                                +{l.overprintRatio}% m²
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-muted fs-v-small p-4 text-center">No se detectan fugas críticas</div>
                                )}
                            </div>
                        </div>

                        {/* 4. Client Profitability Ranking */}
                        <div className="intelligence-card full">
                            <h4><Target size={16} /> Ranking de Rentabilidad por Cliente (m² Real vs Facturado)</h4>
                            <div className="detail-table-wrapper">
                                <table className="detail-table">
                                    <thead>
                                        <tr>
                                            <th>Cliente</th>
                                            <th>Facturación Total</th>
                                            <th>Índice Rentabilidad ($/m²)</th>
                                            <th>Desempeño</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.intelligence.profitability.map((c: any, idx: number) => (
                                            <tr key={c.name}>
                                                <td><span className="leakage-ot">{idx + 1}. {c.name}</span></td>
                                                <td>${c.billing.toLocaleString()}</td>
                                                <td><span className="profit-index">${c.index}</span></td>
                                                <td>
                                                    <div className={`efficiency-badge badge-${c.index > 5000 ? 'success' : (c.index > 3000 ? 'warning' : 'danger')}`}>
                                                        {c.index > 5000 ? 'Premium' : (c.index > 3000 ? 'Standard' : 'Bajo Margen')}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <div className="charts-main-grid">
                <div className="chart-wrapper main-line">
                    <div className="chart-header">
                        <h3>Línea de Producción Diaria</h3>
                    </div>
                    <div className="chart-container large">
                        <ResponsiveContainer>
                            <AreaChart data={dailyData}>
                                <defs>
                                    <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--bg-sidebar)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text-primary)',
                                        fontSize: '12px'
                                    }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="m2"
                                    stroke="var(--accent)"
                                    fill="url(#colorArea)"
                                    strokeWidth={3}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-wrapper distribution">
                    <div className="chart-header">
                        <h3>Top Materiales</h3>
                    </div>
                    <div className="chart-container medium">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={materialData}
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {materialData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--bg-sidebar)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '12px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-wrapper ink-bars">
                    <div className="chart-header">
                        <h3>Uso de Tinta (ml)</h3>
                    </div>
                    <div className="chart-container medium">
                        <ResponsiveContainer>
                            <BarChart data={inkData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--bg-sidebar)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                    {inkData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-wrapper efficiency-bars">
                    <div className="chart-header">
                        <h3>Eficiencia por Color (cm³/m²)</h3>
                    </div>
                    <div className="chart-container medium">
                        <ResponsiveContainer>
                            <BarChart data={efficiencyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                    tickFormatter={(val) => val.toFixed(2)}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--bg-sidebar)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '14px',
                                        fontWeight: 600
                                    }}
                                    formatter={(val: any) => [parseFloat(val).toFixed(2) + ' cm³/m²', 'Ratio']}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                    {efficiencyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-wrapper count-bars">
                    <div className="chart-header">
                        <h3>Frecuencia de Trabajos</h3>
                    </div>
                    <div className="chart-container medium">
                        <ResponsiveContainer>
                            <BarChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--bg-sidebar)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="count" fill="var(--secondary)" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>


            </div>

            <ConciliationTable />

            {isAdmin && (
                <section className="efficiency-comparison-section mt-12 mb-8 p-6 bg-card rounded-lg border border-border">
                    <div className="section-header-alt mb-4 border-none">
                        <TrendingUp size={20} className="text-accent" />
                        <h2>Comparativa Productiva Sugerida (Vendido vs Impreso)</h2>
                    </div>
                    <div className="efficiency-grid">
                        <div className="efficiency-stats">
                            <table className="mini-detail-table">
                                <thead>
                                    <tr>
                                        <th>OT</th>
                                        <th>Cliente</th>
                                        <th>M2 Vendido</th>
                                        <th>M2 Impreso</th>
                                        <th>Eficiencia</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardData?.productionDetails?.comparison?.slice(0, 5).map((comp: any) => (
                                        <tr key={comp.ot}>
                                            <td>{comp.ot}</td>
                                            <td>{comp.cliente}</td>
                                            <td>{comp.soldM2} m²</td>
                                            <td>{comp.printedM2} m²</td>
                                            <td className={`efficiency-text-${comp.status}`}>{comp.efficiency}%</td>
                                            <td>
                                                <span className={`status-dot dot-${comp.status}`} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <button className="btn-secondary w-full mt-4" onClick={() => setActiveModal('prod_comparison')}>
                        Ver comparativa completa y filtros
                    </button>
                </section>
            )}

            <AnalyticsDetailModal
                type={activeModal}
                isOpen={!!activeModal}
                onClose={() => setActiveModal(null)}
                data={dashboardData}
                filters={filters}
                setFilters={setFilters}
            />
        </div>
    );
}

function AnalyticsDetailModal({ type, isOpen, onClose, data, filters, setFilters }: any) {
    if (!type || !data) return null;

    let title = "";
    let content = null;
    let exportData: any[] = [];

    // Helper to filter data based on UI state
    const applyFilters = (rawList: any[]) => {
        if (!Array.isArray(rawList)) return [];
        return rawList.filter(item => {
            const matchesSearch = !filters.search ||
                JSON.stringify(item).toLowerCase().includes(filters.search.toLowerCase());
            const matchesMachine = filters.machine === 'all' || item.maquina === filters.machine || item.machine === filters.machine;
            const matchesMaterial = filters.material === 'all' || item.material === filters.material;

            let matchesDate = true;
            if (filters.dateFrom && item.fecha) matchesDate = new Date(item.fecha) >= new Date(filters.dateFrom);
            if (filters.dateTo && item.fecha) matchesDate = matchesDate && new Date(item.fecha) <= new Date(filters.dateTo);

            return matchesSearch && matchesMachine && matchesMaterial && matchesDate;
        });
    };

    const handleExport = () => {
        exportToCSV(exportData, `luxius_analytics_${type}`);
    };

    const FilterHeader = () => (
        <div className="detail-filter-layer">
            <div className="search-box">
                <Search size={14} />
                <input
                    type="text"
                    placeholder="Buscar..."
                    aria-label="Buscar en tabla"
                    title="Buscar..."
                    value={filters.search}
                    onChange={e => setFilters({ ...filters, search: e.target.value })}
                />
            </div>
            <select
                value={filters.machine}
                onChange={e => setFilters({ ...filters, machine: e.target.value })}
                aria-label="Filtrar por máquina"
                title="Filtrar por máquina"
            >
                <option value="all">Todas las Máquinas</option>
                {data.productionDetails?.machineStats?.map((m: any) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                ))}
            </select>
            <div className="date-filters">
                <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                    aria-label="Fecha desde"
                    title="Fecha desde"
                />
                <input
                    type="date"
                    value={filters.dateTo}
                    onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                    aria-label="Fecha hasta"
                    title="Fecha hasta"
                />
            </div>
            <button className="btn-export" onClick={handleExport}>
                <Download size={14} /> Exportar CSV
            </button>
        </div>
    );

    if (type === 'billing') {
        title = "Detalle de Facturación Mensual";
        const filtered = applyFilters(data.details?.thisMonthOrders || []);
        exportData = filtered;
        content = (
            <div className="drilldown-view">
                <FilterHeader />
                <table className="detail-table">
                    <thead>
                        <tr>
                            <th>OT</th>
                            <th>Cliente</th>
                            <th>Fecha</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map((o: any) => (
                            <tr key={o.id}>
                                <td>{o.ot || `#${o.id}`}</td>
                                <td>{o.clienteNombre}</td>
                                <td>{new Date(o.fecha).toLocaleDateString()}</td>
                                <td style={{ textAlign: 'right' }}>${o.total?.toLocaleString() || '0'}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="text-center p-4">No se encontraron órdenes este mes.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    } else if (type === 'm2sold') {
        title = "Detalle de m² Vendidos (Este mes)";
        const filtered = applyFilters(data.details?.thisMonthOrders || []);
        exportData = filtered;
        content = (
            <div className="drilldown-view">
                <FilterHeader />
                <table className="detail-table">
                    <thead>
                        <tr>
                            <th>OT</th>
                            <th>Cliente</th>
                            <th>Material</th>
                            <th>Fecha</th>
                            <th style={{ textAlign: 'right' }}>Vendido (m²)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map((o: any) => (
                            <tr key={o.id}>
                                <td>{o.ot || `#${o.id}`}</td>
                                <td>{o.clienteNombre}</td>
                                <td>{o.material}</td>
                                <td>{new Date(o.fecha).toLocaleDateString()}</td>
                                <td style={{ textAlign: 'right' }}>{o.m2Sold?.toFixed(2) || '0.00'}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="text-center p-4">No hay datos de venta registrados.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    } else if (type === 'prod_m2' || type === 'm2printed') {
        title = "Detalle: m² Impresos Totales";
        const filtered = applyFilters(data.productionDetails?.m2Details || []);
        exportData = filtered;
        content = (
            <div className="drilldown-view">
                <FilterHeader />
                <table className="detail-table">
                    <thead>
                        <tr>
                            <th>OT</th>
                            <th>Cliente</th>
                            <th>Material</th>
                            <th>Máquina</th>
                            <th>Fecha</th>
                            <th style={{ textAlign: 'right' }}>m²</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map((log: any, i: number) => (
                            <tr key={i}>
                                <td>{log.ot}</td>
                                <td>{log.cliente}</td>
                                <td>{log.material}</td>
                                <td>{log.maquina}</td>
                                <td>{new Date(log.fecha).toLocaleDateString()} {new Date(log.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td style={{ textAlign: 'right' }}>{log.m2?.toFixed(2) || '0.00'}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={6} className="text-center p-4">Sin registros de impresión este mes.</td></tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5}>Total acumulado</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{filtered.reduce((sum, l) => sum + l.m2, 0).toFixed(2)} m²</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    } else if (type === 'prod_time' || type === 'prod_machine') {
        title = type === 'prod_time' ? "Análisis de Tiempos de Impresión" : "Ranking de Máquinas";
        const filtered = applyFilters(data.productionDetails?.m2Details || []);
        exportData = filtered;
        content = (
            <div className="drilldown-view">
                <FilterHeader />
                <div className="summary-boxes-inline">
                    <div className="mini-stat">Tiempo Promedio / m²: <strong>{((data.productionDetails?.machineStats || []).reduce((acc: any, m: any) => acc + (m.efficiency || 0), 0) / (data.productionDetails?.machineStats?.length || 1)).toFixed(1)} min</strong></div>
                </div>
                <table className="detail-table">
                    <thead>
                        <tr>
                            <th>Máquina</th>
                            <th>Total Trabajos</th>
                            <th>m² Producidos</th>
                            <th>Tiempo Total</th>
                            <th style={{ textAlign: 'right' }}>Ratio (min/m²)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.productionDetails?.machineStats || []).map((m: any) => (
                            <tr key={m.name}>
                                <td><strong>{m.name}</strong></td>
                                <td>{m.jobsCount}</td>
                                <td>{m.m2} m²</td>
                                <td>{m.hours} horas</td>
                                <td style={{ textAlign: 'right' }}>{m.efficiency.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    } else if (type === 'prod_reprints') {
        title = "Reimpresiones Detectadas (Auditoría)";
        const filtered = applyFilters(data.productionDetails?.reprints || []);
        exportData = filtered;
        content = (
            <div className="drilldown-view">
                <FilterHeader />
                <table className="detail-table">
                    <thead>
                        <tr>
                            <th>OT</th>
                            <th>Cliente</th>
                            <th>Material</th>
                            <th>Vendido</th>
                            <th>Impreso</th>
                            <th>Diferencia</th>
                            <th style={{ textAlign: 'right' }}>Eventos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map((r: any) => (
                            <tr key={r.ot}>
                                <td>{r.ot}</td>
                                <td>{r.cliente}</td>
                                <td>{r.material}</td>
                                <td>{r.soldM2} m²</td>
                                <td className="text-danger">{r.printedM2} m²</td>
                                <td style={{ fontWeight: 600 }}>{r.diff} m²</td>
                                <td style={{ textAlign: 'right' }}>{r.events}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={7} className="text-center p-4">No se detectaron reimpresiones críticas.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    } else if (type === 'stock') {
        title = "Alertas de Stock Crítico (Materiales)";
        // In this case we don't use applyFilters for the table but for the export
        const materials = data.summary?.stockWarningsList || [];
        exportData = materials;
        content = (
            <div className="drilldown-view">
                <table className="detail-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Material</th>
                            <th>Stock Actual</th>
                            <th>Stock Mínimo</th>
                            <th>Diferencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materials.map((m: any) => (
                            <tr key={m.codigo}>
                                <td>{m.codigo}</td>
                                <td>{m.descripcion}</td>
                                <td className="text-danger">{m.stockActual}</td>
                                <td>{m.stockMinimo}</td>
                                <td>{(m.stockActual - m.stockMinimo).toFixed(2)}</td>
                            </tr>
                        ))}
                        {materials.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>No hay alertas de stock actuales.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    } else if (type === 'prod_comparison') {
        title = "Eficiencia Vendido vs Impreso";
        const filtered = applyFilters(data.productionDetails?.comparison || []);
        exportData = filtered;
        content = (
            <div className="drilldown-view">
                <FilterHeader />
                <table className="detail-table">
                    <thead>
                        <tr>
                            <th>OT</th>
                            <th>Cliente</th>
                            <th>Material</th>
                            <th>Vendido</th>
                            <th>Impreso</th>
                            <th style={{ textAlign: 'right' }}>Eficiencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((c: any) => (
                            <tr key={c.ot}>
                                <td>{c.ot}</td>
                                <td>{c.cliente}</td>
                                <td>{c.material}</td>
                                <td>{c.soldM2} m²</td>
                                <td>{c.printedM2} m²</td>
                                <td style={{ textAlign: 'right' }}>
                                    <span className={`efficiency-badge badge-${c.status}`}>
                                        {c.efficiency}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    } else if (type === 'topclient') {
        const clientName = data.summary?.topClient?.name;
        title = `Desglose: ${clientName || 'Cliente'}`;
        const rawOrders = data.details?.thisMonthOrders || [];
        const filtered = rawOrders.filter((o: any) => o.clienteNombre === clientName);
        exportData = filtered;
        content = (
            <div className="drilldown-view">
                <table className="detail-table">
                    <thead>
                        <tr>
                            <th>OT</th>
                            <th>Fecha</th>
                            <th>Material</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map((o: any) => (
                            <tr key={o.id}>
                                <td>{o.ot || `#${o.id}`}</td>
                                <td>{new Date(o.fecha).toLocaleDateString()}</td>
                                <td>{o.material}</td>
                                <td style={{ textAlign: 'right' }}>${o.total?.toLocaleString() || '0'}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="text-center p-4">No se encontraron pedidos específicos para este cliente.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
            <div className="analytics-detail-content">
                {content}
            </div>
        </Modal>
    );
}
