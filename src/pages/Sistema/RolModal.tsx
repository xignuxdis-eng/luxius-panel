import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '@components/ui/Modal'
import { saveRole } from '@data/db'
import type { RoleConfig } from '@/types/auth'

interface RolModalProps {
    isOpen: boolean
    onClose: () => void
    role?: RoleConfig
    onSave?: () => void
}

export default function RolModal({ isOpen, onClose, role, onSave }: RolModalProps) {
    const { register, handleSubmit, reset } = useForm<RoleConfig>()

    useEffect(() => {
        if (role) {
            reset(role)
        } else {
            reset({
                name: '',
                key: '',
                status: 'Activo'
            })
        }
    }, [role, reset, isOpen])

    const onSubmit = (data: RoleConfig) => {
        saveRole({
            ...data,
            id: role?.id, // Ensure ID is preserved for updates
            permissions: role?.permissions
        })
        if (onSave) onSave()
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={role ? 'Editar Rol' : 'Nuevo Rol'}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
                <div className="form-group">
                    <label>Nombre del Rol</label>
                    <input
                        type="text"
                        className="input-field"
                        {...register('name', { required: true })}
                        placeholder="Ej: Supervisor"
                    />
                </div>

                <div className="form-group">
                    <label>Identificador (Key)</label>
                    <input
                        type="text"
                        className="input-field"
                        {...register('key', { required: true })}
                        placeholder="ej: supervisor"
                        disabled={!!role} // Disable key editing for existing roles to prevent breaking perms
                    />
                    {role && <small className="text-muted">El identificador no se puede cambiar.</small>}
                </div>

                <div className="form-group">
                    <label>Estado</label>
                    <select className="input-field" {...register('status')}>
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                    </select>
                </div>

                <div className="modal-actions">
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary">
                        Guardar
                    </button>
                </div>
            </form>
        </Modal>
    )
}
