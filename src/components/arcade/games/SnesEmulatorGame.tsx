import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Nostalgist } from 'nostalgist'

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
}

function resolvePublicAssetUrl(path: string): string {
    if (!path) return ''
    if (/^(https?:|blob:|data:)/i.test(path)) return path
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${base}${cleanPath}`
}

export const SnesEmulatorGame: React.FC<SnesEmulatorGameProps> = ({ game }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const nostalgistRef = useRef<Nostalgist | null>(null)

    const defaultResolvedUrl = resolvePublicAssetUrl(
        game.romUrl || '/roms/snes/nsmw1_twelve_magic_orbs.sfc'
    )

    const [activeRom, setActiveRom] = useState<File | string>(defaultResolvedUrl)
    const [romName, setRomName] = useState<string | null>(null)
    const [status, setStatus] = useState<'idle' | 'checking' | 'loading' | 'running' | 'error' | 'missing'>('checking')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isPaused, setIsPaused] = useState<boolean>(false)
    const [saveNotice, setSaveNotice] = useState<string | null>(null)

    // Detener instancia previa
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

    // Arrancar emulador Nostalgist con canvas nativo
    const launchRom = useCallback(async (romSource: File | string, displayName?: string) => {
        if (!canvasRef.current) return
        setStatus('loading')
        setErrorMessage(null)

        await stopEmulator()

        try {
            let romParam: File | string | { fileName: string; fileContent: Blob } = romSource

            if (typeof romSource === 'string') {
                // Comprobar existencia en servidor
                const checkRes = await fetch(romSource, { method: 'HEAD' })
                const contentType = (checkRes.headers.get('content-type') || '').toLowerCase()
                if (!checkRes.ok || contentType.includes('text/html')) {
                    setStatus('missing')
                    return
                }
            } else if (romSource instanceof File) {
                romParam = romSource
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
            setRomName(displayName || (typeof romSource === 'string' ? romSource.split('/').pop() || game.name : romSource.name))
        } catch (err: unknown) {
            console.error('Error al iniciar Snes9x / Nostalgist:', err)
            setStatus('error')
            setErrorMessage(err instanceof Error ? err.message : 'Error desconocido al inicializar el núcleo SNES.')
        }
    }, [game.name, stopEmulator])

    // Verificar y cargar ROM por defecto o tras selección
    useEffect(() => {
        let mounted = true
        if (typeof activeRom === 'string') {
            fetch(activeRom, { method: 'HEAD' })
                .then(res => {
                    if (!mounted) return
                    const contentType = (res.headers.get('content-type') || '').toLowerCase()
                    if (res.ok && !contentType.includes('text/html')) {
                        launchRom(activeRom)
                    } else {
                        setStatus('missing')
                    }
                })
                .catch(() => {
                    if (mounted) setStatus('missing')
                })
        } else {
            launchRom(activeRom, activeRom.name)
        }

        return () => {
            mounted = false
            stopEmulator()
        }
    }, [activeRom, launchRom, stopEmulator])

    // Handler para subida local de ROM
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setActiveRom(file)
        setRomName(file.name)
        launchRom(file, file.name)
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
        if (!nostalgistRef.current) return
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
            localStorage.setItem(`luxius_snes_save_${game.id}`, base64)
            setSaveNotice('💾 ¡Partida guardada con éxito!')
            setTimeout(() => setSaveNotice(null), 3000)
        } catch (err) {
            console.error('Error guardando estado:', err)
            setSaveNotice('❌ Error al guardar partida')
            setTimeout(() => setSaveNotice(null), 3000)
        }
    }

    const handleLoadState = async () => {
        if (!nostalgistRef.current) return
        try {
            const base64 = localStorage.getItem(`luxius_snes_save_${game.id}`)
            if (!base64) {
                setSaveNotice('⚠️ No hay partida guardada previa')
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
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
                    borderColor: game.color,
                    background: 'rgba(10, 8, 22, 0.9)',
                }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <span
                        style={{
                            padding: '3px 8px',
                            background: 'rgba(255, 51, 102, 0.2)',
                            border: `1px solid ${game.color}`,
                            color: game.color,
                            fontFamily: 'var(--font-pixel-title)',
                            fontSize: '10px',
                        }}
                    >
                        {game.platform || 'SNES'}
                    </span>
                    <span
                        style={{
                            padding: '3px 8px',
                            background: 'rgba(0, 240, 255, 0.14)',
                            border: '1px solid var(--pixel-neon-cyan)',
                            color: 'var(--pixel-neon-cyan)',
                            fontFamily: 'var(--font-pixel-ui)',
                            fontSize: '11px',
                        }}
                    >
                        Core: SNES9X (Libretro WASM • SA-1 Native)
                    </span>
                    {game.exits && (
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
                            🚩 {game.exits}
                        </span>
                    )}
                    {game.difficulty && (
                        <span
                            style={{
                                padding: '3px 8px',
                                background: 'rgba(180, 75, 255, 0.16)',
                                border: '1px solid #b44bff',
                                color: '#d89eff',
                                fontFamily: 'var(--font-pixel-ui)',
                                fontSize: '11px',
                            }}
                        >
                            ⚡ Dificultad: {game.difficulty}
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".sfc,.smc,.zip,.7z"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button
                        type="button"
                        className="pixel-btn"
                        style={{ fontSize: '10px' }}
                        onClick={() => fileInputRef.current?.click()}
                        title="Cargar archivo ROM .sfc/.smc/.zip desde tu equipo"
                    >
                        📂 Cargar ROM (.sfc)
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

            {/* Notificación de guardado/carga */}
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

            {/* Contenedor del Viewport con Canvas Nativo */}
            <div
                ref={containerRef}
                className="pixel-box"
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '500px',
                    borderColor: game.color,
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
                        <span>⏳ Cargando núcleo Snes9x WebAssembly (SA-1)...</span>
                        <span style={{ fontFamily: 'var(--font-pixel-ui)', fontSize: '11px', color: '#aaa' }}>
                            Inicializando búfer de audio y memoria emulada
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
                        <div style={{ fontSize: '42px' }}>🍄</div>
                        <div
                            style={{
                                fontFamily: 'var(--font-pixel-title)',
                                fontSize: '14px',
                                color: game.color,
                                lineHeight: 1.5,
                            }}
                        >
                            {game.name}
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
                            {game.objective}
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
                            Archivo ROM predeterminado en: <code>{game.romUrl}</code>
                            <br />
                            Selecciona tu archivo <code>.sfc</code> / <code>.smc</code> / <code>.zip</code> para arrancar de inmediato:
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                                type="button"
                                className="pixel-btn pixel-btn-primary"
                                style={{ fontSize: '12px', padding: '10px 18px' }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                📂 Seleccionar ROM (.sfc / .smc / .zip)
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
                        🎮 CONTROLES Y GUARDADO NATIVO (SNES9X)
                    </span>
                    {romName && (
                        <span
                            style={{
                                fontFamily: 'var(--font-pixel-ui)',
                                fontSize: '11px',
                                color: 'var(--pixel-neon-cyan)',
                            }}
                        >
                            Cartucho: {romName}
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
                    {game.controls.map((ctrl, idx) => (
                        <span key={idx}>• {ctrl}</span>
                    ))}
                </div>
            </div>
        </div>
    )
}
