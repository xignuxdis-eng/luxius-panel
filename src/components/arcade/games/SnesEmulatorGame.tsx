import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Nostalgist } from 'nostalgist'
import {
    SnesRomItem,
    loadSnesRomsCatalog,
    saveLocalRomFile,
    getLocalRomFile,
    deleteLocalRomFile
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

export const SnesEmulatorGame: React.FC<SnesEmulatorGameProps> = ({ game }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const folderInputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const nostalgistRef = useRef<Nostalgist | null>(null)

    // Catálogo de ROMs detectadas
    const [romCatalog, setRomCatalog] = useState<SnesRomItem[]>([])
    const [selectedRomId, setSelectedRomId] = useState<string>(game.id)
    const [activeRomItem, setActiveRomItem] = useState<SnesRomItem | null>(null)

    const [status, setStatus] = useState<'idle' | 'checking' | 'loading' | 'running' | 'error' | 'missing'>('checking')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isPaused, setIsPaused] = useState<boolean>(false)
    const [saveNotice, setSaveNotice] = useState<string | null>(null)
    const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false)

    // Detener emulador
    const stopEmulator = useCallback(async () => {
        if (nostalgistRef.current) {
            try {
                await nostalgistRef.current.exit({ removeCanvas: false })
            } catch {
                // Ignore cleanup errors
            }
            nostalgistRef.current = null
        }
    }, [])

    // Cargar catálogo inicial de ROMs
    const refreshCatalog = useCallback(async () => {
        const list = await loadSnesRomsCatalog()
        setRomCatalog(list)
        return list
    }, [])

    useEffect(() => {
        refreshCatalog().then(list => {
            const current = list.find(r => r.id === selectedRomId) || list[0] || null
            if (current) {
                setActiveRomItem(current)
            }
        })
    }, [refreshCatalog, selectedRomId])

    // Arrancar emulador con la ROM seleccionada
    const launchRomItem = useCallback(async (item: SnesRomItem) => {
        if (!canvasRef.current) return
        setStatus('loading')
        setErrorMessage(null)

        await stopEmulator()

        try {
            let romParam: File | Blob | string | { fileName: string; fileContent: Blob } | null = null

            // Si es local en IndexedDB
            if (item.isCustom) {
                const blob = await getLocalRomFile(item.id)
                if (blob) {
                    romParam = { fileName: item.fileName, fileContent: blob }
                }
            } else if (item.url) {
                // Comprobar existencia en servidor
                const checkRes = await fetch(item.url, { method: 'HEAD' })
                const contentType = (checkRes.headers.get('content-type') || '').toLowerCase()
                if (checkRes.ok && !contentType.includes('text/html')) {
                    romParam = item.url
                } else {
                    // Fallback a búsqueda local si el usuario ya la había subido
                    const fallbackBlob = await getLocalRomFile(item.id)
                    if (fallbackBlob) {
                        romParam = { fileName: item.fileName, fileContent: fallbackBlob }
                    }
                }
            }

            if (!romParam) {
                setStatus('missing')
                return
            }

            const instance = await Nostalgist.launch({
                core: 'snes9x',
                rom: romParam,
                element: canvasRef.current,
                resolveCoreJs(core) {
                    return `https://cdn.jsdelivr.net/gh/retrobrews/retroarch-web@master/dist/cores/${core}_libretro.js`
                },
                resolveCoreWasm(core) {
                    return `https://cdn.jsdelivr.net/gh/retrobrews/retroarch-web@master/dist/cores/${core}_libretro.wasm`
                },
            })

            nostalgistRef.current = instance
            setStatus('running')
            setActiveRomItem(item)
            setSelectedRomId(item.id)
        } catch (err: unknown) {
            console.error('Error al iniciar Snes9x / Nostalgist:', err)
            setStatus('error')
            setErrorMessage(err instanceof Error ? err.message : 'Error desconocido al inicializar el núcleo SNES.')
        }
    }, [stopEmulator])

    // Ejecutar cuando cambia el item activo
    useEffect(() => {
        if (!activeRomItem) return
        launchRomItem(activeRomItem)

        return () => {
            stopEmulator()
        }
    }, [activeRomItem, launchRomItem, stopEmulator])

    // Handler para subida de archivo ROM suelto (.sfc / .smc / .zip)
    const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const romId = `snes_custom_${Date.now()}`
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')
        await saveLocalRomFile(romId, cleanName, file)
        const updated = await refreshCatalog()
        const newItem = updated.find(r => r.id === romId)
        if (newItem) {
            setActiveRomItem(newItem)
            setSelectedRomId(newItem.id)
        }
        setShowCatalogModal(false)
    }

    // Handler para escaneo masivo de carpeta local
    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        const validExts = ['.sfc', '.smc', '.zip', '.7z']
        let addedCount = 0

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
            if (validExts.includes(ext)) {
                const romId = `snes_local_${file.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
                const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')
                await saveLocalRomFile(romId, cleanName, file)
                addedCount++
            }
        }

        if (addedCount > 0) {
            setSaveNotice(`🎮 ¡Se detectaron y agregaron ${addedCount} ROMs de SNES a tu biblioteca!`)
            setTimeout(() => setSaveNotice(null), 4000)
            const updated = await refreshCatalog()
            if (updated.length > 0) {
                setActiveRomItem(updated[updated.length - 1])
                setSelectedRomId(updated[updated.length - 1].id)
            }
        } else {
            setSaveNotice('⚠️ No se encontraron archivos .sfc o .smc en la carpeta seleccionada')
            setTimeout(() => setSaveNotice(null), 3000)
        }
        setShowCatalogModal(false)
    }

    // Usar File System Access API para abrir directorio si el navegador lo soporta
    const handleNativeDirectoryPicker = async () => {
        if ('showDirectoryPicker' in window) {
            try {
                const dirHandle = await (window as any).showDirectoryPicker()
                let addedCount = 0
                const validExts = ['.sfc', '.smc', '.zip', '.7z']

                for await (const entry of dirHandle.values()) {
                    if (entry.kind === 'file') {
                        const file = await entry.getFile()
                        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
                        if (validExts.includes(ext)) {
                            const romId = `snes_dir_${file.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
                            const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')
                            await saveLocalRomFile(romId, cleanName, file)
                            addedCount++
                        }
                    }
                }

                if (addedCount > 0) {
                    setSaveNotice(`🎮 ¡Directorio sincronizado: ${addedCount} ROMs cargadas!`)
                    setTimeout(() => setSaveNotice(null), 4000)
                    const updated = await refreshCatalog()
                    if (updated.length > 0) {
                        setActiveRomItem(updated[updated.length - 1])
                        setSelectedRomId(updated[updated.length - 1].id)
                    }
                } else {
                    setSaveNotice('⚠️ No se encontraron archivos SNES (.sfc/.smc) en la carpeta seleccionada.')
                    setTimeout(() => setSaveNotice(null), 3000)
                }
                setShowCatalogModal(false)
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.warn('showDirectoryPicker error:', err)
                    folderInputRef.current?.click()
                }
            }
        } else {
            folderInputRef.current?.click()
        }
    }

    const togglePause = async () => {
        if (!nostalgistRef.current) return
        try {
            if (isPaused) {
                await nostalgistRef.current.resume()
                setIsPaused(false)
            } else {
                await nostalgistRef.current.pause()
                setIsPaused(true)
            }
        } catch (err) {
            console.error('Error al pausar/reanudar:', err)
        }
    }

    const restartGame = async () => {
        if (!nostalgistRef.current) return
        try {
            await nostalgistRef.current.restart()
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
        const updated = await refreshCatalog()
        if (selectedRomId === id && updated.length > 0) {
            setActiveRomItem(updated[0])
            setSelectedRomId(updated[0].id)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {/* Input oculto para subir archivo ROM suelto */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".sfc,.smc,.zip,.7z"
                style={{ display: 'none' }}
                onChange={handleSingleFileUpload}
            />

            {/* Input oculto para escanear carpeta completa */}
            <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error - webkitdirectory no es estándar pero funciona en Chromium y Firefox
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

                    {/* Selector rápido del juego activo */}
                    <button
                        type="button"
                        className="pixel-btn"
                        style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderColor: 'var(--pixel-neon-cyan)',
                            color: 'var(--pixel-neon-cyan)',
                        }}
                        onClick={() => setShowCatalogModal(true)}
                        title="Ver lista de ROMs detectadas y cargar nuevas"
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
                        title="Escanear una carpeta de tu PC para detectar automáticamente todas las ROMs"
                    >
                        📁 Escanear Carpeta
                    </button>

                    <button
                        type="button"
                        className="pixel-btn"
                        style={{ fontSize: '10px' }}
                        onClick={() => fileInputRef.current?.click()}
                        title="Cargar un archivo .sfc o .smc suelto"
                    >
                        📂 Cargar ROM
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

            {/* Modal / Selector de Catálogo de Juegos Detectados */}
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
                            🕹️ BIBLIOTECA DE JUEGOS SNES DETECTADOS ({romCatalog.length})
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
                            onClick={handleNativeDirectoryPicker}
                        >
                            📁 Escanear Carpeta Completa de ROMs
                        </button>
                        <button
                            type="button"
                            className="pixel-btn"
                            style={{ fontSize: '11px' }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            ➕ Agregar Archivo Individual (.sfc/.smc)
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
                        {romCatalog.map(rom => {
                            const isCurrent = rom.id === activeRomItem?.id
                            return (
                                <div
                                    key={rom.id}
                                    className="pixel-box"
                                    onClick={() => {
                                        setActiveRomItem(rom)
                                        setSelectedRomId(rom.id)
                                        setShowCatalogModal(false)
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
                                            <span style={{ fontSize: '9px', color: 'var(--pixel-neon-cyan)' }}>[En Memoria]</span>
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

            {/* Contenedor del Viewport con Canvas Nativo */}
            <div
                ref={containerRef}
                className="pixel-box"
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '500px',
                    borderColor: activeRomItem?.color || game.color,
                    background: '#07060f',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* Canvas nativo donde Nostalgist / Snes9x dibuja */}
                <canvas
                    ref={canvasRef}
                    tabIndex={1}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        imageRendering: 'pixelated',
                        outline: 'none',
                        display: status === 'running' ? 'block' : 'none',
                    }}
                />

                {status === 'loading' && (
                    <div
                        style={{
                            fontFamily: 'var(--font-pixel-title)',
                            fontSize: '13px',
                            color: 'var(--pixel-neon-cyan)',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            alignItems: 'center',
                        }}
                    >
                        <span>⏳ Cargando {activeRomItem?.name || 'Juego SNES'}...</span>
                        <span style={{ fontFamily: 'var(--font-pixel-ui)', fontSize: '11px', color: '#aaa' }}>
                            Inicializando núcleo Snes9x (Libretro WebAssembly + SA-1)
                        </span>
                    </div>
                )}

                {status === 'error' && (
                    <div
                        style={{
                            maxWidth: '480px',
                            padding: '20px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            alignItems: 'center',
                        }}
                    >
                        <div style={{ fontSize: '36px' }}>⚠️</div>
                        <div style={{ fontFamily: 'var(--font-pixel-title)', fontSize: '13px', color: '#ff4444' }}>
                            Error al ejecutar la ROM
                        </div>
                        <p style={{ fontFamily: 'var(--font-pixel-ui)', fontSize: '12px', color: '#ccc' }}>
                            {errorMessage || 'El archivo cargado puede estar corrupto o no ser compatible con el formato SNES.'}
                        </p>
                        <button
                            type="button"
                            className="pixel-btn pixel-btn-primary"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            📂 Probar con otra ROM (.sfc / .smc)
                        </button>
                    </div>
                )}

                {status === 'missing' && (
                    <div
                        style={{
                            maxWidth: '520px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '14px',
                        }}
                    >
                        <div style={{ fontSize: '42px' }}>{activeRomItem?.icon || '🎮'}</div>
                        <div
                            style={{
                                fontFamily: 'var(--font-pixel-title)',
                                fontSize: '14px',
                                color: activeRomItem?.color || game.color,
                                lineHeight: 1.5,
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
                                lineHeight: 1.5,
                            }}
                        >
                            Archivo esperado: <code>{activeRomItem?.fileName || 'rom.sfc'}</code>
                            <br />
                            Selecciona el archivo o escanea tu carpeta de juegos para iniciar automáticamente:
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
                        🎮 CONTROLES (SNES9X) • JUEGOS DETECTADOS: {romCatalog.length}
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
