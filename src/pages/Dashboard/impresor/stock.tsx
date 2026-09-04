import React, { useState, useEffect } from 'react';
import { 
  PackageSearch, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  AlertCircle,
  X,
  Bell,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { getMateriales, refreshCollection, saveMaterial } from '@/data/db';
import type { Material } from '@/types';

export default function StockImpresor() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [showAlert, setShowAlert] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = () => {
    const list = getMateriales().filter(m => m.habilitado !== false);
    setMateriales(list);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshCollection('materiales');
      loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    refreshCollection('materiales').then(() => loadData());
  }, []);

  const getStatus = (m: Material): 'critico' | 'bajo' | 'normal' | 'alto' => {
    const stock = m.stockActual || 0;
    const min = m.stockMinimo || 10;
    if (stock <= 0) return 'critico';
    if (stock <= min) return 'bajo';
    if (stock <= min * 3) return 'normal';
    return 'alto';
  };

  const stockCritico = materiales.filter(item => getStatus(item) === 'critico').length;
  const stockBajo = materiales.filter(item => getStatus(item) === 'bajo').length;
  const stockTotal = materiales.length;

  const categories = [...new Set(materiales.map(item => item.tipo || 'Sustrato'))];

  const filteredStock = materiales.filter(item => {
    const matchesSearch = item.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || (item.tipo || 'Sustrato') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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

  const getStockStatusText = (estado: string) => {
    switch (estado) {
      case 'critico': return 'Stock Crítico';
      case 'bajo': return 'Stock Bajo';
      case 'normal': return 'Stock Normal';
      case 'alto': return 'Stock Óptimo';
      default: return 'Stock Normal';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Stock (Impresor)</h1>
          <p className="text-gray-600">Gestión de insumos sincronizado con PostgreSQL</p>
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
          
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Actualizar Stock'}</span>
          </button>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Valor Estimado</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(materiales.reduce((sum, item) => sum + ((item.stockActual || 0) * (item.precioM2 || 0)), 0))}
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
              <p className="text-sm text-gray-500">Stock Óptimo</p>
              <p className="text-2xl font-bold text-green-600">
                {materiales.filter(item => getStatus(item) === 'alto').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Lista de Stock Real */}
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
            filteredStock.map((material) => {
              const status = getStatus(material);
              const stock = material.stockActual || 0;
              const min = material.stockMinimo || 10;
              const pct = Math.min(100, Math.round((stock / (min * 3)) * 100));

              return (
                <div key={material.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">{material.codigo}</span>
                        <h3 className="font-medium text-gray-900">{material.descripcion}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStockColor(status)}`}>
                          {getStockIcon(status)}
                          {getStockStatusText(status)}
                        </span>
                      </div>
                      
                      {/* Barra de progreso visual */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Stock: {stock} {material.unidad || 'm²'}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${status === 'critico' ? 'bg-red-500' : status === 'bajo' ? 'bg-orange-500' : 'bg-green-500'}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="text-gray-500">Calidad:</span>
                          <span className="ml-1 font-medium">{material.calidad}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Mínimo:</span>
                          <span className="ml-1 font-medium">{material.stockMinimo || 10} {material.unidad || 'm²'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Precio Ref:</span>
                          <span className="ml-1 font-medium">{formatCurrency(material.precioM2 || 0)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Tipo:</span>
                          <span className="ml-1 font-medium">{material.tipo}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}