import { useState, useEffect } from 'react'
import { API_URL } from '@/data/db'

type ServerStatus = 'online' | 'offline' | 'waking'

export default function ServerStatusLed() {
    const [status, setStatus] = useState<ServerStatus>('waking')
    const [latency, setLatency] = useState<number | null>(null)
    const [lastCheck, setLastCheck] = useState<string>('')

    const checkServer = async () => {
        const start = performance.now()
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 8000)

            const res = await fetch(`${API_URL}/health`, {
                signal: controller.signal
            })
            clearTimeout(timeout)

            const elapsed = Math.round(performance.now() - start)
            setLatency(elapsed)

            if (res.ok) {
                setStatus('online')
            } else {
                setStatus('offline')
            }
        } catch {
            const elapsed = Math.round(performance.now() - start)
            // If it took > 3s, server is likely waking up (Render cold start)
            if (elapsed > 3000) {
                setStatus('waking')
            } else {
                setStatus('offline')
            }
            setLatency(null)
        }

        const now = new Date()
        setLastCheck(now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
    }

    useEffect(() => {
        checkServer()
        const interval = setInterval(checkServer, 30000) // Check every 30s
        return () => clearInterval(interval)
    }, [])

    const statusConfig = {
        online: {
            color: '#22c55e',
            shadow: '0 0 6px #22c55e, 0 0 12px rgba(34, 197, 94, 0.4)',
            label: 'Servidor conectado',
            pulse: false
        },
        waking: {
            color: '#f59e0b',
            shadow: '0 0 6px #f59e0b, 0 0 12px rgba(245, 158, 11, 0.4)',
            label: 'Servidor despertando...',
            pulse: true
        },
        offline: {
            color: '#ef4444',
            shadow: '0 0 6px #ef4444, 0 0 12px rgba(239, 68, 68, 0.4)',
            label: 'Servidor desconectado',
            pulse: false
        }
    }

    const cfg = statusConfig[status]
    const title = `${cfg.label}${latency ? ` (${latency}ms)` : ''}${lastCheck ? ` · ${lastCheck}` : ''}`

    return (
        <div
            className="server-status-led"
            title={title}
            onClick={checkServer}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                color: 'var(--text-secondary)',
                transition: 'all 0.2s ease',
                userSelect: 'none',
            }}
        >
            <span
                style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: cfg.color,
                    boxShadow: cfg.shadow,
                    display: 'inline-block',
                    flexShrink: 0,
                    animation: cfg.pulse ? 'server-led-pulse 1.5s ease-in-out infinite' : 'none',
                }}
            />
            <span style={{ opacity: 0.8, letterSpacing: '0.3px' }}>
                {status === 'online' && latency ? `${latency}ms` : status === 'waking' ? 'Wake...' : status === 'offline' ? 'OFF' : '...'}
            </span>

            <style>{`
                @keyframes server-led-pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.85); }
                }
                .server-status-led:hover {
                    background: var(--bg-tertiary) !important;
                }
            `}</style>
        </div>
    )
}
