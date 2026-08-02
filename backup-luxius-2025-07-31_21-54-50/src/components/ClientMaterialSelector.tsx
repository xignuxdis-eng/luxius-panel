import { useState } from "react";
import { Package, CheckCircle } from "lucide-react";
import { Material, MaterialCategory, getMaterialsByCategory } from "../data/materials";

interface ClientMaterialSelectorProps {
  selectedMaterial: string;
  onMaterialChange: (materialId: string) => void;
}

export default function ClientMaterialSelector({
  selectedMaterial,
  onMaterialChange
}: ClientMaterialSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = getMaterialsByCategory();
  const filteredCategories = selectedCategory === "all" 
    ? categories 
    : categories.filter(cat => cat.id === selectedCategory);

  return (
    <div className="space-y-3">
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
      <div className="space-y-2">
        {filteredCategories.map(category => (
          <div key={category.id} className="space-y-2">
            {selectedCategory === "all" && (
              <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">
                {category.name}
              </h4>
            )}
            
            <div className="grid gap-2">
              {category.materials.filter(material => material.isAvailable).map(material => {
                const isSelected = selectedMaterial === material.id;

                return (
                  <div
                    key={material.id}
                    className={`border rounded-lg p-3 transition-all cursor-pointer ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => onMaterialChange(material.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-600" />
                        <div>
                          <h5 className="font-medium text-gray-900 text-sm">
                            {material.displayName}
                          </h5>
                          <p className="text-xs text-gray-600">
                            {material.description}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 