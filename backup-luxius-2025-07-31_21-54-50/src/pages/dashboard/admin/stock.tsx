import StockManager from "../../../components/StockManager";

export default function StockManagementPage() {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const handleStockUpdate = (materialId: string, newStock: number) => {
    console.log(`Stock actualizado para ${materialId}: ${newStock}`);
    // Aquí se podría implementar la lógica para guardar en base de datos
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Gestión de Stock 📦
        </h1>
        <p className="text-gray-600">
          Administra el inventario de materiales disponibles para los pedidos.
        </p>
      </div>

      {/* Gestor de Stock */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <StockManager 
          onStockUpdate={handleStockUpdate}
          showActions={true}
        />
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">
          Información sobre la Gestión de Stock
        </h3>
        <div className="space-y-3 text-sm text-blue-700">
          <div className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              <strong>Stock Alto (≥50 m²):</strong> Material disponible en abundancia para pedidos grandes.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              <strong>Stock Medio (10-49 m²):</strong> Material disponible para pedidos regulares.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              <strong>Stock Bajo (1-9 m²):</strong> Material limitado, considerar reabastecimiento.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>
              <strong>Sin Stock (0 m²):</strong> Material no disponible para nuevos pedidos.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 