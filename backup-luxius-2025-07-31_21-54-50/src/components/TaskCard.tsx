import { Calendar, Clock, FileText, User, AlertTriangle, CheckCircle, Eye, Download } from "lucide-react";
import { Task } from "../data/tasks";

interface TaskCardProps {
  task: Task;
  onViewDetails?: (taskId: number) => void;
  onDownloadFiles?: (taskId: number) => void;
}

export default function TaskCard({ task, onViewDetails, onDownloadFiles }: TaskCardProps) {
  const getStatusColor = (status: Task["estado"]) => {
    switch (status) {
      case "pendiente":
        return "bg-gray-100 text-gray-800";
      case "en revisión":
        return "bg-purple-100 text-purple-800";
      case "completada":
        return "bg-green-100 text-green-800";
      case "urgente":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityIcon = (priority: Task["prioridad"]) => {
    switch (priority) {
      case "alta":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "media":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "baja":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <User className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">{task.cliente}</h3>
            {getPriorityIcon(task.prioridad)}
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(task.fechaEntrega)}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.estado)}`}>
              {task.estado}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-700">{task.notas}</p>
        
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {task.archivos.length} archivo{task.archivos.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex space-x-2 mt-3">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(task.id)}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Ver</span>
            </button>
          )}
          
          {onDownloadFiles && (
            <button
              onClick={() => onDownloadFiles(task.id)}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descargar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 