import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList, Search, Filter, Plus, Clock,
    CheckCircle, AlertCircle, PlayCircle, MoreVertical,
    FileText, Download, Eye, TrendingUp, Calendar
} from 'lucide-react';

interface WorkOrder {
    id: number;
    numero: string;
    cliente_id: number;
    cliente?: string;
    status: string;
    fecha_creacion: string;
    total?: number;
    items?: any[];
}

const statusColors = {
    'pendiente': 'bg-amber-100 text-amber-700 border-amber-200',
    'en_proceso': 'bg-blue-100 text-blue-700 border-blue-200',
    'completado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'entregado': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'cancelado': 'bg-rose-100 text-rose-700 border-rose-200'
};

const statusLabels = {
    'pendiente': 'Pendiente',
    'en_proceso': 'En Proceso',
    'completado': 'Completado',
    'entregado': 'Entregado',
    'cancelado': 'Cancelado'
};

export default function OrdenesPage() {
    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
    const [activeModal, setActiveModal] = useState<'details' | 'files' | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/orders', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            console.log('Orders response:', data); // Debug
            if (data.orders) {
                setOrders(data.orders);
            } else if (data.error) {
                console.error('Error from backend:', data.error);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: number, newStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/orders/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                fetchOrders(); // Refresh list
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pendiente').length,
        inProgress: orders.filter(o => o.status === 'en_proceso').length,
        done: orders.filter(o => o.status === 'completado' || o.status === 'entregado').length
    };

    const filteredOrders = orders.filter(order =>
        order.id.toString().includes(searchTerm) ||
        (order.cliente || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const downloadFile = async (file: any) => {
        if (file.enlace_externo && file.tipo_archivo === 'external_link') {
            window.open(file.enlace_externo, '_blank');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/orders/files/${file.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.nombre_original;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400 font-medium tracking-widest uppercase text-xs">Sincronizando Órdenes...</div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Premium Header */}
            <div className="relative overflow-hidden bg-white border border-gray-100 rounded-[40px] p-10 shadow-sm">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-50 rounded-xl">
                                <ClipboardList className="w-6 h-6 text-indigo-600" />
                            </div>
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Gestión de Producción</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Órdenes de Trabajo</h1>
                        <p className="text-gray-500 mt-2 font-medium text-sm">Monitoreo y control de flujo en tiempo real</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Actualizado</span>
                            <span className="text-[12px] font-bold text-gray-900">Hace unos segundos</span>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard/admin/upload')}
                            className="group flex items-center gap-3 bg-gray-900 hover:bg-indigo-600 text-white px-8 py-4 rounded-[20px] transition-all duration-300 shadow-xl shadow-gray-200 hover:shadow-indigo-200 active:scale-95"
                            title="Crear Nueva Orden"
                        >
                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                            <span className="font-bold text-sm uppercase tracking-widest">Nueva Orden</span>
                        </button>
                    </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-30"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-50 rounded-full blur-3xl -ml-24 -mb-24 opacity-20"></div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Proyectos', val: stats.total, icon: TrendingUp, color: 'text-gray-600', bg: 'bg-gray-50' },
                    { label: 'Pendientes', val: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'En Proceso', val: stats.inProgress, icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Finalizadas', val: stats.done, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-[24px] p-6 border border-gray-50 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-2xl font-black text-gray-900">{stat.val}</p>
                            </div>
                            <div className={`${stat.bg} p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table & Filters */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por ID u orden..."
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl outline-none text-sm font-medium transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all">
                            <Filter className="w-4 h-4" />
                            Filtros
                        </button>
                        <button className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all">
                            <Calendar className="w-4 h-4" />
                            Este Mes
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Orden</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Cliente</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Detalles</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Estado</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-20">
                                            <Search className="w-12 h-12" />
                                            <p className="font-bold uppercase tracking-widest text-xs">No se encontraron resultados</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50/30 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center font-bold text-indigo-600 text-xs shadow-sm">
                                                    #{order.id}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-900">Orden #{order.id}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {new Date(order.fecha_creacion).toLocaleDateString()} {new Date(order.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-900">{order.cliente || `Cliente #${order.cliente_id}`}</span>
                                                <span className="text-[10px] text-gray-500 font-medium">{order.items?.length || 0} ítems</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-700">
                                                        {(order.items && order.items[0]) ? (order.items[0].material_nombre || order.items[0].product_name || order.items[0].detalle) : 'Sin detalles'}
                                                    </span>
                                                    {order.total && (
                                                        <span className="text-[10px] text-gray-400">(${order.total})</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {order.items?.[0] && (
                                                        <>
                                                            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md border border-indigo-100 uppercase">
                                                                {order.items[0].ancho}x{order.items[0].alto} cm
                                                            </span>
                                                            {order.items[0].resolution && (
                                                                <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md border border-amber-100 uppercase">
                                                                    {order.items[0].resolution} DPI
                                                                </span>
                                                            )}
                                                            {order.items[0].color_mode && (
                                                                <span className="text-[9px] font-bold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md border border-orange-100 uppercase">
                                                                    {order.items[0].color_mode}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <select
                                                value={order.status}
                                                onChange={(e) => updateStatus(order.id, e.target.value)}
                                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border appearance-none outline-none cursor-pointer transition-all shadow-sm ${statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-600'}`}
                                                title="Cambiar Estado"
                                            >
                                                {Object.entries(statusLabels).map(([val, label]) => (
                                                    <option key={val} value={val} className="bg-white text-gray-900">{label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 transition-all">
                                                <button
                                                    onClick={() => { setSelectedOrder(order); setActiveModal('details'); }}
                                                    className="p-2.5 text-indigo-400/80 bg-indigo-50/50 hover:text-indigo-600 hover:bg-indigo-100/80 rounded-xl transition-all shadow-sm"
                                                    title="Ver Detalles"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedOrder(order); setActiveModal('files'); }}
                                                    className="p-2.5 text-emerald-400/80 bg-emerald-50/50 hover:text-emerald-600 hover:bg-emerald-100/80 rounded-xl transition-all shadow-sm"
                                                    title="Ver Archivos"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="p-2.5 text-gray-300 hover:text-indigo-600 hover:bg-gray-50 rounded-xl transition-all"
                                                    title="Más Opciones"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {activeModal === 'details' && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Detalles de Orden #{selectedOrder.id}</h2>
                                <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mt-1">{selectedOrder.cliente}</p>
                            </div>
                            <button
                                onClick={() => { setActiveModal(null); setSelectedOrder(null); }}
                                className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-gray-400 hover:text-gray-600"
                            >
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Ítems del Pedido</h3>
                                    <div className="space-y-4">
                                        {selectedOrder.items?.map((item: any, idx: number) => (
                                            <div key={idx} className="p-5 bg-gray-50 rounded-[24px] border border-gray-100/50">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900">{item.detalle}</p>
                                                        <p className="text-[10px] text-indigo-600 font-bold uppercase mt-0.5">{item.material_nombre || 'Material no especificado'}</p>
                                                    </div>
                                                    <span className="text-sm font-black text-gray-900 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                                                        ${item.total}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                                    <div className="bg-white p-2.5 rounded-2xl border border-gray-100">
                                                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Medidas</p>
                                                        <p className="text-xs font-bold text-gray-700">{item.ancho} x {item.alto} cm</p>
                                                    </div>
                                                    <div className="bg-white p-2.5 rounded-2xl border border-gray-100">
                                                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Copias</p>
                                                        <p className="text-xs font-bold text-gray-700">{item.copias} Un.</p>
                                                    </div>
                                                    <div className="bg-white p-2.5 rounded-2xl border border-gray-100">
                                                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Resolución</p>
                                                        <p className="text-xs font-bold text-gray-700">{item.resolution || '--'} DPI</p>
                                                    </div>
                                                    <div className="bg-white p-2.5 rounded-2xl border border-gray-100">
                                                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Color</p>
                                                        <p className="text-xs font-bold text-gray-700 uppercase">{item.color_mode || '--'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries((item.production_flags || {}) as Record<string, any>).map(([key, value]) => (
                                                        value ? (
                                                            <span key={key} className="text-[9px] font-black bg-indigo-600 text-white px-2 py-1 rounded-lg uppercase tracking-wider">
                                                                {key.replace(/_/g, ' ')}
                                                            </span>
                                                        ) : null
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {selectedOrder.total && (
                                    <div className="pt-6 border-t border-dashed border-gray-200 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inversión Total</span>
                                        <span className="text-3xl font-black text-gray-900">${selectedOrder.total}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeModal === 'files' && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Archivos y Enlaces</h2>
                                <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mt-1">Orden #{selectedOrder.id}</p>
                            </div>
                            <button
                                onClick={() => { setActiveModal(null); setSelectedOrder(null); }}
                                className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-gray-400 hover:text-gray-600"
                            >
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            <div className="space-y-4">
                                {(selectedOrder as any).files && (selectedOrder as any).files.length > 0 ? (
                                    (selectedOrder as any).files.map((file: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                    {file.tipo_archivo === 'external_link' ? <TrendingUp className="w-5 h-5 text-indigo-500" /> : <FileText className="w-5 h-5 text-indigo-500" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{file.nombre_original}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium">
                                                        {file.tipo_archivo === 'external_link' ? 'Enlace Externo' : `${(file.tamano / 1024 / 1024).toFixed(2)} MB`}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => downloadFile(file)}
                                                className="p-2 bg-white hover:bg-indigo-50 rounded-xl shadow-sm transition-all text-indigo-600"
                                                title="Descargar"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 opacity-30">
                                        <FileText className="w-12 h-12 mx-auto mb-2" />
                                        <p className="text-xs font-bold uppercase tracking-widest">No hay archivos adjuntos</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
