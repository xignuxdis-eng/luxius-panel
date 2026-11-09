import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { saveCliente, refreshCollection } from '@data/db'
import type { Cliente } from '@/types'
import SpecialPricesEditor from './subcomponents/SpecialPricesEditor'
import './NuevoClienteModal.css'

interface NuevoClienteModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
    cliente: Cliente | null
}

export default function NuevoClienteModal({ isOpen, onClose, onSave, cliente }: NuevoClienteModalProps) {
    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Cliente>()

    useEffect(() => {
        if (isOpen) {
            if (cliente) {
                reset(cliente)
            } else {
                reset({
                    nombre: '',
                    empresa: '',
                    cuit: '',
                    email: '',
                    telefono: '',
                    condVenta: 'EFECTIVO',
                    direccion: '',
                    habilitado: true,
                    vip: false
                } as any)
            }
        }
    }, [isOpen, cliente, reset])

    const onSubmit = async (data: Cliente) => {
        await saveCliente({ ...data, id: cliente?.id })
        // Refresh users to show the auto-created one (stale state fix)
        refreshCollection('usuarios')
        onSave()
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={cliente ? "Editar Cliente" : "Agregar Nuevo Cliente"}
            size="xl"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="nuevo-cliente-form">
                <div className="form-grid">
                    <div className="form-group">
                        <Input
                            label="Nombre Completo"
                            {...register('nombre', { required: 'El nombre es obligatorio' })}
                            error={errors.nombre?.message}
                        />
                    </div>
                    <div className="form-group">
                        <Input
                            label="Empresa / Razón Social"
                            {...register('empresa', { required: 'La empresa es obligatoria' })}
                            error={errors.empresa?.message}
                        />
                    </div>
                    <div className="form-group">
                        <Input
                            label="CUIT / DNI"
                            {...register('cuit')}
                        />
                    </div>
                    <div className="form-group">
                        <Input
                            label="Usuario (Opcional)"
                            {...register('username')}
                            placeholder="Dejar vacío para usar email"
                        />
                    </div>
                    <div className="form-group">
                        <Input
                            label="Email"
                            type="email"
                            {...register('email')}
                        />
                    </div>
                    <div className="form-group">
                        <Input
                            label="Teléfono"
                            {...register('telefono')}
                        />
                    </div>
                    <div className="form-group vip-toggle-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
                        <input
                            type="checkbox"
                            {...register('vip')}
                            id="vip-checkbox"
                        />
                        <label htmlFor="vip-checkbox" className="input-label" style={{ margin: 0, cursor: 'pointer' }}>Cliente VIP</label>
                    </div>
                    <div className="form-group">
                        <label className="input-label">Condición de Venta</label>
                        <select className="input-field" {...register('condVenta')}>
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="CTA CTE">Cuenta Corriente</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                            <option value="MERCADOPAGO">Mercado Pago</option>
                        </select>
                    </div>
                </div>


                <div className="form-group full-width">
                    <Input
                        label="Dirección"
                        {...register('direccion')}
                    />
                </div>

                <SpecialPricesEditor
                    preciosEspeciales={watch('preciosEspeciales') || {}}
                    onChange={(nextPrices) => {
                        setValue('preciosEspeciales', nextPrices, { shouldDirty: true });
                    }}
                />

                <div className="form-actions">
                    <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit">
                        {cliente ? 'Guardar Cambios' : 'Guardar Cliente'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
