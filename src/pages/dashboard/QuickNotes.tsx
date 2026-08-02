import { useState, useEffect } from 'react'
import { getDashboardNotes, saveDashboardNotes } from '@data/db'
import { useAuthStore } from '@store/authStore'
import './QuickNotes.css'

export default function QuickNotes() {
    const user = useAuthStore((state) => state.user)
    const [notes, setNotes] = useState('')

    useEffect(() => {
        if (user?.id) {
            setNotes(getDashboardNotes(user.id))
        }
    }, [user?.id])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setNotes(val)
        if (user?.id) {
            saveDashboardNotes(user.id, val)
        }
    }


    return (
        <div className="quick-notes">
            <h3>Bloc de Notas Rápidas</h3>
            <textarea
                className="notes-textarea"
                placeholder="Escribe tus notas aquí..."
                value={notes}
                onChange={handleChange}
            />
        </div>
    )
}
