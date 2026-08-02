import { useState } from "react";
import { Package, Plus, Minus, AlertTriangle, CheckCircle, Info, RefreshCw } from "lucide-react";
import { materialsStock, Material, updateMaterialStock, getMaterialsByCategory } from "../data/materials";

interface StockManagerProps {
  onStockUpdate?: (materialId: string, newStock: number) => void;
  showActions?: boolean;
}

export default function StockManager({ 
  onStockUpdate, 
  showActions = true 
}: StockManagerProps) {
  const [categories] = useState(() => getMaterialsByCategory());
  const [stockData, setStockData] = useState(() => materialsStock);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStockUpdate = async (materialId: string, change: number) => {
    setUpdating(materialId);
    
    // Simular delay de actualización
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const material = stockData.find(m => m.id === materialId);
    if (material) {
      const newStock = Math.max(0, material.stock + change);
      const updatedMaterial = { ...material, stock: newStock, isAvailable: newStock > 0 };
      
      setStockData(prev => prev.map(m => m.id === materialId ? updatedMaterial : m));
      
      // Actualizar el stock global
      updateMaterialStock(materialId, -change); // Revertir el cambio anterior
      if (change > 0) {
        // Agregar stock
        const globalMaterial = materialsStock.find(m => m.id === materialId);
        if (globalMaterial) {
          globalMaterial.stock += change;
          globalMaterial.isAvailable = globalMaterial.stock > 0;
        }
      }
      
      onStockUpdate?.(materialId, newStock);
    }
    
    setUpdating(null);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return "empty";
    if (stock < 10) return "low";
    if (stock < 50) return "medium";
    return "high";
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case "high": return "text-green-600 bg-green-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "low": return "text-orange-600 bg-orange-100";
      case "empty": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStockIcon = (status: string) => {
    switch (status) {
      case "high": return <CheckCircle className="w-4 h-4" />;
      case "medium": return <Info className="w-4 h-4" />;
      case "low": return <AlertTriangle className="w-4 h-4" />;
      case "empty": return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" />
          Gestión de Stock
        </h2>
        <div className="text-sm text-gray-500">
          Última actualización: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {categories.map(category => (
        <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">{category.name}</h3>
            <p className="text-sm text-gray-600">{category.description}</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {category.materials.map(material => {
              const stockStatus = getStockStatus(material.stock);
              const isUpdating = updating === material.id;

              return (
                <div key={material.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {material.displayName}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStockColor(stockStatus)}`}>
                          {getStockIcon(stockStatus)}
                          {material.stock} {material.unit}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {material.description}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">Precio:</span>
                          <span className="font-medium text-green-600">
                            ${material.pricePerUnit.toFixed(2)}/{material.unit}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">Mín. pedido:</span>
                          <span className="font-medium">
                            {material.minOrder} {material.unit}
                          </span>
                        </div>

                        {material.colors && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">Colores:</span>
                            <span className="text-sm">
                              {material.colors.slice(0, 2).join(", ")}
                              {material.colors.length > 2 && ` +${material.colors.length - 2}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {showActions && (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleStockUpdate(material.id, -1)}
                          disabled={isUpdating || material.stock <= 0}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Reducir stock"
                        >
                          {isUpdating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Minus className="w-4 h-4" />
                          )}
                        </button>
                        
                        <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                          {material.stock}
                        </span>
                        
                        <button
                          onClick={() => handleStockUpdate(material.id, 1)}
                          disabled={isUpdating}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Aumentar stock"
                        >
                          {isUpdating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Alertas de stock */}
                  {material.stock === 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Sin stock disponible
                        </span>
                      </div>
                    </div>
                  )}

                  {material.stock > 0 && material.stock < 10 && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-700">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">
                          Stock bajo ({material.stock} {material.unit} restantes)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Resumen de stock */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Resumen de Stock</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stockData.filter(m => m.stock >= 50).length}
            </div>
            <div className="text-gray-600">Alto stock</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stockData.filter(m => m.stock >= 10 && m.stock < 50).length}
            </div>
            <div className="text-gray-600">Stock medio</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stockData.filter(m => m.stock > 0 && m.stock < 10).length}
            </div>
            <div className="text-gray-600">Stock bajo</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {stockData.filter(m => m.stock === 0).length}
            </div>
            <div className="text-gray-600">Sin stock</div>
          </div>
        </div>
      </div>
    </div>
  );
} 