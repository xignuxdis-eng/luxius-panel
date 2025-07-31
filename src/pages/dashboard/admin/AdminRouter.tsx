import { Routes, Route } from "react-router-dom";
import DashboardAdmin from "./index";
import StockManagementPage from "./stock";

export default function AdminRouter() {
  return (
    <Routes>
      <Route path="/" element={<DashboardAdmin />} />
      <Route path="/stock" element={<StockManagementPage />} />
      <Route path="/usuarios" element={
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Gestión de Usuarios 👥
            </h1>
            <p className="text-gray-600">
              Administra los usuarios del sistema.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <p className="text-gray-500 text-center py-8">
              Funcionalidad en desarrollo...
            </p>
          </div>
        </div>
      } />
      <Route path="/estadisticas" element={
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Estadísticas 📊
            </h1>
            <p className="text-gray-600">
              Visualiza estadísticas del sistema.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <p className="text-gray-500 text-center py-8">
              Funcionalidad en desarrollo...
            </p>
          </div>
        </div>
      } />
      <Route path="/configuracion" element={
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Configuración ⚙️
            </h1>
            <p className="text-gray-600">
              Configura los parámetros del sistema.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <p className="text-gray-500 text-center py-8">
              Funcionalidad en desarrollo...
            </p>
          </div>
        </div>
      } />
    </Routes>
  );
} 