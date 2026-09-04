import { useState, useEffect } from "react";
import { apiService, Material } from "../../../services/api";

export default function AdminMateriales() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setLoading(true);
        console.log("🔄 Cargando materiales...");
        const response = await apiService.getMaterials();
        console.log("✅ Materiales cargados:", response.length);
        setMaterials(response || []);
        setError(null);
      } catch (err) {
        console.error('❌ Error fetching materials:', err);
        setError('Error al cargar materiales');
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  // Obtener categorías únicas de los materiales
  const uniqueCategories = [...new Set(materials.map(m => m.categoria))].sort();
  
  // Obtener tipos únicos de los materiales
  const uniqueTypes = [...new Set(materials.map(m => m.tipo))].sort();

  const filteredMaterials = materials.filter(material => {
    const matchesCategory = filterCategory === 'all' || material.categoria === filterCategory;
    const matchesType = filterType === 'all' || material.tipo === filterType;
    const matchesSearch = material.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         material.descripcion?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesType && matchesSearch;
  });

  const getStockColor = (stock: number, stockMinimo: number) => {
    if (stock === 0) return 'text-red-600 bg-red-100';
    if (stock <= stockMinimo) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'manufactura': return 'text-blue-600 bg-blue-100';
      case 'cliente': return 'text-green-600 bg-green-100';
      case 'consumo': return 'text-purple-600 bg-purple-100';
      case 'ambos': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'banner': return 'text-green-600 bg-green-100';
      case 'vinilo': return 'text-blue-600 bg-blue-100';
      case 'papel': return 'text-yellow-600 bg-yellow-100';
      case 'tela': return 'text-purple-600 bg-purple-100';
      case 'lona': return 'text-indigo-600 bg-indigo-100';
      case 'tinta': return 'text-cyan-600 bg-cyan-100';
      case 'laca': return 'text-emerald-600 bg-emerald-100';
      case 'solvente': return 'text-slate-600 bg-slate-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando materiales...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Gestión de Materiales 📦
        </h1>
        <p className="text-gray-600">
          Administra el inventario de materiales del sistema LuXius.
        </p>
        {/* Debug info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Debug:</strong> Total materiales: {materials.length} | Filtrados: {filteredMaterials.length}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Buscar materiales..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las categorías</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los tipos</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'manufactura' ? 'Manufactura' : 
                   type === 'cliente' ? 'Cliente' : 
                   type === 'consumo' ? 'Consumo' : type}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('all');
                setFilterType('all');
              }}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{materials.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">🏭</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Manufactura</p>
              <p className="text-2xl font-bold text-gray-900">
                {materials.filter(m => m.tipo === 'manufactura').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Cliente</p>
              <p className="text-2xl font-bold text-gray-900">
                {materials.filter(m => m.tipo === 'cliente').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-gray-900">
                {materials.filter(m => m.stock < m.stock_minimo).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <span className="text-2xl">🎨</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Materiales Líquidos</p>
              <p className="text-2xl font-bold text-gray-900">
                {materials.filter(m => ['Tinta', 'Laca', 'Solvente'].includes(m.categoria)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Materiales */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Materiales ({filteredMaterials.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio/m²
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaterials.map((material) => (
                <tr key={material.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {material.nombre}
                      </div>
                      {material.descripcion && (
                        <div className="text-sm text-gray-500">
                          {material.descripcion}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(material.categoria)}`}>
                      {material.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(material.tipo)}`}>
                      {material.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {material.stock} {material.unidad}
                    </div>
                    <div className="text-sm text-gray-500">
                      Mín: {material.stock_minimo}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${material.precio_por_m2}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockColor(material.stock, material.stock_minimo)}`}>
                      {material.stock === 0 ? 'Sin Stock' : 
                       material.stock <= material.stock_minimo ? 'Stock Bajo' : 'Disponible'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 