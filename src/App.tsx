import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";
import Cliente from "./pages/dashboard/cliente";
import ClienteUpload from "./pages/dashboard/cliente/upload";
import Artista from "./pages/dashboard/artista";
import Impresor from "./pages/dashboard/impresor";
import AdminRouter from "./pages/dashboard/admin/AdminRouter";

function App() {
  return (
    <Router>
      <Routes>
        {/* Página de Login */}
        <Route path="/login" element={<Login />} />

        {/* Ruta raíz del dashboard - redirige automáticamente según rol */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard/auto" replace />
            </ProtectedRoute>
          }
        />

        {/* Dashboard Cliente */}
        <Route
          path="/dashboard/cliente"
          element={
            <ProtectedRoute expectedRole="cliente">
              <DashboardLayout showSidebar={true}>
                <Cliente />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/cliente/upload"
          element={
            <ProtectedRoute expectedRole="cliente">
              <DashboardLayout showSidebar={true}>
                <ClienteUpload />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/cliente/historial"
          element={
            <ProtectedRoute expectedRole="cliente">
              <DashboardLayout showSidebar={true}>
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                      Historial de Pedidos 📋
                    </h1>
                    <p className="text-gray-600">
                      Aquí podés ver todos tus pedidos anteriores.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <p className="text-gray-500 text-center py-8">
                      Funcionalidad en desarrollo...
                    </p>
                  </div>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/cliente/soporte"
          element={
            <ProtectedRoute expectedRole="cliente">
              <DashboardLayout showSidebar={true}>
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                      Chat de Soporte 💬
                    </h1>
                    <p className="text-gray-600">
                      Comunicate con nuestro equipo de soporte.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <p className="text-gray-500 text-center py-8">
                      Funcionalidad en desarrollo...
                    </p>
                  </div>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Artista */}
        <Route
          path="/dashboard/artista/*"
          element={
            <ProtectedRoute expectedRole="artista">
              <DashboardLayout showSidebar={true}>
                <Artista />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Impresor */}
        <Route
          path="/dashboard/impresor/*"
          element={
            <ProtectedRoute expectedRole="impresor">
              <DashboardLayout showSidebar={true}>
                <Impresor />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Admin */}
        <Route
          path="/dashboard/admin/*"
          element={
            <ProtectedRoute expectedRole="admin">
              <DashboardLayout showSidebar={true}>
                <AdminRouter />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Redirección para rutas no encontradas */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
