import { Material, MaterialCategory, getMaterialsByCategory, calculateRequiredArea, checkStockAvailability } from "./materials";

export interface Material {
  id: string;
  name: string;
  displayName: string;
  description: string;
  stock: number; // Cantidad disponible en metros cuadrados
  unit: string; // "m²" para metros cuadrados
  minOrder: number; // Mínimo de metros cuadrados por pedido
  pricePerUnit: number; // Precio por metro cuadrado
  category: "vinyl" | "banner" | "sticker" | "canvas";
  colors?: string[]; // Colores disponibles
  finishes?: string[]; // Acabados disponibles
  isAvailable: boolean; // Si está disponible para pedidos
  needsDemasia: boolean; // Si necesita demasía de tensado
}

export interface MaterialCategory {
  id: string;
  name: string;
  description: string;
  materials: Material[];
}

// Stock actual de materiales
export const materialsStock: Material[] = [
  // Lonas
  {
    id: "lona-front-light",
    name: "lona-front-light",
    displayName: "Lona Front Light",
    description: "Lona de impresión front light para uso exterior",
    stock: 150,
    unit: "m²",
    minOrder: 5,
    pricePerUnit: 25.50,
    category: "banner",
    colors: ["Blanco", "Negro"],
    finishes: ["Mate", "Brillante"],
    isAvailable: true,
    needsDemasia: true
  },
  {
    id: "lona-back-light",
    name: "lona-back-light",
    displayName: "Lona Back Light",
    description: "Lona de impresión back light para uso exterior con iluminación trasera",
    stock: 120,
    unit: "m²",
    minOrder: 5,
    pricePerUnit: 28.00,
    category: "banner",
    colors: ["Blanco", "Negro"],
    finishes: ["Mate", "Brillante"],
    isAvailable: true,
    needsDemasia: true
  },
  {
    id: "lona-block-out",
    name: "lona-block-out",
    displayName: "Lona Block Out",
    description: "Lona de impresión block out para uso exterior sin traspaso de luz",
    stock: 200,
    unit: "m²",
    minOrder: 5,
    pricePerUnit: 32.00,
    category: "banner",
    colors: ["Blanco", "Negro"],
    finishes: ["Mate", "Brillante"],
    isAvailable: true,
    needsDemasia: true
  },
  // Vinilos
  {
    id: "vinilo-blanco-comun",
    name: "vinilo-blanco-comun",
    displayName: "Vinilo Blanco Común",
    description: "Vinilo autoadhesivo blanco común para uso interior",
    stock: 300,
    unit: "m²",
    minOrder: 2,
    pricePerUnit: 15.00,
    category: "vinyl",
    colors: ["Blanco"],
    finishes: ["Mate"],
    isAvailable: true,
    needsDemasia: false
  },
  {
    id: "vinilo-vehicular-o3651",
    name: "vinilo-vehicular-o3651",
    displayName: "Vinilo Vehicular O-3651",
    description: "Vinilo autoadhesivo vehicular de alta resistencia",
    stock: 250,
    unit: "m²",
    minOrder: 2,
    pricePerUnit: 22.00,
    category: "vinyl",
    colors: ["Blanco", "Negro", "Rojo", "Azul"],
    finishes: ["Mate", "Brillante"],
    isAvailable: true,
    needsDemasia: false
  },
  {
    id: "vinilo-microperforado",
    name: "vinilo-microperforado",
    displayName: "Vinilo Microperforado",
    description: "Vinilo microperforado para aplicaciones con ventilación",
    stock: 180,
    unit: "m²",
    minOrder: 3,
    pricePerUnit: 18.50,
    category: "vinyl",
    colors: ["Blanco", "Negro"],
    finishes: ["Mate"],
    isAvailable: true,
    needsDemasia: false
  },
  {
    id: "vinilo-blanco-mate",
    name: "vinilo-blanco-mate",
    displayName: "Vinilo Blanco Mate",
    description: "Vinilo autoadhesivo blanco mate para uso interior",
    stock: 220,
    unit: "m²",
    minOrder: 2,
    pricePerUnit: 16.00,
    category: "vinyl",
    colors: ["Blanco"],
    finishes: ["Mate"],
    isAvailable: true,
    needsDemasia: false
  },
  {
    id: "vinilo-transparente",
    name: "vinilo-transparente",
    displayName: "Vinilo Transparente",
    description: "Vinilo autoadhesivo transparente para aplicaciones especiales",
    stock: 150,
    unit: "m²",
    minOrder: 2,
    pricePerUnit: 20.00,
    category: "vinyl",
    colors: ["Transparente"],
    finishes: ["Mate", "Brillante"],
    isAvailable: true,
    needsDemasia: false
  }
];

// Función para obtener solo materiales disponibles
export const getAvailableMaterials = (): Material[] => {
  return materialsStock.filter(material => material.isAvailable);
};

// Función para obtener materiales por categoría
export const getMaterialsByCategory = (): MaterialCategory[] => {
  const categories: MaterialCategory[] = [
    {
      id: "lonas",
      name: "Lonas",
      description: "Materiales para impresión exterior",
      materials: materialsStock.filter(m => m.category === "banner")
    },
    {
      id: "vinilos",
      name: "Vinilos",
      description: "Materiales autoadhesivos",
      materials: materialsStock.filter(m => m.category === "vinyl")
    }
  ];

  return categories;
};

// Función para actualizar stock (simular consumo)
export const updateMaterialStock = (materialId: string, consumedAmount: number): boolean => {
  const material = materialsStock.find(m => m.id === materialId);
  if (material && material.stock >= consumedAmount) {
    material.stock -= consumedAmount;
    return true;
  }
  return false;
};

// Función para calcular el área necesaria basada en dimensiones
export const calculateRequiredArea = (width: number, height: number, copies: number = 1): number => {
  const area = (width * height) / 10000; // Convertir de cm² a m²
  const totalArea = area * copies;
  const margin = totalArea * 0.05; // 5% de margen de corte
  return Math.ceil((totalArea + margin) * 100) / 100; // Redondear a 2 decimales
};

// Función para verificar si hay stock suficiente
export const checkStockAvailability = (materialId: string, requiredArea: number): boolean => {
  const material = materialsStock.find(m => m.id === materialId);
  return material ? material.stock >= requiredArea : false;
};

// Función para obtener material por ID
export const getMaterialById = (materialId: string): Material | undefined => {
  return materialsStock.find(m => m.id === materialId);
}; 