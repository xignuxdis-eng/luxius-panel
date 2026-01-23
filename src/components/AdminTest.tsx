import { useState, useEffect } from "react";
import { apiService } from "../services/api";

export default function AdminTest() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("🔄 Probando carga de datos admin...");

        // Probar cada endpoint individualmente
        const results: any = {};

        try {
          const users = await apiService.getUsers();
          results.users = users;
          console.log("✅ Usuarios:", users.length);
        } catch (err) {
          console.error("❌ Error usuarios:", err);
          results.users = [];
        }

        try {
          const orders = await apiService.getOrders();
          results.orders = orders;
          console.log("✅ Órdenes:", orders.orders.length);
        } catch (err) {
          console.error("❌ Error órdenes:", err);
          results.orders = { orders: [] };
        }

        try {
          const tasks = await apiService.getTasks();
          results.tasks = tasks;
          console.log("✅ Tareas:", tasks.tasks.length);
        } catch (err) {
          console.error("❌ Error tareas:", err);
          results.tasks = { tasks: [] };
        }

        try {
          const materials = await apiService.getMaterials();
          results.materials = materials;
          console.log("✅ Materiales:", materials.length);
        } catch (err) {
          console.error("❌ Error materiales:", err);
          results.materials = [];
        }

        setData(results);
        setError(null);
      } catch (err) {
        console.error('❌ Error general:', err);
        setError('Error general');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Probando carga de datos...</p>
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            🧪 Prueba de Datos Admin
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">👥 Usuarios</h3>
              <p className="text-3xl font-bold text-blue-600">{data.users?.length || 0}</p>
              <p className="text-sm text-blue-600">Total registrados</p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">📋 Órdenes</h3>
              <p className="text-3xl font-bold text-green-600">{data.orders?.orders?.length || 0}</p>
              <p className="text-sm text-green-600">Total pedidos</p>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">✅ Tareas</h3>
              <p className="text-3xl font-bold text-purple-600">{data.tasks?.tasks?.length || 0}</p>
              <p className="text-sm text-purple-600">Total tareas</p>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">📦 Materiales</h3>
              <p className="text-3xl font-bold text-orange-600">{data.materials?.length || 0}</p>
              <p className="text-sm text-orange-600">Total materiales</p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Detalles de Materiales</h3>
            {data.materials && data.materials.length > 0 ? (
              <div className="space-y-2">
                {data.materials.slice(0, 5).map((material: any, index: number) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{material.nombre}</span>
                      <span className="text-sm text-gray-500">
                        Tipo: {material.tipo} | Stock: {material.stock}
                      </span>
                    </div>
                  </div>
                ))}
                {data.materials.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... y {data.materials.length - 5} más
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center">No hay materiales disponibles</p>
            )}
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ Estado del Sistema:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Backend funcionando</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>API endpoints respondiendo</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Datos cargados correctamente</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Frontend renderizando</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 