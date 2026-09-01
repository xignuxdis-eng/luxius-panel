import { useState, useRef, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { UniversalFilePreview } from '@components/UniversalFilePreview'
import { extractCdrThumbnail } from '@/utils/cdrPreview'
import { generateVectorCard } from '@/utils/vectorPreview'
import { PDFDocument } from 'pdf-lib'
import { getClientes, getMateriales, getCalidades, saveOrden, deleteOrden, getLogisticas, uploadFile, saveCliente, API_URL, getServiciosActivos, resolveMediaUrl, getCombos, getServicios, getAuthHeaders, type ComboData } from '@data/db'
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    }
} catch (e) {
    console.warn("[Luxius-PDF] Error configurando PDF worker:", e);
}
import { useAuthStore } from '@store/authStore'
import { blobStore } from '@/data/blobStore'
import type { Order, DemasiasConfig } from '@/types'
import './NuevoPedidoModal.css'

interface NuevoPedidoModalProps {
    isOpen: boolean
    onClose: (created?: boolean) => void
    order?: Order | null
    defaultStatus?: string
}

type TabType = 'unitario' | 'lote' | 'promos'

interface BatchItem {
    id: string
    file: File
    fileName: string
    previewUrl: string
    metadata: { width: number, height: number, dpi: number, format: string, colorMode: string, pageCount?: number, thumbnailUrl?: string }
    confirmed: boolean
    copias: number
    material: string
    descripcionItem?: string
    demasiasConfig?: DemasiasConfig
    servicios?: Record<string, boolean>
}


export default function NuevoPedidoModal({ isOpen, onClose, order, defaultStatus }: NuevoPedidoModalProps) {
    const { user } = useAuthStore()
    const [activeTab, setActiveTab] = useState<TabType>('unitario')
    const [fileName, setFileName] = useState('')
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [metadata, setMetadata] = useState<{ width?: number, height?: number, dpi?: number, format?: string, colorMode?: string, pageCount?: number, thumbnailUrl?: string } | null>(null)
    const [batchItems, setBatchItems] = useState<BatchItem[]>([])
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [currentDefaultStatus] = useState(defaultStatus || 'orden')
    const [extracting, setExtracting] = useState(false)
    const [availableServices, setAvailableServices] = useState<import('@/types').Servicio[]>([])
    const [saving, setSaving] = useState(false)
    const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0, errorCount: 0 })
    const [vendedores, setVendedores] = useState<any[]>([])
    const [uploadProgress, setUploadProgress] = useState<{ percent: number; loaded: string; total: string; fileName: string } | null>(null);
    const [isCloudImporting, setIsCloudImporting] = useState(false)
    const [cloudImportStatus, setCloudImportStatus] = useState<string>('')
    const [showCloudInput, setShowCloudInput] = useState(false)
    const [cloudUrl, setCloudUrl] = useState('')
    const [selectedComboId, setSelectedComboId] = useState<number | null>(null)
    const [comboSearch, setComboSearch] = useState('')
    const [comboCategoriaFilter, setComboCategoriaFilter] = useState('todas')

    const promoCategories = useMemo(() => {
        const all = getCombos().filter(c => c.habilitado !== false);
        const cats = new Set<string>();
        all.forEach(c => { if (c.categoria) cats.add(c.categoria); });
        return ['todas', ...Array.from(cats)];
    }, [isOpen]);

    const filteredPromos = useMemo(() => {
        const all = getCombos().filter(c => c.habilitado !== false);
        return all.filter(c => {
            if (comboCategoriaFilter !== 'todas' && c.categoria !== comboCategoriaFilter) return false;
            if (comboSearch.trim()) {
                const q = comboSearch.toLowerCase();
                const match = (c.nombre || '').toLowerCase().includes(q) ||
                              (c.codigo || '').toLowerCase().includes(q) ||
                              (c.descripcion || '').toLowerCase().includes(q);
                if (!match) return false;
            }
            return true;
        });
    }, [comboCategoriaFilter, comboSearch, isOpen]);

    // --- Searchable Client Dropdown State ---
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const clientDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
                setShowClientDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    // ----------------------------------------

    // REF for async access to latest batch state
    const batchItemsRef = useRef(batchItems);
    useEffect(() => { batchItemsRef.current = batchItems; }, [batchItems]);

    // Load services and vendors dynamically when modal opens
    useEffect(() => {
        const loadServicesAndVendors = async () => {
            if (isOpen) {
                console.log("[Luxius-UI] Sincronizando servicios y vendedores...");

                // 1. Inmediato: LocalStorage
                const stored = localStorage.getItem('luxius_session_servicios');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        const active = parsed.filter((s: any) => s.habilitado);
                        if (active.length > 0) setAvailableServices(active);
                    } catch (e) { console.error("Error localStorage servicios", e); }
                }

                // 1b. Fallback: cargar desde db.ts (getServiciosActivos)
                if (!stored) {
                    const fromDb = getServiciosActivos();
                    if (fromDb.length > 0) setAvailableServices(fromDb);
                }

                const storedVendedores = localStorage.getItem('luxius_session_vendedores');
                if (storedVendedores) {
                    try {
                        setVendedores(JSON.parse(storedVendedores));
                    } catch (e) { console.error("Error localStorage vendedores", e); }
                }

                // 2. Fondo: API para asegurar frescura
                try {
                    const res = await fetch(`${API_URL}/servicios`, { cache: 'no-store' });
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) {
                            const active = data.filter((s: any) => s.habilitado);
                            setAvailableServices(active);
                            localStorage.setItem('luxius_session_servicios', JSON.stringify(data));
                        }
                    }
                } catch (e) {
                    console.warn("[Luxius-UI] API Offline para servicios.");
                }

                try {
                    const res = await fetch(`${API_URL}/vendedores`, { cache: 'no-store' });
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) {
                            setVendedores(data);
                            localStorage.setItem('luxius_session_vendedores', JSON.stringify(data));
                        }
                    }
                } catch (e) {
                    console.warn("[Luxius-UI] API Offline para vendedores.");
                }
            }
        };
        loadServicesAndVendors();
    }, [isOpen]);

    const isLonaOrNotVinilo = (matCode: string) => {
        if (!matCode) return false;
        const mat = getMateriales().find(m => String(m.codigo).toLowerCase() === String(matCode).toLowerCase());
        if (!mat) return false;
        const d = (mat.descripcion || '').toLowerCase();
        const c = String(mat.codigo || '').toLowerCase();
        // Incluimos front/back/banner como lona. Excluimos vinilo explícitamente.
        return d.includes('lona') || d.includes('front') || d.includes('back') || d.includes('banner') || (!d.includes('vinilo') && !c.includes('vin'));
    }

    const fileInputRef = useRef<HTMLInputElement>(null)
    const batchInputRef = useRef<HTMLInputElement>(null)
    const { register, handleSubmit, reset, setValue, watch, getValues } = useForm({
        defaultValues: (order || {
            status: currentDefaultStatus,
            copias: 1,
            calidad: '',
            prioridad: 0,
            fechaEntrega: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            demasiasConfig: { top: false, bottom: false, left: false, right: false }
        }) as any
    })


    // Watch fields for price calculation
    const watchedAncho = watch('ancho')
    const watchedAlto = watch('alto')
    const watchedCopias = watch('copias')
    const watchedMaterial = watch('material')
    const watchedCalidad = watch('calidad')
    const watchedClientId = watch('clienteId')

    useEffect(() => {
        const activeQuals = getCalidades().filter(c => c.habilitado !== false);
        if (activeQuals.length === 0) return;

        if (!watchedCalidad || (watchedCalidad as string).trim() === '' || activeQuals.length === 1) {
            if (activeQuals.length === 1) {
                if (watchedCalidad !== activeQuals[0].nombre) {
                    setValue('calidad', activeQuals[0].nombre);
                }
            } else if (watchedMaterial) {
                const mats = getMateriales();
                const mat = mats.find(m => m.codigo === watchedMaterial);
                if (mat?.calidad) {
                    const match = activeQuals.find(q => (q.nombre || '').toLowerCase().trim() === mat.calidad.toLowerCase().trim());
                    if (match) {
                        setValue('calidad', match.nombre);
                    }
                } else {
                    setValue('calidad', activeQuals[0].nombre);
                }
            } else if (!watchedCalidad) {
                setValue('calidad', activeQuals[0].nombre);
            }
        }
    }, [watchedMaterial, watchedCalidad, setValue])

    // Auto-select initial default material if empty
    useEffect(() => {
        if (isOpen && (!watchedMaterial || watchedMaterial.trim() === '')) {
            const mats = getMateriales().filter(m => m.habilitado !== false && !['tinta', 'solvente'].includes((m.tipo || '').toLowerCase()));
            if (mats.length > 0) {
                setValue('material', mats[0].codigo);
            }
        }
    }, [isOpen, watchedMaterial, setValue]);

    // Synchronize batch items material when global watchedMaterial changes or when items are empty
    useEffect(() => {
        if (watchedMaterial && batchItems.length > 0) {
            setBatchItems(prev => prev.map(item => item.material ? item : { ...item, material: watchedMaterial }));
        }
    }, [watchedMaterial, batchItems.length]);

    // Auto-select client for Client Role
    useEffect(() => {
        if (user?.role === 'cliente') {
            const c = getClientes().find(c =>
                c.nombre.toLowerCase().includes(user.name.toLowerCase()) ||
                user.name.toLowerCase().includes(c.nombre.toLowerCase())
            );
            if (c) {
                setValue('clienteId', c.id.toString(), { shouldValidate: true, shouldDirty: true });
            }
        }
    }, [user, setValue]);

    const calculateItemPriceDetailed = (materialCode: string, w: number, h: number, c: number, services?: Record<string, boolean>, clientIdParam?: string | number) => {
        const mat = getMateriales().find(m => m.codigo === materialCode)
        if (!mat || h <= 0) return {
            subtotal: 0,
            consumoEstimado: 0,
            bobinaAsignada: undefined as number | undefined,
            precioMl: undefined as number | undefined,
            precioDetalle: undefined as any
        }

        const { tipoCobro, bobinas, precioM2 } = mat
        let basePrice = 0
        let assignedBobina: number | undefined = undefined
        let appliedPriceMl: number | undefined = undefined
        let rotated = false
        let linearMeters = 0

        const cid = clientIdParam || watchedClientId
        const cliente = getClientes().find(cl => cl.id === parseInt(String(cid)))
        const specialPrice = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[materialCode] : null

        if (tipoCobro === 'ml') {
            if (!bobinas || bobinas.length === 0) {
                return {
                    subtotal: 0,
                    consumoEstimado: 0,
                    bobinaAsignada: undefined,
                    precioMl: undefined,
                    precioDetalle: undefined
                }
            }

            const safetyMargin = 0.01
            const availableWidths = bobinas
                .map((b: any) => ({ ...b, usefulWidth: b.ancho - safetyMargin }))
                .filter((b: any) => b.usefulWidth > 0)
                .sort((a: any, b: any) => a.usefulWidth - b.usefulWidth)

            let bestCost = Infinity

            // Original Orientation (width fits in roll useful width)
            for (const b of availableWidths) {
                if (w <= b.usefulWidth) {
                    const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${materialCode}:${b.ancho}`] : null;
                    const priceToUse = specialPriceWidth || specialPrice || b.precioML;
                    const cost = priceToUse * h * c
                    if (cost < bestCost) {
                        bestCost = cost
                        rotated = false
                        assignedBobina = b.ancho
                        appliedPriceMl = priceToUse
                        linearMeters = h * c
                    }
                    break
                }
            }

            // Rotated Orientation (height fits in roll useful width)
            for (const b of availableWidths) {
                if (h <= b.usefulWidth) {
                    const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${materialCode}:${b.ancho}`] : null;
                    const priceToUse = specialPriceWidth || specialPrice || b.precioML;
                    const cost = priceToUse * w * c
                    if (cost < bestCost) {
                        bestCost = cost
                        rotated = true
                        assignedBobina = b.ancho
                        appliedPriceMl = priceToUse
                        linearMeters = w * c
                    }
                    break
                }
            }

            // Fallback if item exceeds all widths: assign widest roll
            if (bestCost === Infinity && availableWidths.length > 0) {
                const widest = availableWidths[availableWidths.length - 1]
                const specialPriceWidth = (cliente && cliente.preciosEspeciales) ? cliente.preciosEspeciales[`${materialCode}:${widest.ancho}`] : null;
                const priceToUse = specialPriceWidth || specialPrice || widest.precioML;
                bestCost = priceToUse * h * c
                assignedBobina = widest.ancho
                appliedPriceMl = priceToUse
                linearMeters = h * c
            }

            basePrice = bestCost === Infinity ? 0 : Math.round(bestCost)
            ; (mat as any)._lastRotation = rotated
        } else {
            const priceToUse = specialPrice || precioM2 || 0
            basePrice = w > 0 ? Math.round(w * h * c * priceToUse) : 0
            linearMeters = 0
        }

        // Add services
        let servicesTotal = 0
        if (services) {
            Object.entries(services).forEach(([sId, active]) => {
                if (active) {
                    const s = availableServices.find(serv => String(serv.id) === sId)
                    if (s) {
                        const priceBase = parseFloat(s.precioBase as any) || 0
                        let multiplier = c
                        if (s.unidad === 'm2') {
                            multiplier = w * h * c
                        } else if (s.unidad === 'metro') {
                            const isRotated = (mat as any)._lastRotation || false
                            multiplier = (isRotated ? w : h) * c
                        }
                        servicesTotal += Math.round(priceBase * multiplier)
                    }
                }
            })
        }

        const subtotal = basePrice + servicesTotal

        return {
            subtotal,
            consumoEstimado: tipoCobro === 'ml' ? linearMeters : (w * h * c),
            bobinaAsignada: assignedBobina,
            precioMl: appliedPriceMl,
            precioDetalle: tipoCobro === 'ml' ? {
                tipoCobro: 'ml',
                bobinaAncho: assignedBobina,
                bobinaUsada: assignedBobina,
                precioML: appliedPriceMl,
                rotated,
                consumoML: linearMeters,
                costoBase: basePrice
            } : {
                tipoCobro: 'm2',
                precioM2: specialPrice || precioM2 || 0,
                costoBase: basePrice
            }
        }
    }

    const calculateItemPrice = (materialCode: string, w: number, h: number, c: number, services?: Record<string, boolean>) => {
        return calculateItemPriceDetailed(materialCode, w, h, c, services).subtotal
    }


    useEffect(() => {
        if (activeTab === 'unitario') {
            const w = parseFloat(watchedAncho) || 0
            const h = parseFloat(watchedAlto) || 0
            const c = parseInt(watchedCopias) || 1
            const services = watch('servicios')
            const price = calculateItemPrice(watchedMaterial, w, h, c, services)
            setValue('subtotal', price)
        } else if (activeTab === 'promos') {
            const c = parseInt(watchedCopias) || 1
            const currentCombo = getCombos().find(cb => cb.id === selectedComboId)
            if (currentCombo) {
                setValue('subtotal', Math.round((currentCombo.precioFinal || 0) * c))
            }
        }
    }, [watchedAncho, watchedAlto, watchedCopias, watchedMaterial, watch('servicios'), activeTab, selectedComboId, setValue])

    const handleSelectCombo = (combo: ComboData) => {
        if (selectedComboId === combo.id) {
            setSelectedComboId(null);
            return;
        }
        setSelectedComboId(combo.id);
        if (combo.materialCodigo) {
            setValue('material', combo.materialCodigo);
        }
        if (combo.ancho) {
            setValue('ancho', String(combo.ancho));
        }
        if (combo.alto) {
            setValue('alto', String(combo.alto));
        }
        const currentObs = getValues('observaciones') || '';
        const tag = `[PROMO: ${combo.nombre} (${combo.codigo})]`;
        if (!currentObs.includes(tag)) {
            setValue('observaciones', currentObs ? `${tag} ${currentObs}` : tag);
        }
        // Pre-activate included services in form
        if (combo.componentes && combo.componentes.length > 0) {
            const currentServices = getValues('servicios') || {};
            combo.componentes.forEach(comp => {
                if (comp.tipo === 'servicio') {
                    const matchedServ = getServicios().find(s => 
                        s.nombre.toLowerCase().includes(comp.nombre.toLowerCase()) || 
                        comp.nombre.toLowerCase().includes(s.nombre.toLowerCase())
                    );
                    if (matchedServ) {
                        currentServices[matchedServ.id] = true;
                    }
                }
            });
            setValue('servicios', currentServices);
        }
    };




    // ... (rest of code)
    useEffect(() => {
        const activeQuals = getCalidades().filter(c => c.habilitado !== false);
        const defaultCalidad = activeQuals.length > 0 ? activeQuals[0].nombre : '';

        if (order) {
            setActiveTab('unitario')
            reset(order)
            if (!order.calidad && defaultCalidad) {
                setValue('calidad', defaultCalidad);
            }
            if (order.archivos?.[0]) {
                const name = order.archivos[0]
                setFileName(name)
                // Recover from blobStore, imgMetadata thumbnailUrl or resolveMediaUrl
                const savedUrl = blobStore.get(name)
                const targetUrl = savedUrl || order.imgMetadata?.thumbnailUrl || resolveMediaUrl(name)
                if (targetUrl) setPreviewUrl(targetUrl)
                if (order.imgMetadata) setMetadata(order.imgMetadata)
            }
        } else {
            reset({
                clienteId: '',
                material: '',
                calidad: defaultCalidad,
                ancho: '',
                alto: '',
                copias: 1,
                notas: '',
                subtotal: 0,
                demasiasConfig: { top: false, bottom: false, left: false, right: false }
            })
            setFileName('')
            setPreviewUrl(null)
            setMetadata(null)
            setSelectedFile(null)
        }
    }, [order, reset, setValue])

    const getPdfThumbnail = async (_file: File | ArrayBuffer | null, pageNum: number = 1, widthCm?: number, heightCm?: number): Promise<string> => {
        const timeoutMs = 10000;
        try {
            if (_file) {
                try {
                    const renderPromise = (async () => {
                        const data = (_file instanceof File) ? await _file.arrayBuffer() : _file.slice(0);
                        const loadingTask = pdfjsLib.getDocument({ data });
                        const pdf = await loadingTask.promise;
                        const page = await pdf.getPage(Math.min(pageNum, pdf.numPages));

                        // High definition crisp resolution: target 1200px max dimension
                        const unscaledViewport = page.getViewport({ scale: 1.0 });
                        const targetMaxDim = 1200;
                        const scale = Math.max(1.5, Math.min(3.0, targetMaxDim / Math.max(unscaledViewport.width, unscaledViewport.height)));
                        const viewport = page.getViewport({ scale });

                        const renderCanvas = document.createElement('canvas');
                        renderCanvas.width = viewport.width;
                        renderCanvas.height = viewport.height;
                        const renderCtx = renderCanvas.getContext('2d');
                        if (renderCtx) {
                            // Ensure crisp white background
                            renderCtx.fillStyle = '#ffffff';
                            renderCtx.fillRect(0, 0, viewport.width, viewport.height);

                            const renderTask = page.render({
                                canvasContext: renderCtx,
                                viewport: viewport
                            });
                            await renderTask.promise;

                            // Return high-definition lightweight WebP
                            return renderCanvas.toDataURL('image/webp', 0.92);
                        }
                        return '';
                    })();

                    const timeoutPromise = new Promise<string>((resolve) =>
                        setTimeout(() => resolve(''), timeoutMs)
                    );

                    const result = await Promise.race([renderPromise, timeoutPromise]);
                    if (result) return result;
                } catch (pdfErr) {
                    console.warn("[Luxius-PDF] Falló renderizado real HD, usando fallback", pdfErr);
                }
            }

            // Fallback card if rendering failed
            const w = 400, h = 500;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return '';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(20, 20, w - 40, 120);
            ctx.fillStyle = '#e94560';
            ctx.font = 'bold 80px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('📄', w / 2, 110);
            ctx.fillStyle = '#333';
            ctx.font = 'bold 22px Arial';
            ctx.fillText(`Página ${pageNum}`, w / 2, 220);
            if (widthCm && heightCm) {
                ctx.fillStyle = '#666';
                ctx.font = '18px Arial';
                ctx.fillText(`${widthCm} × ${heightCm} cm`, w / 2, 260);
            }
            return canvas.toDataURL('image/webp', 0.85);
        } catch (e) {
            console.warn('[Luxius-PDF] Error en generación de miniatura:', e);
            return '';
        }
    };

    const getImageDPI = async (file: File): Promise<number> => {
        console.log(`[Luxius-Meta] Analizando DPI (Optimizado): ${file.name} (${file.size} bytes)`)
        try {
            // Only read the first 128KB for metadata
            const headerBlob = file.slice(0, 128 * 1024)
            const buffer = await headerBlob.arrayBuffer()
            const view = new DataView(buffer)
            const extension = file.name.split('.').pop()?.toLowerCase() || ''

            if (extension === 'jpg' || extension === 'jpeg') {
                const dpi = parseJPGDPI(view)
                console.log(`[Luxius-Meta] DPI JPG detectado: ${dpi}`)
                return dpi
            } else if (extension === 'png') {
                const dpi = parsePNGDPI(view)
                console.log(`[Luxius-Meta] DPI PNG detectado: ${dpi}`)
                return dpi
            } else if (extension === 'tif' || extension === 'tiff') {
                const tiffMeta = parseTIFFMetadata(view)
                console.log(`[Luxius-Meta] DPI TIFF detectado: ${tiffMeta.dpi}`)
                return tiffMeta.dpi
            }
        } catch (err) {
            console.error(`[Luxius-Meta] Error analizando DPI:`, err)
        }
        return 72 // Safer fallback for web/uncertain images than 300
    }

    const getImageColorMode = async (file: File): Promise<string> => {
        try {
            const headerBlob = file.slice(0, 128 * 1024)
            const buffer = await headerBlob.arrayBuffer()
            const view = new DataView(buffer)
            const extension = file.name.split('.').pop()?.toLowerCase() || ''
            if (extension === 'jpg' || extension === 'jpeg') return parseJPGColorMode(view)
            if (extension === 'png') return parsePNGColorMode(view)
            if (extension === 'tif' || extension === 'tiff') return parseTIFFMetadata(view).colorMode
        } catch (err) {
            console.warn('[Luxius-Meta] Error detectando modo de color:', err)
        }
        return 'CMYK' // Safer fallback for large format
    }

    const parseJPGDPI = (view: DataView): number => {
        const len = view.byteLength;
        let offset = 2; // Skip SOI (FF D8)

        while (offset < len - 4) {
            if (view.getUint8(offset) !== 0xFF) break;
            const marker = view.getUint8(offset + 1);
            const size = view.getUint16(offset + 2);

            // 1. APP0 (JFIF)
            if (marker === 0xE0 && size >= 16) {
                const identifier = String.fromCharCode(
                    view.getUint8(offset + 4), view.getUint8(offset + 5),
                    view.getUint8(offset + 6), view.getUint8(offset + 7),
                    view.getUint8(offset + 8)
                );
                if (identifier === 'JFIF\0') {
                    const unit = view.getUint8(offset + 13); // 1 = DPI, 2 = DPC
                    const xres = view.getUint16(offset + 14);
                    if (unit === 1 && xres > 0) return xres;
                    if (unit === 2 && xres > 0) return Math.round(xres * 2.54);
                }
            }

            // 2. APP13 (Photoshop / 8BIM)
            if (marker === 0xED && size >= 12) {
                const app13Data = new DataView(view.buffer, view.byteOffset + offset + 4, size - 2);
                let j = 0;
                while (j < app13Data.byteLength - 12) {
                    if (app13Data.getUint32(j) === 0x3842494D) { // '8BIM'
                        const id = app13Data.getUint16(j + 4);
                        const nameLen = app13Data.getUint8(j + 6);
                        const nameFieldLen = (nameLen + 1 + 1) & ~1; // Length byte + string + pad to even
                        const resourceSize = app13Data.getUint32(j + 6 + nameFieldLen);
                        if (id === 0x03ED) { // ResolutionInfo
                            const hRes = app13Data.getUint16(j + 6 + nameFieldLen + 4); // Skip size field, then 4 bytes of fixed point HRes
                            if (hRes > 0) return hRes;
                        }
                        j += 6 + nameFieldLen + 4 + resourceSize;
                        if (resourceSize % 2 !== 0) j++; // Pad to even
                    } else {
                        j++;
                    }
                }
            }

            // 3. APP1 (EXIF)
            if (marker === 0xE1 && size >= 20) {
                // Search for "Exif\0\0"
                if (view.getUint32(offset + 4) === 0x45786966) {
                    const startOfTiff = offset + 10;
                    const isLittleEndian = view.getUint16(startOfTiff) === 0x4949;
                    const ifd0Offset = isLittleEndian ? view.getUint32(startOfTiff + 4, true) : view.getUint32(startOfTiff + 4, false);
                    let ifdOffset = startOfTiff + ifd0Offset;

                    if (ifdOffset < view.byteLength - 2) {
                        const numEntries = isLittleEndian ? view.getUint16(ifdOffset, true) : view.getUint16(ifdOffset, false);
                        for (let entry = 0; entry < numEntries; entry++) {
                            const entryPos = ifdOffset + 2 + (entry * 12);
                            if (entryPos > view.byteLength - 12) break;
                            const tag = isLittleEndian ? view.getUint16(entryPos, true) : view.getUint16(entryPos, false);
                            if (tag === 0x011A) { // XResolution
                                const type = isLittleEndian ? view.getUint16(entryPos + 2, true) : view.getUint16(entryPos + 2, false);
                                const valOffset = isLittleEndian ? view.getUint32(entryPos + 8, true) : view.getUint32(entryPos + 8, false);

                                if (type === 5) { // RATIONAL
                                    const dataPos = startOfTiff + valOffset;
                                    if (dataPos < view.byteLength - 8) {
                                        const num = isLittleEndian ? view.getUint32(dataPos, true) : view.getUint32(dataPos, false);
                                        const den = isLittleEndian ? view.getUint32(dataPos + 4, true) : view.getUint32(dataPos + 4, false);
                                        if (den !== 0) return Math.round(num / den);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            offset += size + 2;
            if (offset > 128000) break; // Scan a larger portion for metadata
        }

        return 72; // Default for Large Format/Web if unknown
    }

    const parseJPGColorMode = (view: DataView): string => {
        const len = view.byteLength;
        let offset = 2;
        while (offset < len - 4) {
            if (view.getUint8(offset) !== 0xFF) break;
            const marker = view.getUint8(offset + 1);
            const size = view.getUint16(offset + 2);
            if (marker === 0xC0 || marker === 0xC2) { // SOF0 or SOF2
                const comps = view.getUint8(offset + 9);
                if (comps === 1) return 'Escala de grises';
                if (comps === 4) return 'CMYK';
                return 'RGB';
            }
            offset += size + 2;
        }
        return 'RGB';
    }

    const parsePNGDPI = (view: DataView): number => {
        // PNG Signature check
        if (view.byteLength < 8 || view.getUint32(0) !== 0x89504E47) return 72

        let i = 8
        while (i < view.byteLength - 12) {
            const length = view.getUint32(i)
            const chunkType = String.fromCharCode(
                view.getUint8(i + 4), view.getUint8(i + 5),
                view.getUint8(i + 6), view.getUint8(i + 7)
            )

            if (chunkType === 'pHYs') {
                const ppuX = view.getUint32(i + 8)
                const unit = view.getUint8(i + 16) // 1: meters
                if (unit === 1) return Math.round(ppuX * 0.0254)
            }

            i += length + 12
            if (i > 100000) break
        }
        return 72 // Standard web/large-format fallback
    }

    const parsePNGColorMode = (view: DataView): string => {
        if (view.byteLength < 26 || view.getUint32(0) !== 0x89504E47) return 'RGB'
        const colorType = view.getUint8(25)
        if (colorType === 0) return 'Escala de grises'
        if (colorType === 4) return 'Escala de grises + Alpha'
        return 'RGB'
    }

    const parseTIFFMetadata = (view: DataView) => {
        if (view.byteLength < 10) return { widthPx: 0, heightPx: 0, dpi: 300, thumbOffset: 0, thumbSize: 0, colorMode: 'CMYK' }
        const le = view.getUint16(0) === 0x4949;
        const magic = le ? view.getUint16(2, true) : view.getUint16(2, false);
        if (magic !== 42) return { widthPx: 0, heightPx: 0, dpi: 300, thumbOffset: 0, thumbSize: 0, colorMode: 'CMYK' }
        let off = le ? view.getUint32(4, true) : view.getUint32(4, false);
        let mW = 0, mH = 0, mD = 300, tO = 0, tS = 0, rU = 2, cM = 'CMYK';
        const visited = new Set<number>();

        const process = (o: number, d: number = 0) => {
            if (d > 5 || o <= 0 || o > view.byteLength - 2 || visited.has(o)) return 0;
            visited.add(o);
            const n = le ? view.getUint16(o, true) : view.getUint16(o, false);
            let cw = 0, ch = 0, cd = 0, cu = 2, subs: number[] = [];
            for (let i = 0; i < n; i++) {
                const p = o + 2 + (i * 12);
                if (p > view.byteLength - 12) break;
                const tag = le ? view.getUint16(p, true) : view.getUint16(p, false);
                const type = le ? view.getUint16(p + 2, true) : view.getUint16(p + 2, false);
                const cnt = le ? view.getUint32(p + 4, true) : view.getUint32(p + 4, false);
                const val = le ? view.getUint32(p + 8, true) : view.getUint32(p + 8, false);

                if (tag === 256) cw = type === 3 ? (le ? view.getUint16(p + 8, true) : view.getUint16(p + 8, false)) : val;
                else if (tag === 257) ch = type === 3 ? (le ? view.getUint16(p + 8, true) : view.getUint16(p + 8, false)) : val;
                else if (tag === 296) cu = le ? view.getUint16(p + 8, true) : view.getUint16(p + 8, false);
                else if (tag === 282 && (type === 5 || type === 10) && val < view.byteLength - 8) {
                    const num = le ? view.getUint32(val, true) : view.getUint32(val, false);
                    const den = le ? view.getUint32(val + 4, true) : view.getUint32(val + 4, false);
                    if (den !== 0) cd = Math.round(num / den);
                } else if (tag === 513) { if (tO === 0) tO = val; }
                else if (tag === 514) { if (tS === 0) tS = val; }
                else if (tag === 262) { // PhotometricInterpretation
                    const ph = type === 3 ? (le ? view.getUint16(p + 8, true) : view.getUint16(p + 8, false)) : val;
                    if (ph === 1) cM = 'Escala de grises';
                    else if (ph === 2) cM = 'RGB';
                    else if (ph === 5) cM = 'CMYK';
                }
                else if (tag === 330) {
                    if (cnt === 1) subs.push(val);
                    else if (cnt > 1 && val < view.byteLength - (cnt * 4)) {
                        for (let k = 0; k < cnt; k++) subs.push(le ? view.getUint32(val + k * 4, true) : view.getUint32(val + k * 4, false));
                    }
                } else if (tag === 34377) {
                    // Photoshop Resource Blocks (PhotoshopThumbnail can be here)
                    try {
                        let bOff = val;
                        while (bOff < val + cnt - 12) {
                            const sig = view.getUint32(bOff, false); // "8BIM"
                            if (sig !== 0x3842494D) break;
                            const id = view.getUint16(bOff + 4, false);
                            let nameLen = view.getUint8(bOff + 6);
                            let namePad = (nameLen + 1 + 1) & ~1; // Padded to even
                            const dataLen = view.getUint32(bOff + 6 + namePad, false);
                            const dataOff = bOff + 6 + namePad + 4;
                            if (id === 1033 || id === 1036) { // Thumbnail (1033=standard, 1036=newer)
                                const fmt = view.getUint32(dataOff, false);
                                if (fmt === 1) { // JPEG
                                    tO = dataOff + 28; // Skip header (28 bytes)
                                    tS = dataLen - 28;
                                    console.log(`[Luxius-TIFF] Photoshop Thumbnail (ID:${id}) encontrado en ${tO} (${tS} bytes)`);
                                }
                            }
                            bOff = dataOff + ((dataLen + 1) & ~1); // Padded to even
                        }
                    } catch (e) { console.warn("[Luxius-TIFF] Error parseando Photoshop Resource Block", e); }
                }
            }
            if (cw > mW) { mW = cw; mH = ch; mD = cd || mD; rU = cu; }
            if (tO === 0) for (const s of subs) { process(s, d + 1); if (tO > 0) break; }
            const nx = o + 2 + (n * 12);
            return (nx < view.byteLength - 4) ? (le ? view.getUint32(nx, true) : view.getUint32(nx, false)) : 0;
        };
        for (let i = 0; i < 4 && off > 0; i++) off = process(off, 0);
        if (rU === 3 && mD > 0) mD = Math.round(mD * 2.54);
        return { widthPx: mW, heightPx: mH, dpi: mD || 300, thumbOffset: tO, thumbSize: tS, colorMode: cM };
    }

    const parseEPSMetadata = async (file: File) => {
        let w = 0, h = 0, d = 300, thumb = "";
        try {
            const buf = await file.slice(0, 1024 * 1024).arrayBuffer();
            const view = new DataView(buf);
            if (view.byteLength > 30 && view.getUint32(0, true) === 0xC5D0D3C6) {
                const to = view.getUint32(20, true), ts = view.getUint32(24, true);
                if (to > 0 && to + ts <= file.size) {
                    const tBlob = file.slice(to, to + ts);
                    thumb = await new Promise(r => { const rd = new FileReader(); rd.onloadend = () => r(rd.result as string); rd.readAsDataURL(tBlob); });
                }
            }
            const txt = new TextDecoder().decode(new Uint8Array(buf));
            const bb = txt.match(/%%HiResBoundingBox:\s*([\d.]+)\s*([\d.]+)\s*([\d.]+)\s*([\d.]+)/i) || txt.match(/%%BoundingBox:\s*([\d]+)\s*([\d]+)\s*([\d]+)\s*([\d]+)/i);
            if (bb) {
                w = Math.round(((parseFloat(bb[3]) - parseFloat(bb[1])) * 2.54 / 72) * 10) / 10;
                h = Math.round(((parseFloat(bb[4]) - parseFloat(bb[2])) * 2.54 / 72) * 10) / 10;
            }
            const res = txt.match(/<tiff:XResolution>([\d./]+)<\/tiff:XResolution>/i) || txt.match(/tiff:XResolution="([\d./]+)"/i);
            if (res) {
                const raw = res[1];
                d = Math.round(raw.includes('/') ? (parseFloat(raw.split('/')[0]) / parseFloat(raw.split('/')[1])) : parseFloat(raw));
            }
        } catch (e) { }

        if (!thumb) {
            thumb = generateVectorCard('EPS', file.name, { width: w, height: h }, d);
        }

        return { width: w, height: h, dpi: d, thumbnailUrl: thumb };
    }

    const extractMetadata = async (file: File, existingUrl?: string, pageNum: number = 1, cachedBuffer?: ArrayBuffer): Promise<BatchItem['metadata']> => {
        const extension = file.name.split('.').pop()?.toUpperCase() || 'N/A'
        let pageCount = 0
        let thumbnailUrl = undefined
        let widthCm = 0
        let heightCm = 0
        let dpi = 72
        let colorMode = 'CMYK'
        console.log(`[Luxius-Meta] Iniciando extracción: ${file.name} (Pág ${pageNum})`);

        try {
            if (extension === 'PDF') {
                const arrayBuffer = cachedBuffer || await file.arrayBuffer()

                // 1. PDF-LIB with Increased Timeout
                try {
                    const loadPromise = PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                    const pdfDoc = await Promise.race([
                        loadPromise,
                        new Promise<null>((_, rej) => setTimeout(() => rej(new Error("Timeout PDF-LIB")), 8000))
                    ]);
                    if (pdfDoc) {
                        pageCount = pdfDoc.getPageCount()
                        const pageIdx = Math.min(pageNum - 1, Math.max(0, pageCount - 1))
                        const pdfPage = pdfDoc.getPage(pageIdx)
                        const { width, height } = pdfPage.getSize()
                        widthCm = Math.round((width * 2.54 / 72) * 10) / 10
                        heightCm = Math.round((height * 2.54 / 72) * 10) / 10
                    }
                } catch (le) { console.warn("[Luxius-Meta] PDF-LIB falló o tomó demasiado tiempo", le); }

                // 2. DPI/Color from XMP
                try {
                    const decoder = new TextDecoder()
                    const chunk = new Uint8Array(arrayBuffer.slice(0, 1024 * 500))
                    const fullText = decoder.decode(chunk)
                    const xResMatch = fullText.match(/<tiff:XResolution>([\d./]+)<\/tiff:XResolution>/i) ||
                        fullText.match(/tiff:XResolution="([\d./]+)"/i);
                    if (xResMatch) {
                        const raw = xResMatch[1];
                        let val = raw.includes('/') ? (parseFloat(raw.split('/')[0]) / parseFloat(raw.split('/')[1])) : parseFloat(raw);
                        dpi = Math.round(val < 100 ? val * 2.54 : val);
                    }
                    if (fullText.includes('ColorMode>3') || fullText.includes('/DeviceRGB')) colorMode = 'RGB';
                    else if (fullText.includes('ColorMode>4') || fullText.includes('/DeviceCMYK')) colorMode = 'CMYK';
                } catch (e) { }

                // 2b. PDFJS Image Object & Viewport Effective DPI calculation
                try {
                    await workerReady;
                    const pdfJsDoc = await Promise.race([
                        pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise,
                        new Promise<null>((_, rej) => setTimeout(() => rej(new Error("Timeout PDFJS")), 5000))
                    ]);
                    if (pdfJsDoc) {
                        const pdfPage = await pdfJsDoc.getPage(Math.min(pageNum, pdfJsDoc.numPages));
                        const viewport = pdfPage.getViewport({ scale: 1.0 });

                        let detectedDpi = 0;
                        const ops = await pdfPage.getOperatorList();

                        // Track the Current Transformation Matrix (CTM) to calculate real image DPI.
                        // In PDFs, images are placed via: save → transform [a,b,c,d,e,f] → paintImage → restore
                        // The 'a' component = image width in PDF points, 'd' = height in points.
                        // Real DPI = imagePixels / (placementPoints / 72)
                        let lastTransformArgs: number[] | null = null;
                        for (let k = 0; k < ops.fnArray.length; k++) {
                            const fn = ops.fnArray[k];

                            // Track the most recent transform before a paintImage operation
                            if (fn === pdfjsLib.OPS.transform) {
                                lastTransformArgs = ops.argsArray[k] as number[];
                            }

                            if (
                                fn === pdfjsLib.OPS.paintImageXObject ||
                                fn === pdfjsLib.OPS.paintInlineImageXObject ||
                                fn === pdfjsLib.OPS.paintImageXObjectRepeat
                            ) {
                                const imgName = ops.argsArray[k][0];
                                try {
                                    let imgObj = null;
                                    if (pdfPage.objs.has(imgName)) imgObj = pdfPage.objs.get(imgName);
                                    else if (pdfPage.commonObjs.has(imgName)) imgObj = pdfPage.commonObjs.get(imgName);

                                    if (imgObj && imgObj.width && imgObj.height) {
                                        let calcDpi = 0;

                                        if (lastTransformArgs && lastTransformArgs.length >= 4) {
                                            // CTM: [a, b, c, d, e, f]
                                            // a = horizontal scale (width in points), d = vertical scale (height in points)
                                            // For rotated images, width might be in 'b'/'c' components
                                            const a = Math.abs(lastTransformArgs[0]);
                                            const b = Math.abs(lastTransformArgs[1]);
                                            const c = Math.abs(lastTransformArgs[2]);
                                            const d = Math.abs(lastTransformArgs[3]);

                                            // Effective placement size in points (handle rotation)
                                            const placementWidthPts = Math.max(a, b) || viewport.width;
                                            const placementHeightPts = Math.max(c, d) || viewport.height;

                                            const placementWidthInches = placementWidthPts / 72;
                                            const placementHeightInches = placementHeightPts / 72;

                                            const dpiX = Math.round(imgObj.width / placementWidthInches);
                                            const dpiY = Math.round(imgObj.height / placementHeightInches);
                                            calcDpi = Math.max(dpiX, dpiY);
                                            console.log(`[Luxius-Meta] PDF Image CTM: a=${a.toFixed(1)} d=${d.toFixed(1)} → img ${imgObj.width}×${imgObj.height}px → ${calcDpi} DPI`);
                                        } else {
                                            // Fallback: use full page dimensions (less accurate)
                                            const pageWidthInches = viewport.width / 72;
                                            const pageHeightInches = viewport.height / 72;
                                            const dpiX = Math.round(imgObj.width / pageWidthInches);
                                            const dpiY = Math.round(imgObj.height / pageHeightInches);
                                            calcDpi = Math.max(dpiX, dpiY);
                                        }

                                        if (calcDpi > detectedDpi) detectedDpi = calcDpi;
                                    }
                                } catch (e) { }
                                lastTransformArgs = null; // Reset after consuming
                            }
                        }

                        if (detectedDpi > 0) {
                            dpi = detectedDpi;
                            console.log(`[Luxius-Meta] DPI real de imagen en PDF: ${dpi} DPI`);
                        }
                    }
                } catch (pdfJsErr) {
                    console.warn("[Luxius-Meta] Error al calcular DPI en PDFJS", pdfJsErr);
                }

                // 3. Page Thumbnail (Lazy call)
                try {
                    thumbnailUrl = await getPdfThumbnail(arrayBuffer, pageNum, widthCm || 21, heightCm || 29)
                } catch (e) { }
            } else if (extension === 'EPS') {
                const eps = await parseEPSMetadata(file);
                widthCm = eps.width; heightCm = eps.height; dpi = eps.dpi; thumbnailUrl = eps.thumbnailUrl;
            } else if (extension === 'TIF' || extension === 'TIFF') {
                const buffer = cachedBuffer || await file.arrayBuffer()
                const tiff = parseTIFFMetadata(new DataView(buffer))
                if (tiff.widthPx > 0) {
                    widthCm = Math.round(tiff.widthPx * 2.54 / tiff.dpi * 10) / 10
                    heightCm = Math.round(tiff.heightPx * 2.54 / tiff.dpi * 10) / 10
                    dpi = tiff.dpi; colorMode = tiff.colorMode;
                }
                if (tiff.thumbOffset > 0 && tiff.thumbSize > 0) {
                    try {
                        const thumbBlob = new Blob([buffer.slice(tiff.thumbOffset, tiff.thumbOffset + tiff.thumbSize)], { type: 'image/jpeg' });
                        thumbnailUrl = await new Promise<string>(r => { const rd = new FileReader(); rd.onloadend = () => r(rd.result as string); rd.readAsDataURL(thumbBlob); });
                    } catch (e) { }
                }
            } else if (extension === 'CDR') {
                try {
                    thumbnailUrl = (await extractCdrThumbnail(cachedBuffer || file)) || '';
                } catch (e) { }
            } else {
                const meta = await new Promise<any>((resolve) => {
                    const img = new Image(); const url = existingUrl || URL.createObjectURL(file);
                    img.onload = async () => {
                        const d = await getImageDPI(file); const cm = await getImageColorMode(file);
                        resolve({ width: Math.round(img.width * 2.54 / d * 10) / 10, height: Math.round(img.height * 2.54 / d * 10) / 10, dpi: d, colorMode: cm });
                        if (!existingUrl) URL.revokeObjectURL(url);
                    }
                    img.onerror = () => { resolve({ width: 0, height: 0, dpi: 72, colorMode: 'RGB' }); if (!existingUrl) URL.revokeObjectURL(url); }
                    img.src = url;
                })
                widthCm = meta.width; heightCm = meta.height; dpi = meta.dpi; colorMode = meta.colorMode;
            }
        } catch (err) { console.error('[Luxius-Meta] Error fatal:', err); }

        return {
            width: widthCm || 0, height: heightCm || 0,
            dpi: dpi || 72, format: extension, colorMode: colorMode || 'CMYK',
            pageCount, thumbnailUrl
        };
    }

    const handleCloudImport = async () => {
        if (!cloudUrl) return;
        setIsCloudImporting(true);
        const isWeTransfer = cloudUrl.includes('we.tl') || cloudUrl.includes('wetransfer.com');
        setCloudImportStatus(isWeTransfer ? 'Conectando con WeTransfer...' : 'Conectando con Google Drive...');
        try {
            let activeBaseUrl = API_URL.replace(/\/api\/?$/, '');
            let res: Response | null = null;

            try {
                res = await fetch(`${API_URL}/import-cloud`, {
                    method: 'POST',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ url: cloudUrl })
                });
            } catch (fetchErr: any) {
                // If local backend is down or unreachable, seamlessly fallback to the Render cloud backend
                if (API_URL.includes('localhost') || API_URL.includes('127.0.0.1')) {
                    console.warn('[CloudImport] Servidor local no disponible, intentando servidor en la nube de respaldo...');
                    setCloudImportStatus('Conectando con servidor en la nube...');
                    activeBaseUrl = 'https://luxius-backend.onrender.com';
                    res = await fetch(`https://luxius-backend.onrender.com/api/import-cloud`, {
                        method: 'POST',
                        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({ url: cloudUrl })
                    });
                } else {
                    throw fetchErr;
                }
            }

            if (!res) throw new Error('No se pudo establecer conexión con el servicio de importación.');

            let data;
            try {
                data = await res.json();
            } catch (e) {
                throw new Error("No se pudo procesar la respuesta del servidor");
            }
            if (!res.ok) throw new Error(data?.error || 'Error al importar desde la nube');

            if (data.status === 'success' && data.files.length > 0) {
                let targetTab = activeTab;
                if ((targetTab === 'unitario' || targetTab === 'promos') && data.files.length > 1) {
                    targetTab = 'lote';
                    setActiveTab('lote');
                }

                if (targetTab === 'unitario' || targetTab === 'promos') {
                    setCloudImportStatus('Descargando archivo (1/1)...');
                    const fileInfo = data.files[0];
                    const fileUrl = fileInfo.tempUrl.startsWith('http') ? fileInfo.tempUrl : `${activeBaseUrl}${fileInfo.tempUrl}`;
                    const blobRes = await fetch(fileUrl);
                    if (!blobRes.ok) throw new Error('Error al descargar el archivo del servidor temporal');
                    const blob = await blobRes.blob();
                    const file = new File([blob], fileInfo.originalName, { type: blob.type || 'application/octet-stream' });
                    handleFileChange({ target: { files: [file] } } as any);
                } else if (targetTab === 'lote') {
                    for (let i = 0; i < data.files.length; i++) {
                        const fileInfo = data.files[i];
                        setCloudImportStatus(`Descargando archivo (${i + 1}/${data.files.length})...`);
                        try {
                            const fileUrl = fileInfo.tempUrl.startsWith('http') ? fileInfo.tempUrl : `${activeBaseUrl}${fileInfo.tempUrl}`;
                            const blobRes = await fetch(fileUrl);
                            if (!blobRes.ok) continue;
                            const blob = await blobRes.blob();
                            const file = new File([blob], fileInfo.originalName, { type: blob.type || 'application/octet-stream' });

                            const placeholder: BatchItem = {
                                id: Math.random().toString(36).substr(2, 9),
                                file: file,
                                fileName: file.name,
                                previewUrl: '',
                                metadata: { width: 0, height: 0, dpi: 72, format: '', colorMode: '' },
                                confirmed: true,
                                copias: 1,
                                material: watchedMaterial || ''
                            };
                            setBatchItems(prev => [...prev, placeholder]);
                            
                            const url = URL.createObjectURL(file);
                            blobStore.set(file.name, url);
                            extractMetadata(file, url).then(meta => {
                                setBatchItems(prev => prev.map(it => it.id === placeholder.id ? {
                                    ...it,
                                    previewUrl: meta.thumbnailUrl || url,
                                    metadata: meta,
                                    confirmed: true
                                } : it));
                            });
                        } catch (e) {
                            console.error("Error importando archivo del lote", fileInfo, e);
                        }
                    }
                }
                
                setShowCloudInput(false);
                setCloudUrl('');
            }
        } catch (err: any) {
            console.error("Cloud Import Error:", err);
            const msg = err?.message || '';
            if (msg.includes('Failed to fetch') || err?.name === 'TypeError') {
                alert("⚠️ Error de conexión con el servidor de importación en la nube. El servicio se está iniciando o la red tardó en responder. Por favor, reintenta en unos segundos.");
            } else {
                alert(`Error al importar: ${msg}`);
            }
        } finally {
            setIsCloudImporting(false);
            setCloudImportStatus('');
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log(`[Luxius-UI] Evento handleFileChange disparado`);
        const file = e.target.files?.[0]
        if (file) {
            setExtracting(true)
            const ext = (file.name.split('.').pop()?.toUpperCase() || '');

            // Pre-check multi-page PDF to explode and redirect to Batch Upload
            if (ext === 'PDF') {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    let pageCount = 1;
                    try {
                        const pdfDoc = await PDFDocument.load(arrayBuffer.slice(0), { ignoreEncryption: true });
                        pageCount = pdfDoc.getPageCount();
                    } catch {
                        try {
                            const pjDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
                            pageCount = pjDoc.numPages;
                        } catch {}
                    }

                    if (pageCount > 1) {
                        console.log(`[Luxius-UI] PDF multipágina detectado (${pageCount} páginas). Redirigiendo automáticamente a Carga por Lote...`);
                        setSelectedFile(null);
                        setFileName('');
                        setPreviewUrl(null);
                        setMetadata(null);
                        if (e.target) e.target.value = '';
                        setActiveTab('lote');
                        await processBatchFiles([file]);
                        return;
                    }
                } catch (e) {
                    console.warn('[Luxius-UI] Error pre-verificando páginas PDF:', e);
                }
            }

            setSelectedFile(file)
            setFileName(file.name)
            const url = URL.createObjectURL(file)
            blobStore.set(file.name, url)
            setPreviewUrl(url)

            try {
                const meta = await extractMetadata(file, url)
                if (meta.pageCount > 1) {
                    console.log(`[Luxius-UI] PDF multipágina detectado en extractMetadata (${meta.pageCount} páginas). Redirigiendo a Carga por Lote...`);
                    setSelectedFile(null);
                    setFileName('');
                    setPreviewUrl(null);
                    setMetadata(null);
                    if (e.target) e.target.value = '';
                    setActiveTab('lote');
                    await processBatchFiles([file]);
                    return;
                }

                setMetadata(meta)
                if (meta.width > 0) {
                    setValue('ancho', (meta.width / 100).toFixed(2))
                    setValue('alto', (meta.height / 100).toFixed(2))
                }
                if (meta.thumbnailUrl) {
                    console.log(`[Luxius-Meta] Aplicando miniatura TIFF/PDF a previsualización: ${meta.thumbnailUrl.substring(0, 50)}...`)
                    setPreviewUrl(meta.thumbnailUrl)
                } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                    // Generate a visual fallback thumbnail for PDFs without a rendered preview
                    try {
                        const fallbackThumb = await getPdfThumbnail(file, 1, meta.width ? meta.width : 21, meta.height ? meta.height : 29.7);
                        if (fallbackThumb) {
                            setPreviewUrl(fallbackThumb);
                        } else {
                            setPreviewUrl(null);
                        }
                    } catch {
                        setPreviewUrl(null);
                    }
                }
            } catch (err) {
                console.error('[Luxius-Meta] Error fatal:', err)
            } finally {
                setExtracting(false)
            }
        }
    }

    // FIX: Reset demasias if material changes to incompatible type
    useEffect(() => {
        if (watchedMaterial && !isLonaOrNotVinilo(watchedMaterial)) {
            const currentDemasias = getValues('demasiasConfig');
            if (currentDemasias && Object.values(currentDemasias).some(v => v)) {
                setValue('demasiasConfig', { top: false, bottom: false, left: false, right: false });
            }
        }
    }, [watchedMaterial, setValue, getValues]);


    const processBatchFiles = async (files: File[]) => {
        if (files.length === 0) return;
        console.log(`[Luxius-Batch] Iniciando carga de ${files.length} archivos.`);
        setExtracting(true);

        for (const file of files) {
            const fileId = Math.random().toString(36).substring(2, 9);
            const ext = (file.name.split('.').pop()?.toUpperCase() || '');
            const url = URL.createObjectURL(file);
            blobStore.set(file.name, url);

            const availableMats = getMateriales().filter(m => m.habilitado !== false && !['tinta', 'solvente'].includes((m.tipo || '').toLowerCase()));
            const currentMat = getValues('material');
            const initialMat = currentMat || watchedMaterial || (availableMats.length > 0 ? availableMats[0].codigo : '');

            // STEP 1: ADD INSTANT PLACEHOLDER CARD
            const placeholder: BatchItem = {
                id: fileId,
                file: file,
                fileName: file.name,
                previewUrl: '',
                metadata: { width: 0, height: 0, dpi: 72, format: ext, colorMode: 'Detectando...', pageCount: 0 },
                confirmed: true,
                copias: 1,
                material: initialMat,
                demasiasConfig: { top: false, bottom: false, left: false, right: false },
                servicios: {}
            };
            setBatchItems(prev => [...prev, placeholder]);

            // STEP 2: BACKGROUND PROCESSING (IIFE to decouple from loop)
            (async () => {
                try {
                    // CRITICAL: Read the file ONCE and keep a MASTER copy that is NEVER
                    // passed directly to any library. PDFJS v5 transfers/neuters ArrayBuffers,
                    // so every downstream consumer gets a fresh .slice(0) copy.
                    let masterBuffer: ArrayBuffer | undefined = undefined;
                    if (ext === 'PDF') {
                        masterBuffer = await file.arrayBuffer();
                        console.log(`[Luxius-DEBUG] masterBuffer creado: ${masterBuffer.byteLength} bytes para ${file.name}`);
                    }

                    // INITIAL DETECTION — pass a COPY of the buffer
                    const meta = await Promise.race([
                        extractMetadata(file, url, 1, masterBuffer ? masterBuffer.slice(0) : undefined),
                        new Promise<BatchItem['metadata']>(r => setTimeout(() => r({ width: 0, height: 0, dpi: 72, format: ext, colorMode: 'RGB', pageCount: 0 }), 12000))
                    ]);
                    let realPageCount = meta.pageCount || 1;
                    console.log(`[Luxius-DEBUG] extractMetadata retornó pageCount=${meta.pageCount}, realPageCount=${realPageCount} para ${file.name}`);

                    // MULTI-ENGINE RE-CHECK for PDFs — always use copies from masterBuffer
                    if (ext === 'PDF' && masterBuffer && masterBuffer.byteLength > 0) {
                        // A. PDFJS with Timeout — fresh copy
                        try {
                            const pdfjsDoc = await Promise.race([
                                pdfjsLib.getDocument({ data: masterBuffer.slice(0) }).promise,
                                new Promise<null>((_, rej) => setTimeout(() => rej(new Error("Timeout PDFJS")), 8000))
                            ]);
                            if (pdfjsDoc && pdfjsDoc.numPages > realPageCount) {
                                console.warn(`[Luxius-DEBUG] PDFJS detectó ${pdfjsDoc.numPages} vs PDF-LIB ${realPageCount}. Actualizando.`);
                                realPageCount = pdfjsDoc.numPages;
                            }
                        } catch (e) { console.warn("[Luxius-DEBUG] Backup PDFJS falló o timed out", e); }

                        // B. RAW SCAN LAYER — fresh copy for TextDecoder
                        if (realPageCount === 1) {
                            try {
                                const decoder = new TextDecoder();
                                const scanCopy = masterBuffer.slice(0, Math.min(masterBuffer.byteLength, 2097152));
                                const text = decoder.decode(new Uint8Array(scanCopy));

                                const pageMatches = text.match(/\/Type\s*\/Page(?!s)\b/gi);
                                if (pageMatches && pageMatches.length > 1) {
                                    console.warn(`[Luxius-DEBUG] RAW Engine detectó ${pageMatches.length} marcas de página.`);
                                    realPageCount = pageMatches.length;
                                } else {
                                    const countMatch = text.match(/\/Count\s+(\d+)/);
                                    if (countMatch && parseInt(countMatch[1]) > 1) {
                                        console.warn(`[Luxius-DEBUG] RAW Catalog detectó /Count ${countMatch[1]}`);
                                        realPageCount = parseInt(countMatch[1]);
                                    }
                                }
                            } catch (e) { console.warn("[Luxius-DEBUG] RAW Engine error", e); }
                        }
                    }

                    // EXPLOSION LOGIC — use fresh copies from masterBuffer
                    if (realPageCount > 1 && ext === 'PDF' && masterBuffer && masterBuffer.byteLength > 0) {
                        console.log(`[Luxius-DEBUG] EXPLOTANDO EN BG: ${file.name} -> ${realPageCount} páginas.`);

                        // INHERITANCE: Read from REF to get latest user input
                        const mother = batchItemsRef.current.find(it => it.id === fileId);
                        const inheritedMaterial = mother?.material || initialMat;
                        const inheritedCopias = mother?.copias || 1;
                        const inheritedServicios = mother?.servicios || {};

                        // Remove mother card
                        setBatchItems(prev => prev.filter(it => it.id !== fileId));

                        let srcDoc: PDFDocument | null = null;
                        try {
                            srcDoc = await PDFDocument.load(masterBuffer.slice(0), { ignoreEncryption: true });
                        } catch (e) { console.error("[Luxius-DEBUG] PDF-LIB no pudo cargar base para explosión.", e); }

                        for (let p = 1; p <= realPageCount; p++) {
                            const itemId = Math.random().toString(36).substring(2, 9);
                            const pageName = `${file.name.replace(/\.pdf$/i, '')}_P${p}.pdf`;

                            // 1. Extract page p into a single-page PDF File first
                            let pageFile: File | null = null;
                            let wCm = meta.width || 21.0;
                            let hCm = meta.height || 29.7;

                            if (srcDoc && p <= srcDoc.getPageCount()) {
                                try {
                                    const newDoc = await PDFDocument.create();
                                    const [copiedPage] = await newDoc.copyPages(srcDoc, [p - 1]);
                                    newDoc.addPage(copiedPage);
                                    const pdfBytes = await newDoc.save();
                                    pageFile = new File([pdfBytes], pageName, { type: 'application/pdf' });
                                    const pdfPage = srcDoc.getPage(p - 1);
                                    const { width: pW, height: pH } = pdfPage.getSize();
                                    wCm = parseFloat((pW * 2.54 / 72).toFixed(2));
                                    hCm = parseFloat((pH * 2.54 / 72).toFixed(2));
                                } catch (e) {
                                    console.error(`[Luxius-DEBUG] Error extrayendo página ${p} con PDF-LIB:`, e);
                                }
                            }

                            // Fallback Resurrection via PDFJS if PDF-LIB extraction failed
                            if (!pageFile) {
                                try {
                                    const pjDoc = await pdfjsLib.getDocument({ data: masterBuffer.slice(0) }).promise;
                                    if (p <= pjDoc.numPages) {
                                        const page = await pjDoc.getPage(p);
                                        const vp = page.getViewport({ scale: 2.0 });
                                        const can = document.createElement('canvas');
                                        const ctx = can.getContext('2d');
                                        if (ctx) {
                                            can.height = vp.height; can.width = vp.width;
                                            await page.render({ canvasContext: ctx, viewport: vp }).promise;
                                            const resDoc = await PDFDocument.create();
                                            const resImg = await resDoc.embedPng(can.toDataURL('image/png'));
                                            const resP = resDoc.addPage([resImg.width, resImg.height]);
                                            resP.drawImage(resImg, { x: 0, y: 0, width: resImg.width, height: resImg.height });
                                            const pdfBytes = await resDoc.save();
                                            pageFile = new File([pdfBytes], pageName, { type: 'application/pdf' });
                                            wCm = Math.round((vp.width * 2.54 / (72 * 2)) * 10) / 10;
                                            hCm = Math.round((vp.height * 2.54 / (72 * 2)) * 10) / 10;
                                        }
                                    }
                                } catch (e) {
                                    console.error(`[Luxius-DEBUG] Fallback PDFJS error P${p}:`, e);
                                }
                            }

                            if (pageFile) {
                                const pageUrl = URL.createObjectURL(pageFile);
                                blobStore.set(pageName, pageUrl);

                                // Render real high-res thumbnail for this exact page
                                const thumb = await getPdfThumbnail(masterBuffer.slice(0), p, wCm, hCm);

                                const pageItem: BatchItem = {
                                    id: itemId,
                                    file: pageFile,
                                    fileName: pageName,
                                    previewUrl: thumb || pageUrl,
                                    metadata: {
                                        width: wCm,
                                        height: hCm,
                                        dpi: meta.dpi || 72,
                                        format: 'PDF',
                                        colorMode: meta.colorMode || 'CMYK',
                                        thumbnailUrl: thumb,
                                        pageCount: 1
                                    },
                                    confirmed: true,
                                    copias: inheritedCopias,
                                    material: inheritedMaterial,
                                    demasiasConfig: { top: false, bottom: false, left: false, right: false },
                                    servicios: inheritedServicios
                                };

                                setBatchItems(prev => [...prev, pageItem]);
                            } else {
                                console.error(`[Luxius-DEBUG] No se pudo crear el archivo para la página ${p}`);
                            }

                            // Small pause between pages to keep UI responsive
                            await new Promise(r => setTimeout(r, 20));
                        }
                    } else {
                        // Update single file placeholder
                        setBatchItems(prev => prev.map(it => it.id === fileId ? {
                            ...it,
                            previewUrl: meta.thumbnailUrl || (ext === 'PDF' ? '' : url),
                            metadata: meta
                        } : it));

                        if (ext === 'PDF' && !meta.thumbnailUrl && masterBuffer) {
                            const thumb = await getPdfThumbnail(masterBuffer.slice(0), 1, meta.width || 21, meta.height || 29.7);
                            if (thumb) {
                                setBatchItems(prev => prev.map(it => it.id === fileId ? {
                                    ...it, previewUrl: thumb, metadata: { ...it.metadata, thumbnailUrl: thumb }
                                } : it));
                            }
                        }
                    }
                } catch (err) {
                    console.error(`[Luxius-DEBUG] Error procesando archivo: ${file.name}`, err);
                }
            })();
        }
        setTimeout(() => setExtracting(false), 800);
    }

    const handleBatchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return;
        await processBatchFiles(files);
        if (batchInputRef.current) batchInputRef.current.value = '';
    }


    const isBatchValid = () => {
        const confirmedItems = batchItems.filter(i => i.confirmed !== false);
        if (confirmedItems.length === 0) return false;
        // Check for basic data AND valid dimensions
        return confirmedItems.every(i =>
            i.copias > 0 &&
            Boolean(i.material) &&
            i.metadata.width > 0 &&
            i.metadata.height > 0
        );
    }

    const onSubmit = async (data: any) => {
        // Manual validation for non-client roles
        if (user?.role !== 'cliente' && !data.clienteId) {
            alert('Por favor seleccione un cliente');
            return;
        }

        // FIX: Inject Client ID for 'cliente' role if missing
        if (user?.role === 'cliente' && !data.clienteId) {
            const c = getClientes().find(c =>
                c.nombre.toLowerCase().includes(user.name.toLowerCase()) ||
                user.name.toLowerCase().includes(c.nombre.toLowerCase())
            );
            if (c) {
                data.clienteId = c.id;
            } else {
                // Auto-create client profile if not found
                console.log(`[Auto-Client] Creando perfil de cliente para: ${user.name}`);
                const newClient = await saveCliente({
                    nombre: user.name,
                    empresa: 'Particular (Web)',
                    email: (user as any).email || '',
                    responsable: user.username,
                    habilitado: true,
                    fechaInicio: new Date().toISOString().split('T')[0]
                });
                data.clienteId = newClient.id;
            }
        }

        const clientesList = getClientes()
        const cliente = clientesList.find(c => c.id === parseInt(data.clienteId))

        try {
            if (activeTab === 'lote') {
                const confirmedItems = batchItems.filter(i => i.confirmed !== false)
                if (confirmedItems.length === 0) {
                    alert('No hay archivos seleccionados para guardar')
                    return
                }

                // Specific validation feedback
                const invalidItems = confirmedItems.filter(i => i.copias <= 0 || !i.material);
                const incompleteItems = confirmedItems.filter(i => i.metadata.width <= 0 || i.metadata.height <= 0);

                if (invalidItems.length > 0) {
                    alert(`Por favor complete Cantidad y Material para: ${invalidItems.map(i => i.fileName).join(', ')}`);
                    return;
                }
                if (incompleteItems.length > 0) {
                    alert(`Hay archivos que aún se están procesando (Dimensiones 0x0). Espere un momento: ${incompleteItems.map(i => i.fileName).join(', ')}`);
                    return;
                }

                setSaving(true)
                setSaveProgress({ current: 0, total: confirmedItems.length, errorCount: 0 })
                const saveResults = []

                const batchId = `lote_${Date.now()}`
                const batchName = (data.nombreTarea || '').trim()

                try {
                    for (let i = 0; i < confirmedItems.length; i++) {
                        const item = confirmedItems[i]
                        setSaveProgress(prev => ({ ...prev, current: i + 1 }))

                        try {
                            // Convertir cm a metros para backend y cálculo de precio
                            const itemAncho = Number(item.metadata.width) / 100;
                            const itemAlto = Number(item.metadata.height) / 100;
                            const priceResult = calculateItemPriceDetailed(item.material, itemAncho, itemAlto, item.copias, item.servicios, data.clienteId)
                            const itemSubtotal = priceResult.subtotal

                            // Upload file
                            let remoteFileName = item.fileName;
                            if (item.file && item.file.size > 0) {
                                try {
                                    const uploadRes = await uploadFile(item.file, (percent, loaded, total) => {
                                        setUploadProgress({
                                            percent,
                                            loaded: (loaded / (1024 * 1024)).toFixed(1),
                                            total: (total / (1024 * 1024)).toFixed(1),
                                            fileName: item.fileName
                                        });
                                    });
                                    setUploadProgress(null);
                                    remoteFileName = uploadRes.filename;
                                    if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
                                        blobStore.set(remoteFileName, item.previewUrl);
                                    }
                                } catch (uErr) {
                                    setUploadProgress(null);
                                    console.error(`[Luxius-Save] Upload falló para ${item.fileName}`, uErr)
                                    throw new Error(`Error subiendo archivo: ${item.fileName}`)
                                }
                            }

                            const rawName = item.fileName.replace(/\.[^/.]+$/, "");
                            const itemDesc = (item.descripcionItem || '').trim() || rawName;
                            const itemTarea = batchName ? `${batchName} - ${itemDesc}` : itemDesc;

                            const orderData = {
                                ...data,
                                id: undefined,
                                clientId: parseInt(data.clienteId),
                                clienteNombre: cliente?.nombre || 'Desconocido',
                                batchId: batchId,
                                loteNombre: batchName || `Lote ${new Date().toLocaleDateString('es-AR')}`,
                                descripcionItem: itemDesc,
                                nombreTarea: itemTarea,
                                arch: remoteFileName,
                                archivos: [remoteFileName],
                                archivosOriginales: [item.fileName],
                                ancho: itemAncho,
                                alto: itemAlto,
                                copias: Number(item.copias),
                                material: item.material,
                                subtotal: itemSubtotal,
                                bobinaAsignada: priceResult.bobinaAsignada,
                                consumoEstimado: priceResult.consumoEstimado,
                                precioMl: priceResult.precioMl,
                                precioDetalle: priceResult.precioDetalle,
                                servicios: item.servicios,
                                demasiasConfig: isLonaOrNotVinilo(item.material) ? item.demasiasConfig : { top: false, bottom: false, left: false, right: false },
                                imgMetadata: item.metadata,
                                status: data.status as any,
                                category: (data.status === 'relevamiento' || data.status === 'diseno') ? 'diseno' : 'impresion',
                                artistaId: user?.role === 'artista' ? user.id : order?.artistaId,
                                fechaCreacion: new Date().toString(),
                                fechaEntrega: data.fechaEntrega || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            }

                            const saved = await saveOrden(orderData)
                            saveResults.push(saved)
                        } catch (itemErr) {
                            console.error(`[Luxius-Save] Error procesando item ${item.fileName}:`, itemErr)
                            setSaveProgress(prev => ({ ...prev, errorCount: prev.errorCount + 1 }))
                        }
                        // Breather between items
                        await new Promise(r => setTimeout(r, 50))
                    }


                    // POST-SAVE LOGIC: Safety Deletion
                    if (saveResults.length > 0) {
                        console.log(`[Luxius-Save] Éxito parcial/total: ${saveResults.length} ítems guardados.`);
                        if (order && order.id) {
                            console.log(`[Luxius-Save] Borrando pedido original consolidado: ${order.id}`);
                            await deleteOrden(order.id).catch(de => console.warn("Fallo borrado original", de));
                        }
                        onClose(true)
                    } else {
                        alert('No se pudo guardar ningún ítem del lote. Revise la consola.')
                    }
                } catch (bulkErr) {
                    console.error("[Luxius-Save] Error crítico en bucle de guardado:", bulkErr)
                    alert("Ocurrió un error crítico al procesar el lote.")
                } finally {
                    setSaving(false)
                    setUploadProgress(null)
                }
            } else {
                // Unitario - Legacy logic remains but wrapped in safety
                setSaving(true)
                try {
                    const numericData = {
                        ...data,
                        clientId: parseInt(data.clienteId),
                        alto: Number(data.alto),
                        ancho: Number(data.ancho),
                        copias: Number(data.copias || 1),
                    }

                    const priceResult = calculateItemPriceDetailed(data.material, numericData.ancho, numericData.alto, numericData.copias, data.servicios, data.clienteId)
                    const subtotal = priceResult.subtotal

                    let finalArchivos = fileName ? [fileName] : (order?.archivos || []);
                    let finalArchivosOriginales = order?.archivosOriginales || [];

                    if (selectedFile) {
                        const uploadRes = await uploadFile(selectedFile, (percent, loaded, total) => {
                            setUploadProgress({
                                percent,
                                loaded: (loaded / (1024 * 1024)).toFixed(1),
                                total: (total / (1024 * 1024)).toFixed(1),
                                fileName: selectedFile.name
                            });
                        });
                        finalArchivos = [uploadRes.filename];
                        finalArchivosOriginales = [uploadRes.originalName];
                        if (previewUrl && previewUrl.startsWith('blob:')) {
                            blobStore.set(uploadRes.filename, previewUrl);
                        }
                    }

                    await saveOrden({
                        ...order,
                        ...numericData,
                        subtotal,
                        bobinaAsignada: priceResult.bobinaAsignada,
                        consumoEstimado: priceResult.consumoEstimado,
                        precioMl: priceResult.precioMl,
                        precioDetalle: priceResult.precioDetalle,
                        clienteNombre: cliente?.nombre || 'Desconocido',
                        archivos: finalArchivos,
                        archivosOriginales: finalArchivosOriginales,
                        demasiasConfig: isLonaOrNotVinilo(data.material) ? data.demasiasConfig : { top: false, bottom: false, left: false, right: false },
                        imgMetadata: metadata || order?.imgMetadata,
                        status: ((order?.origen === 'mobile' || (data as any).origen === 'mobile') && numericData.status === 'orden') ? 'diseno' : (numericData.status || (order ? order.status : (currentDefaultStatus as any))),
                        category: ((order?.origen === 'mobile' || (data as any).origen === 'mobile') || numericData.status === 'relevamiento' || numericData.status === 'diseno') ? 'diseno' : 'impresion',
                        artistaId: user?.role === 'artista' ? user.id : order?.artistaId,
                        servicios: data.servicios
                    })
                    onClose(true)

                } catch (err) {
                    console.error("Single save failed", err)
                    alert("Error al guardar pedido unitario.")
                } finally {
                    setSaving(false)
                    setUploadProgress(null)
                }
            }
        } catch (error) {
            console.error("Error saving order:", error)
            const msg = error instanceof Error ? error.message : "Error desconocido"
            alert(`Hubo un error al guardar el pedido: ${msg}`)
        }
    }




    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={() => onClose(false)}
                title={order ? `Editar #${order.id}` : (currentDefaultStatus === 'diseno' ? "Nuevo Pedido de Diseño" : "Nuevo Pedido de Impresión")}
                size="lg"
            >
                <div className="nuevo-pedido-tabs">
                    <button type="button" className={`tab-btn ${activeTab === 'unitario' ? 'active' : ''}`} onClick={() => setActiveTab('unitario')}>Unitario</button>
                    <button type="button" className={`tab-btn ${activeTab === 'lote' ? 'active' : ''}`} onClick={() => setActiveTab('lote')}>Lote</button>
                    <button type="button" className={`tab-btn ${activeTab === 'promos' ? 'active' : ''}`} onClick={() => setActiveTab('promos')}>Promos</button>
                </div>

                <form onSubmit={handleSubmit(onSubmit, (errors) => {
                    console.error("Form errors:", errors)
                    const isRelevamiento = watch('status') === 'relevamiento' || watch('status') === 'diseno'
                    let msg = "Por favor revise los siguientes campos:\n"
                    let hasErrors = false
                    
                    if (errors.clienteId) { msg += "- Cliente es requerido\n"; hasErrors = true; }
                    if (!isRelevamiento && errors.material) { msg += "- Material es requerido\n"; hasErrors = true; }
                    if (!isRelevamiento && errors.calidad) { msg += "- Calidad es requerida\n"; hasErrors = true; }
                    if (!isRelevamiento && errors.ancho) { msg += "- Ancho es requerido\n"; hasErrors = true; }
                    if (!isRelevamiento && errors.alto) { msg += "- Alto es requerido\n"; hasErrors = true; }
                    
                    if (hasErrors) alert(msg)
                })} className="pedido-form">
                    <div className="form-section">
                        <div className="compact-grid">
                            {/* Línea 1: Cliente y Fecha Entrega */}
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Cliente</label>
                                {user?.role === 'cliente' ? (
                                    <>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={(() => {
                                                const c = getClientes().find(c =>
                                                    c.nombre.toLowerCase().includes(user.name.toLowerCase()) ||
                                                    user.name.toLowerCase().includes(c.nombre.toLowerCase())
                                                )
                                                return c ? `${c.nombre} (${c.empresa})` : user.name
                                            })()}
                                            readOnly
                                            disabled
                                            style={{ opacity: 0.7, cursor: 'not-allowed', background: 'var(--bg-secondary)' }}
                                        />
                                        <input type="hidden" {...register('clienteId', { required: false })} />
                                    </>
                                ) : (
                                    <div className="relative" ref={clientDropdownRef}>
                                        <input type="hidden" {...register('clienteId', { required: false })} />
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="Buscar cliente por nombre o empresa..."
                                            value={showClientDropdown ? clientSearch : (() => {
                                                const selectedId = watch('clienteId');
                                                if (!selectedId) return '';
                                                const c = getClientes().find(cl => String(cl.id) === String(selectedId));
                                                return c ? `${c.nombre} (${c.empresa || 'Particular'})` : '';
                                            })()}
                                            onChange={(e) => {
                                                setClientSearch(e.target.value);
                                                if (!showClientDropdown) setShowClientDropdown(true);
                                            }}
                                            onFocus={() => {
                                                setClientSearch('');
                                                setShowClientDropdown(true);
                                            }}
                                        />
                                        {showClientDropdown && (
                                            <div className="absolute z-50 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto" style={{ zIndex: 9999 }}>
                                                {getClientes()
                                                    .filter(c => 
                                                        c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                                        (c.empresa || '').toLowerCase().includes(clientSearch.toLowerCase())
                                                    )
                                                    .map(c => (
                                                        <div 
                                                            key={c.id} 
                                                            className="px-3 py-2 cursor-pointer hover:bg-[var(--primary-color)] hover:text-white border-b border-[var(--border-color)] last:border-0"
                                                            onClick={() => {
                                                                setValue('clienteId', String(c.id));
                                                                setShowClientDropdown(false);
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: 'bold' }}>{c.nombre}</div>
                                                            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{c.empresa || 'Particular'}</div>
                                                        </div>
                                                    ))}
                                                {getClientes().filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) || (c.empresa || '').toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                                                    <div className="px-3 py-2 text-sm opacity-50">No se encontraron clientes</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>🏷️ Proyecto / Etiqueta / Nombre Trabajo</label>
                                <input
                                    type="text"
                                    {...register('nombreTarea')}
                                    placeholder="Ej: Hilux Dixtron, Cartel Local..."
                                    className="input-field"
                                    style={{ fontWeight: 600 }}
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Fecha Entrega</label>
                                <input type="date" {...register('fechaEntrega')} className="input-field" />
                            </div>


                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Vendedor Asignado</label>
                                <select {...register('vendedorId', { required: true })} className="input-field">
                                    {vendedores.map(v => (
                                        <option key={v.id} value={v.id}>{v.nombre || `Vendedor ${v.id}`}</option>
                                    ))}
                                    {vendedores.length === 0 && <option value="1">Administrador (Vendedor 1)</option>}
                                </select>
                             </div>

                             <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Tipo de Pedido</label>
                                <select {...register('status', { required: true })} className="input-field">
                                    <option value="orden">Trabajo de Impresión</option>
                                    <option value="diseno">Orden de Diseño</option>
                                    <option value="relevamiento">Relevamiento de Campo (Móvil)</option>
                                </select>
                             </div>

                            {/* Sección Específica: Unitario */}
                            {activeTab === 'unitario' && (
                                <>
                                    {/* Línea 2: Material y Calidad */}
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label>Material</label>
                                        <select {...register('material', { required: activeTab === 'unitario' && watch('status') === 'orden' })} className="input-field">
                                            <option value="">...</option>
                                            {(() => {
                                                // RESTORED: Filter out ink and solvent types
                                                let mats = getMateriales().filter(m =>
                                                    m.habilitado !== false &&
                                                    !['tinta', 'solvente'].includes((m.tipo || '').toLowerCase())
                                                );
                                                const seen = new Set();
                                                return mats
                                                    .filter(m => {
                                                        if (seen.has(m.descripcion)) return false;
                                                        seen.add(m.descripcion);
                                                        return true;
                                                    })
                                                    .sort((a, b) => a.descripcion.localeCompare(b.descripcion))
                                                    .map(m => <option key={m.id} value={m.codigo}>{m.descripcion}</option>);
                                            })()}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label>Calidad</label>
                                        <select {...register('calidad', { required: activeTab === 'unitario' && watch('status') === 'orden' })} className="input-field">
                                            {getCalidades().filter(c => c.habilitado !== false).length > 1 && <option value="">...</option>}
                                            {getCalidades().filter(c => c.habilitado !== false).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label>Archivo</label>
                                        <div className="compact-upload" onClick={() => !saving && fileInputRef.current?.click()} style={{ minHeight: '48px', position: 'relative', cursor: saving ? 'wait' : 'pointer' }}>
                                            <UniversalFilePreview
                                                file={selectedFile || undefined}
                                                fileUrl={previewUrl || undefined}
                                                fileName={fileName}
                                                dimensions={metadata ? { width: metadata.width, height: metadata.height } : undefined}
                                                dpi={metadata?.dpi}
                                                colorMode={metadata?.colorMode}
                                                fileSize={selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : undefined}
                                                className="upload-preview-thumb"
                                                style={{ width: '40px', height: '40px', marginRight: '8px' }}
                                            />
                                            <div className="upload-text-stack" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); !saving && fileInputRef.current?.click(); }}
                                                        className="lux-btn"
                                                        style={{ 
                                                            fontSize: '0.82rem', 
                                                            padding: '5px 12px', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '5px', 
                                                            background: 'linear-gradient(135deg, #0891b2, #06b6d4)', 
                                                            color: '#ffffff', 
                                                            border: 'none', 
                                                            borderRadius: '6px', 
                                                            fontWeight: 600, 
                                                            cursor: 'pointer',
                                                            boxShadow: '0 2px 6px rgba(6, 182, 212, 0.3)'
                                                        }}
                                                        title="Seleccionar archivo desde el equipo"
                                                    >
                                                        📁 Archivo...
                                                    </button>
                                                    {!showCloudInput && (
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCloudInput(true); }}
                                                            className="lux-btn"
                                                            style={{ 
                                                                fontSize: '0.82rem', 
                                                                padding: '5px 12px', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '5px', 
                                                                background: 'linear-gradient(135deg, #c026d3, #d946ef)', 
                                                                color: '#ffffff', 
                                                                border: 'none', 
                                                                borderRadius: '6px', 
                                                                fontWeight: 600, 
                                                                cursor: 'pointer',
                                                                boxShadow: '0 2px 6px rgba(217, 70, 239, 0.3)'
                                                            }}
                                                            title="Importar archivo desde Google Drive"
                                                        >
                                                            🔗 Link...
                                                        </button>
                                                    )}
                                                    {fileName ? (
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }} title={fileName}>
                                                            {fileName}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                            Sin archivo
                                                        </span>
                                                    )}
                                                </div>
                                                {showCloudInput && (
                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }} onClick={e => e.stopPropagation()}>
                                                        <input 
                                                            type="text" 
                                                            value={cloudUrl} 
                                                            onChange={e => setCloudUrl(e.target.value)} 
                                                            placeholder="Pegar enlace público de Google Drive..." 
                                                            className="lux-input"
                                                            style={{ flex: 1, fontSize: '0.8rem', padding: '4px 8px' }}
                                                        />
                                                        <Button type="button" variant="primary" onClick={handleCloudImport} disabled={isCloudImporting} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                                                            {isCloudImporting ? '⏳' : 'Cargar'}
                                                        </Button>
                                                        <button type="button" onClick={() => setShowCloudInput(false)} className="text-gray-400 hover:text-gray-600">❌</button>
                                                    </div>
                                                )}
                                                {isCloudImporting && cloudImportStatus && (
                                                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(37,99,235,0.1)', padding: '6px 12px', borderRadius: '4px' }}>
                                                        <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                                        {cloudImportStatus}
                                                    </div>
                                                )}
                                                {selectedFile && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                                                    </span>
                                                )}
                                                {metadata?.pageCount && metadata.pageCount > 1 && (
                                                    <button
                                                        type="button"
                                                        className="btn-explode-master"
                                                        style={{
                                                            background: 'var(--accent)',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: 'var(--radius-sm)',
                                                            padding: '6px 12px',
                                                            fontSize: '11px',
                                                            fontWeight: '800',
                                                            cursor: 'pointer',
                                                            marginTop: '8px',
                                                            boxShadow: 'var(--shadow-glow)',
                                                            display: 'block',
                                                            width: 'fit-content'
                                                        }}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            console.log("[Luxius-Explode] Gatillando explosión desde unitario...");
                                                            if (selectedFile) {
                                                                // Forzar cambio de pestaña antes de procesar
                                                                setActiveTab('lote');
                                                                // Crear un evento sintético que handleBatchChange pueda entender
                                                                const mockEvent = { target: { files: [selectedFile] } } as any;
                                                                setTimeout(() => handleBatchChange(mockEvent), 100);
                                                            } else {
                                                                console.warn("[Luxius-Explode] No hay archivo seleccionado para explotar.");
                                                            }
                                                        }}
                                                    >
                                                        💥 EXPLOTAR PDF ({metadata.pageCount} PÁGS)
                                                    </button>
                                                )}
                                            </div>
                                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

                                            {/* PROGRESS BAR - Extracción de metadata */}
                                            {extracting && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: '4px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '0 0 8px 8px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        background: 'linear-gradient(90deg, #2563eb, #7c3aed, #ec4899, #2563eb)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'progressShimmer 1.5s ease-in-out infinite',
                                                        borderRadius: '0 0 8px 8px'
                                                    }} />
                                                </div>
                                            )}

                                            {/* PROGRESS BAR - Upload a R2 */}
                                            {uploadProgress && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: '6px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '0 0 8px 8px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${uploadProgress.percent}%`,
                                                        height: '100%',
                                                        background: 'linear-gradient(90deg, #10b981, #2563eb)',
                                                        borderRadius: '0 0 8px 8px',
                                                        transition: 'width 0.3s ease-out',
                                                        boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                                                    }} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Upload Status Inline (debajo del input) */}
                                        {(extracting || uploadProgress) && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginTop: '6px',
                                                padding: '6px 12px',
                                                background: 'rgba(37, 99, 235, 0.1)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(37, 99, 235, 0.25)',
                                                fontSize: '0.8rem',
                                                color: '#60a5fa',
                                                fontWeight: 600
                                            }}>
                                                <div style={{
                                                    width: '14px',
                                                    height: '14px',
                                                    border: '2px solid rgba(96, 165, 250, 0.3)',
                                                    borderTopColor: '#60a5fa',
                                                    borderRadius: '50%',
                                                    animation: 'spin 0.8s linear infinite',
                                                    flexShrink: 0
                                                }} />
                                                {extracting ? (
                                                    <span>Analizando imagen (DPI, dimensiones, color)...</span>
                                                ) : uploadProgress ? (
                                                    <span>
                                                        Subiendo a servidor: {uploadProgress.percent}% — {uploadProgress.loaded} MB / {uploadProgress.total} MB
                                                    </span>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label>Info Imagen</label>
                                        <div className={`metadata-box ${extracting ? 'extracting' : ''}`}>
                                            {extracting ? (
                                                <div className="metadata-loading">
                                                    <div className="spinner-small"></div>
                                                    <span>Analizando archivo...</span>
                                                </div>
                                            ) : metadata ? (
                                                <div className="meta-layout">
                                                    {metadata.width > 0 ? (
                                                        <>
                                                            <div className="meta-item">
                                                                <span className="meta-label">📏 DIMENSIONES</span>
                                                                <span className="meta-value">{metadata.width} x {metadata.height} cm</span>
                                                            </div>
                                                            <div className="meta-item-sep"></div>
                                                            <div className="meta-item">
                                                                <span className="meta-label">🎯 RESOLUCIÓN</span>
                                                                <span className="meta-value">{metadata.dpi} DPI</span>
                                                            </div>
                                                            <div className="meta-item-sep"></div>
                                                            <div className="meta-item">
                                                                <span className="meta-label">🎨 COLOR</span>
                                                                <span className="meta-value">{metadata.colorMode}</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="meta-item" style={{ flex: 1, padding: '4px' }}>
                                                            <span className="meta-label" style={{ color: '#f59e0b', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                ⚠️ AVISO
                                                            </span>
                                                            <span className="meta-value" style={{ fontSize: '0.75rem', whiteSpace: 'normal', color: 'var(--text-muted)' }}>
                                                                Este tipo de archivo ({metadata.format}) no reporta medidas automáticas en el navegador. Por favor, <b>ingresá el Ancho y Alto manualmente</b> según el diseño original.
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="metadata-placeholder">Sin datos o esperando archivo...</div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Línea 4: Ancho, Alto, Copias, Logística */}
                            {activeTab === 'unitario' && (
                                <>
                                    <div className="form-group">
                                        <label>Ancho (m)</label>
                                        <input type="number" step="0.001" {...register('ancho')} className="input-field" />
                                    </div>
                                    <div className="form-group">
                                        <label>Alto (m)</label>
                                        <input type="number" step="0.001" {...register('alto')} className="input-field" />
                                    </div>
                                    <div className="form-group">
                                        <label>Copias</label>
                                        <input type="number" {...register('copias')} className="input-field" />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                                        <label>Logística / Envío</label>
                                        <select {...register('envio')} className="input-field">
                                            <option value="">Seleccionar...</option>
                                            {getLogisticas().map((l: any) => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                                        </select>
                                    </div>

                                    {/* RESTORED: Demasias (Cruceta) con mejor estilo Dark */}
                                    {watchedMaterial && isLonaOrNotVinilo(watchedMaterial) && (
                                        <div className="form-group" style={{ gridColumn: 'span 1' }}>
                                            <label>Demasías</label>
                                            <div className="cruceta-container" style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(3, 1fr)',
                                                gridTemplateRows: 'repeat(3, 1fr)',
                                                gap: '4px',
                                                width: '90px',
                                                height: '90px',
                                                margin: '0 auto',
                                                padding: '6px',
                                                background: 'var(--bg-sidebar)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border)'
                                            }}>
                                                <div />
                                                <label title="Superior" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-input)', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--border)' }}>
                                                    <input type="checkbox" {...register('demasiasConfig.top')} style={{ cursor: 'pointer' }} />
                                                </label>
                                                <div />
                                                <label title="Izquierda" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-input)', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--border)' }}>
                                                    <input type="checkbox" {...register('demasiasConfig.left')} style={{ cursor: 'pointer' }} />
                                                </label>
                                                <div style={{ background: 'var(--accent)', opacity: 0.3, borderRadius: '4px' }} />
                                                <label title="Derecha" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-input)', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--border)' }}>
                                                    <input type="checkbox" {...register('demasiasConfig.right')} style={{ cursor: 'pointer' }} />
                                                </label>
                                                <div />
                                                <label title="Inferior" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-input)', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--border)' }}>
                                                    <input type="checkbox" {...register('demasiasConfig.bottom')} style={{ cursor: 'pointer' }} />
                                                </label>
                                                <div />
                                            </div>
                                        </div>
                                    )}

                                    {/* Línea 5: Servicios Unitario (Reactive) */}
                                    <div className="form-group" style={{ gridColumn: 'span 4', marginTop: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                                            <span style={{ fontSize: '1.1rem' }}>🔧</span>
                                            <label style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent)' }}>Servicios Adicionales de Procesamiento</label>
                                        </div>
                                        <div className="services-container" style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '8px',
                                            background: 'rgba(0, 229, 255, 0.02)',
                                            padding: '12px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px dashed var(--accent)',
                                            minHeight: '40px'
                                        }}>
                                            {availableServices.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No hay servicios configurados. <a href="#/abm/servicios" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Agregalos en Administración → Servicios</a></span>}
                                            {availableServices.map(s => (
                                                <label key={s.id} className="service-chip" style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 12px',
                                                    background: 'var(--bg-card)',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 500,
                                                    transition: 'all 0.2s ease'
                                                }}>
                                                    <input type="checkbox" {...register(`servicios.${s.id}`)} style={{ cursor: 'pointer' }} />
                                                    <span>{s.nombre}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>(${s.precioBase})</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Lote Tab */}
                            {activeTab === 'lote' && (
                                <div className="form-group" style={{ gridColumn: 'span 4' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                                        <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                            <span style={{ display: 'block', fontWeight: 600, color: 'var(--accent)', fontSize: '0.85rem', marginBottom: '6px' }}>
                                                🏷️ Nombre del Proyecto / Lote (Etiqueta Global):
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="Ej: Hilux Dixtron, Cartelería Centro, etc."
                                                {...register('nombreTarea')}
                                                className="input-field"
                                                style={{ width: '100%', padding: '6px 12px', fontSize: '0.9rem', fontWeight: 600 }}
                                            />
                                        </div>
                                        <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                            <span style={{ display: 'block', fontWeight: 600, color: 'var(--accent)', fontSize: '0.85rem', marginBottom: '6px' }}>
                                                🏷️ Material por defecto para el lote:
                                            </span>
                                            <select
                                                className="input-field"
                                                style={{ padding: '6px 12px', width: '100%' }}
                                                value={watchedMaterial || ''}
                                                onChange={(e) => {
                                                    const selectedMat = e.target.value;
                                                    setValue('material', selectedMat);
                                                    if (selectedMat && batchItems.length > 0) {
                                                        setBatchItems(prev => prev.map(item => ({ ...item, material: selectedMat })));
                                                    }
                                                }}
                                            >
                                                <option value="">Seleccionar material (Obligatorio)...</option>
                                                {getMateriales()
                                                    .filter(m => m.habilitado !== false && !['tinta', 'solvente'].includes((m.tipo || '').toLowerCase()))
                                                    .map(m => (
                                                        <option key={m.id} value={m.codigo}>{m.descripcion}</option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>


                                    <label>Carga masiva</label>
                                    <div className="batch-upload-zone"
                                        onClick={() => batchInputRef.current?.click()}
                                        style={{ border: '2px dashed var(--accent)', background: 'var(--accent-light)', padding: '20px', textAlign: 'center', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}
                                    >
                                        <div className="batch-upload-text">
                                            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: '600' }}>Haz clic para seleccionar múltiples archivos</span>
                                            <span className="batch-upload-hint" style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Los PDFs multipágina se explotarán automáticamente</span>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }} onClick={e => e.stopPropagation()}>
                                                {!showCloudInput ? (
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCloudInput(true); }}
                                                        className="lux-btn lux-btn-secondary"
                                                        style={{ fontSize: '0.9rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', color: '#ffffff', border: 'none', borderRadius: '6px', margin: '0 auto' }}
                                                        title="Importar desde Google Drive o WeTransfer"
                                                    >
                                                        🔗 Importar desde Drive o WeTransfer
                                                    </button>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '8px', maxWidth: '400px', width: '100%', margin: '0 auto' }}>
                                                        <input 
                                                            type="text" 
                                                            value={cloudUrl} 
                                                            onChange={e => setCloudUrl(e.target.value)} 
                                                            placeholder="Pegar enlace de Google Drive o WeTransfer..." 
                                                            className="lux-input"
                                                            style={{ flex: 1, fontSize: '0.9rem', padding: '6px 10px' }}
                                                        />
                                                        <Button type="button" variant="primary" onClick={handleCloudImport} disabled={isCloudImporting} style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
                                                            {isCloudImporting ? '⏳' : 'Cargar'}
                                                        </Button>
                                                        <button type="button" onClick={() => setShowCloudInput(false)} className="text-gray-400 hover:text-gray-600">❌</button>
                                                    </div>
                                                )}
                                                {isCloudImporting && cloudImportStatus && (
                                                    <div style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(37,99,235,0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                                                        <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                                        {cloudImportStatus}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <input type="file" ref={batchInputRef} style={{ display: 'none' }} multiple onChange={handleBatchChange} />
                                    </div>

                                    {/* BANNER INFORMATIVO MECÁNICA */}
                                    <div style={{
                                        marginTop: '10px',
                                        padding: '10px 14px',
                                        background: 'rgba(37, 99, 235, 0.08)',
                                        border: '1px solid rgba(37, 99, 235, 0.25)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.83rem',
                                        color: 'var(--text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        <span style={{ fontSize: '1.2rem' }}>💡</span>
                                        <span>
                                            <b>Mecánica de asignación:</b> Los archivos y páginas explotadas heredan automáticamente el material seleccionado arriba. Si lo necesitas, puedes cambiar el material a todo el lote desde la barra o personalizarlo individualmente en cada tarjeta.
                                        </span>
                                    </div>

                                    {extracting && (
                                        <div style={{
                                            marginTop: '10px',
                                            padding: '12px 14px',
                                            background: 'rgba(37, 99, 235, 0.15)',
                                            border: '1px solid rgba(37, 99, 235, 0.4)',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            boxShadow: '0 0 10px rgba(37, 99, 235, 0.1)'
                                        }}>
                                            <div style={{
                                                width: '18px',
                                                height: '18px',
                                                border: '3px solid rgba(96, 165, 250, 0.3)',
                                                borderTopColor: '#60a5fa',
                                                borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite',
                                                flexShrink: 0
                                            }} />
                                            <span style={{ color: '#60a5fa', fontWeight: '600', fontSize: '0.9rem' }}>
                                                Analizando archivos en lote (DPI, dimensiones y explosión de PDFs)...
                                            </span>
                                        </div>
                                    )}

                                    {batchItems.length > 0 && (
                                        <>
                                            {/* BARRA DE HERRAMIENTAS DE LOTE */}
                                            <div style={{
                                                marginTop: '14px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: 'var(--bg-card)',
                                                padding: '10px 14px',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border)'
                                            }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                                    <input
                                                        type="checkbox"
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                        checked={batchItems.length > 0 && batchItems.every(i => i.confirmed !== false)}
                                                        onChange={(e) => {
                                                            const checkAll = e.target.checked;
                                                            setBatchItems(prev => prev.map(i => ({ ...i, confirmed: checkAll })));
                                                        }}
                                                    />
                                                    Seleccionar todos ({batchItems.filter(i => i.confirmed !== false).length} de {batchItems.length})
                                                </label>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                    📦 {batchItems.length} ítem(s) en lote
                                                </span>
                                            </div>

                                            <div className="batch-grid" style={{
                                                marginTop: '14px',
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                                gap: '12px',
                                                maxHeight: '480px',
                                                overflowY: 'auto',
                                                paddingRight: '8px'
                                            }}>
                                            {batchItems.map((item) => (
                                                <div key={item.id} className={`batch-item ${item.confirmed !== false ? 'confirmed' : ''}`} style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px',
                                                    background: 'var(--bg-sidebar)',
                                                    padding: '10px',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: item.confirmed !== false ? '1px solid var(--accent)' : '1px solid var(--border)',
                                                    outline: (saving && !item.material) ? '2px solid #ef4444' : 'none', // Highlight missing data
                                                    position: 'relative',
                                                    minWidth: 0,
                                                    overflow: 'visible' // Ensure expansion
                                                }}>
                                                    {/* Header: Thumb and Title */}
                                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                        <div className="batch-item-thumb" style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                                                            <button type="button"
                                                                style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.9)', border: 'none', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '12px', cursor: 'pointer', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                onClick={(e) => { e.stopPropagation(); setBatchItems(prev => prev.filter(i => i.id !== item.id)); }}
                                                            >×</button>
                                                            <UniversalFilePreview
                                                                file={item.file || undefined}
                                                                fileUrl={item.previewUrl || undefined}
                                                                fileName={item.fileName}
                                                                dimensions={{ width: item.metadata.width, height: item.metadata.height }}
                                                                dpi={item.metadata.dpi}
                                                                colorMode={item.metadata.colorMode}
                                                                fileSize={item.file ? `${(item.file.size / (1024 * 1024)).toFixed(1)} MB` : undefined}
                                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                            />
                                                            {(!item.previewUrl || item.metadata.colorMode === 'Detectando...') && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    inset: 0,
                                                                    background: 'rgba(15, 23, 42, 0.8)',
                                                                    backdropFilter: 'blur(3px)',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '6px',
                                                                    zIndex: 4
                                                                }}>
                                                                    <div style={{
                                                                        width: '24px',
                                                                        height: '24px',
                                                                        border: '3px solid rgba(255, 255, 255, 0.15)',
                                                                        borderTopColor: 'var(--accent)',
                                                                        borderRadius: '50%',
                                                                        animation: 'spin 0.8s linear infinite'
                                                                    }} />
                                                                    <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.4px' }}>
                                                                        Procesando...
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <input
                                                                type="checkbox"
                                                                style={{ position: 'absolute', bottom: '2px', left: '2px', width: '16px', height: '16px', zIndex: 10, cursor: 'pointer' }}
                                                                checked={item.confirmed !== false}
                                                                onChange={() => setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, confirmed: i.confirmed === false ? true : false } : i))}
                                                            />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <span style={{ fontWeight: '600', fontSize: '0.85rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.fileName}>{item.fileName}</span>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                {item.metadata.width > 0 ? (
                                                                    <>
                                                                        <b style={{ color: 'var(--accent)' }}>{item.metadata.width}x{item.metadata.height} cm</b>
                                                                        {item.metadata.dpi > 0 && <span> · {item.metadata.dpi} DPI</span>}
                                                                    </>
                                                                ) : (
                                                                    <b style={{ color: '#f59e0b' }}>⚠️ Medidas no detectadas</b>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                {item.metadata.format && <span>📄 {item.metadata.format}</span>}
                                                                {item.metadata.colorMode && <span>🎨 {item.metadata.colorMode}</span>}
                                                                {(item.metadata.pageCount || 0) > 1 && <span>📑 {item.metadata.pageCount} págs</span>}
                                                            </div>
                                                            <div style={{ marginTop: '5px' }}>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Pieza (ej: Capot, Lateral...)"
                                                                    value={item.descripcionItem || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, descripcionItem: val } : i));
                                                                    }}
                                                                    className="input-field"
                                                                    style={{ fontSize: '0.75rem', padding: '3px 6px', height: '24px', width: '100%' }}
                                                                    title="Etiqueta individual para esta pieza"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>


                                                    {/* Upload Progress for this Item */}
                                                    {uploadProgress && uploadProgress.fileName === item.fileName && (
                                                        <div style={{ marginTop: '2px', marginBottom: '2px', background: 'rgba(37, 99, 235, 0.1)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 'bold' }}>
                                                                <span>Subiendo archivo...</span>
                                                                <span>{uploadProgress.percent}% ({uploadProgress.loaded}MB / {uploadProgress.total}MB)</span>
                                                            </div>
                                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                                                                <div style={{
                                                                    width: `${uploadProgress.percent}%`,
                                                                    height: '100%',
                                                                    background: 'linear-gradient(90deg, #10b981, #2563eb)',
                                                                    transition: 'width 0.3s ease-out',
                                                                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                                                                }} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Missing Dimensions Warning & Inputs */}
                                                    {item.metadata.width === 0 && (
                                                        <div style={{ padding: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '4px', marginBottom: '4px' }}>
                                                            <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginBottom: '6px', fontWeight: 600 }}>⚠️ Ingrese las medidas manualmente:</div>
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Ancho (cm)</label>
                                                                    <input
                                                                        type="number"
                                                                        style={{ width: '100%', padding: '4px', fontSize: '0.8rem', borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                                                        value={item.metadata.width || ''}
                                                                        onChange={(e) => setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, metadata: { ...i.metadata, width: parseFloat(e.target.value) || 0 } } : i))}
                                                                    />
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Alto (cm)</label>
                                                                    <input
                                                                        type="number"
                                                                        style={{ width: '100%', padding: '4px', fontSize: '0.8rem', borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                                                        value={item.metadata.height || ''}
                                                                        onChange={(e) => setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, metadata: { ...i.metadata, height: parseFloat(e.target.value) || 0 } } : i))}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Controls: Material and Copies */}
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Material</label>
                                                            <select
                                                                style={{ width: '100%', padding: '4px', fontSize: '0.8rem', borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                                                value={item.material}
                                                                onChange={(e) => setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, material: e.target.value } : i))}
                                                            >
                                                                <option value="">Elija material</option>
                                                                {getMateriales()
                                                                    .filter(m => m.habilitado !== false && !['tinta', 'solvente'].includes((m.tipo || '').toLowerCase()))
                                                                    .map(m => (
                                                                        <option key={m.id} value={m.codigo}>{m.descripcion}</option>
                                                                    ))}
                                                            </select>
                                                        </div>
                                                        <div style={{ width: '50px' }}>
                                                            <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Cant.</label>
                                                            <input
                                                                type="number"
                                                                style={{ width: '100%', padding: '4px', fontSize: '0.8rem', borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                                                value={item.copias}
                                                                onChange={(e) => setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, copias: parseInt(e.target.value) || 1 } : i))}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Demasias (Mini) */}
                                                    {item.material && isLonaOrNotVinilo(item.material) && (
                                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                            <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Demasías</label>
                                                            <div className="cruceta-mini" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', background: 'var(--bg-card)', padding: '3px', borderRadius: '4px', border: '1px solid var(--border)', width: '54px' }}>
                                                                <div /><input type="checkbox" checked={item.demasiasConfig?.top} onChange={() => setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, demasiasConfig: { ...i.demasiasConfig, top: !i.demasiasConfig?.top } as any } : i))} style={{ cursor: 'pointer', width: '12px', height: '12px' }} /><div />
                                                                <input type="checkbox" checked={item.demasiasConfig?.left} onChange={() => setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, demasiasConfig: { ...i.demasiasConfig, left: !i.demasiasConfig?.left } as any } : i))} style={{ cursor: 'pointer', width: '12px', height: '12px' }} /><div style={{ background: 'var(--accent)', opacity: 0.2 }} /><input type="checkbox" checked={item.demasiasConfig?.right} onChange={() => setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, demasiasConfig: { ...i.demasiasConfig, right: !i.demasiasConfig?.right } as any } : i))} style={{ cursor: 'pointer', width: '12px', height: '12px' }} />
                                                                <div /><input type="checkbox" checked={item.demasiasConfig?.bottom} onChange={() => setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, demasiasConfig: { ...i.demasiasConfig, bottom: !i.demasiasConfig?.bottom } as any } : i))} style={{ cursor: 'pointer', width: '12px', height: '12px' }} /><div />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Servicios - mismo estilo que Material */}
                                                    {availableServices.length > 0 && (
                                                        <div style={{ paddingBottom: '4px' }}>
                                                            <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Servicios</label>
                                                            <select
                                                                title="Servicios adicionales"
                                                                style={{ width: '100%', padding: '4px', fontSize: '0.8rem', borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                                                value=""
                                                                onChange={(e) => {
                                                                    const sId = e.target.value;
                                                                    if (sId) {
                                                                        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, servicios: { ...(i.servicios || {}), [sId]: !i.servicios?.[sId] } } : i));
                                                                    }
                                                                    e.target.value = '';
                                                                }}
                                                            >
                                                                <option value="">{Object.entries(item.servicios || {}).filter(([, v]) => v).length > 0
                                                                    ? `${Object.entries(item.servicios || {}).filter(([, v]) => v).length} servicio(s) seleccionado(s)`
                                                                    : 'Sin servicios adicionales'}</option>
                                                                {availableServices.map(s => (
                                                                    <option key={s.id} value={String(s.id)}>{item.servicios?.[String(s.id)] ? '✓ ' : '  '}{s.nombre}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                    )}
                                </div>
                            )}

                            {/* TAB PROMOS / COMBOS */}
                            {activeTab === 'promos' && (
                                <div className="promos-tab-container">
                                    {/* Promos Filter Bar */}
                                    <div className="promos-filter-bar">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                                            <span style={{ fontSize: '1.1rem' }}>🔍</span>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="Buscar combo o promo por nombre o código..."
                                                value={comboSearch}
                                                onChange={(e) => setComboSearch(e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Categoría:</span>
                                            {promoCategories.map(cat => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    className={`lux-btn ${comboCategoriaFilter === cat ? 'lux-btn-primary' : 'lux-btn-secondary'}`}
                                                    style={{
                                                        fontSize: '11px',
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        border: '1px solid var(--border)',
                                                        background: comboCategoriaFilter === cat ? 'var(--accent)' : 'var(--bg-card)',
                                                        color: comboCategoriaFilter === cat ? '#fff' : 'var(--text-secondary)',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => setComboCategoriaFilter(cat)}
                                                >
                                                    {cat === 'todas' ? 'Todas' : cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Grid of Combos / Promos */}
                                    {filteredPromos.length === 0 ? (
                                        <div style={{
                                            padding: '24px',
                                            textAlign: 'center',
                                            background: 'var(--bg-sidebar)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px dashed var(--border)',
                                            color: 'var(--text-muted)'
                                        }}>
                                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🏷️</span>
                                            <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                                                {getCombos().length === 0 ? 'No hay combos cargados en el sistema' : 'No se encontraron promociones con ese filtro'}
                                            </p>
                                            <p style={{ fontSize: '0.8rem', margin: 0 }}>
                                                Puedes crear y gestionar combos desde <b style={{ color: 'var(--accent)' }}>ABM &gt; Combos / Tarifario</b>.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="promos-grid">
                                            {filteredPromos.map(combo => {
                                                const isSelected = selectedComboId === combo.id;
                                                const matDesc = getMateriales().find(m => m.codigo === combo.materialCodigo)?.descripcion || combo.materialCodigo;
                                                return (
                                                    <div
                                                        key={combo.id}
                                                        className={`promo-card ${isSelected ? 'selected' : ''}`}
                                                        onClick={() => handleSelectCombo(combo)}
                                                    >
                                                        <div>
                                                            <div className="promo-card-header">
                                                                <span className="promo-badge-cat">{combo.categoria || 'Promo'}</span>
                                                                {combo.destacado && <span className="promo-badge-featured">⭐ DESTACADO</span>}
                                                            </div>
                                                            <div className="promo-title">{combo.nombre}</div>
                                                            <div style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 600, marginBottom: '4px' }}>{combo.codigo}</div>
                                                            {combo.descripcion && <div className="promo-desc">{combo.descripcion}</div>}
                                                        </div>

                                                        <div className="promo-specs">
                                                            {combo.ancho && combo.alto && (
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span>📐 Medidas:</span>
                                                                    <b>{combo.ancho}m × {combo.alto}m</b>
                                                                </div>
                                                            )}
                                                            {matDesc && (
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span>🏷️ Material:</span>
                                                                    <b>{matDesc}</b>
                                                                </div>
                                                            )}
                                                            {combo.componentes && combo.componentes.length > 0 && (
                                                                <div style={{ marginTop: '2px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                                                                    <span style={{ fontSize: '10px', opacity: 0.7 }}>Incluye: </span>
                                                                    <span style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                                                        {combo.componentes.map(c => `${c.cantidad}x ${c.nombre}`).join(' + ')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <div className="promo-price-tag">
                                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Precio Final:</span>
                                                                ${(combo.precioFinal || 0).toLocaleString('es-AR')}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="promo-btn-select"
                                                                onClick={(e) => { e.stopPropagation(); handleSelectCombo(combo); }}
                                                            >
                                                                {isSelected ? '✓ Promo Seleccionada' : 'Seleccionar Promo'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Upload and details for selected promo */}
                                    <div style={{
                                        marginTop: '10px',
                                        background: 'var(--bg-card)',
                                        padding: '12px 14px',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border)',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: '10px'
                                    }}>
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                            <label>Archivo de Diseño / Gráfica para la Promo</label>
                                            <div className="compact-upload" onClick={() => !saving && fileInputRef.current?.click()} style={{ minHeight: '48px', position: 'relative', cursor: saving ? 'wait' : 'pointer' }}>
                                                <UniversalFilePreview
                                                    file={selectedFile || undefined}
                                                    fileUrl={previewUrl || undefined}
                                                    fileName={fileName}
                                                    dimensions={metadata ? { width: metadata.width, height: metadata.height } : undefined}
                                                    dpi={metadata?.dpi}
                                                    colorMode={metadata?.colorMode}
                                                    fileSize={selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : undefined}
                                                    className="upload-preview-thumb"
                                                    style={{ width: '40px', height: '40px', marginRight: '8px' }}
                                                />
                                                <div className="upload-text-stack" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); !saving && fileInputRef.current?.click(); }}
                                                            className="lux-btn"
                                                            style={{ 
                                                                fontSize: '0.82rem', 
                                                                padding: '5px 12px', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '5px', 
                                                                background: 'linear-gradient(135deg, #0891b2, #06b6d4)', 
                                                                color: '#ffffff', 
                                                                border: 'none', 
                                                                borderRadius: '6px', 
                                                                fontWeight: 600, 
                                                                cursor: 'pointer',
                                                                boxShadow: '0 2px 6px rgba(6, 182, 212, 0.3)'
                                                            }}
                                                            title="Seleccionar archivo desde el equipo"
                                                        >
                                                            📁 Archivo...
                                                        </button>
                                                        {!showCloudInput && (
                                                            <button 
                                                                type="button" 
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCloudInput(true); }}
                                                                className="lux-btn"
                                                                style={{ 
                                                                    fontSize: '0.82rem', 
                                                                    padding: '5px 12px', 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    gap: '5px', 
                                                                    background: 'linear-gradient(135deg, #c026d3, #d946ef)', 
                                                                    color: '#ffffff', 
                                                                    border: 'none', 
                                                                    borderRadius: '6px', 
                                                                    fontWeight: 600, 
                                                                    cursor: 'pointer',
                                                                    boxShadow: '0 2px 6px rgba(217, 70, 239, 0.3)'
                                                                }}
                                                                title="Importar archivo desde Google Drive o WeTransfer"
                                                            >
                                                                🔗 Link Nube
                                                            </button>
                                                        )}
                                                        {fileName ? (
                                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }} title={fileName}>
                                                                {fileName}
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                                Sin archivo
                                                            </span>
                                                        )}
                                                    </div>
                                                    {showCloudInput && (
                                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }} onClick={e => e.stopPropagation()}>
                                                            <input 
                                                                type="text" 
                                                                value={cloudUrl} 
                                                                onChange={e => setCloudUrl(e.target.value)} 
                                                                placeholder="Pegar enlace de Google Drive o WeTransfer..." 
                                                                className="lux-input"
                                                                style={{ flex: 1, fontSize: '0.8rem', padding: '4px 8px' }}
                                                            />
                                                            <Button type="button" variant="primary" onClick={handleCloudImport} disabled={isCloudImporting} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                                                                {isCloudImporting ? '⏳' : 'Cargar'}
                                                            </Button>
                                                            <button type="button" onClick={() => setShowCloudInput(false)} className="text-gray-400 hover:text-gray-600">❌</button>
                                                        </div>
                                                    )}
                                                    {isCloudImporting && cloudImportStatus && (
                                                        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                                            {cloudImportStatus}
                                                        </div>
                                                    )}
                                                    <span className="upload-subtext">Click para examinar PDF, TIFF, JPG, CDR, AI</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ gridColumn: 'span 1' }}>
                                            <label>Cantidad de Promos / Packs</label>
                                            <input type="number" min="1" {...register('copias')} className="input-field" />
                                        </div>

                                        <div className="form-group" style={{ gridColumn: 'span 1' }}>
                                            <label>Logística / Envío</label>
                                            <select {...register('envio')} className="input-field">
                                                <option value="">Seleccionar...</option>
                                                {getLogisticas().map((l: any) => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div> {/* Closes compact-grid */}

                        {/* Observaciones (Global) */}
                        <div className="form-group" style={{ gridColumn: 'span 4' }}>
                            <label>Observaciones generales</label>
                            <textarea {...register('observaciones')} placeholder="Notas sobre el pedido..." className="input-field" rows={2} style={{ resize: 'none' }} />
                        </div>
                    </div> {/* Closes form-section */}

                    {/* INLINE PROGRESS BAR */}
                    {saving && (
                        <div style={{
                            margin: '10px 15px',
                            padding: '15px 20px',
                            background: 'rgba(30, 30, 45, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '1.2rem' }}>🚀</span>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: 600 }}>
                                    {uploadProgress ? 'Subiendo archivo al servidor...' : 'Procesando pedido...'}
                                </h3>
                            </div>

                            {/* OVERALL BATCH PROGRESS */}
                            {saveProgress && saveProgress.total > 0 && (
                                <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', fontSize: '0.85rem', marginBottom: '6px' }}>
                                        <span style={{ fontWeight: 500 }}>Progreso del lote</span>
                                        <span style={{ color: '#10b981', fontWeight: 700 }}>
                                            {saveProgress.current} de {saveProgress.total} ítems ({Math.round((saveProgress.current / (saveProgress.total || 1)) * 100)}%)
                                        </span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '8px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${Math.min(100, Math.round((saveProgress.current / (saveProgress.total || 1)) * 100))}%`,
                                            height: '100%',
                                            background: 'linear-gradient(90deg, #059669, #10b981)',
                                            borderRadius: '10px',
                                            transition: 'width 0.3s ease-out'
                                        }}></div>
                                    </div>
                                </div>
                            )}

                            {/* CURRENT FILE UPLOAD PROGRESS */}
                            {uploadProgress && (
                                <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', fontSize: '0.85rem', marginBottom: '6px' }}>
                                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                                            📄 {uploadProgress.fileName}
                                        </span>
                                        <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                                            {uploadProgress.percent}% ({uploadProgress.loaded}MB / {uploadProgress.total}MB)
                                        </span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '6px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${uploadProgress.percent}%`,
                                            height: '100%',
                                            background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                                            borderRadius: '10px',
                                            transition: 'width 0.2s ease-out'
                                        }}></div>
                                    </div>
                                </div>
                            )}

                            {saveProgress.errorCount > 0 && (
                                <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 500, marginTop: '4px' }}>
                                    ⚠️ {saveProgress.errorCount} error(es) detectado(s) durante la carga
                                </div>
                            )}
                        </div>
                    )}

                    <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', padding: '15px' }}>
                        <Button variant="ghost" type="button" size="sm" onClick={() => onClose(false)} disabled={saving}>Cancelar</Button>
                        <Button
                            variant="primary"
                            type="submit"
                            size="sm"
                            disabled={saving || (activeTab === 'lote' && (batchItems.length === 0 || !batchItems.some(i => i.confirmed !== false) || !isBatchValid()))}
                        >
                            {saving ? 'Procesando...' : (order ? 'Guardar Cambios' : activeTab === 'lote' ? `Cargar ${batchItems.filter(i => i.confirmed !== false).length} items al pedido` : 'Cargar Pedido')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    )
}
