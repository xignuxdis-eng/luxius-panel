import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Nostalgist } from 'nostalgist'
import JSZip from 'jszip'
import {
    SnesRomItem,
    loadSnesRomsCatalog,
    saveLocalRomFile,
    getLocalRomFile,
    deleteLocalRomFile,
} from '../snesRomsStore'
import {
    SnesKeybindings,
    loadSnesKeybindings,
    buildRetroArchInputConfig,
} from '../snesControlsConfig'
import {
    saveGameState,
    loadGameState,
} from '../snesSavesStore'
import { SnesControlsModal } from '../SnesControlsModal'
import { SnesSaveStatesModal } from '../SnesSaveStatesModal'

export interface EmulatedGameConfig {
    id: string
    name: string
    color: string
    objective: string
    controls: string[]
    platform?: string
    core?: 'snes' | 'snes9x'
    romUrl?: string
    exits?: string
    difficulty?: string
    tags?: string[]
}

interface SnesEmulatorGameProps {
    game: EmulatedGameConfig
    onBack?: () => void
}

// Caché en memoria del núcleo Snes9x (JS + WASM) para arranque instantáneo
let cachedSnes9xCore: { js: Blob; wasm: Blob } | null = null

async function loadSnes9xCoreBlobs(): Promise<{ js: Blob; wasm: Blob }> {
    if (cachedSnes9xCore) return cachedSnes9xCore

    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
    const candidateUrls = [
        `${base}/roms/cores/snes9x_libretro.zip`,
        'https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/snes9x_libretro.zip',
    ]

    let zipBuffer: ArrayBuffer | null = null
    let lastError = ''

    for (const url of candidateUrls) {
        try {
            const res = await fetch(url)
            if (!res.ok) {
                lastError = `HTTP ${res.status} en ${url}`
                continue
            }
            const buf = await res.arrayBuffer()
            const bytes = new Uint8Array(buf)
            if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
                zipBuffer = buf
                break
            }
        } catch (err) {
            lastError = err instanceof Error ? err.message : String(err)
        }
    }

    if (!zipBuffer) {
        throw new Error(`No se pudo descargar el núcleo Snes9x (${lastError || 'sin conexión'}).`)
    }

    const zip = await JSZip.loadAsync(zipBuffer)
    const jsEntry =
        zip.file('snes9x_libretro.js') ||
        Object.values(zip.files).find((f) => !f.dir && f.name.endsWith('.js'))
    const wasmEntry =
        zip.file('snes9x_libretro.wasm') ||
        Object.values(zip.files).find((f) => !f.dir && f.name.endsWith('.wasm'))

    if (!jsEntry || !wasmEntry) {
        throw new Error('El paquete del núcleo Snes9x no contiene snes9x_libretro.js / .wasm.')
    }

    const [jsBuf, wasmBuf] = await Promise.all([
        jsEntry.async('arraybuffer'),
        wasmEntry.async('arraybuffer'),
    ])

    cachedSnes9xCore = {
        js: new Blob([jsBuf], { type: 'application/javascript' }),
        wasm: new Blob([wasmBuf], { type: 'application/wasm' }),
    }

    return cachedSnes9xCore
}

// Desempaqueta automáticamente archivos .zip o valida binarios .sfc / .smc
async function prepareRomPayload(
    sourceBlob: Blob,
    originalFileName: string
): Promise<{ fileName: string; fileContent: Blob }> {
    const buffer = await sourceBlob.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    if (bytes.byteLength < 1024) {
        throw new Error('El archivo ROM está vacío o es demasiado pequeño.')
    }

    const headerAscii = String.fromCharCode(...bytes.slice(0, 15)).toLowerCase()
    if (headerAscii.includes('<!doctype') || headerAscii.includes('<html')) {
        throw new Error('El archivo ROM aún no se encuentra en el servidor.')
    }

    const isZipHeader =
        bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05)

    if (isZipHeader) {
        const zip = await JSZip.loadAsync(buffer)
        const validRomExts = ['.sfc', '.smc', '.fig', '.swc', '.bs', '.bin']
        const entries = Object.values(zip.files).filter((f) => !f.dir)

        const romEntry =
            entries.find((f) =>
                validRomExts.some((ext) => f.name.toLowerCase().endsWith(ext))
            ) || entries[0]

        if (!romEntry) {
            throw new Error('El archivo .zip no contiene ninguna ROM de SNES (.sfc / .smc).')
        }

        const extractedBuffer = await romEntry.async('arraybuffer')
        const extMatch = romEntry.name.toLowerCase().match(/\.(sfc|smc|fig|swc|bs|bin)$/)
        const cleanExt = extMatch ? extMatch[0] : '.sfc'

        return {
            fileName: `cartridge${cleanExt}`,
            fileContent: new Blob([extractedBuffer], { type: 'application/octet-stream' }),
        }
    }

    const extMatch = originalFileName.toLowerCase().match(/\.(sfc|smc|fig|swc|bs|bin)$/)
    const cleanExt = extMatch ? extMatch[0] : '.sfc'

    return {
        fileName: `cartridge${cleanExt}`,
        fileContent: new Blob([buffer], { type: 'application/octet-stream' }),
    }
}

export const SnesEmulatorGame: React.FC<SnesEmulatorGameProps> = ({ game, onBack }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const folderInputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const nostalgistRef = useRef<Nostalgist | null>(null)
    const launchIdRef = useRef<number>(0)

    const [romCatalog, setRomCatalog] = useState<SnesRomItem[]>([])
    const [activeRomItem, setActiveRomItem] = useState<SnesRomItem | null>(null)
    const [canvasKey, setCanvasKey] = useState<number>(1)

    // Estado principal: 'library' es la pantalla de inicio sin auto-arranque
    const [status, setStatus] = useState<'library' | 'loading' | 'running' | 'error' | 'missing'>('library')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isPaused, setIsPaused] = useState<boolean>(false)
    const [saveNotice, setSaveNotice] = useState<string | null>(null)
    const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false)
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

    // Filtros y búsqueda en la Biblioteca
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [selectedCategory, setSelectedCategory] = useState<string>('todos')

    // Modales de Controles y Partidas Guardadas
    const [keybindings, setKeybindings] = useState<SnesKeybindings>(loadSnesKeybindings())
    const [showControlsModal, setShowControlsModal] = useState<boolean>(false)
    const [showSavesModal, setShowSavesModal] = useState<boolean>(false)

    // Escuchar cambios de fullscreen del navegador
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement
            setIsFullscreen(isFull)
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    // Detener instancia previa de forma segura
    const stopEmulator = useCallback(async () => {
        const current = nostalgistRef.current
        nostalgistRef.current = null
        if (current) {
            try {
                current.exit({ removeCanvas: false })
            } catch {
                // Ignorar errores al cerrar instancia previa
            }
        }
    }, [])

    // Lanzar una ROM específica
    const launchRomItem = useCallback(
        async (item: SnesRomItem, directBlob?: Blob) => {
            const currentLaunchId = ++launchIdRef.current
            setActiveRomItem(item)
            setStatus('loading')
            setErrorMessage(null)
            setIsPaused(false)

            await stopEmulator()

            try {
                let sourceBlob: Blob | null = directBlob || item.fileData || null

                if (!sourceBlob && item.isCustom) {
                    sourceBlob = await getLocalRomFile(item.id)
                }

                if (!sourceBlob && item.url) {
                    try {
                        const res = await fetch(item.url)
                        const contentType = (res.headers.get('content-type') || '').toLowerCase()
                        if (res.ok && !contentType.includes('text/html')) {
                            sourceBlob = await res.blob()
                        }
                    } catch {
                        // Continuar a fallback local
                    }
                }

                if (!sourceBlob) {
                    sourceBlob = await getLocalRomFile(item.id)
                }

                if (currentLaunchId !== launchIdRef.current) return

                if (!sourceBlob) {
                    setStatus('missing')
                    return
                }

                const [romPayload, coreBlobs] = await Promise.all([
                    prepareRomPayload(sourceBlob, item.fileName),
                    loadSnes9xCoreBlobs(),
                ])

                if (currentLaunchId !== launchIdRef.current) return

                setCanvasKey((prev) => prev + 1)
                await new Promise((r) => setTimeout(r, 40))

                if (currentLaunchId !== launchIdRef.current || !canvasRef.current) return

                const retroConfig = buildRetroArchInputConfig(keybindings)

                const instance = await Nostalgist.launch({
                    element: canvasRef.current,
                    core: {
                        name: 'snes9x',
                        js: coreBlobs.js,
                        wasm: coreBlobs.wasm,
                    },
                    rom: romPayload,
                    size: 'auto',
                    retroarchConfig: {
                        ...retroConfig,
                        video_vsync: true,
                        savestate_thumbnail_enable: true,
                    },
                })

                if (currentLaunchId !== launchIdRef.current) {
                    try {
                        instance.exit({ removeCanvas: false })
                    } catch {
                        // ignore
                    }
                    return
                }

                nostalgistRef.current = instance
                setStatus('running')
                canvasRef.current?.focus()
            } catch (err: unknown) {
                if (currentLaunchId !== launchIdRef.current) return
                console.error('Error al iniciar Snes9x / Nostalgist:', err)
                setStatus('error')
                setErrorMessage(
                    err instanceof Error
                        ? err.message
                        : 'Error desconocido al inicializar el núcleo SNES.'
                )
            }
        },
        [stopEmulator, keybindings]
    )

    // Cargar catálogo de ROMs al montar el componente SIN AUTO-ARRANQUE
    useEffect(() => {
        let cancelled = false
        loadSnesRomsCatalog().then((list) => {
            if (cancelled) return
            setRomCatalog(list)
            // NO se auto-arranca ningún juego: se deja status en 'library' para que el usuario elija
            if (list.length === 0) {
                setStatus('missing')
            }
        })

        return () => {
            cancelled = true
            launchIdRef.current++
            stopEmulator()
        }
    }, [stopEmulator])

    // Evitar que las teclas del juego desplacen la pantalla
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (status !== 'running') return
            const blocked = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']
            if (blocked.includes(e.code)) {
                const target = e.target as HTMLElement | null
                if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
                e.preventDefault()
            }
        }
        window.addEventListener('keydown', handleKeyDown, { passive: false })
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [status])

    // Procesar archivo ROM subido
    const processUploadedRomFile = async (file: File) => {
        const cleanSlug = file.name
            .replace(/\.[^/.]+$/, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
        const romId = `snes_local_${cleanSlug}`
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')

        const savedItem = await saveLocalRomFile(romId, cleanName, file)
        const updatedList = await loadSnesRomsCatalog()
        setRomCatalog(updatedList)
        setSaveNotice(`🎮 Cartucho listo: ${cleanName}`)
        setTimeout(() => setSaveNotice(null), 3000)

        await launchRomItem(savedItem, file)
    }

    const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        await processUploadedRomFile(file)
    }

    // Escanear carpeta completa
    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files
        if (!fileList || fileList.length === 0) return
        const files = Array.from(fileList)
        e.target.value = ''

        const validExts = ['.sfc', '.smc', '.fig', '.swc', '.zip']
        let addedCount = 0

        for (const file of files) {
            const dotIndex = file.name.lastIndexOf('.')
            const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : ''
            if (validExts.includes(ext)) {
                const cleanSlug = file.name
                    .replace(/\.[^/.]+$/, '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_')
                const romId = `snes_local_${cleanSlug}`
                const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')
                await saveLocalRomFile(romId, cleanName, file)
                addedCount++
            }
        }

        const updated = await loadSnesRomsCatalog()
        setRomCatalog(updated)

        if (addedCount > 0) {
            setSaveNotice(`🎮 ¡Se agregaron ${addedCount} ROM(s) de SNES a tu biblioteca!`)
            setTimeout(() => setSaveNotice(null), 4000)
        } else {
            setSaveNotice('⚠️ No se encontraron archivos .sfc, .smc o .zip en esa carpeta.')
            setTimeout(() => setSaveNotice(null), 3500)
        }
    }

    const handleNativeDirectoryPicker = async () => {
        if ('showDirectoryPicker' in window) {
            try {
                const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<{ values: () => AsyncIterable<{ kind: string; getFile: () => Promise<File> }> }> }).showDirectoryPicker()
                const validExts = ['.sfc', '.smc', '.fig', '.swc', '.zip']
                let addedCount = 0

                for await (const entry of dirHandle.values()) {
                    if (entry.kind === 'file') {
                        const file = await entry.getFile()
                        const dotIndex = file.name.lastIndexOf('.')
                        const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : ''
                        if (validExts.includes(ext)) {
                            const cleanSlug = file.name
                                .replace(/\.[^/.]+$/, '')
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '_')
                            const romId = `snes_local_${cleanSlug}`
                            const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')
                            await saveLocalRomFile(romId, cleanName, file)
                            addedCount++
                        }
                    }
                }

                const updated = await loadSnesRomsCatalog()
                setRomCatalog(updated)

                if (addedCount > 0) {
                    setSaveNotice(`🎮 ¡Directorio sincronizado: ${addedCount} ROM(s) cargadas!`)
                    setTimeout(() => setSaveNotice(null), 4000)
                } else {
                    setSaveNotice('⚠️ No se encontraron archivos .sfc, .smc o .zip en la carpeta.')
                    setTimeout(() => setSaveNotice(null), 3500)
                }
            } catch (err: unknown) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    folderInputRef.current?.click()
                }
            }
        } else {
            folderInputRef.current?.click()
        }
    }

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDraggingOver(false)
        const file = e.dataTransfer.files?.[0]
        if (!file) return
        await processUploadedRomFile(file)
    }

    // Controles de emulación
    const togglePause = () => {
        if (!nostalgistRef.current) return
        try {
            if (isPaused) {
                nostalgistRef.current.resume()
                setIsPaused(false)
            } else {
                nostalgistRef.current.pause()
                setIsPaused(true)
            }
        } catch (err) {
            console.error('Error al pausar/reanudar:', err)
        }
    }

    const restartGame = () => {
        if (!nostalgistRef.current) return
        try {
            nostalgistRef.current.restart()
            setIsPaused(false)
        } catch (err) {
            console.error('Error al reiniciar:', err)
        }
    }

    // Guardado rápido en Slot 1 (o vía modal para slots 1, 2, 3)
    const handleQuickSave = async (slot = 1) => {
        if (!nostalgistRef.current || !activeRomItem) {
            throw new Error('El emulador no está en ejecución.')
        }
        const { state, thumbnail } = await nostalgistRef.current.saveState()
        await saveGameState(activeRomItem.id, activeRomItem.name, slot, state, thumbnail)
        setSaveNotice(`💾 ¡Partida guardada en Slot ${slot}!`)
        setTimeout(() => setSaveNotice(null), 3000)
    }

    // Carga rápida desde Slot 1 (o vía modal)
    const handleQuickLoad = async (slot = 1) => {
        if (!nostalgistRef.current || !activeRomItem) return
        try {
            const stateBlob = await loadGameState(activeRomItem.id, slot)
            if (!stateBlob) {
                setSaveNotice(`⚠️ No hay partida guardada en el Slot ${slot}`)
                setTimeout(() => setSaveNotice(null), 3000)
                return
            }
            await nostalgistRef.current.loadState(stateBlob)
            setSaveNotice(`⚡ ¡Partida cargada desde el Slot ${slot}!`)
            setTimeout(() => setSaveNotice(null), 3000)
        } catch (err) {
            console.error('Error cargando estado:', err)
            setSaveNotice('❌ Error al cargar partida')
            setTimeout(() => setSaveNotice(null), 3000)
        }
    }

    const handleLoadBlobState = async (stateBlob: Blob) => {
        if (!nostalgistRef.current) {
            throw new Error('El emulador no está corriendo.')
        }
        await nostalgistRef.current.loadState(stateBlob)
    }

    // Regresar a la biblioteca de juegos
    const handleReturnToLibrary = async () => {
        await stopEmulator()
        setStatus('library')
    }

    const handleFullscreen = () => {
        const el = containerRef.current
        if (!el) return
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
        } else {
            el.requestFullscreen?.().catch(() => {})
        }
    }

    const handleDeleteLocalRom = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        await deleteLocalRomFile(id)
        const updated = await loadSnesRomsCatalog()
        setRomCatalog(updated)
    }

    // Filtrado de juegos en la biblioteca
    const filteredRoms = useMemo(() => {
        return romCatalog.filter((rom) => {
            const matchesQuery =
                rom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (rom.genre && rom.genre.toLowerCase().includes(searchQuery.toLowerCase())) ||
                rom.fileName.toLowerCase().includes(searchQuery.toLowerCase())

            if (!matchesQuery) return false

            if (selectedCategory === 'lucha') {
                return (rom.genre || '').toLowerCase().includes('lucha') || (rom.genre || '').toLowerCase().includes('beat')
            }
            if (selectedCategory === 'plataformas') {
                return (rom.genre || '').toLowerCase().includes('plataforma')
            }
            if (selectedCategory === 'accion') {
                return (rom.genre || '').toLowerCase().includes('acción') || (rom.genre || '').toLowerCase().includes('gun') || (rom.genre || '').toLowerCase().includes('western')
            }
            if (selectedCategory === 'locales') {
                return rom.isCustom
            }

            return true
        })
    }, [romCatalog, searchQuery, selectedCategory])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {/* Inputs ocultos para subida de archivos / carpetas */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".sfc,.smc,.fig,.swc,.zip"
                style={{ display: 'none' }}
                onChange={handleSingleFileUpload}
            />
            <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error - webkitdirectory
                webkitdirectory=""
                multiple
                style={{ display: 'none' }}
                onChange={handleFolderUpload}
            />

            {/* Modal de Configuración de Controles */}
            <SnesControlsModal
                isOpen={showControlsModal}
                onClose={() => setShowControlsModal(false)}
                bindings={keybindings}
                onSaveBindings={(newBindings) => setKeybindings(newBindings)}
            />

            {/* Modal de Partidas Guardadas */}
            {activeRomItem && (
                <SnesSaveStatesModal
                    isOpen={showSavesModal}
                    onClose={() => setShowSavesModal(false)}
                    gameId={activeRomItem.id}
                    gameTitle={activeRomItem.name}
                    onSaveStateAction={handleQuickSave}
                    onLoadStateAction={handleLoadBlobState}
                />
            )}

            {/* Notificación flotante / Toast */}
            {saveNotice && (
                <div
                    style={{
                        padding: '8px 14px',
                        background: 'rgba(255, 199, 0, 0.25)',
                        border: '1px solid var(--pixel-gold-coin)',
                        color: 'var(--pixel-gold-coin)',
                        fontFamily: 'var(--font-pixel-ui)',
                        fontSize: '12px',
                        textAlign: 'center',
                        borderRadius: '4px',
                    }}
                >
                    {saveNotice}
                </div>
            )}

            {/* ==============================================================
                VISTA 1: BIBLIOTECA DE JUEGOS SNES (SIN AUTO-ARRANQUE)
                ============================================================== */}
            {status === 'library' && (
                <div
                    className="pixel-box"
                    onDragOver={(e) => {
                        e.preventDefault()
                        setIsDraggingOver(true)
                    }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={handleDrop}
                    style={{
                        padding: '16px',
                        background: isDraggingOver ? 'rgba(56, 189, 248, 0.1)' : 'rgba(12, 10, 26, 0.98)',
                        borderColor: isDraggingOver ? 'var(--pixel-neon-cyan)' : 'var(--pixel-gold-coin)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                    }}
                >
                    {/* Header Principal de la Biblioteca */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            paddingBottom: '12px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '28px' }}>🕹️</span>
                            <div>
                                <h3
                                    style={{
                                        margin: 0,
                                        fontFamily: 'var(--font-pixel-title)',
                                        fontSize: '15px',
                                        color: 'var(--pixel-gold-coin)',
                                    }}
                                >
                                    SUPER NINTENDO ENTERTAINMENT SYSTEM
                                </h3>
                                <span
                                    style={{
                                        fontFamily: 'var(--font-pixel-ui)',
                                        fontSize: '11px',
                                        color: '#94a3b8',
                                    }}
                                >
                                    {romCatalog.length} juegos listos • Seleccioná un título para jugar o sumá tus ROMs
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '11px', borderColor: 'var(--pixel-neon-cyan)', color: 'var(--pixel-neon-cyan)' }}
                                onClick={() => setShowControlsModal(true)}
                                title="Configurar teclas y botones del control SNES"
                            >
                                🎮 Configurar Controles
                            </button>

                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '11px' }}
                                onClick={handleNativeDirectoryPicker}
                                title="Escanear una carpeta de tu PC para detectar todas las ROMs"
                            >
                                📁 Escanear Carpeta
                            </button>

                            <button
                                type="button"
                                className="pixel-btn pixel-btn-primary"
                                style={{ fontSize: '11px' }}
                                onClick={() => fileInputRef.current?.click()}
                                title="Cargar un archivo .sfc, .smc o .zip desde tu PC"
                            >
                                📂 Cargar ROM (.sfc / .zip)
                            </button>

                            {onBack && (
                                <button
                                    type="button"
                                    className="pixel-btn"
                                    style={{ fontSize: '11px' }}
                                    onClick={onBack}
                                >
                                    ✕ Salir
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Barra de Búsqueda y Categorías */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {[
                                { id: 'todos', label: `Todos (${romCatalog.length})` },
                                { id: 'plataformas', label: '🍄 Plataformas' },
                                { id: 'lucha', label: '🥋 Lucha' },
                                { id: 'accion', label: '🤠 Acción' },
                                { id: 'locales', label: '💾 ROMs Locales' },
                            ].map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    className={`pixel-btn ${selectedCategory === cat.id ? 'pixel-btn-primary' : ''}`}
                                    style={{ fontSize: '10px', padding: '4px 10px' }}
                                    onClick={() => setSelectedCategory(cat.id)}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        <input
                            type="text"
                            placeholder="🔍 Buscar juego (Mario, Street Fighter, Donkey...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                background: '#111827',
                                border: '1px solid #374151',
                                borderRadius: '4px',
                                color: '#f3f4f6',
                                padding: '6px 12px',
                                fontSize: '11px',
                                fontFamily: 'var(--font-pixel-ui)',
                                minWidth: '240px',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* Grilla de Cartuchos / Juegos */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: '12px',
                            maxHeight: '480px',
                            overflowY: 'auto',
                            padding: '4px',
                        }}
                    >
                        {filteredRoms.map((rom) => {
                            return (
                                <div
                                    key={rom.id}
                                    className="pixel-box"
                                    style={{
                                        padding: '12px',
                                        borderColor: rom.color || '#ff3366',
                                        background: 'rgba(20, 18, 38, 0.85)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '10px',
                                        transition: 'transform 0.12s ease, border-color 0.12s ease',
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                            <span style={{ fontSize: '26px', flexShrink: 0 }}>{rom.icon || '🎮'}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontFamily: 'var(--font-pixel-title)',
                                                        fontSize: '12px',
                                                        color: '#f8fafc',
                                                        lineHeight: 1.3,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                    title={rom.name}
                                                >
                                                    {rom.name}
                                                </div>
                                                <div
                                                    style={{
                                                        fontFamily: 'var(--font-pixel-ui)',
                                                        fontSize: '10px',
                                                        color: rom.color || '#ff3366',
                                                        marginTop: '2px',
                                                    }}
                                                >
                                                    {rom.genre || 'SNES / Clásico'}
                                                </div>
                                            </div>
                                        </div>

                                        <p
                                            style={{
                                                fontFamily: 'var(--font-pixel-ui)',
                                                fontSize: '11px',
                                                color: '#cbd5e1',
                                                margin: '8px 0 0 0',
                                                lineHeight: 1.4,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                            title={rom.objective}
                                        >
                                            {rom.objective || `Juego de SNES (${rom.fileName})`}
                                        </p>
                                    </div>

                                    {/* Botón Jugar y Acciones */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                        {rom.isCustom ? (
                                            <button
                                                type="button"
                                                className="pixel-btn"
                                                style={{ fontSize: '9px', padding: '2px 6px', color: '#ff4444', borderColor: '#ff4444' }}
                                                onClick={(e) => handleDeleteLocalRom(e, rom.id)}
                                                title="Eliminar ROM guardada en este navegador"
                                            >
                                                🗑️ Borrar
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '9px', color: '#64748b', fontFamily: 'var(--font-pixel-ui)' }}>
                                                {rom.fileName.endsWith('.zip') ? '📦 ZIP' : '💾 ROM'}
                                            </span>
                                        )}

                                        <button
                                            type="button"
                                            className="pixel-btn pixel-btn-primary"
                                            style={{
                                                fontSize: '11px',
                                                padding: '6px 16px',
                                                background: rom.color ? `${rom.color}33` : undefined,
                                                borderColor: rom.color || 'var(--pixel-gold-coin)',
                                                color: '#ffffff',
                                                fontWeight: 700,
                                            }}
                                            onClick={() => launchRomItem(rom)}
                                        >
                                            ▶ JUGAR
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ==============================================================
                VISTA 2: EN EMULACIÓN (RUNNING / LOADING / ERROR)
                ============================================================== */}
            {status !== 'library' && (
                <>
                    {/* Barra Superior de Control del Emulador en Ejecución */}
                    <div
                        className="pixel-box"
                        style={{
                            padding: '10px 14px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            borderColor: activeRomItem?.color || game.color,
                            background: 'rgba(10, 8, 22, 0.9)',
                        }}
                    >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            <button
                                type="button"
                                className="pixel-btn"
                                style={{
                                    fontSize: '11px',
                                    padding: '4px 10px',
                                    borderColor: 'var(--pixel-gold-coin)',
                                    color: 'var(--pixel-gold-coin)',
                                }}
                                onClick={handleReturnToLibrary}
                                title="Volver a la selección de juegos SNES"
                            >
                                ◀ Biblioteca de Juegos
                            </button>

                            <span
                                style={{
                                    padding: '3px 8px',
                                    background: 'rgba(255, 51, 102, 0.2)',
                                    border: `1px solid ${activeRomItem?.color || game.color}`,
                                    color: activeRomItem?.color || game.color,
                                    fontFamily: 'var(--font-pixel-title)',
                                    fontSize: '10px',
                                }}
                            >
                                {activeRomItem?.name || game.name}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '10px', borderColor: 'var(--pixel-neon-cyan)', color: 'var(--pixel-neon-cyan)' }}
                                onClick={() => setShowControlsModal(true)}
                                title="Mapear teclado o ver controles"
                            >
                                🎮 Controles
                            </button>

                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '10px', borderColor: 'var(--pixel-gold-coin)', color: 'var(--pixel-gold-coin)' }}
                                onClick={() => setShowSavesModal(true)}
                                title="Administrar partidas guardadas en Slots 1, 2, 3"
                            >
                                💾 Partidas
                            </button>

                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '10px' }}
                                onClick={() => handleQuickSave(1)}
                                title="Guardado rápido en Slot 1"
                            >
                                💾 Guardar
                            </button>

                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '10px' }}
                                onClick={() => handleQuickLoad(1)}
                                title="Cargar Slot 1"
                            >
                                ⚡ Cargar
                            </button>

                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '10px' }}
                                onClick={togglePause}
                            >
                                {isPaused ? '▶ Reanudar' : '⏸ Pausa'}
                            </button>

                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '10px' }}
                                onClick={restartGame}
                            >
                                ↻ Reiniciar
                            </button>

                            <button
                                type="button"
                                className="pixel-btn pixel-btn-primary"
                                style={{ fontSize: '10px' }}
                                onClick={handleFullscreen}
                            >
                                ⛶ Pantalla Completa
                            </button>
                        </div>
                    </div>

                    {/* Viewport del Canvas */}
                    <div
                        ref={containerRef}
                        className="pixel-box"
                        onDragOver={(e) => {
                            e.preventDefault()
                            setIsDraggingOver(true)
                        }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={handleDrop}
                        style={{
                            position: isFullscreen ? 'fixed' : 'relative',
                            inset: isFullscreen ? 0 : undefined,
                            width: isFullscreen ? '100vw' : '100%',
                            height: isFullscreen ? '100vh' : '540px',
                            zIndex: isFullscreen ? 999999 : undefined,
                            borderColor: isDraggingOver ? 'var(--pixel-neon-cyan)' : activeRomItem?.color || game.color,
                            background: '#000',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {isFullscreen && (
                            <button
                                type="button"
                                className="pixel-btn"
                                onClick={handleFullscreen}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    zIndex: 1000,
                                    fontSize: '11px',
                                    background: 'rgba(0,0,0,0.7)',
                                    borderColor: 'var(--pixel-gold-coin)',
                                    color: 'var(--pixel-gold-coin)',
                                }}
                            >
                                ✕ Salir Pantalla Completa (ESC)
                            </button>
                        )}

                        <canvas
                            key={canvasKey}
                            ref={canvasRef}
                            tabIndex={0}
                            style={{
                                width: 'auto',
                                height: 'auto',
                                maxWidth: '100%',
                                maxHeight: '100%',
                                aspectRatio: '4 / 3',
                                objectFit: 'contain',
                                imageRendering: 'pixelated',
                                outline: 'none',
                                opacity: status === 'running' ? 1 : 0,
                                pointerEvents: status === 'running' ? 'auto' : 'none',
                            }}
                        />

                        {status === 'loading' && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(7, 6, 15, 0.92)',
                                    fontFamily: 'var(--font-pixel-title)',
                                    fontSize: '13px',
                                    color: 'var(--pixel-neon-cyan)',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    alignItems: 'center',
                                    padding: '20px',
                                }}
                            >
                                <span>⏳ Iniciando {activeRomItem?.name || 'SNES'}...</span>
                                <span style={{ fontFamily: 'var(--font-pixel-ui)', fontSize: '11px', color: '#aaa' }}>
                                    Cargando núcleo Snes9x WebAssembly (Soporte SA-1 / Super FX)
                                </span>
                            </div>
                        )}

                        {status === 'error' && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(7, 6, 15, 0.95)',
                                    padding: '24px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    alignItems: 'center',
                                }}
                            >
                                <div style={{ fontSize: '36px' }}>⚠️</div>
                                <div style={{ fontFamily: 'var(--font-pixel-title)', fontSize: '13px', color: '#ff4444' }}>
                                    No se pudo iniciar la ROM
                                </div>
                                <p style={{ fontFamily: 'var(--font-pixel-ui)', fontSize: '12px', color: '#ccc', maxWidth: '460px' }}>
                                    {errorMessage || 'Verifica que el archivo sea una ROM válida de Super Nintendo (.sfc, .smc o .zip).'}
                                </p>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        className="pixel-btn pixel-btn-primary"
                                        onClick={handleReturnToLibrary}
                                    >
                                        ◀ Volver a la Biblioteca
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer con Mapeo de Controles */}
                    <div
                        className="pixel-box"
                        style={{
                            padding: '10px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            borderColor: 'rgba(255,255,255,0.18)',
                            background: 'rgba(10, 8, 22, 0.75)',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '8px',
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: 'var(--font-pixel-title)',
                                    fontSize: '10px',
                                    color: 'var(--pixel-gold-coin)',
                                }}
                            >
                                🎮 CONTROLES ACTIVOS ({activeRomItem?.name})
                            </span>
                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '9px', padding: '2px 8px', color: 'var(--pixel-neon-cyan)', borderColor: 'var(--pixel-neon-cyan)' }}
                                onClick={() => setShowControlsModal(true)}
                            >
                                ⚙️ Cambiar Teclas
                            </button>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '12px',
                                fontFamily: 'var(--font-pixel-ui)',
                                fontSize: '11px',
                                color: '#d0d0d0',
                            }}
                        >
                            {(activeRomItem?.controls || game.controls).map((ctrl, idx) => (
                                <span key={idx}>• {ctrl}</span>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
