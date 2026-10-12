import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@store/authStore'
import { API_URL, isCapacitorNative, setCustomApiUrl } from '@/data/db'
import type { LoginCredentials } from '@/types'
import './Login.css'

export default function Login() {
    const navigate = useNavigate()
    const login = useAuthStore((state) => state.login)

    const buildTime = '2026-10-12 15:40'
    const [isLoading, setIsLoading] = useState(false)
    const [isWakingServer, setIsWakingServer] = useState(false)
    const [error, setError] = useState('')

    const [showPassword, setShowPassword] = useState(false)

    // Server Connectivity & Configuration
    const [serverStatus, setServerStatus] = useState<'idle' | 'checking' | 'online' | 'sleeping' | 'offline'>('idle')
    const [serverPingMs, setServerPingMs] = useState<number | null>(null)
    const [showServerModal, setShowServerModal] = useState(false)
    const [customUrlInput, setCustomUrlInput] = useState(localStorage.getItem('luxius_api_url') || '')

    const isCloudServer = API_URL.includes('luxius-backend.onrender.com')
    const isCustomServer = !!localStorage.getItem('luxius_api_url')

    const checkServerHealth = async () => {
        setServerStatus('checking')
        const start = Date.now()
        try {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 12000)
            const healthUrl = API_URL.replace(/\/+$/, '') + '/health'
            const res = await fetch(`${healthUrl}?_t=${Date.now()}`, {
                signal: controller.signal,
                cache: 'no-store'
            }).catch(() => null)
            clearTimeout(timer)

            if (res && (res.status === 200 || res.status === 401 || res.status === 403)) {
                setServerPingMs(Date.now() - start)
                setServerStatus('online')
            } else if (!res) {
                // Posible suspensión en la nube
                setServerStatus('sleeping')
            } else {
                setServerStatus('online')
            }
        } catch {
            setServerStatus('offline')
        }
    }

    useEffect(() => {
        checkServerHealth()
    }, [])

    const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>()

    const onSubmit = async (data: LoginCredentials) => {
        setIsLoading(true)
        setError('')
        setIsWakingServer(false)

        const wakeTimer = setTimeout(() => {
            setIsWakingServer(true)
        }, 2500)

        const result = await login(data)
        clearTimeout(wakeTimer)
        setIsWakingServer(false)

        if (result.success) {
            if (isCapacitorNative() || window.innerWidth < 768) {
                navigate('/mobile')
            } else {
                navigate('/')
            }
        } else {
            setError(result.message || 'Error desconocido al iniciar sesión')
        }

        setIsLoading(false)
    }


    return (
        <div className="login-page">
            <div className="login-background">
                <div className="login-gradient"></div>
            </div>

            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo">
                            <span className="logo-icon">✦</span>
                            <span className="logo-text">LuXius</span>
                        </div>
                        <p className="logo-subtitle">...núcleo Operativo de XignuX</p>
                        <p className="logo-subtitle">Ingresa tus credenciales para continuar</p>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
                        <div className="form-group">
                            <label htmlFor="username">Usuario</label>
                            <input
                                id="username"
                                type="text"
                                placeholder="Ingresa tu usuario"
                                autoComplete="username"
                                {...register('username', { required: 'Usuario es requerido' })}
                            />
                            {errors.username && (
                                <span className="form-error">{errors.username.message}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Contraseña</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Ingresa tu contraseña"
                                    autoComplete="current-password"
                                    style={{ width: '100%', paddingRight: '42px' }}
                                    {...register('password', { required: 'Contraseña es requerida' })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: 0.8,
                                        transition: 'opacity 0.2s',
                                        userSelect: 'none'
                                    }}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {errors.password && (
                                <span className="form-error">{errors.password.message}</span>
                            )}
                        </div>

                        {error && (
                            <div className="login-error">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-button"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="loading-spinner"></span>
                            ) : (
                                'Ingresar'
                            )}
                        </button>

                        {isWakingServer && (
                            <div style={{
                                marginTop: '12px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: '#93c5fd',
                                fontSize: '0.8rem',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}>
                                <span className="loading-spinner" style={{ width: '12px', height: '12px' }}></span>
                                <span>Despertando servidor en la nube... Esto puede tomar unos segundos.</span>
                            </div>
                        )}

                        {/* Barra de conectividad del servidor */}
                        <div className="login-server-bar">
                            <div 
                                className="login-server-info" 
                                onClick={checkServerHealth} 
                                title="Toca para verificar estado de conexión"
                            >
                                <span className={`status-indicator-dot ${serverStatus}`}></span>
                                <span className="server-text-main">
                                    {isCloudServer ? '☁️ Nube Render' : isCustomServer ? '🌐 Personalizado' : '💻 Servidor Local'}
                                </span>
                                {serverStatus === 'online' && serverPingMs !== null && (
                                    <span className="server-ping-pill">{serverPingMs}ms</span>
                                )}
                                {serverStatus === 'checking' && (
                                    <span className="server-ping-pill">probando...</span>
                                )}
                                {serverStatus === 'sleeping' && (
                                    <span className="server-ping-pill sleeping">esperando</span>
                                )}
                                {serverStatus === 'offline' && (
                                    <span className="server-ping-pill offline">desconectado</span>
                                )}
                            </div>
                            <button
                                type="button"
                                className="server-gear-btn"
                                onClick={() => setShowServerModal(true)}
                                title="Configurar conexión del servidor"
                            >
                                ⚙️
                            </button>
                        </div>
                    </form>

                    <div className="login-footer">
                        <p>Sistema de Gestión de Impresión</p>
                        <div style={{ fontSize: '11px', opacity: 0.65, marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>v1.1.0</span>
                            <span>•</span>
                            <span>Build: {buildTime}</span>
                        </div>
                    </div>

                </div>
            </div>

            {/* Modal de selección de servidor */}
            {showServerModal && (
                <div className="server-modal-backdrop" onClick={() => setShowServerModal(false)}>
                    <div className="server-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="server-modal-title">
                            <span>⚙️ Servidor LuXius</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                            Selecciona el servidor de datos con el que se comunicará la app:
                        </p>

                        <button
                            type="button"
                            className={`server-opt-btn ${isCloudServer && !isCustomServer ? 'active' : ''}`}
                            onClick={() => {
                                setCustomApiUrl(null)
                            }}
                        >
                            <span className="server-opt-name">☁️ Servidor Nube Render (Recomendado Móvil)</span>
                            <span className="server-opt-url">https://luxius-backend.onrender.com/api</span>
                        </button>

                        <button
                            type="button"
                            className={`server-opt-btn ${!isCloudServer && !isCustomServer ? 'active' : ''}`}
                            onClick={() => {
                                setCustomApiUrl('http://localhost:5000/api')
                            }}
                        >
                            <span className="server-opt-name">💻 Local PC (Desarrollo)</span>
                            <span className="server-opt-url">http://localhost:5000/api</span>
                        </button>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>O ingresa IP local del taller:</span>
                            <input
                                type="text"
                                className="server-custom-input"
                                placeholder="http://192.168.1.50:5000/api"
                                value={customUrlInput}
                                onChange={(e) => setCustomUrlInput(e.target.value)}
                            />
                        </div>

                        <div className="server-modal-actions">
                            <button
                                type="button"
                                className="server-action-cancel"
                                onClick={() => setShowServerModal(false)}
                            >
                                Cerrar
                            </button>
                            <button
                                type="button"
                                className="server-action-save"
                                onClick={() => {
                                    if (customUrlInput.trim()) {
                                        setCustomApiUrl(customUrlInput.trim())
                                    } else {
                                        setCustomApiUrl(null)
                                    }
                                }}
                            >
                                Guardar y Conectar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
