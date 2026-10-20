// src/pages/XpressViewer/XpressViewer.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './XpressViewer.css';
import { resolveMediaUrl } from '../../data/db';
import { Order } from '../../types/orden';
import { RedrawerStudio } from './RedrawerStudio';
import { PrintSheeterStudio } from './printsheeter/PrintSheeterStudio';
import { SuiteCraftTab } from './suitecraft/SuiteCraftTab';
import { toAbsoluteFileUrl } from './suitecraft/tools';
import { PrepressInspectorTab } from './subcomponents/PrepressInspectorTab';
import { XpressViewerTab, XpressViewerProps } from './XpressViewer.types';

export type {
    XpressViewerTab,
    XpressViewerProps,
    ToolMode,
    Point,
    ColorSwatch,
    BleedSides,
    UpscaledResult,
    PrepressInspectorProps
} from './XpressViewer.types';

export const XpressViewer: React.FC<XpressViewerProps> = ({
    initialFileUrl,
    initialFile,
    initialFileName,
    initialOrderId,
    onClose
}) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const initialTab: XpressViewerTab =
        tabParam === 'redrawer' ? 'redrawer'
        : (tabParam === 'printsheeter' || tabParam === 'mosaic') ? 'printsheeter'
        : tabParam === 'vectorcraft' ? 'vectorcraft'
        : (tabParam === 'photocraft' || tabParam === 'suitecraft' || tabParam === 'gimpstudio' || tabParam === 'editor') ? 'photocraft'
        : 'viewer';

    const [activeTab, setActiveTab] = useState<XpressViewerTab>(initialTab);
    const [hasMountedPhotocraft, setHasMountedPhotocraft] = useState<boolean>(initialTab === 'photocraft');
    const [hasMountedVectorcraft, setHasMountedVectorcraft] = useState<boolean>(initialTab === 'vectorcraft');

    const [order, setOrder] = useState<Order | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<any>(null);

    useEffect(() => {
        const p = searchParams.get('tab');
        if (p === 'redrawer') setActiveTab('redrawer');
        else if (p === 'printsheeter' || p === 'mosaic') setActiveTab('printsheeter');
        else if (p === 'vectorcraft') setActiveTab('vectorcraft');
        else if (p === 'photocraft' || p === 'suitecraft' || p === 'gimpstudio' || p === 'editor') setActiveTab('photocraft');
        else if (!p && activeTab !== 'viewer') setActiveTab('viewer');
    }, [searchParams, activeTab]);

    useEffect(() => {
        if (activeTab === 'photocraft' && !hasMountedPhotocraft) {
            setHasMountedPhotocraft(true);
        } else if (activeTab === 'vectorcraft' && !hasMountedVectorcraft) {
            setHasMountedVectorcraft(true);
        }
    }, [activeTab, hasMountedPhotocraft, hasMountedVectorcraft]);

    const handleTabChange = (newTab: XpressViewerTab) => {
        setActiveTab(newTab);
        const newParams = new URLSearchParams(searchParams);
        if (newTab === 'viewer') {
            newParams.delete('tab');
        } else {
            newParams.set('tab', newTab);
        }
        setSearchParams(newParams);
    };

    const paramFileUrl = searchParams.get('fileUrl') || searchParams.get('url') || initialFileUrl;
    const paramFileName = searchParams.get('fileName') || searchParams.get('name') || initialFileName;

    const suiteCraftFileUrl = useMemo(() => {
        const candidates = [paramFileUrl, order?.archivos?.[0], previewUrl];
        for (const candidate of candidates) {
            if (!candidate || /^(blob|data):/i.test(candidate)) continue;
            const absolute = toAbsoluteFileUrl(resolveMediaUrl(candidate));
            if (absolute) return absolute;
        }
        return null;
    }, [paramFileUrl, order, previewUrl]);

    return (
        <div className="xpress-container">
            {/* Header de Navegación de Xpress */}
            <div className="xpress-header-nav">
                <div className="xpress-nav-brand">
                    <span className="xpress-brand-icon">👁️</span>
                    <span className="xpress-brand-title">Xpress Studio</span>
                </div>

                <div className="xpress-nav-tabs">
                    <button 
                        type="button"
                        className={`xpress-nav-tab ${activeTab === 'viewer' ? 'active' : ''}`}
                        onClick={() => handleTabChange('viewer')}
                    >
                        👁️ Visor & Medición
                    </button>
                    <button 
                        type="button"
                        className={`xpress-nav-tab ${activeTab === 'redrawer' ? 'active' : ''}`}
                        onClick={() => handleTabChange('redrawer')}
                    >
                        ✏️ Redrawer & Vectorizador
                        <span className="xpress-tab-pill">VECTOR</span>
                    </button>
                    <button 
                        type="button"
                        className={`xpress-nav-tab ${activeTab === 'printsheeter' ? 'active' : ''}`}
                        onClick={() => handleTabChange('printsheeter')}
                    >
                        🧩 Mosaicos & Nesting HD
                        <span className="xpress-tab-pill" style={{ background: '#0284c7', color: '#fff' }}>PRINT SHEETER</span>
                    </button>
                    <button 
                        type="button"
                        className={`xpress-nav-tab ${activeTab === 'photocraft' ? 'active' : ''}`}
                        onClick={() => handleTabChange('photocraft')}
                        title="PhotoCraft — Editor ráster y retoque de imágenes (Storytold)"
                    >
                        🖼️ PhotoCraft
                        <span className="xpress-tab-pill" style={{ background: '#db2777', color: '#fff' }}>RÁSTER</span>
                    </button>
                    <button 
                        type="button"
                        className={`xpress-nav-tab ${activeTab === 'vectorcraft' ? 'active' : ''}`}
                        onClick={() => handleTabChange('vectorcraft')}
                        title="VectorCraft — Editor vectorial, curvas Bézier y SVG (Storytold)"
                    >
                        ✒️ VectorCraft
                        <span className="xpress-tab-pill" style={{ background: '#0891b2', color: '#fff' }}>VECTOR</span>
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {order && (
                        <span style={{ fontSize: '0.78rem', background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }} title={`Orden #${order.ot} - ${order.clienteNombre}`}>
                            OT #{order.ot}
                        </span>
                    )}
                    {file && (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                            📄 {file.name}
                        </span>
                    )}
                    <button 
                        type="button"
                        onClick={onClose ? onClose : () => navigate(-1)}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px' }}
                        title={onClose ? "Cerrar modal" : "Volver"}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Pestañas de SuiteCraft (PhotoCraft + VectorCraft) con Lazy Mount + Keep-Alive */}
            {hasMountedPhotocraft && (
                <SuiteCraftTab
                    toolId="photocraft"
                    initialFileUrl={suiteCraftFileUrl}
                    initialFileName={file?.name || paramFileName || metadata?.name || null}
                    isActive={activeTab === 'photocraft'}
                    onClose={() => {
                        if (onClose) {
                            onClose();
                        } else {
                            handleTabChange('viewer');
                        }
                    }}
                />
            )}
            {hasMountedVectorcraft && (
                <SuiteCraftTab
                    toolId="vectorcraft"
                    initialFileUrl={suiteCraftFileUrl}
                    initialFileName={file?.name || paramFileName || metadata?.name || null}
                    isActive={activeTab === 'vectorcraft'}
                    onClose={() => {
                        if (onClose) {
                            onClose();
                        } else {
                            handleTabChange('viewer');
                        }
                    }}
                />
            )}

            {activeTab === 'redrawer' ? (
                <RedrawerStudio 
                    initialImageUrl={previewUrl ?? undefined}
                    initialFileName={file?.name ? file.name.replace(/\.[^/.]+$/, '') : (metadata?.name ? metadata.name.replace(/\.[^/.]+$/, '') : 'archivo')}
                    order={order}
                    onOrderUpdated={(savedOrder) => {
                        setOrder(savedOrder);
                    }}
                    onSendToViewer={(svgUrl, newFileName) => {
                        setPreviewUrl(svgUrl);
                        setMetadata({
                            name: newFileName || 'vector_redrawer.svg',
                            format: 'SVG',
                            size: 'Vectorizado',
                            width: 1200,
                            height: 1200,
                            dpi: 300,
                            colorMode: 'Vector SVG (Redrawer)',
                            source: 'Redrawer Studio'
                        });
                        handleTabChange('viewer');
                    }}
                    onClose={onClose}
                />
            ) : activeTab === 'printsheeter' ? (
                <PrintSheeterStudio 
                    initialImageUrl={previewUrl ?? undefined}
                    initialFileName={file?.name ? file.name.replace(/\.[^/.]+$/, '') : (metadata?.name ? metadata.name.replace(/\.[^/.]+$/, '') : 'diseno')}
                    order={order}
                    onSendToViewer={(composedUrl, newFileName) => {
                        setPreviewUrl(composedUrl);
                        setMetadata({
                            name: newFileName || 'mosaico_printsheeter.jpg',
                            format: 'JPG',
                            size: 'Composición HD',
                            width: 2400,
                            height: 2400,
                            dpi: 300,
                            colorMode: 'RGB (PrintSheeter)',
                            source: 'PrintSheeter Studio'
                        });
                        handleTabChange('viewer');
                    }}
                    onClose={onClose}
                />
            ) : activeTab === 'photocraft' || activeTab === 'vectorcraft' ? null : (
                <PrepressInspectorTab
                    file={file}
                    setFile={setFile}
                    previewUrl={previewUrl}
                    setPreviewUrl={setPreviewUrl}
                    metadata={metadata}
                    setMetadata={setMetadata}
                    order={order}
                    setOrder={setOrder}
                    initialFileUrl={initialFileUrl}
                    initialFile={initialFile}
                    initialFileName={initialFileName}
                    initialOrderId={initialOrderId}
                    onClose={onClose}
                    onNavigateTab={handleTabChange}
                />
            )}
        </div>
    );
};

export default XpressViewer;
