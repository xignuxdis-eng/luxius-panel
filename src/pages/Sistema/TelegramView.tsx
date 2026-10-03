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
    admin_chat_id?: string;
    has_token?: boolean;
    message?: string;
    error?: string;
}

export default function TelegramView() {
    const [status, setStatus] = useState<TelegramStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [testMessage, setTestMessage] = useState('🔔 Notificación de prueba desde LuXius Panel');

    // Input fields for direct configuration
    const [botToken, setBotToken] = useState('');
    const [adminChatId, setAdminChatId] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState('https://luxius-backend.onrender.com/api/telegram/webhook');

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const resp = await fetch(`${API_URL}/api/telegram/status`, {
                headers: getAuthHeaders(),
            });
            const data = await resp.json();
            setStatus(data);
            if (data.admin_chat_id && !adminChatId) {
                setAdminChatId(data.admin_chat_id);
            }
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

    const handleSaveConfig = async (autoWebhook = false) => {
        if (!botToken.trim() && !status?.configured) {
            setFeedback({ type: 'error', text: '⚠️ Por favor pega el Token del bot obtenido de @BotFather.' });
            return;
        }

        setActionLoading('save');
        setFeedback(null);
        try {
            const resp = await fetch(`${API_URL}/api/telegram/config`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bot_token: botToken.trim() || undefined,
                    admin_chat_id: adminChatId.trim() || undefined,
                    webhook_url: webhookUrl.trim()
                })
            });
            const data = await resp.json();
            if (data.ok) {
                let msg = '✅ Credenciales guardadas y bot verificado con éxito.';
                if (data.webhook_registered) {
                    msg += ' 🚀 ¡Webhook registrado automáticamente en Telegram!';
                }
                setFeedback({ type: 'success', text: msg });
                fetchStatus();
            } else {
                setFeedback({ type: 'error', text: `❌ ${data.error || 'Error al guardar credenciales'}` });
            }
        } catch (err: any) {
            setFeedback({ type: 'error', text: `❌ Error de red: ${err.message}` });
        } finally {
            setActionLoading(null);
        }
    };

    const handleSetupWebhook = async () => {
        const tokenToUse = botToken.trim();
        if (!tokenToUse && !status?.configured) {
            setFeedback({ type: 'error', text: '⚠️ Ingresa primero el Token del bot en el campo de arriba para activar el webhook.' });
            return;
        }

        setActionLoading('webhook');
        setFeedback(null);
        try {
            const resp = await fetch(`${API_URL}/api/telegram/setup-webhook`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: webhookUrl.trim(),
                    bot_token: tokenToUse || undefined
                })
            });
            const data = await resp.json();
            if (data.ok || resp.ok) {
                setFeedback({
                    type: 'success',
                    text: `✅ Webhook configurado exitosamente en Telegram para: ${webhookUrl}`
                });
                fetchStatus();
            } else {
                setFeedback({
                    type: 'error',
                    text: `❌ Error al configurar webhook: ${data.description || data.error || 'Verifica el token'}`
                });
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
            if (data.ok && data.sent_count > 0) {
                setFeedback({ type: 'success', text: `✅ Notificación enviada con éxito a ${data.sent_count} destinatario(s) de Telegram.` });
            } else {
                setFeedback({
                    type: 'error',
                    text: `⚠️ No se pudo entregar: ${data.error || 'Verifica haber ingresado tu Chat ID numérico en la configuración.'}`
                });
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
            if (data.ok && data.sent_count > 0) {
                setFeedback({ type: 'success', text: `✅ Briefing matutino despachado a ${data.sent_count} destinatario(s).` });
            } else {
                setFeedback({ type: 'error', text: `⚠️ Error al enviar briefing: ${data.error || 'Verifica tu Chat ID'}` });
            }
        } catch (err: any) {
            setFeedback({ type: 'error', text: `❌ Error: ${err.message}` });
        } finally {
            setActionLoading(null);
        }
    };

    const handleRegisterCommands = async () => {
        setActionLoading('commands');
        setFeedback(null);
        try {
            const resp = await fetch(`${API_URL}/api/telegram/register-commands`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const data = await resp.json();
            if (data.ok) {
                setFeedback({ type: 'success', text: '✅ Menú táctil y comandos nativos (/briefing, /taller, /foto, /pdf) registrados en Telegram.' });
            } else {
                setFeedback({ type: 'error', text: `❌ Error: ${data.message || 'No se pudieron registrar'}` });
            }
        } catch (err: any) {
            setFeedback({ type: 'error', text: `❌ Fallo de red: ${err.message}` });
        } finally {
            setActionLoading(null);
        }
    };

    const canActivateWebhook = Boolean(status?.configured || botToken.trim());

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
                                <p className="card-main-text" style={{ color: '#f59e0b' }}>Falta Vincular Token</p>
                                <span className="card-subtext">Ingresá el token abajo o en variables de entorno</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="telegram-card">
                    <div className="card-header">
                        <span className="card-icon">👥</span>
                        <h4>Destinatarios Alertas</h4>
                    </div>
                    <div className="card-body">
                        <p className="card-main-text">{status?.admins_configured ?? status?.admins_count ?? 0} Chat(s)</p>
                        <span className="card-subtext">
                            {(status?.admins_configured ?? status?.admins_count ?? 0) > 0
                                ? 'Reciben alertas urgentes, VIP y briefings matutinos'
                                : 'Ingresá tu Chat ID para recibir alertas push'}
                        </span>
                    </div>
                </div>

                <div className="telegram-card">
                    <div className="card-header">
                        <span className="card-icon">⚡</span>
                        <h4>Servidor Webhook</h4>
                    </div>
                    <div className="card-body">
                        <p className="card-main-text" style={{ fontSize: '1rem', wordBreak: 'break-all' }}>luxius-backend.onrender.com</p>
                        <span className="card-subtext">Endpoint seguro HTTPS para recibir órdenes y audios de voz</span>
                    </div>
                </div>
            </div>

            {/* DIRECT CREDENTIALS CONFIGURATION BOX */}
            <div className="telegram-action-panel glass-panel" style={{ border: '1.5px solid var(--primary-color)' }}>
                <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa' }}>
                    <span>🔑</span> Configurar Credenciales del Bot (In-Situ)
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    Podés vincular tu bot directamente desde acá sin necesidad de entrar a la consola de Render.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '14px' }}>
                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Token HTTP de Telegram Bot:</span>
                            <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontSize: '0.78rem', textDecoration: 'none' }}>
                                Obtener con @BotFather ↗
                            </a>
                        </label>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                            <input
                                type={showToken ? 'text' : 'password'}
                                className="input-field"
                                placeholder={status?.configured ? '••••••••••••••••••••••••••••••••' : 'Ej: 7123456789:AAHxxxxxxxxxxxxxxxxxxxxxx'}
                                value={botToken}
                                onChange={(e) => setBotToken(e.target.value)}
                                style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                            />
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => setShowToken(!showToken)}
                                title={showToken ? 'Ocultar' : 'Mostrar'}
                                style={{ padding: '0 10px' }}
                            >
                                {showToken ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tu Chat ID Personal o Grupo:</span>
                            <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontSize: '0.78rem', textDecoration: 'none' }}>
                                Obtener con @userinfobot ↗
                            </a>
                        </label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Ej: 145678901 (o varios separados por coma)"
                            value={adminChatId}
                            onChange={(e) => setAdminChatId(e.target.value)}
                            style={{ width: '100%', marginTop: '4px', padding: '8px 12px', fontSize: '0.85rem' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSaveConfig(true)}
                        disabled={actionLoading === 'save'}
                    >
                        {actionLoading === 'save' ? 'Validando y Guardando...' : '💾 Guardar y Conectar Bot'}
                    </Button>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        Al presionar Guardar, se verifica el token contra Telegram y se activa el webhook automáticamente.
                    </span>
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
                            disabled={actionLoading === 'webhook'}
                            title={!canActivateWebhook ? 'Ingresá el Token arriba para activar' : 'Registrar webhook en Telegram'}
                        >
                            {actionLoading === 'webhook' ? 'Registrando...' : '🔗 Configurar Webhook en Telegram'}
                        </Button>
                    </div>

                    <div className="action-item">
                        <h5>2. Enviar Notificación de Prueba</h5>
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
                                disabled={actionLoading === 'test' || (!status?.configured && !botToken.trim())}
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
                            disabled={actionLoading === 'briefing' || (!status?.configured && !botToken.trim())}
                        >
                            {actionLoading === 'briefing' ? 'Generando...' : '☀️ Despachar Briefing'}
                        </Button>
                    </div>

                    <div className="action-item">
                        <h5>4. Menú Táctil & Comandos</h5>
                        <p>Sincroniza los comandos oficiales (/briefing, /taller, /foto, /pdf) y activa los botones para tu reloj y móvil.</p>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleRegisterCommands}
                            disabled={actionLoading === 'commands' || (!status?.configured && !botToken.trim())}
                        >
                            {actionLoading === 'commands' ? 'Sincronizando...' : '📱 Sincronizar Menú y Comandos'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* SETUP GUIDE */}
            <div className="telegram-guide glass-panel">
                <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📖</span> Instrucciones Paso a Paso (Solo toma 2 minutos)
                </h4>

                <div className="guide-steps">
                    <div className="step-card">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h5>Crear el Bot con @BotFather</h5>
                            <p>
                                Abrí Telegram y hacé clic en <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontWeight: 600 }}>@BotFather</a>. Enviá el comando <code>/newbot</code>, elegí un nombre (ej. <em>LuXius Taller</em>) y un alias (ej. <em>luxius_taller_bot</em>).
                            </p>
                            <div className="code-snippet">
                                <span>Ejemplo de Token: <code>7123456789:AAHxxxxxxxxxxxxxxxxxxxxxx</code></span>
                            </div>
                            <p style={{ marginTop: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                Copiá ese token y pegalo directamente en el casillero <strong>Token HTTP de Telegram Bot</strong> arriba, o cargalo en Render como variable <code>TELEGRAM_BOT_TOKEN</code>.
                            </p>
                        </div>
                    </div>

                    <div className="step-card">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h5>Obtener tu Chat ID (@userinfobot)</h5>
                            <p>
                                Abrí en Telegram <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontWeight: 600 }}>@userinfobot</a> y dale a <em>Iniciar</em>. Te devolverá tu número de identificación personal (ej. <code>145678901</code>).
                            </p>
                            <p style={{ marginTop: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                Pegalo en el casillero <strong>Tu Chat ID</strong> arriba. Así el bot sabrá a qué cuenta mandar las alertas urgentes de taller y el briefing matutino.
                            </p>
                        </div>
                    </div>

                    <div className="step-card">
                        <div className="step-number">3</div>
                        <div className="step-content">
                            <h5>Guardar y Activar Webhook</h5>
                            <p>
                                Hacé clic en <strong>💾 Guardar y Conectar Bot</strong> o en <strong>🔗 Configurar Webhook en Telegram</strong>. El sistema conectará los servidores de Telegram con tu servidor de producción de inmediato.
                            </p>
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
