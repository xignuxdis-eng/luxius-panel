import { useState, useRef, useEffect } from "react";
import { 
  MessageCircle, 
  Send, 
  X, 
  Bot, 
  User, 
  Loader2,
  Minimize2,
  Maximize2
} from "lucide-react";
import { classifyUserIntent } from "../services/intentClassifier";
import { getContextualResponse } from "../services/contextResponses";
import { callOpenAIWithContext, shouldUseOpenAI, isOpenAIConfigured } from "../services/openaiService";
import { buscarRespuestaPredefinida, filtrarRespuestaPorRol } from "../utils/xanaFaqHandler";
import { ChatMessage, UserContext } from "../config/xanaConfig";

export default function XanaAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: '¡Hola! Soy Xana AI, tu asistente virtual en LuXius. ¿En qué puedo ayudarte hoy?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Obtener contexto del usuario desde localStorage
  const getUserContext = (): UserContext => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          rol: user.role || 'cliente',
          username: user.username || 'Usuario',
        };
      }
    } catch (error) {
      console.error('Error al obtener contexto del usuario:', error);
    }
    
    return {
      rol: 'cliente',
      username: 'Usuario',
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Mantener el foco en el input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);

    try {
      // Clasificar la intención del usuario
      const intentClassification = classifyUserIntent(inputText.trim());
      const userContext = getUserContext();

      console.log('🔍 Xana AI - Procesando mensaje:', {
        input: inputText.trim(),
        intent: intentClassification.intent,
        confidence: intentClassification.confidence,
        userContext
      });

      let aiResponse: string;

      // 1️⃣ Buscar respuesta en la base de FAQs (más rápido, sin gastar tokens)
      const respuestaFAQ = buscarRespuestaPredefinida(userContext.rol, inputText.trim());
      
      if (respuestaFAQ) {
        console.log('📚 Xana AI - Usando respuesta de FAQ');
        aiResponse = respuestaFAQ;
      } else {
        // 2️⃣ Si no hay FAQ, usar el sistema híbrido
        if (shouldUseOpenAI(intentClassification.intent, intentClassification.confidence)) {
          console.log('🤖 Xana AI - Usando OpenAI para respuesta');
          const openAIResponse = await callOpenAIWithContext(inputText.trim(), userContext);
          aiResponse = openAIResponse.text;
        } else {
          console.log('📋 Xana AI - Usando respuesta contextual del sistema');
          aiResponse = getContextualResponse(intentClassification.intent, userContext);
        }
      }

      // 3️⃣ Filtrar respuesta según el rol (seguridad)
      aiResponse = filtrarRespuestaPorRol(aiResponse, userContext.rol);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
      
      // Respuesta de fallback
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Lo siento, tuve un problema procesando tu mensaje. ¿Podrías intentar de nuevo?",
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
      
      // Mantener el foco después de la respuesta
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Botón flotante cuando está cerrado
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-42 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 flex items-center space-x-2"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Xana AI</span>
        </button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <div className="bg-purple-600 text-white p-2 rounded-lg shadow-lg flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="hover:bg-purple-700 p-1 rounded"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium">Xana AI</span>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-purple-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-purple-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5" />
          <span className="font-medium">Xana AI</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-purple-700 p-1 rounded"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-purple-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 chat-scrollbar">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs p-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.sender === 'ai' && (
                  <Bot className="w-4 h-4 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="text-sm whitespace-pre-wrap">
                    {message.isLoading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Xana está escribiendo...</span>
                      </div>
                    ) : (
                      message.text
                    )}
                  </div>
                  <div className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-purple-200' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
                {message.sender === 'user' && (
                  <User className="w-4 h-4 mt-1 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 max-w-xs p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Xana está escribiendo...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            autoFocus
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors duration-200"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          💡 Prueba preguntar sobre: pedidos, archivos, materiales, precios, navegación o soporte.
          {!isOpenAIConfigured() && (
            <div className="text-yellow-600 mt-1">
              ⚠️ OpenAI no configurado - usando respuestas del sistema
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 