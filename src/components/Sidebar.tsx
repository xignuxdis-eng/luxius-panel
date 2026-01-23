import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  Brush,
  Printer,
  PackageSearch,
  Users,
  LayoutDashboard,
  LogOut,
  Palette,
  Factory,
  BarChart3,
  Eye,
  Boxes,
  History,
  MessageCircle,
  Settings,
  DollarSign,
  Calculator,
  TrendingUp
} from "lucide-react";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // DEBUGGING: Log execution
  console.log("🚀 SIDEBAR v2.2 LOADED");

  // Robust user retrieval trying multiple keys
  let user = { username: "Usuario", role: "cliente" };
  let source = "default";

  try {
    // Try 'luxius_user' first, then fallback to 'user'
    const userString = localStorage.getItem("luxius_user") || localStorage.getItem("user");
    if (userString) {
      const parsed = JSON.parse(userString);
      console.log("👤 User found in localStorage:", parsed);
      // Ensure it has at least username or role, otherwise ignore
      if (parsed && (parsed.username || parsed.role || parsed.rol)) {
        user = parsed;
        source = localStorage.getItem("luxius_user") ? "luxius_user" : "user";
      }
    } else {
      console.warn("⚠️ No user found in localStorage (luxius_user or user)");
    }
  } catch (e) {
    console.error("Error parsing user from localStorage", e);
  }

  const handleLogout = () => {
    localStorage.removeItem("luxius_token");
    localStorage.removeItem("luxius_user");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Handle both 'role' and 'rol' properties from backend
  const rawRole = user.role || (user as any).rol || "cliente";
  // Normalize role
  let normalizedRole = String(rawRole).toLowerCase();
  if (normalizedRole === 'impresion') normalizedRole = 'impresor';

  console.log(`🔐 Role detected: ${rawRole} -> Normalized: ${normalizedRole}`);

  const menuItems = [
    // Common
    { label: "Panel Principal", path: `/dashboard/${normalizedRole}`, icon: LayoutDashboard, roles: ['admin', 'cliente', 'artista', 'impresor', 'taller'] },

    // Cliente
    { label: "Mis Pedidos", path: "/dashboard/cliente", icon: FileText, roles: ['cliente'] },
    { label: "Subir Archivos", path: "/dashboard/cliente/upload", icon: Upload, roles: ['cliente'] },
    { label: "Historial", path: "/dashboard/cliente/historial", icon: History, roles: ['cliente'] },
    { label: "Chat Soporte", path: "/dashboard/cliente/soporte", icon: MessageCircle, roles: ['cliente'] },

    // Artista
    { label: "Tareas de Diseño", path: "/dashboard/artista", icon: Brush, roles: ['artista'] },
    { label: "Ver Impresiones", path: "/dashboard/artista/estado", icon: Eye, roles: ['artista'] },
    { label: "Subir Archivos", path: "/dashboard/artista/upload", icon: Upload, roles: ['artista'] },
    { label: "Briefs", path: "/dashboard/artista/briefs", icon: FileText, roles: ['artista'] },
    { label: "Tiempo", path: "/dashboard/artista/tiempo", icon: BarChart3, roles: ['artista'] },

    // Impresor
    { label: "Trabajos Asignados", path: "/dashboard/impresor", icon: Printer, roles: ['impresor'] },
    { label: "Ver Impresiones", path: "/dashboard/impresor/estado", icon: Eye, roles: ['impresor'] },
    { label: "Stock", path: "/dashboard/impresor/stock", icon: Boxes, roles: ['impresor'] },
    { label: "Cargar Stock", path: "/dashboard/impresor/cargar-stock", icon: PackageSearch, roles: ['impresor'] },
    { label: "Logística", path: "/dashboard/impresor/logistica", icon: PackageSearch, roles: ['impresor'] },

    // Taller
    { label: "Taller", path: "/dashboard/taller/tareas", icon: PackageSearch, roles: ['taller'] },

    // Admin
    { label: "Usuarios", path: "/dashboard/admin/usuarios", icon: Users, roles: ['admin'] },
    { label: "Gestión Producción", path: "/dashboard/admin/stock", icon: Factory, roles: ['admin'] },
    { label: "Precios", path: "/dashboard/admin/precios", icon: DollarSign, roles: ['admin'] },
    { label: "Presupuestos", path: "/dashboard/admin/presupuestos", icon: Calculator, roles: ['admin'] },
    { label: "Reportes", path: "/dashboard/admin/reportes", icon: TrendingUp, roles: ['admin'] },
    { label: "Estadísticas", path: "/dashboard/admin/estadisticas", icon: BarChart3, roles: ['admin'] },
    { label: "Configuración", path: "/dashboard/admin/configuracion", icon: Settings, roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => {
    // FORCE SHOW ALL FOR ADMIN TO DEBUG AND FIX VISIBILITY
    if (['admin', 'administrador'].includes(normalizedRole)) return true;
    return item.roles.includes(normalizedRole);
  });

  return (
    <aside className="w-64 bg-white shadow-lg h-screen sticky top-0 flex flex-col z-40 overflow-y-auto">
      {/* Header + User Profile (Top) */}
      <div className="p-4 border-b border-gray-200 space-y-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-magenta-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
            L
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">LuXius</h1>
        </div>

        {/* User Profile Card (Discreet Link) */}
        <button
          onClick={() => navigate('/dashboard/profile')}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group border border-transparent hover:border-gray-100"
          title="Ver Mi Perfil"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700">{user.username}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{normalizedRole}</p>
          </div>
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {filteredItems.map((item, index) => {
          const Icon = item.icon;
          // Improved active check logic
          let isActive = false;
          if (item.path === `/dashboard/${normalizedRole}`) {
            isActive = location.pathname === item.path;
          } else {
            isActive = location.pathname.startsWith(item.path);
          }

          return (
            <Link
              key={index}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 w-full p-2.5 rounded-lg transition-colors font-medium text-sm ${isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-gray-200 mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full p-2.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
        <div className="text-xs text-center text-gray-300 mt-2">v2.2</div>
      </div>
    </aside>
  );
}
