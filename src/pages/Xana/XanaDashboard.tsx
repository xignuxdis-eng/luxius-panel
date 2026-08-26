import React, { useEffect, useState } from 'react';
import { 
    getXanaTasks, 
    getXanaDecisions, 
    getXanaSessions, 
    getXanaCommits, 
    getXanaPromptContext,
    XanaTask, 
    XanaDecision, 
    XanaSession,
    XanaCommit,
    XanaPromptContext
} from '@/data/db';
import { Copy, Check, GitCommit, Brain, Terminal, RefreshCw, Layers } from 'lucide-react';
import './XanaDashboard.css';

const XanaDashboard: React.FC = () => {
    const [tasks, setTasks] = useState<XanaTask[]>([]);
    const [decisions, setDecisions] = useState<XanaDecision[]>([]);
    const [sessions, setSessions] = useState<XanaSession[]>([]);
    const [commits, setCommits] = useState<XanaCommit[]>([]);
    const [promptContext, setPromptContext] = useState<XanaPromptContext | null>(null);
    const [copied, setCopied] = useState(false);
    const [showPromptModal, setShowPromptModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const [t, d, s, c, p] = await Promise.all([
                getXanaTasks(),
                getXanaDecisions(),
                getXanaSessions(),
                getXanaCommits(),
                getXanaPromptContext()
            ]);
            setTasks(t.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
            setDecisions(d.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            setSessions(s.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()));
            setCommits(c.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            setPromptContext(p);
        } catch (err) {
            console.error("Error fetching Xana data", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleCopyPrompt = () => {
        if (!promptContext?.prompt_markdown) return;
        navigator.clipboard.writeText(promptContext.prompt_markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'completed': return 'status-success';
            case 'in_progress':
            case 'partial': return 'status-warning';
            case 'failed': return 'status-danger';
            default: return 'status-default';
        }
    };

    return (
        <div className="xana-dashboard-container">
            <header className="xana-header">
                <div className="xana-header-main">
                    <div className="xana-title-wrap">
                        <span className="xana-icon">🧠</span>
                        <div>
                            <h1>Memoria de Agente Xana</h1>
                            <p className="xana-subtitle">Motor de contexto persistente, decisiones y sincronización Git en tiempo real.</p>
                        </div>
                    </div>
                    <div className="xana-header-actions">
                        <button 
                            className="xana-btn xana-btn-secondary" 
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
                            <span>{refreshing ? 'Sincronizando...' : 'Actualizar'}</span>
                        </button>
                        <button 
                            className="xana-btn xana-btn-primary" 
                            onClick={handleCopyPrompt}
                        >
                            {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                            <span>{copied ? '¡Prompt Copiado!' : 'Copiar Contexto IA (Fase 3)'}</span>
                        </button>
                    </div>
                </div>

                {/* Banner de Contexto Activo (Fase 3) */}
                {promptContext && (
                    <div className="xana-context-banner glass-panel">
                        <div className="context-banner-left">
                            <Brain size={24} className="banner-icon" />
                            <div>
                                <strong>Contexto Vivo Consolidado</strong>
                                <span>{promptContext.tasks_count} tareas activas • {promptContext.decisions_count} decisiones arquitectónicas • {promptContext.commits_count} commits vinculados</span>
                            </div>
                        </div>
                        <div className="context-banner-right">
                            <button 
                                className="xana-link-btn" 
                                onClick={() => setShowPromptModal(!showPromptModal)}
                            >
                                <Terminal size={14} />
                                {showPromptModal ? 'Ocultar Raw Prompt' : 'Ver Raw Prompt'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Visor desplegable del Prompt generado */}
                {showPromptModal && promptContext && (
                    <div className="xana-prompt-preview glass-panel">
                        <div className="prompt-preview-header">
                            <span>📄 Prompt de Inyección para cualquier LLM (Cursor / Claude / GPT / Antigravity)</span>
                            <button className="xana-copy-small" onClick={handleCopyPrompt}>
                                {copied ? 'Copiado' : 'Copiar'}
                            </button>
                        </div>
                        <pre className="prompt-content">{promptContext.prompt_markdown}</pre>
                    </div>
                )}
            </header>

            {loading ? (
                <div className="xana-loading">Sincronizando base de conocimiento de Xana...</div>
            ) : (
                <div className="xana-grid">
                    {/* TAREAS ACTIVAS */}
                    <section className="xana-section glass-panel">
                        <h2><span className="section-icon">🎯</span> Objetivos de la IA</h2>
                        <div className="xana-card-list">
                            {tasks.length === 0 && <p className="xana-empty">No hay objetivos registrados.</p>}
                            {tasks.map(task => (
                                <div key={task.id} className="xana-card">
                                    <div className="xana-card-header">
                                        <span className="xana-id">{task.task_id}</span>
                                        <span className={`xana-badge ${getStatusClass(task.status)}`}>{task.status.toUpperCase()}</span>
                                    </div>
                                    <div className="xana-card-body">
                                        <p>{task.objective}</p>
                                    </div>
                                    <div className="xana-card-footer">
                                        <small>Actualizado: {new Date(task.updated_at).toLocaleString()}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* DECISIONES */}
                    <section className="xana-section glass-panel">
                        <h2><span className="section-icon">⚖️</span> Decisiones Arquitectónicas</h2>
                        <div className="xana-card-list">
                            {decisions.length === 0 && <p className="xana-empty">No hay decisiones registradas.</p>}
                            {decisions.map(dec => (
                                <div key={dec.id} className="xana-card decision-card">
                                    <div className="xana-card-header">
                                        <span className="xana-topic">{dec.topic}</span>
                                        <span className="xana-id">{dec.decision_id}</span>
                                    </div>
                                    <div className="xana-card-body">
                                        <div className="xana-choice">
                                            <strong>✅ Elegido:</strong> {dec.choice}
                                        </div>
                                        {dec.alternatives_rejected && dec.alternatives_rejected.length > 0 && (
                                            <div className="xana-rejected">
                                                <strong>❌ Rechazado:</strong> {dec.alternatives_rejected.join(', ')}
                                            </div>
                                        )}
                                        {dec.reason && (
                                            <div className="xana-reason">
                                                <strong>💡 Motivo:</strong> {dec.reason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* COMMITS SINCRONIZADOS DE GIT (Fase 4) */}
                    <section className="xana-section glass-panel">
                        <h2><GitCommit size={20} className="section-icon" color="#38bdf8" /> Commits Sincronizados (Fase 4)</h2>
                        <div className="xana-card-list">
                            {commits.length === 0 && <p className="xana-empty">Sin commits vinculados aún.</p>}
                            {commits.map(commit => (
                                <div key={commit.id} className="xana-card commit-card">
                                    <div className="xana-card-header">
                                        <span className="xana-commit-hash">`{commit.commit_hash.slice(0, 7)}`</span>
                                        <span className="xana-branch-badge">{commit.branch}</span>
                                    </div>
                                    <div className="xana-card-body">
                                        <p className="xana-commit-msg">{commit.message}</p>
                                    </div>
                                    <div className="xana-card-footer">
                                        <small>{commit.author} • {new Date(commit.created_at).toLocaleString()}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* SESIONES */}
                    <section className="xana-section glass-panel">
                        <h2><span className="section-icon">⚡</span> Registro de Sesiones</h2>
                        <div className="xana-table-container">
                            <table className="xana-table">
                                <thead>
                                    <tr>
                                        <th>Sesión ID</th>
                                        <th>Agente / Modelo</th>
                                        <th>Inicio</th>
                                        <th>Cierre</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.length === 0 && (
                                        <tr><td colSpan={4} className="xana-empty">Sin sesiones registradas.</td></tr>
                                    )}
                                    {sessions.map(session => (
                                        <tr key={session.id}>
                                            <td className="xana-id-cell">{session.session_id}</td>
                                            <td>
                                                <span className="xana-agent-badge">{session.agent}</span>
                                                <small className="xana-model">{session.model}</small>
                                            </td>
                                            <td>{new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>{session.ended_at ? new Date(session.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="status-warning">En curso</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default XanaDashboard;
