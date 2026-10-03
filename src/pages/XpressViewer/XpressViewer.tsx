import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import './XpressViewer.css';
import { API_URL, getOrdenById, saveOrden, resolveMediaUrl } from '../../data/db';
import { Order } from '../../types/orden';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import JSZip from 'jszip';
import { extractTiffThumbnail, extractEpsThumbnail, generateVectorCard } from '../../utils/vectorPreview';
import { extractCdrThumbnail } from '../../utils/cdrPreview';
import { RedrawerStudio } from './RedrawerStudio';

try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    }
} catch (e) {
    console.warn("[Luxius-PDF] Error configurando PDF worker:", e);
}

type ToolMode = 'none' | 'measure' | 'bleed' | 'pan';
type Point = { x: number, y: number };

type ColorSwatch = {
    hex: string;
    rgb: [number, number, number];
    cmyk: { c: number, m: number, y: number, k: number };
    count: number;
};

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
};

const rgbToCmyk = (r: number, g: number, b: number) => {
    let c = 1 - (r / 255);
    let m = 1 - (g / 255);
    let y = 1 - (b / 255);
    let k = Math.min(c, Math.min(m, y));
    
    if (k === 1) {
        return { c: 0, m: 0, y: 0, k: 100 };
    }
    
    c = (c - k) / (1 - k);
    m = (m - k) / (1 - k);
    y = (y - k) / (1 - k);
    
    return { 
        c: Math.round(c * 100), 
        m: Math.round(m * 100), 
        y: Math.round(y * 100), 
        k: Math.round(k * 100) 
    };
};

export interface XpressViewerProps {
    initialFileUrl?: string;
    initialFile?: File;
    initialFileName?: string;
    initialOrderId?: number;
    onClose?: () => void;
}

export const XpressViewer: React.FC<XpressViewerProps> = ({ initialFileUrl, initialFile, initialFileName, initialOrderId, onClose }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') === 'redrawer' ? 'redrawer' : 'viewer';
    const [activeTab, setActiveTab] = useState<'viewer' | 'redrawer'>(initialTab);

    // Orden Vinculada (Fase 3 & 5)
    const orderIdParam = searchParams.get('orderId') || (initialOrderId ? String(initialOrderId) : null);
    const [order, setOrder] = useState<Order | null>(null);
    const [loadingOrder, setLoadingOrder] = useState<boolean>(false);

    // Medidas Objetivo de Producción (en metros)
    const [targetWidthMeters, setTargetWidthMeters] = useState<number>(1.0);
    const [targetHeightMeters, setTargetHeightMeters] = useState<number>(1.0);

    // Calibrador de Demasías y Sangrado
    const [bleedCm, setBleedCm] = useState<number>(2.0);
    const [bleedSides, setBleedSides] = useState<{ top: boolean; bottom: boolean; left: boolean; right: boolean }>({
        top: true,
        bottom: true,
        left: true,
        right: true
    });
    const [safetyMarginCm, setSafetyMarginCm] = useState<number>(1.0);
    const [bleedSavedFeedback, setBleedSavedFeedback] = useState<string | null>(null);

    // Simulación de Virado Solvente (CMYK)
    const [simulateSolvent, setSimulateSolvent] = useState<boolean>(false);

    // Barra de Aprobación Técnica y Rebote (Fase 5)
    const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
    const [rejectReason, setRejectReason] = useState<string>('');
    const [isUpdatingOrder, setIsUpdatingOrder] = useState<boolean>(false);
    const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [metadata, setMetadata] = useState<any>(null);
    const [statusText, setStatusText] = useState<string>('');

    // Herramientas Interactivas
    const [toolMode, setToolMode] = useState<ToolMode>('none');
    const [measureStart, setMeasureStart] = useState<Point | null>(null);
    const [measureEnd, setMeasureEnd] = useState<Point | null>(null);
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [imageScale, setImageScale] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    
    // Config
    const assumedDpi = 300;

    // Multipage PDF Navigation State
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);

    const imageRef = useRef<HTMLImageElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const handleClear = () => {
        setFile(null);
        setPreviewUrl(null);
        setMetadata(null);
        setPdfDoc(null);
        setCurrentPage(1);
        setTotalPages(1);
        setIsRenderingPage(false);
        setToolMode('none');
        setMeasureStart(null);
        setMeasureEnd(null);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('fileUrl');
        newParams.delete('fileName');
        newParams.delete('url');
        newParams.delete('name');
        setSearchParams(newParams);
    };

    const goToPage = async (pageNumber: number) => {
        if (!pdfDoc || isRenderingPage) return;
        const targetPage = Math.max(1, Math.min(pageNumber, totalPages));
        if (targetPage === currentPage && previewUrl) return;

        setIsRenderingPage(true);
        setStatusText(`Renderizando página ${targetPage} de ${totalPages}...`);
        try {
            const page = await pdfDoc.getPage(targetPage);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context!, viewport, canvas } as any).promise;
            const newPreview = canvas.toDataURL('image/webp', 0.9);

            setPreviewUrl(newPreview);
            setCurrentPage(targetPage);
            setMetadata((prev: any) => ({
                ...prev,
                currentPage: targetPage,
                width: Math.round(viewport.width),
                height: Math.round(viewport.height),
                colors: undefined
            }));
        } catch (err) {
            console.error('Error cambiando de página en PDF:', err);
        } finally {
            setIsRenderingPage(false);
        }
    };

    // Keyboard navigation for multipage documents
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!pdfDoc || totalPages <= 1) return;
            if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                goToPage(currentPage - 1);
            } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                goToPage(currentPage + 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pdfDoc, currentPage, totalPages, isRenderingPage]);

    const paramFileUrl = searchParams.get('fileUrl') || searchParams.get('url') || initialFileUrl;
    const paramFileName = searchParams.get('fileName') || searchParams.get('name') || initialFileName;

    React.useEffect(() => {
        if (initialFile) {
            processFile(initialFile);
        } else if (paramFileUrl) {
            const fetchFile = async () => {
                setIsProcessing(true);
                setStatusText('Descargando archivo original para inspección...');
                try {
                    const res = await fetch(paramFileUrl);
                    const blob = await res.blob();
                    const fileName = paramFileName || paramFileUrl.split('/').pop()?.split('?')[0] || 'archivo_remoto';
                    const newFile = new File([blob], fileName, { type: blob.type });
                    processFile(newFile);
                } catch (e) {
                    console.error('Error fetching initial file', e);
                    setStatusText('Error descargando archivo');
                    setIsProcessing(false);
                }
            };
            fetchFile();
        }
    }, [paramFileUrl, initialFile, paramFileName]);

    // Carga de Contexto de Orden (Fase 3 & 5)
    useEffect(() => {
        if (!orderIdParam) return;
        const numId = Number(orderIdParam);
        if (isNaN(numId)) return;

        setLoadingOrder(true);
        getOrdenById(numId)
            .then((ord) => {
                if (ord) {
                    setOrder(ord);
                    if (ord.ancho && ord.ancho > 0) setTargetWidthMeters(ord.ancho);
                    if (ord.alto && ord.alto > 0) setTargetHeightMeters(ord.alto);
                    if (ord.demasias && ord.demasias > 0) setBleedCm(ord.demasias);
                    if (ord.demasiasConfig) {
                        setBleedSides({
                            top: !!ord.demasiasConfig.top,
                            bottom: !!ord.demasiasConfig.bottom,
                            left: !!ord.demasiasConfig.left,
                            right: !!ord.demasiasConfig.right,
                        });
                    }
                    if (ord.archivos && ord.archivos.length > 0 && !paramFileUrl && !initialFile) {
                        const first = ord.archivos[0];
                        const fullUrl = resolveMediaUrl(first);
                        const firstName = ord.archivosOriginales?.[0] || first.split('/').pop()?.split('?')[0] || 'arte';
                        fetch(fullUrl)
                            .then(res => res.blob())
                            .then(blob => {
                                const f = new File([blob], firstName, { type: blob.type });
                                processFile(f);
                            })
                            .catch(err => {
                                console.warn('[XpressViewer] Error cargando archivo de orden:', err);
                                setPreviewUrl(fullUrl);
                                setMetadata({
                                    name: firstName,
                                    format: firstName.split('.').pop()?.toUpperCase() || 'IMG',
                                    size: 'Adjunto OT',
                                    width: 1200,
                                    height: 1200,
                                    dpi: 150,
                                    colorMode: 'RGB (Web)',
                                    source: 'OT File Auto-Load'
                                });
                            });
                    }
                }
            })
            .catch((err) => console.warn('[XpressViewer] Error cargando orden:', err))
            .finally(() => setLoadingOrder(false));
    }, [orderIdParam]);

    // Cálculo Matemático de DPI a Escala 1:1
    const calculatedDpi = useMemo(() => {
        if (!metadata?.width || targetWidthMeters <= 0) {
            return metadata?.dpi && metadata.dpi > 0 ? metadata.dpi : assumedDpi;
        }
        // 1 metro = 39.3700787 pulgadas
        const inchesW = targetWidthMeters * 39.3700787;
        const dpi = Math.round(metadata.width / inchesW);
        return dpi > 0 ? dpi : assumedDpi;
    }, [metadata?.width, metadata?.dpi, targetWidthMeters, assumedDpi]);

    // Semáforo de Calidad Técnica de Impresión
    const dpiTier = useMemo(() => {
        if (calculatedDpi >= 150) {
            return {
                tier: 'optimal' as const,
                label: 'Óptimo (>150 DPI)',
                badgeClass: 'optimal',
                color: '#10b981',
                icon: '🟢',
                desc: 'Excelente definición. Apto para vinilo de corte, calcomanías y visualización cercana (<1m).'
            };
        } else if (calculatedDpi >= 72) {
            return {
                tier: 'acceptable' as const,
                label: 'Aceptable (72-150 DPI)',
                badgeClass: 'acceptable',
                color: '#f59e0b',
                icon: '🟡',
                desc: 'Apto para gigantografías, lonas front/back y vía pública vista a media/larga distancia (>2m).'
            };
        } else {
            return {
                tier: 'critical' as const,
                label: 'Crítico (<72 DPI)',
                badgeClass: 'critical',
                color: '#ef4444',
                icon: '🔴',
                desc: 'Riesgo severo de pixelado visible. Se recomienda vectorizar en curvas con Redrawer Studio o solicitar arte en alta resolución.'
            };
        }
    }, [calculatedDpi]);

    // Guardar Demasías en la Orden
    const handleSaveBleedToOrder = async () => {
        if (!order) return;
        setIsUpdatingOrder(true);
        try {
            const updated: Order = {
                ...order,
                demasias: bleedCm,
                demasiasConfig: {
                    top: bleedSides.top,
                    bottom: bleedSides.bottom,
                    left: bleedSides.left,
                    right: bleedSides.right,
                },
                updatedAt: new Date().toISOString()
            };
            await saveOrden(updated);
            setOrder(updated);
            setBleedSavedFeedback(`¡Demasía de ${bleedCm} cm guardada en OT #${order.ot}!`);
            setTimeout(() => setBleedSavedFeedback(null), 3500);
        } catch (err) {
            console.error('[XpressViewer] Error guardando demasías:', err);
        } finally {
            setIsUpdatingOrder(false);
        }
    };

    // Aprobación Técnica y Envío a Impresión (Fase 5)
    const handleApprovePreflight = async () => {
        if (!order) return;
        setIsUpdatingOrder(true);
        try {
            const note = `[Preimpresión Aprobada en Xpress Studio el ${new Date().toLocaleDateString()} - DPI: ${calculatedDpi}, Demasía: ${bleedCm}cm]`;
            const updated: Order = {
                ...order,
                status: 'orden',
                demasias: bleedCm,
                demasiasConfig: {
                    top: bleedSides.top,
                    bottom: bleedSides.bottom,
                    left: bleedSides.left,
                    right: bleedSides.right,
                },
                observaciones: order.observaciones ? `${order.observaciones}\n${note}` : note,
                updatedAt: new Date().toISOString()
            };
            await saveOrden(updated);
            setOrder(updated);
            setActionSuccessMessage(`✅ ¡OT #${order.ot} aprobada técnicamente y enviada a Impresión!`);
            setTimeout(() => setActionSuccessMessage(null), 4000);
        } catch (err) {
            console.error('[XpressViewer] Error aprobando orden:', err);
        } finally {
            setIsUpdatingOrder(false);
        }
    };

    // Rechazo Técnico / Rebote al Vendedor (Fase 5)
    const handleConfirmReject = async () => {
        if (!order || !rejectReason.trim()) return;
        setIsUpdatingOrder(true);
        try {
            const note = `[REBOTE TÉCNICO en Xpress Studio el ${new Date().toLocaleDateString()}]: ${rejectReason.trim()}`;
            const updated: Order = {
                ...order,
                status: 'rebotado',
                observaciones: order.observaciones ? `${order.observaciones}\n${note}` : note,
                updatedAt: new Date().toISOString()
            };
            await saveOrden(updated);
            setOrder(updated);
            setShowRejectModal(false);
            setRejectReason('');
            setActionSuccessMessage(`↩️ OT #${order.ot} marcada como REBOTADA con reporte técnico.`);
            setTimeout(() => setActionSuccessMessage(null), 4000);
        } catch (err) {
            console.error('[XpressViewer] Error rebotando orden:', err);
        } finally {
            setIsUpdatingOrder(false);
        }
    };

    const extractColorsFromImage = (img: HTMLImageElement) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Sampling ultra rápido a 64x64
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);
        
        const imageData = ctx.getImageData(0, 0, 64, 64).data;
        const colorCounts: Record<string, ColorSwatch> = {};
        
        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const a = imageData[i + 3];
            
            // Ignorar píxeles transparentes o fondo blanco puro
            if (a < 128) continue;
            if (r > 250 && g > 250 && b > 250) continue;
            
            // Agrupar colores cercanos (Quantization de 32 niveles)
            const step = 32;
            let qR = Math.round(r / step) * step;
            let qG = Math.round(g / step) * step;
            let qB = Math.round(b / step) * step;
            qR = qR > 255 ? 255 : qR;
            qG = qG > 255 ? 255 : qG;
            qB = qB > 255 ? 255 : qB;
            
            const key = `${qR},${qG},${qB}`;
            if (!colorCounts[key]) {
                colorCounts[key] = {
                    hex: rgbToHex(qR, qG, qB),
                    rgb: [qR, qG, qB],
                    cmyk: rgbToCmyk(qR, qG, qB),
                    count: 0
                };
            }
            colorCounts[key].count++;
        }
        
        const sortedColors = Object.values(colorCounts).sort((a, b) => b.count - a.count).slice(0, 5);
        setMetadata((prev: any) => ({ ...prev, colors: sortedColors }));
    };

    const processFile = async (uploadedFile: File) => {
        setIsProcessing(true);
        setFile(uploadedFile);
        setStatusText('Analizando formato...');
        setToolMode('none');
        setMeasureStart(null);
        setMeasureEnd(null);
        setZoom(1);
        setPan({ x: 0, y: 0 });

        try {
            const ext = uploadedFile.name.split('.').pop()?.toLowerCase();
            const format = ext?.toUpperCase() || 'Desconocido';
            let extractedPreview: string | null = null;
            let meta: any = {
                name: uploadedFile.name,
                size: (uploadedFile.size / 1024 / 1024).toFixed(2) + ' MB',
                format: format,
                width: 0,
                height: 0,
                dpi: 0,
                colorMode: 'Desconocido',
                source: 'Client-Side Fast Preview'
            };

            // 1. Bitmaps Nativos
            if (uploadedFile.type.startsWith('image/') && !['psd', 'cdr'].includes(ext || '')) {
                setPdfDoc(null);
                setTotalPages(1);
                setCurrentPage(1);
                setStatusText('Renderizando bitmap nativo...');
                extractedPreview = URL.createObjectURL(uploadedFile);
                
                await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        meta.width = img.width;
                        meta.height = img.height;
                        meta.colorMode = 'RGB (Web)';
                        resolve(true);
                    };
                    img.src = extractedPreview as string;
                });
            } 
            // 2. PDF (PDF.js)
            else if (ext === 'pdf') {
                setStatusText('Renderizando motor vectorial PDF...');
                const arrayBuffer = await uploadedFile.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                setPdfDoc(pdf);
                setTotalPages(pdf.numPages);
                setCurrentPage(1);
                
                meta.pages = pdf.numPages;
                meta.currentPage = 1;
                meta.colorMode = 'Documento PDF';

                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 2.0 });
                meta.width = Math.round(viewport.width);
                meta.height = Math.round(viewport.height);

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({ canvasContext: context!, viewport: viewport, canvas: canvas } as any).promise;
                extractedPreview = canvas.toDataURL('image/webp', 0.9);
            }
            // 3. CorelDRAW (JSZip)
            else if (ext === 'cdr') {
                setPdfDoc(null);
                setTotalPages(1);
                setCurrentPage(1);
                setStatusText('Extrayendo ZIP interno (Fast Preview CDR)...');
                
                try {
                    extractedPreview = await extractCdrThumbnail(uploadedFile);
                    if (extractedPreview) {
                        // Extract metadata optionally
                        try {
                            const arrayBuffer = await uploadedFile.arrayBuffer();
                            const zip = new JSZip();
                            const loadedZip = await zip.loadAsync(arrayBuffer);
                            const metaFile = loadedZip.file("metadata/metadata.xml");
                            if (metaFile) {
                                const xmlStr = await metaFile.async("string");
                                const versionMatch = xmlStr.match(/<cdr:version>([^<]+)<\/cdr:version>/i);
                                if (versionMatch && versionMatch[1]) {
                                    meta.version = `CorelDRAW v${versionMatch[1]}`;
                                }
                            }
                        } catch (e) {
                            // Metadata is optional
                        }

                        await new Promise((resolve) => {
                            const img = new Image();
                            img.onload = () => {
                                meta.width = img.width;
                                meta.height = img.height;
                                meta.colorMode = 'Preview Bitmap Embebido';
                                resolve(true);
                            };
                            img.src = extractedPreview as string;
                        });
                    } else {
                        throw new Error("No miniatura extraíble");
                    }
                } catch (e) {
                    console.warn("Fallo ZIP CDR:", e);
                    setStatusText('Fallo Fast Preview, conectando al Backend...');
                }
            }
            // 4. TIFF local rapido
            else if (['tif', 'tiff'].includes(ext || '')) {
                setStatusText('Extrayendo miniatura TIFF local...');
                extractedPreview = await extractTiffThumbnail(uploadedFile);
                if (extractedPreview) {
                    meta.colorMode = 'TIFF Preview';
                    await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            meta.width = img.width;
                            meta.height = img.height;
                            resolve(true);
                        };
                        img.src = extractedPreview as string;
                    });
                }
            }
            // 5. EPS local rapido
            else if (ext === 'eps') {
                setStatusText('Extrayendo miniatura EPS local...');
                extractedPreview = await extractEpsThumbnail(uploadedFile);
                if (extractedPreview) {
                    meta.colorMode = 'EPS Preview';
                    await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            meta.width = img.width;
                            meta.height = img.height;
                            resolve(true);
                        };
                        img.src = extractedPreview as string;
                    });
                }
            }

            if (extractedPreview) {
                setPreviewUrl(extractedPreview);
                setMetadata(meta);
                setIsProcessing(false);
                return;
            }

            // 6. Fallback Backend
            setStatusText('Enviando al servicio HQ Render (Backend)...');
            try {
                const formData = new FormData();
                formData.append('file', uploadedFile);

                const res = await fetch(`${API_URL}/preview`, {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        const fullUrl = data.url.startsWith('http') ? data.url : `${API_URL.replace(/\/api\/?$/, '')}${data.url}`;
                        setPreviewUrl(fullUrl);
                    }

                    meta.width = data.width || 0;
                    meta.height = data.height || 0;
                    meta.dpi = data.dpi || 0;
                    meta.colorMode = data.colorMode || 'Desconocido';
                    meta.source = 'Backend HQ Render';

                    setMetadata(meta);
                    return;
                } else {
                    console.warn(`Backend returned ${res.status}`);
                    throw new Error(`Backend fallback failed with status ${res.status}`);
                }
            } catch (backendErr) {
                console.warn('Backend fallback failed or unavailable, using generic vector card.', backendErr);
                // Fallback to generateVectorCard
                const cardUrl = generateVectorCard(format, uploadedFile.name);
                setPreviewUrl(cardUrl);
                
                meta.width = 320;
                meta.height = 360;
                meta.colorMode = 'Vector Card Gen';
                meta.source = 'Local Vector Card Fallback';
                setMetadata(meta);
            }

        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            processFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
        onDrop,
        noClick: file !== null || previewUrl !== null
    });

    // Herramientas Interactivas: Eventos
    const handleMouseDown = (e: React.MouseEvent) => {
        if (toolMode === 'pan') {
            setIsPanning(true);
            return;
        }
        if (toolMode !== 'measure' || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMeasureStart({ x, y });
        setMeasureEnd({ x, y });
        setIsMeasuring(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning && toolMode === 'pan') {
            setPan(prev => ({
                x: prev.x + e.movementX,
                y: prev.y + e.movementY
            }));
            return;
        }
        if (!isMeasuring || toolMode !== 'measure' || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMeasureEnd({ x, y });
    };

    const handleMouseUp = () => {
        if (toolMode === 'pan') {
            setIsPanning(false);
        }
        if (toolMode === 'measure') {
            setIsMeasuring(false);
        }
    };

    const handleImageLoad = () => {
        if (imageRef.current && metadata) {
            const displayWidth = imageRef.current.clientWidth;
            const originalWidth = metadata.width;
            if (originalWidth > 0) {
                setImageScale(displayWidth / originalWidth);
            }
            // Extraer colores si no se hizo aún
            if (!metadata.colors) {
                extractColorsFromImage(imageRef.current);
            }
        }
    };

    React.useEffect(() => {
        const handleResize = () => handleImageLoad();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [metadata, previewUrl]);

    // Matemáticas de Medición
    const calculateDistance = () => {
        if (!measureStart || !measureEnd) return null;
        const dx = measureEnd.x - measureStart.x;
        const dy = measureEnd.y - measureStart.y;
        const pxDistanceScreen = Math.sqrt(dx * dx + dy * dy);
        
        const pxOriginal = pxDistanceScreen / imageScale;
        const currentDpi = metadata?.dpi && metadata.dpi > 0 ? metadata.dpi : assumedDpi;
        const inches = pxOriginal / currentDpi;
        const cm = inches * 2.54;
        
        return cm.toFixed(2);
    };

    const measurement = calculateDistance();

    return (
        <div className="xpress-container">
            {/* Header de Navegación de Xpress (Visor vs Redrawer) */}
            <div className="xpress-header-nav">
                <div className="xpress-nav-brand">
                    <span className="xpress-brand-icon">👁️</span>
                    <span className="xpress-brand-title">Xpress Studio</span>
                </div>

                <div className="xpress-nav-tabs">
                    <button 
                        type="button"
                        className={`xpress-nav-tab ${activeTab === 'viewer' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('viewer');
                            const newParams = new URLSearchParams(searchParams);
                            newParams.delete('tab');
                            setSearchParams(newParams);
                        }}
                    >
                        👁️ Visor & Medición
                    </button>
                    <button 
                        type="button"
                        className={`xpress-nav-tab ${activeTab === 'redrawer' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('redrawer');
                            const newParams = new URLSearchParams(searchParams);
                            newParams.set('tab', 'redrawer');
                            setSearchParams(newParams);
                        }}
                    >
                        ✏️ Redrawer & Vectorizador
                        <span className="xpress-tab-pill">NUEVO</span>
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {loadingOrder && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cargando OT...</span>
                    )}
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

            {activeTab === 'redrawer' ? (
                <RedrawerStudio 
                    initialImageUrl={previewUrl}
                    initialFileName={file?.name ? file.name.replace(/\.[^/.]+$/, '') : (metadata?.name ? metadata.name.replace(/\.[^/.]+$/, '') : 'archivo')}
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
                        setActiveTab('viewer');
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('tab');
                        setSearchParams(newParams);
                    }}
                    onClose={onClose}
                />
            ) : (
                <div className="xpress-main-layout">
                    <div className="xpress-viewport" {...getRootProps()}>
                        <input {...getInputProps()} />
                        
                        {(!file && !previewUrl) ? (
                            <div className={`xpress-dropzone ${isDragActive ? 'active' : ''}`}>
                                <div className="xpress-dropzone-icon">☁️</div>
                                <p>Arrastra un archivo aquí o haz clic para explorar</p>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px' }}>
                                    Soporta: CDR, AI, EPS, PDF, SVG, JPG, PNG, WEBP
                                </span>
                                <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <span className="xpress-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>⚡ Fast Preview</span>
                                    <span className="xpress-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>📏 Smart Measure</span>
                                    <span className="xpress-badge" style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6' }}>🎨 Auto Palette</span>
                                    <span 
                                        className="xpress-badge" 
                                        style={{ background: 'rgba(168, 85, 247, 0.25)', color: '#c084fc', cursor: 'pointer', border: '1px solid rgba(168, 85, 247, 0.4)' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveTab('redrawer');
                                            setSearchParams({ tab: 'redrawer' });
                                        }}
                                        title="Abrir Redrawer & Vectorizador"
                                    >
                                        ✏️ Redrawer Studio
                                    </span>
                                </div>
                            </div>
                        ) : (
                    <div className="xpress-preview-container">
                        {isProcessing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                <span style={{ color: '#94a3b8' }}>{statusText}</span>
                            </div>
                        ) : previewUrl ? (
                            <div 
                                className="xpress-interactive-wrapper" 
                                style={{ 
                                    position: 'relative', 
                                    display: 'inline-block', 
                                    maxWidth: '100%', 
                                    maxHeight: '100%', 
                                    cursor: toolMode === 'measure' ? 'crosshair' : toolMode === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'default',
                                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                    transformOrigin: 'center center',
                                    transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                                }}
                                onWheel={(e) => {
                                    if (toolMode === 'pan' || toolMode === 'none' || toolMode === 'measure' || toolMode === 'bleed') {
                                        setZoom(prev => Math.min(Math.max(0.1, prev + e.deltaY * -0.001), 10));
                                    }
                                }}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                <img 
                                    ref={imageRef}
                                    src={previewUrl} 
                                    alt="Preview" 
                                    className="xpress-preview-image" 
                                    onLoad={handleImageLoad}
                                    crossOrigin="anonymous"
                                    draggable={false}
                                    style={{ 
                                        display: 'block', 
                                        maxWidth: '100%', 
                                        maxHeight: '100%', 
                                        objectFit: 'contain', 
                                        userSelect: 'none', 
                                        WebkitUserSelect: 'none',
                                        filter: simulateSolvent ? 'contrast(1.08) saturate(0.82) brightness(0.97) sepia(0.04)' : undefined,
                                        transition: 'filter 0.3s ease'
                                    }}
                                />
                                
                                {/* Overlay Interactivo (Regla y Guías) */}
                                <svg 
                                    ref={svgRef}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                                >
                                    {toolMode === 'bleed' && (() => {
                                        // Proporciones dinámicas en porcentaje basadas en medidas reales (m y cm)
                                        const bleedPctX = Math.min(22, Math.max(1.5, (bleedCm / (targetWidthMeters * 100)) * 100));
                                        const bleedPctY = Math.min(22, Math.max(1.5, (bleedCm / (targetHeightMeters * 100)) * 100));
                                        const safetyPctX = Math.min(10, Math.max(1, (safetyMarginCm / (targetWidthMeters * 100)) * 100));
                                        const safetyPctY = Math.min(10, Math.max(1, (safetyMarginCm / (targetHeightMeters * 100)) * 100));

                                        const topBleed = bleedSides.top ? bleedPctY : 0;
                                        const bottomBleed = bleedSides.bottom ? bleedPctY : 0;
                                        const leftBleed = bleedSides.left ? bleedPctX : 0;
                                        const rightBleed = bleedSides.right ? bleedPctX : 0;

                                        const cutX = leftBleed;
                                        const cutY = topBleed;
                                        const cutW = Math.max(10, 100 - leftBleed - rightBleed);
                                        const cutH = Math.max(10, 100 - topBleed - bottomBleed);

                                        const safeX = cutX + safetyPctX;
                                        const safeY = cutY + safetyPctY;
                                        const safeW = Math.max(5, cutW - (safetyPctX * 2));
                                        const safeH = Math.max(5, cutH - (safetyPctY * 2));

                                        const activeSides = [
                                            bleedSides.top ? 'Sup' : null,
                                            bleedSides.bottom ? 'Inf' : null,
                                            bleedSides.left ? 'Izq' : null,
                                            bleedSides.right ? 'Der' : null,
                                        ].filter(Boolean).join('+');

                                        return (
                                            <g className="xpress-bleed-overlay-group">
                                                {/* Demasía / Sangrado Perimetral Exterior */}
                                                <rect 
                                                    x="0%" y="0%" width="100%" height="100%" 
                                                    fill="none" stroke="#06b6d4" strokeWidth="2" 
                                                />
                                                <rect 
                                                    x="0%" y="0%" width="100%" height="100%" 
                                                    fill="rgba(6, 182, 212, 0.08)"
                                                />

                                                {/* Línea de Corte Neto (Guillotina / Refile de Taller) */}
                                                <rect 
                                                    x={`${cutX}%`} y={`${cutY}%`} width={`${cutW}%`} height={`${cutH}%`} 
                                                    fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="8,5" 
                                                />

                                                {/* Zona de Seguridad de Contenido (1cm dentro del corte) */}
                                                <rect 
                                                    x={`${safeX}%`} y={`${safeY}%`} width={`${safeW}%`} height={`${safeH}%`} 
                                                    fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,4" 
                                                />

                                                {/* Rótulo Flotante con Cotas */}
                                                <g transform="translate(16, 26)">
                                                    <rect x="0" y="0" width="370" height="28" rx="6" fill="rgba(15, 23, 42, 0.88)" stroke="rgba(255,255,255,0.18)" />
                                                    <text x="12" y="18" fill="#f8fafc" fontSize="11" fontWeight="700">
                                                        ✂️ Corte: {(targetWidthMeters * 100).toFixed(0)}×{(targetHeightMeters * 100).toFixed(0)}cm | +{bleedCm}cm Sangría ({activeSides || 'Ninguno'}) | -{safetyMarginCm}cm Seguro
                                                    </text>
                                                </g>

                                                {bleedSides.top && (
                                                    <text x="50%" y={`${Math.max(3.5, topBleed / 2)}%`} fill="#06b6d4" fontSize="11" fontWeight="bold" textAnchor="middle">
                                                        ▲ Sangría Superior +{bleedCm} cm
                                                    </text>
                                                )}
                                                {bleedSides.bottom && (
                                                    <text x="50%" y={`${Math.min(97.5, 100 - bottomBleed / 2)}%`} fill="#06b6d4" fontSize="11" fontWeight="bold" textAnchor="middle">
                                                        ▼ Sangría Inferior +{bleedCm} cm
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    })()}

                                    {toolMode === 'measure' && measureStart && measureEnd && (
                                        <>
                                            <line 
                                                x1={measureStart.x} y1={measureStart.y} 
                                                x2={measureEnd.x} y2={measureEnd.y} 
                                                stroke="#3b82f6" strokeWidth="2" 
                                            />
                                            <circle cx={measureStart.x} cy={measureStart.y} r="4" fill="#3b82f6" />
                                            <circle cx={measureEnd.x} cy={measureEnd.y} r="4" fill="#3b82f6" />
                                            {measurement && (
                                                <g transform={`translate(${(measureStart.x + measureEnd.x) / 2}, ${(measureStart.y + measureEnd.y) / 2 - 10})`}>
                                                    <rect x="-30" y="-15" width="60" height="20" rx="4" fill="rgba(0,0,0,0.7)" />
                                                    <text x="0" y="0" fill="#fff" fontSize="12" textAnchor="middle" dominantBaseline="middle">
                                                        {measurement} cm
                                                    </text>
                                                </g>
                                            )}
                                        </>
                                    )}
                                </svg>

                                {simulateSolvent && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '16px',
                                        right: '16px',
                                        background: 'rgba(217, 119, 6, 0.9)',
                                        color: '#fff',
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        zIndex: 15,
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <span>🧪</span>
                                        <span>Simulación Solvente (CMYK) Activa</span>
                                    </div>
                                )}

                                {(actionSuccessMessage || bleedSavedFeedback) && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '60px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'rgba(16, 185, 129, 0.95)',
                                        color: '#fff',
                                        padding: '8px 18px',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        zIndex: 30,
                                        boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>{actionSuccessMessage || bleedSavedFeedback}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ color: '#ef4444' }}>
                                ⚠️ No se pudo generar una vista previa para este archivo.
                            </div>
                        )}
                        
                        {totalPages > 1 && (
                            <div className="xpress-pagination-bar">
                                <button
                                    type="button"
                                    className="xpress-page-nav-btn"
                                    disabled={currentPage <= 1 || isRenderingPage}
                                    onClick={(e) => { e.stopPropagation(); goToPage(currentPage - 1); }}
                                    title="Página Anterior (←)"
                                >
                                    ◀ Anterior
                                </button>
                                <span className="xpress-page-indicator">
                                    Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                                </span>
                                <button
                                    type="button"
                                    className="xpress-page-nav-btn"
                                    disabled={currentPage >= totalPages || isRenderingPage}
                                    onClick={(e) => { e.stopPropagation(); goToPage(currentPage + 1); }}
                                    title="Página Siguiente (→)"
                                >
                                    Siguiente ▶
                                </button>
                            </div>
                        )}

                        <div className="xpress-toolbar">
                            <button className="xpress-tool-btn" onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.1, z - 0.2)); }} title="Alejar">➖</button>
                            <span style={{color: '#fff', fontSize: '0.8rem', minWidth: '40px', textAlign: 'center'}}>{Math.round(zoom * 100)}%</span>
                            <button className="xpress-tool-btn" onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(10, z + 0.2)); }} title="Acercar">➕</button>
                            
                            {totalPages > 1 && (
                                <>
                                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }}></div>
                                    <button 
                                        type="button"
                                        className="xpress-tool-btn" 
                                        disabled={currentPage <= 1 || isRenderingPage} 
                                        onClick={(e) => { e.stopPropagation(); goToPage(currentPage - 1); }} 
                                        title="Página Anterior (←)"
                                    >
                                        ◀
                                    </button>
                                    <span style={{ color: '#fff', fontSize: '0.8rem', minWidth: '36px', textAlign: 'center', fontWeight: 700 }}>
                                        {currentPage}/{totalPages}
                                    </span>
                                    <button 
                                        type="button"
                                        className="xpress-tool-btn" 
                                        disabled={currentPage >= totalPages || isRenderingPage} 
                                        onClick={(e) => { e.stopPropagation(); goToPage(currentPage + 1); }} 
                                        title="Página Siguiente (→)"
                                    >
                                        ▶
                                    </button>
                                </>
                            )}

                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 8px' }}></div>
                            <button 
                                className={`xpress-tool-btn ${toolMode === 'pan' ? 'active' : ''}`} 
                                onClick={(e) => { e.stopPropagation(); setToolMode(toolMode === 'pan' ? 'none' : 'pan'); }} 
                                title="Mano (Navegar)"
                                style={toolMode === 'pan' ? { background: 'var(--accent)' } : {}}
                            >
                                ✋
                            </button>
                            <button 
                                className={`xpress-tool-btn ${toolMode === 'measure' ? 'active' : ''}`} 
                                onClick={(e) => { e.stopPropagation(); setToolMode(toolMode === 'measure' ? 'none' : 'measure'); }} 
                                title="Regla / Cintrón Digital"
                                style={toolMode === 'measure' ? { background: 'var(--accent)' } : {}}
                            >
                                📏
                            </button>
                            <button 
                                className={`xpress-tool-btn ${toolMode === 'bleed' ? 'active' : ''}`} 
                                onClick={(e) => { e.stopPropagation(); setToolMode(toolMode === 'bleed' ? 'none' : 'bleed'); }} 
                                title="Guías de Corte y Demasía"
                                style={toolMode === 'bleed' ? { background: 'var(--accent)' } : {}}
                            >
                                ✂️
                            </button>
                            <button 
                                className={`xpress-tool-btn ${simulateSolvent ? 'active' : ''}`} 
                                onClick={(e) => { e.stopPropagation(); setSimulateSolvent(s => !s); }} 
                                title={simulateSolvent ? "Desactivar Simulación Solvente" : "Simular Virado Solvente (CMYK)"}
                                style={simulateSolvent ? { background: '#d97706', color: '#fff' } : {}}
                            >
                                🧪
                            </button>
                            <button 
                                type="button"
                                className="xpress-tool-btn" 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setActiveTab('redrawer'); 
                                    const p = new URLSearchParams(searchParams);
                                    p.set('tab', 'redrawer');
                                    setSearchParams(p);
                                }} 
                                title="Abrir en Redrawer (Vectorizar y Redibujar)"
                                style={{
                                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                    width: 'auto',
                                    padding: '0 12px',
                                    borderRadius: '18px',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: '0 2px 10px rgba(79, 70, 229, 0.4)'
                                }}
                            >
                                <span>✏️</span>
                                <span>Redrawer</span>
                            </button>
                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 8px' }}></div>
                            <button className="xpress-tool-btn" onClick={(e) => { e.stopPropagation(); if (onClose) { onClose(); } else { handleClear(); } }} title="Cerrar archivo">❌</button>
                        </div>

                        {/* Barra de Aprobación Técnica y Pase a Impresión (Fase 5) */}
                        {order && (
                            <div className="xpress-order-action-dock" onClick={(e) => e.stopPropagation()}>
                                <div className="xpress-dock-order-info">
                                    <span style={{ fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                                        OT-{order.ot}
                                    </span>
                                    <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                                        {order.clienteNombre}
                                    </span>
                                    <span style={{ color: '#94a3b8' }}>•</span>
                                    <span style={{ color: '#cbd5e1' }}>
                                        {order.material} ({targetWidthMeters}m × {targetHeightMeters}m)
                                    </span>
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        padding: '2px 8px', 
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        background: order.status === 'orden' ? 'rgba(16, 185, 129, 0.2)' : order.status === 'rebotado' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                        color: order.status === 'orden' ? '#34d399' : order.status === 'rebotado' ? '#f87171' : '#a5b4fc'
                                    }}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="xpress-dock-actions">
                                    <button
                                        type="button"
                                        className="xpress-btn-approve"
                                        onClick={handleApprovePreflight}
                                        disabled={isUpdatingOrder}
                                        title="Aprobar técnicamente y pasar a cola de impresión"
                                    >
                                        <span>🚀</span>
                                        <span>Aprobar Preimpresión</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="xpress-btn-reject"
                                        onClick={() => setShowRejectModal(true)}
                                        disabled={isUpdatingOrder}
                                        title="Rebotar al vendedor con reporte técnico"
                                    >
                                        <span>↩️</span>
                                        <span>Rebotar al Vendedor</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sidebar Metadata */}
            <div className="xpress-sidebar">
                <div className="xpress-sidebar-header">
                    <h2>👁️ Xpress Viewer</h2>
                </div>
                
                <div className="xpress-sidebar-content">
                    {metadata ? (
                        <>
                            <div className="xpress-card">
                                <h3>Información del Archivo</h3>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Archivo</span>
                                    <span className="xpress-meta-value" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={metadata.name}>
                                        {metadata.name}
                                    </span>
                                </div>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Formato</span>
                                    <span className="xpress-meta-value">
                                        <span className="xpress-badge">{metadata.format}</span>
                                    </span>
                                </div>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Peso</span>
                                    <span className="xpress-meta-value">{metadata.size}</span>
                                </div>
                                {metadata.version && (
                                    <div className="xpress-meta-row">
                                        <span className="xpress-meta-label">Versión</span>
                                        <span className="xpress-meta-value">{metadata.version}</span>
                                    </div>
                                )}
                            </div>

                            {/* 1. Vista de Producción & Inspector DPI 1:1 */}
                            <div className="xpress-card">
                                <h3>📐 Medidas & Inspector DPI 1:1</h3>
                                
                                <div style={{ marginBottom: '10px' }}>
                                    <span className="xpress-meta-label" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>
                                        Tamaño Final Deseado (Metros):
                                    </span>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Ancho (m):</label>
                                            <input 
                                                type="number" 
                                                step="0.05" 
                                                min="0.1" 
                                                value={targetWidthMeters} 
                                                onChange={(e) => setTargetWidthMeters(Math.max(0.01, Number(e.target.value)))}
                                                style={{ width: '100%', padding: '4px 6px', background: 'rgba(0,0,0,0.25)', border: '1px solid #334155', color: '#fff', borderRadius: '4px', fontSize: '0.82rem' }}
                                                title="Ancho final para calcular DPI real"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Alto (m):</label>
                                            <input 
                                                type="number" 
                                                step="0.05" 
                                                min="0.1" 
                                                value={targetHeightMeters} 
                                                onChange={(e) => setTargetHeightMeters(Math.max(0.01, Number(e.target.value)))}
                                                style={{ width: '100%', padding: '4px 6px', background: 'rgba(0,0,0,0.25)', border: '1px solid #334155', color: '#fff', borderRadius: '4px', fontSize: '0.82rem' }}
                                                title="Alto final para calcular DPI real"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Matriz Píxeles</span>
                                    <span className="xpress-meta-value">
                                        {metadata.width} × {metadata.height} px
                                    </span>
                                </div>
                                
                                <div className="xpress-meta-row" style={{ alignItems: 'flex-start', marginTop: '6px' }}>
                                    <span className="xpress-meta-label">DPI Escala Real</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        <div className={`xpress-dpi-badge ${dpiTier.badgeClass}`}>
                                            <span>{dpiTier.icon}</span>
                                            <span>{calculatedDpi} DPI</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ fontSize: '0.73rem', color: dpiTier.color, marginTop: '4px', lineHeight: 1.35, background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px' }}>
                                    {dpiTier.desc}
                                </div>

                                {dpiTier.tier === 'critical' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveTab('redrawer');
                                            const p = new URLSearchParams(searchParams);
                                            p.set('tab', 'redrawer');
                                            setSearchParams(p);
                                        }}
                                        style={{
                                            marginTop: '8px',
                                            width: '100%',
                                            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '7px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                                        }}
                                    >
                                        <span>✏️</span>
                                        <span>Vectorizar en Redrawer Studio</span>
                                    </button>
                                )}

                                {totalPages > 1 ? (
                                    <div className="xpress-meta-row" style={{ alignItems: 'center', marginTop: '8px' }}>
                                        <span className="xpress-meta-label">Página</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button 
                                                type="button"
                                                disabled={currentPage <= 1 || isRenderingPage}
                                                onClick={() => goToPage(currentPage - 1)}
                                                style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                                                title="Página Anterior (←)"
                                            >
                                                ◀
                                            </button>
                                            <span className="xpress-meta-value" style={{ fontWeight: 700 }}>
                                                {currentPage} / {totalPages}
                                            </span>
                                            <button 
                                                type="button"
                                                disabled={currentPage >= totalPages || isRenderingPage}
                                                onClick={() => goToPage(currentPage + 1)}
                                                style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                                                title="Página Siguiente (→)"
                                            >
                                                ▶
                                            </button>
                                        </div>
                                    </div>
                                ) : metadata.pages ? (
                                    <div className="xpress-meta-row" style={{ marginTop: '8px' }}>
                                        <span className="xpress-meta-label">Páginas</span>
                                        <span className="xpress-meta-value">{metadata.pages}</span>
                                    </div>
                                ) : null}

                                <div className="xpress-meta-row" style={{ marginTop: '10px' }}>
                                    <span className="xpress-meta-label" style={{ fontSize: '0.78rem' }}>Motor Preview:</span>
                                    <span className="xpress-meta-value" style={{ fontSize: '0.78rem', color: metadata.source.includes('Client') ? '#34d399' : '#fbbf24' }}>
                                        {metadata.source}
                                    </span>
                                </div>
                            </div>

                            {/* 2. Calibrador de Demasías y Sangrado */}
                            <div className="xpress-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '10px' }}>
                                    <h3 style={{ margin: 0, border: 'none', padding: 0 }}>✂️ Calibrador de Demasías</h3>
                                    <button
                                        type="button"
                                        onClick={() => setToolMode(toolMode === 'bleed' ? 'none' : 'bleed')}
                                        style={{
                                            background: toolMode === 'bleed' ? '#0ea5e9' : 'rgba(255,255,255,0.08)',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '3px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {toolMode === 'bleed' ? '✂️ Guías Visibles' : '👁️ Ver Guías'}
                                    </button>
                                </div>

                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>Presets de Producción:</div>
                                <div className="xpress-bleed-presets">
                                    <button
                                        type="button"
                                        className={`xpress-bleed-preset-btn ${bleedCm === 0.5 ? 'active' : ''}`}
                                        onClick={() => { setBleedCm(0.5); setToolMode('bleed'); }}
                                    >
                                        <span style={{ fontSize: '0.8rem' }}>✂️ 0.5 cm</span>
                                        <span style={{ fontSize: '0.64rem', opacity: 0.85 }}>Vinilo / Calcos</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`xpress-bleed-preset-btn ${bleedCm === 2.0 ? 'active' : ''}`}
                                        onClick={() => { setBleedCm(2.0); setToolMode('bleed'); }}
                                    >
                                        <span style={{ fontSize: '0.8rem' }}>🚩 2.0 cm</span>
                                        <span style={{ fontSize: '0.64rem', opacity: 0.85 }}>Lona Frontal</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`xpress-bleed-preset-btn ${bleedCm === 5.0 ? 'active' : ''}`}
                                        onClick={() => { setBleedCm(5.0); setToolMode('bleed'); }}
                                    >
                                        <span style={{ fontSize: '0.8rem' }}>🎒 5.0 cm</span>
                                        <span style={{ fontSize: '0.64rem', opacity: 0.85 }}>Bolsillo Lona</span>
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Demasía (cm):</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            max="30"
                                            value={bleedCm}
                                            onChange={(e) => setBleedCm(Math.max(0, Number(e.target.value)))}
                                            style={{ width: '100%', padding: '4px 6px', background: 'rgba(0,0,0,0.25)', border: '1px solid #334155', color: '#fff', borderRadius: '4px', fontSize: '0.82rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Zona Segura (cm):</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            max="10"
                                            value={safetyMarginCm}
                                            onChange={(e) => setSafetyMarginCm(Math.max(0, Number(e.target.value)))}
                                            style={{ width: '100%', padding: '4px 6px', background: 'rgba(0,0,0,0.25)', border: '1px solid #334155', color: '#fff', borderRadius: '4px', fontSize: '0.82rem' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '10px' }}>Bordes con Sangría:</div>
                                <div className="xpress-sides-grid">
                                    <button
                                        type="button"
                                        className={`xpress-side-btn ${bleedSides.top ? 'active' : ''}`}
                                        onClick={() => setBleedSides(s => ({ ...s, top: !s.top }))}
                                        title="Demasía Superior"
                                    >
                                        ⬆️ Sup
                                    </button>
                                    <button
                                        type="button"
                                        className={`xpress-side-btn ${bleedSides.bottom ? 'active' : ''}`}
                                        onClick={() => setBleedSides(s => ({ ...s, bottom: !s.bottom }))}
                                        title="Demasía Inferior"
                                    >
                                        ⬇️ Inf
                                    </button>
                                    <button
                                        type="button"
                                        className={`xpress-side-btn ${bleedSides.left ? 'active' : ''}`}
                                        onClick={() => setBleedSides(s => ({ ...s, left: !s.left }))}
                                        title="Demasía Izquierda"
                                    >
                                        ⬅️ Izq
                                    </button>
                                    <button
                                        type="button"
                                        className={`xpress-side-btn ${bleedSides.right ? 'active' : ''}`}
                                        onClick={() => setBleedSides(s => ({ ...s, right: !s.right }))}
                                        title="Demasía Derecha"
                                    >
                                        ➡️ Der
                                    </button>
                                </div>

                                {order && (
                                    <button
                                        type="button"
                                        onClick={handleSaveBleedToOrder}
                                        disabled={isUpdatingOrder}
                                        style={{
                                            marginTop: '12px',
                                            width: '100%',
                                            background: 'rgba(14, 165, 233, 0.2)',
                                            border: '1px solid #0ea5e9',
                                            color: '#38bdf8',
                                            padding: '7px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <span>💾</span>
                                        <span>Guardar Demasía en OT #{order.ot}</span>
                                    </button>
                                )}
                            </div>

                            {/* 3. Gestión de Color & Tintas Solventes (CMYK vs RGB) */}
                            <div className="xpress-card">
                                <h3>🎨 Gestión de Color & Tintas</h3>
                                <div className="xpress-meta-row">
                                    <span className="xpress-meta-label">Perfil Detectado</span>
                                    <span className="xpress-meta-value">{metadata.colorMode}</span>
                                </div>

                                <div className="xpress-color-alert">
                                    ⚠️ <strong>Alerta RGB:</strong> En impresión con tintas solventes/UV (espacio CMYK), los verdes fosforescentes y cianes saturados sufrirán recorte de gama (gamut clipping). Los negros (0,0,0) deben enriquecerse a C:40 M:40 Y:40 K:100.
                                </div>

                                <div 
                                    className={`xpress-color-toggle ${simulateSolvent ? 'active' : ''}`}
                                    onClick={() => setSimulateSolvent(s => !s)}
                                    title="Aplica una matriz de compensación para previsualizar virado a tintas solventes"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>🧪</span>
                                        <span>Simular Virado Solvente</span>
                                    </div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                                        {simulateSolvent ? 'ACTIVO' : 'OFF'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* 4. Panel de Paleta de Colores (Sprint 3) */}
                            {metadata.colors && metadata.colors.length > 0 && (
                                <div className="xpress-card">
                                    <h3>Paleta de Color Estimada</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                        {metadata.colors.map((color: ColorSwatch, idx: number) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px' }}>
                                                <div 
                                                    style={{ 
                                                        width: '32px', height: '32px', borderRadius: '4px', 
                                                        backgroundColor: color.hex,
                                                        border: '1px solid rgba(255,255,255,0.1)'
                                                    }} 
                                                />
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#f8fafc' }}>
                                                        {color.hex}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                        C:{color.cmyk.c} M:{color.cmyk.m} Y:{color.cmyk.y} K:{color.cmyk.k}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '12px', textAlign: 'center' }}>
                                        *Valores CMYK calculados matemáticamente desde previsualización RGB. Solo para referencia técnica.
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '40px 20px' }}>
                            Abre un archivo para ver su metadata técnica.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )}

    {/* Modal de Rebote Técnico (Fase 5) */}
    {showRejectModal && (
        <div className="xpress-modal-overlay" onClick={() => setShowRejectModal(false)}>
            <div className="xpress-reject-modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>↩️</span> Rebote Técnico de OT-{order?.ot}
                    </h3>
                    <button
                        type="button"
                        onClick={() => setShowRejectModal(false)}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '14px' }}>
                    Selecciona un motivo común o escribe la causa técnica por la cual este archivo no puede ser enviado a taller:
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    {[
                        `Baja resolución (${calculatedDpi} DPI < 72 DPI, pixelado severo)`,
                        'Tipografías no convertidas a curvas',
                        'Medidas no proporcionales a las solicitadas',
                        'Falta sangrado/demasía para confección de bolsillos',
                        'Requiere vectorización en curvas (Logo ilegible)'
                    ].map((presetText) => (
                        <button
                            key={presetText}
                            type="button"
                            className="xpress-reject-preset-chip"
                            onClick={() => setRejectReason(presetText)}
                        >
                            {presetText}
                        </button>
                    ))}
                </div>

                <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Escribe las especificaciones que el vendedor o cliente deben corregir..."
                    rows={4}
                    style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        color: '#fff',
                        padding: '10px',
                        fontSize: '0.88rem',
                        marginBottom: '18px',
                        resize: 'vertical'
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={() => setShowRejectModal(false)}
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#cbd5e1',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmReject}
                        disabled={!rejectReason.trim() || isUpdatingOrder}
                        style={{
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 18px',
                            borderRadius: '6px',
                            cursor: (!rejectReason.trim() || isUpdatingOrder) ? 'not-allowed' : 'pointer',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            opacity: (!rejectReason.trim() || isUpdatingOrder) ? 0.6 : 1
                        }}
                    >
                        {isUpdatingOrder ? 'Guardando...' : 'Confirmar Rebote Técnico'}
                    </button>
                </div>
            </div>
        </div>
    )}
</div>
    );
};

export default XpressViewer;
