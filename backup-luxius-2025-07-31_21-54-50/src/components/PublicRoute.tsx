import { Navigate } from "react-router-dom";

export default function PublicRoute({ children }: { children: JSX.Element }) {
  const storedUser = localStorage.getItem("user");
  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }

  // Si hay usuario logueado, enviarlo a su dashboard
  if (user && user.username && user.rol) {
    return <Navigate to={`/dashboard/${user.rol}`} replace />;
  }

  return children;
}
