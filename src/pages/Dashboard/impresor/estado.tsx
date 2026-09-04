import { useState } from "react";
import { Eye, Download, Clock, CheckCircle, AlertTriangle, Printer, Package } from "lucide-react";

interface TrabajoImpresion {
  id: string;
  cliente: string;
  titulo: string;
  material: string;
  estado: "pendiente" | "en_impresion" | "completado" | "entregado";
  fechaCreacion: string;
  fechaEntrega: string;
  archivos: string[];
  medidas: string;
  cantidad: number;
  prioridad: "baja" | "media" | "alta";
  artista: string;
}

const trabajosIniciales: TrabajoImpresion[] = [
  {
    id: "IMP001",
    cliente: "Empresa Alfa",
    titulo: "Banner auto 3x6m",
    material: "Lona Front Light",
    estado: "en_impresion",
    fechaCreacion: "2025-08-01",
    fechaEntrega: "2025-08-05",
    archivos: ["banner_auto.psd"],
    medidas: "3m x 6m",
    cantidad: 1,
    prioridad: "alta",
    artista: "María González"
  },
  {
    id: "IMP002",
    cliente: "Grafica Beta",
    titulo: "Vinilos vehiculares",
    material: "Vinilo Vehicular O-3651",
    estado: "pendiente",
    fechaCreacion: "2025-08-02",
    fechaEntrega: "2025-08-06",
    archivos: ["logo_vehiculo.png"],
    medidas: "50cm x 30cm",
    cantidad: 10,
    prioridad: "media",
    artista: "Carlos Rodríguez"
  },
  {
    id: "IMP003",
    cliente: "Marketing Digital Plus",
    titulo: "Banner web urgente",
    material: "Lona Back Light",
    estado: "completado",
    fechaCreacion: "2025-08-01",
    fechaEntrega: "2025-08-03",
    archivos: ["banner_web.psd"],
    medidas: "2m x 4m",
    cantidad: 2,
    prioridad: "alta",
    artista: "Ana Martínez"
  }
];

export default function EstadoImpresionesImpresor() {
  const [trabajos, setTrabajos] = useState<TrabajoImpresion[]>(trabajosIniciales);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");

  const trabajosFiltrados = filtroEstado === "todos" 
    ? trabajos 
    : trabajos.filter(trabajo => trabajo.estado === filtroEstado);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "pendiente": return "bg-yellow-100 text-yellow-800";
      case "en_impresion": return "bg-blue-100 text-blue-800";
      case "completado": return "bg-green-100 text-green-800";
      case "entregado": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case "pendiente": return "⏳ Pendiente";
      case "en_impresion": return "🖨️ En impresión";
      case "completado": return "✅ Completado";
      case "entregado": return "📦 Entregado";
      default: return "❓ Desconocido";
    }
  };

  const getPrioridadIcon = (prioridad: string) => {
    switch (prioridad) {
      case "alta": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "media": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "baja": return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const marcarComoImpreso = (id: string) => {
    setTrabajos(trabajos.map(trabajo => 
      trabajo.id === id 
        ? { ...trabajo, estado: "completado" as const }
        : trabajo
    ));
  };

  const trabajosPendientes = trabajos.filter(t => t.estado === "pendiente" || t.estado === "en_impresion");
  const trabajosCompletados = trabajos.filter(t => t.estado === "completado" || t.estado === "entregado");
  const trabajosUrgentes = trabajos.filter(t => t.prioridad === "alta" && (t.estado === "pendiente" || t.estado === "en_impresion"));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Estado de Impresiones 🖨️
        </h1>
        <p className="text-gray-600">
          Control y seguimiento de todos los trabajos de impresión asignados.
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Printer className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En Proceso</p>
              <p className="text-2xl font-bold text-gray-900">{trabajosPendientes.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completados</p>
              <p className="text-2xl font-bold text-gray-900">{trabajosCompletados.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Urgentes</p>
              <p className="text-2xl font-bold text-gray-900">{trabajosUrgentes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{trabajos.length}</p>
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
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_impresion">En impresión</option>
            <option value="completado">Completados</option>
            <option value="entregado">Entregados</option>
          </select>
        </div>
      </div>

      {/* Lista de trabajos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Trabajos de Impresión</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {trabajosFiltrados.map((trabajo) => (
            <div key={trabajo.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{trabajo.titulo}</h3>
                    {getPrioridadIcon(trabajo.prioridad)}
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-2">
                    Cliente: {trabajo.cliente} • Artista: {trabajo.artista}
                  </p>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    Material: {trabajo.material} • Medidas: {trabajo.medidas} • Cantidad: {trabajo.cantidad}
                  </p>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(trabajo.estado)}`}>
                      {getEstadoTexto(trabajo.estado)}
                    </span>
                    <span className="text-sm text-gray-500">
                      Entrega: {new Date(trabajo.fechaEntrega).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    {trabajo.archivos.map((archivo, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                        {archivo}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="ml-4 flex space-x-2">
                  <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>Ver</span>
                  </button>
                  <button className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-200 transition-colors flex items-center space-x-1">
                    <Download className="w-4 h-4" />
                    <span>Descargar</span>
                  </button>
                  {trabajo.estado === "en_impresion" && (
                    <button 
                      onClick={() => marcarComoImpreso(trabajo.id)}
                      className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-sm hover:bg-purple-200 transition-colors flex items-center space-x-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Completar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {trabajosFiltrados.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Printer className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No hay trabajos con el filtro seleccionado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 