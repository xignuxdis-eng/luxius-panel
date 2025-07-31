import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  Brush,
  Printer,
  PackageSearch,
  Users,
  LayoutDashboard,
  BarChart3,
  Eye,
  Boxes,
  LogOut,
  History,
  MessageCircle,
  Settings
} from "lucide-react";
import { LucideIcon } from "lucide-react";

interface SidebarLink {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface LinksByRole {
  [key: string]: SidebarLink[];
}

const linksByRole: LinksByRole = {
  cliente: [
    { to: "/dashboard/cliente", label: "Mis Pedidos", icon: FileText },
    { to: "/dashboard/cliente/upload", label: "Subir Archivos", icon: Upload },
    { to: "/dashboard/cliente/historial", label: "Historial", icon: History },
    { to: "/dashboard/cliente/soporte", label: "Chat Soporte", icon: MessageCircle },
  ],
  artista: [
    { to: "/dashboard/artista", label: "Tareas de Diseño", icon: Brush },
    { to: "/dashboard/artista/estado", label: "Ver Impresiones", icon: Eye },
    { to: "/dashboard/artista/upload", label: "Subir Archivos", icon: Upload },
    { to: "/dashboard/artista/briefs", label: "Briefs Recibidos", icon: FileText },
    { to: "/dashboard/artista/tiempo", label: "Tiempo de Trabajo", icon: BarChart3 },
  ],
  impresor: [
    { to: "/dashboard/impresor", label: "Trabajos Asignados", icon: Printer },
    { to: "/dashboard/impresor/estado", label: "Ver Impresiones", icon: Eye },
    { to: "/dashboard/impresor/stock", label: "Stock", icon: Boxes },
    { to: "/dashboard/impresor/cargar-stock", label: "Cargar Stock", icon: PackageSearch },
    { to: "/dashboard/impresor/logistica", label: "Logística", icon: PackageSearch },
  ],
  admin: [
    { to: "/dashboard/admin", label: "Panel General", icon: LayoutDashboard },
    { to: "/dashboard/admin/usuarios", label: "Usuarios", icon: Users },
    { to: "/dashboard/admin/stock", label: "Gestión de Stock", icon: Boxes },
    { to: "/dashboard/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
    { to: "/dashboard/admin/configuracion", label: "Configuración", icon: Settings },
  ],
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Obtener usuario
  const storedUser = localStorage.getItem("user");
  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }

  // ✅ Validar usuario y rol
  if (!user || !user.username || !user.rol) {
    navigate("/login", { replace: true });
    return null;
  }

  // ✅ Normalizar el rol "impresion" a "impresor"
  const normalizedRole = user.rol === "impresion" ? "impresor" : user.rol;

  // ✅ Obtener enlaces del rol
  const roleLinks = linksByRole[normalizedRole] || [];

  // ✅ Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem("user");
    console.log("🚪 Logout exitoso desde Sidebar");
    navigate("/login", { replace: true });
  };

  return (
    <aside className="w-64 bg-white shadow-lg h-screen sticky top-0 flex flex-col border-r border-gray-200">
      {/* Logo / título */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">LuXius</h1>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          {user.username} • {normalizedRole}
        </div>
      </div>

      {/* Menú */}
      <nav className="flex-1 space-y-1 p-4">
        {roleLinks.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Botón de logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors duration-200 font-medium"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
