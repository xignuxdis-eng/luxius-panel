import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles } from 'lucide-react';

export default function XanaAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
        { role: 'bot', text: '¡Hola! Soy Xana, tu asistente de LuXius. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');

        // Simulación de respuesta IA - Entrenamiento Industria Gráfica Argentina
        setTimeout(() => {
            let response = "Entendido, che. ¿En qué más te puedo dar una mano con la producción?";
            const msg = userMsg.toLowerCase();

            if (msg.includes("hola")) {
                response = "¡Hola! ¿Cómo va el trabajo hoy? ¿Todo bien?";
            } else if (msg.includes("orden")) {
                response = "Las órdenes de trabajo están en el panel de producción. ¿Querés que miremos alguna bajada específica?";
            } else if (msg.includes("stock") || msg.includes("material")) {
                response = "Tenemos stock de vinilo monomérico y lona frontlight. El inventario está valorado en approx. $4,000,000 ARS.";
            } else if (msg.includes("vinilo")) {
                response = "Manejamos vinilo monomérico para promocionales y polimérico para mayor durabilidad. ¿Para qué superficie lo buscás?";
            } else if (msg.includes("lona")) {
                response = "Trabajamos con Lona Frontlight para cartelería común y Backlight para cajas de luz. También tenemos Blackout.";
            } else if (msg.includes("precio")) {
                response = "Los precios se calculan según los m2 y el material. Por ejemplo, el m2 de lona está en $2600 ARS ahora.";
            }

            setMessages(prev => [...prev, { role: 'bot', text: response }]);
        }, 1000);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Botón flotante */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform active:scale-95"
                >
                    <Bot className="w-8 h-8" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
                </button>
            )}

            {/* Ventana de chat */}
            {isOpen && (
                <div className="bg-white w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-300" />
                            <div>
                                <h3 className="font-bold">Xana AI</h3>
                                <p className="text-xs text-purple-100">En línea</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Mensajes */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                    ? 'bg-purple-600 text-white rounded-tr-none'
                                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-gray-200">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Pregúntale a Xana..."
                                className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                                onClick={handleSend}
                                className="bg-purple-600 text-white p-2 rounded-xl hover:bg-purple-700 transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
