// src/pages/XpressViewer/XpressViewer.types.ts
import { Order } from '../../types/orden';

export type XpressViewerTab = 'viewer' | 'redrawer' | 'printsheeter' | 'photocraft' | 'vectorcraft';

export type ToolMode = 'none' | 'measure' | 'bleed' | 'pan';

export type Point = {
    x: number;
    y: number;
};

export type ColorSwatch = {
    hex: string;
    rgb: [number, number, number];
    cmyk: { c: number; m: number; y: number; k: number };
    count: number;
};

export interface BleedSides {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
}

export interface UpscaledResult {
    originalUrl: string;
    upscaledUrl: string;
    originalDims: { width: number; height: number };
    upscaledDims: { width: number; height: number };
    originalDpi: number;
    targetDpi: number;
    engine: string;
    elapsedMs: number;
    fileUrl?: string;
}

export interface XpressViewerProps {
    initialFileUrl?: string;
    initialFile?: File;
    initialFileName?: string;
    initialOrderId?: number;
    onClose?: () => void;
}

export interface PrepressInspectorProps {
    file: File | null;
    setFile: (file: File | null) => void;
    previewUrl: string | null;
    setPreviewUrl: (url: string | null) => void;
    metadata: any;
    setMetadata: (meta: any) => void;
    order: Order | null;
    setOrder: (order: Order | null) => void;
    initialFileUrl?: string;
    initialFile?: File;
    initialFileName?: string;
    initialOrderId?: number;
    onClose?: () => void;
    onNavigateTab: (tab: XpressViewerTab) => void;
}
