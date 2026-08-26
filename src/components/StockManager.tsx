import { useState, useEffect } from "react";
import { Package, Plus, Minus, AlertTriangle, CheckCircle, Info, RefreshCw } from "lucide-react";
import { getMateriales, saveMaterial, refreshCollection } from "@/data/db";
import type { Material } from "@/types";

interface StockManagerProps {
  onStockUpdate?: (materialId: number, newStock: number) => void;
  showActions?: boolean;
}

export default function StockManager({ 
  onStockUpdate, 
  showActions = true 
}: StockManagerProps) {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [updating, setUpdating] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = () => {
    setMateriales(getMateriales().filter(m => m.habilitado !== false));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshCollection('materiales');
      loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    refreshCollection('materiales').then(() => loadData());
  }, []);

  const handleStockUpdate = async (material: Material, change: number) => {
    setUpdating(material.id);
    const current = material.stockActual || 0;
    const newStock = Math.max(0, current + change);
    
    saveMaterial({ ...material, stockActual: newStock });
    loadData();
    onStockUpdate?.(material.id, newStock);
    setUpdating(null);
  };

  const getStockStatus = (stock: number, min: number = 10) => {
    if (stock === 0) return "empty";
    if (stock <= min) return "low";
    if (stock <= min * 3) return "medium";
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
        <button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          className="text-xs text-blue-600 flex items-center gap-1 hover:underline"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Sincronizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-200">
          {materiales.map(material => {
            const stock = material.stockActual || 0;
            const min = material.stockMinimo || 10;
            const stockStatus = getStockStatus(stock, min);
            const isUpdating = updating === material.id;

            return (
              <div key={material.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded">{material.codigo}</span>
                      <h4 className="font-medium text-gray-900">{material.descripcion}</h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getStockColor(stockStatus)}`}>
                        {getStockIcon(stockStatus)}
                        {stock} {material.unidad || 'm²'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Calidad: {material.calidad} • Mínimo: {min} {material.unidad || 'm²'}
                    </p>
                  </div>

                  {showActions && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStockUpdate(material, -1)}
                        disabled={isUpdating || stock <= 0}
                        className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                        title="Reducir 1 unidad"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center text-sm font-medium">
                        {stock}
                      </span>
                      <button
                        onClick={() => handleStockUpdate(material, 1)}
                        disabled={isUpdating}
                        className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                        title="Aumentar 1 unidad"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}