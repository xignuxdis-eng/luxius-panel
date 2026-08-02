import { useEffect, useState } from 'react';
import { Calculator, Plus, Eye, Trash2, DollarSign, X } from 'lucide-react';

interface Quote {
    id: number;
    client_name: string;
    descripcion: string;
    total: number;
    status: string;
    created_at: string;
    items?: any[];
}

export default function PresupuestosPage() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

    useEffect(() => {
        fetchQuotes();
        fetchStats();
    }, []);

    const fetchQuotes = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/admin/quotes');
            const data = await response.json();
            if (data.success) {
                setQuotes(data.data);
            }
        } catch (error) {
            console.error('Error fetching quotes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/admin/quotes/stats');
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const updateStatus = async (id: number, newStatus: string) => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/quotes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                fetchQuotes();
                fetchStats();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const deleteQuote = async (id: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este presupuesto? Esta acción no se puede deshacer.')) return;

        try {
            const response = await fetch(`http://localhost:5000/api/admin/quotes/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setQuotes(prev => prev.filter(q => q.id !== id));
                fetchStats();
            }
        } catch (error) {
            console.error('Error deleting quote:', error);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'borrador': 'bg-gray-100 text-gray-800',
            'enviado': 'bg-blue-100 text-blue-800',
            'aprobado': 'bg-green-100 text-green-800',
            'rechazado': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">Cargando presupuestos...</div>;
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Calculator className="w-7 h-7 text-purple-600" />
                            Presupuestos
                        </h1>
                        <p className="text-gray-500 mt-1">Gestión de cotizaciones y propuestas comerciales</p>
                    </div>
                    <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg">
                        <Plus className="w-5 h-5" />
                        Nuevo Presupuesto
                    </button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Enviados</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{stats.by_status.enviado || 0}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <p className="text-[11px] font-bold text-green-400 uppercase tracking-wider">Aprobados</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{stats.by_status.aprobado || 0}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Monto Emitido</p>
                        <p className="text-2xl font-bold text-purple-600 mt-1">
                            ${(stats.total_amount || 0).toLocaleString('es-AR')}
                        </p>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">ID</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Cliente</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Descripción</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Total</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Estado</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {quotes.map((quote) => (
                                <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-gray-400">#{quote.id}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{quote.client_name || 'Particular'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{quote.descripcion}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">${quote.total.toLocaleString('es-AR')}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={quote.status}
                                            onChange={(e) => updateStatus(quote.id, e.target.value)}
                                            className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase transition-colors outline-none cursor-pointer ${getStatusColor(quote.status)}`}
                                        >
                                            <option value="borrador">Borrador</option>
                                            <option value="enviado">Enviado</option>
                                            <option value="aprobado">Aprobado</option>
                                            <option value="rechazado">Rechazado</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedQuote(quote)}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Ver Detalle"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteQuote(quote.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quote Detail Modal */}
            {selectedQuote && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Detalle de Presupuesto #{selectedQuote.id}</h3>
                                <p className="text-xs text-gray-500 font-medium uppercase mt-1">Cliente: {selectedQuote.client_name || 'Particular'}</p>
                            </div>
                            <button onClick={() => setSelectedQuote(null)} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-8 text-sm">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Descripción</p>
                                    <p className="text-gray-900 font-medium">{selectedQuote.descripcion || 'Sin descripción detallada.'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Fecha de Emisión</p>
                                    <p className="text-gray-900 font-medium">{new Date(selectedQuote.created_at).toLocaleString('es-AR')}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-indigo-600 font-bold uppercase text-[11px] tracking-wider">Total Cotizado</span>
                                    <span className="text-2xl font-black text-indigo-700 font-mono">${selectedQuote.total.toLocaleString('es-AR')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setSelectedQuote(null)}
                                className="px-6 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
