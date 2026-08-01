// types.ts - Workshop Canvas & State Types


export type StationId = string;

export type WorkerRole = 'disenador' | 'impresor' | 'cortador' | 'empaquetador';

export interface StationConfig {
    id: StationId;
    title: string;
    description: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    icon: string;
    maquinaId?: number;
    estado?: string;
}

export interface WorkshopWorker {
    id: string;
    name: string;
    role: WorkerRole;
    x: number; // grid or canvas coordinates
    y: number;
    targetX: number;
    targetY: number;
    speed: number;
    animFrame: number;
    direction: 'down' | 'left' | 'right' | 'up';
    heldItem: string | null; // e.g. "Carpeta OT", "Rollo Impreso", "Botella CMYK", "Caja"
    activeOrderId?: number;
    speechBubble?: {
        text: string;
        color: string;
        timer: number;
    };
    skinColor: string;
    shirtColor: string;
}

export interface WorkshopState {
    activeStationModal: StationId | null;
    arcadeMode: boolean; // True if controlling avatar directly
    playerPos: { x: number; y: number };
    playerHeldItem: string | null;
    inkLevelCMYK: { c: number; m: number; y: number; k: number };
    canvasStockMeters: number;
}
