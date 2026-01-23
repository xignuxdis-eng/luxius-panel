import { apiService, Material } from '../services/api';

// Cache para materiales para evitar llamadas repetidas a la API
const materialCache = new Map<number, Material>();

/**
 * Obtiene un material por ID usando la API real
 * @param materialId - ID del material (puede ser string o number)
 * @returns Promise<Material | undefined>
 */
export async function getMaterialById(materialId: string | number): Promise<Material | undefined> {
  try {
    const id = typeof materialId === 'string' ? parseInt(materialId) : materialId;
    
    if (isNaN(id)) {
      console.warn('Invalid material ID:', materialId);
      return undefined;
    }

    // Verificar cache primero
    if (materialCache.has(id)) {
      return materialCache.get(id);
    }

    // Obtener de la API
    const material = await apiService.getMaterial(id);
    
    // Guardar en cache
    materialCache.set(id, material);
    
    return material;
  } catch (error) {
    console.error('Error fetching material by ID:', error);
    return undefined;
  }
}

/**
 * Obtiene materiales disponibles para clientes
 * @returns Promise<Material[]>
 */
export async function getAvailableMaterials(): Promise<Material[]> {
  try {
    return await apiService.getMaterials({ user_role: 'cliente' });
  } catch (error) {
    console.error('Error fetching available materials:', error);
    return [];
  }
}

/**
 * Obtiene todos los materiales (para administradores)
 * @returns Promise<Material[]>
 */
export async function getAllMaterials(): Promise<Material[]> {
  try {
    return await apiService.getMaterials();
  } catch (error) {
    console.error('Error fetching all materials:', error);
    return [];
  }
}

/**
 * Limpia el cache de materiales
 */
export function clearMaterialCache(): void {
  materialCache.clear();
}

/**
 * Obtiene el nombre para mostrar de un material
 * @param material - Material object
 * @returns string
 */
export function getMaterialDisplayName(material: Material): string {
  return `${material.nombre} (${material.categoria})`;
}

/**
 * Verifica si un material necesita demasía
 * @param material - Material object
 * @returns boolean
 */
export function needsDemasia(material: Material): boolean {
  return material.necesita_demasia;
}

/**
 * Calcula el área requerida
 * @param width - Ancho en metros
 * @param height - Alto en metros
 * @param copies - Número de copias
 * @returns number
 */
export function calculateRequiredArea(width: number, height: number, copies: number = 1): number {
  return width * height * copies;
}

/**
 * Verifica si hay stock disponible
 * @param material - Material object
 * @param requiredArea - Área requerida
 * @returns boolean
 */
export function checkStockAvailability(material: Material, requiredArea: number): boolean {
  return material.stock >= requiredArea;
} 