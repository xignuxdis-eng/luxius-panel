import { Routes, Route } from "react-router-dom";
import PanelGeneral from "./index";
import GestionUsuarios from "./usuarios";
import StockManagementPage from "./stock";
import OrdenesPage from "./ordenes";
import PresupuestosPage from "./presupuestos";
import ReportesPage from "./reportes";
import EstadisticasPage from "./estadisticas";
import ConfiguracionPage from "./configuracion";
import AdminUploadPage from "./upload";
import PreciosPage from "./precios";

export default function AdminRouter() {
    return (
        <Routes>
            <Route path="/" element={<PanelGeneral />} />
            <Route path="/usuarios" element={<GestionUsuarios />} />
            <Route path="/stock" element={<StockManagementPage />} />
            <Route path="/ordenes" element={<OrdenesPage />} />
            <Route path="/presupuestos" element={<PresupuestosPage />} />
            <Route path="/precios" element={<PreciosPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/estadisticas" element={<EstadisticasPage />} />
            <Route path="/configuracion" element={<ConfiguracionPage />} />
            <Route path="/upload" element={<AdminUploadPage />} />
        </Routes>
    );
}
