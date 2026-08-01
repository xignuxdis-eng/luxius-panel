import { useState, useEffect, useRef } from 'react'
import Modal from '@components/ui/Modal'
import type { Order } from '@/types'
import { API_URL } from '@data/db'

interface Message {
    id: string
    sender: 'web' | 'app' | 'sistema'
    senderName: string
    text: string
    timestamp: string
}

interface OrderChatModalProps {
    isOpen: boolean
    onClose: () => void
    order: Order | null
}

export default function OrderChatModal({ isOpen, onClose, order }: OrderChatModalProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputText, setInputText] = useState('')
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const orderId = (order as any)?.uuid || order?.id

    const fetchMessages = async () => {
        if (!orderId) return
        try {
            const res = await fetch(`${API_URL}/orders/${orderId}/messages`)
            if (res.ok) {
                const data = await res.json()
                if (data.messages) {
                    setMessages(data.messages)
                }
            }
        } catch (err) {
            console.error('Error al cargar mensajes:', err)
        }
    }

    useEffect(() => {
        if (isOpen && orderId) {
            setLoading(true)
            fetchMessages().finally(() => setLoading(false))

            // Poll every 3 seconds for new messages
            const interval = setInterval(fetchMessages, 3000)
            return () => clearInterval(interval)
        }
    }, [isOpen, orderId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSendMessage = async (textToSend?: string) => {
        const text = textToSend || inputText.trim()
        if (!text || !orderId) return

        setSending(true)
        try {
            const res = await fetch(`${API_URL}/orders/${orderId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: 'web',
                    senderName: 'Admin Luxius',
                    text: text
                })
            })
            if (res.ok) {
                setInputText('')
                await fetchMessages()
            }
        } catch (err) {
            console.error('Error al enviar mensaje:', err)
        } finally {
            setSending(false)
        }
    }

    if (!isOpen || !order) return null

    const presets = [
        '¿Confirmado el color y material?',
        'Por favor verificar medidas en sitio.',
        'Se requiere foto adicional del soporte.',
        'Orden aprobada, pasando a producción 🖨️'
    ]

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`💬 Chat Directo con Operario — OT #${order.id}`}
            size="md"
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '500px', gap: '12px' }}>
                {/* Header Info */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>Proyecto / Tarea:</span>
                        <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{order.nombreTarea || order.clienteNombre}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: order.origen === 'mobile' ? 'rgba(0, 218, 243, 0.15)' : 'rgba(147, 51, 234, 0.15)',
                            color: order.origen === 'mobile' ? '#00daf3' : '#c084fc',
                            border: `1px solid ${order.origen === 'mobile' ? 'rgba(0, 218, 243, 0.4)' : 'rgba(147, 51, 234, 0.3)'}`
                        }}>
                            {order.origen === 'mobile' ? '📱 App Operario' : '💻 Sistema Web'}
                        </span>
                    </div>
                </div>

                {/* Messages Box */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px',
                    background: '#0f172a',
                    borderRadius: '8px',
                    border: '1px solid #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>
                            <div className="spinner"></div>
                            <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>Cargando conversación...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#64748b', margin: 'auto' }}>
                            <span style={{ fontSize: '2rem' }}>💬</span>
                            <p style={{ marginTop: '6px', fontSize: '0.9rem' }}>Sin mensajes previos.</p>
                            <p style={{ fontSize: '0.75rem', color: '#475569' }}>Envía un mensaje para comunicarte en tiempo real con el operario en campo.</p>
                        </div>
                    ) : (
                        messages.map((m) => {
                            const isMe = m.sender === 'web'
                            return (
                                <div
                                    key={m.id}
                                    style={{
                                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                                        maxWidth: '80%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isMe ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>
                                        {m.senderName} · {m.timestamp}
                                    </span>
                                    <div style={{
                                        padding: '10px 14px',
                                        borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                                        background: isMe ? '#2563eb' : '#334155',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        lineHeight: 1.4,
                                        wordBreak: 'break-word',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                                    }}>
                                        {m.text}
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Presets */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                    {presets.map((preset, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSendMessage(preset)}
                            style={{
                                whiteSpace: 'nowrap',
                                fontSize: '0.75rem',
                                padding: '4px 10px',
                                background: '#1e293b',
                                color: '#94a3b8',
                                border: '1px solid #334155',
                                borderRadius: '14px',
                                cursor: 'pointer'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
                            onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                            + {preset}
                        </button>
                    ))}
                </div>

                {/* Input Area */}
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                    style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Escribe un mensaje al operario..."
                        style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#fff',
                            fontSize: '0.9rem',
                            outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={sending || !inputText.trim()}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '8px',
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 700,
                            cursor: 'pointer',
                            opacity: sending || !inputText.trim() ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        {sending ? '...' : 'Enviar 📤'}
                    </button>
                </form>
            </div>
        </Modal>
    )
}
