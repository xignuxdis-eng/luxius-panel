
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

    useEffect(() => {
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
            reset(user)
        } else {
            reset({
                nombre: '',
                username: '',
                rol: activeRoles.length > 0 ? activeRoles[0].key : 'vendedor',
                email: '',
                habilitado: true
            })
        }
    }, [user, reset, isOpen])

    const onSubmit = (data: any) => {
        // Enforce lowercase roles and usernames as per requirements
        const cleanedData = {
            ...data,
            username: data.username.toLowerCase(),
            rol: data.rol.toLowerCase()
        }
        console.log('Saving user:', cleanedData)
        saveUsuario(cleanedData)
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={user ? 'Editar Usuario' : 'Nuevo Usuario'}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
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

                <div className="form-group">
                    <label>Contraseña</label>
                    <input
                        type="password"
                        className="input-field"
                        {...register('password', { required: !user })} // Required only for new users
                        placeholder={user ? "Dejar en blanco para mantener actual" : "********"}
                    />
                </div>

                <div className="form-group-row">
                    <input
                        type="checkbox"
                        id="user-habilitado"
                        {...register('habilitado')}
                    />
                    <label htmlFor="user-habilitado">Usuario Habilitado</label>
                </div>

                <div className="modal-footer">
                    <Button variant="ghost" onClick={onClose} type="button">
                        Cancelar
                    </Button>
                    <Button variant="primary" type="submit">
                        {user ? 'Guardar Cambios' : 'Crear Usuario'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
