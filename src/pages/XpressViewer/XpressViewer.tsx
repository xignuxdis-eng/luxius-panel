import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './XpressViewer.css';
import { API_URL } from '../../data/db';

export const XpressViewer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [metadata, setMetadata] = useState<any>(null);

    const processFile = async (uploadedFile: File) => {
        setIsProcessing(true);
        setFile(uploadedFile);

        try {
            const formData = new FormData();
            formData.append('file', uploadedFile);

            // Resuse the existing preview endpoint from LuXius Backend
            const res = await fetch(`${API_URL}/preview`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                
                // Assuming backend returns { url, width, height, format, dpi, etc }
                // For now we map what we have from the previous preview implementation
                if (data.url) {
                    const fullUrl = data.url.startsWith('http') ? data.url : `${API_URL.replace(/\/api\/?$/, '')}${data.url}`;
                    setPreviewUrl(fullUrl);
                }

                setMetadata({
                    name: uploadedFile.name,
                    size: (uploadedFile.size / 1024 / 1024).toFixed(2) + ' MB',
                    format: data.format || uploadedFile.name.split('.').pop()?.toUpperCase() || 'Desconocido',
                    width: data.width || 0,
                    height: data.height || 0,
                    dpi: data.dpi || 0,
                    colorMode: data.colorMode || 'Desconocido'
                });
            } else {
                console.error("Error processing preview");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            processFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
        onDrop,
        noClick: file !== null // Only allow click if no file is loaded (or add a separate upload button)
    });

    const handleClear = () => {
        setFile(null);
        setPreviewUrl(null);
        setMetadata(null);
    };

    return (
        <div className="xpress-container">
            {/* Viewport Area */}
            <div className="xpress-viewport" {...getRootProps()}>
                <input {...getInputProps()} />
                
                {!file ? (
                    <div className={`xpress-dropzone ${isDragActive ? 'active' : ''}`}>
                        <div className="xpress-dropzone-icon">☁️</div>
                        <p>Arrastra un archivo aquí o haz clic para explorar</p>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px' }}>
                            Soporta: CDR, AI, EPS, PDF, SVG, JPG, PNG, WEBP
                        </span>
                    </div>
                ) : (
                    <div className="xpress-preview-container">
                        {isProcessing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                <span style={{ color: '#94a3b8' }}>Extrayendo Fast Preview...</span>
                            </div>
                        ) : previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="xpress-preview-image" />
                        ) : (
                            <div style={{ color: '#ef4444' }}>
                                ⚠️ No se pudo generar una vista previa para este archivo.
                            </div>
                        )}
                        
                        <div className="xpress-toolbar">
                            <button className="xpress-tool-btn" title="Zoom In">🔍+</button>
                            <button className="xpress-tool-btn" title="Zoom Out">🔍-</button>
                            <button className="xpress-tool-btn" title="Pantalla Completa">⛶</button>
                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 8px' }}></div>
                            <button className="xpress-tool-btn" onClick={(e) => { e.stopPropagation(); handleClear(); }} title="Cerrar archivo">❌</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Metadata */}
            <div className="xpress-sidebar">
                <div className="xpress-sidebar-header">
                    <h2>👁️ Xpress Viewer</h2>
                </div>
                
                <div className="xpress-sidebar-content">
                    {metadata ? (
                        <>
                            <div className="xpress-card">
                                <h3>Información del Archivo</h3>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Archivo</span>
                                    <span className="xpress-meta-value" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={metadata.name}>
                                        {metadata.name}
                                    </span>
                                </div>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Formato</span>
                                    <span className="xpress-meta-value">
                                        <span className="xpress-badge">{metadata.format}</span>
                                    </span>
                                </div>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Peso</span>
                                    <span className="xpress-meta-value">{metadata.size}</span>
                                </div>
                            </div>

                            <div className="xpress-card">
                                <h3>Vista de Producción</h3>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Resolución</span>
                                    <span className="xpress-meta-value">
                                        {metadata.width} × {metadata.height} px
                                    </span>
                                </div>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">DPI</span>
                                    <span className="xpress-meta-value">
                                        {metadata.dpi > 0 ? metadata.dpi : 'N/A'}
                                    </span>
                                </div>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Color</span>
                                    <span className="xpress-meta-value">{metadata.colorMode}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '40px 20px' }}>
                            Abre un archivo para ver su metadata técnica.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default XpressViewer;
