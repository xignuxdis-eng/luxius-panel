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
import { apiService, Task } from "../services/api";

export default function PrintQueue() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const response = await apiService.getTasks();
        setTasks(response.tasks);
        setFilteredTasks(response.tasks);
        setError(null);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError('Error al cargar tareas');
        setTasks([]);
        setFilteredTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

  useEffect(() => {
    let filtered = tasks;

    // Filtrar por búsqueda
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.titulo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.order?.cliente?.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.order?.cliente?.apellido?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrar por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.estado === filterStatus);
    }

    // Filtrar por prioridad
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.prioridad === filterPriority);
    }

    setFilteredTasks(filtered);
  }, [tasks, searchQuery, filterStatus, filterPriority]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendiente': return <Clock className="w-4 h-4" />;
      case 'en_proceso': return <Printer className="w-4 h-4" />;
      case 'completado': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'en_proceso': return 'bg-blue-100 text-blue-800';
      case 'completado': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-100 text-red-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'baja': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (type: string) => {
    if (type?.includes('image')) return <Image className="w-4 h-4" />;
    if (type?.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Sin fecha";
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusChange = (taskId: number, newStatus: string) => {
    // Aquí se implementaría la lógica para cambiar el estado
    console.log(`Cambiando estado de tarea ${taskId} a ${newStatus}`);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(selectedTask?.id === task.id ? null : task);
  };

  const getStatusCount = (status: string) => {
    return tasks.filter(task => task.estado === status).length;
  };

  const getPriorityCount = (priority: string) => {
    return tasks.filter(task => task.prioridad === priority).length;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Cola de Impresión</h2>
        </div>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tareas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Cola de Impresión</h2>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Cola de Impresión</h2>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{getStatusCount('pendiente')} pendientes</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Printer className="w-4 h-4" />
              <span>{getStatusCount('en_proceso')} en proceso</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4" />
              <span>{getStatusCount('completado')} completados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4">
          {/* Búsqueda */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar tareas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro de estado */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="completado">Completado</option>
          </select>

          {/* Filtro de prioridad */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      {/* Lista de tareas */}
      <div className="divide-y divide-gray-200">
        {filteredTasks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No hay tareas que coincidan con los filtros.</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                selectedTask?.id === task.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => handleTaskClick(task)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      Tarea #{task.id}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.estado)}`}>
                      {task.estado}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.prioridad)}`}>
                      {task.prioridad}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-2">
                    {task.titulo}
                  </p>
                  
                  {task.descripcion && (
                    <p className="text-sm text-gray-500 mb-2">
                      {task.descripcion}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{task.order?.cliente?.nombre || "Cliente no especificado"}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{task.fecha_entrega ? formatDate(task.fecha_entrega) : "Sin fecha"}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileText className="w-4 h-4" />
                      <span>{task.order?.files?.length || 0} archivos</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(task.id, 'pendiente');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(task.id, 'en_proceso');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(task.id, 'completado');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 