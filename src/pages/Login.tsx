import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [rol, setRol] = useState("cliente");
  const navigate = useNavigate();

  // 🔄 Verificar si ya hay sesión activa al cargar
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user && user.username && user.rol) {
          console.log("🔄 Sesión activa detectada, redirigiendo a:", user.rol);
          navigate(`/dashboard/${user.rol}`, { replace: true });
        }
      } catch (error) {
        console.log("❌ Error al parsear usuario almacenado");
        localStorage.removeItem("user");
      }
    }
  }, [navigate]);

  const handleLogin = () => {
    if (!username.trim()) {
      alert("⚠️ Ingresá un nombre de usuario");
      return;
    }

    // Normalizar el nombre del rol
    const normalizedRol = rol === "impresion" ? "impresor" : rol;

    // Guardar usuario en localStorage
    const user = { username: username.trim(), rol: normalizedRol };
    localStorage.setItem("user", JSON.stringify(user));

    console.log("✅ Login exitoso:", user.username, "como", user.rol);

    // Redirigir al dashboard correspondiente
    navigate(`/dashboard/${normalizedRol}`, { replace: true });
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-96 space-y-4">
        <h2 className="text-xl font-bold text-center">🔐 Login a LuXius</h2>

        {/* Campo Usuario */}
        <input
          type="text"
          className="border p-2 w-full rounded"
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        {/* Selección de Rol */}
        <select
          className="border p-2 w-full rounded"
          value={rol}
          onChange={(e) => setRol(e.target.value)}
        >
          <option value="cliente">Cliente</option>
          <option value="artista">Arte</option>
          <option value="impresion">Impresión</option>
          <option value="admin">Administrador</option>
        </select>

        {/* Botón de Ingreso */}
        <button
          onClick={handleLogin}
          className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded w-full"
        >
          Ingresar
        </button>
      </div>
    </div>
  );
}
