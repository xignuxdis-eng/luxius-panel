import { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  X, 
  Music, 
  Video,
  Move,
  Minimize,
  Pin,
  PinOff
} from "lucide-react";

interface MediaItem {
  id: string;
  title: string;
  url: string;
  type: 'audio' | 'video' | 'youtube';
  duration?: number;
}

export default function FloatingPlayer() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  // Media de ejemplo
  const sampleMedia: MediaItem[] = [
    {
      id: "1",
      title: "Música de Fondo",
      url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      type: "audio"
    },
    {
      id: "2", 
      title: "Video Tutorial",
      url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      type: "video"
    },
    {
      id: "3",
      title: "YouTube Video",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      type: "youtube"
    }
  ];

  useEffect(() => {
    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        setDuration(audioRef.current.duration);
      }
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
        setDuration(videoRef.current.duration);
      }
    };

    const audio = audioRef.current;
    const video = videoRef.current;

    if (audio) {
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleTimeUpdate);
    }
    if (video) {
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleTimeUpdate);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleTimeUpdate);
      }
      if (video) {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleTimeUpdate);
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        videoRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  const loadMedia = (media: MediaItem) => {
    setCurrentMedia(media);
    setIsVisible(true);
    setIsMinimized(false);
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Simular carga
    setTimeout(() => {
      if (media.type === 'audio' && audioRef.current) {
        audioRef.current.src = media.url;
        audioRef.current.load();
      } else if (media.type === 'video' && videoRef.current) {
        videoRef.current.src = media.url;
        videoRef.current.load();
      }
    }, 100);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (playerRef.current && isFloating) {
      const rect = playerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && isFloating) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging && isFloating) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, isFloating]);

  // Widget mode (similar al clima)
  if (!isFloating) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200 min-w-[240px] max-w-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Music className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Media Player</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsFloating(true)}
              className="hover:bg-gray-100 p-1 rounded"
              title="Hacer flotante"
            >
              <Pin className="w-3 h-3 text-blue-600" />
            </button>
            <button
              onClick={() => setIsVisible(!isVisible)}
              className="hover:bg-gray-100 p-1 rounded"
              title={isVisible ? "Ocultar" : "Mostrar"}
            >
              {isVisible ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Content */}
        {isVisible ? (
          <div className="space-y-2">
            {/* Current Media Info */}
            {currentMedia && (
              <div className="text-xs text-gray-600 mb-2">
                <div className="font-medium">{currentMedia.title}</div>
                <div className="text-gray-500">{currentMedia.type}</div>
              </div>
            )}

            {/* Controls */}
            <div className="space-y-2">
              {/* Progress Bar */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 w-8">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-xs text-gray-500 w-8">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Play/Pause Button */}
              <div className="flex justify-center">
                <button
                  onClick={handlePlayPause}
                  className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded-full"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleMute}
                  className="hover:bg-gray-100 p-0.5 rounded"
                >
                  {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>

            {/* Media Selection */}
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-600 mb-1">Media:</div>
              <div className="space-y-1">
                {sampleMedia.map((media) => (
                  <button
                    key={media.id}
                    onClick={() => loadMedia(media)}
                    className={`w-full text-left p-1 rounded text-xs hover:bg-gray-50 ${
                      currentMedia?.id === media.id ? 'bg-green-50 text-green-700' : 'text-gray-700'
                    }`}
                  >
                    {media.type === 'video' ? <Video className="w-2 h-2 inline mr-1" /> : <Music className="w-2 h-2 inline mr-1" />}
                    {media.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Music className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Reproductor de Media</p>
            <p className="text-xs text-gray-400">Haz clic para expandir</p>
          </div>
        )}
      </div>
    );
  }

  // Floating mode (original functionality)
  if (!isVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200"
        >
          <Music className="w-5 h-5" />
        </button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div 
        className="fixed z-50 cursor-move"
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
        ref={playerRef}
      >
        <div className="bg-gray-800 text-white p-2 rounded-lg shadow-lg flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="hover:bg-gray-700 p-1 rounded"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <span className="text-xs">
            {currentMedia?.title || "Player"}
          </span>
          <button
            onClick={() => setIsFloating(false)}
            className="hover:bg-gray-700 p-1 rounded"
            title="Volver a widget"
          >
            <PinOff className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="hover:bg-gray-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 cursor-move"
      style={{ 
        left: position.x, 
        top: position.y,
        width: isFullscreen ? '100vw' : '320px',
        height: isFullscreen ? '100vh' : 'auto'
      }}
      onMouseDown={handleMouseDown}
      ref={playerRef}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center space-x-2">
          {currentMedia?.type === 'video' ? (
            <Video className="w-4 h-4 text-blue-600" />
          ) : (
            <Music className="w-4 h-4 text-green-600" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {currentMedia?.title || "Media Player"}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-gray-200 p-1 rounded"
          >
            <Minimize className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFloating(false)}
            className="hover:bg-gray-200 p-1 rounded"
            title="Volver a widget"
          >
            <PinOff className="w-4 h-4" />
          </button>
          {currentMedia?.type === 'video' && (
            <button
              onClick={handleFullscreen}
              className="hover:bg-gray-200 p-1 rounded"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => setIsVisible(false)}
            className="hover:bg-gray-200 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media Content */}
      <div className="p-3">
        {currentMedia?.type === 'video' && (
          <video
            ref={videoRef}
            className="w-full rounded mb-3"
            controls={false}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}

        {/* Controls */}
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 w-10">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-xs text-gray-500 w-10">
              {formatTime(duration)}
            </span>
          </div>

          {/* Play/Pause Button */}
          <div className="flex justify-center">
            <button
              onClick={handlePlayPause}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleMute}
              className="hover:bg-gray-100 p-1 rounded"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>

        {/* Media Selection */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-600 mb-2">Media Disponible:</div>
          <div className="space-y-1">
            {sampleMedia.map((media) => (
              <button
                key={media.id}
                onClick={() => loadMedia(media)}
                className={`w-full text-left p-2 rounded text-xs hover:bg-gray-50 ${
                  currentMedia?.id === media.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                {media.type === 'video' ? <Video className="w-3 h-3 inline mr-1" /> : <Music className="w-3 h-3 inline mr-1" />}
                {media.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        style={{ display: 'none' }}
      />
    </div>
  );
} 