import { useState } from 'react'
import Modal from '@components/ui/Modal'
import { API_URL } from '@data/db'
import type { Order } from '@/types'
import { generatePdfBudget } from '@/utils/generatePdfBudget'
import './FileViewerModal.css'

interface FileViewerModalProps {
    isOpen: boolean
    onClose: () => void
    order: Order | null
    onUpdate?: () => void
    showStandardize?: boolean
}

export default function SharedFileViewerModal({
    isOpen,
    onClose,
    order,
    onUpdate,
    showStandardize = false
}: FileViewerModalProps) {
    const [renaming, setRenaming] = useState(false)

    if (!isOpen || !order) return null

    const isStandardized = (filename: string) => {
        if (!filename) return true
        return filename.startsWith('data:') || filename.startsWith(`${order.id}_`)
    }

    const handleStandardize = async () => {
        if (!onUpdate || !order || !order.archivos) return
        setRenaming(true)
        try {
            const { saveOrden } = await import('@data/db')
            const updatedArchivos = order.archivos.map((file, i) => {
                if (isStandardized(file)) return file
                const origName = order.archivosOriginales?.[i] || file
                const cleanName = origName.replace(/\s+/g, '_')
                return `${order.id}_${cleanName}`
            })

            await saveOrden({
                ...order,
                archivos: updatedArchivos
            })
            onUpdate()
        } catch (e) {
            console.error('Error al estandarizar nombres:', e)
            alert('Error al renombrar archivos.')
        } finally {
            setRenaming(false)
        }
    }

    const handlePrintPdf = () => {
        generatePdfBudget(order)
    }

    const allStandardized = order.archivos?.every(isStandardized)

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Visualizador de Archivos & Multimedia"
            size="lg"
            className="shared-file-viewer"
        >
            <div className="file-viewer-content">
                <div className="order-production-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div className="info-item">
                            <span className="label">Material</span>
                            <span className="value">{order.material || 'S/D'}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">Medidas</span>
                            <span className="value">
                                {Number(order.ancho || 0).toFixed(2)} x {Number(order.alto || 0).toFixed(2)} m
                            </span>
                        </div>
                        <div className="info-item">
                            <span className="label">Cantidad</span>
                            <span className="value">{order.copias || 1} Unidades</span>
                        </div>
                        <div className="info-item">
                            <span className="label">Cliente</span>
                            <span className="value">{order.clienteNombre || 'S/D'}</span>
                        </div>
                    </div>
                    <button
                        onClick={handlePrintPdf}
                        style={{
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.6rem 1.2rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        📄 Ver / Imprimir PDF Presupuesto
                    </button>
                </div>

                <div className="files-grid">
                    {(!order.archivos || order.archivos.length === 0) ? (
                        <div className="empty-files">
                            <span className="empty-icon">📂</span>
                            <p>No hay archivos adjuntos</p>
                        </div>
                    ) : (
                        order.archivos.map((file, i) => {
                            const isDataUrl = file.startsWith('data:')

                            const isImage = isDataUrl ? file.startsWith('data:image/') : !!file.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                            const isVideo = isDataUrl ? file.startsWith('data:video/') : !!file.match(/\.(mp4|webm|ogv|mov|avi)$/i)
                            const isPdf = isDataUrl ? file.startsWith('data:application/pdf') : !!file.match(/\.pdf$/i)
                            const isAudio = isDataUrl ? file.startsWith('data:audio/') : !!file.match(/\.(mp3|wav|ogg|m4a)$/i)
                            const baseUrl = API_URL.replace('/api', '')
                            const url = isDataUrl ? file : `${baseUrl}/uploads/${file}`
                            const originalName = order.archivosOriginales?.[i] || (isDataUrl ? `archivo_adjunto_${i + 1}` : file)
                            const standardized = isStandardized(file)

                            return (
                                <div key={i} className={`file-card ${standardized ? 'is-standard' : 'is-pending'}`}>
                                    <div className="file-preview-container" style={{ minHeight: isPdf ? '250px' : isVideo ? '200px' : 'auto' }}>
                                        {isImage ? (
                                            <img src={url} alt="preview" className="img-preview" />
                                        ) : isVideo ? (
                                            <div className="video-preview-box" style={{ width: '100%', padding: '4px' }}>
                                                <video controls src={url} style={{ width: '100%', maxHeight: '220px', borderRadius: '8px', background: '#000' }} playsInline></video>
                                            </div>
                                        ) : isPdf ? (
                                            <div className="pdf-preview-box" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <iframe src={url} title={`PDF ${originalName}`} style={{ width: '100%', height: '220px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', background: '#fff' }}></iframe>
                                            </div>
                                        ) : isAudio ? (
                                            <div className="audio-preview-box" style={{ padding: '8px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1.8rem' }}>🎙️</span>
                                                <audio controls src={url} style={{ width: '100%', height: '36px' }}></audio>
                                            </div>
                                        ) : order.imgMetadata?.thumbnailUrl ? (
                                            <img src={order.imgMetadata.thumbnailUrl} alt="preview" className="img-preview" />
                                        ) : (
                                            <div className="file-icon-placeholder Large">📄</div>
                                        )}
                                        {!standardized && (
                                            <div className="quick-warning" title="Nombre no estandarizado">⚠️</div>
                                        )}
                                    </div>
                                    <div className="file-info-container">
                                        <div className="name-wrapper">
                                            <span className="file-label">Archivo {i + 1}</span>
                                            <span className="file-name" title={originalName}>{originalName}</span>
                                            {order.imgMetadata && (
                                                <div className="tech-specs">
                                                    <span className="spec-badge dpi">{order.imgMetadata.dpi} DPI</span>
                                                    <span className="spec-badge mode">{order.imgMetadata.colorMode || 'RGB'}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="card-actions">
                                            <a
                                                href={url}
                                                download={originalName}
                                                className="btn-download-premium"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <span className="icon">📥</span>
                                                Descargar
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            <div className="modal-footer-shared">
                {showStandardize && !allStandardized && order.archivos && order.archivos.length > 0 && (
                    <button
                        className="btn-standardize"
                        onClick={handleStandardize}
                        disabled={renaming}
                    >
                        {renaming ? '...' : '⚡ Estandarizar Nombres'}
                    </button>
                )}
                <button className="btn-close-modal" onClick={onClose}>Cerrar</button>
            </div>
        </Modal>
    )
}
