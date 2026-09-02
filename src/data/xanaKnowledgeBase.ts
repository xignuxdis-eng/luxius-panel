export const xanaKnowledgeBase = {
  cliente: [
    {
      q: ["¿Qué formatos de archivo aceptan?", "formatos de archivo", "qué archivos", "tipos de archivo"],
      a: "Aceptamos PDF, AI, PSD, EPS, JPG y PNG. Para mejor calidad, recomendamos PDF o AI porque mantienen la resolución en cualquier tamaño."
    },
    {
      q: ["¿Cómo subo mis archivos?", "subir archivos", "subida de archivos", "cargar archivos"],
      a: "Ve a tu panel y selecciona 'Subir archivos'. Puedes arrastrar y soltar tus archivos o buscarlos en tu dispositivo. El tamaño máximo es 50MB por archivo."
    },
    {
      q: ["¿Cuál es el estado de mi pedido", "estado de pedido", "mi pedido", "progreso"],
      a: "Puedes ver el estado actual de tus pedidos en la sección 'Mis pedidos'. Los estados pueden ser: Pendiente, En diseño, En producción o Completado."
    },
    {
      q: ["¿Qué materiales tienen?", "materiales disponibles", "tipos de material"],
      a: "Trabajamos con vinilo (para interiores), lona (para exteriores), papel fotográfico y otros materiales. Cada material tiene características específicas para diferentes usos."
    },
    {
      q: ["¿Puedo cancelar un pedido?", "cancelar pedido", "anular pedido"],
      a: "Puedes solicitar la cancelación mientras el pedido esté en estado 'Pendiente'. Una vez en producción, no es posible cancelar."
    },
    {
      q: ["¿Cuánto tarda mi pedido?", "tiempo de entrega", "cuándo estará listo"],
      a: "Los tiempos varían según el tipo de trabajo: Diseños simples (1-2 días), Impresiones (3-5 días), Trabajos complejos (5-7 días). Te notificamos en cada etapa."
    },
    {
      q: ["¿Cómo calculo el precio?", "precio", "costo", "cuánto cuesta"],
      a: "Los precios se calculan automáticamente según materiales y dimensiones. Puedes ver el costo total antes de confirmar tu pedido en la calculadora."
    }
  ],
  artista: [
    {
      q: ["¿Dónde veo mis trabajos asignados?", "trabajos asignados", "mis tareas"],
      a: "En tu panel encontrarás la sección 'Mis trabajos', donde puedes ver cada pedido asignado y su estado actual con todos los detalles."
    },
    {
      q: ["¿Puedo subir versiones revisadas?", "nueva versión", "revisión de diseño", "actualizar diseño"],
      a: "Sí, en cada pedido asignado puedes subir nuevas versiones y dejar comentarios para el cliente. El sistema mantiene un historial de versiones."
    },
    {
      q: ["¿Cómo marco un diseño como terminado?", "terminar diseño", "finalizar diseño"],
      a: "Abre el pedido, revisa los detalles y selecciona 'Marcar como finalizado'. El cliente recibirá una notificación automática."
    },
    {
      q: ["¿Qué información necesito del cliente?", "información del cliente", "brief"],
      a: "Revisa la sección 'Briefs' donde encontrarás las especificaciones del cliente, dimensiones, materiales y cualquier comentario especial."
    },
    {
      q: ["¿Puedo comunicarme con el cliente?", "contactar cliente", "mensaje al cliente"],
      a: "Sí, puedes dejar comentarios en cada pedido que el cliente podrá ver. También puedes solicitar información adicional si es necesario."
    }
  ],
  impresor: [
    {
      q: ["¿Dónde veo los trabajos pendientes de impresión?", "cola de impresión", "trabajos por imprimir"],
      a: "En la sección 'Trabajos asignados' verás todos los archivos listos para imprimir, con sus materiales, medidas y prioridades."
    },
    {
      q: ["¿Cómo marco un trabajo como impreso?", "marcar impreso", "completar impresión"],
      a: "Selecciona el pedido en la lista y haz clic en 'Marcar como impreso'. El sistema actualizará el estado y lo notificará automáticamente."
    },
    {
      q: ["¿Puedo ver el stock actual?", "ver stock", "materiales disponibles"],
      a: "Sí, en tu panel tienes acceso a 'Ver stock' para consultar materiales disponibles y 'Cargar stock' para actualizaciones."
    },
    {
      q: ["¿Qué materiales necesito para este trabajo?", "materiales del trabajo", "qué material usar"],
      a: "En cada pedido verás especificado el material requerido, las dimensiones y cualquier instrucción especial de impresión."
    },
    {
      q: ["¿Cómo organizo la logística?", "logística", "entregas"],
      a: "En la sección 'Logística' puedes ver los trabajos completados pendientes de entrega y organizar las rutas de distribución."
    }
  ],
  admin: [
    {
      q: ["¿Cómo gestiono usuarios?", "gestionar usuarios", "crear usuario"],
      a: "En tu panel tienes la sección 'Usuarios' donde puedes crear, editar o eliminar cuentas y asignar roles según los permisos necesarios."
    },
    {
      q: ["¿Puedo ver estadísticas de producción?", "estadísticas", "reportes"],
      a: "Sí, en 'Estadísticas' encontrarás informes de trabajos completados, tiempos de producción, uso de materiales y rendimiento del equipo."
    },
    {
      q: ["¿Cómo actualizo el stock global?", "gestionar stock", "actualizar materiales"],
      a: "Ve a 'Gestión de stock' y ajusta los materiales y cantidades según sea necesario. Los cambios se reflejan en tiempo real para todo el sistema."
    },
    {
      q: ["¿Puedo ver el rendimiento del equipo?", "rendimiento", "productividad"],
      a: "En 'Estadísticas' puedes ver métricas de productividad por artista e impresor, tiempos promedio y eficiencia del sistema."
    },
    {
      q: ["¿Cómo configuro el sistema?", "configuración", "ajustes"],
      a: "En 'Configuración' puedes modificar parámetros del sistema, roles, permisos y configuraciones generales de LuXius."
    },
    {
      q: ["¿Cómo sincronizo los datos o actualizo la versión?", "sincronizar", "sync", "no veo cambios", "actualizar versión"],
      a: "Haz clic en el botón '🔄 SINCRONIZAR' en la barra superior (Header). Esto limpia cachés obsoletos, purga ServiceWorkers y carga los datos y versiones más recientes desde la base de datos central en la nube."
    },
    {
      q: ["¿Dónde se guardan los archivos y cómo funcionan las descargas y previews?", "archivos", "descargas", "preview", "cloudflare r2"],
      a: "Todos los archivos adjuntos se sincronizan automáticamente con Cloudflare R2 (luxius-media). El sistema los transmite en tiempo real para previsualización y descarga segura desde cualquier dispositivo sin restricciones de dominio."
    }
  ]
}; 