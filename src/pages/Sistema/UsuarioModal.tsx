import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { saveUsuario, getRoles } from '@data/db'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import type { RoleConfig } from '@/types/auth'

interface UsuarioModalProps {
    isOpen: boolean
    onClose: () => void
    user?: any
}

export default function UsuarioModal({ isOpen, onClose, user }: UsuarioModalProps) {
    const { register, handleSubmit, reset } = useForm<any>()
    const [roles, setRoles] = useState<RoleConfig[]>([])
    const [showPassword, setShowPassword] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        setError('')
        setShowPassword(false)
        const allRoles = getRoles()
        const activeRoles = allRoles.filter(r => r.status === 'Activo')

        // Always include the current user's role even if inactive, so it doesn't break editing
        if (user && user.rol) {
            const currentRole = allRoles.find(r => r.key === user.rol || r.name.toLowerCase() === user.rol)
            if (currentRole && !activeRoles.find(r => r.id === currentRole.id)) {
                activeRoles.push(currentRole)
            }
        }
        setRoles(activeRoles)

        if (user) {
            reset({
                ...user,
                password: '' // Security: Leave password input empty so user only fills it if changing
            })
        } else {
            reset({
                nombre: '',
                username: '',
                rol: activeRoles.length > 0 ? activeRoles[0].key : 'vendedor',
                email: '',
                password: '',
                habilitado: true
            })
        }
    }, [user, reset, isOpen])

    const onSubmit = async (data: any) => {
        setIsSaving(true)
        setError('')

        try {
            const cleanedData: any = {
                ...data,
                id: user?.id,
                username: (data.username || '').toLowerCase().trim(),
                rol: (data.rol || 'vendedor').toLowerCase().trim(),
                email: (data.email || '').trim(),
            }

            if (data.password && data.password.trim() !== '') {
                cleanedData.password = data.password.trim()
            } else if (!user) {
                setError('La contraseña es requerida para un nuevo usuario')
                setIsSaving(false)
                return
            }

            console.log('Saving user to DB:', cleanedData)
            await saveUsuario(cleanedData)
            onClose()
        } catch (err: any) {
            console.error('Error saving user:', err)
            setError(err.message || 'Error al persistir usuario en el servidor')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={user ? `Editar Usuario: ${user.nombre || user.username}` : 'Nuevo Usuario'}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
                {error && (
                    <div style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#f87171',
                        fontSize: '0.875rem',
                        marginBottom: '12px'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <div className="form-group">
                    <label>Nombre Completo</label>
                    <input
                        type="text"
                        className="input-field"
                        {...register('nombre', { required: true })}
                        placeholder="Ej: Juan Pérez"
                    />
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label>Nombre de Usuario</label>
                        <input
                            type="text"
                            className="input-field"
                            {...register('username', { required: true })}
                            placeholder="juan.perez"
                        />
                    </div>

                    <div className="form-group">
                        <label>Rol</label>
                        <select className="input-field" {...register('rol')}>
                            {roles.map(role => (
                                <option key={role.id} value={role.key}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        className="input-field"
                        {...register('email')}
                        placeholder="juan@ejemplo.com"
                    />
                </div>

                {/* Password input with toggle eye button */}
                <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label>{user ? 'Cambiar Contraseña' : 'Contraseña'}</label>
                        <span style={{ fontSize: '0.75rem', opacity: 0.65 }}>
                            {user ? '(Opcional)' : '(Requerida)'}
                        </span>
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="input-field"
                            autoComplete="new-password"
                            style={{ width: '100%', paddingRight: '42px' }}
                            {...register('password', { required: !user })}
                            placeholder={user ? "Dejar en blanco para conservar actual" : "Ingresa contraseña..."}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
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

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px', lineHeight: '1.3' }}>
                        {user 
                            ? '🔒 La contraseña actual está cifrada en la base de datos. Haz clic en el 👁️ para verificar la nueva contraseña antes de guardar.' 
                            : '🔑 Haz clic en el 👁️ para verificar la contraseña antes de guardar.'}
                    </p>
                </div>

                <div className="form-group-row">
                    <input
                        type="checkbox"
                        id="user-habilitado"
                        {...register('habilitado')}
                    />
                    <label htmlFor="user-habilitado">Usuario Habilitado (puede iniciar sesión)</label>
                </div>

                <div className="modal-footer">
                    <Button variant="ghost" onClick={onClose} type="button" disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button variant="primary" type="submit" disabled={isSaving}>
                        {isSaving ? 'Guardando en Base de Datos...' : (user ? 'Guardar Cambios' : 'Crear Usuario')}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
