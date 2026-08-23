import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize, X, Download, FileText, Image as ImageIcon } from 'lucide-react';
import './FilePreviewModal.css';

export interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    imgSrc?: string | null;
    fileName?: string;
    format?: string;
    dimensions?: { width: number; height: number };
    dpi?: number;
    colorMode?: string;
    fileSize?: string;
    downloadUrl?: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
    isOpen,
    onClose,
    imgSrc,
    fileName = 'Archivo',
    format = '',
    dimensions,
    dpi,
    colorMode,
    fileSize,
    downloadUrl
}) => {
    const [zoom, setZoom] = useState<number>(1);
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);

    // Reset zoom and pan on open
    useEffect(() => {
        if (isOpen) {
            setZoom(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [isOpen, imgSrc]);

    if (!isOpen) return null;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoom > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            handleZoomIn();
        } else {
            handleZoomOut();
        }
    };

    const ext = format || (fileName.split('.').pop()?.toUpperCase() || 'FILE');

    return (
        <div className="preview-modal-overlay" onClick={onClose}>
            <div className="preview-modal-container" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="preview-modal-header">
                    <div className="preview-modal-title">
                        <span className="preview-file-icon">👁️</span>
                        <span className="preview-file-name" title={fileName}>{fileName}</span>
                        <span className="preview-format-badge">{ext}</span>
                    </div>

                    {/* Toolbar */}
                    <div className="preview-modal-toolbar">
                        <button type="button" onClick={handleZoomOut} title="Alejar (-)" className="tool-btn">
                            <ZoomOut size={16} />
                        </button>
                        <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
                        <button type="button" onClick={handleZoomIn} title="Acercar (+)" className="tool-btn">
                            <ZoomIn size={16} />
                        </button>
                        <button type="button" onClick={handleResetZoom} title="Restablecer" className="tool-btn">
                            <RotateCcw size={16} />
                        </button>
                        {downloadUrl && (
                            <a href={downloadUrl} download={fileName} target="_blank" rel="noreferrer" className="tool-btn" title="Descargar original">
                                <Download size={16} />
                            </a>
                        )}
                        <button type="button" onClick={onClose} title="Cerrar (Esc)" className="tool-btn close-btn">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Main Viewport */}
                <div 
                    className="preview-viewport" 
                    ref={containerRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                >
                    {imgSrc ? (
                        <div 
                            className="preview-image-wrapper"
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                            }}
                        >
                            <img src={imgSrc} alt={fileName} className="preview-image-element" draggable={false} />
                        </div>
                    ) : (
                        <div className="preview-no-image">
                            <FileText size={64} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                            <p>No hay previsualización gráfica disponible para este archivo.</p>
                            <span className="preview-hint">El archivo original permanece intacto para producción e impresión.</span>
                        </div>
                    )}
                </div>

                {/* Footer Technical Metadata */}
                <div className="preview-modal-footer">
                    <div className="preview-tech-details">
                        {dimensions && dimensions.width > 0 && (
                            <div className="tech-chip">
                                <strong>Medidas:</strong> {dimensions.width} × {dimensions.height} cm
                            </div>
                        )}
                        {dpi && dpi > 0 && (
                            <div className="tech-chip">
                                <strong>Resolución:</strong> {dpi} DPI
                            </div>
                        )}
                        {colorMode && (
                            <div className="tech-chip">
                                <strong>Modo Color:</strong> {colorMode}
                            </div>
                        )}
                        {fileSize && (
                            <div className="tech-chip">
                                <strong>Tamaño:</strong> {fileSize}
                            </div>
                        )}
                    </div>
                    <div className="preview-tip">
                        💡 <em>Arrastrá para mover y usá la rueda del mouse para hacer zoom</em>
                    </div>
                </div>
            </div>
        </div>
    );
};
