import { useState, useEffect } from "react";
import { 
  Printer, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Eye,
  Filter,
  Search,
  Calendar,
  User,
  Package,
  FileText,
  Image,
  File
} from "lucide-react";

interface PrintJob {
  id: string;
  title: string;
  clientName: string;
  designerName: string;
  status: 'pendiente' | 'en_proceso' | 'completado';
  priority: 'baja' | 'normal' | 'alta' | 'urgente';
  material: string;
  dimensions: {
    width: number;
    height: number;
  };
  copies: number;
  meters: number;
  createdAt: string;
  dueDate: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  thumbnail?: string;
}

export default function PrintQueue() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<PrintJob[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterMaterial, setFilterMaterial] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data para trabajos de impresión
  const mockJobs: PrintJob[] = [
    {
      id: '1',
      title: 'Banner Publicitario Empresa ABC',
      clientName: 'Empresa ABC',
      designerName: 'María González',
      status: 'pendiente',
      priority: 'urgente',
      material: 'Lona 440g',
      dimensions: { width: 300, height: 150 },
      copies: 1,
      meters: 45,
      createdAt: '2025-07-31T08:00:00',
      dueDate: '2025-08-01T18:00:00',
      fileUrl: '/api/files/banner_abc.pdf',
      fileType: 'application/pdf',
      fileSize: 2048576,
      thumbnail: 'https://via.placeholder.com/150x100/4F46E5/FFFFFF?text=Banner'
    },
    {
      id: '2',
      title: 'Vinilo Autoadhesivo Tienda XYZ',
      clientName: 'Tienda XYZ',
      designerName: 'Carlos Rodríguez',
      status: 'en_proceso',
      priority: 'alta',
      material: 'Vinilo 100 micras',
      dimensions: { width: 100, height: 50 },
      copies: 5,
      meters: 25,
      createdAt: '2025-07-30T14:30:00',
      dueDate: '2025-08-02T12:00:00',
      fileUrl: '/api/files/vinilo_xyz.ai',
      fileType: 'application/postscript',
      fileSize: 1048576,
      thumbnail: 'https://via.placeholder.com/150x100/10B981/FFFFFF?text=Vinilo'
    },
    {
      id: '3',
      title: 'Roll Banner Promocional',
      clientName: 'Startup Tech',
      designerName: 'Ana Martínez',
      status: 'completado',
      priority: 'normal',
      material: 'Lona 440g',
      dimensions: { width: 200, height: 80 },
      copies: 2,
      meters: 32,
      createdAt: '2025-07-29T10:15:00',
      dueDate: '2025-07-31T16:00:00',
      fileUrl: '/api/files/roll_banner.psd',
      fileType: 'image/vnd.adobe.photoshop',
      fileSize: 5242880,
      thumbnail: 'https://via.placeholder.com/150x100/F59E0B/FFFFFF?text=Roll'
    },
    {
      id: '4',
      title: 'Señalética Interior Oficina',
      clientName: 'Corporación Delta',
      designerName: 'Luis Pérez',
      status: 'pendiente',
      priority: 'baja',
      material: 'Vinilo 100 micras',
      dimensions: { width: 60, height: 40 },
      copies: 10,
      meters: 24,
      createdAt: '2025-07-31T09:45:00',
      dueDate: '2025-08-05T17:00:00',
      fileUrl: '/api/files/senaletica.pdf',
      fileType: 'application/pdf',
      fileSize: 1572864,
      thumbnail: 'https://via.placeholder.com/150x100/EF4444/FFFFFF?text=Señal'
    }
  ];

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setJobs(mockJobs);
      setFilteredJobs(mockJobs);
      setIsLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    // Filtrar trabajos
    let filtered = jobs;

    // Filtro por búsqueda
    if (searchQuery) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.designerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(job => job.status === filterStatus);
    }

    // Filtro por prioridad
    if (filterPriority !== 'all') {
      filtered = filtered.filter(job => job.priority === filterPriority);
    }

    // Filtro por material
    if (filterMaterial !== 'all') {
      filtered = filtered.filter(job => job.material === filterMaterial);
    }

    setFilteredJobs(filtered);
  }, [jobs, searchQuery, filterStatus, filterPriority, filterMaterial]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'en_proceso':
        return <Printer className="w-4 h-4 text-blue-500" />;
      case 'completado':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'en_proceso':
        return 'bg-blue-100 text-blue-800';
      case 'completado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-4 h-4 text-green-500" />;
    if (type.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
    if (type.includes("postscript") || type.includes("photoshop")) return <FileText className="w-4 h-4 text-blue-500" />;
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusChange = (jobId: string, newStatus: 'pendiente' | 'en_proceso' | 'completado') => {
    setJobs(prev => 
      prev.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      )
    );
  };

  const handleJobClick = (job: PrintJob) => {
    setSelectedJob(job);
  };

  const getMaterials = () => {
    const materials = [...new Set(jobs.map(job => job.material))];
    return materials;
  };

  const getStatusCount = (status: string) => {
    return jobs.filter(job => job.status === status).length;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Printer className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Cola de Impresión</h3>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span className="flex items-center space-x-1">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span>{getStatusCount('pendiente')}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Printer className="w-4 h-4 text-blue-500" />
              <span>{getStatusCount('en_proceso')}</span>
            </span>
            <span className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{getStatusCount('completado')}</span>
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar trabajos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En Proceso</option>
            <option value="completado">Completado</option>
          </select>

          {/* Priority Filter */}
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

          {/* Material Filter */}
          <select
            value={filterMaterial}
            onChange={(e) => setFilterMaterial(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los materiales</option>
            {getMaterials().map(material => (
              <option key={material} value={material}>{material}</option>
            ))}
          </select>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <Printer className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No se encontraron trabajos</p>
              <p className="text-sm text-gray-400">Intenta ajustar los filtros</p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => handleJobClick(job)}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start space-x-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-12 bg-gray-100 rounded border flex items-center justify-center">
                      {job.thumbnail ? (
                        <img 
                          src={job.thumbnail} 
                          alt={job.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        getFileIcon(job.fileType)
                      )}
                    </div>
                  </div>

                  {/* Job Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{job.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{job.clientName}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Package className="w-3 h-3" />
                            <span>{job.material}</span>
                          </span>
                          <span>{job.dimensions.width}×{job.dimensions.height} cm</span>
                          <span>{job.copies} copias</span>
                          <span>{job.meters} m²</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(job.priority)}`}>
                          {job.priority}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(job.status)}`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>Diseñador: {job.designerName}</span>
                        <span>Entrega: {formatDate(job.dueDate)}</span>
                        <span className="flex items-center space-x-1">
                          {getFileIcon(job.fileType)}
                          <span>{formatFileSize(job.fileSize)}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Descargar archivo
                            console.log('Descargar:', job.fileUrl);
                          }}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="Descargar archivo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        
                        {/* Status Actions */}
                        {job.status === 'pendiente' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(job.id, 'en_proceso');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                          >
                            Iniciar
                          </button>
                        )}
                        
                        {job.status === 'en_proceso' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(job.id, 'completado');
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                          >
                            Completar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{selectedJob.title}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Cliente: {selectedJob.clientName}</span>
                  <span>Diseñador: {selectedJob.designerName}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <AlertTriangle className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Detalles del Trabajo</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Material:</span>
                      <span className="font-medium">{selectedJob.material}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dimensiones:</span>
                      <span className="font-medium">{selectedJob.dimensions.width} × {selectedJob.dimensions.height} cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Copias:</span>
                      <span className="font-medium">{selectedJob.copies}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Metros cuadrados:</span>
                      <span className="font-medium">{selectedJob.meters} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Prioridad:</span>
                      <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(selectedJob.priority)}`}>
                        {selectedJob.priority}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Estado:</span>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedJob.status)}`}>
                        {selectedJob.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Fechas</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Creado:</span>
                      <span>{formatDate(selectedJob.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Entrega:</span>
                      <span>{formatDate(selectedJob.dueDate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                <h4 className="font-medium text-gray-800 mb-4">Archivo</h4>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      {getFileIcon(selectedJob.fileType)}
                      <div>
                        <p className="font-medium text-gray-900">{selectedJob.title}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(selectedJob.fileSize)}</p>
                      </div>
                    </div>
                    
                    {selectedJob.thumbnail && (
                      <div className="mb-3">
                        <img 
                          src={selectedJob.thumbnail} 
                          alt={selectedJob.title}
                          className="w-full h-32 object-cover rounded border"
                        />
                      </div>
                    )}
                    
                    <button
                      onClick={() => console.log('Descargar:', selectedJob.fileUrl)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Archivo</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-6 border-t border-gray-200 mt-6">
              {selectedJob.status === 'pendiente' && (
                <button
                  onClick={() => {
                    handleStatusChange(selectedJob.id, 'en_proceso');
                    setSelectedJob(null);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
                >
                  Iniciar Impresión
                </button>
              )}
              
              {selectedJob.status === 'en_proceso' && (
                <button
                  onClick={() => {
                    handleStatusChange(selectedJob.id, 'completado');
                    setSelectedJob(null);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg"
                >
                  Marcar como Completado
                </button>
              )}
              
              <button
                onClick={() => setSelectedJob(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 