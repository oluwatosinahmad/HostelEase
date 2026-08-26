import React from 'react';
import { 
  CheckCircle2, 
  Video, 
  Footprints, 
  MapPin, 
  Star, 
  ShieldCheck, 
  Droplets, 
  Zap, 
  SlidersHorizontal, 
  Bookmark, 
  ChevronRight,
  SunMedium,
  Clock
} from 'lucide-react';
import { Property } from '../types';
import { formatNaira } from '../utils/formatters';

interface PropertyCardProps {
  property: Property;
  isSaved: boolean;
  isCompared: boolean;
  onToggleSave: (id: string) => void;
  onToggleCompare: (property: Property) => void;
  onViewDetails: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isSaved,
  isCompared,
  onToggleSave,
  onToggleCompare,
  onViewDetails,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card hover:shadow-elevated transition-all duration-200 overflow-hidden flex flex-col group relative">
      
      {/* Image & Badges Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={property.coverImage}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Gradient Overlay for Top Badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Verification & Availability Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {property.isDemo ? (
              <div className="flex items-center gap-1 bg-amber-500/90 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] shadow-sm tracking-wide">
                <span>DEMO PROPERTY</span>
              </div>
            ) : property.verificationStatus === 'VERIFIED' ? (
              <div className="flex items-center gap-1 bg-emerald-600/95 text-white px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm backdrop-blur-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified by CampusNest</span>
              </div>
            ) : property.verificationStatus === 'EXPIRED' ? (
              <div className="flex items-center gap-1 bg-amber-600/95 text-white px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm backdrop-blur-xs">
                <span>Verification Expired</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-slate-900/80 text-slate-200 px-2.5 py-1 rounded-md text-[10px] font-medium backdrop-blur-xs">
                <span>{property.listingStatus.replace('_', ' ')}</span>
              </div>
            )}

            {property.availabilityStatus === 'AVAILABLE' ? (
              <div className="flex items-center gap-1 bg-emerald-600/90 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-xs">
                <span>Available</span>
              </div>
            ) : property.availabilityStatus === 'RESERVED' ? (
              <div className="flex items-center gap-1 bg-amber-600/90 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-xs">
                <span>Reserved</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-slate-700/90 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-xs">
                <span>Unavailable</span>
              </div>
            )}
          </div>

          {/* Action Buttons (Bookmark & Compare) */}
          <div className="flex items-center space-x-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(property);
              }}
              className={`p-2 rounded-full backdrop-blur-md transition-all active:scale-95 ${
                isCompared
                  ? 'bg-brand-600 text-white shadow-md ring-2 ring-white/60'
                  : 'bg-black/40 hover:bg-black/60 text-white'
              }`}
              title={isCompared ? 'Remove from Compare' : 'Add to Compare'}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(property.id);
              }}
              className={`p-2 rounded-full backdrop-blur-md transition-all active:scale-95 ${
                isSaved
                  ? 'bg-rose-500 text-white shadow-md ring-2 ring-white/60'
                  : 'bg-black/40 hover:bg-black/60 text-white'
              }`}
              title={isSaved ? 'Remove from shortlist' : 'Save to Shortlist'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bottom Image Info: Real Proximity & Video Tour */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-semibold">
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-md">
            <Footprints className="w-3.5 h-3.5 text-emerald-400" />
            <span>{property.distanceText || `${property.distanceKmFromGate} km from LAUTECH`}</span>
          </div>

          {property.hasVideoTour && (
            <div className="flex items-center gap-1 bg-teal-600/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px]">
              <Video className="w-3.5 h-3.5" />
              <span>Video Tour Available</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Zone & Availability Line */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="inline-flex items-center gap-1 font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
              <MapPin className="w-3 h-3 text-brand-600" />
              {property.zoneName}
            </span>

            <span className={`text-[11px] font-bold ${
              property.availabilityStatus === 'AVAILABLE' ? 'text-emerald-700' : 'text-slate-400'
            }`}>
              ● {property.availabilityStatus === 'AVAILABLE' ? 'Available' : 'Unavailable'}
            </span>
          </div>

          {/* Title */}
          <h3 
            onClick={() => onViewDetails(property)}
            className="font-bold text-base text-slate-900 group-hover:text-brand-700 transition-colors cursor-pointer line-clamp-1"
          >
            {property.title}
          </h3>

          <div className="flex items-center justify-between text-xs text-slate-500 mt-0.5">
            <span className="line-clamp-1">{property.propertyTypeLabel || property.propertyType.replace('_', ' ')}</span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {property.lastUpdated}
            </span>
          </div>

          {/* Key Verified Feature Pills */}
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-600">
            {property.hasBoreholeWater && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-100">
                <Droplets className="w-3 h-3 text-blue-500" />
                Water
              </span>
            )}
            {property.hasSolarOrInverter && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-100">
                <SunMedium className="w-3 h-3 text-amber-600" />
                Solar
              </span>
            )}
            {property.hasPrepaidMeter && (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                <Zap className="w-3 h-3 text-slate-500" />
                Prepaid Meter
              </span>
            )}
            {property.hasSecurityGuard && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Security
              </span>
            )}
          </div>
        </div>

        {/* Pricing & CTA Section */}
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-lg font-extrabold text-slate-900">
                {formatNaira(property.fees.annualRent)}
              </span>
              <span className="text-xs text-slate-500 font-medium"> / {property.fees.paymentFrequency === 'annually' ? 'year' : property.fees.paymentFrequency}</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Estimated Total</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {formatNaira(property.fees.estimatedTotal)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onViewDetails(property)}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-brand-600 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1 shadow-xs"
          >
            <span>View Full Details & Tour</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
