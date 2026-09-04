import { useState } from "react";

type Trabajo = {
  archivo: string;
  cliente: string;
  impreso: boolean;
};

const trabajosIniciales: Trabajo[] = [
  { archivo: "vehiculo1.pdf", cliente: "Juan", impreso: false },
  { archivo: "lonas_campaña.jpg", cliente: "Sol", impreso: true },
  { archivo: "calcomania_01.tif", cliente: "María", impreso: false },
];

export default function DashboardImpresion() {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  
  const [trabajos, setTrabajos] = useState<Trabajo[]>(trabajosIniciales);

  const marcarComoImpreso = (index: number) => {
    const nuevos = [...trabajos];
    nuevos[index].impreso = true;
    setTrabajos(nuevos);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Trabajos asignados</h1>
      <table className="w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-4 py-2">Archivo</th>
            <th className="text-left px-4 py-2">Cliente</th>
            <th className="text-left px-4 py-2">Estado</th>
            <th className="text-left px-4 py-2">Acción</th>
          </tr>
        </thead>
        <tbody>
          {trabajos.map((trabajo, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-2">{trabajo.archivo}</td>
              <td className="px-4 py-2">{trabajo.cliente}</td>
              <td className="px-4 py-2">
                {trabajo.impreso ? "Impreso ✅" : "Pendiente ⏳"}
              </td>
              <td className="px-4 py-2">
                {!trabajo.impreso && (
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                    onClick={() => marcarComoImpreso(i)}
                  >
                    Marcar como impreso
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
