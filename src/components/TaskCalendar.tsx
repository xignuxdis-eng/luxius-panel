import { useState } from "react";
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
import { Task } from "../services/api";

interface TaskCalendarProps {
  tasks: Task[];
  currentMonth: Date;
}

interface TaskDetail {
  id: number;
  titulo: string;
  descripcion?: string;
  fecha_entrega?: string;
  prioridad: string;
  estado: string;
  order?: {
    cliente?: {
      nombre: string;
      apellido: string;
    };
  };
  notas?: string;
}

export default function TaskCalendar({ tasks, currentMonth }: TaskCalendarProps) {
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return 'bg-red-500 text-white';
      case 'alta':
        return 'bg-orange-500 text-white';
      case 'media':
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
      case 'en_revision':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pendiente':
        return <Circle className="w-4 h-4 text-gray-400" />;
      case 'urgente':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
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
    return tasks.filter(task => {
      if (!task.fecha_entrega) return false;
      const taskDate = new Date(task.fecha_entrega).toISOString().split('T')[0];
      return taskDate === dateString;
    });
  };

  const handleDateClick = (date: Date) => {
    const tasksForDate = getTasksForDate(date);
    if (tasksForDate.length > 0) {
      setSelectedTask(tasksForDate[0]);
      setShowTaskDetail(true);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long'
    });
  };

  const getClientName = (task: Task) => {
    if (task.order?.cliente) {
      return `${task.order.cliente.nombre} ${task.order.cliente.apellido}`;
    }
    return "Cliente no especificado";
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <>
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
                        className={`text-xs p-1 rounded cursor-pointer ${getPriorityColor(task.prioridad)}`}
                      >
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(task.estado)}
                          <span className="truncate">{task.titulo}</span>
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
                <h4 className="font-medium text-gray-800 mb-2">{selectedTask.titulo}</h4>
                {selectedTask.descripcion && (
                  <p className="text-sm text-gray-600">{selectedTask.descripcion}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Cliente</span>
                  <p className="text-sm font-medium">{getClientName(selectedTask)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Fecha de Entrega</span>
                  <p className="text-sm font-medium">
                    {selectedTask.fecha_entrega ? new Date(selectedTask.fecha_entrega).toLocaleDateString('es-AR') : "Sin fecha"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Prioridad</span>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${getPriorityColor(selectedTask.prioridad)}`}>
                    {selectedTask.prioridad}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Estado</span>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(selectedTask.estado)}
                    <span className="text-sm capitalize">{selectedTask.estado.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {selectedTask.notas && (
                <div>
                  <span className="text-xs text-gray-500">Notas</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedTask.notas}</p>
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm">
                  Ver Detalles
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