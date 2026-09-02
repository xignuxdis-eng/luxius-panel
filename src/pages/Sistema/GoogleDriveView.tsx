import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '@components/ui/Button';
import { 
    CheckCircle2, AlertTriangle, RefreshCw, HardDrive, ShieldCheck, 
    Cloud, Server, FileText, ExternalLink, Database, Activity, Clock 
} from 'lucide-react';
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

interface VaultStatus {
    connected: boolean;
    email?: string;
    shared_drive_configured: boolean;
    shared_drive_id?: string;
    vault_folder_id?: string;
    r2_bucket: string;
    latest_audit?: {
        id: number;
        job_id: string;
        status: string;
        total_r2_files: number;
        total_drive_files: number;
        synced_matches: number;
        missing_new: number;
        hash_mismatches: number;
        lifecycle_purged: number;
        started_at: string;
        completed_at?: string;
        details?: Array<{
            fileName: string;
            r2Key: string;
            classification: 'SYNCED_MATCH' | 'MISSING_NEW' | 'HASH_MISMATCH' | 'LIFECYCLE_PURGED';
            detail: string;
            size: number;
            status: string;
        }>;
    };
}

export default function GoogleDriveView() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [status, setStatus] = useState<GoogleDriveStatus | null>(null);
    const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isReconciling, setIsReconciling] = useState(false);
    const [reconcileProgress, setReconcileProgress] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Filter for classified audit table
    const [auditFilter, setAuditFilter] = useState<'ALL' | 'MISMATCH' | 'MISSING' | 'SYNCED'>('ALL');

    // Form for credentials
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [showConfig, setShowConfig] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Load initial status and vault status
    const loadStatus = async () => {
        setLoading(true);
        try {
            const [resDrive, resVault] = await Promise.all([
                fetch(`${API_URL}/google-drive/status`, { headers: getAuthHeaders() }),
                fetch(`${API_URL}/google-drive/vault/status`, { headers: getAuthHeaders() })
            ]);

            if (resDrive.ok) {
                const dataDrive = await resDrive.json();
                setStatus(dataDrive);
                if (!dataDrive.has_client_id) {
                    setShowConfig(true);
                }
            }

            if (resVault.ok) {
                const dataVault = await resVault.json();
                setVaultStatus(dataVault);
            }
        } catch (e) {
            console.error("Error loading Google Drive / Vault status", e);
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
            if (res.ok && data.authUrl) {
                window.location.href = data.authUrl;
            } else {
                setMessage({ text: data.error || 'No se pudo generar la URL de autorización.', type: 'error' });
                setActionLoading(false);
            }
        } catch (e: any) {
            setMessage({ text: `Error: ${e?.message}`, type: 'error' });
            setActionLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("¿Seguro que deseas desvincular la cuenta de Google Drive?")) return;
        setActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/google-drive/disconnect`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                setMessage({ text: 'Cuenta desvinculada exitosamente.', type: 'success' });
                loadStatus();
            } else {
                setMessage({ text: 'Error al desvincular.', type: 'error' });
            }
        } catch (e: any) {
            setMessage({ text: `Error: ${e?.message}`, type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_URL}/google-drive/config`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ clientId, clientSecret })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setMessage({ text: 'Credenciales guardadas exitosamente.', type: 'success' });
                setShowConfig(false);
                loadStatus();
            } else {
                setMessage({ text: data.error || 'Error al guardar credenciales.', type: 'error' });
            }
        } catch (e: any) {
            setMessage({ text: `Error: ${e?.message}`, type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    // Ejecutar Reconciliación Inteligente
    const handleTriggerReconcile = async () => {
        setIsReconciling(true);
        setReconcileProgress('Iniciando auditoría de integridad R2 vs Drive...');
        setMessage(null);

        try {
            const res = await fetch(`${API_URL}/google-drive/vault/reconcile`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ auto_sync: true })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al iniciar reconciliación');
            }

            const jobId = data.job_id;
            
            // Polling de progreso
            const interval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`${API_URL}/google-drive/vault/reconcile/status/${jobId}`, {
                        headers: getAuthHeaders()
                    });
                    if (statusRes.ok) {
                        const jobData = await statusRes.json();
                        if (jobData.status === 'running') {
                            setReconcileProgress(jobData.progress || 'Auditando archivos...');
                        } else if (jobData.status === 'success' || jobData.audit) {
                            clearInterval(interval);
                            setIsReconciling(false);
                            setReconcileProgress(null);
                            setMessage({ text: '¡Auditoría y reconciliación completadas con éxito!', type: 'success' });
                            loadStatus();
                        } else if (jobData.status === 'error') {
                            clearInterval(interval);
                            setIsReconciling(false);
                            setReconcileProgress(null);
                            setMessage({ text: `Error en auditoría: ${jobData.error}`, type: 'error' });
                        }
                    }
                } catch (pe) {
                    console.error("Polling error", pe);
                }
            }, 2000);

        } catch (err: any) {
            setIsReconciling(false);
            setReconcileProgress(null);
            setMessage({ text: err.message || 'Error al disparar reconciliación', type: 'error' });
        }
    };

    const currentRedirectUri = `${window.location.origin}${window.location.pathname}`;
    const latestAudit = vaultStatus?.latest_audit;

    const filteredAuditDetails = (latestAudit?.details || []).filter(item => {
        if (auditFilter === 'MISMATCH') return item.classification === 'HASH_MISMATCH';
        if (auditFilter === 'MISSING') return item.classification === 'MISSING_NEW';
        if (auditFilter === 'SYNCED') return item.classification === 'SYNCED_MATCH';
        return true;
    });

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem', color: 'var(--text-main, #f8fafc)' }}>
            
            {/* HEADER */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <HardDrive size={28} style={{ color: '#3b82f6' }} />
                        Almacenamiento Dual & Bóveda Histórica
                    </h2>
                    <p style={{ margin: 0, color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem' }}>
                        Arquitectura de almacenamiento dual: <strong>Cloudflare R2</strong> (Autoridad / Hot Tier) y <strong>Google Drive Shared Drive</strong> (Bóveda / Cold Tier).
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={loadStatus}
                        disabled={loading || actionLoading || isReconciling}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleTriggerReconcile}
                        disabled={loading || isReconciling || !status?.connected}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                        }}
                    >
                        <Activity size={14} className={isReconciling ? 'animate-spin' : ''} />
                        {isReconciling ? 'Auditando...' : 'Reconciliar Integridad'}
                    </Button>
                </div>
            </div>

            {/* NOTIFICACIONES */}
            {message && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : message.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                    color: message.type === 'success' ? '#34d399' : message.type === 'error' ? '#fca5a5' : '#93c5fd',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.9rem'
                }}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* BANNER DE RECONCILIACIÓN EN CURSO */}
            {isReconciling && (
                <div style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    marginBottom: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(15, 23, 42, 0.8))',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <RefreshCw size={20} className="icon-spin" style={{ color: '#38bdf8' }} />
                    <div>
                        <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>Job de Reconciliación en Ejecución</strong>
                        <p style={{ margin: '2px 0 0 0', color: '#cbd5e1', fontSize: '0.85rem' }}>
                            {reconcileProgress || 'Procesando auditoría...'}
                        </p>
                    </div>
                </div>
            )}

            {/* RESUMEN DE ARQUITECTURA DUAL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                
                {/* CARD R2 (AUTORIDAD) */}
                <div style={{
                    background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '12px',
                    padding: '1.25rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Cloud size={20} style={{ color: '#38bdf8' }} />
                            <h4 style={{ margin: 0, fontSize: '1rem', color: '#60a5fa' }}>Cloudflare R2</h4>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                            AUTORIDAD MASTER
                        </span>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Capa Caliente con <strong>Zero Egress</strong> para streaming instantáneo al frontend, descarga al RIP y visualización de miniaturas.
                    </p>
                    <div style={{ fontSize: '0.85rem', color: '#f8fafc', background: 'rgba(0,0,0,0.25)', padding: '6px 10px', borderRadius: '6px' }}>
                        📦 Bucket: <code>{vaultStatus?.r2_bucket || 'luxius-media'}</code>
                    </div>
                </div>

                {/* CARD GOOGLE DRIVE (BÓVEDA) */}
                <div style={{
                    background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '12px',
                    padding: '1.25rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HardDrive size={20} style={{ color: '#34d399' }} />
                            <h4 style={{ margin: 0, fontSize: '1rem', color: '#34d399' }}>Google Drive Shared Drive</h4>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: status?.connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: status?.connected ? '#10b981' : '#94a3b8', border: `1px solid ${status?.connected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(100, 116, 139, 0.3)'}` }}>
                            {status?.connected ? 'BÓVEDA ACTIVA' : 'NO VINCULADA'}
                        </span>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Capa Fría de Respaldo Histórico navegable por la empresa, organizada como <code>AÑO/MES/CLIENTE/OT-XXXX/</code>.
                    </p>
                    <div style={{ fontSize: '0.85rem', color: '#f8fafc', background: 'rgba(0,0,0,0.25)', padding: '6px 10px', borderRadius: '6px' }}>
                        🏢 Cuenta: <strong>{status?.email || 'Sin vincular'}</strong>
                    </div>
                </div>
            </div>

            {/* TABLERO DE INTEGRIDAD & ÚLTIMA AUDITORÍA */}
            <div style={{
                background: 'var(--bg-mid, #1e222d)',
                border: '1px solid var(--border-color, #2d3748)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={20} style={{ color: '#10b981' }} />
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                            Estado de Reconciliación Clasificada (R2 vs Drive)
                        </h4>
                    </div>

                    {latestAudit && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} /> Última auditoría: {new Date(latestAudit.started_at).toLocaleString()}
                        </span>
                    )}
                </div>

                {latestAudit ? (
                    <>
                        {/* MÉTRICAS */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '1rem' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#6ee7b7', display: 'block' }}>Integridad SHA-256</span>
                                <strong style={{ fontSize: '1.3rem', color: '#10b981' }}>{latestAudit.synced_matches}</strong>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Sincronizados</span>
                            </div>

                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#93c5fd', display: 'block' }}>Faltantes / Auto-Sync</span>
                                <strong style={{ fontSize: '1.3rem', color: '#3b82f6' }}>{latestAudit.missing_new}</strong>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Pendientes / Subidos</span>
                            </div>

                            <div style={{ background: latestAudit.hash_mismatches > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)', border: `1px solid ${latestAudit.hash_mismatches > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: latestAudit.hash_mismatches > 0 ? '#fca5a5' : '#94a3b8', display: 'block' }}>Discrepancias Hash</span>
                                <strong style={{ fontSize: '1.3rem', color: latestAudit.hash_mismatches > 0 ? '#ef4444' : '#64748b' }}>{latestAudit.hash_mismatches}</strong>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Alertas de Integridad</span>
                            </div>

                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block' }}>Total en R2</span>
                                <strong style={{ fontSize: '1.3rem', color: '#f8fafc' }}>{latestAudit.total_r2_files}</strong>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Archivos Hot</span>
                            </div>
                        </div>

                        {/* FILTROS DE TABLA */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                            <button 
                                onClick={() => setAuditFilter('ALL')}
                                style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: auditFilter === 'ALL' ? '#3b82f6' : 'rgba(255,255,255,0.06)', color: '#fff' }}
                            >
                                Todos ({latestAudit.details?.length || 0})
                            </button>
                            <button 
                                onClick={() => setAuditFilter('MISMATCH')}
                                style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: auditFilter === 'MISMATCH' ? '#ef4444' : 'rgba(255,255,255,0.06)', color: '#fff' }}
                            >
                                ⚠️ Discrepancias ({latestAudit.hash_mismatches})
                            </button>
                            <button 
                                onClick={() => setAuditFilter('MISSING')}
                                style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: auditFilter === 'MISSING' ? '#f59e0b' : 'rgba(255,255,255,0.06)', color: '#fff' }}
                            >
                                ⏳ Faltantes / Auto-Sync ({latestAudit.missing_new})
                            </button>
                            <button 
                                onClick={() => setAuditFilter('SYNCED')}
                                style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: auditFilter === 'SYNCED' ? '#10b981' : 'rgba(255,255,255,0.06)', color: '#fff' }}
                            >
                                ✅ Sincronizados ({latestAudit.synced_matches})
                            </button>
                        </div>

                        {/* TABLA DE AUDITORÍA */}
                        <div style={{ maxHeight: '220px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                                        <th style={{ padding: '8px 12px' }}>Archivo</th>
                                        <th style={{ padding: '8px 12px' }}>Clasificación</th>
                                        <th style={{ padding: '8px 12px' }}>Tamaño</th>
                                        <th style={{ padding: '8px 12px' }}>Detalle</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAuditDetails.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#f8fafc' }}>{item.fileName}</td>
                                            <td style={{ padding: '8px 12px' }}>
                                                {item.classification === 'SYNCED_MATCH' && (
                                                    <span style={{ color: '#34d399', fontWeight: 700 }}>✅ SYNCED_MATCH</span>
                                                )}
                                                {item.classification === 'MISSING_NEW' && (
                                                    <span style={{ color: '#fbbf24', fontWeight: 700 }}>⏳ MISSING_NEW</span>
                                                )}
                                                {item.classification === 'HASH_MISMATCH' && (
                                                    <span style={{ color: '#f87171', fontWeight: 700 }}>🚨 HASH_MISMATCH</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 12px', color: '#94a3b8' }}>
                                                {(item.size / (1024 * 1024)).toFixed(2)} MB
                                            </td>
                                            <td style={{ padding: '8px 12px', color: '#cbd5e1' }}>{item.detail}</td>
                                        </tr>
                                    ))}
                                    {filteredAuditDetails.length === 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                                                No hay registros para este filtro.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                        <Database size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                        <p style={{ margin: 0 }}>Aún no se ha ejecutado ninguna auditoría de reconciliación.</p>
                        <Button 
                            size="sm" 
                            variant="primary" 
                            onClick={handleTriggerReconcile}
                            style={{ marginTop: '10px' }}
                        >
                            Ejecutar Primera Auditoría
                        </Button>
                    </div>
                )}
            </div>

            {/* CUENTA GOOGLE CONECTADA */}
            <div style={{
                background: 'var(--bg-mid, #1e222d)',
                border: '1px solid var(--border-color, #2d3748)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {status?.picture ? (
                            <img src={status.picture} alt="Profile" style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid #3b82f6' }} />
                        ) : (
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontWeight: 700 }}>
                                📁
                            </div>
                        )}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
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
                                    Al vincular la cuenta corporativa, se activa la sincronización y reconciliación automática con la Bóveda de Drive.
                                </p>
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
                        📋 Guía rápida: Configuración de Google Drive & Shared Drive
                    </h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{showHelp ? '▲ Cerrar' : '▼ Ver pasos'}</span>
                </div>

                {showHelp && (
                    <div style={{ marginTop: '1rem', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-muted, #cbd5e1)' }}>
                        <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
                            <li style={{ marginBottom: '8px' }}>
                                Entra a <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Google Cloud Console</a> con la cuenta de la empresa.
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                En APIs y Servicios, habilita <strong>Google Drive API</strong>.
                            </li>
                            <li style={{ marginBottom: '8px' }}>
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
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
}
