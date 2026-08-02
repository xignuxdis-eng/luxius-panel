import { Navigate } from "react-router-dom";

export default function DashboardArtista() {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Hola, {user?.username}!</h1>
      <p className="text-gray-700">
        Bienvenido al panel de arte. Aquí verás tus tareas de diseño y podrás subir propuestas.
      </p>
    </div>
  );
}
