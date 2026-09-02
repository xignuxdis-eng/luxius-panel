import { useState } from 'react'
import Modal from '@components/ui/Modal'
import { UniversalFilePreview } from '@components/UniversalFilePreview'
import { API_URL, getServicios, getMateriales, getCalidades, resolveMediaUrl, getAuthHeaders } from '@data/db'
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
    let otRaw = String(order.ot || order.id || '0').trim()
    if (otRaw.toUpperCase().startsWith('OT-')) {
        otRaw = otRaw.slice(3).trim()
    } else if (otRaw.toUpperCase().startsWith('OT')) {
        otRaw = otRaw.slice(2).trim()
    }
    const otNumber = otRaw || '0'
    const copias = order.copias || 1
    
    // 1. Resolve short material CODE
    let rawMat = (order.material || 'MAT').trim()
    let materialCode = rawMat
    try {
        const allMaterials = getMateriales()
        const foundMat = allMaterials.find(m => 
            (m.codigo && m.codigo.toLowerCase() === rawMat.toLowerCase()) ||
            (m.descripcion && m.descripcion.toLowerCase() === rawMat.toLowerCase())
        )
        if (foundMat && foundMat.codigo) {
            materialCode = foundMat.codigo.trim()
        }
    } catch (e) { }
    materialCode = materialCode.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '')

    // 2. Resolve short service CODES
    const serviceCodes: string[] = []
    if (order.servicios && typeof order.servicios === 'object') {
        try {
            const allServices = getServicios()
            Object.entries(order.servicios).forEach(([sId, active]) => {
                if (active) {
                    const s = allServices.find((serv) => 
                        String(serv.id) === String(sId) ||
                        (serv.codigo && serv.codigo.toLowerCase() === String(sId).toLowerCase()) ||
                        (serv.nombre && serv.nombre.toLowerCase() === String(sId).toLowerCase())
                    )
                    if (s && s.codigo) {
                        serviceCodes.push(s.codigo.trim().replace(/[^a-zA-Z0-9_-]/g, ''))
                    } else if (s && s.nombre) {
                        serviceCodes.push(s.nombre.substring(0, 4).toUpperCase().trim().replace(/[^a-zA-Z0-9_-]/g, ''))
                    } else if (typeof sId === 'string' && isNaN(Number(sId))) {
                        serviceCodes.push(sId.substring(0, 4).toUpperCase().trim().replace(/[^a-zA-Z0-9_-]/g, ''))
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
    const prefix = `OT-${otNumber}_x${copias}_${materialCode}${servicesStr}${dimString}`

    if (originalName.startsWith(`OT-${otNumber}`) || originalName.startsWith('OT-')) {
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

    const forceDownload = async (rawUrl: string, filename: string) => {
        setDownloading(filename)
        const url = resolveMediaUrl(rawUrl)
        try {
            if (url.startsWith('data:')) {
                const a = document.createElement('a')
                a.href = url
                a.download = filename
                a.style.display = 'none'
                document.body.appendChild(a)
                a.click()
                setTimeout(() => {
                    try { document.body.removeChild(a) } catch (e) { }
                }, 300)
                setDownloading(null)
                return
            }

            // Detect R2/S3 presigned URLs or any external storage URL
            const isExternalStorage = url.includes('r2.cloudflarestorage.com') ||
                url.includes('s3.amazonaws.com') ||
                url.includes('.r2.dev') ||
                (url.includes('X-Amz-Signature') && url.includes('X-Amz-Credential'))

            const token = localStorage.getItem('luxius_auth_token') || ''
            const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''

            if (isExternalStorage) {
                // For R2/S3 presigned URLs, use server proxy (direct fetch fails due to CORS)
                console.log('[Download] R2/S3 URL detected, using server proxy...')
                const proxyUrl = `${API_URL}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}${tokenParam}`
                try {
                    const proxyResp = await fetch(proxyUrl, { headers: getAuthHeaders() })
                    if (proxyResp.ok) {
                        const blob = await proxyResp.blob()
                        const blobUrl = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = blobUrl
                        a.download = filename
                        a.style.display = 'none'
                        document.body.appendChild(a)
                        a.click()
                        setTimeout(() => {
                            URL.revokeObjectURL(blobUrl)
                            try { document.body.removeChild(a) } catch (e) { }
                        }, 500)
                        setDownloading(null)
                        return
                    }
                    // If proxy fetch failed, try window.open as last resort
                    console.warn('[Download] Proxy fetch failed, opening in new tab...')
                    window.open(proxyUrl, '_blank')
                    setDownloading(null)
                    return
                } catch (proxyErr) {
                    console.warn('[Download] Proxy fetch error, opening in new tab:', proxyErr)
                    window.open(proxyUrl, '_blank')
                    setDownloading(null)
                    return
                }
            }

            // For local/simple URLs, try direct fetch first
            const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() })
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
                    try { document.body.removeChild(a) } catch (e) { }
                }, 500)
                setDownloading(null)
                return
            }
            throw new Error(`HTTP ${response.status}`)
        } catch (err) {
            console.warn('[Download] Direct fetch failed, trying canvas fallback:', err)
            const canvasSuccess = await downloadImageViaCanvas(url, filename)
            if (canvasSuccess) {
                setDownloading(null)
                return
            }
            // Proxy endpoint as ultimate fallback
            const token = localStorage.getItem('luxius_auth_token') || ''
            const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
            const proxyUrl = `${API_URL}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}${tokenParam}`
            window.open(proxyUrl, '_blank')
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
                            const url = resolveMediaUrl(file)
                            const isDataUrl = url.startsWith('data:')
                            const cleanPath = url.split('?')[0]
                            const isImage = isDataUrl
                                ? url.startsWith('data:image/')
                                : !!cleanPath.match(/\.(jpg|jpeg|png|gif|webp|tiff|tif|bmp|svg)$/i)
                            const isVideo = isDataUrl ? url.startsWith('data:video/') : !!cleanPath.match(/\.(mp4|webm|ogv|mov|avi)$/i)
                            const isPdf = isDataUrl ? url.startsWith('data:application/pdf') : !!cleanPath.match(/\.pdf$/i)
                            const isAudio = isDataUrl ? url.startsWith('data:audio/') : !!cleanPath.match(/\.(mp3|wav|ogg|m4a)$/i)

                            const originalName = order.archivosOriginales?.[i] || (isDataUrl ? `archivo_adjunto_${i + 1}` : file.split('/').pop()?.split('?')[0] || file)
                            const productionName = buildProductionFilename(order, i, originalName)
                            const standardized = isStandardized(file)

                            return (
                                <div key={i} className={`file-card ${standardized ? 'is-standard' : 'is-pending'}`}>
                                    <div className="file-preview-container" style={{ minHeight: isPdf ? '250px' : isVideo ? '200px' : 'auto' }}>
                                        {isImage ? (
                                            <img
                                                src={url}
                                                alt={originalName}
                                                className="img-preview"
                                                onError={(e) => {
                                                    console.warn('[Image Error] Fallback thumbnail or card:', url)
                                                    if (order.imgMetadata?.thumbnailUrl && e.currentTarget.src !== order.imgMetadata.thumbnailUrl) {
                                                        e.currentTarget.src = order.imgMetadata.thumbnailUrl
                                                    } else {
                                                        // Ocultar imagen rota y mostrar card universal
                                                        e.currentTarget.style.display = 'none'
                                                        const parent = e.currentTarget.parentElement
                                                        if (parent && !parent.querySelector('.universal-preview-fallback')) {
                                                            const fallbackDiv = document.createElement('div')
                                                            fallbackDiv.className = 'universal-preview-fallback'
                                                            fallbackDiv.style.padding = '20px'
                                                            fallbackDiv.style.textAlign = 'center'
                                                            fallbackDiv.innerHTML = `<div style="font-size: 2.5rem; margin-bottom: 8px;">🖼️</div><div style="font-size: 0.85rem; color: #94a3b8; word-break: break-all;">${originalName}</div>`
                                                            parent.appendChild(fallbackDiv)
                                                        }
                                                    }
                                                }}
                                            />
                                        ) : isVideo ? (
                                            <div className="video-preview-box" style={{ width: '100%', padding: '4px' }}>
                                                <video controls src={url} style={{ width: '100%', maxHeight: '220px', borderRadius: '8px', background: '#000' }} playsInline></video>
                                            </div>
                                        ) : isAudio ? (
                                            <div className="audio-preview-box" style={{ padding: '8px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1.8rem' }}>🎙️</span>
                                                <audio controls src={url} style={{ width: '100%', height: '36px' }}></audio>
                                            </div>
                                        ) : (
                                            <UniversalFilePreview
                                                fileUrl={url}
                                                fileName={originalName}
                                                dimensions={order.ancho && order.alto ? { width: Number(order.ancho) * 100, height: Number(order.alto) * 100 } : undefined}
                                                dpi={order.imgMetadata?.dpi}
                                                colorMode={order.imgMetadata?.colorMode}
                                                style={{ minHeight: '180px', maxHeight: '250px' }}
                                            />
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
