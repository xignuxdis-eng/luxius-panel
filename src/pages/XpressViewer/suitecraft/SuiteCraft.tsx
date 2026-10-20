import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, RefreshCw, X } from 'lucide-react';
import {
    CRAFT_TOOL_IDS,
    CraftToolId,
    SUITE_CRAFT_TOOLS,
    buildCraftToolUrl,
    toAbsoluteFileUrl,
} from './tools';
import './SuiteCraft.css';

export interface SuiteCraftProps {
    /** Archivo a abrir en el editor (URL absoluta, ruta relativa o blob). */
    initialFileUrl?: string | null;
    /** Nombre visible del archivo en la barra de control. */
    initialFileName?: string | null;
    /** Cierre del módulo completo (vuelve al visor de Xpress). */
    onClose?: () => void;
}

type ToolsRecord<T> = Record<CraftToolId, T>;

/**
 * Estación gráfica unificada: Photocraft (raster) + Vectorcraft (vectorial).
 *
 * Arquitectura "Lazy Mount + Keep-Alive": el iframe de una herramienta se crea
 * la primera vez que se la selecciona y NUNCA se desmonta después; la
 * alternancia sólo cambia `display`. Esto conserva el lienzo, el historial y
 * los archivos abiertos en memoria en lugar de destruir la sesión del editor
 * remoto cada vez que el operador cambia de herramienta.
 */
export const SuiteCraft: React.FC<SuiteCraftProps> = ({
    initialFileUrl,
    initialFileName,
    onClose,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const [activeTool, setActiveTool] = useState<CraftToolId>('photocraft');
    // Sólo Photocraft arranca montado; Vectorcraft se monta al primer uso.
    const [loadedTools, setLoadedTools] = useState<ToolsRecord<boolean>>({
        photocraft: true,
        vectorcraft: false,
    });
    const [readyTools, setReadyTools] = useState<ToolsRecord<boolean>>({
        photocraft: false,
        vectorcraft: false,
    });
    const [reloadKeys, setReloadKeys] = useState<ToolsRecord<number>>({
        photocraft: 0,
        vectorcraft: 0,
    });
    const [slowTools, setSlowTools] = useState<ToolsRecord<boolean>>({
        photocraft: false,
        vectorcraft: false,
    });
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    const absoluteFileUrl = useMemo(() => toAbsoluteFileUrl(initialFileUrl), [initialFileUrl]);
    const activeConfig = SUITE_CRAFT_TOOLS[activeTool];
    const activeUrl = useMemo(
        () => buildCraftToolUrl(activeConfig, absoluteFileUrl),
        [activeConfig, absoluteFileUrl],
    );

    const isReady = readyTools[activeTool];
    const activeReloadKey = reloadKeys[activeTool];

    // Espejo del estado de pantalla completa (también cuando se sale con Esc).
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === containerRef.current);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Si un editor tarda demasiado en responder, ofrecer la salida por pestaña.
    useEffect(() => {
        if (isReady) return;

        const toolId = activeTool;
        const timer = window.setTimeout(() => {
            setSlowTools((prev) => (prev[toolId] ? prev : { ...prev, [toolId]: true }));
        }, 12000);

        return () => window.clearTimeout(timer);
    }, [activeTool, isReady, activeReloadKey]);

    const selectTool = useCallback((toolId: CraftToolId) => {
        setActiveTool(toolId);
        setLoadedTools((prev) => (prev[toolId] ? prev : { ...prev, [toolId]: true }));
    }, []);

    const handleIframeLoad = useCallback((toolId: CraftToolId) => {
        setReadyTools((prev) => ({ ...prev, [toolId]: true }));
        setSlowTools((prev) => (prev[toolId] ? { ...prev, [toolId]: false } : prev));
    }, []);

    const handleReload = useCallback(() => {
        const toolId = activeTool;
        setReadyTools((prev) => ({ ...prev, [toolId]: false }));
        setSlowTools((prev) => ({ ...prev, [toolId]: false }));
        setReloadKeys((prev) => ({ ...prev, [toolId]: prev[toolId] + 1 }));
    }, [activeTool]);

    const handleOpenExternal = useCallback(() => {
        window.open(activeUrl, '_blank', 'noopener,noreferrer');
    }, [activeUrl]);

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
            console.warn('[SuiteCraft] Pantalla completa no disponible:', error);
        }
    }, []);

    return (
        <div
            ref={containerRef}
            className={`suitecraft-root ${isFullscreen ? 'is-fullscreen' : ''}`}
        >
            <header className="suitecraft-header">
                <div className="suitecraft-brand">
                    <span className="suitecraft-brand-mark" aria-hidden="true">🛠️</span>
                    <div className="suitecraft-brand-text">
                        <strong>SuiteCraft</strong>
                        <span>Estación gráfica · Luxius System</span>
                    </div>
                </div>

                <nav className="suitecraft-tool-switch" role="tablist" aria-label="Herramientas de SuiteCraft">
                    {CRAFT_TOOL_IDS.map((toolId) => {
                        const tool = SUITE_CRAFT_TOOLS[toolId];
                        const isActive = activeTool === toolId;

                        return (
                            <button
                                key={toolId}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                className={`suitecraft-tool-tab ${isActive ? 'active' : ''}`}
                                onClick={() => selectTool(toolId)}
                                title={`${tool.name} — ${tool.subtitle}`}
                            >
                                <span className="suitecraft-tool-emoji" aria-hidden="true">
                                    {toolId === 'photocraft' ? '🖼️' : '✒️'}
                                </span>
                                <span className="suitecraft-tool-label">
                                    <strong>{tool.name}</strong>
                                    <small>{tool.subtitle}</small>
                                </span>
                                <span className={`suitecraft-tool-badge badge-${toolId}`}>{tool.badge}</span>
                            </button>
                        );
                    })}
                </nav>

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
                        title={`Recargar ${activeConfig.name} (se pierde lo que no esté guardado)`}
                        aria-label={`Recargar ${activeConfig.name}`}
                    >
                        <RefreshCw size={15} />
                    </button>
                    <button
                        type="button"
                        className="suitecraft-icon-btn"
                        onClick={handleOpenExternal}
                        title={`Abrir ${activeConfig.name} en una pestaña nueva`}
                        aria-label={`Abrir ${activeConfig.name} en una pestaña nueva`}
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
                            title="Cerrar SuiteCraft"
                            aria-label="Cerrar SuiteCraft"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </header>

            <div className="suitecraft-stage">
                {CRAFT_TOOL_IDS.map((toolId) => {
                    if (!loadedTools[toolId]) return null;

                    const tool = SUITE_CRAFT_TOOLS[toolId];

                    return (
                        <iframe
                            key={`${toolId}-${reloadKeys[toolId]}`}
                            src={buildCraftToolUrl(tool, absoluteFileUrl)}
                            title={`${tool.name} — ${tool.subtitle}`}
                            onLoad={() => handleIframeLoad(toolId)}
                            className="suitecraft-frame"
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                display: activeTool === toolId ? 'block' : 'none',
                                backgroundColor: '#18181b',
                            }}
                            allow="clipboard-read; clipboard-write; fullscreen; accelerometer; autoplay; encrypted-media; gyroscope"
                            sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals"
                            allowFullScreen
                        />
                    );
                })}

                {!isReady && (
                    <div className="suitecraft-loading" role="status" aria-live="polite">
                        <div className="suitecraft-spinner" aria-hidden="true" />
                        <strong>Cargando {activeConfig.name}…</strong>
                        <span>{activeConfig.subtitle}</span>
                        {slowTools[activeTool] && (
                            <div className="suitecraft-loading-hint">
                                <p>El editor está tardando en responder. Verificá la conexión o abrilo en una pestaña nueva.</p>
                                <button type="button" onClick={handleOpenExternal}>
                                    Abrir {activeConfig.name} en pestaña nueva
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuiteCraft;
