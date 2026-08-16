import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Sparkles, AlertTriangle, Database, Activity, RefreshCw } from 'lucide-react';
import { getRecentLogs, clearLogs, RecordedError } from '../utils/errorRecorder';
import { API_URL } from '../data/db';
import './XanaAssistant.css';

interface Message {
    role: 'user' | 'bot';
    text: string;
    isDiagnostic?: boolean;
    logsCount?: number;
}

export default function XanaAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { 
            role: 'bot', 
            text: '¡Hola! Soy Xana AI, tu asistente de LuXius. Puedo ayudarte con pedidos, cotizaciones o diagnosticar cualquier error del sistema.' 
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const getUserInfo = () => {
        try {
            const authRaw = localStorage.getItem('luxius_auth');
            if (authRaw) {
                const parsed = JSON.parse(authRaw);
                if (parsed?.state?.user) {
                    return {
                        role: parsed.state.user.rol || parsed.state.user.role || 'cliente',
                        username: parsed.state.user.nombre || parsed.state.user.username || 'Usuario',
                        id: parsed.state.user.id || 0
                    };
                }
            }
        } catch (_) {}
        return { role: 'admin', username: 'Administrador', id: 1 };
    };

    const userInfo = getUserInfo();
    const isAdmin = userInfo.role === 'admin';

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const sendMessage = async (customText?: string, sendLogs: boolean = false) => {
        const textToSend = customText || input.trim();
        if (!textToSend || isLoading) return;

        const capturedLogs: RecordedError[] = sendLogs ? getRecentLogs() : [];
        
        setMessages(prev => [
            ...prev, 
            { role: 'user', text: textToSend, isDiagnostic: sendLogs, logsCount: capturedLogs.length }
        ]);
        
        setInput('');
        setIsLoading(true);

        try {
            const payload = {
                message: textToSend,
                context: {
                    userRole: userInfo.role,
                    userName: userInfo.username,
                    currentView: window.location.pathname,
                    logs: capturedLogs
                }
            };

            const response = await fetch(`${API_URL}/xana/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Error al conectar con el servidor');
            }

            const data = await response.json();
            
            if (sendLogs) {
                clearLogs(); 
            }

            setMessages(prev => [
                ...prev, 
                { role: 'bot', text: data.reply }
            ]);
        } catch (error) {
            console.error("Xana Error:", error);
            setMessages(prev => [
                ...prev, 
                { role: 'bot', text: 'Lo siento, no pude procesar tu mensaje. El servidor no está disponible.' }
            ]);
        } finally {
            setIsLoading(false);
            // Re-focus after sending
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    };

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="xana-button"
                    title="Asistente Xana AI & Diagnósticos"
                >
                    <Sparkles size={24} />
                </button>
            )}

            {isOpen && (
                <div className="xana-chat-container">
                    <div className="xana-header">
                        <div className="xana-header-info">
                            <div className="xana-avatar">
                                <Bot size={24} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <h3 className="xana-title">Xana AI</h3>
                                    <span className="xana-role-badge">
                                        {userInfo.role}
                                    </span>
                                </div>
                                <p className="xana-subtitle">Diagnóstico & Gestión Gráfica</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="xana-close-btn">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="xana-quick-actions">
                        <button
                            onClick={() => sendMessage('Diagnostica los errores recientes de pantalla y consola', true)}
                            disabled={isLoading}
                            className="xana-pill xana-pill-red"
                        >
                            <AlertTriangle size={14} />
                            <span>Diagnosticar Errores</span>
                        </button>
                        <button
                            onClick={() => sendMessage('¿Cuál es el estado general de las órdenes de trabajo activas?')}
                            disabled={isLoading}
                            className="xana-pill xana-pill-indigo"
                        >
                            <Activity size={14} />
                            <span>Estado Órdenes</span>
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => sendMessage('Audita la salud de la base de datos Neon y tablas del sistema')}
                                disabled={isLoading}
                                className="xana-pill xana-pill-purple"
                            >
                                <Database size={14} />
                                <span>Salud BD</span>
                            </button>
                        )}
                    </div>

                    <div ref={scrollRef} className="xana-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`xana-msg-row ${msg.role === 'user' ? 'xana-msg-user' : 'xana-msg-bot'}`}>
                                <div className={`xana-bubble ${msg.role === 'user' ? 'xana-bubble-user' : 'xana-bubble-bot'}`}>
                                    {msg.isDiagnostic && (
                                        <div className="xana-diagnostic-badge">
                                            🩺 Diagnóstico adjunto ({msg.logsCount || 0} logs de consola)
                                        </div>
                                    )}
                                    <div>{msg.text}</div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="xana-msg-row xana-msg-bot">
                                <div className="xana-loading">
                                    <RefreshCw size={16} className="animate-spin" />
                                    <span>Xana está analizando...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="xana-input-area">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Pregúntale a Xana o pide un diagnóstico..."
                            className="xana-input"
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={isLoading || !input.trim()}
                            className="xana-send-btn"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
