export interface IntentClassification {
  intent: string;
  confidence: number;
  keywords: string[];
}

export function classifyUserIntent(input: string): IntentClassification {
  const text = input.toLowerCase();
  const keywords: string[] = [];
  let confidence = 0.5;

  // CONSULTAS_PEDIDOS
  if (text.includes("pedido") || text.includes("orden") || text.includes("estado")) {
    keywords.push("pedido", "orden", "estado");
    confidence = 0.9;
    return { intent: "CONSULTAS_PEDIDOS", confidence, keywords };
  }

  // SUBIDA_ARCHIVOS
  if (text.includes("archivo") || text.includes("subir") || text.includes("formato") || text.includes("pdf") || text.includes("ai") || text.includes("psd")) {
    keywords.push("archivo", "subir", "formato");
    confidence = 0.85;
    return { intent: "SUBIDA_ARCHIVOS", confidence, keywords };
  }

  // MATERIALES_STOCK
  if (text.includes("material") || text.includes("stock") || text.includes("vinilo") || text.includes("lona") || text.includes("papel") || text.includes("tela")) {
    keywords.push("material", "stock");
    confidence = 0.8;
    return { intent: "MATERIALES_STOCK", confidence, keywords };
  }

  // CALCULO_PRECIOS
  if (text.includes("precio") || text.includes("costo") || text.includes("cuánto") || text.includes("calcula") || text.includes("metros") || text.includes("banner")) {
    keywords.push("precio", "costo", "calcula");
    confidence = 0.85;
    return { intent: "CALCULO_PRECIOS", confidence, keywords };
  }

  // NAVEGACION_SISTEMA
  if (text.includes("dónde") || text.includes("cómo") || text.includes("encontrar") || text.includes("acceder") || text.includes("cambiar")) {
    keywords.push("navegación", "sistema");
    confidence = 0.7;
    return { intent: "NAVEGACION_SISTEMA", confidence, keywords };
  }

  // SOPORTE_TECNICO
  if (text.includes("problema") || text.includes("error") || text.includes("soporte") || text.includes("ayuda") || text.includes("no funciona")) {
    keywords.push("problema", "error", "soporte");
    confidence = 0.8;
    return { intent: "SOPORTE_TECNICO", confidence, keywords };
  }

  // SALUDOS_CONVERSACION
  if (text.includes("hola") || text.includes("buenos") || text.includes("buenas") || text.includes("como estas") || text.includes("qué tal") || text.includes("saludos")) {
    keywords.push("saludo", "conversación");
    confidence = 0.9;
    return { intent: "SALUDOS_CONVERSACION", confidence, keywords };
  }

  // INFORMACION_GENERAL
  if (text.includes("qué es") || text.includes("luxius") || text.includes("sistema") || text.includes("funciona")) {
    keywords.push("información", "general");
    confidence = 0.6;
    return { intent: "INFORMACION_GENERAL", confidence, keywords };
  }

  // Si no se clasifica, retornar información general
  return { intent: "INFORMACION_GENERAL", confidence: 0.3, keywords: [] };
} 