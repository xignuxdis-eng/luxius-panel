
export default function Dashboard() {
  const user = localStorage.getItem("user") || "Invitado";
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Bienvenido, {user}</h1>
      <p className="text-gray-600">Este es tu panel interno de LuXius.</p>
    </div>
  );
}
