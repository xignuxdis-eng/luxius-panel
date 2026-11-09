import Button from '@components/ui/Button'

export default function TermsAndPrivacyView() {
    return (
        <div className="sistema-view" style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '3rem' }}>
            <div className="view-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
                        Términos de Servicio y Privacidad (Ley 25.326)
                    </h3>
                    <p className="text-muted" style={{ margin: '0.35rem 0 0 0', fontSize: '0.88rem' }}>
                        Marco regulatorio, protección de datos personales y condiciones operativas del Sistema LuXius ERP.
                    </p>
                </div>
                <div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.print()}
                    >
                        🖨️ Imprimir / Guardar PDF
                    </Button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Panel 1: Términos de Servicio SaaS */}
                <div style={{
                    background: 'var(--surface-color, #1e222d)',
                    border: '1px solid var(--border-color, #2d3343)',
                    borderRadius: '8px',
                    padding: '1.5rem'
                }}>
                    <h4 style={{ color: 'var(--primary-color, #4f8cff)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📜 1. Términos y Condiciones de Uso del Software SaaS
                    </h4>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#c9d1d9' }}>
                        El sistema <strong>LuXius ERP</strong> es una plataforma de gestión operativa, cotización técnica,
                        control de producción gráfica, nesting y facturación electrónica diseñada para talleres gráficos y de impresión digital.
                    </p>
                    <ul style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#8b949e', paddingLeft: '1.2rem' }}>
                        <li><strong>Licencia de Uso:</strong> Se concede al Taller licenciatario un derecho de uso no exclusivo, intransferible y revocable para operar sus procesos productivos internos y comerciales.</li>
                        <li><strong>Responsabilidad sobre Archivos Gráficos:</strong> El Taller y sus clientes son los únicos responsables por la legalidad, propiedad intelectual y derechos de autor de las imágenes, vectores y archivos cargados a la plataforma para su impresión.</li>
                        <li><strong>Disponibilidad y Resguardos:</strong> LuXius implementa respaldos automáticos cada 6 horas y alta disponibilidad mediante réplicas cifradas en la nube. No obstante, el licenciatario es responsable de mantener actualizados sus inventarios y respaldar comprobantes contables locales.</li>
                    </ul>
                </div>

                {/* Panel 2: Política de Protección de Datos Personales (Ley 25.326) */}
                <div style={{
                    background: 'var(--surface-color, #1e222d)',
                    border: '1px solid var(--border-color, #2d3343)',
                    borderRadius: '8px',
                    padding: '1.5rem'
                }}>
                    <h4 style={{ color: '#58a6ff', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🛡️ 2. Protección de Datos Personales (Ley 25.326 - República Argentina)
                    </h4>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#c9d1d9' }}>
                        En cumplimiento estricto con la <strong>Ley de Protección de Datos Personales N° 25.326</strong> y sus decretos reglamentarios:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <strong style={{ color: '#e6edf3', display: 'block', marginBottom: '0.3rem' }}>🎯 Finalidad del Tratamiento</strong>
                            <p style={{ margin: 0, fontSize: '0.84rem', color: '#8b949e', lineHeight: '1.5' }}>
                                Los datos de clientes (Nombre, CUIT/DNI, Email, Teléfono, Dirección) son recolectados exclusivamente para la confección de presupuestos, seguimiento de órdenes de trabajo, logística de entrega y emisión de comprobantes fiscales legales.
                            </p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <strong style={{ color: '#e6edf3', display: 'block', marginBottom: '0.3rem' }}>⚖️ Derechos ARCO</strong>
                            <p style={{ margin: 0, fontSize: '0.84rem', color: '#8b949e', lineHeight: '1.5' }}>
                                El titular de los datos tiene derecho a ejercer los derechos de <strong>Acceso, Rectificación, Actualización y Supresión</strong> (Art. 14 y 16 Ley 25.326). La Agencia de Acceso a la Información Pública (AAIP) es el Órgano de Control.
                            </p>
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', background: 'rgba(56, 139, 253, 0.1)', borderRadius: '6px', borderLeft: '4px solid #388bfd' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#79c0ff' }}>
                            <strong>Seguridad y Confidencialidad:</strong> Conforme al Art. 9 de la Ley 25.326, LuXius implementa Row Level Security (RLS) en la base de datos, aislamiento estricto de roles (RBAC) y registros de auditoría inmutables (<code>audit_logs</code>) que impiden accesos o alteraciones no autorizadas.
                        </p>
                    </div>
                </div>

                {/* Panel 3: Régimen de Facturación Electrónica ARCA/AFIP */}
                <div style={{
                    background: 'var(--surface-color, #1e222d)',
                    border: '1px solid var(--border-color, #2d3343)',
                    borderRadius: '8px',
                    padding: '1.5rem'
                }}>
                    <h4 style={{ color: '#3fb950', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🏛️ 3. Régimen Fiscal y Facturación Electrónica (ARCA / AFIP)
                    </h4>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#c9d1d9' }}>
                        La integración con los Web Services de la <strong>Agencia de Recaudación y Control Aduanero (ARCA/AFIP)</strong> opera bajo las normativas vigentes (RG 4291 y concordantes):
                    </p>
                    <ul style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#8b949e', paddingLeft: '1.2rem' }}>
                        <li><strong>Homologación y Producción:</strong> Los comprobantes emitidos en modo <em>HOMOLOGACION</em> son simulaciones técnicas de prueba sin validez fiscal ante terceros.</li>
                        <li><strong>Validez Fiscal:</strong> En modo <em>PRODUCCION</em>, cada comprobante obtiene un Código de Autorización Electrónico (CAE) unívoco, fecha de vencimiento fiscal y código QR oficial verificable en los servidores de ARCA/AFIP.</li>
                        <li><strong>Conservación de Comprobantes:</strong> El sistema almacena de forma inalterable los metadatos y números de comprobante para cumplir con los plazos legales de prescripción tributaria previstos en la Ley 11.683.</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
