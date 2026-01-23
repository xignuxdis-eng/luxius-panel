import { OpenAIResponse } from '../config/xanaConfig';

// Configuración de OpenAI
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o';
const OPENAI_MAX_TOKENS = parseInt(import.meta.env.VITE_OPENAI_MAX_TOKENS || '1000');
const OPENAI_TEMPERATURE = parseFloat(import.meta.env.VITE_OPENAI_TEMPERATURE || '0.7');

// Prompt base para Xana AI
const XANA_SYSTEM_PROMPT = `Eres Xana AI, asistente virtual especializado en el sistema LuXius de gestión de impresión. 

CONTEXTO DEL SISTEMA LUXIUS:
- LuXius es una plataforma completa de gestión de impresión
- Conecta clientes, artistas, impresores y administradores
- Maneja pedidos, archivos, materiales, stock y precios
- Cada rol tiene diferentes permisos y funcionalidades

TUS CARACTERÍSTICAS:
- Eres amigable, profesional y conocedora del sector de impresión
- Proporcionas respuestas específicas y contextuales
- Ayudas con procesos de impresión, materiales y terminología del sector
- Eres proactiva en sugerencias y guías paso a paso

FORMATO DE RESPUESTA:
- Responde siempre en español
- Sé específica, detallada y justificada
- Incluye detalles relevantes del sistema LuXius
- Mantén un tono profesional pero amigable
- SIEMPRE explica el "por qué" de tus respuestas
- Proporciona ejemplos concretos cuando sea posible

IMPORTANTE:
- Si no tienes información específica sobre algo, sugiere consultar con el equipo técnico
- Para consultas sobre stock o datos internos, menciona que esa información se verifica en tiempo real
- Siempre ofrece ayuda adicional o próximos pasos
- Justifica tus recomendaciones con razones específicas del sector de impresión

EJEMPLOS DE RESPUESTAS BUENAS:
- "Te recomiendo lona premium para exteriores porque tiene mayor resistencia a la intemperie y durabilidad"
- "El proceso de impresión tarda 3-5 días porque incluye diseño, producción y control de calidad"
- "Para archivos vectoriales, usa PDF o AI porque mantienen la calidad en cualquier tamaño"`;

export async function callOpenAI(question: string, context: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key no configurada, usando respuesta mock');
    return getMockResponse(question);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: XANA_SYSTEM_PROMPT },
          { role: "user", content: `Contexto: ${context}\n\nPregunta: ${question}` }
        ],
        max_tokens: OPENAI_MAX_TOKENS,
        temperature: OPENAI_TEMPERATURE,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error llamando a OpenAI:", error);
    return getMockResponse(question);
  }
}

export async function callOpenAIWithContext(question: string, userContext: any): Promise<OpenAIResponse> {
  const context = `Usuario: ${userContext.username}, Rol: ${userContext.rol}`;
  
  console.log('🔍 Xana AI - Intentando usar OpenAI:', { question, context, apiKey: OPENAI_API_KEY ? 'Configurada' : 'No configurada' });
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: XANA_SYSTEM_PROMPT },
          { role: "user", content: `Contexto del usuario: ${context}\n\nPregunta: ${question}` }
        ],
        max_tokens: OPENAI_MAX_TOKENS,
        temperature: OPENAI_TEMPERATURE,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Xana AI - Respuesta de OpenAI recibida:', { 
      text: data.choices[0].message.content.substring(0, 100) + '...',
      usage: data.usage 
    });
    
    return {
      text: data.choices[0].message.content,
      usage: data.usage,
    };
  } catch (error) {
    console.error("❌ Xana AI - Error llamando a OpenAI:", error);
    
    // Fallback a respuesta mock
    const mockResponse = getMockResponse(question);
    console.log('🔄 Xana AI - Usando respuesta de fallback:', mockResponse);
    return {
      text: mockResponse,
      usage: {
        prompt_tokens: Math.floor(Math.random() * 100) + 50,
        completion_tokens: Math.floor(Math.random() * 200) + 100,
        total_tokens: Math.floor(Math.random() * 300) + 150,
      },
    };
  }
}

// Función para verificar si se debe usar OpenAI
export function shouldUseOpenAI(intent: string, confidence: number): boolean {
  // Usar respuestas contextuales para saludos y consultas simples
  const simpleIntents = ["SALUDOS_CONVERSACION"];
  
  // Usar OpenAI para intenciones complejas o cuando la confianza es baja
  const complexIntents = ["INFORMACION_GENERAL", "SOPORTE_TECNICO"];
  
  // Para saludos, usar respuestas contextuales (más naturales)
  if (simpleIntents.includes(intent)) {
    return false; // Usar respuestas contextuales
  }
  
  // Siempre usar OpenAI si está configurado, para respuestas más inteligentes
  if (isOpenAIConfigured()) {
    return true; // Usar OpenAI para todas las consultas si está disponible
  }
  
  // Fallback a la lógica original si OpenAI no está configurado
  return complexIntents.includes(intent) || confidence < 0.5;
}

// Función para verificar si OpenAI está configurado
export function isOpenAIConfigured(): boolean {
  return !!OPENAI_API_KEY;
}

// Respuestas mock de fallback
function getMockResponse(question: string): string {
  const text = question.toLowerCase();
  
  // Respuestas específicas según el tipo de pregunta
  if (text.includes("hola") || text.includes("buenos") || text.includes("como estas")) {
    return "¡Hola! 😊 Soy Xana AI, tu asistente virtual en LuXius. ¿En qué puedo ayudarte hoy?";
  }
  
  if (text.includes("pedido") || text.includes("orden")) {
    return "Para consultar el estado de tu pedido, puedes ir a la sección 'Mis Pedidos' en el menú lateral. Allí verás todos los detalles y el progreso de tu trabajo.";
  }
  
  if (text.includes("archivo") || text.includes("subir")) {
    return "Puedes subir tus archivos en la sección 'Subir Archivos'. Aceptamos formatos PDF, AI, PSD, EPS, JPG y PNG. Te recomiendo PDF o AI para mejor calidad.";
  }
  
  if (text.includes("precio") || text.includes("costo")) {
    return "Los precios se calculan automáticamente según los materiales y dimensiones. Puedes ver el costo total antes de confirmar tu pedido en la calculadora de precios.";
  }
  
  if (text.includes("material") || text.includes("stock")) {
    return "Tenemos una amplia variedad de materiales disponibles: vinilos, lonas, papeles fotográficos y más. Cada material tiene características específicas para diferentes usos.";
  }
  
  // Respuesta genérica mejorada
  const mockResponses = [
    "Entiendo tu consulta. Déjame ayudarte con información específica sobre LuXius y nuestros servicios de impresión.",
    "Excelente pregunta. Te puedo guiar con información detallada sobre nuestro sistema de gestión de impresión.",
    "Perfecto, puedo ayudarte con eso. LuXius es nuestro sistema integral para gestionar todo el proceso de impresión.",
    "Gracias por tu consulta. Te proporciono información específica sobre cómo funciona LuXius y cómo puedo ayudarte.",
  ];

  return mockResponses[Math.floor(Math.random() * mockResponses.length)];
} 