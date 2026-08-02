
export default function Uploads() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Carga de archivos</h1>
      <div className="border-dashed border-2 p-8 text-center text-gray-500">
        Área para subir archivos (aún sin funcionalidad).
      </div>
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Trabajos subidos</h2>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left px-4 py-2">Archivo</th>
              <th className="text-left px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-2">diseño1.jpg</td>
              <td className="px-4 py-2">En espera</td>
            </tr>
            <tr>
              <td className="px-4 py-2">vehiculo_final.png</td>
              <td className="px-4 py-2">Procesado</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
