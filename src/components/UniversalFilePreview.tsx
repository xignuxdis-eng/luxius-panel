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
        case 'cdr': return 'âœï¸'; // CorelDRAW
        case 'ai': return 'âœ’ï¸'; // Illustrator
        case 'eps': return 'ðŸ“'; // EPS
        case 'pdf': return 'ðŸ“„'; // PDF
        case 'svg': return 'ðŸŒ'; // SVG
        case 'tif':
        case 'tiff': return 'ðŸ–¼ï¸'; // TIFF
        case 'zip':
        case 'rar': return 'ðŸ—œï¸'; // Archive
        default: return 'ðŸ“'; // Generic
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
                // Attempt PDFJS page 1 rendering for AI & PDF
                (async () => {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        if (pdf.numPages > 0) {
                            const page = await pdf.getPage(1);
                            const viewport = page.getViewport({ scale: 0.5 });
                            const canvas = document.createElement('canvas');
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                await page.render({ canvasContext: ctx, viewport }).promise;
                                setImgSrc(canvas.toDataURL('image/webp', 0.85));
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
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                background: 'rgba(0, 0, 0, 0.45)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontSize: '18px',
                                transition: 'opacity 0.15s ease',
                                pointerEvents: 'none'
                            }}>
                                ðŸ”
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

