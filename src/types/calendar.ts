export type CalendarEventType = 'order' | 'assignment' | 'rebotado' | 'maintenance' | 'installation' | 'other' | 'custom' | 'admin_task' | 'meeting' | 'private' | 'reminder'

export interface CalendarEvent {
    id: string | number
    userId?: string | number // ID of the user who owns this event
    title: string
    start: string // ISO date or YYYY-MM-DD
    end?: string  // ISO date or YYYY-MM-DD
    type: CalendarEventType
    color?: string
    description?: string
    allDay?: boolean
    orderId?: number // Cross-reference to Order if type is 'order'
    clienteNombre?: string // Client grouping name
    completed?: boolean
}
