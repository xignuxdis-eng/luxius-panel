/**
 * LuXius GimpStudio HD - Types & Definitions
 */

export type BlendMode = 
    | 'normal' 
    | 'multiply' 
    | 'screen' 
    | 'overlay' 
    | 'darken' 
    | 'lighten' 
    | 'color-dodge' 
    | 'color-burn' 
    | 'soft-light' 
    | 'hard-light' 
    | 'difference' 
    | 'exclusion';

export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    opacity: number; // 0 to 1
    blendMode: BlendMode;
    canvas: HTMLCanvasElement;
    x: number;
    y: number;
    width: number;
    height: number;
    locked?: boolean;
}

export type EditorTool = 
    | 'select' 
    | 'pan' 
    | 'crop' 
    | 'wand' 
    | 'eraser' 
    | 'brush' 
    | 'picker' 
    | 'bleed' 
    | 'text';

export interface LevelsAdjustment {
    inLow: number;   // 0 - 255 (Shadows)
    gamma: number;   // 0.1 - 5.0 (Midtones)
    inHigh: number;  // 0 - 255 (Highlights)
    outLow: number;  // 0 - 255
    outHigh: number; // 0 - 255
}

export interface ToneAdjustments {
    brightness: number;   // -100 to 100
    contrast: number;     // -100 to 100
    saturation: number;   // -100 to 100
    vibrance: number;     // -100 to 100
    exposure: number;     // -100 to 100
    temperature: number;  // -100 to 100 (Cool to Warm)
    tint: number;         // -100 to 100 (Green to Magenta)
}

export interface UnsharpMaskParams {
    amount: number;    // 0 to 500 (%)
    radius: number;    // 0.5 to 20 (px)
    threshold: number; // 0 to 255
}

export interface MirrorBleedParams {
    topCm: number;
    bottomCm: number;
    leftCm: number;
    rightCm: number;
    dpi: number;
    mode: 'mirror' | 'repeat' | 'solid';
    solidColor?: string;
}

export interface CropBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface HistoryStep {
    description: string;
    layers: {
        id: string;
        name: string;
        visible: boolean;
        opacity: number;
        blendMode: BlendMode;
        dataUrl: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }[];
    canvasWidth: number;
    canvasHeight: number;
}
