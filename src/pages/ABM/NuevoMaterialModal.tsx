import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { saveMaterial, getCalidades } from '@data/db'
import type { Material, Calidad } from '@/types'
import { Plus, Trash2 } from 'lucide-react'

interface NuevoMaterialModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
    material?: Material
}

export default function NuevoMaterialModal({ isOpen, onClose, onSave, material }: NuevoMaterialModalProps) {
    const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<Partial<Material>>()

    const { fields, append, remove } = useFieldArray({
        control,
        name: "bobinas" as any
    })

    const tipoCobro = watch('tipoCobro')

    useEffect(() => {
        if (isOpen) {
            reset(material || {
                codigo: '',
                descripcion: '',
                calidad: 'Standard',
                ancho: 1.0,
                precioM2: 0,
                tipo: 'Sustrato',
                tipoCobro: 'm2',
                bobinas: []
            })
        }
    }, [isOpen, material, reset])

    const onSubmit = (data: Partial<Material>) => {
        // Prepare data for saving
        const finalData = {
            ...data,
            id: material?.id,
            habilitado: Boolean(data.habilitado)
        }

        // If m2, we might want to clear bobinas or vice versa
        if (data.tipoCobro === 'm2') {
            finalData.bobinas = []
        }

        saveMaterial(finalData)
        onSave()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={material ? "Editar Material" : "Nuevo Material"}
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
                <div className="form-group">
                    <Input
                        label="Código"
                        {...register('codigo', { required: 'Requerido' })}
                        error={errors.codigo?.message}
                    />
                </div>

                <div className="form-group">
                    <Input
                        label="Descripción"
                        {...register('descripcion', { required: 'Requerido' })}
                        error={errors.descripcion?.message}
                    />
                </div>

                <div className="form-group">
                    <label className="input-label">Calidad</label>
                    <select className="input-field" {...register('calidad')}>
                        <option value="">Elegir Calidad...</option>
                        {getCalidades().filter(c => c.habilitado !== false).map((c: Calidad) => (
                            <option key={c.id} value={c.nombre}>{c.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="input-label">Tipo</label>
                    <select className="input-field" {...register('tipo')}>
                        <option value="Sustrato">Sustrato (Lona/Vinilo)</option>
                        <option value="Rigido">Rígido</option>
                        <option value="Papel">Papel</option>
                        <option value="Tela">Tela</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="input-label">Unidad de Cobro</label>
                    <select className="input-field" {...register('tipoCobro')}>
                        <option value="m2">Metro Cuadrado (m²)</option>
                        <option value="ml">Metro Lineal (mL)</option>
                    </select>
                </div>

                {tipoCobro === 'm2' ? (
                    <>
                        <div className="form-group">
                            <Input
                                label="Ancho Máximo (m)"
                                type="number"
                                step="0.01"
                                {...register('ancho', { valueAsNumber: true })}
                            />
                        </div>
                        <div className="form-group">
                            <Input
                                label="Precio m² ($)"
                                type="number"
                                step="0.01"
                                {...register('precioM2', { valueAsNumber: true })}
                            />
                        </div>
                    </>
                ) : (
                    <div className="bobinas-manager">
                        <div className="bobinas-header">
                            <label className="input-label" style={{ marginBottom: 0 }}>Bobinas Disponibles ($ml)</label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => append({ ancho: 1.05, precioML: 1000 } as any)}
                            >
                                <Plus size={14} style={{ marginRight: '4px' }} /> Agregar
                            </Button>
                        </div>

                        <div className="bobinas-list">
                            {fields.map((field, index) => (
                                <div key={field.id} className="bobina-row">
                                    <div>
                                        <Input
                                            label={index === 0 ? "Ancho Bobina (m)" : ""}
                                            type="number"
                                            step="0.01"
                                            {...register(`bobinas.${index}.ancho` as any, { valueAsNumber: true })}
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            label={index === 0 ? "Precio mL ($)" : ""}
                                            type="number"
                                            step="0.01"
                                            {...register(`bobinas.${index}.precioML` as any, { valueAsNumber: true })}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="bobina-remove-btn"
                                        onClick={() => remove(index)}
                                        title="Eliminar Bobina"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {fields.length === 0 && (
                                <p className="empty-message">
                                    No hay bobinas configuradas. Agregue al menos una.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="form-group-row" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                    <input
                        type="checkbox"
                        id="habilitado"
                        {...register('habilitado')}
                    />
                    <label htmlFor="habilitado" style={{ marginLeft: '8px' }}>Material Habilitado</label>
                </div>

                <div className="form-actions" style={{ marginTop: '20px', gridColumn: '1 / -1' }}>
                    <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit">Guardar</Button>
                </div>
            </form>
        </Modal>
    )
}
