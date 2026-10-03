import { useState, useEffect } from 'react'
import Button from '@components/ui/Button'
import { API_URL, getAuthHeaders } from '@data/db'
import './TelegramView.css'

interface TelegramStatus {
    configured: boolean;
    bot?: {
        id: number;
        first_name: string;
        username: string;
        can_join_groups?: boolean;
    };
    admins_count: number;
    admins?: string[];
    message?: string;
    error?: string;
}

export default function TelegramView() {
    const [status, setStatus] = useState<TelegramStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [testMessage, setTestMessage] = useState('🔔 Notificación de prueba desde LuXius Panel');

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const resp = await fetch(`${API_URL}/api/telegram/status`, {
                headers: getAuthHeaders(),
            });
            const data = await resp.json();
            setStatus(data);
        } catch (err: any) {
            console.error('Error fetching telegram status:', err);
            setStatus({
                configured: false,
                admins_count: 0,
                message: 'No se pudo conectar con el servidor backend.',
                error: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleSetupWebhook = async () => {
        setActionLoading('webhook');
        setFeedback(null);
        try {
            const resp = await fetch(`${API_URL}/api/telegram/setup-webhook`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    webhook_url: 'https://luxius-backend.onrender.com/api/telegram/webhook'
                })
            });
            const data = await resp.json();
            if (data.ok) {
                setFeedback({ type: 'success', text: `✅ Webhook configurado exitosamente: ${data.webhook_url}` });
                fetchStatus();
            } else {
                setFeedback({ type: 'error', text: `❌ Error al configurar webhook: ${data.error || 'Respuesta inválida'}` });
            }
        } catch (err: any) {
            setFeedback({ type: 'error', text: `❌ Fallo de red: ${err.message}` });
        } finally {
            setActionLoading(null);
        }
    };

    const handleSendTest = async () => {
        if (!testMessage.trim()) return;
        setActionLoading('test');
        setFeedback(null);
        try {
            const resp = await fetch(`${API_URL}/api/telegram/notify`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: testMessage })
            });
            const data = await resp.json();
            if (data.ok && data.sent > 0) {
                setFeedback({ type: 'success', text: `✅ Mensaje enviado exitosamente a ${data.sent} administrador(es)` });
            } else {
                setFeedback({ type: 'error', text: `⚠️ No se pudo enviar: ${data.error || 'Verifica TELEGRAM_ADMIN_CHAT_ID'}` });
            }
        } catch (err: any) {
            setFeedback({ type: 'error', text: `❌ Error: ${err.message}` });
        } finally {
            setActionLoading(null);
        }
    };

    const handleTriggerBriefing = async () => {
        setActionLoading('briefing');
        setFeedback(null);
        try {
            const resp = await fetch(`${API_URL}/api/telegram/briefing/trigger`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const data = await resp.json();
            if (data.ok && data.sent > 0) {
                setFeedback({ type: 'success', text: `✅ Briefing matutino enviado a ${data.sent} administrador(es)` });
            } else {
                setFeedback({ type: 'error', text: `⚠️ Error al enviar briefing: ${data.error || 'Sin destinatarios'}` });
            }
        } catch (err: any) {
            setFeedback({ type: 'error', text: `❌ Error: ${err.message}` });
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="sistema-view telegram-view">
            <div className="view-header" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🤖</span> Telegram Bot & Asistente Xana
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Control de taller, alertas push inmediatas, briefing matutino y comando por voz con IA
                    </p>
                </div>
                <Button size="sm" variant="ghost" onClick={fetchStatus} disabled={loading}>
                    {loading ? 'Comprobando...' : '🔄 Actualizar Estado'}
                </Button>
            </div>

            {feedback && (
                <div className={`telegram-feedback-banner ${feedback.type} animate-fade-in`}>
                    {feedback.text}
                </div>
            )}

            {/* STATUS GRID */}
            <div className="telegram-status-grid">
                <div className={`telegram-card ${status?.configured ? 'status-ok' : 'status-warning'}`}>
                    <div className="card-header">
                        <span className="card-icon">{status?.configured ? '🟢' : '🟡'}</span>
                        <h4>Estado del Bot</h4>
                    </div>
                    <div className="card-body">
                        {status?.configured ? (
                            <>
                                <p className="card-main-text">Conectado y Activo</p>
                                {status.bot && (
                                    <div className="bot-info-badge">
                                        <strong>{status.bot.first_name}</strong> (@{status.bot.username})
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="card-main-text" style={{ color: '#f59e0b' }}>No Vinculado</p>
                                <span className="card-subtext">{status?.message || 'Falta TELEGRAM_BOT_TOKEN'}</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="telegram-card">
                    <div className="card-header">
                        <span className="card-icon">👥</span>
                        <h4>Administradores</h4>
                    </div>
                    <div className="card-body">
                        <p className="card-main-text">{status?.admins_count ?? 0} Destinatario(s)</p>
                        <span className="card-subtext">
                            {status?.admins_count && status.admins_count > 0
                                ? 'Reciben alertas urgentes, VIP y briefings'
                                : 'Configura TELEGRAM_ADMIN_CHAT_ID'}
                        </span>
                    </div>
                </div>

                <div className="telegram-card">
                    <div className="card-header">
                        <span className="card-icon">⚡</span>
                        <h4>Canal Webhook</h4>
                    </div>
                    <div className="card-body">
                        <p className="card-main-text">luxius-backend.onrender.com</p>
                        <span className="card-subtext">Puerto seguro HTTPS activo para comandos y notas de voz</span>
                    </div>
                </div>
            </div>

            {/* ACTION PANEL */}
            <div className="telegram-action-panel glass-panel">
                <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🚀</span> Operaciones y Acciones Rápidas
                </h4>
                <div className="telegram-actions-grid">
                    <div className="action-item">
                        <h5>1. Activar / Registrar Webhook</h5>
                        <p>Vincula los servidores de Telegram con tu backend en Render para recibir comandos y audios al instante.</p>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSetupWebhook}
                            disabled={actionLoading === 'webhook' || !status?.configured}
                        >
                            {actionLoading === 'webhook' ? 'Registrando...' : '🔗 Configurar Webhook en Telegram'}
                        </Button>
                    </div>

                    <div className="action-item">
                        <h5>2. Enviar Mensaje de Prueba</h5>
                        <p>Comprueba que las notificaciones lleguen directamente a tu chat privado o grupo de Telegram.</p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <input
                                type="text"
                                className="input-field"
                                value={testMessage}
                                onChange={(e) => setTestMessage(e.target.value)}
                                style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem' }}
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleSendTest}
                                disabled={actionLoading === 'test' || !status?.configured}
                            >
                                {actionLoading === 'test' ? 'Enviando...' : '📤 Probar'}
                            </Button>
                        </div>
                    </div>

                    <div className="action-item">
                        <h5>3. Enviar Briefing Matutino</h5>
                        <p>Genera el reporte ejecutivo con métricas de bobinas, OTs urgentes y plan de Xana y lo despacha al bot.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTriggerBriefing}
                            disabled={actionLoading === 'briefing' || !status?.configured}
                        >
                            {actionLoading === 'briefing' ? 'Generando...' : '☀️ Despachar Briefing'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* SETUP GUIDE */}
            <div className="telegram-guide glass-panel">
                <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📖</span> ¿Qué se necesita para operar con Telegram? (3 Pasos Simples)
                </h4>

                <div className="guide-steps">
                    <div className="step-card">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h5>Crear el Bot con @BotFather</h5>
                            <p>
                                Abrí Telegram y buscá al bot oficial <strong>@BotFather</strong>. Enviá <code>/newbot</code>, elegí un nombre (ej. <em>LuXius Taller</em>) y un usuario (ej. <em>luxius_taller_bot</em>).
                            </p>
                            <div className="code-snippet">
                                <span>Token generado: <code>123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ</code></span>
                            </div>
                            <p style={{ marginTop: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                Copiá ese token y agregalo como variable <code>TELEGRAM_BOT_TOKEN</code> en el panel de Render (Environment Variables).
                            </p>
                        </div>
                    </div>

                    <div className="step-card">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h5>Obtener tu Chat ID (@userinfobot)</h5>
                            <p>
                                Buscá en Telegram al bot <strong>@userinfobot</strong> o <strong>@raw_data_bot</strong> y dale a Iniciar. Te devolverá tu número de usuario (ej. <code>123456789</code>).
                            </p>
                            <p style={{ marginTop: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                Agregalo como variable <code>TELEGRAM_ADMIN_CHAT_ID</code> en Render. Si son varios usuarios, sepralos con coma: <code>123456789,987654321</code>.
                            </p>
                        </div>
                    </div>

                    <div className="step-card">
                        <div className="step-number">3</div>
                        <div className="step-content">
                            <h5>Activar el Webhook y ¡Listo!</h5>
                            <p>
                                Una vez guardadas las variables en Render y reiniciado el servicio, volvé a esta pestaña y hacé clic en el botón <strong>🔗 Configurar Webhook en Telegram</strong>.
                            </p>
                            <p style={{ marginTop: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                También podés activarlo abriendo en cualquier navegador:
                            </p>
                            <div className="code-snippet" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                                <code>https://api.telegram.org/bot&lt;TU_TOKEN&gt;/setWebhook?url=https://luxius-backend.onrender.com/api/telegram/webhook</code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOT COMMANDS CHEATSHEET */}
                <h5 style={{ margin: '24px 0 12px 0', fontSize: '0.95rem' }}>💬 Comandos que podés escribirle al Bot desde Telegram:</h5>
                <div className="commands-grid">
                    <div className="cmd-pill"><code>/status</code> <span>Resumen general de taller y alertas</span></div>
                    <div className="cmd-pill"><code>/taller</code> <span>Metros y bobinas en producción</span></div>
                    <div className="cmd-pill"><code>/alertas</code> <span>Bobinas con stock bajo</span></div>
                    <div className="cmd-pill"><code>/tareas</code> <span>Lista de pendientes de Xana</span></div>
                    <div className="cmd-pill"><code>/briefing</code> <span>Reporte matutino al instante</span></div>
                    <div className="cmd-pill"><code>/addtask [texto]</code> <span>Crear nueva tarea para el taller</span></div>
                    <div className="cmd-pill"><code>/completar [ID]</code> <span>Marcar tarea finalizada</span></div>
                    <div className="cmd-pill"><code>🎙️ Enviar Audio</code> <span>Xana transcribe la nota de voz y extrae la tarea</span></div>
                </div>
            </div>
        </div>
    );
}
