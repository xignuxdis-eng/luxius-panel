import { useState, useEffect } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';

export default function NotepadWidget() {
    const [note, setNote] = useState(() => localStorage.getItem('admin_note') || '');
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            localStorage.setItem('admin_note', note);
            setIsTyping(false);
        }, 1000);
        return () => clearTimeout(timeout);
    }, [note]);

    return (
        <div className="bg-gray-50 rounded-[28px] border border-gray-100 p-6 flex flex-col h-full min-h-[220px] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-gray-400" />
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Bloc de Notas</h3>
                </div>
                {isTyping && <span className="text-[9px] text-gray-400 animate-pulse font-bold tracking-tighter">Guardando...</span>}
            </div>

            <textarea
                value={note}
                onChange={(e) => {
                    setNote(e.target.value);
                    setIsTyping(true);
                }}
                placeholder="Anotaciones rápidas..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-700 placeholder-gray-300 text-sm leading-relaxed custom-scrollbar resize-none font-medium"
            ></textarea>

            <div className="flex gap-2 justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => { setNote(''); localStorage.removeItem('admin_note'); }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
                    title="Borrar todo"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
