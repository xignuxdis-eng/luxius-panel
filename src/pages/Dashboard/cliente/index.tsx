import { useState } from "react";

interface Pedido {
  id: string;
  titulo: string;
  estado: "pendiente" | "en_proceso" | "completado";
  fecha: string;
  archivos: string[];
}

const pedidosIniciales: Pedido[] = [
  {
    id: "001",
    titulo: "Lonas para campaña electoral",
    estado: "en_proceso",
    fecha: "2024-01-15",
    archivos: ["campana_electoral.pdf", "logo_partido.png"]
  },
  {
    id: "002", 
    titulo: "Vinilos para vehículo comercial",
    estado: "pendiente",
    fecha: "2024-01-20",
    archivos: ["diseño_vehiculo.ai", "medidas.txt"]
  },
  {
    id: "003",
    titulo: "Banners para evento corporativo",
    estado: "completado",
    fecha: "2024-01-10",
    archivos: ["banner_evento.psd", "colores_corporativos.pdf"]
  }
];

export default function DashboardCliente() {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "pendiente": return "bg-yellow-100 text-yellow-800";
      case "en_proceso": return "bg-blue-100 text-blue-800";
      case "completado": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case "pendiente": return "⏳ Pendiente";
      case "en_proceso": return "🔄 En proceso";
      case "completado": return "✅ Completado";
      default: return "❓ Desconocido";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          ¡Hola, {user?.username}! 👋
        </h1>
        <p className="text-gray-600">
          Bienvenido al panel de cliente. Aquí podés ver el estado de tus pedidos y gestionar tus archivos.
        </p>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-blue-600 text-xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pedidos</p>
              <p className="text-2xl font-bold text-gray-900">{pedidos.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-yellow-600 text-xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">
                {pedidos.filter(p => p.estado === "pendiente").length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-green-600 text-xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completados</p>
              <p className="text-2xl font-bold text-gray-900">
                {pedidos.filter(p => p.estado === "completado").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Mis Pedidos Recientes</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{pedido.titulo}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Pedido #{pedido.id} • {new Date(pedido.fecha).toLocaleDateString('es-AR')}
                  </p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(pedido.estado)}`}>
                      {getEstadoTexto(pedido.estado)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">
                      <strong>Archivos:</strong> {pedido.archivos.join(", ")}
                    </p>
                  </div>
                </div>
                <div className="ml-4">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Ver detalles
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
