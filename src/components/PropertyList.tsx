import React, { useState } from 'react';
import { 
  Filter, 
  SlidersHorizontal, 
  X, 
  Search, 
  CheckCircle2, 
  Video, 
  Footprints, 
  Droplets, 
  SunMedium, 
  ShieldCheck,
  Building,
  RotateCcw,
  BookmarkPlus,
  ArrowUpDown,
  Sparkles,
  Clock,
  Eye,
  Bookmark
} from 'lucide-react';
import { Property, CampusZone, University, PropertyType, SavedSearch, SortOption } from '../types';
import { PropertyCard } from './PropertyCard';

interface PropertyListProps {
  properties: Property[];
  zones: CampusZone[];
  currentUniversity: University;
  savedIds: string[];
  comparedProperties: Property[];
  selectedZone: string;
  selectedRoomType: string;
  onSelectZone: (zoneId: string) => void;
  onSelectRoomType: (roomType: string) => void;
  onToggleSave: (id: string) => void;
  onToggleCompare: (property: Property) => void;
  onViewDetails: (property: Property) => void;
  onOpenCompareModal: () => void;
  onSaveSearch: (savedSearch: SavedSearch) => void;
}

export const PropertyList: React.FC<PropertyListProps> = ({
  properties,
  zones,
  currentUniversity,
  savedIds,
  comparedProperties,
  selectedZone,
  selectedRoomType,
  onSelectZone,
  onSelectRoomType,
  onToggleSave,
  onToggleCompare,
  onViewDetails,
  onOpenCompareModal,
  onSaveSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState<number>(100000);
  const [maxPrice, setMaxPrice] = useState<number>(500000);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(5);
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | ''>('');
  const [selectedBathrooms, setSelectedBathrooms] = useState<number | ''>('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  // Trust & Availability
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [videoOnly, setVideoOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [recentlyUpdatedOnly, setRecentlyUpdatedOnly] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Save Search Modal state
  const [isSaveSearchModalOpen, setIsSaveSearchModalOpen] = useState(false);
  const [searchName, setSearchName] = useState('');

  // Amenities list
  const AMENITY_OPTIONS = [
    'Water',
    '24/7 Motorized Borehole',
    'Electricity',
    'Prepaid meter',
    'Solar Backup',
    'Generator',
    'Security',
    'Parking',
    'Kitchen',
    'Bathroom',
    'Wi-Fi',
    'Wardrobe',
    'Tiled floor',
    'Fence',
  ];

  const handleToggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  // Only show PUBLISHED properties to students
  const publicListings = properties.filter((p) => p.listingStatus === 'PUBLISHED');

  // Filter Pipeline
  const filteredProperties = publicListings.filter((p) => {
    if (selectedZone && p.zoneId !== selectedZone) return false;
    if (selectedRoomType && p.propertyType !== selectedRoomType) return false;
    if (p.fees.annualRent < minPrice) return false;
    if (p.fees.annualRent > maxPrice) return false;
    if (p.distanceKmFromGate > maxDistanceKm) return false;
    if (selectedBedrooms && p.bedrooms !== selectedBedrooms) return false;
    if (selectedBathrooms && p.bathrooms !== selectedBathrooms) return false;
    if (verifiedOnly && p.verificationStatus !== 'VERIFIED') return false;
    if (videoOnly && !p.hasVideoTour) return false;
    if (availableOnly && p.availabilityStatus !== 'AVAILABLE') return false;
    if (recentlyUpdatedOnly && !p.lastUpdated.includes('August 2026')) return false;

    // Amenities check
    if (selectedAmenities.length > 0) {
      const hasAllSelected = selectedAmenities.every((a) => p.amenities.includes(a));
      if (!hasAllSelected) return false;
    }

    // Query text match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchZone = p.zoneName.toLowerCase().includes(q);
      const matchLandmark = p.landmark.toLowerCase().includes(q);
      const matchAddress = p.address.toLowerCase().includes(q);
      const matchDescription = p.description.toLowerCase().includes(q);
      if (!matchTitle && !matchZone && !matchLandmark && !matchAddress && !matchDescription) {
        return false;
      }
    }

    return true;
  });

  // Sorting Pipeline
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return a.fees.annualRent - b.fees.annualRent;
      case 'price_high':
        return b.fees.annualRent - a.fees.annualRent;
      case 'closest_to_campus':
        return a.distanceKmFromGate - b.distanceKmFromGate;
      case 'recently_added':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'recently_updated':
        return b.viewsCount - a.viewsCount;
      case 'most_viewed':
        return (b.viewsCount || 0) - (a.viewsCount || 0);
      case 'most_saved':
        return (b.savesCount || 0) - (a.savesCount || 0);
      case 'recommended':
      default:
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    }
  });

  const resetAllFilters = () => {
    onSelectZone('');
    onSelectRoomType('');
    setSearchQuery('');
    setMinPrice(100000);
    setMaxPrice(500000);
    setMaxDistanceKm(5);
    setSelectedBedrooms('');
    setSelectedBathrooms('');
    setSelectedAmenities([]);
    setVerifiedOnly(false);
    setVideoOnly(false);
    setAvailableOnly(false);
    setRecentlyUpdatedOnly(false);
    setSortBy('recommended');
  };

  const handleSaveSearchClick = () => {
    const defaultName = `${currentUniversity.shortName} ${
      selectedZone ? zones.find((z) => z.id === selectedZone)?.name : 'All Zones'
    } (₦${minPrice.toLocaleString()} - ₦${maxPrice.toLocaleString()})`;
    setSearchName(defaultName);
    setIsSaveSearchModalOpen(true);
  };

  const handleConfirmSaveSearch = () => {
    if (!searchName.trim()) return;
    const newSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      name: searchName.trim(),
      universityId: currentUniversity.id,
      zoneId: selectedZone || undefined,
      propertyType: selectedRoomType || undefined,
      minPrice,
      maxPrice,
      verifiedOnly,
      hasVideoOnly: videoOnly,
      matchCount: sortedProperties.length,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    onSaveSearch(newSearch);
    setIsSaveSearchModalOpen(false);
  };

  const hasActiveFilters = Boolean(
    selectedZone ||
    selectedRoomType ||
    searchQuery ||
    minPrice > 100000 ||
    maxPrice < 500000 ||
    maxDistanceKm < 5 ||
    selectedBedrooms !== '' ||
    selectedBathrooms !== '' ||
    selectedAmenities.length > 0 ||
    verifiedOnly ||
    videoOnly ||
    recentlyUpdatedOnly
  );

  return (
    <section id="listings-section" className="py-12 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header & Search Metrics */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                Verified Student Marketplace
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-600">{sortedProperties.length} properties found</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Hostels & Student Housing in {currentUniversity.cityName}
            </h2>
          </div>

          {/* Quick Search & Sort Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Under-G, Adenike, solar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
            >
              <option value="recommended">⭐ Recommended</option>
              <option value="closest_to_campus">⚡ Closest to Campus (Gate)</option>
              <option value="price_low">₦ Price: Low to High</option>
              <option value="price_high">₦ Price: High to Low</option>
              <option value="most_viewed">🔥 Most Viewed</option>
              <option value="most_saved">❤️ Most Saved</option>
              <option value="recently_updated">🕒 Recently Updated</option>
            </select>

            {/* Save Search Button */}
            <button
              onClick={handleSaveSearchClick}
              className="hidden sm:flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-white text-slate-700 hover:text-brand-700 hover:bg-brand-50 border border-slate-200 transition-colors shadow-2xs"
              title="Save current search criteria"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-brand-600" />
              <span>Save Search</span>
            </button>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`lg:hidden flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                hasActiveFilters
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters {hasActiveFilters && '•'}</span>
            </button>
          </div>
        </div>

        {/* Quick Area Pill Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none text-xs">
          <button
            onClick={() => onSelectZone('')}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              !selectedZone ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            All Areas ({publicListings.length})
          </button>
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => onSelectZone(selectedZone === z.id ? '' : z.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
                selectedZone === z.id ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {z.name} ({z.avgWalkTimeToGateMins} mins walk)
            </button>
          ))}
        </div>

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-white rounded-2xl border border-slate-200/80 text-xs">
            <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider mr-1">Active Filters:</span>
            
            {selectedZone && (
              <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-800 px-2.5 py-1 rounded-lg font-semibold border border-brand-200">
                Area: {zones.find((z) => z.id === selectedZone)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-brand-950" onClick={() => onSelectZone('')} />
              </span>
            )}

            {selectedRoomType && (
              <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-800 px-2.5 py-1 rounded-lg font-semibold border border-brand-200">
                Type: {selectedRoomType.replace('_', ' ')}
                <X className="w-3 h-3 cursor-pointer hover:text-brand-950" onClick={() => onSelectRoomType('')} />
              </span>
            )}

            {(minPrice > 100000 || maxPrice < 500000) && (
              <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-800 px-2.5 py-1 rounded-lg font-semibold border border-brand-200">
                ₦{minPrice.toLocaleString()} - ₦{maxPrice.toLocaleString()}
                <X className="w-3 h-3 cursor-pointer hover:text-brand-950" onClick={() => { setMinPrice(100000); setMaxPrice(500000); }} />
              </span>
            )}

            {maxDistanceKm < 5 && (
              <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-800 px-2.5 py-1 rounded-lg font-semibold border border-brand-200">
                Within {maxDistanceKm} km
                <X className="w-3 h-3 cursor-pointer hover:text-brand-950" onClick={() => setMaxDistanceKm(5)} />
              </span>
            )}

            {verifiedOnly && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg font-semibold border border-emerald-200">
                Verified Only
                <X className="w-3 h-3 cursor-pointer hover:text-emerald-950" onClick={() => setVerifiedOnly(false)} />
              </span>
            )}

            {videoOnly && (
              <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 px-2.5 py-1 rounded-lg font-semibold border border-teal-200">
                Has Video Tour
                <X className="w-3 h-3 cursor-pointer hover:text-teal-950" onClick={() => setVideoOnly(false)} />
              </span>
            )}

            {selectedAmenities.map((amenity) => (
              <span key={amenity} className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-medium border border-slate-200">
                {amenity}
                <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => handleToggleAmenity(amenity)} />
              </span>
            ))}

            <button
              onClick={resetAllFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold ml-auto flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>
        )}

        {/* Main Layout: Filters Sidebar + Properties Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Filters Sidebar */}
          <div
            className={`lg:block ${
              showMobileFilters ? 'block' : 'hidden'
            } bg-white p-5 rounded-3xl border border-slate-200 shadow-card space-y-6 lg:sticky lg:top-24 max-h-[85vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <SlidersHorizontal className="w-4 h-4 text-brand-600" />
                <span>Search Filters</span>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Rent Budget Range (₦)
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <span className="text-[10px] text-slate-400">Min Rent</span>
                  <input
                    type="number"
                    step="10000"
                    value={minPrice}
                    onChange={(e) => setMinPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Max Rent</span>
                  <input
                    type="number"
                    step="10000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
              <input
                type="range"
                min="100000"
                max="500000"
                step="10000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>

            {/* Distance from LAUTECH Gate */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider">Distance to Gate</span>
                <span className="font-extrabold text-brand-700">&le; {maxDistanceKm} km</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0.5 km</span>
                <span>2.5 km</span>
                <span>5.0 km</span>
              </div>
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Property Type
              </label>
              <div className="space-y-1.5">
                {[
                  { value: '', label: 'All Types' },
                  { value: 'self_contain', label: 'Self-contained' },
                  { value: 'two_bedroom', label: '2 Bedroom Flat' },
                  { value: 'hostel', label: 'Hostel' },
                  { value: 'apartment', label: 'Apartment' },
                ].map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer hover:text-brand-700 py-0.5"
                  >
                    <input
                      type="radio"
                      name="propertyTypeFilterSide"
                      checked={selectedRoomType === type.value}
                      onChange={() => onSelectRoomType(type.value)}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Trust & Availability */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Trust & Verification
              </span>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer hover:text-brand-700">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified by CampusNest
                </span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer hover:text-brand-700">
                <input
                  type="checkbox"
                  checked={videoOnly}
                  onChange={(e) => setVideoOnly(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-teal-600" />
                  Has Video Tour
                </span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer hover:text-brand-700">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Available Now Only</span>
              </label>
            </div>

            {/* Amenities Checklist */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Amenities & Utilities
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {AMENITY_OPTIONS.map((amenity) => (
                  <label key={amenity} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer hover:text-brand-700">
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity)}
                      onChange={() => handleToggleAmenity(amenity)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span>{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Close on Mobile */}
            {showMobileFilters && (
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-bold text-xs shadow-sm"
              >
                Apply Filters ({sortedProperties.length} Results)
              </button>
            )}
          </div>

          {/* Properties Grid Area */}
          <div className="lg:col-span-3">
            {sortedProperties.length === 0 ? (
              /* Empty State with Helpful Suggestions */
              <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-12 text-center shadow-card space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Building className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900">
                    No properties match your current filters.
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    Try adjusting your criteria or explore nearby areas around LAUTECH in Ogbomoso.
                  </p>
                </div>

                {/* Helpful Suggestions Box */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 max-w-md mx-auto text-left text-xs space-y-2">
                  <span className="font-bold text-slate-800 block">Suggestions to find accommodation:</span>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-700">
                    <li><strong className="text-slate-900">Increase budget:</strong> Raise your maximum rent limit.</li>
                    <li><strong className="text-slate-900">Select another area:</strong> Try Under-G, Adenike, Stadium Road, or General Area.</li>
                    <li><strong className="text-slate-900">Remove a filter:</strong> Uncheck strict amenity requirements like solar or power generator.</li>
                    <li><strong className="text-slate-900">View all available properties:</strong> Reset filters to browse all verified listings.</li>
                  </ul>
                </div>

                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={resetAllFilters}
                    className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    View All Available Properties
                  </button>
                  <button
                    onClick={() => {
                      setMaxPrice(1000000);
                      onSelectZone('all');
                      setSelectedAmenities([]);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Remove Strict Filters
                  </button>
                </div>
              </div>
            ) : (
              /* Property Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {sortedProperties.map((property) => {
                  const isSaved = savedIds.includes(property.id);
                  const isCompared = comparedProperties.some((p) => p.id === property.id);
                  return (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      isSaved={isSaved}
                      isCompared={isCompared}
                      onToggleSave={onToggleSave}
                      onToggleCompare={onToggleCompare}
                      onViewDetails={onViewDetails}
                    />
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Save Search Naming Modal */}
      {isSaveSearchModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-brand-600" />
                <h3 className="font-extrabold text-base text-slate-900">Save This Search</h3>
              </div>
              <button
                onClick={() => setIsSaveSearchModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Save these filter parameters to quickly re-run them anytime from your Student Dashboard.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Search Name</label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setIsSaveSearchModalOpen(false)}
                className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveSearch}
                className="w-1/2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Save Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Compare Bar */}
      {comparedProperties.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl flex items-center space-x-4 border border-slate-700 animate-bounce-subtle">
          <div className="flex items-center space-x-2 text-xs font-semibold">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>{comparedProperties.length}</strong> {comparedProperties.length === 1 ? 'Nest' : 'Nests'} selected
            </span>
          </div>

          <button
            onClick={onOpenCompareModal}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm"
          >
            Compare Side-by-Side
          </button>
        </div>
      )}
    </section>
  );
};
