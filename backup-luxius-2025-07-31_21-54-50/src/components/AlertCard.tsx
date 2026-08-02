import { AlertTriangle, Clock, User } from "lucide-react";

interface Alert {
  id: string;
  message: string;
  type: "warning" | "error" | "info";
  timestamp: string;
  client?: string;
}

interface AlertCardProps {
  alerts: Alert[];
}

export default function AlertCard({ alerts }: AlertCardProps) {
  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "info":
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAlertColor = (type: Alert["type"]) => {
    switch (type) {
      case "warning":
        return "bg-orange-50 border-orange-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "info":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Alertas</h3>
      
      <div className="space-y-3">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-start space-x-3">
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{alert.message}</p>
                  {alert.client && (
                    <div className="flex items-center space-x-1 mt-1">
                      <User className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-600">{alert.client}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{formatTimestamp(alert.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay alertas pendientes</p>
          </div>
        )}
      </div>
    </div>
  );
} 