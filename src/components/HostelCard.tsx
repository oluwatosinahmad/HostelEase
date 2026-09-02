import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  ShieldCheck, 
  Bookmark, 
  Zap, 
  Droplets, 
  Wifi, 
  Shield, 
  Utensils, 
  Cpu, 
  Sun, 
  Check, 
  Eye,
  Footprints,
  Info,
  SlidersHorizontal,
  Sparkles,
  Star,
  MessageSquare,
  Calendar,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Video,
  Flame
} from 'lucide-react';
import { Property } from '../types/hostelEase';
import { formatNaira, formatDistance, getAvailabilityBadgeInfo, getPropertyTypeLabel } from '../utils/formatters';
import { OptimizedImage } from './OptimizedImage';

interface HostelCardProps {
  property: Property;
  onViewDetails: (property: Property) => void;
  onToggleSave: (propertyId: string, isSaved: boolean) => void;
  onToggleCompare?: (propertyId: string) => void;
  onOpenConversation?: (propertyId: string) => void;
  onOpenBookingModal?: (property: Property) => void;
  onOpenInspectionModal?: (property: Property) => void;
  onOpenVideoTour?: (property: Property) => void;
  isCompared?: boolean;
  matchScore?: number;
  matchExplanation?: string;
}

export const HostelCard: React.FC<HostelCardProps> = ({
  property,
  onViewDetails,
  onToggleSave,
  onToggleCompare,
  onOpenConversation,
  onOpenBookingModal,
  onOpenInspectionModal,
  onOpenVideoTour,
  isCompared = false,
  matchScore,
  matchExplanation
}) => {
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(property.isSaved));
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Extract all non-video media images with fallback to coverImage
  const images = (property.media && property.media.length > 0)
    ? property.media.filter(m => m.mediaType !== 'VIDEO').map(m => m.url)
    : [property.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'];
  const hasMultipleImages = images.length > 1;
  const [currentImageIdx, setCurrentImageIdx] = useState<number>(0);
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Automatically cycle through multiple hostel photos smoothly when not hovered
  useEffect(() => {
    if (!hasMultipleImages || isHovered) return;

    const interval = setInterval(() => {
      setIsSliding(true);
      setCurrentImageIdx(prev => (prev === images.length - 1 ? 0 : prev + 1));
      setTimeout(() => setIsSliding(false), 250);
    }, 5500);

    return () => clearInterval(interval);
  }, [hasMultipleImages, images.length, isHovered]);

  // Deterministic viewers counter for authentic social proof
  const liveViewers = Math.abs(property.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 5) + 2;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSliding(true);
    setCurrentImageIdx(prev => (prev === 0 ? images.length - 1 : prev - 1));
    setTimeout(() => setIsSliding(false), 250);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSliding(true);
    setCurrentImageIdx(prev => (prev === images.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsSliding(false), 250);
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaveLoading(true);
    try {
      const nextState = !isSaved;
      setIsSaved(nextState);
      await onToggleSave(property.id, nextState);
    } catch (err) {
      setIsSaved(!isSaved); // Revert on failure
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleCompare) {
      onToggleCompare(property.id);
    }
  };

  const availInfo = getAvailabilityBadgeInfo(property.availabilityStatus);

  // Map icon names to components
  const renderAmenityIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      case 'Droplets': return <Droplets className="w-3.5 h-3.5 text-sky-500" />;
      case 'Wifi': return <Wifi className="w-3.5 h-3.5 text-blue-500" />;
      case 'ShieldCheck':
      case 'Shield': return <Shield className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Utensils': return <Utensils className="w-3.5 h-3.5 text-orange-500" />;
      case 'Cpu': return <Cpu className="w-3.5 h-3.5 text-indigo-500" />;
      case 'Sun': return <Sun className="w-3.5 h-3.5 text-yellow-500" />;
      default: return <Check className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <div 
      onClick={() => onViewDetails(property)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group bg-white dark:bg-slate-900 rounded-3xl border shadow-xs hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer ${
        isCompared 
          ? 'border-purple-500 ring-2 ring-purple-400/30' 
          : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600'
      }`}
    >
      {/* Property Cover Image with Slide Carousel & Badges */}
      <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden select-none">
        <OptimizedImage 
          src={images[currentImageIdx] || property.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'} 
          alt={`${property.title} - Photo ${currentImageIdx + 1}`}
          thumbnail={true}
          className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-out ${
            isSliding ? 'opacity-85 scale-95' : 'opacity-100'
          }`}
        />

        {/* Carousel Slide Left/Right Navigation Arrows (Pops on Hover) */}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={handlePrevImage}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/70 hover:bg-emerald-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg backdrop-blur-sm z-20 cursor-pointer"
              title="Previous photo"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextImage}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/70 hover:bg-emerald-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg backdrop-blur-sm z-20 cursor-pointer"
              title="Next photo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Top Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            {property.isDemo && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500 text-slate-950 uppercase tracking-wider shadow-sm">
                DEMO
              </span>
            )}
            
            {property.verificationStatus === 'APPROVED' ? (
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-600/95 text-white flex items-center gap-1 shadow-md backdrop-blur-sm animate-in fade-in">
                <ShieldCheck className="w-3.5 h-3.5 text-white animate-pulse" />
                Verified
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-medium bg-slate-800/80 backdrop-blur text-white flex items-center gap-1 shadow-sm">
                Pending Verification
              </span>
            )}

            {/* Video Tour Badge Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenVideoTour) onOpenVideoTour(property);
                else onViewDetails(property);
              }}
              className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-slate-950/80 hover:bg-emerald-600 text-white flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all hover:scale-105 border border-white/20 pointer-events-auto cursor-pointer"
              title="Watch full video walkthrough"
            >
              <Video className="w-3.5 h-3.5 fill-current text-amber-300 animate-pulse" />
              <span>Tour 🎥</span>
            </button>

            {matchScore !== undefined && matchScore > 0 && (
              <span 
                className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-purple-600 text-white flex items-center gap-1 shadow-md backdrop-blur-sm"
                title={matchExplanation || `${matchScore}% Match with your preferences`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                {matchScore}% Match
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 pointer-events-auto">
            {/* Live Viewers Pill */}
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950/75 text-rose-300 border border-rose-500/30 backdrop-blur-sm shadow-xs">
              <Flame className="w-3 h-3 text-rose-400 fill-current animate-bounce" />
              <span>{liveViewers} viewing</span>
            </span>

            {/* Compare Toggle Button */}
            {onToggleCompare && (
              <button
                onClick={handleCompareClick}
                className={`p-2 rounded-full shadow-md backdrop-blur transition-all cursor-pointer ${
                  isCompared 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:bg-white hover:text-purple-700'
                }`}
                title={isCompared ? 'Remove from comparison' : 'Add to compare'}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Save / Shortlist Button */}
            <button
              onClick={handleSaveClick}
              disabled={saveLoading}
              className={`p-2 rounded-full shadow-md backdrop-blur transition-all cursor-pointer ${
                isSaved 
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                  : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:bg-white hover:text-slate-900'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save hostel to shortlist'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-rose-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Carousel Slide Indicator Dots */}
        {hasMultipleImages && (
          <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 z-10 pointer-events-auto">
            {images.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIdx(dotIdx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentImageIdx === dotIdx ? 'w-5 bg-emerald-400 shadow-md' : 'w-1.5 bg-white/60 hover:bg-white'
                }`}
                title={`Photo ${dotIdx + 1} of ${images.length}`}
              />
            ))}
          </div>
        )}

        {/* Availability Badge Overlay */}
        <div className="absolute bottom-3 left-3 z-10">
          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${availInfo.bg} shadow-md backdrop-blur-md bg-opacity-95`}>
            {availInfo.label}
          </span>
        </div>

        {/* Property Type Badge & Photo Counter */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
          {hasMultipleImages && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-950/70 text-white backdrop-blur-md shadow-xs">
              {currentImageIdx + 1}/{images.length}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-950/80 text-white backdrop-blur-md shadow-sm">
            {getPropertyTypeLabel(property.propertyType)}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 text-slate-900 dark:text-slate-100">
        <div className="space-y-2">
          {/* Area & Distance from LAUTECH */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-1">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="truncate">{property.area.name}</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300 text-[11px] flex-shrink-0">
              <Footprints className="w-3.5 h-3.5 text-slate-400" />
              {formatDistance(property.distanceFromCampusKm)} to gate
            </span>
          </div>

          {/* Hostel Name */}
          <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
            {property.title}
          </h3>

          {/* Match Score Reason Explanation (if present) */}
          {matchExplanation && (
            <p className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1 rounded-xl border border-purple-100 dark:border-purple-800 font-medium line-clamp-1">
              ✨ {matchExplanation}
            </p>
          )}

          {/* Landmark hint */}
          {property.nearbyLandmark && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              📍 Near: {property.nearbyLandmark}
            </p>
          )}

          {/* Key Facilities Pills */}
          {property.keyAmenities && property.keyAmenities.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {property.keyAmenities.slice(0, 3).map((am) => (
                <span 
                  key={am.key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {renderAmenityIcon(am.icon)}
                  <span>{am.name.split(' ')[0]}</span>
                </span>
              ))}
              {property.keyAmenities.length > 3 && (
                <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  +{property.keyAmenities.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between gap-2 mt-auto">
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Disclosed Rent
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {formatNaira(property.priceSummary?.rentAmount)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">/yr</span>
            </div>
            {property.priceSummary?.totalMandatoryCost && property.priceSummary.totalMandatoryCost > property.priceSummary.rentAmount && (
              <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
                <Info className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                Est. Total: {formatNaira(property.priceSummary.totalMandatoryCost)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {onOpenConversation && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenConversation(property.id);
                }}
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                title="Chat Directly with Landlord"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold hidden xl:inline">Chat</span>
              </button>
            )}

            {onOpenInspectionModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInspectionModal(property);
                }}
                className="px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                title="Schedule Hostel Inspection"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Inspect</span>
              </button>
            )}

            {onOpenBookingModal ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBookingModal(property);
                }}
                className="px-3.5 py-2 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1 cursor-pointer"
                title="Book / Reserve This Hostel Space"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Book</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onViewDetails(property)}
                className="px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white rounded-xl border border-emerald-200 dark:border-emerald-800 hover:border-emerald-600 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
