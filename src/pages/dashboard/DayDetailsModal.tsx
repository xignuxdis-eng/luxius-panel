import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { CalendarEvent } from '@/types'
import './CalendarView.css'

interface DayDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    date: string
    events: CalendarEvent[]
    onEventClick: (event: CalendarEvent) => void
    onAddEvent: (date: string) => void
}

export default function DayDetailsModal({
    isOpen,
    onClose,
    date,
    events,
    onEventClick,
    onAddEvent
}: DayDetailsModalProps) {

    // Grouping logic
    const critical = events.filter(e => e.type === 'rebotado' || e.type === 'maintenance')
    const production = events.filter(e => e.type === 'order' || e.type === 'assignment')
    const others = events.filter(e => !['rebotado', 'maintenance', 'order', 'assignment'].includes(e.type || ''))

    const formatDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-')
        return `${d}/${m}/${y}`
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Eventos del día: ${formatDate(date)}`}
            size="md"
        >
            <div className="day-details-container">
                {events.length === 0 ? (
                    <div className="empty-day">No hay eventos para este día.</div>
                ) : (
                    <div className="day-groups">
                        {critical.length > 0 && (
                            <div className="event-group critical">
                                <h4>Críticos / Alertas</h4>
                                {critical.map((ev, i) => (
                                    <EventRow key={i} event={ev} onClick={() => onEventClick(ev)} />
                                ))}
                            </div>
                        )}

                        {production.length > 0 && (
                            <div className="event-group production">
                                <h4>Producción</h4>
                                {production.map((ev, i) => (
                                    <EventRow key={i} event={ev} onClick={() => onEventClick(ev)} />
                                ))}
                            </div>
                        )}

                        {others.length > 0 && (
                            <div className="event-group others">
                                <h4>Otros Eventos</h4>
                                {others.map((ev, i) => (
                                    <EventRow key={i} event={ev} onClick={() => onEventClick(ev)} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="day-details-actions">
                    <Button variant="ghost" onClick={onClose}>Cerrar</Button>
                    <Button variant="primary" onClick={() => onAddEvent(date)}>+ Nuevo Evento</Button>
                </div>
            </div>
        </Modal>
    )
}

function EventRow({ event, onClick }: { event: CalendarEvent, onClick: () => void }) {
    return (
        <div className={`event-detail-row event-${event.type}`} onClick={onClick}>
            <div className="event-row-info">
                <span className="event-row-title">{event.title}</span>
                {event.description && <span className="event-row-desc">{event.description}</span>}
            </div>
            <span className="event-row-arrow">→</span>
        </div>
    )
}
