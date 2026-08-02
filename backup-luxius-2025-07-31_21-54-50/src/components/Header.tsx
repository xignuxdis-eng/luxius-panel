import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const handleLogout = () => {
    localStorage.removeItem("user");
    console.log("🚪 Logout exitoso");
    navigate("/login", { replace: true });
  };

  if (!user) return null;

  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">🎨 LuXius Panel</h1>
          <span className="text-gray-300">|</span>
          <span className="text-sm">
            {user.username} ({user.rol})
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
        >
          🚪 Cerrar Sesión
        </button>
      </div>
    </header>
  );
} 