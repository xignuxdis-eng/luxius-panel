import { useState, useRef, useEffect } from 'react';
import { 
    X, Send, Bot, Sparkles, AlertTriangle, Database, 
    Activity, RefreshCw, ChevronDown, Package, Trash2, Zap, Calculator, HelpCircle
} from 'lucide-react';
import { getRecentLogs, clearLogs, RecordedError } from '../utils/errorRecorder';
import { API_URL } from '../data/db';
import './XanaAssistant.css';

interface Message {
    role: 'user' | 'bot';
    text: string;
    isDiagnostic?: boolean;
    logsCount?: number;
    time?: string;
}

export default function XanaAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { 
            role: 'bot', 
            text: '¡Hola! Soy **Xana AI**, tu copiloto de LuXius.\n\nPuedes hacerme preguntas sobre pedidos, cotizaciones, stock, pedirme cálculos de planchas/calcos o seleccionar una opción en **⚡ Acciones**.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const getUserInfo = () => {
        try {
            const authRaw = localStorage.getItem('luxius_auth');
            if (authRaw) {
                const parsed = JSON.parse(authRaw);
                if (parsed?.state?.user) {
                    return {
                        role: (parsed.state.user.rol || parsed.state.user.role || 'cliente').toLowerCase(),
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
    const isImpresor = userInfo.role === 'impresor' || isAdmin;
    const isCliente = userInfo.role === 'cliente';

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Close dropdown menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    const sendMessage = async (customText?: string, sendLogs: boolean = false) => {
        const textToSend = customText || input.trim();
        if (!textToSend || isLoading) return;

        const capturedLogs: RecordedError[] = sendLogs ? getRecentLogs() : [];
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        setMessages(prev => [
            ...prev, 
            { 
                role: 'user', 
                text: textToSend, 
                isDiagnostic: sendLogs, 
                logsCount: capturedLogs.length,
                time: timeNow
            }
        ]);
        
        setInput('');
        setIsMenuOpen(false);
        setIsLoading(true);

        try {
            const history = messages.slice(-6).map(m => ({ role: m.role, content: m.text }));
            const payload = {
                message: textToSend,
                history: history,
                userRole: userInfo.role,
                username: userInfo.username,
                userId: userInfo.id,
                clientLogs: capturedLogs,
                currentUrl: window.location.pathname
            };

            const response = await fetch(`${API_URL}/xana/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Error de conexión');
            }

            const data = await response.json();
            
            if (sendLogs) {
                clearLogs(); 
            }

            setMessages(prev => [
                ...prev, 
                { 
                    role: 'bot', 
                    text: data.reply || 'Respuesta recibida.',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } catch (error) {
            console.error("Xana Error:", error);
            setMessages(prev => [
                ...prev, 
                { 
                    role: 'bot', 
                    text: '⚠️ No pude conectar con el cerebro de Xana en este momento. Por favor verifica tu conexión o intenta nuevamente en unos segundos.',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } finally {
            setIsLoading(false);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    };

    const handleClearChat = () => {
        setMessages([
            { 
                role: 'bot', 
                text: 'Conversación reiniciada. ¿En qué puedo asistirte ahora?',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ]);
        setIsMenuOpen(false);
    };

    // Simple markdown renderer for bold, code and bullet lines
    const renderFormattedText = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, idx) => {
            // Process bold **text** and `code`
            let formatted: React.ReactNode = line;
            const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
            if (parts.length > 1) {
                formatted = parts.map((part, pIdx) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith('`') && part.endsWith('`')) {
                        return <code key={pIdx} className="xana-inline-code">{part.slice(1, -1)}</code>;
                    }
                    return part;
                });
            }

            return (
                <div key={idx} className={line.startsWith('•') || line.startsWith('-') ? 'xana-bullet-line' : 'xana-text-line'}>
                    {formatted}
                </div>
            );
        });
    };

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="xana-button"
                    title="Abrir Asistente Xana AI"
                >
                    <Sparkles size={22} />
                </button>
            )}

            {isOpen && (
                <div className="xana-chat-container animate-fade-in">
                    {/* Header */}
                    <div className="xana-header">
                        <div className="xana-header-info">
                            <div className="xana-avatar">
                                <Bot size={22} />
                            </div>
                            <div>
                                <div className="xana-title-row">
                                    <h3 className="xana-title">Xana AI</h3>
                                    <span className="xana-role-badge">
                                        {userInfo.role}
                                    </span>
                                </div>
                                <p className="xana-subtitle">Copiloto de Diagnóstico & Taller</p>
                            </div>
                        </div>

                        <div className="xana-header-actions" ref={menuRef}>
                            {/* Desplegable de Acciones Rápidas */}
                            <button 
                                className={`xana-menu-trigger ${isMenuOpen ? 'active' : ''}`}
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                title="Acciones y Consultas Rápidas"
                            >
                                <Zap size={14} />
                                <span>Acciones</span>
                                <ChevronDown size={14} className={`chevron-icon ${isMenuOpen ? 'rotated' : ''}`} />
                            </button>

                            {isMenuOpen && (
                                <div className="xana-dropdown-menu">
                                    <div className="dropdown-header">Consultas Rápidas</div>
                                    
                                    {/* Cálculo de imposición (Para todos) */}
                                    <button 
                                        className="dropdown-item item-calc"
                                        onClick={() => sendMessage('¿Cuántos calcos de 5x5 cm entran en una hoja A4?')}
                                    >
                                        <Calculator size={15} />
                                        <div>
                                            <strong>Calcular Planchas / Calcos</strong>
                                            <small>Rendimiento e imposición A4/A3</small>
                                        </div>
                                    </button>

                                    {/* Órdenes */}
                                    <button 
                                        className="dropdown-item item-orders"
                                        onClick={() => sendMessage(isCliente ? '¿Cómo consulto el estado de mis pedidos?' : '¿Cuál es el estado general de las órdenes de trabajo activas?')}
                                    >
                                        <Activity size={15} />
                                        <div>
                                            <strong>{isCliente ? 'Mis Pedidos' : 'Estado de Órdenes'}</strong>
                                            <small>{isCliente ? 'Seguimiento de mis trabajos' : 'Resumen de taller y pendientes'}</small>
                                        </div>
                                    </button>

                                    {/* Stock (Admin / Impresor) */}
                                    {isImpresor && (
                                        <button 
                                            className="dropdown-item item-stock"
                                            onClick={() => sendMessage('Revisar estado e inventario de stock y materiales')}
                                        >
                                            <Package size={15} />
                                            <div>
                                                <strong>Alertas de Stock</strong>
                                                <small>Nivel de lonas, vinilos y tintas</small>
                                            </div>
                                        </button>
                                    )}

                                    {/* Materiales y Formatos (Cliente) */}
                                    {isCliente && (
                                        <button 
                                            className="dropdown-item item-help"
                                            onClick={() => sendMessage('¿Qué formatos de archivos y materiales aceptan?')}
                                        >
                                            <HelpCircle size={15} />
                                            <div>
                                                <strong>Formatos & Materiales</strong>
                                                <small>Requisitos técnicos de diseño</small>
                                            </div>
                                        </button>
                                    )}

                                    {/* Diagnóstico (Admin / Impresor) */}
                                    {isImpresor && (
                                        <button 
                                            className="dropdown-item item-diagnostic"
                                            onClick={() => sendMessage('Diagnostica los errores recientes de pantalla y consola', true)}
                                        >
                                            <AlertTriangle size={15} />
                                            <div>
                                                <strong>Diagnóstico del Sistema</strong>
                                                <small>Analizar logs de consola y UI</small>
                                            </div>
                                        </button>
                                    )}

                                    {/* Salud BD (Solo Admin) */}
                                    {isAdmin && (
                                        <button 
                                            className="dropdown-item item-db"
                                            onClick={() => sendMessage('Audita la salud de la base de datos Neon y tablas del sistema')}
                                        >
                                            <Database size={15} />
                                            <div>
                                                <strong>Salud de Base de Datos</strong>
                                                <small>Auditar motor PostgreSQL / Neon</small>
                                            </div>
                                        </button>
                                    )}

                                    <div className="dropdown-divider" />
                                    
                                    <button 
                                        className="dropdown-item item-clear"
                                        onClick={handleClearChat}
                                    >
                                        <Trash2 size={15} />
                                        <div>
                                            <strong>Limpiar Chat</strong>
                                            <small>Reiniciar conversación actual</small>
                                        </div>
                                    </button>
                                </div>
                            )}

                            <button onClick={() => setIsOpen(false)} className="xana-close-btn" title="Cerrar">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div ref={scrollRef} className="xana-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`xana-msg-row ${msg.role === 'user' ? 'xana-msg-user' : 'xana-msg-bot'}`}>
                                <div className={`xana-bubble ${msg.role === 'user' ? 'xana-bubble-user' : 'xana-bubble-bot'}`}>
                                    {msg.isDiagnostic && (
                                        <div className="xana-diagnostic-badge">
                                            🩺 Diagnóstico adjunto ({msg.logsCount || 0} logs)
                                        </div>
                                    )}
                                    <div className="xana-bubble-content">
                                        {renderFormattedText(msg.text)}
                                    </div>
                                    {msg.time && (
                                        <div className="xana-msg-time">{msg.time}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="xana-msg-row xana-msg-bot">
                                <div className="xana-loading">
                                    <RefreshCw size={15} className="animate-spin" />
                                    <span>Xana está calculando...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Footer */}
                    <div className="xana-input-area">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Escribe tu consulta o pide un cálculo..."
                            className="xana-input"
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={isLoading || !input.trim()}
                            className="xana-send-btn"
                            title="Enviar mensaje"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
