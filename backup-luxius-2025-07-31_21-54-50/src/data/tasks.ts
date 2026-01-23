export interface TaskFile {
  nombre: string;
  link: string;
  estado: "pendiente" | "en revisión" | "completada" | "urgente";
}

export interface Task {
  id: number;
  cliente: string;
  archivos: TaskFile[];
  fechaEntrega: string;
  notas: string;
  estado: "pendiente" | "en revisión" | "completada" | "urgente";
  prioridad: "baja" | "media" | "alta";
  artistaAsignado?: string;
}

export const mockTareas: Task[] = [
  {
    id: 1,
    cliente: "Empresa Alfa",
    archivos: [
      { nombre: "banner_auto.psd", link: "/uploads/banner_auto.psd", estado: "pendiente" }
    ],
    fechaEntrega: "2025-08-05",
    notas: "Cliente pide fondo azul",
    estado: "pendiente",
    prioridad: "media"
  },
  {
    id: 2,
    cliente: "Grafica Beta",
    archivos: [
      { nombre: "logo_vehiculo.png", link: "/uploads/logo_vehiculo.png", estado: "en revisión" }
    ],
    fechaEntrega: "2025-08-06",
    notas: "Revisión de medidas",
    estado: "en revisión",
    prioridad: "alta"
  },
  {
    id: 3,
    cliente: "Cliente Nuevo",
    archivos: [
      { nombre: "rediseño_tarjeta.ai", link: "/uploads/rediseño_tarjeta.ai", estado: "completada" }
    ],
    fechaEntrega: "2025-08-11",
    notas: "Diseño finalizado",
    estado: "completada",
    prioridad: "baja"
  },
  {
    id: 4,
    cliente: "Marketing Digital Plus",
    archivos: [
      { nombre: "banner_web.psd", link: "/uploads/banner_web.psd", estado: "urgente" }
    ],
    fechaEntrega: "2025-08-03",
    notas: "URGENTE - Necesita para mañana",
    estado: "urgente",
    prioridad: "alta"
  },
  {
    id: 5,
    cliente: "Eventos Profesionales",
    archivos: [
      { nombre: "folleto_evento.pdf", link: "/uploads/folleto_evento.pdf", estado: "pendiente" },
      { nombre: "invitaciones.indd", link: "/uploads/invitaciones.indd", estado: "pendiente" }
    ],
    fechaEntrega: "2025-08-08",
    notas: "Diseño completo para evento corporativo",
    estado: "pendiente",
    prioridad: "media"
  }
];

export const getTasksByStatus = (status: Task["estado"]) => {
  return mockTareas.filter(task => task.estado === status);
};

export const getTasksByPriority = (priority: Task["prioridad"]) => {
  return mockTareas.filter(task => task.prioridad === priority);
};

export const getUrgentTasks = () => {
  return mockTareas.filter(task => task.estado === "urgente" || task.prioridad === "alta");
};

export const getTasksByClient = (clientName: string) => {
  return mockTareas.filter(task => task.cliente.toLowerCase().includes(clientName.toLowerCase()));
}; 