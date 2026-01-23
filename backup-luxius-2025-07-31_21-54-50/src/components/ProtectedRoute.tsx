import { Navigate, useLocation } from "react-router-dom";

interface ProtectedProps {
  children: JSX.Element;
  expectedRole?: string;
}

export default function ProtectedRoute({ children, expectedRole }: ProtectedProps) {
  const storedUser = localStorage.getItem("user");
  const location = useLocation();
  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;

    // 🔒 Si user es un objeto vacío, tratarlo como sesión inválida
    if (user && Object.keys(user).length === 0) {
      user = null;
    }
  } catch {
    user = null;
  }

  // ✅ Lista de roles válidos
  const allowedRoles = ["cliente", "artista", "impresor", "admin"];

  // ❌ No hay usuario válido → login
  if (
    !user ||
    typeof user.username !== "string" ||
    user.username.trim() === "" ||
    typeof user.rol !== "string" ||
    !allowedRoles.includes(user.rol)
  ) {
    console.log("🔴 Bloqueado acceso:", location.pathname, "- Usuario no válido");
    return <Navigate to="/login" replace />;
  }

  // 🔄 Si no se especifica rol esperado, redirigir al dashboard del usuario
  if (!expectedRole) {
    console.log("🔄 Redirigiendo a dashboard propio:", user.rol);
    return <Navigate to={`/dashboard/${user.rol}`} replace />;
  }

  // ❌ Rol incorrecto para la ruta
  if (user.rol !== expectedRole) {
    console.log("⚠️ Rol incorrecto:", user.rol, "vs", expectedRole, "- Redirigiendo a dashboard propio");
    return <Navigate to={`/dashboard/${user.rol}`} replace />;
  }

  // ✅ Acceso permitido
  console.log("✅ Acceso permitido:", user.username, "como", user.rol, "en", location.pathname);
  return children;
}
