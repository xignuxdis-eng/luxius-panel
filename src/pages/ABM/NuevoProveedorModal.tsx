import { useState, useEffect } from 'react'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import type { Proveedor } from '@/types'

interface NuevoProveedorModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (proveedor: Partial<Proveedor>) => void
    proveedorToEdit?: Proveedor | null
}

export default function NuevoProveedorModal({ isOpen, onClose, onSave, proveedorToEdit }: NuevoProveedorModalProps) {
    const [formData, setFormData] = useState<Partial<Proveedor>>({
        nombre: '',
        contacto: '',
        telefono: '',
        email: '',
        direccion: '',
        cuit: '',
        cbu: '',
        rubro: '',
        saldo: 0,
        notas: '',
        habilitado: true
    })

    useEffect(() => {
        if (proveedorToEdit) {
            setFormData(proveedorToEdit)
        } else {
            setFormData({
                nombre: '',
                contacto: '',
                telefono: '',
                email: '',
                direccion: '',
                cuit: '',
                cbu: '',
                rubro: '',
                saldo: 0,
                notas: '',
                habilitado: true
            })
        }
    }, [proveedorToEdit, isOpen])

    const handleChange = (field: keyof Proveedor, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave(formData)
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={proveedorToEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group">
                    <label>Empresa / Nombre *</label>
                    <input
                        type="text"
                        className="input-field"
                        value={formData.nombre}
                        onChange={(e) => handleChange('nombre', e.target.value)}
                        required
                        placeholder="Ej. Papelera del Sur"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                        <label>Contacto</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.contacto}
                            onChange={(e) => handleChange('contacto', e.target.value)}
                            placeholder="Nombre contacto"
                        />
                    </div>
                    <div className="form-group">
                        <label>Rubro</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.rubro}
                            onChange={(e) => handleChange('rubro', e.target.value)}
                            placeholder="Ej. Tintas, Lonas"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                        <label>Teléfono</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.telefono}
                            onChange={(e) => handleChange('telefono', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="input-field"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Dirección</label>
                    <input
                        type="text"
                        className="input-field"
                        value={formData.direccion}
                        onChange={(e) => handleChange('direccion', e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                        <label>CUIT</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.cuit}
                            onChange={(e) => handleChange('cuit', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>CBU / Alias</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.cbu}
                            onChange={(e) => handleChange('cbu', e.target.value)}
                            placeholder="Para transferencias"
                        />
                    </div>
                </div>

                <div className="form-group bg-gray-50 p-2 rounded border border-gray-200">
                    <label>Saldo Cuenta Corriente ($)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            step="0.01"
                            className={`input-field font-bold ${Number(formData.saldo) < 0 ? 'text-red-500' : 'text-green-600'}`}
                            value={formData.saldo}
                            onChange={(e) => handleChange('saldo', Number(e.target.value))}
                        />
                        <span className="text-xs text-muted">Negativo = Deuda</span>
                    </div>
                </div>

                <div className="form-group">
                    <label>Notas</label>
                    <textarea
                        className="input-field"
                        rows={2}
                        value={formData.notas}
                        onChange={(e) => handleChange('notas', e.target.value)}
                        placeholder="Horarios, condiciones, etc."
                    />
                </div>

                <div className="modal-actions">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancelar
                    </Button>
                    <Button variant="primary" type="submit">
                        Guardar
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
