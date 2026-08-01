import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { saveCalendarEvent, deleteCalendarEvent } from '@data/db'
import type { CalendarEvent, CalendarEventType } from '@/types'

interface CalendarEventModalProps {
    isOpen: boolean
    onClose: (refresh?: boolean) => void
    event?: CalendarEvent | null
    defaultDate?: string
    userId?: string | number
}

const EVENT_TYPES: { value: CalendarEventType; label: string }[] = [
    { value: 'reminder', label: '⏰ Recordatorio' },
    { value: 'meeting', label: '🤝 Reunión' },
    { value: 'admin_task', label: '📋 Tarea Admin' },
    { value: 'installation', label: '🛠️ Instalación' },
    { value: 'private', label: '🔒 Privado' },
    { value: 'other', label: '✨ Otro' }
]

export default function CalendarEventModal({ isOpen, onClose, event, defaultDate, userId }: CalendarEventModalProps) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<CalendarEvent>>()

    useEffect(() => {
        if (isOpen) {
            if (event) {
                reset(event)
            } else {
                reset({
                    title: '',
                    start: defaultDate || new Date().toISOString().split('T')[0],
                    type: 'reminder',
                    userId: userId,
                    allDay: true
                })
            }
        }
    }, [isOpen, event, defaultDate, userId, reset])

    const onSubmit = (data: Partial<CalendarEvent>) => {
        saveCalendarEvent({ ...data, id: event?.id, userId })
        onClose(true)
    }

    const handleDelete = () => {
        if (event?.id && window.confirm('¿Está seguro de eliminar este evento?')) {
            deleteCalendarEvent(event.id)
            onClose(true)
        }
    }

    const isOrder = event?.type === 'order' || event?.type === 'assignment' || event?.type === 'rebotado'

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => onClose(false)}
            title={event ? (isOrder ? "Detalles de Orden" : "Editar Evento") : "Nuevo Evento"}
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <Input
                        label="Título del Evento"
                        {...register('title', { required: 'El título es obligatorio' })}
                        error={errors.title?.message}
                        disabled={isOrder}
                    />
                </div>

                <div className="form-group">
                    <label className="input-label">Tipo de Evento</label>
                    <select
                        className="input-field"
                        {...register('type')}
                        disabled={isOrder}
                    >
                        {isOrder ? (
                            <option value={event?.type}>{event?.type === 'order' ? '📦 Orden' : '🎯 Asignación'}</option>
                        ) : (
                            EVENT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))
                        )}
                    </select>
                </div>

                <div className="form-group">
                    <Input
                        label="Fecha"
                        type="date"
                        {...register('start', { required: 'La fecha es obligatoria' })}
                        error={errors.start?.message}
                        disabled={isOrder}
                    />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label">Descripción / Notas</label>
                    <textarea
                        className="input-field"
                        rows={3}
                        {...register('description')}
                        disabled={isOrder}
                        style={{ resize: 'vertical' }}
                    />
                </div>

                <div className="form-actions" style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                    {!isOrder && event && (
                        <Button variant="ghost" type="button" onClick={handleDelete} style={{ color: 'var(--danger)', marginRight: 'auto' }}>
                            Eliminar
                        </Button>
                    )}
                    <Button variant="ghost" type="button" onClick={() => onClose(false)}>
                        {isOrder ? 'Cerrar' : 'Cancelar'}
                    </Button>
                    {!isOrder && (
                        <Button variant="primary" type="submit">
                            {event ? 'Guardar Cambios' : 'Crear Evento'}
                        </Button>
                    )}
                </div>
            </form>
        </Modal>
    )
}
