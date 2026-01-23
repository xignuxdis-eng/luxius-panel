import { useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Package, 
  FileText,
  Calendar,
  PieChart
} from "lucide-react";

interface Estadistica {
  titulo: string;
  valor: string | number;
  cambio: number;
  icono: any;
  color: string;
}

interface GraficoDatos {
  mes: string;
  ventas: number;
  pedidos: number;
  clientes: number;
}

const estadisticasIniciales: Estadistica[] = [
  {
    titulo: "Ventas del Mes",
    valor: "$450,000",
    cambio: 12.5,
    icono: DollarSign,
    color: "text-green-600"
  },
  {
    titulo: "Pedidos Activos",
    valor: 24,
    cambio: 8.2,
    icono: FileText,
    color: "text-blue-600"
  },
  {
    titulo: "Clientes Nuevos",
    valor: 15,
    cambio: -2.1,
    icono: Users,
    color: "text-purple-600"
  },
  {
    titulo: "Stock Bajo",
    valor: 3,
    cambio: 0,
    icono: Package,
    color: "text-red-600"
  }
];

const datosGrafico: GraficoDatos[] = [
  { mes: "Ene", ventas: 320000, pedidos: 18, clientes: 12 },
  { mes: "Feb", ventas: 380000, pedidos: 22, clientes: 15 },
  { mes: "Mar", ventas: 420000, pedidos: 25, clientes: 18 },
  { mes: "Abr", ventas: 390000, pedidos: 23, clientes: 16 },
  { mes: "May", ventas: 450000, pedidos: 24, clientes: 15 },
  { mes: "Jun", ventas: 480000, pedidos: 28, clientes: 20 }
];

export default function EstadisticasAdmin() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("mes");

  const getCambioColor = (cambio: number) => {
    return cambio >= 0 ? "text-green-600" : "text-red-600";
  };

  const getCambioIcono = (cambio: number) => {
    return cambio >= 0 ? "↗" : "↘";
  };

  const materialesMasVendidos = [
    { nombre: "Lona Front Light", cantidad: 45, porcentaje: 35 },
    { nombre: "Vinilo Vehicular O-3651", cantidad: 32, porcentaje: 25 },
    { nombre: "Lona Back Light", cantidad: 28, porcentaje: 22 },
    { nombre: "Vinilo Blanco Común", cantidad: 15, porcentaje: 12 },
    { nombre: "Vinilo Microperforado", cantidad: 8, porcentaje: 6 }
  ];

  const clientesTop = [
    { nombre: "Empresa Alfa", pedidos: 12, monto: 180000 },
    { nombre: "Grafica Beta", pedidos: 8, monto: 120000 },
    { nombre: "Marketing Digital Plus", pedidos: 6, monto: 95000 },
    { nombre: "Eventos Profesionales", pedidos: 5, monto: 75000 },
    { nombre: "Cliente Nuevo", pedidos: 4, monto: 60000 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Estadísticas del Negocio 📊
        </h1>
        <p className="text-gray-600">
          Análisis completo de ventas, pedidos y rendimiento del negocio.
        </p>
      </div>

      {/* Filtros de período */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Período:</label>
          <select
            value={periodoSeleccionado}
            onChange={(e) => setPeriodoSeleccionado(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
            <option value="trimestre">Este trimestre</option>
            <option value="año">Este año</option>
          </select>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {estadisticasIniciales.map((estadistica, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{estadistica.titulo}</p>
                <p className="text-2xl font-bold text-gray-900">{estadistica.valor}</p>
                <div className="flex items-center mt-2">
                  <span className={`text-sm ${getCambioColor(estadistica.cambio)}`}>
                    {getCambioIcono(estadistica.cambio)} {Math.abs(estadistica.cambio)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs mes anterior</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg bg-gray-100`}>
                <estadistica.icono className={`w-6 h-6 ${estadistica.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de ventas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Evolución de Ventas</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {datosGrafico.map((dato, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{dato.mes}</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">${dato.ventas.toLocaleString()}</span>
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-blue-600 rounded-full"
                          style={{ width: `${(dato.ventas / 500000) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Materiales más vendidos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Materiales Más Vendidos</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {materialesMasVendidos.map((material, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{material.nombre}</p>
                    <p className="text-xs text-gray-500">{material.cantidad} unidades</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-green-600 rounded-full"
                        style={{ width: `${material.porcentaje}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{material.porcentaje}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Clientes top */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Top 5 Clientes</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {clientesTop.map((cliente, index) => (
            <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{cliente.nombre}</h3>
                    <p className="text-sm text-gray-500">{cliente.pedidos} pedidos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${cliente.monto.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Total gastado</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Métricas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
              <p className="text-2xl font-bold text-gray-900">3.2 días</p>
              <p className="text-xs text-gray-500">Entrega de pedidos</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Satisfacción</p>
              <p className="text-2xl font-bold text-gray-900">4.8/5</p>
              <p className="text-xs text-gray-500">Calificación clientes</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PieChart className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Eficiencia</p>
              <p className="text-2xl font-bold text-gray-900">94%</p>
              <p className="text-xs text-gray-500">Trabajos a tiempo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 