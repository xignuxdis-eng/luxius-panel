// src/pages/XpressViewer/subcomponents/UpscalerModal.tsx
import React from 'react';
import { Order } from '../../../types/orden';
import { UpscaledResult } from '../XpressViewer.types';

interface UpscalerModalProps {
    isOpen: boolean;
    onClose: () => void;
    isUpscaling: boolean;
    engineStatus: any;
    upscalerModel: 'realesrgan-x4plus' | 'realesrgan-x4plus-anime';
    setUpscalerModel: (model: 'realesrgan-x4plus' | 'realesrgan-x4plus-anime') => void;
    upscalerScale: 2 | 4;
    setUpscalerScale: (scale: 2 | 4) => void;
    previewUrl: string | null;
    file: File | null;
    handleRunUpscale: () => void;
    upscaleStatus: string;
    upscaledResult: UpscaledResult | null;
    upscaleError: string | null;
    upscalerSplitPos: number;
    setUpscalerSplitPos: (pos: number) => void;
    upscaleSaveFeedback: string | null;
    handleDownloadUpscaled: () => void;
    handleApplyUpscaleToViewer: () => void;
    order: Order | null;
    isSavingUpscale: boolean;
    handleSaveUpscaleToOrder: (replacePrimary: boolean) => void;
}

export const UpscalerModal: React.FC<UpscalerModalProps> = ({
    isOpen,
    onClose,
    isUpscaling,
    engineStatus,
    upscalerModel,
    setUpscalerModel,
    upscalerScale,
    setUpscalerScale,
    previewUrl,
    file,
    handleRunUpscale,
    upscaleStatus,
    upscaledResult,
    upscaleError,
    upscalerSplitPos,
    setUpscalerSplitPos,
    upscaleSaveFeedback,
    handleDownloadUpscaled,
    handleApplyUpscaleToViewer,
    order,
    isSavingUpscale,
    handleSaveUpscaleToOrder
}) => {
    if (!isOpen) return null;

    return (
        <div className="xpress-modal-overlay" onClick={() => !isUpscaling && onClose()}>
            <div className="xpress-upscaler-modal" onClick={(e) => e.stopPropagation()}>
                {/* Cabecera */}
                <div className="xpress-upscaler-header">
                    <div>
                        <h3 className="xpress-upscaler-title">
                            <span>✨</span>
                            <span>Super-Resolución IA (Real-ESRGAN)</span>
                        </h3>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                            Restaura detalles perdidos y genera píxeles faltantes mediante Redes Neuronales Profundas.
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div 
                            className="xpress-upscaler-badge-gpu"
                            style={{
                                background: engineStatus?.vulkan_available ? 'rgba(16, 185, 129, 0.18)' : 'rgba(56, 189, 248, 0.18)',
                                borderColor: engineStatus?.vulkan_available ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)',
                                color: engineStatus?.vulkan_available ? '#34d399' : '#38bdf8'
                            }}
                        >
                            <span>{engineStatus?.vulkan_available ? '⚡' : '☁️'}</span>
                            <span>{engineStatus?.vulkan_available ? 'Vulkan GPU (Radeon)' : (engineStatus?.engine_name || 'AI Engine')}</span>
                        </div>
                        <button
                            type="button"
                            disabled={isUpscaling}
                            onClick={onClose}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: isUpscaling ? 'not-allowed' : 'pointer' }}
                            title="Cerrar modal"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Selección de Modelo y Factor de Escala */}
                <div className="xpress-upscaler-grid-config">
                    {/* Tarjeta Modelo Fotografía */}
                    <div 
                        className={`xpress-model-card ${upscalerModel === 'realesrgan-x4plus' ? 'selected' : ''}`}
                        onClick={() => !isUpscaling && setUpscalerModel('realesrgan-x4plus')}
                    >
                        <div className="xpress-model-title">
                            <span>📸 Fotografía / Cartelería</span>
                            {upscalerModel === 'realesrgan-x4plus' && <span style={{ color: '#38bdf8', fontSize: '0.85rem' }}>✓ Seleccionado</span>}
                        </div>
                        <div className="xpress-model-desc">
                            Modelo general <strong>RealESRGAN_x4plus</strong>. Ideal para retratos, banners comerciales, gigantografías y fotos de catálogo.
                        </div>
                    </div>

                    {/* Tarjeta Modelo Anime / Vector / Logos */}
                    <div 
                        className={`xpress-model-card ${upscalerModel === 'realesrgan-x4plus-anime' ? 'selected' : ''}`}
                        onClick={() => !isUpscaling && setUpscalerModel('realesrgan-x4plus-anime')}
                    >
                        <div className="xpress-model-title">
                            <span>🎨 Logo / Tipografía / Calco</span>
                            {upscalerModel === 'realesrgan-x4plus-anime' && <span style={{ color: '#38bdf8', fontSize: '0.85rem' }}>✓ Seleccionado</span>}
                        </div>
                        <div className="xpress-model-desc">
                            Modelo <strong>RealESRGAN_x4plus_anime_6B</strong>. Elimina ruido sin agregar texturas orgánicas en logos, isotipos y textos nítidos.
                        </div>
                    </div>
                </div>

                {/* Selector de Escala y Botón de Ejecución */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Factor de Escala:</span>
                        <div className="xpress-scale-selector" style={{ padding: '4px 6px' }}>
                            <button
                                type="button"
                                disabled={isUpscaling}
                                className={`xpress-scale-pill ${upscalerScale === 2 ? 'selected' : ''}`}
                                onClick={() => setUpscalerScale(2)}
                            >
                                2x (Doble Px)
                            </button>
                            <button
                                type="button"
                                disabled={isUpscaling}
                                className={`xpress-scale-pill ${upscalerScale === 4 ? 'selected' : ''}`}
                                onClick={() => setUpscalerScale(4)}
                            >
                                4x (Ultra HD - Recomendado)
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={isUpscaling || (!previewUrl && !file)}
                        onClick={handleRunUpscale}
                        style={{
                            background: isUpscaling 
                                ? '#334155' 
                                : 'linear-gradient(135deg, #06b6d4 0%, #2563eb 50%, #7c3aed 100%)',
                            border: 'none',
                            color: '#fff',
                            padding: '10px 22px',
                            borderRadius: '10px',
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            cursor: (isUpscaling || (!previewUrl && !file)) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: isUpscaling ? 'none' : '0 4px 18px rgba(6, 182, 212, 0.4)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isUpscaling ? (
                            <>
                                <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                <span>{upscaleStatus || 'Procesando en GPU...'}</span>
                            </>
                        ) : (
                            <>
                                <span>🚀</span>
                                <span>{upscaledResult ? 'Volver a Procesar' : `Ejecutar Super-Resolución ${upscalerScale}x`}</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Mensaje de Error */}
                {upscaleError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚠️</span>
                        <span>{upscaleError}</span>
                    </div>
                )}

                {/* Área de Comparativa Before / After (Split Slider) */}
                {upscaledResult && (
                    <>
                        <div 
                            className="xpress-upscaler-comparison-container"
                            onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                                setUpscalerSplitPos(Math.round((x / rect.width) * 100));
                            }}
                            onTouchMove={(e) => {
                                if (e.touches.length > 0) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
                                    setUpscalerSplitPos(Math.round((x / rect.width) * 100));
                                }
                            }}
                        >
                            {/* Capa Izquierda: Original */}
                            <img 
                                src={upscaledResult.originalUrl} 
                                alt="Original" 
                                className="xpress-upscaler-layer"
                            />
                            <div className="xpress-upscaler-tag before">
                                <span>🔴 Original: {upscaledResult.originalDpi} DPI ({upscaledResult.originalDims.width}×{upscaledResult.originalDims.height}px)</span>
                            </div>

                            {/* Capa Derecha: Escalada IA recortada */}
                            <img 
                                src={upscaledResult.upscaledUrl} 
                                alt="Real-ESRGAN Escalada" 
                                className="xpress-upscaler-layer"
                                style={{
                                    clipPath: `polygon(${upscalerSplitPos}% 0, 100% 0, 100% 100%, ${upscalerSplitPos}% 100%)`
                                }}
                            />
                            <div className="xpress-upscaler-tag after">
                                <span>🟢 Real-ESRGAN {upscalerScale}x: {upscaledResult.targetDpi} DPI ({upscaledResult.upscaledDims.width}×{upscaledResult.upscaledDims.height}px)</span>
                            </div>

                            {/* Línea Divisoria del Split */}
                            <div 
                                className="xpress-upscaler-divider"
                                style={{ left: `${upscalerSplitPos}%` }}
                            >
                                <div className="xpress-upscaler-divider-handle">↔</div>
                            </div>
                        </div>

                        {/* Slider Horizontal de Control Preciso */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 4px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700 }}>◀ 100% Original</span>
                            <input 
                                type="range"
                                min={0}
                                max={100}
                                value={upscalerSplitPos}
                                onChange={(e) => setUpscalerSplitPos(Number(e.target.value))}
                                style={{ flex: 1, accentColor: '#38bdf8', cursor: 'ew-resize' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700 }}>100% Real-ESRGAN ▶</span>
                        </div>

                        {/* Barra de Métricas Técnicas */}
                        <div className="xpress-upscaler-metrics-bar">
                            <div className="xpress-metric-box">
                                <span className="xpress-metric-label">Matriz Inicial</span>
                                <span className="xpress-metric-value" style={{ color: '#cbd5e1' }}>
                                    {upscaledResult.originalDims.width} × {upscaledResult.originalDims.height} px
                                </span>
                            </div>
                            <div className="xpress-metric-box">
                                <span className="xpress-metric-label">Nueva Resolución</span>
                                <span className="xpress-metric-value" style={{ color: '#38bdf8' }}>
                                    {upscaledResult.upscaledDims.width} × {upscaledResult.upscaledDims.height} px
                                </span>
                            </div>
                            <div className="xpress-metric-box">
                                <span className="xpress-metric-label">Definición 1:1</span>
                                <span className="xpress-metric-value" style={{ color: upscaledResult.targetDpi >= 150 ? '#34d399' : '#f59e0b' }}>
                                    {upscaledResult.originalDpi} DPI ➔ {upscaledResult.targetDpi} DPI
                                </span>
                            </div>
                            <div className="xpress-metric-box">
                                <span className="xpress-metric-label">Aceleración</span>
                                <span className="xpress-metric-value" style={{ color: '#a78bfa', fontSize: '0.8rem' }}>
                                    ⚡ {upscaledResult.engine.includes('Vulkan') ? 'Vulkan GPU' : 'CPU'} ({(upscaledResult.elapsedMs / 1000).toFixed(1)}s)
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {/* Feedback de Guardado */}
                {upscaleSaveFeedback && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>
                        {upscaleSaveFeedback}
                    </div>
                )}

                {/* Botones de Acción */}
                <div className="xpress-upscaler-actions">
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#cbd5e1',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.84rem'
                        }}
                    >
                        Cerrar
                    </button>

                    {upscaledResult && (
                        <>
                            <button
                                type="button"
                                onClick={handleDownloadUpscaled}
                                style={{
                                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.84rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                                }}
                                title="Descargar archivo PNG en alta resolución"
                            >
                                <span>⬇️</span>
                                <span>Descargar PNG HD</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleApplyUpscaleToViewer}
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.84rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                                }}
                                title="Usar esta imagen HD en el visor actual"
                            >
                                <span>👁️</span>
                                <span>Aplicar al Visor</span>
                            </button>

                            {order && (
                                <>
                                    <button
                                        type="button"
                                        disabled={isSavingUpscale}
                                        onClick={() => handleSaveUpscaleToOrder(false)}
                                        style={{
                                            background: 'rgba(56, 189, 248, 0.15)',
                                            border: '1px solid rgba(56, 189, 248, 0.4)',
                                            color: '#38bdf8',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            cursor: isSavingUpscale ? 'not-allowed' : 'pointer',
                                            fontWeight: 700,
                                            fontSize: '0.84rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                        title="Guardar versión HD como archivo complementario"
                                    >
                                        <span>➕</span>
                                        <span>{isSavingUpscale ? 'Guardando...' : 'Guardar como Arte Secundario'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isSavingUpscale}
                                        onClick={() => handleSaveUpscaleToOrder(true)}
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            border: 'none',
                                            color: '#fff',
                                            padding: '8px 18px',
                                            borderRadius: '8px',
                                            cursor: isSavingUpscale ? 'not-allowed' : 'pointer',
                                            fontWeight: 800,
                                            fontSize: '0.84rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)'
                                        }}
                                        title="Reemplazar el arte original de la OT con esta versión escalada"
                                    >
                                        <span>💾</span>
                                        <span>{isSavingUpscale ? 'Guardando...' : `Reemplazar Arte en OT #${order.ot}`}</span>
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
