// Configuración dinámica de la API entre entorno local y la nube Render
export const API_BASE_URL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : 'https://luxius-backend.onrender.com/api';

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
  precio_interno: number;
  precio_por_unidad: number;
  moneda: 'ARS' | 'USD';
  necesita_demasia: boolean;
  activo: boolean;
  fecha_creacion: string;
}

export interface Presupuesto {
  id: number;
  numero_presupuesto: string;
  cliente_id: number;
  creado_por: number;
  fecha_creacion: string;
  fecha_vencimiento: string | null;
  estado: 'borrador' | 'enviado' | 'aprobado' | 'rechazado' | 'vencido';
  moneda: 'ARS' | 'USD';
  cliente_nombre: string;
  cliente_direccion?: string;
  cliente_ciudad?: string;
  cliente_provincia?: string;
  cliente_telefono?: string;
  cliente_codigo_postal?: string;
  comercial?: string;
  numero_cliente?: string;
  metodo_pago?: string;
  terminos_pedido?: string;
  solicitado_por?: string;
  subtotal: number;
  iva: number;
  total: number;
  notas?: string;
  condiciones?: string;
  validez_dias: number;
  items: PresupuestoItem[];
}

export interface PresupuestoItem {
  id: number;
  presupuesto_id: number;
  material_id?: number;
  numero_item: number;
  descripcion: string;
  cantidad: number;
  ancho_m: number;
  alto_m: number;
  area_m2: number;
  precio_por_m2: number;
  precio_total: number;
  demasia: boolean;
  soldadura: boolean;
  laminado: boolean;
  caños_soportes: boolean;
  instalacion: boolean;
  material?: Material;
}

export interface ExchangeRate {
  id: number;
  moneda_origen: string;
  moneda_destino: string;
  tasa: number;
  fecha_actualizacion: string;
  fuente: string;
}

export interface Notification {
  id: number;
  usuario_id: number;
  tipo: 'info' | 'warning' | 'error' | 'success';
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha_creacion: string;
  fecha_lectura?: string;
  relacion_tipo?: string;
  relacion_id?: number;
  usuario?: User;
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
    this.token = localStorage.getItem('luxius_auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private getToken(): string | null {
    return localStorage.getItem('luxius_auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const separator = endpoint.includes('?') ? '&' : '?';
    const cacheBusterUrl = `${API_BASE_URL}${endpoint}${separator}_t=${Date.now()}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...options.headers,
    };

    if (token) {
      (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(cacheBusterUrl, {
      ...options,
      cache: 'no-store',
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      console.warn(`[ApiService] 401/403 No autorizado en ${endpoint}. Limpiando token...`);
      localStorage.removeItem('luxius_auth_token');
      try {
        const { useAuthStore } = await import('@store/authStore');
        useAuthStore.getState().logout();
      } catch { }
    }

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
    localStorage.setItem('luxius_auth_token', response.token);
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
    localStorage.setItem('luxius_auth_token', response.token);
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
    localStorage.removeItem('luxius_auth_token');
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

    const response = await this.request<{ success: boolean; data: User[] }>(`/users?${searchParams.toString()}`);
    return { users: response.data || [], total: response.data?.length || 0, limit: params?.limit || 0, offset: params?.offset || 0 };
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

  // Gestión de usuarios (CRUD)
  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    rol: string;
    empresa?: string;
    telefono?: string;
    direccion?: string;
  }): Promise<{ success: boolean; user: User }> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: number, userData: {
    username?: string;
    email?: string;
    nombre?: string;
    apellido?: string;
    rol?: string;
    empresa?: string;
    telefono?: string;
    direccion?: string;
  }): Promise<{ success: boolean; user: User }> {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async getUser(userId: number): Promise<User> {
    return this.request(`/users/${userId}`);
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
    return this.request('/admin/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async uploadFiles(orderId: number, files: File[], externalLinks?: Array<{ url: string; nombre?: string }>, metadata?: any[]): Promise<{ success: boolean; files: OrderFile[] }> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    if (metadata && metadata.length > 0) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    if (externalLinks && externalLinks.length > 0) {
      formData.append('external_links', JSON.stringify(externalLinks));
    }

    const url = `${API_BASE_URL}/admin/orders/${orderId}/files`;
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

  // Presupuestos
  async getPresupuestos(params?: {
    cliente_id?: number;
    estado?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; presupuestos: Presupuesto[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.cliente_id) queryParams.append('cliente_id', params.cliente_id.toString());
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await fetch(`${API_BASE_URL}/presupuestos?${queryParams}`, {
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async getPresupuesto(id: number): Promise<{ success: boolean; presupuesto: Presupuesto }> {
    const response = await fetch(`${API_BASE_URL}/presupuestos/${id}`, {
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async createPresupuesto(data: {
    cliente_id: number;
    cliente_nombre: string;
    cliente_direccion?: string;
    cliente_ciudad?: string;
    cliente_provincia?: string;
    cliente_telefono?: string;
    cliente_codigo_postal?: string;
    comercial?: string;
    numero_cliente?: string;
    metodo_pago?: string;
    terminos_pedido?: string;
    solicitado_por?: string;
    moneda?: 'ARS' | 'USD';
    notas?: string;
    condiciones?: string;
    validez_dias?: number;
    items: {
      material_id?: number;
      descripcion: string;
      cantidad?: number;
      ancho_m: number;
      alto_m: number;
      demasia?: boolean;
      soldadura?: boolean;
      laminado?: boolean;
      caños_soportes?: boolean;
      instalacion?: boolean;
    }[];
  }): Promise<{ success: boolean; presupuesto: Presupuesto; message: string }> {
    const response = await fetch(`${API_BASE_URL}/presupuestos`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async updatePresupuesto(id: number, data: Partial<Presupuesto>): Promise<{ success: boolean; presupuesto: Presupuesto; message: string }> {
    const response = await fetch(`${API_BASE_URL}/presupuestos/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async deletePresupuesto(id: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/presupuestos/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async updatePresupuestoEstado(id: number, estado: string): Promise<{ success: boolean; presupuesto: Presupuesto; message: string }> {
    const response = await fetch(`${API_BASE_URL}/presupuestos/${id}/estado`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ estado }),
    });
    return response.json();
  }

  async getPresupuestosVencidos(): Promise<{ success: boolean; presupuestos: Presupuesto[] }> {
    const response = await fetch(`${API_BASE_URL}/presupuestos/vencidos`, {
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async checkPresupuestosVencimientos(): Promise<{ success: boolean; message: string; presupuestos_vencidos: Presupuesto[] }> {
    const response = await fetch(`${API_BASE_URL}/presupuestos/check-vencimientos`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async generatePresupuestoPDF(id: number): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/presupuestos/${id}/pdf`, {
      headers: this.getHeaders(),
    });
    return response.blob();
  }

  // Precios
  async getMaterialsPricing(): Promise<Material[]> {
    return this.request('/precios/materials');
  }

  async updateMaterialPricing(materialId: number, pricingData: {
    precio_interno?: number;
    precio_por_m2?: number;
    precio_por_unidad?: number;
    moneda?: 'ARS' | 'USD';
  }): Promise<Material> {
    return this.request(`/precios/materials/${materialId}`, {
      method: 'PUT',
      body: JSON.stringify(pricingData),
    });
  }

  async bulkUpdatePricing(updates: Array<{
    material_id: number;
    precio_interno?: number;
    precio_por_m2?: number;
    precio_por_unidad?: number;
    moneda?: 'ARS' | 'USD';
  }>): Promise<{ message: string }> {
    return this.request('/precios/materials/bulk-update', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
  }

  async getExchangeRate(): Promise<ExchangeRate> {
    return this.request('/precios/exchange-rate');
  }

  async updateExchangeRate(): Promise<{
    message: string;
    tasa: number;
    fecha_actualizacion: string;
  }> {
    return this.request('/precios/exchange-rate/update', {
      method: 'POST',
    });
  }

  async getInventoryValue(): Promise<{
    total_value_ars: number;
    total_value_usd: number;
    usd_rate: number;
    materials: Array<{
      material_id: number;
      nombre: string;
      stock: number;
      precio_interno: number;
      moneda: string;
      valor_ars: number;
      valor_usd: number;
    }>;
    last_update?: string;
  }> {
    return this.request('/precios/inventory-value');
  }

  async getMargins(): Promise<Array<{
    material_id: number;
    nombre: string;
    categoria: string;
    precio_interno: number;
    precio_venta: number;
    moneda: string;
    margen_porcentaje: number;
    margen_monto: number;
  }>> {
    return this.request('/precios/margins');
  }

  async getExchangeRateHistory(limit?: number): Promise<ExchangeRate[]> {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.append('limit', limit.toString());

    return this.request(`/precios/exchange-rate/history?${searchParams.toString()}`);
  }

  // Notificaciones
  async getNotifications(params?: {
    usuario_id: number;
    leidas?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ notifications: Notification[]; total: number; limit: number; offset: number }> {
    const searchParams = new URLSearchParams();
    if (params?.usuario_id) searchParams.append('usuario_id', params.usuario_id.toString());
    if (params?.leidas !== undefined) searchParams.append('leidas', params.leidas.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    return this.request(`/notifications?${searchParams.toString()}`);
  }

  async markNotificationAsRead(notificationId: number): Promise<Notification> {
    return this.request(`/notifications/${notificationId}`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead(usuarioId: number): Promise<{ message: string }> {
    return this.request('/notifications/mark-all-read', {
      method: 'PUT',
      body: JSON.stringify({ usuario_id: usuarioId }),
    });
  }

  async deleteNotification(notificationId: number): Promise<{ message: string }> {
    return this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  async getUnreadCount(usuarioId: number): Promise<{ unread_count: number }> {
    return this.request(`/notifications/unread-count?usuario_id=${usuarioId}`);
  }

  async createNotification(notificationData: {
    usuario_id: number;
    tipo: 'info' | 'warning' | 'error' | 'success';
    titulo: string;
    mensaje: string;
    relacion_tipo?: string;
    relacion_id?: number;
  }): Promise<Notification> {
    return this.request('/notifications/create', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  async checkLowStock(): Promise<{
    message: string;
    materials_affected: number;
  }> {
    return this.request('/notifications/check-stock', {
      method: 'POST',
    });
  }

  async checkOverduePresupuestos(): Promise<{
    message: string;
    presupuestos_affected: number;
  }> {
    return this.request('/notifications/check-presupuestos', {
      method: 'POST',
    });
  }
}

// Instancia global del servicio
export const apiService = new ApiService();

