import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Check, 
  Trash2, 
  Move, 
  Minimize2, 
  Maximize2, 
  X,
  StickyNote
} from "lucide-react";

interface Note {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

export default function QuickNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const notesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar notas desde localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('quickNotes');
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt)
      }));
      setNotes(parsedNotes);
    }
  }, []);

  // Guardar notas en localStorage
  useEffect(() => {
    localStorage.setItem('quickNotes', JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    if (newNote.trim()) {
      const note: Note = {
        id: Date.now().toString(),
        text: newNote.trim(),
        completed: false,
        createdAt: new Date()
      };
      setNotes(prev => [note, ...prev]);
      setNewNote('');
      
      // Enfocar el input después de agregar
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const toggleNote = (id: string) => {
    setNotes(prev => 
      prev.map(note => 
        note.id === id ? { ...note, completed: !note.completed } : note
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (notesRef.current) {
      const rect = notesRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Botón flotante cuando está cerrado
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-20 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 flex items-center space-x-2"
        >
          <StickyNote className="w-5 h-5" />
          <span className="text-sm font-medium">Notas</span>
        </button>
      </div>
    );
  }

  // Versión minimizada
  if (isMinimized) {
    return (
      <div 
        className="fixed z-50 cursor-move"
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
        ref={notesRef}
      >
        <div className="bg-yellow-500 text-white p-2 rounded-lg shadow-lg flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="hover:bg-yellow-600 p-1 rounded"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium">Notas ({notes.length})</span>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-yellow-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 cursor-move"
      style={{ left: position.x, top: position.y, width: '320px' }}
      onMouseDown={handleMouseDown}
      ref={notesRef}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-yellow-500 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <StickyNote className="w-5 h-5" />
          <span className="font-medium">Notas Rápidas</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-yellow-600 p-1 rounded"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-yellow-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Add Note */}
        <div className="flex items-center space-x-2 mb-3">
          <input
            ref={inputRef}
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Agregar nota rápida..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
            autoFocus
          />
          <button
            onClick={addNote}
            disabled={!newNote.trim()}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Notes List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="text-center py-4">
              <StickyNote className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No hay notas</p>
              <p className="text-xs text-gray-400">Agrega tu primera nota</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`flex items-start space-x-2 p-2 rounded-lg border ${
                  note.completed 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <button
                  onClick={() => toggleNote(note.id)}
                  className={`mt-0.5 p-1 rounded ${
                    note.completed 
                      ? 'text-green-600 hover:text-green-700' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {note.completed ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${
                    note.completed 
                      ? 'text-gray-500 line-through' 
                      : 'text-gray-700'
                  }`}>
                    {note.text}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {note.createdAt.toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-red-400 hover:text-red-600 p-1 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Stats */}
        {notes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {notes.filter(note => note.completed).length} de {notes.length} completadas
              </span>
              <span>
                {Math.round((notes.filter(note => note.completed).length / notes.length) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 