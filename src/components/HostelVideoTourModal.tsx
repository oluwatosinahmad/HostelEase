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
  RotateCcw
} from 'lucide-react';
import { Property } from '../types/hostelEase';
import { formatNaira, formatDistance } from '../utils/formatters';

interface HostelVideoTourModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenBookingModal?: (property: Property) => void;
  onOpenInspectionModal?: (property: Property) => void;
  onOpenConversation?: (propertyId: string) => void;
}

export const HostelVideoTourModal: React.FC<HostelVideoTourModalProps> = ({
  property,
  isOpen,
  onClose,
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

  // Extract video media if available, or use reliable default walkthrough video
  const videoItem = property?.media?.find(m => m.mediaType === 'VIDEO' || (m.category === 'EXTERIOR' && m.url?.includes('.mp4')));
  const videoSrc = videoItem?.url || 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-living-room-interior-41525-large.mp4';

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
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
  }, [isOpen, property?.id]);

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
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black truncate max-w-md">
                  {property.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Walkthrough
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>{property.area.name}</span>
                <span>•</span>
                <span>{formatDistance(property.distanceFromCampusKm)} to LAUTECH Gate</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Close video tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Container */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            loop
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
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
                  onClose();
                  onOpenConversation(property.id);
                }}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chat Host</span>
              </button>
            )}

            {onOpenInspectionModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInspectionModal(property);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Schedule In-Person Tour</span>
              </button>
            )}

            {onOpenBookingModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBookingModal(property);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all hover:scale-105"
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
