import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { hasRolePermission } from '@/types/auth'
import Header from '@components/layout/Header'
import ClientesView from './ClientesView'
import MaterialesView from './MaterialesView'
import CalidadesView from './CalidadesView'
import ServicesView from './ServicesView'
import MaquinasView from './MaquinasView'
import LogisticsView from './LogisticsView'
import TarifasXignuxView from './TarifasXignuxView'
import CombosView from './CombosView'
import './ABM.css'

export default function ABM() {
    const user = useAuthStore(state => state.user)

    // Safety check for administrative role
    if (!user || !hasRolePermission(user.role, '/abm')) {
        return <Navigate to="/" replace />
    }
    return (
        <div className="abm-page page animate-fade-in">
            <Header title="Administración" subtitle="Gestión de entidades del sistema" />

            <nav className="abm-tabs">
                <NavLink to="/abm/tarifas" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Tarifas Xignux</NavLink>
                <NavLink to="/abm/clientes" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Clientes</NavLink>
                <NavLink to="/abm/servicios" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Servicios</NavLink>
                <NavLink to="/abm/materiales" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Materiales</NavLink>
                <NavLink to="/abm/calidades" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Calidades</NavLink>
                <NavLink to="/abm/productos" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Productos y Combos</NavLink>
                <NavLink to="/abm/combos" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Combos</NavLink>
                <NavLink to="/abm/monedas" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Monedas</NavLink>
                <NavLink to="/abm/cajas" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Cajas</NavLink>
                <NavLink to="/abm/bancos" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Bancos</NavLink>
                <NavLink to="/abm/maquinas" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Máquinas</NavLink>
                <NavLink to="/abm/logistica" className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}>Logística</NavLink>
            </nav>

            <div className="abm-content">
                <Routes>
                    <Route path="tarifas" element={<TarifasXignuxView />} />
                    <Route path="clientes" element={<ClientesView />} />
                    <Route path="servicios" element={<ServicesView />} />
                    <Route path="materiales" element={<MaterialesView />} />
                    <Route path="maquinas" element={<MaquinasView />} />
                    <Route path="calidades" element={<CalidadesView />} />
                    <Route path="logistica" element={<LogisticsView />} />
                    <Route path="productos" element={<CombosView />} />
                    <Route path="combos" element={<CombosView />} />
                    <Route path="monedas" element={<div className="p-20">Gestión de monedas próximamente...</div>} />
                    <Route path="cajas" element={<div className="p-20">Gestión de cajas próximamente...</div>} />
                    <Route path="bancos" element={<div className="p-20">Gestión de bancos próximamente...</div>} />
                    <Route path="*" element={<Navigate to="clientes" replace />} />
                </Routes>
            </div>
        </div>
    )
}
