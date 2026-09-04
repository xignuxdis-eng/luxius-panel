import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Package, ClipboardList, TrendingUp, DollarSign, Plus } from 'lucide-react';
import NotepadWidget from '../../../components/NotepadWidget';

interface DashboardMetrics {
    users: {
        active: number;
        total: number;
        by_role: Record<string, number>;
    };
    orders: {
        total: number;
        pending: number;
        in_progress: number;
        completed: number;
        blocked: number;
        recent_7_days: number;
    };
    inventory: {
        total_products: number;
        low_stock: number;
        out_of_stock: number;
        total_value: number;
    };
}

export default function PanelGeneral() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            const response = await fetch('/api/admin/dashboard/metrics');
            const data = await response.json();

            if (data.success) {
                setMetrics(data.data);
            } else {
                setError(data.error || 'Error al cargar métricas');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400 font-medium animate-pulse text-sm">Sincronizando datos...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50/50 border border-red-100 rounded-3xl p-6">
                <p className="text-red-600 text-[13px] font-bold">{error}</p>
                <p className="text-red-400 text-[11px] mt-1">Asegúrate de que el servidor Flask esté corriendo.</p>
            </div>
        );
    }

    if (!metrics) return null;

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Header Premium - Más sutil */}
            <div className="relative overflow-hidden bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Panel General</h1>
                        <p className="text-gray-500 mt-1 text-sm font-medium">Gestión integral de producción y activos</p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard/admin/upload')}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95"
                    >
                        <Plus size={20} />
                        Crear Pedido
                    </button>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Usuarios */}
                <button
                    onClick={() => navigate('/dashboard/admin/usuarios')}
                    className="bg-white rounded-[24px] shadow-sm p-6 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-300 group text-left"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Usuarios</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.users.active}</p>
                            <div className="flex items-center gap-1 mt-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] text-gray-500 font-bold uppercase">En línea</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                            <Users className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-transform duration-300 group-hover:scale-110" />
                        </div>
                    </div>
                </button>

                {/* Órdenes */}
                <button
                    onClick={() => navigate('/dashboard/admin/ordenes')}
                    className="bg-white rounded-[24px] shadow-sm p-6 border border-gray-100 hover:border-yellow-200 hover:shadow-md transition-all duration-300 group text-left"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pendientes</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.orders.pending}</p>
                            <span className="inline-block mt-2 px-2 py-0.5 bg-yellow-50 text-yellow-600 text-[9px] font-bold rounded-md uppercase tracking-tighter">En Cola</span>
                        </div>
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-yellow-50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                            <ClipboardList className="w-6 h-6 text-gray-400 group-hover:text-yellow-600 transition-transform duration-300 group-hover:scale-110" />
                        </div>
                    </div>
                </button>

                {/* Productos / Stock */}
                <button
                    onClick={() => navigate('/dashboard/admin/stock')}
                    className="bg-white rounded-[24px] shadow-sm p-6 border border-gray-100 hover:border-green-200 hover:shadow-md transition-all duration-300 group text-left"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Materiales</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.inventory.total_products}</p>
                            {metrics.inventory.low_stock > 0 ? (
                                <span className="inline-block mt-2 px-2 py-0.5 bg-red-50 text-red-600 text-[9px] font-bold rounded-md uppercase tracking-tighter">Stock Bajo</span>
                            ) : (
                                <span className="inline-block mt-2 px-2 py-0.5 bg-green-50 text-green-600 text-[9px] font-bold rounded-md uppercase tracking-tighter">Saludable</span>
                            )}
                        </div>
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-green-50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                            <Package className="w-6 h-6 text-gray-400 group-hover:text-green-600 transition-transform duration-300 group-hover:scale-110" />
                        </div>
                    </div>
                </button>

                {/* Finanzas / Presupuestos */}
                <button
                    onClick={() => navigate('/dashboard/admin/presupuestos')}
                    className="bg-white rounded-[24px] shadow-sm p-6 border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-300 group text-left"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Activos</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                ${(metrics.inventory.total_value / 1000).toFixed(0)}k
                            </p>
                            <span className="inline-block mt-2 px-2 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-bold rounded-md uppercase tracking-tighter">Patrimonio</span>
                        </div>
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-purple-50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                            <DollarSign className="w-6 h-6 text-gray-400 group-hover:text-purple-600 transition-transform duration-300 group-hover:scale-110" />
                        </div>
                    </div>
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white rounded-[32px] shadow-sm p-8 border border-gray-100 relative overflow-hidden">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Estado de la Organización</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                            {Object.entries(metrics.users.by_role).map(([role, count]) => (
                                <div key={role} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white hover:border-indigo-100 transition-all group">
                                    <p className="text-xl font-bold text-gray-900">{count}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{role}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] shadow-sm p-8 border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Flujo de Producción</h2>
                            <TrendingUp className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Progreso Global</span>
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase italic">{metrics.orders.total} Solicitudes</span>
                            </div>
                            <div className="h-2 w-full bg-gray-50 rounded-full flex overflow-hidden">
                                <div className="bg-orange-200 h-full" style={{ width: `${(metrics.orders.pending / metrics.orders.total || 0) * 100}%` }}></div>
                                <div className="bg-indigo-200 h-full" style={{ width: `${(metrics.orders.in_progress / metrics.orders.total || 0) * 100}%` }}></div>
                                <div className="bg-emerald-200 h-full" style={{ width: `${(metrics.orders.completed / metrics.orders.total || 0) * 100}%` }}></div>
                                <div className="bg-rose-200 h-full" style={{ width: `${(metrics.orders.blocked / metrics.orders.total || 0) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="scale-95 origin-top">
                        <NotepadWidget />
                    </div>
                </div>
            </div>
        </div>
    );
}
