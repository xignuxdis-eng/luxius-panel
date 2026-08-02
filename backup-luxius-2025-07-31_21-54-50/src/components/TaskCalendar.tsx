import { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Circle,
  X
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'baja' | 'normal' | 'alta' | 'urgente';
  status: 'pendiente' | 'en_progreso' | 'completada';
  assignedTo: string;
  clientName: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'baja' | 'normal' | 'alta' | 'urgente';
  status: 'pendiente' | 'en_progreso' | 'completada';
  assignedTo: string;
  clientName: string;
  briefUrl?: string;
  specifications?: string;
  estimatedHours?: number;
  actualHours?: number;
}

export default function TaskCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data para tareas
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Diseño Logo Empresa ABC',
      description: 'Crear logo moderno para empresa de tecnología',
      dueDate: '2025-08-05',
      priority: 'alta',
      status: 'en_progreso',
      assignedTo: 'artista1',
      clientName: 'Empresa ABC'
    },
    {
      id: '2',
      title: 'Banner Web Promocional',
      description: 'Banner para campaña de verano',
      dueDate: '2025-08-10',
      priority: 'normal',
      status: 'pendiente',
      assignedTo: 'artista1',
      clientName: 'Tienda XYZ'
    },
    {
      id: '3',
      title: 'Ilustración Editorial',
      description: 'Ilustración para revista de moda',
      dueDate: '2025-08-15',
      priority: 'urgente',
      status: 'pendiente',
      assignedTo: 'artista1',
      clientName: 'Revista Moda'
    },
    {
      id: '4',
      title: 'Mockup Producto',
      description: 'Mockup para presentación de producto',
      dueDate: '2025-08-20',
      priority: 'baja',
      status: 'completada',
      assignedTo: 'artista1',
      clientName: 'Startup Tech'
    }
  ];

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setTasks(mockTasks);
      setIsLoading(false);
    }, 1000);
  }, []);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completada':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'en_progreso':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pendiente':
        return <Circle className="w-4 h-4 text-gray-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Días del mes anterior
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getTasksForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return tasks.filter(task => task.dueDate === dateString);
  };

  const handleDateClick = (date: Date) => {
    const tasksForDate = getTasksForDate(date);
    if (tasksForDate.length > 0) {
      // Mostrar primera tarea como detalle
      const taskDetail: TaskDetail = {
        ...tasksForDate[0],
        briefUrl: '/api/briefs/1',
        specifications: 'Diseño moderno y minimalista',
        estimatedHours: 8,
        actualHours: 4
      };
      setSelectedTask(taskDetail);
      setShowTaskDetail(true);
    }
  };

  const handleTaskClick = (task: Task) => {
    const taskDetail: TaskDetail = {
      ...task,
      briefUrl: `/api/briefs/${task.id}`,
      specifications: 'Especificaciones detalladas del proyecto',
      estimatedHours: Math.floor(Math.random() * 10) + 4,
      actualHours: Math.floor(Math.random() * 8) + 2
    };
    setSelectedTask(taskDetail);
    setShowTaskDetail(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Calendario de Tareas</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Semana
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h4 className="text-lg font-medium text-gray-700">
            {formatDate(currentDate)}
          </h4>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {days.map((day, index) => {
            const tasksForDay = day ? getTasksForDate(day) : [];
            const isToday = day && day.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`min-h-[80px] p-1 border border-gray-100 ${
                  isToday ? 'bg-blue-50 border-blue-200' : ''
                } ${day ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50'}`}
                onClick={() => day && handleDateClick(day)}
              >
                {day && (
                  <>
                    <div className={`text-sm font-medium ${
                      isToday ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1 mt-1">
                      {tasksForDay.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskClick(task);
                          }}
                          className={`text-xs p-1 rounded cursor-pointer ${getPriorityColor(task.priority)}`}
                        >
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(task.status)}
                            <span className="truncate">{task.title}</span>
                          </div>
                        </div>
                      ))}
                      {tasksForDay.length > 2 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{tasksForDay.length - 2} más
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Detail Modal */}
      {showTaskDetail && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Detalle de Tarea
              </h3>
              <button
                onClick={() => setShowTaskDetail(false)}
                className="hover:bg-gray-100 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task Info */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">{selectedTask.title}</h4>
                <p className="text-sm text-gray-600">{selectedTask.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Cliente</span>
                  <p className="text-sm font-medium">{selectedTask.clientName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Fecha de Entrega</span>
                  <p className="text-sm font-medium">{selectedTask.dueDate}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Prioridad</span>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Estado</span>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(selectedTask.status)}
                    <span className="text-sm capitalize">{selectedTask.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {selectedTask.specifications && (
                <div>
                  <span className="text-xs text-gray-500">Especificaciones</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedTask.specifications}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Horas Estimadas</span>
                  <p className="text-sm font-medium">{selectedTask.estimatedHours}h</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Horas Reales</span>
                  <p className="text-sm font-medium">{selectedTask.actualHours}h</p>
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm">
                  Ver Brief
                </button>
                <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded text-sm">
                  Editar Tarea
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 