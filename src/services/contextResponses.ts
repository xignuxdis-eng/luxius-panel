import { UserContext, ROLE_RESPONSES, MOCK_DATA } from '../config/xanaConfig';

export function getContextualResponse(intent: string, context: UserContext): string {
  const rol = context.rol;
  const roleConfig = ROLE_RESPONSES[rol as keyof typeof ROLE_RESPONSES];

  switch (intent) {
    case "SALUDOS_CONVERSACION":
      return getSaludosResponse(context, roleConfig);
    
    case "CONSULTAS_PEDIDOS":
      return getPedidosResponse(context, roleConfig);
    
    case "SUBIDA_ARCHIVOS":
      return getArchivosResponse(context, roleConfig);
    
    case "MATERIALES_STOCK":
      return getStockResponse(context, roleConfig);
    
    case "CALCULO_PRECIOS":
      return getPreciosResponse(context, roleConfig);
    
    case "NAVEGACION_SISTEMA":
      return getNavegacionResponse(context, roleConfig);
    
    case "SOPORTE_TECNICO":
      return getSoporteResponse(context, roleConfig);
    
    case "INFORMACION_GENERAL":
      return getInformacionResponse(context, roleConfig);
    
    default:
      return getDefaultResponse(context);
  }
}

function getSaludosResponse(context: UserContext, roleConfig: any): string {
  const saludos = [
    `¡Hola ${context.username}! 👋 ¿En qué puedo ayudarte hoy en LuXius?`,
    `¡Hola! 😊 Soy Xana AI, tu asistente virtual. ¿Cómo puedo ayudarte con tu proyecto de impresión?`,
    `¡Buenos días! 🌟 ¿Qué necesitas hacer hoy en el sistema LuXius?`,
    `¡Hola! Soy Xana AI, tu asistente en LuXius. ¿Tienes alguna consulta sobre impresión, pedidos o materiales?`
  ];
  
  return saludos[Math.floor(Math.random() * saludos.length)];
}

function getPedidosResponse(context: UserContext, roleConfig: any): string {
  if (!roleConfig.canViewOrders) {
    return "No tienes permisos para ver información de pedidos.";
  }

  const pedidos = MOCK_DATA.pedidos;
  const pedidoId = context.idPedido || "12345";
  const pedido = pedidos[pedidoId as keyof typeof pedidos];

  if (pedido) {
    const estado = pedido.estado === "en_produccion" ? "en producción" : pedido.estado;
    return `Tu pedido #${pedidoId} está ${estado}. Se estima que esté listo el ${pedido.fecha_entrega}. Te enviaremos una notificación cuando esté completado.`;
  }

  return "No encontré información específica sobre tu pedido. ¿Podrías proporcionar el número de pedido?";
}

function getArchivosResponse(context: UserContext, roleConfig: any): string {
  if (!roleConfig.canUploadFiles) {
    return "No tienes permisos para subir archivos en tu rol actual. Esto es porque tu rol está enfocado en otras funcionalidades del sistema.";
  }

  return "Puedes subir archivos en los siguientes formatos: PDF, AI (Adobe Illustrator), PSD (Photoshop), EPS, JPG y PNG. Te recomendamos PDF o AI para mejor calidad porque mantienen la resolución en cualquier tamaño. El tamaño máximo por archivo es 50MB para optimizar el rendimiento del sistema.";
}

function getStockResponse(context: UserContext, roleConfig: any): string {
  if (!roleConfig.canViewStock) {
    return "Sí, tenemos disponibilidad para tu pedido. Nuestro equipo verificará el stock específico cuando proceses tu orden. Esto asegura que tengas la información más actualizada al momento de confirmar tu pedido.";
  }

  const stock = MOCK_DATA.stock;
  return `Stock actual disponible (verificado en tiempo real):
• Vinilo blanco: ${stock.vinilo.blanco} metros (ideal para letreros y decoración interior)
• Vinilo negro: ${stock.vinilo.negro} metros (perfecto para contraste en fondos claros)
• Lona premium: ${stock.lona.premium} metros (resistente a la intemperie, ideal para exteriores)
• Lona standard: ${stock.lona.standard} metros (económica para proyectos temporales)
• Papel fotográfico: ${stock.papel.fotográfico} hojas (alta calidad para impresiones fotográficas)

Recomendación: Para exteriores usa lona premium por su durabilidad, para interiores el vinilo es más económico.`;
}

function getPreciosResponse(context: UserContext, roleConfig: any): string {
  if (!roleConfig.canViewPrices) {
    return "Los precios se calculan automáticamente según los materiales y dimensiones seleccionados. Puedes ver el costo total antes de confirmar tu pedido. Esto te permite comparar opciones y elegir la mejor relación calidad-precio.";
  }

  const precios = MOCK_DATA.precios;
  return `Precios por metro cuadrado (actualizados):
• Lona premium: $${precios.lona_premium} (resistente a la intemperie, 3 años de garantía)
• Lona standard: $${precios.lona_standard} (económica, ideal para eventos temporales)
• Vinilo blanco/negro: $${precios.vinilo_blanco} (versátil, perfecto para interiores)
• Papel fotográfico: $${precios.papel_fotografico} (alta resolución, ideal para fotos)

Ejemplo: Un banner de 2x3 metros en lona premium costaría $${precios.lona_premium * 6} porque incluye material resistente y acabado profesional.

Recomendación: Para exteriores invierte en lona premium por durabilidad, para interiores el vinilo es más económico.`;
}

function getNavegacionResponse(context: UserContext, roleConfig: any): string {
  const rol = context.rol;
  
  switch (rol) {
    case "cliente":
      return "Como cliente, puedes acceder a: 'Mis Pedidos' para ver tus pedidos, 'Subir Archivos' para cargar tus diseños, y 'Historial' para ver pedidos anteriores.";
    
    case "artista":
      return "Como artista, puedes acceder a: 'Tareas de Diseño' para ver trabajos asignados, 'Briefs Recibidos' para ver especificaciones, y 'Tiempo de Trabajo' para gestionar tu tiempo.";
    
    case "impresor":
      return "Como impresor, puedes acceder a: 'Trabajos Asignados' para ver pedidos en producción, 'Stock' para gestionar materiales, y 'Logística' para organizar entregas.";
    
    case "admin":
      return "Como administrador, puedes acceder a: 'Panel General' para ver estadísticas, 'Usuarios' para gestionar cuentas, 'Stock' para control de materiales, y 'Configuración' para ajustes del sistema.";
    
    default:
      return "Puedes navegar por el sistema usando el menú lateral. Cada rol tiene acceso a diferentes funcionalidades según sus permisos.";
  }
}

function getSoporteResponse(context: UserContext, roleConfig: any): string {
  return `Si tienes problemas técnicos, puedes:
1. Recargar la página (Ctrl+F5)
2. Verificar tu conexión a internet
3. Limpiar el caché del navegador
4. Contactar soporte técnico en soporte@luxius.com

¿En qué puedo ayudarte específicamente?`;
}

function getInformacionResponse(context: UserContext, roleConfig: any): string {
  return "¡Hola! Soy Xana AI, tu asistente virtual en LuXius. LuXius es una plataforma completa de gestión de impresión que conecta clientes, artistas, impresores y administradores. Puedo ayudarte con consultas sobre pedidos, archivos, materiales, precios y navegación del sistema. ¿En qué puedo ayudarte hoy?";
}

function getDefaultResponse(context: UserContext): string {
  return "Entiendo tu consulta. ¿Podrías ser más específico? Puedo ayudarte con información sobre pedidos, archivos, materiales, precios, navegación del sistema o soporte técnico.";
} 