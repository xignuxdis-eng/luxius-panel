import { useState } from "react";
import { FileText, Calendar, Download, Eye, X } from "lucide-react";

interface PedidoHistorico {
  id: string;
  titulo: string;
  estado: "completado" | "cancelado";
  fechaCreacion: string;
  fechaEntrega: string;
  archivos: string[];
  material: string;
  medidas: string;
  precio: number;
}

const historialInicial: PedidoHistorico[] = [
  {
    id: "HIST001",
    titulo: "Lonas para campaña electoral",
    estado: "completado",
    fechaCreacion: "2024-01-10",
    fechaEntrega: "2024-01-15",
    archivos: ["campana_electoral.pdf", "logo_partido.png"],
    material: "Lona Front Light",
    medidas: "3m x 6m",
    precio: 45000
  },
  {
    id: "HIST002",
    titulo: "Vinilos para vehículo comercial",
    estado: "completado",
    fechaCreacion: "2024-01-05",
    fechaEntrega: "2024-01-12",
    archivos: ["diseño_vehiculo.ai", "medidas.txt"],
    material: "Vinilo Vehicular O-3651",
    medidas: "50cm x 30cm",
    precio: 15000
  },
  {
    id: "HIST003",
    titulo: "Banners para evento corporativo",
    estado: "completado",
    fechaCreacion: "2024-01-01",
    fechaEntrega: "2024-01-08",
    archivos: ["banner_evento.psd", "colores_corporativos.pdf"],
    material: "Lona Back Light",
    medidas: "2m x 4m",
    precio: 28000
  }
];

export default function HistorialCliente() {
  const [historial, setHistorial] = useState<PedidoHistorico[]>(historialInicial);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [selectedFile, setSelectedFile] = useState<{pedido: PedidoHistorico, archivo: string} | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const historialFiltrado = filtroEstado === "todos" 
    ? historial 
    : historial.filter(pedido => pedido.estado === filtroEstado);

  const totalGastado = historial.reduce((sum, pedido) => sum + pedido.precio, 0);
  const pedidosCompletados = historial.filter(p => p.estado === "completado").length;

  const handlePreviewFile = (pedido: PedidoHistorico, archivo: string) => {
    setSelectedFile({ pedido, archivo });
    setShowPreview(true);
  };

  const isImageFile = (filename: string) => {
    return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filename);
  };

  const isPDFFile = (filename: string) => {
    return /\.pdf$/i.test(filename);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Historial de Pedidos 📋
        </h1>
        <p className="text-gray-600">
          Revisa todos tus pedidos anteriores y descarga los archivos finales.
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pedidos</p>
              <p className="text-2xl font-bold text-gray-900">{historial.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completados</p>
              <p className="text-2xl font-bold text-gray-900">{pedidosCompletados}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-purple-600 text-xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Gastado</p>
              <p className="text-2xl font-bold text-gray-900">${totalGastado.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filtrar por estado:</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos los pedidos</option>
            <option value="completado">Completados</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Pedidos Anteriores</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {historialFiltrado.map((pedido) => (
            <div key={pedido.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{pedido.titulo}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      pedido.estado === "completado" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {pedido.estado === "completado" ? "✅ Completado" : "❌ Cancelado"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                    <div>
                      <p><strong>Material:</strong> {pedido.material}</p>
                      <p><strong>Medidas:</strong> {pedido.medidas}</p>
                      <p><strong>Precio:</strong> ${pedido.precio.toLocaleString()}</p>
                    </div>
                    <div>
                      <p><strong>Creado:</strong> {new Date(pedido.fechaCreacion).toLocaleDateString('es-AR')}</p>
                      <p><strong>Entregado:</strong> {new Date(pedido.fechaEntrega).toLocaleDateString('es-AR')}</p>
                      <p><strong>Archivos:</strong> {pedido.archivos.length}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {pedido.archivos.map((archivo, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                        {archivo}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="ml-4 flex space-x-2">
                  {pedido.archivos.map((archivo, index) => (
                    <button
                      key={index}
                      onClick={() => handlePreviewFile(pedido, archivo)}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors flex items-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver {archivo}</span>
                    </button>
                  ))}
                  <button className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-200 transition-colors flex items-center space-x-1">
                    <Download className="w-4 h-4" />
                    <span>Descargar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {historialFiltrado.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No hay pedidos en el historial</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Preview */}
      {showPreview && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Preview: {selectedFile.archivo}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center">
              {isImageFile(selectedFile.archivo) ? (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Preview de imagen no disponible en modo demo
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {selectedFile.archivo}
                    </p>
                  </div>
                </div>
              ) : isPDFFile(selectedFile.archivo) ? (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Preview de PDF no disponible en modo demo
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {selectedFile.archivo}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Preview no disponible para este tipo de archivo
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {selectedFile.archivo}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Pedido:</strong> {selectedFile.pedido.titulo}</p>
              <p><strong>Archivo:</strong> {selectedFile.archivo}</p>
              <p><strong>Estado:</strong> {selectedFile.pedido.estado}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 