import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Nostalgist } from 'nostalgist'
import JSZip from 'jszip'
import {
    SnesRomItem,
    loadSnesRomsCatalog,
    saveLocalRomFile,
    getLocalRomFile,
    deleteLocalRomFile,
} from '../snesRomsStore'

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
            // Verificar firma ZIP (PK\x03\x04)
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

    // Comprobar si por error es un HTML (404 SPA fallback)
    const headerAscii = String.fromCharCode(...bytes.slice(0, 15)).toLowerCase()
    if (headerAscii.includes('<!doctype') || headerAscii.includes('<html')) {
        throw new Error('El archivo ROM aún no se encuentra en el servidor.')
    }

    // Si es un archivo ZIP (PK\x03\x04), extraer el .sfc / .smc interno con JSZip
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

export const SnesEmulatorGame: React.FC<SnesEmulatorGameProps> = ({ game }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const folderInputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const nostalgistRef = useRef<Nostalgist | null>(null)
    const launchIdRef = useRef<number>(0)

    const [romCatalog, setRomCatalog] = useState<SnesRomItem[]>([])
    const [activeRomItem, setActiveRomItem] = useState<SnesRomItem | null>(null)
    const [canvasKey, setCanvasKey] = useState<number>(1)

    const [status, setStatus] = useState<'idle' | 'checking' | 'loading' | 'running' | 'error' | 'missing'>('checking')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isPaused, setIsPaused] = useState<boolean>(false)
    const [saveNotice, setSaveNotice] = useState<string | null>(null)
    const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false)
    const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false)
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

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
                // 1. Obtener el Blob de la ROM (directo, memoria/IndexedDB, o servidor)
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

                // 2. Desempaquetar ROM (.zip -> .sfc) y cargar núcleo Snes9x en paralelo
                const [romPayload, coreBlobs] = await Promise.all([
                    prepareRomPayload(sourceBlob, item.fileName),
                    loadSnes9xCoreBlobs(),
                ])

                if (currentLaunchId !== launchIdRef.current) return

                // Forzar un nodo <canvas> limpio y esperar un microtick a que React lo monte
                setCanvasKey((prev) => prev + 1)
                await new Promise((r) => setTimeout(r, 30))

                if (currentLaunchId !== launchIdRef.current || !canvasRef.current) return

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
                        input_player1_up: 'up',
                        input_player1_down: 'down',
                        input_player1_left: 'left',
                        input_player1_right: 'right',
                        input_player1_b: 'z',
                        input_player1_a: 'x',
                        input_player1_y: 'a',
                        input_player1_x: 's',
                        input_player1_l: 'q',
                        input_player1_r: 'w',
                        input_player1_start: 'enter',
                        input_player1_select: 'rshift',
                        video_vsync: true,
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
        [stopEmulator]
    )

    // Inicializar catálogo al abrir el componente
    useEffect(() => {
        let cancelled = false
        loadSnesRomsCatalog().then((list) => {
            if (cancelled) return
            setRomCatalog(list)
            if (list.length > 0) {
                launchRomItem(list[0])
            } else {
                setStatus('missing')
            }
        })

        return () => {
            cancelled = true
            launchIdRef.current++
            stopEmulator()
        }
    }, [launchRomItem, stopEmulator])

    // Evitar que las flechas o Espacio desplacen el modal mientras se juega
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

    // Procesar un archivo ROM individual (desde botón o Drag & Drop)
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
        setShowCatalogModal(false)
        setSaveNotice(`🎮 Cargando cartucho: ${cleanName}...`)
        setTimeout(() => setSaveNotice(null), 3000)

        await launchRomItem(savedItem, file)
    }

    const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = '' // Permitir volver a seleccionar el mismo archivo
        if (!file) return
        await processUploadedRomFile(file)
    }

    // Procesar múltiples archivos desde selector de carpeta
    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files
        if (!fileList || fileList.length === 0) return
        const files = Array.from(fileList)
        e.target.value = ''

        const validExts = ['.sfc', '.smc', '.fig', '.swc', '.zip']
        let lastSaved: { item: SnesRomItem; file: File } | null = null
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
                const savedItem = await saveLocalRomFile(romId, cleanName, file)
                lastSaved = { item: savedItem, file }
                addedCount++
            }
        }

        const updated = await loadSnesRomsCatalog()
        setRomCatalog(updated)
        setShowCatalogModal(false)

        if (addedCount > 0 && lastSaved) {
            setSaveNotice(`🎮 ¡Se agregaron ${addedCount} ROM(s) de SNES a tu biblioteca!`)
            setTimeout(() => setSaveNotice(null), 4000)
            await launchRomItem(lastSaved.item, lastSaved.file)
        } else {
            setSaveNotice('⚠️ No se encontraron archivos .sfc, .smc o .zip en esa carpeta.')
            setTimeout(() => setSaveNotice(null), 3500)
        }
    }

    // Escaneo de carpeta con File System Access API o fallback a webkitdirectory
    const handleNativeDirectoryPicker = async () => {
        if ('showDirectoryPicker' in window) {
            try {
                const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<{ values: () => AsyncIterable<{ kind: string; getFile: () => Promise<File> }> }> }).showDirectoryPicker()
                const validExts = ['.sfc', '.smc', '.fig', '.swc', '.zip']
                let lastSaved: { item: SnesRomItem; file: File } | null = null
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
                            const savedItem = await saveLocalRomFile(romId, cleanName, file)
                            lastSaved = { item: savedItem, file }
                            addedCount++
                        }
                    }
                }

                const updated = await loadSnesRomsCatalog()
                setRomCatalog(updated)
                setShowCatalogModal(false)

                if (addedCount > 0 && lastSaved) {
                    setSaveNotice(`🎮 ¡Directorio sincronizado: ${addedCount} ROM(s) cargadas!`)
                    setTimeout(() => setSaveNotice(null), 4000)
                    await launchRomItem(lastSaved.item, lastSaved.file)
                } else {
                    setSaveNotice('⚠️ No se encontraron archivos .sfc, .smc o .zip en la carpeta elegida.')
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

    // Soporte Drag & Drop directo sobre el visor
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDraggingOver(false)
        const file = e.dataTransfer.files?.[0]
        if (!file) return
        await processUploadedRomFile(file)
    }

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

    const handleSaveState = async () => {
        if (!nostalgistRef.current || !activeRomItem) return
        try {
            const { state } = await nostalgistRef.current.saveState()
            const arrayBuffer = await state.arrayBuffer()
            const bytes = new Uint8Array(arrayBuffer)
            let binary = ''
            const len = bytes.byteLength
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i])
            }
            const base64 = btoa(binary)
            localStorage.setItem(`luxius_snes_save_${activeRomItem.id}`, base64)
            setSaveNotice(`💾 ¡Partida guardada en ${activeRomItem.name}!`)
            setTimeout(() => setSaveNotice(null), 3000)
        } catch (err) {
            console.error('Error guardando estado:', err)
            setSaveNotice('❌ Error al guardar partida')
            setTimeout(() => setSaveNotice(null), 3000)
        }
    }

    const handleLoadState = async () => {
        if (!nostalgistRef.current || !activeRomItem) return
        try {
            const base64 = localStorage.getItem(`luxius_snes_save_${activeRomItem.id}`)
            if (!base64) {
                setSaveNotice('⚠️ No hay partida guardada previa para este juego')
                setTimeout(() => setSaveNotice(null), 3000)
                return
            }
            const binary = atob(base64)
            const len = binary.length
            const bytes = new Uint8Array(len)
            for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i)
            }
            const blob = new Blob([bytes], { type: 'application/octet-stream' })
            await nostalgistRef.current.loadState(blob)
            setSaveNotice('⚡ ¡Partida cargada exitosamente!')
            setTimeout(() => setSaveNotice(null), 3000)
        } catch (err) {
            console.error('Error cargando estado:', err)
            setSaveNotice('❌ Error al cargar partida')
            setTimeout(() => setSaveNotice(null), 3000)
        }
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
        if (activeRomItem?.id === id && updated.length > 0) {
            await launchRomItem(updated[0])
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {/* Input oculto para subir archivo ROM suelto */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".sfc,.smc,.fig,.swc,.zip"
                style={{ display: 'none' }}
                onChange={handleSingleFileUpload}
            />

            {/* Input oculto para escanear carpeta completa */}
            <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error - webkitdirectory es soportado por Chromium/Firefox/Edge
                webkitdirectory=""
                multiple
                style={{ display: 'none' }}
                onChange={handleFolderUpload}
            />

            {/* Barra de Metadatos y Acciones */}
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
                        {activeRomItem?.genre || 'SNES (Super Nintendo)'}
                    </span>

                    <button
                        type="button"
                        className="pixel-btn"
                        style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderColor: 'var(--pixel-neon-cyan)',
                            color: 'var(--pixel-neon-cyan)',
                        }}
                        onClick={() => setShowCatalogModal((prev) => !prev)}
                        title="Ver lista de ROMs detectadas y cambiar de juego"
                    >
                        📚 Catálogo de ROMs ({romCatalog.length}) ▾
                    </button>

                    {activeRomItem?.exits && (
                        <span
                            style={{
                                padding: '3px 8px',
                                background: 'rgba(255, 199, 0, 0.16)',
                                border: '1px solid var(--pixel-gold-coin)',
                                color: 'var(--pixel-gold-coin)',
                                fontFamily: 'var(--font-pixel-ui)',
                                fontSize: '11px',
                            }}
                        >
                            🚩 {activeRomItem.exits}
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="pixel-btn"
                        style={{ fontSize: '10px' }}
                        onClick={handleNativeDirectoryPicker}
                        title="Escanear una carpeta de tu PC para detectar todas las ROMs"
                    >
                        📁 Escanear Carpeta
                    </button>

                    <button
                        type="button"
                        className="pixel-btn pixel-btn-primary"
                        style={{ fontSize: '10px' }}
                        onClick={() => fileInputRef.current?.click()}
                        title="Cargar un archivo .sfc, .smc o .zip desde tu PC"
                    >
                        📂 Cargar ROM (.sfc / .zip)
                    </button>

                    {status === 'running' && (
                        <>
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
                                onClick={handleSaveState}
                                title="Guardar estado de juego en el navegador"
                            >
                                💾 Guardar
                            </button>
                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '10px' }}
                                onClick={handleLoadState}
                                title="Cargar estado guardado"
                            >
                                ⚡ Cargar
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
                        </>
                    )}
                </div>
            </div>

            {/* Notificación temporal */}
            {saveNotice && (
                <div
                    style={{
                        padding: '6px 12px',
                        background: 'rgba(255, 199, 0, 0.2)',
                        border: '1px solid var(--pixel-gold-coin)',
                        color: 'var(--pixel-gold-coin)',
                        fontFamily: 'var(--font-pixel-ui)',
                        fontSize: '12px',
                        textAlign: 'center',
                    }}
                >
                    {saveNotice}
                </div>
            )}

            {/* Selector desplegable de Catálogo de Juegos Detectados */}
            {showCatalogModal && (
                <div
                    className="pixel-box"
                    style={{
                        padding: '14px',
                        background: 'rgba(12, 10, 26, 0.98)',
                        borderColor: 'var(--pixel-neon-cyan)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-pixel-title)', fontSize: '13px', color: 'var(--pixel-gold-coin)' }}>
                            🕹️ BIBLIOTECA DE JUEGOS SNES ({romCatalog.length})
                        </span>
                        <button
                            type="button"
                            className="pixel-btn"
                            style={{ fontSize: '10px' }}
                            onClick={() => setShowCatalogModal(false)}
                        >
                            ✕ Cerrar
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="pixel-btn pixel-btn-primary"
                            style={{ fontSize: '11px' }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            ➕ Cargar Archivo ROM (.sfc / .smc / .zip)
                        </button>
                        <button
                            type="button"
                            className="pixel-btn"
                            style={{ fontSize: '11px' }}
                            onClick={handleNativeDirectoryPicker}
                        >
                            📁 Escanear Carpeta Completa de ROMs
                        </button>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: '10px',
                            maxHeight: '260px',
                            overflowY: 'auto',
                            padding: '4px',
                        }}
                    >
                        {romCatalog.map((rom) => {
                            const isCurrent = rom.id === activeRomItem?.id
                            return (
                                <div
                                    key={rom.id}
                                    className="pixel-box"
                                    onClick={() => {
                                        setShowCatalogModal(false)
                                        launchRomItem(rom)
                                    }}
                                    style={{
                                        padding: '10px',
                                        cursor: 'pointer',
                                        borderColor: isCurrent ? 'var(--pixel-gold-coin)' : rom.color || '#ff3366',
                                        background: isCurrent ? 'rgba(255, 199, 0, 0.12)' : 'rgba(20, 18, 38, 0.8)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        position: 'relative',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '20px' }}>{rom.icon || '🎮'}</span>
                                        <span
                                            style={{
                                                fontFamily: 'var(--font-pixel-title)',
                                                fontSize: '11px',
                                                color: isCurrent ? 'var(--pixel-gold-coin)' : '#fff',
                                                lineHeight: 1.3,
                                            }}
                                        >
                                            {rom.name}
                                        </span>
                                    </div>
                                    <div style={{ fontFamily: 'var(--font-pixel-ui)', fontSize: '10px', color: 'var(--pixel-text-dim)' }}>
                                        Archivo: {rom.fileName}
                                    </div>
                                    {rom.isCustom && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                            <span style={{ fontSize: '9px', color: 'var(--pixel-neon-cyan)' }}>[Guardado en Navegador]</span>
                                            <button
                                                type="button"
                                                className="pixel-btn"
                                                style={{ fontSize: '9px', padding: '1px 6px', color: '#ff4444', borderColor: '#ff4444' }}
                                                onClick={(e) => handleDeleteLocalRom(e, rom.id)}
                                            >
                                                🗑️ Quitar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Contenedor del Viewport con Canvas Nativo y soporte Drag & Drop */}
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
                {/* Botón flotante para salir de pantalla completa */}
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

                {/* El canvas escala con relación de aspecto 4:3 clásica de SNES sin deformar */}
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
                                onClick={() => fileInputRef.current?.click()}
                            >
                                📂 Seleccionar ROM (.sfc / .smc / .zip)
                            </button>
                            <button
                                type="button"
                                className="pixel-btn"
                                onClick={handleNativeDirectoryPicker}
                            >
                                📁 Escanear Carpeta
                            </button>
                        </div>
                    </div>
                )}

                {status === 'missing' && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(7, 6, 15, 0.95)',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            gap: '14px',
                        }}
                    >
                        <div style={{ fontSize: '42px' }}>{activeRomItem?.icon || '🍄'}</div>
                        <div
                            style={{
                                fontFamily: 'var(--font-pixel-title)',
                                fontSize: '14px',
                                color: activeRomItem?.color || game.color,
                                lineHeight: 1.5,
                                maxWidth: '520px',
                            }}
                        >
                            {activeRomItem?.name || game.name}
                        </div>
                        <p
                            style={{
                                fontFamily: 'var(--font-pixel-ui)',
                                fontSize: '13px',
                                color: '#e0e0e0',
                                margin: 0,
                                lineHeight: 1.5,
                                maxWidth: '520px',
                            }}
                        >
                            {activeRomItem?.objective || game.objective}
                        </p>
                        <div
                            style={{
                                padding: '10px 14px',
                                background: 'rgba(255, 199, 0, 0.1)',
                                border: '1px dashed var(--pixel-gold-coin)',
                                color: 'var(--pixel-gold-coin)',
                                fontFamily: 'var(--font-pixel-ui)',
                                fontSize: '11px',
                                lineHeight: 1.6,
                                maxWidth: '540px',
                            }}
                        >
                            Podés arrastrar y soltar cualquier archivo <code>.sfc</code>, <code>.smc</code> o <code>.zip</code> aquí mismo, seleccionarlo con el botón de abajo, o colocar tus ROMs en la carpeta del proyecto:
                            <br />
                            <code>F:\Sitio XignuX\public\roms\snes\</code>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                                type="button"
                                className="pixel-btn pixel-btn-primary"
                                style={{ fontSize: '12px', padding: '10px 18px' }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                📂 Seleccionar Archivo ROM (.sfc / .smc / .zip)
                            </button>
                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '12px', padding: '10px 18px' }}
                                onClick={handleNativeDirectoryPicker}
                            >
                                📁 Escanear Carpeta Completa
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer con Mapeo de Controles y Detalles */}
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
                        🎮 CONTROLES (SNES9X) • JUEGOS EN CATÁLOGO: {romCatalog.length}
                    </span>
                    {activeRomItem && (
                        <span
                            style={{
                                fontFamily: 'var(--font-pixel-ui)',
                                fontSize: '11px',
                                color: 'var(--pixel-neon-cyan)',
                            }}
                        >
                            Cartucho activo: {activeRomItem.name} ({activeRomItem.fileName})
                        </span>
                    )}
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
        </div>
    )
}
