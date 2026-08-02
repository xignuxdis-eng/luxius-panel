import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";
import Cliente from "./pages/dashboard/cliente";
import ClienteUpload from "./pages/dashboard/cliente/upload";
import ArtistaUpload from "./pages/dashboard/artista/upload";
import HistorialCliente from "./pages/dashboard/cliente/historial";
import SoporteCliente from "./pages/dashboard/cliente/soporte";
import EstadoImpresiones from "./pages/dashboard/artista/estado";
import EstadoImpresionesImpresor from "./pages/dashboard/impresor/estado";
import BriefsArtista from "./pages/dashboard/artista/briefs";
import TiempoTrabajo from "./pages/dashboard/artista/tiempo";
import CargarStock from "./pages/dashboard/impresor/cargar-stock";
import Logistica from "./pages/dashboard/impresor/logistica";
import StockImpresor from "./pages/dashboard/impresor/stock";
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
                <HistorialCliente />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/cliente/soporte"
          element={
            <ProtectedRoute expectedRole="cliente">
              <DashboardLayout showSidebar={true}>
                <SoporteCliente />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Artista */}
        <Route
          path="/dashboard/artista"
          element={
            <ProtectedRoute expectedRole="artista">
              <DashboardLayout showSidebar={true}>
                <Artista />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/artista/upload"
          element={
            <ProtectedRoute expectedRole="artista">
              <DashboardLayout showSidebar={true}>
                <ArtistaUpload />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/artista/estado"
          element={
            <ProtectedRoute expectedRole="artista">
              <DashboardLayout showSidebar={true}>
                <EstadoImpresiones />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/artista/briefs"
          element={
            <ProtectedRoute expectedRole="artista">
              <DashboardLayout showSidebar={true}>
                <BriefsArtista />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/artista/tiempo"
          element={
            <ProtectedRoute expectedRole="artista">
              <DashboardLayout showSidebar={true}>
                <TiempoTrabajo />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Impresor */}
        <Route
          path="/dashboard/impresor"
          element={
            <ProtectedRoute expectedRole="impresor">
              <DashboardLayout showSidebar={true}>
                <Impresor />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/impresor/estado"
          element={
            <ProtectedRoute expectedRole="impresor">
              <DashboardLayout showSidebar={true}>
                <EstadoImpresionesImpresor />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/impresor/stock"
          element={
            <ProtectedRoute expectedRole="impresor">
              <DashboardLayout showSidebar={true}>
                <StockImpresor />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/impresor/cargar-stock"
          element={
            <ProtectedRoute expectedRole="impresor">
              <DashboardLayout showSidebar={true}>
                <CargarStock />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/impresor/logistica"
          element={
            <ProtectedRoute expectedRole="impresor">
              <DashboardLayout showSidebar={true}>
                <Logistica />
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
