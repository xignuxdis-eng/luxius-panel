import { useState } from "react";
import { 
  FileText, 
  Clock, 
  User, 
  AlertTriangle,
  Eye,
  Download,
  Calendar,
  Tag,
  Filter,
  Search,
  Grid,
  List,
  FileImage,
  X
} from "lucide-react";

interface Brief {
  id: string;
  title: string;
  clientName: string;
  description: string;
  dueDate: string;
  priority: 'baja' | 'normal' | 'alta' | 'urgente';
  status: 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';
  files: {
    id: string;
    name: string;
    type: 'image' | 'pdf' | 'other';
    url: string;
    thumbnail?: string;
  }[];
  specifications: string;
  createdAt: string;
}

export default function BriefsArtista() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);

  // Mock data para briefs
  const mockBriefs: Brief[] = [
    {
      id: '1',
      title: 'Diseño Logo Corporativo',
      clientName: 'Empresa ABC',
      description: 'Necesitamos un logo moderno y profesional para nuestra empresa de tecnología',
      dueDate: '2025-08-15',
      priority: 'alta',
      status: 'pendiente',
      files: [
        {
          id: '1',
          name: 'referencias_logo.pdf',
          type: 'pdf',
          url: '/api/files/1',
          thumbnail: 'https://via.placeholder.com/150x200/4F46E5/FFFFFF?text=PDF'
        },
        {
          id: '2',
          name: 'paleta_colores.jpg',
          type: 'image',
          url: '/api/files/2',
          thumbnail: 'https://via.placeholder.com/150x200/10B981/FFFFFF?text=IMG'
        }
      ],
      specifications: 'Logo minimalista, colores azul y blanco, formato vectorial',
      createdAt: '2025-07-30'
    },
    {
      id: '2',
      title: 'Banner Web Promocional',
      clientName: 'Tienda XYZ',
      description: 'Banner para campaña de verano con elementos tropicales',
      dueDate: '2025-08-10',
      priority: 'normal',
      status: 'en_revision',
      files: [
        {
          id: '3',
          name: 'brief_detallado.pdf',
          type: 'pdf',
          url: '/api/files/3',
          thumbnail: 'https://via.placeholder.com/150x200/4F46E5/FFFFFF?text=PDF'
        }
      ],
      specifications: 'Dimensiones 1200x400px, estilo tropical, colores vibrantes',
      createdAt: '2025-07-28'
    },
    {
      id: '3',
      title: 'Ilustración Editorial',
      clientName: 'Revista Moda',
      description: 'Ilustración para artículo sobre tendencias de moda',
      dueDate: '2025-08-20',
      priority: 'urgente',
      status: 'pendiente',
      files: [
        {
          id: '4',
          name: 'referencias_ilustracion.jpg',
          type: 'image',
          url: '/api/files/4',
          thumbnail: 'https://via.placeholder.com/150x200/10B981/FFFFFF?text=IMG'
        },
        {
          id: '5',
          name: 'especificaciones.pdf',
          type: 'pdf',
          url: '/api/files/5',
          thumbnail: 'https://via.placeholder.com/150x200/4F46E5/FFFFFF?text=PDF'
        }
      ],
      specifications: 'Estilo editorial, blanco y negro, formato A4',
      createdAt: '2025-07-25'
    },
    {
      id: '4',
      title: 'Mockup Producto',
      clientName: 'Startup Tech',
      description: 'Mockup para presentación de producto en conferencia',
      dueDate: '2025-08-25',
      priority: 'baja',
      status: 'aprobado',
      files: [
        {
          id: '6',
          name: 'producto_referencia.jpg',
          type: 'image',
          url: '/api/files/6',
          thumbnail: 'https://via.placeholder.com/150x200/10B981/FFFFFF?text=IMG'
        }
      ],
      specifications: 'Mockup realista, fondo neutro, alta resolución',
      createdAt: '2025-07-20'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return 'bg-red-500 text-white';
      case 'alta':
        return 'bg-orange-500 text-white';
      case 'normal':
        return 'bg-blue-500 text-white';
      case 'baja':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprobado':
        return 'bg-green-100 text-green-800';
      case 'en_revision':
        return 'bg-yellow-100 text-yellow-800';
      case 'rechazado':
        return 'bg-red-100 text-red-800';
      case 'pendiente':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'image':
        return <FileImage className="w-4 h-4 text-green-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredBriefs = mockBriefs.filter(brief => {
    const matchesSearch = brief.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         brief.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || brief.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || brief.status === filterStatus;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const handleBriefClick = (brief: Brief) => {
    setSelectedBrief(brief);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Briefs Recibidos 📋
        </h1>
        <p className="text-gray-600">
          Instrucciones y especificaciones de los clientes para tus diseños.
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar briefs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las prioridades</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="normal">Normal</option>
              <option value="baja">Baja</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_revision">En Revisión</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid' 
                    ? 'bg-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list' 
                    ? 'bg-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Briefs Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {filteredBriefs.map((brief) => (
          <div
            key={brief.id}
            onClick={() => handleBriefClick(brief)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 line-clamp-2">
                  {brief.title}
                </h3>
                <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(brief.priority)}`}>
                  {brief.priority}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <User className="w-4 h-4" />
                <span>{brief.clientName}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Entrega: {new Date(brief.dueDate).toLocaleDateString('es-AR')}</span>
              </div>
            </div>

            {/* Files Preview */}
            {brief.files.length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Archivos ({brief.files.length})</span>
                </div>
                
                <div className="flex space-x-2 overflow-x-auto">
                  {brief.files.slice(0, 3).map((file) => (
                    <div key={file.id} className="flex-shrink-0">
                      <div className="w-16 h-20 bg-gray-100 rounded border flex items-center justify-center">
                        {file.thumbnail ? (
                          <img 
                            src={file.thumbnail} 
                            alt={file.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          getFileIcon(file.type)
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate w-16">
                        {file.name}
                      </p>
                    </div>
                  ))}
                  {brief.files.length > 3 && (
                    <div className="flex-shrink-0 w-16 h-20 bg-gray-100 rounded border flex items-center justify-center">
                      <span className="text-xs text-gray-500">+{brief.files.length - 3}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="p-4">
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                {brief.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(brief.status)}`}>
                  {brief.status.replace('_', ' ')}
                </span>
                
                <div className="flex items-center space-x-2">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredBriefs.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 border border-gray-200 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-2">No se encontraron briefs</p>
          <p className="text-sm text-gray-400">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}

      {/* Brief Detail Modal */}
      {selectedBrief && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {selectedBrief.title}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Cliente: {selectedBrief.clientName}</span>
                  <span>Fecha: {new Date(selectedBrief.createdAt).toLocaleDateString('es-AR')}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedBrief(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Descripción</h4>
                  <p className="text-gray-600">{selectedBrief.description}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Especificaciones</h4>
                  <p className="text-gray-600">{selectedBrief.specifications}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500">Prioridad</span>
                    <div className="mt-1">
                      <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(selectedBrief.priority)}`}>
                        {selectedBrief.priority}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Estado</span>
                    <div className="mt-1">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedBrief.status)}`}>
                        {selectedBrief.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                <h4 className="font-medium text-gray-800 mb-4">Archivos Adjuntos</h4>
                <div className="space-y-3">
                  {selectedBrief.files.map((file) => (
                    <div key={file.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                      <div className="w-12 h-16 bg-gray-100 rounded border flex items-center justify-center">
                        {file.thumbnail ? (
                          <img 
                            src={file.thumbnail} 
                            alt={file.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          getFileIcon(file.type)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {file.type.toUpperCase()}
                        </p>
                      </div>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-6 border-t border-gray-200 mt-6">
              <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg">
                Ver Detalles Completos
              </button>
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg">
                Descargar Archivos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 