import React, { useState, useEffect } from 'react';
import { API_URL } from '../data/db';
import { extractCdrThumbnail } from '../utils/cdrPreview';

interface UniversalFilePreviewProps {
    fileUrl?: string; // URL on the backend, e.g. /uploads/12345_file.cdr
    fileName?: string; // Original filename, e.g. file.cdr
    file?: File; // Local file object if not yet uploaded
    className?: string;
    style?: React.CSSProperties;
    alt?: string;
}

const getExtension = (filename: string) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

const getFallbackIcon = (ext: string) => {
    switch (ext) {
        case 'cdr': return '✏️'; // CorelDRAW
        case 'ai': return '✒️'; // Illustrator
        case 'eps': return '📐'; // EPS
        case 'pdf': return '📄'; // PDF
        case 'svg': return '🌐'; // SVG
        case 'zip':
        case 'rar': return '🗜️'; // Archive
        default: return '📁'; // Generic
    }
};

export const UniversalFilePreview: React.FC<UniversalFilePreviewProps> = ({ fileUrl, fileName, file, className, style, alt = "" }) => {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
        let objectUrl: string | null = null;

        if (file) {
            // Local file mode (not uploaded yet)
            const ext = getExtension(file.name);
            if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) {
                objectUrl = URL.createObjectURL(file);
                setImgSrc(objectUrl);
            } else if (ext === 'cdr') {
                extractCdrThumbnail(file).then(thumbUrl => {
                    if (thumbUrl) {
                        setImgSrc(thumbUrl);
                    } else {
                        setImgSrc(null);
                    }
                }).catch(() => setImgSrc(null));
            } else {
                setImgSrc(null); // Force fallback icon
            }
        } else if (fileUrl) {
            // Backend URL mode
            // We expect fileUrl to look like "/uploads/filename.ext" or similar.
            // We want to hit "/api/preview/<filename>"
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
    }, [fileUrl, file]);

    const ext = getExtension(fileName || file?.name || fileUrl || '');
    
    if (!imgSrc || hasError) {
        // Fallback state
        return (
            <div className={`universal-preview-fallback ${className || ''}`} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: 'var(--bg-card)', 
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                fontSize: '24px',
                ...style 
            }}>
                {getFallbackIcon(ext)}
            </div>
        );
    }

    return (
        <img 
            src={imgSrc} 
            alt={alt || fileName || "File preview"} 
            className={className} 
            style={{ objectFit: 'contain', ...style }}
            onError={() => setHasError(true)}
        />
    );
};
