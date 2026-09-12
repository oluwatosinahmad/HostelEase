import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Video, 
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';

export interface GalleryMediaItem {
  id: string;
  url: string;
  caption?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  category?: string;
}

interface HostelImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  images?: GalleryMediaItem[];
  media?: GalleryMediaItem[];
  hostelTitle: string;
  initialIndex?: number;
}

export const HostelImageGalleryModal: React.FC<HostelImageGalleryModalProps> = ({
  isOpen,
  onClose,
  images = [],
  media,
  hostelTitle,
  initialIndex = 0
}) => {
  // Support both images and media prop
  const items: GalleryMediaItem[] = (media && media.length > 0) ? media : images;
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  
  // Video player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoEnded, setIsVideoEnded] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  // Reset video state when switching slides
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setIsVideoEnded(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  }, [currentIndex]);

  const currentItem = items[currentIndex];
  const isCurrentVideo = currentItem?.mediaType === 'VIDEO' || currentItem?.category === 'VIDEO_WALKTHROUGH' || currentItem?.url?.endsWith('.mp4') || currentItem?.url?.endsWith('.webm');

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === ' ' && isCurrentVideo) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, items.length, isCurrentVideo, isPlaying]);

  if (!isOpen || items.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      setIsVideoEnded(false);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleReplay = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
    setIsVideoEnded(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    if (nextMuted) {
      videoRef.current.volume = 0;
    } else {
      videoRef.current.volume = volume || 0.8;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none animate-in fade-in duration-200"
    >
      {/* Gallery Top Header */}
      <div className="p-4 flex items-center justify-between text-white border-b border-white/10 bg-black/60 backdrop-blur-md z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            {isCurrentVideo ? <Video className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate max-w-xs sm:max-w-md">{hostelTitle}</h3>
            <p className="text-xs text-white/60 flex items-center gap-1.5">
              <span>{isCurrentVideo ? '4K Verified Video Tour' : 'High-Res Photo'}</span>
              <span>•</span>
              <span>{currentIndex + 1} of {items.length}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close media gallery"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Media Stage */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Navigation Buttons */}
        {items.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-transform active:scale-95 cursor-pointer shadow-xl"
              aria-label="Previous item"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-transform active:scale-95 cursor-pointer shadow-xl"
              aria-label="Next item"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Media Content Viewport */}
        <div className="max-w-5xl max-h-[72vh] w-full h-full flex items-center justify-center relative">
          {isCurrentVideo ? (
            <div className="relative w-full h-full max-h-[72vh] bg-black rounded-2xl overflow-hidden flex items-center justify-center group shadow-2xl border border-white/10">
              <video
                ref={videoRef}
                src={currentItem?.url}
                playsInline
                className="w-full h-full object-contain max-h-[72vh]"
                onClick={togglePlay}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration || 0);
                  }
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  setIsVideoEnded(true);
                }}
              />

              {/* Big Center Play / Replay Overlay Button */}
              {(!isPlaying || isVideoEnded) && (
                <div 
                  onClick={isVideoEnded ? handleReplay : togglePlay}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer transition-all hover:bg-black/50"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-2xl transition-transform hover:scale-110">
                    {isVideoEnded ? (
                      <RotateCcw className="w-7 h-7" />
                    ) : (
                      <Play className="w-7 h-7 ml-1 fill-current" />
                    )}
                  </div>
                </div>
              )}

              {/* Floating Custom Video Control Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent space-y-2 opacity-95 group-hover:opacity-100 transition-opacity">
                {/* Progress / Seek Scrub Bar */}
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-white/30 accent-emerald-400 rounded-lg cursor-pointer transition-all"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>

                    <button
                      onClick={handleReplay}
                      className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                      title="Replay video"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <span className="font-mono text-[11px] text-white/80">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Volume Controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={toggleMute}
                        className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-white/30 accent-emerald-400 rounded-lg cursor-pointer"
                      />
                    </div>

                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                      title="Fullscreen"
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <img
              key={currentItem?.id || currentIndex}
              src={currentItem?.url}
              alt={currentItem?.caption || `${hostelTitle} media ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
            />
          )}
        </div>
      </div>

      {/* Gallery Bottom Thumbnail Strip */}
      <div className="p-4 bg-black/80 border-t border-white/10 space-y-3 z-20">
        {currentItem?.caption && (
          <p className="text-xs text-center text-white/80 font-medium truncate max-w-xl mx-auto">
            {currentItem.caption}
          </p>
        )}

        {/* Thumbnails */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 px-2 scrollbar-none">
            {items.map((item, idx) => {
              const isVideo = item.mediaType === 'VIDEO' || item.category === 'VIDEO_WALKTHROUGH' || item.url?.endsWith('.mp4');
              return (
                <button
                  key={item.id || idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                    idx === currentIndex
                      ? 'border-emerald-400 scale-105 shadow-md shadow-emerald-500/40'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {isVideo ? (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-emerald-400">
                      <Video className="w-5 h-5" />
                    </div>
                  ) : (
                    <img src={item.url} alt="thumbnail" className="w-full h-full object-cover" />
                  )}
                  {isVideo && (
                    <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-emerald-600 text-white text-[8px] font-black rounded">
                      4K
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

