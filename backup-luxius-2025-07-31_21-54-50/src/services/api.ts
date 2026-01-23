// Configuración de la API
const API_BASE_URL = 'http://localhost:5000/api';

// Tipos de datos
export interface User {
  id: number;
  username: string;
  email: string;
  rol: string;
  nombre: string;
  apellido: string;
  empresa?: string;
  telefono?: string;
  direccion?: string;
  fecha_registro: string;
  activo: boolean;
}

export interface Material {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria: string;
  stock: number;
  stock_minimo: number;
  unidad: string;
  precio_por_m2: number;
  necesita_demasia: boolean;
  activo: boolean;
  fecha_creacion: string;
}

export interface Order {
  id: number;
  cliente_id: number;
  artista_id?: number;
  fecha_creacion: string;
  fecha_entrega?: string;
  estado: string;
  notas?: string;
  total: number;
  cliente?: User;
  artista?: User;
  items: OrderItem[];
  files: OrderFile[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  material_id: number;
  cantidad: number;
  alto: number;
  ancho: number;
  copias: number;
  precio_unitario: number;
  subtotal: number;
  demasia_arriba_abajo: boolean;
  demasia_laterales: boolean;
  demasia_cuatro_lados: boolean;
  soldadura_portabanner: boolean;
  rollbanner: boolean;
  estructura_portabanner: boolean;
  estructura_rollbanner: boolean;
  laminado: boolean;
  instalacion_rotulado_tensado_herreria: boolean;
  material?: Material;
}

export interface OrderFile {
  id: number;
  order_id: number;
  nombre_original: string;
  nombre_archivo: string;
  ruta_archivo: string;
  tipo_archivo?: string;
  tamano?: number;
  metadata?: any;
  enlace_externo?: string;
  fecha_subida: string;
}

export interface Task {
  id: number;
  order_id: number;
  artista_id: number;
  titulo: string;
  descripcion?: string;
  estado: string;
  prioridad: string;
  fecha_creacion: string;
  fecha_entrega?: string;
  fecha_completado?: string;
  notas?: string;
  order?: Order;
  artist?: User;
}

// Clase para manejar las llamadas a la API
class ApiService {
  private token: string | null = null;

  constructor() {
    // Recuperar token del localStorage
    this.token = localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as any)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Autenticación
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const response = await this.request<{ success: boolean; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    this.token = response.token;
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));

    return response;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    rol: string;
    empresa?: string;
    telefono?: string;
    direccion?: string;
  }): Promise<{ token: string; user: User }> {
    const response = await this.request<{ success: boolean; token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    this.token = response.token;
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));

    return response;
  }

  async verifyToken(): Promise<{ valid: boolean; user: User }> {
    return this.request<{ valid: boolean; user: User }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token: this.token }),
    });
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Usuarios
  async getUsers(params?: {
    rol?: string;
    activo?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number; limit: number; offset: number }> {
    const searchParams = new URLSearchParams();
    if (params?.rol) searchParams.append('rol', params.rol);
    if (params?.activo !== undefined) searchParams.append('activo', params.activo.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    return this.request(`/users?${searchParams.toString()}`);
  }

  async getClients(): Promise<User[]> {
    return this.request('/users/clients');
  }

  async getArtists(): Promise<User[]> {
    return this.request('/users/artists');
  }

  async getImpresores(): Promise<User[]> {
    return this.request('/users/impresores');
  }

  async getUserStats(): Promise<{
    total_clients: number;
    total_artists: number;
    total_impresores: number;
    total_admins: number;
    inactive_users: number;
    new_users_this_month: number;
    total_active_users: number;
  }> {
    return this.request('/users/stats');
  }

  // Órdenes
  async getOrders(params?: {
    user_id?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; total: number; limit: number; offset: number }> {
    const searchParams = new URLSearchParams();
    if (params?.user_id) searchParams.append('user_id', params.user_id.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    return this.request(`/orders?${searchParams.toString()}`);
  }

  async getOrder(orderId: number): Promise<Order> {
    return this.request(`/orders/${orderId}`);
  }

  async createOrder(orderData: {
    cliente_id: number;
    artista_id?: number;
    fecha_entrega?: string;
    notas?: string;
    items: Array<{
      material_id: number;
      alto: number;
      ancho: number;
      copias: number;
      demasia_arriba_abajo?: boolean;
      demasia_laterales?: boolean;
      demasia_cuatro_lados?: boolean;
      soldadura_portabanner?: boolean;
      rollbanner?: boolean;
      estructura_portabanner?: boolean;
      estructura_rollbanner?: boolean;
      laminado?: boolean;
      instalacion_rotulado_tensado_herreria?: boolean;
    }>;
  }): Promise<{ success: boolean; order: Order }> {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async uploadFiles(orderId: number, files: File[], externalLinks?: Array<{ url: string; nombre?: string }>): Promise<{ success: boolean; files: OrderFile[] }> {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });

    if (externalLinks && externalLinks.length > 0) {
      formData.append('external_links', JSON.stringify(externalLinks));
    }

    const url = `${API_BASE_URL}/orders/${orderId}/files`;
    const headers: HeadersInit = {};
    
    if (this.token) {
      (headers as any)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async updateOrderStatus(orderId: number, status: string): Promise<{ success: boolean; order: Order }> {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Materiales
  async getMaterials(params?: {
    categoria?: string;
    activo?: boolean;
    user_role?: string;
  }): Promise<Material[]> {
    const searchParams = new URLSearchParams();
    if (params?.categoria) searchParams.append('categoria', params.categoria);
    if (params?.activo !== undefined) searchParams.append('activo', params.activo.toString());
    if (params?.user_role) searchParams.append('user_role', params.user_role);

    return this.request(`/materials?${searchParams.toString()}`);
  }

  async getMaterial(materialId: number): Promise<Material> {
    return this.request(`/materials/${materialId}`);
  }

  async getMaterialCategories(): Promise<string[]> {
    return this.request('/materials/categories');
  }

  async getStockStatus(): Promise<Array<{
    id: number;
    nombre: string;
    stock: number;
    stock_minimo: number;
    unidad: string;
    status: string;
  }>> {
    return this.request('/materials/stock-status');
  }

  // Tareas
  async getTasks(params?: {
    artista_id?: number;
    status?: string;
    prioridad?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ tasks: Task[]; total: number; limit: number; offset: number }> {
    const searchParams = new URLSearchParams();
    if (params?.artista_id) searchParams.append('artista_id', params.artista_id.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.prioridad) searchParams.append('prioridad', params.prioridad);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    return this.request(`/tasks?${searchParams.toString()}`);
  }

  async getUrgentTasks(): Promise<Task[]> {
    return this.request('/tasks/urgent');
  }

  async getTasksByArtist(artistId: number): Promise<Task[]> {
    return this.request(`/tasks/by-artist/${artistId}`);
  }

  async createTask(taskData: {
    order_id: number;
    artista_id: number;
    titulo: string;
    descripcion?: string;
    prioridad?: string;
    fecha_entrega?: string;
    notas?: string;
  }): Promise<{ success: boolean; task: Task }> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(taskId: number, taskData: Partial<Task>): Promise<{ success: boolean; task: Task }> {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  // Stock
  async getStockMovements(params?: {
    material_id?: number;
    tipo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ movements: any[]; total: number; limit: number; offset: number }> {
    const searchParams = new URLSearchParams();
    if (params?.material_id) searchParams.append('material_id', params.material_id.toString());
    if (params?.tipo) searchParams.append('tipo', params.tipo);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    return this.request(`/stock/movements?${searchParams.toString()}`);
  }

  async getLowStockMaterials(): Promise<Material[]> {
    return this.request('/stock/low-stock');
  }

  async getStockSummary(): Promise<{
    total_materials: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_value: number;
  }> {
    return this.request('/stock/summary');
  }

  async updateMaterialStock(materialId: number, stock: number, motivo?: string): Promise<{
    success: boolean;
    material: Material;
    old_stock: number;
    new_stock: number;
  }> {
    return this.request(`/stock/materials/${materialId}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ stock, motivo }),
    });
  }

  async generateStockReport(includeInactive?: boolean): Promise<{
    report: any[];
    generated_at: string;
  }> {
    const searchParams = new URLSearchParams();
    if (includeInactive) searchParams.append('include_inactive', 'true');

    return this.request(`/stock/report?${searchParams.toString()}`);
  }
}

// Instancia global del servicio
export const apiService = new ApiService(); 