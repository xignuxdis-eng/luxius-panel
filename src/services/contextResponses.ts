import { UserContext, ROLE_RESPONSES } from '../config/xanaConfig';
import { getOrdenes, getMateriales } from '../data/db';

/**
 * Generates contextual responses using REAL data from the local store
 * (synced from the backend) instead of hardcoded MOCK_DATA.
 */
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

  // Use REAL orders from the synced store
  const ordenes = getOrdenes() || [];
  const pedidoId = context.idPedido;

  if (pedidoId) {
    const orden = ordenes.find((o: any) =>
      String(o.ot) === String(pedidoId) ||
      String(o.id) === String(pedidoId) ||
      String(o.uuid) === String(pedidoId)
    );
    if (orden) {
      const statusLabel: Record<string, string> = {
        relevamiento: 'en relevamiento', diseno: 'en diseño', orden: 'lista para imprimir',
        impreso: 'impresa', post: 'en terminaciones', completo: 'lista para entregar',
        entregado: 'entregada', anulado: 'anulada', standby: 'en pausa'
      };
      const estado = statusLabel[(orden as any).status] || (orden as any).status;
      const entrega = (orden as any).fechaEntrega ? ` | Entrega estimada: ${(orden as any).fechaEntrega}` : '';
      return `Tu orden ${(orden as any).ot || pedidoId} está ${estado}${entrega}. Cliente: ${(orden as any).clienteNombre || 'N/A'}.`;
    }
  }

  // Show summary of recent orders
  const active = ordenes.filter((o: any) => !['entregado', 'anulado', 'eliminado', 'finalizado'].includes((o as any).status));
  if (active.length > 0) {
    const summary = active.slice(0, 3).map((o: any) =>
      `• ${o.ot}: ${o.clienteNombre || 'Cliente'} — ${o.status}`
    ).join('\n');
    return `Tienes ${active.length} órdenes activas. Las más recientes:\n${summary}\n\n¿Necesitas detalles de alguna orden específica?`;
  }

  return "No encontré órdenes activas en el sistema. ¿Podrías proporcionar el número de orden?";
}

function getArchivosResponse(context: UserContext, roleConfig: any): string {
  if (!roleConfig.canUploadFiles) {
    return "No tienes permisos para subir archivos en tu rol actual. Esto es porque tu rol está enfocado en otras funcionalidades del sistema.";
  }

  return "Puedes subir archivos en los siguientes formatos: PDF, AI (Adobe Illustrator), PSD (Photoshop), EPS, JPG y PNG. Te recomendamos PDF o AI para mejor calidad porque mantienen la resolución en cualquier tamaño. El tamaño máximo por archivo es 50MB para optimizar el rendimiento del sistema.";
}

function getStockResponse(context: UserContext, roleConfig: any): string {
  if (!roleConfig.canViewStock) {
    return "Sí, tenemos disponibilidad para tu pedido. Nuestro equipo verificará el stock específico cuando proceses tu orden.";
  }

  // Use REAL materials from the synced store
  const materiales = getMateriales() || [];

  if (materiales.length === 0) {
    return "No hay datos de stock cargados en el sistema. Sincroniza desde el menú Sistema.";
  }

  // Group materials by type
  const byType: Record<string, { items: any[]; totalStock: number }> = {};
  for (const m of materiales) {
    const tipo = (m as any).tipo || (m as any).categoria || 'General';
    if (!byType[tipo]) byType[tipo] = { items: [], totalStock: 0 };
    byType[tipo].items.push(m);
    byType[tipo].totalStock += Number((m as any).stockActual || (m as any).stock || 0);
  }

  const lines = Object.entries(byType)
    .sort((a, b) => b[1].totalStock - a[1].totalStock)
    .slice(0, 6)
    .map(([tipo, data]) => {
      const unit = tipo.toLowerCase().includes('tinta') ? 'L' : 'm²';
      return `• ${tipo}: ${data.totalStock.toFixed(1)} ${unit} (${data.items.length} variantes)`;
    });

  return `Stock actual disponible (${materiales.length} materiales registrados):\n${lines.join('\n')}\n\nPara ver el detalle completo, ve a la sección de Stock.`;
}

function getPreciosResponse(context: UserContext, roleConfig: any): string {
  if (!roleConfig.canViewPrices) {
    return "Los precios se calculan automáticamente según los materiales y dimensiones seleccionados. Puedes ver el costo total antes de confirmar tu pedido.";
  }

  // Use REAL materials for pricing
  const materiales = getMateriales() || [];
  const conPrecio = materiales.filter((m: any) => Number(m.precioML || m.precio || 0) > 0);

  if (conPrecio.length === 0) {
    return "No hay precios cargados en el sistema todavía. Los precios se configuran desde ABM Materiales.";
  }

  const lines = conPrecio.slice(0, 6).map((m: any) => {
    const precio = Number(m.precioML || m.precio || 0);
    const unit = m.tipoCobro || 'm²';
    return `• ${m.descripcion || m.nombre}: $${precio.toLocaleString()} /${unit}`;
  });

  return `Precios actualizados (${conPrecio.length} materiales con precio):\n${lines.join('\n')}\n\nLos precios se calculan automáticamente al crear un pedido según dimensiones y material.`;
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
4. Contactar soporte técnico

¿En qué puedo ayudarte específicamente?`;
}

function getInformacionResponse(context: UserContext, roleConfig: any): string {
  return "¡Hola! Soy Xana AI, tu asistente virtual en LuXius. LuXius es una plataforma completa de gestión de impresión que conecta clientes, artistas, impresores y administradores. Puedo ayudarte con consultas sobre pedidos, archivos, materiales, precios y navegación del sistema. ¿En qué puedo ayudarte hoy?";
}

function getDefaultResponse(context: UserContext): string {
  return "Entiendo tu consulta. ¿Podrías ser más específico? Puedo ayudarte con información sobre pedidos, archivos, materiales, precios, navegación del sistema o soporte técnico.";
}