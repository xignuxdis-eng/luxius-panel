import { useState } from 'react'
import Modal from '@components/ui/Modal'
import { API_URL, getServicios } from '@data/db'
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

function buildProductionFilename(order: Order, index: number, originalName: string): string {
    const otNumber = order.ot || order.id || '0'
    const copias = order.copias || 1
    const materialCode = (order.material || 'MAT').trim()
    const calidad = (order.calidad || 'STD').trim()

    const serviceCodes: string[] = []
    if (order.servicios && typeof order.servicios === 'object') {
        try {
            const allServices = getServicios()
            Object.entries(order.servicios).forEach(([sId, active]) => {
                if (active) {
                    const s = allServices.find((serv) => String(serv.id) === String(sId))
                    if (s && s.codigo) {
                        serviceCodes.push(s.codigo)
                    }
                }
            })
        } catch (e) { }
    }

    const hasDimensionsRegex = /\d+[.,]?\d*\s*[xX]\s*\d+[.,]?\d*/
    const alreadyHasDimensions = hasDimensionsRegex.test(originalName)

    let dimString = ''
    if (!alreadyHasDimensions && order.ancho && order.alto) {
        dimString = `_${Number(order.ancho).toFixed(2)}x${Number(order.alto).toFixed(2)}`
    }

    const servicesStr = serviceCodes.length > 0 ? `_${serviceCodes.join('_')}` : ''
    const prefix = `OT-${otNumber}_x${copias}_${materialCode}_${calidad}${servicesStr}${dimString}`

    if (originalName.startsWith(`OT-${otNumber}`)) {
        return originalName
    }

    return `${prefix} --- ${originalName}`
}

export default function SharedFileViewerModal({
    isOpen,
    onClose,
    order,
    onUpdate,
    showStandardize = false
}: FileViewerModalProps) {
    const [renaming, setRenaming] = useState(false)
    const [downloading, setDownloading] = useState<string | null>(null)

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

    const downloadImageViaCanvas = (imageUrl: string, filename: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas')
                    canvas.width = img.naturalWidth || img.width
                    canvas.height = img.naturalHeight || img.height
                    const ctx = canvas.getContext('2d')
                    if (!ctx) return resolve(false)
                    ctx.drawImage(img, 0, 0)

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
                    const a = document.createElement('a')
                    a.href = dataUrl
                    a.download = filename
                    a.style.display = 'none'
                    document.body.appendChild(a)
                    a.click()
                    setTimeout(() => {
                        try { document.body.removeChild(a) } catch (e) { }
                    }, 300)
                    resolve(true)
                } catch (e) {
                    console.warn('[Canvas Download] Canvas conversion fallback error:', e)
                    resolve(false)
                }
            }
            img.onerror = () => resolve(false)
            img.src = imageUrl
        })
    }

    const forceDownload = async (url: string, filename: string) => {
        setDownloading(filename)
        try {
            const isImg = filename.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/i) || url.startsWith('data:image/')
            if (isImg) {
                const canvasSuccess = await downloadImageViaCanvas(url, filename)
                if (canvasSuccess) {
                    setDownloading(null)
                    return
                }
            }

            try {
                const response = await fetch(url, { mode: 'cors' })
                if (response.ok) {
                    const blob = await response.blob()
                    const blobUrl = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = blobUrl
                    a.download = filename
                    a.style.display = 'none'
                    document.body.appendChild(a)
                    a.click()
                    setTimeout(() => {
                        URL.revokeObjectURL(blobUrl)
                        document.body.removeChild(a)
                    }, 300)
                    setDownloading(null)
                    return
                }
            } catch (corsErr) {
                console.warn('[Download] Direct fetch CORS error, using proxy fallback', corsErr)
            }

            const proxyUrl = `${API_URL}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
            const proxyLink = document.createElement('a')
            proxyLink.href = proxyUrl
            proxyLink.download = filename
            document.body.appendChild(proxyLink)
            proxyLink.click()
            setTimeout(() => {
                try { document.body.removeChild(proxyLink) } catch (e) { }
            }, 300)
        } catch (err) {
            console.error('[Download] Error descargando archivo:', err)
            window.open(url, '_blank')
        } finally {
            setDownloading(null)
        }
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
                            const isAbsoluteUrl = file.startsWith('http://') || file.startsWith('https://')
                            const filePathOnly = isAbsoluteUrl ? file.split('?')[0] : file
                            const isImage = isDataUrl
                                ? file.startsWith('data:image/')
                                : !!filePathOnly.match(/\.(jpg|jpeg|png|gif|webp|tiff|tif|bmp)$/i)
                            const isVideo = isDataUrl ? file.startsWith('data:video/') : !!filePathOnly.match(/\.(mp4|webm|ogv|mov|avi)$/i)
                            const isPdf = isDataUrl ? file.startsWith('data:application/pdf') : !!filePathOnly.match(/\.pdf$/i)
                            const isAudio = isDataUrl ? file.startsWith('data:audio/') : !!filePathOnly.match(/\.(mp3|wav|ogg|m4a)$/i)
                            const baseUrl = API_URL.replace('/api', '')
                            const url = isDataUrl ? file : isAbsoluteUrl ? file : `${baseUrl}/uploads/${file}`
                            const originalName = order.archivosOriginales?.[i] || (isDataUrl ? `archivo_adjunto_${i + 1}` : file.split('/').pop()?.split('?')[0] || file)
                            const productionName = buildProductionFilename(order, i, originalName)
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
                                            <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontFamily: 'monospace', fontWeight: 600, marginTop: '3px', display: 'block', wordBreak: 'break-all' }}>
                                                🏷️ Nombre Producción: {productionName}
                                            </span>
                                            {order.imgMetadata && (
                                                <div className="tech-specs">
                                                    <span className="spec-badge dpi">{order.imgMetadata.dpi} DPI</span>
                                                    <span className="spec-badge mode">{order.imgMetadata.colorMode || 'RGB'}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="card-actions">
                                            <button
                                                type="button"
                                                className="btn-download-premium"
                                                disabled={downloading === productionName}
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    forceDownload(url, productionName)
                                                }}
                                                style={{
                                                    cursor: downloading === productionName ? 'wait' : 'pointer',
                                                    opacity: downloading === productionName ? 0.7 : 1
                                                }}
                                            >
                                                <span className="icon">{downloading === productionName ? '⏳' : '📥'}</span>
                                                {downloading === productionName ? 'Descargando...' : 'Descargar'}
                                            </button>
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
