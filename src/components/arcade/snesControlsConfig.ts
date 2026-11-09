// Configuración y persistencia de mapeo de controles para el emulador SNES

export interface SnesKeybindings {
    up: string
    down: string
    left: string
    right: string
    b: string
    a: string
    y: string
    x: string
    start: string
    select: string
    l: string
    r: string
}

export const DEFAULT_SNES_KEYBINDINGS: SnesKeybindings = {
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
    b: 'z',      // SNES B: Botón inferior (Saltar)
    a: 'x',      // SNES A: Botón derecho (Salto especial)
    y: 'a',      // SNES Y: Botón izquierdo (Correr)
    x: 's',      // SNES X: Botón superior (Poder)
    start: 'enter',
    select: 'rshift',
    l: 'q',
    r: 'w',
}

const STORAGE_KEY = 'luxius_snes_custom_controls_v2'

// Nombres legibles de teclas de teclado
export function getFriendlyKeyName(key: string): string {
    const k = key.toLowerCase()
    switch (k) {
        case 'up':
        case 'arrowup':
            return '↑ Flecha Arriba'
        case 'down':
        case 'arrowdown':
            return '↓ Flecha Abajo'
        case 'left':
        case 'arrowleft':
            return '← Flecha Izquierda'
        case 'right':
        case 'arrowright':
            return '→ Flecha Derecha'
        case 'enter':
            return 'Enter'
        case 'rshift':
        case 'shiftright':
            return 'Shift Derecho'
        case 'shift':
        case 'shiftleft':
            return 'Shift'
        case 'space':
            return 'Espacio'
        case 'escape':
            return 'Esc'
        default:
            return key.toUpperCase()
    }
}

// Convertir tecla de evento KeyboardEvent a formato compatible con RetroArch
export function eventKeyToRetroArch(e: React.KeyboardEvent | KeyboardEvent): string {
    const code = e.code.toLowerCase()
    if (code === 'arrowup') return 'up'
    if (code === 'arrowdown') return 'down'
    if (code === 'arrowleft') return 'left'
    if (code === 'arrowright') return 'right'
    if (code === 'shiftright') return 'rshift'
    if (code === 'shiftleft') return 'shift'
    if (code === 'enter') return 'enter'
    if (code === 'space') return 'space'
    if (code.startsWith('key')) return code.replace('key', '')
    if (code.startsWith('digit')) return code.replace('digit', '')
    return e.key.toLowerCase()
}

// Cargar controles guardados o los predeterminados
export function loadSnesKeybindings(): SnesKeybindings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw)
            return { ...DEFAULT_SNES_KEYBINDINGS, ...parsed }
        }
    } catch {
        // Fallback a predeterminados
    }
    return { ...DEFAULT_SNES_KEYBINDINGS }
}

// Guardar controles personalizados
export function saveSnesKeybindings(bindings: SnesKeybindings): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings))
    } catch {
        // Ignorar errores de almacenamiento
    }
}

// Generar configuración inyectable para Nostalgist / RetroArch
export function buildRetroArchInputConfig(bindings: SnesKeybindings): Record<string, string> {
    return {
        input_player1_up: bindings.up,
        input_player1_down: bindings.down,
        input_player1_left: bindings.left,
        input_player1_right: bindings.right,
        input_player1_a: bindings.a,
        input_player1_b: bindings.b,
        input_player1_x: bindings.x,
        input_player1_y: bindings.y,
        input_player1_start: bindings.start,
        input_player1_select: bindings.select,
        input_player1_l: bindings.l,
        input_player1_r: bindings.r,
    }
}

