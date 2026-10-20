/**
 * Luxius System - Data Layer Types
 */

import type {
    Cliente,
    Material,
    Calidad,
    Maquina,
    Order,
    Servicio,
    Proveedor,
    Logistica,
    MonedaConfig,
    Caja,
    MovimientoCaja,
    MovimientoStock,
    Banco,
    CalendarEvent
} from '@/types';
import type { RoleConfig, SystemLog } from '@/types/auth';

export type {
    Cliente,
    Material,
    Calidad,
    Maquina,
    Order,
    Servicio,
    Proveedor,
    Logistica,
    MonedaConfig,
    Caja,
    MovimientoCaja,
    MovimientoStock,
    Banco,
    CalendarEvent,
    RoleConfig,
    SystemLog
};

export interface UpdateBatchGroupParams {
    batchId?: string;
    batchName: string;
    clientId?: number;
    clienteNombre?: string;
    fechaEntrega?: string;
    envio?: string;
    observaciones?: string;
    items?: Array<{
        id: number | string;
        itemDesc?: string;
        unlinked?: boolean;
    }>;
}

export interface Usuario {
    id: number;
    nombre: string;
    username: string;
    rol: string;
    role?: string;
    email: string;
    habilitado: boolean;
    password?: string;
    avatar?: string;
    clientId?: number;
}

export interface Config {
    empresa: {
        nombre: string;
        direccion: string;
        telefono: string;
        email: string;
        cuit: string;
        logo: string;
    };
    sistema: {
        version: string;
        nombre: string;
        nombreAnterior: string;
        ultimaActualizacion: string;
    };
    ordenes: {
        proximoId: number;
        proximaOT: number;
        prefijo: string;
    };
    defaults: {
        demasias: number;
        envio: string;
        calidadId: number;
        materialId: number;
    };
    contadores: {
        ordenesHoy: number;
        pendientesImpresion: number;
    };
}

export interface TarifaEntry {
    precio: number;
    rebajaMaxPct: number;
}

export type TarifasXignux = Record<string, TarifaEntry>;

export interface ComboItemComponent {
    id?: number | string;
    tipo: 'material' | 'servicio' | 'producto';
    nombre: string;
    cantidad: number;
    precioUnitario: number;
}

export interface ComboData {
    id: number;
    codigo: string;
    nombre: string;
    categoria: string;
    descripcion: string;
    materialCodigo?: string;
    ancho?: number;
    alto?: number;
    componentes: ComboItemComponent[];
    precioSugerido: number;
    precioFinal: number;
    habilitado: boolean;
    destacado?: boolean;
}

export interface XanaTask {
    id: number;
    task_id: string;
    project: string;
    objective: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface XanaSession {
    id: number;
    session_id: string;
    task_id: string;
    agent: string;
    model: string;
    started_at: string;
    ended_at: string | null;
}

export interface XanaDecision {
    id: number;
    decision_id: string;
    task_id: string;
    topic: string;
    choice: string;
    alternatives_rejected: string[];
    reason: string;
    created_at: string;
}

export interface XanaAction {
    id: number;
    session_id: string;
    action_type: string;
    target: string;
    details: any;
    created_at: string;
}

export interface XanaCommit {
    id: number;
    commit_hash: string;
    task_id?: string;
    message: string;
    author: string;
    branch: string;
    repo: string;
    created_at: string;
}

export interface XanaPromptContext {
    prompt_markdown: string;
    tasks_count: number;
    decisions_count: number;
    commits_count: number;
    timestamp: string;
}
