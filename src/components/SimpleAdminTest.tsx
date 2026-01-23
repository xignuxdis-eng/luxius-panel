import { useState, useEffect } from "react";
import { apiService } from "../services/api";

export default function SimpleAdminTest() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testData = async () => {
      try {
        setLoading(true);
        console.log("🧪 Iniciando prueba simple...");

        // Solo probar materiales primero
        const materials = await apiService.getMaterials();
        console.log("✅ Materiales obtenidos:", materials.length);
        
        setData({ materials });
        setError(null);
      } catch (err) {
        console.error("❌ Error en prueba simple:", err);
        setError("Error cargando datos");
      } finally {
        setLoading(false);
      }
    };

    testData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Prueba simple...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            🧪 Prueba Simple Admin
          </h1>

          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">📦 Materiales</h3>
            <p className="text-3xl font-bold text-blue-600">{data.materials?.length || 0}</p>
            <p className="text-sm text-blue-600">Total cargados</p>
          </div>

          {data.materials && data.materials.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">Primeros 3 materiales:</h4>
              <div className="space-y-2">
                {data.materials.slice(0, 3).map((material: any, index: number) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{material.nombre || 'Sin nombre'}</span>
                      <span className="text-sm text-gray-500">
                        Tipo: {material.tipo || 'N/A'} | Stock: {material.stock || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ Estado:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Componente renderizando</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Datos cargados</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Tailwind funcionando</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 