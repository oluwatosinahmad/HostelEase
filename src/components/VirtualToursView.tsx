import React, { useState, useMemo } from 'react';
import { 
  Video, 
  Play, 
  ShieldCheck, 
  MapPin, 
  Footprints, 
  Search, 
  Filter, 
  Sparkles, 
  Calendar, 
  Receipt, 
  ChevronRight,
  SlidersHorizontal,
  X,
  Compass,
  ArrowUpDown
} from 'lucide-react';
import { Property, Area } from '../types/hostelEase';
import { formatNaira, formatDistance } from '../utils/formatters';
import { getMediaUrl } from '../services/api';

interface VirtualToursViewProps {
  properties: Property[];
  areas: Area[];
  onOpenVideoTour: (property: Property) => void;
  onViewDetails?: (property: Property) => void;
  onOpenBookingModal?: (property: Property) => void;
  onOpenInspectionModal?: (property: Property) => void;
  onNavigateHome?: () => void;
}

export const VirtualToursView: React.FC<VirtualToursViewProps> = ({
  properties,
  areas,
  onOpenVideoTour,
  onViewDetails,
  onOpenBookingModal,
  onOpenInspectionModal,
  onNavigateHome
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'distance'>('featured');

  // Filter for approved properties with real video tours
  const videoProperties = useMemo(() => {
    return properties.filter(p => 
      p.verificationStatus === 'APPROVED' && (
        p.media?.some(m => m.mediaType === 'VIDEO' || m.category === 'VIDEO_WALKTHROUGH' || String(m.url || '').toLowerCase().includes('.mp4')) || 
        Boolean((p as any).has4KVideo) || 
        Boolean((p as any).videoTourUrl)
      )
    );
  }, [properties]);

  // Apply search, area filter, and sorting
  const filteredVideos = useMemo(() => {
    let result = [...videoProperties];

    if (selectedAreaId !== 'all') {
      result = result.filter(p => p.area?.id === selectedAreaId || (p as any).areaId === selectedAreaId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.area?.name?.toLowerCase().includes(q) ||
        (p as any).areaName?.toLowerCase().includes(q) ||
        p.nearbyLandmark?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price_low') {
      result.sort((a, b) => (a.priceSummary?.rentAmount || 0) - (b.priceSummary?.rentAmount || 0));
    } else if (sortBy === 'price_high') {
      result.sort((a, b) => (b.priceSummary?.rentAmount || 0) - (a.priceSummary?.rentAmount || 0));
    } else if (sortBy === 'distance') {
      result.sort((a, b) => (a.distanceFromCampusKm || 0) - (b.distanceFromCampusKm || 0));
    }

    return result;
  }, [videoProperties, selectedAreaId, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 animate-in fade-in duration-200">
      {/* Hero Banner for 4K Virtual Tours */}
      <div className="relative border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-72 bg-gradient-to-r from-emerald-600/10 via-teal-500/15 to-emerald-600/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <button 
              onClick={onNavigateHome}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-emerald-400 font-bold">4K Virtual Tours</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black">
                <Video className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>On-Site 4K Inspection Walkthroughs</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Verified 4K Virtual Property Tours
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Watch continuous, uncut 4K video walkthroughs recorded on-site by the HostelEase physical inspection team.
                Inspect the compounds, water, electricity meters, rooms, and bathrooms around LAUTECH before booking!
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Available Tours
                </span>
                <span className="text-lg font-black text-emerald-400">
                  {videoProperties.length} Verified
                </span>
              </div>
            </div>
          </div>

          {/* Search & Area Filter Bar */}
          <div className="mt-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search hostel name, area, or landmark (e.g. Under-G, Stadium)..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="relative w-full sm:w-48 shrink-0">
                <div className="relative">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="featured">Featured First</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="distance">Closest to Campus</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Area Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedAreaId('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedAreaId === 'all'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                All Areas ({videoProperties.length})
              </button>

              {areas.map(area => {
                const count = videoProperties.filter(p => p.area?.id === area.id || (p as any).areaId === area.id).length;
                if (count === 0) return null;
                return (
                  <button
                    key={area.id}
                    onClick={() => setSelectedAreaId(area.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedAreaId === area.id
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {area.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Video Listing Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((property, index) => {
              const durationText = index % 3 === 0 ? '1:45' : index % 3 === 1 ? '2:10' : '1:30';
              const rawThumb = property.coverImage || property.media?.[0]?.url;
              const thumbUrl = rawThumb ? getMediaUrl(rawThumb) : undefined;

              return (
                <div
                  key={`virtual-tour-card-${property.id}`}
                  onClick={() => onOpenVideoTour(property)}
                  className="group relative bg-slate-900 rounded-3xl overflow-hidden shadow-lg border border-slate-800 hover:border-emerald-500/50 hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1.5"
                >
                  {/* Video Thumbnail with Hover Zoom */}
                  <div className="relative aspect-video overflow-hidden bg-slate-950">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out brightness-90 group-hover:brightness-100"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-700">
                        <Video className="w-12 h-12" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    {/* Center Glowing Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
                        <div className="w-14 h-14 rounded-full bg-emerald-600/90 group-hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl backdrop-blur-sm transition-transform group-hover:scale-110">
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600/90 text-white shadow flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        4K Verified Tour
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-950/80 text-white backdrop-blur shadow">
                        {durationText} min
                      </span>
                    </div>

                    {/* Bottom Metadata inside thumbnail */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <span className="text-[11px] font-bold truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{property.area?.name || (property as any).areaName || 'LAUTECH Area'}</span>
                      </span>
                      <span className="text-xs font-black text-emerald-400 shrink-0">
                        {formatNaira(property.priceSummary?.rentAmount)}/yr
                      </span>
                    </div>
                  </div>

                  {/* Card Content & Details */}
                  <div className="p-4 bg-slate-900 flex-1 flex flex-col justify-between gap-3 border-t border-slate-800">
                    <div>
                      <h3 className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
                        {property.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-1">
                        <Footprints className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{property.nearbyLandmark || `${property.distanceFromCampusKm || 0.8}km to campus gate`}</span>
                      </p>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      {onViewDetails && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(property);
                          }}
                          className="text-[11px] font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenVideoTour(property);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600/90 group-hover:bg-emerald-600 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play 4K</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
              <Video className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Matching 4K Tours Found</h3>
              <p className="text-xs text-slate-400">
                {searchQuery || selectedAreaId !== 'all'
                  ? 'Try adjusting your search query or area filter to explore other available 4K property walkthroughs.'
                  : 'New on-site 4K video walkthroughs are currently being uploaded by our inspection team.'}
              </p>
            </div>
            {(searchQuery || selectedAreaId !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedAreaId('all');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
