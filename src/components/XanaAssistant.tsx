import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@store/authStore';
import { 
    X, Send, Bot, Sparkles, AlertTriangle, Database, 
    Activity, RefreshCw, ChevronDown, Package, Trash2, Zap, Calculator, HelpCircle, Mic, MicOff, Palette, Printer
} from 'lucide-react';
import { getRecentLogs, clearLogs, RecordedError } from '../utils/errorRecorder';
import { API_URL, getMateriales, getClientes, getAuthHeaders, uploadFile } from '../data/db';
import { blobStore } from '../data/blobStore';
import { extractMetadata } from '../pages/Entrada/utils/fileMetadataParser';
import { calculateItemPriceDetailed } from '../utils/pricingCalculator';
import './XanaAssistant.css';

import XanaSmartOrderCard, { SmartDraftOrder, SmartCartelItem } from './XanaSmartOrderCard';

interface Message {
    role: 'user' | 'bot';
    text: string;
    isDiagnostic?: boolean;
    logsCount?: number;
    smartDraftOrder?: SmartDraftOrder;
    time?: string;
}

const NORMALIZED_ROLES: Record<string, string> = {
    administrador: 'admin',
    principal: 'admin',
    impresion: 'impresor',
    cliente: 'cliente',
    vendedor: 'vendedor',
    artista: 'artista',
    visitante: 'visitante'
};

function normalizeRole(raw: string): string {
    return NORMALIZED_ROLES[raw.toLowerCase()] || 'cliente';
}

function inferMaterialFromText(text: string): string {
    const lower = text.toLowerCase();
    const mats = getMateriales().filter(m => m.habilitado !== false);
    const findCode = (keywords: string[], fallbackCode: string): string => {
        const found = mats.find(m =>
            keywords.some(k =>
                (m.nombre || '').toLowerCase().includes(k) ||
                (m.codigo || '').toLowerCase() === k
            )
        );
        return (found ? (found.codigo || found.nombre) : fallbackCode) || fallbackCode;
    };
    if (lower.includes('microperforado') || lower.includes('micro')) return findCode(['microperforado', 'vm'], 'VM');
    if (lower.includes('blackout') || lower.includes('doble faz')) return findCode(['blackout', 'lb'], 'LB');
    if (lower.includes('backlight') || lower.includes('back')) return findCode(['backlight', 'lback'], 'LBACK');
    if (lower.includes('vinilo') || lower.includes('autoadhesivo') || lower.includes('calco')) return findCode(['vinilo', 'vv', 'vb'], 'VV');
    if (lower.includes('lona') || lower.includes('front') || lower.includes('cartel') || lower.includes('banner')) return findCode(['lona', 'lf'], 'LF');
    return mats[0]?.codigo || 'LF';
}

function inferClientFromText(text: string): { id?: number | null; nombre: string } {
    const lower = text.toLowerCase();
    const clientes = getClientes();
    for (const c of clientes) {
        const name = (c.nombre || '').trim();
        if (name.length >= 3 && lower.includes(name.toLowerCase())) {
            const numId = typeof c.id === 'number' ? c.id : (Number(c.id) || null);
            return { id: numId, nombre: name };
        }
    }
    return { id: null, nombre: 'Particular (Web)' };
}

function parseDimsFromFilenameCm(name: string): { widthCm: number; heightCm: number } | null {
    const base = name.replace(/\.[^.]+$/, '');
    const mCm = base.match(/(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*(cm|m|mm)\b/i);
    if (mCm) {
        let w = parseFloat(mCm[1].replace(',', '.'));
        let h = parseFloat(mCm[2].replace(',', '.'));
        const unit = mCm[3].toLowerCase();
        if (unit === 'm') { w *= 100; h *= 100; }
        else if (unit === 'mm') { w /= 10; h /= 10; }
        if (w > 0 && h > 0) return { widthCm: Math.round(w * 10) / 10, heightCm: Math.round(h * 10) / 10 };
    }
    return null;
}

function parseCopiesFromFilename(name: string): number {
    const base = name.replace(/\.[^.]+$/, '');
    const m = base.match(/(?:[xX×]\s*)?(\d+)\s*cop(?:ias?)?\b/i);
    if (m) {
        const n = parseInt(m[1], 10);
        if (n >= 1 && n <= 500) return n;
    }
    return 1;
}

function parseExplicitScaleFromFilename(name: string): number {
    const lower = name.toLowerCase();
    if (/\b(?:escala\s*1[.:/]?10|esc\s*1[.:/]?10|1[:/]10)\b/.test(lower)) return 10;
    if (/\b(?:escala\s*1[.:/]?20|esc\s*1[.:/]?20|1[:/]20)\b/.test(lower)) return 20;
    return 1;
}

async function normalizeCloudFile(blob: Blob, rawName: string): Promise<File> {
    const headerBuf = await blob.slice(0, 64).arrayBuffer();
    const bytes = new Uint8Array(headerBuf);
    const ascii = new TextDecoder('ascii', { fatal: false }).decode(bytes).trim().toLowerCase();

    if (ascii.startsWith('<!doctype html') || ascii.startsWith('<html')) {
        throw new Error('Google Drive devolvió una página de bloqueo HTML. Verifique que el archivo tenga acceso público ("Cualquier persona con el enlace").');
    }

    let cleanName = rawName.trim() || 'archivo_cloud';
    const hasExt = /\.(jpg|jpeg|png|tif|tiff|pdf|eps|ai|cdr|psd|webp)$/i.test(cleanName);

    let detectedExt = '';
    let detectedMime = blob.type || 'application/octet-stream';

    if (bytes.length >= 4) {
        if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
            detectedExt = '.pdf';
            detectedMime = 'application/pdf';
        } else if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            detectedExt = '.jpg';
            detectedMime = 'image/jpeg';
        } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            detectedExt = '.png';
            detectedMime = 'image/png';
        } else if (
            (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00) ||
            (bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A)
        ) {
            detectedExt = '.tif';
            detectedMime = 'image/tiff';
        } else if (ascii.startsWith('riff') && ascii.includes('cdr')) {
            detectedExt = '.cdr';
        }
    }

    if (!hasExt && detectedExt) {
        cleanName = `${cleanName}${detectedExt}`;
    } else if (detectedExt && cleanName.startsWith('archivo_drive')) {
        cleanName = cleanName.replace(/\.[^.]+$/, '') + detectedExt;
    }

    return new File([blob], cleanName, { type: detectedMime });
}

export default function XanaAssistant() {
    const { isAuthenticated, user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { 
            role: 'bot', 
            text: '¡Hola! 👋 Soy **Xana AI**, tu copiloto de LuXius.\n\n¿En qué te puedo ayudar hoy? Puedes pegarme directamente un enlace de **WeTransfer** o **Google Drive** y armaré tu orden cotizada al instante con análisis de bobinas.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
const [input, setInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
// Voice recognition state
const [isListening, setIsListening] = useState(false);
const [voiceSupported, setVoiceSupported] = useState(false);
const recognitionRef = useRef<SpeechRecognition | null>(null);
const scrollRef = useRef<HTMLDivElement>(null);
const inputRef = useRef<HTMLInputElement>(null);
const menuRef = useRef<HTMLDivElement>(null);

    const getUserInfo = () => {
        if (user) {
            return {
                role: normalizeRole(String(user.role || 'cliente')),
                username: user.name || user.username || 'Usuario',
                id: user.id || 0
            };
        }
        return { role: 'cliente', username: 'Usuario', id: 0 };
    };

    const userInfo = getUserInfo();
    const isAdmin = userInfo.role === 'admin';
    const isImpresor = userInfo.role === 'impresor' || isAdmin;
    const isCliente = userInfo.role === 'cliente';

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Close dropdown menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    // ===== VOICE RECOGNITION (Web Speech API) =====
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            setVoiceSupported(true);
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-AR';
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // Update input with interim + final transcript
                setInput(prev => {
                    // Replace the last interim portion if exists
                    const base = prev.replace(/\[voz:.*?\]$/, '').trim();
                    const combined = base + (finalTranscript || interimTranscript);
                    return combined + (interimTranscript && !finalTranscript ? ' [voz...]' : '');
                });
            };

            recognition.onerror = (event: any) => {
                console.warn('[Xana Voice] Speech recognition error:', event.error);
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    setIsListening(false);
                }
            };

            recognition.onend = () => {
                if (isListening) {
                    // Auto-restart if still listening
                    try { recognition.start(); } catch {}
                }
            };

            recognitionRef.current = recognition;
        }
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
        };
    }, [isListening]);

    const toggleVoice = () => {
        if (!voiceSupported || !recognitionRef.current) return;
        
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                // Clear input when starting fresh voice input
                setInput('');
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.warn('[Xana Voice] Start error:', e);
            }
        }
    };

    const sendMessage = async (customText?: string, sendLogs: boolean = false) => {
        const textToSend = customText || input.trim();
        if (!textToSend || isLoading) return;

        const capturedLogs: RecordedError[] = sendLogs ? getRecentLogs() : [];
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        setMessages(prev => [
            ...prev, 
            { 
                role: 'user', 
                text: textToSend, 
                isDiagnostic: sendLogs, 
                logsCount: capturedLogs.length,
                time: timeNow
            }
        ]);
        
        setInput('');
        setIsMenuOpen(false);
        setIsLoading(true);

        try {
            // DETECTAR ENLACE WETRANSFER O GOOGLE DRIVE PARA SMART ORDER
            const urlMatch = textToSend.match(/https?:\/\/[^\s]+/i);
            const isCloudLink = urlMatch && (
                urlMatch[0].includes('wetransfer.com') || 
                urlMatch[0].includes('we.tl') || 
                urlMatch[0].includes('drive.google.com') ||
                urlMatch[0].includes('docs.google.com')
            );

            if (isCloudLink) {
                const cloudUrl = urlMatch[0];
                const token = localStorage.getItem('luxius_auth_token') || localStorage.getItem('luxius_token') || '';
                const materialCode = inferMaterialFromText(textToSend);
                const clientInfo = inferClientFromText(textToSend);

                // Mensaje provisional de progreso
                const progressTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setMessages(prev => [
                    ...prev,
                    {
                        role: 'bot',
                        text: '⏳ **Descargando y analizando archivos desde el enlace...**\n\nExtrayendo dimensiones en cm, DPI, modo de color y evaluando bobinas óptimas...',
                        time: progressTime
                    }
                ]);

                const updateProgressText = (stepLabel: string) => {
                    setMessages(prev => prev.map(m =>
                        (m.text.includes('Descargando y analizando') || m.text.includes('Procesando ('))
                            ? { ...m, text: `⏳ **${stepLabel}**\n\nExtrayendo dimensiones en cm, DPI, modo de color y evaluando bobinas óptimas...` }
                            : m
                    ));
                };

                // MOTOR 1 (Primario): /api/import-cloud + extractMetadata en navegador (previews locales + PDF.js + TIFF/CDR/JPG nativo)
                try {
                    let activeBaseUrl = API_URL.replace(/\/api\/?$/, '');
                    let cloudRes: Response | null = null;
                    try {
                        cloudRes = await fetch(`${API_URL}/import-cloud`, {
                            method: 'POST',
                            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify({ url: cloudUrl })
                        });
                    } catch {
                        if (API_URL.includes('localhost') || API_URL.includes('127.0.0.1')) {
                            activeBaseUrl = 'https://luxius-backend.onrender.com';
                            cloudRes = await fetch(`https://luxius-backend.onrender.com/api/import-cloud`, {
                                method: 'POST',
                                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                                body: JSON.stringify({ url: cloudUrl })
                            });
                        }
                    }

                    if (cloudRes && cloudRes.ok) {
                        const cloudData = await cloudRes.json();
                        if (cloudData.status === 'success' && Array.isArray(cloudData.files) && cloudData.files.length > 0) {
                            const parsedCarteles: SmartCartelItem[] = [];
                            let totalMl = 0;
                            let totalM2 = 0;
                            let totalPrice = 0;

                            for (let idx = 0; idx < cloudData.files.length; idx++) {
                                const fileInfo = cloudData.files[idx];
                                const displayRawName = fileInfo.originalName || fileInfo.fileName || `archivo_${idx + 1}`;
                                updateProgressText(`Procesando (${idx + 1}/${cloudData.files.length}): ${displayRawName}...`);

                                try {
                                    const fileUrl = fileInfo.tempUrl.startsWith('http')
                                        ? fileInfo.tempUrl
                                        : `${activeBaseUrl}${fileInfo.tempUrl}`;
                                    const blobRes = await fetch(fileUrl, { headers: getAuthHeaders() });
                                    if (!blobRes.ok) continue;
                                    const blob = await blobRes.blob();
                                    if (!blob || blob.size === 0) continue;

                                    // Check if server returned a clearer filename in Content-Disposition
                                    let resolvedName = displayRawName;
                                    const cdHeader = blobRes.headers.get('Content-Disposition') || '';
                                    const cdMatch = cdHeader.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
                                    if (cdMatch && cdMatch[1]) {
                                        try {
                                            const decoded = decodeURIComponent(cdMatch[1].trim());
                                            if (decoded && !decoded.startsWith('archivo_drive')) {
                                                resolvedName = decoded;
                                            }
                                        } catch {}
                                    }

                                    const file = await normalizeCloudFile(blob, resolvedName);
                                    const localBlobUrl = URL.createObjectURL(file);
                                    const meta = await extractMetadata(file, localBlobUrl, 1);

                                    let widthCm = Number(meta.width) || 0;
                                    let heightCm = Number(meta.height) || 0;
                                    if (widthCm <= 0 || heightCm <= 0) {
                                        const fnDims = parseDimsFromFilenameCm(file.name);
                                        if (fnDims) {
                                            widthCm = fnDims.widthCm;
                                            heightCm = fnDims.heightCm;
                                        }
                                    }

                                    const dpiVal = Number(meta.dpi) || 72;
                                    const explicitScale = parseExplicitScaleFromFilename(file.name);
                                    const copiasDetectadas = parseCopiesFromFilename(file.name);
                                    const escalaAplicada = explicitScale;
                                    const alertaEscala = explicitScale > 1 || (widthCm > 0 && heightCm > 0 && Math.max(widthCm, heightCm) <= 35 && dpiVal >= 200);

                                    const rawAnchoM = Math.round((widthCm / 100) * 100) / 100;
                                    const rawAltoM = Math.round((heightCm / 100) * 100) / 100;
                                    const anchoM = Math.round(rawAnchoM * escalaAplicada * 100) / 100;
                                    const altoM = Math.round(rawAltoM * escalaAplicada * 100) / 100;
                                    const priceInfo = calculateItemPriceDetailed(materialCode, anchoM, altoM, copiasDetectadas, {}, clientInfo.id || undefined);
                                    const finalPreview = meta.thumbnailUrl || localBlobUrl;

                                    // Store preview in blobStore for instant access in Xana and NuevoPedidoModal
                                    blobStore.set(file.name, finalPreview);

                                    // Upload to server in background if small/medium (<35MB) so archivo_url is persisted
                                    let serverSavedFilename = file.name;
                                    if (file.size <= 35 * 1024 * 1024) {
                                        try {
                                            const upRes = await uploadFile(file);
                                            if (upRes?.filename) {
                                                serverSavedFilename = upRes.filename;
                                                blobStore.set(upRes.filename, finalPreview);
                                            }
                                        } catch {}
                                    }

                                    const itemM2 = Math.round(anchoM * altoM * copiasDetectadas * 100) / 100;
                                    totalMl += priceInfo.consumoEstimado || 0;
                                    totalM2 += itemM2;
                                    totalPrice += priceInfo.subtotal || 0;

                                    parsedCarteles.push({
                                        tipo: materialCode,
                                        copias: copiasDetectadas,
                                        medidas: { ancho: anchoM, alto: altoM },
                                        raw_medidas: { ancho: rawAnchoM, alto: rawAltoM },
                                        bobinaAsignada: priceInfo.bobinaAsignada || 1.37,
                                        consumoEstimado: Math.round((priceInfo.consumoEstimado || 0) * 100) / 100,
                                        m2Estimado: itemM2,
                                        originalName: file.name,
                                        fileName: serverSavedFilename,
                                        fileUrl: `/uploads/${serverSavedFilename}`,
                                        thumbnailUrl: finalPreview,
                                        dpi: dpiVal,
                                        colorMode: meta.colorMode || 'CMYK',
                                        format: meta.format || file.name.split('.').pop()?.toUpperCase() || 'IMG',
                                        scaleFactor: escalaAplicada,
                                        scaleAlert: alertaEscala,
                                        scaleReason: alertaEscala ? `Densidad ${dpiVal} DPI en lienzo ${widthCm}x${heightCm} cm` : 'Tamaño real 1:1',
                                        sha256: '',
                                        precioCalculado: Math.round(priceInfo.subtotal || 0),
                                        rotated: Boolean(priceInfo.rotated)
                                    });
                                } catch (itemErr) {
                                    console.warn('[Xana Cloud Item Parse Warning]:', itemErr);
                                }
                            }

                            if (parsedCarteles.length > 0) {
                                const firstCartel = parsedCarteles[0];
                                const draftOrder: SmartDraftOrder = {
                                    cliente_id: clientInfo.id ?? null,
                                    cliente_nombre: clientInfo.nombre,
                                    descripcion: parsedCarteles.length === 1
                                        ? `${firstCartel.originalName} (${firstCartel.medidas.ancho}x${firstCartel.medidas.alto}m)`
                                        : `Lote de ${parsedCarteles.length} archivos desde enlace`,
                                    material: materialCode,
                                    calidad: 'ECO',
                                    copias: 1,
                                    ancho: firstCartel.medidas.ancho,
                                    alto: firstCartel.medidas.alto,
                                    archivos: parsedCarteles.map(c => c.fileName),
                                    archivosOriginales: parsedCarteles.map(c => c.originalName),
                                    carteles: parsedCarteles,
                                    bobinaAsignada: firstCartel.bobinaAsignada,
                                    consumoEstimado: Math.round(totalMl * 100) / 100,
                                    totalM2: Math.round(totalM2 * 100) / 100,
                                    precioMl: 0,
                                    total: Math.round(totalPrice),
                                    observaciones: textToSend,
                                    imgMetadata: {
                                        dpi: firstCartel.dpi,
                                        colorMode: firstCartel.colorMode,
                                        format: firstCartel.format,
                                        thumbnailUrl: firstCartel.thumbnailUrl
                                    }
                                };

                                setMessages(prev => [
                                    ...prev.filter(m => !m.text.includes('Descargando y analizando') && !m.text.includes('Procesando (')),
                                    {
                                        role: 'bot',
                                        text: `✨ ¡Enlace analizado con éxito! Procesé **${parsedCarteles.length} archivo(s)** con vista previa, medidas reales, DPI, asignación de bobina y cotización oficial.\n\nRevisa o ajusta tu pedido a continuación:`,
                                        smartDraftOrder: draftOrder,
                                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    }
                                ]);
                                return;
                            }
                        }
                    }
                } catch (clientCloudErr) {
                    console.warn('[Xana Primary Cloud Engine Notice, falling back to /xana/smart-order]:', clientCloudErr);
                }

                // MOTOR 2 (Respaldo Backend): /api/xana/smart-order
                try {
                    const initRes = await fetch(`${API_URL}/xana/smart-order`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': token ? `Bearer ${token}` : ''
                        },
                        body: JSON.stringify({
                            url: cloudUrl,
                            observaciones: textToSend
                        })
                    });

                    const initData = await initRes.json();
                    
                    // Si ya devolvió la orden directamente (síncrono)
                    if (initRes.ok && initData.draft_order) {
                        setMessages(prev => [
                            ...prev.filter(m => !m.text.includes('Descargando y analizando') && !m.text.includes('Procesando (')),
                            {
                                role: 'bot',
                                text: `✨ ¡Procesé el enlace con éxito! He analizado **${initData.draft_order.carteles?.length || 1} archivo(s)**.\n\nRevisa el borrador interactivo a continuación:`,
                                smartDraftOrder: initData.draft_order,
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }
                        ]);
                        return;
                    }

                    // Si se inició un Job asíncrono (202 Accepted)
                    if (initData.job_id) {
                        const jobId = initData.job_id;
                        let completed = false;
                        let attempts = 0;
                        const maxAttempts = 90; // 90 * 2s = 180s

                        while (!completed && attempts < maxAttempts) {
                            await new Promise(r => setTimeout(r, 2000));
                            attempts++;

                            try {
                                const pollRes = await fetch(`${API_URL}/xana/smart-order/status/${jobId}`, {
                                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                                });
                                if (pollRes.ok) {
                                    const pollData = await pollRes.json();
                                    if (pollData.status === 'success' && pollData.draft_order) {
                                        completed = true;
                                        setMessages(prev => [
                                            ...prev.filter(m => !m.text.includes('Descargando y analizando') && !m.text.includes('Analizando') && !m.text.includes('Procesando (')),
                                            {
                                                role: 'bot',
                                                text: `✨ ¡Procesé el enlace con éxito! He descargado y analizado **${pollData.draft_order.carteles?.length || 1} archivo(s)**, extrayendo dimensiones, DPI y calculando el descarte óptimo de bobina.\n\nRevisa el borrador interactivo a continuación:`,
                                                smartDraftOrder: pollData.draft_order,
                                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            }
                                        ]);
                                        return;
                                    } else if (pollData.status === 'error') {
                                        completed = true;
                                        setMessages(prev => [
                                            ...prev.filter(m => !m.text.includes('Descargando y analizando') && !m.text.includes('Analizando') && !m.text.includes('Procesando (')),
                                            {
                                                role: 'bot',
                                                text: `⚠️ **No se pudo procesar el enlace:** ${pollData.error || 'Error desconocido'}`,
                                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            }
                                        ]);
                                        return;
                                    } else if (pollData.progress) {
                                        updateProgressText(pollData.progress);
                                    }
                                }
                            } catch (pErr) {
                                console.warn('[Smart Order Polling Notice]', pErr);
                            }
                        }

                        if (!completed) {
                            throw new Error('La descarga y análisis tardó más del tiempo esperado. Intente nuevamente.');
                        }
                    } else {
                        const errMsg = initData.error || `Error HTTP ${initRes.status}`;
                        setMessages(prev => [
                            ...prev.filter(m => !m.text.includes('Descargando y analizando') && !m.text.includes('Procesando (')),
                            {
                                role: 'bot',
                                text: `⚠️ **No se pudo procesar el enlace:** ${errMsg}`,
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }
                        ]);
                        return;
                    }
                } catch (fetchErr: any) {
                    setMessages(prev => [
                        ...prev.filter(m => !m.text.includes('Descargando y analizando') && !m.text.includes('Analizando') && !m.text.includes('Procesando (')),
                        {
                            role: 'bot',
                            text: `⚠️ Error al conectar con el servidor: ${fetchErr.message || 'Verifica tu conexión.'}`,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                    ]);
                    return;
                }

            }


            // FLUJO CONVERSACIONAL ESTÁNDAR
            const history = messages.slice(-6).map(m => ({ role: m.role, content: m.text }));
            const payload = {
                message: textToSend,
                history: history,
                userRole: userInfo.role,
                username: userInfo.username,
                userId: userInfo.id,
                clientLogs: userInfo.role === 'visitante' ? [] : capturedLogs,
                currentUrl: window.location.pathname
            };

            const response = await fetch(`${API_URL}/xana/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('luxius_auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('luxius_auth_token')}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Error de conexión');
            }

            const data = await response.json();
            
            if (sendLogs) {
                clearLogs(); 
            }

            setMessages(prev => [
                ...prev, 
                { 
                    role: 'bot', 
                    text: data.reply || 'Respuesta recibida.',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } catch (error) {
            console.error("Xana Error:", error);
            setMessages(prev => [
                ...prev, 
                { 
                    role: 'bot', 
                    text: '⚠️ No pude procesar tu solicitud en este momento. Por favor verifica tu conexión o intenta nuevamente.',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } finally {
            setIsLoading(false);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    };

    const handleClearChat = () => {
        setMessages([
            { 
                role: 'bot', 
                text: 'Conversación reiniciada. ¿En qué puedo asistirte ahora?',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ]);
        setIsMenuOpen(false);
    };

    // Simple markdown renderer for bold, code and bullet lines
    const renderFormattedText = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, idx) => {
            // Process bold **text** and `code`
            let formatted: React.ReactNode = line;
            const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
            if (parts.length > 1) {
                formatted = parts.map((part, pIdx) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith('`') && part.endsWith('`')) {
                        return <code key={pIdx} className="xana-inline-code">{part.slice(1, -1)}</code>;
                    }
                    return part;
                });
            }

            return (
                <div key={idx} className={line.startsWith('•') || line.startsWith('-') ? 'xana-bullet-line' : 'xana-text-line'}>
                    {formatted}
                </div>
            );
        });
    };

    if (!isAuthenticated || !user) {
        return null;
    }

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="xana-button"
                    title="Abrir Asistente Xana AI"
                >
                    <Sparkles size={22} />
                </button>
            )}

            {isOpen && (
                <div className="xana-chat-container animate-fade-in">
                    {/* Header */}
                    <div className="xana-header">
                        <div className="xana-header-info">
                            <div className="xana-avatar">
                                <Bot size={22} />
                            </div>
                            <div>
                                <div className="xana-title-row">
                                    <h3 className="xana-title">Xana AI</h3>
                                    <span className="xana-role-badge">
                                        {userInfo.role}
                                    </span>
                                </div>
                                <p className="xana-subtitle">Copiloto de Diagnóstico & Taller</p>
                            </div>
                        </div>

                        <div className="xana-header-actions" ref={menuRef}>
                            {/* Desplegable de Acciones Rápidas */}
                            <button 
                                className={`xana-menu-trigger ${isMenuOpen ? 'active' : ''}`}
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                title="Acciones y Consultas Rápidas"
                            >
                                <Zap size={14} />
                                <span>Acciones</span>
                                <ChevronDown size={14} className={`chevron-icon ${isMenuOpen ? 'rotated' : ''}`} />
                            </button>

                            {isMenuOpen && (
                                <div className="xana-dropdown-menu">
                                    <div className="dropdown-header">Consultas y Acciones</div>
                                    
                                    {/* Pedido Inteligente con Link */}
                                    <button 
                                        className="dropdown-item item-smart-order"
                                        onClick={() => {
                                            const link = prompt("Pega aquí el enlace de WeTransfer o Google Drive para cotizar y crear el pedido:");
                                            if (link && link.trim()) {
                                                sendMessage(link.trim());
                                            }
                                        }}
                                    >
                                        <Sparkles size={15} className="icon-sparkle" />
                                        <div>
                                            <strong>Pedido Inteligente (Link)</strong>
                                            <small>Pegar WeTransfer o Drive y cotizar</small>
                                        </div>
                                    </button>

                                    {/* Briefing Ejecutivo Jarvis (Admin / Impresor / Vendedor) */}
                                    {!isCliente && (
                                        <button 
                                            className="dropdown-item item-smart-order"
                                            onClick={() => sendMessage('/briefing')}
                                        >
                                            <Sparkles size={15} className="icon-sparkle" />
                                            <div>
                                                <strong>Briefing Ejecutivo Jarvis</strong>
                                                <small>Taller, finanzas, stock y prioridades</small>
                                            </div>
                                        </button>
                                    )}

                                    {/* Cálculo de imposición (Para todos) */}
                                    <button 
                                        className="dropdown-item item-calc"
                                        onClick={() => sendMessage('¿Cuántos calcos de 5x5 cm entran en una hoja A4 para 200 unidades?')}
                                    >
                                        <Calculator size={15} />
                                        <div>
                                            <strong>Calcular Planchas / Calcos</strong>
                                            <small>Imposición exacta 2D (0° vs 90°)</small>
                                        </div>
                                    </button>

                                    {/* Oportunidades de Nesting (Admin / Impresor) */}
                                    {isImpresor && (
                                        <button 
                                            className="dropdown-item item-queue"
                                            onClick={() => sendMessage('/nesting')}
                                        >
                                            <Printer size={15} />
                                            <div>
                                                <strong>Oportunidades de Nesting</strong>
                                                <small>Ahorro de laminado en cola</small>
                                            </div>
                                        </button>
                                    )}

                                    {/* Órdenes */}
                                    <button 
                                        className="dropdown-item item-orders"
                                        onClick={() => sendMessage(isCliente ? '¿Cómo consulto el estado de mis pedidos?' : '/taller')}
                                    >
                                        <Activity size={15} />
                                        <div>
                                            <strong>{isCliente ? 'Mis Pedidos' : 'Cola de Taller en Vivo'}</strong>
                                            <small>{isCliente ? 'Seguimiento de mis trabajos' : 'OTs, metros lineales y bobinas'}</small>
                                        </div>
                                    </button>

                                    {/* Cuentas por Cobrar (Admin) */}
                                    {isAdmin && (
                                        <button 
                                            className="dropdown-item item-orders"
                                            onClick={() => sendMessage('/deudores')}
                                        >
                                            <Activity size={15} />
                                            <div>
                                                <strong>Cuentas por Cobrar</strong>
                                                <small>Órdenes impagas y deuda en calle</small>
                                            </div>
                                        </button>
                                    )}

                                    {/* Stock (Admin / Impresor) */}
                                    {isImpresor && (
                                        <button 
                                            className="dropdown-item item-stock"
                                            onClick={() => sendMessage('/alertas')}
                                        >
                                            <Package size={15} />
                                            <div>
                                                <strong>Alertas de Stock Crítico</strong>
                                                <small>Nivel de lonas, vinilos y tintas</small>
                                            </div>
                                        </button>
                                    )}

                                    {/* Asesoramiento Gráfico Profesional (Todos) */}
                                    <button 
                                        className="dropdown-item item-graphic"
                                        onClick={() => sendMessage('Dame consejos de resolución DPI para gigantografía y cómo preparar archivos de imagen para impresión')}
                                    >
                                        <Palette size={15} />
                                        <div>
                                            <strong>Consejos Gráficos & DPI</strong>
                                            <small>Resolución, colores y sustratos</small>
                                        </div>
                                    </button>

                                    {/* Materiales y Formatos (Cliente) */}
                                    {isCliente && (
                                        <button 
                                            className="dropdown-item item-help"
                                            onClick={() => sendMessage('¿Qué formatos de archivos y materiales aceptan?')}
                                        >
                                            <HelpCircle size={15} />
                                            <div>
                                                <strong>Formatos & Materiales</strong>
                                                <small>Requisitos técnicos de diseño</small>
                                            </div>
                                        </button>
                                    )}

                                    {/* Diagnóstico (Admin / Impresor) */}
                                    {isImpresor && (
                                        <button 
                                            className="dropdown-item item-diagnostic"
                                            onClick={() => sendMessage('Diagnostica los errores recientes de pantalla y consola', true)}
                                        >
                                            <AlertTriangle size={15} />
                                            <div>
                                                <strong>Diagnóstico del Sistema</strong>
                                                <small>Analizar logs de consola y UI</small>
                                            </div>
                                        </button>
                                    )}

                                    {/* Salud BD (Solo Admin) */}
                                    {isAdmin && (
                                        <button 
                                            className="dropdown-item item-db"
                                            onClick={() => sendMessage('Audita la salud de la base de datos Supabase y tablas del sistema')}
                                        >
                                            <Database size={15} />
                                            <div>
                                                <strong>Salud de Base de Datos</strong>
                                                <small>Auditar motor PostgreSQL / Supabase</small>
                                            </div>
                                        </button>
                                    )}

                                    <div className="dropdown-divider" />
                                    
                                    <button 
                                        className="dropdown-item item-clear"
                                        onClick={handleClearChat}
                                    >
                                        <Trash2 size={15} />
                                        <div>
                                            <strong>Limpiar Chat</strong>
                                            <small>Reiniciar conversación actual</small>
                                        </div>
                                    </button>
                                </div>
                            )}

                            <button onClick={() => setIsOpen(false)} className="xana-close-btn" title="Cerrar">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div ref={scrollRef} className="xana-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`xana-msg-row ${msg.role === 'user' ? 'xana-msg-user' : 'xana-msg-bot'}`}>
                                <div className={`xana-bubble ${msg.role === 'user' ? 'xana-bubble-user' : 'xana-bubble-bot'}`}>
                                    {msg.isDiagnostic && (
                                        <div className="xana-diagnostic-badge">
                                            🩺 Diagnóstico adjunto ({msg.logsCount || 0} logs)
                                        </div>
                                    )}
                                    <div className="xana-bubble-content">
                                        {renderFormattedText(msg.text)}
                                    </div>

                                    {/* RENDER SMART ORDER CARD IF PRESENT */}
                                    {msg.smartDraftOrder && (
                                        <XanaSmartOrderCard 
                                            initialDraft={msg.smartDraftOrder} 
                                            onOrderConfirmed={(order) => {
                                                setMessages(prev => [
                                                    ...prev,
                                                    {
                                                        role: 'bot',
                                                        text: `✅ **Orden N° ${order.numero_presupuesto || order.id?.slice(0, 8)} confirmada y encolada en producción.**\n\nEl archivo master y sus especificaciones técnicas ya están disponibles en el panel de Entrada y listos para el Daemon de Taller.`,
                                                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    }
                                                ]);
                                            }}
                                        />
                                    )}

                                    {msg.time && (
                                        <div className="xana-msg-time">{msg.time}</div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="xana-msg-row xana-msg-bot">
                                <div className="xana-loading">
                                    <RefreshCw size={15} className="animate-spin" />
                                    <span>Xana está calculando...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Footer */}
                    <div className="xana-input-area">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Escribe tu consulta o pide un cálculo..."
                            className="xana-input"
                        />
                        {voiceSupported && (
                            <button
                                onClick={toggleVoice}
                                disabled={isLoading}
                                className={`xana-voice-btn ${isListening ? 'listening' : ''}`}
                                title={isListening ? 'Detener dictado (Esc para cancelar)' : 'Iniciar dictado por voz'}
                                aria-label={isListening ? 'Detener reconocimiento de voz' : 'Iniciar reconocimiento de voz'}
                            >
                                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                            </button>
                        )}
                        <button
                            onClick={() => sendMessage()}
                            disabled={isLoading || !input.trim()}
                            className="xana-send-btn"
                            title="Enviar mensaje"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
