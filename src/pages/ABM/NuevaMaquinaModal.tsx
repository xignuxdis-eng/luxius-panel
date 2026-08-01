import { useState, useEffect } from 'react'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import type { Maquina } from '@/types'

interface NuevaMaquinaModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (maquina: Partial<Maquina>) => void
    maquinaToEdit?: Maquina | null
}

export default function NuevaMaquinaModal({ isOpen, onClose, onSave, maquinaToEdit }: NuevaMaquinaModalProps) {
    const [nombre, setNombre] = useState('')
    const [tipo, setTipo] = useState('Impresora')
    const [anchoMaximo, setAnchoMaximo] = useState<string | number>(1.60)
    const [estado, setEstado] = useState<'online' | 'offline' | 'mantenimiento'>('online')
    const [habilitada, setHabilitada] = useState(true)

    useEffect(() => {
        if (maquinaToEdit) {
            setNombre(maquinaToEdit.nombre || '')
            setTipo(maquinaToEdit.tipo || 'Impresora')
            setAnchoMaximo(maquinaToEdit.anchoMaximo || 1.60)
            setEstado(maquinaToEdit.estado || 'online')
            setHabilitada(maquinaToEdit.habilitada ?? true)
        } else {
            setNombre('')
            setTipo('Impresora')
            setAnchoMaximo(1.60)
            setEstado('online')
            setHabilitada(true)
        }
    }, [maquinaToEdit, isOpen])

    const parseAncho = (val: string | number): number => {
        if (typeof val === 'number') return val
        const clean = String(val).replace(',', '.')
        const parsed = parseFloat(clean)
        return isNaN(parsed) ? 1.60 : parsed
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave({
            id: maquinaToEdit?.id,
            nombre,
            tipo,
            anchoMaximo: parseAncho(anchoMaximo),
            estado,
            habilitada
        })
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={maquinaToEdit ? 'Editar Máquina' : 'Nueva Máquina'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group">
                    <label>Nombre</label>
                    <input
                        type="text"
                        className="input-field"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                        placeholder="Ej. Roland TrueVIS 1"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                        <label>Tipo / Tecnología</label>
                        <select className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                            <option value="Impresora">Impresora (General)</option>
                            <option value="Solvente">Solvente</option>
                            <option value="Ecosolvente">Ecosolvente</option>
                            <option value="Sublimación">Sublimación</option>
                            <option value="UV">UV</option>
                            <option value="Plotter Corte">Plotter Corte</option>
                            <option value="Laminadora">Laminadora</option>
                            <option value="Mesa de Corte">Mesa de Corte</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Ancho Máximo (m)</label>
                        <input
                            type="text"
                            className="input-field"
                            value={anchoMaximo}
                            onChange={(e) => setAnchoMaximo(e.target.value)}
                            placeholder="Ej. 1.60 o 3.20"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                        <label>Estado Inicial</label>
                        <select className="input-field" value={estado} onChange={(e) => setEstado(e.target.value as any)}>
                            <option value="online">🟢 Online</option>
                            <option value="offline">🔴 Offline</option>
                            <option value="mantenimiento">🔨 Mantenimiento</option>
                        </select>
                    </div>

                    <div className="form-group flex items-center pt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={habilitada}
                                onChange={(e) => setHabilitada(e.target.checked)}
                            />
                            <span>Habilitada</span>
                        </label>
                    </div>
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
