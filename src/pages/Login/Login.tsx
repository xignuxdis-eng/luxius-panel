import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@store/authStore'
import type { LoginCredentials } from '@/types'
import './Login.css'

export default function Login() {
    const navigate = useNavigate()
    const login = useAuthStore((state) => state.login)

    const buildTime = '2026-02-03 01:25'
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>()

    const onSubmit = async (data: LoginCredentials) => {
        setIsLoading(true)
        setError('')

        const result = await login(data)

        if (result.success) {
            navigate('/')
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
                            <input
                                id="password"
                                type="password"
                                placeholder="Ingresa tu contraseña"
                                autoComplete="current-password"
                                {...register('password', { required: 'Contraseña es requerida' })}
                            />
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
                    </form>



                    <div className="login-footer">
                        <p>Sistema de Gestión de Impresión</p>
                        <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '5px' }}>
                            Build: {buildTime}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
