
import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { saveUsuario } from '@data/db'
import Modal from '@components/ui/Modal'
import { useAuthStore } from '@store/authStore'
import { getUsuarios } from '@data/db'

interface PerfilModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function PerfilModal({ isOpen, onClose }: PerfilModalProps) {
    const { user: authUser, setUser } = useAuthStore()
    const { register, handleSubmit, reset, watch, setValue } = useForm<any>()
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen && authUser) {
            setShowPassword(false)
            const dbUsers = getUsuarios()
            const fullUser = dbUsers.find(u => u.id === authUser.id)

            if (fullUser) {
                reset({ ...fullUser, password: '' })
                setPreviewAvatar(fullUser.avatar || null)
            }
        }
    }, [isOpen, authUser, reset])

    const watchedAvatar = watch('avatar')

    useEffect(() => {
        if (watchedAvatar && !watchedAvatar.startsWith('data:')) {
            // Only update preview from URL input if it's not a data URL (uploaded file)
            setPreviewAvatar(watchedAvatar)
        }
    }, [watchedAvatar])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5000000) { // 5MB limit
                alert('La imagen es muy pesada. Máximo 5MB.')
                return
            }

            const reader = new FileReader()
            reader.onloadend = () => {
                const base64String = reader.result as string
                setPreviewAvatar(base64String)
                setValue('avatar', base64String) // Set form value
            }
            reader.readAsDataURL(file)
        }
    }

    const onSubmit = async (data: any) => {
        if (!authUser) return
        setIsSaving(true)

        try {
            const updateData: any = {
                id: authUser.id,
                avatar: data.avatar,
                bio: data.bio,
                phone: data.phone
            }

            if (data.password && data.password.trim() !== '') {
                updateData.password = data.password.trim()
            }

            const updatedUser = await saveUsuario(updateData)

            setUser({
                ...authUser,
                name: updatedUser.nombre,
            })

            alert('Perfil actualizado correctamente')
            onClose()
        } catch (err: any) {
            alert('Error al guardar cambios: ' + (err.message || 'Error de conexión'))
        } finally {
            setIsSaving(false)
        }
    }


    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Mi Perfil"
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="modal-form" style={{ gap: '24px' }}>

                {/* Avatar Section */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '24px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    marginBottom: '8px'
                }}>
                    <div style={{
                        position: 'relative',
                        width: '120px',
                        height: '120px',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '4px solid var(--modal-bg)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            backgroundColor: '#eee',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '3rem'
                        }}>
                            {previewAvatar ? (
                                <img src={previewAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span>👤</span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                position: 'absolute',
                                bottom: '0',
                                right: '0',
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                background: 'var(--primary-color, #3b82f6)',
                                color: 'white',
                                border: '3px solid var(--modal-bg)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                transition: 'transform 0.2s',
                                fontSize: '1.2rem',
                                zIndex: 10
                            }}
                            title="Subir foto desde PC"
                        >
                            📷
                        </button>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleFileChange}
                    />

                    <div style={{ width: '100%', maxWidth: '320px', textAlign: 'center' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            O url de imagen externa
                        </label>
                        <input
                            type="text"
                            className="input-field"
                            {...register('avatar')}
                            placeholder="https://..."
                            style={{ textAlign: 'center', fontSize: '0.9rem', borderRadius: '20px' }}
                        />
                    </div>
                </div>

                {/* Info Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                        <label style={{ fontWeight: 600 }}>Contraseña</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="input-field"
                                {...register('password')}
                                placeholder="Nueva contraseña..."
                                autoComplete="new-password"
                                style={{ width: '100%', paddingRight: '42px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.8,
                                    transition: 'opacity 0.2s',
                                    userSelect: 'none'
                                }}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>


                    <div className="form-group">
                        <label style={{ fontWeight: 600 }}>Teléfono</label>
                        <input
                            type="text"
                            className="input-field"
                            {...register('phone')}
                            placeholder="+54 9 11..."
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Bio / Notas</label>
                    <textarea
                        className="input-field"
                        rows={3}
                        {...register('bio')}
                        placeholder="Escribe algo sobre ti..."
                        style={{ resize: 'none' }}
                    />
                </div>

                {/* Stylish Buttons */}
                <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', justifySelf: 'stretch', cursor: 'pointer' }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', justifySelf: 'stretch', cursor: 'pointer' }}
                    >
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </Modal>
    )
}
