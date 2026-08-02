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
  TrendingUp,
  ClipboardList,
  Menu // Fallback generic icon
} from "lucide-react";
import { LucideIcon } from "lucide-react";

// ✅ Type Definitions
interface SidebarLink {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  // DEBUG: Track render
  console.log("🚀 APP-SIDEBAR v3.0 RESTORING...");

  // ✅ 1. User Retrieval (Robust)
  let user = { username: "Usuario", role: "cliente" };
  try {
    // Priority: luxius_user > user
    const rawUser = localStorage.getItem("luxius_user") || localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      // Update user only if parsed object has valid keys
      if (parsed && (parsed.username || parsed.role || parsed.rol)) {
        user = parsed;
      }
    }
  } catch (e) {
    console.error("Sidebar User Error:", e);
  }

  const handleLogout = () => {
    localStorage.removeItem("luxius_token");
    localStorage.removeItem("luxius_user");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // ✅ 2. Role Normalization
  // Some users have 'rol', others 'role'. Backend might send 'impresion' or 'impresor'.
  const rawRole = user.role || (user as any).rol || "cliente";
  let normalizedRole = String(rawRole).toLowerCase();

  // Fix specific role mismatch
  if (normalizedRole === 'impresion') normalizedRole = 'impresor';

  console.log(`👤 User: ${user.username}, Role: ${normalizedRole}`);

  // ✅ 3. Menu Configuration (Single Source of Truth)
  const menuItems: SidebarLink[] = [
    // --- Common ---
    { label: "Panel Principal", to: `/dashboard/${normalizedRole}`, icon: LayoutDashboard, roles: ['admin', 'cliente', 'artista', 'impresor', 'taller'] },

    // --- Cliente ---
    { label: "Mis Pedidos", to: "/dashboard/cliente", icon: FileText, roles: ['cliente'] },
    { label: "Subir Archivos", to: "/dashboard/cliente/upload", icon: Upload, roles: ['cliente'] },
    { label: "Historial", to: "/dashboard/cliente/historial", icon: History, roles: ['cliente'] },
    { label: "Chat Soporte", to: "/dashboard/cliente/soporte", icon: MessageCircle, roles: ['cliente'] },

    // --- Artista ---
    { label: "Tareas de Diseño", to: "/dashboard/artista", icon: Brush, roles: ['artista'] },
    { label: "Ver Impresiones", to: "/dashboard/artista/estado", icon: Eye, roles: ['artista'] },
    { label: "Subir Archivos", to: "/dashboard/artista/upload", icon: Upload, roles: ['artista'] },
    { label: "Briefs", to: "/dashboard/artista/briefs", icon: FileText, roles: ['artista'] },
    { label: "Tiempo", to: "/dashboard/artista/tiempo", icon: BarChart3, roles: ['artista'] },

    // --- Impresor ---
    { label: "Trabajos Asignados", to: "/dashboard/impresor", icon: Printer, roles: ['impresor'] },
    { label: "Ver Impresiones", to: "/dashboard/impresor/estado", icon: Eye, roles: ['impresor'] },
    { label: "Stock", to: "/dashboard/impresor/stock", icon: Boxes, roles: ['impresor'] },
    { label: "Cargar Stock", to: "/dashboard/impresor/cargar-stock", icon: PackageSearch, roles: ['impresor'] },
    { label: "Logística", to: "/dashboard/impresor/logistica", icon: PackageSearch, roles: ['impresor'] },

    // --- Taller ---
    { label: "Taller", to: "/dashboard/taller/tareas", icon: PackageSearch, roles: ['taller'] },

    // --- Admin (Full List) ---
    { label: "Usuarios", to: "/dashboard/admin/usuarios", icon: Users, roles: ['admin'] },
    { label: "Cargar Pedidos", to: "/dashboard/admin/upload", icon: Upload, roles: ['admin'] },
    { label: "Gestión Producción", to: "/dashboard/admin/ordenes", icon: ClipboardList, roles: ['admin'] },
    { label: "Stock", to: "/dashboard/admin/stock", icon: Factory, roles: ['admin'] },
    { label: "Precios", to: "/dashboard/admin/precios", icon: DollarSign, roles: ['admin'] },
    { label: "Presupuestos", to: "/dashboard/admin/presupuestos", icon: Calculator, roles: ['admin'] },
    { label: "Reportes", to: "/dashboard/admin/reportes", icon: TrendingUp, roles: ['admin'] },
    { label: "Estadísticas", to: "/dashboard/admin/estadisticas", icon: BarChart3, roles: ['admin'] },
    { label: "Configuración", to: "/dashboard/admin/configuracion", icon: Settings, roles: ['admin'] },
  ];

  // ✅ 4. Filter Logic
  const filteredItems = menuItems.filter(item => {
    // Admin sees all? No, admin sees admin items + common.
    // Actually, let's keep it strict to the 'roles' array.
    if (['admin', 'administrador'].includes(normalizedRole)) {
      // If the item allows 'admin', show it.
      if (item.roles.includes('admin')) return true;
    }
    return item.roles.includes(normalizedRole);
  });

  return (
    <aside className="w-64 bg-white shadow-lg h-screen sticky top-0 flex flex-col z-40 overflow-y-auto border-r border-gray-200">
      {/* --- HEADER --- */}
      <div className="p-4 border-b border-gray-200 space-y-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
            L
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">LuXius</h1>
        </div>

        {/* User Card */}
        <button
          onClick={() => navigate('/dashboard/profile')}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group border border-transparent hover:border-gray-100"
          title="Ver Mi Perfil"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-purple-700">{user.username}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{normalizedRole}</p>
          </div>
        </button>
      </div>

      {/* --- MENU --- */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredItems.map((item, index) => {
          // Safety fallback for Icon
          const Icon = item.icon || Menu;

          const isActive = location.pathname.startsWith(item.to);

          return (
            <Link
              key={index}
              to={item.to}
              className={`flex items-center gap-3 w-full p-2.5 rounded-lg transition-colors font-medium text-sm ${isActive
                ? "bg-purple-50 text-purple-700 shadow-sm"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-purple-600" : "text-gray-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* --- FOOTER --- */}
      <div className="p-4 border-t border-gray-200 mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full p-2.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
        <div className="text-[10px] text-center text-gray-300 mt-2 font-mono">v3.0-Stable</div>
      </div>
    </aside>
  );
}
