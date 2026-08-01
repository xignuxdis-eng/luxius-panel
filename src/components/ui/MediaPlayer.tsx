import { useRef, useEffect, useState } from 'react'
import { useMediaStore } from '@store/mediaStore'
import './MediaPlayer.css'

// Helper to extract YouTube video ID
const getYouTubeId = (url: string): string | null => {
    if (!url) return null
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /[?&]v=([a-zA-Z0-9_-]{11})/
    ]
    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
    }
    return null
}

// Helper to check if URL is YouTube
const isYouTubeUrl = (url: string): boolean => {
    return getYouTubeId(url) !== null
}

export default function MediaPlayer() {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [showUrlInput, setShowUrlInput] = useState(false)
    const [urlInput, setUrlInput] = useState('')
    const [showQueue, setShowQueue] = useState(false)
    const [isMinimized, setIsMinimized] = useState(true)

    // Get reactive state from store
    const queue = useMediaStore(state => state.queue)
    const currentIndex = useMediaStore(state => state.currentIndex)
    const isPlaying = useMediaStore(state => state.isPlaying)
    const volume = useMediaStore(state => state.volume)
    const currentTime = useMediaStore(state => state.currentTime)
    const duration = useMediaStore(state => state.duration)
    const repeat = useMediaStore(state => state.repeat)

    // Actions
    const addTrack = useMediaStore(state => state.addTrack)
    const removeTrack = useMediaStore(state => state.removeTrack)
    const clearQueue = useMediaStore(state => state.clearQueue)
    const play = useMediaStore(state => state.play)
    const pause = useMediaStore(state => state.pause)
    const togglePlay = useMediaStore(state => state.togglePlay)
    const next = useMediaStore(state => state.next)
    const previous = useMediaStore(state => state.previous)
    const goToTrack = useMediaStore(state => state.goToTrack)
    const setVolume = useMediaStore(state => state.setVolume)
    const setCurrentTime = useMediaStore(state => state.setCurrentTime)
    const setDuration = useMediaStore(state => state.setDuration)
    const toggleRepeat = useMediaStore(state => state.toggleRepeat)

    // Get current track reactively
    const currentTrack = queue[currentIndex] || null
    const isCurrentYouTube = currentTrack ? isYouTubeUrl(currentTrack.src) : false
    const youtubeId = currentTrack ? getYouTubeId(currentTrack.src) : null

    // Sync audio element with store (only for non-YouTube)
    useEffect(() => {
        if (isCurrentYouTube) return

        const audio = audioRef.current
        if (!audio) return

        if (isPlaying && currentTrack) {
            audio.play().catch(() => pause())
        } else {
            audio.pause()
        }
    }, [isPlaying, currentTrack, pause, isCurrentYouTube])

    // Volume sync
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume
        }
    }, [volume])

    // Load new track (only for non-YouTube)
    useEffect(() => {
        if (isCurrentYouTube) {
            // Don't auto-expand on page load for YouTube
            return
        }

        if (audioRef.current && currentTrack) {
            audioRef.current.src = currentTrack.src
            audioRef.current.load()
            if (isPlaying) {
                audioRef.current.play().catch(() => { })
            }
        }
    }, [currentIndex, currentTrack?.src, isCurrentYouTube])

    // Track previous queue length to detect new additions
    const [prevQueueLength, setPrevQueueLength] = useState(queue.length)

    // Auto-play and expand only when first track is ADDED (not on page load)
    useEffect(() => {
        if (queue.length === 1 && prevQueueLength === 0) {
            play()
            setIsMinimized(false)
        }
        setPrevQueueLength(queue.length)
    }, [queue.length])

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
        }
    }

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration)
        }
    }

    const handleEnded = () => {
        if (repeat === 'one') {
            if (audioRef.current) {
                audioRef.current.currentTime = 0
                audioRef.current.play()
            }
        } else {
            next()
        }
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value)
        if (audioRef.current) {
            audioRef.current.currentTime = time
        }
        setCurrentTime(time)
    }

    const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        Array.from(files).forEach(file => {
            const url = URL.createObjectURL(file)
            const type = file.type.startsWith('video') ? 'video' : 'audio'
            addTrack({
                id: `${Date.now()}-${Math.random()}`,
                title: file.name.replace(/\.[^/.]+$/, ''),
                src: url,
                type
            })
        })

        e.target.value = ''
    }

    const handleUrlAdd = () => {
        if (!urlInput.trim()) return

        const ytId = getYouTubeId(urlInput)

        addTrack({
            id: `url-${Date.now()}`,
            title: ytId ? `YouTube: ${ytId}` : (urlInput.split('/').pop() || 'Web Media'),
            src: urlInput,
            type: ytId ? 'video' : 'audio'
        })

        setUrlInput('')
        setShowUrlInput(false)

        // Expand player when adding YouTube
        if (ytId) {
            setIsMinimized(false)
        }
    }

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0:00'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Hidden audio element is always present
    const audioElement = (
        <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
        />
    )

    // YouTube iframe - always in DOM to prevent playback stopping
    const youtubeElement = isCurrentYouTube && youtubeId && (
        <div className={`youtube-hidden-container ${isMinimized ? 'hidden' : ''}`}>
            <iframe
                key={youtubeId}
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                title="YouTube Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    )

    // Minimized view - just a floating button
    if (isMinimized) {
        return (
            <>
                {audioElement}
                {youtubeElement}
                <button
                    className={`minimized-player ${isPlaying || isCurrentYouTube ? 'playing' : ''}`}
                    onClick={() => setIsMinimized(false)}
                    title="Abrir reproductor"
                >
                    {isCurrentYouTube ? '▶️' : (isPlaying ? '🎵' : '🎶')}
                </button>
            </>
        )
    }

    // Expanded view
    return (
        <>
            {audioElement}
            <div className="media-player">
                {/* Minimize button - absolute positioned */}
                <button
                    className="minimize-btn"
                    onClick={() => setIsMinimized(true)}
                    title="Minimizar"
                >
                    ▼
                </button>

                {/* YouTube Embed - rendered via youtubeElement */}
                {youtubeElement}

                {/* Header with queue toggle */}
                <div className="player-header">
                    <span className="player-title">🎶 Reproductor</span>
                    <button
                        className={`queue-toggle-btn ${showQueue ? 'active' : ''}`}
                        onClick={() => setShowQueue(!showQueue)}
                        title="Ver cola"
                    >
                        📋 {queue.length > 0 && <span className="queue-count">{queue.length}</span>}
                    </button>
                </div>

                {/* Queue List */}
                {showQueue && (
                    <div className="queue-panel">
                        <div className="queue-header">
                            <span>Cola de reproducción</span>
                            {queue.length > 0 && (
                                <button className="clear-queue-btn" onClick={clearQueue} title="Limpiar cola">
                                    🗑️
                                </button>
                            )}
                        </div>
                        {queue.length === 0 ? (
                            <div className="queue-empty">Sin pistas. Agrega archivos o URLs.</div>
                        ) : (
                            <ul className="queue-list">
                                {queue.map((track, index) => (
                                    <li
                                        key={track.id}
                                        className={`queue-item ${index === currentIndex ? 'active' : ''}`}
                                    >
                                        <button
                                            className="queue-item-play"
                                            onClick={() => goToTrack(index)}
                                            title="Reproducir"
                                        >
                                            {index === currentIndex && isPlaying ? '🔊' : '▶'}
                                        </button>
                                        <span className="queue-item-title">
                                            {isYouTubeUrl(track.src) ? '📺' : '🎵'} {track.title}
                                        </span>
                                        <button
                                            className="queue-item-remove"
                                            onClick={() => removeTrack(track.id)}
                                            title="Eliminar"
                                        >
                                            ✕
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Track Info - show when not viewing queue */}
                {!showQueue && (
                    <>
                        <div className="player-track-info">
                            {currentTrack ? (
                                <>
                                    <span className="track-icon">{isCurrentYouTube ? '📺' : '🎵'}</span>
                                    <div className="track-details">
                                        <span className="track-title">{currentTrack.title}</span>
                                        {currentTrack.artist && (
                                            <span className="track-artist">{currentTrack.artist}</span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <span className="no-track">Sin reproducción</span>
                            )}
                        </div>

                        {/* Progress Bar (only for non-YouTube) */}
                        {currentTrack && !isCurrentYouTube && (
                            <div className="player-progress">
                                <span className="time-current">{formatTime(currentTime)}</span>
                                <input
                                    type="range"
                                    className="progress-slider"
                                    min={0}
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={handleSeek}
                                />
                                <span className="time-total">{formatTime(duration)}</span>
                            </div>
                        )}

                        {/* Controls */}
                        <div className="player-controls">
                            <button className="player-btn" onClick={previous} title="Anterior">
                                ⏮️
                            </button>
                            <button className="player-btn play-btn" onClick={togglePlay} title={isPlaying ? 'Pausar' : 'Reproducir'}>
                                {isPlaying ? '⏸️' : '▶️'}
                            </button>
                            <button className="player-btn" onClick={next} title="Siguiente">
                                ⏭️
                            </button>
                            <button
                                className={`player-btn ${repeat !== 'none' ? 'active' : ''}`}
                                onClick={toggleRepeat}
                                title={`Repetir: ${repeat}`}
                            >
                                {repeat === 'one' ? '🔂' : '🔁'}
                            </button>
                        </div>

                        {/* Volume (only for non-YouTube) */}
                        {!isCurrentYouTube && (
                            <div className="player-volume">
                                <span className="volume-icon">{volume > 0.5 ? '🔊' : volume > 0 ? '🔉' : '🔇'}</span>
                                <input
                                    type="range"
                                    className="volume-slider"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                />
                            </div>
                        )}
                    </>
                )}

                {/* Add Media */}
                <div className="player-add">
                    <label className="add-file-btn" title="Agregar archivo local">
                        📁
                        <input
                            type="file"
                            accept="audio/*,video/*"
                            multiple
                            onChange={handleFileAdd}
                            className="hidden-input"
                        />
                    </label>
                    <button
                        className="add-url-btn"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        title="Agregar URL (YouTube, etc.)"
                    >
                        🔗
                    </button>
                </div>

                {/* URL Input */}
                {showUrlInput && (
                    <div className="url-input-container">
                        <input
                            type="text"
                            className="url-input"
                            placeholder="Pega URL de YouTube aquí..."
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUrlAdd()}
                            autoFocus
                        />
                        <button className="url-add-btn" onClick={handleUrlAdd}>+</button>
                    </div>
                )}
            </div>
        </>
    )
}
