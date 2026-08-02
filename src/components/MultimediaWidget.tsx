import { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, Volume2, VolumeX, Link, Settings, Film, Youtube, Minimize2, Maximize2, X } from 'lucide-react';

interface MultimediaWidgetProps {
    isMinimized?: boolean;
    onMinimizeToggle?: () => void;
}

export default function MultimediaWidget({ isMinimized = false, onMinimizeToggle }: MultimediaWidgetProps) {
    const [source, setSource] = useState(() => localStorage.getItem('multimedia_source') || '');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [showSettings, setShowSettings] = useState(false);
    const [mediaType, setMediaType] = useState<'audio' | 'video' | 'youtube'>('audio');
    const [progress, setProgress] = useState(0);
    const [youtubeId, setYoutubeId] = useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    useEffect(() => {
        localStorage.setItem('multimedia_source', source);

        const id = getYoutubeId(source);
        if (id) {
            setYoutubeId(id);
            setMediaType('youtube');
        } else if (source.toLowerCase().match(/\.(mp4|webm|ogg)$/)) {
            setYoutubeId(null);
            setMediaType('video');
        } else {
            setYoutubeId(null);
            setMediaType('audio');
        }
    }, [source]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
        if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume;
    }, [volume, isMuted, mediaType]);

    const togglePlay = () => {
        if (mediaType === 'youtube') return;
        const media = mediaType === 'video' ? videoRef.current : audioRef.current;
        if (!media) return;

        if (media.paused) {
            media.play().catch(err => console.error("Error playing media:", err));
        } else {
            media.pause();
        }
    };

    const handleTimeUpdate = () => {
        if (mediaType === 'youtube') return;
        const media = mediaType === 'video' ? videoRef.current : audioRef.current;
        if (!media) return;
        if (media.duration) {
            setProgress((media.currentTime / media.duration) * 100);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (mediaType === 'youtube') return;
        const media = mediaType === 'video' ? videoRef.current : audioRef.current;
        if (!media) return;
        const seekTime = (parseFloat(e.target.value) / 100) * media.duration;
        media.currentTime = seekTime;
        setProgress(parseFloat(e.target.value));
    };

    // VISTA MINIMIZADA (Para el Sidebar)
    if (isMinimized) {
        return (
            <div className="bg-gray-900/95 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-left-4 duration-500 group/min">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center shrink-0">
                        {mediaType === 'youtube' ? <Youtube className="w-5 h-5 text-red-400" /> :
                            mediaType === 'video' ? <Film className="w-5 h-5 text-indigo-300" /> :
                                <Music className={`w-5 h-5 text-indigo-300 ${isPlaying ? 'animate-pulse' : ''}`} />}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-white truncate uppercase tracking-widest">
                            {mediaType === 'youtube' ? 'Video en YouTube' : source ? source.split('/').pop()?.split('?')[0] : 'Sin contenido'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <button
                                onClick={togglePlay}
                                disabled={mediaType === 'youtube' || !source}
                                className="text-white/70 hover:text-white transition-colors disabled:opacity-30"
                            >
                                {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                            </button>
                            <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onMinimizeToggle}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                        title="Expandir Reproductor"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Hidden Audio/Video elements to keep them playing */}
                <div className="hidden">
                    {mediaType === 'video' ? (
                        <video ref={videoRef} src={source} onTimeUpdate={handleTimeUpdate} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} crossOrigin="anonymous" />
                    ) : (
                        <audio ref={audioRef} src={source} onTimeUpdate={handleTimeUpdate} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} crossOrigin="anonymous" />
                    )}
                </div>
            </div>
        );
    }

    // VISTA NORMAL (Flotante)
    return (
        <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm space-y-4 relative overflow-hidden group">
            {/* Header & Settings Toggle */}
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                    {mediaType === 'youtube' ? <Youtube className="w-4 h-4 text-red-500" /> :
                        mediaType === 'video' ? <Film className="w-4 h-4 text-indigo-400" /> :
                            <Music className="w-4 h-4 text-indigo-400" />}
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        {mediaType === 'youtube' ? 'YouTube Player' : 'Multimedia Player'}
                    </h3>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"
                        title="Configuración de fuente"
                    >
                        <Settings className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-90 text-indigo-500' : ''}`} />
                    </button>
                    <button
                        onClick={onMinimizeToggle}
                        className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"
                        title="Minimizar al Sidebar"
                    >
                        <Minimize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Settings Panel (Source Input) */}
            {showSettings && (
                <div className="animate-in slide-in-from-top duration-300 space-y-2 relative z-10">
                    <div className="relative">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                            type="text"
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            placeholder="URL de YouTube o archivo..."
                            className="w-full bg-gray-50 border-none rounded-xl py-2 pl-9 pr-4 text-[11px] font-medium text-gray-600 focus:ring-1 focus:ring-indigo-100 transition-all font-mono"
                        />
                    </div>
                </div>
            )}

            {/* Visualizer / Video Preview Area */}
            <div className="relative w-full aspect-video bg-gray-950 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100/50 shadow-inner">
                {source ? (
                    <>
                        {mediaType === 'youtube' && youtubeId ? (
                            <iframe
                                className="w-full h-full border-none"
                                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&controls=1`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : mediaType === 'video' ? (
                            <video
                                ref={videoRef}
                                src={source}
                                onTimeUpdate={handleTimeUpdate}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                className="w-full h-full object-contain"
                                crossOrigin="anonymous"
                                playsInline
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Music className={`w-12 h-12 text-indigo-400/30 ${isPlaying ? 'animate-pulse' : ''}`} />
                                <audio
                                    ref={audioRef}
                                    src={source}
                                    onTimeUpdate={handleTimeUpdate}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    crossOrigin="anonymous"
                                />
                                <div className="flex gap-1 h-8 items-end">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className={`w-1 bg-indigo-400/20 rounded-full transition-all duration-300 ${isPlaying ? 'animate-wave' : 'h-1'}`} style={{ animationDelay: `${i * 0.1}s`, height: isPlaying ? '100%' : '4px' }}></div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center p-4">
                        <Link className="w-8 h-8 text-gray-800 mx-auto mb-2 opacity-20" />
                        <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">Sincroniza una fuente</p>
                    </div>
                )}
            </div>

            {/* Basic Info */}
            <div className="text-center pt-1">
                <h4 className="text-[12px] font-black text-gray-900 truncate px-4">
                    {mediaType === 'youtube' ? 'Video en YouTube' : source ? source.split('/').pop()?.split('?')[0] : 'Esperando contenido'}
                </h4>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                    {mediaType === 'youtube' ? 'YouTube Stream' : mediaType === 'video' ? 'Video Player' : 'Audio Player'}
                </p>
            </div>

            {/* Controls */}
            {mediaType !== 'youtube' && (
                <div className="flex flex-col gap-4 items-center">
                    <div className="w-full space-y-1">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={handleSeek}
                            className="w-full h-1 bg-gray-100 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-600 transition-all"
                        />
                    </div>

                    <div className="flex items-center justify-between w-full px-2">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`p-2 rounded-lg transition-colors ${isMuted ? 'text-red-400 bg-red-50' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>

                        <button
                            onClick={togglePlay}
                            disabled={!source}
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg ${!source ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-900 hover:bg-black'}`}
                        >
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </button>

                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0" step="0.01" max="1"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-16 h-1 bg-gray-100 rounded-full appearance-none cursor-pointer accent-gray-400"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
