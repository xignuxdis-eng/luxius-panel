import { useState, useEffect } from 'react';
import { Tag, Plus, Search, Edit2, Trash2, DollarSign, Percent, Info, Save, X, Layers, AlertCircle } from 'lucide-react';
import { apiService, Material } from '../../../services/api';

export default function PreciosPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [exchangeRate, setExchangeRate] = useState(1);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [materialsData, rateData] = await Promise.all([
                apiService.getMaterialsPricing(),
                apiService.getExchangeRate()
            ]);
            setMaterials(materialsData);
            setExchangeRate(rateData.tasa);
            setError(null);
        } catch (err: any) {
            console.error("Error fetching data:", err);
            setError("Error al cargar el tarifario de precios");
        } finally {
            setLoading(false);
        }
    };

    const calculateMargin = (base: number, sale: number) => {
        if (!base || base === 0) return 0;
        return ((sale - base) / base) * 100;
    };

    const handleSave = async () => {
        if (!editingMaterial) return;

        try {
            await apiService.updateMaterialPricing(editingMaterial.id, {
                precio_interno: editingMaterial.precio_interno,
                precio_por_m2: editingMaterial.precio_por_m2,
                precio_por_unidad: editingMaterial.precio_por_unidad,
                moneda: editingMaterial.moneda
            });

            setMaterials(prev => prev.map(m => m.id === editingMaterial.id ? editingMaterial : m));
            setEditingMaterial(null);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        } catch (err: any) {
            console.error("Error updating price:", err);
            alert("Error al actualizar el precio");
        }
    };

    const filteredMaterials = materials.filter(m =>
        m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p className="font-bold">{error}</p>
            <button
                onClick={fetchData}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
                Reintentar
            </button>
        </div>
    );

    return (
        <div className="space-y-8 pb-20 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white border border-gray-100 rounded-[40px] p-10 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 rounded-xl">
                                <Tag className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Gestión Comercial</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Tarifario de Precios</h1>
                        <p className="text-gray-500 mt-2 font-medium text-sm">Ajuste de costos base y márgenes de ganancia • USD: ${exchangeRate.toLocaleString()}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <button className="flex items-center gap-3 bg-gray-900 hover:bg-blue-600 text-white px-8 py-4 rounded-[20px] transition-all duration-300 shadow-xl shadow-gray-200">
                            <Plus className="w-5 h-5" />
                            <span className="font-bold text-sm uppercase tracking-widest">Nuevo Material</span>
                        </button>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Precios en {exchangeRate > 1 ? 'Pesos Arg (ARS)' : 'Dólares (USD)'}</p>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-30"></div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/30">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar material o categoría..."
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 focus:border-blue-200 rounded-2xl outline-none text-sm font-medium transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Material / Insumo</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Costo Base</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Margen (%)</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio Venta (m²)</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredMaterials.map((item) => {
                                const margin = calculateMargin(item.precio_interno, item.precio_por_m2);
                                return (
                                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                                                    <Layers className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900">{item.nombre}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">Unidad: {item.unidad}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase">{item.categoria}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-xs font-bold text-gray-500">
                                                    {item.moneda === 'USD' ? 'USD ' : '$ '}
                                                    {(item.precio_interno || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={`flex items-center gap-1 font-bold ${margin > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                                <Percent className="w-3 h-3" />
                                                <span className="text-sm">{margin.toFixed(1)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-1 text-gray-900 font-extrabold text-sm">
                                                <DollarSign className="w-3 h-3 text-green-500" />
                                                {(item.precio_por_m2 || 0).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditingMaterial(item)}
                                                    className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all text-gray-400 hover:text-blue-600"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all text-gray-400 hover:text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingMaterial && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Actualizar Precios</h2>
                            <button onClick={() => setEditingMaterial(null)} className="p-2 hover:bg-gray-50 rounded-xl">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-4 text-xs font-medium text-gray-500">
                                <Info className="w-4 h-4" />
                                Estás modificando el tarifario de {editingMaterial.nombre}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Moneda de Costo</label>
                                    <select
                                        className="w-full px-4 py-4 bg-gray-50 rounded-2xl outline-none text-sm font-bold border-transparent focus:bg-white focus:border-blue-100 placeholder-gray-300 transition-all cursor-pointer"
                                        value={editingMaterial.moneda}
                                        onChange={e => setEditingMaterial({ ...editingMaterial, moneda: e.target.value as 'ARS' | 'USD' })}
                                    >
                                        <option value="ARS">Pesos Argentinos (ARS)</option>
                                        <option value="USD">Dólares (USD)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Costo Base ({editingMaterial.unidad})</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            type="number"
                                            className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-100 rounded-2xl outline-none text-lg font-bold"
                                            value={editingMaterial.precio_interno}
                                            onChange={e => setEditingMaterial({ ...editingMaterial, precio_interno: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Precio Venta (ARS / m²)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            type="number"
                                            className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-100 rounded-2xl outline-none text-lg font-bold"
                                            value={editingMaterial.precio_por_m2}
                                            onChange={e => setEditingMaterial({ ...editingMaterial, precio_por_m2: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-center justify-between">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Margen de Ganancia</span>
                                <span className="text-2xl font-black text-blue-700">
                                    {calculateMargin(editingMaterial.precio_interno, editingMaterial.precio_por_m2).toFixed(1)}%
                                </span>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-3"
                            >
                                <Save className="w-5 h-5" />
                                Guardar Tarifario
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {showSuccessToast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-bold tracking-tight">Tarifario actualizado correctamente</span>
                </div>
            )}
        </div>
    );
}
