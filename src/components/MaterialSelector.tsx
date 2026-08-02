import { useState } from "react";
import { Package, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Material, MaterialCategory, getMaterialsByCategory, calculateRequiredArea, checkStockAvailability } from "../data/materials";

interface MaterialSelectorProps {
  selectedMaterial: string;
  onMaterialChange: (materialId: string) => void;
  width?: number; // en cm
  height?: number; // en cm
  copies?: number;
  showStockInfo?: boolean;
  showPricing?: boolean;
  userRole?: "cliente" | "artista" | "impresor" | "admin";
}

export default function MaterialSelector({
  selectedMaterial,
  onMaterialChange,
  width = 0,
  height = 0,
  copies = 1,
  showStockInfo = true,
  showPricing = true,
  userRole = "cliente"
}: MaterialSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const categories = getMaterialsByCategory();
  const allMaterials = categories.flatMap(cat => cat.materials);

  // Calcular área requerida si tenemos dimensiones
  const requiredArea = width > 0 && height > 0 ? calculateRequiredArea(width, height, copies) : 0;

  // Determinar si mostrar información de stock y precios
  const canSeeStockInfo = userRole !== "cliente" && showStockInfo;
  const canSeePricing = userRole !== "cliente" && showPricing;

  const getStockStatus = (material: Material) => {
    if (!material.isAvailable) return "unavailable";
    if (material.stock < 10) return "low";
    if (material.stock < 50) return "medium";
    return "high";
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case "high": return "text-green-600 bg-green-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "low": return "text-orange-600 bg-orange-100";
      case "unavailable": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStockIcon = (status: string) => {
    switch (status) {
      case "high": return <CheckCircle className="w-4 h-4" />;
      case "medium": return <Info className="w-4 h-4" />;
      case "low": return <AlertTriangle className="w-4 h-4" />;
      case "unavailable": return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const filteredCategories = selectedCategory === "all" 
    ? categories 
    : categories.filter(cat => cat.id === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Selector de categorías */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selectedCategory === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Todos
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Lista de materiales */}
      <div className="space-y-3">
        {filteredCategories.map(category => (
          <div key={category.id} className="space-y-2">
            {selectedCategory === "all" && (
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                {category.name}
              </h3>
            )}
            
            <div className="grid gap-3">
              {category.materials.map(material => {
                const stockStatus = getStockStatus(material);
                const hasEnoughStock = requiredArea > 0 ? checkStockAvailability(material.id, requiredArea) : true;
                const isSelected = selectedMaterial === material.id;

                return (
                  <div
                    key={material.id}
                    className={`border rounded-lg p-4 transition-all cursor-pointer ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    } ${!material.isAvailable ? "opacity-50" : ""}`}
                    onClick={() => material.isAvailable && onMaterialChange(material.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-gray-600" />
                          <h4 className="font-medium text-gray-900">
                            {material.displayName}
                          </h4>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {material.description}
                        </p>

                        {/* Información de stock y precio - Solo para roles internos */}
                        {canSeeStockInfo && (
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600">Stock:</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getStockColor(stockStatus)}`}>
                                {getStockIcon(stockStatus)}
                                {material.stock} {material.unit}
                              </span>
                            </div>

                            {canSeePricing && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-600">Precio:</span>
                                <span className="font-medium text-green-600">
                                  ${material.pricePerUnit.toFixed(2)}/{material.unit}
                                </span>
                              </div>
                            )}

                            {requiredArea > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-600">Necesario:</span>
                                <span className={`font-medium ${
                                  hasEnoughStock ? "text-green-600" : "text-red-600"
                                }`}>
                                  {requiredArea} {material.unit}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Detalles adicionales - Solo para roles internos */}
                        {userRole !== "cliente" && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {material.colors && material.colors.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Colores:</span>
                                <div className="flex gap-1">
                                  {material.colors.slice(0, 3).map(color => (
                                    <span key={color} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                      {color}
                                    </span>
                                  ))}
                                  {material.colors.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                      +{material.colors.length - 3} más
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {material.finishes && material.finishes.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Acabados:</span>
                                <div className="flex gap-1">
                                  {material.finishes.map(finish => (
                                    <span key={finish} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                      {finish}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Alerta de stock insuficiente - Solo para roles internos */}
                        {canSeeStockInfo && requiredArea > 0 && !hasEnoughStock && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <div className="flex items-center gap-2 text-red-700">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-sm">
                                Stock insuficiente. Necesitas {requiredArea} {material.unit}, 
                                disponible: {material.stock} {material.unit}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Material no disponible */}
                        {!material.isAvailable && (
                          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                            <div className="flex items-center gap-2 text-gray-600">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-sm">
                                Material no disponible actualmente
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Información adicional - Solo para roles internos */}
      {userRole !== "cliente" && requiredArea > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <Info className="w-4 h-4" />
            <span className="text-sm">
              Área requerida para tu pedido: <strong>{requiredArea} m²</strong> 
              (incluye 5% de margen de corte)
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 