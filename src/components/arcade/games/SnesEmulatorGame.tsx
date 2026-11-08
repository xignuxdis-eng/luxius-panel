import React, { useEffect, useRef, useState } from 'react'

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

function buildEmulatorSrcDoc(options: {
    gameId: string
    gameName: string
    romUrl: string
    core: string
    color: string
}): string {
    const safeConfig = JSON.stringify({
        gameId: options.gameId,
        gameName: options.gameName,
        romUrl: options.romUrl,
        core: options.core || 'snes9x',
        color: options.color || '#ff3366',
    })

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: #07060f;
    overflow: hidden;
    font-family: monospace;
  }
  #game-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #game {
    width: 100%;
    height: 100%;
  }
</style>
</head>
<body>
  <div id="game-container">
    <div id="game"></div>
  </div>
  <script>
    (function() {
      var cfg = ${safeConfig};
      window.EJS_player = '#game';
      // snes9x core in EmulatorJS / Libretro natively emulates the Nintendo SA-1 co-processor chip
      window.EJS_core = cfg.core;
      window.EJS_gameName = cfg.gameName;
      window.EJS_gameID = cfg.gameId;
      window.EJS_gameUrl = cfg.romUrl;
      window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
      window.EJS_color = cfg.color;
      window.EJS_startOnLoaded = true;
      window.EJS_threads = false; // Single-thread Wasm avoids SharedArrayBuffer blockage on static hosts without COOP/COEP
      window.EJS_biosUrl = '';
      window.EJS_defaultControls = {
        0: {
          0: { value: 'z', value2: 'BUTTON_2' },       // B (Jump)
          1: { value: 'a', value2: 'BUTTON_4' },       // Y (Run / Fire)
          2: { value: 'shift', value2: 'SELECT' },     // Select
          3: { value: 'enter', value2: 'START' },      // Start
          4: { value: ' up arrow', value2: 'DPAD_UP' },
          5: { value: 'down arrow', value2: 'DPAD_DOWN' },
          6: { value: 'left arrow', value2: 'DPAD_LEFT' },
          7: { value: 'right arrow', value2: 'DPAD_RIGHT' },
          8: { value: 'x', value2: 'BUTTON_1' },       // A (Spin Jump)
          9: { value: 's', value2: 'BUTTON_3' },       // X
          10: { value: 'q', value2: 'LEFT_TOP_SHOULDER' },  // L
          11: { value: 'w', value2: 'RIGHT_TOP_SHOULDER' }  // R
        }
      };

      var script = document.createElement('script');
      script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
      script.async = true;
      document.body.appendChild(script);
    })();
  </script>
</body>
</html>`
}

export const SnesEmulatorGame: React.FC<SnesEmulatorGameProps> = ({ game }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const defaultResolvedUrl = resolvePublicAssetUrl(
        game.romUrl || '/roms/snes/nsmw1_twelve_magic_orbs.sfc'
    )

    const [activeRomUrl, setActiveRomUrl] = useState<string>(defaultResolvedUrl)
    const [localRomName, setLocalRomName] = useState<string | null>(null)
    const [romStatus, setRomStatus] = useState<'checking' | 'ready' | 'missing'>('checking')
    const [instanceKey, setInstanceKey] = useState<number>(0)

    // Verify if the static ROM exists on the server (avoiding SPA HTML fallback)
    useEffect(() => {
        if (activeRomUrl.startsWith('blob:')) {
            setRomStatus('ready')
            return
        }

        let cancelled = false
        setRomStatus('checking')

        fetch(activeRomUrl, { method: 'HEAD' })
            .then(res => {
                if (cancelled) return
                const contentType = (res.headers.get('content-type') || '').toLowerCase()
                if (res.ok && !contentType.includes('text/html')) {
                    setRomStatus('ready')
                } else {
                    setRomStatus('missing')
                }
            })
            .catch(() => {
                if (!cancelled) setRomStatus('missing')
            })

        return () => {
            cancelled = true
        }
    }, [activeRomUrl])

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (activeRomUrl.startsWith('blob:')) {
                URL.revokeObjectURL(activeRomUrl)
            }
        }
    }, [activeRomUrl])

    const handleLocalRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (activeRomUrl.startsWith('blob:')) {
            URL.revokeObjectURL(activeRomUrl)
        }
        const blobUrl = URL.createObjectURL(file)
        setLocalRomName(file.name)
        setActiveRomUrl(blobUrl)
        setRomStatus('ready')
        setInstanceKey(prev => prev + 1)
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

    const srcDoc = buildEmulatorSrcDoc({
        gameId: game.id,
        gameName: game.name,
        romUrl: activeRomUrl,
        core: game.core || 'snes9x',
        color: game.color,
    })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {/* Metadata & Action Toolbar */}
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
                        Core: {(game.core || 'snes9x').toUpperCase()} (Chip SA-1)
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

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".sfc,.smc,.zip,.7z"
                        style={{ display: 'none' }}
                        onChange={handleLocalRomUpload}
                    />
                    <button
                        type="button"
                        className="pixel-btn"
                        style={{ fontSize: '10px' }}
                        onClick={() => fileInputRef.current?.click()}
                        title="Cargar archivo ROM .sfc/.smc desde tu PC"
                    >
                        📂 Cargar ROM (.sfc)
                    </button>
                    {romStatus === 'ready' && (
                        <>
                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '10px' }}
                                onClick={() => setInstanceKey(prev => prev + 1)}
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

            {/* Emulator Viewport (4:3 / 16:9 responsive container) */}
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
                {romStatus === 'checking' && (
                    <div
                        style={{
                            fontFamily: 'var(--font-pixel-title)',
                            fontSize: '12px',
                            color: 'var(--pixel-neon-cyan)',
                            textAlign: 'center',
                        }}
                    >
                        ⏳ Inicializando núcleo Snes9x (SA-1)...
                    </div>
                )}

                {romStatus === 'ready' && (
                    <iframe
                        key={`${game.id}-${instanceKey}`}
                        title={game.name}
                        srcDoc={srcDoc}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            display: 'block',
                        }}
                        allow="autoplay; fullscreen; gamepad"
                    />
                )}

                {romStatus === 'missing' && (
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
                            Archivo ROM esperado en: <code>{game.romUrl}</code>
                            <br />
                            Coloca el archivo en <code>public/roms/snes/nsmw1_twelve_magic_orbs.sfc</code> o selecciónalo directamente desde tu equipo para jugar ahora:
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
                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ fontSize: '11px' }}
                                onClick={() => {
                                    setRomStatus('ready')
                                    setInstanceKey(prev => prev + 1)
                                }}
                            >
                                ► Forzar arranque desde URL
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Info & Controls */}
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
                        🎮 CONTROLES Y GUARDADO (INDEXEDDB + GAMEPAD)
                    </span>
                    {localRomName && (
                        <span
                            style={{
                                fontFamily: 'var(--font-pixel-ui)',
                                fontSize: '11px',
                                color: 'var(--pixel-neon-cyan)',
                            }}
                        >
                            Cartucho local activo: {localRomName}
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

