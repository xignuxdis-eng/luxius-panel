import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Layers,
    RefreshCw,
    ExternalLink,
    AlertCircle,
    Copy,
    Check,
    Maximize2,
    Minimize2,
    Sliders
} from 'lucide-react';

export interface PsdfyTabProps {
    initialFileUrl?: string | null;
    initialFileName?: string | null;
    order?: any;
    isActive: boolean;
    onClose?: () => void;
}

const DEFAULT_PSDFY_URL = 'http://localhost:3457';

export const PsdfyTab: React.FC<PsdfyTabProps> = ({
    initialFileUrl,
    initialFileName,
    order,
    isActive,
    onClose
}) => {
    const [serviceUrl, setServiceUrl] = useState<string>(() => {
        return (import.meta.env.VITE_PSDFY_URL as string) || DEFAULT_PSDFY_URL;
    });
    const [isOnline, setIsOnline] = useState<boolean>(false);
    const [isChecking, setIsChecking] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [reloadKey, setReloadKey] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Comprobador de salud del microservicio local
    const checkHealth = useCallback(async (targetUrl: string) => {
        setIsChecking(true);
        try {
            // Se usa mode: 'no-cors' porque localhost puede no tener cabeceras CORS permisivas
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            await fetch(targetUrl, {
                method: 'GET',
                mode: 'no-cors',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            setIsOnline(true);
        } catch {
            setIsOnline(false);
        } finally {
            setIsChecking(false);
        }
    }, []);

    // Verificación al montar y sondeo suave cuando está offline y activa la pestaña
    useEffect(() => {
        if (!isActive) return;

        checkHealth(serviceUrl);

        const interval = setInterval(() => {
            if (!isOnline) {
                checkHealth(serviceUrl);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [isActive, isOnline, serviceUrl, checkHealth]);

    const handleCopyCommand = () => {
        navigator.clipboard.writeText('psdfy start');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    };

    if (!isActive) return null;

    return (
        <div
            ref={containerRef}
            style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                width: '100%',
                height: 'calc(100vh - 60px)',
                background: '#090e17',
                color: '#f8fafc',
                overflow: 'hidden'
            }}
        >
            {/* Barra superior de estado de PSDFy */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 16px',
                    background: '#0d1524',
                    borderBottom: '1px solid #1e293b',
                    fontSize: 13,
                    flexShrink: 0,
                    gap: 12
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#c084fc' }}>
                        <Layers size={18} />
                        <span>PSDFy Studio</span>
                        <span style={{ fontSize: 10, background: '#7c3aed', color: '#fff', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                            IA SAM 2
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, background: '#131e33', padding: '2px 8px', borderRadius: 12, border: `1px solid ${isOnline ? '#22c55e' : '#ef4444'}` }}>
                        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: isOnline ? '#22c55e' : '#ef4444' }} />
                        <span style={{ color: isOnline ? '#86efac' : '#fca5a5', fontWeight: 600 }}>
                            {isChecking ? 'Verificando...' : isOnline ? 'Microservicio En Línea' : 'Servicio en Reposo'}
                        </span>
                    </div>

                    {order && (
                        <span style={{ fontSize: 11, background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                            OT #{order.ot || order.id}
                        </span>
                    )}

                    {initialFileName && (
                        <div style={{ color: '#94a3b8', fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={initialFileName}>
                            📄 {initialFileName}
                        </div>
                    )}

                    {initialFileUrl && (
                        <a
                            href={initialFileUrl}
                            download={initialFileName || 'diseno_original.png'}
                            style={{ color: '#38bdf8', fontSize: 11, textDecoration: 'none', background: '#1e293b', padding: '2px 6px', borderRadius: 4, border: '1px solid #334155' }}
                            title="Descargar imagen base para arrastrar a PSDFy"
                        >
                            ⬇️ Descargar base
                        </a>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        type="button"
                        onClick={() => checkHealth(serviceUrl)}
                        disabled={isChecking}
                        title="Comprobar conexión"
                        style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#e2e8f0',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11
                        }}
                    >
                        <RefreshCw size={13} className={isChecking ? 'spin' : ''} />
                        <span>Reintentar</span>
                    </button>

                    {isOnline && (
                        <>
                            <button
                                type="button"
                                onClick={() => setReloadKey(k => k + 1)}
                                title="Recargar WebUI"
                                style={{
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    color: '#e2e8f0',
                                    borderRadius: 6,
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    fontSize: 11
                                }}
                            >
                                🔄 Recargar
                            </button>
                            <button
                                type="button"
                                onClick={toggleFullscreen}
                                title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                                style={{
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    color: '#e2e8f0',
                                    borderRadius: 6,
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                            </button>
                            <a
                                href={serviceUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    background: '#7c3aed',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: 6,
                                    padding: '4px 10px',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 11,
                                    fontWeight: 600
                                }}
                            >
                                <span>Ventana externa</span>
                                <ExternalLink size={12} />
                            </a>
                        </>
                    )}

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px 6px',
                                fontSize: 16
                            }}
                            title="Volver"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Contenido principal */}
            {isOnline ? (
                <div style={{ flex: 1, width: '100%', position: 'relative', overflow: 'hidden' }}>
                    <iframe
                        key={reloadKey}
                        src={serviceUrl}
                        title="PSDFy WebUI"
                        sandbox="allow-scripts allow-forms allow-same-origin allow-downloads allow-popups"
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            background: '#0a0f1d'
                        }}
                    />
                </div>
            ) : (
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 30,
                        overflowY: 'auto'
                    }}
                >
                    <div
                        style={{
                            maxWidth: 720,
                            width: '100%',
                            background: '#0d1526',
                            border: '1px solid #1e2d4a',
                            borderRadius: 12,
                            padding: 28,
                            boxShadow: '0 12px 36px rgba(0,0,0,0.5)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 10,
                                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 24
                                }}
                            >
                                📑
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#f8fafc' }}>
                                    PSDFy — Segmentación Inteligente de Capas Photoshop
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                                    Convierte imágenes planas en archivos <code style={{ color: '#38bdf8' }}>.PSD</code> con capas independientes usando SAM 2 (Segment Anything 2)
                                </p>
                            </div>
                        </div>

                        {/* Banner de Estado */}
                        <div
                            style={{
                                background: '#1c131a',
                                border: '1px solid #78350f',
                                borderRadius: 8,
                                padding: '12px 16px',
                                marginBottom: 20,
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 12
                            }}
                        >
                            <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <div style={{ fontWeight: 700, color: '#fcd34d', fontSize: 13 }}>
                                    Microservicio Local en Reposo ({serviceUrl})
                                </div>
                                <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4, lineHeight: 1.5 }}>
                                    Por motivos de rendimiento y privacidad industrial, los modelos de IA de segmentación profunda (SAM 2 / PyTorch) se ejecutan en tu máquina o en la PC del taller, garantizando procesamiento veloz y sin límites de memoria en la nube.
                                </div>
                            </div>
                        </div>

                        {/* Pasos de Puesta en Marcha */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                            <div style={{ background: '#080d17', border: '1px solid #1e293b', borderRadius: 8, padding: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd' }}>
                                        🚀 Paso 1: Iniciar el servicio en Windows (Terminal / PowerShell)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyCommand}
                                        style={{
                                            background: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: 5,
                                            padding: '4px 10px',
                                            color: '#f8fafc',
                                            fontSize: 11,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}
                                    >
                                        {copied ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                                        <span>{copied ? 'Copiado!' : 'Copiar comando'}</span>
                                    </button>
                                </div>
                                <pre
                                    style={{
                                        margin: 0,
                                        padding: '10px 14px',
                                        background: '#04070e',
                                        borderRadius: 6,
                                        border: '1px solid #0f172a',
                                        color: '#38bdf8',
                                        fontFamily: 'Consolas, monospace',
                                        fontSize: 12,
                                        overflowX: 'auto'
                                    }}
                                >
                                    psdfy start
                                </pre>
                            </div>

                            <div style={{ background: '#080d17', border: '1px solid #1e293b', borderRadius: 8, padding: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', marginBottom: 6 }}>
                                    📦 ¿Primera vez? Instalación rápida con pip
                                </div>
                                <pre
                                    style={{
                                        margin: 0,
                                        padding: '10px 14px',
                                        background: '#04070e',
                                        borderRadius: 6,
                                        border: '1px solid #0f172a',
                                        color: '#a78bfa',
                                        fontFamily: 'Consolas, monospace',
                                        fontSize: 12,
                                        overflowX: 'auto'
                                    }}
                                >
                                    pip install psdfy && psdfy install
                                </pre>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                                    Tip: Si solo querés detección rápida por texto sin descargar pesos SAM2 (2GB+), usá <code style={{ color: '#94a3b8' }}>psdfy install --no-weights</code>.
                                </div>
                            </div>
                        </div>

                        {/* Configuración de URL y Diagnóstico */}
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                borderTop: '1px solid #1e293b',
                                paddingTop: 18
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Sliders size={14} color="#94a3b8" />
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>URL del Servicio:</span>
                                <input
                                    type="text"
                                    value={serviceUrl}
                                    onChange={(e) => setServiceUrl(e.target.value)}
                                    placeholder="http://localhost:3457"
                                    style={{
                                        background: '#04070e',
                                        border: '1px solid #334155',
                                        color: '#f8fafc',
                                        borderRadius: 5,
                                        padding: '4px 8px',
                                        fontSize: 11,
                                        width: 170
                                    }}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => checkHealth(serviceUrl)}
                                disabled={isChecking}
                                style={{
                                    background: '#2563eb',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: 6,
                                    padding: '8px 16px',
                                    fontWeight: 700,
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <RefreshCw size={14} className={isChecking ? 'spin' : ''} />
                                <span>{isChecking ? 'Comprobando...' : 'Comprobar Conexión'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
