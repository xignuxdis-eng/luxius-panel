import { useState } from "react";
import { MessageCircle, Send, Clock, User, FileText } from "lucide-react";

interface Mensaje {
  id: string;
  texto: string;
  esCliente: boolean;
  timestamp: string;
  leido: boolean;
}

interface Ticket {
  id: string;
  titulo: string;
  estado: "abierto" | "en_proceso" | "cerrado";
  prioridad: "baja" | "media" | "alta";
  fechaCreacion: string;
  ultimaActividad: string;
  mensajes: Mensaje[];
}

const ticketsIniciales: Ticket[] = [
  {
    id: "TICK001",
    titulo: "Consulta sobre medidas de banner",
    estado: "en_proceso",
    prioridad: "media",
    fechaCreacion: "2025-08-01T10:30:00",
    ultimaActividad: "2025-08-02T15:45:00",
    mensajes: [
      {
        id: "MSG001",
        texto: "Hola, necesito saber si pueden hacer un banner de 4x6 metros para mi evento.",
        esCliente: true,
        timestamp: "2025-08-01T10:30:00",
        leido: true
      },
      {
        id: "MSG002",
        texto: "Hola! Sí, podemos hacer ese tamaño. Te envío las especificaciones técnicas.",
        esCliente: false,
        timestamp: "2025-08-01T11:15:00",
        leido: true
      },
      {
        id: "MSG003",
        texto: "Perfecto, ¿cuál sería el precio aproximado?",
        esCliente: true,
        timestamp: "2025-08-02T15:45:00",
        leido: false
      }
    ]
  },
  {
    id: "TICK002",
    titulo: "Problema con archivo subido",
    estado: "abierto",
    prioridad: "alta",
    fechaCreacion: "2025-08-03T09:20:00",
    ultimaActividad: "2025-08-03T09:20:00",
    mensajes: [
      {
        id: "MSG004",
        texto: "No puedo subir mi archivo PSD, me da error. ¿Pueden ayudarme?",
        esCliente: true,
        timestamp: "2025-08-03T09:20:00",
        leido: false
      }
    ]
  }
];

export default function SoporteCliente() {
  const [tickets, setTickets] = useState<Ticket[]>(ticketsIniciales);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null);
  const [nuevoTicket, setNuevoTicket] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "media" as "baja" | "media" | "alta"
  });

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "abierto": return "bg-green-100 text-green-800";
      case "en_proceso": return "bg-yellow-100 text-yellow-800";
      case "cerrado": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "alta": return "bg-red-100 text-red-800";
      case "media": return "bg-yellow-100 text-yellow-800";
      case "baja": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
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

  const enviarMensaje = () => {
    if (!nuevoMensaje.trim() || !ticketSeleccionado) return;

    const mensaje: Mensaje = {
      id: `MSG${Date.now()}`,
      texto: nuevoMensaje,
      esCliente: true,
      timestamp: new Date().toISOString(),
      leido: false
    };

    const ticketActualizado = {
      ...ticketSeleccionado,
      mensajes: [...ticketSeleccionado.mensajes, mensaje],
      ultimaActividad: new Date().toISOString()
    };

    setTickets(tickets.map(t => t.id === ticketSeleccionado.id ? ticketActualizado : t));
    setTicketSeleccionado(ticketActualizado);
    setNuevoMensaje("");
  };

  const crearNuevoTicket = () => {
    if (!nuevoTicket.titulo.trim() || !nuevoTicket.descripcion.trim()) return;

    const ticket: Ticket = {
      id: `TICK${Date.now()}`,
      titulo: nuevoTicket.titulo,
      estado: "abierto",
      prioridad: nuevoTicket.prioridad,
      fechaCreacion: new Date().toISOString(),
      ultimaActividad: new Date().toISOString(),
      mensajes: [
        {
          id: `MSG${Date.now()}`,
          texto: nuevoTicket.descripcion,
          esCliente: true,
          timestamp: new Date().toISOString(),
          leido: false
        }
      ]
    };

    setTickets([ticket, ...tickets]);
    setNuevoTicket({ titulo: "", descripcion: "", prioridad: "media" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Chat de Soporte 💬
        </h1>
        <p className="text-gray-600">
          Comunícate con nuestro equipo de soporte para resolver dudas o reportar problemas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de tickets */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Mis Tickets</h2>
                <button
                  onClick={() => setTicketSeleccionado(null)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Nuevo Ticket
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setTicketSeleccionado(ticket)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    ticketSeleccionado?.id === ticket.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{ticket.titulo}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(ticket.estado)}`}>
                      {ticket.estado === "abierto" ? "🟢 Abierto" :
                       ticket.estado === "en_proceso" ? "🟡 En proceso" : "⚫ Cerrado"}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPrioridadColor(ticket.prioridad)}`}>
                      {ticket.prioridad === "alta" ? "🔴 Alta" :
                       ticket.prioridad === "media" ? "🟡 Media" : "🟢 Baja"}
                    </span>
                    <span>{formatTimestamp(ticket.ultimaActividad)}</span>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    {ticket.mensajes[ticket.mensajes.length - 1]?.texto.substring(0, 50)}...
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat o formulario nuevo ticket */}
        <div className="lg:col-span-2">
          {ticketSeleccionado ? (
            /* Chat del ticket seleccionado */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-96 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{ticketSeleccionado.titulo}</h3>
                <p className="text-sm text-gray-500">
                  Creado: {formatTimestamp(ticketSeleccionado.fechaCreacion)}
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {ticketSeleccionado.mensajes.map((mensaje) => (
                  <div
                    key={mensaje.id}
                    className={`flex ${mensaje.esCliente ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      mensaje.esCliente
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}>
                      <p className="text-sm">{mensaje.texto}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {formatTimestamp(mensaje.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    placeholder="Escribe tu mensaje..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === "Enter" && enviarMensaje()}
                  />
                  <button
                    onClick={enviarMensaje}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Formulario nuevo ticket */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Crear Nuevo Ticket</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título del ticket
                  </label>
                  <input
                    type="text"
                    value={nuevoTicket.titulo}
                    onChange={(e) => setNuevoTicket({...nuevoTicket, titulo: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Problema con archivo subido"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={nuevoTicket.descripcion}
                    onChange={(e) => setNuevoTicket({...nuevoTicket, descripcion: e.target.value})}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe tu problema o consulta..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={nuevoTicket.prioridad}
                    onChange={(e) => setNuevoTicket({...nuevoTicket, prioridad: e.target.value as "baja" | "media" | "alta"})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                
                <button
                  onClick={crearNuevoTicket}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Crear Ticket
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 