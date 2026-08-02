import { Package, Plus, AlertTriangle } from "lucide-react";

export default function CargarStock() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Cargar Stock 📦
        </h1>
        <p className="text-gray-600">
          Actualiza el inventario de materiales disponibles.
        </p>
      </div>

      {/* Contenido placeholder */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-center py-8">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Funcionalidad en desarrollo...</p>
        </div>
      </div>
    </div>
  );
} 