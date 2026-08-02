import { useState, useEffect } from "react";
import { apiService } from "../services/api";

export default function TestData() {
  const [orders, setOrders] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        console.log("🔄 Cargando datos de prueba...");

        // Cargar órdenes
        const ordersResponse = await apiService.getOrders();
        console.log("✅ Órdenes cargadas:", ordersResponse.orders);
        setOrders(ordersResponse.orders);

        // Cargar tareas
        const tasksResponse = await apiService.getTasks();
        console.log("✅ Tareas cargadas:", tasksResponse.tasks);
        setTasks(tasksResponse.tasks);

        // Cargar materiales
        const materialsResponse = await apiService.getMaterials();
        console.log("✅ Materiales cargados:", materialsResponse);
        setMaterials(materialsResponse);

        setError(null);
      } catch (err) {
        console.error('❌ Error cargando datos:', err);
        setError('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos de prueba...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-white rounded-lg shadow-lg">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">🧪 Prueba de Datos Reales</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Órdenes */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 Órdenes ({orders.length})</h3>
          {orders.length === 0 ? (
            <p className="text-blue-600">No hay órdenes</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 3).map((order) => (
                <div key={order.id} className="bg-white p-2 rounded text-sm">
                  <strong>ID:</strong> {order.id} | <strong>Estado:</strong> {order.estado}
                </div>
              ))}
              {orders.length > 3 && (
                <p className="text-blue-600 text-sm">... y {orders.length - 3} más</p>
              )}
            </div>
          )}
        </div>

        {/* Tareas */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-3">✅ Tareas ({tasks.length})</h3>
          {tasks.length === 0 ? (
            <p className="text-green-600">No hay tareas</p>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 3).map((task) => (
                <div key={task.id} className="bg-white p-2 rounded text-sm">
                  <strong>ID:</strong> {task.id} | <strong>Estado:</strong> {task.estado}
                </div>
              ))}
              {tasks.length > 3 && (
                <p className="text-green-600 text-sm">... y {tasks.length - 3} más</p>
              )}
            </div>
          )}
        </div>

        {/* Materiales */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800 mb-3">📦 Materiales ({materials.length})</h3>
          {materials.length === 0 ? (
            <p className="text-purple-600">No hay materiales</p>
          ) : (
            <div className="space-y-2">
              {materials.slice(0, 3).map((material) => (
                <div key={material.id} className="bg-white p-2 rounded text-sm">
                  <strong>ID:</strong> {material.id} | <strong>Stock:</strong> {material.stock}
                </div>
              ))}
              {materials.length > 3 && (
                <p className="text-purple-600 text-sm">... y {materials.length - 3} más</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-2">📊 Resumen</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Total Órdenes:</strong> {orders.length}
          </div>
          <div>
            <strong>Total Tareas:</strong> {tasks.length}
          </div>
          <div>
            <strong>Total Materiales:</strong> {materials.length}
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>💡 Nota:</strong> Si ves números mayores a 0, significa que los datos reales están funcionando correctamente.
        </p>
      </div>
    </div>
  );
} 