/**
 * Types for LuXius Mobile Suite
 */

import { Order, Cliente, Material, Calidad } from '@/types'

export type MobileTab = 'admin' | 'impresor' | 'diseno' | 'despacho'

export interface MobileWorkspaceProps {
    orders: Order[]
    clientes: Cliente[]
    materiales: Material[]
    calidades: Calidad[]
    onRefresh: () => Promise<void>
    onSaveOrder: (order: Partial<Order>) => Promise<Order>
    onOpenQuickOrder: (initialText?: string, initialUrl?: string) => void
}

export interface WhatsAppBounceReason {
    id: string
    title: string
    description: string
    suggestedFix: string
}

export const BOUNCE_REASONS: WhatsAppBounceReason[] = [
    {
        id: 'baja_resolucion',
        title: 'Baja Resolución / Pixelado',
        description: 'La imagen enviada no alcanza los 150/300 DPI requeridos para esta medida.',
        suggestedFix: 'Enviar el archivo en formato vectorial (.PDF / .AI / .EPS) o una imagen de mayor resolución.'
    },
    {
        id: 'modo_rgb',
        title: 'Modo de Color RGB',
        description: 'El archivo está configurado en perfil de pantalla RGB en lugar de CMYK para imprenta.',
        suggestedFix: 'Convertir el espacio de trabajo a CMYK (FOGRA39 / Coated GRACoL) para asegurar fidelidad cromática.'
    },
    {
        id: 'falta_demasia',
        title: 'Falta Demasía / Sangrado',
        description: 'El diseño no cuenta con demasías perimetrales para corte o confección de bolsillos.',
        suggestedFix: 'Extender el fondo 3 cm por lado si lleva bolsillos, o 1 cm perimetral para refilado limpio.'
    },
    {
        id: 'fuentes_sin_curvar',
        title: 'Tipografías sin Convertir a Curvas',
        description: 'Las fuentes tipográficas no están incrustadas ni convertidas a curvas/trazados.',
        suggestedFix: 'Seleccionar todos los textos en Illustrator/Corel y presionar Ctrl+Shift+O (Crear contornos).'
    },
    {
        id: 'archivo_corrupto',
        title: 'Enlace expirado o Archivo no disponible',
        description: 'El link de WeTransfer expiró o el archivo en Drive no tiene permisos públicos de lectura.',
        suggestedFix: 'Volver a generar el enlace de WeTransfer o configurar el archivo en Google Drive como "Cualquiera con el enlace puede ver".'
    }
]
