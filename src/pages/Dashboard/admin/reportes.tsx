import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, Users, ArrowUpRight, ArrowDownRight, Calendar, Filter, RefreshCw } from 'lucide-react';
import { API_URL, getAuthHeaders } from '@data/db';

interface CategoryData {
    name: string;
    value: number;
    color: string;
    amount: string;
    count: number;
    thisMonth: number;
}

interface ReportesData {
    categories: CategoryData[];
    monthly: { month: string; revenue: number; orders: number }[];
    topClients: { name: string; total: number; count: number }[];
}

export default function ReportesPage() {
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const [data, setData] = useState<ReportesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/stats/reportes`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setData(json);
        } catch (e: any) {
            setError(e.message || 'Error cargando reportes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData() }, []);

    const categories = data?.categories || [];
    const monthly = data?.monthly || [];
    const topClients = data?.topClients || [];

    // Compute summary stats from real data
    const totalRevenue = categories.reduce((sum, c) => sum + parseFloat(c.amount?.replace(/[$,]/g, '') || '0'), 0);
    const totalOrders = categories.reduce((sum, c) => sum + c.count, 0);
    const totalThisMonth = categories.reduce((sum, c) => sum + c.thisMonth, 0);

    const formatCurrency = (n: number) => {
        if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
        return `$${n.toFixed(0)}`;
    };

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Centro de Reportes</h1>
                        <p className="text-gray-500 mt-1 text-sm font-medium">Análisis detallado de rendimiento y operaciones</p>
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-3 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-all group w-fit"
                    >
                        <RefreshCw className={`w-5 h-5 text-indigo-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-600 text-sm font-medium">
                    ⚠ {error}
                </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Facturación Total', val: loading ? '...' : formatCurrency(totalRevenue), icon: DollarSign, bg: 'bg-green-50', color: 'text-green-600' },
                    { label: 'Total Órdenes', val: loading ? '...' : `${totalOrders}`, icon: Package, bg: 'bg-blue-50', color: 'text-blue-600' },
                    { label: 'Top Clientes', val: loading ? '...' : `${topClients.length}`, icon: Users, bg: 'bg-purple-50', color: 'text-purple-600' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm group hover:border-indigo-100 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 ${stat.bg} rounded-2xl group-hover:scale-110 transition-transform`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                        </div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-2xl font-extrabold text-gray-900 mt-1">{stat.val}</p>
                    </div>
                ))}
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        Rendimiento por Categoría
                    </h2>
                    <div className="space-y-6">
                        {categories.length > 0 ? categories.map((item) => (
                            <div
                                key={item.name}
                                className="space-y-2 cursor-pointer"
                                onMouseEnter={() => setHoveredCategory(item.name)}
                                onMouseLeave={() => setHoveredCategory(null)}
                            >
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                    <span className={hoveredCategory === item.name ? 'text-indigo-600' : 'text-gray-500'}>
                                        {item.name}
                                        <span className="text-gray-400 ml-1 normal-case">({item.count} órdenes)</span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {hoveredCategory === item.name && <span className="text-indigo-600 font-black animate-in fade-in slide-in-from-right-2">{item.amount}</span>}
                                        <span className="text-gray-900">{item.value}%</span>
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                    <div
                                        className={`${item.color} h-full rounded-full transition-all duration-1000 ease-out`}
                                        style={{ width: `${item.value}%`, opacity: hoveredCategory && hoveredCategory !== item.name ? 0.3 : 1 }}
                                    ></div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-gray-400 text-sm py-12">
                                {loading ? 'Cargando datos...' : 'Sin datos de categorías'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        Top Clientes por Facturación
                    </h2>
                    <div className="space-y-3">
                        {topClients.length > 0 ? topClients.slice(0, 8).map((client, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                                        {i + 1}
                                    </span>
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-700">{client.name || 'Cliente General'}</p>
                                        <p className="text-[9px] text-gray-400">{client.count} órdenes</p>
                                    </div>
                                </div>
                                <span className="text-[11px] font-black text-gray-900">{formatCurrency(client.total)}</span>
                            </div>
                        )) : (
                            <div className="text-center text-gray-400 text-sm py-12">
                                {loading ? 'Cargando datos...' : 'Sin datos de clientes'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
