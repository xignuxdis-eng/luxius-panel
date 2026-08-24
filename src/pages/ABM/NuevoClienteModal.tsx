import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { saveCliente, getMateriales, refreshCollection } from '@data/db'
import type { Cliente } from '@/types'
import './NuevoClienteModal.css'

interface NuevoClienteModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
    cliente: Cliente | null
}

export default function NuevoClienteModal({ isOpen, onClose, onSave, cliente }: NuevoClienteModalProps) {
    const { register, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = useForm<Cliente>()

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
            size="lg"
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

                <div className="special-prices-section" style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: 'var(--accent)' }}>Precios Especiales (VIP)</h3>
                    <div className="special-prices-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1.5fr) 100px 1fr auto', gap: '10px', alignItems: 'flex-end', marginBottom: '15px' }}>
                        <div className="form-group">
                            <label className="input-label">Material</label>
                            <select id="new-special-material" className="input-field" onChange={(e) => {
                                const mat = getMateriales().find(m => m.codigo === e.target.value);
                                const anchoSelect = document.getElementById('new-special-ancho') as HTMLSelectElement;
                                if (anchoSelect) {
                                    anchoSelect.innerHTML = '<option value="">-</option>';
                                    if (mat?.tipoCobro === 'ml' && mat.bobinas) {
                                        mat.bobinas.forEach(b => {
                                            const opt = document.createElement('option');
                                            opt.value = b.ancho.toString();
                                            opt.text = `${b.ancho}m`;
                                            anchoSelect.add(opt);
                                        });
                                    }
                                }
                            }}>
                                <option value="">Seleccionar material...</option>
                                {getMateriales().filter(m => m.habilitado !== false).map(m => (
                                    <option key={m.id} value={m.codigo}>{m.descripcion} ({m.codigo})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="input-label">Ancho</label>
                            <select id="new-special-ancho" className="input-field">
                                <option value="">-</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="input-label">Precio Especial (ML/M2)</label>
                            <input id="new-special-price" type="number" className="input-field" placeholder="Ej: 15000" />
                        </div>
                        <Button type="button" onClick={() => {
                            const matSelect = document.getElementById('new-special-material') as HTMLSelectElement;
                            const anchoSelect = document.getElementById('new-special-ancho') as HTMLSelectElement;
                            const priceInput = document.getElementById('new-special-price') as HTMLInputElement;
                            const matCode = matSelect.value;
                            const ancho = anchoSelect.value;
                            const price = parseFloat(priceInput.value);

                            if (matCode && !isNaN(price)) {
                                const mat = getMateriales().find(m => m.codigo === matCode);
                                const key = (mat?.tipoCobro === 'ml' && ancho) ? `${matCode}:${ancho}` : matCode;

                                const current = getValues('preciosEspeciales') || {};
                                setValue('preciosEspeciales', { ...current, [key]: price }, { shouldDirty: true });

                                // Reset inputs
                                matSelect.value = '';
                                anchoSelect.innerHTML = '<option value="">-</option>';
                                priceInput.value = '';
                            }
                        }}>Agregar</Button>
                    </div>

                    <div className="special-prices-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {Object.entries(watch('preciosEspeciales') || {}).map(([key, price]) => (
                            <div key={key} className="special-price-tag" style={{
                                background: 'var(--bg-sidebar)',
                                border: '1px solid var(--accent)',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.85rem'
                            }}>
                                <span style={{ fontWeight: 600 }}>{key}:</span>
                                <span>${price.toLocaleString()}</span>
                                <button type="button" onClick={() => {
                                    const current = { ...watch('preciosEspeciales') };
                                    delete current[key];
                                    setValue('preciosEspeciales', current, { shouldDirty: true });
                                }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', marginLeft: '4px' }}>×</button>
                            </div>
                        ))}
                    </div>
                </div>

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
