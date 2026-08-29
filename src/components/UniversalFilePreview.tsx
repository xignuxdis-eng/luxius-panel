import React, { useState, useEffect } from 'react';
import { API_URL } from '../data/db';
import { extractCdrThumbnail } from '../utils/cdrPreview';
import { extractTiffThumbnail, extractEpsThumbnail, generateVectorCard } from '../utils/vectorPreview';
import { FilePreviewModal } from './FilePreviewModal';
import { XpressViewerModal } from './shared/XpressViewerModal';
import * as pdfjsLib from 'pdfjs-dist';

interface UniversalFilePreviewProps {
    fileUrl?: string; // URL on the backend, e.g. /uploads/12345_file.cdr or data:image/...
    fileName?: string; // Original filename, e.g. file.cdr
    file?: File; // Local file object if not yet uploaded
    className?: string;
    style?: React.CSSProperties;
    alt?: string;
    dimensions?: { width: number; height: number };
    dpi?: number;
    colorMode?: string;
    fileSize?: string;
    enableModal?: boolean;
}

const getExtension = (filename: string) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

const getFallbackIcon = (ext: string) => {
    switch (ext) {
        case 'cdr': return '🎨'; // CorelDRAW
        case 'ai': return '🎨'; // Illustrator
        case 'eps': return '📄'; // EPS
        case 'pdf': return '📄'; // PDF
        case 'svg': return '🖼️'; // SVG
        case 'tif':
        case 'tiff': return '🖼️'; // TIFF
        case 'zip':
        case 'rar': return '📦'; // Archive
        default: return '📄'; // Generic
    }
};

export const UniversalFilePreview: React.FC<UniversalFilePreviewProps> = ({ 
    fileUrl, 
    fileName, 
    file, 
    className, 
    style, 
    alt = "",
    dimensions,
    dpi,
    colorMode,
    fileSize,
    enableModal = true
}) => {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const ext = getExtension(fileName || file?.name || fileUrl || '');
    const displayName = fileName || file?.name || 'Archivo';

    useEffect(() => {
        setHasError(false);
        let objectUrl: string | null = null;

        // 1. Direct DataURL or pre-generated preview provided
        if (fileUrl && fileUrl.startsWith('data:image/')) {
            setImgSrc(fileUrl);
            return;
        }

        if (file) {
            // Local file mode (not uploaded yet)
            const fileExt = getExtension(file.name);

            if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(fileExt)) {
                objectUrl = URL.createObjectURL(file);
                setImgSrc(objectUrl);
            } else if (fileExt === 'cdr') {
                extractCdrThumbnail(file).then(thumbUrl => {
                    if (thumbUrl) {
                        setImgSrc(thumbUrl);
                    } else {
                        setImgSrc(generateVectorCard('CDR', file.name, dimensions, dpi));
                    }
                }).catch(() => {
                    setImgSrc(generateVectorCard('CDR', file.name, dimensions, dpi));
                });
            } else if (fileExt === 'tif' || fileExt === 'tiff') {
                extractTiffThumbnail(file).then(thumbUrl => {
                    if (thumbUrl) {
                        setImgSrc(thumbUrl);
                    } else if (fileUrl && fileUrl.startsWith('data:image/')) {
                        setImgSrc(fileUrl);
                    } else {
                        setImgSrc(null);
                    }
                }).catch(() => setImgSrc(null));
            } else if (fileExt === 'eps') {
                extractEpsThumbnail(file).then(thumbUrl => {
                    if (thumbUrl) {
                        setImgSrc(thumbUrl);
                    } else if (fileUrl && fileUrl.startsWith('data:image/')) {
                        setImgSrc(fileUrl);
                    } else {
                        // Generate vector blueprint card for ASCII EPS
                        setImgSrc(generateVectorCard('EPS', file.name, dimensions, dpi));
                    }
                }).catch(() => {
                    setImgSrc(generateVectorCard('EPS', file.name, dimensions, dpi));
                });
            } else if (fileExt === 'ai' || fileExt === 'pdf') {
                // Attempt high-definition PDFJS rendering for AI & PDF
                (async () => {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        if (pdf.numPages > 0) {
                            const page = await pdf.getPage(1);
                            const unscaled = page.getViewport({ scale: 1.0 });
                            const targetMax = 1200;
                            const scale = Math.max(1.5, Math.min(3.0, targetMax / Math.max(unscaled.width, unscaled.height)));
                            const viewport = page.getViewport({ scale });
                            const canvas = document.createElement('canvas');
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(0, 0, viewport.width, viewport.height);
                                await page.render({ canvasContext: ctx, viewport }).promise;
                                setImgSrc(canvas.toDataURL('image/webp', 0.92));
                                return;
                            }
                        }
                    } catch (e) {
                        // PDFJS failed (e.g. pure PostScript .ai)
                    }
                    setImgSrc(generateVectorCard(fileExt.toUpperCase(), file.name, dimensions, dpi));
                })();
            } else {
                setImgSrc(null); // Force fallback icon
            }
        } else if (fileUrl) {
            // Backend URL mode
            let cleanUrl = fileUrl;
            if (cleanUrl.startsWith(API_URL)) {
                cleanUrl = cleanUrl.replace(API_URL, '');
            }
            if (cleanUrl.startsWith('/uploads/')) {
                cleanUrl = cleanUrl.replace('/uploads/', '');
            } else if (cleanUrl.startsWith('uploads/')) {
                cleanUrl = cleanUrl.replace('uploads/', '');
            }
            
            // Construct preview endpoint URL
            setImgSrc(`${API_URL}/api/preview/${cleanUrl}`);
        } else {
            setImgSrc(null);
        }

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [fileUrl, file, dimensions?.width, dimensions?.height, dpi]);

    const handleOpenModal = (e: React.MouseEvent) => {
        if (enableModal) {
            e.stopPropagation();
            setIsModalOpen(true);
        }
    };

    return (
        <>
            <div 
                className={`universal-preview-wrapper ${className || ''}`}
                style={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: enableModal && imgSrc ? 'pointer' : 'default',
                    overflow: 'hidden',
                    ...style 
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleOpenModal}
                title={enableModal && imgSrc ? `Clic para ampliar ${displayName}` : displayName}
            >
                {!imgSrc || hasError ? (
                    <div className="universal-preview-fallback" style={{ 
                        width: '100%', 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        background: 'rgba(255, 255, 255, 0.03)', 
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '4px',
                        fontSize: '22px',
                        userSelect: 'none'
                    }}>
                        {getFallbackIcon(ext)}
                    </div>
                ) : (
                    <>
                        <img 
                            src={imgSrc} 
                            alt={alt || displayName} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={() => setHasError(true)}
                        />
                        {enableModal && isHovered && (
                            <div 
                                onClick={handleOpenModal}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(15, 23, 42, 0.65)',
                                    backdropFilter: 'blur(2px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    transition: 'all 0.15s ease',
                                    cursor: 'pointer',
                                    zIndex: 3
                                }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    <line x1="11" y1="8" x2="11" y2="14" />
                                    <line x1="8" y1="11" x2="14" y2="11" />
                                </svg>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Lightbox Modal */}
            {enableModal && isModalOpen && (
                <FilePreviewModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    imgSrc={imgSrc}
                    fileName={displayName}
                    format={ext.toUpperCase()}
                    dimensions={dimensions}
                    dpi={dpi}
                    colorMode={colorMode}
                    fileSize={fileSize}
                    downloadUrl={fileUrl || undefined}
                />
            )}
        </>
    );
};

