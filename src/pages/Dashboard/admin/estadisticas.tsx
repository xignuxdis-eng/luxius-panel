import { useState, useEffect } from 'react';
import { BarChart3, PieChart, Activity, Zap, ShieldCheck, Target, Layers, Info, RefreshCw } from 'lucide-react';
import { API_URL, getAuthHeaders } from '@data/db';

interface StatsData {
    totalOrders: number;
    ordersToday: number;
    ordersWeek: number;
    ordersMonth: number;
    completed: number;
    conversionRate: number;
    avgResponseHours: number;
    retentionRate: number;
    activeClients: number;
    totalClients: number;
    hourlyActivity: number[];
    machines: { id: number; name: string; type: string; online: boolean }[];
    revenueMonth: number;
}

export default function EstadisticasPage() {
    const [activeBar, setActiveBar] = useState<number | null>(null);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchStats = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/stats/advanced`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setStats(data);
        } catch (e: any) {
            setError(e.message || 'Error cargando estadísticas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats() }, []);

    const activityData = stats?.hourlyActivity || Array(24).fill(0);
    const machines = stats?.machines || [];

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Analítica Avanzada</h1>
                        <p className="text-gray-500 mt-1 text-sm font-medium">Inteligencia de negocio calculada desde datos reales</p>
                    </div>
                    <button
                        onClick={fetchStats}
                        disabled={loading}
                        className="p-3 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-all group"
                    >
                        <RefreshCw className={`w-5 h-5 text-indigo-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-600 text-sm font-medium">
                    ⚠ {error}
                </div>
            )}

            {/* Grid of Analytics Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Tiempo de Respuesta', value: stats ? `${stats.avgResponseHours}h` : '—', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                    { label: 'Tasa de Conversión', value: stats ? `${stats.conversionRate}%` : '—', icon: Target, color: 'text-green-500', bg: 'bg-green-50' },
                    { label: 'Retención de Clientes', value: stats ? `${stats.retentionRate}%` : '—', icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Órdenes del Mes', value: stats ? `${stats.ordersMonth}` : '—', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-50' }
                ].map((stat, i) => (
                    <div
                        key={i}
                        className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-100 transition-all text-left group"
                    >
                        <div className={`p-3 ${stat.bg} w-fit rounded-2xl mb-4 group-hover:scale-110 transition-transform`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-2xl font-extrabold text-gray-900 mt-1">{loading ? '...' : stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-500" />
                                Actividad de Usuarios (7 días)
                            </h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Órdenes por franja horaria</p>
                        </div>
                        <div className="flex gap-2 text-[10px] font-black uppercase text-gray-400">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span> Activo</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-100 rounded-full"></span> Idle</span>
                        </div>
                    </div>

                    {/* Real Bar Chart */}
                    <div className="flex items-end justify-between h-48 gap-1 md:gap-2">
                        {activityData.map((h: number, i: number) => (
                            <div
                                key={i}
                                className="flex-1 group relative transition-all duration-300"
                                onMouseEnter={() => setActiveBar(i)}
                                onMouseLeave={() => setActiveBar(null)}
                            >
                                <div
                                    className={`rounded-t-lg transition-all duration-500 w-full cursor-help ${activeBar === i ? 'bg-indigo-600 scale-x-125' : 'bg-gray-50 group-hover:bg-indigo-200'}`}
                                    style={{ height: `${Math.max(h, 2)}%` }}
                                >
                                    {activeBar === i && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-[9px] font-black px-3 py-1.5 rounded-lg shadow-xl z-10 flex flex-col items-center">
                                            <span>{h}%</span>
                                            <span className="text-[7px] text-gray-400 uppercase">{i}:00hs</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-t border-gray-50 pt-4">
                        <span>00hs</span>
                        <span>08hs</span>
                        <span>16hs</span>
                        <span>24hs</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center group cursor-pointer hover:border-indigo-100 transition-all">
                    <div className="relative mb-6 group-hover:scale-110 transition-transform duration-500">
                        <div className="w-32 h-32 rounded-full border-[12px] border-gray-50 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-indigo-50/20 group-hover:bg-indigo-50/40 transition-colors"></div>
                            <div className="relative z-10 text-center">
                                <p className="text-2xl font-black text-indigo-600">{loading ? '...' : `${stats?.conversionRate || 0}%`}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Eficiencia</p>
                            </div>
                        </div>
                        <svg className="absolute top-0 left-0 w-32 h-32 -rotate-90">
                            <circle
                                cx="64" cy="64" r="58"
                                fill="none" stroke="currentColor" strokeWidth="12"
                                className="text-indigo-100"
                                strokeDasharray="364.4" strokeDashoffset="0"
                            />
                            <circle
                                cx="64" cy="64" r="58"
                                fill="none" stroke="currentColor" strokeWidth="12"
                                className="text-indigo-500 transition-all duration-1000"
                                strokeDasharray="364.4" strokeDashoffset={364.4 * (1 - (stats?.conversionRate || 0) / 100)}
                            />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Monitor de Taller</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter mb-4">
                        {machines.length} Máquina{machines.length !== 1 ? 's' : ''} Registrada{machines.length !== 1 ? 's' : ''}
                    </p>
                    <div className="w-full space-y-2 mb-6">
                        {machines.length > 0 ? machines.slice(0, 4).map((m) => (
                            <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                                <span className="text-[10px] font-bold text-gray-500">{m.name}</span>
                                <span className={`w-2 h-2 ${m.online ? 'bg-green-500' : 'bg-red-400'} rounded-full`}></span>
                            </div>
                        )) : (
                            <div className="p-3 bg-gray-50 rounded-xl text-[10px] text-gray-400 font-medium">
                                Sin máquinas registradas
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
