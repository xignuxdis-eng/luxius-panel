import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { saveCalidad } from '@data/db'
import type { Calidad } from '@/types'

interface NuevaCalidadModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
    calidad?: Calidad
}

export default function NuevaCalidadModal({ isOpen, onClose, onSave, calidad }: NuevaCalidadModalProps) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<Calidad>>()

    useEffect(() => {
        if (isOpen) {
            reset(calidad || {
                nombre: '',
                descripcion: '',
                habilitado: true
            })
        }
    }, [isOpen, calidad, reset])

    const onSubmit = (data: Partial<Calidad>) => {
        saveCalidad({
            ...data,
            id: calidad?.id,
            habilitado: Boolean(data.habilitado) // Ensure boolean
        })
        onSave()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={calidad ? "Editar Calidad" : "Nueva Calidad"}
            size="sm"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <Input
                        label="Nombre"
                        {...register('nombre', { required: 'Requerido' })}
                        error={errors.nombre?.message}
                    />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <Input
                        label="Descripción (Opcional)"
                        {...register('descripcion')}
                    />
                </div>

                <div className="form-group-row" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                    <input
                        type="checkbox"
                        id="habilitado"
                        {...register('habilitado')}
                    />
                    <label htmlFor="habilitado" style={{ marginLeft: '8px' }}>Calidad Habilitada</label>
                </div>

                <div className="form-actions" style={{ marginTop: '20px', gridColumn: '1 / -1' }}>
                    <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit">Guardar</Button>
                </div>
            </form>
        </Modal>
    )
}
