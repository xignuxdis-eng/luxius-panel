import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@store/authStore'
import { isCapacitorNative } from '@/data/db'
import { SHOW_DEMO_BUTTON } from '@/config/demoConfig'
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

    useEffect(() => {
        const reason = sessionStorage.getItem('luxius_session_expired_reason')
        if (reason === 'inactivity') {
            setError('⏱️ Tu sesión ha expirado tras 15 minutos de inactividad.')
            sessionStorage.removeItem('luxius_session_expired_reason')
        }
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

                        {SHOW_DEMO_BUTTON && (
                            <div style={{ marginTop: '10px', textAlign: 'center' }}>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setIsLoading(true);
                                        await login({ username: 'visitante', password: 'visitante' });
                                        setIsLoading(false);
                                        navigate('/');
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '9px 14px',
                                        backgroundColor: 'rgba(56, 189, 248, 0.08)',
                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                        borderRadius: '8px',
                                        color: '#38bdf8',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Explorar todo el sistema con datos ficticios aislados en modo demostración"
                                >
                                    <span>🧪</span>
                                    <span>Acceso Demo / Visitante</span>
                                </button>
                            </div>
                        )}

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
        </div>
    )
}
