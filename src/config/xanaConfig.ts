export interface UserContext {
  rol: string;
  username: string;
  idPedido?: string;
  estadoPedido?: string;
  stockVinilo?: number;
  stockLona?: number;
  precioCalculado?: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isLoading?: boolean;
}

export interface SystemResponse {
  text: string;
  confidence: number;
  intent: string;
  context?: any;
}

export interface OpenAIResponse {
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Configuración de respuestas por rol
export const ROLE_RESPONSES = {
  cliente: {
    canViewStock: false,
    canViewOrders: true,
    canViewPrices: true,
    canUploadFiles: true,
  },
  artista: {
    canViewStock: false,
    canViewOrders: true,
    canViewPrices: true,
    canUploadFiles: true,
  },
  impresor: {
    canViewStock: true,
    canViewOrders: true,
    canViewPrices: true,
    canUploadFiles: false,
  },
  admin: {
    canViewStock: true,
    canViewOrders: true,
    canViewPrices: true,
    canUploadFiles: true,
  },
};

// Datos mock para el sistema
export const MOCK_DATA = {
  stock: {
    vinilo: {
      blanco: 45,
      negro: 30,
      rojo: 25,
    },
    lona: {
      premium: 100,
      standard: 80,
    },
    papel: {
      fotográfico: 200,
      bond: 500,
    },
  },
  pedidos: {
    "12345": {
      estado: "en_produccion",
      fecha_entrega: "2024-03-15",
      material: "lona_premium",
      dimensiones: "2x3 metros",
    },
    "12346": {
      estado: "pendiente",
      fecha_entrega: "2024-03-20",
      material: "vinilo_blanco",
      dimensiones: "1x2 metros",
    },
  },
  precios: {
    lona_premium: 75, // por metro cuadrado
    lona_standard: 60,
    vinilo_blanco: 45,
    vinilo_negro: 45,
    papel_fotografico: 25,
  },
}; 