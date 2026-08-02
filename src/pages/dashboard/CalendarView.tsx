import { useState, useEffect } from 'react'
import { getCalendarEvents } from '@data/db'
import { useAuthStore } from '@store/authStore'
import { CalendarEvent } from '@/types'
import CalendarEventModal from './CalendarEventModal'
import DayDetailsModal from './DayDetailsModal'
import './CalendarView.css'

export default function CalendarView({ isWidget = false }: { isWidget?: boolean }) {
    const user = useAuthStore(state => state.user)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)

    // Modal state
    const [isEventModalOpen, setIsEventModalOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
    const [selectedDate, setSelectedDate] = useState<string | undefined>()

    // Day Details state
    const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false)
    const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([])

    const loadEvents = async () => {
        try {
            setLoading(true)
            const data = await getCalendarEvents(user?.id, user?.role)
            setEvents(data)
        } catch (error) {
            console.error("Error loading calendar events", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadEvents()
    }, [user])

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const days: { day: number, month: number, year: number, currentMonth: boolean }[] = []
    const totalDays = daysInMonth(year, month)
    const prevMonthDays = daysInMonth(year, month - 1)
    const firstDay = firstDayOfMonth(year, month)

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
        days.push({
            day: prevMonthDays - i,
            month: month === 0 ? 11 : month - 1,
            year: month === 0 ? year - 1 : year,
            currentMonth: false
        })
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
        days.push({ day: i, month, year, currentMonth: true })
    }

    // Next month padding
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
        days.push({
            day: i,
            month: month === 11 ? 0 : month + 1,
            year: month === 11 ? year + 1 : year,
            currentMonth: false
        })
    }

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1))
    }

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1))
    }

    const getDayEventsList = (day: number, m: number, y: number) => {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return events.filter(e => e.start === dateStr)
    }

    const isToday = (day: number, m: number, y: number) => {
        const today = new Date()
        return day === today.getDate() &&
            m === today.getMonth() &&
            y === today.getFullYear()
    }

    const handleDayClick = (dayObj: { day: number, month: number, year: number }, filterClient?: string) => {
        const dateStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`
        const allEvents = getDayEventsList(dayObj.day, dayObj.month, dayObj.year)
        const eventsForDay = filterClient
            ? allEvents.filter(e => e.clienteNombre === filterClient)
            : allEvents

        setSelectedDate(dateStr)
        setDayEvents(eventsForDay)
        setIsDayDetailsOpen(true)
    }

    const handleEventEdit = (ev: CalendarEvent) => {
        setSelectedEvent(ev)
        setIsDayDetailsOpen(false) // Close details to show main edit modal clean
        setIsEventModalOpen(true)
    }

    const handleAddNewFromDetails = (date: string) => {
        setSelectedDate(date)
        setSelectedEvent(null)
        setIsDayDetailsOpen(false)
        setIsEventModalOpen(true)
    }

    const groupEventsByClient = (events: CalendarEvent[]) => {
        const grouped: { [key: string]: CalendarEvent[] } = {}
        const others: CalendarEvent[] = []

        events.forEach(e => {
            if (e.clienteNombre && (e.type === 'order' || e.type === 'assignment' || e.type === 'rebotado')) {
                if (!grouped[e.clienteNombre]) grouped[e.clienteNombre] = []
                grouped[e.clienteNombre].push(e)
            } else {
                others.push(e)
            }
        })

        const result: { type: 'group' | 'individual', name?: string, event?: CalendarEvent, events?: CalendarEvent[], eventType?: string }[] = []

        Object.keys(grouped).forEach(name => {
            result.push({
                type: 'group',
                name,
                events: grouped[name],
                eventType: grouped[name][0].type // Use first event's type for coloring?
            })
        })

        others.forEach(ev => {
            result.push({ type: 'individual', event: ev })
        })

        return result
    }

    if (loading) return <div className="calendar-loading">Cargando calendario...</div>

    const MAX_VISIBLE_ITEMS = isWidget ? 2 : 4

    return (
        <div className={`calendar-view ${isWidget ? 'widget-mode' : ''}`}>
            <div className="calendar-header">
                <button className="btn-icon-sm" onClick={prevMonth}>←</button>
                <h3 className="calendar-title">{monthNames[month]} {year}</h3>
                <button className="btn-icon-sm" onClick={nextMonth}>→</button>
            </div>

            <div className="calendar-grid">
                <div className="weekday">Dom</div>
                <div className="weekday">Lun</div>
                <div className="weekday">Mar</div>
                <div className="weekday">Mié</div>
                <div className="weekday">Jue</div>
                <div className="weekday">Vie</div>
                <div className="weekday">Sáb</div>

                {days.map((d, i) => {
                    const active = isToday(d.day, d.month, d.year)
                    const dayEventsList = getDayEventsList(d.day, d.month, d.year)
                    const grouped = groupEventsByClient(dayEventsList)
                    const visibleItems = grouped.slice(0, MAX_VISIBLE_ITEMS)
                    const extra = grouped.length - MAX_VISIBLE_ITEMS

                    return (
                        <div
                            key={i}
                            className={`calendar-day ${d.currentMonth ? '' : 'inactive'} ${active ? 'today' : ''}`}
                            onClick={() => handleDayClick(d)}
                        >
                            <span className="day-number">{d.day}</span>
                            <div className="day-events">
                                {visibleItems.map((item, idx) => (
                                    item.type === 'group' ? (
                                        <div
                                            key={idx}
                                            className={`event-item event-${item.eventType} grouped-item`}
                                            title={`Click para ver ${item.events?.length} órdenes de ${item.name}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDayClick(d, item.name);
                                            }}
                                        >
                                            <span className="event-title">👥 {item.name} ({item.events?.length})</span>
                                        </div>
                                    ) : (
                                        <div
                                            key={idx}
                                            className={`event-item event-${item.event?.type}`}
                                            title={`${item.event?.title}${item.event?.description ? ': ' + item.event?.description : ''}`}
                                            onClick={(e) => {
                                                if (item.event) {
                                                    e.stopPropagation();
                                                    handleEventEdit(item.event);
                                                }
                                            }}
                                        >
                                            <span className="event-title">{item.event?.title}</span>
                                        </div>
                                    )
                                ))}
                                {extra > 0 && (
                                    <div className="more-badge" onClick={(e) => { e.stopPropagation(); handleDayClick(d); }}>
                                        +{extra} más
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* List of events for the day */}
            <DayDetailsModal
                isOpen={isDayDetailsOpen}
                onClose={() => setIsDayDetailsOpen(false)}
                events={dayEvents}
                date={selectedDate || ''}
                onEventClick={handleEventEdit}
                onAddEvent={handleAddNewFromDetails}
            />

            {/* Specific Event Edit/Create */}
            <CalendarEventModal
                isOpen={isEventModalOpen}
                onClose={(refresh) => {
                    setIsEventModalOpen(false)
                    if (refresh) loadEvents()
                }}
                event={selectedEvent}
                defaultDate={selectedDate}
                userId={user?.id}
            />
        </div>
    )
}

