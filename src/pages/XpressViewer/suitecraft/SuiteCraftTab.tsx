import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, RefreshCw, X } from 'lucide-react';
import {
    CraftToolId,
    SUITE_CRAFT_TOOLS,
    buildCraftToolUrl,
    toAbsoluteFileUrl,
} from './tools';
import './SuiteCraft.css';

export interface SuiteCraftTabProps {
    /** Identificador de la herramienta: 'photocraft' o 'vectorcraft'. */
    toolId: CraftToolId;
    /** Archivo a precargar (URL absoluta descargable por HTTP). */
    initialFileUrl?: string | null;
    /** Nombre del archivo de producción visible en la barra. */
    initialFileName?: string | null;
    /** Indica si esta pestaña es la actualmente seleccionada en XpressViewer. */
    isActive: boolean;
    /** Callback para volver al visor original de preimpresión. */
    onClose?: () => void;
}

/**
 * Pestaña individual de herramienta gráfica SuiteCraft (PhotoCraft o VectorCraft).
 *
 * Diseñada para integración directa en XpressViewer con preservación de estado
 * (Keep-Alive): el iframe se monta una única vez al primer acceso y permanece
 * activo en el DOM alternando `display: flex / none`. Esto evita perder trabajos
 * no guardados cuando el operario pasa momentáneamente al visor a consultar medidas.
 */
export const SuiteCraftTab: React.FC<SuiteCraftTabProps> = ({
    toolId,
    initialFileUrl,
    initialFileName,
    isActive,
    onClose,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState<boolean>(false);
    const [reloadKey, setReloadKey] = useState<number>(0);
    const [slowAlert, setSlowAlert] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    const tool = SUITE_CRAFT_TOOLS[toolId];
    const absoluteFileUrl = useMemo(() => toAbsoluteFileUrl(initialFileUrl), [initialFileUrl]);
    const finalUrl = useMemo(
        () => buildCraftToolUrl(tool, absoluteFileUrl),
        [tool, absoluteFileUrl],
    );

    // Detección nativa de pantalla completa
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === containerRef.current);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Alerta de carga demorada para conexiones lentas o WebAssembly pesado
    useEffect(() => {
        if (isReady) return;

        const timer = window.setTimeout(() => {
            setSlowAlert(true);
        }, 12000);

        return () => window.clearTimeout(timer);
    }, [isReady, reloadKey]);

    const handleIframeLoad = useCallback(() => {
        setIsReady(true);
        setSlowAlert(false);
    }, []);

    const handleReload = useCallback(() => {
        setIsReady(false);
        setSlowAlert(false);
        setReloadKey((k) => k + 1);
    }, []);

    const handleOpenExternal = useCallback(() => {
        window.open(finalUrl, '_blank', 'noopener,noreferrer');
    }, [finalUrl]);

    const toggleFullscreen = useCallback(async () => {
        const node = containerRef.current;
        if (!node) return;

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                return;
            }
            if (typeof node.requestFullscreen !== 'function') return;
            await node.requestFullscreen();
        } catch (error) {
            console.warn(`[SuiteCraft:${toolId}] Pantalla completa no disponible:`, error);
        }
    }, [toolId]);

    return (
        <div
            ref={containerRef}
            className={`suitecraft-root ${isFullscreen ? 'is-fullscreen' : ''}`}
            style={{ display: isActive ? 'flex' : 'none' }}
        >
            <header className="suitecraft-header">
                <div className="suitecraft-brand">
                    <span className="suitecraft-brand-mark" aria-hidden="true">
                        {toolId === 'photocraft' ? '🖼️' : '✒️'}
                    </span>
                    <div className="suitecraft-brand-text">
                        <strong>{tool.name}</strong>
                        <span>{tool.subtitle}</span>
                    </div>
                    <span className={`suitecraft-tool-badge badge-${toolId}`}>{tool.badge}</span>
                </div>

                <div className="suitecraft-controls">
                    {initialFileName && (
                        <span className="suitecraft-file-chip" title={initialFileName}>
                            📄 {initialFileName}
                        </span>
                    )}
                    <button
                        type="button"
                        className="suitecraft-icon-btn"
                        onClick={handleReload}
                        title={`Recargar lienzo de ${tool.name} (se pierden los cambios no exportados)`}
                        aria-label={`Recargar lienzo de ${tool.name}`}
                    >
                        <RefreshCw size={15} />
                    </button>
                    <button
                        type="button"
                        className="suitecraft-icon-btn"
                        onClick={handleOpenExternal}
                        title={`Abrir ${tool.name} en pestaña nueva`}
                        aria-label={`Abrir ${tool.name} en pestaña nueva`}
                    >
                        <ExternalLink size={15} />
                    </button>
                    <button
                        type="button"
                        className={`suitecraft-icon-btn ${isFullscreen ? 'active' : ''}`}
                        onClick={toggleFullscreen}
                        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                        aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    >
                        {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            className="suitecraft-icon-btn danger"
                            onClick={onClose}
                            title="Volver al Visor de Xpress"
                            aria-label="Volver al Visor de Xpress"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </header>

            <div className="suitecraft-stage">
                <iframe
                    key={`${toolId}-${reloadKey}`}
                    src={finalUrl}
                    title={`${tool.name} — ${tool.subtitle}`}
                    onLoad={handleIframeLoad}
                    className="suitecraft-frame"
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        backgroundColor: '#18181b',
                    }}
                    allow="clipboard-read; clipboard-write; fullscreen; accelerometer; autoplay; encrypted-media; gyroscope"
                    sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals"
                    allowFullScreen
                />

                {!isReady && (
                    <div className="suitecraft-loading" role="status" aria-live="polite">
                        <div className="suitecraft-spinner" aria-hidden="true" />
                        <strong>Cargando {tool.name}…</strong>
                        <span>{tool.subtitle}</span>
                        {slowAlert && (
                            <div className="suitecraft-loading-hint">
                                <p>El editor está tardando en iniciar WebAssembly. Podés esperar unos segundos o abrirlo en una pestaña nueva.</p>
                                <button type="button" onClick={handleOpenExternal}>
                                    Abrir {tool.name} en pestaña nueva
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuiteCraftTab;
