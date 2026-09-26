import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, Upload } from 'lucide-react';
import { API_URL, getOrdenes } from '@data/db';
import type { Order } from '@/types';
import { parseRolandVersaWorksLog } from '@/utils/ripLogParser';
import { getRipLogs, saveRipLogs, reconcileRipLogs, type ReconciledItem } from '@/utils/ripLogReconcile';
import './ConciliationTable.css';

export default function ConciliationTable() {
    const [data, setData] = useState<ReconciledItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [logSummary, setLogSummary] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchReconciliation = async () => {
        try {
            const orders = await getOrdenes().catch(() => [] as Order[]);
            const logs = getRipLogs();

            if (logs.length > 0) {
                setData(reconcileRipLogs(orders, logs));
                return;
            }

            try {
                const ctrl = new AbortController();
                const id = setTimeout(() => ctrl.abort(), 6000);
                const res = await fetch(`${API_URL}/analytics/reconciliation`, { signal: ctrl.signal, cache: 'no-store' });
                clearTimeout(id);
                if (res.ok) {
                    const result = await res.json();
                    if (result && Array.isArray(result.reconciled) && result.reconciled.length > 0) {
                        setData(result.reconciled);
                        return;
                    }
                }
            } catch (_) {}

            setData(reconcileRipLogs(orders, []));
        } catch (err) {
            console.warn('Error fetching reconciliation:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReconciliation();
    }, []);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try {
            const text = await file.text();
            const logs = parseRolandVersaWorksLog(text);
            saveRipLogs(logs);
            const orders = await getOrdenes().catch(() => [] as Order[]);
            const items = reconcileRipLogs(orders, logs);
            setData(items);
            const matched = items.filter(i => i.matched).length;
            setLogSummary(`${logs.length} trabajos importados · ${matched} matcheados con órdenes`);
        } catch (err) {
            console.error('Error importing RIP log:', err);
            setLogSummary('Error al importar el log. Verificá que sea un archivo de Roland VersaWorks.');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getEfficiencyStatus = (ratio: number) => {
        if (!ratio || ratio === 0) return 'neutral';
        if (ratio >= 0.95 && ratio <= 1.15) return 'good';
        if (ratio < 0.95) return 'under';
        return 'waste';
    };

    if (loading) return <div className="loading-state">Calculando conciliación...</div>;

    return (
        <div className="conciliation-container">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                    <h2>Cruce de Órdenes vs. RIP</h2>
                    <p>Análisis de rentabilidad real basado en logs de producción.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".log,.xml,.txt,.csv"
                        onChange={handleImport}
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(37,99,235,0.5)',
                            background: '#2563eb',
                            color: '#fff',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            opacity: importing ? 0.6 : 1
                        }}
                        title="Importar log de impresora (Roland VersaWorks .log/.xml)"
                    >
                        <Upload size={15} />
                        {importing ? 'Importando...' : 'Importar Log RIP'}
                    </button>
                </div>
            </div>

            {logSummary && (
                <div style={{ marginBottom: '12px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.35)', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                    {logSummary}
                </div>
            )}

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
