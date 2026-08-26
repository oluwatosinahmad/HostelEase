import React, { useState } from 'react';
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
  MessageSquare
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
  isCompared = false,
  matchScore,
  matchExplanation
}) => {
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(property.isSaved));
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

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
      className={`group bg-white dark:bg-slate-900 rounded-3xl border shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col cursor-pointer ${
        isCompared 
          ? 'border-purple-500 ring-2 ring-purple-400/30' 
          : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
      }`}
    >
      {/* Property Cover Image with Badges */}
      <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <OptimizedImage 
          src={property.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'} 
          alt={property.title}
          thumbnail={true}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            {property.isDemo && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500 text-slate-950 uppercase tracking-wider shadow-sm">
                DEMO
              </span>
            )}
            
            {property.verificationStatus === 'APPROVED' ? (
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-600/95 text-white flex items-center gap-1 shadow-md backdrop-blur-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-medium bg-slate-800/80 backdrop-blur text-white flex items-center gap-1 shadow-sm">
                Pending Verification
              </span>
            )}

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
            {/* Compare Toggle Button */}
            {onToggleCompare && (
              <button
                onClick={handleCompareClick}
                className={`p-2 rounded-full shadow-md backdrop-blur transition-all ${
                  isCompared 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/90 text-slate-600 hover:bg-white hover:text-purple-700'
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
              className={`p-2 rounded-full shadow-md backdrop-blur transition-all ${
                isSaved 
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                  : 'bg-white/90 text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save hostel to shortlist'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Availability Badge Overlay */}
        <div className="absolute bottom-3 left-3">
          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${availInfo.bg} shadow-md backdrop-blur-md bg-opacity-95`}>
            {availInfo.label}
          </span>
        </div>

        {/* Property Type Badge */}
        <div className="absolute bottom-3 right-3">
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

          <div className="flex items-center gap-1.5">
            {onOpenConversation && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenConversation(property.id);
                }}
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-200 transition-all flex items-center gap-1"
                title="Chat with Landlord"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold hidden sm:inline">Chat</span>
              </button>
            )}

            <button
              onClick={() => onViewDetails(property)}
              className="px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white rounded-xl border border-emerald-200 dark:border-emerald-800 hover:border-emerald-600 transition-all flex items-center gap-1 shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
