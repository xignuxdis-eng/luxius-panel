import { useState } from 'react'
import Header from '@components/layout/Header'
import Button from '@components/ui/Button'
import { getOrdenes } from '@data/db'
import './Reportes.css'

export default function Reportes() {
    const [selectedReport, setSelectedReport] = useState('')
    const [reportData, setReportData] = useState<any[] | null>(null)
    const [loading, setLoading] = useState(false)

    const reportTypes = [
        { cat: 'Financiero', items: ['Movimientos de Caja', 'Encajes de Caja', 'Autorizaciones'] },
        { cat: 'Ventas', items: ['Facturación v.4', 'Pendientes de Entrega', 'Ventas por Material'] },
        { cat: 'Stock', items: ['Inventario Actual', 'Faltantes', 'Movimientos de Insumos'] },
        { cat: 'Producción', items: ['Reporte de Sala', 'Eficiencia por Máquina'] },
    ]

    const handleGenerate = async () => {
        try {
            setLoading(true)
            const allOrders = await getOrdenes()
            setReportData(allOrders.slice(0, 5)) // Just show top 5 as a preview
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="reportes-page page animate-fade-in">
            <Header title="Reportes" subtitle="Generador de informes y estadísticas" />

            <div className="report-generator-grid">
                <aside className="report-selector">
                    <h3>Seleccionar Reporte</h3>
                    <div className="report-list">
                        {reportTypes.map(group => (
                            <div key={group.cat} className="report-group">
                                <span className="group-label">{group.cat}</span>
                                {group.items.map(item => (
                                    <button
                                        key={item}
                                        className={`report-item ${selectedReport === item ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedReport(item)
                                            setReportData(null)
                                        }}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="report-config-panel">
                    {selectedReport ? (
                        <div className="config-form animate-fade-in">
                            <div className="config-header">
                                <h2>{selectedReport}</h2>
                                <p>Configure los parámetros del informe</p>
                            </div>

                            <div className="config-body">
                                <div className="config-grid">
                                    <div className="form-group">
                                        <label>Desde</label>
                                        <input type="date" className="input-field" defaultValue="2026-01-01" />
                                    </div>
                                    <div className="form-group">
                                        <label>Hasta</label>
                                        <input type="date" className="input-field" defaultValue="2026-01-27" />
                                    </div>
                                    <div className="form-group">
                                        <label>Formato</label>
                                        <select className="input-field">
                                            <option>Pantalla</option>
                                            <option>PDF</option>
                                            <option>Excel (CSV)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Sucursal</label>
                                        <select className="input-field">
                                            <option>Todas</option>
                                            <option>Principal</option>
                                        </select>
                                    </div>
                                </div>

                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '1rem' }}>Generando reporte...</div>
                                ) : reportData && (
                                    <div className="report-preview animate-scale-up">
                                        <h4>Vista Previa (Muestra)</h4>
                                        <table className="preview-table">
                                            <thead>
                                                <tr>
                                                    <th>OT</th>
                                                    <th>Cliente</th>
                                                    <th>Estado</th>
                                                    <th>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.map(order => (
                                                    <tr key={order.id}>
                                                        <td>{order.ot}</td>
                                                        <td>{order.clienteNombre}</td>
                                                        <td>{order.status}</td>
                                                        <td>${order.subtotal || 0}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="config-footer">
                                <Button variant="primary" size="lg" onClick={handleGenerate} disabled={loading}>
                                    {loading ? 'Procesando...' : 'Generar Informe'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="select-prompt">
                            <div className="prompt-icon">📊</div>
                            <p>Seleccione un tipo de reporte del menú lateral para comenzar</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
