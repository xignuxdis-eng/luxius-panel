import { useState, useEffect } from "react";
import { apiService, Material } from "../services/api";

interface StockData {
  totalMaterials: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
  materialsByCategory: { [key: string]: number };
  materialsByType: { [key: string]: number };
  liquidMaterialsCount: number;
}

export default function StockCharts() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stockData, setStockData] = useState<StockData>({
    totalMaterials: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalValue: 0,
    materialsByCategory: {},
    materialsByType: {},
    liquidMaterialsCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const materialsData = await apiService.getMaterials();
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
      
      // Calcular estadísticas
      const totalMaterials = materialsData.length;
      const lowStockCount = materialsData.filter(m => m.stock < m.stock_minimo).length;
      const outOfStockCount = materialsData.filter(m => m.stock === 0).length;
      const totalValue = materialsData.reduce((sum, m) => sum + (m.stock * m.precio_por_m2), 0);
      
      // Agrupar por categoría
      const materialsByCategory: { [key: string]: number } = {};
      materialsData.forEach(m => {
        materialsByCategory[m.categoria] = (materialsByCategory[m.categoria] || 0) + 1;
      });
      
             // Agrupar por tipo (cliente/manufactura)
       const materialsByType: { [key: string]: number } = {};
       materialsData.forEach(m => {
         const tipo = m.tipo || 'cliente';
         materialsByType[tipo] = (materialsByType[tipo] || 0) + 1;
       });
       
       // Contar materiales líquidos
       const liquidMaterialsCount = materialsData.filter(m => 
         ['Tinta', 'Laca', 'Solvente'].includes(m.categoria)
       ).length;
       
       setStockData({
         totalMaterials,
         lowStockCount,
         outOfStockCount,
         totalValue,
         materialsByCategory,
         materialsByType,
         liquidMaterialsCount
       });
    } catch (err) {
      console.error('Error cargando datos de stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusColor = (stock: number, stockMinimo: number) => {
    if (stock === 0) return 'text-red-600 bg-red-100';
    if (stock < stockMinimo) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStockStatusText = (stock: number, stockMinimo: number) => {
    if (stock === 0) return 'Sin Stock';
    if (stock < stockMinimo) return 'Stock Bajo';
    return 'Disponible';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando datos de stock...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
             {/* Tarjetas de Resumen */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total de Materiales */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Materiales</p>
              <p className="text-3xl font-bold">{stockData.totalMaterials}</p>
              <p className="text-blue-100 text-sm mt-1">En inventario</p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </div>

        {/* Stock Bajo */}
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Stock Bajo</p>
              <p className="text-3xl font-bold">{stockData.lowStockCount}</p>
              <p className="text-yellow-100 text-sm mt-1">Necesitan reposición</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>

        {/* Sin Stock */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Sin Stock</p>
              <p className="text-3xl font-bold">{stockData.outOfStockCount}</p>
              <p className="text-red-100 text-sm mt-1">Agotados</p>
            </div>
            <div className="text-4xl">🚫</div>
          </div>
        </div>

                 {/* Valor Total */}
         <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-green-100 text-sm font-medium">Valor Total</p>
               <p className="text-3xl font-bold">${stockData.totalValue.toLocaleString()}</p>
               <p className="text-green-100 text-sm mt-1">En inventario</p>
             </div>
             <div className="text-4xl">💰</div>
           </div>
         </div>

         {/* Materiales Líquidos */}
         <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-indigo-100 text-sm font-medium">Materiales Líquidos</p>
               <p className="text-3xl font-bold">{stockData.liquidMaterialsCount}</p>
               <p className="text-indigo-100 text-sm mt-1">Tintas, Laca, Solvente</p>
             </div>
             <div className="text-4xl">🎨</div>
           </div>
         </div>
      </div>

      {/* Gráficos y Estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Categoría */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">📊 Distribución por Categoría</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(stockData.materialsByCategory).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-700">{category}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(count / stockData.totalMaterials) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

                 {/* Materiales Líquidos */}
         <div className="bg-white rounded-lg shadow-sm border border-gray-200">
           <div className="p-6 border-b border-gray-200">
             <div className="flex items-center justify-between">
               <h3 className="text-lg font-semibold text-gray-800">🎨 Materiales Líquidos</h3>
               <span className="text-xs text-gray-500">Rango: 0 - 5000 ml</span>
             </div>
           </div>
           <div className="p-6">
             <div className="space-y-4">
               {materials
                 .filter(m => ['Tinta', 'Laca', 'Solvente'].includes(m.categoria))
                 .map((material) => {
                   // Definir colores específicos para cada material líquido
                   let barColor = 'bg-gray-500';
                   let dotColor = 'bg-gray-500';
                   
                   if (material.categoria === 'Tinta') {
                     if (material.nombre.includes('Cian')) {
                       barColor = 'bg-cyan-500';
                       dotColor = 'bg-cyan-500';
                     } else if (material.nombre.includes('Magenta')) {
                       barColor = 'bg-pink-500';
                       dotColor = 'bg-pink-500';
                     } else if (material.nombre.includes('Amarilla')) {
                       barColor = 'bg-yellow-500';
                       dotColor = 'bg-yellow-500';
                     } else if (material.nombre.includes('Negro')) {
                       barColor = 'bg-gray-800';
                       dotColor = 'bg-gray-800';
                     }
                   } else if (material.categoria === 'Laca') {
                     barColor = 'bg-green-500';
                     dotColor = 'bg-green-500';
                   } else if (material.categoria === 'Solvente') {
                     barColor = 'bg-gray-400';
                     dotColor = 'bg-gray-400';
                   }
                   
                                       // Calcular porcentaje basado en rango fijo de 0-5000 ml
                    const maxRange = 5000; // ml
                    const stockPercentage = (material.stock / maxRange) * 100;
                    
                    return (
                      <div key={material.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full mr-3 ${dotColor}`}></div>
                          <span className="text-sm font-medium text-gray-700">{material.nombre}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                              className={`h-2 rounded-full ${barColor}`}
                              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {material.stock} {material.unidad}
                          </span>
                        </div>
                      </div>
                    );
                 })}
             </div>
             {materials.filter(m => ['Tinta', 'Laca', 'Solvente'].includes(m.categoria)).length === 0 && (
               <div className="text-center py-4">
                 <p className="text-gray-500">No hay materiales líquidos registrados</p>
               </div>
             )}
           </div>
         </div>
      </div>

      {/* Materiales con Stock Bajo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">⚠️ Materiales con Stock Bajo</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials
              .filter(m => m.stock < m.stock_minimo)
              .slice(0, 6)
              .map((material) => (
                <div key={material.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{material.nombre}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStockStatusColor(material.stock, material.stock_minimo)}`}>
                      {getStockStatusText(material.stock, material.stock_minimo)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Categoría: {material.categoria}</p>
                    <p>Stock: {material.stock} {material.unidad}</p>
                    <p>Mínimo: {material.stock_minimo} {material.unidad}</p>
                    <p className="font-medium text-gray-800">
                      Precio: ${material.precio_por_m2}/m²
                    </p>
                  </div>
                </div>
              ))}
          </div>
          {materials.filter(m => m.stock < m.stock_minimo).length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-gray-500">¡Excelente! No hay materiales con stock bajo</p>
            </div>
          )}
        </div>
      </div>

      {/* Materiales Más Valiosos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">💎 Materiales Más Valiosos</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials
              .sort((a, b) => (b.stock * b.precio_por_m2) - (a.stock * a.precio_por_m2))
              .slice(0, 6)
              .map((material) => (
                <div key={material.id} className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{material.nombre}</h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                      ${(material.stock * material.precio_por_m2).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Categoría: {material.categoria}</p>
                    <p>Stock: {material.stock} {material.unidad}</p>
                    <p className="font-medium text-gray-800">
                      Precio: ${material.precio_por_m2}/m²
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
} 