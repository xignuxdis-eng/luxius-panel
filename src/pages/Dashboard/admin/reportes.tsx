import { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, Users, ArrowUpRight, ArrowDownRight, Calendar, Filter } from 'lucide-react';

export default function ReportesPage() {
    const [timeframe, setTimeframe] = useState('Mensual');
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

    const categories = [
        { name: 'Vinilos / Calcos', value: 75, color: 'bg-indigo-500', amount: '$1.2M' },
        { name: 'Gigantografías', value: 60, color: 'bg-blue-500', amount: '$850k' },
        { name: 'Corpóreos', value: 45, color: 'bg-purple-500', amount: '$420k' },
        { name: 'Roll-ups', value: 30, color: 'bg-emerald-500', amount: '$210k' }
    ];

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Centro de Reportes</h1>
                        <p className="text-gray-500 mt-1 text-sm font-medium">Análisis detallado de rendimiento y operaciones</p>
                    </div>

                    <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                        {['Diario', 'Semanal', 'Mensual'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTimeframe(t)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Ventas Mensuales', val: '$4,250,000', icon: DollarSign, trend: '+12.5%', type: 'up', bg: 'bg-green-50', color: 'text-green-600' },
                    { label: 'Producción (m²)', val: '1,840 m²', icon: Package, trend: '+8.2%', type: 'up', bg: 'bg-blue-50', color: 'text-blue-600' },
                    { label: 'Nuevos Clientes', val: '42 Clientes', icon: Users, trend: '-2.1%', type: 'down', bg: 'bg-purple-50', color: 'text-purple-600' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm group hover:border-indigo-100 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 ${stat.bg} rounded-2xl group-hover:scale-110 transition-transform`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div className={`flex items-center ${stat.type === 'up' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} text-[10px] font-black px-2 py-1 rounded-lg`}>
                                {stat.type === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                {stat.trend}
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
                        {categories.map((item) => (
                            <div
                                key={item.name}
                                className="space-y-2 cursor-pointer"
                                onMouseEnter={() => setHoveredCategory(item.name)}
                                onMouseLeave={() => setHoveredCategory(null)}
                            >
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                    <span className={hoveredCategory === item.name ? 'text-indigo-600' : 'text-gray-500'}>{item.name}</span>
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
                        ))}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                            Eficiencia de Taller
                        </h2>
                        <button className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                            <Filter className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-100 rounded-3xl group hover:border-indigo-100 transition-all cursor-pointer">
                        <div className="text-center group-hover:scale-105 transition-transform duration-500">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-50">
                                <BarChart3 className="w-8 h-8 text-gray-200 group-hover:text-indigo-400 transition-colors" />
                            </div>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Generar Analítica Avanzada</p>
                            <span className="text-[9px] text-indigo-500 font-bold uppercase mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">Haz clic para procesar datos</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
