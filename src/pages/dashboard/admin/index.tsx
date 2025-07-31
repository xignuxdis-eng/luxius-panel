import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Estadistica {
  titulo: string;
  valor: string;
  cambio: string;
  icono: string;
  color: string;
}

const estadisticas: Estadistica[] = [
  {
    titulo: "Usuarios Activos",
    valor: "1,234",
    cambio: "+12%",
    icono: "👥",
    color: "blue"
  },
  {
    titulo: "Pedidos Este Mes",
    valor: "456",
    cambio: "+8%",
    icono: "📋",
    color: "green"
  },
  {
    titulo: "Ingresos Mensuales",
    valor: "$45,678",
    cambio: "+15%",
    icono: "💰",
    color: "purple"
  },
  {
    titulo: "Stock Disponible",
    valor: "89%",
    cambio: "-3%",
    icono: "📦",
    color: "orange"
  }
];

const actividadesRecientes = [
  { id: 1, accion: "Nuevo pedido creado", usuario: "Juan Pérez", tiempo: "2 min", tipo: "pedido" },
  { id: 2, accion: "Stock actualizado", usuario: "María García", tiempo: "5 min", tipo: "stock" },
  { id: 3, accion: "Usuario registrado", usuario: "Carlos López", tiempo: "10 min", tipo: "usuario" },
  { id: 4, accion: "Pedido completado", usuario: "Ana Martínez", tiempo: "15 min", tipo: "pedido" },
  { id: 5, accion: "Archivo subido", usuario: "Luis Rodríguez", tiempo: "20 min", tipo: "archivo" }
];

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue": return "bg-blue-100 text-blue-600";
      case "green": return "bg-green-100 text-green-600";
      case "purple": return "bg-purple-100 text-purple-600";
      case "orange": return "bg-orange-100 text-orange-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const getTipoIcono = (tipo: string) => {
    switch (tipo) {
      case "pedido": return "📋";
      case "stock": return "📦";
      case "usuario": return "👤";
      case "archivo": return "📄";
      default: return "ℹ️";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Panel de Administración 🎛️
        </h1>
        <p className="text-gray-600">
          Bienvenido, {user?.username}. Aquí podés gestionar todo el sistema LuXius.
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {estadisticas.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.titulo}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.valor}</p>
                <p className={`text-sm mt-1 ${stat.cambio.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.cambio} vs mes anterior
                </p>
              </div>
              <div className={`p-3 rounded-lg ${getColorClasses(stat.color)}`}>
                <span className="text-2xl">{stat.icono}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad Reciente */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Actividad Reciente</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {actividadesRecientes.map((actividad) => (
                <div key={actividad.id} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-lg">{getTipoIcono(actividad.tipo)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{actividad.accion}</p>
                    <p className="text-sm text-gray-500">{actividad.usuario}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs text-gray-400">{actividad.tiempo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Acciones Rápidas</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => navigate("/dashboard/admin/usuarios")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium"
              >
                👥 Gestionar Usuarios
              </button>
              <button 
                onClick={() => navigate("/dashboard/admin/stock")}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors font-medium"
              >
                📦 Ver Stock
              </button>
              <button 
                onClick={() => navigate("/dashboard/admin/estadisticas")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors font-medium"
              >
                📊 Ver Estadísticas
              </button>
              <button 
                onClick={() => navigate("/dashboard/admin/configuracion")}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg transition-colors font-medium"
              >
                ⚙️ Configuración
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
