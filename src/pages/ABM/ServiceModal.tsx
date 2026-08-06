import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import type { Servicio } from '@/types'
import { saveServicio } from '@data/db'

interface ServiceModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
    service?: Servicio
}

export default function ServiceModal({ isOpen, onClose, onSave, service }: ServiceModalProps) {
    const { register, handleSubmit, reset } = useForm<Partial<Servicio>>()

    useEffect(() => {
        if (service) {
            reset(service)
        } else {
            reset({
                codigo: '',
                nombre: '',
                descripcion: '',
                precioBase: 0,
                unidad: 'm2',
                habilitado: true
            })
        }
    }, [service, reset, isOpen])

    const onSubmit = (data: Partial<Servicio>) => {
        // Auto-uppercase el código
        if (data.codigo) data.codigo = data.codigo.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
        saveServicio({ ...service, ...data })
        onSave()
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={service ? 'Editar Servicio' : 'Nuevo Servicio'}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
                <div className="form-grid">
                    <div className="form-group">
                        <label>Código (etiqueta corta)</label>
                        <input
                            type="text"
                            className="input-field"
                            {...register('codigo', { required: true })}
                            placeholder="Ej: LAM, DEM, ROT, TEN"
                            maxLength={4}
                            style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Se usa en el nombre de producción del archivo</span>
                    </div>
                    <div className="form-group">
                        <label>Nombre del Servicio</label>
                        <input
                            type="text"
                            className="input-field"
                            {...register('nombre', { required: true })}
                            placeholder="Ej: Laminado Mate"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                        className="input-field"
                        {...register('descripcion')}
                        placeholder="Breve descripción del servicio..."
                    />
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label>Precio Base</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input-field"
                            {...register('precioBase', { required: true })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Unidad</label>
                        <select className="input-field" {...register('unidad')}>
                            <option value="m2">m²</option>
                            <option value="unidad">Unidad</option>
                            <option value="metro">Metro lineal</option>
                        </select>
                    </div>
                </div>

                <div className="form-group-row">
                    <input
                        type="checkbox"
                        id="habilitado"
                        {...register('habilitado')}
                    />
                    <label htmlFor="habilitado">Servicio Habilitado</label>
                </div>

                <div className="modal-footer">
                    <Button variant="ghost" onClick={onClose} type="button">
                        Cancelar
                    </Button>
                    <Button variant="primary" type="submit">
                        {service ? 'Guardar Cambios' : 'Crear Servicio'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
