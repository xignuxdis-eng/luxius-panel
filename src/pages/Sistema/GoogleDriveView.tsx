import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '@components/ui/Button';
import { API_URL, getAuthHeaders } from '@data/db';

interface GoogleDriveStatus {
    configured: boolean;
    connected: boolean;
    email?: string;
    name?: string;
    picture?: string;
    connected_at?: string;
    client_id_preview?: string;
    has_client_id: boolean;
    has_client_secret: boolean;
}

export default function GoogleDriveView() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [status, setStatus] = useState<GoogleDriveStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Form for credentials
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [showConfig, setShowConfig] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Load initial status
    const loadStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/google-drive/status`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
                if (!data.has_client_id) {
                    setShowConfig(true);
                }
            }
        } catch (e) {
            console.error("Error loading Google Drive status", e);
        } finally {
            setLoading(false);
        }
    };

    // Check for OAuth redirect code in URL
    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            setMessage({ text: `Google denegó la autorización: ${error}`, type: 'error' });
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            loadStatus();
            return;
        }

        if (code) {
            exchangeCode(code);
        } else {
            loadStatus();
        }
    }, [searchParams]);

    const exchangeCode = async (code: string) => {
        setActionLoading(true);
        setMessage({ text: 'Vinculando la cuenta de Google con Luxius...', type: 'info' });
        try {
            const redirectUri = `${window.location.origin}${window.location.pathname}`;
            const res = await fetch(`${API_URL}/google-drive/exchange-code`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ code, redirectUri })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setMessage({ text: `¡Cuenta vinculada con éxito! Conectado como: ${data.email || 'Empresa'}`, type: 'success' });
            } else {
                setMessage({ text: data.error || 'Error al vincular con Google', type: 'error' });
            }
        } catch (e: any) {
            setMessage({ text: `Error de conexión: ${e?.message}`, type: 'error' });
        } finally {
            setActionLoading(false);
            window.history.replaceState({}, document.title, window.location.pathname);
            loadStatus();
        }
    };

    const handleConnect = async () => {
        setActionLoading(true);
        setMessage(null);
        try {
            const redirectUri = `${window.location.origin}${window.location.pathname}`;
            const res = await fetch(`${API_URL}/google-drive/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'No se pudo generar la URL de autorización');
            }
            if (data.authUrl) {
                window.location.href = data.authUrl;
            }
        } catch (e: any) {
            setMessage({ text: e?.message || 'Error al iniciar conexión', type: 'error' });
            setActionLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('¿Estás seguro de que deseas desvincular la cuenta de Google Drive? Las descargas de archivos privados compartidos dejarán de funcionar hasta que se vuelva a vincular.')) {
            return;
        }
        setActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/google-drive/disconnect`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                setMessage({ text: 'Cuenta de Google desvinculada correctamente', type: 'info' });
                loadStatus();
            }
        } catch (e: any) {
            setMessage({ text: `Error al desvincular: ${e?.message}`, type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) {
            setMessage({ text: 'Ingresa el Google Client ID', type: 'error' });
            return;
        }
        setActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/google-drive/config`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ clientId, clientSecret })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: 'Credenciales de Google guardadas exitosamente', type: 'success' });
                setShowConfig(false);
                setClientId('');
                setClientSecret('');
                loadStatus();
            } else {
                setMessage({ text: data.error || 'Error al guardar credenciales', type: 'error' });
            }
        } catch (e: any) {
            setMessage({ text: `Error al guardar: ${e?.message}`, type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const currentRedirectUri = `${window.location.origin}${window.location.pathname}`;

    return (
        <div className="sistema-view animate-fade-in" style={{ maxWidth: '950px' }}>
            <div className="view-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="24" height="24" viewBox="0 0 87.3 78" fill="none">
                            <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/>
                            <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.5c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z" fill="#00AC47"/>
                            <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l5.4-9.35c.8-1.4 1.2-2.95 1.2-4.5H55.95l6.85 11.85 10.75 5.3z" fill="#EA4335"/>
                            <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.4-4.45 1.2L43.65 25z" fill="#00832D"/>
                            <path d="M55.95 53H83.45c0-1.55-.4-3.1-1.2-4.5L67.5 4.5c-.8-1.4-1.95-2.5-3.3-3.3L50.45 25l5.5 28z" fill="#FFBA00"/>
                            <path d="M27.5 53L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.4 4.45-1.2L55.95 53H27.5z" fill="#2684FC"/>
                        </svg>
                        Google Drive Corporativo
                    </h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.88rem' }}>
                        Vincula la cuenta de Google de la empresa una sola vez para que todo el equipo pueda descargar archivos y carpetas privadas que los clientes compartan con la imprenta.
                    </p>
                </div>
            </div>

            {message && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '1.25rem',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : message.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                    color: message.type === 'success' ? '#34d399' : message.type === 'error' ? '#f87171' : '#60a5fa'
                }}>
                    <span>{message.text}</span>
                    <button
                        onClick={() => setMessage(null)}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1rem' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* MAIN ACCOUNT STATUS CARD */}
            <div style={{
                background: 'var(--bg-mid, #1e222d)',
                border: '1px solid var(--border-color, #2d3748)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {status?.picture ? (
                            <img
                                src={status.picture}
                                alt="Google Account"
                                style={{ width: '54px', height: '54px', borderRadius: '50%', border: '2px solid #10b981' }}
                            />
                        ) : (
                            <div style={{
                                width: '54px',
                                height: '54px',
                                borderRadius: '50%',
                                background: status?.connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem'
                            }}>
                                {status?.connected ? '🏢' : '☁️'}
                            </div>
                        )}

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                                    {status?.connected ? (status.name || 'Cuenta Corporativa Vinculada') : 'Sin Cuenta de Google Vinculada'}
                                </h4>
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: status?.connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                    color: status?.connected ? '#10b981' : '#94a3b8',
                                    border: `1px solid ${status?.connected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(100, 116, 139, 0.3)'}`
                                }}>
                                    {status?.connected ? '● CONECTADO' : '○ NO VINCULADO'}
                                </span>
                            </div>

                            {status?.connected && status?.email ? (
                                <p style={{ margin: '4px 0 0 0', color: '#60a5fa', fontSize: '0.92rem', fontWeight: 500 }}>
                                    ✉️ {status.email}
                                </p>
                            ) : (
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem' }}>
                                    Al vincular la cuenta de la empresa, todas las órdenes podrán descargar archivos compartidos con este correo.
                                </p>
                            )}

                            {status?.connected_at && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                                    Vinculado el: {new Date(status.connected_at).toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {status?.connected ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDisconnect}
                                disabled={actionLoading}
                                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                            >
                                ✕ Desvincular Cuenta
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleConnect}
                                disabled={actionLoading || !status?.has_client_id}
                                style={{
                                    background: status?.has_client_id ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : undefined,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                🔵 Conectar con Google de la Empresa
                            </Button>
                        )}
                    </div>
                </div>

                {!status?.has_client_id && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#fbbf24',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <span>⚠️ Se requiere configurar las credenciales de Google OAuth (Client ID) antes de conectar.</span>
                        <Button size="xs" variant="outline" onClick={() => setShowConfig(true)}>Configurar Claves</Button>
                    </div>
                )}
            </div>

            {/* CREDENTIALS CONFIGURATION ACCORDION */}
            <div style={{
                background: 'var(--bg-mid, #1e222d)',
                border: '1px solid var(--border-color, #2d3748)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
            }}>
                <div
                    onClick={() => setShowConfig(!showConfig)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                >
                    <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🔑 Credenciales de Google Cloud (Client ID & Secret)
                        {status?.has_client_id && (
                            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ Configurado ({status.client_id_preview})</span>
                        )}
                    </h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{showConfig ? '▲ Ocultar' : '▼ Modificar'}</span>
                </div>

                {showConfig && (
                    <form onSubmit={handleSaveCredentials} style={{ marginTop: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 500 }}>
                                    Google Client ID <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="ej: 123456789-abcdefg.apps.googleusercontent.com"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-dark, #131722)', border: '1px solid var(--border-color, #2d3748)', color: '#fff' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 500 }}>
                                    Google Client Secret {status?.has_client_secret && <span style={{ color: '#10b981', fontSize: '0.75rem' }}>(Guardado previamente)</span>}
                                </label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder={status?.has_client_secret ? "••••••••••••••••••••••••••••••••" : "ej: GOCSPX-abc123xyz"}
                                    value={clientSecret}
                                    onChange={(e) => setClientSecret(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-dark, #131722)', border: '1px solid var(--border-color, #2d3748)', color: '#fff' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowHelp(!showHelp)}
                                style={{ color: '#60a5fa' }}
                            >
                                💡 ¿Cómo crear el Client ID en Google Cloud?
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                disabled={actionLoading || !clientId}
                            >
                                Guardar Credenciales
                            </Button>
                        </div>
                    </form>
                )}
            </div>

            {/* SETUP INSTRUCTIONS GUIDE */}
            <div style={{
                background: 'var(--bg-mid, #1e222d)',
                border: '1px solid var(--border-color, #2d3748)',
                borderRadius: '12px',
                padding: '1.25rem'
            }}>
                <div
                    onClick={() => setShowHelp(!showHelp)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                >
                    <h4 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📋 Guía rápida: Cómo obtener las credenciales de Google (Gratuito)
                    </h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{showHelp ? '▲ Cerrar' : '▼ Ver pasos'}</span>
                </div>

                {showHelp && (
                    <div style={{ marginTop: '1rem', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-muted, #cbd5e1)' }}>
                        <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
                            <li style={{ marginBottom: '8px' }}>
                                Entra a <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Google Cloud Console</a> con la cuenta de correo de la empresa.
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                Crea un nuevo proyecto llamado <strong>Luxius System</strong>.
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                En el menú lateral ve a <strong>APIs y Servicios &gt; Biblioteca</strong>, busca <strong>Google Drive API</strong> y haz clic en <strong>Habilitar</strong>.
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                Ve a <strong>Pantalla de consentimiento de OAuth</strong>, selecciona <strong>Externo</strong>, coloca el nombre "Luxius" y tu correo.
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                Ve a <strong>Credenciales &gt; Crear Credenciales &gt; ID de cliente de OAuth</strong>:
                                <ul style={{ marginTop: '4px' }}>
                                    <li>Tipo de aplicación: <strong>Aplicación web</strong>.</li>
                                    <li>
                                        En <strong>URIs de redireccionamiento autorizados</strong> agrega exactamente esta URL:
                                        <div style={{ background: '#0f172a', padding: '6px 10px', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace', color: '#38bdf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{currentRedirectUri}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(currentRedirectUri);
                                                    alert('URI copiada al portapapeles');
                                                }}
                                                style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                            >
                                                Copiar
                                            </button>
                                        </div>
                                    </li>
                                </ul>
                            </li>
                            <li>
                                Copia el <strong>ID de cliente</strong> y el <strong>Secreto del cliente</strong> y pégalos en la sección de arriba. ¡Listo!
                            </li>
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
}
