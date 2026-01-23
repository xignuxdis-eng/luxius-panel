import { useState } from "react";
import { 
  Printer, 
  Package, 
  Truck, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText,
  BarChart3,
  Settings,
  Eye,
  Download
} from "lucide-react";
import PrintQueue from "../../../components/PrintQueue";

interface TrabajoImpresion {
  id: string;
  cliente: string;
  titulo: string;
  material: string;
  estado: "pendiente" | "en_impresion" | "completado" | "urgente";
  prioridad: "baja" | "media" | "alta";
  fechaEntrega: string;
  archivos: string[];
  medidas: string;
  cantidad: number;
}

interface StockMaterial {
  id: string;
  nombre: string;
  stock: number;
  unidad: string;
  minimo: number;
  estado: "disponible" | "bajo" | "agotado";
}

const trabajosIniciales: TrabajoImpresion[] = [
  {
    id: "IMP001",
    cliente: "Empresa Alfa",
    titulo: "Banner auto 3x6m",
    material: "Lona Front Light",
    estado: "en_impresion",
    prioridad: "alta",
    fechaEntrega: "2025-08-05",
    archivos: ["banner_auto.psd"],
    medidas: "3m x 6m",
    cantidad: 1
  },
  {
    id: "IMP002",
    cliente: "Grafica Beta",
    titulo: "Vinilos vehiculares",
    material: "Vinilo Vehicular O-3651",
    estado: "pendiente",
    prioridad: "media",
    fechaEntrega: "2025-08-06",
    archivos: ["logo_vehiculo.png"],
    medidas: "50cm x 30cm",
    cantidad: 10
  },
  {
    id: "IMP003",
    cliente: "Marketing Digital Plus",
    titulo: "Banner web urgente",
    material: "Lona Back Light",
    estado: "urgente",
    prioridad: "alta",
    fechaEntrega: "2025-08-03",
    archivos: ["banner_web.psd"],
    medidas: "2m x 4m",
    cantidad: 2
  }
];

const stockInicial: StockMaterial[] = [
  {
    id: "STK001",
    nombre: "Lona Front Light",
    stock: 150,
    unidad: "m²",
    minimo: 50,
    estado: "disponible"
  },
  {
    id: "STK002",
    nombre: "Lona Back Light",
    stock: 80,
    unidad: "m²",
    minimo: 50,
    estado: "disponible"
  },
  {
    id: "STK003",
    nombre: "Vinilo Vehicular O-3651",
    stock: 25,
    unidad: "m²",
    minimo: 30,
    estado: "bajo"
  },
  {
    id: "STK004",
    nombre: "Vinilo Blanco Común",
    stock: 0,
    unidad: "m²",
    minimo: 20,
    estado: "agotado"
  }
];

export default function DashboardImpresor() {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const [trabajos, setTrabajos] = useState<TrabajoImpresion[]>(trabajosIniciales);
  const [stock, setStock] = useState<StockMaterial[]>(stockInicial);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "pendiente": return "bg-yellow-100 text-yellow-800";
      case "en_impresion": return "bg-blue-100 text-blue-800";
      case "completado": return "bg-green-100 text-green-800";
      case "urgente": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case "pendiente": return "⏳ Pendiente";
      case "en_impresion": return "🖨️ En impresión";
      case "completado": return "✅ Completado";
      case "urgente": return "🚨 Urgente";
      default: return "❓ Desconocido";
    }
  };

  const getStockColor = (estado: string) => {
    switch (estado) {
      case "disponible": return "bg-green-100 text-green-800";
      case "bajo": return "bg-yellow-100 text-yellow-800";
      case "agotado": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const trabajosPendientes = trabajos.filter(t => t.estado === "pendiente" || t.estado === "urgente");
  const trabajosEnImpresion = trabajos.filter(t => t.estado === "en_impresion");
  const trabajosCompletados = trabajos.filter(t => t.estado === "completado");
  const stockBajo = stock.filter(s => s.estado === "bajo" || s.estado === "agotado");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          ¡Hola, {user?.username}! 🖨️
        </h1>
        <p className="text-gray-600">
          Panel de impresión. Gestiona tus trabajos, controla el stock y organiza la logística.
        </p>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Printer className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Trabajos Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{trabajosPendientes.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En Impresión</p>
              <p className="text-2xl font-bold text-gray-900">{trabajosEnImpresion.length}</p>
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
              <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-gray-900">{stockBajo.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cola de Impresión Optimizada */}
      <PrintQueue />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trabajos Asignados */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Trabajos Asignados</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {trabajos.map((trabajo) => (
              <div key={trabajo.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{trabajo.titulo}</h3>
                      {trabajo.prioridad === "alta" && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      Cliente: {trabajo.cliente} • Material: {trabajo.material}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Medidas: {trabajo.medidas} • Cantidad: {trabajo.cantidad}
                    </p>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(trabajo.estado)}`}>
                        {getEstadoTexto(trabajo.estado)}
                      </span>
                      <span className="text-sm text-gray-500">
                        Entrega: {new Date(trabajo.fechaEntrega).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex space-x-2">
                    <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-200 transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Control de Stock */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Control de Stock</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {stock.map((material) => (
              <div key={material.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{material.nombre}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Stock: {material.stock} {material.unidad} • Mínimo: {material.minimo} {material.unidad}
                    </p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockColor(material.estado)}`}>
                        {material.estado === "disponible" ? "✅ Disponible" :
                         material.estado === "bajo" ? "⚠️ Stock Bajo" : "🚨 Agotado"}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Cargar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logística */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Logística y Entregas</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Truck className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Entregas Hoy</h3>
              <p className="text-2xl font-bold text-blue-600">3</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Completadas</h3>
              <p className="text-2xl font-bold text-green-600">12</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Pendientes</h3>
              <p className="text-2xl font-bold text-yellow-600">5</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
