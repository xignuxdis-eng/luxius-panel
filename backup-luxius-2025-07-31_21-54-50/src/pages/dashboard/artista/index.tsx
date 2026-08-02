import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Clock, 
  FileText, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Download,
  ChevronLeft,
  ChevronRight,
  Upload,
  BarChart3,
  Settings
} from "lucide-react";
import TaskCard from "../../../components/TaskCard";
import AlertCard from "../../../components/AlertCard";
import TaskCalendar from "../../../components/TaskCalendar";
import { mockTareas, getTasksByStatus, getUrgentTasks, Task } from "../../../data/tasks";

// Datos simulados de alertas
const mockAlertas = [
  {
    id: "1",
    message: "El cliente modificó las medidas de Banner auto.",
    type: "warning" as const,
    timestamp: "2025-08-05T10:30:00",
    client: "Empresa Alfa"
  },
  {
    id: "2",
    message: "Trabajo urgente para Gráfica Beta",
    type: "error" as const,
    timestamp: "2025-08-05T09:15:00",
    client: "Grafica Beta"
  }
];

export default function DashboardArtista() {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const pendingTasks = getTasksByStatus("pendiente");
  const reviewTasks = getTasksByStatus("en revisión");
  const completedTasks = getTasksByStatus("completada");
  const urgentTasks = getUrgentTasks();

  const handleViewTaskDetails = (taskId: number) => {
    console.log("Ver detalles de tarea:", taskId);
    // Aquí se implementaría la lógica para ver detalles
  };

  const handleDownloadFiles = (taskId: number) => {
    console.log("Descargar archivos de tarea:", taskId);
    // Aquí se implementaría la lógica para descargar archivos
  };

  const handleUploadFiles = () => {
    navigate("/dashboard/artista/upload");
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date().getDate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Hola, {user?.username}! 👋
        </h1>
        <p className="text-gray-600">
          Bienvenido al panel de artista. Aquí verás tus tareas de diseño y podrás gestionar tus trabajos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tareas Pendientes */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Tareas Pendientes</h2>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {pendingTasks.length}
              </span>
            </div>
            
            <div className="space-y-4">
              {pendingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onViewDetails={handleViewTaskDetails}
                  onDownloadFiles={handleDownloadFiles}
                />
              ))}
              
              {pendingTasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No hay tareas pendientes</p>
                </div>
              )}
            </div>
          </div>

          {/* Calendario de Tareas */}
          <TaskCalendar />

          {/* Últimos Pendientes */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Últimos Pendientes</h2>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Alterar
              </button>
            </div>
            
            <div className="space-y-3">
              {mockTareas.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-900">{task.cliente}</p>
                      <p className="text-sm text-gray-600">{task.fechaEntrega}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.estado === "pendiente" ? "bg-gray-100 text-gray-800" :
                    task.estado === "en revisión" ? "bg-purple-100 text-purple-800" :
                    "bg-green-100 text-green-800"
                  }`}>
                    {task.estado}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Botón de Acción Principal */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Ir a Subir Archivos</h3>
              <p className="text-blue-100 mb-4">
                Sube tus diseños y gestiona los trabajos de tus clientes
              </p>
              <button 
                onClick={handleUploadFiles}
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Subir Archivos
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Derecho */}
        <div className="space-y-6">
          {/* Calendario */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {formatMonthYear(currentMonth)}
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => (
                <div
                  key={index}
                  className={`text-center text-sm py-2 ${
                    day === today ? 'bg-blue-500 text-white rounded-full' :
                    day === 2 ? 'border-2 border-blue-300 rounded-full' :
                    day === 13 ? 'border border-blue-200 rounded-full' :
                    'hover:bg-gray-100'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Últimos Archivos Subidos */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Últimos Archivos Subidos</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">mockup_producto.png</span>
              </div>
            </div>
          </div>

          {/* Alertas */}
          <AlertCard alerts={mockAlertas} />
        </div>
      </div>
    </div>
  );
}
