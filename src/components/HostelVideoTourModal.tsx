import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  Receipt, 
  MessageSquare, 
  Sparkles, 
  RotateCcw, 
  VideoOff, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { Property } from '../types/hostelEase';
import { formatNaira, formatDistance } from '../utils/formatters';
import { getMediaUrl } from '../services/api';

interface HostelVideoTourModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  backButtonLabel?: string;
  onOpenBookingModal?: (property: Property) => void;
  onOpenInspectionModal?: (property: Property) => void;
  onOpenConversation?: (propertyId: string) => void;
}

export const HostelVideoTourModal: React.FC<HostelVideoTourModalProps> = ({
  property,
  isOpen,
  onClose,
  onBack,
  backButtonLabel,
  onOpenBookingModal,
  onOpenInspectionModal,
  onOpenConversation
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [hasVideoError, setHasVideoError] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Extract authentic property video only — no fake demo or Mixkit placeholders
  const rawVideoUrl = property?.videoTourUrl || 
    property?.media?.find(m => m.mediaType === 'VIDEO' || m.category === 'VIDEO_WALKTHROUGH' || String(m.url || '').toLowerCase().includes('.mp4'))?.url;
  const videoSrc = rawVideoUrl ? getMediaUrl(rawVideoUrl) : null;
  const posterUrl = property?.coverImage ? getMediaUrl(property.coverImage) : undefined;

  useEffect(() => {
    setHasVideoError(false);
    if (isOpen && videoRef.current && videoSrc) {
      videoRef.current.currentTime = 0;
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.play().catch(() => {
        // Auto-play might require mute in some browsers
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
      setIsPlaying(true);
    }
  }, [isOpen, property?.id, videoSrc]);

  const handleBack = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !property) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentTime(current);
    setProgress((current / dur) * 100);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = clickPos * (videoRef.current.duration || 1);
  };

  const toggleFullScreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden relative flex flex-col text-white">
        
        {/* Top Header Bar with Prominent In-App Back Button */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-800 bg-slate-900/90 backdrop-blur z-10 gap-3">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            {/* Obvious In-App Back Button */}
            <button
              type="button"
              onClick={handleBack}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-emerald-500/50 flex items-center gap-1.5 text-xs font-black transition-all shadow-sm shrink-0 cursor-pointer group active:scale-95"
              title="Return to previous 4K video listing"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>{backButtonLabel || 'Back to 4K Tours'}</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black truncate max-w-[180px] sm:max-w-md text-white">
                  {property.title}
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Walkthrough
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{property.area?.name || (property as any).areaName || 'LAUTECH Area'}</span>
                <span>•</span>
                <span className="shrink-0">{formatDistance(property.distanceFromCampusKm)} to Campus Gate</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer"
            title="Close video tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Container */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
          {videoSrc && !hasVideoError ? (
            <>
              <video
                ref={videoRef}
                src={videoSrc}
                poster={posterUrl}
                preload="metadata"
                playsInline
                loop
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onError={() => setHasVideoError(true)}
                onClick={togglePlay}
                className="w-full h-full object-cover cursor-pointer"
              />

              {/* Watermark badge */}
              <div className="absolute top-4 left-4 pointer-events-none bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold text-white tracking-wide">
                  Hostel Ease 4K Virtual Walkthrough
                </span>
              </div>

              {/* Center Play/Pause button overlay (pops on hover or when paused) */}
              {(!isPlaying || isBuffering) && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm transition-transform hover:scale-110 cursor-pointer"
                >
                  {isBuffering ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-8 h-8 fill-current ml-1" />
                  )}
                </button>
              )}

              {/* Video Controls Bar Overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-4 pt-8 space-y-2 opacity-95 group-hover:opacity-100 transition-opacity">
                {/* Progress / Scrub Bar */}
                <div 
                  onClick={handleSeek} 
                  className="w-full h-1.5 bg-white/20 hover:h-2.5 rounded-full overflow-hidden cursor-pointer transition-all relative"
                >
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={togglePlay} 
                      className="hover:text-white transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>

                    <button 
                      onClick={toggleMute} 
                      className="hover:text-white transition-colors flex items-center gap-1"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <span className="font-mono text-[11px] text-slate-400">
                      {formatSeconds(currentTime)} / {formatSeconds(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const speeds = [1, 1.25, 1.5, 2];
                        const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                        setPlaybackSpeed(nextSpeed);
                        if (videoRef.current) videoRef.current.playbackRate = nextSpeed;
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-slate-300 hover:text-white transition"
                      title="Toggle playback speed"
                    >
                      {playbackSpeed}x
                    </button>
                    <button
                      onClick={() => {
                        if (videoRef.current) videoRef.current.currentTime = 0;
                      }}
                      className="hover:text-white transition-colors p-1"
                      title="Replay from start"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={toggleFullScreen}
                      className="hover:text-white transition-colors p-1"
                      title="Full screen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-950">
              {posterUrl && (
                <img 
                  src={posterUrl} 
                  alt={property.title} 
                  className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-xs"
                />
              )}
              <div className="relative z-10 max-w-md space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-amber-400 shadow-lg">
                  <VideoOff className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">4K Video Walkthrough In Production</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    The verified 4K walkthrough video for <strong className="text-slate-200">{property.title}</strong> is currently being reviewed by our physical campus inspection team.
                  </p>
                </div>
                {onOpenInspectionModal && (
                  <button
                    type="button"
                    onClick={() => {
                      handleBack();
                      onOpenInspectionModal(property);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book Physical Inspection Instead</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Details & Action Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Disclosed Annual Rent
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-400">
                {formatNaira(property.priceSummary?.rentAmount)}
              </span>
              <span className="text-xs text-slate-400 font-bold">/year</span>
              {property.priceSummary?.totalMandatoryCost && (
                <span className="text-[11px] text-slate-400 ml-2">
                  (Total Package: {formatNaira(property.priceSummary.totalMandatoryCost)})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {onOpenConversation && (
              <button
                type="button"
                onClick={() => {
                  handleBack();
                  onOpenConversation(property.id);
                }}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chat Host</span>
              </button>
            )}

            {onOpenInspectionModal && (
              <button
                type="button"
                onClick={() => {
                  handleBack();
                  onOpenInspectionModal(property);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Schedule In-Person Tour</span>
              </button>
            )}

            {onOpenBookingModal && (
              <button
                type="button"
                onClick={() => {
                  handleBack();
                  onOpenBookingModal(property);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Book This Room</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
