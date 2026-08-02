import React, { useState, useEffect } from 'react';
import { 
  PackageSearch, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  X,
  Bell,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface StockMaterial {
  id: number;
  nombre: string;
  stock: number;
  unidad: string;
  stockMinimo: number;
  stockMaximo: number;
  estado: 'bajo' | 'normal' | 'alto' | 'critico';
  ultimaActualizacion: string;
  proveedor: string;
  precioUnitario: number;
  categoria: string;
}

const stockInicial: StockMaterial[] = [
  {
    id: 1,
    nombre: "Lona Front Light",
    stock: 150,
    unidad: "m²",
    stockMinimo: 50,
    stockMaximo: 500,
    estado: "normal",
    ultimaActualizacion: "2025-01-30",
    proveedor: "Proveedor A",
    precioUnitario: 25.50,
    categoria: "Lonas"
  },
  {
    id: 2,
    nombre: "Lona Back Light",
    stock: 25,
    unidad: "m²",
    stockMinimo: 50,
    stockMaximo: 300,
    estado: "bajo",
    ultimaActualizacion: "2025-01-30",
    proveedor: "Proveedor B",
    precioUnitario: 30.00,
    categoria: "Lonas"
  },
  {
    id: 3,
    nombre: "Vinilo Vehicular O-3651",
    stock: 200,
    unidad: "m²",
    stockMinimo: 30,
    stockMaximo: 400,
    estado: "alto",
    ultimaActualizacion: "2025-01-30",
    proveedor: "Proveedor C",
    precioUnitario: 15.75,
    categoria: "Vinilos"
  },
  {
    id: 4,
    nombre: "Vinilo Microperforado",
    stock: 15,
    unidad: "m²",
    stockMinimo: 20,
    stockMaximo: 200,
    estado: "critico",
    ultimaActualizacion: "2025-01-30",
    proveedor: "Proveedor D",
    precioUnitario: 18.90,
    categoria: "Vinilos"
  },
  {
    id: 5,
    nombre: "Vinilo Autoadhesivo 100 micras",
    stock: 80,
    unidad: "m²",
    stockMinimo: 40,
    stockMaximo: 300,
    estado: "normal",
    ultimaActualizacion: "2025-01-30",
    proveedor: "Proveedor E",
    precioUnitario: 12.50,
    categoria: "Vinilos"
  },
  {
    id: 6,
    nombre: "Papel Fotográfico 200g",
    stock: 5,
    unidad: "m²",
    stockMinimo: 30,
    stockMaximo: 150,
    estado: "critico",
    ultimaActualizacion: "2025-01-30",
    proveedor: "Proveedor F",
    precioUnitario: 8.25,
    categoria: "Papeles"
  }
];

const getStockColor = (estado: string) => {
  switch (estado) {
    case 'critico': return 'text-red-600 bg-red-50 border-red-200';
    case 'bajo': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'normal': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'alto': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStockIcon = (estado: string) => {
  switch (estado) {
    case 'critico': return <AlertTriangle className="w-4 h-4" />;
    case 'bajo': return <AlertCircle className="w-4 h-4" />;
    case 'normal': return <Clock className="w-4 h-4" />;
    case 'alto': return <CheckCircle className="w-4 h-4" />;
    default: return <PackageSearch className="w-4 h-4" />;
  }
};

const getStockPercentage = (stock: number, maximo: number) => {
  return Math.min((stock / maximo) * 100, 100);
};

const getStockBarColor = (estado: string) => {
  switch (estado) {
    case 'critico': return 'bg-red-500';
    case 'bajo': return 'bg-orange-500';
    case 'normal': return 'bg-yellow-500';
    case 'alto': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

export default function StockImpresor() {
  const [stockData, setStockData] = useState<StockMaterial[]>(stockInicial);
  const [showAlert, setShowAlert] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const stockCritico = stockData.filter(item => item.estado === 'critico').length;
  const stockBajo = stockData.filter(item => item.estado === 'bajo').length;
  const stockTotal = stockData.length;

  const categories = [...new Set(stockData.map(item => item.categoria))];

  const filteredStock = stockData.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.proveedor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStockStatusText = (estado: string) => {
    switch (estado) {
      case 'critico': return 'Stock Crítico';
      case 'bajo': return 'Stock Bajo';
      case 'normal': return 'Stock Normal';
      case 'alto': return 'Stock Alto';
      default: return 'Stock Normal';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Stock</h1>
          <p className="text-gray-600">Gestión de materiales y inventario</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-500">Stock Crítico</div>
            <div className="text-2xl font-bold text-red-600">{stockCritico}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Stock Bajo</div>
            <div className="text-2xl font-bold text-orange-600">{stockBajo}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Materiales</div>
            <div className="text-2xl font-bold text-gray-900">{stockTotal}</div>
          </div>
        </div>
      </div>

      {/* Alertas Emergentes */}
      {(stockCritico > 0 || stockBajo > 0) && showAlert && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 relative">
          <button
            onClick={() => setShowAlert(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-medium text-red-800">Alertas de Stock</h3>
              <p className="text-sm text-red-700">
                {stockCritico > 0 && `${stockCritico} material${stockCritico > 1 ? 'es' : ''} en estado crítico`}
                {stockCritico > 0 && stockBajo > 0 && ' y '}
                {stockBajo > 0 && `${stockBajo} material${stockBajo > 1 ? 'es' : ''} con stock bajo`}
                {stockCritico === 0 && stockBajo === 0 && 'No hay alertas'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <PackageSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar materiales..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las categorías</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <button className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar Stock</span>
          </button>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stockData.reduce((sum, item) => sum + (item.stock * item.precioUnitario), 0))}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Materiales Críticos</p>
              <p className="text-2xl font-bold text-red-600">{stockCritico}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stock Bajo</p>
              <p className="text-2xl font-bold text-orange-600">{stockBajo}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stock Alto</p>
              <p className="text-2xl font-bold text-green-600">
                {stockData.filter(item => item.estado === 'alto').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Lista de Stock Mejorada */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Materiales Disponibles</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredStock.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <PackageSearch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No se encontraron materiales</p>
              <p className="text-sm text-gray-400">Intenta ajustar los filtros</p>
            </div>
          ) : (
            filteredStock.map((material) => (
              <div key={material.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{material.nombre}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStockColor(material.estado)}`}>
                        {getStockIcon(material.estado)}
                        {getStockStatusText(material.estado)}
                      </span>
                    </div>
                    
                    {/* Barra de progreso visual */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Stock: {material.stock} {material.unidad}</span>
                        <span>{getStockPercentage(material.stock, material.stockMaximo).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getStockBarColor(material.estado)}`}
                          style={{ width: `${getStockPercentage(material.stock, material.stockMaximo)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="text-gray-500">Mínimo:</span>
                        <span className="ml-1 font-medium">{material.stockMinimo} {material.unidad}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Máximo:</span>
                        <span className="ml-1 font-medium">{material.stockMaximo} {material.unidad}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Precio:</span>
                        <span className="ml-1 font-medium">{formatCurrency(material.precioUnitario)}/{material.unidad}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Proveedor:</span>
                        <span className="ml-1 font-medium">{material.proveedor}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      Última actualización: {material.ultimaActualizacion}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {material.estado === 'critico' && (
                      <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                        Reponer Urgente
                      </button>
                    )}
                    {material.estado === 'bajo' && (
                      <button className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors">
                        Reponer
                      </button>
                    )}
                    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                      Actualizar
                    </button>
                    <button className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
                      Detalles
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
          <PackageSearch className="w-5 h-5 text-blue-600" />
          <div className="text-left">
            <div className="font-medium text-blue-900">Cargar Stock</div>
            <div className="text-sm text-blue-700">Agregar nuevos materiales</div>
          </div>
        </button>
        
        <button className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
          <BarChart3 className="w-5 h-5 text-green-600" />
          <div className="text-left">
            <div className="font-medium text-green-900">Reporte de Stock</div>
            <div className="text-sm text-green-700">Generar informe mensual</div>
          </div>
        </button>
        
        <button className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <div className="text-left">
            <div className="font-medium text-orange-900">Alertas</div>
            <div className="text-sm text-orange-700">Configurar notificaciones</div>
          </div>
        </button>
        
        <button className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          <div className="text-left">
            <div className="font-medium text-purple-900">Análisis</div>
            <div className="text-sm text-purple-700">Ver tendencias de consumo</div>
          </div>
        </button>
      </div>
    </div>
  );
} 