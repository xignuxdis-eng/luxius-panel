import { useForm } from 'react-hook-form'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { saveLogistica } from '@data/db'
import type { Logistica } from '@/types'

interface LogisticsModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
    logistica?: Logistica
}

export default function LogisticsModal({ isOpen, onClose, onSave, logistica }: LogisticsModalProps) {
    const { register, handleSubmit, formState: { errors } } = useForm<Partial<Logistica>>({
        defaultValues: logistica || {
            nombre: '',
            descripcion: '',
            costo: 0,
            habilitado: true
        }
    })

    const onSubmit = (data: Partial<Logistica>) => {
        saveLogistica({ ...logistica, ...data })
        onSave()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={logistica ? 'Editar Logística' : 'Nueva Logística'}
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
                <div className="form-group">
                    <label>Nombre</label>
                    <input
                        {...register('nombre', { required: 'El nombre es requerido' })}
                        className={`input-field ${errors.nombre ? 'error' : ''}`}
                        placeholder="Ej: Envío Motomensajería"
                    />
                    {errors.nombre && <span className="error-text">{errors.nombre.message}</span>}
                </div>

                <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                        {...register('descripcion')}
                        className="input-field"
                        placeholder="Detalles adicionales..."
                        rows={3}
                    />
                </div>

                <div className="form-group">
                    <label>Costo</label>
                    <input
                        type="number"
                        {...register('costo', { min: 0 })}
                        className="input-field"
                        placeholder="0.00"
                    />
                </div>

                <div className="form-group-checkbox">
                    <label className="checkbox-container">
                        <input
                            type="checkbox"
                            {...register('habilitado')}
                        />
                        <span className="checkmark"></span>
                        Habilitado
                    </label>
                </div>

                <div className="modal-actions" style={{ marginTop: '20px' }}>
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancelar
                    </Button>
                    <Button variant="primary" type="submit">
                        {logistica ? 'Actualizar' : 'Guardar'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
