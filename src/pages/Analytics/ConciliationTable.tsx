import { useState, useEffect } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { API_URL } from '@data/db';
import './ConciliationTable.css';

interface ReconciledItem {
    id: number;
    cliente: string;
    trabajo: string;
    material: string;
    teorico: { m2: number };
    real: {
        m2: number;
        totalInkMl: number;
        logsCount: number;
    };
    efficiency: {
        m2: number;
        inkRatio: number;
    };
    consumoEstimado: number;
    stockWarning: boolean;
    status: 'consolidated' | 'pending';
}

export default function ConciliationTable() {
    const [data, setData] = useState<ReconciledItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReconciliation = async () => {
        try {
            const ctrl = new AbortController();
            const id = setTimeout(() => ctrl.abort(), 6000);
            const res = await fetch(`${API_URL}/analytics/reconciliation`, { signal: ctrl.signal, cache: 'no-store' });
            clearTimeout(id);
            if (!res.ok) return;
            const result = await res.json();
            if (result && Array.isArray(result.reconciled)) {
                setData(result.reconciled);
            }
        } catch (err) {
            console.warn('Notice fetching reconciliation:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReconciliation();
    }, []);

    const getEfficiencyStatus = (ratio: number) => {
        if (!ratio || ratio === 0) return 'neutral';
        if (ratio >= 0.95 && ratio <= 1.15) return 'good';
        if (ratio < 0.95) return 'under';
        return 'waste';
    };

    if (loading) return <div className="loading-state">Calculando conciliación...</div>;

    return (
        <div className="conciliation-container">
            <div className="section-header">
                <h2>Cruce de Órdenes vs. RIP</h2>
                <p>Análisis de rentabilidad real basado en logs de producción.</p>
            </div>

            <div className="table-wrapper">
                <table className="conciliation-table">
                    <thead>
                        <tr>
                            <th>Orden</th>
                            <th>Cliente / Trabajo</th>
                            <th>M2 Teórico</th>
                            <th>M2 Vendido (estimado)</th>
                            <th>M2 Real (RIP)</th>
                            <th>Stock Status</th>
                            <th>Tinta Total</th>
                            <th>Eficiencia</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => {
                            const effM2 = Number(item.efficiency?.m2 ?? 0);
                            const m2Status = getEfficiencyStatus(effM2);
                            return (
                                <tr key={item.id} className={`status-${item.status || 'pending'}`}>
                                    <td className="col-id">#{item.id}</td>
                                    <td className="col-info">
                                        <div className="client-name">{item.cliente || 'Cliente'}</div>
                                        <div className="job-name">{item.trabajo || 'Trabajo'}</div>
                                    </td>
                                    <td>{(Number(item.teorico?.m2) || 0).toFixed(2)} m²</td>
                                    <td className="col-estimated">{(Number(item.consumoEstimado) || 0).toFixed(2)} m²</td>
                                    <td className={`col-real ${m2Status}`}>
                                        {item.status === 'consolidated' && item.real ? (
                                            <>
                                                {(Number(item.real.m2) || 0).toFixed(2)} m²
                                                <span className="badge">{item.real.logsCount || 0} logs</span>
                                            </>
                                        ) : (
                                            <span className="text-muted">Sin datos</span>
                                        )}
                                    </td>
                                    <td>
                                        {item.stockWarning ? (
                                            <div className="stock-warning-badge">
                                                ⚠ STOCK BAJO
                                            </div>
                                        ) : (
                                            <div className="stock-ok-badge">OK</div>
                                        )}
                                    </td>
                                    <td>
                                        {item.status === 'consolidated' && item.real ? (
                                            <div className="ink-info">
                                                {(Number(item.real.totalInkMl) || 0).toFixed(1)} ml
                                                <small className="ink-ratio">{(Number(item.efficiency?.inkRatio) || 0).toFixed(5)} L/m²</small>
                                            </div>
                                        ) : '—'}
                                    </td>
                                    <td>
                                        {item.status === 'consolidated' ? (
                                            <div className={`efficiency-indicator ${m2Status}`}>
                                                {(effM2 * 100).toFixed(0)}%
                                            </div>
                                        ) : '—'}
                                    </td>
                                    <td>
                                        {item.status === 'consolidated' ? (
                                            <div className="status-badge success">
                                                <CheckCircle size={14} /> Conciliado
                                            </div>
                                        ) : (
                                            <div className="status-badge warning">
                                                <Clock size={14} /> Pendiente
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                    No hay datos de conciliación registrados actualmente.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
