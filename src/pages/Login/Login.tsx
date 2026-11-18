import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@store/authStore'
import { isCapacitorNative } from '@/data/db'
import { SHOW_DEMO_BUTTON } from '@/config/demoConfig'
import type { LoginCredentials } from '@/types'
import ThemeToggle from '@components/ui/ThemeToggle'
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
                    <div className="login-theme-bar">
                        <ThemeToggle />
                    </div>
                    <div className="login-header">
                        <div className="login-logo">
                            <span className="logo-icon" aria-hidden="true">✦</span>
                            <h1 className="logo-text">LuXius</h1>
                        </div>
                        <p className="logo-subtitle">Núcleo operativo de XignuX</p>
                        <p className="login-subtitle">Ingresá tus credenciales para continuar</p>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                        <div className="form-group">
                            <label htmlFor="username">Usuario</label>
                            <input
                                id="username"
                                type="text"
                                placeholder="Ingresá tu usuario"
                                autoComplete="username"
                                aria-invalid={Boolean(errors.username)}
                                {...register('username', { required: 'Usuario es requerido' })}
                            />
                            {errors.username && (
                                <span className="form-error" role="alert">{errors.username.message}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Contraseña</label>
                            <div className="password-field">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Ingresá tu contraseña"
                                    autoComplete="current-password"
                                    aria-invalid={Boolean(errors.password)}
                                    {...register('password', { required: 'Contraseña es requerida' })}
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    aria-pressed={showPassword}
                                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {errors.password && (
                                <span className="form-error" role="alert">{errors.password.message}</span>
                            )}
                        </div>

                        {error && (
                            <div className="login-error" role="alert">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-button"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="loading-spinner" aria-label="Iniciando sesión"></span>
                            ) : (
                                'Ingresar'
                            )}
                        </button>

                        {SHOW_DEMO_BUTTON && (
                            <div className="demo-login-wrap">
                                <button
                                    type="button"
                                    className="demo-login-button"
                                    disabled={isLoading}
                                    onClick={async () => {
                                        setIsLoading(true);
                                        await login({ username: 'visitante', password: 'visitante' });
                                        setIsLoading(false);
                                        navigate('/');
                                    }}
                                    title="Explorar todo el sistema con datos ficticios aislados en modo demostración"
                                >
                                    <span aria-hidden="true">🧪</span>
                                    <span>Acceso Demo / Visitante</span>
                                </button>
                            </div>
                        )}

                        {isWakingServer && (
                            <div className="waking-server-banner" role="status" aria-live="polite">
                                <span className="loading-spinner waking-spinner" aria-hidden="true"></span>
                                <span>Despertando servidor en la nube... Esto puede tomar unos segundos.</span>
                            </div>
                        )}

                    </form>

                    <div className="login-footer">
                        <p>Sistema de Gestión de Impresión</p>
                        <div className="login-version">
                            <span className="login-version-tag">v1.1.0</span>
                            <span aria-hidden="true">•</span>
                            <span>Build: {buildTime}</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
