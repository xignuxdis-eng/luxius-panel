import { useState, useEffect, type ChangeEvent } from 'react';
import Button from '@components/ui/Button';
import { Input } from '@components/ui/Input';

interface WorkshopSettings {
    nombre: string;
    cuit: string;
    direccion: string;
    telefono: string;
    email: string;
    puntoVenta: string;
    condicionIva: string;
    modoAfip: string;
}

const STORAGE_KEY = 'luxius_workshop_settings';

export function getWorkshopSettings(): WorkshopSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {}
    return {
        nombre: 'Taller Gráfico Central',
        cuit: '30-12345678-9',
        direccion: 'Av. Colón 1234, Córdoba',
        telefono: '0351-4567890',
        email: 'contacto@taller.com',
        puntoVenta: '1',
        condicionIva: 'Responsable Inscripto',
        modoAfip: 'HOMOLOGACION'
    };
}

export function saveWorkshopSettings(data: WorkshopSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function WorkshopOnboardingView() {
    const [step, setStep] = useState<number>(1);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

    // Formulario de Onboarding
    const [empresaNombre, setEmpresaNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');
    const [cuit, setCuit] = useState('');
    
    // Parámetros Fiscales
    const [puntoVenta, setPuntoVenta] = useState('1');
    const [condicionIva, setCondicionIva] = useState('Responsable Inscripto');
    const [modoAfip, setModoAfip] = useState('HOMOLOGACION');

    useEffect(() => {
        const current = getWorkshopSettings();
        setEmpresaNombre(current.nombre);
        setDireccion(current.direccion);
        setTelefono(current.telefono);
        setEmail(current.email);
        setCuit(current.cuit);
        setPuntoVenta(current.puntoVenta);
        setCondicionIva(current.condicionIva);
        setModoAfip(current.modoAfip);
    }, []);

    const handleSaveOnboarding = () => {
        if (!empresaNombre.trim()) {
            alert('Por favor complete el nombre del taller');
            return;
        }

        setIsSaving(true);
        try {
            saveWorkshopSettings({
                nombre: empresaNombre.trim(),
                direccion: direccion.trim(),
                telefono: telefono.trim(),
                email: email.trim(),
                cuit: cuit.trim(),
                puntoVenta: puntoVenta.trim() || '1',
                condicionIva,
                modoAfip
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 4000);
        } catch (err) {
            console.error('Error guardando configuración de taller:', err);
            alert('Hubo un error al guardar la configuración');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="onboarding-view p-20 animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', color: '#ff6b00', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🏢 Asistente de Configuración Inicial de Taller (Onboarding SaaS)
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                    Personalice los datos fiscales, de contacto y parámetros de impresión para adaptar LuXius a su taller.
                </p>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <button
                    className={`step-btn ${step === 1 ? 'active' : ''}`}
                    onClick={() => setStep(1)}
                    style={{
                        padding: '8px 16px',
                        background: step === 1 ? 'rgba(255, 107, 0, 0.15)' : 'transparent',
                        border: step === 1 ? '1px solid var(--accent)' : '1px solid var(--border)',
                        color: step === 1 ? 'var(--accent)' : 'var(--text-muted)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    1. Identidad y Contacto
                </button>
                <button
                    className={`step-btn ${step === 2 ? 'active' : ''}`}
                    onClick={() => setStep(2)}
                    style={{
                        padding: '8px 16px',
                        background: step === 2 ? 'rgba(255, 107, 0, 0.15)' : 'transparent',
                        border: step === 2 ? '1px solid var(--accent)' : '1px solid var(--border)',
                        color: step === 2 ? 'var(--accent)' : 'var(--text-muted)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    2. Parámetros Fiscales ARCA / AFIP
                </button>
                <button
                    className={`step-btn ${step === 3 ? 'active' : ''}`}
                    onClick={() => setStep(3)}
                    style={{
                        padding: '8px 16px',
                        background: step === 3 ? 'rgba(255, 107, 0, 0.15)' : 'transparent',
                        border: step === 3 ? '1px solid var(--accent)' : '1px solid var(--border)',
                        color: step === 3 ? 'var(--accent)' : 'var(--text-muted)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    3. Resumen y Confirmación
                </button>
            </div>

            {/* Paso 1: Identidad y Contacto */}
            {step === 1 && (
                <div className="card p-20" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Datos del Taller o Empresa Gráfica</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Nombre Comercial / Taller</label>
                            <Input value={empresaNombre} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmpresaNombre(e.target.value)} placeholder="Ej: Imprenta Central" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>CUIT / Identificación Fiscal</label>
                            <Input value={cuit} onChange={(e: ChangeEvent<HTMLInputElement>) => setCuit(e.target.value)} placeholder="30-XXXXXXXX-X" />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Teléfono(s) de Contacto</label>
                            <Input value={telefono} onChange={(e: ChangeEvent<HTMLInputElement>) => setTelefono(e.target.value)} placeholder="Ej: 0351-1234567" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Email Comercial</label>
                            <Input value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="contacto@taller.com" />
                        </div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Dirección del Taller / Despacho</label>
                        <Input value={direccion} onChange={(e: ChangeEvent<HTMLInputElement>) => setDireccion(e.target.value)} placeholder="Calle, Número, Ciudad, Provincia" />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="primary" onClick={() => setStep(2)}>Siguiente: Datos Fiscales →</Button>
                    </div>
                </div>
            )}

            {/* Paso 2: Parámetros Fiscales ARCA / AFIP */}
            {step === 2 && (
                <div className="card p-20" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Facturación Electrónica (WSAA + WSFEv1)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Punto de Venta Oficial</label>
                            <Input value={puntoVenta} onChange={(e: ChangeEvent<HTMLInputElement>) => setPuntoVenta(e.target.value)} placeholder="1" type="number" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Condición frente al IVA</label>
                            <select
                                value={condicionIva}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => setCondicionIva(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px'
                                }}
                            >
                                <option value="Responsable Inscripto">IVA Responsable Inscripto (Factura A / B)</option>
                                <option value="Monotributo">Responsable Monotributo (Factura C)</option>
                                <option value="Exento">IVA Exento</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Entorno de Facturación</label>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input type="radio" checked={modoAfip === 'HOMOLOGACION'} onChange={() => setModoAfip('HOMOLOGACION')} />
                                🧪 Modo Homologación / Pruebas (CAE simulado)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input type="radio" checked={modoAfip === 'PRODUCCION'} onChange={() => setModoAfip('PRODUCCION')} />
                                🏛️ Modo Producción Oficial (ARCA Real)
                            </label>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button variant="outline" onClick={() => setStep(1)}>← Anterior</Button>
                        <Button variant="primary" onClick={() => setStep(3)}>Siguiente: Confirmar →</Button>
                    </div>
                </div>
            )}

            {/* Paso 3: Resumen y Confirmación */}
            {step === 3 && (
                <div className="card p-20" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Resumen de Configuración</h4>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '6px', marginBottom: '20px', lineHeight: '1.8' }}>
                        <div><strong>Taller:</strong> {empresaNombre || 'Sin nombre'}</div>
                        <div><strong>CUIT:</strong> {cuit || 'Sin CUIT'}</div>
                        <div><strong>Dirección:</strong> {direccion || 'Sin dirección'}</div>
                        <div><strong>Contacto:</strong> {telefono || 'Sin teléfono'} | {email || 'Sin email'}</div>
                        <div><strong>Condición Fiscal:</strong> {condicionIva} (Punto de Venta {puntoVenta})</div>
                        <div><strong>Entorno AFIP:</strong> {modoAfip}</div>
                    </div>

                    {saveSuccess && (
                        <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', borderRadius: '6px', marginBottom: '16px' }}>
                            ✓ ¡Configuración de taller guardada exitosamente en el sistema!
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button variant="outline" onClick={() => setStep(2)}>← Anterior</Button>
                        <Button variant="primary" onClick={handleSaveOnboarding} disabled={isSaving}>
                            {isSaving ? 'Guardando...' : '💾 Guardar y Aplicar Configuración'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
