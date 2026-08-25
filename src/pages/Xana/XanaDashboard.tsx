import React, { useEffect, useState } from 'react';
import { getXanaTasks, getXanaDecisions, getXanaSessions, XanaTask, XanaDecision, XanaSession } from '@/data/db';
import './XanaDashboard.css';

const XanaDashboard: React.FC = () => {
    const [tasks, setTasks] = useState<XanaTask[]>([]);
    const [decisions, setDecisions] = useState<XanaDecision[]>([]);
    const [sessions, setSessions] = useState<XanaSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [t, d, s] = await Promise.all([
                    getXanaTasks(),
                    getXanaDecisions(),
                    getXanaSessions()
                ]);
                setTasks(t.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
                setDecisions(d.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
                setSessions(s.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()));
            } catch (err) {
                console.error("Error fetching Xana data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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
                <div className="xana-title-wrap">
                    <span className="xana-icon">🧠</span>
                    <h1>Memoria de Agente Xana</h1>
                </div>
                <p className="xana-subtitle">Registro en tiempo real de operaciones, memoria y decisiones arquitectónicas de la IA de Desarrollo.</p>
            </header>

            {loading ? (
                <div className="xana-loading">Cargando base de conocimiento...</div>
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

                    {/* SESIONES */}
                    <section className="xana-section glass-panel xana-full-width">
                        <h2><span className="section-icon">⚡</span> Registro de Sesiones</h2>
                        <div className="xana-table-container">
                            <table className="xana-table">
                                <thead>
                                    <tr>
                                        <th>Sesión ID</th>
                                        <th>Tarea Vinculada</th>
                                        <th>Agente / Modelo</th>
                                        <th>Inicio</th>
                                        <th>Cierre</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.length === 0 && (
                                        <tr><td colSpan={5} className="xana-empty">Sin sesiones registradas.</td></tr>
                                    )}
                                    {sessions.map(session => (
                                        <tr key={session.id}>
                                            <td className="xana-id-cell">{session.session_id}</td>
                                            <td>{session.task_id || '-'}</td>
                                            <td>
                                                <span className="xana-agent-badge">{session.agent}</span>
                                                <small className="xana-model">{session.model}</small>
                                            </td>
                                            <td>{new Date(session.started_at).toLocaleString()}</td>
                                            <td>{session.ended_at ? new Date(session.ended_at).toLocaleString() : <span className="status-warning">En curso</span>}</td>
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
