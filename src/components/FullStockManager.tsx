import React, { useState, useEffect, useMemo } from 'react';
import { Download, Package, TrendingUp, BarChart3, AlertTriangle, Loader2, Plus, Minus, Search, Trash2, Edit } from 'lucide-react';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; // DISABLED
// Adjusted import path for standard utils folder structure
import { exportToCSV } from '../utils/csv';

// Interfaces
interface StockItem {
    id: number;
    nombre: string;
    categoria: string;
    stock: number;
    stock_minimo: number;
    unidad: string;
    precio_por_m2: number;
    valor_total: number;
    status: string;
    activo: boolean;
}

interface StockSummary {
    total_materials: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_value: number;
}

const StockManager: React.FC = () => {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [summary, setSummary] = useState<StockSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMaterial, setSelectedMaterial] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Form and Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        categoria: 'General',
        stock: 0,
        stock_minimo: 10,
        unidad: 'm²',
        precio_por_m2: 0
    });

    const itemsPerPage = 10;
    // Base URL for API - change if needed or use relative if proxy configured
    const API_BASE = '/api';

    // Fetch data
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Parallel fetch
            const [reportRes, summaryRes] = await Promise.all([
                fetch(`${API_BASE}/stock/report`),
                fetch(`${API_BASE}/stock/summary`)
            ]);

            if (!reportRes.ok) throw new Error('Error al cargar reporte');
            if (!summaryRes.ok) throw new Error('Error al cargar resumen');

            const reportData = await reportRes.json();
            const summaryData = await summaryRes.json();

            setStockItems(Array.isArray(reportData.report) ? reportData.report : []);
            setSummary(summaryData);

        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handlers
    const handleQuickStock = async (id: number, current: number, change: number) => {
        const newStock = Math.max(0, current + change);
        try {
            const res = await fetch(`${API_BASE}/materials/${id}/stock`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock: newStock })
            });
            if (res.ok) fetchData();
        } catch (e) {
            alert("Error actualizando stock");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar material?')) return;
        try {
            const res = await fetch(`${API_BASE}/materials/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (e) {
            alert("Error eliminando");
        }
    };

    const openModal = (item?: StockItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                nombre: item.nombre,
                categoria: item.categoria,
                stock: item.stock,
                stock_minimo: item.stock_minimo,
                unidad: item.unidad,
                precio_por_m2: item.precio_por_m2
            });
        } else {
            setEditingItem(null);
            setFormData({
                nombre: '',
                categoria: 'General',
                stock: 0,
                stock_minimo: 10,
                unidad: 'm²',
                precio_por_m2: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingItem
                ? `${API_BASE}/materials/${editingItem.id}`
                : `${API_BASE}/materials`;

            const method = editingItem ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchData();
            } else {
                alert("Error al guardar");
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Computations
    const filteredStock = useMemo(() => {
        return stockItems.filter(item =>
            !selectedMaterial || (item.nombre && item.nombre.toLowerCase().includes(selectedMaterial.toLowerCase()))
        );
    }, [stockItems, selectedMaterial]);

    const paginatedStock = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredStock.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredStock, currentPage]);

    const totalStockPages = Math.ceil(filteredStock.length / itemsPerPage) || 1;

    // Chart Data Removed


    if (loading) return <div className="p-8 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" /> Cargando...</div>;
    if (error) return <div className="p-8 text-red-500">Error: {error} <button onClick={fetchData} className="underline ml-2">Reintentar</button></div>;

    return (
        <div className="space-y-6">
            {/* Header + Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-fuchsia-400" />
                    <input
                        type="text"
                        placeholder="Buscar material..."
                        className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-fuchsia-500 outline-none border-gray-200"
                        value={selectedMaterial}
                        onChange={(e) => setSelectedMaterial(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-lg shadow-fuchsia-200"
                >
                    <Plus className="w-4 h-4" /> Nuevo Material
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-t-4 border-t-cyan-500">
                    <div className="text-gray-500 text-sm font-medium">Total Materiales</div>
                    <div className="text-2xl font-bold flex items-center gap-2">
                        <Package className="text-cyan-500" /> {summary?.total_materials}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-t-4 border-t-rose-500">
                    <div className="text-gray-500 text-sm font-medium">Stock Bajo</div>
                    <div className="text-2xl font-bold flex items-center gap-2 text-rose-600">
                        <AlertTriangle /> {summary?.low_stock_count}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-t-4 border-t-amber-500">
                    <div className="text-gray-500 text-sm font-medium">Sin Stock</div>
                    <div className="text-2xl font-bold flex items-center gap-2 text-amber-600">
                        <BarChart3 /> {summary?.out_of_stock_count}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-t-4 border-t-emerald-500">
                    <div className="text-gray-500 text-sm font-medium">Valor Inventario</div>
                    <div className="text-2xl font-bold flex items-center gap-2 text-emerald-600">
                        <TrendingUp /> ${summary?.total_value.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6">

                {/* Table Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="p-4">Material</th>
                                    <th className="p-4">Categoría</th>
                                    <th className="p-4 text-center">Stock</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedStock.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{item.nombre}</div>
                                            <div className="text-xs text-gray-500">{item.unidad} - ${item.precio_por_m2}</div>
                                        </td>
                                        <td className="p-4 text-gray-500">{item.categoria}</td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleQuickStock(item.id, item.stock, -1)} className="p-1 hover:bg-rose-100 text-gray-400 hover:text-rose-500 rounded"><Minus className="w-3 h-3" /></button>
                                                <span className={`font-bold w-12 text-center ${item.stock <= item.stock_minimo ? 'text-rose-600 bg-rose-50 rounded px-1' : 'text-slate-700'}`}>{item.stock}</span>
                                                <button onClick={() => handleQuickStock(item.id, item.stock, 1)} className="p-1 hover:bg-emerald-100 text-gray-400 hover:text-emerald-500 rounded"><Plus className="w-3 h-3" /></button>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openModal(item)} className="p-2 text-cyan-600 hover:bg-cyan-50 rounded"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Simple Pagination */}
                    <div className="p-4 border-t flex justify-between items-center text-xs text-gray-500">
                        <span>Página {currentPage} de {totalStockPages}</span>
                        <div className="flex gap-2">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">Anterior</button>
                            <button disabled={currentPage === totalStockPages} onClick={() => setCurrentPage(c => c + 1)} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">Siguiente</button>
                        </div>
                    </div>
                </div>

                {/* Chart Section Removed */}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">{editingItem ? 'Editar Material' : 'Nuevo Material'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input className="w-full border rounded-lg px-3 py-2" required
                                    value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                    <input className="w-full border rounded-lg px-3 py-2" list="cats"
                                        value={formData.categoria} onChange={e => setFormData({ ...formData, categoria: e.target.value })} />
                                    <datalist id="cats"><option value="Lonas" /><option value="Vinilos" /><option value="Rigidos" /></datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                                    <select className="w-full border rounded-lg px-3 py-2"
                                        value={formData.unidad} onChange={e => setFormData({ ...formData, unidad: e.target.value })}>
                                        <option value="m²">m²</option><option value="ml">ml</option><option value="unid">unid</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                                    <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2"
                                        value={formData.stock} onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mínimo</label>
                                    <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2"
                                        value={formData.stock_minimo} onChange={e => setFormData({ ...formData, stock_minimo: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                                <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2"
                                    value={formData.precio_por_m2} onChange={e => setFormData({ ...formData, precio_por_m2: parseFloat(e.target.value) })} />
                            </div>
                            <div className="pt-4 flex gap-3 justify-end">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 shadow-lg shadow-fuchsia-200">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockManager;
