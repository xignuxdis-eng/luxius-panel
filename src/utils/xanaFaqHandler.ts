import { xanaKnowledgeBase } from "../data/xanaKnowledgeBase";

export function buscarRespuestaPredefinida(rol: string, mensaje: string): string | null {
  const data = xanaKnowledgeBase[rol as keyof typeof xanaKnowledgeBase] || [];
  const lowerMsg = mensaje.toLowerCase();

  for (const item of data) {
    if (item.q.some(p => lowerMsg.includes(p.toLowerCase()))) {
      return item.a;
    }
  }

  return null; // No encontrada
}

export function filtrarRespuestaPorRol(respuesta: string, rol: string): string {
  // Filtros de seguridad para ocultar información sensible según el rol
  const filtros = {
    cliente: {
      // Los clientes no deben ver información interna de stock exacto
      patrones: [
        { regex: /stock.*metros.*vinilo.*lona/gi, reemplazo: "Tenemos disponibilidad de materiales para tu pedido." },
        { regex: /precios.*detallados.*internos/gi, reemplazo: "Los precios se calculan automáticamente según tus especificaciones." }
      ]
    },
    artista: {
      // Los artistas pueden ver información limitada de producción
      patrones: [
        { regex: /stock.*exacto.*metros/gi, reemplazo: "Los materiales están disponibles para los trabajos asignados." }
      ]
    },
    impresor: {
      // Los impresores pueden ver información completa de stock
      patrones: [] // Sin filtros para impresores
    },
    admin: {
      // Los admins pueden ver toda la información
      patrones: [] // Sin filtros para admins
    }
  };

  let respuestaFiltrada = respuesta;
  const filtro = filtros[rol as keyof typeof filtros];

  if (filtro) {
    filtro.patrones.forEach(({ regex, reemplazo }) => {
      respuestaFiltrada = respuestaFiltrada.replace(regex, reemplazo);
    });
  }

  return respuestaFiltrada;
} 
